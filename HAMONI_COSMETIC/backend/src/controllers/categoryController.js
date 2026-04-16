const db = require('../config/db');
const ExcelJS = require('exceljs'); 


exports.getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM DANHMUC'; 
    let params = [];

    if (search) {
      sql += ' WHERE MaDM LIKE ? OR TenDM LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa danh mục
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // Xóa theo cột MaDM
    await db.execute('DELETE FROM DANHMUC WHERE MaDM = ?', [id]);
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// THÊM DANH MỤC
exports.createCategory = async (req, res) => {
  try {
    const { MaDM, TenDM } = req.body; 
    
    
    const sql = 'INSERT INTO DANHMUC (MaDM, TenDM) VALUES (?, ?)';
    await db.execute(sql, [MaDM, TenDM]); 
    
    res.status(201).json({ message: "Thêm thành công" });
  } catch (error) {
    
    res.status(500).json({ message: "Lỗi SQL: " + error.message });
  }
};

// CẬP NHẬT DANH MỤC
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenDM } = req.body; 

    const sql = 'UPDATE DANHMUC SET TenDM = ? WHERE MaDM = ?';
    await db.execute(sql, [TenDM, id]);

    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    
    res.status(500).json({ message: "Lỗi "+ error.message });
  }
  
};
// XUẤT FILE EXCEL
exports.exportCategoryExcel = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT MaDM, TenDM FROM DANHMUC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh_Muc_San_Pham');

    // Tạo cột cho file Excel
    worksheet.columns = [
      { header: 'Mã Danh Mục', key: 'MaDM', width: 15 },
      { header: 'Tên Danh Mục', key: 'TenDM', width: 30 }
    ];

    // Đổ style cho header (Tô màu vàng cho đẹp)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1C40F' } // Màu vàng Hamoni
    };

    // Thêm dữ liệu vào
    worksheet.addRows(rows);

    // Cấu hình header để trình duyệt tự động tải file về
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=DanhMuc_Hamoni.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Lỗi xuất file: " + error.message });
  }
};