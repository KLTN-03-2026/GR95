import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { buildVietQrImageUrl } from '../../../config/paymentQr';
import './ordernotification.css';

const paymentBankName = import.meta.env.VITE_PAYMENT_BANK_NAME || 'MoMo';
const paymentAccountNumber = import.meta.env.VITE_PAYMENT_ACCOUNT_NUMBER || '0823434270';
const paymentAccountName = import.meta.env.VITE_PAYMENT_ACCOUNT_NAME || 'HAMONI Cosmetic';
const paymentBankBin = import.meta.env.VITE_PAYMENT_BANK_BIN || '';

const OrderNotification = ({
  isCod = false,
  transactionCode,
  orderId,
  paidAt,
  paymentMethodLabel,
  totalAmount,
  onViewOrder,
  onContinueShopping
}) => {
  const formatCurrency = (amount) => `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)}đ`;
  const formatDate = (dateLike) => new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(dateLike));

  return (
    <div className="payment-success-page">
      <div className="payment-success-card">
        <div className="payment-success-hero">
          <div className="payment-success-icon">
            <CheckCircle2 size={30} />
          </div>
          <h2>{isCod ? 'Đặt hàng thành công!' : 'Thanh toán thành công!'}</h2>
        </div>
        <p className="payment-success-subtitle">
          {isCod
            ? 'Bạn sẽ thanh toán khi nhận hàng. Đơn hàng của bạn đã được ghi nhận thành công.'
            : 'Cảm ơn bạn đã tin tưởng. Đơn hàng của bạn đã được ghi nhận thành công.'}
        </p>
        <div className="payment-success-meta-grid">
          <div className="meta-box">
            <span>{isCod ? 'Mã giao dịch' : 'Mã giao dịch (VNPAY)'}</span>
            <strong>{transactionCode}</strong>
          </div>
          <div className="meta-box">
            <span>Mã đơn hàng</span>
            <strong>#HM-{orderId}</strong>
          </div>
        </div>
        <div className="payment-success-details">
          <div className="detail-row">
            <span>{isCod ? 'Ngày đặt hàng' : 'Ngày thanh toán'}</span>
            <strong>{formatDate(paidAt)}</strong>
          </div>
          <div className="detail-row">
            <span>Phương thức</span>
            <strong>{paymentMethodLabel}</strong>
          </div>
          <div className="detail-row total">
            <span>Tổng cộng</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </div>

        <button className="primary-action" onClick={onViewOrder}>XEM CHI TIẾT ĐƠN HÀNG</button>
        <button className="secondary-action" onClick={onContinueShopping}>TIẾP TỤC MUA SẮM</button>
      </div>
    </div>
  );
};
export const OnlinePaymentModal = ({
  orderId,
  totalAmount,
  onCancel,
  onConfirm,
  confirming = false,
  formatCurrency,
}) => {
  const transferCode = `HM-${orderId}`;
  const { hasValidBankConfig, qrImageUrl } = buildVietQrImageUrl({
    bankBin: paymentBankBin,
    accountNumber: paymentAccountNumber,
    accountName: paymentAccountName,
    amount: totalAmount,
    transferCode,
  });
  return (
    <div className="payment-modal-overlay" onClick={onCancel}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Quét mã để thanh toán</h3>
        <p className="payment-modal-subtitle">Vui lòng dùng mã QR bên dưới để thanh toán đơn hàng.</p>

        <div className="payment-qr-section">
          <div className="payment-qr-box" aria-label="Mã QR thanh toán">
            <div className="payment-qr-frame">
              <span className="qr-corner qr-tl" />
              <span className="qr-corner qr-tr" />
              <span className="qr-corner qr-bl" />
              <span className="qr-corner qr-br" />
              {hasValidBankConfig ? (
                <img
                  className="payment-qr-image"
                  src={qrImageUrl}
                  alt={`QR thanh toán đơn ${transferCode}`}
                  loading="lazy"
                />
              ) : (
                <p className="payment-qr-fallback">
                  Thiếu cấu hình ngân hàng để tạo QR. Vui lòng kiểm tra VITE_PAYMENT_BANK_BIN và VITE_PAYMENT_ACCOUNT_NUMBER.
                </p>
              )}
            </div>
            <p>Mã QR thanh toán</p>
          </div>
          <div className="payment-detail-list">
            <div className="payment-detail-row">
              <span>Ngân hàng</span>
              <strong>{paymentBankName}</strong>
            </div>
            <div className="payment-detail-row">
              <span>TK</span>
              <strong>{paymentAccountNumber}</strong>
            </div>
            <div className="payment-detail-row">
              <span>Tên TK</span>
              <strong>{paymentAccountName}</strong>
            </div>
            <div className="payment-detail-row">
              <span>Mã đơn</span>
              <strong>#HM-{orderId}</strong>
            </div>
            <div className="payment-detail-row total">
              <span>Số tiền</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
          </div>
        </div>

        <div className="payment-modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={confirming}>Hủy</button>
          <button className="btn-confirm" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'ĐANG XÁC NHẬN...' : 'Tôi đã thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderNotification;