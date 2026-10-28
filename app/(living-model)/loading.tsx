"use client";

import { useLocale } from "../locale/locale";

export default function Loading() {
  const { locale } = useLocale();
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f3f3ef", color: "#656860", fontFamily: "system-ui", fontSize: 13 }}>{locale === "zh-CN" ? "正在与由你选择保留的情境建立联系…" : "Connecting this with context you've chosen to keep…"}</main>;
}
