// src/controllers/productController.js
const db = require('../config/db');

const getAllProducts = async (req, res) => {
    try {
        // 1. Nhận tham số từ Frontend gửi lên (có giá trị mặc định nếu rỗng)
        const search = req.query.search || '';
        const category = req.query.category || 'all';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const offset = (page - 1) * limit;

        // 2. Khởi tạo câu truy vấn gốc và mảng chứa giá trị truyền vào (Params)
        let query = `SELECT MaSP, MaDM, TenSP, ThanhPhan, NgayTao FROM SanPham WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM SanPham WHERE 1=1`;
        let queryParams = [];

        // 3. Lắp ráp điều kiện LỌC THEO DANH MỤC
        if (category !== 'all') {
            query += ` AND MaDM = ?`;
            countQuery += ` AND MaDM = ?`;
            queryParams.push(category);
        }

        // 4. Lắp ráp điều kiện TÌM KIẾM (Tìm theo Tên, Mã SP hoặc Thành phần)
        if (search) {
            query += ` AND (TenSP LIKE ? OR MaSP LIKE ? OR ThanhPhan LIKE ?)`;
            countQuery += ` AND (TenSP LIKE ? OR MaSP LIKE ? OR ThanhPhan LIKE ?)`;
            const searchPattern = `%${search}%`;
            // Push 3 lần vì có 3 dấu chấm hỏi (?)
            queryParams.push(searchPattern, searchPattern, searchPattern); 
        }

        // 5. Thêm lệnh sắp xếp (Mới nhất lên đầu) và Phân trang (LIMIT, OFFSET)
        // Một số phiên bản MySQL không hỗ trợ bind LIMIT/OFFSET với prepared statements.
        // page/limit đã được ép kiểu số nguyên ở trên nên có thể nội suy an toàn.
        query += ` ORDER BY NgayTao DESC LIMIT ${limit} OFFSET ${offset}`;

        // 6. Thực thi truy vấn song song (Lấy tổng số dòng và Lấy dữ liệu)
        const [dataResult, countResult] = await Promise.all([
            db.execute(query, queryParams),
            db.execute(countQuery, queryParams) // Count không cần LIMIT/OFFSET
        ]);

        const totalRecords = countResult[0][0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        // 7. Trả kết quả về cho React
        res.status(200).json({
            data: dataResult[0], // Mảng chứa danh sách sản phẩm
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalRecords
            }
        });

    } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tải dữ liệu!" });
    }
};

module.exports = { getAllProducts };