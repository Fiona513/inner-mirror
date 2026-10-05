import type { Metadata } from "next";
import V4CoreJourney from "./V4CoreJourney";

export const metadata: Metadata = {
  title: "Inner Mirror｜一次具体的自我探索",
  description: "围绕一件仍悬着的事，让新的线索真实改变当前理解。",
};

export default function V4CorePage() {
  return <V4CoreJourney />;
}
