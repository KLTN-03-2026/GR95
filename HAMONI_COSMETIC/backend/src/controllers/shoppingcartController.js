const db = require('../config/db');

const shoppingcartController = {

    // 1. LẤY GIỎ HÀNG
    getCartItems: async (req, res) => {
        try {
            const maKhachHang = req.user?.maND || req.params.maKhachHang || req.query.maKhachHang;
            if (!maKhachHang) {
                return res.status(400).json({ success: false, message: "Thiếu mã khách hàng" });
            }
            const query = `
                SELECT 
                    gh.MaND, gh.MaBienThe, gh.SoLuong, gh.IsSelected,
                    bt.TenBienThe, bt.Gia, 
                    tk.SoLuongTon,
                    sp.TenSP, 
                    h.DuongDanAnh
                FROM (
                    SELECT
                        MaND,
                        MaBienThe,
                        SUM(SoLuong) AS SoLuong,
                        MAX(COALESCE(IsSelected, 1)) AS IsSelected
                    FROM GioHang
                    WHERE MaND = ?
                    GROUP BY MaND, MaBienThe
                ) gh
                JOIN BienTheSanPham bt ON gh.MaBienThe = bt.MaBienThe
                JOIN SanPham sp ON bt.MaSP = sp.MaSP
                LEFT JOIN TonKho tk ON bt.MaBienThe = tk.MaBienThe
                LEFT JOIN (
                    SELECT
                        MaThamChieu,
                        COALESCE(
                            MAX(CASE WHEN LaAnhChinh = 1 THEN DuongDanAnh END),
                            MIN(DuongDanAnh)
                        ) AS DuongDanAnh
                    FROM HinhAnh
                    GROUP BY MaThamChieu
                ) h ON h.MaThamChieu = sp.MaSP
            `;
            const [rows] = await db.query(query, [maKhachHang]);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error("❌ Lỗi GetCart:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    },

    // 2. THÊM SẢN PHẨM VÀO GIỎ
    addToCart: async (req, res) => {
        const conn = await db.getConnection();
        try {
            const { maKhachHang, maBienThe, soLuong } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            if (!maBienThe || !soLuong || Number(soLuong) <= 0) {
                return res.status(400).json({ success: false, message: "Dữ liệu thêm giỏ hàng không hợp lệ" });
            }

            await conn.beginTransaction();

            const [stock] = await conn.query(`SELECT SoLuongTon FROM TonKho WHERE MaBienThe = ? FOR UPDATE`, [maBienThe]);

            if (stock.length === 0) return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });

            const [check] = await conn.query(
`SELECT COALESCE(SUM(SoLuong), 0) AS SoLuongTrongGio, COALESCE(MAX(IsSelected), 1) AS IsSelected
                 FROM GioHang WHERE MaND = ? AND MaBienThe = ? FOR UPDATE`,
                [targetMaND, maBienThe]
            );
            const soLuongTrongGio = Number(check?.[0]?.SoLuongTrongGio || 0);
            const isSelected = Number(check?.[0]?.IsSelected ?? 1);
            const soLuongMoi = soLuongTrongGio + Number(soLuong);
            
            const soLuongTonKho = Number(stock[0].SoLuongTon || 0);

            if (soLuongMoi > soLuongTonKho) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message:
                        `Bạn đã có ${soLuongTrongGio} sản phẩm trong giỏ hàng. ` +
                        `Không thể thêm số lượng đã chọn vào giỏ hàng vì sẽ vượt quá giới hạn mua hàng của bạn.`
                });
            }

            await conn.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            await conn.query(
                `INSERT INTO GioHang (MaND, MaBienThe, SoLuong, IsSelected) VALUES (?, ?, ?, ?)`,
                [targetMaND, maBienThe, soLuongMoi, isSelected]
            );

            await conn.commit();
            res.json({ success: true, message: "Đã thêm vào giỏ" });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
        } finally {
            if (conn) conn.release();
        }
    },

    // 3. CẬP NHẬT GIỎ HÀNG
    updateCartItem: async (req, res) => {
        const conn = await db.getConnection();
        try {
            const { maKhachHang, maBienThe, soLuong, isSelected } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            if (!maBienThe || !soLuong || Number(soLuong) <= 0) {
                return res.status(400).json({ success: false, message: "Dữ liệu cập nhật giỏ hàng không hợp lệ" });
            }

            await conn.beginTransaction();
            const [stock] = await conn.query(`SELECT SoLuongTon FROM TonKho WHERE MaBienThe = ? FOR UPDATE`, [maBienThe]);

            const soLuongTonKho = Number(stock?.[0]?.SoLuongTon || 0);

            if (stock.length > 0 && Number(soLuong) > soLuongTonKho) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Không thể cập nhật giỏ hàng vì số lượng đã chọn vượt quá tồn kho hiện tại (tối đa ${soLuongTonKho} sản phẩm).`
                });
            }

            await conn.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            await conn.query(
                `INSERT INTO GioHang (MaND, MaBienThe, SoLuong, IsSelected) VALUES (?, ?, ?, ?)`,
                [targetMaND, maBienThe, Number(soLuong), Number(isSelected) === 1 ? 1 : 0]
            );

            await conn.commit();
            res.json({ success: true });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
} finally {
            if (conn) conn.release();
        }
    },

    // 4. XÓA SẢN PHẨM
    removeCartItem: async (req, res) => {
        try {
            const { maKhachHang, maBienThe } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            await db.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    },

    // 5. GIỮ HÀNG (CHỈ KIỂM TRA TẠM, KHÔNG TRỪ KHO)
    holdStockFromCart: async (req, res) => {
        const conn = await db.getConnection(); 
        try {
            await conn.beginTransaction();
            const maKhachHang = req.body.maKhachHang || req.user?.maND;
            if (!maKhachHang) {
                await conn.rollback();
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            const [items] = await conn.query(`
                SELECT gh.MaBienThe, gh.SoLuong, tk.SoLuongTon, sp.TenSP
                FROM GioHang gh
                JOIN TonKho tk ON gh.MaBienThe = tk.MaBienThe
                JOIN BienTheSanPham bt ON gh.MaBienThe = bt.MaBienThe
                JOIN SanPham sp ON bt.MaSP = sp.MaSP
                WHERE gh.MaND = ? AND gh.IsSelected = 1
                FOR UPDATE
            `, [maKhachHang]);

            if (items.length === 0) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: "Chưa chọn sản phẩm" });
            }

            for (let item of items) {
                if (item.SoLuong > item.SoLuongTon) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: `"${item.TenSP}" không đủ hàng` });
                }
            }

            await conn.commit();
            res.json({ success: true, message: "Đã giữ tạm sản phẩm để thanh toán" });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
        } finally {
            if (conn) conn.release();
        }
    },

    // 6. CHUYỂN SANG MỤC YÊU THÍCH
    moveToWishlist: async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const { maKhachHang, items } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                await conn.rollback();
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }

            if (!items || items.length === 0) {
                await conn.rollback();
return res.status(400).json({ success: false });
            }

            for (let maBienThe of items) {
                await conn.query(`INSERT IGNORE INTO DanhSachYeuThich (MaND, MaBienThe) VALUES (?, ?)`, [targetMaND, maBienThe]);
                await conn.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            }

            await conn.commit();
            res.json({ success: true });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
        } finally {
            if (conn) conn.release();
        }
    }
};

module.exports = shoppingcartController;