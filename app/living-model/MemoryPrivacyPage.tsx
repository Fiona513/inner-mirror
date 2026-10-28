"use client";

import { useState } from "react";
import { useLocale } from "../locale/locale";
import { formatLivingDate, getLivingCopy, labelEnum } from "../locale/living";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";
import { localizeDemoText } from "./demo-data";

export default function MemoryPrivacyPage() {
  const { state, dispatch } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const [editingFact, setEditingFact] = useState<string | null>(null);
  const [factText, setFactText] = useState("");
  const visibleFacts = state.facts.filter((item) => !item.forgotten);
  const visibleObservations = state.observations.filter((item) => !item.forgotten);
  const visibleInsights = state.insights.filter((item) => item.status !== "archived");
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy.privacy.eyebrow} title={copy.privacy.title} support={copy.privacy.support} />
    <section className={styles.memoryControl}><div><p className={styles.sectionLabel}>{copy.privacy.longTerm}</p><h2>{state.memoryPaused ? copy.privacy.paused : copy.privacy.on}</h2><p>{state.memoryPaused ? copy.privacy.pausedBody : copy.privacy.onBody}</p></div><button type="button" role="switch" aria-checked={!state.memoryPaused} onClick={() => dispatch({ type: "TOGGLE_MEMORY", paused: !state.memoryPaused })} className={styles.memorySwitch}><span>{state.memoryPaused ? copy.privacy.off : copy.privacy.onSwitch}</span><i /></button></section>
    <section className={styles.memoryLayers}>
      <MemoryLayer index="01" eyebrow={copy.privacy.shared} title={copy.privacy.facts} support={copy.privacy.factsHelp}>{visibleFacts.map((fact) => <article key={fact.id} className={styles.memoryItem}><div><span>{d(fact.context)}</span>{editingFact === fact.id ? <input value={factText} onChange={(event) => setFactText(event.target.value)} /> : <p>{d(fact.statement)}</p>}</div><div>{editingFact === fact.id ? <><button type="button" onClick={() => { dispatch({ type: "EDIT_FACT", factId: fact.id, statement: factText, now: new Date().toISOString() }); setEditingFact(null); }}>{copy.common.save}</button><button type="button" onClick={() => setEditingFact(null)}>{copy.common.cancel}</button></> : <><button type="button" onClick={() => { setEditingFact(fact.id); setFactText(d(fact.statement)); }}>{copy.common.edit}</button><button type="button" onClick={() => dispatch({ type: "FORGET_FACT", factId: fact.id })}>{copy.common.forget}</button></>}</div></article>)}</MemoryLayer>
      <MemoryLayer index="02" eyebrow={copy.privacy.noticed} title={copy.privacy.observations} support={copy.privacy.observationsHelp}>{visibleObservations.map((observation) => <article key={observation.id} className={styles.memoryItem}><div><span>{observation.sourceSessionIds.length} {copy.privacy.sourceReflections} · {observation.disputed ? copy.privacy.challenged : copy.privacy.observation}</span><p>{d(observation.statement)}</p></div><div><button type="button" onClick={() => dispatch({ type: "CHALLENGE_OBSERVATION", observationId: observation.id })}>{observation.disputed ? copy.privacy.challengedAction : copy.privacy.challenge}</button><button type="button" onClick={() => dispatch({ type: "FORGET_OBSERVATION", observationId: observation.id })}>{copy.common.forget}</button></div></article>)}</MemoryLayer>
      <MemoryLayer index="03" eyebrow={copy.privacy.mirrorUnderstands} title={copy.privacy.interpretations} support={copy.privacy.interpretationsHelp}>{visibleInsights.map((insight) => <article key={insight.id} className={styles.memoryItem}><div><span>{labelEnum(locale, insight.status)} · {copy.privacy.interpretation}</span><p>{d(insight.statement)}</p></div><div><a href={`/mirror?insight=${insight.id}`}>{copy.common.open}</a><button type="button" onClick={() => dispatch({ type: "ARCHIVE_INSIGHT", insightId: insight.id, reason: "user_archived", now: new Date().toISOString() })}>{copy.common.archive}</button></div></article>)}</MemoryLayer>
    </section>
    <section className={styles.rejectionLedger}><p className={styles.sectionLabel}>{copy.privacy.rejected}</p><h2>{copy.privacy.rejectedHelp}</h2>{state.rejectedInterpretations.map((item) => <div key={item.id}><p>{d(item.statement)}</p><span>{copy.privacy.rejectedLabel} · {formatLivingDate(locale, item.rejectedAt, { month: "short", day: "numeric" })}</span></div>)}</section>
  </div></LivingShell>;
}

function MemoryLayer({ index, eyebrow, title, support, children }: { index: string; eyebrow: string; title: string; support: string; children: React.ReactNode }) { return <section className={styles.memoryLayer}><header><span>{index}</span><div><p className={styles.sectionLabel}>{eyebrow}</p><h2>{title}</h2><p>{support}</p></div></header><div>{children}</div></section>; }
