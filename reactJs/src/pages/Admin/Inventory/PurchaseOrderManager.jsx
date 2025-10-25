import { useEffect, useState } from "react";
import {
    getAllPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    getAllSuppliers,
    getAllWarehouses,
} from "../../../apis/inventoryApi";
import { getAllProducts, getAllVariants, getProductVariantByProductId, getVariantByIdIncludingInactive } from "../../../apis/productApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import SearchableSelect from "../../../components/SearchableSelect";
import { FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function PurchaseOrderManager() {
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [productSearchKeyword, setProductSearchKeyword] = useState("");
    const [variants, setVariants] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ supplierId: "", warehouseId: "", items: [], status: "", createdBy: "", updatedBy: "" });
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [popup, setPopup] = useState({ message: "", type: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });

    const [page, setPage] = useState(0)
    const [ordersPage, setOrdersPage] = useState({ content: [], totalElements: 0, pageable: {} });
    const [size, setSize] = useState(10);
    const [status, setStatus] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => { loadOrders(); loadData(); }, []);

    const loadOrders = async (page, size, status, startDate, endDate) => {
        const ordersRes = await getAllPurchaseOrders(page, size, status || null, startDate || null, endDate || null)
        if (ordersRes.error) {
            setPopup({ message: "Không thể tải danh sách đơn nhập!" });
            return;
        }
        setOrdersPage(ordersRes.data);
        setOrders(ordersRes.data.content || []);
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
            setWarehouses(warehouseRes.data)
        } catch (err) {
            setPopup({ message: err.message, type: "error" });
        }
    };
    const loadProducts = async (keyword = "") => {
        try {
            const res = await getAllProducts(0, 10, keyword);
            if (!res.error) {
                setProducts(res.data.content || []);
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
                setVariants(prev => {
                    const newVariants = [...prev];
                    newVariants[itemIndex] = res.data || [];
                    return newVariants;
                });
            } else {
                setPopup({ message: res.error, type: "error" });
            }
        } catch (err) {
            setPopup({ message: err.message, type: "error" });
        }
    };


    const openDetailsForm = async (order) => {
        const items = (order.items || []).map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity || 0,
            importPrice: i.importPrice || 0
        }));

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

        const newVariants = [];

        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            try {
                const res = await getVariantByIdIncludingInactive(item.variantId);
                if (!res.error) {
                    newVariants[index] = [res.data];
                } else {
                    setPopup({ message: res.error, type: "error" });
                    newVariants[index] = [];
                }
            } catch (err) {
                setPopup({ message: err.message, type: "error" });
                newVariants[index] = [];
            }
        }

        setVariants(newVariants);
        setEditingOrderId(order.id);
        setShowForm(true);
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

        let res;
        if (editingOrderId) res = await updatePurchaseOrder(editingOrderId, form.supplierId, form.warehouseId, form.items);
        else res = await createPurchaseOrder(form.supplierId, form.warehouseId, form.items);

        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }

        loadOrders(0);
        // setOrders(prev => editingOrderId ? prev.map(o => (o.id === editingOrderId ? res.data : o)) : [...prev, res.data]);
        setPopup({ message: res.message || (editingOrderId ? "Cập nhật đơn mua hàng thành công!" : "Tạo đơn mua hàng hàng thành công!"), type: "success" });
        closeAndResetForm();
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
                        loadData();
                    } else {
                        setPopup({ message: res.error, type: "error" });
                    }
                }
            });
        }
    };
    function hanldeSortByStatus() {
        let newStatus;
        if (status === null) newStatus = "PENDING";
        else if (status === "PENDING") newStatus = "COMPLETED";
        else if (status === "COMPLETED") newStatus = "CANCELLED";
        else newStatus = null;

        setStatus(newStatus);
        loadOrders(page, size, newStatus, startDate, endDate);
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


    return (
        <div className="p-6 bg-gray-50 rounded shadow">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Lịch sử mua hàng</h2>
                <div className="flex gap-2">
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
                        onClick={loadData}
                        className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-300 transition"
                    >
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
                    </button>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            setEditingOrderId(null);
                            setForm({ supplierId: "", items: [], status: "", createdBy: "", updatedBy: "" });
                            loadProducts();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Tạo đơn
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
                                Trạng thái
                            </th>
                            <th className="p-4 text-center border-b border-gray-300">Ngày tạo</th>
                            <th className="p-4 text-center border-b border-gray-300">Hoạt động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white text-gray-700">
                        {ordersPage.content.length > 0 ? (
                            ordersPage.content.map((o, idx) => (
                                <tr
                                    key={o.id}
                                    className={`transition hover:bg-gray-50 ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                                >
                                    <td className="p-4 text-center border-b border-gray-200">{o.code}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{o.supplier ? `${o.supplier.code}` : "-"}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{o.warehouse ? `${o.warehouse.code}` : "-"}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{o.totalAmount?.toLocaleString() || "0"}₫</td>
                                    <td className="p-4 text-center border-b border-gray-200">
                                        {o.status === "PENDING" && (
                                            <span className="px-4 py-2 bg-yellow-500 text-white rounded">
                                                Đang chờ
                                            </span>
                                        )}
                                        {o.status === "COMPLETED" && (
                                            <span className="px-4 py-2 bg-green-500 text-white rounded">
                                                Hoàn tất
                                            </span>
                                        )}
                                        {o.status === "CANCELLED" && (
                                            <span className="px-4 py-2 bg-red-500 text-white rounded">
                                                Đã hủy
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center border-b border-gray-200">{new Date(o.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-center border-b border-gray-200">
                                        <button
                                            onClick={() => openDetailsForm(o)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm md:text-base"
                                        >
                                            Chi tiết
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center p-6 text-gray-500 text-base">
                                    Không có đơn mua nào
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-3 mt-7 text-gray-600">
                <button
                    disabled={page === 0}
                    onClick={() => {
                        const newPage = page - 1;
                        setPage(newPage);
                        loadOrders(newPage, size, status, startDate, endDate);
                    }}
                    className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
                >
                    <FiChevronLeft className="w-5 h-5" />
                    <span className="ml-2">Trước</span>
                </button>

                <span className="px-3 text-base font-medium">
                    Trang {page + 1} / {ordersPage.totalPages || 1}
                </span>

                <button
                    disabled={page >= (ordersPage.totalPages || 1) - 1}
                    onClick={() => {
                        const newPage = page + 1;
                        setPage(newPage);
                        loadOrders(newPage, size, status, startDate, endDate);
                    }}
                    className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
                >
                    <span className="mr-2">Sau</span>
                    <FiChevronRight className="w-5 h-5" />
                </button>
            </div>


            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[750px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4">
                            {editingOrderId ? "Chi tiết đơn mua hàng" : "Tạo đơn mua hàng"}
                        </h3>

                        {editingOrderId && (
                            <div className="mb-4 grid grid-cols-2 gap-x-8 text-sm text-gray-500">
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
                            <h4 className="font-semibold mb-2">Nhà cung cấp</h4>
                            <SearchableSelect
                                options={suppliers.map(s => ({ label: `${s.code} | ${s.name}`, value: s.id }))}
                                value={form.supplierId}
                                onChange={(id) => setForm({ ...form, supplierId: id })}
                                placeholder="Tìm hoặc chọn nhà cung cấp..."
                                disabled={editingOrderId && form.status !== "PENDING"}
                            />
                        </div>
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Kho nhập hàng</h4>
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
                            <h4 className="font-semibold mb-2">Danh sách sản phẩm</h4>
                            {form.items.map((item, idx) => (
                                <div key={idx} className="mb-4 border p-2 rounded bg-white shadow-sm">
                                    {!editingOrderId &&
                                        (<div className="mb-2">
                                            <SearchableSelect
                                                options={products.map(p => ({ label: `${p.name}`, value: p.id }))}
                                                value={item.productId}
                                                onChange={id => updateItem(idx, "productId", id)}
                                                placeholder="Tìm hoặc chọn sản phẩm..."
                                                onSearch={keyword => loadProducts(keyword)}
                                                disabled={editingOrderId && form.status !== "PENDING"}
                                            />
                                        </div>)}

                                    {/* Variant Dropdown */}
                                    <div className="mb-2">
                                        <SearchableSelect
                                            options={Array.isArray(variants[idx]) ? variants[idx].map(v => ({ label: `${v.sku} | ${v.name}`, value: v.id })) : []}
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
                                            className="border p-2 rounded w-32"
                                            disabled={editingOrderId && form.status !== "PENDING"}
                                            min={1}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Giá nhập"
                                            value={(item.importPrice)}
                                            onChange={e => updateItem(idx, "importPrice", Number(e.target.value))}
                                            className="border p-2 rounded w-32"
                                            disabled={editingOrderId && form.status !== "PENDING"}
                                        />
                                        <div className="flex-1 text-right font-medium">{subtotal(item).toLocaleString()}₫</div>
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
                                    className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 mt-2"
                                >
                                    + Thêm sản phẩm
                                </button>
                            )}
                        </div>

                        <div className="text-right font-bold text-lg mb-4">
                            Tổng: {total.toLocaleString()}₫
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
                                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                            >
                                                Hoàn tất
                                            </button>
                                            <button
                                                onClick={() => handleChangeStatusInForm("CANCELLED")}
                                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
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
                                    onClick={closeAndResetForm}
                                    className="px-4 py-2 h-10 bg-gray-400 text-white rounded hover:bg-gray-500"
                                >
                                    Đóng
                                </button>
                                {(!editingOrderId || form.status === "PENDING") && (
                                    <button
                                        onClick={handleSaveOrder}
                                        className="px-4 py-2 h-10 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        {editingOrderId ? "Cập nhật đơn" : "Tạo đơn"}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />
            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); closeConfirmPanel(); }}
                onCancel={closeConfirmPanel}
            />
        </div>
    );
}
