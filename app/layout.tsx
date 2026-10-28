import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const trustedSiteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN
    ?? "https://inner-mirror-reflection.azure-frost-7692.chatgpt.site";

  return {
    metadataBase: new URL(trustedSiteOrigin),
    title: "Inner Mirror｜内在镜像",
    description: "围绕一件仍悬着的事，让新的线索真实改变当前理解。",
    openGraph: {
      title: "Inner Mirror｜内在镜像",
      description: "从一个具体的现实处境开始，不急着下结论，慢慢靠近那件仍悬着的事。",
      type: "website",
      url: "/",
      images: [{ url: "/og.png", width: 1910, height: 1000, alt: "Inner Mirror 内在镜像" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Inner Mirror｜内在镜像",
      description: "从一个具体的现实处境开始，不急着下结论，慢慢靠近那件仍悬着的事。",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
