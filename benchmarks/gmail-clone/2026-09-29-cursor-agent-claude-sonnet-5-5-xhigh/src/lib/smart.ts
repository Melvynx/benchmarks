import type { Message } from './types';
import { htmlToText } from './text';

export function smartReplies(msg: Message): string[] {
  if (msg.unsubscribe || /no-?reply|notifications?@|statements@|billing@|deals@|hello@/i.test(msg.from.email)) return [];
  const text = htmlToText(msg.html).toLowerCase();
  if (!text) return [];
  if (/\b(can you|could you|are you|do you|would you|can we|does .* work|thoughts\?|\?)/.test(text) && /(meet|call|sync|thursday|friday|monday|tomorrow|lunch|dinner|time|available|works)/.test(text)) {
    return ['Yes, that works for me.', 'Can we do another time?', 'Let me check and get back to you.'];
  }
  if (/(please|need|by (thu|fri|mon|tue|wed)|deadline|review|approve|send me)/.test(text)) {
    return ['On it, will do.', 'I’ll take a look today.', 'Can I get an extra day?'];
  }
  if (/(thank|thanks|great|love|awesome|congrat)/.test(text)) {
    return ['Anytime!', 'Glad it helped.', 'Thank you!'];
  }
  if (text.includes('?')) return ['Yes, sounds good.', 'Not sure yet, will follow up.', 'Thanks for asking!'];
  return ['Thanks!', 'Got it, thank you.', 'Sounds good.'];
}
