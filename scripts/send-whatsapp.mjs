import { openStore } from '../store.mjs';
import { createWhatsAppProvider, runWhatsAppQueue, whatsappSettings } from '../whatsapp.mjs';

process.umask(0o077);
try {
  const settings = whatsappSettings();
  if (!settings) {
    console.log('WhatsApp automation is disabled.');
  } else {
    const db = openStore(process.env.DB_PATH || 'data/clinic.sqlite');
    try {
      const reports = await runWhatsAppQueue(db, createWhatsAppProvider(settings));
      console.log('WhatsApp dispatch:', reports);
      if (reports.failed || reports.uncertain) process.exitCode = 1;
    } finally {
      db.close();
    }
  }
} catch {
  console.error('WhatsApp dispatch could not run. Verify environment configuration and initialize the booking database by starting the website.');
  process.exitCode = 1;
}
