export interface OllamaOptions { url: string; model: string }
export function localEndpoint(o: OllamaOptions): string {
  const u = new URL(o.url);
  if (!["http:", "https:"].includes(u.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
      u.username || u.password || u.search || u.hash || u.pathname !== "/") {
    throw new Error("ArchiveTuna requires an Ollama origin on localhost, 127.0.0.1, or [::1].");
  }
  if (/(?:^|[:-])cloud(?:$|[:-])/i.test(o.model)) throw new Error("Cloud models are not supported. Choose a downloaded local model.");
  return u.origin;
}
const trusted = new Set<string>();
export async function checkHealth(o: OllamaOptions): Promise<{ ok: boolean; message: string }> {
  try {
    const origin = localEndpoint(o);
    const opts = { redirect: "error" as const, signal: AbortSignal.timeout(5000) };
    const res = await fetch(origin + "/api/tags", opts);
    if (!res.ok) throw new Error("Ollama responded " + res.status);
    const data = await res.json() as { models?: Array<{ name: string; remote_model?: string; remote_host?: string }> };
    const model = data.models?.find(m => m.name === o.model || m.name === o.model + ":latest");
    if (!model) throw new Error("Local model '" + o.model + "' not found. Download it with ollama pull or select --model.");
    if (model.remote_model || model.remote_host) throw new Error("Cloud-backed model rejected.");
    const show = await fetch(origin + "/api/show", { ...opts, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: o.model }) });
    if (!show.ok) throw new Error("Cannot inspect model locality: " + show.status);
    const info = await show.json() as { remote_model?: string; remote_host?: string };
    if (info.remote_model || info.remote_host) throw new Error("Cloud-backed model rejected.");
    trusted.add(origin + "|" + o.model);
    return { ok: true, message: "Ollama ready; local model " + o.model + "." };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function generateJson<T>(o: OllamaOptions, prompt: string, schema: object, extra?: { images?: string[] }): Promise<T> {
  const origin = localEndpoint(o);
  if (!trusted.has(origin + "|" + o.model)) {
    const health = await checkHealth(o);
    if (!health.ok) throw new Error(health.message);
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(origin + "/api/generate", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(300000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: o.model, prompt, stream: false, format: schema,
        ...(extra?.images ? { images: extra.images } : {}), keep_alive: "30m", options: { temperature: 0.1 } }),
    });
    if (!res.ok) throw new Error("Ollama generate failed: " + res.status);
    const data = await res.json() as { response: string };
    try { return JSON.parse(data.response) as T; }
    catch { if (attempt === 1) throw new Error("Model returned invalid JSON."); }
  }
  throw new Error("unreachable");
}
