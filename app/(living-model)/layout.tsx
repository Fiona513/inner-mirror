import type { Metadata } from "next";
import { LivingModelProvider } from "../living-model/LivingModelProvider";
import { LocaleProvider } from "../locale/locale";

export const metadata: Metadata = {
  title: "Inner Mirror",
  description: "An evidence-backed, user-owned living self model. Inspect, challenge, rewrite, and revise the understandings you choose to keep.",
  openGraph: { title: "Inner Mirror", description: "Evidence-backed reflection where you own every interpretation.", images: [] },
  twitter: { card: "summary", title: "Inner Mirror", description: "Evidence-backed reflection where you own every interpretation.", images: [] },
};

export default function LivingRoutesLayout({ children }: { children: React.ReactNode }) {
  return (
    <LivingModelProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </LivingModelProvider>
  );
}
