import { arrowRight } from './views.mjs';
import { escape as h, button, route } from './views.mjs';

const help = {
  en: {
    heading:'Patient information', need:'Speak with the clinic', call:'Call the clinic', visit:'Plan your visit',
    faq:[
      ['How do I request a visit?', 'Choose an available time in the appointment form. Keep the reference shown after you submit. The clinic will confirm whether your appointment is booked.'],
      ['How can I check my request?', 'Use the appointment status page and enter your reference number. For changes, call the clinic or use the options available in the browser you used to book.'],
      ['Can I book in Kannada?', 'Yes. Choose ಕನ್ನಡ in the header at any point. Your entries stay in this browser tab when the language changes.']
    ],
    topics:{
      privacy:[['Appointment information','The clinic uses your contact details and requested visit time to manage your appointment. Optional WhatsApp updates have a separate consent choice.'],['Your browser','The language cookie remembers your preference. The appointment management cookie lets the booking browser manage a request. Keep your booking reference private.']],
      terms:[['Confirming your visit','Check the status of your request before travelling. For changes to your appointment, use the available cancellation option or contact the clinic.'],['Care information','Your dentist can discuss the options appropriate for you during a consultation.']],
      accessibility:[['Using the website','Use Tab to move between controls, Enter to follow links, and the header language switch to choose English or Kannada.'],['Booking assistance','If the booking form is difficult to use, call the clinic to ask about an appointment.']]
    }
  },
  kn: {
    heading:'ರೋಗಿಗಳಿಗೆ ಮಾಹಿತಿ', need:'ಚಿಕಿತ್ಸಾಲಯವನ್ನು ಸಂಪರ್ಕಿಸಿ', call:'ಚಿಕಿತ್ಸಾಲಯಕ್ಕೆ ಕರೆ ಮಾಡಿ', visit:'ನಿಮ್ಮ ಭೇಟಿಯನ್ನು ಯೋಜಿಸಿ',
    faq:[
      ['ಭೇಟಿಗಾಗಿ ಹೇಗೆ ಕೋರಿಕೆ ಸಲ್ಲಿಸಬೇಕು?', 'ಭೇಟಿಯ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಸಲ್ಲಿಸಿದ ನಂತರ ತೋರಿಸುವ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯನ್ನು ಉಳಿಸಿಕೊಳ್ಳಿ. ಭೇಟಿಯ ಸಮಯವನ್ನು ಚಿಕಿತ್ಸಾಲಯವು ದೃಢಪಡಿಸುತ್ತದೆ.'],
      ['ನನ್ನ ಕೋರಿಕೆಯ ಸ್ಥಿತಿಯನ್ನು ಹೇಗೆ ಪರಿಶೀಲಿಸಬಹುದು?', 'ಭೇಟಿಯ ಸ್ಥಿತಿ ಪುಟದಲ್ಲಿ ನಿಮ್ಮ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ. ಬದಲಾವಣೆಗಾಗಿ ಚಿಕಿತ್ಸಾಲಯಕ್ಕೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಕೋರಿಕೆ ಸಲ್ಲಿಸಿದ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿರುವ ಆಯ್ಕೆಗಳನ್ನು ಬಳಸಿ.'],
      ['ಕನ್ನಡದಲ್ಲಿ ಕೋರಿಕೆ ಸಲ್ಲಿಸಬಹುದೇ?', 'ಹೌದು. ಯಾವುದೇ ಹಂತದಲ್ಲಿ ಪುಟದ ಮೇಲ್ಭಾಗದಲ್ಲಿರುವ ಕನ್ನಡ ಆಯ್ಕೆಯನ್ನು ಒತ್ತಿ. ಭಾಷೆ ಬದಲಾಯಿಸಿದಾಗ ನೀವು ನಮೂದಿಸಿದ ವಿವರಗಳು ಈ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಉಳಿಯುತ್ತವೆ.']
    ],
    topics:{
      privacy:[['ಭೇಟಿಯ ವಿವರಗಳು','ಭೇಟಿಯನ್ನು ನಿರ್ವಹಿಸಲು ಚಿಕಿತ್ಸಾಲಯವು ನಿಮ್ಮ ಸಂಪರ್ಕ ವಿವರಗಳು ಮತ್ತು ನೀವು ಆಯ್ಕೆಮಾಡಿದ ಸಮಯವನ್ನು ಬಳಸುತ್ತದೆ. ವಾಟ್ಸಾಪ್ ಸಂದೇಶಗಳಿಗೆ ಪ್ರತ್ಯೇಕವಾಗಿ ಒಪ್ಪಿಗೆ ನೀಡಬಹುದು.'],['ನಿಮ್ಮ ಬ್ರೌಸರ್','ಕುಕಿ ನಿಮ್ಮ ಭಾಷೆಯ ಆಯ್ಕೆಯನ್ನು ನೆನಪಿಡುತ್ತದೆ. ಭೇಟಿಯ ನಿರ್ವಹಣಾ ಕುಕಿ ಕೋರಿಕೆ ಸಲ್ಲಿಸಿದ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಬದಲಾವಣೆ ಮಾಡಲು ನೆರವಾಗುತ್ತದೆ. ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯನ್ನು ಗೌಪ್ಯವಾಗಿಡಿ.']],
      terms:[['ಭೇಟಿಯ ದೃಢೀಕರಣ','ಹೊರಡುವ ಮೊದಲು ನಿಮ್ಮ ಕೋರಿಕೆಯ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಬದಲಾವಣೆಗಾಗಿ ರದ್ದತಿ ಆಯ್ಕೆ ಬಳಸಿ ಅಥವಾ ಚಿಕಿತ್ಸಾಲಯವನ್ನು ಸಂಪರ್ಕಿಸಿ.'],['ಚಿಕಿತ್ಸೆಯ ಮಾಹಿತಿ','ಸಮಾಲೋಚನೆಯ ಸಮಯದಲ್ಲಿ ನಿಮಗೆ ಸೂಕ್ತವಾದ ಆಯ್ಕೆಗಳ ಬಗ್ಗೆ ದಂತವೈದ್ಯರೊಂದಿಗೆ ಚರ್ಚಿಸಬಹುದು.']],
      accessibility:[['ಜಾಲತಾಣದ ಬಳಕೆ','ಆಯ್ಕೆಗಳ ನಡುವೆ ಚಲಿಸಲು Tab ಕೀ ಮತ್ತು ಲಿಂಕ್ ತೆರೆಯಲು Enter ಕೀ ಬಳಸಿ. ಪುಟದ ಮೇಲ್ಭಾಗದಲ್ಲಿ ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡ ಆಯ್ಕೆಮಾಡಿ.'],['ಭೇಟಿಗಾಗಿ ನೆರವು','ಭೇಟಿಯ ಫಾರ್ಮ್ ಬಳಸಲು ತೊಂದರೆಯಾದರೆ ಚಿಕಿತ್ಸಾಲಯಕ್ಕೆ ಕರೆ ಮಾಡಿ.']]
    }
  }
};

export function informationPage(locale,path,t,clinic,title,description,reviewedFaq = []) {
  const copy = help[locale];
  const content = path === 'faq'
    ? [...copy.faq, ...reviewedFaq.map(({title,description}) => [title,description])].map(([question,answer]) =>
      `<details><summary>${h(question)}</summary><p>${h(answer)}</p></details>`).join('')
    : copy.topics[path].map(([heading,text]) => `<section><h2>${h(heading)}</h2><p>${h(text)}</p></section>`).join('');
  return `<div class="info-banner"><div class="shell"><p>${h(copy.heading)}</p><h1>${h(title)}</h1><p>${h(description)}</p></div></div>
    <div class="shell info-columns"><div class="info-content">${content}</div>
    <aside><h2>${h(copy.need)}</h2><p>${h(clinic.name)}</p><p>${h(clinic.address)}</p><a class="info-phone" href="${h(clinic.phoneHref)}">${h(clinic.phoneDisplay)}</a>
    ${button(route(locale,'book-appointment'),t.book)}<a href="${route(locale,'contact')}">${h(copy.visit)} ${arrowRight}</a></aside></div>`;
}
