# Hamoni Cosmetic frontend

Giao diện khách hàng và quản trị dùng React 19, Vite 8, React Router và Zustand. Xem [README gốc](../README.md) để thiết lập backend và cơ sở dữ liệu; xem [HANDOFF](../HANDOFF.md) để biết rủi ro còn lại.

## Chạy local

1. Tạo `frontend/.env` với `VITE_API_BASE_URL=http://localhost:5000/api` và `VITE_SOCKET_URL=http://localhost:5000` nếu dùng chat/thông báo thời gian thực.
2. Chạy `npm.cmd install` rồi `npm.cmd run dev` trong thư mục này.
3. Chạy `npm.cmd run build` để kiểm tra bản production và `npm.cmd run lint` để xem các lỗi React/ESLint còn lại.

Các biến `VITE_*` được đưa vào bundle công khai. Không đặt token, mật khẩu hoặc khóa dịch vụ vào đây.
