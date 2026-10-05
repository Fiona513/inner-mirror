"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  DEFAULT_STATE,
  DimensionScore,
  EMPTY_DRAFT,
  LetterDraft,
  View,
  buildProfile,
  calculateScores,
  deriveRoomProfile,
  formatDateTime,
  questions,
} from "./inner-mirror";

const STORAGE_KEY = "inner-mirror:experience:v1";
const recipients = ["伴侣", "家人", "朋友", "过去的自己", "一个未被说出名字的人"];

function Brand({ onHome }: { onHome: () => void }) {
  return (
    <button className="brandbar brand-button" type="button" onClick={onHome} aria-label="返回 Inner Mirror 首页">
      <span className="brand-mark" aria-hidden="true">◐</span>
      <span>INNER MIRROR</span>
      <span className="brand-cn">内在镜像</span>
    </button>
  );
}

function AppHeader({
  onHome,
  onTimeline,
  onReset,
  timelineAvailable,
}: {
  onHome: () => void;
  onTimeline: () => void;
  onReset: () => void;
  timelineAvailable: boolean;
}) {
  return (
    <header className="app-header">
      <Brand onHome={onHome} />
      <nav className="header-actions" aria-label="全局导航">
        {timelineAvailable && (
          <button type="button" onClick={onTimeline}>内心时间轴</button>
        )}
        <button type="button" onClick={onReset}>重新开始</button>
      </nav>
    </header>
  );
}

function Landing({ onStart, hasProgress }: { onStart: () => void; hasProgress: boolean }) {
  return (
    <main className="landing-shell view-enter">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Brand onHome={() => undefined} />
      <section className="landing-copy">
        <p className="eyebrow">A QUIET PLACE FOR YOUR INNER VOICE</p>
        <h1>有些答案，<br />只在安静时浮现。</h1>
        <p className="intro">
          一次关于情感需要的温柔探索。看见那些未被说出的，
          也更靠近真实的自己。
        </p>
        <button className="primary-button" type="button" onClick={onStart}>
          <span>{hasProgress ? "继续探索" : "开始探索"}</span>
          <span aria-hidden="true">↗</span>
        </button>
        <p className="footnote">约 3 分钟 · 你的答案只保留在当前设备</p>
      </section>
      <button className="mirror-orbit" type="button" onClick={onStart} aria-label={hasProgress ? "从圆环继续探索" : "从圆环开始探索"}>
        <div className="orbit-line" />
        <div className="mirror-disc">
          <span>向内看</span>
          <small>LOOK WITHIN</small>
        </div>
      </button>
      <p className="landing-disclaimer">这是一段自我探索体验，不替代专业心理或医疗建议。</p>
    </main>
  );
}

function Explore({
  state,
  setState,
  onHome,
  onTimeline,
  onReset,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onHome: () => void;
  onTimeline: () => void;
  onReset: () => void;
}) {
  const question = questions[state.currentQuestion];
  const selected = state.answers[question.id];
  const progress = ((state.currentQuestion + 1) / questions.length) * 100;

  const choose = (value: number) => {
    setState((current) => ({ ...current, answers: { ...current.answers, [question.id]: value } }));
  };

  const previous = () => {
    if (state.currentQuestion === 0) return onHome();
    setState((current) => ({ ...current, currentQuestion: current.currentQuestion - 1 }));
  };

  const next = () => {
    if (!selected) return;
    if (state.currentQuestion < questions.length - 1) {
      setState((current) => ({ ...current, currentQuestion: current.currentQuestion + 1 }));
      return;
    }
    setState((current) => ({
      ...current,
      completedAt: current.completedAt ?? new Date().toISOString(),
      view: "results",
    }));
  };

  return (
    <main className="explore-shell view-enter">
      <AppHeader
        onHome={onHome}
        onTimeline={onTimeline}
        onReset={onReset}
        timelineAvailable={Boolean(state.completedAt)}
      />
      <div className="explore-progress" aria-label={`探索进度 ${Math.round(progress)}%`}>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-meta">
          <span>{question.number} / {String(questions.length).padStart(2, "0")}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
      <section className="question-stage" key={question.id}>
        <div className="question-copy">
          <p className="question-context">{question.context}</p>
          <h2>{question.prompt}</h2>
          <p className="question-hint">请选择最接近你此刻真实反应的一项。</p>
        </div>
        <div className="option-list" role="radiogroup" aria-label={question.prompt}>
          {question.options.map((option, index) => (
            <button
              className={`answer-option ${selected === option.value ? "is-selected" : ""}`}
              key={option.label}
              type="button"
              role="radio"
              aria-checked={selected === option.value}
              onClick={() => choose(option.value)}
            >
              <span className="option-index">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
              <span className={`option-check ${selected === option.value ? "is-checked" : ""}`} aria-hidden="true"><i /></span>
            </button>
          ))}
        </div>
      </section>
      <footer className="question-navigation">
        <button className="text-button" type="button" onClick={previous}><span aria-hidden="true">←</span> 上一步</button>
        <button className="next-button" type="button" onClick={next} disabled={!selected}>
          {state.currentQuestion === questions.length - 1 ? "生成我的画像" : "下一步"}
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  );
}

