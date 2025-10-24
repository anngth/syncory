import { io, Socket } from 'socket.io-client';

class SocketClient {
  private chatSocket: Socket | null = null;
  private presenceSocket: Socket | null = null;
  private typingSocket: Socket | null = null;

  connect(token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    // Chat socket
    this.chatSocket = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Presence socket
    this.presenceSocket = io(`${baseUrl}/presence`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Typing socket
    this.typingSocket = io(`${baseUrl}/typing`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (this.chatSocket) {
      this.chatSocket.on('connect', () => {
        console.log('Chat socket connected');
      });

      this.chatSocket.on('disconnect', () => {
        console.log('Chat socket disconnected');
      });

      this.chatSocket.on('error', (error) => {
        console.error('Chat socket error:', error);
      });
    }

    if (this.presenceSocket) {
      this.presenceSocket.on('connect', () => {
        console.log('Presence socket connected');
      });

      this.presenceSocket.on('disconnect', () => {
        console.log('Presence socket disconnected');
      });
    }

    if (this.typingSocket) {
      this.typingSocket.on('connect', () => {
        console.log('Typing socket connected');
      });

      this.typingSocket.on('disconnect', () => {
        console.log('Typing socket disconnected');
      });
    }
  }

  disconnect() {
    this.chatSocket?.disconnect();
    this.presenceSocket?.disconnect();
    this.typingSocket?.disconnect();
  }

  // Chat methods
  joinChannel(channelId: string) {
    this.chatSocket?.emit('joinChannel', { channelId });
    this.typingSocket?.emit('joinChannel', { channelId });
  }

  leaveChannel(channelId: string) {
    this.chatSocket?.emit('leaveChannel', { channelId });
    this.typingSocket?.emit('leaveChannel', { channelId });
  }

  sendMessage(data: any) {
    this.chatSocket?.emit('sendMessage', data);
  }

  editMessage(messageId: string, content: string) {
    this.chatSocket?.emit('editMessage', { messageId, content });
  }

  deleteMessage(messageId: string, channelId: string) {
    this.chatSocket?.emit('deleteMessage', { messageId, channelId });
  }

  addReaction(messageId: string, emoji: string, channelId: string) {
    this.chatSocket?.emit('addReaction', { messageId, emoji, channelId });
  }

  removeReaction(messageId: string, emoji: string, channelId: string) {
    this.chatSocket?.emit('removeReaction', { messageId, emoji, channelId });
  }

  onNewMessage(callback: (message: any) => void) {
    this.chatSocket?.on('newMessage', callback);
  }

  onMessageEdited(callback: (message: any) => void) {
    this.chatSocket?.on('messageEdited', callback);
  }

  onMessageDeleted(callback: (data: any) => void) {
    this.chatSocket?.on('messageDeleted', callback);
  }

  onReactionAdded(callback: (data: any) => void) {
    this.chatSocket?.on('reactionAdded', callback);
  }

  onReactionRemoved(callback: (data: any) => void) {
    this.chatSocket?.on('reactionRemoved', callback);
  }

  // Presence methods
  joinWorkspace(workspaceId: string) {
    this.presenceSocket?.emit('joinWorkspace', { workspaceId });
  }

  leaveWorkspace(workspaceId: string) {
    this.presenceSocket?.emit('leaveWorkspace', { workspaceId });
  }

  updateStatus(status: string, statusMessage?: string, workspaceId?: string) {
    this.presenceSocket?.emit('updateStatus', { status, statusMessage, workspaceId });
  }

  onUserOnline(callback: (data: any) => void) {
    this.presenceSocket?.on('userOnline', callback);
  }

  onUserOffline(callback: (data: any) => void) {
    this.presenceSocket?.on('userOffline', callback);
  }

  onStatusChanged(callback: (data: any) => void) {
    this.presenceSocket?.on('statusChanged', callback);
  }

  onOnlineUsers(callback: (data: any) => void) {
    this.presenceSocket?.on('onlineUsers', callback);
  }

  // Typing methods
  startTyping(channelId: string) {
    this.typingSocket?.emit('startTyping', { channelId });
  }

  stopTyping(channelId: string) {
    this.typingSocket?.emit('stopTyping', { channelId });
  }

  onUserTyping(callback: (data: any) => void) {
    this.typingSocket?.on('userTyping', callback);
  }

  // Remove listeners
  offNewMessage() {
    this.chatSocket?.off('newMessage');
  }

  offMessageEdited() {
    this.chatSocket?.off('messageEdited');
  }

  offMessageDeleted() {
    this.chatSocket?.off('messageDeleted');
  }

  offReactionAdded() {
    this.chatSocket?.off('reactionAdded');
  }

  offReactionRemoved() {
    this.chatSocket?.off('reactionRemoved');
  }

  offUserOnline() {
    this.presenceSocket?.off('userOnline');
  }

  offUserOffline() {
    this.presenceSocket?.off('userOffline');
  }

  offStatusChanged() {
    this.presenceSocket?.off('statusChanged');
  }

  offUserTyping() {
    this.typingSocket?.off('userTyping');
  }
}

export const socketClient = new SocketClient();
