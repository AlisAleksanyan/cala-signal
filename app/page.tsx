import type { Metadata } from "next";
import { SignalApp } from "./SignalApp";

export const metadata: Metadata = {
  title: "CALA SIGNAL — Evidence-first startup scouting",
  description: "Turn an investment thesis into a traceable, ranked company shortlist using Cala and OpenAI.",
};

export default function Home() {
  return <SignalApp />;
}
