import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "YouTube Thumbnail Generator",
  description: "Generate cinematic YouTube thumbnails with Gemini image generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${cormorant.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              className:
                "!border-white/10 !bg-black/90 !text-white !backdrop-blur-xl",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
