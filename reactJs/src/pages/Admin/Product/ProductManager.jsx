import { useEffect, useState } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw, FiFilter, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import {
  getAllCategories, getAllProducts, getAllBrands, createProduct, updateProduct,
  changeProductActive, changeProductFeatured, deleteProduct,
  getProductVariantByProductId
} from "../../../apis/productApi";

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
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [popup, setPopup] = useState({ message: "" });
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [editingProductId, setEditingProductId] = useState(null);
  const [specs, setSpecs] = useState({});
  const [imageFile, setImageFile] = useState(null);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [variants, setVariants] = useState([])

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedActive, setSelectedActive] = useState(null);
  const [selectedFeatured, setSelectedFeatured] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [totalSold, setTotalSold] = useState(null)
  const [discountedOnly, setDiscountedOnly] = useState(null)
  useEffect(() => {
    handleLoadProducts();
    handleLoadCategories();
    handleLoadBrands();
  }, []);

  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
    if (form.name === "") setIsSlugManuallyEdited(false);
  }, [form.name]);

  const handleLoadProducts = async (searchPage = page) => {
    const res = await getAllProducts(
      searchPage,
      size,
      searchText,
      selectedCategory ? [selectedCategory] : [],
      selectedBrand ? [selectedBrand] : [],
      selectedActive,
      selectedFeatured,
      totalSold,
      totalSold !== null ? "sold" : undefined,
      discountedOnly !== null ? discountedOnly : undefined
    );

    if (res.error) {
      console.error(res.error);
      setProducts([]);
      setPage(0)
      setPopup({ message: "Có lỗi khi lấy dữ liệu sản phẩm!", type: "error" });
      return;
    }
    // console.log(res.data.content)
    setProducts(res.data.content);
    setPage(searchPage);
    setTotalPages(res.data.totalPages)
  };


  const handleLoadCategories = async () => {
    const res = await getAllCategories();
    if (res.error) {
      console.error(res.error);
      setPopup({ message: "Có lỗi khi lấy dữ liệu danh mục!", type: "error" });
      setCategories([]);
      return [];
    }
    setCategories(res.data.content);
    return res.data.content;
  };

  const handleLoadBrands = async () => {
    const res = await getAllBrands();
    if (res.error) {
      console.error(res.error);
      setPopup({ message: "Có lỗi khi lấy dữ liệu thương hiệu!", type: "error" });
      setBrands([]);
      return [];
    }
    setBrands(res.data.content);
    return res.data.content;
  };

  const handleLoadProductVariants = async (id) => {
    const res = await getProductVariantByProductId(id);
    if (res.error) {
      console.error(res.error);
      setPopup({ message: "Có lỗi khi lấy dữ liệu biến thể!", type: "error" });
      setVariants([]);
      return [];
    }
    setVariants(res.data);
    return res.data;
  };

  const handleCreateProduct = async () => {
    if (form.name === "" || form.slug === "" || form.productCode === "" || form.categoryId === "" || form.brandId === "") {
      setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" });
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
      imageFile || undefined
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
      categoryId: "", brandId: "", technicalSpecs: ""
    });
    setImageFile(null);
    handleLoadProducts();
  };
  const handleAddProduct = () => {
    handleLoadCategories();
    handleLoadBrands()
    setForm({
      name: "",
      productCode: "",
      slug: "",
      shortDescription: "",
      description: "",
      categoryId: "",
      brandId: "",
      imageUrl: ""
    });
    setImageFile(null)
    setSpecs({});
    setEditingProductId(null);
    setShowForm(true);
  };

  const handleEditProduct = async (product) => {
    handleLoadProductVariants(product.id)

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
      technicalSpecs: product.technicalSpecs || {},
      imageUrl: product.imageUrl || "",
      mainVariantId: product.mainVariantId || ""
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
      imageFile || undefined,
      payload.mainVariantId
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
      categoryId: "", brandId: "", technicalSpecs: "",
      isActive: false, isFeatured: false
    });
    setImageFile(null)
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
      categoryId: "", brandId: "", technicalSpecs: "",
    });
    setImageFile(null)
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
    <div className="p-6 bg-gray-50 rounded shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Sản phẩm</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { handleLoadProducts(0) }}
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

      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, mã hoặc slug..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="border p-2 rounded w-80"
        />

        {/* Filters */}
        <div className="relative">
          <div className="flex gap-2">
            <button
              onClick={() => { handleLoadProducts(0) }}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Tìm
            </button>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              <FiFilter /> Bộ lọc
            </button>

          </div>
          {/* Dropdown panel */}
          {showFilters && (
            <div className="absolute z-10 mt-2 bg-white border shadow-lg rounded-lg p-4 w-80">
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-5">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>


                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
                  <select
                    value={selectedBrand}
                    onChange={e => setSelectedBrand(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Tất cả thương hiệu</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Active */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select
                    value={selectedActive ?? ""}
                    onChange={e =>
                      setSelectedActive(
                        e.target.value === "" ? null : e.target.value === "true"
                      )
                    }
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Hoạt động</option>
                    <option value="false">Đã khóa</option>
                  </select>
                </div>

                {/* Featured */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nổi bật</label>
                  <select
                    value={selectedFeatured ?? ""}
                    onChange={e =>
                      setSelectedFeatured(
                        e.target.value === "" ? null : e.target.value === "true"
                      )
                    }
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Nổi bật</option>
                    <option value="false">Không nổi bật</option>
                  </select>
                </div>
                {/* Lượt mua (sort by sold count) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lượt mua</label>
                  <select
                    value={totalSold ?? true}
                    onChange={e =>
                      setTotalSold(e.target.value === null ? null : e.target.value === "true")
                    }
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Mặc định</option>
                    <option value="true">Giảm dần</option>
                    <option value="false">Tăng dần</option>
                  </select>
                </div>

                {/* Đang giảm giá */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đang giảm giá</label>
                  <select
                    value={discountedOnly ?? ""}
                    onChange={e =>
                      setDiscountedOnly(
                        e.target.value === "" ? null : e.target.value === "true"
                      )
                    }
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Có giảm giá</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedBrand("");
                    setSelectedActive(null);
                    setSelectedFeatured(null);
                  }}
                  className="px-3 py-2 border rounded hover:bg-gray-100"
                >
                  Đặt lại
                </button>

                <button
                  onClick={() => {
                    handleLoadProducts(0);
                    setShowFilters(false);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Lọc
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
          <thead className="bg-gray-200 text-gray-700 font-medium">
            <tr>
              <th className="p-3 text-center border-b border-gray-300">ID</th>
              <th className="p-3 text-center border-b border-gray-300">Hình ảnh</th>
              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
              >
                Tên
              </th>
              <th className="p-3 text-center border-b border-gray-300">Mã sản phẩm</th>
              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
              >
                Danh mục
              </th>

              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
              >
                Thương hiệu
              </th>
              <th className="p-3 text-center border-b border-gray-300">Tổng lượt mua</th>
              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
              >
                Trạng thái
              </th>
              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
              >
                Nổi bật
              </th>
              {/* <th className="p-3 text-center border-b border-gray-300">Ngày tạo</th> */}
              <th className="p-3 text-center border-b border-gray-300">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {products.length > 0 ? products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition">
                <td className="p-3 border-b border-gray-200 text-center">{p.id}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover mx-auto rounded" /> : "-"}
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <div className="truncate max-w-[150px] mx-auto">{p.name}</div>
                </td>
                <td className="p-3 border-b border-gray-200 text-center">{p.productCode}</td>
                <td className="p-3 border-b border-gray-200 text-center">{p.categoryName || "-"}</td>
                <td className="p-3 border-b border-gray-200 text-center">{p.brandName || "-"}</td>
                <td className="p-3 border-b border-gray-200 text-center">{p.totalSold}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <button
                    className={`px-3 py-1 rounded transition ${p.isActive ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                    onClick={() => toggleProductActive(p.id, p.isActive, p.name)}
                  >
                    {p.isActive ? "Hoạt động" : "Đã khóa"}
                  </button>
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <button
                    className={`px-3 py-1 rounded transition ${p.isFeatured ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                    onClick={() => toggleProductFeatured(p.id, p.isFeatured, p.name)}
                  >
                    {p.isFeatured ? "Nổi bật" : "Không"}
                  </button>
                </td>
                {/* <td className="p-3 border-b border-gray-200 text-center">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</td> */}
                <td className="p-3 border-b border-gray-200 text-center">
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
      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          disabled={page === 0}
          onClick={() => handleLoadProducts(page - 1)}
          className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
        >
          <FiChevronLeft className="w-5 h-5 -ml-2" />
          <span className="ml-2">Trước</span>
        </button>

        <span className="text-gray-700 font-medium text-center">
          Trang {page + 1} / {totalPages}
        </span>

        <button
          disabled={page >= totalPages - 1}
          onClick={() => handleLoadProducts(page + 1)}
          className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
        >
          <span className="mr-2">Sau</span>
          <FiChevronRight className="w-5 h-5 -mr-2" />
        </button>
      </div>
      {/* Add/Edit Product Form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[600px] my-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 bg-white">
              {editingProductId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {/* Tên sản phẩm */}
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Tên sản phẩm</span>
                <input
                  type="text"
                  placeholder="Tên sản phẩm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border p-2 rounded"
                />
              </label>

              {/* Mã sản phẩm + Slug */}
              <div className="flex justify-between gap-2">
                <label className="flex-1 flex flex-col">
                  <span className="text-sm font-medium mb-1">Mã sản phẩm</span>
                  <input
                    type="text"
                    placeholder="Mã sản phẩm"
                    value={form.productCode}
                    onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                    className="border p-2 rounded"
                  />
                </label>

                <label className="flex-1 flex flex-col">
                  <span className="text-sm font-medium mb-1">Slug</span>
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
                </label>
              </div>

              {/* Mô tả ngắn */}
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Mô tả ngắn</span>
                <textarea
                  placeholder="Mô tả ngắn"
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  className="border p-2 rounded"
                />
              </label>

              {/* Mô tả chi tiết */}
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Mô tả chi tiết</span>
                <textarea
                  placeholder="Mô tả chi tiết"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="border p-2 rounded"
                />
              </label>

              {/* Danh mục */}
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Danh mục</span>
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
              </label>

              {/* Thương hiệu */}
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Thương hiệu</span>
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
              </label>

              {/* Thông số kỹ thuật */}
              <div className="border p-2 rounded">
                <h4 className="font-medium mb-2">Thông số kỹ thuật</h4>
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

              {/* Hình ảnh */}
              <label className="block">
                <span className="block text-sm font-medium mb-1">Hình ảnh sản phẩm</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-700 border border-gray-300 rounded cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {(imageFile || form.imageUrl) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded mt-2 mx-auto border"
                  />
                )}
              </label>
              {editingProductId &&
                (<label className="flex flex-col">
                  <span className="text-sm font-medium mb-1">Biến thể chính</span>
                  <select
                    value={form.mainVariantId}
                    onChange={(e) => setForm({ ...form, mainVariantId: e.target.value })}
                    className="border p-2 rounded"
                  >
                    <option value="">Chọn biến thể chính</option>
                    {variants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>)}

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-4 bg-white ">
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
