const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const db = require('../config/db'); // Đường dẫn tới file kết nối DB của bạn

// Cấu hình lưu tạm file trong bộ nhớ (Buffer) để xử lý nhanh
const upload = multer({ storage: multer.memoryStorage() });

// 1. API Lấy cấu hình hiện tại
router.get('/config', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT MaCauHinh, PromptCoBan, DuLieuHuanLuyen FROM CauHinhAI WHERE MaCauHinh = 1 LIMIT 1');

        if (rows.length === 0) {
            await db.query(
                'INSERT INTO CauHinhAI (MaCauHinh, PromptCoBan, DuLieuHuanLuyen) VALUES (1, ?, ?)',
                ['', '']
            );

            return res.json({
                success: true,
                config: {
                    maCauHinh: 1,
                    promptCoBan: '',
                    duLieuHuanLuyen: ''
                }
            });
        }

        const config = rows[0];
        res.json({
            success: true,
            config: {
                maCauHinh: config.MaCauHinh,
                promptCoBan: config.PromptCoBan || '',
                duLieuHuanLuyen: config.DuLieuHuanLuyen || ''
            }
        });
    } catch (error) {
        console.error('Lỗi lấy cấu hình AI:', error);
        res.status(500).json({ message: "Lỗi lấy cấu hình" });
    }
});

// 2. API Cập nhật Prompt và Huấn luyện file
router.post('/train', upload.single('file'), async (req, res) => {
    try {
        const { promptCoBan } = req.body;
        let extractedText = "";

        // Nếu admin có gửi kèm file (PDF hoặc Word)
        if (req.file) {
            const buffer = req.file.buffer;
            const mimeType = req.file.mimetype;

            if (mimeType === 'application/pdf') {
                const data = await pdfParse(buffer);
                extractedText = data.text;
            } 
            else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer: buffer });
                extractedText = result.value;
            }
        }

        const [currentRows] = await db.query('SELECT DuLieuHuanLuyen FROM CauHinhAI WHERE MaCauHinh = 1 LIMIT 1');
        const currentTrainingText = currentRows[0]?.DuLieuHuanLuyen || '';
        const nextTrainingText = extractedText || currentTrainingText;

        await db.query(
            `INSERT INTO CauHinhAI (MaCauHinh, PromptCoBan, DuLieuHuanLuyen)
             VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE
                PromptCoBan = VALUES(PromptCoBan),
                DuLieuHuanLuyen = VALUES(DuLieuHuanLuyen)`,
            [promptCoBan, nextTrainingText]
        );

        res.json({ 
            success: true, 
            message: "Đã huấn luyện AI thành công!",
            config: {
                maCauHinh: 1,
                promptCoBan: promptCoBan || '',
                duLieuHuanLuyen: nextTrainingText
            },
            textPreview: extractedText ? extractedText.substring(0, 500) + "..." : currentTrainingText
        });
    } catch (error) {
        console.error("Lỗi huấn luyện AI:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi xử lý file" });
    }
});

module.exports = router;