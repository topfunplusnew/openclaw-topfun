/**
 * 最小 OpenClaw API 客户端：命令行输入 → Gateway → 输出，支持每轮切换模型
 * 用法: pnpm openclaw-api "消息" [token=xxx] [model=provider/model] [user=sessionId]
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";

function parseArgs(): {
  message: string;
  token: string | undefined;
  model: string | undefined;
  user: string;
  agentId: string;
} {
  const raw = process.argv.slice(2);
  let token: string | undefined;
  let model: string | undefined;
  let user = "apiclient";
  let agentId = "main";
  const msgParts: string[] = [];
  for (const a of raw) {
    if (a.startsWith("token=")) {
      token = a.slice(6).trim();
    } else if (a.startsWith("model=")) {
      model = a.slice(6).trim();
    } else if (a.startsWith("user=")) {
      user = a.slice(5).trim() || "apiclient";
    } else if (a.startsWith("agent=")) {
      agentId = a.slice(6).trim() || "main";
    } else {
      msgParts.push(a);
    }
  }
  const message = msgParts.join(" ").trim();
  return {
    message,
    token: token ?? process.env.OPENCLAW_GATEWAY_TOKEN ?? process.env.GATEWAY_TOKEN,
    model: model || undefined,
    user,
    agentId,
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

async function main(): Promise<void> {
  const { message: msgFromArgs, token, model, user, agentId } = parseArgs();
  const message = msgFromArgs || (await getStdinMessage());
  if (!message) {
    console.error("用法: openclaw-api <消息> [token=xxx] [model=provider/model] [user=id]");
    console.error("       echo <消息> | openclaw-api [token=xxx] [model=openai/gpt-5.2]");
    process.exit(1);
  }

  if (!token) {
    console.error("请设置 token=xxx 或 OPENCLAW_GATEWAY_TOKEN 环境变量");
    process.exit(1);
  }

  const baseUrl = GATEWAY_URL.replace(/\/$/, "");

  if (model) {
    const sessionKey = buildSessionKey(agentId, user);
    const wsUrl = httpToWsUrl(baseUrl);
    try {
      await patchSessionModel({ wsUrl, token, sessionKey, model });
    } catch (err) {
      console.error(String(err));
      process.exit(1);
    }
  }

  const url = `${baseUrl}/v1/chat/completions`;
  const body: Record<string, unknown> = {
    model: "openclaw",
    messages: [{ role: "user", content: message }],
  };
  if (user) {
    body.user = user;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(agentId !== "main" ? { "x-openclaw-agent-id": agentId } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`OpenClaw 请求失败 (${res.status}): ${text}`);
    if (res.status === 405 || res.status === 404) {
      console.error("\n提示: 请先在配置中启用 Chat Completions 端点:");
      console.error("  openclaw config set gateway.http.endpoints.chatCompletions.enabled true");
    }
    process.exit(1);
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
