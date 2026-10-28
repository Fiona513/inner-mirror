"use client";

import { useLocale } from "../locale/locale";

export default function ErrorState({ reset }: { reset: () => void }) {
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f3f3ef", color: "#181915", fontFamily: "system-ui" }}><section style={{ maxWidth: 560 }}><p style={{ color: "#8b8e86", fontSize: 11, letterSpacing: ".12em" }}>{zh ? "内在镜像" : "Inner Mirror"}</p><h1 style={{ fontSize: 38, letterSpacing: "-.04em", fontWeight: 520 }}>{zh ? "暂时无法打开镜像的这一部分。" : "I couldn't open this part of your mirror."}</h1><p style={{ color: "#656860", lineHeight: 1.7 }}>{zh ? "你保存在本地的内容没有被删除。请再试一次。" : "Your locally saved model has not been erased. Try opening this view again."}</p><button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 17px", border: "1px solid #181915", background: "#181915", color: "white", cursor: "pointer" }}>{zh ? "重试" : "Try again"}</button></section></main>;
}
