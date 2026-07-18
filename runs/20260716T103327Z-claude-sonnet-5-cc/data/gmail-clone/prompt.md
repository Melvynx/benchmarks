<challenge>
Design and build the strongest Gmail-inspired email application you can.

Recreate the clarity, information density, speed, and familiar workflows of a great modern inbox. Take the implementation as far as you can: choose the stack, scope, visual direction, data model, and technical limits that let you deliver the most convincing complete product.
</challenge>

<essential-outcomes>
The finished application must include:

- A polished, responsive mail shell with a recognizable inbox, navigation, toolbar, search, and account controls.
- A realistic seeded mailbox with varied senders, subjects, timestamps, labels, read states, attachments, threads, and message content.
- Functional mailbox navigation for at least Inbox, Starred, Sent, Drafts, and Trash.
- Working message selection, read/unread state, starring, archiving, deleting, and labeling.
- A usable search experience that filters or retrieves relevant mail.
- A message-reading view with a clear conversation hierarchy and useful actions.
- A compose experience with recipients, subject, body, draft behavior, send behavior, and a polished interaction model.
- Responsive behavior that remains coherent and usable on both desktop and mobile.
</essential-outcomes>

<product-depth>
Go beyond a static visual recreation. Interactions should update the interface consistently, preserve state where useful, and make the product feel alive. You may add keyboard shortcuts, bulk actions, category tabs, snoozing, scheduled mail, contact suggestions, rich composition, settings, themes, offline persistence, or any other details that strengthen the experience.

No external email account, authentication, paid service, or API key is required. A fully local product with excellent seeded data and convincing behavior is valid. Do not leave prominent controls as decorative placeholders when a meaningful local interaction can be implemented.
</product-depth>

<creative-freedom>
You have broad freedom over architecture, libraries, layout details, interaction design, copy, and visual polish. Use Gmail as the product reference, but make deliberate decisions and deliver a coherent application rather than a collection of disconnected screens.

Do not explain your design before building it. Make the product and engineering decisions yourself, implement the experience, test the important workflows, and refine it into the best result you can.
</creative-freedom>

<success-criteria>
The result should immediately read as a high-quality email client, reward exploration, and support a convincing end-to-end flow from finding a message to reading, organizing, composing, and sending mail. Visual fidelity matters, but functional depth, consistency, responsiveness, and product judgment matter just as much.
</success-criteria>

Work only inside the current working directory.
During setup, configure your app and package scripts to use port 9209, then use that port for runtime verification.
Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Run the relevant checks yourself. Do not edit files outside the current working directory.
