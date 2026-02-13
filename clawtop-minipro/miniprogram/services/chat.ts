/**
 * OpenClaw Chat Service
 * 
 * 调用 web 后端 /api/chat 接口（代理到 OpenClaw Gateway /v1/chat/completions）
 * API 格式兼容 OpenAI Chat Completions
 */

import { BASE_URL, OPENCLAW_API_KEY, MODEL_NAME } from '../config';

// ===== Types =====

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  user?: string;
}

interface ChatChoice {
  message: {
    role: string;
    content: string;
  };
}

interface ChatResponse {
  choices: ChatChoice[];
  error?: {
    message: string;
  };
}

// ===== 内部消息类型（页面使用）=====

export interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  attachments?: any[];
  isStreaming?: boolean;
}

// ===== API Functions =====

/**
 * 发送聊天消息到 OpenClaw 后端
 * @param history 聊天历史（DisplayMessage 格式）
 * @returns AI 回复文本
 */
export const sendChatMessage = (history: DisplayMessage[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 将 DisplayMessage 转换为 OpenAI 格式的 ChatMessage
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are 超级斜杠AI, a helpful and efficient assistant. Your tone is professional yet friendly. You are concise and accurate.'
      },
      ...history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text
      }))
    ];

    const requestData: ChatRequest = {
      model: MODEL_NAME,
      messages,
      stream: false
    };

    const header: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 如果配置了 API Key，添加到请求头
    if (OPENCLAW_API_KEY) {
      header['X-Api-Key'] = OPENCLAW_API_KEY;
    }

    wx.request({
      url: `${BASE_URL}/api/chat`,
      method: 'POST',
      header,
      data: requestData,
      success: (res: any) => {
        if (res.statusCode === 200) {
          const data = res.data as ChatResponse;

          // 检查是否有错误
          if (data.error) {
            reject(new Error(data.error.message || 'API 返回错误'));
            return;
          }

          // 提取回复内容
          if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            resolve(data.choices[0].message.content || '');
          } else {
            reject(new Error('API 返回数据格式异常'));
          }
        } else if (res.statusCode === 401) {
          reject(new Error('未授权，请检查 API Key 配置'));
        } else {
          console.error('Chat API error:', res.statusCode, res.data);
          reject(new Error(`请求失败 (${res.statusCode})`));
        }
      },
      fail: (err) => {
        console.error('Chat request failed:', err);
        reject(new Error('网络请求失败，请检查后端是否启动'));
      }
    });
  });
};

/**
 * 发送带图片的消息到 OpenClaw 后端
 * 注意：标准 Chat Completions 格式不直接支持图片 inline data，
 * 这里将图片描述作为文本提示发送
 */
export const sendImageMessage = (_imageDescription: string, userPrompt: string): Promise<string> => {
  const prompt = userPrompt || '请描述这张图片';
  // 由于 /api/chat 走的是标准 Chat Completions 格式，
  // 如果 Gateway 支持 vision，可以使用 content 数组格式；
  // 否则退化为纯文本请求
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are 超级斜杠AI, a helpful and efficient assistant.'
    },
    {
      role: 'user',
      content: `[用户发送了一张图片] ${prompt}`
    }
  ];

  return new Promise((resolve, reject) => {
    const header: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (OPENCLAW_API_KEY) {
      header['X-Api-Key'] = OPENCLAW_API_KEY;
    }

    wx.request({
      url: `${BASE_URL}/api/chat`,
      method: 'POST',
      header,
      data: { model: MODEL_NAME, messages, stream: false },
      success: (res: any) => {
        if (res.statusCode === 200) {
          const data = res.data as ChatResponse;
          if (data.error) {
            reject(new Error(data.error.message));
            return;
          }
          if (data.choices?.[0]?.message?.content) {
            resolve(data.choices[0].message.content);
          } else {
            reject(new Error('返回数据格式异常'));
          }
        } else {
          reject(new Error(`请求失败 (${res.statusCode})`));
        }
      },
      fail: reject
    });
  });
};

/**
 * 语音转写（通过后端 chat 接口模拟，实际应使用专用 ASR 接口）
 * 这里仅作为占位，实际语音转写建议使用微信自带的语音识别插件
 */
export const transcribeAudio = (_base64Audio: string): Promise<string> => {
  // 微信小程序可以使用 wx.getRecorderManager + 微信语音识别插件
  // 或者将音频发送到后端专用的 ASR 接口
  return Promise.resolve('（语音转写功能需配合 ASR 服务）');
};
