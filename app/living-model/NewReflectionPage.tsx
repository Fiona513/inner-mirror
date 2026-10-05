"use client";

import { useState } from "react";
import { createReflectionSession } from "./agent";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useCopy } from "../locale/locale";
import { useLivingModel } from "./LivingModelProvider";
import { LIVING_MODEL_STORAGE_KEY, livingModelReducer } from "./store";
import type { ReflectionContext } from "./types";

export default function NewReflectionPage() {
  const { state, dispatch } = useLivingModel();
  const copy = useCopy();
  const contexts: { id: ReflectionContext; label: string; support: string }[] = [
    { id: "decision", label: copy("一个决定", "A decision"), support: copy("有两个或更多重要方向。", "Two or more directions matter.") },
    { id: "feeling", label: copy("一种感受", "A feeling"), support: copy("某件事发生了，感受仍在。", "Something happened and it is still present.") },
    { id: "repeating", label: copy("反复出现的事", "Something keeps repeating"), support: copy("熟悉的拉扯又出现了。", "A familiar tension has returned.") },
    { id: "explore", label: copy("先随意探索", "Just explore"), support: copy("现在不必给它分类。", "You do not need a category yet.") },
  ];
  const [input, setInput] = useState("");
  const [context, setContext] = useState<ReflectionContext>("explore");
  function start() {
    if (!input.trim()) return;
    const session = createReflectionSession(input, context, state);
    const action = { type: "START_REFLECTION", session } as const;
    window.localStorage.setItem(LIVING_MODEL_STORAGE_KEY, JSON.stringify(livingModelReducer(state, action)));
    dispatch(action);
    window.location.assign(`/reflection/${session.id}`);
  }
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy("新的反思", "New reflection")} title={copy("从真实处境开始", "Start with the real situation")} support={copy("先看清眼前的问题。是否形成自我理解，由你决定。", "The current problem comes first. A self-understanding is optional, and nothing enters your mirror without your decision.")} />
    {state.memoryPaused ? <div className={styles.temporaryBanner}>{copy("临时反思模式 · 这次内容不会更新长期记忆。", "Temporary reflection mode · This session will not update long-term memory.")}</div> : null}
    <section className={styles.newReflectionLayout}><div><label className={styles.largeInputLabel} htmlFor="new-reflection-input">{copy("发生了什么？", "What is happening?")}</label><textarea id="new-reflection-input" className={styles.largeReflectionInput} value={input} onChange={(event) => setInput(event.target.value)} placeholder={copy("用你自己的话说就好。", "Say it in the words you already have.")} /></div><aside><p className={styles.sectionLabel}>{copy("情境，而非分类", "Context, not a category")}</p><div className={styles.contextOptions}>{contexts.map((item) => <button type="button" key={item.id} onClick={() => setContext(item.id)} aria-pressed={context === item.id}><strong>{item.label}</strong><small>{item.support}</small></button>)}</div><button className={styles.primaryButton} type="button" disabled={!input.trim()} onClick={start}>{copy("开始反思 →", "Begin reflection →")}</button></aside></section>
  </div></LivingShell>;
}
