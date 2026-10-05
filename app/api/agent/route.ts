import { NextResponse } from "next/server";

type AgentRequest = {
  primaryHypothesisKey?: string;
  alternativeHypothesisKey?: string;
  hasContradiction?: boolean;
  candidateActions: string[];
  candidateQuestionIds: string[];
};

const ALLOWED_ACTIONS = new Set(["ASK", "VERIFY", "BRANCH", "REWEIGHT", "REVEAL_MAP", "UPDATE_MAP", "REFLECT", "STOP"]);
const ALLOWED_QUESTION_IDS = new Set(["result_scenario", "relationship_scenario", "rest_tradeoff", "direction_tradeoff", "evaluation_tradeoff", "certainty_scenario", "recognition_verify"]);

function validRequest(value: unknown): value is AgentRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as AgentRequest;
  return Array.isArray(candidate.candidateQuestionIds)
    && candidate.candidateQuestionIds.length > 0
    && candidate.candidateQuestionIds.length <= 8
    && candidate.candidateQuestionIds.every((item) => typeof item === "string" && ALLOWED_QUESTION_IDS.has(item))
    && Array.isArray(candidate.candidateActions)
    && candidate.candidateActions.length > 0
    && candidate.candidateActions.length <= 8
    && candidate.candidateActions.every((item) => typeof item === "string" && ALLOWED_ACTIONS.has(item));
}

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) if (typeof content.text === "string") return content.text;
  }
  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.INNER_MIRROR_AGENT_MODEL;
  if (!apiKey || !model) return NextResponse.json({ mode: "structured_fallback" });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!validRequest(payload)) return NextResponse.json({ error: "invalid_context" }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4200);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "You are a bounded experience orchestrator for a non-diagnostic self-discovery product. Select one approved action and, when applicable, one approved question id that best distinguishes the primary and alternative hypotheses or resolves a contradiction. Never add a diagnosis, confidence score, psychological label, or new question. Return JSON only.",
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "inner_mirror_agent_decision",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: { type: "string", enum: payload.candidateActions },
                selectedQuestionId: { type: "string", enum: payload.candidateQuestionIds },
                transitionCopy: { type: "string", maxLength: 110 },
                reasonCode: { type: "string", enum: ["discriminate_primary_alternative", "resolve_contradiction", "information_gain", "reveal_supported_map"] },
              },
              required: ["action", "selectedQuestionId", "transitionCopy", "reasonCode"],
            },
          },
        },
      }),
    });
    if (!response.ok) return NextResponse.json({ mode: "structured_fallback" });
    const output = extractOutputText(await response.json());
    if (!output) return NextResponse.json({ mode: "structured_fallback" });
    const decision = JSON.parse(output) as { action?: unknown; selectedQuestionId?: unknown; transitionCopy?: unknown; reasonCode?: unknown };
    if (typeof decision.action !== "string" || !payload.candidateActions.includes(decision.action) || typeof decision.selectedQuestionId !== "string" || !payload.candidateQuestionIds.includes(decision.selectedQuestionId) || typeof decision.transitionCopy !== "string" || decision.transitionCopy.length > 110 || typeof decision.reasonCode !== "string") {
      return NextResponse.json({ mode: "structured_fallback" });
    }
    return NextResponse.json({ mode: "llm_assisted", decision });
  } catch {
    return NextResponse.json({ mode: "structured_fallback" });
  } finally {
    clearTimeout(timeout);
  }
}
