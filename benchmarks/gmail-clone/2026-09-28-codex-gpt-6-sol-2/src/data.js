const hour = 60 * 60 * 1000
const day = 24 * hour
const now = Date.now()
const ago = (days, hours = 0) => now - days * day - hours * hour
const msg = (id, from, email, date, body, attachments) => ({
  id, from, email, to: 'Alex Morgan <alex.morgan@email.com>', date, body, attachments,
})
const thread = (id, subject, from, email, days, hours, body, options = {}) => ({
  id, subject, category: options.category ?? 'Primary', labels: options.labels ?? [], starred: options.starred ?? false,
  read: options.read ?? false, archived: options.archived ?? false, trashed: options.trashed ?? false,
  sentOnly: options.sentOnly,
  messages: [msg(`${id}-1`, from, email, ago(days, hours), body, options.attachments)],
})

export function seedMailbox() {
  const threads = [
    {
      ...thread('t1', 'Design review — a few thoughts for Thursday', 'Maya Chen', 'maya@northstar.design', 0, 0.5,
        'Hey Alex,\n\nI went through the latest screens this morning. The new navigation is feeling much clearer, especially the way the search and filters work together.\n\nI left a few comments in the file around spacing and the empty states. Nothing blocking — just details we can polish before Thursday.\n\nCould you take a look when you have a moment?\n\nThanks,\nMaya',
        { starred: true, labels: ['Work'], attachments: ['Review notes.pdf'] }),
      messages: [
        msg('t1-0', 'Alex Morgan', 'alex.morgan@email.com', ago(1, 2), 'Hi Maya,\n\nI’ve shared the updated exploration for the dashboard. Would love your first impressions before the review.\n\nAlex'),
        msg('t1-1', 'Maya Chen', 'maya@northstar.design', ago(0, 0.5), 'Hey Alex,\n\nI went through the latest screens this morning. The new navigation is feeling much clearer, especially the way the search and filters work together.\n\nI left a few comments in the file around spacing and the empty states. Nothing blocking — just details we can polish before Thursday.\n\nCould you take a look when you have a moment?\n\nThanks,\nMaya', ['Review notes.pdf']),
      ],
    },
    thread('t2', 'Your September statement is ready', 'Monarch', 'notifications@monarchmoney.com', 0, 1.2,
      'Hi Alex,\n\nYour September statement is ready to view. You can review your spending, see what changed, and plan for the month ahead.\n\nYour total spending this month: $3,842.19\n\nThanks for using Monarch.\nThe Monarch team',
      { category: 'Updates', attachments: ['September-statement.pdf'] }),
    thread('t3', 'Re: Weekend in Copenhagen', 'Sophie Laurent', 'sophie.laurent@gmail.com', 0, 2.8,
      'That sounds perfect! I found a little place near the water that looks lovely. I’m sending you the link later today.\n\nAlso, the photos from our last trip are finally ready — attaching a few favorites here.\n\nCan’t wait to see you,\nSophie',
      { starred: true, labels: ['Personal'], attachments: ['harbor.jpg', 'coffee-shop.jpg'] }),
    thread('t4', 'Introducing a calmer way to plan', 'Linear', 'team@linear.app', 0, 3.4,
      'Your work deserves a little more focus.\n\nToday we’re introducing updates to projects, timelines, and planning. The details are designed to help your team move with clarity.\n\nExplore what’s new in Linear.',
      { category: 'Updates', read: true }),
    thread('t5', 'A note about the presentation', 'Daniel Kim', 'daniel@studioform.co', 0, 4.1,
      'Hi Alex,\n\nThanks again for walking us through the concept yesterday. The story landed really well with the team.\n\nWould you be able to send the revised deck by Friday afternoon? I can pull together feedback from everyone once it’s in.\n\nBest,\nDaniel',
      { labels: ['Work'] }),
    thread('t6', 'Your package is on its way', 'Apple Store', 'shipping@orders.apple.com', 0, 5,
      'Good news, Alex. Your order has shipped.\n\nExpected delivery: Wednesday, October 1\nTracking number: 1Z8945E12\n\nWe’ll let you know when it arrives.',
      { category: 'Updates', read: true }),
    thread('t7', 'October reading list 📚', 'The Marginalian', 'newsletter@themarginalian.org', 1, 0,
      'Hello,\n\nThis week: stories about attention, a poem for the changing season, and a thoughtful look at the art of beginning again.\n\nMake a cup of tea, find a quiet corner, and enjoy.\n\nWarmly,\nThe Marginalian',
      { category: 'Promotions', read: true }),
    thread('t8', 'Dinner next week?', 'Oliver Reed', 'oliver.reed@gmail.com', 1, 2,
      'Hey!\n\nAre you free for dinner next Tuesday? A new spot opened on Grand Street and I thought you might want to check it out.\n\nLet me know,\nOliver',
      { labels: ['Personal'], starred: true }),
    thread('t9', 'Figma file access granted', 'Figma', 'notifications@figma.com', 1, 4,
      'You now have access to “Atlas — Product Design”.\n\nMaya Chen invited you to collaborate. Open the file to see the latest updates and comments.',
      { category: 'Updates', read: true, labels: ['Work'] }),
    thread('t10', 'Invoice for September', 'Nina Patel', 'nina@paperplane.studio', 2, 1,
      'Hi Alex,\n\nAttached is the invoice for the illustration work completed in September. Thanks for such a smooth collaboration this month.\n\nLet me know if you need any changes.\n\nBest,\nNina',
      { labels: ['Finance'], attachments: ['Invoice-0926.pdf'], read: true }),
    thread('t11', 'A little something for your next trip', 'Airbnb', 'hello@airbnb.com', 2, 4,
      'The best trips begin with a little curiosity. We found places you might love for your next getaway.\n\nExplore stays picked for you.',
      { category: 'Promotions', read: true }),
    thread('t12', 'Project Atlas · weekly notes', 'Priya Shah', 'priya@northstar.design', 3, 1,
      'Hi team,\n\nHere are the notes from our weekly sync. The onboarding work is on track and the first prototype is ready for feedback.\n\nNext steps:\n• Review the prototype\n• Finalize the content map\n• Share open questions before Thursday\n\nThanks,\nPriya',
      { labels: ['Work'], attachments: ['Atlas-weekly-notes.docx'], read: true }),
    thread('t13', 'Your reservation is confirmed', 'Resy', 'confirmations@resy.com', 3, 5,
      'Your table is booked!\n\nFriday, October 3 · 7:30 PM\nTable for 2 at Maison Yaki\n\nWe look forward to seeing you there.',
      { category: 'Updates', starred: true, read: true }),
    thread('t14', 'Quick question about the copy', 'Jordan Lee', 'jordan@northstar.design', 4, 2,
      'Hey Alex,\n\nDo you have a preferred version of the welcome email copy? I saw two directions in the document and want to make sure we’re building from the right one.\n\nThanks!\nJordan',
      { labels: ['Work'], read: true }),
    thread('t15', 'An invitation to slow down', 'Headspace', 'hello@email.headspace.com', 4, 6,
      'Take a moment for yourself today. A new set of guided sessions is ready whenever you are.\n\nA few minutes can make all the difference.',
      { category: 'Promotions', read: true }),
    thread('t16', 'Photos from the cabin', 'Emma Wilson', 'emma.wilson@gmail.com', 5, 1,
      'Finally got around to sorting through the photos from the cabin. These made me smile.\n\nLet’s do it again before the year ends!\n\nEmma',
      { labels: ['Personal'], attachments: ['cabin-01.jpg', 'cabin-02.jpg', 'cabin-03.jpg'], read: true }),
    thread('t17', 'Your monthly product digest', 'Notion', 'team@email.notion.so', 6, 2,
      'A roundup of new ways to shape your workspace. This month: easier sharing, better search, and thoughtful little improvements across the product.',
      { category: 'Updates', read: true }),
    thread('t18', 'Coffee after the workshop', 'Amara Okafor', 'amara@common.studio', 7, 1,
      'Hi Alex,\n\nIt was so good meeting you at the workshop. I’d love to hear more about your work. Are you up for coffee next week?\n\nAll the best,\nAmara',
      { labels: ['Personal'], read: true }),
    thread('t19', 'Thanks for the conversation', 'Alex Morgan', 'alex.morgan@email.com', 1, 6,
      'Hi Amara,\n\nIt was great meeting you too. I really enjoyed our conversation about the design process. Let’s definitely stay in touch.\n\nAlex',
      { sentOnly: true, read: true }),
    thread('t20', 'Updated project timeline', 'Alex Morgan', 'alex.morgan@email.com', 3, 6,
      'Hi team,\n\nSharing the updated timeline for Atlas. I’ve added the milestones we discussed and left room for feedback after the first test.\n\nLet me know what you think.\n\nAlex',
      { sentOnly: true, read: true, labels: ['Work'], attachments: ['Atlas-timeline.pdf'] }),
    thread('t21', 'Your account security update', 'Dropbox', 'no-reply@dropbox.com', 8, 3,
      'Your Dropbox account was signed in on a new device. If this was you, no action is needed.\n\nDevice: Chrome on macOS\nLocation: San Francisco, CA',
      { category: 'Updates', archived: true, read: true }),
    thread('t22', 'Old brainstorming notes', 'Maya Chen', 'maya@northstar.design', 12, 1,
      'I found our notes from the first brainstorming session. Keeping them here in case we want to reference them later.',
      { trashed: true, read: true, labels: ['Work'] }),
  ]
  threads.find(t => t.id === 't1').messages[0].to = 'Maya Chen <maya@northstar.design>'
  threads.find(t => t.id === 't1').messages[0].outgoing = true
  threads.find(t => t.id === 't19').messages[0].to = 'Amara Okafor <amara@common.studio>'
  threads.find(t => t.id === 't19').messages[0].outgoing = true
  threads.find(t => t.id === 't20').messages[0].to = 'Priya Shah <priya@northstar.design>'
  threads.find(t => t.id === 't20').messages[0].outgoing = true
  return {
    threads,
    drafts: [{ id: 'draft-1', to: 'Maya Chen <maya@northstar.design>', subject: 'Re: Design review — a few thoughts for Thursday', body: 'Hi Maya,\n\nThanks for the thoughtful feedback. I’ll look through your notes this afternoon and send over an updated version.', attachments: [], updatedAt: ago(0, 1.5), replyTo: 't1' }],
    customLabels: ['Work', 'Personal', 'Finance'],
  }
}

export function latest(thread) {
  return thread.messages[thread.messages.length - 1]
}

export function getInitials(value) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')
}
