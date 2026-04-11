// src/services/authApi.js
import axiosClient from './axiosClient';

const authApi = {
    login: ({ email, password }) => {
        return axiosClient.post('/auth/login', { email, password });
    },
    
    getCurrentUser: () => {
        return axiosClient.get('/auth/me');
    }
};

export default authApi;