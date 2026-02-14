// minipro-backend 微信小程序对接 OpenClaw 的自建后端
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/openclaw/minipro-backend/internal/handler"
	"github.com/openclaw/minipro-backend/internal/middleware"
	"github.com/openclaw/minipro-backend/internal/openclaw"
)

func main() {
	gatewayURL := os.Getenv("OPENCLAW_GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "http://127.0.0.1:18789"
	}
	token := os.Getenv("OPENCLAW_GATEWAY_TOKEN")
	if token == "" {
		log.Print("警告: OPENCLAW_GATEWAY_TOKEN 未设置，请求可能被 OpenClaw 拒绝")
	}
	apiKey := os.Getenv("OPENCLAW_API_KEY")
	port := os.Getenv("PORT")
	if port == "" {
		port = "12626"
	}

	client := openclaw.NewClient(gatewayURL, token)
	chatHandler := handler.NewChatHandler(client)

	mux := http.NewServeMux()
	mux.Handle("/api/chat", chatHandler)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	stack := middleware.CORS(mux)
	if apiKey != "" {
		stack = middleware.APIKeyAuth(apiKey)(stack)
	}

	addr := ":" + port
	log.Printf("minipro-backend 启动于 http://0.0.0.0%s", addr)
	log.Printf("OpenClaw Gateway: %s", gatewayURL)
	if err := http.ListenAndServe(addr, stack); err != nil {
		log.Fatal(err)
	}
}
