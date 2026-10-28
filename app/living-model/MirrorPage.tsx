"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLocale } from "../locale/locale";
import { formatLivingDate, getLivingCopy, labelEnum } from "../locale/living";
import { useLivingModel } from "./LivingModelProvider";
import type { Insight, InsightCategory } from "./types";
import type { MessageKey } from "../locale/messages";
import { localizeDemoText } from "./demo-data";

const categories: { id: "all" | InsightCategory; labelKey: MessageKey }[] = [
  { id: "all", labelKey: "mirror.categoryAll" }, { id: "what_matters", labelKey: "mirror.categoryMatters" }, { id: "what_i_need", labelKey: "mirror.categoryNeed" }, { id: "patterns", labelKey: "mirror.categoryPatterns" }, { id: "tensions", labelKey: "mirror.categoryTensions" }, { id: "boundaries", labelKey: "mirror.categoryBoundaries" }, { id: "directions", labelKey: "mirror.categoryDirections" },
];

export default function MirrorPage() {
  const params = useSearchParams();
  const { state, dispatch } = useLivingModel();
  const { locale, t } = useLocale();
  const zh = locale === "zh-CN";
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const active = useMemo(() => state.insights.filter((item) => item.status !== "archived" && item.userConfirmed), [state.insights]);
  const initialId = params.get("insight") ?? active[0]?.id ?? "";
  const [category, setCategory] = useState<"all" | InsightCategory>("all");
  const [selectedId, setSelectedId] = useState(initialId);
  const [drawer, setDrawer] = useState(false);
  const [editMode, setEditMode] = useState<"idle" | "edit" | "context" | "archive">("idle");
  const selected = active.find((item) => item.id === selectedId) ?? active[0];
  const visible = category === "all" ? active : active.filter((item) => item.category === category);
  const nodePositions = [styles.mirrorNodeOne, styles.mirrorNodeTwo, styles.mirrorNodeThree, styles.mirrorNodeFour, styles.mirrorNodeFive, styles.mirrorNodeSix, styles.mirrorNodeSeven, styles.mirrorNodeEight];
  const personalCopy = !state.sampleDataLoaded || state.hasPersonalUnderstanding;

  return <LivingShell><div className={`${styles.page} ${styles.mirrorPage}`}><PageHeader eyebrow={t("nav.mirror")} title={personalCopy ? t("mirror.titlePersonal") : t("mirror.titleExample")} support={personalCopy ? t("mirror.supportPersonal") : t("mirror.supportExample")} />
    {state.sampleDataLoaded ? <div className={styles.sampleBanner}><strong>{zh ? "示例人物" : "Sample person"}</strong><span>{zh ? "示例历史始终与你亲自确认的内容分开。" : "Example history remains separate from anything you personally confirm."}</span></div> : null}
    {active.length ? <div className={styles.mirrorWorkspace}>
      <aside className={styles.categoryRail} aria-label={zh ? "镜像分类" : "Mirror categories"}>{categories.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{t(item.labelKey)}<span>{item.id === "all" ? active.length : active.filter((insight) => insight.category === item.id).length}</span></button>)}</aside>
      <section className={styles.livingMirror} aria-label={personalCopy ? (zh ? "你选择保留的理解之间的关系视图" : "Relational view of understandings you chose to keep") : (zh ? "示例人物理解之间的关系视图" : "Relational view of sample person example understandings")}>
        <div className={styles.mirrorFieldLabel}><span>{zh ? "生长中的镜像" : "Living mirror"}</span><small>{zh ? "看关系，而不是分数" : "relationships, not scores"}</small></div>
        <div className={styles.livingCenter}>{zh ? "此刻" : "NOW"}</div>
        <span className={`${styles.connection} ${styles.connectionOne}`} /><span className={`${styles.connection} ${styles.connectionTwo}`} /><span className={`${styles.connection} ${styles.connectionThree}`} />
        {visible.map((insight, index) => <button type="button" key={insight.id} onClick={() => setSelectedId(insight.id)} className={`${styles.mirrorNode} ${nodePositions[index % nodePositions.length]} ${selected?.id === insight.id ? styles.mirrorNodeSelected : ""} ${styles[`status_${insight.status}`] ?? ""}`} aria-label={`${d(insight.title)}, ${labelEnum(locale, insight.status)}`}><span /><strong>{d(insight.title)}</strong><small>{labelEnum(locale, insight.status)}</small></button>)}
        {!visible.length ? <div className={styles.mirrorFilterEmpty}>{zh ? "这个分类中还没有保留的理解。" : "No retained understanding is in this category yet."}</div> : null}
      </section>
      {selected ? <MirrorDetail insight={selected} onEvidence={() => setDrawer(true)} mode={editMode} setMode={setEditMode} /> : null}
    </div> : <section className={styles.emptyState}><p className={styles.eyebrow}>{t("nav.mirror")}</p><h1>{t("mirror.emptyTitle")}</h1><p>{t("mirror.emptyBody")}</p><Link prefetch={false} className={styles.primaryLink} href="/reflection">{t("reflection.startCta")}</Link></section>}
  </div>{drawer && selected ? <EvidenceDrawer evidenceIds={selected.evidenceIds} hypothesis={selected.statement} onClose={() => setDrawer(false)} /> : null}</LivingShell>;

  function MirrorDetail({ insight, onEvidence, mode, setMode }: { insight: Insight; onEvidence: () => void; mode: typeof editMode; setMode: (mode: typeof editMode) => void }) {
    const copy = getLivingCopy(locale);
    const [statement, setStatement] = useState(d(insight.statement));
    const [reason, setReason] = useState("");
    const [applies, setApplies] = useState(insight.appliesWhen.map(d).join("\n"));
    const [doesNot, setDoesNot] = useState(insight.doesNotApplyWhen.map(d).join("\n"));
    const versions = state.versions.filter((item) => item.insightId === insight.id).sort((a, b) => a.versionNumber - b.versionNumber);
    const evidence = state.evidence.filter((item) => insight.evidenceIds.includes(item.id) && !item.forgotten);
    const supporting = evidence.filter((item) => item.relationship === "supporting").length;
    const counter = evidence.filter((item) => item.relationship === "counter_signal").length;
    const date = formatLivingDate(locale, insight.lastRevisedAt, { month: "short", day: "numeric" });
    const stamp = () => new Date().toISOString();
    return <aside className={styles.mirrorDetail} aria-label={zh ? "选中理解的详情" : "Selected understanding detail"}><div className={styles.detailHeader}><div><p className={styles.sectionLabel}>{zh ? "当前理解" : "Current understanding"}</p><h2>{d(insight.title)}</h2></div><span className={styles.statusLabel}>{labelEnum(locale, insight.status)}</span></div><p className={styles.detailStatement}>{d(insight.statement)}</p>
      <section className={styles.evidenceBalance} aria-label={zh ? `${supporting} 条支撑线索，${counter} 条反向线索` : `${supporting} supporting moments and ${counter} moments that complicate this understanding`}><div><span>{zh ? "支撑线索" : "Supporting signals"}</span><i aria-hidden="true">{Array.from({ length: supporting }, (_, index) => <b key={index} />)}</i><strong>{supporting} {zh ? "条支撑线索" : "supporting moments"}</strong></div><div><span>{zh ? "反向线索" : "Counter-signals"}</span><i aria-hidden="true">{Array.from({ length: counter }, (_, index) => <b key={index} />)}</i><strong>{counter} {zh ? "条让它变得复杂的线索" : "moments that complicate it"}</strong></div><small>{zh ? "证据关系 · 记录什么支撑、什么让这份理解变得复杂" : "Evidence balance · a record of what supports and complicates this understanding"}</small></section>
      <dl className={styles.detailMeta}><div><dt>{zh ? "状态" : "Status"}</dt><dd>{labelEnum(locale, insight.status)}</dd></div><div><dt>{zh ? "证据" : "Evidence"}</dt><dd>{supporting} {zh ? "支撑" : "support"} · {counter} {zh ? "反向" : "counter"}</dd></div><div><dt>{zh ? "最近修订" : "Last revised"}</dt><dd>{date}</dd></div><div><dt>{zh ? "修改者" : "Changed by"}</dt><dd>{versions.at(-1)?.changedBy === "user" ? (zh ? "你" : "You") : (zh ? "AI 提议 · 由你确认" : "AI proposed · You confirmed")}</dd></div></dl>
      <details className={styles.progressiveDetail}><summary>{zh ? "情境与边界" : "Context and boundaries"}</summary><DetailList title={zh ? "更贴近的情况" : "Seems true when"} items={insight.appliesWhen.map(d)} empty={zh ? "暂未说明。" : "Not specified yet."} /><DetailList title={zh ? "不太贴近的情况" : "Seems less true when"} items={insight.doesNotApplyWhen.map(d)} empty={zh ? "暂未说明。" : "Not specified yet."} /></details>
      <details className={styles.progressiveDetail}><summary>{zh ? "它是怎样形成的" : "How this formed"}</summary><section className={styles.versionPeek}><div><span>{zh ? "最初版本" : "First version"}</span><p>{d(versions[0]?.statement ?? insight.statement)}</p><span>{zh ? "当前版本" : "Current version"}</span><p>{d(versions.at(-1)?.statement ?? insight.statement)}</p></div><a href={`/journey?insight=${insight.id}`}>{zh ? "查看完整历史" : "See full history"}</a></section></details>
      {mode === "edit" ? <div className={styles.detailEditor}><label>{zh ? "编辑这份理解" : "Edit this understanding"}<textarea value={statement} onChange={(event) => setStatement(event.target.value)} /></label><label>{zh ? "你为什么要修改它？" : "Why are you changing it?"} <span>{zh ? "可选" : "optional"}</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => { dispatch({ type: "EDIT_INSIGHT", insightId: insight.id, statement, reason, now: stamp() }); setMode("idle"); }}>{zh ? "保存为新版本" : "Save as a new version"}</button><button type="button" className={styles.quietButton} onClick={() => setMode("idle")}>{copy.common.cancel}</button></div></div> : null}
      {mode === "context" ? <div className={styles.detailEditor}><label>{zh ? "更贴近的情况" : "Seems true when"}<textarea value={applies} onChange={(event) => setApplies(event.target.value)} /></label><label>{zh ? "不太贴近的情况" : "Seems less true when"}<textarea value={doesNot} onChange={(event) => setDoesNot(event.target.value)} /></label><div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => { dispatch({ type: "CONTEXTUALIZE_INSIGHT", insightId: insight.id, appliesWhen: applies.split("\n").filter(Boolean), doesNotApplyWhen: doesNot.split("\n").filter(Boolean), now: stamp() }); setMode("idle"); }}>{zh ? "保存情境" : "Save context"}</button><button type="button" className={styles.quietButton} onClick={() => setMode("idle")}>{copy.common.cancel}</button></div></div> : null}
      {mode === "archive" ? <div className={styles.archiveChoice}><p>{zh ? "发生了什么变化？" : "What changed?"}</p><button type="button" onClick={() => dispatch({ type: "ARCHIVE_INSIGHT", insightId: insight.id, reason: "changed", now: stamp() })}><strong>{zh ? "我已经变了" : "I've changed"}</strong><span>{zh ? "它过去曾经贴近。把这份变化保留在旅程中。" : "This used to fit me. Keep the change in Journey."}</span></button><button type="button" onClick={() => dispatch({ type: "ARCHIVE_INSIGHT", insightId: insight.id, reason: "inaccurate", now: stamp() })}><strong>{zh ? "它从来都不太准确" : "It was never quite right"}</strong><span>{zh ? "把它作为不准确的解读归档，而不是当作成长。" : "Archive it as inaccurate, not as growth."}</span></button><button type="button" className={styles.quietButton} onClick={() => setMode("idle")}>{copy.common.cancel}</button></div> : null}
      {mode === "idle" ? <div className={styles.detailActions}>{insight.status === "changing" ? <button type="button" onClick={() => dispatch({ type: "CONFIRM_CHANGE", insightId: insight.id, now: stamp() })}>{zh ? "保留这份变化" : "Keep this change"}</button> : null}<button type="button" onClick={() => setMode("edit")}>{copy.common.edit}</button><button type="button" onClick={onEvidence}>{zh ? "查看证据" : "View evidence"}</button><a href={`/journey?insight=${insight.id}`}>{zh ? "查看历史" : "See history"}</a><button type="button" onClick={() => setMode("context")}>{zh ? "只在某些情况下" : "Only in some situations"}</button><button type="button" onClick={() => setMode("archive")}>{zh ? "这已经不再像我" : "This isn't me anymore"}</button></div> : null}
    </aside>;
  }
}

function DetailList({ title, items, empty }: { title: string; items: string[]; empty: string }) { return <section className={styles.detailList}><h3>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</section>; }
