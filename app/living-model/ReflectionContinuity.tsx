"use client";

import { useState } from 'react';
import { useLocale } from '../locale/locale';
import { useLivingModel } from './LivingModelProvider';
import { personalReflections, reflectionChain } from './continuity';
import type { ReflectionSession } from './types';
import styles from './ReflectionContinuity.module.css';

export function PreviousReflectionPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { state } = useLivingModel();
  const { locale } = useLocale();
  const zh = locale === 'zh-CN';
  const options = personalReflections(state);
  return <section className={styles.section}>
    <label htmlFor="previous-reflection">{zh ? '这是之前某件事的延续吗？' : 'Does this continue an earlier reflection?'}</label>
    <p>{zh ? '由你决定是否关联；系统不会因措辞相似就认定是同一种困扰。示例人物的记录不会出现在这里。' : 'You choose the connection. Similar wording does not establish a recurring pattern. Sample-person records are excluded.'}</p>
    <select id="previous-reflection" value={state.memoryPaused ? '' : value} disabled={state.memoryPaused} onChange={event => onChange(event.target.value)}>
      <option value="">{zh ? '独立记录，不关联' : 'Keep this separate'}</option>
      {options.map(item => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleDateString(locale)} · {item.input.slice(0, 100)}</option>)}
    </select>
    {state.memoryPaused ? <p>{zh ? '暂停记忆时不建立连续记录。' : 'Continuity is disabled while memory is paused.'}</p> : !options.length ? <p>{zh ? '保存第一件自己的经历后，下次可以从这里关联。' : 'After your first personal reflection, you can connect a later event here.'}</p> : null}
    {value && !state.memoryPaused ? <PreviousRecord session={options.find(item => item.id === value)} /> : null}
  </section>;
}

function PreviousRecord({ session }: { session?: ReflectionSession }) {
  const { state } = useLivingModel();
  const { locale } = useLocale();
  const zh = locale === 'zh-CN';
  if (!session) return null;
  const insight = state.insights.find(item => item.id === `insight-${session.candidate?.id}` && item.status !== 'archived');
  return <div className={styles.record}>
    <h3>{zh ? '当时发生了什么' : 'What happened then'}</h3><p>{session.input}</p>
    {session.outcome === 'rejected' ? <p>{zh ? '你拒绝了当时的解释。这里不会把它作为已确认的理解展示。' : 'You rejected the interpretation; it is not shown as an accepted understanding.'}</p> : insight ? <><h3>{zh ? '你保留或修订的理解' : 'The understanding you kept or revised'}</h3><p>{insight.statement}</p><p>{zh ? '适用情境：' : 'Applies when: '}{insight.appliesWhen.join(' / ') || (zh ? '尚未限定' : 'Not specified')}</p><p>{zh ? '不适用情境：' : 'Does not apply when: '}{insight.doesNotApplyWhen.join(' / ') || (zh ? '尚未限定' : 'Not specified')}</p></> : <p>{zh ? '这次记录没有已确认的理解；经历本身仍可回看。' : 'No accepted understanding was saved; the event can still be revisited.'}</p>}
    {session.returnNote ? <p>{zh ? '你上次的对照笔记：' : 'Your comparison note: '}{session.returnNote}</p> : null}
    <a href={`/reflection/${encodeURIComponent(session.id)}`}>{zh ? '打开这次记录' : 'Open reflection'}</a>
  </div>;
}

export function ReturnComparison({ session }: { session: ReflectionSession }) {
  const { state, dispatch } = useLivingModel();
  const { locale } = useLocale();
  const zh = locale === 'zh-CN';
  const [note, setNote] = useState(session.returnNote || '');
  const [saved, setSaved] = useState(false);
  const chain = reflectionChain(state, session);
  if (chain.length < 2) return null;
  return <section className={styles.section} aria-labelledby="return-comparison-title">
    <h2 id="return-comparison-title">{zh ? '同一件事，再看一次' : 'Revisit this thread'}</h2>
    <p>{zh ? '这些关联由你建立，不代表系统诊断或确认了某种模式。笔记保存在当前浏览器，不会因填写此处而发送给 AI。' : 'You made these connections; they are not a diagnosis or a confirmed pattern. Notes stay in this browser and are not sent to AI by this form.'}</p>
    <PreviousRecord session={chain[1]} />
    <label htmlFor="return-note">{zh ? '这次哪里相同、哪里不同？以前的解释还适用吗？' : 'What is similar or different? Does the earlier interpretation still fit?'}</label>
    <textarea id="return-note" maxLength={2000} value={note} onChange={event => { setNote(event.target.value); setSaved(false); }} disabled={state.memoryPaused} />
    <button type="button" disabled={state.memoryPaused} onClick={() => { dispatch({ type: 'SET_RETURN_NOTE', sessionId: session.id, note, now: new Date().toISOString() }); setSaved(true); }}>{zh ? '保存我的对照笔记' : 'Save my comparison'}</button>
    <p role="status">{saved ? (zh ? '笔记已更新。' : 'Note updated.') : state.memoryPaused ? (zh ? '暂停记忆期间不保存对照笔记。' : 'Comparison saving is paused with memory.') : ''}</p>
    <details><summary>{zh ? `这条线索的 ${chain.length} 次记录` : `${chain.length} reflections in this thread`}</summary><ol>{chain.map(item => <li key={item.id}><a href={`/reflection/${encodeURIComponent(item.id)}`}>{new Date(item.createdAt).toLocaleDateString(locale)} · {item.input.slice(0, 100)}</a></li>)}</ol></details>
  </section>;
}

export function RecentPersonalReflections() {
  const { state } = useLivingModel();
  const { locale } = useLocale();
  const zh = locale === 'zh-CN';
  const sessions = personalReflections(state).slice(0, 8);
  if (!sessions.length) return null;
  return <section className={styles.section}><h2>{zh ? '回看自己的经历' : 'Revisit your reflections'}</h2><p>{zh ? '不需要接受 AI 解释，也可以保留和回看一件事。' : 'You can revisit an event without accepting an AI interpretation.'}</p><ul>{sessions.map(item => <li key={item.id}><a href={`/reflection/${encodeURIComponent(item.id)}`}>{new Date(item.createdAt).toLocaleDateString(locale)} · {item.input.slice(0, 100)}</a>{item.previousSessionId ? <span> · {zh ? '有前次记录' : 'Connected to an earlier event'}</span> : null}</li>)}</ul></section>;
}
