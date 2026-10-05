"use client";

import { useEffect, useState } from "react";
import { useCopy } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";

export default function CommunicationSettingsPage() {
  const { state, dispatch } = useLivingModel();
  const copy = useCopy();
  const sampleText = useSampleText();
  const [preferences, setPreferences] = useState(state.preferences);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/living-reflection", { method: "GET" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("unavailable")))
      .then((result: { status?: unknown }) => {
        if (!active) return;
        const status = result.status === "connected" || result.status === "falling_back" ? result.status : "unavailable";
        dispatch({ type: "SET_AGENT_RUNTIME_STATUS", status, checkedAt: new Date().toISOString() });
      })
      .catch(() => active && dispatch({ type: "SET_AGENT_RUNTIME_STATUS", status: "unavailable", checkedAt: new Date().toISOString() }));
    return () => { active = false; };
  }, [dispatch]);
  const save = () => { dispatch({ type: "UPDATE_PREFERENCES", preferences }); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  return <LivingShell><div className={styles.page}>
    <PageHeader eyebrow={copy("设置", "Settings")} title={copy("内在镜像如何回应你", "How Inner Mirror responds")} support={copy("调整反思的表达方式。这只改变沟通方式，不改变系统对证据的判断。", "Adjust the way reflections are worded. This changes communication, not what the system treats as evidence.")} />
    <section className={styles.settingsPanel}>
      <label><div><strong>{copy("温柔", "Gentle")}</strong><span>↔</span><strong>{copy("直接", "Direct")}</strong></div><input aria-label={copy("回应语气：从温柔到直接", "Response tone from gentle to direct")} type="range" min="0" max="100" value={preferences.tone} onChange={(event) => setPreferences({ ...preferences, tone: Number(event.target.value) })} /></label>
      <label><div><strong>{copy("简洁", "Brief")}</strong><span>↔</span><strong>{copy("深入", "Deep")}</strong></div><input aria-label={copy("回应篇幅：从简洁到深入", "Response depth from brief to deep")} type="range" min="0" max="100" value={preferences.depth} onChange={(event) => setPreferences({ ...preferences, depth: Number(event.target.value) })} /></label>
      <label className={styles.settingsToggle}><span><strong>{copy("可操作的建议", "Practical suggestions")}</strong><small>{copy("仅在有助于眼前问题时提供下一步。", "Offer a next step when it helps the current issue.")}</small></span><input aria-label={copy("提供可操作的建议", "Offer practical suggestions")} type="checkbox" checked={preferences.practicalSuggestions} onChange={(event) => setPreferences({ ...preferences, practicalSuggestions: event.target.checked })} /></label>
      <label className={styles.settingsNotes}><strong>{copy("你希望内在镜像怎样与你沟通？", "Anything Inner Mirror should know about how you prefer to communicate?")}</strong><textarea value={sampleText(preferences.notes)} onChange={(event) => setPreferences({ ...preferences, notes: event.target.value })} placeholder={copy("例如：当我感到不知所措时，请简洁一些。", "For example: be concise when I'm overwhelmed.")} /></label>
      <div className={styles.buttonRow}><button className={styles.primaryButton} type="button" onClick={save}>{copy("保存偏好", "Save preferences")}</button>{saved ? <span className={styles.savedNote} role="status">{copy("已保存在此设备", "Saved on this device")}</span> : null}</div>
    </section>
    <section className={styles.modeSettings}>
      <div><p className={styles.sectionLabel}>{copy("体验模式", "Experience mode")}</p><h2>{state.mode === "demo" ? copy("演示模式", "Demo mode") : state.agentRuntimeStatus === "connected" ? copy("真实 API 模式", "Real API mode") : copy("演示回退", "Demo fallback")}</h2><p>{copy("演示模式使用本地示例历史与固定响应。真实模式调用受控的 Agent 接口；下方状态会说明模型生成是否可用。", "Demo mode uses realistic local history and deterministic responses. Real mode calls the controlled Agent endpoint; the status below reports whether model-backed copy is actually available.")}</p></div>
      <div className={styles.agentStatus} role="status" aria-live="polite"><span className={`${styles.agentStatusDot} ${styles[`agentStatus_${state.agentRuntimeStatus}`]}`} /><div><strong>{state.agentRuntimeStatus === "connected" ? copy("已连接", "Connected") : state.agentRuntimeStatus === "falling_back" ? copy("正在回退", "Falling back") : copy("不可用", "Unavailable")}</strong><p>{state.agentRuntimeStatus === "connected" ? copy("结构化 Agent 接口与模型生成的文案均可用。", "The structured Agent endpoint and model-backed copy are available.") : state.agentRuntimeStatus === "falling_back" ? copy("接口可用，但当前响应来自固定的演示回退。", "The endpoint is available, but the deterministic Demo fallback is producing the response.") : copy("无法连接 Agent 接口。反思将使用演示回退。", "The Agent endpoint could not be reached. Reflections will use the Demo fallback.")}</p></div></div>
      <div className={styles.buttonRow}><button type="button" className={state.mode === "demo" ? styles.primaryButton : styles.outlineButton} onClick={() => dispatch({ type: "SET_MODE", mode: "demo" })}>{copy("演示", "Demo")}</button><button type="button" className={state.mode === "real" ? styles.primaryButton : styles.outlineButton} onClick={() => dispatch({ type: "SET_MODE", mode: "real" })}>{copy("真实 API", "Real API")}</button><button type="button" className={styles.quietButton} onClick={() => dispatch({ type: "RESET_DEMO" })}>{copy("重置演示数据", "Reset demo data")}</button></div>
    </section>
  </div></LivingShell>;
}
