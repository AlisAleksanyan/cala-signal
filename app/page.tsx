import type { Metadata } from "next";
import { SignalApp } from "./SignalApp";

export const metadata: Metadata = {
  title: "CALA SIGNAL — Source-backed startup shortlists",
  description: "Turn one investment thesis into qualified leads, a verification queue, and source-linked evidence in about a minute.",
};

export default function Home() {
  return <SignalApp />;
}
