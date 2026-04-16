
CREATE DATABASE QLBanMyPham_Hamoni CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QLBanMyPham_Hamoni;

-- ==========================================
-- 1. QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN 
-- ==========================================
CREATE TABLE PHANQUYEN (
    MaQuyen CHAR(5) PRIMARY KEY,
    TenQuyen VARCHAR(50),
    MoTa TEXT,
    DanhSachQuyen TEXT
);

CREATE TABLE NguoiDung (
    MaND INT PRIMARY KEY AUTO_INCREMENT,
    MaQuyen CHAR(5),
    HoTen VARCHAR(100), 
    Email VARCHAR(100) UNIQUE NOT NULL,
    MatKhau VARCHAR(255) NOT NULL,
    SoDienThoai VARCHAR(20),
    DiaChi VARCHAR(255),
    TrangThai TINYINT(1) DEFAULT 1, 
    NgayDangKy DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_NguoiDung_PhanQuyen FOREIGN KEY (MaQuyen) REFERENCES PHANQUYEN(MaQuyen)
);

-- ==========================================
-- 2. QUẢN LÝ MEDIA (BẢNG ĐA HÌNH)
-- ==========================================
CREATE TABLE HinhAnh (
    MaHinhAnh INT PRIMARY KEY AUTO_INCREMENT,
    LoaiThamChieu VARCHAR(50) NOT NULL, 
    MaThamChieu INT NOT NULL, 
    DuongDanAnh VARCHAR(255) NOT NULL,
    LaAnhChinh TINYINT(1) DEFAULT 0,
    ThuTuHienThi INT DEFAULT 0
);

-- ==========================================
-- 3. QUẢN LÝ SẢN PHẨM & BIẾN THỂ (CATALOG)
-- ==========================================
CREATE TABLE DANHMUC (
    MaDM CHAR(5) PRIMARY KEY,
    TenDM VARCHAR(50)
);

CREATE TABLE SanPham (
    MaSP INT PRIMARY KEY AUTO_INCREMENT,
    MaDM CHAR(5),
    TenSP VARCHAR(200),
    MoTa TEXT,
    ThanhPhan TEXT, 
    CachSuDung TEXT,
    LoaiDaPhuHop VARCHAR(100),
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_SanPham_DanhMuc FOREIGN KEY (MaDM) REFERENCES DANHMUC(MaDM)
);

CREATE TABLE BienTheSanPham (
    MaBienThe INT PRIMARY KEY AUTO_INCREMENT,
    MaSP INT,
    TenBienThe VARCHAR(100), 
    Gia DECIMAL(18,2),
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_BienThe_SanPham FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);

-- ==========================================
-- 4. QUẢN LÝ KHO HÀNG & NHẬP KHO NỘI BỘ
-- ==========================================
CREATE TABLE KhoHang (
    MaKho INT PRIMARY KEY AUTO_INCREMENT,
    TenKho VARCHAR(100),
    DiaChi VARCHAR(255)
);

