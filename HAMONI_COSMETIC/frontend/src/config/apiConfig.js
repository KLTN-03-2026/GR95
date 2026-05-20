// src/config/apiConfig.js
// Centralized API configuration

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SOCKET_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace(
  /\/api\/?$/,
  "",
);

export { API_BASE_URL, SOCKET_BASE_URL };
