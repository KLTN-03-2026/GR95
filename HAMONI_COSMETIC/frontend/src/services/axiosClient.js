// src/services/axiosClient.js
import axios from "axios";
import { useStore } from '../store/useStore';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

console.log("✅ API_BASE_URL:", API_BASE_URL);

// 1. Khởi tạo cấu hình mặc định
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Interceptor cho Request: Tự động gắn Token trước khi gửi lên Backend
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 3. Interceptor cho Response: Xử lý dữ liệu trả về
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('token')) {
        for (const key of ['token', 'user', 'user_info', 'userPermissions']) localStorage.removeItem(key);
        useStore.getState().logout();
        if (!['/login', '/register'].includes(window.location.pathname)) window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
