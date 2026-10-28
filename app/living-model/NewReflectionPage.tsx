"use client";

import { useState } from "react";
import { useLocale } from "../locale/locale";
import { getLivingCopy } from "../locale/living";
import { createReflectionSession } from "./agent";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";
import { LIVING_MODEL_STORAGE_KEY, livingModelReducer } from "./store";
import type { ReflectionContext } from "./types";
import { PreviousReflectionPicker } from './ReflectionContinuity';

const contextIds: ReflectionContext[] = ["decision", "feeling", "repeating", "explore"];

export default function NewReflectionPage() {
  const { state, dispatch } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const [input, setInput] = useState("");
  const [previousId, setPreviousId] = useState('');
  const [context, setContext] = useState<ReflectionContext>("explore");
  function start() {
    if (!input.trim()) return;
    const session = createReflectionSession(input, context, state, undefined, undefined, locale);
    session.previousSessionId = state.memoryPaused ? undefined : previousId || undefined;
    const action = { type: "START_REFLECTION", session } as const;
    window.localStorage.setItem(LIVING_MODEL_STORAGE_KEY, JSON.stringify(livingModelReducer(state, action)));
    dispatch(action);
    window.location.assign(`/reflection/${session.id}`);
  }
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy.newReflection.eyebrow} title={copy.newReflection.title} support={copy.newReflection.support} />
    {state.memoryPaused ? <div className={styles.temporaryBanner}>{copy.newReflection.temporary}</div> : null}
    <PreviousReflectionPicker value={previousId} onChange={setPreviousId} />
    <section className={styles.newReflectionLayout}><div><label className={styles.largeInputLabel} htmlFor="new-reflection-input">{copy.newReflection.happening}</label><textarea id="new-reflection-input" className={styles.largeReflectionInput} value={input} onChange={(event) => setInput(event.target.value)} placeholder={copy.newReflection.placeholder} /></div><aside><p className={styles.sectionLabel}>{copy.newReflection.contextLabel}</p><div className={styles.contextOptions}>{contextIds.map((id) => <button type="button" key={id} onClick={() => setContext(id)} aria-pressed={context === id}><strong>{copy.contexts[id][0]}</strong><small>{copy.contexts[id][1]}</small></button>)}</div><button className={styles.primaryButton} type="button" disabled={!input.trim()} onClick={start}>{copy.newReflection.begin}</button></aside></section>
  </div></LivingShell>;
}
