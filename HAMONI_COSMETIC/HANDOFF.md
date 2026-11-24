# Bàn giao review dự án Hamoni Cosmetic

> Các mục đánh giá dưới đây là ảnh chụp trước đợt sửa. Xem **Tình trạng sau đợt sửa** ở cuối file để biết phần đã xử lý và việc còn lại.

**Ngày rà soát:** 24/11/2026 (Asia/Saigon)

**Phạm vi:** cấu trúc repository, package/config, API routes và middleware, các luồng xác thực/đặt hàng/thanh toán/giỏ hàng/chat, schema SQL, frontend routing/state/services; quét mã nguồn và chạy các kiểm tra tĩnh. Chưa chạy kiểm thử tích hợp với MySQL, Cloudinary, Casso, Gemini hoặc luồng trình duyệt thực tế.

## Tổng quan và ưu điểm

- Phạm vi nghiệp vụ khá đầy đủ: duyệt sản phẩm, biến thể, giỏ hàng, đơn, khuyến mãi/voucher, đánh giá, kho, báo cáo, quản trị, thông báo và chat. Các lớp frontend `pages`/`services`/`store`, backend `routes`/`controllers`/`config` giúp tìm luồng chức năng tương đối dễ.
- MySQL schema có khóa ngoại cho nhiều quan hệ cốt lõi (`qlMypham.sql`); các truy vấn thường dùng placeholder. Một số đoạn thanh toán/kho dùng transaction và `FOR UPDATE`, ví dụ `backend/src/controllers/orderpaymentController.js` và `backend/src/config/cassoService.js`.
- Có tuyến khách hàng và quản trị riêng, `AdminRoute` cho UX; API thanh toán trong `backend/src/routes/orderpaymentRoutes.js` dùng `verifyToken` và nhiều thao tác kiểm tra `MaND` của đơn.
- Có ESLint, build Vite và cấu hình rewrite trên Vercel cho client routing. Frontend build thành công trong lần rà soát.

## Nhược điểm và việc cần sửa theo ưu tiên

### P0 — Bảo mật và tính đúng của tiền/dữ liệu

1. **Thiếu xác thực và phân quyền server trên nhiều API.** Các route quản trị như `backend/src/routes/employeeRoutes.js`, `customerRoutes.js`, `orderRoutes.js`, `productRoutes.js`, `warehouseRoutes.js`, `dashboardRoutes.js`, `aiConfigRoutes.js`, `adminChatRoutes.js` không gắn `verifyToken` hoặc kiểm tra vai trò. `roleRoutes.js` có xác thực nhưng `POST /:maQuyen/permissions` không kiểm tra quyền admin. Hệ quả: client trực tiếp có thể gọi API đọc/sửa dữ liệu dù frontend chặn `/admin`. Áp middleware xác thực, phân quyền theo action và kiểm tra quyền sở hữu; rà toàn bộ route trước khi đưa lên môi trường công khai.
2. **ID do client cung cấp có thể truy cập dữ liệu người khác.** `backend/src/routes/shoppingcartRoutes.js` không có xác thực; controller lấy `maKhachHang` từ params/body (`backend/src/controllers/shoppingcartController.js:8,82`). API thông báo dùng `:userId` và `:notifId` không kiểm tra chủ sở hữu (`backend/src/routes/notificationRoutes.js`, `backend/src/controllers/notificationController.js`). Chi tiết đơn `/api/orderdetails/:id` trả thông tin cá nhân mà không xác thực (`backend/src/routes/OrderDetailsRoutes.js`, `backend/src/controllers/OrderDetailsControllers.js`). Socket.IO cho phép client tự vào `STAFF_ROOM`, `NOTIF_<id>` và chat room (`backend/src/sockets/chatSocket.js:8-28`). Buộc danh tính từ token/session đã xác minh tại server và kiểm tra mọi đối tượng được truy cập.
3. **Client có thể tự xác nhận đã thanh toán online.** `POST /api/orderpayment/confirm-online` có token và kiểm tra chủ đơn nhưng `backend/src/controllers/orderpaymentController.js:701-838` đánh dấu `ThanhToan.TrangThai='DaThanhToan'` và trừ kho theo `orderId`/`transactionCode` client gửi, không thấy xác minh giao dịch với nhà cung cấp. Cần bỏ khả năng tự xác nhận, chỉ chấp nhận kết quả đối soát đáng tin cậy, kiểm tra số tiền, mã đơn và ID giao dịch duy nhất; kiểm thử chạy đồng thời với Casso cron.
4. **Mật khẩu và bí mật.** `backend/src/controllers/authController.js:18-24` chứa thông tin đăng nhập email trực tiếp; `authController.js:56-57,275-300,600` và `backend/src/controllers/employeeCreateController.js:19-23` so sánh/lưu mật khẩu dạng văn bản thường. `backend/src/middlewares/authMiddleware.js` và `authController.js` có JWT secret dự phòng cố định. Cần thay khóa dịch vụ đã lộ trong source, chuyển toàn bộ bí mật vào biến môi trường/secret manager, bỏ fallback, chuyển mật khẩu sang hash có salt và thiết kế chuyển đổi dữ liệu cũ. Không sao chép giá trị khóa vào tài liệu.
5. **CORS và upload quá rộng.** `backend/server.js` chấp nhận mọi origin kết thúc `.vercel.app`, không giới hạn vào deployment của dự án; `backend/src/routes/uploadRoutes.js` và `aiConfigRoutes.js` không xác thực. `multer` cho AI dùng memory storage không giới hạn dung lượng (`backend/src/routes/aiConfigRoutes.js:9`); Cloudinary upload chưa thấy giới hạn kích cỡ (`backend/src/config/cloudinaryConfig.js`). Giới hạn origin cụ thể, quyền truy cập, loại file và kích cỡ; thêm rate limiting cho đăng nhập/OTP/upload/chat.

