# minipro-backend

微信小程序（clawtop-minipro）对接 OpenClaw 的自建后端，使用 Go 编写。

## 功能

- 接收小程序前端发来的用户消息（含文本、图片、文件附件）
- 转发到 OpenClaw Gateway（`/v1/chat/completions` 或 `/v1/responses`）
- 将完整响应（含文本、usage）返回前端

## 架构

```
小程序 ──HTTPS──► minipro-backend ──HTTP──► OpenClaw Gateway
```

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `OPENCLAW_GATEWAY_URL` | OpenClaw Gateway 地址 | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway 认证 Token | 必填（生产） |
| `OPENCLAW_API_KEY` | 后端 API Key，校验小程序请求 | 可选 |
| `PORT` | 监听端口 | `12626` |

## 构建与运行

```bash
cd minipro-backend
go build -o minipro-backend ./cmd/server
OPENCLAW_GATEWAY_TOKEN=your_token OPENCLAW_API_KEY=your_api_key ./minipro-backend
```

## API

### POST /api/chat

请求体（JSON）：

```json
{
  "model": "openclaw",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "用户消息" }
  ],
  "stream": false,
  "user": "可选会话标识",
  "attachments": [
    { "type": "image", "data": "base64...", "mimeType": "image/jpeg" },
    { "type": "file", "name": "doc.pdf", "data": "base64...", "mimeType": "application/pdf" }
  ]
}
```

响应（JSON）：

```json
{
  "choices": [{ "message": { "role": "assistant", "content": "AI 回复" } }],
  "usage": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 }
}
```

### GET /health

健康检查，返回 200。

## OpenClaw 配置

需在 OpenClaw Gateway 中启用对应端点：

- **纯文本**：`gateway.http.endpoints.chatCompletions.enabled: true`
- **图片/文件**：`gateway.http.endpoints.responses.enabled: true`

详见 [API 集成（小程序）](https://docs.openclaw.ai/integration/api-for-miniprogram)。

## 小程序侧适配

clawtop-minipro 需在 `services/chat.ts` 中：

1. 将 `attachments` 随请求体一并发送到 `/api/chat`
2. 图片消息：使用 `input_image`（base64）而非纯文本描述
3. 文件消息：需读取文件为 base64 后放入 `attachments`（当前 `chooseFile` 仅传路径，后端无法访问）

小程序 `config.ts` 中 `BASE_URL` 指向本后端地址（开发可用 `http://127.0.0.1:12626`，生产需 HTTPS）。

## 相关文档

- [小程序后端对接设计](../../docs/integration/minipro-backend-design.md)
- [API 集成（小程序场景）](https://docs.openclaw.ai/integration/api-for-miniprogram)
