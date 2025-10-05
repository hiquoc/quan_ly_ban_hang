import { useEffect, useState } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw } from "react-icons/fi";
import { getAllCategories, getAllProducts, getAllBrands, createProduct, updateProduct,
   changeProductActive, changeProductFeatured, deleteProduct } from "../../../apis/productApi";

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    productCode: "",
    slug: "",
    description: "",
    shortDescription: "",
    categoryId: "",
    brandId: "",
    technicalSpecs: "",
    imageUrl: "",
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [popup, setPopup] = useState({ message: "" });
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [editingProductId, setEditingProductId] = useState(null);
  const [specs, setSpecs] = useState({});

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [statusSort, setStatusSort] = useState(null);
  const [featuredSort, setFeaturedSort] = useState(null);
  const [nameSort, setNameSort] = useState(null);
  const [categorySort, setCategorySort] = useState(null);
  const [brandSort, setBrandSort] = useState(null);


  useEffect(() => {
    handleLoadProducts();
    handleLoadCategories();
    handleLoadBrands()
  }, []);

  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
    if (form.name === "") setIsSlugManuallyEdited(false);
  }, [form.name]);

  const handleLoadProducts = async () => {
    const res = await getAllProducts();
    if (res.error) {
      console.error(res.error);
      setProducts([]);
      setPopup({ message: "Có lỗi khi lấy dữ liệu sản phẩm!", type: "error" });
      return;
    }
    setProducts(res.data);
  };

  const handleLoadCategories = async () => {
    const res = await getAllCategories();
    if (res.error) {
      console.error(res.error);
      setCategories([]);
      setPopup({ message: "Có lỗi khi lấy dữ liệu doanh mục!", type: "error" });
      return;
    }
    setCategories(res.data);
  };

  const handleLoadBrands = async () => {
    const res = await getAllBrands();
    if (res.error) {
      console.error(res.error);
      setBrands([]);
      setPopup({ message: "Có lỗi khi lấy dữ liệu thương hiệu!", type: "error" });
      return;
    }
    setBrands(res.data);
  };


  const handleCreateProduct = async () => {
    if (form.name == "" || form.slug == "" || form.productCode == "" || form.categoryId == "" || form.brandId == "") {
      setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" })
      return;
    }
    const payload = {
      ...form,
      technicalSpecs: specs,
    };
    const response = await createProduct(
      payload.name,
      payload.productCode,
      payload.slug,
      payload.description,
      payload.shortDescription,
      payload.categoryId,
      payload.brandId,
      payload.technicalSpecs,
      payload.imageUrl
    );

    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }

    setPopup({ message: "Tạo sản phẩm thành công!", type: "success" });
    setSpecs(null);
    setShowForm(false);
    setForm({
      name: "", productCode: "", slug: "", description: "", shortDescription: "",
      categoryId: "", brandId: "", technicalSpecs: "", imageUrl: "",
    });
    handleLoadProducts();
  };
  const handleAddProduct = () => {
    setForm({
      name: "",
      productCode: "",
      slug: "",
      shortDescription: "",
      description: "",
      categoryId: "",
      brandId: "",
      imageUrl: "",
    });
    setSpecs({});
    setEditingProductId(null);
    setShowForm(true);
  };

  const handleEditProduct = (product) => {
    const category = categories.find(c => c.name === product.categoryName);
    const brand = brands.find(b => b.name === product.brandName);
    setIsSlugManuallyEdited(true);
    setForm({
      id: product.id,
      name: product.name,
      productCode: product.productCode,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      categoryId: category ? category.id : "",
      brandId: brand ? brand.id : "",
      imageUrl: product.imageUrl || "",
      technicalSpecs: product.technicalSpecs || {},
    });

    setSpecs(product.technicalSpecs || {});
    setEditingProductId(product.id);
    setShowForm(true);
  };

  const handleUpdateProduct = async () => {
    if (form.name == "" || form.slug == "" || form.productCode == "" || form.categoryId == "" || form.brandId == "") {
      setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" })
      return;
    }
    const payload = {
      ...form,
      technicalSpecs: specs,
    };
    const response = await updateProduct(editingProductId,
      payload.name,
      payload.productCode,
      payload.slug,
      payload.description,
      payload.shortDescription,
      payload.categoryId,
      payload.brandId,
      payload.technicalSpecs,
      payload.imageUrl
    );

    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }
    setPopup({ message: "Cập nhật sản phẩm thành công!", type: "success" });
    setShowForm(false);
    setSpecs(null);
    setForm({
      name: "", productCode: "", slug: "", description: "", shortDescription: "",
      categoryId: "", brandId: "", technicalSpecs: "", imageUrl: "",
      isActive: false, isFeatured: false
    });
    setEditingProductId(null);
    handleLoadProducts();
  };

  const handleChangeProductActive = async (id) => {
    const response = await changeProductActive(id);
    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }
    setPopup({ message: "Cập nhật trạng thái thành công!", type: "success" });
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const handleChangeProductFeatured = async (id) => {
    const response = await changeProductFeatured(id);
    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }
    setPopup({ message: "Cập nhật sản phẩm nổi bật thành công!", type: "success" });
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFeatured: !p.isFeatured } : p))
    );
  };

  const handleDeleteProduct = async (id) => {
    const response = await deleteProduct(id);
    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }
    setPopup({ message: "Xóa sản phẩm thành công!", type: "success" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const closeAndResetForm = () => {
    setForm({
      name: "", slug: "", description: "", shortDescription: "",
      categoryId: "", brandId: "", technicalSpecs: "", imageUrl: "",
    });
    setShowForm(false);
    setSpecs(null)
    setIsSlugManuallyEdited(false);
  };

  const toggleProductActive = (id, isActive, name) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn ${isActive ? "khóa" : "mở khóa"} sản phẩm "${name}"?`,
      onConfirm: () => handleChangeProductActive(id)
    });
  };

  const toggleProductFeatured = (id, isFeatured, name) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn ${isFeatured ? "bỏ nổi bật" : "đặt nổi bật"} sản phẩm "${name}"?`,
      onConfirm: () => handleChangeProductFeatured(id)
    });
  };

  const toggleProductDelete = (id, name) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn xóa sản phẩm "${name}"?`,
      onConfirm: () => handleDeleteProduct(id)
    });
  };

  const closeConfirmPanel = () => {
    setConfirmPanel({ visible: false, message: "", onConfirm: null });
  };

  const addSpec = () => {
    setSpecs((prev) => ({ ...prev, "": "" }));
  };

  const removeSpec = (key) => {
    const newSpecs = { ...specs };
    delete newSpecs[key];
    setSpecs(newSpecs);
  };

  const updateSpecKey = (oldKey, newKey) => {
    setSpecs((prev) => {
      const { [oldKey]: val, ...rest } = prev;
      return { ...rest, [newKey]: val };
    });
  };

  const updateSpecValue = (key, value) => {
    setSpecs((prev) => ({ ...prev, [key]: value }));
  };


  const filteredProducts = (products ?? [])
    .filter(p =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchText.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => {
      if (nameSort !== null) {
        return nameSort
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (categorySort !== null) {
        return categorySort
          ? (a.categoryName || "").localeCompare(b.categoryName || "")
          : (b.categoryName || "").localeCompare(a.categoryName || "");
      }

      if (brandSort !== null) {
        return brandSort
          ? (a.brandName || "").localeCompare(b.brandName || "")
          : (b.brandName || "").localeCompare(a.brandName || "");
      }

      if (statusSort !== null) {
        if (a.isActive !== b.isActive)
          return statusSort ? (b.isActive ? 1 : -1) : (b.isActive ? -1 : 1);
      }

      if (featuredSort !== null) {
        if (a.isFeatured !== b.isFeatured)
          return featuredSort ? (b.isFeatured ? 1 : -1) : (b.isFeatured ? -1 : 1);
      }

      return a.id - b.id;
    });


  const toggleStatusSort = () => {
    setStatusSort(prev => (prev === null ? true : prev === true ? false : null));
    setFeaturedSort(null);
    setNameSort(null);
    setCategorySort(null);
    setBrandSort(null);
  };

  const toggleFeaturedSort = () => {
    setFeaturedSort(prev => (prev === null ? true : prev === true ? false : null));
    setStatusSort(null);
    setNameSort(null);
    setCategorySort(null);
    setBrandSort(null);
  };

  const toggleNameSort = () => {
    setNameSort(prev => (prev === null ? true : prev === true ? false : null));
    setStatusSort(null);
    setFeaturedSort(null);
    setCategorySort(null);
    setBrandSort(null);
  };

  const toggleCategorySort = () => {
    setCategorySort(prev => (prev === null ? true : prev === true ? false : null));
    setStatusSort(null);
    setFeaturedSort(null);
    setNameSort(null);
    setBrandSort(null);
  };

  const toggleBrandSort = () => {
    setBrandSort(prev => (prev === null ? true : prev === true ? false : null));
    setStatusSort(null);
    setFeaturedSort(null);
    setNameSort(null);
    setCategorySort(null);
  };


  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-semibold text-gray-800">Sản phẩm</h2>
        <div className="flex gap-2">
          <button
            onClick={handleLoadProducts}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-300 transition"
            title="Reload Products"
          >
            <FiRefreshCw className="h-5 w-5 mr-2" />
            Reload
          </button>
          <button
            onClick={() => handleAddProduct()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, mã hoặc slug..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="border p-2 rounded w-80"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse shadow rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 text-left">
            <tr>
              <th className="p-3 border-b text-center">ID</th>
              <th className="p-3 border-b text-center">Hình ảnh</th>
              <th
                className="p-3 border-b text-center cursor-pointer select-none"
                onClick={toggleNameSort}
              >
                Tên {nameSort === null ? "" : nameSort ? "↑" : "↓"}
              </th>
              <th className="p-3 border-b text-center">Mã sản phẩm</th>
              <th className="p-3 border-b text-center">Slug</th>
              <th
                className="p-3 border-b text-center cursor-pointer select-none"
                onClick={toggleCategorySort}
              >
                Danh mục {categorySort === null ? "" : categorySort ? "↑" : "↓"}
              </th>

              <th
                className="p-3 border-b text-center cursor-pointer select-none"
                onClick={toggleBrandSort}
              >
                Thương hiệu {brandSort === null ? "" : brandSort ? "↑" : "↓"}
              </th>
              <th
                className="p-3 border-b text-center cursor-pointer select-none"
                onClick={toggleStatusSort}
              >
                Trạng thái {statusSort === null ? "" : statusSort ? "↑" : "↓"}
              </th>
              <th
                className="p-3 border-b text-center cursor-pointer select-none"
                onClick={toggleFeaturedSort}
              >
                Nổi bật {featuredSort === null ? "" : featuredSort ? "↑" : "↓"}
              </th>
              <th className="p-3 border-b text-center">Ngày tạo</th>
              <th className="p-3 border-b text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredProducts.length > 0 ? filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition">
                <td className="p-3 border-b text-center">{p.id}</td>
                <td className="p-3 border-b text-center">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover mx-auto rounded" /> : "-"}
                </td>
                <td className="p-3 border-b text-center">{p.name}</td>
                <td className="p-3 border-b text-center">{p.productCode}</td>
                <td className="p-3 border-b text-center">{p.slug}</td>
                <td className="p-3 border-b text-center">{p.categoryName || "-"}</td>
                <td className="p-3 border-b text-center">{p.brandName || "-"}</td>
                <td className="p-3 border-b text-center">
                  <button
                    className={`px-3 py-1 rounded transition ${p.isActive ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                    onClick={() => toggleProductActive(p.id, p.isActive, p.name)}
                  >
                    {p.isActive ? "Hoạt động" : "Đã khóa"}
                  </button>
                </td>
                <td className="p-3 border-b text-center">
                  <button
                    className={`px-3 py-1 rounded transition ${p.isFeatured ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                    onClick={() => toggleProductFeatured(p.id, p.isFeatured, p.name)}
                  >
                    {p.isFeatured ? "Nổi bật" : "Không"}
                  </button>
                </td>
                <td className="p-3 border-b text-center">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</td>
                <td className="p-3 border-b text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      onClick={() => handleEditProduct(p)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => toggleProductDelete(p.id, p.name)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={11} className="text-center p-4 text-gray-500">Không có sản phẩm phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[600px]">
            <h3 className="text-lg font-semibold mb-4">
              {editingProductId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                placeholder="Tên sản phẩm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border p-2 rounded"
              />
              <div className="flex justify-between">
                <input
                  type="text"
                  placeholder="Mã sản phẩm"
                  value={form.productCode}
                  onChange={(e) => {
                    setForm({ ...form, productCode: e.target.value });
                  }}
                  className="border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="Slug"
                  value={form.slug}
                  onChange={(e) => {
                    setForm({ ...form, slug: e.target.value });
                    setIsSlugManuallyEdited(true);
                  }}
                  className="border p-2 rounded"
                />
              </div>

              <textarea
                placeholder="Mô tả ngắn"
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="border p-2 rounded"
              />
              <textarea
                placeholder="Mô tả chi tiết"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border p-2 rounded"
              />

              {/* Category Select */}
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Brand Select */}
              <select
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="">Chọn thương hiệu</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Technical Specs */}
              <div className="border p-2 rounded">
                <h4 className="font-semibold mb-2">Thông số kỹ thuật</h4>
                {Object.entries(specs).map(([key, value], idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Tên thông số"
                      value={key}
                      onChange={(e) => updateSpecKey(key, e.target.value)}
                      className="border p-1 rounded w-32"
                    />
                    <input
                      type="text"
                      placeholder="Giá trị"
                      value={value}
                      onChange={(e) => updateSpecValue(key, e.target.value)}
                      className="border p-1 rounded w-32"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(key)}
                      className="px-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSpec}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Thêm thông số
                </button>
              </div>

              <input
                type="text"
                placeholder="URL hình ảnh"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="border p-2 rounded"
              />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="Preview" className="w-32 h-32 object-cover rounded mt-2 mx-auto" />
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeAndResetForm}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Hủy
              </button>
              <button
                onClick={editingProductId ? handleUpdateProduct : handleCreateProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingProductId ? "Cập nhật" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Popup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "" })}
        duration={3000}
      />

      <ConfirmPanel
        visible={confirmPanel.visible}
        message={confirmPanel.message}
        onConfirm={() => {
          confirmPanel.onConfirm && confirmPanel.onConfirm();
          setConfirmPanel({ visible: false, message: "", onConfirm: null });
        }}
        onCancel={closeConfirmPanel}
      />
    </div>
  );
}
