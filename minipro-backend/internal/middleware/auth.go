// Package middleware HTTP 中间件
package middleware

import (
	"net/http"
	"strings"
)

// APIKeyAuth 校验 X-Api-Key，若配置了 key 则必须匹配
func APIKeyAuth(apiKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if apiKey == "" {
				next.ServeHTTP(w, r)
				return
			}
			key := r.Header.Get("X-Api-Key")
			if key == "" {
				key = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			}
			if key != apiKey {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":{"message":"未授权，请检查 API Key 配置","type":"authentication_error"}}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
