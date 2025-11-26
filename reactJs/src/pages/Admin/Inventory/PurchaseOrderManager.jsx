import { useContext, useEffect, useState } from "react";
import {
    getAllPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    getAllSuppliers,
    getAllWarehouses,
} from "../../../apis/inventoryApi";
import { getAllProducts, getAllVariants, getProductVariantByProductId, getVariantByIdIncludingInactive, getVariantsByIds } from "../../../apis/productApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import SearchableSelect from "../../../components/SearchableSelect";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiEye } from "react-icons/fi";
import { FaChevronLeft } from "react-icons/fa";
import { FaChevronRight } from "react-icons/fa6";
import { AuthContext } from "../../../contexts/AuthContext";

export default function PurchaseOrderManager() {
    const { role, staffWarehouseId } = useContext(AuthContext)
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [warehouses, setWarehouses] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ supplierId: "", warehouseId: "", items: [], status: "", createdBy: "", updatedBy: "" });
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [popup, setPopup] = useState({ message: "", type: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [isProcessing, setIsProcessing] = useState(false)
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [sortWarehouseId, setSortWarehouseId] = useState(null)

    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1);
    const [size, setSize] = useState(10);
    const [status, setStatus] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchText, setSearchText] = useState("");

    useEffect(() => { loadData(); }, []);
    useEffect(() => {
        if (warehouses === null) return;
        loadOrders(0, size, status, startDate, endDate);
    }, [startDate, endDate, sortWarehouseId])

    const loadOrders = async (currentPage = page, pageSize = size, orderStatus = status, start = startDate, end = endDate) => {
        setIsLoading(true);
        const ordersRes = await getAllPurchaseOrders(currentPage, pageSize, orderStatus || null, searchText,sortWarehouseId, start || null, end || null)
        if (ordersRes.error) {
            setPopup({ message: "Không thể tải danh sách đơn nhập!" });
            setIsLoading(false);
            return;
        }
        setPage(currentPage)
        setTotalPages(ordersRes.data.totalPages);
        setOrders(ordersRes.data.content || []);
        setIsLoading(false);
    }
    const loadData = async () => {
        try {
            const [suppliersRes, warehouseRes] = await Promise.all([
                getAllSuppliers(),
                getAllWarehouses()
            ]);

            if (suppliersRes.error) {
                setPopup({ message: "Không thể tải dữ liệu!" });
                return;
            }

            setSuppliers(suppliersRes.data);
            let warehouseData = warehouseRes.data;
            if (role === "STAFF") {
                warehouseData = warehouseData.filter(w => w.id === staffWarehouseId)
            }
            setWarehouses(warehouseData);
            setSortWarehouseId(warehouseData[0].id)
        } catch (err) {
            setPopup({ message: err.message, type: "error" });
        }
    };

    const loadProducts = async (keyword = "") => {
        try {
            const res = await getAllProducts(0, 5, keyword);
            if (!res.error) {
                const newProducts = res.data.content || [];
                setProducts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewProducts];
                });
            } else {
                setPopup({ message: res.error, type: "error" });
            }
        } catch (err) {
            setPopup({ message: err.message, type: "error" });
        }
    };
    const loadVariantsByProduct = async (productId, itemIndex) => {
        if (!productId) return;
        try {
            const res = await getProductVariantByProductId(productId);
            if (!res.error) {
                const newVariants = res.data || [];
                setVariants(prev => {
                    const existingIds = new Set(prev.map(v => v.id));
                    const uniqueNewVariants = newVariants.filter(v => !existingIds.has(v.id));
                    return [...prev, ...uniqueNewVariants];
                });
            } else {
                setPopup({ message: res.error, type: "error" });
            }
        } catch (err) {
            setPopup({ message: err.message, type: "error" });
        }
    };

    const openDetailsForm = async (order) => {
        setIsLoadingDetails(true);
        let items = (order.items || []).map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity || 0,
            importPrice: i.importPrice || 0
        }));

        const variantIds = items.map(i => Number(i.variantId));

        const res = await getVariantsByIds(variantIds);
        if (res.error) {
            setIsLoadingDetails(false);
            return setPopup({ message: res.error, type: "error" });
        }
        setVariants(res.data);
        items = items.map(i => {
            const variant = res.data.find(p => p.id === i.variantId);
            return {
                ...i,
                productId: variant ? variant.productId : null
            };
        });
        setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));

            const productMap = new Map();
            res.data.forEach(v => {
                if (!existingIds.has(v.productId) && !productMap.has(v.productId)) {
                    productMap.set(v.productId, {
                        id: v.productId,
                        name: v.productName,
                        productCode: v.productCode
                    });
                }
            });

            const newProducts = Array.from(productMap.values());
            return [...newProducts, ...prev];
        });
        setForm({
            supplierId: order.supplier?.id || "",
            warehouseId: order.warehouse?.id || "",
            status: order.status,
            createdBy: order.createdBy,
            updatedBy: order.updatedBy,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: items
        });
        setEditingOrderId(order.id);
        setShowForm(true);
        setIsLoadingDetails(false);
    };

    const handleSaveOrder = async () => {
        if (!form.supplierId) {
            setPopup({ message: "Vui lòng chọn nhà cung cấp!", type: "error" });
            return;
        }
        if (form.items.length === 0) {
            setPopup({ message: "Vui lòng thêm ít nhất 1 sản phẩm!", type: "error" });
            return;
        }
        for (let i = 0; i < form.items.length; i++) {
            const item = form.items[i];
            if (!item.variantId) {
                setPopup({ message: `Vui lòng chọn biến thể của sản phẩm cho dòng ${i + 1}!`, type: "error" });
                return;
            }
            if (!item.quantity || item.quantity <= 0) {
                setPopup({ message: `Số lượng phải lớn hơn 0 ở dòng ${i + 1}!`, type: "error" });
                return;
            }
            if (!item.importPrice || item.importPrice <= 0) {
                setPopup({ message: `Giá nhập phải lớn hơn 0 ở dòng ${i + 1}!`, type: "error" });
                return;
            }
        }
        if (isProcessing) return;
        try {
            setIsProcessing(true)
            let res;
            if (editingOrderId) res = await updatePurchaseOrder(editingOrderId, form.supplierId, form.warehouseId, form.items);
            else res = await createPurchaseOrder(form.supplierId, form.warehouseId, form.items);

            if (res.error) {
                setPopup({ message: res.error, type: "error" });
                return;
            }

            // loadOrders(0);
            setOrders(prev => editingOrderId ? prev.map(o => (o.id === editingOrderId ? res.data : o)) : [res.data, ...prev]);
            setPopup({ message: res.message || (editingOrderId ? "Cập nhật đơn mua hàng thành công!" : "Tạo đơn mua hàng hàng thành công!"), type: "success" });
            closeAndResetForm();
        } finally {
            setIsProcessing(false)
        }
    };

    const handleChangeStatusInForm = async (newStatus) => {
        if (form.status === "PENDING") {
            setConfirmPanel({
                visible: true,
                message: `Bạn có chắc muốn ${newStatus === "CANCELLED" ? "hủy" : "hoàn tất"} đơn mua hàng này ?`,
                onConfirm: async () => {
                    const res = await updatePurchaseOrderStatus(editingOrderId, newStatus);
                    if (!res.error) {
                        setOrders(prev => prev.map(o => o.id === editingOrderId ? res.data : o));
                        setForm(prev => ({ ...prev, status: newStatus, updatedBy: res.data.updatedBy, updatedAt: res.data.updatedAt }));
                        setPopup({ message: "Cập nhật trạng thái thành công!", type: "success" });
                        closeConfirmPanel();
                    } else {
                        setPopup({ message: res.error, type: "error" });
                    }
                }
            });
        }
    };
    function hanldeSortByStatus() {
        let newStatus;
        if (status === null) newStatus = "COMPLETED";
        else if (status === "COMPLETED") newStatus = "PENDING";
        else if (status === "PENDING") newStatus = "CANCELLED";
        else newStatus = null;

        setStatus(newStatus);
        loadOrders(0, size, newStatus, startDate, endDate);
    }
    function statusMap() {
        switch (status) {
            case null:
                return "Trạng thái"
            case "COMPLETED":
                return "Hoàn tất"
            case "PENDING":
                return "Đang chờ"
            case "CANCELLED":
                return "Đã hủy"
            default:
                return "Trạng thái"
        }
    }
    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });
    const closeAndResetForm = () => {
        setForm({ supplierId: "", items: [], status: "", createdBy: "", updatedBy: "" });
        setShowForm(false);
        setEditingOrderId(null);
    };

    const addItem = () => setForm(prev => ({
        ...prev,
        items: [...prev.items, { productId: "", variantId: "", quantity: 0, importPrice: "" }]
    }));
    const updateItem = (index, field, value) => {
        const newItems = [...form.items];
        newItems[index][field] = value;
        if (field === "productId") {
            newItems[index].variantId = "";
            loadVariantsByProduct(value, index);
        }
        setForm(prev => ({ ...prev, items: newItems }));
    };


    const removeItem = (index) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    const subtotal = (item) => (item.quantity || 0) * (item.importPrice || 0);
    const total = form.items.reduce((acc, item) => acc + subtotal(item), 0);

    function getPageNumbers() {
        const pages = [];
        const maxVisible = 4;

        if (totalPages <= maxVisible + 2) {
            for (let i = 0; i < totalPages; i++) {

                pages.push(i);
            }
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
        <div className="p-6 bg-white rounded shadow relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Lịch sử mua hàng</h2>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditingOrderId(null);
                        setForm({ supplierId: "", items: [], status: "", createdBy: "", updatedBy: "" });
                        loadProducts();
                    }}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                >
                    Tạo đơn
                </button>
            </div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-1">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo SKU"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="border p-2 rounded w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => { loadOrders(0) }}
                        className="w-full sm:w-auto bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
                    >
                        Tìm
                    </button>
                </div>
                <div className="flex gap-2">
                    <select
                        value={sortWarehouseId || ""}
                        onChange={(e) => setSortWarehouseId(e.target.value)}
                        className="border border-gray-700 rounded px-3 py-2"
                    >
                        {role !== "STAFF" && (
                            <option value="">Tất cả kho</option>
                        )}
                        {warehouses &&
                            warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.code}
                                </option>
                            ))}
                    </select>
                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border p-2 rounded w-38"
                        />
                        <span>đến</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border p-2 rounded w-38"
                        />
                    </div>
                    <button
                        onClick={() => loadOrders(0)}
                        className="flex items-center px-4 py-2 border border-gray-700 text-gray-800 rounded hover:bg-gray-300 transition"
                    >
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
                    </button>

                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                    <thead className="bg-gray-200 text-gray-700 text-m font-medium">
                        <tr>
                            <th className="p-4 text-center border-b border-gray-300">Mã đơn</th>
                            <th className="p-4 text-center border-b border-gray-300">Nhà cung cấp</th>
                            <th className="p-4 text-center border-b border-gray-300">Kho chứa</th>
                            <th className="p-4 text-center border-b border-gray-300">Tổng tiền</th>
                            <th
                                className={`p-4 text-center border-b border-gray-300 hover:cursor-pointer ${status ? "underline font-semibold text-blue-600" : "text-gray-700"
                                    }`}
                                onClick={hanldeSortByStatus}
                            >
                                {statusMap()}
                            </th>
                            <th className="p-4 text-center border-b border-gray-300">Ngày tạo</th>
                            <th className="p-4 text-center border-b border-gray-300">Hoạt động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white text-gray-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="p-4 text-gray-500 text-center align-middle">
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
                        ) : (orders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center p-6 text-gray-500 text-base">
                                    Không có đơn mua nào
                                </td>
                            </tr>
                        ) :
                            (orders.map(o => (
                                <tr
                                    key={o.id}
                                    className={`transition hover:bg-gray-100 `}
                                >
                                    <td className="p-4 text-center border-b border-gray-200">{o.code}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{o.supplier ? `${o.supplier.code}` : "-"}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{o.warehouse ? `${o.warehouse.code}` : "-"}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{o.totalAmount?.toLocaleString() || "0"}₫</td>
                                    <td className="p-4 text-center border-b border-gray-200">
                                        {o.status === "PENDING" && (
                                            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-500 text-white rounded">
                                                Đang chờ
                                            </span>
                                        )}
                                        {o.status === "COMPLETED" && (
                                            <span className="px-3 py-1 font-semibold text-sm rounded-full bg-green-500 text-white rounded">
                                                Hoàn tất
                                            </span>
                                        )}
                                        {o.status === "CANCELLED" && (
                                            <span className="px-3 py-1 font-semibold text-sm rounded-full bg-red-500 text-white rounded">
                                                Đã hủy
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center border-b border-gray-200">{new Date(o.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-center border-b border-gray-200">
                                        <button
                                            onClick={() => openDetailsForm(o)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                                        >
                                            <FiEye></FiEye>
                                        </button>
                                    </td>
                                </tr>
                            )))
                        )}
                    </tbody>
                </table>
            </div>


            {totalPages > 0 && (
                <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                    <button
                        onClick={() => {
                            loadOrders(page - 1, size, status, startDate, endDate)
                        }}
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
                                onClick={() => {
                                    loadOrders(num, size, status, startDate, endDate)
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                          ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                            >
                                {num + 1}
                            </button>
                        )
                    )}

                    <button
                        onClick={() => {
                            loadOrders(page + 1, size, status, startDate, endDate);
                        }}
                        disabled={page >= (totalPages || 1) - 1}
                        className={`p-3 rounded ${page >= (totalPages || 1) - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white px-10 py-8 rounded-lg shadow-lg w-[900px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-4">
                            {editingOrderId ? "Chi tiết đơn mua hàng" : "Tạo đơn mua hàng"}
                        </h3>
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
                        {editingOrderId && (
                            <div className="mb-4 grid grid-cols-2 gap-x-8  text-gray-500">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-1">
                                        <span className="font-medium">Tạo bởi:</span>
                                        <span>NV{form.createdBy}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className="font-medium">Thời gian:</span>
                                        <span>
                                            {form.createdAt
                                                ? new Date(form.createdAt).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "-"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-1">
                                        <span className="font-medium">Cập nhật bởi:</span>
                                        <span>NV{form.updatedBy || "-"}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className="font-medium">Thời gian:</span>
                                        <span>
                                            {form.updatedAt
                                                ? new Date(form.updatedAt).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* Supplier */}
                        <div className="mb-4">
                            <h4 className="text-gray-800 font-semibold mb-2">Nhà cung cấp</h4>
                            <SearchableSelect
                                options={suppliers.map(s => ({ label: `${s.code} | ${s.name}`, value: s.id }))}
                                value={form.supplierId}
                                onChange={(id) => setForm({ ...form, supplierId: id })}
                                placeholder="Tìm hoặc chọn nhà cung cấp..."
                                disabled={editingOrderId && form.status !== "PENDING"}
                            />
                        </div>
                        <div className="mb-4">
                            <h4 className="text-gray-800 font-semibold mb-2">Kho nhập hàng</h4>
                            <SearchableSelect
                                options={warehouses.map(w => ({
                                    label: `${w.code} | ${w.name}`,
                                    value: w.id
                                }))}
                                value={form.warehouseId}
                                onChange={(id) => setForm(({ ...form, warehouseId: id }))}
                                placeholder="Tìm hoặc chọn kho..."
                                disabled={editingOrderId && form.status !== "PENDING"}
                            />
                        </div>
                        {/* Items */}
                        <div className="mb-4">
                            <h4 className="text-gray-800 font-semibold mb-2">Danh sách sản phẩm</h4>
                            {form.items.map((item, idx) => (
                                <div key={idx} className="mb-4 border p-2 rounded bg-white shadow-sm">

                                    <div className="mb-2">
                                        <SearchableSelect
                                            options={products
                                                .map(p => ({ label: `${p.productCode} | ${p.name}`, value: p.id }))}
                                            value={item.productId}
                                            onChange={id => updateItem(idx, "productId", id)}
                                            placeholder="Tìm hoặc chọn sản phẩm..."
                                            disabled={editingOrderId && form.status !== "PENDING"}
                                            onInputChange={(keyword) => loadProducts(keyword)}
                                        />
                                    </div>

                                    {/* Variant Dropdown */}
                                    <div className="mb-2">
                                        <SearchableSelect
                                            options={variants
                                                .filter(v => v.productId === item.productId)
                                                .map(v => ({ label: `${v.sku} | ${v.name}`, value: v.id }))}
                                            value={item.variantId}
                                            onChange={id => updateItem(idx, "variantId", id)}
                                            placeholder="Chọn biến thể..."
                                            disabled={!item.productId || (editingOrderId && form.status !== "PENDING")}
                                            filterOutValues={form.items.filter((_, i) => i !== idx).map(it => String(it.variantId))}
                                        />
                                    </div>

                                    {/* Quantity & Import Price */}
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            placeholder="Số lượng"
                                            value={item.quantity === 0 ? "" : item.quantity}
                                            onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                                            className={`border p-2 rounded w-32 ${editingOrderId && form.status !== "PENDING" ? "bg-gray-100" : ""}`}
                                            disabled={editingOrderId && form.status !== "PENDING"}
                                            min={1}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Giá nhập"
                                            value={(item.importPrice)}
                                            onChange={e => updateItem(idx, "importPrice", Number(e.target.value))}
                                            className={`border p-2 rounded w-32 ${editingOrderId && form.status !== "PENDING" ? "bg-gray-100" : ""}`}
                                            disabled={editingOrderId && form.status !== "PENDING"}
                                        />
                                        <div className="flex-1 text-right font-medium">{item.quantity} x {item.importPrice.toLocaleString()}₫</div>
                                        {(!editingOrderId || form.status === "PENDING") && (
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                                X
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}


                            {(!editingOrderId || form.status === "PENDING") && (
                                <button
                                    onClick={addItem}
                                    className="px-3 py-2 border rounded hover:bg-gray-100 mt-1"
                                >
                                    + Thêm sản phẩm
                                </button>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 font-bold text-lg mb-4">
                            <span>Tổng:</span>
                            <span className="text-red-500">{total.toLocaleString()}₫</span>
                        </div>

                        {/* Status Change & Bottom Buttons */}
                        <div className="flex justify-between mt-4">
                            <div>
                                <span className="font-semibold block mb-2 ml-2">
                                    {(!editingOrderId) ? "" :
                                        (editingOrderId && form.status === "PENDING") ? "Thay đổi trạng thái:" : "Trạng thái:"}
                                </span>
                                <div className="flex gap-2">
                                    {form.status === "PENDING" && editingOrderId && (
                                        <>
                                            <button
                                                onClick={() => handleChangeStatusInForm("COMPLETED")}
                                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-400"
                                            >
                                                Hoàn tất
                                            </button>
                                            <button
                                                onClick={() => handleChangeStatusInForm("CANCELLED")}
                                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-400"
                                            >
                                                Hủy
                                            </button>
                                        </>
                                    )}
                                    {form.status === "COMPLETED" && (
                                        <button
                                            className="px-4 py-2 bg-green-500 text-white rounded cursor-not-allowed ml-1"
                                            disabled
                                        >
                                            Hoàn tất
                                        </button>
                                    )}
                                    {form.status === "CANCELLED" && (
                                        <button
                                            className="px-4 py-2 bg-red-500 text-white rounded cursor-not-allowed ml-2"
                                            disabled
                                        >
                                            Đã hủy
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-8">
                                <button
                                    disabled={isProcessing}
                                    onClick={closeAndResetForm}
                                    className={`px-4 py-2 h-10 border border-gray-700 rounded hover:bg-gray-100 `}
                                >
                                    Đóng
                                </button>
                                {(!editingOrderId || form.status === "PENDING") && (
                                    <button
                                        disabled={isProcessing}
                                        onClick={handleSaveOrder}
                                        className={` flex items-center justify-center gap-1 px-4 py-2 h-10 bg-black text-white rounded hover:bg-gray-800`}
                                    >
                                        {editingOrderId ? "Cập nhật đơn" : "Tạo đơn"}
                                    </button>

                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
            {isLoadingDetails && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] rounded-none pointer-events-auto">
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
                        <span className="text-gray-700 font-medium">Đang tải...</span>
                    </div>
                </div>
            )}

            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />
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
