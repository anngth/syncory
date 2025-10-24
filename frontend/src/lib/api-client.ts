import axios, { AxiosInstance, AxiosError } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken();
          if (refreshed && error.config) {
            return this.client.request(error.config);
          } else {
            this.logout();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', token);
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      const userId = this.getUserId();

      if (!refreshToken || !userId) return false;

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
        { refreshToken, userId }
      );

      this.setToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getUserId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId');
    }
    return null;
  }

  private logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      window.location.href = '/auth/login';
    }
  }

  // Auth methods
  async register(data: any) {
    const response = await this.client.post('/api/auth/register', data);
    this.setToken(response.data.accessToken);
    this.setRefreshToken(response.data.refreshToken);
    localStorage.setItem('userId', response.data.user.id);
    return response.data;
  }

  async login(data: any) {
    const response = await this.client.post('/api/auth/login', data);
    this.setToken(response.data.accessToken);
    this.setRefreshToken(response.data.refreshToken);
    localStorage.setItem('userId', response.data.user.id);
    return response.data;
  }

  async logoutUser() {
    await this.client.post('/api/auth/logout');
    this.logout();
  }

  // User methods
  async getCurrentUser() {
    const response = await this.client.get('/api/users/me');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/api/users/me', data);
    return response.data;
  }

  async searchUsers(query: string) {
    const response = await this.client.get(`/api/users/search?q=${query}`);
    return response.data;
  }

  // Workspace methods
  async getWorkspaces() {
    const response = await this.client.get('/api/workspaces/my');
    return response.data;
  }

  async getWorkspace(id: string) {
    const response = await this.client.get(`/api/workspaces/${id}`);
    return response.data;
  }

  async createWorkspace(data: any) {
    const response = await this.client.post('/api/workspaces', data);
    return response.data;
  }

  async updateWorkspace(id: string, data: any) {
    const response = await this.client.put(`/api/workspaces/${id}`, data);
    return response.data;
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role?: string) {
    const response = await this.client.post(`/api/workspaces/${workspaceId}/members`, {
      userId,
      role,
    });
    return response.data;
  }

  // Channel methods
  async getChannels(workspaceId: string) {
    const response = await this.client.get(`/api/channels/workspace/${workspaceId}/my`);
    return response.data;
  }

  async getChannel(id: string) {
    const response = await this.client.get(`/api/channels/${id}`);
    return response.data;
  }

  async createChannel(data: any) {
    const response = await this.client.post('/api/channels', data);
    return response.data;
  }

  async updateChannel(id: string, data: any) {
    const response = await this.client.put(`/api/channels/${id}`, data);
    return response.data;
  }

  async addChannelMember(channelId: string, userId: string) {
    const response = await this.client.post(`/api/channels/${channelId}/members`, { userId });
    return response.data;
  }

  // Message methods
  async getMessages(channelId: string, page: number = 1, limit: number = 50) {
    const response = await this.client.get(
      `/api/messages/channel/${channelId}?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async getThreadReplies(parentId: string, page: number = 1) {
    const response = await this.client.get(`/api/messages/thread/${parentId}?page=${page}`);
    return response.data;
  }

  async searchMessages(workspaceId: string, query: string) {
    const response = await this.client.get(
      `/api/messages/search/${workspaceId}?query=${query}`
    );
    return response.data;
  }

  // File methods
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadFiles(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await this.client.post('/api/files/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
