"use client";

import { useState } from "react";
import { useLocale } from "../locale/locale";
import { formatLivingDate, getLivingCopy } from "../locale/living";
import { createStateSnapshot } from "./state-snapshots";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";
import type { ReflectionSession, StateMetricKey } from "./types";
import { localizeDemoText } from "./demo-data";

export function StateSnapshotCapture({ session }: { session: ReflectionSession }) {
  const { state, dispatch } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const existing = state.stateSnapshots.filter((item) => item.sessionId === session.id);
  const [open, setOpen] = useState(session.state === "LISTEN" || existing.length > 0);
  const [editing, setEditing] = useState(existing.length === 0);
  const [values, setValues] = useState<Partial<Record<StateMetricKey, 1 | 2 | 3 | 4 | 5>>>(() => Object.fromEntries(existing.map((item) => [item.metricKey, item.value])));

  if (!open) return <button type="button" className={styles.snapshotReopen} onClick={() => setOpen(true)}>{copy.snapshot.add}</button>;

  const save = () => {
    const capturedAt = new Date().toISOString();
    const snapshots = (Object.entries(values) as [StateMetricKey, 1 | 2 | 3 | 4 | 5][]).map(([metricKey, value]) => createStateSnapshot(session, metricKey, value, capturedAt, locale));
    if (snapshots.length) dispatch({ type: "UPSERT_STATE_SNAPSHOTS", sessionId: session.id, snapshots });
    setEditing(false);
  };

  return <section className={styles.snapshotCapture} aria-labelledby="state-snapshot-title">
    <div className={styles.snapshotHeader}><div><p className={styles.sectionLabel}>{copy.snapshot.optional}</p><h2 id="state-snapshot-title">{copy.snapshot.title}</h2></div>{existing.length && !editing ? <span>{copy.common.saved}</span> : null}</div>
    {editing ? <>
      <div className={styles.snapshotMetrics}>{(["pressure", "clarity"] as const).map((metricKey) => <InteractiveMetric key={metricKey} metricKey={metricKey} value={values[metricKey]} onChange={(value) => setValues({ ...values, [metricKey]: value })} />)}</div>
      <div className={styles.snapshotActions}><button type="button" className={styles.outlineButton} onClick={save} disabled={!values.pressure && !values.clarity}>{copy.snapshot.save}</button><button type="button" className={styles.quietButton} onClick={() => { setOpen(false); setEditing(false); }}>{copy.snapshot.skip}</button></div>
    </> : <>
      <div className={styles.snapshotMetrics}>{existing.map((item) => <ReadOnlyMetric key={item.metricKey} label={item.label} value={item.value} metricKey={item.metricKey} />)}</div>
      <p className={styles.snapshotSource}>{copy.common.selfReported} · {formatLivingDate(locale, existing[0].capturedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {d(existing[0].context)}</p>
      <div className={styles.snapshotActions}><button type="button" className={styles.quietButton} onClick={() => setEditing(true)}>{copy.snapshot.edit}</button><button type="button" className={styles.quietButton} onClick={() => { dispatch({ type: "DELETE_STATE_SNAPSHOTS", sessionId: session.id }); setValues({}); setOpen(false); }}>{copy.snapshot.remove}</button></div>
    </>}
  </section>;
}

function InteractiveMetric({ metricKey, value, onChange }: { metricKey: StateMetricKey; value?: number; onChange: (value: 1 | 2 | 3 | 4 | 5) => void }) {
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const metric = metricCopy(metricKey, copy);
  return <fieldset className={styles.interactiveMetric}><legend>{metric.label}</legend><div className={styles.metricScale}><span>{metric.low}</span><div>{([1,2,3,4,5] as const).map((level) => <button key={level} type="button" aria-label={`${metric.label} ${level} ${copy.snapshot.ofFive}`} aria-pressed={value === level} onClick={() => onChange(level)}><i /></button>)}</div><span>{metric.high}</span></div></fieldset>;
}

export function ReadOnlyMetric({ label, value, metricKey, compact = false }: { label: string; value: number; metricKey: StateMetricKey; compact?: boolean }) {
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const metric = metricCopy(metricKey, copy);
  const displayLabel = label === "Pressure" ? copy.snapshot.pressure : label === "Clarity" ? copy.snapshot.clarity : label === "Earlier" ? copy.common.earlier : label === "Current" ? copy.common.current : label;
  return <div className={`${styles.readOnlyMetric} ${compact ? styles.readOnlyMetricCompact : ""}`} aria-label={`${displayLabel}: ${value} ${copy.snapshot.ofFive}，${copy.common.selfReported}`}><strong>{displayLabel}</strong><div className={styles.metricScale}><span>{metric.low}</span><div aria-hidden="true">{[1,2,3,4,5].map((level) => <i key={level} data-active={level <= value} />)}</div><span>{metric.high}</span></div><small>{value}/5 · {copy.common.selfReported}</small></div>;
}

function metricCopy(metricKey: StateMetricKey, copy: ReturnType<typeof getLivingCopy>) {
  return metricKey === "pressure"
    ? { label: copy.snapshot.pressure, low: copy.snapshot.low, high: copy.snapshot.high }
    : { label: copy.snapshot.clarity, low: copy.snapshot.unclear, high: copy.snapshot.clear };
}
