// This module is called only with the private in-memory demo database.
import { setSchedule } from './booking.mjs';

export function prepareDemo(db, catalogue) {
  const files = db.prepare('PRAGMA database_list').all();
  if (files.some(file => file.file)) throw new Error('Demo fixtures require an in-memory database.');
  setSchedule(db, {
    periods: JSON.stringify(Array.from({length: 7}, (_,day) => ({ day, start:'09:00', end:'17:00' }))),
    blocks:'[]', duration:30, advance:30, expiry:24, cancellation:1
  }, 'local-demo');
  for (const slug of ['consultation','cleaning','fillings','root-canal','crowns','extraction']) {
    for (const locale of ['en','kn']) {
      const result = catalogue.adminAction(new URL(`http://localhost/admin/services?slug=${slug}&locale=${locale}`),'doctor',{ action:'approve',revision:'1' });
      if (result.status !== 303) throw new Error('Unable to prepare demo service ' + slug);
    }
  }
}
