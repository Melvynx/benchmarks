import type { Contact, Message } from './types';
import { hash } from '../data/seedTypes';

type Tone = 'work' | 'family' | 'friend';
type Topic = 'schedule' | 'attachment' | 'invoice' | 'review' | 'thanks' | 'sorry' | 'question' | 'default';

const FAMILY = new Set(['linda', 'riley', 'frank']);

function toneFor(c: Contact): Tone {
  if (FAMILY.has(c.id)) return 'family';
  if (c.org) return 'work';
  return 'friend';
}

function topicFor(sent: Message): Topic {
  const t = `${sent.text}`.toLowerCase();
  if (sent.attachments.length || /\battach|enclosed|see the file/.test(t)) return 'attachment';
  if (/invoice|payment|\bpay\b|receipt/.test(t)) return 'invoice';
  if (/\b(meet|call|sync|lunch|dinner|coffee|drinks?|catch up|free (on|at|tomorrow)|available|availability|schedule)\b/.test(t)) return 'schedule';
  if (/review|feedback|thoughts|take a look|look at|draft|proposal/.test(t)) return 'review';
  if (/sorry|apolog|running late|delay|my bad/.test(t)) return 'sorry';
  if (/thank|thanks|appreciate|cheers/.test(t) && !t.includes('?')) return 'thanks';
  if (t.includes('?')) return 'question';
  return 'default';
}

const LINES: Record<Tone, Record<Topic, string[]>> = {
  work: {
    schedule: [
      'I can do tomorrow after 2pm, or first thing the day after. Would either work for you? Happy to keep it to 25 minutes.',
      'Works for me. Send over an invite and I will make sure the calendar is clear.',
    ],
    attachment: [
      'Got it, thanks for sending this over. I will go through it properly this afternoon and come back with comments before end of day.',
      'Received. First skim looks really solid. Give me a couple of hours and I will send detailed notes.',
    ],
    invoice: [
      'Thanks. I have forwarded this to finance and it should go out in the next payment run. I will ping you if anything is missing.',
      'Received, thank you. Approved on my side. Finance usually needs a few business days.',
    ],
    review: [
      'Thanks for the nudge. I will block time this afternoon to look properly and reply inline. Broadly I think the direction is right.',
      'Looks promising. A couple of small questions, but nothing blocking. I will write them up and send them over shortly.',
    ],
    thanks: [
      'Anytime! Let me know if you need anything else from my side.',
      'Happy to help. Shout if something else comes up.',
    ],
    sorry: [
      'No worries at all, thanks for the heads-up. We will work around it.',
      'All good, appreciate you letting me know.',
    ],
    question: [
      'Good question. My instinct is yes, but let me double-check with the team and confirm by end of day.',
      'Short answer: yes, that works for me. I will loop in the others so we are all on the same page.',
      'Let me think about that and come back to you shortly. I want to make sure I give you the right answer.',
    ],
    default: [
      'Thanks for the update. That is helpful context. I will follow up if I have questions.',
      'Noted, thank you. I will pick this up first thing tomorrow.',
    ],
  },
  family: {
    schedule: [
      'That sounds lovely! Let me know what time and I will be there. Should I bring anything?',
      'Yes, that works! Put it on the calendar and I will make sure nothing else gets in the way.',
    ],
    attachment: [
      'Got it, thank you sweetie! I had a look and it opened fine. Lovely, as always.',
      'Received! Everything came through. I will print it out and put it on the fridge.',
    ],
    invoice: ['Thanks for letting me know. I will sort it out this week, promise.'],
    review: ['I read it twice! I think it is wonderful, but you know I am biased. Call me later if you want the long version.'],
    thanks: ['You are so welcome. Love you, talk soon!', 'Of course! Anything for you. Give me a call this weekend.'],
    sorry: ['Oh, do not worry about it at all. These things happen. Just take care of yourself.'],
    question: [
      'Good question! I will ask around and let you know tonight. Are you eating properly, by the way?',
      'Yes, I think so, but let me check and get back to you.',
    ],
    default: ['Thanks for letting me know! Speak soon. Call me when you have a minute.', 'Lovely to hear from you. Are you still coming this weekend?'],
  },
  friend: {
    schedule: [
      'I am in! Tomorrow evening or the weekend both work for me. Pick a place and I will be there.',
      'Yes, let us do it. I am free after 6 most days this week.',
    ],
    attachment: ['Got it, thanks! Just opened it. Looks great, will take a proper look later.', 'Received! Amazing, thank you.'],
    invoice: ['Sent you the money just now. Let me know if it does not show up.'],
    review: ['Read it on the train. Honestly? Really good. Two tiny thoughts, will send them tonight.'],
    thanks: ['Ha, anytime! You would do the same for me.', 'No problem at all. Buy me a coffee next time.'],
    sorry: ['Ha, no stress. I was running late myself.'],
    question: ['Honestly, yes. But let me think about it and get back to you in a bit.', 'Good question. Ask me again over drinks?'],
    default: ['Ha, nice one. Talk soon!', 'Thanks for the message! Let us catch up properly soon.'],
  },
};

