const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "fakemail.net",
  "getnada.com",
  "guerrillamail.com",
  "maildrop.cc",
  "mailinator.com",
  "minuteinbox.com",
  "mintemail.com",
  "sharklasers.com",
  "tempmail.dev",
  "tempmail.email",
  "tempmailo.com",
  "temp-mail.org",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
]);

export function normalizeEmailForFraudChecks(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return email;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  if (!GMAIL_DOMAINS.has(domainPart)) {
    return `${localPart}@${domainPart}`;
  }

  const canonicalLocal = localPart.split("+")[0].replaceAll(".", "").trim();

  return `${canonicalLocal}@gmail.com`;
}

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
