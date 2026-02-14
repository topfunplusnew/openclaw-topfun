// Package types 定义 API 请求与响应结构
package types

// ChatRequest 小程序发来的聊天请求（兼容 OpenAI 格式 + 扩展 attachments）
type ChatRequest struct {
	Model       string              `json:"model"`
	Messages    []ChatMessage        `json:"messages"`
	Stream      bool                 `json:"stream,omitempty"`
	User        string               `json:"user,omitempty"`
	Attachments []Attachment         `json:"attachments,omitempty"`
}

// ChatMessage 单条消息
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Attachment 附件（图片/文件）
type Attachment struct {
	Type     string `json:"type"`
	Data     string `json:"data,omitempty"`
	URL      string `json:"url,omitempty"`
	Name     string `json:"name,omitempty"`
	MimeType string `json:"mimeType,omitempty"`
}

// ChatResponse 返回给前端的响应（兼容 OpenAI choices 格式）
type ChatResponse struct {
	Choices   []ChatChoice `json:"choices"`
	Usage     *Usage       `json:"usage,omitempty"`
	Error     *APIError    `json:"error,omitempty"`
	Attachments []Attachment `json:"attachments,omitempty"`
}

// ChatChoice 单条回复
type ChatChoice struct {
	Message ChatMessage `json:"message"`
}

// Usage token 统计
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// APIError 错误信息
type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type,omitempty"`
}
