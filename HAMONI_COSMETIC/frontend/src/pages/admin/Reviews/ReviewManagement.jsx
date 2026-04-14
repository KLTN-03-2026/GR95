import React, { useState, useEffect, useCallback } from 'react';
import './ReviewManagement.css';
import reviewApi from '../../../services/reviewApi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ReviewManagement = () => {
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState('ALL');
    const [rating, setRating] = useState('ALL');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [selectedReview, setSelectedReview] = useState(null);
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            let startDate = dateRange.start;
            let endDate = dateRange.end;

            if (startDate) startDate = `${startDate} 00:00:00`;
            if (endDate) endDate = `${endDate} 23:59:59`;

            const [statsData, reviewsData] = await Promise.all([
                reviewApi.getStats(),
                reviewApi.getAll({
                    status: filter,
                    rating: rating,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                })
            ]);

            setStats(statsData || { total: 0, pending: 0 });
            setReviews(reviewsData || []);

        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    }, [filter, rating, dateRange.start, dateRange.end]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, rating, dateRange.start, dateRange.end]);

    const getStatusConfig = (status) => {
        const configs = {
            'DA_PHAN_HOI': { text: 'ĐÃ PHẢN HỒI', className: 'status-replied' },
            'CHUA_PHAN_HOI': { text: 'CHƯA PHẢN HỒI', className: 'status-pending' }
        };
        return configs[status] || { text: status, className: '' };
    };

    const filteredReviews = reviews;

    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredReviews.slice(startIndex, startIndex + itemsPerPage);

    // BỎ DÒNG NÀY VÌ ĐÃ CÓ CHECK LOADING BÊN DƯỚI
    // if (loading) return <div className="loading-hamoni">Đang tải dữ liệu...</div>;

    return (
        <>
            {/* Đặt ToastContainer ở đây để nó không bao giờ bị unmount khi loading */}
            <ToastContainer 
                position="top-right" 
                autoClose={3000}
                newestOnTop
                closeOnClick
                pauseOnHover
                style={{ zIndex: 99999999 }}
            />

            {loading ? (
                <div className="loading-hamoni">Đang tải dữ liệu...</div>
            ) : (
                <div className="review-management-container">
                    <h1 className="page-title">QUẢN LÝ ĐÁNH GIÁ</h1>

                    <section className="stats-section">
                        <div className="stat-card">
                            <span className="stat-label">TỔNG ĐÁNH GIÁ</span>
                            <h2 className="stat-number">{stats.total?.toLocaleString() || 0}</h2>
                        </div>

                        <div className="stat-card highlight-card">
                            <div className="stat-card-header">
                                <span className="stat-label">CHƯA PHẢN HỒI</span>
                                <h2 className="stat-number">{stats.pending || 0}</h2>
                            </div>
                    
                            <button 
                                className="stat-action-link" 
                                onClick={() => setFilter('CHUA_PHAN_HOI')}
                            >
                                Xem ngay danh sách
                            </button>
                        </div>
                    </section>

                    <main className="table-wrapper">
                        {/* ✅ LỌC NGÀY */}
                        <div className="table-controls">
                            <span style={{ marginRight: 10, fontWeight: 'bold' }}>
                                Lọc theo ngày:
                            </span>

                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) =>
                                    setDateRange(prev => ({ ...prev, start: e.target.value }))
                                }
                            />

                            <span style={{ margin: '0 5px' }}>-</span>

                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) =>
                                    setDateRange(prev => ({ ...prev, end: e.target.value }))
                                }
                            />

                            {/* giữ filter sao */}
                            <select 
                                style={{ marginLeft: 'auto' }}
                                value={rating}
                                onChange={(e) => setRating(e.target.value)}
                            >
                                <option value="ALL">Tất cả sao</option>
                                <option value="5">5 sao</option>
                                <option value="4">4 sao</option>
                                <option value="3">3 sao</option>
                                <option value="2">2 sao</option>
                                <option value="1">1 sao</option>
                            </select>
                        </div>

                        <table className="hamoni-table">
                            <thead>
                                <tr>
                                    <th>KHÁCH HÀNG</th>
                                    <th>SẢN PHẨM</th>
                                    <th>ĐÁNH GIÁ</th>
                                    <th>NHẬN XÉT</th>
                                    <th>TRẠNG THÁI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? (
                                    currentData.map((item) => {
                                        const status = getStatusConfig(item.TrangThai);
                                        return (
                                            <tr 
                                                key={item.MaDG}
                                                className="review-row"
                                                onClick={() => setSelectedReview(item)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>
                                                    <div className="customer-info">
                                                        <img 
                                                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.HoTen}`} 
                                                            alt="avatar" 
                                                            className="customer-avatar" 
                                                        />
                                                        <div className="customer-text">
                                                            <p className="customer-name">{item.HoTen}</p>
                                                            <p className="review-date">
                                                                {new Date(item.NgayDanhGia).toLocaleDateString('vi-VN')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="product-cell">{item.TenSP}</td>

                                                <td>
                                                    <div className="stars">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span 
                                                                key={i} 
                                                                className={i < item.SoSao ? "star-icon filled" : "star-icon"}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="comment-cell">"{item.BinhLuan}"</td>

                                                <td>
                                                    <span className={`status-badge ${status.className}`}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-data">Không có đánh giá.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <footer className="table-footer">
                            <span className="pagination-info">
                                Hiển thị {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredReviews.length)} 
                                trong tổng số {stats.total} đánh giá
                            </span>

                            <div className="pagination-wrapper">
                                <button 
                                    className="pagi-arrow"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    ‹
                                </button>

                                <div className="pagi-numbers-group">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                        <button
                                            key={pageNum}
                                            className={`pagi-item ${currentPage === pageNum ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    className="pagi-arrow"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    ›
                                </button>
                            </div>
                        </footer>
                    </main>

                    {/* MODAL CHI TIẾT */}
                    {selectedReview && (
                        <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
                            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                                <h2>Chi tiết đánh giá</h2>

                                <p><b>Khách hàng:</b> {selectedReview.HoTen}</p>
                                <p><b>Sản phẩm:</b> {selectedReview.TenSP}</p>

                                <p>
                                    <b>Số sao:</b>{' '}
                                    <span className="stars">
                                        {[...Array(5)].map((_, i) => (
                                            <span
                                                key={i}
                                                className={i < selectedReview.SoSao ? "star-icon filled" : "star-icon"}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </span>
                                </p>

                                <p><b>Nội dung:</b> {selectedReview.BinhLuan}</p>

                                <p>
                                    <b>Thời gian:</b>{' '}
                                    {new Date(selectedReview.NgayDanhGia).toLocaleString('vi-VN')}
                                </p>

                                <button onClick={() => setSelectedReview(null)}> Đóng </button>
                                
                                {/* 🔥 NÚT PHẢN HỒI */}
                                <button
                                    disabled={selectedReview.TrangThai === 'DA_PHAN_HOI'}
                                    onClick={() => {
                                        setReplyText('');
                                        setShowReplyBox(true);
                                    }}
                                >
                                    {selectedReview.TrangThai === 'DA_PHAN_HOI' ? "Đã phản hồi" : "Phản hồi"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ===== POPUP PHẢN HỒI ===== */}
                    {showReplyBox && (
                        <div className="modal-overlay" onClick={() => setShowReplyBox(false)}>
                            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                                <h3>Phản hồi khách hàng</h3>

                                <textarea
                                    placeholder="Nhập nội dung phản hồi..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    style={{ width: '100%', height: 100 }}
                                />

                                <div style={{ marginTop: 10 }}>
                                    <button
                                        onClick={async () => {
                                            if (!replyText.trim()) {
                                                toast.warning("Vui lòng nhập nội dung!");
                                                return;
                                            }

                                            try {
                                                setSending(true);

                                                await reviewApi.replyReview(selectedReview.MaDG, {
                                                    replyComment: replyText
                                                });

                                                toast.success("Đã phản hồi!");

                                                setShowReplyBox(false);
                                                setSelectedReview(null);
                                                setReplyText('');

                                                fetchData();
                                            } catch (err) {
                                                console.error(err);
                                                toast.error("Có lỗi xảy ra!");
                                            } finally {
                                                setSending(false);
                                            }
                                        }}
                                    >
                                        {sending ? "Đang gửi..." : "Gửi"}
                                    </button>

                                    <button onClick={() => setShowReplyBox(false)}>Hủy</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ReviewManagement;