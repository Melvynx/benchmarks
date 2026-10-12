export const me = { name: 'Maya Chen', email: 'maya.chen@northstar.studio' };
export const labelColors = {
    Work: '#6975dc', Personal: '#d78b6c', Finance: '#66a590', Travel: '#ae83cb',
    Receipts: '#d7a44a', Ideas: '#5d9cc0', Design: '#d483a7',
};
const seeds = [
    {
        sender: 'Olivia Rhye', email: 'olivia@layered.design', subject: 'The final brand direction is ready', hours: 0.4,
        body: 'Hey Maya,\n\nI pulled together the final brand direction after our review. The warmer palette really gives the system the personality we were looking for, and the type pairing feels much more confident now.\n\nI attached the updated presentation and logo exports. Take a look when you have a moment — especially pages 12–16 where the digital applications come together.\n\nWould love your thoughts before we share it with the wider team on Thursday.\n\nOlivia',
        labels: ['Work', 'Design'], unread: true, starred: true, attachments: ['Northstar brand direction.pdf', 'Logo exports.zip'],
        conversation: { sender: 'Maya Chen', email: me.email, body: 'Thanks, Olivia! The last round was already looking strong. Excited to see where you landed with the palette.', hours: 24, outgoing: true },
    },
    {
        sender: 'Daniel Kim', email: 'daniel@frameworks.team', subject: 'Re: Thursday product review', hours: 1.3,
        body: 'Perfect. I moved the review to 2:30 PM and added the engineering leads.\n\nWe’ll focus on the onboarding changes and the new workspace overview. If you can bring the latest prototype, we should be able to make the final call in the room.\n\nSee you Thursday,\nDaniel',
        labels: ['Work'], unread: true,
        conversation: { sender: 'Maya Chen', email: me.email, body: 'Thursday works for me. Could we push it to 2:30? I want to get one more pass on the prototype in the morning.', hours: 30, outgoing: true },
    },
    {
        sender: 'Sofia Martinez', email: 'sofia@fieldnotes.co', subject: 'Coffee next week?', hours: 2.7,
        body: 'Hi Maya!\n\nI’ll be in the city next week and would love to catch up. There’s a new little café on Mercer I think you’d like. Tuesday or Wednesday morning?\n\nAlso, I finally finished the book you recommended. We need to talk about that ending.\n\nSofia',
        labels: ['Personal'], unread: true, starred: true,
    },
    {
        sender: 'Linear', email: 'notifications@linear.app', subject: 'Your team’s week in Northstar', hours: 4,
        body: 'Your weekly snapshot is here.\n\n18 issues completed this week · 6 projects moved forward · 3 milestones reached.\n\nHighlights: The new onboarding flow is ready for review, the mobile navigation updates shipped, and the design system documentation is now live.\n\nKeep the momentum going,\nThe Linear team',
        category: 'updates', labels: ['Work'], unread: true,
    },
    {
        sender: 'Ethan Brooks', email: 'ethan@northstar.studio', subject: 'A few notes on the launch page', hours: 6,
        body: 'Hey Maya,\n\nThe launch page is in really good shape. I left a few small comments in the file, mainly around the testimonial order and the mobile hero spacing. Nothing that should block us.\n\nCan you send me the updated preview once those are in? I’ll give it a final pass before we hand it to marketing.\n\nThanks!\nEthan',
        labels: ['Work', 'Design'], unread: true, attachments: ['Launch page feedback.pdf'],
    },
    {
        sender: 'Airbnb', email: 'automated@airbnb.com', subject: 'Your trip to Lisbon is confirmed', hours: 9,
        body: 'You’re going to Lisbon!\n\nYour reservation at Casa do Pátio is confirmed for October 14–19. Your host Inês will send check-in details closer to your trip.\n\nConfirmation code: HMR9Q2P7\n\nGet ready to explore,\nAirbnb',
        category: 'updates', labels: ['Travel', 'Receipts'], unread: false, starred: true, attachments: ['Reservation.pdf'],
    },
    {
        sender: 'Amara Johnson', email: 'amara@goodform.gallery', subject: 'Invitation: The shape of things', hours: 13,
        body: 'Hi Maya,\n\nWe’re opening our fall exhibition next Friday and I’d love for you to come. The show explores everyday objects through the work of six incredible artists.\n\nOpening reception: Friday, 6–9 PM at Goodform Gallery. Bring a friend!\n\nHope to see you there,\nAmara',
        labels: ['Personal'], unread: false,
    },
    {
        sender: 'Figma', email: 'updates@figma.com', subject: 'What’s new in Figma this month', hours: 20,
        body: 'This month: a faster way to explore variables, more control over your prototypes, and fresh inspiration from the community.\n\nSee what’s new and find ideas for your next project.\n\nThe Figma team',
        category: 'updates', labels: ['Design'], unread: false,
    },
    {
        sender: 'Noah Williams', email: 'noah@northstar.studio', subject: 'Homepage illustrations — round two', hours: 26,
        body: 'Hi Maya,\n\nI made the adjustments we discussed and pushed the illustrations a little further. The scenes feel more human now, and the visual weight holds up much better at smaller sizes.\n\nI’ve included both the light and dark versions in the folder. Let me know which one you want to move forward with.\n\nNoah',
        labels: ['Work', 'Design'], unread: false, attachments: ['Homepage illustrations.fig', 'Preview.png'],
    },
    {
        sender: 'The New Yorker', email: 'newsletter@newyorker.com', subject: 'The Sunday Reading List', hours: 31,
        body: 'Good morning,\n\nA selection of stories worth slowing down for this weekend: the quiet appeal of old bookshops, a photographer’s view of changing cities, and an interview with the novelist everyone is talking about.\n\nEnjoy your reading,\nThe New Yorker',
        category: 'promotions', unread: false,
    },
    {
        sender: 'Priya Shah', email: 'priya@orbit.health', subject: 'Thanks for the thoughtful feedback', hours: 45,
        body: 'Maya,\n\nThank you for taking the time to review our early concepts. Your point about making the daily view feel calmer has stayed with the team. We’ve already started exploring a simpler approach.\n\nI’d love to show you what we come up with in a few weeks.\n\nPriya',
        labels: ['Work'], unread: false, starred: true,
    },
    {
        sender: 'Stripe', email: 'notifications@stripe.com', subject: 'Your August invoice is available', hours: 52,
        body: 'Your August invoice is ready.\n\nAmount due: $48.00\nPayment method: Visa ending in 4242\n\nYou can download a copy for your records. Thanks for using Stripe.',
        category: 'updates', labels: ['Finance', 'Receipts'], unread: false, attachments: ['Invoice-2026-08.pdf'],
    },
    {
        sender: 'Leo Park', email: 'leo@studio-lumen.com', subject: 'Reference images from our walk', hours: 70,
        body: 'Hey Maya,\n\nHere are the reference shots from Saturday. The light in the old station was even better than I remembered. I think there’s a really interesting direction in those tiled details and the blue shadows.\n\nLet’s compare notes soon.\n\nLeo',
        labels: ['Personal', 'Ideas'], unread: false, attachments: ['Station references.zip'],
    },
    {
        sender: 'Notion', email: 'team@email.notion.so', subject: 'Your workspace digest', hours: 92,
        body: 'Here’s what happened in your workspace this week.\n\nThe Product Roadmap was updated 8 times. Two new documents were shared with you. Your team added 14 comments across projects.\n\nStay in sync,\nNotion',
        category: 'updates', labels: ['Work'], unread: false,
    },
    {
        sender: 'Mom', email: 'mom.chen@example.com', subject: 'Photos from the weekend 🌿', hours: 115,
        body: 'Hi sweetheart,\n\nI finally got around to sending the photos from our walk. The garden looked so beautiful after the rain. Your dad says we should do it again when the leaves change.\n\nLove,\nMom',
        labels: ['Personal'], unread: false, starred: true, attachments: ['garden-01.jpg', 'garden-02.jpg', 'garden-03.jpg'],
    },
    {
        sender: 'Goodreads', email: 'no-reply@goodreads.com', subject: 'Your September reading challenge', hours: 146,
        body: 'You’re 3 books ahead of schedule!\n\nYou’ve read 21 of your 30 book goal this year. Keep turning pages and see what your friends are reading this month.\n\nHappy reading,\nGoodreads',
        category: 'social', labels: ['Personal'], unread: false,
    },
    {
        sender: 'Aesop', email: 'communications@aesop.com', subject: 'A note on the changing season', hours: 168,
        body: 'As the season turns, discover considered rituals for the days ahead. A collection of familiar favorites and new formulations is waiting to be explored.\n\nWarm regards,\nAesop',
        category: 'promotions', unread: false,
    },
    {
        sender: 'Harper Lee', email: 'harper@northstar.studio', subject: 'Research summary and interview notes', hours: 192,
        body: 'Hi Maya,\n\nThe synthesis from our latest round of interviews is ready. The biggest theme is that people want to understand their progress without having to interpret a dashboard.\n\nI’ve linked the key moments in the summary and attached the full notes for anyone who wants to go deeper.\n\nHarper',
        labels: ['Work'], unread: false, attachments: ['Research summary.pdf', 'Interview notes.docx'],
    },
    {
        sender: 'Kelsey Tran', email: 'kelsey@forma.co', subject: 'A tiny collaboration idea', hours: 220,
        body: 'Hi Maya,\n\nI saw your recent work on Northstar and thought there might be a fun opportunity to collaborate on a small editorial project. It’s early, but I think your eye would be perfect for it.\n\nWould you be open to a quick call next week?\n\nKelsey',
        labels: ['Ideas'], unread: false, folder: 'archive',
    },
    {
        sender: 'Maya Chen', email: me.email, subject: 'Project brief and next steps', hours: 28,
        body: 'Hi team,\n\nHere’s the updated project brief from today’s workshop. I’ve incorporated the priorities we agreed on and added a short list of decisions for next week.\n\nPlease leave comments by Friday afternoon.\n\nMaya',
        folder: 'sent', labels: ['Work'], attachments: ['Project brief.pdf'],
    },
    {
        sender: 'Maya Chen', email: me.email, subject: 'Weekend recommendations', hours: 80,
        body: 'Sofia,\n\nHere are the places I mentioned: the tiny bookstore on Orchard, Little Fox for lunch, and that new exhibit at the museum. Let me know what you end up seeing!\n\nMaya',
        folder: 'sent', labels: ['Personal'],
    },
    {
        sender: 'Maya Chen', email: me.email, subject: 'Re: Q4 planning notes', hours: 160,
        body: 'Hi Daniel,\n\nThese priorities look right to me. I added a few thoughts about sequencing the research work before we commit to the new navigation.\n\nHappy to discuss in our sync.\nMaya',
        folder: 'sent', labels: ['Work'],
    },
    {
        sender: 'Maya Chen', email: me.email, subject: 'Moodboard for the autumn collection', hours: 254,
        body: 'Hi Amara,\n\nI promised I’d send you the references we talked about. The textures are especially interesting — I think they could work beautifully with the quieter typography.\n\nMaya',
        folder: 'sent', labels: ['Ideas'], attachments: ['Autumn moodboard.pdf'],
    },
    {
        sender: 'Unknown', email: 'offers@random-deals.example', subject: 'A deal you cannot miss', hours: 86,
        body: 'Limited time offer. Shop now for special prices on items you never asked about.',
        folder: 'trash', category: 'promotions',
    },
    {
        sender: 'Event reminders', email: 'hello@old-events.example', subject: 'Last chance to register', hours: 310,
        body: 'Registration for this event closes tonight. We hope to see you there.',
        folder: 'trash', category: 'promotions',
    },
];
const ago = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
export function createMailbox() {
    const threads = seeds.map((seed, index) => {
        const messages = [];
        if (seed.conversation) {
            messages.push({
                id: `message-${index}-0`, from: seed.conversation.sender, email: seed.conversation.email,
                to: seed.conversation.outgoing ? seed.email : me.email, date: ago(seed.conversation.hours),
                body: seed.conversation.body, outgoing: seed.conversation.outgoing,
            });
        }
        messages.push({
            id: `message-${index}-1`, from: seed.sender, email: seed.email,
            to: seed.folder === 'sent' ? 'team@northstar.studio' : me.email,
            date: ago(seed.hours), body: seed.body, attachments: seed.attachments,
            outgoing: seed.folder === 'sent',
        });
        return {
            id: `thread-${index}`, subject: seed.subject, messages,
            folder: seed.folder ?? 'inbox', category: seed.category ?? 'primary', labels: seed.labels ?? [],
            unread: seed.unread ?? false, starred: seed.starred ?? false,
        };
    });
    return {
        threads,
        drafts: [
            { id: 'draft-1', to: 'jules@northstar.studio', subject: 'Notes from our conversation', body: 'Hi Jules,\n\nI’ve been thinking about the direction we discussed for the new workspace.', updatedAt: ago(3) },
            { id: 'draft-2', to: 'sofia@fieldnotes.co', subject: 'Re: The book you recommended', body: 'You were right — I could not put it down! ', updatedAt: ago(40) },
        ],
        labels: ['Work', 'Personal', 'Finance', 'Travel', 'Receipts', 'Ideas', 'Design'],
    };
}
