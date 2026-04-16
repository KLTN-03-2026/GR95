// src/controllers/voucherDetailController.js
const db = require('../config/db'); 

const voucherDetailController = {
    // [GET] /api/vouchers/:id - Lấy chi tiết 1 Voucher
    getDetail: async (req, res) => {
        try {
            const { id } = req.params;

            await db.execute(`
                UPDATE Voucher
                SET TrangThai = 'TamDung'
                WHERE MaVoucher = ?
                  AND TrangThai = 'KichHoat'
                  AND (SoLuong - IFNULL(SoLuongDaDung, 0)) <= 0
            `, [id]);
            
            // Lấy thông tin từ CSDL
            const [rows] = await db.execute(`SELECT * FROM Voucher WHERE MaVoucher = ?`, [id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá này!" });
            }

            const v = rows[0];
            
            // Đổi tên biến cho khớp với Form trên React (Adapter Pattern)
            const voucherDetail = {
                MaVoucher: v.MaVoucher,
                PhanTramGiam: v.PhanTramGiam,
                SoTienGiam: v.SoTienGiam,
                DonHangToiThieu: v.DonTaiThieu, 
                SoLuongToiDa: v.SoLuong,        
                SoLuongDaDung: v.SoLuongDaDung,
                NgayBatDau: v.NgayBatDau,
                NgayKetThuc: v.NgayKetThuc,
                TrangThai: v.TrangThai
            };

            res.status(200).json(voucherDetail);
        } catch (error) {
            console.error("Lỗi get chi tiết voucher:", error);
            res.status(500).json({ message: "Lỗi server khi lấy chi tiết" });
        }
    },

    // [PUT] /api/vouchers/:id - Cập nhật thông tin (Chỉ sửa Ngày, SL, Đơn tối thiểu)
    updateDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const { DonHangToiThieu, SoLuongToiDa, NgayBatDau, NgayKetThuc } = req.body;

            // Kiểm tra logic ngày tháng
            if (new Date(NgayKetThuc) < new Date(NgayBatDau)) {
                return res.status(400).json({ message: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu!" });
            }

            const sql = `
                UPDATE Voucher 
                SET DonTaiThieu = ?, SoLuong = ?, NgayBatDau = ?, NgayKetThuc = ?
                WHERE MaVoucher = ?
            `;
            const values = [DonHangToiThieu, SoLuongToiDa, NgayBatDau, NgayKetThuc, id];
            
            const [result] = await db.execute(sql, values);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá để cập nhật" });
            }

            await db.execute(`
                UPDATE Voucher
                SET TrangThai = 'TamDung'
                WHERE MaVoucher = ?
                  AND TrangThai = 'KichHoat'
                  AND (SoLuong - IFNULL(SoLuongDaDung, 0)) <= 0
            `, [id]);

            res.status(200).json({ message: "Cập nhật thông tin thành công" });
        } catch (error) {
            console.error("Lỗi cập nhật voucher:", error);
            res.status(500).json({ message: "Lỗi server khi cập nhật" });
        }
    },

    // [PATCH] /api/vouchers/:id/status - Đổi trạng thái Bật/Tắt
    toggleStatus: async (req, res) => {
        try {
            const { id } = req.params; 
            const { TrangThai } = req.body; 

            if (TrangThai === 'KichHoat') {
                const [rows] = await db.execute(
                    `SELECT SoLuong, IFNULL(SoLuongDaDung, 0) AS SoLuongDaDung FROM Voucher WHERE MaVoucher = ?`,
                    [id]
                );

                if (rows.length === 0) {
                    return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
                }

                const voucher = rows[0];
                const soLuongConLai = Number(voucher.SoLuong) - Number(voucher.SoLuongDaDung);

                if (soLuongConLai <= 0) {
                    await db.execute(`UPDATE Voucher SET TrangThai = 'TamDung' WHERE MaVoucher = ?`, [id]);
                    return res.status(400).json({ message: "Voucher đã hết lượt sử dụng, không thể kích hoạt." });
                }
            }

            const [result] = await db.execute(`UPDATE Voucher SET TrangThai = ? WHERE MaVoucher = ?`, [TrangThai, id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
            }
            
            res.status(200).json({ message: "Cập nhật trạng thái thành công" });
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error);
            res.status(500).json({ message: "Lỗi server khi đổi trạng thái" });
        }
    }
};

module.exports = voucherDetailController;