### P1 — Độ tin cậy nghiệp vụ và bảo trì

6. **Hai đường xác nhận thanh toán có thể tranh chấp.** Casso polling mỗi 30 giây (`backend/src/config/cassoService.js:191-199`) và endpoint client ở trên cùng cập nhật payment/kho. Casso cập nhật trạng thái tiền trước khi trừ kho, và khi không đủ tồn thì `continue` ở từng item (`cassoService.js:124-128`), vẫn có thể commit trạng thái đã thanh toán. Cần một service giao dịch chung, khóa đơn/payment, giao dịch duy nhất, idempotency và chính sách thiếu tồn rõ ràng; lưu dấu giao dịch Casso đã xử lý.
7. **Schema và migration chưa có nguồn sự thật rõ.** `qlMypham.sql` bắt đầu bằng `DROP DATABASE`; migration `backend/migrations/add_profile_fields.sql` thêm các cột đã có trong schema gốc. `backend/src/controllers/orderController.js:337` tự `ALTER TABLE` khi xử lý request. `shoppingcartController.js:299` ghi `DanhSachYeuThich` nhưng bảng không thấy trong `qlMypham.sql`. Cần migration có phiên bản, một quy trình khởi tạo DB sạch và kiểm thử schema từ đầu.
8. **Routing có xung đột và route thử nghiệm.** `backend/src/routes/orderRoutes.js` đặt `GET /:id` trước `GET /alerts`, nên `/alerts` có thể bị hiểu là `id`. `frontend/src/routes/index.jsx` vẫn có `/test-review` với mã sản phẩm/đơn cố định; có nhiều alias và file trang trùng (`client/products` và `client/search`, `ProductDetailView` và `ProductView`). Sắp xếp route tĩnh trước route tham số, bỏ route test khỏi bản phát hành, hợp nhất trang không còn dùng sau khi kiểm tra link thực tế.
9. **Thiếu kiểm thử tự động và hướng dẫn chạy.** Không thấy file test/spec trong source; `backend/package.json` có script `test` placeholder luôn lỗi. `frontend/README.md` vẫn là mẫu Vite. Thêm test ưu tiên cho phân quyền, chủ sở hữu đơn/giỏ/thông báo, xác nhận tiền, race tồn kho và migration; cập nhật README cấu hình môi trường, sơ đồ hệ thống và cách chạy mà không nêu secret.
10. **Trạng thái và lỗi frontend chưa nhất quán.** `frontend/src/routes/index.jsx` đọc role/token từ `localStorage`; `frontend/src/store/useStore.js` cũng lưu `user` qua Zustand persist; `frontend/src/services/axiosClient.js` chỉ cảnh báo khi 401. Dễ có dữ liệu đăng nhập lệch sau hết hạn/đổi quyền. Hợp nhất một nguồn auth state, refresh/đăng xuất khi token lỗi, xác nhận quyền lại từ backend. Token trong `localStorage` cần đánh giá rủi ro XSS trước khi chọn chiến lược lưu trữ.

