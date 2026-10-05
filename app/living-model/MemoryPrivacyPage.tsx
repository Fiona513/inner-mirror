"use client";

import { useState } from "react";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";

export default function MemoryPrivacyPage() {
  const { state, dispatch } = useLivingModel();
  const copy = useCopy();
  const sampleText = useSampleText();
  const { locale } = useLocale();
  const [editingFact, setEditingFact] = useState<string | null>(null);
  const [factText, setFactText] = useState("");
  const visibleFacts = state.facts.filter((item) => !item.forgotten);
  const visibleObservations = state.observations.filter((item) => !item.forgotten);
  const visibleInsights = state.insights.filter((item) => item.status !== "archived");
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy("记忆与隐私", "Memory & Privacy")} title={copy("由你决定哪些内容可以留下", "You choose what can be remembered")} support={copy("事实可以被记住，观察可以被质疑；解释不会被当成身份事实。", "Facts can be remembered. Observations can be challenged. Interpretations never become identity facts.")} />
    <section className={styles.memoryControl}><div><p className={styles.sectionLabel}>{copy("长期记忆", "Long-term memory")}</p><h2>{state.memoryPaused ? copy("已暂停", "Paused") : copy("已开启", "On")}</h2><p>{state.memoryPaused ? copy("仍可进行新的反思，但不会更新长期镜像。", "New reflections work normally, but do not update your long-term mirror.") : copy("只有保留的内容才会用于后续反思。", "Only retained information can be used in future reflection retrieval.")}</p></div><button type="button" role="switch" aria-checked={!state.memoryPaused} onClick={() => dispatch({ type: "TOGGLE_MEMORY", paused: !state.memoryPaused })} className={styles.memorySwitch}><span>{state.memoryPaused ? copy("关闭", "OFF") : copy("开启", "ON")}</span><i /></button></section>
    <section className={styles.memoryLayers}>
      <MemoryLayer index="01" eyebrow={copy("你分享过的内容", "What you've shared")} title={copy("事实", "Facts")} support={copy("你明确说过的现实情况，可以编辑或遗忘。", "Reality you explicitly shared. These can be edited or forgotten.")}>{visibleFacts.map((fact) => <article key={fact.id} className={styles.memoryItem}><div><span>{sampleText(fact.context)}</span>{editingFact === fact.id ? <input value={factText} onChange={(event) => setFactText(event.target.value)} /> : <p>{sampleText(fact.statement)}</p>}</div><div>{editingFact === fact.id ? <><button type="button" onClick={() => { dispatch({ type: "EDIT_FACT", factId: fact.id, statement: factText, now: new Date().toISOString() }); setEditingFact(null); }}>{copy("保存", "Save")}</button><button type="button" onClick={() => setEditingFact(null)}>{copy("取消", "Cancel")}</button></> : <><button type="button" onClick={() => { setEditingFact(fact.id); setFactText(sampleText(fact.statement)); }}>{copy("编辑", "Edit")}</button><button type="button" onClick={() => dispatch({ type: "FORGET_FACT", factId: fact.id })}>{copy("遗忘", "Forget")}</button></>}</div></article>)}</MemoryLayer>
      <MemoryLayer index="02" eyebrow={copy("系统注意到的内容", "What the system has noticed")} title={copy("观察", "Observations")} support={copy("保留的反思中出现的描述性模式，不是对你的定义。", "Descriptive patterns in retained sessions, not claims about who you are.")}>{visibleObservations.map((observation) => <article key={observation.id} className={styles.memoryItem}><div><span>{locale === "zh-CN" ? `${observation.sourceSessionIds.length} 次来源反思 · ${observation.disputed ? "已质疑" : "观察"}` : `${observation.sourceSessionIds.length} source reflections · ${observation.disputed ? "challenged" : "observation"}`}</span><p>{sampleText(observation.statement)}</p></div><div><button type="button" onClick={() => dispatch({ type: "CHALLENGE_OBSERVATION", observationId: observation.id })}>{observation.disputed ? copy("已质疑", "Challenged") : copy("质疑", "Challenge")}</button><button type="button" onClick={() => dispatch({ type: "FORGET_OBSERVATION", observationId: observation.id })}>{copy("遗忘", "Forget")}</button></div></article>)}</MemoryLayer>
      <MemoryLayer index="03" eyebrow={copy("镜像目前的理解", "How your mirror currently understands you")} title={copy("解释", "Interpretations")} support={copy("由你掌握的假设，可以查看、改写、补充情境或归档。", "User-owned hypotheses. They can be inspected, rewritten, contextualized, or archived.")}>{visibleInsights.map((insight) => <article key={insight.id} className={styles.memoryItem}><div><span>{sampleText(insight.status.replaceAll("_", " "))} · {copy("解释", "interpretation")}</span><p>{sampleText(insight.statement)}</p></div><div><a href={`/mirror?insight=${insight.id}`}>{copy("打开", "Open")}</a><button type="button" onClick={() => dispatch({ type: "ARCHIVE_INSIGHT", insightId: insight.id, reason: "user_archived", now: new Date().toISOString() })}>{copy("归档", "Archive")}</button></div></article>)}</MemoryLayer>
    </section>
    <section className={styles.rejectionLedger}><p className={styles.sectionLabel}>{copy("已拒绝的解释", "Rejected interpretations")}</p><h2>{copy("这些解释不会被悄悄重新使用", "What Inner Mirror must not quietly reuse")}</h2>{state.rejectedInterpretations.map((item) => <div key={item.id}><p>{sampleText(item.statement)}</p><span>{copy("已拒绝", "Rejected")} · {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(item.rejectedAt))}</span></div>)}</section>
  </div></LivingShell>;
}

function MemoryLayer({ index, eyebrow, title, support, children }: { index: string; eyebrow: string; title: string; support: string; children: React.ReactNode }) { return <section className={styles.memoryLayer}><header><span>{index}</span><div><p className={styles.sectionLabel}>{eyebrow}</p><h2>{title}</h2><p>{support}</p></div></header><div>{children}</div></section>; }
