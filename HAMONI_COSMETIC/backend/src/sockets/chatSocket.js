const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../config/db");

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Kết nối mới: ${socket.id}`);

    socket.on("join_notification_room", (userId) => {
      const recipientId = Number(userId);
      if (Number.isInteger(recipientId) && recipientId > 0) {
        socket.join(`NOTIF_${recipientId}`);
      }
    });

    socket.on("join_staff_room", () => {
      socket.join("STAFF_ROOM");
      console.log(`Nhân viên đã tham gia trực chat.`);
    });

    // 1. KHÁCH HÀNG BẮT ĐẦU HOẶC TIẾP TỤC CHAT
    socket.on("join_chat", async (data) => {
      const { maND, sessionID } = data;
      const roomName = maND ? `CUST_${maND}` : `GUEST_${sessionID}`;
      socket.join(roomName);

      try {
        let rows = [];

        if (maND) {
          [rows] = await db.query(
            `SELECT MaPhien, TrangThai FROM PhienChat 
             WHERE MaND = ? AND TrangThai != 'closed' 
             ORDER BY MaPhien DESC LIMIT 1`,
            [maND],
          );
        } else {
          [rows] = await db.query(
            `SELECT MaPhien, TrangThai FROM PhienChat 
             WHERE SessionID = ? AND TrangThai != 'closed' 
             ORDER BY MaPhien DESC LIMIT 1`,
            [sessionID || null],
          );
        }

        let maPhien;
        let currentStatus = "bot";
        if (rows.length === 0 || (!maND && rows[0].TrangThai !== "bot")) {
          const [result] = await db.query(
            `INSERT INTO PhienChat (MaND, SessionID, TrangThai) VALUES (?, ?, 'bot')`,
            [maND || null, sessionID || null],
          );
          maPhien = result.insertId;
        } else {
          maPhien = rows[0].MaPhien;
          currentStatus = rows[0].TrangThai;
        }

        const [historyRows] = await db.query(
          `SELECT MaTinNhan, VaiTro, NoiDung, NgayGui 
           FROM ChiTietChat WHERE MaPhien = ? ORDER BY NgayGui ASC`,
          [maPhien],
        );

        const chatHistory = historyRows.map((msg) => ({
          id: msg.MaTinNhan,
          senderType:
            msg.VaiTro === "CUST"
              ? "USER"
              : msg.VaiTro === "BOT"
                ? "AI"
                : "ADMIN",
          text: msg.NoiDung,
          time: new Date(msg.NgayGui).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        }));

        socket.emit("chat_ready", {
          maPhien,
          roomName,
          history: chatHistory,
          status: currentStatus,
        });
      } catch (error) {
        console.error("Lỗi khởi tạo phiên chat:", error);
      }
    });

    // 2. XỬ LÝ KHI KHÁCH HÀNG GỬI TIN NHẮN
    socket.on("send_message", async (data) => {
      const { maPhien, roomName, text, isHandoverToHuman } = data;

      try {
        await db.query(
          `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'CUST', ?)`,
          [maPhien, text],
        );

        const custMessageId = Date.now();
        const messageTime = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        if (isHandoverToHuman) {
          try {
            const [current] = await db.query(
              `SELECT TrangThai FROM PhienChat WHERE MaPhien = ?`,
              [maPhien],
            );
            const currentStatus =
              current && current[0] ? current[0].TrangThai : null;

            if (currentStatus !== "human") {
              await db.query(
                `UPDATE PhienChat SET TrangThai = 'pending' WHERE MaPhien = ?`,
                [maPhien],
              );
              io.to("STAFF_ROOM").emit("customer_waiting", {
                maPhien,
                roomName,
                text,
                time: messageTime,
              });
              io.to("STAFF_ROOM").emit("monitor_message", {
                id: custMessageId,
                senderType: "USER",
                text,
                maPhien,
                time: messageTime,
                status: "pending",
              });
            } else {
              io.to("STAFF_ROOM").emit("monitor_message", {
                id: custMessageId,
                senderType: "USER",
                text,
                maPhien,
                time: messageTime,
                status: "human",
              });
            }
          } catch (err) {
            console.error("Lỗi khi kiểm tra trạng thái Handover:", err);
          }
          return;
        }

        io.to("STAFF_ROOM").emit("monitor_message", {
          id: custMessageId,
          senderType: "USER",
          text,
          maPhien,
          time: messageTime,
          status: "bot",
        });

        const [phien] = await db.query(
          `SELECT TrangThai FROM PhienChat WHERE MaPhien = ?`,
          [maPhien],
        );

        if (phien[0].TrangThai === "bot") {
          // =========================================================
          // TÍCH HỢP RAG: LẤY CẤU HÌNH AI ĐỘNG TỪ DATABASE
          // =========================================================
          let promptCoBan =
            "Bạn là trợ lý AI của Hamoni Cosmetic. Hãy trả lời ngắn gọn, lịch sự.";
          let duLieuHuanLuyen = "";

          try {
            const [configRows] = await db.query(
              "SELECT PromptCoBan, DuLieuHuanLuyen FROM CauHinhAI LIMIT 1",
            );
            if (configRows.length > 0) {
              promptCoBan = configRows[0].PromptCoBan || promptCoBan;
              duLieuHuanLuyen = configRows[0].DuLieuHuanLuyen || "";
            }
          } catch (err) {
            console.error("Lỗi lấy cấu hình AI, dùng prompt mặc định.");
          }

          // 👉 ĐÃ UPDATE: Truy xuất đồng thời bảng Sản phẩm và Biến thể bằng câu lệnh JOIN
          let dsSanPham = "";
          try {
            const [rows] = await db.query(`
    SELECT sp.MaSP, sp.TenSP, bt.MaBienThe, bt.TenBienThe, bt.Gia 
    FROM SanPham sp
    JOIN BienTheSanPham bt ON sp.MaSP = bt.MaSP
  `);

            if (rows.length > 0) {
              // Gom nhóm các biến thể theo từng sản phẩm để AI dễ đọc
              const groupedProducts = rows.reduce((acc, current) => {
                if (!acc[current.MaSP]) {
                  acc[current.MaSP] = {
                    id: current.MaSP,
                    name: current.TenSP,
                    variants: [],
                  };
                }
                acc[current.MaSP].variants.push({
                  variantId: current.MaBienThe,
                  variantName: current.TenBienThe,
                  price: current.Gia,
                });
                return acc;
              }, {});

              // Chuyển đổi object gom nhóm thành chuỗi văn bản cho Prompt
              dsSanPham = Object.values(groupedProducts)
                .map((p) => {
                  const variantText = p.variants
                    .map(
                      (v) =>
                        `   + Phân loại: ${v.variantName} - Giá: ${Number(v.price).toLocaleString("vi-VN")}đ`,
                    )
                    .join("\n");
                  return `- ${p.name} (Mã SP để tạo link: ${p.id})\n${variantText}`;
                })
                .join("\n\n");
            }
          } catch (error) {
            console.error("Lỗi lấy danh sách sản phẩm và biến thể:", error);
          }

          // 👉 HÀNG RÀO BẢO VỆ PROMPT ĐƯỢC THIẾT KẾ LẠI
          const dynamicInstruction = `
