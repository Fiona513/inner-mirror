"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";
import { sortJourneyNewestFirst } from "./journey";
import { getSnapshotMoments } from "./state-snapshots";
import { ReadOnlyMetric } from "./StateSnapshotCapture";
import type { JourneyEvent, LivingModelState } from "./types";

export default function JourneyPage() {
  const { state } = useLivingModel();
  const { t } = useLocale();
  const copy = useCopy();
  const params = useSearchParams();
  const insightId = params.get("insight");
  const events = sortJourneyNewestFirst(insightId ? state.journey.filter((item) => item.insightId === insightId) : state.journey);
  const support = state.sampleDataLoaded && !state.hasPersonalUnderstanding
    ? t("journey.supportExample")
    : t("journey.supportPersonal");
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={t("nav.journey")} title={state.sampleDataLoaded && !state.hasPersonalUnderstanding ? t("journey.titleExample") : t("journey.titlePersonal")} support={support} />
    {events.length || state.stateSnapshots.length ? <>
      <DualTrack state={state} events={events} />
      {events.length ? <details className={styles.fullHistory}><summary>{copy("完整修订历史 · 从新到旧", "Full revision history · newest first")}</summary><RevisionTimeline state={state} events={events} /></details> : null}
    </> : <section className={styles.emptyState}><p className={styles.eyebrow}>{t("nav.journey")}</p><h1>{t("journey.emptyTitle")}</h1><p>{t("journey.emptyBody")}</p><Link prefetch={false} className={styles.primaryLink} href="/reflection">{t("reflection.startCta")}</Link></section>}
  </div></LivingShell>;
}

function DualTrack({ state, events }: { state: LivingModelState; events: JourneyEvent[] }) {
  const copy = useCopy();
  const sampleText = useSampleText();
  const { locale } = useLocale();
  const sampleOnly = state.sampleDataLoaded && !state.hasPersonalUnderstanding;
  const moments = getSnapshotMoments(state, 4);
  const revisions = [...events].sort((a,b) => Date.parse(a.createdAt)-Date.parse(b.createdAt)).slice(-4);
  return <section className={styles.dualTrack} aria-label={copy("自报状态与理解修订的时间变化", "Self-reported state and understanding revision over time")}>
    <header><p className={styles.sectionLabel}>{copy("变化视图", "Change view")}</p><span>{copy("两条证据线 · 都不是进步分数", "Two evidence tracks · neither is a score of progress")}</span></header>
    <div className={styles.trackRow}><div className={styles.trackLabel}><strong>{copy("自报状态", "Self-reported state")}</strong><span>{copy("你主动记录的内容", "What was actively recorded")}</span></div><div className={styles.trackPoints} style={{ "--track-count": Math.max(moments.length, 1) } as CSSProperties}>{moments.length ? moments.map((moment) => <a key={moment.sessionId} href={`/reflection/${moment.sessionId}`} className={styles.stateMoment}><time>{formatDate(moment.capturedAt, locale)}</time><div>{moment.pressure ? <ReadOnlyMetric compact label={copy("压力", "Pressure")} metricKey="pressure" value={moment.pressure.value} /> : null}{moment.clarity ? <ReadOnlyMetric compact label={copy("清晰度", "Clarity")} metricKey="clarity" value={moment.clarity.value} /> : null}</div><small>{sampleText(moment.context)}</small><b>{copy("自报", "Self-reported")}</b></a>) : <p className={styles.trackEmpty}>{copy("还没有自报状态。", "No self-reported state yet.")}</p>}</div></div>
    <div className={styles.trackRow}><div className={styles.trackLabel}><strong>{copy("理解修订", "Understanding revision")}</strong><span>{copy("模型如何逐渐变得更准确", "How the model became more precise")}</span></div><div className={styles.trackPoints} style={{ "--track-count": Math.max(revisions.length, 1) } as CSSProperties}>{revisions.length ? revisions.map((item) => <article key={item.id} className={styles.revisionMoment}><time>{formatDate(item.createdAt, locale)}</time><p>{sampleText(item.currentStatement ?? item.summary)}</p><small>{sampleOnly && item.changedBy === "user" ? copy("示例人物修改了此项", "Sample person changed this") : item.changedBy === "user" ? copy("由你修改", "You changed this") : copy("Agent 提议 · 需要用户确认", "Agent proposed · user review required")}</small>{item.insightId ? <a href={`/mirror?insight=${item.insightId}`}>{copy("查看依据", "Open evidence")}</a> : null}</article>) : <p className={styles.trackEmpty}>{copy("还没有保留的修订。", "No retained revision yet.")}</p>}</div></div>
  </section>;
}

function RevisionTimeline({ state, events }: { state: LivingModelState; events: JourneyEvent[] }) {
  const copy = useCopy();
  const sampleText = useSampleText();
  const { locale } = useLocale();
  const sampleOnly = state.sampleDataLoaded && !state.hasPersonalUnderstanding;
  return <section className={styles.journeyTimeline}>{events.map((item, index) => { const versions = item.insightId ? state.versions.filter((version) => version.insightId === item.insightId).sort((a,b) => a.versionNumber-b.versionNumber) : []; return <article key={item.id} className={styles.journeyEvent}><div className={styles.journeyMarker}><span>{String(index + 1).padStart(2,"0")}</span></div><div className={styles.journeyContent}><div className={styles.journeyMeta}><span>{sampleText(item.type.replaceAll("_", " "))}</span><time>{formatDate(item.createdAt, locale, true)}</time></div><h2>{sampleOnly && item.title.startsWith("You ") ? copy("示例人物让情境更准确", "Sample person made the context more precise") : sampleText(item.title)}</h2><p>{sampleText(item.summary)}</p>{item.previousStatement || item.currentStatement ? <div className={styles.versionChange}>{item.previousStatement ? <div><span>{copy("之前", "Before")}</span><p>{sampleText(item.previousStatement)}</p></div> : null}{item.currentStatement ? <div><span>{copy("之后", "After")}</span><p>{sampleText(item.currentStatement)}</p></div> : null}</div> : null}{versions.length > 1 && index === 0 ? <div className={styles.versionSequence}><p className={styles.sectionLabel}>{copy("版本历史 · 从最早到当前", "Version history · earliest to current")}</p>{versions.map((version) => <div key={version.id}><span>V{version.versionNumber}</span><p>{sampleText(version.statement)}</p><small>{version.changedBy === "user" ? sampleOnly ? copy("示例人物修改了此项", "Sample person changed this") : copy("由你修改", "You changed this") : copy("AI 提议", "AI proposed")}</small></div>)}</div> : null}</div></article>; })}</section>;
}

function formatDate(value: string, locale: string, includeYear = false) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" as const } : {}) }).format(new Date(value));
}
