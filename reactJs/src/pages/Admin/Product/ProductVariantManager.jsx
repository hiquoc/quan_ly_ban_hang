import { useEffect, useState } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw, FiFilter, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import {
    getAllVariants,
    createVariant,
    updateVariant,
    changeVariantActive,
    deleteVariant,
    getAllProducts
} from "../../../apis/productApi";
import { getInventoriesByVariantId } from "../../../apis/inventoryApi";

export default function ProductVariantManager() {
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
        productId: 0,
        name: "",
        sku: "",
        basePrice: "",
        discountPercent: 0,

    });
    const [attributesList, setAttributesList] = useState([]);
    const [images, setImages] = useState([]);
    const [editingVariantId, setEditingVariantId] = useState(null);

    const [showFilters, setShowFilters] = useState(false);
    const [filterActive, setFilterActive] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterDiscount, setFilterDiscount] = useState(null);
    const [filterMinPrice, setFilterMinPrice] = useState("");
    const [filterMaxPrice, setFilterMaxPrice] = useState("");

    const [page, setPage] = useState(0)
    const [size, setSize] = useState(10)
    const [totalPages, setTotalPages] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false)

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

    const handleLoadVariants = async (searchPage = page) => {
        const res = await getAllVariants({
            page: searchPage, size, keyword: searchKeyword, active: filterActive, status: filterStatus
            , discount: filterDiscount, minPrice: filterMinPrice, maxPrice: filterMaxPrice
        });
        if (res.error) {
            console.error(res.error);
            setVariants([]);
            setPopup({ message: "Có lỗi khi tải dữ liệu biến thể!", type: "error" });
            return;
        }
        setVariants(res.data.content);
        setPage(searchPage)
        setTotalPages(res.data.totalPages)
    };

    const handleLoadProducts = async () => {
        const res = await getAllProducts();
        if (res.error) {
            console.error(res.error);
            setProducts([]);
            setPopup({ message: "Có lỗi khi tải danh sách sản phẩm!", type: "error" });
            return;
        }
        setProducts(res.data.content || []);
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
        setAttributesList([]);
        setImages([])
        setEditingVariantId(null);
        setShowForm(true);
    };

    const handleEditVariant = (v) => {
        setForm({
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
            setPopup({ message: "Tạo biến thể thành công!", type: "success" });
            setShowForm(false);
            setImages([]);
            handleLoadVariants();
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
                payload.attributes,
                images
            );
            if (res?.error) return setPopup({ message: res.error, type: "error" });
            setPopup({ message: "Cập nhật biến thể thành công!", type: "success" });
            setShowForm(false);
            handleLoadVariants();
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
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-semibold text-gray-800">Biến thể sản phẩm</h2>
                <div className="flex gap-2">
                    <button onClick={() => handleLoadVariants(0)} className="flex items-center px-4 py-2 border rounded hover:bg-gray-300">
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Reload
                    </button>
                    <button onClick={handleAddVariant} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
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
                    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                    Tìm
                </button>
                <button
                    onClick={() => setShowFilters(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    <FiFilter /> Bộ lọc
                </button>
            </div>

            {showFilters && (
                <div className="absolute left-145 z-10 mt-2 bg-white border shadow-lg rounded-lg p-4 w-80">
                    <div className="flex flex-col gap-3 max-h-120 overflow-y-auto p-1">
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

                        <div className="flex justify-end mt-4 gap-2">
                            <button
                                onClick={() => {
                                    setFilterActive(null);
                                    setFilterDiscount(null);
                                    setFilterMinPrice(null);
                                    setFilterMaxPrice(null);
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
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                            <th className="p-3 text-center border-b border-gray-300">ID</th>
                            <th className="p-3 text-center border-b border-gray-300">Tên biến thể</th>
                            <th className="p-3 text-center border-b border-gray-300">SKU</th>
                            <th className="p-3 text-center border-b border-gray-300">Hình ảnh</th>
                            <th className="p-3 text-center border-b border-gray-300">Giá bán</th>
                            <th className="p-3 text-center border-b border-gray-300">Lượt mua</th>
                            <th className="p-3 text-center border-b border-gray-300">Trạng thái</th>
                            <th className="p-3 text-center border-b border-gray-300">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {variants.map(v => (
                            <tr key={v.id} className="hover:bg-gray-50 transition">
                                <td className="p-2 border-b border-gray-200 text-center">{v.id}</td>
                                <td className="p-2 border-b border-gray-200 text-center">{v.name}</td>
                                <td className="p-2 border-b border-gray-200 text-center">{v.sku}</td>
                                <td className="p-2 border-b border-gray-200 text-center">
                                    <img src={v.imageUrls?.main} alt={v.name} className="h-30 w-30 object-contain mx-auto rounded" />
                                </td>
                                <td className={`p-2 border-b border-gray-200 text-center ${v.discountPercent > 0 ? "text-red-500 font-semibold" : ""
                                    }`}>
                                    {v.sellingPrice?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                </td>
                                <td className="p-2 border-b border-gray-200 text-center">{v.soldCount ?? 0}</td>
                                <td className="p-2 border-b border-gray-200 text-center">
                                    <button
                                        className={`px-3 py-1 rounded mr-2 ${v.active ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                                        onClick={() => toggleVariantActive(v.id, v.active, v.name)}
                                    >
                                        {v.active ? "Hoạt động" : "Đã khóa"}
                                    </button>
                                    <button
                                        className={`px-3 py-1 rounded ${v.status === "AVAILABLE" ? "bg-green-500 text-white hover:bg-green-600" : (v.status === "OUT_OF_STOCK" ? "bg-red-500 text-white hover:bg-red-600" : "bg-yellow-400 text-white hover:bg-yellow-500")}`}
                                        onClick={() => handleShowInventory(v.id)}
                                    >
                                        {v.status === "AVAILABLE" ? "Còn hàng" : (v.status === "OUT_OF_STOCK" ? "Hết hàng" : "Sắp hết")}
                                    </button>

                                </td>
                                <td className="p-2 border-b border-gray-200 text-center">
                                    <button className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2"
                                        onClick={() => handleEditVariant(v)}>
                                        Chi tiết
                                    </button>
                                    <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => handleDeleteVariant(v.id, v.name)}>Xóa</button>
                                </td>
                            </tr>
                        ))}
                        {variants.length === 0 && (
                            <tr>
                                <td colSpan={9} className="text-center p-4 text-gray-500">Không có biến thể phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-4">
                <button
                    disabled={page === 0}
                    onClick={() => handleLoadVariants(page - 1)}
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
                    onClick={() => handleLoadVariants(page + 1)}
                    className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
                >
                    <span className="mr-2">Sau</span>
                    <FiChevronRight className="w-5 h-5 -mr-2" />
                </button>
            </div>
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[600px] max-h-[90vh] overflow-auto">
                        <h3 className="text-xl font-semibold mb-4">
                            {editingVariantId ? "Chỉnh sửa biến thể" : "Thêm biến thể"}
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Sản phẩm */}
                            <label className="flex flex-col">
                                <span className="text-sm font-medium mb-1">Sản phẩm</span>
                                <select
                                    value={form.productId}
                                    onChange={(e) => {
                                        const selectedId = Number(e.target.value);
                                        setForm({ ...form, productId: selectedId });
                                    }}

                                    className="border p-2 rounded"
                                >
                                    <option value="">Chọn sản phẩm</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {/* Tên biến thể */}
                            <label className="flex flex-col">
                                <span className="text-sm font-medium mb-1">Tên biến thể</span>
                                <input
                                    type="text"
                                    placeholder="Tên biến thể"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="border p-2 rounded"
                                />
                            </label>

                            {/* SKU */}
                            <label className="flex flex-col">
                                <span className="text-sm font-medium mb-1">SKU</span>
                                <input
                                    type="text"
                                    placeholder="SKU"
                                    value={form.sku}
                                    onChange={(e) => {
                                        setForm({ ...form, sku: e.target.value });
                                        setIsSkuManuallyEdited(true)
                                    }}
                                    className="border p-2 rounded"
                                />
                            </label>

                            {/* Đặc điểm */}
                            <div className="border p-2 rounded">
                                <h4 className="font-semibold mb-2">Đặc điểm</h4>
                                {attributesList.map(attr => (
                                    <div key={attr.id} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Đặc tính"
                                            value={attr.key}
                                            onChange={e => updateAttributeKey(attr.id, e.target.value)}
                                            className="border p-1 rounded w-32"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Giá trị"
                                            value={attr.value}
                                            onChange={e => updateAttributeValue(attr.id, e.target.value)}
                                            className="border p-1 rounded w-32"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeAttribute(attr.id)}
                                            className="px-2 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addAttribute}
                                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Thêm đặc điểm
                                </button>
                            </div>

                            {/* Hình ảnh */}
                            <div className="border p-2 rounded">
                                <h4 className="font-semibold mb-2">Hình ảnh</h4>

                                {/* Upload multiple images */}
                                <input
                                    key={images.length}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleMultiImageUpload(e.target.files)}
                                    className="block w-full text-sm text-gray-700 border border-gray-300 rounded cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                                />

                                {/* Image list with main selection */}
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {images.filter(img => (!img.deleted && img.url)).map((img) => (
                                        <div key={img.key} className="relative flex flex-col items-center border rounded p-1">
                                            <img src={img.url} alt="" className="w-full h-32 object-cover rounded" />
                                            <div className="flex justify-between items-center w-full mt-1">
                                                <label className="flex items-center gap-1 text-sm">
                                                    <input
                                                        type="radio"
                                                        name="mainImage"
                                                        checked={img.isMain}
                                                        onChange={() => setMainImage(img.key)}
                                                    />
                                                    Ảnh chính
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(img.key)}
                                                    className="text-xs text-red-600 hover:underline"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                </div>
                            </div>

                            {/* Giá */}
                            {editingVariantId && (
                                <>
                                    <label className="flex flex-col">
                                        <span className="text-sm font-medium mb-1">Giá gốc</span>
                                        <input
                                            type="number"
                                            placeholder="Giá gốc"
                                            value={form.basePrice}
                                            onChange={(e) => {
                                                const basePrice = Number(e.target.value) || 0;
                                                const discount = Number(form.discountPercent) || 0;
                                                setForm({
                                                    ...form,
                                                    basePrice,
                                                    sellingPrice: basePrice * (1 - discount / 100),
                                                });
                                            }}
                                            className="border p-2 rounded"
                                        />
                                    </label>

                                    <label className="flex flex-col">
                                        <span className="text-sm font-medium mb-1">Giá bán</span>
                                        <input
                                            type="text"
                                            placeholder="Giá bán"
                                            disabled
                                            value={form.sellingPrice ? form.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : ""}
                                            className="border p-2 rounded"
                                        />
                                    </label>

                                    <label className="flex flex-col">
                                        <span className="text-sm font-medium mb-1">Giảm giá (%)</span>
                                        <input
                                            type="number"
                                            placeholder="Giảm giá %"
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
                                            className="border p-2 rounded"
                                        />
                                    </label>

                                    <label className="flex flex-col">
                                        <span className="text-sm font-medium mb-1">Giá nhập</span>
                                        <input
                                            type="text"
                                            value={form.importPrice ? form.importPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : ""}
                                            disabled
                                            className="border p-2 rounded bg-gray-100"
                                        />

                                    </label>

                                    {/* Ngày tạo */}
                                    <label className="flex flex-col">
                                        <span className="text-sm font-medium mb-1">Ngày tạo</span>
                                        <input
                                            type="text"
                                            value={form.createdAt ? new Date(form.createdAt).toLocaleString() : ""}
                                            disabled
                                            className="border p-2 rounded bg-gray-100"
                                        />
                                    </label>
                                </>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={closeForm}
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded text-white ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-gray-500 hover:bg-gray-600"
                                    }`}
                            >
                                Hủy
                            </button>

                            <button
                                onClick={editingVariantId ? handleUpdateVariant : handleCreateVariant}
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded text-white flex items-center justify-center gap-2 ${isSubmitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                {isSubmitting && (
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
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
                                )}
                                {isSubmitting ? "Đang xử lý..." : editingVariantId ? "Cập nhật" : "Thêm"}
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
                            <table className="min-w-full border">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="p-2 border">Kho</th>
                                        <th className="p-2 border">Số lượng</th>
                                        <th className="p-2 border">Đã đặt trước</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryModal.data.map((inv) => (
                                        <tr key={inv.id} className="text-center border-b">
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
                                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
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
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); setConfirmPanel({ visible: false, message: "", onConfirm: null }); }}
                onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
            />
        </div>
    );
}
