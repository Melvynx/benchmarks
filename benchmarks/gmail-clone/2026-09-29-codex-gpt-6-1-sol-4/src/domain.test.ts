import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeedMail } from './data.ts';
import { matchesSearch } from './utils.ts';
import { updateMail, createOutgoingMail, recipientsValid, wakeMail } from './domain.ts';

test('seeded mailbox includes required folders, real threads, attachments, and unread mail', () => {
  const mails = createSeedMail();
  for (const folder of ['inbox', 'sent', 'drafts', 'trash']) assert.ok(mails.some(mail => mail.folder === folder));
  assert.ok(mails.some(mail => mail.messages.length >= 3));
  assert.ok(mails.some(mail => mail.attachments.length > 0));
  assert.ok(mails.some(mail => !mail.read));
  assert.equal(new Set(mails.map(mail => mail.id)).size, mails.length);
});
test('search combines Gmail operators and finds message content', () => {
  const mail = createSeedMail()[0];
  assert.ok(matchesSearch(mail, 'from:olivia has:attachment is:unread label:Work'));
  assert.ok(matchesSearch(mail, '"mobile navigation"'));
  assert.ok(!matchesSearch(mail, 'from:daniel'));
  assert.ok(!matchesSearch(mail, 'in:sent'));
});
test('bulk actions do not affect unselected mail and trash remembers the original folder', () => {
  const mails = createSeedMail();
  const selected = mails.filter(mail => mail.folder === 'sent')[0];
  const trashed = updateMail(mails, [selected.id], 'trash');
  assert.equal(trashed.find(mail => mail.id === selected.id)?.folder, 'trash');
  assert.equal(trashed[0], mails[0]);
  const restored = updateMail(trashed, [selected.id], 'restore');
  assert.equal(restored.find(mail => mail.id === selected.id)?.folder, 'sent');
});
test('labels are unique, removable, and searchable', () => {
  let mails = createSeedMail();
  mails = updateMail(mails, ['mail-1'], 'label', 'Travel');
  mails = updateMail(mails, ['mail-1'], 'label', 'Travel');
  assert.equal(mails[0].labels.filter(label => label === 'Travel').length, 1);
  assert.ok(matchesSearch(mails[0], 'label:Travel'));
  mails = updateMail(mails, ['mail-1'], 'unlabel', 'Travel');
  assert.ok(!mails[0].labels.includes('Travel'));
});
test('compose validates all recipients and retains draft data when sent', () => {
  assert.ok(recipientsValid('olivia@studio.co, daniel@studio.co'));
  assert.ok(!recipientsValid(''));
  assert.ok(!recipientsValid('olivia@studio.co, invalid'));
  const draft = createOutgoingMail({ id: 'draft-test', to: 'olivia@studio.co', subject: 'Review', body: 'Looks good!', attachments: [] });
  assert.equal(draft.folder, 'drafts');
  const sent = createOutgoingMail({ id: draft.id, to: draft.to!, subject: draft.subject, body: draft.messages[0].body, attachments: draft.attachments }, 'sent');
  assert.equal(sent.folder, 'sent');
  assert.equal(sent.id, draft.id);
  assert.equal(sent.messages[0].body, 'Looks good!');
});
test('snoozed mail and scheduled sends transition only after their due time', () => {
  const mails = createSeedMail();
  const future = new Date(Date.now() + 3600000).toISOString();
  const snoozed = updateMail(mails, ['mail-1'], 'snooze', future);
  assert.equal(wakeMail(snoozed)[0].folder, 'snoozed');
  assert.equal(wakeMail(snoozed, Date.now() + 7200000)[0].folder, 'inbox');
  const outgoing = createOutgoingMail({ to: 'olivia@studio.co', subject: 'Tomorrow', body: 'Hello', attachments: [] }, 'scheduled');
  outgoing.wakeAt = future;
  assert.equal(wakeMail([outgoing], Date.now() + 7200000)[0].folder, 'sent');
});
test('a scheduled reply joins the original conversation exactly once, including a snoozed thread', () => {
  const mails = createSeedMail();
  const due = new Date(Date.now() - 1000).toISOString();
  const original = updateMail(mails, ['mail-1'], 'snooze', due)[0];
  const reply = createOutgoingMail({ id: 'scheduled-reply', to: 'olivia@studio.co', subject: 'Re: Website redesign', body: 'Ready for handoff!', attachments: [], replyTo: original.id }, 'scheduled');
  reply.wakeAt = due;
  const updated = wakeMail([original, reply]);
  assert.equal(updated[0].folder, 'inbox');
  assert.equal(updated[0].messages.length, original.messages.length + 1);
  assert.equal(updated[0].messages.at(-1)?.body, 'Ready for handoff!');
  assert.equal(updated[1].folder, 'sent');
  assert.equal(wakeMail(updated)[0].messages.length, updated[0].messages.length);
});
