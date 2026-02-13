---
summary: "OpenClaw CLI 命令速查表"
read_when:
  - 需要快速查找 OpenClaw 命令
  - 了解 gateway 及常用子命令
title: "CLI 命令速查表"
---

# OpenClaw CLI 命令速查表

基于项目源码整理的常用命令表格。完整帮助请运行 `openclaw <command> --help`。

---

## 一、Gateway（网关）

Gateway 负责 WebSocket 服务、HTTP API、控制 UI 等核心能力。

### 1.1 运行与控制

| 命令 | 说明 |
|------|------|
| `openclaw gateway` | 前台运行 Gateway（默认端口 18789） |
| `openclaw gateway run` | 同上，显式前台运行 |
| `openclaw gateway status` | 查看服务状态并探测 Gateway |
| `openclaw gateway start` | 启动已安装的 Gateway 服务 |
| `openclaw gateway stop` | 停止 Gateway 服务 |
| `openclaw gateway restart` | 重启 Gateway 服务 |
| `openclaw gateway install` | 安装 Gateway 系统服务（launchd/systemd/schtasks） |
| `openclaw gateway uninstall` | 卸载 Gateway 服务 |

### 1.2 Gateway 常用选项（run / 默认）

| 选项 | 说明 |
|------|------|
| `--port <port>` | 端口（默认 18789） |
| `--bind <mode>` | 绑定模式：loopback、lan、tailnet、auto、custom |
| `--token <token>` | 认证 Token |
| `--auth <mode>` | 认证模式：token、password |
| `--password <password>` | 密码（password 模式） |
| `--tailscale <mode>` | Tailscale：off、serve、funnel |
| `--force` | 启动前释放占用端口的进程 |
| `--dev` | 开发模式（隔离 ~/.openclaw-dev） |
| `--allow-unconfigured` | 允许未配置 gateway.mode=local 时启动 |

### 1.3 Gateway 子命令（探测/调用）

| 命令 | 说明 |
|------|------|
| `openclaw gateway health` | 获取 Gateway 健康状态 |
| `openclaw gateway probe` | 探测可达性、发现、健康、状态摘要 |
| `openclaw gateway discover` | 通过 Bonjour 发现本地/广域 Gateway |
| `openclaw gateway call <method>` | 调用 Gateway RPC 方法 |
| `openclaw gateway usage-cost` | 获取会话用量成本汇总 |

### 1.4 全局选项（适用于 `openclaw` 根命令）

| 选项 | 说明 |
|------|------|
| `--dev` | 开发 Profile（~/.openclaw-dev，端口 19001） |
| `--profile <name>` | 命名 Profile（状态目录 ~/.openclaw-&lt;name&gt;） |
| `--no-color` | 禁用 ANSI 颜色 |
| `-h, --help` | 显示帮助 |
| `-V, --version` | 显示版本 |

---

## 二、状态与健康

| 命令 | 说明 |
|------|------|
| `openclaw status` | 渠道健康与最近会话摘要 |
| `openclaw status --all` | 完整诊断（只读、可粘贴） |
| `openclaw status --deep` | 深度探测渠道（WhatsApp/Telegram/Discord/Slack/Signal） |
| `openclaw status --usage` | 显示模型用量/配额快照 |
| `openclaw health` | 从运行中 Gateway 获取健康信息 |
| `openclaw sessions` | 列出已存储会话 |
| `openclaw sessions --active <分钟>` | 仅显示最近 N 分钟内活跃会话 |

---

## 三、维护与诊断

| 命令 | 说明 |
|------|------|
| `openclaw doctor` | 健康检查与快速修复 |
| `openclaw doctor --fix` | 自动应用建议修复 |
| `openclaw doctor --generate-gateway-token` | 生成并配置 Gateway Token |
| `openclaw dashboard` | 打开控制 UI（带当前 Token） |
| `openclaw dashboard --no-open` | 仅打印 URL，不打开浏览器 |
| `openclaw reset` | 重置本地配置/状态（保留 CLI） |
| `openclaw uninstall` | 卸载 Gateway 服务及本地数据 |
| `openclaw uninstall --all` | 彻底卸载（服务 + 状态 + 工作区 + App） |

---

## 四、配置与初始化

| 命令 | 说明 |
|------|------|
| `openclaw setup` | 初始化 ~/.openclaw/openclaw.json 和 workspace |
| `openclaw onboard` | 交互式向导（Gateway、渠道、Skills） |
| `openclaw configure` | 交互式配置（凭证、设备、Agent 默认值） |
| `openclaw config get <path>` | 读取配置项 |
| `openclaw config set <path> <value>` | 设置配置项 |
| `openclaw config unset <path>` | 删除配置项 |

