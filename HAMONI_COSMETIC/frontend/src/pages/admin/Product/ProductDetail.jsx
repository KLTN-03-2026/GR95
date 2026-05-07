import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  UploadCloud,
  Trash2,
  Plus,
  Edit2,
  X,
  Check,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosClient from "../../../services/axiosClient";
import "./ProductDetail.css";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userPermissions = JSON.parse(
    localStorage.getItem("userPermissions") || "[]",
  );
  const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
  const canDeleteProduct =
    userInfo?.maQuyen === "ADMIN" ||
    userPermissions.includes("ALL") ||
    userPermissions.includes("DELETE_PRODUCT");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [product, setProduct] = useState({});
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  const [newVariant, setNewVariant] = useState({ TenBienThe: "", Gia: "" });

  // STATE MỚI: Dùng để theo dõi biến thể nào đang được sửa
  const [editingVariant, setEditingVariant] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const catRes = await axiosClient.get("/categories");
      setCategories(catRes.data || catRes || []);

      const res = await axiosClient.get(`/products/${id}`);

      setProduct(res.info || res.data?.info || {});
      setImages(res.images || res.data?.images || []);
      setVariants(res.variants || res.data?.variants || []);
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
      toast.error("Không thể tải thông tin sản phẩm này!");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInfoChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await axiosClient.put(`/products/${id}`, product);
      toast.success("Đã lưu thông tin cơ bản thành công!");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Lỗi khi lưu thông tin!";
      toast.error(message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    setIsUploading(true);

    try {
      const uploadRes = await axiosClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const dbRes = await axiosClient.post(`/products/${id}/images`, {
        DuongDanAnh: uploadRes.url,
      });

      const newImageId = dbRes.MaHinhAnh || dbRes.data?.MaHinhAnh;
      setImages([
        ...images,
        { MaHinhAnh: newImageId, DuongDanAnh: uploadRes.url },
      ]);
    } catch (error) {
      toast.error("Lỗi tải ảnh lên hệ thống!");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này?")) return;
    try {
      await axiosClient.delete(`/products/images/${imageId}`);
      setImages(images.filter((img) => img.MaHinhAnh !== imageId));
    } catch {
      toast.error("Lỗi khi xóa ảnh!");
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.TenBienThe || !newVariant.Gia) {
      return toast.warning("Vui lòng nhập đầy đủ tên phân loại và giá bán!");
    }

    try {
      const res = await axiosClient.post(
        `/products/${id}/variants`,
        newVariant,
      );

      const newVariantId = res.MaBienThe || res.data?.MaBienThe;
      setVariants([...variants, { MaBienThe: newVariantId, ...newVariant }]);

      setNewVariant({ TenBienThe: "", Gia: "" });
    } catch (error) {
      toast.error("Lỗi thêm biến thể mới!");
      console.error(error);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (
      !window.confirm(
        "Xóa biến thể này sẽ ảnh hưởng đến đơn hàng nếu đã có người mua. Bạn có chắc chắn?",
      )
    )
      return;
    try {
      await axiosClient.delete(`/products/variants/${variantId}`);
      setVariants(variants.filter((v) => v.MaBienThe !== variantId));
    } catch (error) {
      toast.error(
        "Lỗi xóa biến thể! Có thể nó đang bị ràng buộc với dữ liệu tồn kho hoặc đơn hàng.",
      );
      console.error(error);
    }
  };

  // --- CÁC HÀM XỬ LÝ CHỈNH SỬA BIẾN THỂ ---
  const startEditVariant = (variant) => {
    setEditingVariant({ ...variant });
  };

  const cancelEditVariant = () => {
    setEditingVariant(null);
  };

  const handleUpdateVariant = async (variantId) => {
    if (!editingVariant.TenBienThe || !editingVariant.Gia) {
      return toast.warning("Tên phân loại và giá không được để trống!");
    }

    try {
      // Giả định bạn có route PUT /products/variants/:id ở Backend
      await axiosClient.put(`/products/variants/${variantId}`, {
        TenBienThe: editingVariant.TenBienThe,
        Gia: editingVariant.Gia,
      });

      // Cập nhật lại state danh sách biến thể
      setVariants(
        variants.map((v) => (v.MaBienThe === variantId ? editingVariant : v)),
      );
      setEditingVariant(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || "Lỗi khi cập nhật biến thể!";
      toast.error(message);
      console.error(error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!canDeleteProduct) {
      toast.warning("Bạn không có quyền xóa sản phẩm này!");
      return;
    }

    const isConfirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.",
    );
    if (!isConfirmed) return;

    try {
      await axiosClient.delete(`/products/${id}`);
      toast.success("Đã xóa sản phẩm thành công!");
      navigate("/admin/products");
    } catch (error) {
      const message = error?.response?.data?.message || "Lỗi xóa sản phẩm!";
      toast.error(message);
      console.error(error);
    }
  };

  if (loading)
    return (
      <div className="p-5 text-center fw-bold text-muted mt-5">
        Đang tải dữ liệu sản phẩm...
      </div>
    );

  return (
    <div className="product-detail-container">
      <div className="detail-header">
        <div className="d-flex align-items-center gap-3">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="m-0 fw-bold">
            CHI TIẾT SẢN PHẨM: {String(product.TenSP || "").padStart(3, "0")}
          </h2>
        </div>
        {canDeleteProduct && (
          <button
            className="btn btn-danger d-flex align-items-center gap-2"
            onClick={handleDeleteProduct}
          >
            <Trash2 size={16} /> Xóa sản phẩm
          </button>
        )}
      </div>

      <div className="detail-layout">
        {/* CỘT TRÁI */}
        <div className="left-col">
          <div className="detail-card">
            <h5 className="card-title">Thông tin cơ bản</h5>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Tên sản phẩm mỹ phẩm</label>
                <input
                  type="text"
                  name="TenSP"
                  value={product.TenSP || ""}
                  onChange={handleInfoChange}
                />
              </div>
              <div className="form-group">
                <label>Danh mục</label>
                <select
                  name="MaDM"
                  value={product.MaDM || ""}
                  onChange={handleInfoChange}
                >
                  {categories.map((c) => (
                    <option key={c.MaDM} value={c.MaDM}>
                      {c.TenDM}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Loại da phù hợp</label>
                <input
                  type="text"
                  name="LoaiDaPhuHop"
                  value={product.LoaiDaPhuHop || ""}
                  onChange={handleInfoChange}
                />
              </div>
              <div className="form-group full-width">
                <label>Mô tả chi tiết</label>
                <textarea
                  name="MoTa"
                  rows="6"
                  value={product.MoTa || ""}
                  onChange={handleInfoChange}
                ></textarea>
              </div>
              <div className="form-group full-width">
                <label>Thành phần chính</label>
                <input
                  type="text"
                  name="ThanhPhan"
                  value={product.ThanhPhan || ""}
                  onChange={handleInfoChange}
                />
              </div>
              <div className="form-group full-width">
                <label>Cách sử dụng</label>
                <input
                  type="text"
                  name="CachSuDung"
                  value={product.CachSuDung || ""}
                  onChange={handleInfoChange}
                />
              </div>
            </div>

            <div className="save-action-bar">
              <button
                className="btn-save-primary"
                onClick={handleSaveInfo}
                disabled={isSaving}
              >
                <Save size={18} />{" "}
                {isSaving ? "Đang lưu..." : "Lưu thay đổi thông tin"}
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="right-col">
          {/* THƯ VIỆN ẢNH */}
          <div className="detail-card">
            <h5 className="card-title mb-3">Thư viện ảnh</h5>
            <div className="image-gallery-grid">
              <label className={`upload-card ${isUploading ? "loading" : ""}`}>
                {isUploading ? (
                  <div
                    className="spinner-border spinner-border-sm text-secondary"
                    role="status"
                  ></div>
                ) : (
                  <>
                    <UploadCloud size={24} className="mb-2 text-muted" />
                    <span>Thêm ảnh</span>
                  </>
                )}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleUploadImage}
                  disabled={isUploading}
                />
              </label>

              {images.map((img) => (
                <div key={img.MaHinhAnh} className="image-item">
                  <img src={img.DuongDanAnh} alt="product" />
                  <button
                    className="btn-delete-img"
                    onClick={() => handleDeleteImage(img.MaHinhAnh)}
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BIẾN THỂ SẢN PHẨM */}
          <div className="detail-card">
            <h5 className="card-title mb-3">Phân loại & Giá bán</h5>

            <div className="add-variant-compact">
              <input
                type="text"
                className="variant-name-input"
                placeholder="Tên phân loại..."
                value={newVariant.TenBienThe}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, TenBienThe: e.target.value })
                }
              />
              <input
                type="number"
                className="variant-price-input"
                placeholder="Giá bán (VNĐ)"
                value={newVariant.Gia}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, Gia: e.target.value })
                }
              />
              <button className="btn-add-variant" onClick={handleAddVariant}>
                <Plus size={16} /> Thêm
              </button>
            </div>

            <div className="table-responsive mt-3">
              <table className="variant-table w-100 align-middle">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>PHÂN LOẠI</th>
                    <th style={{ textAlign: "left" }}>GIÁ BÁN</th>
                    <th style={{ textAlign: "right" }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">
                        Chưa có phân loại.
                      </td>
                    </tr>
                  ) : (
                    variants.map((v) =>
                      editingVariant &&
                      editingVariant.MaBienThe === v.MaBienThe ? (
                        /* GIAO DIỆN KHI ĐANG SỬA (EDIT MODE) */
                        <tr key={`edit-${v.MaBienThe}`}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingVariant.TenBienThe}
                              onChange={(e) =>
                                setEditingVariant({
                                  ...editingVariant,
                                  TenBienThe: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={editingVariant.Gia}
                              onChange={(e) =>
                                setEditingVariant({
                                  ...editingVariant,
                                  Gia: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td
                            style={{ textAlign: "right", whiteSpace: "nowrap" }}
                          >
                            <button
                              className="btn btn-sm btn-success me-1 text-white border-0"
                              style={{ padding: "4px 8px" }}
                              onClick={() => handleUpdateVariant(v.MaBienThe)}
                              title="Lưu"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="btn btn-sm btn-secondary text-white border-0"
                              style={{ padding: "4px 8px" }}
                              onClick={cancelEditVariant}
                              title="Hủy"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ) : (
                        /* GIAO DIỆN BÌNH THƯỜNG (VIEW MODE) */
                        <tr key={v.MaBienThe}>
                          <td className="fw-medium text-start">
                            {v.TenBienThe}
                          </td>
                          <td className="fw-bold text-danger text-nowrap text-start">
                            {Number(v.Gia).toLocaleString("vi-VN")}đ
                          </td>
                          <td
                            style={{ textAlign: "right", whiteSpace: "nowrap" }}
                          >
                            <button
                              className="btn text-primary bg-transparent border-0 p-1 me-1"
                              onClick={() => startEditVariant(v)}
                              title="Sửa phân loại"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn text-danger bg-transparent border-0 p-1"
                              onClick={() => handleDeleteVariant(v.MaBienThe)}
                              title="Xóa phân loại"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

export default ProductDetail;
