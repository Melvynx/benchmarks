"use client";

import dynamic from "next/dynamic";

const TimezoneChecker = dynamic(() => import("@/components/timezone-checker"), {
  ssr: false,
  loading: () => <main style={{ padding: "2rem" }}>Loading timezone checker...</main>,
});

export default function Home() {
  return <TimezoneChecker />;
}