---

## 五、Agent（智能体）

| 命令 | 说明 |
|------|------|
| `openclaw agent --message "..."` | 执行一轮 Agent |
| `openclaw agent --to +15555550123 --deliver` | 指定会话并投递回复 |
| `openclaw agent --local` | 本地嵌入式运行（不通过 Gateway） |
| `openclaw agents list` | 列出已配置 Agent |
| `openclaw agents add [name]` | 新增 Agent |
| `openclaw agents set-identity` | 更新 Agent 身份（name/theme/emoji/avatar） |
| `openclaw agents delete <id>` | 删除 Agent |

---

## 六、消息（Message）

| 命令 | 说明 |
|------|------|
| `openclaw message send --target <dest> --message "..."` | 发送消息 |
| `openclaw message send --channel telegram --target @xxx` | 指定渠道发送 |
| `openclaw message read` | 读取最近消息 |
| `openclaw message edit` | 编辑消息 |
| `openclaw message delete` | 删除消息 |
| `openclaw message broadcast` | 广播到多个目标 |
| `openclaw message thread create/list/reply` | 线程操作 |

---

## 七、渠道（Channels）

| 命令 | 说明 |
|------|------|
| `openclaw channels login` | 登录/链接渠道（如 WhatsApp Web） |
| `openclaw channels status` | 渠道状态 |
| 更多子命令 | 见 `openclaw channels --help` |

---

## 八、Nodes（节点）

| 命令 | 说明 |
|------|------|
| `openclaw nodes status` | 列出已知节点及连接状态 |
| `openclaw nodes list` | 待配对与已配对节点 |
| `openclaw nodes pairing pending/approve/reject` | 配对管理 |
| `openclaw nodes invoke <cmd>` | 在节点上调用命令 |
| `openclaw nodes camera snap` | 从节点摄像头拍照 |
| `openclaw nodes screen record` | 录制屏幕 |
| `openclaw nodes canvas snapshot` | 捕获画布快照 |

---

## 九、Node（无头节点主机）

| 命令 | 说明 |
|------|------|
| `openclaw node run` | 前台运行无头 Node 主机 |
| `openclaw node status` | 节点主机状态 |
| `openclaw node install` | 安装 Node 服务 |
| `openclaw node uninstall` | 卸载 Node 服务 |
| `openclaw node start/stop/restart` | 启动/停止/重启 Node 服务 |

---

## 十、插件与 Skills

| 命令 | 说明 |
|------|------|
| `openclaw plugins list` | 列出已发现插件 |
| `openclaw plugins enable <id>` | 启用插件 |
| `openclaw plugins disable <id>` | 禁用插件 |
| `openclaw plugins install <spec>` | 安装插件 |
| `openclaw plugins update` | 更新已安装插件 |
| `openclaw skills list` | 列出 Skills |
| `openclaw skills info <id>` | Skill 详情 |
| `openclaw skills check` | 检查 Skill 依赖是否就绪 |

---

## 十一、其他常用命令

| 命令 | 说明 |
|------|------|
| `openclaw daemon` | Gateway 服务（gateway 旧别名） |
| `openclaw logs` | Gateway 日志 |
| `openclaw tui` | 终端 UI |
| `openclaw cron` | 定时任务调度 |
| `openclaw system event` | 入队系统事件 |
| `openclaw system heartbeat last/enable/disable` | 心跳控制 |
| `openclaw pairing list/approve` | DM 配对管理 |
| `openclaw webhooks gmail setup/run` | Gmail Webhook 配置与运行 |
| `openclaw update` | 更新 CLI |
| `openclaw security audit` | 安全审计 |
| `openclaw sandbox list/recreate/explain` | 沙箱管理 |

---

## 十二、示例组合

```bash
# 本地开发：前台运行 Gateway
openclaw gateway --port 18789

# 开发模式（隔离环境）
openclaw --dev gateway

# 强制释放端口后启动
openclaw gateway --force

# 运行 Agent 并投递到 WhatsApp
openclaw agent --to +15555550123 --message "总结收件箱" --deliver

# 发送 Telegram 消息
openclaw message send --channel telegram --target @mychat --message "Hi"

# 诊断并修复
openclaw doctor --fix

# 查看健康状态
openclaw gateway health
```

---

## 相关文档

- [Gateway 配置](/gateway/configuration)
- [CLI Gateway](/cli/gateway)
- [API 集成（小程序）](/integration/api-for-miniprogram)
