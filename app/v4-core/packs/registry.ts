import type { ScenarioPack } from "./types.ts";
import { importantChoicePack } from "./important-choice.ts";
import { uncertainOutcomePack } from "./uncertain-outcome.ts";

export const scenarioPacks = [uncertainOutcomePack, importantChoicePack] as const satisfies readonly ScenarioPack[];

export type ScenarioPackId = (typeof scenarioPacks)[number]["id"];

export function getScenarioPack(packId: string): ScenarioPack {
  const pack = scenarioPacks.find((item) => item.id === packId);
  if (!pack) throw new Error(`Unknown scenario pack: ${packId}`);
  return pack;
}
