import type { Contact } from './types';
import { firstName, htmlToText, md } from './text';

const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];

export function generateReply(contact: Contact, userHtml: string, subject: string): string {
  const text = htmlToText(userHtml).toLowerCase();
  const seed = text.length + subject.length;
  const persona = contact.persona ?? 'warm';
  const name = firstName(contact.name);
  const asked = text.includes('?');

  let core: string;
  if (/lunch|dinner|coffee|drinks|brunch/.test(text)) {
    core = pick(
      {
        warm: ['Yes please, that sounds lovely. Does 12:30 work?', 'I would love that. Name the place and I will be there.'],
        brisk: ['12:30 works. See you there.', 'In. Send me the address.'],
        formal: ['That would be very welcome. I am available at 12:30 if that suits you.'],
        playful: ['Food? Say less. I am already putting my shoes on.', 'You had me at "lunch". 12:30?'],
      }[persona],
      seed,
    );
  } else if (/attached|attachment|deck|slides|invoice|doc|pdf/.test(text)) {
    core = pick(
      {
        warm: ['Got the attachment, thank you! I will read it properly this afternoon and send thoughts.'],
        brisk: ['Received. Will review today and come back with comments.'],
        formal: ['Thank you for the attachment. I will review it and revert with comments by tomorrow.'],
        playful: ['Attachment received and admired from afar. Reading it now, snacks in hand.'],
      }[persona],
      seed,
    );
  } else if (/meeting|call|sync|schedule|calendar|thursday|friday|monday/.test(text)) {
    core = pick(
      {
        warm: ['That works for me! I will send a calendar hold shortly.'],
        brisk: ['Works. Invite coming.'],
        formal: ['That timing is convenient. I will circulate a calendar invitation.'],
        playful: ['Calendar hold incoming. Bring your best ideas and your worst puns.'],
      }[persona],
      seed,
    );
  } else if (/thank|thanks|appreciate/.test(text)) {
    core = pick(
      {
        warm: ['Anytime! Happy to help.'],
        brisk: ['No problem.'],
        formal: ['You are most welcome.'],
        playful: ['Anytime, boss. Invoice is in the mail. (Kidding.)'],
      }[persona],
      seed,
    );
  } else if (asked) {
    core = pick(
      {
        warm: ['Good question! My instinct is yes, but let me double check with the team and get back to you today.'],
        brisk: ['Yes. Go ahead.'],
        formal: ['In principle yes; let me confirm the details and respond formally.'],
        playful: ['Short answer: yes. Long answer: yes, but with feelings.'],
      }[persona],
      seed,
    );
  } else {
    core = pick(
      {
        warm: ['Thanks for sending this over! Makes sense to me, and I will follow up if anything comes up.', 'Got it, thank you. Appreciate the heads-up!'],
        brisk: ['Got it.', 'Noted. Will handle.'],
        formal: ['Thank you for your message. I have noted the contents and will respond in due course.'],
        playful: ['Message received, loud and clear. Carry on!'],
      }[persona],
      seed,
    );
  }

  const greeting = persona === 'formal' ? `Dear Avery,` : persona === 'brisk' ? '' : `Hi Avery,`;
  const signoff = persona === 'formal' ? `Kind regards,\n${name}` : persona === 'brisk' ? name : `${name}`;
  return md([greeting, core, signoff].filter(Boolean).join('\n\n'));
}
