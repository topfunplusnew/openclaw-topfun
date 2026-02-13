#!/usr/bin/env python3
"""
通义万相生图 API 调用脚本

使用方法:
    python generate_image.py "prompt" [--size SIZE] [--n NUM]

示例:
    python generate_image.py "一只可爱的猫咪在草地上玩耍" --size 1024x1024 --n 1
"""

import os
import sys
import json
import time
import argparse
import http.client
from urllib.parse import urlparse


def submit_task(api_key: str, prompt: str, size: str = "1024x1024", n: int = 1):
    """提交生图任务"""
    conn = http.client.HTTPSConnection("dashscope.aliyuncs.com")
    
    payload = json.dumps({
        "model": "wanx2.1-t2i-turbo",
        "input": {
            "prompt": prompt
        },
        "parameters": {
            "size": size,
            "n": n
        }
    })
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    conn.request("POST", "/api/v1/services/aigc/text2image/image-synthesis", payload, headers)
    res = conn.getresponse()
    data = res.read()
    
    return json.loads(data.decode("utf-8"))


def query_task(api_key: str, task_id: str):
    """查询任务状态"""
    conn = http.client.HTTPSConnection("dashscope.aliyuncs.com")
    
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    
    conn.request("GET", f"/api/v1/tasks/{task_id}", headers=headers)
    res = conn.getresponse()
    data = res.read()
    
    return json.loads(data.decode("utf-8"))


def wait_for_result(api_key: str, task_id: str, timeout: int = 300):
    """等待任务完成并返回结果"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        result = query_task(api_key, task_id)
        
        if result.get("output", {}).get("task_status") == "SUCCEEDED":
            return result
        elif result.get("output", {}).get("task_status") == "FAILED":
            raise Exception(f"任务失败: {result.get('output', {}).get('message', '未知错误')}")
        
        # 等待 2 秒后重试
        time.sleep(2)
    
    raise TimeoutError("等待超时")


def main():
    parser = argparse.ArgumentParser(description="通义万相生图工具")
    parser.add_argument("prompt", help="图片描述（中文或英文）")
    parser.add_argument("--size", default="1024x1024", 
                        choices=["1024x1024", "1440x720", "720x1440"],
                        help="图片尺寸 (默认: 1024x1024)")
    parser.add_argument("--n", type=int, default=1, choices=[1, 2, 4],
                        help="生成图片数量 (默认: 1)")
    parser.add_argument("--output-dir", default=".",
                        help="图片保存目录 (默认: 当前目录)")
    
    args = parser.parse_args()
    
    # 获取 API Key
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        print("错误: 请设置 DASHSCOPE_API_KEY 环境变量")
        print("示例: set DASHSCOPE_API_KEY=your-api-key")
        sys.exit(1)
    
    print(f"正在生成图片...")
    print(f"描述: {args.prompt}")
    print(f"尺寸: {args.size}")
    print(f"数量: {args.n}")
    print()
    
    try:
        # 提交任务
        response = submit_task(api_key, args.prompt, args.size, args.n)
        
        if "output" not in response or "task_id" not in response["output"]:
            print(f"提交任务失败: {response}")
            sys.exit(1)
        
        task_id = response["output"]["task_id"]
        print(f"任务已提交，ID: {task_id}")
        print("等待生成完成...")
        
        # 等待结果
        result = wait_for_result(api_key, task_id)
        
        # 下载图片
        import urllib.request
        
        results = result["output"]["results"]
        os.makedirs(args.output_dir, exist_ok=True)
        
        for i, img_info in enumerate(results):
            img_url = img_info["url"]
            img_path = os.path.join(args.output_dir, f"generated_{i+1}.png")
            
            urllib.request.urlretrieve(img_url, img_path)
            print(f"✓ 图片已保存: {img_path}")
        
        print(f"\n生成完成！共 {len(results)} 张图片")
        
    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
