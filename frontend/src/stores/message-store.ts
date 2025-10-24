import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { socketClient } from '@/lib/socket-client';

interface Message {
  _id: string;
  content: string;
  type: string;
  channelId: string;
  senderId: any;
  parentId?: string;
  reactions: any[];
  attachments: any[];
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessageState {
  messages: { [channelId: string]: Message[] };
  typingUsers: { [channelId: string]: string[] };
  isLoading: boolean;
  error: string | null;
  fetchMessages: (channelId: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string, channelId: string) => void;
  addTypingUser: (channelId: string, userId: string) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  typingUsers: {},
  isLoading: false,
  error: null,

  fetchMessages: async (channelId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.getMessages(channelId);
      
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: response.data || [],
        },
        isLoading: false,
      }));

      // Setup socket listeners
      socketClient.onNewMessage((message: Message) => {
        if (message.channelId === channelId) {
          get().addMessage(channelId, message);
        }
      });

      socketClient.onMessageEdited((message: Message) => {
        get().updateMessage(message);
      });

      socketClient.onMessageDeleted((data: any) => {
        get().deleteMessage(data.messageId, channelId);
      });

      socketClient.onUserTyping((data: any) => {
        if (data.isTyping) {
          get().addTypingUser(data.channelId, data.userId);
        } else {
          get().removeTypingUser(data.channelId, data.userId);
        }
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch messages',
        isLoading: false,
      });
    }
  },

  addMessage: (channelId: string, message: Message) => {
    set((state) => {
      const channelMessages = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: [...channelMessages, message],
        },
      };
    });
  },

  updateMessage: (message: Message) => {
    set((state) => {
      const channelMessages = state.messages[message.channelId] || [];
      return {
        messages: {
          ...state.messages,
          [message.channelId]: channelMessages.map((m) =>
            m._id === message._id ? message : m
          ),
        },
      };
    });
  },

  deleteMessage: (messageId: string, channelId: string) => {
    set((state) => {
      const channelMessages = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: channelMessages.filter((m) => m._id !== messageId),
        },
      };
    });
  },

  addTypingUser: (channelId: string, userId: string) => {
    set((state) => {
      const channelTyping = state.typingUsers[channelId] || [];
      if (!channelTyping.includes(userId)) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [channelId]: [...channelTyping, userId],
          },
        };
      }
      return state;
    });
  },

  removeTypingUser: (channelId: string, userId: string) => {
    set((state) => {
      const channelTyping = state.typingUsers[channelId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: channelTyping.filter((id) => id !== userId),
        },
      };
    });
  },

  clearError: () => set({ error: null }),
}));
