import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosClient from '../../../services/axiosClient'
import ProductReview from '../ProductReview/ProductReview'
import './OrderDetails.css'

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviewingProduct, setReviewingProduct] = useState(null)
  const mountedRef = useRef(true)

  const fetchOrder = useCallback(async (options = {}) => {
    const { silent = false } = options

    if (!id) return

    if (!silent) setLoading(true)

    try {
      const data = await axiosClient.get(`/orderdetails/${id}`)
      if (mountedRef.current) {
        setOrder(data)
        if (!silent) setError(null)
      }
    } catch (err) {
      console.error(err)
      if (mountedRef.current && !silent) {
        setError(err?.response?.data?.message || 'Lỗi tải đơn hàng')
      }
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false)
      }
    }
  }, [id])

  const handleReviewProduct = (product) => {
    const userData = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {}
    const MaND = userData?.MaND || userData?.id || userData?.MaKhachHang
    
    // Log toàn bộ keys của product để debug
    console.log('Product object keys:', Object.keys(product))
    console.log('Product full data:', product)
    
    const MaSP = product.MaSP || product.maSP || product.id || product.productId || product.MaSanPham || product.ma_sp || product.masp
    console.log('Extracted MaSP:', MaSP)
    
    if (!MaSP) {
      alert(`Không thể lấy mã sản phẩm.\n\nKeys có sẵn: ${Object.keys(product).join(', ')}\n\nVui lòng liên hệ admin.`)
      return
    }
    
    setReviewingProduct({
      MaSP,
      tenSP: product.TenSP || product.tenSP || product.tenSanPham || product.name || 'Sản phẩm',
      DuongDanAnh: product.DuongDanAnh || product.image || product.hinhAnh || product.anh,
      MaND,
      MaDH: order?.id,
      trangThaiDonHang: order?.trangThai
    })
  }

  const handleReviewClose = () => {
    setReviewingProduct(null)
  }

  useEffect(() => {
    mountedRef.current = true

    fetchOrder()

    const intervalId = setInterval(() => {
      fetchOrder({ silent: true })
    }, 10000)

    return () => {
      mountedRef.current = false
      clearInterval(intervalId)
    }
  }, [fetchOrder])

  if (loading) return <div className="order-page">Đang tải...</div>
  if (error) return <div className="order-page">{error}</div>
  if (!order) return <div className="order-page">Không tìm thấy đơn hàng.</div>

  if (reviewingProduct) {
    return (
      <div style={{ position: 'relative' }}>
        <button 
          onClick={handleReviewClose}
          style={{ 
            position: 'absolute', 
            top: 10, 
            left: 10, 
            zIndex: 1000,
            padding: '8px 12px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Quay lại
        </button>
        <ProductReview
          MaSP={reviewingProduct.MaSP}
          MaDH={reviewingProduct.MaDH}
          MaND={reviewingProduct.MaND}
          productName={reviewingProduct.tenSP}
          productImage={reviewingProduct.DuongDanAnh}
          trangThaiDonHang={reviewingProduct.trangThaiDonHang}
        />
      </div>
    )
  }

  const { recipient = {}, diaChiGiaoHang: shippingAddress = '', chiTiet: items = [], lichSu: statusHistory = [], tamTinh, phiShip, giamGia, tongTien } = order

  // parse recipient details: prefer explicit fields, otherwise try to extract from shippingAddress string
  const parsed = { name: recipient.hoTen || '', phone: recipient.soDienThoai || recipient.so || '', email: recipient.email || '' }
  let parsedAddress = ''
  if (!parsed.name || !parsed.phone || !parsed.email) {
    const parts = String(shippingAddress || '').split('|').map(p => p.trim()).filter(Boolean)
    parts.forEach(part => {
      const low = part.toLowerCase()
      if (!parsed.name && (low.startsWith('tên') || low.startsWith('ten') || low.startsWith('name'))) {
        parsed.name = part.split(':').slice(1).join(':').trim()
        return
      }
      if (!parsed.phone && (low.startsWith('sđt') || low.startsWith('sdt') || low.startsWith('đt') || low.startsWith('dt') || low.includes('sd t') || low.includes('phone') )) {
        parsed.phone = part.split(':').slice(1).join(':').trim()
        return
      }
      if (!parsed.email && low.startsWith('email')) {
        parsed.email = part.split(':').slice(1).join(':').trim()
        return
      }
      // treat remaining as address
      parsedAddress = parsedAddress ? parsedAddress + ', ' + part : part
    })
  }
  if (!parsedAddress) parsedAddress = shippingAddress || ''

  const statusOrder = { ChoXacNhan: 0, DaXacNhan: 1, DangGiao: 2, HoanThanh: 3, DaHuy: 3 }
  const currentIndex = statusOrder[order.trangThai] ?? (statusHistory?.length ? Math.max(0, statusHistory.length - 1) : 0)
  const isCompleted = currentIndex >= 3 || order.trangThai === 'HoanThanh'
  const finalStepLabel = order.trangThai === 'DaHuy' ? 'TRẢ HÀNG' : 'THÀNH CÔNG'

  return (
    <div className="order-page">
      {/* Progress bar: order status steps */}
      <div className="order-progress-container">
        <div className="order-progress-inner">
          {[
            { key: 'ChoXacNhan', label: 'CHỜ XÁC NHẬN' },
            { key: 'DaXacNhan', label: 'ĐÃ XÁC NHẬN' },
            { key: 'DangGiao', label: 'ĐANG GIAO' },
            { key: 'HoanThanh', label: finalStepLabel }
          ].map((step, idx, arr) => {
            const isDone = idx <= currentIndex
            return (
              <div key={step.key} className="progress-step">
                <div className={`step-circle ${isDone ? 'done' : ''}`}>{isDone ? '✓' : idx + 1}</div>
                <div className={`step-label ${isDone ? 'done' : ''}`}>{step.label}</div>
                {idx < arr.length - 1 && <div className={`step-connector ${idx < currentIndex ? 'filled' : ''}`} />}
              </div>
            )
          })}
        </div>
      </div>
      <div className="order-header">
        <div>
          <h1 className="order-title">Đơn hàng #{order.id}</h1>
          <div className="order-status-inline">Trạng thái đơn hàng: <span>{order.trangThai || 'Chờ xác nhận'}</span></div>
        </div>

        <button onClick={() => navigate(-1)} className="btn-plain">Quay lại</button>
      </div>

      {isCompleted && (
        <div className="success-notice">
          <div className="success-notice-icon">✓</div>
          <div className="success-notice-content">
            <div className="success-notice-title">Đơn hàng đã hoàn thành</div>
            <div className="success-notice-text">Bạn có thể đánh giá sản phẩm để giúp cửa hàng cải thiện chất lượng dịch vụ.</div>
          </div>
          <button type="button" className="btn-rate" onClick={() => {
            if (items && items.length > 0) {
              handleReviewProduct(items[0])
            }
          }}>Đánh giá sản phẩm</button>
        </div>
      )}

      <div className="order-grid">
        <div className="order-card-lg">
          <h3 className="section-title">Thông tin nhận hàng</h3>
          <div className="recipient-section">
            <div className="recipient-title">Người nhận</div>
            <div className="recipient-grid">
              <div className="recipient-field">
                <div className="field-label">Tên</div>
                <div className="field-value">{parsed.name || '—'}</div>
              </div>
              <div className="recipient-field">
                <div className="field-label">SDT</div>
                <div className="field-value">{parsed.phone || '—'}</div>
              </div>
            </div>
            <div className="recipient-lines">
              <div className="address-line"><span className="addr-label">Email:</span> <span className="addr-val">{parsed.email || '—'}</span></div>
              <div className="address-line"><span className="addr-label">Địa chỉ:</span> <span className="addr-val">{parsedAddress || '—'}</span></div>
            </div>
          </div>

         

          <h3 className="section-title section-gap">Sản phẩm</h3>
          <div className="product-list">
            {items.map((it, i) => (
              <div key={i} className="product-card">
                <img src={it.DuongDanAnh || it.image || '/placeholder.png'} alt={it.TenSP || it.tenSP || it.tenSanPham || ''} className="product-img" />
                <div className="product-info">
                  <div className="product-name">{it.TenSP || it.tenSP || it.tenSanPham || 'Sản phẩm'}</div>
                  <div className="product-meta">Số lượng: {it.soLuong || it.SoLuong || 1}</div>
                </div>
                <div className="product-price">{formatCurrency(it.giaBan || it.DonGia || 0)}</div>
                {isCompleted && (
                  <button 
                    className="btn-review-product"
                    onClick={() => handleReviewProduct(it)}
                    title="Đánh giá sản phẩm"
                  >
                    ⭐ Đánh giá
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="order-summary">
          <h3 className="section-title">Tóm tắt thanh toán</h3>
          <div className="totals-row"><span>Tổng tiền hàng</span><span>{formatCurrency(tamTinh)}</span></div>
          <div className="totals-row"><span>Phí vận chuyển</span><span>{formatCurrency(phiShip)}</span></div>
          <div className="totals-row"><span>Giảm giá</span><span className="small-muted">-{formatCurrency(giamGia)}</span></div>
          <div className="totals-total"><span>Tổng cộng</span><span className="product-price">{formatCurrency(tongTien)}</span></div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(value) {
  if (value == null) return '0₫'
  try {
    const n = Number(value)
    return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
  } catch {
    return String(value)
  }
}
