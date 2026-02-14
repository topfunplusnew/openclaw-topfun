---
summary: "微信小程序自建后端（Go）对接 OpenClaw 的设计与实现"
read_when:
  - 使用 clawtop-minipro 对接 OpenClaw
  - 需要 Go 语言编写小程序后端代理
title: "小程序后端对接设计"
---

# 微信小程序后端对接 OpenClaw 设计

本文档分析 clawtop-minipro 微信小程序与 OpenClaw 的对接架构，以及使用 Go 语言实现自建后端的方案。

---

## 一、项目概览

### 1.1 OpenClaw

- **类型**：TypeScript/Node 编写的 AI 助手与 Gateway 服务
- **Gateway 端口**：默认 `127.0.0.1:18789`（HTTP + WebSocket 多路复用）
- **主要 API**：
  - `POST /v1/chat/completions`：OpenAI 兼容对话接口
  - `POST /v1/responses`：OpenResponses 接口，支持图片、文件输入
- **认证**：`Authorization: Bearer <token>` 或密码

### 1.2 clawtop-minipro

- **类型**：微信小程序（TypeScript + WXML/SCSS）
- **当前对接**：调用自建后端 `BASE_URL/api/chat`（预期端口 `12626`）
- **请求格式**：OpenAI Chat Completions 兼容（`model`, `messages`, `stream`）
- **鉴权**：`X-Api-Key` 头（可选）
- **附件支持**：
  - 图片：`attachments[].type === 'image'`，含 `data`（base64）、`mimeType`
  - 文件：`attachments[].type === 'file'`，含 `url`（本地路径）、`name`

### 1.3 架构约束

- 小程序无法直连非白名单域名，需 HTTPS
- OpenClaw Gateway 默认本机 HTTP
- **推荐**：小程序 → 自建后端（HTTPS）→ OpenClaw Gateway（HTTP）

---

## 二、接口设计

### 2.1 前端期望

| 场景 | 请求 | 后端需转发到 |
|------|------|--------------|
| 纯文本 | `POST /api/chat`，`messages` | `/v1/chat/completions` 或 `/v1/responses` |
| 图片 | `POST /api/chat`，`messages` + `attachments` 含 base64 图片 | `/v1/responses`（`input_image`） |
| 文件 | `POST /api/chat`，`messages` + `attachments` 含文件 | `/v1/responses`（`input_file`） |

### 2.2 完整信息返回

OpenClaw 的 OpenResponses 输出主要包含：

- **文本**：`output[].content[].text`（`output_text`）
- **usage**：token 统计
- **function_call**：工具调用（如需支持可扩展）

AI 生成图片/文件时，通常以 URL 或 Markdown 链接形式出现在文本中，小程序可解析渲染。

### 2.3 API 协议

**请求** `POST /api/chat`：

```json
{
  "model": "openclaw",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "文本内容" }
  ],
  "stream": false,
  "user": "可选会话标识",
  "attachments": [
    { "type": "image", "data": "base64...", "mimeType": "image/jpeg" },
    { "type": "file", "name": "doc.pdf", "data": "base64...", "mimeType": "application/pdf" }
  ]
}
```

**响应**（非流式）：

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "AI 回复文本"
      }
    }
  ],
  "usage": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 },
  "attachments": []
}
```

扩展字段 `attachments` 预留：若 OpenClaw 返回图片/文件 URL，可放入此处供前端渲染。

---

## 三、Go 后端实现要点

### 3.1 技术选型

- **框架**：标准库 `net/http` 或轻量 `chi`/`gin`
- **HTTP 客户端**：`net/http` + `io` 流式转发（若支持 SSE）
- **配置**：环境变量 `OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_TOKEN`、`API_KEY`

### 3.2 核心逻辑

1. **鉴权**：校验 `X-Api-Key` 或自定义 Header
2. **请求转换**：
   - 无附件 → 直接转 `POST /v1/chat/completions`
   - 有附件 → 转为 OpenResponses `input` 数组（`message` + `input_image`/`input_file`）
3. **响应转换**：从 OpenResponses `output` 提取 `output_text`，组装为 `choices[].message.content`
4. **错误处理**：透传 401/400/500，统一 JSON 错误格式

### 3.3 图片/文件转换示例

```json
// 前端 attachments 转为 OpenResponses input
{
  "model": "openclaw",
  "input": [
    { "type": "message", "role": "user", "content": "用户文本" },
    {
      "type": "input_image",
      "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." }
    }
  ]
}
```

---

## 四、相关文档

- [API 集成（小程序场景）](/integration/api-for-miniprogram)
- [OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api)
- [OpenAI Chat Completions](https://docs.openclaw.ai/gateway/openai-http-api)