### P2 — Hiệu năng và chất lượng mã

11. **Frontend bundle lớn.** `npm.cmd run build` thành công nhưng tạo JS khoảng 1.76 MB và CSS khoảng 493 KB trước gzip; Vite cảnh báo chunk trên 500 KB. `xlsx` được import tĩnh ở `frontend/src/pages/admin/Product/ProductManagement.jsx` và động ở Dashboard nên import động không tách được thư viện. Dùng lazy route cho trang admin/chức năng nặng, chỉ nạp thư viện Excel/biểu đồ khi cần, đo lại bundle sau mỗi bước.
12. **Lint chưa đạt.** `npm.cmd run lint` trả về **35 errors, 2 warnings** (24/11/2026), phần lớn `react-hooks/set-state-in-effect`; có lỗi `react-hooks/immutability` ở `frontend/src/pages/admin/Order/OrderManagement.jsx:74` và `react-hooks/static-components` ở `EmployeeDetail.jsx:62`. Xử lý lỗi ảnh hưởng hành vi trước, sau đó chuẩn hóa dữ liệu dẫn xuất/effect; không tắt hàng loạt rule chỉ để qua gate.
13. **File lớn, logic trùng và debug còn sót.** `frontend/src/pages/client/ProductDetailView/ProductDetailView.jsx` khoảng 67 KB; `backend/src/controllers/orderpaymentController.js` khoảng 34 KB. Có code debug/log ở `backend/server.js`, `orderpaymentController.js`, `reportController.js`; `backend/cancel-unpaid-debug.log` đang được track. Tách logic theo nghiệp vụ, thống nhất logging có mức độ và tránh ghi dữ liệu nhạy cảm.

## Kết quả xác minh

| Kiểm tra | Kết quả |
| --- | --- |
| `node --check` 68 file JS backend | 0 lỗi cú pháp |
| `npm.cmd run build` trong `frontend/` | Thành công; có cảnh báo bundle lớn và `xlsx` import trùng kiểu |
| `npm.cmd run lint` trong `frontend/` | Thất bại: 35 errors, 2 warnings |
| Test tích hợp/end-to-end | Chưa chạy; không có DB và dịch vụ ngoài được cấp cho review này |

## Trạng thái bàn giao

- Review này chỉ tạo `AGENTS.md` và `HANDOFF.md`; không thay đổi code.
- Working tree có thay đổi sẵn ở `backend/cancel-unpaid-debug.log`, `frontend/src/layouts/ClientLayout/ClientLayout.jsx`, `frontend/src/pages/auth/AuthPage.jsx`, `frontend/src/pages/auth/OTP.jsx`. Giữ nguyên và kiểm tra diff trước khi bắt đầu việc mới.
- `frontend/.env` và file log nói trên đang được Git theo dõi. Kiểm tra nội dung/ lịch sử trước khi thay đổi cơ chế quản lý file; không đưa secret vào `VITE_*` vì frontend công khai giá trị này.

## Tình trạng sau đợt sửa 24/11/2026

### Đã xử lý trong mã nguồn

