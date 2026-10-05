import type { LivingModelState } from "./types";

export interface LivingSearchResult {
  id: string;
  type: "Reflection" | "Understanding" | "Direction" | "Journey revision" | "Fact" | "Observation";
  title: string;
  href: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKC");
}

function matches(query: string, values: Array<string | undefined>, display: (value: string) => string): boolean {
  return values.some((value) => value && (normalize(value).includes(query) || normalize(display(value)).includes(query)));
}

export function searchLivingModel(state: LivingModelState, input: string, display: (value: string) => string = (value) => value): LivingSearchResult[] {
  const query = normalize(input.trim());
  if (!query) return [];
  const rejectedStatements = new Set(state.rejectedInterpretations.map((item) => item.statement));
  const results: LivingSearchResult[] = [];

  for (const insight of state.insights) {
    if (insight.status === "archived" || rejectedStatements.has(insight.statement) || !insight.userConfirmed) continue;
    if (matches(query, [insight.title, insight.statement, ...insight.appliesWhen, ...insight.doesNotApplyWhen], display)) {
      results.push({ id: insight.id, type: "Understanding", title: `${display(insight.title)} — ${display(insight.statement)}`, href: `/mirror?insight=${insight.id}` });
    }
  }
  for (const direction of state.directions) {
    if (matches(query, [direction.statement], display)) results.push({ id: direction.id, type: "Direction", title: display(direction.statement), href: "/now" });
  }
  for (const item of state.journey) {
    const linked = item.insightId ? state.insights.find((insight) => insight.id === item.insightId) : undefined;
    if (linked?.status === "archived" || (linked && rejectedStatements.has(linked.statement))) continue;
    if (matches(query, [item.title, item.summary, item.previousStatement, item.currentStatement], display)) {
      results.push({ id: item.id, type: "Journey revision", title: `${display(item.title)} — ${item.previousStatement ? `${display(item.previousStatement)} → ` : ""}${display(item.currentStatement ?? item.summary)}`, href: item.insightId ? `/journey?insight=${item.insightId}` : "/journey" });
    }
  }
  for (const fact of state.facts) {
    if (!fact.forgotten && matches(query, [fact.statement, fact.context], display)) results.push({ id: fact.id, type: "Fact", title: display(fact.statement), href: "/settings/privacy" });
  }
  for (const observation of state.observations) {
    if (!observation.forgotten && !observation.disputed && matches(query, [observation.statement], display)) results.push({ id: observation.id, type: "Observation", title: display(observation.statement), href: "/settings/privacy" });
  }
  for (const session of state.sessions) {
    if (session.outcome === "safety" || !matches(query, [session.input, session.structure.reality, session.structure.expectation, session.structure.selfDoubt, session.nextStep], display)) continue;
    results.push({ id: session.id, type: "Reflection", title: display(session.input), href: `/reflection/${session.id}` });
  }
  return results;
}

