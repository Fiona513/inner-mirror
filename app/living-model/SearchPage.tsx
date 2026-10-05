"use client";

import { useState } from "react";
import Link from "next/link";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useCopy } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";
import { searchLivingModel } from "./search";

export default function SearchPage() {
  const { state } = useLivingModel();
  const copy = useCopy();
  const sampleText = useSampleText();
  const [query, setQuery] = useState("");
  const results = searchLivingModel(state, query, sampleText);
  return <LivingShell><div className={styles.page}><PageHeader eyebrow={copy("搜索", "Search")} title={copy("查找保留的内容", "Find retained context")} support={copy("搜索标题、理解、情境边界、方向、修订、事实、观察与保留的反思。", "Search titles, understandings, context boundaries, directions, revisions, facts, observations, and retained reflections.")} /><label className={styles.searchBox}><span>{copy("搜索你的镜像", "Search your mirror")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("试试“学校”“边界”或“决定”", "Try “validation”, “school”, or “boundary”")} /></label>{query ? <section className={styles.searchResults}>{results.length ? results.map((item) => <Link prefetch={false} href={item.href} key={`${item.type}-${item.id}`}><span>{sampleText(item.type)}</span><p>{item.title}</p><i>→</i></Link>) : <div className={styles.noResults}><h2>{copy("没有找到匹配的保留内容。", "No retained context matches this search.")}</h2><p>{copy("遗忘、归档和拒绝的内容不会作为活跃结果返回。", "Forgotten, archived, and rejected material is not returned as an active result.")}</p></div>}</section> : <section className={styles.searchPrompt}><p>{copy("搜索只查找已有内容，不会根据关键词推断新模式。", "Search is intentionally simple. It does not infer new patterns from your query.")}</p></section>}</div></LivingShell>;
}
