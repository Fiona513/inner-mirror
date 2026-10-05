"use client";

export default function ErrorState({ reset }: { reset: () => void }) {
  let english = false;
  try { english = typeof window !== "undefined" && window.localStorage.getItem("inner-mirror:locale") === "en"; } catch { /* Keep the Chinese default. */ }
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f3f3ef", color: "#181915", fontFamily: "system-ui" }}><section style={{ maxWidth: 560 }}><p style={{ color: "#8b8e86", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" }}>INNER MIRROR</p><h1 style={{ fontSize: 38, letterSpacing: "-.04em", fontWeight: 520 }}>{english ? "I couldn't open this part of your mirror." : "暂时无法打开这部分镜像。"}</h1><p style={{ color: "#656860", lineHeight: 1.7 }}>{english ? "Your locally saved model has not been erased. Try opening this view again." : "保存在此设备上的镜像没有被清除。请再试一次。"}</p><button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 17px", border: "1px solid #181915", background: "#181915", color: "white", cursor: "pointer" }}>{english ? "Try again" : "重试"}</button></section></main>;
}
