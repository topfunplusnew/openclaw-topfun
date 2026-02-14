---
summary: "通过 HTTP API 将 OpenClaw 集成到小程序或自建应用"
read_when:
  - 使用小程序或外部应用调用 OpenClaw
  - 需要 HTTP API 对接方案分析
title: "API 集成（小程序场景）"
---

# OpenClaw API 集成分析（小程序场景）

本文档分析如何通过 HTTP API 方式将 OpenClaw 集成到外部应用（如微信小程序、自建 App 后端等），实现对话、Agent 执行、工具调用等能力。

---

## 一、OpenClaw 提供的 API 能力概览

OpenClaw Gateway 在同一端口上多路复用 WebSocket 与 HTTP，对外提供以下 HTTP 端点：

| 端点 | 方法 | 用途 | 默认状态 |
|------|------|------|----------|
| `/v1/chat/completions` | POST | OpenAI 兼容对话接口 | 默认**关闭**，需配置启用 |
| `/v1/responses` | POST | OpenResponses 对话/Agent 接口 | 默认**关闭**，需配置启用 |
| `/tools/invoke` | POST | 直接调用单个工具 | **始终启用** |
| `/hooks/wake` | POST | 触发 main 会话心跳 | 需 `hooks.enabled` |
| `/hooks/agent` | POST | 触发隔离 Agent 运行并可投递到指定渠道 | 需 `hooks.enabled` |

所有 HTTP API 共享 Gateway 认证：Bearer Token 或 Password。

---

## 二、各 API 详细说明

### 2.1 OpenAI Chat Completions（`POST /v1/chat/completions`）

**适用**：希望沿用 OpenAI SDK 或已有 Chat Completions 协议的场景。

- **格式**：与 OpenAI Chat Completions 兼容
- **能力**：多轮对话、Streaming (SSE)
- **会话**：`user` 字段可控制会话复用
- **文档**：[OpenAI Chat Completions](https://docs.openclaw.ai/gateway/openai-http-api)

**启用**：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

**示例**（非流式）：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

---

### 2.2 OpenResponses API（`POST /v1/responses`）

**适用**：需要图片、文件、工具调用、更丰富 Agent 能力的场景。

- **格式**：OpenResponses 规范，支持 item 化输入
- **能力**：图片输入、文件输入、客户端工具调用、Streaming
- **文档**：[OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api)

**启用**：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: true },
      },
    },
  },
}
```

**示例**（简单文本）：

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

**图片输入示例**：

```json
{
  "model": "openclaw",
  "input": [
    { "type": "message", "role": "user", "content": "描述这张图片" },
    {
      "type": "input_image",
      "source": { "type": "url", "url": "https://example.com/image.png" }
    }
  ]
}
```

---

### 2.3 Tools Invoke（`POST /tools/invoke`）

**适用**：只调用单个工具，不启动完整 Agent turn。

- **始终启用**，受 Gateway 认证和工具策略控制
- **文档**：[Tools Invoke API](https://docs.openclaw.ai/gateway/tools-invoke-http-api)

**示例**：

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

---

### 2.4 Webhooks（`POST /hooks/agent`、`POST /hooks/wake`）

**适用**：事件驱动、外部系统触发、自动化场景；可将回复投递到消息渠道。

- 需配置 `hooks.enabled` 和 `hooks.token`
- **文档**：[Webhooks](https://docs.openclaw.ai/automation/webhook)

**示例**（触发 Agent 并投递到指定渠道）：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer HOOKS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": " summarise inbox",
    "name": "Email",
    "agentId": "main",
    "sessionKey": "hook:email:msg-123",
    "wakeMode": "now",
    "deliver": true,
    "channel": "telegram",
    "to": "chat-id-here"
  }'
```

**注意**：Webhooks 使用独立的 `hooks.token`，不要与 `gateway.auth.token` 混用。

---

## 三、小程序 / 外部应用的典型架构

### 3.1 约束说明

- 小程序（微信、支付宝等）无法直接访问非白名单域名，且通常不支持直接连非 HTTPS/443 服务
- OpenClaw Gateway 默认监听 HTTP（如 `127.0.0.1:18789`），且默认仅本机可访问
- **推荐做法**：小程序不直连 OpenClaw，而是通过**自建后端**间接调用

### 3.2 推荐架构：自建后端代理

```
┌─────────────────┐      HTTPS       ┌──────────────────┐      HTTP/WS      ┌─────────────────┐
│   小程序前端     │ ──────────────► │   自建后端服务    │ ───────────────► │ OpenClaw        │
│  (微信/自建App)  │                  │  (Node/Python等)  │                  │ Gateway         │
└─────────────────┘                  └──────────────────┘                  └─────────────────┘
                                            │
                                            │ 职责：
                                            │ - 小程序登录/鉴权
                                            │ - 将请求转发到 OpenClaw API
                                            │ - 保管 gateway.auth.token
                                            │ - 限流、日志、审计
```

