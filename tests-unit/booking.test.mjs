import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Worker } from 'node:worker_threads';
import { openStore } from '../store.mjs';
import { change, hasToken, initBooking, localDate, managementToken, patientAction, reserve, setSchedule, slots } from '../booking.mjs';

function fixture(path=':memory:') {
  const db=openStore(path);
  initBooking(db);
  const date=localDate(Date.now()+2*86400000);
  const day=new Date(date).getUTCDay();
  const settings={periods:JSON.stringify([{day,start:'09:00',end:'11:00'},{day,start:'14:00',end:'15:00'}]),blocks:'[]',duration:30,advance:7,expiry:24,cancellation:1};
  setSchedule(db,settings,'test');
  const data={name:'Fictional Patient',phone:'9900000011',date,time:'09:00',key:'a'.repeat(32),consent:'yes'};
  return {db,date,data,settings};
}
test('holidays, breaks, overlap after duration changes, and replay',()=>{
  const {db,data,date,settings}=fixture();
  const id=reserve(db,data,'en',()=>false);
  assert.equal(reserve(db,data,'en',()=>false),id);
  assert.throws(()=>reserve(db,{...data,time:'09:30'},'en',()=>false),/conflict/);
  assert.throws(()=>reserve(db,{...data,key:'f'.repeat(32),time:'09:30',service:'unpublished'},'en',()=>false),/service/);
  setSchedule(db,{...settings,duration:15},'doctor');
  assert(!slots(db,date).includes('09:15'));
  assert(!slots(db,date).includes('12:00'));
  assert.throws(()=>db.prepare("INSERT INTO appointments(reference,name,phone,date,time,locale) VALUES('other','Fictional','0000000000',?,'09:15','en')").run(date),/slot occupied/);
  setSchedule(db,{...settings,blocks:JSON.stringify([date])},'doctor');
  assert.deepEqual(slots(db,date),[]);
  db.close();
});
test('patient management and contact queue respect consent',()=>{
  const {db,data,date}=fixture();
  const id=reserve(db,data,'kn',()=>false);
  const token=managementToken(db,id);
  assert(!hasToken(db,id,id));
  change(db,{reference:id,action:'confirm'},'receptionist');
  change(db,{reference:id,date,time:'14:30',action:'reschedule'},'receptionist');
  assert.equal(db.prepare('SELECT count(*) n FROM appointment_messages').get().n,2);
  patientAction(db,id,token,'optout');
  patientAction(db,id,token,'cancel');
  assert.equal(db.prepare("SELECT count(*) n FROM appointment_messages WHERE status='awaiting staff'").get().n,0);
  assert(slots(db,date).includes('14:30'));
  db.prepare('UPDATE appointment_tokens SET expires_at=0 WHERE reference=?').run(id);
  assert(!hasToken(db,id,token));
  db.close();
});
test('independent SQLite connections competing for a slot yield exactly one reservation',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'clinic-concurrency-'));
  const path=join(dir,'test.db');
  const {db,data}=fixture(path);
  const module=new URL('../booking.mjs',import.meta.url).href;
  const workerSource=`
    const {parentPort,workerData} = require('node:worker_threads');
    const {DatabaseSync} = require('node:sqlite');
    (async()=>{
      const {reserve} = await import(workerData.module);
      const db=new DatabaseSync(workerData.path);
      db.exec('PRAGMA busy_timeout=5000');
      const barrier=new Int32Array(workerData.signal);
      parentPort.postMessage('ready');
      Atomics.wait(barrier,0,0,5000);
      try {reserve(db,workerData.data,'en',()=>false);parentPort.postMessage('reserved');}
      catch(error){parentPort.postMessage(error.message);}
      db.close();
    })();
  `;
  const signal=new SharedArrayBuffer(4), barrier=new Int32Array(signal);
  let ready=0;
  try {
    const results=await Promise.all(['1','2','3','4'].map(key=>new Promise((resolve,reject)=>{
      const worker=new Worker(workerSource,{eval:true,workerData:{module,path,data:{...data,key:key.repeat(32)},signal}});
      worker.on('error',reject);
      worker.on('message',value=>{
        if(value!=='ready') return resolve(value);
        if(++ready===4) { Atomics.store(barrier,0,1);Atomics.notify(barrier,0); }
      });
    })));
    assert.deepEqual(results.sort(),['reserved','slot','slot','slot']);
    assert.equal(db.prepare('SELECT count(*) n FROM appointments').get().n,1);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
