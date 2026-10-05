"use client";

import { useState } from "react";
import styles from "./LivingModel.module.css";
import { useLocale } from "../locale/locale";
import { useLivingModel } from "./LivingModelProvider";
import { LIVING_MODEL_STORAGE_KEY, livingModelReducer } from "./store";
import type { MessageKey } from "../locale/messages";

const reasonOptions: { id: string; labelKey: MessageKey }[] = [
  { id: "understand-myself", labelKey: "onboarding.screen2.reasons.understand" },
  { id: "navigate-change", labelKey: "onboarding.screen2.reasons.change" },
  { id: "recurring-patterns", labelKey: "onboarding.screen2.reasons.patterns" },
  { id: "clear-decisions", labelKey: "onboarding.screen2.reasons.decisions" },
  { id: "curious", labelKey: "onboarding.screen2.reasons.curious" },
];

const mechanismSteps: { num: string; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { num: "01", titleKey: "onboarding.screen1.steps.express.title", bodyKey: "onboarding.screen1.steps.express.body" },
  { num: "02", titleKey: "onboarding.screen1.steps.notice.title", bodyKey: "onboarding.screen1.steps.notice.body" },
  { num: "03", titleKey: "onboarding.screen1.steps.decide.title", bodyKey: "onboarding.screen1.steps.decide.body" },
  { num: "04", titleKey: "onboarding.screen1.steps.change.title", bodyKey: "onboarding.screen1.steps.change.body" },
];

