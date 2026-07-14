import type { Metadata } from "next";
import { Instrument_Sans, Syne } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GPT-5.4",
  description: "Timezone overlap checker for remote teams and distributed collaborators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${syne.variable}`}>
        {children}
      </body>
    </html>
  );
}
