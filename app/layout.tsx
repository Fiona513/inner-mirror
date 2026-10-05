import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const trustedSiteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN
    ?? "https://inner-mirror-reflection.azure-frost-7692.chatgpt.site";

  return {
    metadataBase: new URL(trustedSiteOrigin),
    title: "Inner Mirror｜内在镜像",
    description: "不同选择会改变问题路径、当前理解与一张可由你修正的 Current Inner Map。",
    openGraph: {
      title: "Inner Mirror｜内在镜像",
      description: "轻量扫描、真实分支与用户纠正，逐渐形成只属于这一次的 Inner Map。",
      type: "website",
      url: "/",
      images: [{ url: "/og.png", width: 1910, height: 1000, alt: "Inner Mirror 内在镜像" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Inner Mirror｜内在镜像",
      description: "轻量扫描、真实分支与用户纠正，逐渐形成只属于这一次的 Inner Map。",
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