CREATE TABLE TonKho (
    MaKho INT,
    MaBienThe INT,
    SoLuongTon INT DEFAULT 0,
    PRIMARY KEY (MaKho, MaBienThe),
    CONSTRAINT FK_TonKho_Kho FOREIGN KEY (MaKho) REFERENCES KhoHang(MaKho),
    CONSTRAINT FK_TonKho_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE PhieuNhapKho (
    MaPN INT PRIMARY KEY AUTO_INCREMENT,
    MaKho INT, 
    MaND INT, 
    NgayNhap DATETIME DEFAULT CURRENT_TIMESTAMP,
    CaSanXuat VARCHAR(50) NULL, 
    GhiChu TEXT,
    CONSTRAINT FK_PhieuNhapKho_Kho FOREIGN KEY (MaKho) REFERENCES KhoHang(MaKho),
    CONSTRAINT FK_PhieuNhapKho_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

CREATE TABLE ChiTietPhieuNhapKho (
    MaPN INT,
    MaBienThe INT,
    SoLuongNhap INT,
    ChiPhiSanXuatUocTinh DECIMAL(18,2) NULL, 
    SoLo VARCHAR(50) NOT NULL, 
    NgaySanXuat DATE NOT NULL,
    HanSuDung DATE NOT NULL,          
    PRIMARY KEY (MaPN, MaBienThe),
    CONSTRAINT FK_CTPNK_PhieuNhap FOREIGN KEY (MaPN) REFERENCES PhieuNhapKho(MaPN),
    CONSTRAINT FK_CTPNK_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

-- ==========================================
-- 5. CHƯƠNG TRÌNH KHUYẾN MÃI & VOUCHER
-- ==========================================
CREATE TABLE ChuongTrinhKhuyenMai (
    MaCTKM INT PRIMARY KEY AUTO_INCREMENT,
    TenCTKM VARCHAR(200),
    LoaiGiamGia VARCHAR(50), 
    GiaTriGiam DECIMAL(18,2),
    NgayBatDau DATETIME,
    NgayKetThuc DATETIME,
    Banner VARCHAR(255)
);

CREATE TABLE SanPham_KhuyenMai (
    MaCTKM INT,
    MaBienThe INT,
    PRIMARY KEY (MaCTKM, MaBienThe),
    CONSTRAINT FK_SPKM_KM FOREIGN KEY (MaCTKM) REFERENCES ChuongTrinhKhuyenMai(MaCTKM),
    CONSTRAINT FK_SPKM_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE Voucher (
    MaVoucher CHAR(20) PRIMARY KEY,
    LoaiGiamGia VARCHAR(50) NOT NULL DEFAULT 'PhanTram',
    GiaTriGiam DECIMAL(18,2) NOT NULL,
    DonHangToiThieu DECIMAL(18,2) NOT NULL DEFAULT 0,
    SoLuongToiDa INT NOT NULL,
    SoLuongDaDung INT NOT NULL DEFAULT 0,
    NgayBatDau DATETIME NOT NULL,
    NgayKetThuc DATETIME NOT NULL,
    TrangThai VARCHAR(50) NOT NULL DEFAULT 'KichHoat'
);

-- ==========================================
-- 6. GIỎ HÀNG, ĐƠN HÀNG & BÁN HÀNG
-- ==========================================
CREATE TABLE GioHang (
    MaND INT,
    MaBienThe INT,
    SoLuong INT,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MaND, MaBienThe),
    CONSTRAINT FK_GioHang_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND),
    CONSTRAINT FK_GioHang_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE DonHang (
    MaDH INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT,
    MaVoucher CHAR(20) NULL,
    NgayDat DATETIME DEFAULT CURRENT_TIMESTAMP,
    TrangThai VARCHAR(50), 
    TongTien DECIMAL(18,2),
    PhiShip DECIMAL(18,2) DEFAULT 0,
    TienGiamGia DECIMAL(18,2) DEFAULT 0,
    ThanhTien DECIMAL(18,2), 
    ThongTinGiaoHang TEXT NOT NULL, 
    GhiChu TEXT,
    CONSTRAINT FK_DonHang_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND),
    CONSTRAINT FK_DonHang_Voucher FOREIGN KEY (MaVoucher) REFERENCES Voucher(MaVoucher)
);

CREATE TABLE ChiTietDonHang (
    MaDH INT,
    MaBienThe INT,
    SoLuong INT,
    DonGia DECIMAL(18,2), 
    PRIMARY KEY (MaDH, MaBienThe),
    CONSTRAINT FK_CTDH_DonHang FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH),
    CONSTRAINT FK_CTDH_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE ThanhToan (
    MaThanhToan INT PRIMARY KEY AUTO_INCREMENT,
    MaDH INT,
    PhuongThuc VARCHAR(50), 
    TrangThai VARCHAR(50), 
    MaGiaoDichDoiTac VARCHAR(100) NULL, 
    MaPhanHoi VARCHAR(10) NULL, 
    DuLieuWebhook TEXT NULL, 
    NgayThanhToan DATETIME,
    CONSTRAINT FK_ThanhToan_DonHang FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);

-- ==========================================
-- 7. TƯƠNG TÁC & LOG HỆ THỐNG
-- ==========================================
CREATE TABLE DanhGia (
    MaDG INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT,
    MaSP INT,
    MaDH INT, 
    SoSao INT CHECK (SoSao BETWEEN 1 AND 5),
    BinhLuan TEXT,
    NgayDanhGia DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_DanhGia_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND),
    CONSTRAINT FK_DanhGia_SanPham FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP),
    CONSTRAINT FK_DanhGia_DonHang FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);

