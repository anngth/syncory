import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  members: any[];
  channels: any[];
}

interface Channel {
  _id: string;
  name: string;
  description?: string;
  type: string;
  workspaceId: string;
  members: any[];
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (data: any) => Promise<void>;
  fetchChannels: (workspaceId: string) => Promise<void>;
  setCurrentChannel: (channelId: string) => void;
  createChannel: (data: any) => Promise<void>;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  channels: [],
  currentChannel: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    try {
      set({ isLoading: true, error: null });
      const workspaces = await apiClient.getWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch workspaces',
        isLoading: false,
      });
    }
  },

  setCurrentWorkspace: async (workspaceId: string) => {
    try {
      set({ isLoading: true, error: null });
      const workspace = await apiClient.getWorkspace(workspaceId);
      set({ currentWorkspace: workspace, isLoading: false });
      
      // Fetch channels for this workspace
      await get().fetchChannels(workspaceId);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch workspace',
        isLoading: false,
      });
    }
  },

  createWorkspace: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const workspace = await apiClient.createWorkspace(data);
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        currentWorkspace: workspace,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create workspace',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchChannels: async (workspaceId: string) => {
    try {
      const channels = await apiClient.getChannels(workspaceId);
      set({ channels });
      
      // Set first channel as current if none selected
      if (channels.length > 0 && !get().currentChannel) {
        set({ currentChannel: channels[0] });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch channels',
      });
    }
  },

  setCurrentChannel: (channelId: string) => {
    const channel = get().channels.find((c) => c._id === channelId);
    if (channel) {
      set({ currentChannel: channel });
    }
  },

  createChannel: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const channel = await apiClient.createChannel(data);
      set((state) => ({
        channels: [...state.channels, channel],
        currentChannel: channel,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create channel',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
