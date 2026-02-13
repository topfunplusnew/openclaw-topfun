# OpenClaw API 客户端

最小命令行客户端：将输入转发到 OpenClaw Gateway，并输出回复。

## 前置条件

1. OpenClaw Gateway 已启动（`pnpm openclaw gateway`）
2. **必须**启用 Chat Completions 端点（默认关闭）：
   ```bash
   openclaw config set gateway.http.endpoints.chatCompletions.enabled true
   ```
3. 已设置 `OPENCLAW_GATEWAY_TOKEN` 或命令行传入 `token=xxx`

## 用法

```bash
# 从参数传入消息
pnpm openclaw-api "今天天气如何？"

# 命令行传入 token
pnpm openclaw-api "hello" token=xxxx

# 指定模型（每轮可切换）
pnpm openclaw-api "用 GPT 回答" model=openai/gpt-5.2 token=xxxx

# 流式输出
pnpm openclaw-api "hello" stream token=xxxx

# 通过 web 自建后端（OPENCLAW_GATEWAY_URL 指向 web 服务，token 为 X-Api-Key）
OPENCLAW_USE_WEB=1 OPENCLAW_GATEWAY_URL=http://localhost:8080 pnpm openclaw-api "hi" token=your_api_key

# 从 stdin 传入
echo "总结一下 OpenClaw" | pnpm openclaw-api
```

## 环境变量 / 参数

| 来源 | 说明 | 默认 |
|------|------|------|
| `OPENCLAW_GATEWAY_URL` | Gateway 地址 | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | 认证 Token（环境变量） | - |
| `token=xxx` | 认证 Token（命令行参数） | - |
| `model=provider/model` | 指定本轮使用的模型，如 `openai/gpt-5.2`（需在 `agents.defaults.models` 白名单内） | - |
| `user=id` | 会话标识，同 user 多轮共享上下文 | `apiclient` |
| `agent=id` | Agent ID | `main` |
| `stream` / `stream=true` | 流式输出 (SSE) | - |
| `OPENCLAW_CHAT_PATH` | 对话接口路径 | `/v1/chat/completions` |
| `OPENCLAW_USE_WEB` | 设为 `1` 或 `true` 时使用 `/api/chat`（web 自建后端） | - |

**注意**：`model=` 通过 `sessions.patch` 设置会话模型覆盖，仅直连 Gateway 时生效。若配置了 `agents.defaults.models`，指定的模型须在其中。