const SIGNOFF: Record<string, string> = {
  priya: 'Priya',
  marcus: 'Marcus',
  elena: 'Elena',
  tom: 'T',
  amara: 'Amara',
  sofia: 'Sofia',
  kenji: 'Kenji',
  hannah: 'Hannah',
  linda: 'Love, Mom',
  riley: 'xx R',
  frank: 'Dad',
};

const OPENERS: Record<Tone, string[]> = {
  work: ['Hi Jordan,', 'Hey Jordan,', 'Hi Jordan,'],
  family: ['Hi sweetheart,', 'Hi love,', 'Hi Jordan,'],
  friend: ['Hey!', 'Hey Jordan,', 'Hi!'],
};

/** Build a plausible reply (mini-markdown) from `contact` to a message the user just sent. */
export function composeReply(contact: Contact, sent: Message): string {
  const tone = toneFor(contact);
  const topic = topicFor(sent);
  const seed = hash(sent.id + contact.id);
  const pool = LINES[tone][topic];
  const body = pool[seed % pool.length];
  const opener = OPENERS[tone][seed % OPENERS[tone].length];
  const first = contact.name.split(/\s+/)[0];
  const sign = SIGNOFF[contact.id] ?? (tone === 'work' ? `Best,\n${first}` : first);
  return `${opener}\n\n${body}\n\n${sign}`;
}

export function replyDelayMs(sent: Message): number {
  return 9000 + (hash(sent.id) % 14000);
}

/* ---------- smart replies ---------- */

export function smartReplies(last: Message | undefined): string[] {
  if (!last) return [];
  const t = last.text.toLowerCase();
  if (last.unsubscribe || /unsubscribe|no-reply|noreply/.test(last.from.email)) return [];
  if (/\b(lunch|dinner|coffee|drinks?|meet|call|sync|catch up)\b/.test(t) && t.includes('?')) {
    return ['Sounds great, works for me!', 'Can we do a bit later?', "Sorry, I can't make it."];
  }
  if (/thank|thanks|appreciate/.test(t)) return ["You're welcome!", 'Happy to help!', 'Anytime!'];
  if (/\battach|review|feedback|thoughts|take a look/.test(t)) return ["Thanks, I'll take a look.", 'Looks good to me!', 'Can we discuss this?'];
  if (t.includes('?')) return ['Yes, that works.', 'Let me check and get back to you.', 'Not right now, thanks.'];
  if (/invite|calendar|rsvp/.test(t)) return ["I'll be there!", "Can't make it, sorry.", 'Maybe, let me check.'];
  return ['Thanks!', 'Got it, thank you.', 'Sounds good.'];
}
