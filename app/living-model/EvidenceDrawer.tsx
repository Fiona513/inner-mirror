"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "../locale/locale";
import { getLivingCopy, labelEnum, localizeSystemText } from "../locale/living";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";
import { localizeDemoText } from "./demo-data";

export function EvidenceDrawer({ evidenceIds, hypothesis, onClose }: { evidenceIds: string[]; hypothesis: string; onClose: () => void }) {
  const { state } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const d = (value: string) => localizeSystemText(state.sampleDataLoaded ? localizeDemoText(value, locale) : value, locale);
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
      <button className={styles.drawerScrim} type="button" onClick={onClose} aria-label={copy.evidence.closeDrawer} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="evidence-drawer-title">
        <header className={styles.drawerHeader}>
          <div><p className={styles.sectionLabel}>{copy.evidence.eyebrow}</p><h2 id="evidence-drawer-title">{copy.evidence.title}</h2></div>
          <button ref={closeRef} type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.evidence.close}>×</button>
        </header>
        <div className={styles.drawerBody}>
          <EvidenceGroup title={copy.evidence.supporting} items={supporting} />
          <EvidenceGroup title={copy.evidence.counter} items={counter} counter />
          <section className={styles.hypothesisNote}>
            <p className={styles.sectionLabel}>{copy.evidence.hypothesis}</p>
            <p>{d(hypothesis)}</p>
            <small>{copy.evidence.note}</small>
          </section>
        </div>
      </aside>
    </div>
  );
}

function EvidenceGroup({ title, items, counter = false }: { title: string; items: ReturnType<typeof useLivingModel>["state"]["evidence"]; counter?: boolean }) {
  const { locale } = useLocale();
  const { state } = useLivingModel();
  const copy = getLivingCopy(locale);
  const d = (value: string) => localizeSystemText(state.sampleDataLoaded ? localizeDemoText(value, locale) : value, locale);
  return (
    <section className={styles.evidenceGroup}>
      <div className={styles.evidenceGroupTitle}><h3>{title}</h3><span>{items.length}</span></div>
      {items.length ? items.map((item) => <article className={`${styles.evidenceItem} ${counter ? styles.counterEvidence : ""}`} key={item.id}>
        <span>{d(item.context)}</span>
        <p>{d(item.excerpt)}</p>
        <small>{labelEnum(locale, item.sourceType)}</small>
      </article>) : <p className={styles.emptyLine}>{copy.evidence.empty}</p>}
    </section>
  );
}
