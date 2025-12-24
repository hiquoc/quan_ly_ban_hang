import { useContext, useEffect, useState } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw, FiFilter, FiChevronRight, FiChevronLeft, FiEye, FiTrash2, FiStar } from "react-icons/fi";
import {
  getAllCategories, getAllProducts, getAllBrands, createProduct, updateProduct,
  changeProductActive, changeProductFeatured, deleteProduct,
  getProductVariantByProductId,
  uploadImage
} from "../../../apis/productApi";
import { FaChevronLeft, FaChevronRight, FaStar } from "react-icons/fa";
import { FaX } from "react-icons/fa6";
import RichTextEditor from "../../../components/RichTextEditor";
import { AuthContext } from "../../../contexts/AuthContext";

export default function ProductManager() {
  const { role } = useContext(AuthContext);
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
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
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
  const [selectedActive, setSelectedActive] = useState(true);
  const [selectedFeatured, setSelectedFeatured] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("")
  const [discountedOnly, setDiscountedOnly] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [currentDescriptionImageUrls, setCurrentDescriptionImageUrls] = useState([])
  const [newDescriptionImageUrls, setNewDescriptionImageUrls] = useState([])
  const [deleteddDescriptionImageUrls, setDeletedDescriptionImageUrls] = useState([])

  useEffect(() => {
    handleLoadProducts();
    handleLoadCategories();
    handleLoadBrands();
  }, []);

  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
    if (!isCodeManuallyEdited) {
      setForm((prev) => ({ ...prev, productCode: generateCode(prev.name) }));
    }
    if (form.name === "") {
      setIsCodeManuallyEdited(false);
      setIsSlugManuallyEdited(false);
    }
  }, [form.name]);

  const handleLoadProducts = async (searchPage = page) => {
    try {
      setIsLoading(true);
      const res = await getAllProducts(
        searchPage,
        size,
        searchText,
        selectedCategory ? [selectedCategory] : [],
        selectedBrand ? [selectedBrand] : [],
        selectedActive,
        selectedFeatured,
        true,
        sortBy,
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
    } finally {
      setIsLoading(false);
    }

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
    if (isProcessing) return;
    try {
      setIsProcessing(true)
      if (form.name === "" || form.slug === "" || form.productCode === "" || form.categoryId === "" || form.brandId === "") {
        setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" });
        return;
      }

      const payload = {
        ...form,
        technicalSpecs: Object.values(specs).reduce((acc, { key, value }) => {
          if (key) acc[key] = value;
          return acc;
        }, {}),
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
        imageFile || undefined,
        newDescriptionImageUrls
      );

      if (response?.error) {
        setPopup({ message: "Không thể tạo sản phẩm\n" + response.error, type: "error" });
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
      setProducts(prev => [response.data, ...prev])
    } finally {
      setIsProcessing(false)
    }
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
    setIsCodeManuallyEdited(true);
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
    setSpecs(
      Object.entries(product.technicalSpecs).reduce((acc, [key, value]) => {
        const id = Date.now() + Math.random();
        acc[id] = { key, value };
        return acc;
      }, {})
    );

    setEditingProductId(product.id);
    setShowForm(true);
    const initialUrls = extractImageUrls(product.description);
    setCurrentDescriptionImageUrls(initialUrls);
    setNewDescriptionImageUrls([]);
    setDeletedDescriptionImageUrls([]);
  };


  const handleUpdateProduct = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true)
      if (form.name == "" || form.slug == "" || form.productCode == "" || form.categoryId == "" || form.brandId == "") {
        setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" })
        return;
      }
      const payload = {
        ...form,
        technicalSpecs: Object.values(specs).reduce((acc, { key, value }) => {
          if (key) acc[key] = value;
          return acc;
        }, {}),
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
        payload.mainVariantId,
        newDescriptionImageUrls,
        deleteddDescriptionImageUrls
      );

      if (response?.error) {
        setPopup({ message: "Không thể cập nhật sản phẩm\n" + response.error, type: "error" });
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
      // console.log(response.data)
      setProducts(prev => prev.map(p => p.id === editingProductId ? response.data : p))
      // handleLoadProducts();
    } finally {
      setIsProcessing(false)
    }
  };

  const handleChangeProductActive = async (id) => {
    const response = await changeProductActive(id);
    if (response?.error) {
      setPopup({ message: "Không thể cập nhật trạng thái sản phẩm\n" + response.error, type: "error" });
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
      setPopup({ message: "Không thể cập nhật sản phẩm nổi bật\n" + response.error, type: "error" });
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
      setPopup({ message: "Không thể xóa sản phẩm\n" + response.error, type: "error" });
      return;
    }
    setPopup({ message: "Xóa sản phẩm thành công!", type: "success" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUploadImage = async (image) => {
    const response = await uploadImage(image);
    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }
    setCurrentDescriptionImageUrls(prev => [...prev, response.data])
    setNewDescriptionImageUrls(prev => [...prev, response.data])
    return response.data;
  }
  const extractImageUrls = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const imgs = Array.from(div.querySelectorAll("img"));
    return imgs.map(img => img.src);
  };

  function handleDescriptionChange(newHtml) {
    const newUrls = extractImageUrls(newHtml);
    const deleted = currentDescriptionImageUrls.filter(url => !newUrls.includes(url));
    setNewDescriptionImageUrls(prev => prev.filter(url => !deleted.includes(url)));

    const toDeleteFromDB = deleted.filter(url => !newDescriptionImageUrls.includes(url));
    setDeletedDescriptionImageUrls(prev => [...prev, ...toDeleteFromDB]);
    setCurrentDescriptionImageUrls(newUrls)

    setForm({ ...form, description: newHtml });
    // console.log('currentDescriptionImageUrls:', currentDescriptionImageUrls);
    // console.log('newUrls (extracted):', newUrls);
    // console.log('deleted:', deleted);
    // console.log('toDeleteFromDB:', toDeleteFromDB);
  }

  const closeAndResetForm = () => {
    setForm({
      name: "", slug: "", description: "", shortDescription: "",
      categoryId: "", brandId: "", technicalSpecs: "",
    });
    setImageFile(null)
    setShowForm(false);
    setSpecs(null)
    setIsSlugManuallyEdited(false);
    setIsCodeManuallyEdited(false)
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
    const id = Date.now() + Math.random();
    setSpecs((prev) => ({ ...prev, [id]: { key: "", value: "" } }));
  };

  const removeSpec = (id) => {
    setSpecs((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const updateSpecKey = (id, newKey) => {
    setSpecs((prev) => ({
      ...prev,
      [id]: { ...prev[id], key: newKey },
    }));
  };

  const updateSpecValue = (id, newValue) => {
    setSpecs((prev) => ({
      ...prev,
      [id]: { ...prev[id], value: newValue },
    }));
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
  const generateCode = (text) => {
    return text
      .toUpperCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  };
  function getPageNumbers() {
    const pages = [];
    const maxVisible = 4;
    if (totalPages <= maxVisible + 2) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      if (page <= 2) {
        pages.push(0, 1, 2, 3, "...", totalPages - 1);
      } else if (page >= totalPages - 3) {
        pages.push(0, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        pages.push(0, "...", page - 1, page, page + 1, "...", totalPages - 1);
      }
    }
    return pages;
  }
  return (
    <div className="p-6 bg-white rounded shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Sản phẩm</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { handleLoadProducts(0) }}
            className="flex items-center px-4 py-2 border text-gray-800 rounded hover:bg-gray-200 transition"
            title="Reload Products"
          >
            <FiRefreshCw className="h-5 w-5 mr-2" />
            Làm mới
          </button>
          <button
            onClick={() => handleAddProduct()}
            className={`px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition
               ${role !== "ADMIN" && role !== "MANAGER" ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={role !== "ADMIN" && role !== "MANAGER"}
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
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-bgray-800 transition"
            >
              Tìm
            </button>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-2 border px-4 py-2 rounded hover:bg-gray-200 transition"
            >
              <FiFilter /> Bộ lọc
            </button>

          </div>
          {/* Dropdown panel */}
          {showFilters && (
            <div className="absolute z-10 mt-2 bg-white border shadow-lg rounded-lg p-4 w-80">
              <div className="flex flex-col gap-3 max-h-75 overflow-y-auto pr-5">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xếp theo</label>
                  <select
                    value={sortBy}
                    onChange={e =>
                      setSortBy(e.target.value)
                    }
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Mặc định</option>
                    <option value="sold">Lượt mua</option>
                    <option value="rating">Đánh giá</option>
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
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
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
              <th className="p-3 text-center border-b border-gray-300">Hình ảnh</th>
              <th className="p-3 text-center border-b border-gray-300">Mã sản phẩm</th>
              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
              >
                Tên
              </th>
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
              <th className="p-3 text-center border-b border-gray-300">Lượt mua</th>
              <th className="p-3 text-center border-b border-gray-300">Đánh giá</th>
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
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-4 text-gray-500 text-center align-middle">
                  <div className="inline-flex gap-2 items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 text-black"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    Đang tải dữ liệu...
                  </div>
                </td>

              </tr>
            ) : (products.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center p-4 text-gray-500">Không có sản phẩm phù hợp</td>
              </tr>) : (
              products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="p-3 border-b border-gray-200 text-center">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover mx-auto rounded" /> : "-"}
                  </td>
                  <td className="p-3 border-b border-gray-200 text-center">{p.productCode}</td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="truncate max-w-[150px] mx-auto">{p.name}</div>
                  </td>
                  <td className="p-3 border-b border-gray-200 text-center">{p.categoryName || "-"}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{p.brandName || "-"}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{p.totalSold}</td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {p.ratingAvg} <FaStar className="text-yellow-400 -mt-1"></FaStar>
                    </div>
                  </td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <button
                      className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition
                        ${p.isActive ? "bg-green-500 text-white hover:bg-green-400"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
                        ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => toggleProductActive(p.id, p.isActive, p.name)}
                      disabled={role !== "ADMIN" && role !== "MANAGER"}
                    >
                      {p.isActive ? "Hoạt động" : "Đã khóa"}
                    </button>
                  </td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <button
                      className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition
                       ${p.isFeatured ? "bg-green-500 text-white hover:bg-green-400"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }
                        ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => toggleProductFeatured(p.id, p.isFeatured, p.name)}
                      disabled={role !== "ADMIN" && role !== "MANAGER"}
                    >
                      {p.isFeatured ? "Nổi bật" : "Không"}
                    </button>
                  </td>
                  {/* <td className="p-3 border-b border-gray-200 text-center">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</td> */}
                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="inline-flex gap-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                        onClick={() => handleEditProduct(p)}
                      >
                        <FiEye></FiEye>
                      </button>
                      <button
                        className={`p-2 text-red-600 hover:bg-red-100 rounded transition 
                        ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => toggleProductDelete(p.id, p.name)}
                        disabled={role !== "ADMIN" && role !== "MANAGER"}
                      >
                        <FiTrash2></FiTrash2>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div className="flex justify-center items-center gap-3 mt-10 pb-5">
          <button
            onClick={() => page > 0 && handleLoadProducts(page - 1)}
            disabled={page === 0}
            className={`p-3 rounded ${page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
          >
            <FaChevronLeft />
          </button>

          {getPageNumbers().map((num, i) =>
            num === "..." ? (
              <span key={i} className="px-2 text-gray-500">...</span>
            ) : (
              <button
                key={i}
                onClick={() => handleLoadProducts(num)}
                className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                                                    ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
              >
                {num + 1}
              </button>
            )
          )}

          <button
            onClick={() => page < totalPages - 1 && handleLoadProducts(page + 1)}
            disabled={page === totalPages - 1}
            className={`p-3 rounded ${page === totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
          >
            <FaChevronRight />
          </button>
        </div>
      )}
      {/* Add/Edit Product Form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[1100px] max-h-[95vh] overflow-y-auto relative">
            <div className="flex justify-between">
              <h3 className="text-3xl font-bold mb-5 text-black">
                {editingProductId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
              </h3>
              {editingProductId && (
                <p className="text-gray-500 text-sm">ID: {form.id}</p>
              )}
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-xl pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg flex items-center gap-2 shadow-lg border border-gray-200">
                  <svg
                    className="animate-spin h-5 w-5 text-gray-700"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span className="text-gray-700 font-medium">Đang xử lý...</span>
                </div>
              </div>
            )}
            <div className="p-1 grid grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              {/* LEFT COLUMN */}
              <div className="space-y-3">
                {/* Tên sản phẩm */}
                <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Tên sản phẩm</span>
                  <input
                    type="text"
                    placeholder="Nhập tên sản phẩm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                  />
                </label>

                {/* Mã sản phẩm */}
                <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Mã sản phẩm</span>
                  <input
                    type="text"
                    placeholder="Nhập mã sản phẩm"
                    value={form.productCode}
                    onChange={(e) => {
                      setForm({ ...form, productCode: e.target.value })
                      setIsCodeManuallyEdited(true);
                    }}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                  />
                </label>

                {/* Slug */}
                <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Slug</span>
                  <input
                    type="text"
                    placeholder="Nhập slug"
                    value={form.slug}
                    onChange={(e) => {
                      setForm({ ...form, slug: e.target.value });
                      setIsSlugManuallyEdited(true);
                    }}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                  />
                </label>

                {/* Danh mục */}
                <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Danh mục</span>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all max-h-20 overflow-y-auto"
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
                  <span className="text-gray-700 font-semibold mb-2 text-black">Thương hiệu</span>
                  <select
                    value={form.brandId}
                    onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                  >
                    <option value="">Chọn thương hiệu</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Hình ảnh */}
                <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Hình ảnh sản phẩm</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="block w-full text-black bg-white border rounded cursor-pointer file:mr-4 file:py-3 file:px-6 file:rounded file:border-0 file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer transition-all"
                  />

                  {(imageFile || form.imageUrl) && (
                    <div className="mt-4 flex flex-col items-center gap-2 relative">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                        alt="Preview"
                        className="w-48 h-48 object-cover rounded border shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setForm({ ...form, imageUrl: "" });
                        }}
                        className="absolute top-1 right-38 w-6 h-5 cursor-pointer hover:text-red-600"
                      >
                        <FaX></FaX>
                      </button>
                    </div>
                  )}
                </label>

                {/* Biến thể chính */}
                {editingProductId && (
                  <label className="flex flex-col">
                    <span className="text-gray-700 font-semibold mb-2 text-black">Biến thể chính</span>
                    <select
                      value={form.mainVariantId}
                      onChange={(e) => setForm({ ...form, mainVariantId: e.target.value })}
                      className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                    >
                      <option value="">Chọn biến thể chính</option>
                      {variants.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-5">
                {/* Mô tả ngắn */}
                <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Mô tả ngắn</span>
                  <textarea
                    placeholder="Nhập mô tả ngắn"
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-700 transition-all h-35 resize-none"
                  />
                </label>

                {/* Mô tả chi tiết */}
                {/* <label className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Mô tả chi tiết</span>
                  <textarea
                    placeholder="Nhập mô tả chi tiết"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-700 transition-all h-45 resize-none"
                  />
                </label> */}
                <div className="flex flex-col">
                  <span className="text-gray-700 font-semibold mb-2 text-black">Mô tả chi tiết</span>
                  <RichTextEditor
                    value={form.description}
                    onChange={(value) => handleDescriptionChange(value)}
                    onImageUpload={handleUploadImage}
                  />
                </div>

                {/* Thông số kỹ thuật */}
                <div className="border p-5 rounded">
                  <h4 className="font-semibold mb-4 text-black text-lg">Thông số kỹ thuật</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(specs).map(([id, spec]) => (
                      <div key={id} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Tên thông số"
                          value={spec.key}
                          onChange={(e) => updateSpecKey(id, e.target.value)}
                          className="bg-white border p-2 rounded text-black placeholder-gray-400 flex-1 focus:outline-none text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Giá trị"
                          value={spec.value}
                          onChange={(e) => updateSpecValue(id, e.target.value)}
                          className="bg-white border p-2 rounded text-black placeholder-gray-400 flex-1 focus:outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpec(id)}
                          className="px-3 bg-rose-500 text-white rounded hover:bg-rose-600 cursor-pointer transition-colors font-medium text-sm"
                        >
                          <FaX />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addSpec}
                    className="mt-3 px-4 py-2 bg-white border text-black rounded hover:bg-gray-100 transition-colors font-semibold w-full"
                  >
                    + Thêm thông số
                  </button>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t-2 border-gray-200">
              <button
                onClick={closeAndResetForm}
                className={`px-8 py-3 bg-white border text-black rounded hover:bg-gray-100 transition-colors font-semibold`}
              >
                Hủy
              </button>
              <button
                onClick={editingProductId ? handleUpdateProduct : handleCreateProduct}
                className={`flex items-center gap-1 px-8 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors font-semibold
                   ${role !== "ADMIN" && role !== "MANAGER" ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={role !== "ADMIN" && role !== "MANAGER"}
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
        onConfirm={async () => {
          if (confirmPanel.onConfirm) {
            await confirmPanel.onConfirm();
          }
          closeConfirmPanel();
        }}
        onCancel={closeConfirmPanel}
      />

    </div>
  );
}
