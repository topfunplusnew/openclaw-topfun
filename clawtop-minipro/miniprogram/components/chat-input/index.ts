import { transcribeAudio } from '../../services/chat';

Component({
  options: { addGlobalClass: true },
  properties: {
    disabled: { type: Boolean, value: false }
  },
  data: {
    inputValue: '',
    isVoiceMode: false,
    isRecording: false,
    isTranscribing: false,
    transcribedText: '',
    showConfirmPanel: false,
    isLocating: false,
    isMenuOpen: false,
    attachments: [] as any[]
  },
  methods: {
    onInput(e: any) {
      this.setData({ inputValue: e.detail.value });
    },

    toggleVoice() {
      this.setData({
        isVoiceMode: !this.data.isVoiceMode,
        showConfirmPanel: false,
        isMenuOpen: false
      });
    },

    toggleMenu() {
      this.setData({
        isMenuOpen: !this.data.isMenuOpen,
        isVoiceMode: false
      });
    },

    handleSend() {
      const text = this.data.inputValue.trim();
      if ((!text && this.data.attachments.length === 0) || this.data.disabled) return;
      
      this.triggerEvent('send', {
        text,
        attachments: this.data.attachments
      });
      this.setData({
        inputValue: '',
        attachments: [],
        isMenuOpen: false,
        isVoiceMode: false
      });
    },

    confirmSend() {
      if (this.data.isTranscribing || !this.data.transcribedText) return;
      this.triggerEvent('send', {
        text: this.data.transcribedText,
        attachments: []
      });
      this.setData({
        showConfirmPanel: false,
        transcribedText: '',
        inputValue: ''
      });
    },

    cancelTranscription() {
      this.setData({
        showConfirmPanel: false,
        transcribedText: '',
        inputValue: ''
      });
    },

    removeAttachment(e: any) {
      const idx = e.currentTarget.dataset.idx;
      const attachments = this.data.attachments.filter((_: any, i: number) => i !== idx);
      this.setData({ attachments });
    },

    // ===== Image from album =====
    chooseFromAlbum() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album'],
        success: (res) => {
          this._addImageAttachment(res.tempFiles[0].tempFilePath);
        }
      });
    },

    // ===== Camera =====
    takePhoto() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        success: (res) => {
          this._addImageAttachment(res.tempFiles[0].tempFilePath);
        }
      });
    },

    // ===== File =====
    chooseFile() {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
          const file = res.tempFiles[0];
          this.setData({
            attachments: [...this.data.attachments, {
              type: 'file',
              url: file.path,
              name: file.name,
              mimeType: ''
            }],
            isMenuOpen: false
          });
        }
      });
    },

    // ===== Location =====
    getLocation() {
      this.setData({ isLocating: true });
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          const locationText = `📍 我当前的位置：北纬 ${res.latitude.toFixed(4)}, 东经 ${res.longitude.toFixed(4)}。请帮我看看这附近有什么好玩的？`;
          this.triggerEvent('send', { text: locationText, attachments: [] });
          this.setData({ isLocating: false, isMenuOpen: false });
        },
        fail: () => {
          wx.showToast({ title: '无法获取位置', icon: 'none' });
          this.setData({ isLocating: false });
        }
      });
    },

    // ===== Voice Recording =====
    startRecording() {
      const recorderManager = wx.getRecorderManager();
      (this as any)._recorder = recorderManager;

      recorderManager.onStop((res) => {
        this.setData({ isRecording: false, showConfirmPanel: true, isTranscribing: true });
        // Read file and transcribe
        const fs = wx.getFileSystemManager();
        try {
          const base64 = fs.readFileSync(res.tempFilePath, 'base64') as string;
          transcribeAudio(base64).then((text) => {
            this.setData({
              transcribedText: text,
              inputValue: text,
              isTranscribing: false
            });
          }).catch(() => {
            this.setData({ transcribedText: '识别失败，请重试', isTranscribing: false });
          });
        } catch (e) {
          this.setData({ transcribedText: '识别失败，请重试', isTranscribing: false });
        }
      });

      recorderManager.start({
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1
      });
      this.setData({
        isRecording: true,
        showConfirmPanel: false,
        transcribedText: ''
      });
    },

    stopRecording() {
      if ((this as any)._recorder && this.data.isRecording) {
        (this as any)._recorder.stop();
      }
    },

    // ===== Helpers =====
    _addImageAttachment(filePath: string) {
      const fs = wx.getFileSystemManager();
      try {
        const base64 = fs.readFileSync(filePath, 'base64') as string;
        this.setData({
          attachments: [...this.data.attachments, {
            type: 'image',
            url: filePath,
            data: base64,
            mimeType: 'image/jpeg'
          }],
          isMenuOpen: false
        });
      } catch (e) {
        console.error('Read image failed:', e);
      }
    }
  }
});
