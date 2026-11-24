-- Chạy một lần sau khi xử lý các đánh giá trùng theo (MaND, MaDH, MaSP).
ALTER TABLE DanhGia
    ADD UNIQUE KEY uq_danh_gia_don_san_pham (MaND, MaDH, MaSP);
