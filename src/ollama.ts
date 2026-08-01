export interface OllamaOptions {
  url: string;
  model: string;
}

export async function checkHealth(o: OllamaOptions): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${o.url}/api/tags`);
    if (!res.ok) return { ok: false, message: `Ollama responded ${res.status}` };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const names = (data.models ?? []).map((m) => m.name);
    const found = names.some((n) => n === o.model || n.startsWith(o.model + ":") || n.split(":")[0] === o.model.split(":")[0]);
    return found
      ? { ok: true, message: `Ollama up; model '${o.model}' available.` }
      : { ok: false, message: `Ollama up but model '${o.model}' not found. Installed: ${names.join(", ") || "(none)"}` };
  } catch (err) {
    return { ok: false, message: `Cannot reach Ollama at ${o.url}: ${(err as Error).message}` };
  }
}

/** One JSON-schema-constrained generation. Retries once on invalid JSON. */
export async function generateJson<T>(
  o: OllamaOptions,
  prompt: string,
  schema: object,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${o.url}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: o.model,
        prompt,
        stream: false,
        format: schema,
        options: { temperature: 0.1 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama generate failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { response: string };
    try {
      return JSON.parse(data.response) as T;
    } catch {
      if (attempt === 1) throw new Error(`Model returned invalid JSON: ${data.response.slice(0, 200)}`);
    }
  }
  throw new Error("unreachable");
}
