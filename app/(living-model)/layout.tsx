import type { Metadata } from "next";
import { LivingModelProvider } from "../living-model/LivingModelProvider";
import { LocaleProvider } from "../locale/locale";

export const metadata: Metadata = {
  title: "内在镜像｜持续生长的自我理解",
  description: "一个由你掌握的自我探索体验。查看依据、提出质疑、改写并修订你选择保留的理解。",
  openGraph: { title: "内在镜像｜持续生长的自我理解", description: "每一条解释都可以由你检查与修订。", images: [] },
  twitter: { card: "summary", title: "内在镜像｜持续生长的自我理解", description: "每一条解释都可以由你检查与修订。", images: [] },
};

export default function LivingRoutesLayout({ children }: { children: React.ReactNode }) {
  return (
    <LivingModelProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </LivingModelProvider>
  );
}
