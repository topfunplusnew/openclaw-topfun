// Package handler HTTP 请求处理
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/openclaw/minipro-backend/internal/openclaw"
	"github.com/openclaw/minipro-backend/internal/types"
)

// ChatHandler 处理 /api/chat
type ChatHandler struct {
	Client *openclaw.Client
}

// NewChatHandler 创建聊天处理器
func NewChatHandler(client *openclaw.Client) *ChatHandler {
	return &ChatHandler{Client: client}
}

// ServeHTTP 处理 POST /api/chat
func (h *ChatHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, types.ChatResponse{
			Error: &types.APIError{Message: "Method Not Allowed", Type: "method_not_allowed"},
		})
		return
	}
	var req types.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, types.ChatResponse{
			Error: &types.APIError{Message: "Invalid JSON body", Type: "invalid_request_error"},
		})
		return
	}
	if req.Model == "" {
		req.Model = "openclaw"
	}
	resp, err := h.Client.Chat(&req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, types.ChatResponse{
			Error: &types.APIError{Message: err.Error(), Type: "gateway_error"},
		})
		return
	}
	if resp.Error != nil {
		code := http.StatusBadRequest
		if resp.Error.Type == "invalid_request_error" {
			code = http.StatusBadRequest
		} else if resp.Error.Type == "authentication_error" {
			code = http.StatusUnauthorized
		}
		writeJSON(w, code, resp)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