function radarPolygon(scores: DimensionScore[]) {
  return scores.map((item, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = 46 * (item.score / 100);
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
  }).join(", ");
}

function RadarChart({ scores }: { scores: DimensionScore[] }) {
  const polygon = radarPolygon(scores);
  return (
    <div className="radar-wrap" aria-label="六维情感画像雷达图">
      <div className="radar-grid" aria-hidden="true">
        <span className="radar-ring ring-one" />
        <span className="radar-ring ring-two" />
        <span className="radar-ring ring-three" />
        <span className="radar-axis axis-one" />
        <span className="radar-axis axis-two" />
        <span className="radar-axis axis-three" />
        <span className="radar-shape" style={{ clipPath: `polygon(${polygon})` }} />
      </div>
      {scores.map((item, index) => (
        <div className={`radar-label radar-label-${index + 1}`} key={item.key}>
          <span>{item.shortLabel}</span><strong>{item.score}</strong>
        </div>
      ))}
      <ul className="sr-only">
        {scores.map((item) => <li key={item.key}>{item.label}：{item.score} 分</li>)}
      </ul>
    </div>
  );
}

function Results({
  state,
  scores,
  onEnterSpace,
  onBack,
  onHome,
  onTimeline,
  onReset,
}: {
  state: AppState;
  scores: DimensionScore[];
  onEnterSpace: () => void;
  onBack: () => void;
  onHome: () => void;
  onTimeline: () => void;
  onReset: () => void;
}) {
  const profile = buildProfile(scores);
  const leadingDimensions = [...scores].sort((a, b) => b.score - a.score).slice(0, 2);

  return (
    <main className="results-shell view-enter">
      <AppHeader onHome={onHome} onTimeline={onTimeline} onReset={onReset} timelineAvailable />
      <section className="results-hero">
        <div className="results-intro">
          <p className="eyebrow">YOUR EMOTIONAL PORTRAIT</p>
          <p className="result-overline">我的情感画像 · {formatDateTime(state.completedAt)}</p>
          <h2>你在关系里，<br />寻找真实，也守护连接。</h2>
          <p className="profile-summary">{profile.summary}</p>
          <div className="leading-tendency">
            <p>你的主要倾向</p>
            <div className="tendency-titles">
              <strong>{leadingDimensions[0].label}</strong>
              <span aria-hidden="true">×</span>
              <strong>{leadingDimensions[1].label}</strong>
            </div>
            <p>
              你更倾向在关系中{leadingDimensions[0].description}，同时也能{leadingDimensions[1].description}。
              相较之下，「{profile.primary.label}」更适合作为下一段自我探索的入口。
            </p>
          </div>
          <div className="keyword-row" aria-label="本次关系模式关键词">
            {profile.keywords.map((keyword, index) => (
              <span key={keyword}><small>0{index + 1}</small>{keyword}</span>
            ))}
          </div>
        </div>
        <RadarChart scores={scores} />
      </section>

      <section className="dimension-section">
        <div className="section-heading">
          <div><p className="eyebrow">SIX INNER DIMENSIONS</p><h3>六个维度，看见你靠近关系的方式</h3></div>
          <p>分数代表当前的稳定与可使用程度，不代表好坏或固定人格。</p>
        </div>
        <div className="dimension-list">
          {scores.map((item) => (
            <article className="dimension-row" key={item.key}>
              <div className="dimension-title"><strong>{item.label}</strong><span>{item.description}</span></div>
              <div className="dimension-meter"><span style={{ width: `${item.score}%` }} /></div>
              <b>{item.score}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="need-section">
        <div className="need-number"><span>此刻最需要关注</span><strong>01</strong></div>
        <div className="need-copy">
          <p>{profile.primary.label}</p>
          <h3>{profile.need.title}</h3>
          <p>{profile.need.body}</p>
          <div className="micro-practice"><span aria-hidden="true">✦</span><div><small>一个可以开始的小练习</small><strong>{profile.need.practice}</strong></div></div>
        </div>
      </section>

      <footer className="results-footer">
        <button className="text-button" type="button" onClick={onBack}>← 回看答案</button>
        <p>这些数字并不是结论，它们会以另一种方式出现在你的内心空间里。</p>
        <button className="primary-button result-cta" type="button" onClick={onEnterSpace}><span>进入内心空间</span><span aria-hidden="true">→</span></button>
      </footer>
    </main>
  );
}

type RoomFocus = "mirror" | "lamp" | "window" | "clutter" | null;
type RoomNotice = "mirror" | "window" | "letter" | "clutter" | null;

const mirrorPieces = [
  { start: [5, 14], target: [37, 19] },
  { start: [78, 13], target: [50, 19] },
  { start: [8, 64], target: [37, 40] },
  { start: [78, 65], target: [50, 40] },
  { start: [17, 39], target: [37, 61] },
  { start: [68, 41], target: [50, 61] },
] as const;

function MirrorPuzzle({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [positions, setPositions] = useState<Array<{ x: number; y: number }>>(() => mirrorPieces.map((piece) => ({ x: piece.start[0], y: piece.start[1] })));
  const [placed, setPlaced] = useState<number[]>([]);
  const [active, setActive] = useState<{ index: number; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const activeRef = useRef<{ index: number; pointerId: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (placed.length !== mirrorPieces.length) return;
    const timer = window.setTimeout(onComplete, 620);
    return () => window.clearTimeout(timer);
  }, [onComplete, placed.length]);

  const place = (index: number) => {
    if (placed.includes(index)) return;
    const target = mirrorPieces[index].target;
    setPositions((current) => current.map((position, pieceIndex) => pieceIndex === index ? { x: target[0], y: target[1] } : position));
    setPlaced((current) => current.includes(index) ? current : [...current, index]);
  };

  const pointerPosition = (event: React.PointerEvent<HTMLButtonElement>) => {
    const board = event.currentTarget.parentElement?.getBoundingClientRect();
    const dragging = activeRef.current;
    if (!board || !dragging) return null;
    return {
      x: Math.max(0, Math.min(86, ((event.clientX - board.left) / board.width) * 100 - dragging.offsetX)),
      y: Math.max(0, Math.min(78, ((event.clientY - board.top) / board.height) * 100 - dragging.offsetY)),
    };
  };

  return (
    <div className="mirror-game-backdrop">
      <section className="mirror-game" role="dialog" aria-modal="true" aria-labelledby="mirror-game-title">
        <header className="mirror-game-heading">
          <div>
            <p className="eyebrow">A SMALL ACT OF REPAIR</p>
            <h3 id="mirror-game-title">把镜中的碎片，慢慢放回原处</h3>
            <p>拖动碎片靠近镜框，它会轻轻吸附。你也可以轻触碎片，让它自行归位。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="暂时离开拼镜互动">×</button>
        </header>
        <div className={`mirror-puzzle-board ${placed.length === mirrorPieces.length ? "is-complete" : ""}`}>
          <div className="puzzle-mirror-guide" aria-hidden="true" />
          {mirrorPieces.map((piece, index) => (
            <span
              className={`puzzle-target puzzle-shape-${index + 1}`}
              key={`target-${index}`}
              style={{ left: `${piece.target[0]}%`, top: `${piece.target[1]}%` }}
              aria-hidden="true"
            />
          ))}
          {mirrorPieces.map((piece, index) => (
            <button
              className={`mirror-piece puzzle-shape-${index + 1} ${placed.includes(index) ? "is-placed" : ""} ${active?.index === index ? "is-dragging" : ""}`}
              key={`piece-${index}`}
              type="button"
              style={{ left: `${positions[index].x}%`, top: `${positions[index].y}%` }}
              aria-label={`镜子碎片 ${index + 1}${placed.includes(index) ? "，已归位" : "，拖动或轻触归位"}`}
              disabled={placed.includes(index)}
              onClick={() => place(index)}
              onPointerDown={(event) => {
                if (placed.includes(index)) return;
                const board = event.currentTarget.parentElement?.getBoundingClientRect();
                const pieceRect = event.currentTarget.getBoundingClientRect();
                if (!board) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                const dragging = {
                  index,
                  pointerId: event.pointerId,
                  offsetX: ((event.clientX - pieceRect.left) / board.width) * 100,
                  offsetY: ((event.clientY - pieceRect.top) / board.height) * 100,
                };
                activeRef.current = dragging;
                setActive(dragging);
              }}
              onPointerMove={(event) => {
                const dragging = activeRef.current;
                if (dragging?.index !== index || dragging.pointerId !== event.pointerId) return;
                const next = pointerPosition(event);
                if (!next) return;
                const target = mirrorPieces[index].target;
                if (Math.hypot(next.x - target[0], next.y - target[1]) < 13) {
                  activeRef.current = null;
                  setActive(null);
                  place(index);
                  return;
                }
                setPositions((current) => current.map((position, pieceIndex) => pieceIndex === index ? next : position));
              }}
              onPointerUp={(event) => {
                if (activeRef.current?.index !== index) return;
                const next = pointerPosition(event);
                const target = mirrorPieces[index].target;
                activeRef.current = null;
                setActive(null);
                if (next && Math.hypot(next.x - target[0], next.y - target[1]) < 13) place(index);
              }}
              onPointerCancel={() => { activeRef.current = null; setActive(null); }}
            ><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></button>
          ))}
          <div className="puzzle-completion" aria-live="polite">
            <span>{placed.length === mirrorPieces.length ? "镜面正在重新变得完整" : `已归位 ${placed.length} / ${mirrorPieces.length}`}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Space({
  state,
  scores,
  justSealed,
  setJustSealed,
  setState,
  onLetter,
  onResults,
  onHome,
  onTimeline,
  onReset,
}: {
  state: AppState;
  scores: DimensionScore[];
  justSealed: boolean;
  setJustSealed: (value: boolean) => void;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onLetter: () => void;
  onResults: () => void;
  onHome: () => void;
  onTimeline: () => void;
  onReset: () => void;
}) {
  const [focus, setFocus] = useState<RoomFocus>(null);
  const [mirrorGameOpen, setMirrorGameOpen] = useState(false);
  const [roomNotice, setRoomNotice] = useState<RoomNotice>(null);
  const profile = buildProfile(scores);
  const roomProfile = deriveRoomProfile(scores);
  const mirrorBroken = roomProfile.mirrorNeedsRepair && !state.mirrorRestored;
  const windowOpen = !roomProfile.windowNeedsOpening || state.windowOpen;
  const letterResolved = !roomProfile.letterNeedsVoice || Boolean(state.letter);
  const clutterSettled = !roomProfile.boundariesNeedSpace || state.clutterSettled;
  const repairedLayers = [!mirrorBroken, windowOpen, letterResolved, clutterSettled].filter(Boolean).length;
  const completedRepairs = [
    roomProfile.mirrorNeedsRepair && state.mirrorRestored,
    roomProfile.windowNeedsOpening && state.windowOpen,
    roomProfile.letterNeedsVoice && Boolean(state.letter),
    roomProfile.boundariesNeedSpace && state.clutterSettled,
  ].filter(Boolean).length;
  const roomLight = Math.min(1.04, roomProfile.initialLightLevel + completedRepairs * 0.065);
  const transformed = completedRepairs > 0;
  const activeNotice: RoomNotice = justSealed ? "letter" : roomNotice;
  const noticeCopy = activeNotice === "mirror"
    ? { title: "镜面重新完整了", body: "完整并不是没有裂痕，而是你开始愿意看见全部的自己。" }
    : activeNotice === "window"
      ? { title: "光从窗外进来了", body: "你为不确定打开了一点缝隙，房间也因此更明亮。" }
      : activeNotice === "clutter"
        ? { title: "这一角重新有了呼吸", body: "留出位置，也是在关系里为自己留出余量。" }
        : activeNotice === "letter"
          ? { title: "这封信已经被好好收下", body: "你写给自己的话，正在改变这个空间。" }
          : null;

  const focusCopy = focus === "mirror"
    ? { title: state.mirrorRestored ? "重新完整的镜面" : "镜中的你", body: state.mirrorRestored ? "当你愿意重新看见自己，裂痕便不再替你定义全部。" : `此刻的你带着「${profile.keywords[0]}」来到这里。镜子不急着给答案，它只提醒你：你已经愿意看见自己。` }
    : focus === "lamp"
      ? { title: state.lampOn || transformed ? "一盏为自己亮起的灯" : "还没有被点亮的角落", body: state.lampOn || transformed ? "光没有消除所有阴影，却让你知道自己可以选择照亮哪里。" : "有些需要并未消失，只是暂时留在暗处。你可以亲手点亮它。" }
      : focus === "window"
        ? { title: windowOpen ? "窗外有风进来" : "安静的窗", body: windowOpen ? "允许外界靠近，也允许新鲜的空气进入。这扇窗记得你的选择。" : "窗外的光一直都在。什么时候打开，由你决定。" }
        : focus === "clutter"
          ? { title: "留出一点位置", body: "空间变得舒展，不是因为所有责任都消失了，而是你也被放回了关系之中。" }
          : null;

  const roomClasses = [
    "space-shell",
    transformed ? "is-transformed" : "",
    mirrorBroken ? "has-broken-mirror" : "has-restored-mirror",
    windowOpen ? "has-open-window" : "has-closed-window",
    roomProfile.letterNeedsVoice && !state.letter ? "has-unfinished-letter" : "has-settled-letter",
    clutterSettled ? "has-settled-clutter" : "has-boundary-clutter",
    "view-enter",
  ].filter(Boolean).join(" ");

  return (
    <main className={roomClasses} style={{ "--room-repair-light": roomLight } as React.CSSProperties}>
      <AppHeader onHome={onHome} onTimeline={onTimeline} onReset={onReset} timelineAvailable />
      <div className="space-heading">
        <div><p className="eyebrow">MY INNER SPACE</p><h2>我的内心空间</h2></div>
        <p>{repairedLayers === 4 ? "这里因为你的回应，变得更完整了一些。" : "画像中的感受，正在以另一种方式出现在房间里。"}</p>
        <button className="quiet-link" type="button" onClick={onResults}>查看情感画像 ↗</button>
      </div>

      {noticeCopy && (
        <div className="completion-banner" role="status">
          <span className="completion-glow" aria-hidden="true">✦</span>
          <div><strong>{noticeCopy.title}</strong><p>{noticeCopy.body}</p></div>
          <button type="button" onClick={() => { setJustSealed(false); setRoomNotice(null); }} aria-label="关闭完成提示">×</button>
        </div>
      )}

      <section className="room-stage" aria-label="可交互的内心房间">
        <div className="room-ceiling" />
        <div className="room-far-shadow" />
        <div className="room-left-wall" />
        <div className="room-back-wall" />
        <div className="room-floor" />
        <div className="room-floor-lines" />
        <div className="room-light" aria-hidden="true" />
        <div className="room-foreground" aria-hidden="true" />

        <button className={`room-object mirror-object ${mirrorBroken ? "is-broken" : "is-restored"}`} type="button" onClick={() => mirrorBroken ? setMirrorGameOpen(true) : setFocus("mirror")} aria-label={mirrorBroken ? "修复破碎的镜子" : "查看已经修复的镜子"}>
          <span className="object-tooltip">镜子 · {mirrorBroken ? "碎片仍在等待" : "重新看见自己"}</span>
          <span className="mirror-frame"><i><span className="mirror-cracks" aria-hidden="true"><b /><b /><b /><b /><b /><b /></span></i></span>
        </button>

        <button
          className={`room-object window-object ${windowOpen ? "is-open" : "is-closed"}`}
          type="button"
          onClick={() => {
            if (!windowOpen) {
              setState((current) => ({ ...current, windowOpen: true }));
              setRoomNotice("window");
            } else {
              setFocus("window");
            }
          }}
          aria-label={windowOpen ? "查看打开的窗户" : "打开关闭的窗户"}
        >
          <span className="object-tooltip">窗 · {windowOpen ? "风正吹进来" : "仍然紧闭"}</span>
          <span className="window-frame"><i /><i /><i /><i /></span>
          <span className="curtain curtain-left" /><span className="curtain curtain-right" />
        </button>

        <button
          className={`room-object lamp-object ${state.lampOn || transformed ? "is-lit" : ""}`}
          type="button"
          onClick={() => {
            setState((current) => ({ ...current, lampOn: !current.lampOn }));
            setFocus("lamp");
          }}
          aria-label="点亮或熄灭台灯"
        >
          <span className="object-tooltip">灯 · {state.lampOn || transformed ? "这里有光" : "亲手点亮"}</span>
          <span className="lamp-wall-glow" />
          <span className="lamp-halo" />
          <span className="lamp-shade" /><span className="lamp-stem" /><span className="lamp-base" />
        </button>

        <button className={`room-object letter-object ${roomProfile.letterNeedsVoice && !state.letter ? "is-needed" : "is-settled"}`} type="button" onClick={onLetter} aria-label="打开没有寄出的信">
          <span className="object-tooltip">信 · {state.letter ? "已经被封存" : "有些话仍在等待"}</span>
          <span className="desk-surface" />
          <span className="desk-edge" />
          <span className="desk-leg" />
          <span className="envelope"><i /></span>
        </button>

        <button
          className={`room-clutter ${clutterSettled ? "is-settled" : "is-unsettled"}`}
          type="button"
          onClick={() => {
            if (!clutterSettled) {
              setState((current) => ({ ...current, clutterSettled: true }));
              setRoomNotice("clutter");
            } else {
              setFocus("clutter");
            }
          }}
          aria-label={clutterSettled ? "查看已经整理好的角落" : "整理略显拥挤的角落"}
        >
          <span className="clutter-book" /><span className="clutter-paper" /><span className="clutter-frame" />
          <span className="object-tooltip">角落 · {clutterSettled ? "留白回来了" : "为自己留一点位置"}</span>
        </button>

        {state.letter && (
          <button className="self-note-frame" type="button" onClick={() => setFocus("mirror")} aria-label="查看写给自己的话">
            <small>TO MYSELF</small>
            <q>{state.letter.selfNote}</q>
          </button>
        )}

        <div className="room-status" aria-live="polite">
          <span className={repairedLayers === 4 ? "status-dot is-awake" : "status-dot"} />
          <div><small>SPACE REPAIR · {repairedLayers} / 4</small><strong>{repairedLayers === 4 ? "空间已经更舒展、明亮" : "你的空间正在发生变化"}</strong></div>
        </div>
      </section>

      {focusCopy && (
        <aside className="object-dialog" role="dialog" aria-label={focusCopy.title}>
          <button type="button" onClick={() => setFocus(null)} aria-label="关闭">×</button>
          <p className="eyebrow">A WHISPER FROM THE ROOM</p>
          <h3>{focusCopy.title}</h3>
          <p>{focusCopy.body}</p>
        </aside>
      )}

      {mirrorGameOpen && (
        <MirrorPuzzle
          onClose={() => setMirrorGameOpen(false)}
          onComplete={() => {
            setState((current) => ({ ...current, mirrorRestored: true }));
            setMirrorGameOpen(false);
            setRoomNotice("mirror");
          }}
        />
      )}

      <div className="space-actions">
        <button className="room-primary-action" type="button" onClick={onLetter}>
          <span className="action-icon" aria-hidden="true">⌁</span>
          <span><small>核心互动</small><strong>{state.letter ? "查看没有寄出的信" : "写一封没有寄出的信"}</strong></span>
          <span aria-hidden="true">→</span>
        </button>
        <button className="room-secondary-action" type="button" onClick={onTimeline}>
          <span><small>INNER TIMELINE</small><strong>我的内心时间轴</strong></span><span aria-hidden="true">↗</span>
        </button>
      </div>
    </main>
  );
}

function LetterView({
  state,
  setState,
  editing,
  setEditing,
  onSeal,
  onBack,
  onHome,
  onTimeline,
  onReset,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  editing: boolean;
  setEditing: (value: boolean) => void;
  onSeal: () => void;
  onBack: () => void;
  onHome: () => void;
  onTimeline: () => void;
  onReset: () => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const draft = state.letterDraft;
  const updateDraft = (patch: Partial<LetterDraft>) => {
    setState((current) => ({ ...current, letterDraft: { ...current.letterDraft, ...patch } }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = [];
    if (!draft.recipient) nextErrors.push("请选择这封信想写给谁");
    if (draft.message.trim().length < 3) nextErrors.push("请留下一段你想说的话");
    if (draft.selfNote.trim().length < 2) nextErrors.push("请留一句话给自己");
    setErrors(nextErrors);
    if (nextErrors.length) return;
    onSeal();
  };

  if (state.letter && !editing) {
    return (
      <main className="letter-shell sealed-letter-shell view-enter">
        <AppHeader onHome={onHome} onTimeline={onTimeline} onReset={onReset} timelineAvailable />
        <section className="sealed-letter">
          <div className="sealed-emblem" aria-hidden="true">◐</div>
          <p className="eyebrow">THE UNSENT LETTER · SEALED</p>
          <h2>这封没有寄出的信，<br />已经被好好收下。</h2>
          <p className="sealed-meta">写给 {state.letter.recipient} · 封存于 {formatDateTime(state.letter.sealedAt)}</p>
          <blockquote>{state.letter.message}</blockquote>
          <div className="sealed-self-note"><small>留给自己的话</small><q>{state.letter.selfNote}</q></div>
          <div className="sealed-actions">
            <button className="text-button" type="button" onClick={() => setEditing(true)}>重新打开编辑</button>
            <button className="primary-button" type="button" onClick={onBack}><span>回到内心空间</span><span aria-hidden="true">→</span></button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="letter-shell view-enter">
      <AppHeader onHome={onHome} onTimeline={onTimeline} onReset={onReset} timelineAvailable />
      <section className="letter-layout">
        <div className="letter-intro">
          <p className="eyebrow">THE UNSENT LETTER</p>
          <p className="letter-count">INNER RITUAL · 01</p>
          <h2>没有寄出的信</h2>
          <p>有些话没有被说出口，并不代表它们不重要。这里没有发送键，只有一个让感受被你自己听见的位置。</p>
          <div className="letter-privacy"><span aria-hidden="true">⌾</span><p><strong>只留在这里</strong><br />文字保存在当前浏览器，不会被发送给任何人。</p></div>
        </div>

        <form className="letter-paper" onSubmit={submit} noValidate>
          <div className="paper-heading"><span>致</span><small>01 / 03</small></div>
          <fieldset className="recipient-field">
            <legend>这封信，你想写给谁？</legend>
            <div className="recipient-options">
              {recipients.map((recipient) => (
                <button
                  key={recipient}
                  className={draft.recipient === recipient ? "is-selected" : ""}
                  type="button"
                  onClick={() => updateDraft({ recipient })}
                >{recipient}</button>
              ))}
            </div>
          </fieldset>

          <label className="writing-field">
            <span><b>想说却没有说出口的话</b><small>02 / 03</small></span>
            <textarea
              value={draft.message}
              onChange={(event) => updateDraft({ message: event.target.value })}
              placeholder="可以从“其实，我一直想告诉你……”开始"
              rows={8}
              maxLength={1200}
            />
            <small>{draft.message.length} / 1200</small>
          </label>

          <label className="writing-field self-writing-field">
            <span><b>再留一句话给自己</b><small>03 / 03</small></span>
            <textarea
              value={draft.selfNote}
              onChange={(event) => updateDraft({ selfNote: event.target.value })}
              placeholder="亲爱的自己，我想让你记得……"
              rows={3}
              maxLength={180}
            />
            <small>{draft.selfNote.length} / 180</small>
          </label>

          {errors.length > 0 && <div className="form-errors" role="alert">{errors.map((error) => <p key={error}>· {error}</p>)}</div>}

          <div className="letter-actions">
            <button className="text-button" type="button" onClick={onBack}>← 暂时离开</button>
            <button className="seal-button" type="submit"><span aria-hidden="true">◐</span>{state.letter ? "重新封存这封信" : "封存这封信"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Timeline({
  state,
  scores,
  onBack,
  onHome,
  onReset,
}: {
  state: AppState;
  scores: DimensionScore[];
  onBack: () => void;
  onHome: () => void;
  onReset: () => void;
}) {
  const profile = buildProfile(scores);
  return (
    <main className="timeline-shell view-enter">
      <AppHeader onHome={onHome} onTimeline={() => undefined} onReset={onReset} timelineAvailable={false} />
      <section className="timeline-intro">
        <p className="eyebrow">MY INNER TIMELINE</p>
        <h2>我的内心时间轴</h2>
        <p>那些曾被你看见、说出与留下的时刻，会在这里成为温柔的坐标。</p>
      </section>
      <section className="timeline-list">
        {state.completedAt && (
          <article className="timeline-entry">
            <div className="timeline-marker"><span>01</span></div>
            <div className="timeline-time"><small>完成情感探索</small><strong>{formatDateTime(state.completedAt)}</strong></div>
            <div className="timeline-content">
              <p>我第一次看见了此刻的情感画像。</p>
              <div className="keyword-row compact">{profile.keywords.map((word) => <span key={word}>{word}</span>)}</div>
              <small>最需要关注 · {profile.primary.label}</small>
            </div>
          </article>
        )}
        {state.letter && (
          <article className="timeline-entry is-light">
            <div className="timeline-marker"><span>02</span></div>
            <div className="timeline-time"><small>封存没有寄出的信</small><strong>{formatDateTime(state.letter.sealedAt)}</strong></div>
            <div className="timeline-content">
              <p>我允许一段没有说出口的话，被自己听见。</p>
              <small className="memory-caption">那天，我留给自己一句话</small>
              <blockquote>{state.letter.selfNote}</blockquote>
              <small>这句话已经回到内心空间，点亮了一处角落。</small>
            </div>
          </article>
        )}
        {!state.completedAt && (
          <div className="timeline-empty"><span aria-hidden="true">○</span><p>时间轴还很安静。<br />完成一次探索后，第一枚坐标会出现在这里。</p></div>
        )}
      </section>
      <footer className="timeline-footer">
        <button className="text-button" type="button" onClick={onBack}>← 返回上一处</button>
        <p>重要数据已保存在当前浏览器中。</p>
      </footer>
    </main>
  );
}

function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <p className="eyebrow">BEGIN AGAIN</p>
        <h2 id="reset-title">重新开始这次探索？</h2>
        <p>当前答案、信件与时间轴都会从这个浏览器中清除。这个动作无法撤回。</p>
        <div><button className="text-button" type="button" onClick={onCancel}>保留现在</button><button className="danger-button" type="button" onClick={onConfirm}>清除并重新开始</button></div>
      </section>
    </div>
  );
}

export default function InnerMirrorApp() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [justSealed, setJustSealed] = useState(false);
  const [editingLetter, setEditingLetter] = useState(false);
  const [previousView, setPreviousView] = useState<View>("space");

  useEffect(() => {
    let restoredState = DEFAULT_STATE;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<AppState>;
        const restored: AppState = {
          ...DEFAULT_STATE,
          ...stored,
          answers: stored.answers ?? {},
          letterDraft: { ...EMPTY_DRAFT, ...(stored.letterDraft ?? {}) },
        };
        if (!restored.completedAt && ["results", "space", "letter", "timeline"].includes(restored.view)) {
          restored.view = Object.keys(restored.answers).length ? "explore" : "home";
        }
        restoredState = restored;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    queueMicrotask(() => {
      setState(restoredState);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const scores = useMemo(() => calculateScores(state.answers), [state.answers]);
  const go = (view: View) => setState((current) => ({ ...current, view }));
  const goHome = () => go("home");
  const goTimeline = () => {
    setPreviousView(state.view);
    go("timeline");
  };
  const start = () => {
    if (state.completedAt) return go("results");
    const firstUnanswered = questions.findIndex((question) => !state.answers[question.id]);
    setState((current) => ({ ...current, currentQuestion: firstUnanswered >= 0 ? firstUnanswered : 0, view: "explore" }));
  };
  const openLetter = () => {
    setEditingLetter(false);
    setState((current) => ({
      ...current,
      letterDraft: current.letter ? {
        recipient: current.letter.recipient,
        message: current.letter.message,
        selfNote: current.letter.selfNote,
      } : current.letterDraft,
      view: "letter",
    }));
  };
  const sealLetter = () => {
    const sealedAt = new Date().toISOString();
    setState((current) => ({ ...current, letter: { ...current.letterDraft, sealedAt }, lampOn: true, view: "space" }));
    setEditingLetter(false);
    setJustSealed(true);
  };
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
    setConfirmReset(false);
    setJustSealed(false);
    setEditingLetter(false);
  };

  const shared = { onHome: goHome, onTimeline: goTimeline, onReset: () => setConfirmReset(true) };

  let content: React.ReactNode;
  switch (state.view) {
    case "explore":
      content = <Explore state={state} setState={setState} {...shared} />;
      break;
    case "results":
      content = <Results state={state} scores={scores} onEnterSpace={() => go("space")} onBack={() => go("explore")} {...shared} />;
      break;
    case "space":
      content = <Space state={state} scores={scores} setState={setState} justSealed={justSealed} setJustSealed={setJustSealed} onLetter={openLetter} onResults={() => go("results")} {...shared} />;
      break;
    case "letter":
      content = <LetterView state={state} setState={setState} editing={editingLetter} setEditing={setEditingLetter} onSeal={sealLetter} onBack={() => go("space")} {...shared} />;
      break;
    case "timeline":
      content = <Timeline state={state} scores={scores} onBack={() => go(previousView === "timeline" ? "space" : previousView)} onHome={goHome} onReset={() => setConfirmReset(true)} />;
      break;
    default:
      content = <Landing onStart={start} hasProgress={Object.keys(state.answers).length > 0} />;
  }

  return (
    <div className={`app-root ${ready ? "is-ready" : ""}`}>
      {content}
      {confirmReset && <ResetDialog onCancel={() => setConfirmReset(false)} onConfirm={reset} />}
    </div>
  );
}
