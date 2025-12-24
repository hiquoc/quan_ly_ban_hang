import { useContext, useEffect, useState } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw, FiFilter, FiChevronRight, FiChevronLeft, FiEye, FiTrash2 } from "react-icons/fi";
import {
    getAllVariants,
    createVariant,
    updateVariant,
    changeVariantActive,
    deleteVariant,
    getAllProducts
} from "../../../apis/productApi";
import { getInventoriesByVariantId } from "../../../apis/inventoryApi";
import SearchableSelect from "../../../components/SearchableSelect";
import { FaChevronLeft } from "react-icons/fa";
import { FaChevronRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";

export default function ProductVariantManager() {
    const { role } = useContext(AuthContext)
    const navigate = useNavigate();
    const [variants, setVariants] = useState([]);
    const [products, setProducts] = useState([]);
    const [inventoryModal, setInventoryModal] = useState({
        visible: false,
        variantId: null,
        data: [],
    });
    const [showForm, setShowForm] = useState(false);

    const [searchKeyword, setSearchKeyword] = useState("");
    const [popup, setPopup] = useState({ message: "", type: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });

    const [form, setForm] = useState({
        id: 0,
        productId: 0,
        name: "",
        sku: "",
        basePrice: "",
        discountPercent: 0,
        importPrice: "",
    });
    const [attributesList, setAttributesList] = useState([]);
    const [images, setImages] = useState([]);
    const [editingVariantId, setEditingVariantId] = useState(null);

    const [showFilters, setShowFilters] = useState(false);
    const [filterActive, setFilterActive] = useState(true);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterDiscount, setFilterDiscount] = useState(null);
    const [filterMinPrice, setFilterMinPrice] = useState("");
    const [filterMaxPrice, setFilterMaxPrice] = useState("");
    const [filterProductId, setFilterProductId] = useState(null);
    const [productOptions, setProductOptions] = useState([]);
    const [productSearch, setProductSearch] = useState("");

    const [isBasePriceFocused, setIsBasePriceFocused] = useState(false);
    const [isImportPriceFocused, setIsImportPriceFocused] = useState(false);

    const [page, setPage] = useState(0)
    const [size, setSize] = useState(10)
    const [totalPages, setTotalPages] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false)
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        handleLoadVariants();
        handleLoadProducts();
    }, [])

    useEffect(() => {
        if (!isSkuManuallyEdited) {
            setForm((prev) => ({ ...prev, sku: generateSku(prev.name) }));
        }
        if (form.name === "") setIsSkuManuallyEdited(false);
    }, [form.name]);

    useEffect(() => {
        if (productSearch === "") return;

        const timeout = setTimeout(async () => {
            const res = await getAllProducts(0, 5, productSearch);
            if (!res.error) {
                setProductOptions(
                    res.data.content.map(p => ({ label: p.name, value: p.id }))
                );
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [productSearch]);

    const handleLoadVariants = async (searchPage = page) => {
        try {
            setPage(searchPage)
            setIsLoading(true);
            const res = await getAllVariants({
                page: searchPage, size, productId: filterProductId, keyword: searchKeyword, active: filterActive, status: filterStatus
                , discount: filterDiscount, minPrice: filterMinPrice, maxPrice: filterMaxPrice
            });
            if (res.error) {
                console.error(res.error);
                setVariants([]);
                setPopup({ message: "Có lỗi khi tải dữ liệu biến thể!", type: "error" });
                return;
            }
            // console.log(res.data.content)
            setVariants(res.data.content);
            setTotalPages(res.data.totalPages)
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleLoadProducts = async (keyword = "") => {
        const res = await getAllProducts(0, 5, keyword);
        if (!res.error) {
            setProducts(res.data.content || []);
        } else {
            setPopup({ message: res.error, type: "error" });
        }
    };

    const handleShowInventory = async (variantId) => {
        const res = await getInventoriesByVariantId(variantId);
        if (res.error) {
            setPopup({ message: "Có lỗi khi lấy dữ liệu từ kho!", type: "error" });
            return;
        }

        setInventoryModal({
            visible: true,
            variantId,
            data: res.data || [],
        });
    };

    const handleAddVariant = () => {
        setForm({ productId: "", name: "", sku: "", basePrice: "", discountPercent: 0, importPrice: 0, createdAt: "" });
        setAttributesList([{ id: crypto.randomUUID(), key: "Màu", value: "" }]);
        setImages([])
        setEditingVariantId(null);
        handleLoadProducts();
        setShowForm(true);
    };

    const handleEditVariant = (v) => {
        const firstWord = v.name?.split(" ")[0] || "";
        handleLoadProducts(firstWord);
        setForm({
            id: v.id,
            productId: v.productId,
            name: v.name,
            sku: v.sku,
            basePrice: v.basePrice || "",
            sellingPrice: v.sellingPrice || "",
            discountPercent: v.discountPercent || 0,
            importPrice: v.importPrice || 0,
            createdAt: v.createdAt || ""
        });
        const list = Object.entries(v.attributes || {}).map(([key, value]) => ({
            id: crypto.randomUUID(),
            key,
            value
        }));
        setAttributesList(list);
        setIsSkuManuallyEdited(true)
        setEditingVariantId(v.id);

        const imgs = Object.entries(v.imageUrls).map(([key, url], idx) => ({
            key,
            url,
            file: null,
            isMain: key === "main",
        }));
        setImages(imgs);
        setShowForm(true);
    };


    const handleCreateVariant = async () => {
        if (!validateAttributes()) return;
        setIsSubmitting(true);
        try {
            const res = await createVariant(form.productId, form.name, form.sku, attributesObject, images);
            if (res.error) return setPopup({ message: res.error, type: "error" });
            // setPopup({ message: "Tạo biến thể thành công!", type: "success" });
            setShowForm(false);
            setImages([]);
            setVariants(prev => [res.data, ...prev])
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateVariant = async () => {
        if (!validateAttributes()) return;
        setIsSubmitting(true);
        try {
            const payload = { ...form, attributes: attributesObject };
            const res = await updateVariant(
                editingVariantId,
                payload.productId,
                payload.name,
                payload.sku,
                payload.basePrice,
                payload.discountPercent,
                payload.importPrice,
                payload.attributes,
                images
            );
            if (res?.error) return setPopup({ message: res.error, type: "error" });
            setPopup({ message: "Cập nhật biến thể thành công!", type: "success" });
            setShowForm(false);
            // console.log(res)
            setVariants(prev => prev.map(v => v.id === editingVariantId ? res.data : v))
            // handleLoadVariants();
        } finally {
            setIsSubmitting(false);
        }
    };


    const toggleVariantActive = (id, isActive, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc muốn ${isActive ? "khóa" : "mở"} biến thể "${name}"?`,
            onConfirm: async () => {
                const res = await changeVariantActive(id);
                if (res?.error) return setPopup({ message: res.error, type: "error" });
                setPopup({ message: "Cập nhật trạng thái thành công!", type: "success" });
                setVariants(prev => prev.map(v => v.id === id ? { ...v, active: !v.active } : v));
            }
        });
    };

    const handleDeleteVariant = (id, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc muốn xóa biến thể "${name}"?`,
            onConfirm: async () => {
                const res = await deleteVariant(id);
                if (res?.error) return setPopup({ message: res.error, type: "error" });
                setPopup({ message: "Xóa biến thể thành công!", type: "success" });
                setVariants(prev => prev.filter(v => v.id !== id));
            }
        });
    };

    const closeForm = () => {
        setShowForm(false);
        setForm({ productId: "", name: "", sku: "", basePrice: "", discountPercent: 0, importPrice: 0, createdAt: "" });
        setAttributesList([]);
        setIsSkuManuallyEdited(true);
        setImages([]);
        setEditingVariantId(null);
    };

    const addAttribute = () => {
        setAttributesList(prev => [...prev, { id: crypto.randomUUID(), key: "", value: "" }]);
    };

    const removeAttribute = (id) => {
        setAttributesList(prev => prev.filter(attr => attr.id !== id));
    };

    const updateAttributeKey = (id, newKey) => {
        setAttributesList(prev => prev.map(attr => attr.id === id ? { ...attr, key: newKey } : attr));
    };

    const updateAttributeValue = (id, newValue) => {
        setAttributesList(prev => prev.map(attr => attr.id === id ? { ...attr, value: newValue } : attr));
    };

    const validateAttributes = () => {
        for (const attr of attributesList) {
            if (!attr.key.trim() || !attr.value.trim()) {
                setPopup({ message: "Vui lòng điền đầy đủ đặc điểm và giá trị!", type: "error" });
                return false;
            }
        }
        return true;
    };

    const attributesObject = Object.fromEntries(attributesList.map(attr => [attr.key, attr.value]));

    const handleMultiImageUpload = (files) => {
        const maxSize = 5 * 1024 * 1024; // 5MB per file
        const validFiles = Array.from(files).filter(file => file.size <= maxSize);

        if (validFiles.length !== files.length) {
            setPopup({ message: "Một số file vượt quá kích thước tối đa 5MB và sẽ bị bỏ qua!" });
        }

        const fileArray = validFiles.map((file) => ({
            key: crypto.randomUUID(), // unique key for React
            file,
            url: URL.createObjectURL(file),
            isMain: false,
        }));

        setImages((prev) => [...prev, ...fileArray]);
    };


    const removeImage = (keyOrUrl) => {
        setImages(prev =>
            prev.map(img =>
                (img.key === keyOrUrl || img.url === keyOrUrl)
                    ? { ...img, deleted: true }
                    : img
            )
        );
    };

    const setMainImage = (imageKey) => {
        setImages(prev => prev.map(img => ({ ...img, isMain: img.key === imageKey })));
    };

    const generateSku = (text) => {
        if (text === null || text === undefined) return
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
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-semibold text-gray-800">Biến thể sản phẩm</h2>
                <div className="flex gap-2">
                    <button onClick={() => handleLoadVariants(0)} className="flex items-center px-4 py-2 border rounded hover:bg-gray-200">
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
                    </button>
                    <button onClick={handleAddVariant} className={`px-4 py-2 bg-black text-white rounded hover:bg-gray-800
                     ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={role !== "ADMIN" && role !== "MANAGER"}>
                        Thêm biến thể
                    </button>
                </div>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-wrap gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Tìm kiếm tên hoặc SKU..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    className="border p-2 rounded w-64"
                />
                <button
                    onClick={() => handleLoadVariants(0)}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
                >
                    Tìm
                </button>
                <button
                    onClick={() => setShowFilters(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-200"
                >
                    <FiFilter /> Bộ lọc
                </button>
            </div>

            {showFilters && (
                <div className="absolute left-145 z-10 mt-2 bg-white border shadow-lg rounded-lg p-4 w-80">
                    <div>
                        <div className="relative flex flex-col gap-3 max-h-75 overflow-y-auto p-1 pr-5">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sản phẩm</label>
                                <SearchableSelect
                                    options={products.map(p => ({ label: `${p.name}`, value: p.id }))}
                                    value={filterProductId}
                                    placeholder="Chọn sản phẩm"
                                    disabled={isSubmitting}
                                    onChange={(selectedId) => {
                                        setFilterProductId(selectedId);
                                    }}
                                    onInputChange={(inputValue) => handleLoadProducts(inputValue)}
                                />


                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Trạng thái</label>
                                <select value={filterActive ?? ""} onChange={e => setFilterActive(e.target.value === "" ? null : e.target.value === "true")} className="border p-2 rounded w-full">
                                    <option value="">Tất cả</option>
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Đã khóa</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Số lượng hàng</label>
                                <select value={filterStatus ?? ""} onChange={e => setFilterStatus(e.target.value === "" ? null : e.target.value)} className="border p-2 rounded w-full">
                                    <option value="">Tất cả</option>
                                    <option value="AVAILABLE">Còn hàng</option>
                                    <option value="LOW_STOCK">Sắp hết</option>
                                    <option value="OUT_OF_STOCK">Hết hàng</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Giảm giá</label>
                                <select value={filterDiscount ?? ""} onChange={e => setFilterDiscount(e.target.value === "" ? null : e.target.value === "true")} className="border p-2 rounded w-full">
                                    <option value="">Tất cả</option>
                                    <option value="true">Đang giảm giá</option>
                                    <option value="false">Không có giảm giá</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Giá tối thiểu</label>
                                <input type="number" value={filterMinPrice} onChange={e => setFilterMinPrice(e.target.value === "" ? null : e.target.value)} className="border p-2 rounded w-full" />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Giá tối đa</label>
                                <input type="number" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value === "" ? null : e.target.value)} className="border p-2 rounded w-full" />
                            </div>
                        </div>

                        <div className="= flex justify-end mt-4 gap-2">
                            <button
                                onClick={() => {
                                    setFilterActive(null);
                                    setFilterDiscount(null);
                                    setFilterMinPrice(null);
                                    setFilterMaxPrice(null);
                                    setProductOptions([]);
                                    setFilterProductId(null);
                                }}
                                className="px-3 py-2 border rounded hover:bg-gray-100"
                            >
                                Đặt lại
                            </button>

                            <button
                                onClick={() => {
                                    handleLoadVariants(0);
                                    setShowFilters(false);
                                }}
                                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                            >
                                Lọc
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                    <thead className="bg-gray-200 text-gray-700 font-medium">
                        <tr>
                            <th className="p-3 text-center border-b border-gray-300">Hình ảnh</th>
                            <th className="p-3 text-center border-b border-gray-300">Tên biến thể</th>
                            <th className="p-3 text-center border-b border-gray-300">SKU</th>
                            <th className="p-3 text-center border-b border-gray-300">Giá bán</th>
                            <th className="p-3 text-center border-b border-gray-300">Lượt mua</th>
                            <th className="p-3 text-center border-b border-gray-300">Trạng thái</th>
                            <th className="p-3 text-center border-b border-gray-300">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="p-4 text-gray-500 text-center align-middle">
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
                        ) : (
                            variants.length === 0 ?
                                (<tr>
                                    <td colSpan={9} className="text-center p-4 text-gray-500">Không có biến thể phù hợp</td>
                                </tr>) :
                                (variants.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50 transition">
                                        <td className="p-2 border-b border-gray-200 text-center">
                                            <img src={v.imageUrls?.main} alt={v.name}
                                                className="h-18 w-18 object-contain mx-auto rounded cursor-pointer"
                                                onClick={() => navigate(`/admin/product/${v.productSlug}?sku=${v.sku}`)} />
                                        </td>
                                        <td className="p-2 border-b border-gray-200 text-center">{v.name}</td>
                                        <td className="p-2 border-b border-gray-200 text-center">{v.sku}</td>

                                        <td className={`p-2 border-b border-gray-200 text-center ${v.discountPercent > 0 ? "text-red-500 font-semibold" : ""
                                            }`}>
                                            {v.sellingPrice?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                        </td>
                                        <td className="p-2 border-b border-gray-200 text-center">{v.soldCount ?? 0}</td>
                                        <td className="p-2 border-b border-gray-200 text-center">
                                            <button
                                                className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition
                                                    ${v.active ? "bg-green-500 text-white hover:bg-green-400"
                                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                    }
                                                    ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                                                onClick={() => toggleVariantActive(v.id, v.active, v.name)}
                                                disabled={role !== "ADMIN" && role !== "MANAGER"}
                                            >
                                                {v.active ? "Hoạt động" : "Đã khóa"}
                                            </button>
                                            <button
                                                className={`ml-1 px-3 py-1 rounded-full text-sm ${v.status === "AVAILABLE" ? "bg-green-500 text-white hover:bg-green-400" : (v.status === "OUT_OF_STOCK" ? "bg-red-500 text-white hover:bg-red-400" : "bg-yellow-400 text-white hover:bg-yellow-300")}`}
                                                onClick={() => handleShowInventory(v.id)}
                                            >
                                                {v.status === "AVAILABLE" ? "Còn hàng" : (v.status === "OUT_OF_STOCK" ? "Hết hàng" : "Sắp hết")}
                                            </button>

                                        </td>
                                        <td className="p-2 border-b border-gray-200 text-center">
                                            <button className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                                                onClick={() => handleEditVariant(v)}>
                                                <FiEye></FiEye>
                                            </button>
                                            <button className={`p-2 text-red-600 hover:bg-red-100 rounded transition
                                             ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                                                disabled={role !== "ADMIN" && role !== "MANAGER"}
                                                onClick={() => handleDeleteVariant(v.id, v.name)}>
                                                <FiTrash2></FiTrash2></button>
                                        </td>
                                    </tr>)
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                    <button
                        onClick={() => page > 0 && handleLoadVariants(page - 1)}
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
                                onClick={() => handleLoadVariants(num)}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                                                    ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                            >
                                {num + 1}
                            </button>
                        )
                    )}

                    <button
                        onClick={() => page < totalPages - 1 && handleLoadVariants(page + 1)}
                        disabled={page === totalPages - 1}
                        className={`p-3 rounded ${page === totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-[1100px] my-10 relative">
                        <div className="flex justify-between">
                            <h3 className="text-3xl font-bold mb-3 text-black">
                                {editingVariantId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
                            </h3>
                            {editingVariantId && (
                                <p className="text-gray-500 text-sm">ID: {form.id}</p>
                            )}
                        </div>
                        {isSubmitting && (
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
                                {/* Sản phẩm */}
                                <label className="flex flex-col">
                                    <span className="text-gray-700 font-semibold mb-2 text-black">Sản phẩm</span>
                                    <SearchableSelect
                                        options={products.map(p => ({ label: `${p.name}`, value: p.id }))}
                                        value={form.productId}
                                        onChange={id => {
                                            const selectedProduct = products.find((p) => p.id === id);
                                            setForm({
                                                ...form,
                                                productId: id,
                                                name: selectedProduct?.name || form.productName,
                                            });
                                        }}
                                        placeholder="Tìm hoặc chọn sản phẩm..."

                                        onInputChange={(keyword) => handleLoadProducts(keyword)}
                                    />
                                </label>

                                {/* Tên biến thể */}
                                <label className="flex flex-col">
                                    <span className="text-gray-700 font-semibold mb-2 text-black">Tên biến thể</span>
                                    <input

                                        type="text"
                                        placeholder="Nhập tên biến thể"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className={`border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all `}
                                    />
                                </label>

                                {/* SKU */}
                                <label className="flex flex-col">
                                    <span className="text-gray-700 font-semibold mb-2 text-black">SKU</span>
                                    <input

                                        type="text"
                                        placeholder="Nhập SKU"
                                        value={form.sku}
                                        onChange={(e) => {
                                            setForm({ ...form, sku: e.target.value });
                                            setIsSkuManuallyEdited(true)
                                        }}
                                        className={`border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all `}
                                    />
                                </label>


                                {/* Giá - Only in edit mode */}
                                {editingVariantId && (
                                    <>
                                        <label className="flex flex-col">
                                            <span className="text-gray-700 font-semibold mb-2 text-black">Giá gốc</span>
                                            <input
                                                type="text"
                                                placeholder="Nhập giá gốc"
                                                value={
                                                    isBasePriceFocused
                                                        ? form.basePrice ?? ""
                                                        : form.basePrice
                                                            ? form.basePrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
                                                            : ""
                                                }

                                                onFocus={() => setIsBasePriceFocused(true)}
                                                onBlur={() => setIsBasePriceFocused(false)}
                                                onChange={(e) => {
                                                    const rawValue = Number(e.target.value.replace(/\D/g, "")) || 0;
                                                    const discount = Number(form.discountPercent) || 0;
                                                    setForm({
                                                        ...form,
                                                        basePrice: rawValue,
                                                        sellingPrice: rawValue * (1 - discount / 100),
                                                    });
                                                }}
                                                className={`border p-3 rounded text-black focus:outline-none focus:ring focus:ring-gray-700 transition-all ${isSubmitting ? "bg-gray-100 cursor-not-allowed" : " "}`}
                                            />
                                        </label>

                                        <label className="flex flex-col">
                                            <span className="text-gray-700 font-semibold mb-2 text-black">Giảm giá (%)</span>
                                            <input

                                                type="number"
                                                placeholder="Nhập giảm giá %"
                                                value={form.discountPercent}
                                                onChange={(e) => {
                                                    const discount = Number(e.target.value) || 0;
                                                    const basePrice = Number(form.basePrice) || 0;
                                                    setForm({
                                                        ...form,
                                                        discountPercent: discount,
                                                        sellingPrice: basePrice * (1 - discount / 100),
                                                    });
                                                }}
                                                className={`border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all `}
                                            />
                                        </label>

                                        <label className="flex flex-col">
                                            <span className="text-gray-700 font-semibold mb-2 text-black">Giá bán</span>
                                            <input
                                                type="text"
                                                placeholder="Giá bán"
                                                disabled
                                                value={form.sellingPrice ? form.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : ""}
                                                className="bg-gray-100 border p-3 rounded text-black"
                                            />
                                        </label>

                                        <label className="flex flex-col">
                                            <span className="text-gray-700 font-semibold mb-2 text-black">Giá nhập</span>
                                            <input
                                                type="text"
                                                value={
                                                    isImportPriceFocused
                                                        ? form.importPrice ?? ""
                                                        : form.importPrice
                                                            ? form.importPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
                                                            : ""
                                                }

                                                onFocus={() => setIsImportPriceFocused(true)}
                                                onBlur={() => setIsImportPriceFocused(false)}
                                                onChange={(e) => {
                                                    const rawValue = Number(e.target.value.replace(/\D/g, "")) || 0;
                                                    setForm({ ...form, importPrice: rawValue });
                                                }}
                                                className={`border p-3 rounded text-black focus:outline-none focus:ring focus:ring-gray-700 transition-all ${isImportPriceFocused ? "" : "bg-gray-100 "}`}
                                            />
                                        </label>

                                        <label className="flex flex-col">
                                            <span className="text-gray-700 font-semibold mb-2 text-black">Ngày tạo</span>
                                            <input
                                                type="text"
                                                value={form.createdAt ? new Date(form.createdAt).toLocaleString() : ""}
                                                disabled
                                                className="bg-gray-100 border p-3 rounded text-black"
                                            />
                                        </label>
                                    </>
                                )}
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-5">
                                {/* Đặc điểm */}
                                <div className="border p-5 rounded">
                                    <h4 className="font-semibold mb-4 text-black text-lg">Đặc điểm</h4>
                                    <div className="space-y-3 max-h-64">
                                        {attributesList.map(attr => (
                                            <div key={attr.id} className="flex gap-2">
                                                <input

                                                    type="text"
                                                    placeholder="Đặc tính"
                                                    value={attr.key}
                                                    onChange={e => updateAttributeKey(attr.id, e.target.value)}
                                                    className={`border p-2 rounded text-black placeholder-gray-400 flex-1 focus:outline-none text-sm `}
                                                />
                                                <input

                                                    type="text"
                                                    placeholder="Giá trị"
                                                    value={attr.value}
                                                    onChange={e => updateAttributeValue(attr.id, e.target.value)}
                                                    className={`border p-2 rounded text-black placeholder-gray-400 flex-1 focus:outline-none text-sm `}
                                                />
                                                <button

                                                    type="button"
                                                    onClick={() => removeAttribute(attr.id)}
                                                    className={`px-3 bg-rose-500 text-white rounded hover:bg-rose-600 cursor-pointer transition-colors font-medium text-sm }`}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button

                                        type="button"
                                        onClick={addAttribute}
                                        className={`mt-3 px-4 py-2 bg-white border text-black rounded hover:bg-gray-100 transition-colors font-semibold w-full }`}
                                    >
                                        + Thêm đặc điểm
                                    </button>
                                </div>
                                {/* Hình ảnh */}
                                <div className="border p-5 rounded">
                                    <h4 className="font-semibold mb-4 text-black text-lg">Hình ảnh</h4>

                                    {/* Upload multiple images */}
                                    <input

                                        key={images.length}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleMultiImageUpload(e.target.files)}
                                        className="block w-full text-black bg-white border rounded cursor-pointer file:mr-4 file:py-3 file:px-6 file:rounded file:border-0 file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer transition-all"
                                    />

                                    {/* Image list with main selection */}
                                    <div className="grid grid-cols-2 gap-3 mt-4 max-h-65 overflow-y-auto">
                                        {images.filter(img => (!img.deleted && img.url)).map((img) => (
                                            <div key={img.key} className="relative flex flex-col items-center border rounded p-2">
                                                <img src={img.url} alt="" className="w-full h-32 object-contain rounded" />
                                                <div className="flex justify-between items-center w-full mt-2">
                                                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                                                        <input

                                                            type="radio"
                                                            name="mainImage"
                                                            checked={img.isMain}
                                                            onChange={() => setMainImage(img.key)}
                                                            className="cursor-pointer"
                                                        />
                                                        Ảnh chính
                                                    </label>
                                                    <button

                                                        type="button"
                                                        onClick={() => removeImage(img.key)}
                                                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t-2 border-gray-200">
                            <button
                                onClick={closeForm}

                                className={`px-8 py-3 bg-white border text-black rounded hover:bg-gray-100 transition-colors font-semibold }`}
                            >
                                Hủy
                            </button>

                            <button
                                onClick={editingVariantId ? handleUpdateVariant : handleCreateVariant}
                                className={`px-8 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors font-semibold flex items-center justify-center gap-2
                                     ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                                disabled={role !== "ADMIN" && role !== "MANAGER"}
                            >
                                {editingVariantId ? "Cập nhật" : "Thêm"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
            {inventoryModal.visible && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[500px] max-h-[80vh] overflow-auto">
                        <h3 className="text-xl font-semibold mb-4">Kho hàng</h3>
                        {inventoryModal.data.length === 0 ? (
                            <p>Không có dữ liệu kho hàng</p>
                        ) : (
                            <table className="min-w-full border rounded">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="p-2 border">Kho</th>
                                        <th className="p-2 border">Số lượng</th>
                                        <th className="p-2 border">Đã đặt trước</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryModal.data.map((inv) => (
                                        <tr key={inv.id} className="text-center border">
                                            <td className="p-2 border">{inv.warehouse?.name || "-"}</td>
                                            <td className="p-2 border">{inv.quantity}</td>
                                            <td className="p-2 border">{inv.reservedQuantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setInventoryModal({ visible: false, variantId: null, data: [] })}
                                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Popup */}
            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />

            {/* Confirm Panel */}
            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={async () => {
                    if (confirmPanel.onConfirm) {
                        await confirmPanel.onConfirm();
                    }
                    setConfirmPanel({ visible: false, message: "", onConfirm: null });
                }}
                onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
            />
        </div>
    );
}
