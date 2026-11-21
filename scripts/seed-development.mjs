import { openSync, closeSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openStore } from '../store.mjs';
import { initBooking, setSchedule, reserve, slots, localDate } from '../booking.mjs';

if (process.env.NODE_ENV === 'production') throw new Error('Development fixtures require a development environment.');
const path = resolve(process.argv[2] || 'data/fictional-development.sqlite');
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
closeSync(openSync(path, 'wx', 0o600));
const db = openStore(path);
try {
  initBooking(db);
  const date = localDate(Date.now() + 86400000);
  setSchedule(db, {
    periods: JSON.stringify([{day: new Date(date).getUTCDay(), start:'09:00', end:'12:00'}]),
    blocks:'[]', duration:30, advance:7, expiry:24, cancellation:1
  }, 'fixture');
  reserve(db, { name:'Fictional QA patient', phone:'9000000000', date, time:slots(db,date)[0],
    consent:'yes', service:'general', key:randomBytes(16).toString('hex') }, 'en', () => false, 'walk-in', 'fixture');
  console.log('Created a new fictional development database at', path);
} finally { db.close(); }
