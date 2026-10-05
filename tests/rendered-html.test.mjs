import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server renders the Phase 1 promise and real first action", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Inner Mirror｜内在镜像<\/title>/i);
  assert.match(html, /让选择/);
  assert.match(html, /开始探索/);
  assert.match(html, /不是心理测试/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Self \d+%/i);
});

test("the visible Phase 1 flow has restart, legal boundaries, skip navigation and no Phase 2 interaction", async () => {
  const source = await readFile(new URL("../app/InnerMirrorPhase1.tsx", import.meta.url), "utf8");
  assert.match(source, /跳到主要内容/);
  assert.match(source, /隐私说明/);
  assert.match(source, /使用边界/);
  assert.match(source, /重新开始/);
  assert.match(source, /LocalStorage/);
  assert.doesNotMatch(source, /MirrorArrangement|拼镜子|Window 新玩法|没有寄出的信/);
});

test("the bounded action space and Current Inner Map model are present", async () => {
  const source = await readFile(new URL("../app/phase1-model.ts", import.meta.url), "utf8");
  for (const action of ["ASK", "VERIFY", "BRANCH", "REWEIGHT", "REVEAL_MAP", "UPDATE_MAP", "REFLECT", "STOP"]) assert.match(source, new RegExp(`\\b${action}\\b`));
  for (const status of ["clear", "emerging", "uncertain", "contradictory"]) assert.match(source, new RegExp(`\\b${status}\\b`));
  assert.doesNotMatch(source, /SELECT_SPATIAL_INTERACTION|UPDATE_SPACE|COMPARE_HISTORY/);
});

test("server-side optional model call remains allowlisted, timed and replaceable by deterministic fallback", async () => {
  const [route, client] = await Promise.all([readFile(new URL("../app/api/agent/route.ts", import.meta.url), "utf8"), readFile(new URL("../app/InnerMirrorPhase1.tsx", import.meta.url), "utf8")]);
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /INNER_MIRROR_AGENT_MODEL/);
  assert.match(route, /AbortController/);
  assert.match(route, /json_schema/);
  assert.match(route, /candidateActions/);
  assert.match(route, /structured_fallback/);
  assert.match(client, /window\.setTimeout/);
  assert.doesNotMatch(client, /process\.env\.OPENAI_API_KEY|Bearer \$\{/);
});

test("the branded 404 route remains available", async () => {
  const response = await render("/a-place-that-does-not-exist");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /回到 Inner Mirror/);
});

test("visible copy avoids diagnosis, certainty percentages and anthropomorphic claims", async () => {
  const source = await readFile(new URL("../app/InnerMirrorPhase1.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /我懂你|我明白了|我越来越了解你|谢谢你告诉我|我感受到|你就是|你的内心其实/);
  assert.doesNotMatch(source, /supportScore.*%|confidence.*%/i);
});

test("the isolated V4 Core route renders the opening prelude before the selector without changing root", async () => {
  const response = await render("/v4-core");
  assert.equal(response.status, 200);
  const html = await response.text();
  const source = await readFile(new URL("../app/v4-core/V4CoreJourney.tsx", import.meta.url), "utf8");
  assert.match(html, /先不用急着回答/);
  assert.match(html, /慢慢开始/);
  assert.doesNotMatch(html, /这一次，哪一种更接近你正在经历的/);
  assert.match(source, /这一次，哪一种更接近你正在经历的/);
  assert.match(source, /这两种都不贴近/);
  assert.doesNotMatch(source, /最近，什么一直占着你的注意力|一个重要事情/);
  assert.doesNotMatch(html, /Question\s*1|问题\s*1\s*\/\s*9/i);
});
