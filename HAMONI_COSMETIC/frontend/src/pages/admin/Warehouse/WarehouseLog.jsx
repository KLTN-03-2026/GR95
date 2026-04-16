import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import warehouseApi from "../../../services/warehouseApi";
import "./WarehouseLog.css";

const WarehouseLog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const type = new URLSearchParams(location.search).get("type") || "inbound";

    const [products, setProducts] = useState([]);
    const [items, setItems] = useState([]);
    const [loai, setLoai] = useState("");
    const [ghiChu, setGhiChu] = useState("");
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // ===== NOTIFICATION =====
    const showSuccess = (msg) => {
        setNotification({ type: "success", message: msg });
        setTimeout(() => setNotification(null), 3000);
    };

    const showError = (msg) => {
        setNotification({ type: "error", message: msg });
        setTimeout(() => setNotification(null), 3000);
    };

    // ===== LOAD DATA =====
    useEffect(() => {
        const fetch = async () => {
            const res = await warehouseApi.getProducts();
            setProducts(res);
        };
        fetch();
    }, []);

    // ===== CRUD ITEM =====
    const addItem = () => {
        setItems([...items, { MaBienThe: "", SoLuong: 0, GiaNhap: 0, stock: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = async (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === "MaBienThe") {
            const res = await warehouseApi.getStock(value);
            newItems[index].stock = res.SoLuongTon || 0;
        }

        setItems(newItems);
    };

    // ===== SUBMIT =====
    const handleSubmit = async () => {
        if (!loai) return showError("Chưa chọn loại nghiệp vụ");
        if (items.length === 0) return showError("Chưa có sản phẩm");

        for (let i of items) {
            if (!i.MaBienThe || i.SoLuong <= 0) {
                return showError("Dữ liệu sản phẩm không hợp lệ");
            }

            if (type === "outbound" && i.SoLuong > i.stock) {
                return showError("Không đủ tồn kho");
            }
        }

        const payload = {
            Loai: loai,
            GhiChu: ghiChu,
            items: items.map(i => ({
                MaBienThe: Number(i.MaBienThe),
                SoLuong: Number(i.SoLuong),
                GiaNhap: Number(i.GiaNhap || 0)
            }))
        };

        try {
            setLoading(true);

            if (type === "inbound") {
                await warehouseApi.createInbound(payload);
            } else {
                await warehouseApi.createOutbound(payload);
            }

            showSuccess("Thao tác kho thành công!");

            setTimeout(() => {
                navigate("/admin/warehouse");
            }, 1500);

        } catch (err) {
            console.error(err);
            showError("Có lỗi xảy ra!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="log-page-container">

            {/* ===== NOTIFICATION ===== */}
            {notification && (
                <div className={`alert-banner ${notification.type}`}>
                    <span>{notification.type === "success" ? "✔️" : "⚠️"}</span>
                    {notification.message}
                </div>
            )}

            <h1>{type === "inbound" ? "NHẬP KHO" : "XUẤT KHO"}</h1>

            {/* HEADER */}
            <div className="form-card">
                <label>Loại nghiệp vụ</label>
                <select
                    value={loai}
                    onChange={(e) => setLoai(e.target.value)}
                    className={!loai ? "input-error" : ""}
                >
                    {type === "inbound" ? (
                        <>
                            <option value="">-- Loại nhập --</option>
                            <option value="IMPORT">Nhập NCC</option>
                            <option value="RETURN">Hàng trả</option>
                        </>
                    ) : (
                        <>
                            <option value="">-- Loại xuất --</option>
                            <option value="SALE">Bán hàng</option>
                            <option value="SUPPLIER_RETURN">Trả NCC</option>
                            <option value="DESTROY">Tiêu hủy</option>
                        </>
                    )}
                </select>

                <label>Ghi chú</label>
                <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
            </div>

            {/* TABLE */}
            <div className="form-card">
                <h3>Danh sách sản phẩm</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Số lượng</th>
                            {type === "inbound" && <th>Giá nhập</th>}
                            <th>Tồn kho</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((item, index) => (
                            <tr
                                key={index}
                                className={item.SoLuong > item.stock ? "warning-row" : ""}
                            >
                                <td>
                                    <select
                                        value={item.MaBienThe}
                                        onChange={(e) =>
                                            updateItem(index, "MaBienThe", e.target.value)
                                        }
                                    >
                                        <option value="">-- Chọn --</option>
                                        {products.map(p => (
                                            <option key={p.MaBienThe} value={p.MaBienThe}>
                                                {p.TenSP} - {p.TenBienThe}
                                            </option>
                                        ))}
                                    </select>
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        value={item.SoLuong}
                                        onChange={(e) =>
                                            updateItem(index, "SoLuong", e.target.value)
                                        }
                                    />
                                </td>

                                {type === "inbound" && (
                                    <td>
                                        <input
                                            type="number"
                                            value={item.GiaNhap}
                                            onChange={(e) =>
                                                updateItem(index, "GiaNhap", e.target.value)
                                            }
                                        />
                                    </td>
                                )}

                                <td>{item.stock}</td>

                                <td>
                                    <button onClick={() => removeItem(index)}>X</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addItem}>+ Thêm sản phẩm</button>
            </div>

            {/* SUBMIT */}
            <button
                className={`submit-btn ${type === "outbound" ? "outbound" : ""}`}
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Đang xử lý..." : "Xác nhận"}
            </button>
        </div>
    );
};

export default WarehouseLog;