/**
 * 最小 OpenClaw API 客户端：命令行输入 → Gateway → 输出，支持每轮切换模型
 * 鉴权通过环境变量 OPENCLAW_GATEWAY_TOKEN 或 GATEWAY_TOKEN 配置
 * 用法: pnpm openclaw-api "消息" [model=provider/model] [user=sessionId]
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? process.env.GATEWAY_TOKEN;

function parseArgs(): {
  message: string;
  model: string | undefined;
  user: string;
  agentId: string;
  stream: boolean;
  chatPath: string;
} {
  const raw = process.argv.slice(2);
  let model: string | undefined;
  let user = "apiclient";
  let agentId = "main";
  let stream = false;
  const msgParts: string[] = [];
  for (const a of raw) {
    if (a.startsWith("model=")) {
      model = a.slice(6).trim();
    } else if (a.startsWith("user=")) {
      user = a.slice(5).trim() || "apiclient";
    } else if (a.startsWith("agent=")) {
      agentId = a.slice(6).trim() || "main";
    } else if (a === "stream=true" || a === "stream") {
      stream = true;
    } else {
      msgParts.push(a);
    }
  }
  const chatPath =
    process.env.OPENCLAW_CHAT_PATH ||
    (process.env.OPENCLAW_USE_WEB === "1" || process.env.OPENCLAW_USE_WEB === "true" ? "/api/chat" : undefined) ||
    "/v1/chat/completions";
  return {
    message: msgParts.join(" ").trim(),
    model: model || undefined,
    user,
    agentId,
    stream,
    chatPath,
  };
}

function httpToWsUrl(httpUrl: string): string {
  const u = httpUrl.replace(/\/$/, "");
  return u.startsWith("https") ? u.replace(/^https/, "wss") : u.replace(/^http/, "ws");
}

function buildSessionKey(agentId: string, user: string): string {
  return `agent:${agentId}:openai-user:${user}`;
}

async function patchSessionModel(opts: {
  wsUrl: string;
  token: string;
  sessionKey: string;
  model: string;
}): Promise<void> {
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const rootDir = join(__dirname, "../..");
  const res = spawnSync(
    process.execPath,
    ["scripts/run-node.mjs", "gateway", "call", "sessions.patch", "--token", opts.token, "--url", opts.wsUrl, "--params", JSON.stringify({ key: opts.sessionKey, model: opts.model })],
    { cwd: rootDir, env: { ...process.env, OPENCLAW_GATEWAY_TOKEN: opts.token }, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" },
  );
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim();
    throw new Error(`sessions.patch 失败: ${err || res.status}`);
  }
}

async function getStdinMessage(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8").trim();
}

function buildAuthHeaders(chatPath: string, token: string): Record<string, string> {
  if (chatPath === "/api/chat") {
    return { "X-Api-Key": token };
  }
  return { Authorization: `Bearer ${token}` };
}

async function handleStreamResponse(res: Response): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const chunk = line.slice(6);
        if (chunk === "[DONE]") return;
        try {
          const obj = JSON.parse(chunk) as { choices?: Array<{ delta?: { content?: string } }> };
          const content = obj.choices?.[0]?.delta?.content;
          if (content) process.stdout.write(content);
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}

async function main(): Promise<void> {
  const { message: msgFromArgs, model, user, agentId, stream, chatPath } = parseArgs();
  const message = msgFromArgs || (await getStdinMessage());
  if (!message) {
    console.error("用法: openclaw-api <消息> [model=provider/model] [user=id] [stream]");
    console.error("       echo <消息> | openclaw-api");
    console.error("鉴权: 请设置 OPENCLAW_GATEWAY_TOKEN 或 GATEWAY_TOKEN 环境变量");
    process.exit(1);
  }

  if (!TOKEN) {
    console.error("请设置 OPENCLAW_GATEWAY_TOKEN 或 GATEWAY_TOKEN 环境变量");
    process.exit(1);
  }

  const baseUrl = GATEWAY_URL.replace(/\/$/, "");

  if (model && chatPath === "/v1/chat/completions") {
    const sessionKey = buildSessionKey(agentId, user);
    const wsUrl = httpToWsUrl(baseUrl);
    try {
      await patchSessionModel({ wsUrl, token: TOKEN, sessionKey, model });
    } catch (err) {
      console.error(String(err));
      process.exit(1);
    }
  }

  const url = `${baseUrl}${chatPath}`;
  const body: Record<string, unknown> = {
    model: "openclaw",
    messages: [{ role: "user", content: message }],
    ...(stream ? { stream: true } : {}),
  };
  if (user) body.user = user;

  const headers: Record<string, string> = {
    ...buildAuthHeaders(chatPath, TOKEN),
    "Content-Type": "application/json",
    ...(agentId !== "main" ? { "x-openclaw-agent-id": agentId } : {}),
  };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  if (!res.ok) {
    const text = await res.text();
    console.error(`OpenClaw 请求失败 (${res.status}): ${text}`);
    if (res.status === 405 || res.status === 404) {
      console.error("\n提示: 请先在配置中启用 Chat Completions 端点:");
      console.error("  openclaw config set gateway.http.endpoints.chatCompletions.enabled true");
    }
    process.exit(1);
  }

  if (stream && res.headers.get("content-type")?.includes("text/event-stream")) {
    await handleStreamResponse(res);
    return;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    console.error(data.error.message);
    process.exit(1);
  }

  const content = data.choices?.[0]?.message?.content ?? "（无回复）";
  console.log(content);
}

main();
