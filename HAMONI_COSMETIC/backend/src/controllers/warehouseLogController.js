const db = require("../config/db");

// ===== GET PRODUCTS =====
exports.getProducts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                bt.MaBienThe,
                sp.TenSP,
                bt.TenBienThe,
                bt.Gia
            FROM BienTheSanPham bt
            JOIN SanPham sp ON bt.MaSP = sp.MaSP
        `);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ===== GET STOCK =====
exports.getStock = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT SoLuongTon 
            FROM TonKho 
            WHERE MaBienThe = ?
        `, [id]);

        res.json(rows[0] || { SoLuongTon: 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ===== INBOUND =====
exports.createInbound = async (req, res) => {
    const conn = await db.getConnection();

    try {
        const { items, GhiChu } = req.body;

        if (!items || items.length === 0) {
            throw new Error("Không có sản phẩm");
        }

        await conn.beginTransaction();

        for (const i of items) {
            const { MaBienThe, SoLuong, GiaNhap } = i;

            // update tồn
            await conn.query(`
                INSERT INTO TonKho (MaKho, MaBienThe, SoLuongTon)
                VALUES (1, ?, ?)
                ON DUPLICATE KEY UPDATE SoLuongTon = SoLuongTon + ?
            `, [MaBienThe, SoLuong, SoLuong]);

            // lấy tồn mới
            const [[stock]] = await conn.query(`
                SELECT SoLuongTon FROM TonKho WHERE MaBienThe = ?
            `, [MaBienThe]);

            // log
            await conn.query(`
                INSERT INTO LogTonKho 
                (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, GhiChu)
                VALUES (?, 'NHAP', ?, ?, ?)
            `, [MaBienThe, SoLuong, stock.SoLuongTon, GhiChu]);
        }

        await conn.commit();

        res.json({ message: "Nhập kho thành công" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ===== OUTBOUND =====
exports.createOutbound = async (req, res) => {
    const conn = await db.getConnection();

    try {
        const { items, GhiChu } = req.body;

        if (!items || items.length === 0) {
            throw new Error("Không có sản phẩm");
        }

        await conn.beginTransaction();

        for (const i of items) {
            const { MaBienThe, SoLuong } = i;

            const [[stock]] = await conn.query(`
                SELECT SoLuongTon FROM TonKho WHERE MaBienThe = ?
            `, [MaBienThe]);

            if (!stock || stock.SoLuongTon < SoLuong) {
                throw new Error(`Không đủ tồn kho cho SP ${MaBienThe}`);
            }

            // trừ kho
            await conn.query(`
                UPDATE TonKho 
                SET SoLuongTon = SoLuongTon - ?
                WHERE MaBienThe = ?
            `, [SoLuong, MaBienThe]);

            // log
            await conn.query(`
                INSERT INTO LogTonKho 
                (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, GhiChu)
                VALUES (?, 'XUAT', ?, ?, ?)
            `, [MaBienThe, -SoLuong, stock.SoLuongTon - SoLuong, GhiChu]);
        }

        await conn.commit();

        res.json({ message: "Xuất kho thành công" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};