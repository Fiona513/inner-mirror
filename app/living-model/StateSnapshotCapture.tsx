"use client";

import { useState } from "react";
import { createStateSnapshot, STATE_METRICS } from "./state-snapshots";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";
import type { ReflectionSession, StateMetricKey } from "./types";

export function StateSnapshotCapture({ session }: { session: ReflectionSession }) {
  const { state, dispatch } = useLivingModel();
  const copy = useCopy();
  const sampleText = useSampleText();
  const { locale } = useLocale();
  const existing = state.stateSnapshots.filter((item) => item.sessionId === session.id);
  const [open, setOpen] = useState(session.state === "LISTEN" || existing.length > 0);
  const [editing, setEditing] = useState(existing.length === 0);
  const [values, setValues] = useState<Partial<Record<StateMetricKey, 1 | 2 | 3 | 4 | 5>>>(() => Object.fromEntries(existing.map((item) => [item.metricKey, item.value])));

  if (!open) return <button type="button" className={styles.snapshotReopen} onClick={() => setOpen(true)}>{copy("＋ 添加一条自报状态", "+ Add a self-reported state snapshot")}</button>;

  const save = () => {
    const capturedAt = new Date().toISOString();
    const snapshots = (Object.entries(values) as [StateMetricKey, 1 | 2 | 3 | 4 | 5][]).map(([metricKey, value]) => createStateSnapshot(session, metricKey, value, capturedAt));
    if (snapshots.length) dispatch({ type: "UPSERT_STATE_SNAPSHOTS", sessionId: session.id, snapshots });
    setEditing(false);
  };

  return <section className={styles.snapshotCapture} aria-labelledby="state-snapshot-title">
    <div className={styles.snapshotHeader}><div><p className={styles.sectionLabel}>{copy("自报 · 可选", "Self-reported · optional")}</p><h2 id="state-snapshot-title">{copy("此刻感觉如何？", "How does this feel right now?")}</h2></div>{existing.length && !editing ? <span>{copy("已保存在此设备", "Saved on this device")}</span> : null}</div>
    {editing ? <>
      <div className={styles.snapshotMetrics}>{(["pressure", "clarity"] as const).map((metricKey) => <InteractiveMetric key={metricKey} metricKey={metricKey} value={values[metricKey]} onChange={(value) => setValues({ ...values, [metricKey]: value })} />)}</div>
      <div className={styles.snapshotActions}><button type="button" className={styles.outlineButton} onClick={save} disabled={!values.pressure && !values.clarity}>{copy("保存状态", "Save snapshot")}</button><button type="button" className={styles.quietButton} onClick={() => { setOpen(false); setEditing(false); }}>{copy("跳过", "Skip")}</button></div>
    </> : <>
      <div className={styles.snapshotMetrics}>{existing.map((item) => <ReadOnlyMetric key={item.metricKey} label={sampleText(item.label)} value={item.value} metricKey={item.metricKey} />)}</div>
      <p className={styles.snapshotSource}>{copy("自报", "Self-reported")} · {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(existing[0].capturedAt))} · {sampleText(existing[0].context)}</p>
      <div className={styles.snapshotActions}><button type="button" className={styles.quietButton} onClick={() => setEditing(true)}>{copy("编辑", "Edit")}</button><button type="button" className={styles.quietButton} onClick={() => { dispatch({ type: "DELETE_STATE_SNAPSHOTS", sessionId: session.id }); setValues({}); setOpen(false); }}>{copy("移除状态", "Remove snapshot")}</button></div>
    </>}
  </section>;
}

function InteractiveMetric({ metricKey, value, onChange }: { metricKey: StateMetricKey; value?: number; onChange: (value: 1 | 2 | 3 | 4 | 5) => void }) {
  const metric = STATE_METRICS[metricKey];
  const copy = useCopy();
  const label = metricKey === "pressure" ? copy("压力", "Pressure") : copy("清晰度", "Clarity");
  return <fieldset className={styles.interactiveMetric}><legend>{label}</legend><div className={styles.metricScale}><span>{metricKey === "pressure" ? copy("低", "Low") : copy("不清晰", "Unclear")}</span><div>{([1,2,3,4,5] as const).map((level) => <button key={level} type="button" aria-label={copy(`${label}：5 级中的第 ${level} 级`, `${metric.label} ${level} of 5`)} aria-pressed={value === level} onClick={() => onChange(level)}><i /></button>)}</div><span>{metricKey === "pressure" ? copy("高", "High") : copy("清晰", "Clear")}</span></div></fieldset>;
}

export function ReadOnlyMetric({ label, value, metricKey, compact = false }: { label: string; value: number; metricKey: StateMetricKey; compact?: boolean }) {
  const metric = STATE_METRICS[metricKey];
  const copy = useCopy();
  return <div className={`${styles.readOnlyMetric} ${compact ? styles.readOnlyMetricCompact : ""}`} aria-label={copy(`${label}：5 级中的第 ${value} 级，自报`, `${label}: ${value} of 5, self-reported`)}><strong>{label}</strong><div className={styles.metricScale}><span>{metricKey === "pressure" ? copy("低", "Low") : copy("不清晰", "Unclear")}</span><div aria-hidden="true">{[1,2,3,4,5].map((level) => <i key={level} data-active={level <= value} />)}</div><span>{metricKey === "pressure" ? copy("高", "High") : copy("清晰", "Clear")}</span></div><small>{value}/5 · {copy("自报", "Self-reported")}</small></div>;
}
