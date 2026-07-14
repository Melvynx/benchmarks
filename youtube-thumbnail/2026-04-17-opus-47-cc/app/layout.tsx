import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thumbnail Studio — Generate YouTube thumbnails with AI",
  description:
    "Generate stunning YouTube thumbnails from a prompt and reference images, powered by Gemini 3 Pro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <ThemeToggle />
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            className:
              "!bg-card !text-card-foreground !border !border-border !rounded-xl",
          }}
        />
      </body>
    </html>
  );
}
