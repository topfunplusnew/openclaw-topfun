Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    message: {
      type: Object,
      value: {}
    }
  },
  data: {
    isUser: false
  },
  observers: {
    'message': function(msg: any) {
      this.setData({ isUser: msg && msg.role === 'user' });
    }
  }
});
