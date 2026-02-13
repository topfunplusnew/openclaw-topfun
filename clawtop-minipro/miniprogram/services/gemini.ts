// ⚠️ TODO: Replace with your actual API Key or use a backend proxy
const API_KEY = '';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-1.5-flash';

// Types
export interface Message {
  role: 'user' | 'model';
  parts: { text: string; inlineData?: { mimeType: string; data: string } }[];
}

/**
 * Send a chat message to Gemini API (non-streaming for Mini Program compatibility)
 */
export const sendMessageToGeminiSimple = (history: Message[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('API Key is missing. Set it in services/gemini.ts'));
      return;
    }

    wx.request({
      url: `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        contents: history,
        generationConfig: {
          maxOutputTokens: 2048
        },
        systemInstruction: {
          parts: [{ text: 'You are 超级斜杠AI, a helpful and efficient assistant. Your tone is professional yet friendly. You are concise and accurate.' }]
        }
      },
      success: (res: any) => {
        if (res.statusCode === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          resolve(res.data.candidates[0].content.parts[0].text);
        } else {
          console.error('API response:', res);
          reject(new Error(`API Error: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('Request failed:', err);
        reject(err);
      }
    });
  });
};

/**
 * Analyze an image using Gemini Vision
 */
export const analyzeImage = (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('API Key is missing.'));
      return;
    }

    wx.request({
      url: `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }]
      },
      success: (res: any) => {
        if (res.statusCode === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          resolve(res.data.candidates[0].content.parts[0].text);
        } else {
          reject(new Error('Image Analysis Failed'));
        }
      },
      fail: reject
    });
  });
};

/**
 * Transcribe audio using Gemini
 */
export const transcribeAudio = (base64Audio: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('API Key is missing.'));
      return;
    }

    wx.request({
      url: `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        contents: [{
          parts: [
            { inline_data: { mime_type: 'audio/mp3', data: base64Audio } },
            { text: '请将这段语音转换成文字。只需输出转换后的文字内容，不要有任何多余的解释。' }
          ]
        }]
      },
      success: (res: any) => {
        if (res.statusCode === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          resolve(res.data.candidates[0].content.parts[0].text.trim());
        } else {
          reject(new Error('Transcription Failed'));
        }
      },
      fail: reject
    });
  });
};