CREATE TABLE BannerToanCuc (
    MaBanner INT PRIMARY KEY AUTO_INCREMENT,
    TieuDe VARCHAR(100),
    DuongDanAnh VARCHAR(255) NOT NULL,
    URLDich VARCHAR(255), 
    ViTriHienThi VARCHAR(50), 
    ThuTuHienThi INT DEFAULT 0
);

CREATE TABLE LienHe (
    MaLH INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT NULL,
    HoTen VARCHAR(100),
    Email VARCHAR(100),
    NoiDung TEXT,
    TrangThai VARCHAR(50) DEFAULT 'ChuaXuLy',
    NgayGui DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LienHe_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

CREATE TABLE LogTonKho (
    MaLog INT PRIMARY KEY AUTO_INCREMENT,
    MaBienThe INT,
    LoaiGiaoDich VARCHAR(50), 
    SoLuongThayDoi INT, 
    SoLuongTonHienTai INT, 
    MaThamChieu INT NULL, 
    GhiChu TEXT,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LogTonKho_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE LogDonHang (
    MaLog INT PRIMARY KEY AUTO_INCREMENT,
    MaDH INT,
    TrangThaiCu VARCHAR(50),
    TrangThaiMoi VARCHAR(50),
    GhiChu TEXT,
    NguoiThaoTac INT NULL, 
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LogDonHang_DH FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);
CREATE TABLE PhienChatAI (
    MaPhien INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT, -- Người thực hiện chat
    TieuDe VARCHAR(255) DEFAULT 'Cuộc hội thoại mới',
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_ChatAI_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

CREATE TABLE ChiTietChatAI (
    MaTinNhan INT PRIMARY KEY AUTO_INCREMENT,
    MaPhien INT,
    VaiTro ENUM('user', 'assistant') NOT NULL, -- Ai gửi tin nhắn?
    NoiDung TEXT NOT NULL,
    NgayGui DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_ChiTietChat_Phien FOREIGN KEY (MaPhien) REFERENCES PhienChatAI(MaPhien) ON DELETE CASCADE
);

ALTER TABLE Voucher 
ADD COLUMN SoLuongDaDung INT DEFAULT 0 AFTER SoLuong,
ADD COLUMN TrangThai ENUM('KichHoat', 'TamDung', 'HetHan') DEFAULT 'KichHoat' AFTER NgayKetThuc;

-- ==========================================
-- 1. PHÂN QUYỀN & NGƯỜI DÙNG
-- ==========================================
INSERT INTO PHANQUYEN (MaQuyen, TenQuyen, MoTa, DanhSachQuyen) VALUES
('ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống', '["ALL"]'),
('STAFF', 'Nhân viên Bán hàng', 'Quản lý đơn hàng, xem sản phẩm', '["VIEW_DASHBOARD", "VIEW_PRODUCT", "VIEW_ORDER", "EDIT_ORDER"]'),
('CUST', 'Khách hàng', 'Người mua hàng trên website', '[]');

INSERT INTO NguoiDung (MaQuyen, HoTen, Email, MatKhau, SoDienThoai, DiaChi, TrangThai) VALUES
('ADMIN', 'Công Thành', 'admin@hamoni.com', '123456', '0901234567', 'Đà Nẵng', 1),
('STAFF', 'Phương Hói', 'phuong@hamoni.com', '123456', '0945678900', 'Huế', 1),
('STAFF', 'Nguyễn Thị Sale', 'sale@hamoni.com', '123456', '0912345678', 'Hà Nội', 1),
('CUST', 'Khách Hàng VIP', 'vip@gmail.com', '123456', '0934567890', 'Cần Thơ', 1),
('CUST', 'Khách Hàng Mới', 'new@gmail.com', '123456', '0988777666', 'TP.HCM', 1);
INSERT INTO NguoiDung (MaQuyen, HoTen, Email, MatKhau, SoDienThoai, DiaChi, TrangThai) VALUES
('CUST', 'Minh Nhật', 'nhat.admin@gmaili.com', '123456', '0905111222', 'Đà Nẵng', 1),
('CUST', 'Lê Thu Thảo', 'thao.le@gmail.com', '123456', '0935333444', 'Quảng Nam', 1),
('CUST', 'Hoàng Anh Tuấn', 'tuan.ha@gmail.com', '123456', '0914555666', 'Bình Định', 1),
('CUST', 'Trần Bảo Ngọc', 'baongoc@gmail.com', '123456', '0977888999', 'Hải Phòng', 1),
('CUST', 'Phạm Văn Nam', 'vannam.customer@gmail.com', '123456', '0388999000', 'Vũng Tàu', 1);

-- ==========================================
-- 2. DANH MỤC & SẢN PHẨM 
-- ==========================================
INSERT INTO DANHMUC (MaDM, TenDM) VALUES 
('DM001', 'Chăm sóc da mặt'),
('DM002', 'Trang điểm (Makeup)'),
('DM003', 'Chăm sóc cơ thể');

INSERT INTO SanPham (MaDM, TenSP, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop) VALUES 
('DM001', 'Kem Chống Nắng HAMONI SPF 50+ PA++++', 'Bảo vệ da toàn diện, kiềm dầu tốt.', 'ZinC Oxide, Niacinamide', 'Thoa trước khi ra nắng 20p', 'Da dầu mụn'),
('DM002', 'Son Tint Bóng HAMONI Glow', 'Bám màu 8 tiếng, căng mọng môi.', 'Dầu Jojoba, HA', 'Thoa trực tiếp lên môi', 'Mọi loại da'),
('DM001', 'Toner Hoa Cúc HAMONI Cấp Ẩm', 'Làm dịu da, cân bằng độ pH tức thì.', 'Chiết xuất hoa cúc, B5', 'Vỗ nhẹ lên da sau khi rửa mặt', 'Da nhạy cảm'),
('DM003', 'Sữa Tắm Dưỡng Trắng Thảo Mộc', 'Hương thơm dễ chịu, sáng da sau 14 ngày.', 'Cam thảo, Vitamin E', 'Tắm hàng ngày', 'Mọi loại da');

-- ==========================================
-- 3. BIẾN THỂ (TonKho đã được tạo thành công)
-- ==========================================
INSERT INTO BienTheSanPham (MaSP, TenBienThe, Gia, TonKho) VALUES 
-- KCN (MaSP 1)
(1, 'Tuýp 30ml', 180000, 250),
(1, 'Tuýp 50ml', 290000, 45),

-- Son (MaSP 2)
(2, 'Đỏ Cherry', 150000, 0),
(2, 'Cam Đất', 150000, 120),

-- Toner (MaSP 3)
(3, 'Chai 150ml', 220000, 300),

-- Sữa tắm (MaSP 4)
(4, 'Chai 500ml', 190000, 8);

-- ==========================================
-- 4. HÌNH ẢNH SẢN PHẨM
-- ==========================================
INSERT INTO HinhAnh (LoaiThamChieu, MaThamChieu, DuongDanAnh, LaAnhChinh, ThuTuHienThi) VALUES 
('SanPham', 1, 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', 1, 1),
('SanPham', 2, 'https://res.cloudinary.com/demo/image/upload/w_400,h_400/v1312461204/sample.jpg', 1, 1),
('SanPham', 3, 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', 1, 1),
('SanPham', 4, 'https://res.cloudinary.com/demo/image/upload/w_400,h_400/v1312461204/sample.jpg', 1, 1);

-- ==========================================
-- 5. ĐƠN HÀNG 
-- ==========================================
INSERT INTO DonHang (MaND, NgayDat, TrangThai, TongTien, PhiShip, TienGiamGia, ThanhTien, ThongTinGiaoHang, GhiChu) VALUES 
(4, '2026-03-15 09:00:00', 'HoanThanh', 470000.00, 20000, 0, 490000.00, 'Cần Thơ | 0934567890', 'Giao tháng trước'),
(5, '2026-03-22 14:00:00', 'HoanThanh', 290000.00, 0, 0, 290000.00, 'TP.HCM | 0988777666', 'Khách mới tháng 3'),
(4, '2026-04-09 10:30:00', 'DangGiao', 890000.00, 0, 50000, 840000.00, 'Cần Thơ | 0934567890', 'Áp mã giảm giá'),
(5, '2026-04-10 08:15:00', 'ChoXacNhan', 150000.00, 30000, 0, 180000.00, 'TP.HCM | 0988777666', 'Giao gấp hôm nay'),
(4, '2026-04-10 16:45:00', 'ChoXacNhan', 410000.00, 20000, 0, 430000.00, 'Cần Thơ | 0934567890', 'Khách VIP mua thêm');

-- ==========================================
-- 6. CHI TIẾT ĐƠN HÀNG 
-- ==========================================
INSERT INTO ChiTietDonHang (MaDH, MaBienThe, SoLuong, DonGia) VALUES 
(1, 2, 1, 290000), 
(1, 1, 1, 180000),
(2, 2, 1, 290000),
(3, 5, 2, 220000),
(3, 4, 3, 150000),
(4, 3, 1, 150000),
(5, 5, 1, 220000),
(5, 6, 1, 190000);


-- ==========================================
-- 1. THÊM SẢN PHẨM MỚI (Tiếp nối MaSP: 5, 6, 7, 8, 9)
-- ==========================================
INSERT INTO SanPham (MaDM, TenSP, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop) VALUES 
('DM001', 'Sữa Rửa Mặt HAMONI Dịu Nhẹ', 'Làm sạch sâu không gây khô căng, độ pH 5.5 chuẩn.', 'Ceramide, HA, Trà xanh', 'Lấy 1 lượng vừa đủ, tạo bọt và massage nhẹ nhàng', 'Mọi loại da, Da nhạy cảm'),
('DM001', 'Serum Phục Hồi B5 HAMONI', 'Phục hồi hàng rào bảo vệ da, cấp ẩm sâu 24h.', 'Vitamin B5 5%, Rau má', 'Dùng 2-3 giọt sau bước toner', 'Da yếu, Da treatment'),
('DM002', 'Phấn Phủ Kiềm Dầu HAMONI Blur', 'Hạt phấn siêu mịn, kiềm dầu 12 tiếng, che phủ lỗ chân lông.', 'Silica, Chiết xuất ngọc trai', 'Phủ lớp mỏng ở bước trang điểm cuối cùng', 'Da dầu, Da hỗn hợp'),
('DM001', 'Kem Dưỡng Đêm Trẻ Hóa HAMONI', 'Tái tạo da ban đêm, ngăn ngừa lão hóa sớm.', 'Retinol 0.1%, Peptides', 'Thoa một lớp mỏng vào buổi tối', 'Da khô, Da lão hóa'),
('DM001', 'Dầu Tẩy Trang HAMONI Sạch Sâu', 'Đánh bay lớp makeup chống nước, nhũ hóa dễ dàng.', 'Dầu Oliu, Dầu Hạt Nho', 'Massage trên da khô, nhũ hóa với nước ấm', 'Mọi loại da');

-- ==========================================
-- 2. THÊM BIẾN THỂ CHO SẢN PHẨM MỚI (Tiếp nối MaBienThe: 7 đến 14)
-- ==========================================
INSERT INTO BienTheSanPham (MaSP, TenBienThe, Gia, TonKho) VALUES 
-- Sữa rửa mặt (MaSP 5)
(5, 'Tuýp 100ml', 120000, 150),
(5, 'Chai 200ml (Có vòi)', 210000, 80),

-- Serum B5 (MaSP 6)
(6, 'Lọ 30ml', 350000, 60),

-- Phấn phủ (MaSP 7)
(7, 'Tone 01 Sáng', 180000, 40),
(7, 'Tone 02 Tự Nhiên', 180000, 100),

-- Kem dưỡng đêm (MaSP 8)
(8, 'Hũ thủy tinh 50g', 280000, 50),

-- Dầu tẩy trang (MaSP 9)
(9, 'Chai mini 50ml', 95000, 200),
(9, 'Chai fullsize 150ml', 190000, 110);

-- ==========================================
-- 3. THÊM ĐƠN HÀNG MỚI (Tiếp nối MaDH: 6 đến 10)
-- ==========================================
INSERT INTO DonHang (MaND, NgayDat, TrangThai, TongTien, PhiShip, TienGiamGia, ThanhTien, ThongTinGiaoHang, GhiChu) VALUES 
(6, '2026-03-25 11:20:00', 'HoanThanh', 560000.00, 0, 30000, 530000.00, 'Đà Nẵng | 0911222333', 'Giao giờ hành chính'),
(7, '2026-04-02 20:15:00', 'HoanThanh', 280000.00, 25000, 0, 305000.00, 'Hà Nội | 0966555444', 'Gọi trước khi giao'),
(8, '2026-04-08 14:00:00', 'DangGiao', 640000.00, 0, 50000, 590000.00, 'Đồng Nai | 0900111222', 'Khách sỉ lấy thử hàng'),
(6, '2026-04-09 09:30:00', 'ChoXacNhan', 190000.00, 30000, 0, 220000.00, 'Đà Nẵng | 0911222333', 'Mua tặng bạn, bọc cẩn thận'),
(9, '2026-04-10 10:00:00', 'ChoXacNhan', 470000.00, 20000, 20000, 470000.00, 'Bình Dương | 0977888999', '');

-- ==========================================
-- 4. THÊM CHI TIẾT ĐƠN HÀNG
-- ==========================================
INSERT INTO ChiTietDonHang (MaDH, MaBienThe, SoLuong, DonGia) VALUES 
-- Đơn 6 (Khách mua Serum B5 và Sữa rửa mặt chai lớn)
(6, 9, 1, 350000),  -- MaBienThe 9: Serum Lọ 30ml
(6, 8, 1, 210000),  -- MaBienThe 8: SRM Chai 200ml

-- Đơn 7 (Khách mua Kem dưỡng đêm)
(7, 12, 1, 280000), -- MaBienThe 12: Kem dưỡng Hũ 50g

-- Đơn 8 (Khách mua KCN tuýp 50ml cũ và Serum B5)
(8, 2, 1, 290000),  -- MaBienThe 2 (Từ data cũ): KCN 50ml
(8, 9, 1, 350000),  -- MaBienThe 9: Serum Lọ 30ml

-- Đơn 9 (Khách mua Dầu tẩy trang fullsize)
(9, 14, 1, 190000), -- MaBienThe 14: Dầu TT 150ml

-- Đơn 10 (Khách mua Toner cũ và Phấn phủ tone tự nhiên)
(10, 5, 1, 220000), -- MaBienThe 5 (Từ data cũ): Toner 150ml
(10, 11, 1, 180000),-- MaBienThe 11: Phấn phủ Tone Tự Nhiên
(10, 13, 1, 70000); -- MaBienThe 13: Dầu TT 50ml (Giá 95k nhưng khách mua combo nên giảm còn 70k chẳng hạn)