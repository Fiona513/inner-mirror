"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";
import type { Insight, InsightCategory } from "./types";
import type { MessageKey } from "../locale/messages";

const categories: { id: "all" | InsightCategory; labelKey: MessageKey }[] = [
  { id: "all", labelKey: "mirror.categoryAll" }, { id: "what_matters", labelKey: "mirror.categoryMatters" }, { id: "what_i_need", labelKey: "mirror.categoryNeed" }, { id: "patterns", labelKey: "mirror.categoryPatterns" }, { id: "tensions", labelKey: "mirror.categoryTensions" }, { id: "boundaries", labelKey: "mirror.categoryBoundaries" }, { id: "directions", labelKey: "mirror.categoryDirections" },
];

export default function MirrorPage() {
  const params = useSearchParams();
  const { state, dispatch } = useLivingModel();
  const { t, locale } = useLocale();
  const copy = useCopy();
  const sampleText = useSampleText();
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
    {state.sampleDataLoaded ? <div className={styles.sampleBanner}><strong>{copy("示例人物", "Sample person")}</strong><span>{copy("示例历史与你亲自确认的内容分开保存。", "Example history remains separate from anything you personally confirm.")}</span></div> : null}
    {active.length ? <div className={styles.mirrorWorkspace}>
      <aside className={styles.categoryRail} aria-label={copy("镜像分类", "Mirror categories")}>{categories.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{t(item.labelKey)}<span>{item.id === "all" ? active.length : active.filter((insight) => insight.category === item.id).length}</span></button>)}</aside>
      <section className={styles.livingMirror} aria-label={personalCopy ? copy("你选择保留的理解之间的关系", "Relational view of understandings you chose to keep") : copy("示例人物的理解之间的关系", "Relational view of sample person example understandings")}>
        <div className={styles.mirrorFieldLabel}><span>{copy("动态镜像", "Living mirror")}</span><small>{copy("呈现关系，不打分", "relationships, not scores")}</small></div>
        <div className={styles.livingCenter}>{t("nav.now")}</div>
        <span className={`${styles.connection} ${styles.connectionOne}`} /><span className={`${styles.connection} ${styles.connectionTwo}`} /><span className={`${styles.connection} ${styles.connectionThree}`} />
        {visible.map((insight, index) => <button type="button" key={insight.id} onClick={() => setSelectedId(insight.id)} className={`${styles.mirrorNode} ${nodePositions[index % nodePositions.length]} ${selected?.id === insight.id ? styles.mirrorNodeSelected : ""} ${styles[`status_${insight.status}`] ?? ""}`} aria-label={`${sampleText(insight.title)}, ${sampleText(insight.status.replaceAll("_", " "))}`}><span /><strong>{sampleText(insight.title)}</strong><small>{sampleText(insight.status.replaceAll("_", " "))}</small></button>)}
        {!visible.length ? <div className={styles.mirrorFilterEmpty}>{copy("这个分类里还没有保留的理解。", "No retained understanding is in this category yet.")}</div> : null}
      </section>
      {selected ? <MirrorDetail insight={selected} onEvidence={() => setDrawer(true)} mode={editMode} setMode={setEditMode} /> : null}
    </div> : <section className={styles.emptyState}><p className={styles.eyebrow}>{t("nav.mirror")}</p><h1>{t("mirror.emptyTitle")}</h1><p>{t("mirror.emptyBody")}</p><Link prefetch={false} className={styles.primaryLink} href="/reflection">{t("reflection.startCta")}</Link></section>}
  </div>{drawer && selected ? <EvidenceDrawer evidenceIds={selected.evidenceIds} hypothesis={selected.statement} onClose={() => setDrawer(false)} /> : null}</LivingShell>;

  function MirrorDetail({ insight, onEvidence, mode, setMode }: { insight: Insight; onEvidence: () => void; mode: typeof editMode; setMode: (mode: typeof editMode) => void }) {
    const [statement, setStatement] = useState(insight.statement);
    const [reason, setReason] = useState("");
    const [applies, setApplies] = useState(insight.appliesWhen.join("\n"));
    const [doesNot, setDoesNot] = useState(insight.doesNotApplyWhen.join("\n"));
    const versions = state.versions.filter((item) => item.insightId === insight.id).sort((a, b) => a.versionNumber - b.versionNumber);
    const evidence = state.evidence.filter((item) => insight.evidenceIds.includes(item.id) && !item.forgotten);
    const supporting = evidence.filter((item) => item.relationship === "supporting").length;
    const counter = evidence.filter((item) => item.relationship === "counter_signal").length;
    const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(insight.lastRevisedAt));
    const stamp = () => new Date().toISOString();
    return <aside className={styles.mirrorDetail} aria-label={copy("所选理解详情", "Selected understanding detail")}><div className={styles.detailHeader}><div><p className={styles.sectionLabel}>{copy("当前理解", "Current understanding")}</p><h2>{sampleText(insight.title)}</h2></div><span className={styles.statusLabel}>{sampleText(insight.status.replaceAll("_", " "))}</span></div><p className={styles.detailStatement}>{sampleText(insight.statement)}</p>
      <section className={styles.evidenceBalance} aria-label={locale === "zh-CN" ? `${supporting} 条支持线索、${counter} 条反向线索` : `${supporting} supporting moments and ${counter} moments that complicate this understanding`}><div><span>{copy("支持线索", "Supporting signals")}</span><i aria-hidden="true">{Array.from({ length: supporting }, (_, index) => <b key={index} />)}</i><strong>{locale === "zh-CN" ? `${supporting} 条支持线索` : `${supporting} supporting moments`}</strong></div><div><span>{copy("反向线索", "Counter-signals")}</span><i aria-hidden="true">{Array.from({ length: counter }, (_, index) => <b key={index} />)}</i><strong>{locale === "zh-CN" ? `${counter} 条反向线索` : `${counter} moments that complicate it`}</strong></div><small>{copy("证据平衡 · 同时保留支持与质疑这条理解的线索", "Evidence balance · a record of what supports and complicates this understanding")}</small></section>
      <dl className={styles.detailMeta}><div><dt>{copy("状态", "Status")}</dt><dd>{sampleText(insight.status.replaceAll("_", " "))}</dd></div><div><dt>{copy("依据", "Evidence")}</dt><dd>{locale === "zh-CN" ? `${supporting} 条支持 · ${counter} 条反向` : `${supporting} support · ${counter} counter`}</dd></div><div><dt>{copy("最近修订", "Last revised")}</dt><dd>{date}</dd></div><div><dt>{copy("修改者", "Changed by")}</dt><dd>{versions.at(-1)?.changedBy === "user" ? copy("你", "You") : copy("AI 提议 · 你确认", "AI proposed · You confirmed")}</dd></div></dl>
      <details className={styles.progressiveDetail}><summary>{copy("情境与边界", "Context and boundaries")}</summary><DetailList title={copy("何时适用", "Seems true when")} items={insight.appliesWhen} /><DetailList title={copy("何时不适用", "Seems less true when")} items={insight.doesNotApplyWhen} /></details>
      <details className={styles.progressiveDetail}><summary>{copy("这条理解如何形成", "How this formed")}</summary><section className={styles.versionPeek}><div><span>{copy("最初版本", "First version")}</span><p>{sampleText(versions[0]?.statement ?? insight.statement)}</p><span>{copy("当前版本", "Current version")}</span><p>{sampleText(versions.at(-1)?.statement ?? insight.statement)}</p></div><a href={`/journey?insight=${insight.id}`}>{copy("查看完整历史", "See full history")}</a></section></details>
      {mode === "edit" ? <div className={styles.detailEditor}><label>{copy("编辑这条理解", "Edit this understanding")}<textarea value={sampleText(statement)} onChange={(event) => setStatement(event.target.value)} /></label><label>{copy("为什么要修改？", "Why are you changing it?")} <span>{copy("可选", "optional")}</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => { dispatch({ type: "EDIT_INSIGHT", insightId: insight.id, statement, reason, now: stamp() }); setMode("idle"); }}>{copy("另存为新版本", "Save as a new version")}</button><button type="button" className={styles.quietButton} onClick={() => setMode("idle")}>{copy("取消", "Cancel")}</button></div></div> : null}
      {mode === "context" ? <div className={styles.detailEditor}><label>{copy("何时适用", "Seems true when")}<textarea value={applies.split("\n").map(sampleText).join("\n")} onChange={(event) => setApplies(event.target.value)} /></label><label>{copy("何时不适用", "Seems less true when")}<textarea value={doesNot.split("\n").map(sampleText).join("\n")} onChange={(event) => setDoesNot(event.target.value)} /></label><div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => { dispatch({ type: "CONTEXTUALIZE_INSIGHT", insightId: insight.id, appliesWhen: applies.split("\n").filter(Boolean), doesNotApplyWhen: doesNot.split("\n").filter(Boolean), now: stamp() }); setMode("idle"); }}>{copy("保存情境", "Save context")}</button><button type="button" className={styles.quietButton} onClick={() => setMode("idle")}>{copy("取消", "Cancel")}</button></div></div> : null}
      {mode === "archive" ? <div className={styles.archiveChoice}><p>{copy("发生了什么变化？", "What changed?")}</p><button type="button" onClick={() => dispatch({ type: "ARCHIVE_INSIGHT", insightId: insight.id, reason: "changed", now: stamp() })}><strong>{copy("我变了", "I\u0027ve changed")}</strong><span>{copy("这条理解曾经适用，把变化留在旅程里。", "This used to fit me. Keep the change in Journey.")}</span></button><button type="button" onClick={() => dispatch({ type: "ARCHIVE_INSIGHT", insightId: insight.id, reason: "inaccurate", now: stamp() })}><strong>{copy("它原本就不准确", "It was never quite right")}</strong><span>{copy("以不准确为由归档，不把它当成成长。", "Archive it as inaccurate, not as growth.")}</span></button><button type="button" className={styles.quietButton} onClick={() => setMode("idle")}>{copy("取消", "Cancel")}</button></div> : null}
      {mode === "idle" ? <div className={styles.detailActions}>{insight.status === "changing" ? <button type="button" onClick={() => dispatch({ type: "CONFIRM_CHANGE", insightId: insight.id, now: stamp() })}>{copy("保留这次变化", "Keep this change")}</button> : null}<button type="button" onClick={() => setMode("edit")}>{copy("编辑", "Edit")}</button><button type="button" onClick={onEvidence}>{copy("查看依据", "View evidence")}</button><a href={`/journey?insight=${insight.id}`}>{copy("查看历史", "See history")}</a><button type="button" onClick={() => setMode("context")}>{copy("只在某些情况下适用", "Only in some situations")}</button><button type="button" onClick={() => setMode("archive")}>{copy("这不再像我了", "This isn\u0027t me anymore")}</button></div> : null}
    </aside>;
  }
}

function DetailList({ title, items }: { title: string; items: string[] }) { const copy = useCopy(); const sampleText = useSampleText(); return <section className={styles.detailList}><h3>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item}>{sampleText(item)}</li>)}</ul> : <p>{copy("尚未注明。", "Not specified yet.")}</p>}</section>; }
