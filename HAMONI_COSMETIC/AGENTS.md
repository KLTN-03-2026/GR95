# Hướng dẫn làm việc với dự án Hamoni Cosmetic

## Bối cảnh

- `frontend/`: React 19, Vite 8, React Router, Zustand; giao diện khách hàng và quản trị.
- `backend/`: Express 5, MySQL (`mysql2`), Socket.IO; API bán hàng, kho, thanh toán, chat/AI.
- `qlMypham.sql`: schema khởi tạo. `backend/migrations/`: thay đổi schema riêng lẻ. Xem `HANDOFF.md` để biết các điểm cần xử lý và bằng chứng kiểm tra tại ngày 24/11/2026.
- Backend entry point: `backend/server.js`; frontend entry point: `frontend/src/main.jsx`, định tuyến tại `frontend/src/routes/index.jsx`.

## Quy tắc khi thay đổi

1. Trước khi sửa, chạy `git status --short` và giữ nguyên các thay đổi đang có của người dùng. Tại thời điểm tạo file này, `backend/cancel-unpaid-debug.log`, `frontend/src/layouts/ClientLayout/ClientLayout.jsx`, `frontend/src/pages/auth/AuthPage.jsx`, `frontend/src/pages/auth/OTP.jsx` đã thay đổi sẵn.
2. Không ghi giá trị bí mật từ `.env`, token, mật khẩu, nội dung giao dịch hay dữ liệu cá nhân vào tài liệu, log kiểm thử hoặc câu trả lời. Thông tin SMTP từng nằm trong source đã được chuyển sang biến môi trường; khóa đã lộ vẫn cần được thay trong tài khoản dịch vụ.
3. API quản trị, giỏ hàng, đơn hàng, thông báo và Socket.IO cần xác thực ở **backend**, kiểm tra vai trò/quyền và quyền sở hữu tài nguyên. Điều hướng/ẩn nút ở frontend không thay thế kiểm tra này.
4. Thay đổi thanh toán và tồn kho phải được kiểm tra như một luồng thống nhất: tạo đơn → đối soát tiền → trừ/hoàn tồn → ghi log → hủy/hoàn tiền. Dùng transaction, khóa hàng, tính bất biến và chống xử lý trùng; không dựa vào mã giao dịch do client tự gửi để đánh dấu đã thanh toán.
5. Nếu thay schema, viết migration có thứ tự và kiểm tra tương thích với `qlMypham.sql`. Không chạy lại `qlMypham.sql` trên dữ liệu cần giữ vì file bắt đầu bằng `DROP DATABASE`.
6. Giữ API response nhất quán với `frontend/src/services/axiosClient.js`, nơi interceptor trả về `response.data`. Kiểm tra từng service trước khi đổi contract.
7. Không tự ý sửa các file đang thay đổi sẵn hoặc xóa log/dữ liệu. Tách chỉnh sửa theo luồng chức năng và mô tả rủi ro khi bàn giao.

## Chạy và kiểm tra

- Frontend: `cd frontend`, `npm.cmd install`, `npm.cmd run dev`; kiểm tra bằng `npm.cmd run lint` và `npm.cmd run build` trên PowerShell nếu `npm.ps1` bị chặn.
- Backend: `cd backend`, `npm.cmd install`, `npm.cmd run dev`; cần cấu hình MySQL và dịch vụ liên quan trước khi chạy. `npm.cmd test` chạy test Node cho xác thực và đối soát Casso với DB giả lập.
- Kiểm tra cú pháp backend: `node --check <file.js>`. Với thay đổi thanh toán hoặc phân quyền, cần thêm test tích hợp và thử trên DB dùng riêng trước khi phát hành.
- Frontend dùng `VITE_API_BASE_URL` và `VITE_SOCKET_URL`; backend đọc cấu hình DB, JWT, SMTP, Cloudinary, Casso, Gemini từ môi trường. Xem `backend/.env.example`. Biến `VITE_*` sẽ nằm trong bundle công khai, không đặt bí mật vào đó.

## Thứ tự ưu tiên kỹ thuật

Đọc danh sách chi tiết và bằng chứng trong `HANDOFF.md`. Trước khi phát hành, cần cấu hình SMTP, thay khóa đã lộ, áp dụng migration lên DB sau khi kiểm tra dữ liệu, kiểm thử luồng thanh toán với DB/Casso thực tế và xử lý lỗi lint còn lại.
