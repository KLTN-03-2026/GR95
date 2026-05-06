import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosClient from '../../../services/axiosClient'
import './OrderDetails.css'

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const fetchOrder = async () => {
      setLoading(true)
      try {
        const data = await axiosClient.get(`/orderdetails/${id}`)
        if (mounted) setOrder(data)
      } catch (err) {
        console.error(err)
        if (mounted) setError(err?.response?.data?.message || 'Lỗi tải đơn hàng')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchOrder()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="order-page">Đang tải...</div>
  if (error) return <div className="order-page">{error}</div>
  if (!order) return <div className="order-page">Không tìm thấy đơn hàng.</div>

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

  const statusOrder = { ChoXacNhan: 0, DaXacNhan: 1, DangGiao: 2, HoanThanh: 3 }
  const currentIndex = statusOrder[order.trangThai] ?? (statusHistory?.length ? Math.max(0, statusHistory.length - 1) : 0)
  const isCompleted = currentIndex >= 3 || order.trangThai === 'HoanThanh'

  return (
    <div className="order-page">
      {/* Progress bar: order status steps */}
      <div className="order-progress-container">
        <div className="order-progress-inner">
          {[
            { key: 'ChoXacNhan', label: 'CHỜ XÁC NHẬN' },
            { key: 'DaXacNhan', label: 'ĐÃ XÁC NHẬN' },
            { key: 'DangGiao', label: 'ĐANG GIAO' },
            { key: 'HoanThanh', label: 'THÀNH CÔNG' }
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
          <button type="button" className="btn-rate" onClick={() => {}}>Đánh giá sản phẩm</button>
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
