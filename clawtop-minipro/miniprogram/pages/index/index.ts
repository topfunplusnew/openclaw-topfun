import { sendChatMessage, sendImageMessage } from '../../services/chat';
import type { DisplayMessage } from '../../services/chat';

Page({
  data: {
    messages: [] as DisplayMessage[],
    isTyping: false,
    scrollToView: '',
    statusBarHeight: 20,
    headerHeight: 64
  },

  onLoad() {
    // Get system info for custom header
    const sysInfo = wx.getWindowInfo();
    const statusBarHeight = sysInfo.statusBarHeight || 20;
    const headerContentHeight = 44;
    const headerHeight = statusBarHeight + headerContentHeight;

    this.setData({
      statusBarHeight,
      headerHeight,
      messages: [{
        id: 'welcome',
        role: 'model',
        text: '你好！我是超级斜杠AI。有什么我可以帮你的吗？',
        timestamp: this._formatTime(new Date())
      }]
    });

    setTimeout(() => this._scrollToBottom(), 100);
  },

  _formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  _scrollToBottom() {
    this.setData({ scrollToView: 'bottom-anchor' });
  },

  async onSendMessage(e: any) {
    const { text, attachments } = e.detail;
    const timestamp = this._formatTime(new Date());

    const userMsg: DisplayMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp,
      attachments
    };

    this.setData({
      messages: [...this.data.messages, userMsg],
      isTyping: true
    });
    setTimeout(() => this._scrollToBottom(), 50);

    try {
      let responseText = '';

      if (attachments && attachments.length > 0 && attachments[0].type === 'image') {
        // 图片消息：通过 chat 接口处理
        responseText = await sendImageMessage(
          '用户上传了一张图片',
          text || '请描述这张图片'
        );
      } else {
        // 文本消息：调用 /api/chat
        responseText = await sendChatMessage(this.data.messages);
      }

      const aiMsg: DisplayMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: responseText,
        timestamp: this._formatTime(new Date())
      };

      this.setData({
        messages: [...this.data.messages, aiMsg],
        isTyping: false
      });
      setTimeout(() => this._scrollToBottom(), 50);

    } catch (err: any) {
      console.error('Send error:', err);
      const errorMsg = err?.message || '出了一点问题';
      this.setData({
        messages: [...this.data.messages, {
          id: `msg-${Date.now() + 2}`,
          role: 'model',
          text: `抱歉，${errorMsg}。请稍后再试。`,
          timestamp: this._formatTime(new Date())
        }],
        isTyping: false
      });
      setTimeout(() => this._scrollToBottom(), 50);
    }
  }
});
