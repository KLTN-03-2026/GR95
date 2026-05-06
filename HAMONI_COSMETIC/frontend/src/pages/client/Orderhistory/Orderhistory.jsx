import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom'
import orderApi from "../../../services/orderApi";
import "./Orderhistory.css";

const ITEMS_PER_PAGE = 5;

const Orderhistory = () => {
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await orderApi.getMyOrderHistory({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        const data = Array.isArray(response?.data) ? response.data : [];
        const serverPagination = response?.pagination || {};

        if (isMounted) {
          setOrders(data);
          setPagination({
            currentPage: Number(serverPagination.currentPage || currentPage),
            limit: Number(serverPagination.limit || ITEMS_PER_PAGE),
            totalItems: Number(serverPagination.totalItems || 0),
            totalPages: Number(serverPagination.totalPages || 1),
          });
        }
      } catch (err) {
        if (isMounted) {
          const message = err?.response?.data?.message || "Không tải được lịch sử đơn hàng";
          setError(message);
          setOrders([]);
          setPagination({
            currentPage: 1,
            limit: ITEMS_PER_PAGE,
            totalItems: 0,
            totalPages: 1,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const handleChangePage = (page) => {
    if (page < 1 || page > pagination.totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  const formatMoney = (amount) => `${new Intl.NumberFormat("vi-VN").format(Number(amount || 0))}đ`;

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const mapStatusText = (status) => {
    switch (status) {
      case "DaGiao":
        return "HOÀN THÀNH";
      case "DangGiao":
        return "ĐANG GIAO";
      case "DaHuy":
        return "ĐÃ HỦY";
      case "ChoXacNhan":
        return "CHỜ XÁC NHẬN";
      case "ChoThanhToan":
        return "CHỜ THANH TOÁN";
      default:
        return String(status || "KHÔNG XÁC ĐỊNH").toUpperCase();
    }
  };

  const getStatusClass = (status) => {
    switch (mapStatusText(status)) {
      case "HOÀN THÀNH":
        return "completed";
      case "ĐANG GIAO":
        return "delivering";
      case "ĐÃ HỦY":
        return "cancelled";
      default:
        return "";
    }
  };

  return (
    <div className="order-page">
      <div className="container">
        {/* HEADER */}
        <div className="header">
          <p className="breadcrumb">TRANG CHỦ / TÀI KHOẢN</p>
          <h1>Lịch sử đơn hàng của tôi</h1>
        </div>

        {/* FILTER */}
        <div className="filter-bar">
          <div className="tabs">
            {["Tất cả", "Năm 2024"].map((item) => (
              <button
                key={item}
                className={activeFilter === item ? "active" : ""}
                onClick={() => setActiveFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        <div className="order-list">
          {loading && <p className="order-message">Đang tải lịch sử đơn hàng...</p>}
          {!loading && error && <p className="order-message error">{error}</p>}
          {!loading && !error && orders.length === 0 && (
            <p className="order-message">Bạn chưa có đơn hàng nào.</p>
          )}

          {!loading && !error && orders.map((item) => (
            <Link to={`/order/${item.id}`} key={item.id} className="no-underline">
              <div className="order-card">
              <div className="col">
                <p className="label">MÃ ĐƠN HÀNG</p>
                <h3>#{item.id}</h3>
              </div>

              <div className="col">
                <p className="label">NGÀY ĐẶT</p>
                <span>{formatDate(item.ngayDat)}</span>
              </div>

              <div className="col">
                <p className="label">TỔNG CỘNG</p>
                <span className="price">{formatMoney(item.tongTien)}</span>
              </div>

              <div className="col status-col">
                <span className={`status ${getStatusClass(item.trangThai)}`}>
                  {mapStatusText(item.trangThai)}
                </span>
              </div>

              <div className="col action">
                <span>{Number(item.tongSanPham || 0)} sản phẩm</span>
              </div>
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && pagination.totalPages > 1 && (
          <div className="pagination-wrap">
            <button
              className="page-btn"
              onClick={() => handleChangePage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Trước
            </button>

            <div className="page-list">
              {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  className={`page-btn ${page === currentPage ? "active" : ""}`}
                  onClick={() => handleChangePage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="page-btn"
              onClick={() => handleChangePage(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orderhistory;