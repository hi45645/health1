export function createAnalytics(db, enabled) {
  db.exec(`CREATE TABLE IF NOT EXISTS daily_activity (
    day TEXT NOT NULL, locale TEXT NOT NULL, event TEXT NOT NULL, total INTEGER NOT NULL,
    PRIMARY KEY(day, locale, event))`);
  const events = new Set(['appointment_page', 'treatment_page', 'page_view', 'phone', 'whatsapp', 'directions']);
  return {
    count(event, locale) {
      if (!enabled || !events.has(event) || !['en','kn'].includes(locale)) return;
      db.prepare(`INSERT INTO daily_activity VALUES(date('now','+330 minutes'),?,?,1)
        ON CONFLICT(day,locale,event) DO UPDATE SET total=total+1`).run(locale, event);
    },
    report() {
      return db.prepare('SELECT * FROM daily_activity ORDER BY day DESC, locale, event LIMIT 365').all();
    }
  };
}