- API nhân viên/khách hàng/đơn/kho/báo cáo/chat AI được bảo vệ ở backend; thao tác thêm/sửa/xóa sản phẩm, danh mục, banner, khuyến mãi, voucher và upload yêu cầu token. Thay đổi quyền và quản lý nhân viên chỉ dành cho ADMIN. Giỏ hàng, thông báo, chi tiết đơn và đánh giá kiểm tra chủ sở hữu.
- Socket.IO kiểm tra token trước khi vào phòng nhân viên/thông báo; phòng khách dùng UUID khó đoán và sự kiện chat bị ràng buộc với phòng đã tham gia. Frontend gửi token cho socket và các request thông báo/upload/chat admin.
- Bỏ route cho phép client tự xác nhận thanh toán. Casso ghi nhận mã giao dịch duy nhất, khóa đơn, trừ kho trước khi đánh dấu đã thanh toán; trường hợp hết hàng hoặc tiền đến sau khi hủy được ghi nhận để hoàn tiền. Hủy thanh toán online giữ lại đơn và log. Trạng thái đơn có kiểm tra bước chuyển và khóa bản ghi.
- Mật khẩu mới dùng `scrypt` với salt; tài khoản cũ được nâng cấp khi đăng nhập. Bỏ thông tin SMTP và JWT fallback khỏi source; OTP có giới hạn số lần thử, auth/upload có giới hạn tần suất trong bộ nhớ. Checkout không còn ghi đè hồ sơ bằng tên/email người nhận.
- Thêm schema/migration cho wishlist và unique key giao dịch/đánh giá; bỏ DDL chạy trong request. Sửa thứ tự `/orders/alerts`, bỏ `/test-review`, sửa API cảnh báo hoàn tiền, tách tải các route và thư viện Excel. Bundle JS tải đầu giảm từ khoảng 1.76 MB xuống khoảng 396 KB trước gzip.
- Bổ sung 7 test backend cho hash/xác thực/chủ sở hữu, ba nhánh đối soát Casso và hủy đơn hoàn kho; `npm.cmd test` chạy thành công. Frontend build thành công, backend qua `node --check`.

### Còn cần làm trước khi phát hành

1. **Vận hành bắt buộc:** cấu hình `SMTP_USER` và `SMTP_PASSWORD` mới theo `backend/.env.example`, thay mật khẩu email đã từng nằm trong source và cân nhắc thay JWT secret. Chưa thể thay khóa trên tài khoản dịch vụ từ repository.
2. **DB bắt buộc:** chạy migration mới trên DB dùng riêng rồi trên môi trường triển khai; kiểm tra dữ liệu trùng trước khi thêm unique key. Không chạy `qlMypham.sql` trên DB có dữ liệu vì file có `DROP DATABASE`. Chưa có quyền/truy cập DB để kiểm thử tích hợp.
3. **Kiểm thử thực tế:** chạy luồng tạo đơn → chuyển khoản → Casso → hủy/hoàn tiền và các request phân quyền với DB/Casso thật hoặc sandbox. Test hiện dùng DB giả lập; chưa kiểm tra trình duyệt và Cloudinary/Gemini/SMTP.
4. **Lint frontend:** còn 31 errors, 2 warnings ở lần kiểm tra sau sửa; các errors đều là `react-hooks/set-state-in-effect` trong các trang cũ. Cần refactor effect/state theo từng màn hình; không tắt hàng loạt rule. Build vẫn qua.
5. **Phân quyền chi tiết:** hiện ADMIN/STAFF được chặn theo vai trò ở backend, nhưng chưa áp ma trận `DanhSachQuyen` cho từng action. Vai trò KHO chỉ dùng kho. Cần thống nhất quyền thực tế với nghiệp vụ và test từng route.
6. **Đối soát mở rộng:** Casso polling hiện chỉ lấy 10 giao dịch gần nhất mỗi lượt; khi lưu lượng tăng cần phân trang hoặc webhook có xác thực và lưu checkpoint. Giới hạn tần suất đang ở bộ nhớ một tiến trình, cần Redis hoặc giải pháp tương đương khi chạy nhiều instance.
7. **Dọn dữ liệu cũ:** file log debug cũ vẫn được Git theo dõi. Cần xem xét bỏ theo dõi sau khi bảo toàn dữ liệu cần thiết và xử lý lịch sử bí mật trong Git theo quy trình của nhóm.

### Bổ sung sau kiểm tra cuối

- Đã xóa hẳn hàm xác nhận thanh toán online từ client. Khi khách hoặc nhân viên hủy đơn, việc hoàn kho dựa vào log xuất kho thực tế; số lượt dùng voucher được giảm một lần khi chuyển sang trạng thái hủy. Luồng hủy thanh toán chưa trả tiền chỉ nhận đơn còn ở trạng thái chờ xác nhận.
