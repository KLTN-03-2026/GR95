import axiosClient from './axiosClient';

export const aiConfigApi = {
    getConfig: () => axiosClient.get('/ai-config/config'),

    train: (formData) => axiosClient.post('/ai-config/train', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
};

export default aiConfigApi;