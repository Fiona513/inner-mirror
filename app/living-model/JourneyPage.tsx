"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLocale } from "../locale/locale";
import { formatLivingDate, labelEnum, localizeSystemText } from "../locale/living";
import { useLivingModel } from "./LivingModelProvider";
import { sortJourneyNewestFirst } from "./journey";
import { getSnapshotMoments } from "./state-snapshots";
import { ReadOnlyMetric } from "./StateSnapshotCapture";
import type { JourneyEvent, LivingModelState } from "./types";
import { RecentPersonalReflections } from './ReflectionContinuity';
import { localizeDemoText } from "./demo-data";

export default function JourneyPage() {
  const { state } = useLivingModel();
  const { locale, t } = useLocale();
  const zh = locale === "zh-CN";
  const params = useSearchParams();
  const insightId = params.get("insight");
  const events = sortJourneyNewestFirst(insightId ? state.journey.filter((item) => item.insightId === insightId) : state.journey);
  const support = state.sampleDataLoaded && !state.hasPersonalUnderstanding
    ? t("journey.supportExample")
    : t("journey.supportPersonal");
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={t("nav.journey")} title={state.sampleDataLoaded && !state.hasPersonalUnderstanding ? t("journey.titleExample") : t("journey.titlePersonal")} support={support} />
    <RecentPersonalReflections />
    {events.length || state.stateSnapshots.length ? <>
      <DualTrack state={state} events={events} />
      {events.length ? <details className={styles.fullHistory}><summary>{zh ? "完整修订历史 · 最新在前" : "Full revision history · newest first"}</summary><RevisionTimeline state={state} events={events} /></details> : null}
    </> : <section className={styles.emptyState}><p className={styles.eyebrow}>{t("nav.journey")}</p><h1>{t("journey.emptyTitle")}</h1><p>{t("journey.emptyBody")}</p><Link prefetch={false} className={styles.primaryLink} href="/reflection">{t("reflection.startCta")}</Link></section>}
  </div></LivingShell>;
}

function DualTrack({ state, events }: { state: LivingModelState; events: JourneyEvent[] }) {
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const sampleOnly = state.sampleDataLoaded && !state.hasPersonalUnderstanding;
  const d = (value: string) => localizeSystemText(state.sampleDataLoaded ? localizeDemoText(value, locale) : value, locale);
  const moments = getSnapshotMoments(state, 4);
  const revisions = [...events].sort((a,b) => Date.parse(a.createdAt)-Date.parse(b.createdAt)).slice(-4);
  return <section className={styles.dualTrack} aria-label={zh ? "用户自述状态与理解修订的时间变化" : "Self-reported state and understanding revision over time"}>
    <header><p className={styles.sectionLabel}>{zh ? "变化视图" : "Change view"}</p><span>{zh ? "两条证据线 · 都不是进步分数" : "Two evidence tracks · neither is a score of progress"}</span></header>
    <div className={styles.trackRow}><div className={styles.trackLabel}><strong>{zh ? "用户自述状态" : "Self-reported state"}</strong><span>{zh ? "主动记录下来的内容" : "What was actively recorded"}</span></div><div className={styles.trackPoints} style={{ "--track-count": Math.max(moments.length, 1) } as CSSProperties}>{moments.length ? moments.map((moment) => <a key={moment.sessionId} href={`/reflection/${moment.sessionId}`} className={styles.stateMoment}><time>{formatLivingDate(locale, moment.capturedAt, { month: "short", day: "numeric" })}</time><div>{moment.pressure ? <ReadOnlyMetric compact label={zh ? "压力" : "Pressure"} metricKey="pressure" value={moment.pressure.value} /> : null}{moment.clarity ? <ReadOnlyMetric compact label={zh ? "清晰度" : "Clarity"} metricKey="clarity" value={moment.clarity.value} /> : null}</div><small>{d(moment.context)}</small><b>{zh ? "用户自述" : "Self-reported"}</b></a>) : <p className={styles.trackEmpty}>{zh ? "还没有用户自述状态。" : "No self-reported state yet."}</p>}</div></div>
    <div className={styles.trackRow}><div className={styles.trackLabel}><strong>{zh ? "理解的修订" : "Understanding revision"}</strong><span>{zh ? "这份理解如何变得更准确" : "How the model became more precise"}</span></div><div className={styles.trackPoints} style={{ "--track-count": Math.max(revisions.length, 1) } as CSSProperties}>{revisions.length ? revisions.map((item) => <article key={item.id} className={styles.revisionMoment}><time>{formatLivingDate(locale, item.createdAt, { month: "short", day: "numeric" })}</time><p>{d(item.currentStatement ?? item.summary)}</p><small>{sampleOnly && item.changedBy === "user" ? (zh ? "示例人物修改了它" : "Sample person changed this") : item.changedBy === "user" ? (zh ? "你修改了它" : "You changed this") : (zh ? "Agent 提议 · 需要用户确认" : "Agent proposed · user review required")}</small>{item.insightId ? <a href={`/mirror?insight=${item.insightId}`}>{zh ? "打开证据" : "Open evidence"}</a> : null}</article>) : <p className={styles.trackEmpty}>{zh ? "还没有保留的修订。" : "No retained revision yet."}</p>}</div></div>
  </section>;
}

function RevisionTimeline({ state, events }: { state: LivingModelState; events: JourneyEvent[] }) {
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const sampleOnly = state.sampleDataLoaded && !state.hasPersonalUnderstanding;
  const d = (value: string) => localizeSystemText(state.sampleDataLoaded ? localizeDemoText(value, locale) : value, locale);
  return <section className={styles.journeyTimeline}>{events.map((item, index) => { const versions = item.insightId ? state.versions.filter((version) => version.insightId === item.insightId).sort((a,b) => a.versionNumber-b.versionNumber) : []; return <article key={item.id} className={styles.journeyEvent}><div className={styles.journeyMarker}><span>{String(index + 1).padStart(2,"0")}</span></div><div className={styles.journeyContent}><div className={styles.journeyMeta}><span>{labelEnum(locale, item.type)}</span><time>{formatLivingDate(locale, item.createdAt, { month: "short", day: "numeric", year: "numeric" })}</time></div><h2>{sampleOnly && !zh ? d(item.title).replace(/^You /, "Sample person ") : d(item.title)}</h2><p>{d(item.summary)}</p>{item.previousStatement || item.currentStatement ? <div className={styles.versionChange}>{item.previousStatement ? <div><span>{zh ? "之前" : "Before"}</span><p>{d(item.previousStatement)}</p></div> : null}{item.currentStatement ? <div><span>{zh ? "之后" : "After"}</span><p>{d(item.currentStatement)}</p></div> : null}</div> : null}{versions.length > 1 && index === 0 ? <div className={styles.versionSequence}><p className={styles.sectionLabel}>{zh ? "版本历史 · 从最早到现在" : "Version history · earliest to current"}</p>{versions.map((version) => <div key={version.id}><span>V{version.versionNumber}</span><p>{d(version.statement)}</p><small>{version.changedBy === "user" ? sampleOnly ? (zh ? "示例人物修改" : "Sample person changed this") : (zh ? "你修改了它" : "You changed this") : (zh ? "AI 提议" : "AI proposed")}</small></div>)}</div> : null}</div></article>; })}</section>;
}
