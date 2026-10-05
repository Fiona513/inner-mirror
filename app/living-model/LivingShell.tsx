"use client";

import { usePathname } from "next/navigation";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useLivingModel } from "./LivingModelProvider";
import type { MessageKey } from "../locale/messages";

const primary: { href: string; labelKey: MessageKey }[] = [
  { href: "/now", labelKey: "nav.now" },
  { href: "/mirror", labelKey: "nav.mirror" },
  { href: "/journey", labelKey: "nav.journey" },
];

const secondary: { href: string; labelKey: MessageKey; emphasis: boolean }[] = [
  { href: "/reflection", labelKey: "nav.newReflection", emphasis: true },
  { href: "/search", labelKey: "nav.search", emphasis: false },
];

const settingsNav: { href: string; labelKey: MessageKey }[] = [
  { href: "/settings/privacy", labelKey: "nav.memoryPrivacy" },
  { href: "/settings/communication", labelKey: "nav.settings" },
];

export function LivingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useLivingModel();
  const { locale, setLocale, t } = useLocale();
  const copy = useCopy();
  const active = (href: string) => pathname === href || (href === "/reflection" && pathname.startsWith("/reflection/"));
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">{t("nav.skipToContent")}</a>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label={t("nav.primary")}>
          <a href="/now" className={styles.wordmark} aria-label={copy("内在镜像首页", "Inner Mirror home")}>
            <span className={styles.mark} aria-hidden="true" />
            <span>INNER MIRROR</span>
          </a>
          <nav className={styles.navGroup}>
            {primary.map((item) => <a key={item.href} href={item.href} className={`${styles.navLink} ${active(item.href) ? styles.navActive : ""}`}>{t(item.labelKey)}</a>)}
          </nav>
          <div className={styles.navDivider} />
          <nav className={`${styles.navGroup} ${styles.navSecondary}`}>
            {secondary.map((item) => <a key={item.href} href={item.href} className={`${styles.navLink} ${item.emphasis ? styles.newReflection : ""} ${active(item.href) ? styles.navActive : ""}`}>{(item.emphasis ? (locale === "zh-CN" ? "＋ " : "+ ") : "")}{t(item.labelKey)}</a>)}
          </nav>
          <div className={styles.navDivider} />
          <nav className={`${styles.navGroup} ${styles.navSecondary}`}>
            {settingsNav.map((item) => <a key={item.href} href={item.href} className={`${styles.navLink} ${active(item.href) ? styles.navActive : ""}`}>{t(item.labelKey)}</a>)}
          </nav>
          <div className={`${styles.localeSwitch} ${styles.shellLocale}`} role="group" aria-label={t("locale.label")}>
            <button type="button" className={`${styles.localeButton} ${locale === "zh-CN" ? styles.localeButtonActive : ""}`} aria-pressed={locale === "zh-CN"} onClick={() => setLocale("zh-CN")}>中文</button>
            <button type="button" className={`${styles.localeButton} ${locale === "en" ? styles.localeButtonActive : ""}`} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
          </div>
          <div className={styles.sidebarMeta}>
            <strong>{state.sampleDataLoaded ? t("shell.samplePerson") : state.mode === "demo" ? t("shell.demoMode") : state.agentRuntimeStatus === "connected" ? t("shell.realApiConnected") : t("shell.demoFallback")}</strong>
            <span>{state.sampleDataLoaded ? t("shell.sampleHistory") : state.memoryPaused ? t("shell.memoryPaused") : t("shell.memoryOn")}</span>
          </div>
        </aside>
        <main id="main-content" className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, support }: { eyebrow: string; title: string; support?: string }) {
  const { state } = useLivingModel();
  const copy = useCopy();
  const runtimeLabel = state.mode === "demo" ? copy("演示 · 本地", "Demo · local") : state.agentRuntimeStatus === "connected" ? copy("真实 API · 已连接", "Real API · connected") : copy("演示回退", "Demo fallback");
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        {support ? <p>{support}</p> : null}
      </div>
      <div className={styles.modeBadge}><span className={styles.modeDot} />{state.sampleDataLoaded ? copy("示例人物 · 示例历史", "Sample person · Example history") : runtimeLabel}</div>
    </header>
  );
}