**流程简述**：

1. 小程序用户登录后，后端为其生成/验证 session，不暴露 OpenClaw 凭证
2. 用户发起对话 → 小程序调用自建后端 HTTPS 接口
3. 自建后端用 `gateway.auth.token` 调用 `POST /v1/chat/completions` 或 `POST /v1/responses`
4. 将 OpenClaw 的 JSON 响应（或 SSE 流式数据）整理后返回给小程序

**自建后端示例（Node.js 伪代码）**：

```javascript
// 代理到 OpenClaw Chat Completions
app.post('/api/chat', authMiddleware, async (req, res) => {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN;
  const body = { model: 'openclaw', messages: req.body.messages };
  const r = await fetch('http://127.0.0.1:18789/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  res.json(data);
});
```

---

### 3.3 备选：Gateway 直接对外暴露（需 HTTPS）

若希望客户端直接访问 OpenClaw 而不经过自建代理，需要：

1. **HTTPS**：小程序 request 合法域名必须是 HTTPS
2. **Gateway 对外可达**：通过 Tailscale Funnel、Nginx/Caddy 反向代理等

**Tailscale Funnel 示例**（公网 HTTPS）：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" },
  },
}
```

**Nginx 反向代理示例**：

```
# 将 https://api.your-domain.com/openclaw 代理到内网 Gateway
location /openclaw/ {
  proxy_pass http://127.0.0.1:18789/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

**注意**：`gateway.controlUi.allowedOrigins` 仅影响 WebSocket 的 origin 校验，HTTP API 无 CORS 白名单（由反向代理或应用层处理）。若需跨域，应在反向代理或自建后端添加 CORS 头。

---

## 四、认证方式

| 配置 | 说明 |
|------|------|
| `gateway.auth.mode: "token"` | 使用 `Authorization: Bearer <token>`，token 来自 `gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN` |
| `gateway.auth.mode: "password"` | 使用密码，来自 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD` |

**安全建议**：

- Token/密码不要写在小程序或前端代码中
- 通过自建后端保管并代为调用 OpenClaw
- Webhooks 使用独立的 `hooks.token`，与 Gateway token 分离

---

## 五、会话与 Agent 选择

### 5.1 选择 Agent

- 在请求体中：`model: "openclaw:<agentId>"` 或 `model: "agent:<agentId>"`（如 `openclaw:main`、`openclaw:beta`）
- 或通过请求头：`x-openclaw-agent-id: <agentId>`

### 5.2 会话复用（多轮对话）

- **Chat Completions**：在请求中传入 `user` 字符串，Gateway 会据此派生稳定的 sessionKey，实现多轮上下文保持
- **OpenResponses**：同样支持 `user` 字段
- **Webhooks**：通过 `sessionKey` 显式指定（如 `hook:email:msg-123`）

---

## 六、可复用的功能对照

| 功能 | 推荐 API | 备注 |
|------|----------|------|
| 简单对话 | `/v1/chat/completions` 或 `/v1/responses` | 两者皆可，后者能力更丰富 |
| 流式输出 | 同上，设置 `stream: true` | 小程序需支持 SSE 或由后端聚合后推送 |
| 图片理解 | `/v1/responses` | 使用 `input_image` item |
| 上传文件 | `/v1/responses` | 使用 `input_file` item |
| 工具调用 | `/tools/invoke` | 直接调用单工具；或通过 Responses 的 tools 机制 |
| 触发 Agent 并投递到消息渠道 | `/hooks/agent` | 需配置 `deliver`、`channel`、`to` |

---

## 七、配置检查清单

1. **启用所需端点**：
   - `gateway.http.endpoints.chatCompletions.enabled: true` 或
   - `gateway.http.endpoints.responses.enabled: true`

2. **认证**：
   - `gateway.auth.mode` + `gateway.auth.token` 或 `gateway.auth.password`
   - 非 loopback 绑定时必须配置认证

3. **网络**：
   - 本地开发：Gateway 默认 `127.0.0.1:18789`，自建后端同机访问
   - 生产：通过 Tailscale / 反向代理 / 自建后端 暴露 HTTPS

4. **小程序域名**：
   - 在微信小程序后台配置 request 合法域名为自建后端的 HTTPS 地址

---

## 八、相关文档

- [OpenAI Chat Completions](https://docs.openclaw.ai/gateway/openai-http-api)
- [OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api)
- [Tools Invoke API](https://docs.openclaw.ai/gateway/tools-invoke-http-api)
- [Webhooks](https://docs.openclaw.ai/automation/webhook)
- [Gateway 配置](https://docs.openclaw.ai/gateway/configuration)
- [Tailscale（公网/内网暴露）](https://docs.openclaw.ai/gateway/tailscale)
- [小程序后端对接设计（Go）](/integration/minipro-backend-design)：自建 Go 后端的实现方案
