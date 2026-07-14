import { Typography } from "@/components/nowts/typography";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { Layout, LayoutContent } from "@/features/page/layout";
import { SiteConfig } from "@/site-config";
import type { Metadata } from "@/lib/metadata";

const markdown = `
## 1. Acceptance of Terms

By accessing or using ${SiteConfig.title}, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our service.

## 2. Service Description

${SiteConfig.title} is an AI-powered YouTube thumbnail generation service operated by ${SiteConfig.company.name}. The service allows users to create thumbnails using a credit-based system.

## 3. Credit System

### 3.1 How It Works
- Credits are used to generate thumbnails via our AI system
- Each generation consumes credits immediately upon initiation
- Consumed credits are irreversibly used to cover third-party AI image generation API costs

### 3.2 Real Costs
**Important**: Each thumbnail generation incurs real costs from our AI providers (Google Gemini and OpenAI) at approximately $0.20 per generation. These costs are incurred as soon as generation begins and cannot be recovered.

## 4. Refund Policy

### 4.1 General Policy
**All sales of credits are final.** Due to the digital and instant nature of our service, credits used to generate thumbnails incur irrecoverable third-party API costs.

### 4.2 Consumed Credits - No Refund

**Consumed credits cannot be refunded under any circumstances.**

When you use credits to generate thumbnails, we immediately incur costs from our AI providers. These costs cannot be recovered, therefore:

- **Refund calculation**: If you request a refund, the amount will be calculated as:
  - **Refund = Amount paid - (Credits consumed x $0.20 per credit)**

- **Example**: For a $20 plan with 50 generations consumed ($10 in API costs), the maximum refund is $20 - $10 = $10

- **No refund scenarios**: If all credits have been consumed, or if API costs equal or exceed the amount paid, no refund will be issued.

### 4.3 Unused Credits
Unused credits at the time of account cancellation or refund request may be refunded, minus any applicable payment processing fees.

### 4.4 Subscription Cancellation
You may cancel your subscription at any time through your account settings. Cancellation is effective at the end of your current billing period. We comply with the FTC's requirements for easy cancellation - you can cancel through the same method you used to subscribe.

### 4.5 Refund Request Procedure
To request a refund, contact us at our support email. We will process eligible requests within 7 business days.

## 5. Subscription and Billing

### 5.1 Automatic Renewal
Subscriptions automatically renew at the end of each billing period unless cancelled. You will be charged the then-current subscription rate.

### 5.2 Billing Disclosures
Before subscribing, you will be clearly informed of:
- The subscription price and billing frequency
- The automatic renewal terms
- How to cancel your subscription

### 5.3 Price Changes
We will notify you at least 7 days before any price changes take effect. Continued use after notification constitutes acceptance of the new price.

## 6. User Content and Intellectual Property

### 6.1 Your Content
You retain all rights to content you upload (images, text, references). By uploading content, you grant ${SiteConfig.title} a limited, non-exclusive, royalty-free license to process your content solely for providing the service.

### 6.2 Generated Thumbnails
Thumbnails generated through ${SiteConfig.title} belong to you. You are granted a perpetual, worldwide, royalty-free license to use them for any purpose, including but not limited to:
- **Marketing and advertising** (social media ads, email campaigns, banners, print materials, etc.)
- **Commercial use** on YouTube, websites, blogs, and any other platforms
- **Personal projects** and non-commercial use

You may freely modify, distribute, and display generated thumbnails for any lawful purpose without additional fees or attribution requirements.

### 6.3 Your Responsibilities
You represent and warrant that:
- You own or have rights to all content you upload
- Your content does not infringe any third-party rights
- You will not use the service for illegal purposes

### 6.4 Our Intellectual Property
${SiteConfig.title}, including its software, design, and branding, remains the property of ${SiteConfig.company.name}. You receive only a limited, non-exclusive, non-transferable license to use the service.

## 7. Acceptable Use

You agree not to:
- Use the service for illegal activities
- Upload content that infringes intellectual property rights
- Attempt to reverse engineer or copy the service
- Use automated systems to access the service without permission
- Generate content that is harmful, offensive, or violates third-party rights

## 8. Limitation of Liability

### 8.1 Disclaimer of Warranties
THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

### 8.2 Limitation of Damages
TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${SiteConfig.company.name} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES.

### 8.3 Maximum Liability
OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM.

### 8.4 Specific Exclusions
We are not liable for:
- Temporary service interruptions or outages
- Quality of generated thumbnails (dependent on third-party AI models)
- Your use of generated thumbnails
- Actions of third-party AI providers

## 9. Indemnification

You agree to indemnify and hold harmless ${SiteConfig.company.name} from any claims, damages, or expenses arising from:
- Your use of the service
- Your violation of these Terms
- Your violation of any third-party rights
- Content you upload or generate

## 10. Dispute Resolution

### 10.1 Informal Resolution
Before filing any formal dispute, you agree to contact us and attempt to resolve the issue informally for at least 30 days.

### 10.2 Arbitration Agreement
Any dispute not resolved informally shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules.

### 10.3 Class Action Waiver
YOU AGREE TO RESOLVE DISPUTES ONLY ON AN INDIVIDUAL BASIS AND WAIVE ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS OR CLASS ARBITRATION.

### 10.4 Opt-Out Right
You may opt out of this arbitration agreement by sending written notice to our address within 30 days of first accepting these Terms.

## 11. Changes to Terms

We may modify these Terms at any time. Material changes will be communicated via email or platform notification at least 7 days before taking effect. Continued use after changes constitutes acceptance.

## 12. Termination

We may suspend or terminate your access for violation of these Terms. Upon termination, your right to use the service ceases immediately. Provisions that should survive termination (such as limitation of liability and dispute resolution) shall remain in effect.

## 13. Governing Law

These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any litigation shall be brought in the state or federal courts located in Delaware.

## 14. Severability

If any provision of these Terms is found unenforceable, the remaining provisions shall continue in full force and effect.

## 15. Contact Information

For questions about these Terms:
- **Company**: ${SiteConfig.company.name}
- **Address**: ${SiteConfig.company.address}
- **Website**: ${SiteConfig.prodUrl}

---

*Last updated: February 2026*
`;

export const metadata: Metadata = {
  title: `Terms of Service - ${SiteConfig.title}`,
  description: `Terms of Service for ${SiteConfig.title}. Read our terms governing the use of our AI-powered YouTube thumbnail generation service.`,
  alternates: { canonical: "/legal/terms" },
};

export default function page() {
  return (
    <div>
      <div className="bg-card flex w-full items-center justify-center p-8 lg:p-12">
        <Typography variant="h1">Terms</Typography>
      </div>
      <Layout>
        <LayoutContent className="typography m-auto mb-8">
          <ServerMdx source={markdown} />
        </LayoutContent>
      </Layout>
    </div>
  );
}
