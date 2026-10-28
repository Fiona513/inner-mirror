import type { Metadata } from "next";
import V4CoreExperience from "./experience/V4CoreExperience";

export const metadata: Metadata = {
  title: "Inner Mirror｜看看今天的我",
  description: "从今天的一个状态开始，慢慢留下可见、可变化、可修正的自我碎片。",
};

export default function V4CorePage() {
  return <V4CoreExperience />;
}
