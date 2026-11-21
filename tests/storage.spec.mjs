import { expect, test } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit, initAuth, totp } from '../auth.mjs';
import { hasToken, initBooking, localDate, managementToken, setSchedule, slots } from '../booking.mjs';
import { openStore } from '../store.mjs';
import { schedule } from './fixtures.mjs';

test('legacy appointments survive migration and database constraints guard active slots', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sumukha-migration-'));
  const db = openStore(join(directory, 'clinic.sqlite'));
  try {
    db.prepare('INSERT INTO appointments (reference,name,phone,date,time,locale) VALUES (?,?,?,?,?,?)')
      .run('old-reference', 'Legacy Test Patient', '9900000091', '2030-01-02', '10:00', 'kn');
    initBooking(db);
    initBooking(db);
    const record = db.prepare('SELECT name,status,locale,duration FROM appointments WHERE reference=?').get('old-reference');
    expect(record).toEqual({ name: 'Legacy Test Patient', status: 'pending', locale: 'kn', duration: 30 });
    expect(() => db.prepare('INSERT INTO appointments (reference,name,phone,date,time,locale) VALUES (?,?,?,?,?,?)')
      .run('second-reference', 'Another Test Patient', '9900000092', '2030-01-02', '10:15', 'en')).toThrow();
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('India date boundaries, configured intervals, and holidays determine available slots', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sumukha-schedule-'));
  const db = openStore(join(directory, 'clinic.sqlite'));
  try {
    initBooking(db);
    const now = Date.parse('2030-01-01T19:00:00Z');
    expect(localDate(now)).toBe('2030-01-02');
    expect(slots(db, '2030-01-02', '', now)).toEqual([]);
    setSchedule(db, {
      ...schedule,
      periods: JSON.stringify([{ day: 3, start: '09:00', end: '10:00' }, { day: 4, start: '09:00', end: '10:00' }]),
      blocks: JSON.stringify(['2030-01-03'])
    }, 'test-owner');
    expect(slots(db, '2030-01-02', '', now)).toEqual(['09:00', '09:30']);
    expect(slots(db, '2030-01-03', '', now)).toEqual([]);
    expect(slots(db, '2030-02-30', '', now)).toEqual([]);
    expect(slots(db, '2030-01-01', '', now)).toEqual([]);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('TOTP matches a reference vector and staff audit rows reject mutation', () => {
  expect(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1)).toBe('287082');
  const directory = mkdtempSync(join(tmpdir(), 'sumukha-audit-'));
  const db = openStore(join(directory, 'clinic.sqlite'));
  try {
    initAuth(db);
    audit(db, 'test-owner', 'test.action');
    expect(() => db.prepare('UPDATE staff_audit SET action=?').run('changed.action')).toThrow();
    expect(() => db.prepare('DELETE FROM staff_audit').run()).toThrow();
    expect(db.prepare("SELECT action FROM staff_audit WHERE actor='test-owner'").get().action).toBe('test.action');
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('appointment management tokens are scoped and expire in the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sumukha-management-token-'));
  const db = openStore(join(directory, 'clinic.sqlite'));
  try {
    initBooking(db);
    const record = db.prepare('INSERT INTO appointments (reference,name,phone,date,time,locale) VALUES (?,?,?,?,?,?)');
    record.run('first-reference', 'Test Patient One', '9900000094', '2030-01-03', '10:00', 'en');
    record.run('second-reference', 'Test Patient Two', '9900000095', '2030-01-03', '10:30', 'kn');
    const token = managementToken(db, 'first-reference');
    expect(hasToken(db, 'first-reference', token)).toBe(true);
    expect(hasToken(db, 'second-reference', token)).toBe(false);
    db.prepare('UPDATE appointment_tokens SET expires_at=? WHERE reference=?').run(Date.now() - 1000, 'first-reference');
    expect(hasToken(db, 'first-reference', token)).toBe(false);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
