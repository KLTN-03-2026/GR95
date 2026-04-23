// src/controllers/voucherController.js
const db = require('../config/db'); 

const voucherController = {
    // [GET] /api/vouchers - Lấy danh sách
    getAllVouchers: async (req, res) => {
        try {
            await db.execute(`
                UPDATE Voucher
                SET TrangThai = 'TamDung'
                WHERE TrangThai = 'KichHoat'
                  AND (SoLuong - IFNULL(SoLuongDaDung, 0)) <= 0
            `);

            const [rows] = await db.execute(`
                SELECT MaVoucher, PhanTramGiam, SoTienGiam, GiamToiDa, DonTaiThieu, SoLuong, SoLuongDaDung, NgayBatDau, NgayKetThuc, TrangThai
                FROM Voucher 
                ORDER BY NgayBatDau DESC, MaVoucher DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error("Lỗi get vouchers:", error);
            res.status(500).json({ message: "Lỗi server" });
        }
    },

    // [POST] /api/vouchers - Tạo mã mới
    createVoucher: async (req, res) => {
        try {
            const { 
                MaVoucher, LoaiGiamGia, GiaTriGiam, DonHangToiThieu, 
                SoLuongToiDa, NgayBatDau, NgayKetThuc 
            } = req.body;

            // === VALIDATE DỮ LIỆU BẮT BUỘC ===
            if (!MaVoucher || !GiaTriGiam || !SoLuongToiDa || !NgayBatDau || !NgayKetThuc) {
                return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
            }

            if (!['PhanTram', 'SoTien'].includes(LoaiGiamGia)) {
                return res.status(400).json({ message: "Loại giảm giá không hợp lệ!" });
            }

            // === VALIDATE NGÀY THÁNG ===
            const startDate = new Date(NgayBatDau);
            const endDate = new Date(NgayKetThuc);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ message: "Định dạng ngày không hợp lệ!" });
            }

            if (endDate <= startDate) {
                return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
            }

            // === VALIDATE GIÁ TRỊ SỐ ===
            const giaTriGiam = Number(GiaTriGiam);
            const donHangToiThieu = Number(DonHangToiThieu) || 0;
            const soLuongToiDa = Number(SoLuongToiDa);

            if (!Number.isFinite(giaTriGiam) || giaTriGiam <= 0) {
                return res.status(400).json({ message: "Giá trị giảm phải lớn hơn 0!" });
            }

            if (LoaiGiamGia === 'PhanTram' && (giaTriGiam > 100)) {
                return res.status(400).json({ message: "Giảm theo % không được vượt quá 100%!" });
            }

            if (!Number.isFinite(donHangToiThieu) || donHangToiThieu < 0) {
                return res.status(400).json({ message: "Đơn hàng tối thiểu không hợp lệ!" });
            }

            if (!Number.isFinite(soLuongToiDa) || soLuongToiDa <= 0) {
                return res.status(400).json({ message: "Số lượng tối đa phải lớn hơn 0!" });
            }

            const phanTramGiam = LoaiGiamGia === 'PhanTram' ? giaTriGiam : null;
            const soTienGiam = LoaiGiamGia === 'SoTien' ? giaTriGiam : null;
            const trangThaiKhoiTao = soLuongToiDa > 0 ? 'KichHoat' : 'TamDung';

            const sql = `
                INSERT INTO Voucher 
                (MaVoucher, PhanTramGiam, SoTienGiam, GiamToiDa, DonTaiThieu, SoLuong, SoLuongDaDung, NgayBatDau, NgayKetThuc, TrangThai) 
                VALUES (?, ?, ?, NULL, ?, ?, 0, ?, ?, ?)
            `;
            const values = [
                String(MaVoucher).toUpperCase().trim(),
                phanTramGiam,
                soTienGiam,
                donHangToiThieu,
                soLuongToiDa,
                NgayBatDau,
                NgayKetThuc,
                trangThaiKhoiTao
            ];

            await db.execute(sql, values);
            res.status(201).json({ message: "Tạo thành công", MaVoucher: String(MaVoucher).toUpperCase() });

        } catch (error) {
            console.error("Lỗi tạo voucher:", error);
            if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Mã Voucher này đã tồn tại!" });
            res.status(500).json({ message: "Lỗi server" });
        }
    }
};

module.exports = voucherController;