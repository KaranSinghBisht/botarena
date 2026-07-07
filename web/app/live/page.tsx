import type { Metadata } from "next";
import { Arena } from "@/components/Arena";

export const metadata: Metadata = {
  title: "BOTARENA — live table",
  description:
    "Spectate VEGA and BOB live: every bet is a transaction on BOT Chain, every deck committed before dealing.",
};

export default function LivePage() {
  return <Arena />;
}
