"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../locale/locale";
import { getLivingCopy } from "../locale/living";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";

export default function CommunicationSettingsPage() {
  const { state, dispatch } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
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
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy.settings.eyebrow} title={copy.settings.title} support={copy.settings.support} /><section className={styles.settingsPanel}>
    <label><div><strong>{copy.settings.gentle}</strong><span>↔</span><strong>{copy.settings.direct}</strong></div><input aria-label={`${copy.settings.gentle} - ${copy.settings.direct}`} type="range" min="0" max="100" value={preferences.tone} onChange={(event) => setPreferences({ ...preferences, tone: Number(event.target.value) })} /></label>
    <label><div><strong>{copy.settings.brief}</strong><span>↔</span><strong>{copy.settings.deep}</strong></div><input aria-label={`${copy.settings.brief} - ${copy.settings.deep}`} type="range" min="0" max="100" value={preferences.depth} onChange={(event) => setPreferences({ ...preferences, depth: Number(event.target.value) })} /></label>
    <label className={styles.settingsToggle}><span><strong>{copy.settings.practical}</strong><small>{copy.settings.practicalHelp}</small></span><input aria-label={copy.settings.practical} type="checkbox" checked={preferences.practicalSuggestions} onChange={(event) => setPreferences({ ...preferences, practicalSuggestions: event.target.checked })} /></label>
    <label className={styles.settingsNotes}><strong>{copy.settings.notes}</strong><textarea value={preferences.notes} onChange={(event) => setPreferences({ ...preferences, notes: event.target.value })} placeholder={copy.settings.notesPlaceholder} /></label>
    <div className={styles.buttonRow}><button className={styles.primaryButton} type="button" onClick={save}>{copy.settings.save}</button>{saved ? <span className={styles.savedNote} role="status">{copy.common.saved}</span> : null}</div>
  </section><section className={styles.modeSettings}><div><p className={styles.sectionLabel}>{copy.settings.mode}</p><h2>{state.mode === "demo" ? copy.settings.demo : state.agentRuntimeStatus === "connected" ? copy.settings.real : copy.settings.fallback}</h2><p>{copy.settings.modeBody}</p></div><div className={styles.agentStatus} role="status" aria-live="polite"><span className={`${styles.agentStatusDot} ${styles[`agentStatus_${state.agentRuntimeStatus}`]}`} /><div><strong>{state.agentRuntimeStatus === "connected" ? copy.settings.connected : state.agentRuntimeStatus === "falling_back" ? copy.settings.fallingBack : copy.settings.unavailable}</strong><p>{state.agentRuntimeStatus === "connected" ? copy.settings.connectedBody : state.agentRuntimeStatus === "falling_back" ? copy.settings.fallbackBody : copy.settings.unavailableBody}</p></div></div><div className={styles.buttonRow}><button type="button" className={state.mode === "demo" ? styles.primaryButton : styles.outlineButton} onClick={() => dispatch({ type: "SET_MODE", mode: "demo" })}>{copy.settings.demo}</button><button type="button" className={state.mode === "real" ? styles.primaryButton : styles.outlineButton} onClick={() => dispatch({ type: "SET_MODE", mode: "real" })}>{copy.settings.real}</button><button type="button" className={styles.quietButton} onClick={() => dispatch({ type: "RESET_DEMO", locale })}>{copy.settings.reset}</button></div></section>
  </div></LivingShell>;
}
