const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db'); 

// Khởi tạo Gemini AI (Chỉ khai báo API Key ở ngoài, Model sẽ được cấu hình động ở bên trong)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = function(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 Kết nối mới: ${socket.id}`);

        socket.on('join_notification_room', (userId) => {
            const recipientId = Number(userId);
            if (Number.isInteger(recipientId) && recipientId > 0) {
                socket.join(`NOTIF_${recipientId}`);
            }
        });

        // Nhân viên CSKH tham gia phòng tổng để trực tin nhắn
        socket.on('join_staff_room', () => {
            socket.join('STAFF_ROOM');
            console.log(`Nhân viên đã tham gia trực chat.`);
        });

        // 1. KHÁCH HÀNG BẮT ĐẦU HOẶC TIẾP TỤC CHAT
        socket.on('join_chat', async (data) => {
            const { maND, sessionID } = data; 
            const roomName = maND ? `CUST_${maND}` : `GUEST_${sessionID}`;
            socket.join(roomName);

            try {
                let [rows] = await db.query(
                    `SELECT MaPhien, TrangThai FROM PhienChat 
                     WHERE (MaND = ? OR SessionID = ?) AND TrangThai != 'closed' 
                     ORDER BY MaPhien DESC LIMIT 1`, 
                    [maND || null, sessionID || null]
                );

                let maPhien;
                let currentStatus = 'bot';
                if (rows.length === 0 || (!maND && rows[0].TrangThai !== 'bot')) {
                    const [result] = await db.query(
                        `INSERT INTO PhienChat (MaND, SessionID, TrangThai) VALUES (?, ?, 'bot')`,
                        [maND || null, sessionID || null]
                    );
                    maPhien = result.insertId;
                } else {
                    maPhien = rows[0].MaPhien;
                    currentStatus = rows[0].TrangThai;
                }

                // --- LẤY LỊCH SỬ TIN NHẮN TỪ DATABASE ---
                const [historyRows] = await db.query(
                    `SELECT MaTinNhan, VaiTro, NoiDung, NgayGui 
                     FROM ChiTietChat WHERE MaPhien = ? ORDER BY NgayGui ASC`,
                    [maPhien]
                );

                const chatHistory = historyRows.map(msg => ({
                    id: msg.MaTinNhan,
                    senderType: msg.VaiTro === 'CUST' ? 'USER' : (msg.VaiTro === 'BOT' ? 'AI' : 'ADMIN'),
                    text: msg.NoiDung,
                    time: new Date(msg.NgayGui).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                }));

                // Gửi mã phiên và lịch sử về cho Frontend hiển thị
                socket.emit('chat_ready', { maPhien, roomName, history: chatHistory, status: currentStatus });
            } catch (error) {
                console.error("Lỗi khởi tạo phiên chat:", error);
            }
        });

        // 2. XỬ LÝ KHI KHÁCH HÀNG GỬI TIN NHẮN
        socket.on('send_message', async (data) => {
            const { maPhien, roomName, text, isHandoverToHuman } = data;

            try {
                // Lưu tin nhắn của Khách (CUST) vào DB
                await db.query(
                    `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'CUST', ?)`,
                    [maPhien, text]
                );

                // TẠO 1 ID DUY NHẤT CHỐNG ĐÚP TIN NHẮN
                const custMessageId = Date.now();
                const messageTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                // NẾU ĐANG CHỜ/GẶP NHÂN VIÊN
                if (isHandoverToHuman) {
                    try {
                        const [current] = await db.query(`SELECT TrangThai FROM PhienChat WHERE MaPhien = ?`, [maPhien]);
                        const currentStatus = current && current[0] ? current[0].TrangThai : null;
                        
                        if (currentStatus !== 'human') {
                            await db.query(`UPDATE PhienChat SET TrangThai = 'pending' WHERE MaPhien = ?`, [maPhien]);
                            io.to('STAFF_ROOM').emit('customer_waiting', { maPhien, roomName, text, time: messageTime });
                            // Phát monitor_message ĐÚNG 1 LẦN cho Admin
                            io.to('STAFF_ROOM').emit('monitor_message', { id: custMessageId, senderType: 'USER', text, maPhien, time: messageTime, status: 'pending' });
                        } else {
                            // Phát monitor_message ĐÚNG 1 LẦN cho Admin
                            io.to('STAFF_ROOM').emit('monitor_message', { id: custMessageId, senderType: 'USER', text, maPhien, time: messageTime, status: 'human' });
                        }
                    } catch (err) {
                        console.error('Lỗi khi kiểm tra trạng thái Handover:', err);
                    }
                    return; // Kết thúc hàm, không cho AI nhảy vào trả lời
                }

                // NẾU LÀ CHẾ ĐỘ BOT: Phát 1 lần cho Admin xem ké
                io.to('STAFF_ROOM').emit('monitor_message', { 
                    id: custMessageId, senderType: 'USER', text, maPhien, time: messageTime, status: 'bot' 
                });

                const [phien] = await db.query(`SELECT TrangThai FROM PhienChat WHERE MaPhien = ?`, [maPhien]);
                
                if (phien[0].TrangThai === 'bot') {
                    // =========================================================
                    // TÍCH HỢP RAG: LẤY CẤU HÌNH AI ĐỘNG TỪ DATABASE
                    // =========================================================
                    let promptCoBan = "Bạn là trợ lý AI của Hamoni Cosmetic. Hãy trả lời ngắn gọn, lịch sự.";
                    let duLieuHuanLuyen = "";
                    
                    try {
                        const [configRows] = await db.query('SELECT PromptCoBan, DuLieuHuanLuyen FROM CauHinhAI LIMIT 1');
                        if (configRows.length > 0) {
                            promptCoBan = configRows[0].PromptCoBan || promptCoBan;
                            duLieuHuanLuyen = configRows[0].DuLieuHuanLuyen || "";
                        }
                    } catch (err) {
                        console.error("Chưa có bảng CauHinhAI hoặc lỗi truy vấn, dùng prompt mặc định.");
                    }

                    // Ghép thành System Instruction hoàn chỉnh
                    const dynamicInstruction = `
${promptCoBan}

TÀI LIỆU KIẾN THỨC CỬA HÀNG (Sử dụng dữ liệu này để tư vấn cho khách):
"""
${duLieuHuanLuyen}
"""
                    `;

                    // Khởi tạo Model với Ngữ cảnh vừa nạp
                    const dynamicAiModel = genAI.getGenerativeModel({ 
                        model: "gemini-3.1-flash-lite-preview",
                        systemInstruction: dynamicInstruction
                    });
                    // =========================================================

                    // Lấy 5 tin nhắn cũ để AI nhớ nội dung trò chuyện
                    const [history] = await db.query(
                        `SELECT VaiTro, NoiDung FROM ChiTietChat 
                         WHERE MaPhien = ? ORDER BY NgayGui DESC LIMIT 5`,
                        [maPhien]
                    );
                    
                    let contextPrompt = "Lịch sử trò chuyện gần đây:\n";
                    history.reverse().forEach(msg => {
                        contextPrompt += `${msg.VaiTro}: ${msg.NoiDung}\n`;
                    });
                    contextPrompt += `\nCâu hỏi mới của CUST: ${text}`;

                    // Gọi AI sinh câu trả lời dựa trên bối cảnh
                    const result = await dynamicAiModel.generateContent(contextPrompt);
                    const aiResponse = result.response.text();

                    // Lưu câu trả lời của Bot
                    await db.query(
                        `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'BOT', ?)`,
                        [maPhien, aiResponse]
                    );

                    const aiMessageData = {
                        id: Date.now(),
                        senderType: 'BOT',
                        text: aiResponse,
                        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    };
                    
                    io.to(roomName).emit('receive_message', aiMessageData);
                    io.to('STAFF_ROOM').emit('monitor_message', { maPhien, ...aiMessageData });
                }
            } catch (error) {
                console.error("Lỗi xử lý tin nhắn chat:", error);
                io.to(roomName).emit('receive_message', {
                    id: Date.now(), senderType: 'BOT',
                    text: 'Mình đang gặp sự cố kết nối do quá tải. Bạn chờ vài phút rồi nhắn lại nhé.',
                    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                });
            }
        });

        // 3. XỬ LÝ KHI NHÂN VIÊN GỬI TIN NHẮN TRẢ LỜI KHÁCH
        socket.on('staff_send_message', async (data) => {
            const { id, maPhien, maNhanVien, roomName, text } = data; 
            try {
                // TÔN TRỌNG ID TỪ FRONTEND TRUYỀN LÊN ĐỂ CHỐNG ĐÚP
                const messageId = id || Date.now(); 
                const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                
                await db.query(
                    `UPDATE PhienChat SET MaNhanVienXuLy = ?, TrangThai = 'human' WHERE MaPhien = ?`,
                    [maNhanVien, maPhien]
                );
                await db.query(
                    `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'STAFF', ?)`,
                    [maPhien, text]
                );

                io.to(roomName).emit('receive_message', {
                    id: messageId, senderType: 'STAFF', text: text,
                    time: timeNow
                });
                
                io.to('STAFF_ROOM').emit('monitor_message', {
                    id: messageId, 
                    maPhien,
                    senderType: 'STAFF',
                    text,
                    time: timeNow,
                    status: 'human'
                });
            } catch (error) {
                console.error("Lỗi khi nhân viên gửi tin nhắn:", error);
            }
        });

        // 4. XỬ LÝ KHI NHÂN VIÊN/ADMIN KẾT THÚC CUỘC TRÒ CHUYỆN
        socket.on('end_chat', async (data) => {
            const { maPhien, roomName } = data;
            try {
                // Cập nhật trạng thái phiên chat về 'bot' để AI tiếp tục xử lý
                await db.query(
                    `UPDATE PhienChat SET TrangThai = 'bot', MaNhanVienXuLy = NULL WHERE MaPhien = ?`,
                    [maPhien]
                );

                // Thông báo cho khách hàng rằng phiên đã kết thúc, AI quay trở lại
                io.to(roomName).emit('chat_closed_by_admin');

                // Cập nhật danh sách phiên cho các nhân viên khác
                io.to('STAFF_ROOM').emit('monitor_message', {
                    maPhien,
                    text: 'Phiên hỗ trợ đã kết thúc. AI quay trở lại.',
                    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    status: 'bot'
                });
            } catch (error) {
                console.error("Lỗi khi kết thúc cuộc trò chuyện:", error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Đã ngắt kết nối: ${socket.id}`);
        });
    });
};