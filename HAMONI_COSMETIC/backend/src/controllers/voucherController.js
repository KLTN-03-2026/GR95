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

            if (!NgayBatDau || !NgayKetThuc) return res.status(400).json({ message: "Thiếu ngày!" });
            if (new Date(NgayKetThuc) < new Date(NgayBatDau)) return res.status(400).json({ message: "Ngày kết thúc bị sai!" });

            const giaTriGiam = Number(GiaTriGiam);
            const donHangToiThieu = Number(DonHangToiThieu) || 0;
            const soLuongToiDa = Number(SoLuongToiDa);

            const phanTramGiam = LoaiGiamGia === 'PhanTram' ? giaTriGiam : null;
            const soTienGiam = LoaiGiamGia === 'SoTien' ? giaTriGiam : null;
            const trangThaiKhoiTao = soLuongToiDa > 0 ? 'KichHoat' : 'TamDung';

            const sql = `
                INSERT INTO Voucher 
                (MaVoucher, PhanTramGiam, SoTienGiam, GiamToiDa, DonTaiThieu, SoLuong, SoLuongDaDung, NgayBatDau, NgayKetThuc, TrangThai) 
                VALUES (?, ?, ?, NULL, ?, ?, 0, ?, ?, ?)
            `;
            const values = [
                String(MaVoucher).toUpperCase(),
                phanTramGiam,
                soTienGiam,
                donHangToiThieu,
                soLuongToiDa,
                NgayBatDau,
                NgayKetThuc,
                trangThaiKhoiTao
            ];

            await db.execute(sql, values);
            res.status(201).json({ message: "Tạo thành công", MaVoucher });

        } catch (error) {
            console.error("Lỗi tạo voucher:", error);
            if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Mã Voucher này đã tồn tại!" });
            res.status(500).json({ message: "Lỗi server" });
        }
    }
};

module.exports = voucherController;