import GridBackground from "@/components/nowts/grid-background";
import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BaseLayout } from "@/features/layout/base-layout";
import { createPageHead } from "@/lib/metadata";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPageRoute,
  head: () =>
    createPageHead({
      title: "Contact",
      description:
        "Contact Thumbfa.st for questions about AI thumbnail generation, support, or product feedback.",
      path: "/contact",
    }),
});

const contactEmail = "contact@thumbfa.st";

function ContactPageRoute() {
  return (
    <BaseLayout>
      <ContactRoute />
    </BaseLayout>
  );
}

function ContactRoute() {
  return (
    <div className="bg-background relative isolate min-h-screen">
      <GridBackground
        size={20}
        color="color-mix(in srgb, var(--border) 30%, transparent)"
      />
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="bg-muted/10 relative flex items-center justify-end px-6 py-24 backdrop-blur-sm sm:py-32 lg:px-12">
          <div className="relative z-10 mx-auto w-full max-w-xl lg:mx-0 lg:max-w-lg">
            <Typography
              variant="h1"
              className="text-foreground text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
            >
              Get in touch
            </Typography>
            <Typography
              variant="p"
              className="text-muted-foreground mt-6 text-lg/8"
            >
              Have questions about Thumbfa.st? Need help with AI thumbnail
              generation or want to share feedback? I'm here to help and always
              excited to hear from our community.
            </Typography>
            <dl className="text-muted-foreground mt-10 flex flex-col gap-4 text-base/7">
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">Location</span>
                  <Building2
                    aria-hidden="true"
                    className="text-muted-foreground h-6 w-6"
                  />
                </dt>
                <dd>{SiteConfig.company.address}</dd>
              </div>
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">Email</span>
                  <Mail
                    aria-hidden="true"
                    className="text-muted-foreground h-6 w-6"
                  />
                </dt>
                <dd>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {contactEmail}
                  </a>
                </dd>
              </div>
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">Response time</span>
                  <MessageSquare
                    aria-hidden="true"
                    className="text-muted-foreground h-6 w-6"
                  />
                </dt>
                <dd>
                  Usually respond within 24 hours
                  <br />
                  Monday - Friday, 9 AM - 6 PM ICT
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <form
          action={`mailto:${contactEmail}`}
          method="post"
          encType="text/plain"
          className="flex w-full items-center justify-start px-6 pt-24 pb-24 sm:pt-32 lg:px-12 lg:pt-24"
        >
          <div className="max-w-xl lg:mr-0 lg:max-w-lg">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <Label
                  htmlFor="first-name"
                  className="text-foreground block text-sm font-semibold"
                >
                  First name
                </Label>
                <div className="mt-2.5">
                  <Input id="first-name" name="first-name" type="text" />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="last-name"
                  className="text-foreground block text-sm font-semibold"
                >
                  Last name
                </Label>
                <div className="mt-2.5">
                  <Input id="last-name" name="last-name" type="text" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label
                  htmlFor="email"
                  className="text-foreground block text-sm font-semibold"
                >
                  Email
                </Label>
                <div className="mt-2.5">
                  <Input id="email" name="email" type="email" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label
                  htmlFor="subject"
                  className="text-foreground block text-sm font-semibold"
                >
                  Subject
                </Label>
                <div className="mt-2.5">
                  <Input id="subject" name="subject" type="text" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label
                  htmlFor="message"
                  className="text-foreground block text-sm font-semibold"
                >
                  Message
                </Label>
                <div className="mt-2.5">
                  <Textarea id="message" name="message" rows={4} />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button type="submit" className="rounded-md px-3.5 py-2.5">
                Send message
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