export default function OnboardingFlow() {
  const { state, dispatch } = useLivingModel();
  const { locale, setLocale, t } = useLocale();
  const isZh = locale === "zh-CN";
  const [screen, setScreen] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [tone, setTone] = useState(state.preferences.tone);
  const [depth, setDepth] = useState(state.preferences.depth);
  const [practical, setPractical] = useState(state.preferences.practicalSuggestions);

  function finish(demoChoice: "empty" | "sample") {
    const action = { type: "COMPLETE_ONBOARDING", reasons: selected, preferences: { ...state.preferences, tone, depth, practicalSuggestions: practical }, demoChoice } as const;
    window.localStorage.setItem(LIVING_MODEL_STORAGE_KEY, JSON.stringify(livingModelReducer(state, action)));
    dispatch(action);
    window.location.assign("/now");
  }

  return (
    <main className={`${styles.app} ${styles.onboarding}`} data-locale={locale}>
      <a className={styles.skipLink} href="#onboarding-content">{t("nav.skipToContent")}</a>
      <header className={styles.onboardingHeader}><span className={styles.mark} aria-hidden="true" /><span>INNER MIRROR</span>
        <div className={styles.onboardingHeaderRight}>
          <small>{String(screen + 1).padStart(2, "0")} / 05</small>
          <div className={styles.localeSwitch} role="group" aria-label={t("locale.label")}>
            <button type="button" className={`${styles.localeButton} ${isZh ? styles.localeButtonActive : ""}`} aria-pressed={isZh} onClick={() => setLocale("zh-CN")}>中文</button>
            <button type="button" className={`${styles.localeButton} ${!isZh ? styles.localeButtonActive : ""}`} aria-pressed={!isZh} onClick={() => setLocale("en")}>EN</button>
          </div>
        </div>
      </header>
      <div id="onboarding-content" className={styles.onboardingBody}>
        <section className={styles.onboardingCopy}>
          {screen === 0 ? <>
            <p className={styles.eyebrow}>{t("onboarding.screen0.eyebrow")}</p>
            <h1>{t("onboarding.screen0.title")}</h1>
            <p>{t("onboarding.screen0.body")}</p>
            <button className={styles.primaryButton} type="button" onClick={() => setScreen(1)}>{t("onboarding.screen0.begin")}</button>
          </> : null}
          {screen === 1 ? <>
            <p className={styles.eyebrow}>{t("onboarding.screen1.eyebrow")}</p>
            <h1>{t("onboarding.screen1.title")}</h1>
            <ol className={styles.mechanismList}>{mechanismSteps.map((step) => (
              <li key={step.num}><span>{step.num}</span><strong>{t(step.titleKey)}</strong><small>{t(step.bodyKey)}</small></li>
            ))}</ol>
            <button className={styles.primaryButton} type="button" onClick={() => setScreen(2)}>{t("onboarding.screen1.continue")}</button>
          </> : null}
          {screen === 2 ? <>
            <p className={styles.eyebrow}>{t("onboarding.screen2.eyebrow")}</p>
            <h1>{t("onboarding.screen2.title")}</h1>
            <p>{t("onboarding.screen2.body")}</p>
            <div className={styles.reasonList}>{reasonOptions.map((option) => {
              const isSelected = selected.includes(option.id);
              return <button type="button" key={option.id} aria-pressed={isSelected} onClick={() => setSelected((current) => isSelected ? current.filter((item) => item !== option.id) : [...current, option.id])} className={`${styles.reasonButton} ${isSelected ? styles.reasonSelected : ""}`}>{t(option.labelKey)}<span>{isSelected ? t("onboarding.screen2.selected") : (isZh ? "＋" : "+")}</span></button>;
            })}</div>
            <div className={styles.buttonRow}><button className={styles.primaryButton} type="button" onClick={() => setScreen(3)}>{t("onboarding.screen2.continue")}</button><button className={styles.quietButton} type="button" onClick={() => { setSelected([]); setScreen(3); }}>{t("onboarding.screen2.skip")}</button></div>
          </> : null}
          {screen === 3 ? <>
            <p className={styles.eyebrow}>{t("onboarding.screen3.eyebrow")}</p>
            <h1>{t("onboarding.screen3.title")}</h1>
            <div className={styles.preferenceStack}>
              <label><span><strong>{t("onboarding.screen3.gentle")}</strong><strong>{t("onboarding.screen3.direct")}</strong></span><input aria-label={t("onboarding.screen3.toneAria")} type="range" min="0" max="100" value={tone} onChange={(event) => setTone(Number(event.target.value))} /></label>
              <label><span><strong>{t("onboarding.screen3.brief")}</strong><strong>{t("onboarding.screen3.deep")}</strong></span><input aria-label={t("onboarding.screen3.depthAria")} type="range" min="0" max="100" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></label>
              <label className={styles.toggleRow}><span><strong>{t("onboarding.screen3.practicalTitle")}</strong><small>{t("onboarding.screen3.practicalBody")}</small></span><input aria-label={t("onboarding.screen3.practicalAria")} type="checkbox" checked={practical} onChange={(event) => setPractical(event.target.checked)} /></label>
            </div>
            <button className={styles.primaryButton} type="button" onClick={() => setScreen(4)}>{t("onboarding.screen3.continue")}</button>
          </> : null}
          {screen === 4 ? <>
            <p className={styles.eyebrow}>{t("onboarding.screen4.eyebrow")}</p>
            <h1>{t("onboarding.screen4.title")}</h1>
            <p>{t("onboarding.screen4.body")}</p>
            <div className={styles.startChoiceList}>
              <button type="button" onClick={() => finish("empty")}><strong>{t("onboarding.screen4.emptyTitle")}</strong><span>{t("onboarding.screen4.emptyBody")}</span></button>
              <button type="button" onClick={() => finish("sample")}><strong>{t("onboarding.screen4.sampleTitle")}</strong><span>{t("onboarding.screen4.sampleBody")}</span></button>
            </div>
          </> : null}
        </section>
        <div className={styles.onboardingVisual} aria-label={t("onboarding.visual.aria")}>
          <span className={styles.mirrorArcOne} /><span className={styles.mirrorArcTwo} /><span className={styles.mirrorArcThree} />
          <div className={styles.mirrorVoid}><span>{t("onboarding.visual.mirrorVoidTop")}<br />{t("onboarding.visual.mirrorVoidBottom")}</span></div>
        </div>
      </div>
    </main>
  );
}