${promptCoBan}

**QUY TẮC BẮT BUỘC TẠO LINK MUA HÀNG:**
Khi bạn giới thiệu bất kỳ sản phẩm nào có tên trong danh sách dưới đây, bạn **PHẢI** chèn thêm cú pháp "[XEM_NGAY|Mã_Sản_Phẩm]" ngay sau tên sản phẩm đó.
Ví dụ: "Bạn có thể tham khảo dòng Kem Chống Nắng HAMONI [XEM_NGAY|1] hiện có các phân loại dung tích phù hợp với da của bạn."
*Lưu ý:* Sử dụng **CHÍNH XÁC số Mã SP** (Ví dụ: 1, 2, 3...) được cung cấp, tuyệt đối không chèn mã biến thể hay tự thêm chữ vào ID.

**DANH SÁCH SẢN PHẨM & CÁC BIẾN THỂ HIỆN CÓ TRONG KHO:**
${dsSanPham}

TÀI LIỆU KIẾN THỨC CHUYÊN SÂU VỀ MỸ PHẨM VÀ DA LIỄU (Sử dụng kiến thức này để tư vấn):
"""
${duLieuHuanLuyen}
"""
`;

          const dynamicAiModel = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            systemInstruction: dynamicInstruction,
          });
          // =========================================================

          const [history] = await db.query(
            `SELECT VaiTro, NoiDung FROM ChiTietChat 
             WHERE MaPhien = ? ORDER BY NgayGui DESC LIMIT 5`,
            [maPhien],
          );

          let contextPrompt = "Lịch sử trò chuyện gần đây:\n";
          history.reverse().forEach((msg) => {
            contextPrompt += `${msg.VaiTro}: ${msg.NoiDung}\n`;
          });
          contextPrompt += `\nCâu hỏi mới của CUST: ${text}`;

          const result = await dynamicAiModel.generateContent(contextPrompt);
          const aiResponse = result.response.text();

          await db.query(
            `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'BOT', ?)`,
            [maPhien, aiResponse],
          );

          const aiMessageData = {
            id: Date.now(),
            senderType: "BOT",
            text: aiResponse,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          };

          io.to(roomName).emit("receive_message", aiMessageData);
          io.to("STAFF_ROOM").emit("monitor_message", {
            maPhien,
            ...aiMessageData,
          });
        }
      } catch (error) {
        console.error("Lỗi xử lý tin nhắn chat:", error);
        io.to(roomName).emit("receive_message", {
          id: Date.now(),
          senderType: "BOT",
          text: "Mình đang gặp sự cố kết nối do quá tải. Bạn chờ vài phút rồi nhắn lại nhé.",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        });
      }
    });

    // 3. XỬ LÝ KHI NHÂN VIÊN GỬI TIN NHẮN TRẢ LỜI KHÁCH
    socket.on("staff_send_message", async (data) => {
      const { id, maPhien, maNhanVien, roomName, text } = data;
      try {
        const messageId = id || Date.now();
        const timeNow = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        await db.query(
          `UPDATE PhienChat SET MaNhanVienXuLy = ?, TrangThai = 'human' WHERE MaPhien = ?`,
          [maNhanVien, maPhien],
        );
        await db.query(
          `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'STAFF', ?)`,
          [maPhien, text],
        );

        io.to(roomName).emit("receive_message", {
          id: messageId,
          senderType: "STAFF",
          text: text,
          time: timeNow,
        });

        io.to("STAFF_ROOM").emit("monitor_message", {
          id: messageId,
          maPhien,
          senderType: "STAFF",
          text,
          time: timeNow,
          status: "human",
        });
      } catch (error) {
        console.error("Lỗi khi nhân viên gửi tin nhắn:", error);
      }
    });

    // 4. XỬ LÝ KHI NHÂN VIÊN/ADMIN KẾT THÚC CUỘC TRÒ CHUYỆN
    socket.on("end_chat", async (data) => {
      const { maPhien, roomName } = data;
      try {
        await db.query(
          `UPDATE PhienChat SET TrangThai = 'bot', MaNhanVienXuLy = NULL WHERE MaPhien = ?`,
          [maPhien],
        );

        io.to(roomName).emit("chat_closed_by_admin");

        io.to("STAFF_ROOM").emit("monitor_message", {
          maPhien,
          text: "Phiên hỗ trợ đã kết thúc. AI quay trở lại.",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          status: "bot",
        });
      } catch (error) {
        console.error("Lỗi khi kết thúc cuộc trò chuyện:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Đã ngắt kết nối: ${socket.id}`);
    });
  });
};
