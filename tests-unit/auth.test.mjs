import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { initAuth, authenticate, totp } from '../auth.mjs';

test('staff sign-in, MFA replay checks, account administration, and session revocation', async () => {
  const db = new DatabaseSync(':memory:');
  const ownerPass = randomBytes(20).toString('hex'), secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
  Object.assign(process.env,{OWNER_USERNAME:'test.owner', OWNER_PASSWORD:ownerPass, OWNER_TOTP_SECRET:secret, STAFF_ENCRYPTION_KEY:randomBytes(32).toString('hex')});
  initAuth(db);
  const origin = 'https://test.invalid';
  async function dispatch(path,{method='GET',cookie='',form={},sender=origin}={}) {
    const req={method,socket:{remoteAddress:'127.0.0.1'},headers:{cookie,origin:sender}};
    const result={};
    const res={setHeader:(k,v)=>{result[k]=v;}};
    const user=await authenticate({db,req,res,url:new URL(path,origin),origin,readForm:async()=>form,
      respond:(_,status)=>{result.status=status;},redirect:(_,location)=>{result.status=303;result.location=location;}});
    return {...result,user};
  }
  const form = {username:'test.owner',password:ownerPass,code:totp(secret)};
  assert.equal((await dispatch('/admin')).status,401);
  assert.equal((await dispatch('/admin/login',{method:'POST',form,sender:'https://other.invalid'})).status,403);
  const signedIn = await dispatch('/admin/login',{method:'POST',form});
  assert.equal(signedIn.status,303);
  assert.match(signedIn['Set-Cookie'],/Secure/);
  const cookie=signedIn['Set-Cookie'].split(';')[0];
  assert.equal((await dispatch('/admin',{cookie})).user.role,'owner');
  assert.equal((await dispatch('/admin/login',{method:'POST',form})).status,401);
  const staffPass=randomBytes(20).toString('hex');
  const create={username:'staff.test',password:staffPass,secret,role:'receptionist',action:'create'};
  assert.equal((await dispatch('/admin/staff',{method:'POST',cookie,form:create})).status,303);
  const reception=await dispatch('/admin/login',{method:'POST',form:{...create,code:totp(secret)}});
  const receptionCookie=reception['Set-Cookie'].split(';')[0];
  assert.equal((await dispatch('/admin/staff',{cookie:receptionCookie})).status,403);
  assert.equal((await dispatch('/admin/staff',{method:'POST',cookie,form:{...create,action:'update'}})).status,303);
  assert.equal((await dispatch('/admin',{cookie:receptionCookie})).status,401);
  assert.equal((await dispatch('/admin/logout',{method:'POST',cookie})).status,303);
  assert.equal((await dispatch('/admin',{cookie})).status,401);
  assert.throws(()=>db.exec("DELETE FROM staff_audit"),/append only/);
  assert.ok(!db.prepare('SELECT secret FROM staff LIMIT 1').get().secret.includes(secret));
  db.close();
});
