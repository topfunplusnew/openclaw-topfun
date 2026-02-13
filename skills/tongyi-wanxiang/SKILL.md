---
name: tongyi-wanxiang
description: 通义万相 AI 生图工具。使用阿里云的通义万相模型生成图片。Use when user wants to generate images, create pictures, draw something, or asks for AI image generation. Requires DASHSCOPE_API_KEY environment variable.
---

# 通义万相生图工具

使用阿里云通义万相（Tongyi Wanxiang）AI 模型生成图片。

## 前置要求

1. 需要阿里云 DashScope API Key
2. 设置环境变量: `DASHSCOPE_API_KEY=your-api-key`

## 使用方法

### 基本用法

```bash
python scripts/generate_image.py "图片描述"
```

### 完整参数

```bash
python scripts/generate_image.py "一只可爱的猫咪在草地上玩耍" \
    --size 1024x1024 \
    --n 1 \
    --output-dir ./images
```

### 参数说明

- `prompt`: 图片描述（支持中文或英文）
- `--size`: 图片尺寸，可选值：
  - `1024x1024` (默认) - 正方形
  - `1440x720` - 横屏
  - `720x1440` - 竖屏
- `--n`: 生成数量，可选 1、2、4 (默认 1)
- `--output-dir`: 图片保存目录 (默认当前目录)

## 示例

```bash
# 简单生成
python scripts/generate_image.py "日落时分的海边，金色沙滩"

# 指定尺寸和数量
python scripts/generate_image.py "未来城市，赛博朋克风格" --size 1440x720 --n 2

# 保存到指定目录
python scripts/generate_image.py "水彩风格的樱花树" --output-dir ./my-images
```

## 获取 API Key

1. 访问阿里云 DashScope: https://dashscope.aliyun.com/
2. 注册/登录账号
3. 在"API-KEY 管理"中创建新 Key
4. 设置环境变量: `set DASHSCOPE_API_KEY=your-key`

## 模型说明

- 使用模型: `wanx2.1-t2i-turbo`
- 支持中英文提示词
- 生成时间约 5-30 秒
