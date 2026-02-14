// Package openclaw 封装对 OpenClaw Gateway 的 HTTP 调用
package openclaw

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/openclaw/minipro-backend/internal/types"
)

// Client OpenClaw Gateway 客户端
type Client struct {
	BaseURL string
	Token  string
	Client *http.Client
}

// NewClient 创建客户端
func NewClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		Client:  &http.Client{},
	}
}

// OpenResponsesRequest OpenClaw /v1/responses 请求体
type OpenResponsesRequest struct {
	Model  string        `json:"model"`
	Input  interface{}   `json:"input"`
	User   string        `json:"user,omitempty"`
	Stream bool          `json:"stream,omitempty"`
}

// OpenResponsesResponse OpenClaw /v1/responses 响应
type OpenResponsesResponse struct {
	ID      string        `json:"id"`
	Status  string        `json:"status"`
	Output  []OutputItem  `json:"output"`
	Usage   *Usage        `json:"usage,omitempty"`
	Error   *APIError     `json:"error,omitempty"`
}

// OutputItem 输出项
type OutputItem struct {
	Type    string        `json:"type"`
	ID      string        `json:"id,omitempty"`
	Role    string        `json:"role,omitempty"`
	Content []ContentPart `json:"content,omitempty"`
}

// ContentPart 内容片段
type ContentPart struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

// Usage token 统计
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// APIError 错误
type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type,omitempty"`
}

// ChatCompletionsRequest OpenAI 兼容请求
type ChatCompletionsRequest struct {
	Model    string              `json:"model"`
	Messages []types.ChatMessage `json:"messages"`
	Stream   bool                `json:"stream,omitempty"`
	User     string              `json:"user,omitempty"`
}

// ChatCompletionsResponse OpenAI 兼容响应
type ChatCompletionsResponse struct {
	Choices []ChatCompletionChoice `json:"choices"`
	Usage   *Usage                 `json:"usage,omitempty"`
	Error   *APIError              `json:"error,omitempty"`
}

// ChatCompletionChoice 单条回复
type ChatCompletionChoice struct {
	Message types.ChatMessage `json:"message"`
}

// Chat 调用 OpenClaw 对话接口
// 有附件时走 /v1/responses，无附件时走 /v1/chat/completions
func (c *Client) Chat(req *types.ChatRequest) (*types.ChatResponse, error) {
	if len(req.Attachments) > 0 {
		return c.chatViaResponses(req)
	}
	return c.chatViaCompletions(req)
}

func (c *Client) chatViaCompletions(req *types.ChatRequest) (*types.ChatResponse, error) {
	body := ChatCompletionsRequest{
		Model:    req.Model,
		Messages: req.Messages,
		Stream:   false,
		User:     req.User,
	}
	b, _ := json.Marshal(body)
	resp, err := c.do("POST", "/v1/chat/completions", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var out ChatCompletionsResponse
	return c.decodeChatCompletionsResponse(resp, &out)
}

func (c *Client) decodeChatCompletionsResponse(resp *http.Response, out *ChatCompletionsResponse) (*types.ChatResponse, error) {
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if resp.StatusCode >= 400 {
		msg := "OpenClaw 请求失败"
		if out.Error != nil && out.Error.Message != "" {
			msg = out.Error.Message
		}
		errType := ""
		if out.Error != nil {
			errType = out.Error.Type
		}
		return &types.ChatResponse{
			Error: &types.APIError{Message: msg, Type: errType},
		}, nil
	}
	if out.Error != nil {
		return &types.ChatResponse{
			Error: &types.APIError{Message: out.Error.Message, Type: out.Error.Type},
		}, nil
	}
	choices := make([]types.ChatChoice, len(out.Choices))
	for i, ch := range out.Choices {
		choices[i] = types.ChatChoice{Message: ch.Message}
	}
	usage := types.Usage{}
	if out.Usage != nil {
		usage.InputTokens = out.Usage.InputTokens
		usage.OutputTokens = out.Usage.OutputTokens
		usage.TotalTokens = out.Usage.TotalTokens
	}
	return &types.ChatResponse{
		Choices: choices,
		Usage:   &usage,
	}, nil
}

func (c *Client) chatViaResponses(req *types.ChatRequest) (*types.ChatResponse, error) {
	input := buildOpenResponsesInput(req)
	body := OpenResponsesRequest{
		Model:  req.Model,
		Input:  input,
		User:   req.User,
		Stream: false,
	}
	b, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	resp, err := c.do("POST", "/v1/responses", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out OpenResponsesResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if out.Error != nil {
		return &types.ChatResponse{
			Error: &types.APIError{Message: out.Error.Message, Type: out.Error.Type},
		}, nil
	}
	text := extractTextFromOutput(out.Output)
	usage := types.Usage{}
	if out.Usage != nil {
		usage.InputTokens = out.Usage.InputTokens
		usage.OutputTokens = out.Usage.OutputTokens
		usage.TotalTokens = out.Usage.TotalTokens
	}
	return &types.ChatResponse{
		Choices: []types.ChatChoice{{
			Message: types.ChatMessage{Role: "assistant", Content: text},
		}},
		Usage: &usage,
	}, nil
}

func buildOpenResponsesInput(req *types.ChatRequest) []map[string]interface{} {
	var input []map[string]interface{}
	for _, msg := range req.Messages {
		input = append(input, map[string]interface{}{
			"type":    "message",
			"role":    msg.Role,
			"content": msg.Content,
		})
	}
	for _, att := range req.Attachments {
		switch att.Type {
		case "image":
			mediaType := att.MimeType
			if mediaType == "" {
				mediaType = "image/jpeg"
			}
			input = append(input, map[string]interface{}{
				"type": "input_image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": mediaType,
					"data":       att.Data,
				},
			})
		case "file":
			mediaType := att.MimeType
			if mediaType == "" {
				mediaType = "application/octet-stream"
			}
			input = append(input, map[string]interface{}{
				"type": "input_file",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": mediaType,
					"data":       att.Data,
					"filename":   att.Name,
				},
			})
		}
	}
	return input
}

func extractTextFromOutput(output []OutputItem) string {
	var text string
	for _, item := range output {
		if item.Type == "message" && item.Content != nil {
			for _, p := range item.Content {
				if p.Type == "output_text" && p.Text != "" {
					text += p.Text
				}
			}
		}
	}
	return text
}

func (c *Client) do(method, path string, body io.Reader) (*http.Response, error) {
	url := c.BaseURL + path
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Token)
	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}
