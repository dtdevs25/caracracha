import axios, { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api'
});

// Add auth token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('badge_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: (credentials: any) => api.post('/auth/login', credentials),
    getUsers: () => api.get('/auth/users'),
    createUser: (data: any) => api.post('/auth/users', data),
    deleteUser: (id: string) => api.delete(`/auth/users/${id}`)
};

export const templateService = {
    getTemplates: () => api.get('/templates'),
    saveTemplate: (data: any) => api.post('/templates', data),
    deleteTemplate: (id: string) => api.delete(`/templates/${id}`),
    uploadImage: (formData: FormData) => api.post('/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export const recordService = {
    getRecords: (templateId: string) => api.get(`/records/${templateId}`),
    saveRecords: (templateId: string, records: any[]) => api.post(`/records/${templateId}`, { records })
};

export default api;
