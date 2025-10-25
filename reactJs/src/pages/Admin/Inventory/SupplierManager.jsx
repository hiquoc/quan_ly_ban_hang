import { useEffect, useState } from "react";
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../../../apis/inventoryApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw } from "react-icons/fi";


export default function SupplierManager() {
    const [suppliers, setSuppliers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", code: "", phone: "", email: "", address: "", taxCode: "", description: "" });
    const [popup, setPopup] = useState({ message: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [readOnly, setReadOnly] = useState(false);
    const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    useEffect(() => { loadSuppliers(); }, []);
    useEffect(() => {
        if (!isCodeManuallyEdited && !readOnly && !editingSupplierId) {
            const nameCode = form.name
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 6);
            if (nameCode) setForm(prev => ({ ...prev, code: `SUP-${nameCode}` }));
        }
    }, [form.name]);

    const loadSuppliers = async () => {
        const res = await getAllSuppliers();
        if (res.error) {
            console.error(res.error);
            setSuppliers([]);
            setPopup({ message: "Có lỗi khi lấy dữ liệu nhà cung cấp!", type: "error" });
            return;
        }
        setSuppliers(res.data);
    };

    const handleCreateSupplier = async () => {
        const res = await createSupplier(form.name, form.code, form.phone, form.email,
            form.address, form.taxCode, form.description);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setPopup({ message: res.message || "Tạo nhà cung cấp thành công!", type: "success" });
        setSuppliers(prev => [...prev, res.data]);
        closeAndResetForm();
    };

    const handleUpdateSupplier = async () => {
        const res = await updateSupplier(editingSupplierId, form.name, form.code, form.phone, form.email,
            form.address, form.taxCode, form.description);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setPopup({ message: res.message || "Cập nhật thông tin thành công!", type: "success" });
        setSuppliers(prev => prev.map(s => s.id === editingSupplierId ? res.data : s));
        closeAndResetForm();
    };

    const handleDeleteSupplier = async (id) => {
        const res = await deleteSupplier(id);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setPopup({ message: res.message || "Xóa thành công!", type: "success" });
        setSuppliers(prev => prev.filter(s => s.id !== id ? res.data : s));
        closeAndResetForm();
    };

    const closeAndResetForm = () => {
        setForm({ name: "", code: "", phone: "", email: "", address: "", taxCode: "", description: "" });
        setShowForm(false);
        setEditingSupplierId(null);
        setReadOnly(false);
        setIsCodeManuallyEdited(false);
    };


    const toggleSupplierDelete = (id, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc chắn muốn xóa nhà cung cấp "${name}"?`,
            onConfirm: () => handleDeleteSupplier(id)
        });
    };

    const filteredSuppliers = (suppliers ?? [])
        .filter(s => s && s.name?.toLowerCase().includes(searchText.toLowerCase()))
        .sort((a, b) => {
            if (!sortConfig.key) return (a?.id || 0) - (b?.id || 0);
            let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
            if (typeof aVal === "string") aVal = aVal.toLowerCase();
            if (typeof bVal === "string") bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

    return (
        <div className="p-6 bg-gray-50 rounded shadow">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Nhà cung cấp</h2>
                <div className="flex gap-2">
                    <button
                        onClick={loadSuppliers}
                        className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-200 transition"
                    >
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Thêm nhà cung cấp
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="border p-2 rounded w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto shadow-md rounded-lg mb-4">
                <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                    <thead className="bg-gray-200 text-gray-700 font-medium">
                        <tr>
                            <th className="p-4 text-center border-b border-gray-300">ID</th>
                            <th
                                className="p-4 text-center border-b border-gray-300 cursor-pointer select-none"
                                onClick={() => setSortConfig({ key: "name", direction: "asc" })}
                            >
                                Tên
                            </th>
                            <th className="p-4 text-center border-b border-gray-300">Mã</th>
                            <th className="p-4 text-center border-b border-gray-300">SĐT</th>
                            <th className="p-4 text-center border-b border-gray-300">Chi tiết</th>
                            <th className="p-4 text-center border-b border-gray-300">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white text-gray-700">
                        {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 text-center border-b border-gray-200">{s.id}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{s.name}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{s.code || "-"}</td>
                                    <td className="p-4 text-center border-b border-gray-200">{s.phone || "-"}</td>
                                    <td className="p-4 text-center border-b border-gray-200">
                                        <button
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                            onClick={() => {
                                                setForm(s);
                                                setEditingSupplierId(s.id);
                                                setReadOnly(true);
                                                setShowForm(true);
                                            }}
                                        >
                                            Chi tiết
                                        </button>
                                    </td>
                                    <td className="p-4 text-center border-b border-gray-200">
                                        <div className="inline-flex gap-2">
                                            <button
                                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                                                onClick={() => {
                                                    setForm(s);
                                                    setEditingSupplierId(s.id);
                                                    setShowForm(true);
                                                }}
                                            >
                                                Chỉnh sửa
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                                onClick={() => toggleSupplierDelete(s.id, s.name)}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center p-6 text-gray-500">
                                    Không có nhà cung cấp phù hợp
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingSupplierId ? "Thông tin nhà cung cấp" : "Thêm nhà cung cấp"}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input
                                type="text"
                                placeholder="Tên"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                            <input
                                type="text"
                                placeholder="Mã"
                                value={form.code}
                                onChange={e => {
                                    setForm({ ...form, code: e.target.value });
                                    setIsCodeManuallyEdited(true);
                                }}
                                className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                            <input
                                type="text"
                                placeholder="Số điện thoại"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                            <input
                                type="text"
                                placeholder="Địa chỉ"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                            <input
                                type="text"
                                placeholder="Mã số thuế"
                                value={form.taxCode}
                                onChange={e => setForm({ ...form, taxCode: e.target.value })}
                                className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                            <textarea
                                placeholder="Ghi chú"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="border p-2 rounded h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={closeAndResetForm}
                                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
                            >
                                Đóng
                            </button>
                            {!readOnly && (
                                <button
                                    onClick={editingSupplierId ? handleUpdateSupplier : handleCreateSupplier}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                >
                                    {editingSupplierId ? "Cập nhật" : "Thêm"}
                                </button>
                            )}
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
                onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
            />
        </div>
    );

}

