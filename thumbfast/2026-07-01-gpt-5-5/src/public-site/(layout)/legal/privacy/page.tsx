import { Typography } from "@/components/nowts/typography";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { Layout, LayoutContent } from "@/features/page/layout";
import { SiteConfig } from "@/site-config";
import type { Metadata } from "@/lib/metadata";

const markdown = `
## 1. Introduction

${SiteConfig.company.name} ("we", "us", "our") operates ${SiteConfig.title} (${SiteConfig.prodUrl}). This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our AI-powered thumbnail generation service.

## 2. Information We Collect

### 2.1 Account Information
- Email address
- Name (if provided)
- Password (encrypted)
- Organization/team information

### 2.2 Payment Information
- Billing address
- Payment method details (processed securely by Stripe)
- Transaction history

### 2.3 User Content
- Images you upload (reference persons, inspiration images)
- Text prompts for thumbnail generation
- Generated thumbnails

### 2.4 Usage Data
- IP address
- Browser type and version
- Device information
- Pages visited and features used
- Generation history and credit usage

### 2.5 Cookies and Tracking
We use essential cookies for authentication and session management. See Section 9 for details.

## 3. How We Use Your Information

We use your information to:
- Provide and improve our thumbnail generation service
- Process payments and manage subscriptions
- Send service-related communications
- Respond to support requests
- Comply with legal obligations
- Detect and prevent fraud or abuse

## 4. AI Processing and Third-Party Services

### 4.1 AI Image Generation
**Important**: To generate thumbnails, your data is processed by third-party AI providers:

- **Google (Gemini)**: Processes prompts and images to generate thumbnails
- **OpenAI (GPT-Image)**: Alternative AI provider for image generation

When you use our service, your prompts and uploaded images are sent to these providers for processing.

### 4.2 Third-Party Service Providers
We also use:
- **Stripe**: Payment processing
- **Vercel**: Hosting and infrastructure
- **Better Auth**: Authentication services
- **Resend**: Email delivery

### 4.3 AI Training Disclosure
**We do not use your uploaded images or generated thumbnails to train our own AI models.** However, third-party AI providers (Google, OpenAI) may have their own data usage policies. We encourage you to review their privacy policies.

## 5. Data Retention

- **Account data**: Retained while your account is active, deleted within 30 days of account deletion
- **Generated thumbnails**: Retained until you delete them or close your account
- **Uploaded images**: Retained until you delete them or close your account
- **Payment records**: Retained as required by law (typically 7 years)
- **Usage logs**: Retained for up to 12 months

## 6. Data Sharing

We do not sell your personal information. We share data only with:
- **Service providers**: As described in Section 4
- **Legal requirements**: When required by law, court order, or government request
- **Business transfers**: In connection with a merger, acquisition, or sale of assets
- **With your consent**: When you explicitly authorize sharing

## 7. Your Privacy Rights

### 7.1 All Users
You have the right to:
- Access your personal information
- Correct inaccurate information
- Delete your account and data
- Export your data
- Opt out of marketing communications

### 7.2 California Residents (CCPA/CPRA)
If you are a California resident, you have additional rights:
- **Right to Know**: Request disclosure of personal information collected, used, and shared
- **Right to Delete**: Request deletion of your personal information
- **Right to Correct**: Request correction of inaccurate information
- **Right to Opt-Out**: We do not sell or share your personal information for cross-context behavioral advertising
- **Right to Non-Discrimination**: We will not discriminate against you for exercising your rights

To exercise these rights, contact us using the information in Section 14.

### 7.3 Global Privacy Control
We honor Global Privacy Control (GPC) signals. If your browser sends a GPC signal, we will treat it as a valid opt-out request.

## 8. Children's Privacy

${SiteConfig.title} is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will delete it promptly.

## 9. Cookies and Tracking Technologies

### 9.1 Essential Cookies
We use essential cookies for:
- Authentication and session management
- Security and fraud prevention
- Remembering your preferences

### 9.2 Analytics
We may use analytics services to understand how users interact with our service. You can opt out of analytics tracking through your browser settings.

### 9.3 Managing Cookies
You can control cookies through your browser settings. Disabling essential cookies may affect service functionality.

## 10. Data Security

We implement appropriate technical and organizational measures to protect your data, including:
- Encryption in transit (HTTPS/TLS)
- Encryption at rest for sensitive data
- Access controls and authentication
- Regular security assessments

However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.

## 11. International Data Transfers

Your data may be transferred to and processed in the United States, where our servers and service providers are located. By using our service, you consent to this transfer.

## 12. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be communicated via email or platform notification. The "Last updated" date at the bottom indicates when the policy was last revised.

## 13. Do Not Track

Some browsers have a "Do Not Track" feature. We currently do not respond to DNT signals, but we do honor Global Privacy Control (GPC) signals.

## 14. Contact Us

For privacy-related questions or to exercise your rights:

- **Company**: ${SiteConfig.company.name}
- **Address**: ${SiteConfig.company.address}
- **Website**: ${SiteConfig.prodUrl}

For data deletion requests, you can also delete your account directly from your account settings.

---

*Last updated: January 2025*
`;

export const metadata: Metadata = {
  title: `Privacy Policy - ${SiteConfig.title}`,
  description: `Privacy Policy for ${SiteConfig.title}. Learn how we collect, use, and protect your personal information when using our AI thumbnail generator.`,
  alternates: { canonical: "/legal/privacy" },
};

export default function page() {
  return (
    <div>
      <div className="bg-card flex w-full items-center justify-center p-8 lg:p-12">
        <Typography variant="h1">Privacy</Typography>
      </div>
      <Layout>
        <LayoutContent className="typography m-auto mb-8">
          <ServerMdx source={markdown} />
        </LayoutContent>
      </Layout>
    </div>
  );
}
