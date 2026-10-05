"use client";

import { useEffect, useRef } from "react";
import styles from "./LivingModel.module.css";
import { useCopy } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";

export function EvidenceDrawer({ evidenceIds, hypothesis, onClose }: { evidenceIds: string[]; hypothesis: string; onClose: () => void }) {
  const { state } = useLivingModel();
  const copy = useCopy();
  const sampleText = useSampleText();
  const closeRef = useRef<HTMLButtonElement>(null);
  const evidence = state.evidence.filter((item) => evidenceIds.includes(item.id) && !item.forgotten);
  const supporting = evidence.filter((item) => item.relationship === "supporting");
  const counter = evidence.filter((item) => item.relationship === "counter_signal");

  useEffect(() => {
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  return (
    <div className={styles.drawerBackdrop}>
      <button className={styles.drawerScrim} type="button" onClick={onClose} aria-label={copy("关闭证据面板", "Close evidence drawer")} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="evidence-drawer-title">
        <header className={styles.drawerHeader}>
          <div><p className={styles.sectionLabel}>{copy("依据", "Evidence")}</p><h2 id="evidence-drawer-title">{copy("我为什么注意到这一点", "Why I noticed this")}</h2></div>
          <button ref={closeRef} type="button" className={styles.iconButton} onClick={onClose} aria-label={copy("关闭依据", "Close evidence")}>×</button>
        </header>
        <div className={styles.drawerBody}>
          <EvidenceGroup title={copy("支持它的线索", "Signals that support it")} items={supporting} />
          <EvidenceGroup title={copy("让它变复杂的线索", "Signals that complicate it")} items={counter} counter />
          <section className={styles.hypothesisNote}>
            <p className={styles.sectionLabel}>{copy("当前假设", "My current hypothesis")}</p>
            <p>{sampleText(hypothesis)}</p>
            <small>{copy("这是一种解释，不是事实。你可以编辑或拒绝它。", "This is an interpretation, not a fact. You can edit or reject it.")}</small>
          </section>
        </div>
      </aside>
    </div>
  );
}

function EvidenceGroup({ title, items, counter = false }: { title: string; items: ReturnType<typeof useLivingModel>["state"]["evidence"]; counter?: boolean }) {
  const copy = useCopy();
  const sampleText = useSampleText();
  return (
    <section className={styles.evidenceGroup}>
      <div className={styles.evidenceGroupTitle}><h3>{title}</h3><span>{items.length}</span></div>
      {items.length ? items.map((item) => <article className={`${styles.evidenceItem} ${counter ? styles.counterEvidence : ""}`} key={item.id}>
        <span>{sampleText(item.context)}</span>
        <p>{sampleText(item.excerpt)}</p>
        <small>{copy(item.sourceType === "reflection" ? "反思" : item.sourceType === "observation" ? "观察" : "事实", item.sourceType.replaceAll("_", " "))}</small>
      </article>) : <p className={styles.emptyLine}>{copy("这里还没有保留的线索。", "No retained signal is available here yet.")}</p>}
    </section>
  );
}
