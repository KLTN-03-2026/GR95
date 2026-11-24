# Hamoni Cosmetic

Ứng dụng bán mỹ phẩm gồm React/Vite (`frontend/`) và Express/MySQL/Socket.IO (`backend/`). Danh sách thay đổi, rủi ro và kiểm tra gần nhất nằm trong `HANDOFF.md`.

## Chạy local

1. Tạo MySQL dùng riêng. `qlMypham.sql` tạo schema mới và **xóa database cùng tên nếu đã tồn tại**; không chạy file này trên DB cần giữ dữ liệu.
2. Tạo `backend/.env` từ `backend/.env.example` và điền cấu hình DB, JWT, SMTP cùng các dịch vụ cần dùng. Không đặt bí mật vào biến `VITE_*`.
3. Trong `backend/`, chạy `npm.cmd install` rồi `npm.cmd run dev`.
4. Trong `frontend/`, chạy `npm.cmd install` rồi `npm.cmd run dev`. Đặt `VITE_API_BASE_URL=http://localhost:5000/api` trong `frontend/.env` cho local.

Đối với DB hiện có, xem `backend/migrations/`. Các migration `add_unique_payment_transaction.sql` và `add_unique_product_review.sql` yêu cầu xử lý dữ liệu trùng trước khi chạy; `add_profile_fields.sql` chỉ dành cho schema cũ chưa có các cột đó. Không chạy lại migration đã áp dụng.

## Kiểm tra

- `cd backend; npm.cmd test`: test xác thực và đối soát Casso bằng DB giả lập.
- `cd frontend; npm.cmd run build`: build production.
- `cd frontend; npm.cmd run lint`: kiểm tra React/ESLint. Trạng thái lint còn lại được ghi trong `HANDOFF.md`.

Trên PowerShell, dùng `npm.cmd` nếu `npm.ps1` bị chính sách thực thi chặn.
