import { useEffect, useState } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw } from "react-icons/fi";
import {
    getAllVariants,
    createVariant,
    updateVariant,
    changeVariantActive,
    deleteVariant,
    getAllProducts
} from "../../../apis/productApi";

export default function ProductVariantManager() {
    const [variants, setVariants] = useState([]);
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const [form, setForm] = useState({
        productId: 0,
        name: "",
        sku: "",
        sellingPrice: "",
        discountPercent: 0,
    });

    const [attributes, setAttributes] = useState({});
    const [imageUrls, setImageUrls] = useState({});
    const [editingVariantId, setEditingVariantId] = useState(null);
    const [popup, setPopup] = useState({ message: "", type: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });

    useEffect(() => {
        handleLoadVariants();
        handleLoadProducts();
    }, []);

    useEffect(() => {
        if (!isSkuManuallyEdited && products) {
            const product = products.find(p => p.id == form.productId);
            const productCode = product ? product.productCode : "";
            const newSku = generateSku(productCode, attributes);
            setForm(prev => ({ ...prev, sku: newSku }));
        }
    }, [form.productId, attributes, products]);

    const handleLoadVariants = async () => {
        const res = await getAllVariants();
        if (res.error) {
            console.error(res.error);
            setVariants([]);
            setPopup({ message: "Có lỗi khi tải dữ liệu biến thể!", type: "error" });
            return;
        }
        setVariants(res.data);
    };

    const handleLoadProducts = async () => {
        const res = await getAllProducts();
        if (res.error) {
            console.error(err);
            setProducts([]);
            setPopup({ message: "Có lỗi khi tải danh sách sản phẩm!", type: "error" });
        }
        setProducts(res.data);
    };

    const handleAddVariant = () => {
        setForm({
            productId: "",
            name: "",
            sku: "",
            sellingPrice: "",
            discountPercent: 0,
        });
        setAttributes({});
        setImageUrls({});
        setEditingVariantId(null);
        setShowForm(true);
    };

    const handleEditVariant = (v) => {
        setForm({
            productId: v.productId,
            name: v.name,
            sku: v.sku,
            sellingPrice: v.sellingPrice || "",
            discountPercent: v.discountPercent || 0,
        });
        setAttributes(v.attributes || {});
        setImageUrls(v.imageUrls || {});
        setEditingVariantId(v.id);
        setShowForm(true);
    };

    const handleCreateVariant = async () => {

        const res = await createVariant(form.productId, form.name, form.sku, attributes, imageUrls);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setPopup({ message: "Tạo biến thể thành công!", type: "success" });
        setShowForm(false);
        handleLoadVariants();
    };

    const handleUpdateVariant = async () => {
        const payload = {
            ...form,
            attributes,
            imageUrls
        };
        console.log(payload.imageUrls)
        const res = await updateVariant(editingVariantId, payload.productId, payload.name,
            payload.sku, payload.sellingPrice, payload.discountPercent, payload.attributes, payload.imageUrls);
        if (res?.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setPopup({ message: "Cập nhật biến thể thành công!", type: "success" });
        setShowForm(false);
        handleLoadVariants();
    };

    const toggleVariantActive = (id, isActive, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc muốn ${isActive ? "khóa" : "mở"} biến thể "${name}"?`,
            onConfirm: async () => {
                const res = await changeVariantActive(id);
                if (res?.error) {
                    setPopup({ message: res.error, type: "error" });
                    return;
                }
                setPopup({ message: "Cập nhật trạng thái thành công!", type: "success" });
                setVariants(prev => prev.map(v => v.id === id ? { ...v, isActive: !v.isActive } : v));
            }
        });
    };

    const handleDeleteVariant = (id, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc muốn xóa biến thể "${name}"?`,
            onConfirm: async () => {
                const res = await deleteVariant(id);
                if (res?.error) {
                    setPopup({ message: res.error, type: "error" });
                    return;
                }
                setPopup({ message: "Xóa biến thể thành công!", type: "success" });
                setVariants(prev => prev.filter(v => v.id !== id));
            }
        });
    };

    const closeForm = () => {
        setShowForm(false);
        setForm({ productId: "", name: "", sku: "", sellingPrice: "", discountPercent: 0 });
        setAttributes({});
        setImageUrls({});
        setEditingVariantId(null);
    };

    // Attribute helpers
    const addAttribute = () => setAttributes(prev => ({ ...prev, "": "" }));
    const removeAttribute = (key) => { const newAttr = { ...attributes }; delete newAttr[key]; setAttributes(newAttr); };
    const updateAttributeKey = (oldKey, newKey) => { const { [oldKey]: val, ...rest } = attributes; setAttributes({ ...rest, [newKey]: val }); };
    const updateAttributeValue = (key, value) => setAttributes(prev => ({ ...prev, [key]: value }));

    // Image helpers
    const addImage = () => {
        const keys = Object.keys(imageUrls);
        let newKey = keys.length === 0 ? "main" : `side${keys.length}`;
        setImageUrls(prev => ({ ...prev, [newKey]: "" }));
    };
    const removeImage = (key) => { const newImgs = { ...imageUrls }; delete newImgs[key]; setImageUrls(newImgs); };
    const updateImageValue = (key, value) => setImageUrls(prev => ({ ...prev, [key]: value }));


    const sortedVariants = [...variants]
        .filter(v =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.sku.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (!sortConfig.key) return a.id - b.id;
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === "sellingPrice") {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }

            if (sortConfig.key === "isActive") {
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            }

            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });


    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
            } else {
                return { key, direction: "asc" };
            }
        });
    };

    const generateSku = (productCode, attributes) => {
        if (!productCode) return "";
        const attrPart = Object.values(attributes || {})
            .filter(v => v)  // loại bỏ giá trị rỗng
            .map(v => v.toString().trim().replace(/\s+/g, "_"))
            .join("-");
        return attrPart ? `${productCode}-${attrPart}` : productCode;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-semibold text-gray-800">Biến thể sản phẩm</h2>
                <div className="flex gap-2">
                    <button onClick={handleLoadVariants} className="flex items-center px-4 py-2 border rounded hover:bg-gray-300">
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Reload
                    </button>
                    <button onClick={handleAddVariant} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Thêm biến thể
                    </button>
                </div>
            </div>

            {/* Search bar */}
            <div className=" mb-4">
                <input
                    type="text"
                    placeholder="Tìm kiếm biến thể theo tên hoặc SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border p-2 rounded w-80"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse shadow rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-left text-gray-700">
                        <tr>
                            <th className="p-3 border-b text-center">ID</th>
                            <th className="p-3 border-b text-center">Sản phẩm</th>
                            <th
                                className="p-3 border-b text-center cursor-pointer"
                                onClick={() => handleSort("name")}
                            >
                                Tên biến thể {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th className="p-3 border-b text-center">SKU</th>
                            <th className="p-3 border-b text-center">Hình ảnh</th>
                            <th
                                className="p-3 border-b text-center cursor-pointer"
                                onClick={() => handleSort("sellingPrice")}
                            >
                                Giá bán {sortConfig.key === "sellingPrice" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th
                                className="p-3 border-b text-center cursor-pointer"
                                onClick={() => handleSort("isActive")}
                            >
                                Trạng thái {sortConfig.key === "isActive" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th className="p-3 border-b text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedVariants.map(v => (
                            <tr key={v.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 border-b text-center">{v.id}</td>
                                <td className="p-3 border-b text-center">{v.productName || "-"}</td>
                                <td className="p-3 border-b text-center">{v.name}</td>
                                <td className="p-3 border-b text-center">{v.sku}</td>
                                <td className="border-b text-center">
                                    <img
                                        src={v.imageUrls?.main}
                                        alt={v.name}
                                        className="h-32 w-32 object-contain mx-auto rounded"
                                    />
                                </td>
                                <td className="p-3 border-b text-center">
                                    {v.sellingPrice
                                        ? (v.discountPercent && v.discountPercent > 0
                                            ? (v.sellingPrice * (1 - v.discountPercent / 100)).toLocaleString("vi-VN", { style: "currency", currency: "VND" })
                                            : v.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
                                        )
                                        : "-"}
                                </td>
                                <td className="p-3 border-b text-center">
                                    <div className="inline-flex gap-2">
                                        <button
                                            className={`px-3 py-1 rounded ${v.isActive ? "bg-green-500 text-white hover:bg-green-600 transition" : "bg-gray-400 text-white hover:bg-gray-500 transition"}`}
                                            onClick={() => toggleVariantActive(v.id, v.isActive, v.name)}
                                        >
                                            {v.isActive ? "Hoạt động" : "Đã khóa"}
                                        </button>
                                        <button
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                            onClick={() => { setSelectedVariant(v); setShowDetails(true); }}
                                        >
                                            Chi tiết
                                        </button>
                                    </div>
                                </td>
                                <td className="p-3 border-b text-center">
                                    <div className="inline-flex gap-2">
                                        <button className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition" onClick={() => handleEditVariant(v)}>Sửa</button>
                                        <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition" onClick={() => handleDeleteVariant(v.id, v.name)}>Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Form */}
            {
                showForm && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-[600px]">
                            <h3 className="text-lg font-semibold mb-4">{editingVariantId ? "Chỉnh sửa biến thể" : "Thêm biến thể"}</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="border p-2 rounded">
                                    <option value="">Chọn sản phẩm</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <input type="text" placeholder="Tên biến thể" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
                                <input
                                    type="text"
                                    placeholder="SKU"
                                    value={form.sku}
                                    onChange={(e) => {
                                        setForm({ ...form, sku: e.target.value });
                                        setIsSkuManuallyEdited(true);
                                    }}
                                    className="border p-2 rounded"
                                />

                                {/* Attributes */}
                                <div className="border p-2 rounded">
                                    <h4 className="font-semibold mb-2">Đặc điểm</h4>
                                    {Object.entries(attributes).map(([key, value], idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <input type="text" placeholder="Đặc tính" value={key} onChange={(e) => updateAttributeKey(key, e.target.value)} className="border p-1 rounded w-32" />
                                            <input type="text" placeholder="Giá trị" value={value} onChange={(e) => updateAttributeValue(key, e.target.value)} className="border p-1 rounded w-32" />
                                            <button type="button" onClick={() => removeAttribute(key)} className="px-2 bg-red-500 text-white rounded hover:bg-red-600">Xóa</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addAttribute} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Thêm đặc điểm</button>
                                </div>

                                {/* Images */}
                                <div className="border p-2 rounded">
                                    <h4 className="font-semibold mb-2">Hình ảnh</h4>
                                    {Object.entries(imageUrls).map(([key, value], idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                placeholder="URL"
                                                value={value}
                                                onChange={(e) => updateImageValue(key, e.target.value)}
                                                className="border p-1 rounded w-64"
                                            />
                                            <span className="px-2 py-1 bg-gray-200 rounded">{key}</span>
                                            {idx !== 0 && (
                                                <button type="button" onClick={() => removeImage(key)} className="px-2 bg-red-500 text-white rounded hover:bg-red-600">Xóa</button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addImage} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Thêm hình ảnh</button>
                                </div>

                                {/* Selling Price & Discount */}
                                {editingVariantId && (
                                    <>
                                        <input type="number" placeholder="Giá bán" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="border p-2 rounded" />
                                        <input type="number" placeholder="Giảm giá %" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} className="border p-2 rounded" />
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={closeForm} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Hủy</button>
                                <button onClick={editingVariantId ? handleUpdateVariant : handleCreateVariant} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{editingVariantId ? "Cập nhật" : "Thêm"}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Details Modal */}
            {
                showDetails && selectedVariant && (
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setShowDetails(false)}
                        ></div>

                        {/* Modal content */}
                        <div
                            className="relative p-6 bg-white rounded-xl shadow-lg w-full max-w-4xl mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-semibold mb-4 text-blue-800">
                                Chi tiết biến thể
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Cột trái */}
                                <div className="flex flex-col gap-2">
                                    <label><b>ID:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.id || "-"} readOnly />

                                    <label><b>Sản phẩm:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.productName || "-"} readOnly />

                                    <label><b>Tên biến thể:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.name || "-"} readOnly />

                                    <label><b>SKU:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.sku || "-"} readOnly />

                                    <label><b>Giá nhập:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.importPrice?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "-"} readOnly />

                                    <label><b>Giá bán:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.sellingPrice?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "-"} readOnly />

                                    <label><b>Giảm giá %:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.discountPercent ?? 0} readOnly />
                                </div>

                                {/* Cột phải */}
                                <div className="flex flex-col gap-2">
                                    <label><b>Tồn kho:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.stockQuantity ?? 0} readOnly />

                                    <label><b>Đang đặt:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.reservedQuantity ?? 0} readOnly />

                                    <label><b>Có sẵn:</b></label>
                                    <input className="border rounded px-2 py-1" value={selectedVariant.availableQuantity ?? 0} readOnly />

                                    <label><b>Đặc điểm:</b></label>
                                    {selectedVariant.attributes ? (
                                        <div className="border rounded p-2 bg-gray-50">
                                            {Object.entries(selectedVariant.attributes).map(([k, v], idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span className="font-medium">{k}:</span>
                                                    <span>{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <input className="border rounded px-2 py-1" value="-" readOnly />}

                                    <label><b>Hình ảnh:</b></label>
                                    {selectedVariant.imageUrls ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(selectedVariant.imageUrls).map(([key, url], idx) => (
                                                <div key={idx} className="flex flex-col items-center border rounded p-2">
                                                    <span className="text-sm font-medium">{key === "main" ? "Ảnh chính" : "Ảnh phụ"}</span>
                                                    {url ? (
                                                        <img src={url} alt={key} className="h-24 object-contain mt-1" />
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <input className="border rounded px-2 py-1" value="-" readOnly />}
                                </div>
                            </div>

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Popup */}
            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />

            {/* Confirm Panel */}
            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); setConfirmPanel({ visible: false, message: "", onConfirm: null }); }}
                onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
            />
        </div >
    );
}
