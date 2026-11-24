-- Chạy một lần sau khi kiểm tra không có MaGiaoDichDoiTac trùng.
ALTER TABLE ThanhToan
    ADD UNIQUE KEY uq_thanh_toan_giao_dich_doi_tac (MaGiaoDichDoiTac);
