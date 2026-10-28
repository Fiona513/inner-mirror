import { forwardRef } from "react";
import styles from "./V4CoreExperience.module.css";

export type InnerWorldMode = "quiet" | "signal" | "exploring" | "fragment" | "returning" | "corrected";

interface InnerWorldStageProps {
  mode: InnerWorldMode;
  fragmentCount: number;
  latestObservation?: string;
  evidenceLabel?: string;
}

const modeStatus: Record<InnerWorldMode, string> = {
  quiet: "内在空间现在很安静，还没有记录今天的线索。",
  signal: "内在空间亮起了一块新的线索。",
  exploring: "新的选择正在让这块线索变得更清楚。",
  fragment: "今天的线索已经作为一块碎片留在内在空间里。",
  returning: "上次留下的碎片仍然在这里。",
  corrected: "刚才的理解已经退后，空间为新的线索留出了位置。",
};

export const ROOM_IMAGE_BY_MODE: Record<InnerWorldMode, string> = {
  quiet: "/inner-mirror-room-quiet-v3.jpg",
  signal: "/inner-mirror-room-signal-v3.jpg",
  exploring: "/inner-mirror-room-exploring-v3.jpg",
  fragment: "/inner-mirror-room-fragment-v3.jpg",
  returning: "/inner-mirror-room-returning-v3.jpg",
  corrected: "/inner-mirror-room-corrected-v3.jpg",
};

const InnerWorldStage = forwardRef<HTMLDivElement, InnerWorldStageProps>(function InnerWorldStage(
  { mode, fragmentCount, latestObservation, evidenceLabel },
  ref,
) {
  const visibleMarks = Math.min(5, fragmentCount);
  return (
    <div
      ref={ref}
      className={styles.world}
      data-world-mode={mode}
      tabIndex={-1}
      aria-label="我的内在世界"
    >
      {/* Each state owns a different room; the live region below owns the semantic meaning. */}
      {Object.entries(ROOM_IMAGE_BY_MODE).map(([roomMode, src]) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={roomMode}
          className={styles.worldImage}
          src={src}
          alt=""
          aria-hidden="true"
          data-room={roomMode}
          data-active={roomMode === mode}
        />
      ))}
      <div className={styles.worldVeil} aria-hidden="true" />
      <div className={styles.worldLight} aria-hidden="true" />
      <span className={styles.imageFocus} aria-hidden="true" />

      <div className={styles.memoryRail} aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <i key={index} data-filled={index < visibleMarks} />
        ))}
      </div>

      {evidenceLabel && (
        <p className={styles.worldEvidence} aria-hidden="true">
          <span>今天留下</span>
          {evidenceLabel}
        </p>
      )}
      {latestObservation && mode === "fragment" && (
        <p className={styles.worldFragmentCopy} aria-hidden="true">{latestObservation}</p>
      )}
      <p className={styles.srOnly} aria-live="polite">{modeStatus[mode]}</p>
    </div>
  );
});

export default InnerWorldStage;

