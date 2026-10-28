"use client";

import { usePathname } from "next/navigation";
import styles from "./LivingModel.module.css";
import { useLocale } from "../locale/locale";
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
  const { locale, t } = useLocale();
  const active = (href: string) => pathname === href || (href === "/reflection" && pathname.startsWith("/reflection/"));
  const runtimeLabel = state.mode === "demo" ? t("shell.demoMode") : state.agentRuntimeStatus === "connected" ? t("shell.realApiConnected") : t("shell.demoFallback");
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">{t("nav.skipToContent")}</a>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label={t("nav.primary")}>
          <a href="/now" className={styles.wordmark} aria-label={locale === "zh-CN" ? "内在镜像首页" : "Inner Mirror home"}>
            <span className={styles.mark} aria-hidden="true" />
            <span>{locale === "zh-CN" ? t("brand.name") : t("brand.wordmark")}</span>
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
          <div className={styles.sidebarMeta}>
            <strong>{state.sampleDataLoaded ? t("shell.samplePerson") : runtimeLabel}</strong>
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
  const { locale, t } = useLocale();
  const runtimeLabel = state.mode === "demo"
    ? (locale === "zh-CN" ? "演示 · 本地" : "Demo · local")
    : state.agentRuntimeStatus === "connected"
      ? t("shell.realApiConnected")
      : t("shell.demoFallback");
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        {support ? <p>{support}</p> : null}
      </div>
      <div className={styles.modeBadge}><span className={styles.modeDot} />{state.sampleDataLoaded ? `${t("shell.samplePerson")} · ${t("shell.sampleHistory")}` : runtimeLabel}</div>
    </header>
  );
}
