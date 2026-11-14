import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const githubToken = Deno.env.get("GITHUB_TOKEN")!;
const repo = Deno.env.get("GITHUB_REPO") || "adilevy1011/reveriel";

function decode(value: string) { return decodeURIComponent(escape(atob(value.replace(/\s/g, "")))); }
function encode(value: string) { return btoa(unescape(encodeURIComponent(value))); }
function escapeHtml(value: string) { return value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!)); }
function applyOperation(content: string, op: any) {
  if (op.file_path === "index.html") {
    const id = op.selector.replace(/^#/, "").split(".")[0];
    const tag = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)([\\s\\S]*?)(</[^>]+>)`, "i");
    return content.replace(tag, (_m, open, _body, close) => `${open}\n         ${escapeHtml(String(op.value))}\n        ${close}`);
  }
  if (op.file_path === "style.css") {
    const selectorParts = op.selector.split(".");
    const selectorToken = selectorParts.shift() || "";
    const selector = selectorToken.startsWith("#") ? selectorToken : `#${selectorToken}`;
    const property = selectorParts.pop() || op.operation_type;
    const rule = new RegExp(`(${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}[^\\{]*\\{)([^\\}]*)(\\})`, "i");
    if (rule.test(content)) return content.replace(rule, (_m, open, body, close) => `${open}${body}\n    ${property}: ${String(op.value)};${close}`);
    return `${content}\n/* Builder draft materialization */\n${selector}{${property}:${String(op.value)};}\n`;
  }
  return content;
}
async function github(path: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.github.com${path}`, { ...options, headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || `GitHub request failed (${response.status})`);
  return body;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401);
  if (!githubToken) return json({ error: "GITHUB_TOKEN is not configured" }, 500);
  const body = await request.json();
  const draftId = String(body.draftId || "");
  if (!draftId) return json({ error: "draftId is required" }, 400);
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: draft, error: draftError } = await admin.from("builder_drafts").select("*").eq("id", draftId).eq("created_by", user.id).single();
  if (draftError || !draft) return json({ error: "Draft not found" }, 404);
  const { data: operations, error: operationError } = await admin.from("builder_draft_operations").select("*").eq("draft_id", draftId).eq("created_by", user.id).order("operation_order");
  if (operationError) return json({ error: operationError.message }, 500);
  try {
    const repoInfo = await github(`/repos/${repo}`);
    const base = repoInfo.default_branch || "main";
    const baseRef = await github(`/repos/${repo}/git/ref/heads/${base}`);
    const branch = String(body.branch || `builder/${draft.name || `draft-${draft.draft_number}`}`).replace(/[^a-zA-Z0-9/_-]/g, "-");
    await github(`/repos/${repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }) });
    const files = new Map<string, any[]>();
    for (const op of operations || []) files.set(op.file_path, [...(files.get(op.file_path) || []), op]);
    for (const [path, ops] of files) {
      const current = await github(`/repos/${repo}/contents/${path}?ref=${base}`);
      let content = decode(current.content);
      for (const op of ops) content = applyOperation(content, op);
      await github(`/repos/${repo}/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `${body.summary || draft.name}: ${path}`, content: encode(content), branch, sha: current.sha }) });
    }
    const pr = await github(`/repos/${repo}/pulls`, { method: "POST", body: JSON.stringify({ title: body.summary || draft.name, head: branch, base, body: `## Design request\n\n${body.notes || "Created in Reveriel Studio Builder."}\n\nMaterialized from ${draft.name || `draft_${draft.draft_number}`}.` }) });
    await admin.from("builder_drafts").update({ status: "requested", name: draft.name }).eq("id", draftId);
    return json({ url: pr.html_url, branch, draftId });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not create PR" }, 500); }
});
