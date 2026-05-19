import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, UploadCloud, Trash2, Plus } from "lucide-react";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import axiosClient from "../../../services/axiosClient";
import "./ProductCreate.css";

const ProductCreate = () => {
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [product, setProduct] = useState({
    TenSP: "",
    MaDM: "",
    LoaiDaPhuHop: "",
    MoTa: "",
    ThanhPhan: "",
    CachSuDung: "",
  });

  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({
    TenBienThe: "",
    Gia: "",
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catRes = await axiosClient.get("/categories");
        const catData = catRes.data || catRes || [];

        setCategories(catData);

        if (catData.length > 0) {
          setProduct((prev) => ({
            ...prev,
            MaDM: catData[0].MaDM,
          }));
        }
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
        toast.error("Không thể tải danh mục sản phẩm!");
      }
    };

    loadCategories();
  }, []);

  const handleInfoChange = (e) => {
    const { name, value } = e.target;

    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUploadImage = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await axiosClient.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const imageUrl = uploadRes.url || uploadRes.data?.url;

        if (!imageUrl) {
          throw new Error("Không nhận được đường dẫn ảnh từ server");
        }

        return {
          MaHinhAnh: Date.now() + index + Math.random(),
          DuongDanAnh: imageUrl,
        };
      });

      const newUploadedImages = await Promise.all(uploadPromises);

      setImages((prevImages) => [...prevImages, ...newUploadedImages]);

      toast.success(`Đã tải lên thành công ${newUploadedImages.length} ảnh!`);
    } catch (error) {
      console.error("Lỗi upload ảnh:", error);
      toast.error("Lỗi tải ảnh lên hệ thống!");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteImage = (imageId) => {
    setImages((prevImages) =>
      prevImages.filter((img) => img.MaHinhAnh !== imageId),
    );

    toast.success("Đã xóa ảnh tạm thời");
  };

  const handleAddVariant = () => {
    const tenBienThe = newVariant.TenBienThe.trim();
    const gia = String(newVariant.Gia).trim();

    if (!tenBienThe || !gia) {
      toast.warning("Vui lòng nhập đầy đủ tên phân loại và giá!");
      return;
    }

    if (Number(gia) <= 0) {
      toast.warning("Giá bán phải lớn hơn 0!");
      return;
    }

    const tempId = Date.now();

    setVariants((prevVariants) => [
      ...prevVariants,
      {
        MaBienThe: tempId,
        TenBienThe: tenBienThe,
        Gia: gia,
      },
    ]);

    setNewVariant({
      TenBienThe: "",
      Gia: "",
    });

    toast.success("Đã thêm phân loại tạm thời");
  };

  const handleDeleteVariant = (variantId) => {
    setVariants((prevVariants) =>
      prevVariants.filter((v) => v.MaBienThe !== variantId),
    );

    toast.success("Đã xóa phân loại");
  };

  const handleSaveNewProduct = async () => {
    if (!product.TenSP.trim()) {
      toast.warning("Vui lòng nhập tên sản phẩm!");
      return;
    }

    if (!product.MaDM) {
      toast.warning("Vui lòng chọn danh mục!");
      return;
    }

    if (images.length === 0) {
      toast.warning("Vui lòng thêm ít nhất 1 ảnh sản phẩm!");
      return;
    }

    if (variants.length === 0) {
      toast.warning("Vui lòng thêm ít nhất 1 phân loại sản phẩm!");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        productInfo: {
          ...product,
          TenSP: product.TenSP.trim(),
          LoaiDaPhuHop: product.LoaiDaPhuHop.trim(),
          MoTa: product.MoTa.trim(),
          ThanhPhan: product.ThanhPhan.trim(),
          CachSuDung: product.CachSuDung.trim(),
        },
        images: images.map((img) => img.DuongDanAnh),
        variants: variants.map((v) => ({
          TenBienThe: v.TenBienThe,
          Gia: Number(v.Gia),
        })),
      };

      await axiosClient.post("/products", payload);

      toast.success("Tạo sản phẩm mới thành công!");

      setTimeout(() => {
        navigate("/admin/products");
      }, 1500);
    } catch (error) {
      console.error("Lỗi lưu sản phẩm:", error);

      const errorMessage =
        error.response?.data?.message || "Lỗi khi lưu sản phẩm mới!";

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="product-create-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      <div className="create-header">
        <div className="d-flex align-items-center gap-3">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>

          <h2 className="m-0 fw-bold text-success">THÊM SẢN PHẨM MỚI</h2>
        </div>
      </div>

      <div className="create-layout">
        <div className="create-left-col">
          <div className="create-card">
            <h5 className="card-title">Thông tin cơ bản</h5>

            <div className="form-grid">
              <div className="form-group full-width">
                <label>
                  Tên sản phẩm mỹ phẩm <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  name="TenSP"
                  value={product.TenSP}
                  onChange={handleInfoChange}
                  placeholder="Nhập tên sản phẩm..."
                />
              </div>

              <div className="form-group">
                <label>
                  Danh mục <span className="text-danger">*</span>
                </label>

                <select
                  name="MaDM"
                  value={product.MaDM}
                  onChange={handleInfoChange}
                >
                  <option value="" disabled>
                    -- Chọn danh mục --
                  </option>

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
                  value={product.LoaiDaPhuHop}
                  onChange={handleInfoChange}
                  placeholder="VD: Mọi loại da..."
                />
              </div>

              <div className="form-group full-width">
                <label>Mô tả chi tiết</label>

                <textarea
                  name="MoTa"
                  rows="6"
                  value={product.MoTa}
                  onChange={handleInfoChange}
                  placeholder="Nhập mô tả sản phẩm..."
                ></textarea>
              </div>

              <div className="form-group full-width">
                <label>Thành phần chính</label>

                <textarea
                  name="ThanhPhan"
                  rows="4"
                  value={product.ThanhPhan}
                  onChange={handleInfoChange}
                  placeholder="VD: ZinC, Vitamin C..."
                ></textarea>
              </div>

              <div className="form-group full-width">
                <label>Cách sử dụng</label>

                <textarea
                  name="CachSuDung"
                  rows="4"
                  value={product.CachSuDung}
                  onChange={handleInfoChange}
                  placeholder="Hướng dẫn sử dụng..."
                ></textarea>
              </div>
            </div>

            <div className="save-action-bar">
              <button
                className="btn-save-primary"
                onClick={handleSaveNewProduct}
                disabled={isSaving || isUploading}
              >
                <Save size={18} />{" "}
                {isSaving ? "Đang tạo..." : "Lưu sản phẩm mới"}
              </button>
            </div>
          </div>
        </div>

        <div className="create-right-col d-flex flex-column gap-4">
          <div className="create-card">
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
                  multiple
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
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="create-card">
            <h5 className="card-title mb-3">Phân loại & Giá bán</h5>

            <div className="add-variant-compact">
              <input
                type="text"
                className="variant-name-input"
                placeholder="Tên phân loại..."
                value={newVariant.TenBienThe}
                onChange={(e) =>
                  setNewVariant({
                    ...newVariant,
                    TenBienThe: e.target.value,
                  })
                }
              />

              <input
                type="number"
                className="variant-price-input"
                placeholder="Giá bán (VNĐ)"
                value={newVariant.Gia}
                onChange={(e) =>
                  setNewVariant({
                    ...newVariant,
                    Gia: e.target.value,
                  })
                }
              />

              <button
                className="btn-add-variant"
                onClick={handleAddVariant}
                type="button"
              >
                <Plus size={16} /> Thêm
              </button>
            </div>

            <div className="table-responsive mt-3">
              <table className="variant-table w-100">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>PHÂN LOẠI</th>
                    <th style={{ textAlign: "left" }}>GIÁ BÁN</th>
                    <th style={{ textAlign: "right" }}>XÓA</th>
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
                    variants.map((v) => (
                      <tr key={v.MaBienThe}>
                        <td className="fw-medium text-start">{v.TenBienThe}</td>

                        <td className="fw-bold text-danger text-nowrap text-start">
                          {Number(v.Gia).toLocaleString("vi-VN")}đ
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn-delete-variant-mini"
                            onClick={() => handleDeleteVariant(v.MaBienThe)}
                            title="Xóa phân loại"
                            type="button"
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCreate;
