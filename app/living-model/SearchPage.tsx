"use client";

import { useMemo, useState } from "react";
import { useLocale } from "../locale/locale";
import { getLivingCopy, labelEnum } from "../locale/living";
import Link from "next/link";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";
import { searchLivingModel } from "./search";
import { localizeDemoText } from "./demo-data";

export default function SearchPage() {
  const { state } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLivingModel(state, query, (value) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value), [locale, query, state]);
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy.search.eyebrow} title={copy.search.title} support={copy.search.support} /><label className={styles.searchBox}><span>{copy.search.label}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search.placeholder} /></label>{query ? <section className={styles.searchResults}>{results.length ? results.map((item) => <Link prefetch={false} href={item.href} key={`${item.type}-${item.id}`}><span>{labelEnum(locale, item.type)}</span><p>{d(item.title)}</p><i>→</i></Link>) : <div className={styles.noResults}><h2>{copy.search.noneTitle}</h2><p>{copy.search.noneBody}</p></div>}</section> : <section className={styles.searchPrompt}><p>{copy.search.prompt}</p></section>}</div></LivingShell>;
}
