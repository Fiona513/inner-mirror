import { NextResponse } from "next/server";
import { validateAgentDecision } from "../../living-model/agent";
import type { AgentDecision } from "../../living-model/agent";
import type { AgentComponentType, AgentState } from "../../living-model/types";

interface LivingReflectionRequest {
  input: string;
  locale?: "zh-CN" | "en";
  context: "decision" | "feeling" | "repeating" | "explore";
  preferences: { tone: number; depth: number; practicalSuggestions: boolean };
  plan: AgentDecision;
}

const STATES = new Set<AgentState>(["LISTEN", "CLARIFY", "STRUCTURE", "EXPLORE", "RESOLVE", "REFLECT", "COMPLETE"]);
const COMPONENTS = new Set<AgentComponentType>(["reflection_text", "editable_summary", "contextual_tension", "perspective_split", "unsaid", "candidate_understanding"]);

function validPlan(value: unknown): value is AgentDecision {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<AgentDecision>;
  return Boolean(validateAgentDecision(value))
    && STATES.has(plan.current_state as AgentState)
    && STATES.has(plan.next_state as AgentState)
    && typeof plan.response === "string"
    && Boolean(plan.ui && COMPONENTS.has(plan.ui.type))
    && Boolean(plan.safety && ["normal", "high_risk"].includes(plan.safety.state))
    && Boolean(plan.trace && Array.isArray(plan.trace.retrievedSourceIds)
      && Array.isArray(plan.trace.excludedRejectedIds)
      && Array.isArray(plan.trace.excludedArchivedIds));
}

function validRequest(value: unknown): value is LivingReflectionRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LivingReflectionRequest>;
  return typeof candidate.input === "string"
    && candidate.input.trim().length > 0
    && candidate.input.length <= 4000
    && (candidate.locale === undefined || candidate.locale === "zh-CN" || candidate.locale === "en")
    && ["decision", "feeling", "repeating", "explore"].includes(candidate.context ?? "")
    && typeof candidate.preferences?.tone === "number"
    && typeof candidate.preferences.depth === "number"
    && typeof candidate.preferences.practicalSuggestions === "boolean"
    && validPlan(candidate.plan);
}

function outputText(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) for (const content of item.content ?? []) if (typeof content.text === "string") return content.text;
  return null;
}

function fallback(plan: AgentDecision, reason: string) {
  return NextResponse.json({
    mode: "structured_fallback",
    reason,
    structured: { ...plan, trace: { ...plan.trace, schemaValidationResult: "fallback" as const } },
  });
}

export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY && (process.env.INNER_MIRROR_LIVING_MODEL ?? process.env.INNER_MIRROR_AGENT_MODEL));
  return NextResponse.json({
    status: configured ? "connected" : "falling_back",
    mode: configured ? "real" : "structured_fallback",
    reason: configured ? null : "not_configured",
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ mode: "structured_fallback", reason: "invalid_json" }, { status: 400 }); }
  if (!validRequest(payload)) return NextResponse.json({ mode: "structured_fallback", reason: "invalid_agent_plan" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.INNER_MIRROR_LIVING_MODEL ?? process.env.INNER_MIRROR_AGENT_MODEL;
  if (!apiKey || !model) return fallback(payload.plan, "not_configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: `You may only rephrase the response copy for one current reflection. Write the response in ${payload.locale === "zh-CN" ? "natural Simplified Chinese" : "English"}. The deterministic plan already owns state, component selection, retrieval, candidate eligibility, exclusions, and persistence. Do not change those decisions. Do not diagnose, profile, recommend a life decision, reveal chain-of-thought, or output HTML. Return only the approved JSON schema.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              input: payload.input,
              context: payload.context,
              current_state: payload.plan.current_state,
              next_state: payload.plan.next_state,
              selected_component: payload.plan.ui.type,
              persistence_action: payload.plan.trace.persistenceAction,
              supporting_source_ids: payload.plan.trace.retrievedSourceIds,
              preferences: payload.preferences,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "inner_mirror_agent_copy",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                response: { type: "string", maxLength: 360 },
                safety: { type: "object", additionalProperties: false, properties: { state: { type: "string", enum: ["normal", "high_risk"] } }, required: ["state"] },
              },
              required: ["response", "safety"],
            },
          },
        },
      }),
    });
    if (!response.ok) return fallback(payload.plan, "upstream_error");
    const text = outputText(await response.json());
    if (!text) return fallback(payload.plan, "empty_output");
    const copy = JSON.parse(text) as { response?: unknown; safety?: { state?: unknown } };
    if (typeof copy.response !== "string" || !["normal", "high_risk"].includes(String(copy.safety?.state))) return fallback(payload.plan, "schema_rejected");
    return NextResponse.json({
      mode: "real",
      structured: {
        ...payload.plan,
        response: copy.response,
        safety: { state: copy.safety?.state },
        trace: { ...payload.plan.trace, schemaValidationResult: "passed" },
      },
    });
  } catch {
    return fallback(payload.plan, "request_failed");
  } finally {
    clearTimeout(timeout);
  }
}
