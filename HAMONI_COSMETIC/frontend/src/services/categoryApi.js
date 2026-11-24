// src/services/categoryApi.js
import axiosClient from './axiosClient';

export const categoryApi = {
    // Chỉ cần ghi endpoint tương đối, axiosClient sẽ tự cộng với BASE_URL
    getAll: (search) => axiosClient.get('/categories', { params: { search } }),
    
    create: (data) => axiosClient.post('/categories', data),
    
    update: (id, data) => axiosClient.put(`/categories/${id}`, data),
    
    delete: (id) => axiosClient.delete(`/categories/${id}`),
    
    exportExcel: async () => {
        const blob = await axiosClient.get('/categories/export', { responseType: 'blob' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'danh-muc.xlsx';
        link.click();
        URL.revokeObjectURL(url);
    }
};
