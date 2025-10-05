import { useEffect, useState } from "react";
import { getAllSuppliers, createSupplier} from "../../../apis/inventoryApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw } from "react-icons/fi";

export default function SupplierManager() {
    const [suppliers, setSuppliers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", contactName: "", phone: "", email: "", address: "", taxCode: "" });
    const [popup, setPopup] = useState({ message: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [editingSupplierId, setEditingSupplierId] = useState(null);

    const [searchText, setSearchText] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    useEffect(() => {
        loadSuppliers();
    }, []);

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
        const res = await createSupplier(form.name,form.contactName,form.phone,form.email,form.taxCode);
        if (res.error) {
            console.error(res);
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setPopup({ message: res.message || "Tạo nhà cung cấp thành công!", type: "success" });
        closeAndResetForm();
        loadSuppliers();
    };

    const handleUpdateSupplier = async () => {
        // const response = await updateSupplier(editingSupplierId, form);
        // if (response?.error) {
        //     setPopup({ message: response.error, type: "error" });
        //     return;
        // }
        // setPopup({ message: response.message || "Cập nhật nhà cung cấp thành công!", type: "success" });
        // closeAndResetForm();
        // setEditingSupplierId(null);
        // loadSuppliers();
    };

    const handleDeleteSupplier = async (id) => {
        // const response = await deleteSupplier(id);
        // if (response?.error) {
        //     setPopup({ message: response.error, type: "error" });
        //     return;
        // }
        // setPopup({ message: response.message || "Xóa nhà cung cấp thành công!", type: "success" });
        // setSuppliers(prev => prev.filter(s => s.id !== id));
    };

    const closeAndResetForm = () => {
        setForm({ name: "", contactName: "", phone: "", email: "", address: "", taxCode: "" });
        setShowForm(false);
        setEditingSupplierId(null);
    };

    const toggleSupplierDelete = (id, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc chắn muốn xóa nhà cung cấp "${name}"?`,
            onConfirm: () => handleDeleteSupplier(id)
        });
    };

    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    const filteredSuppliers = (suppliers ?? [])
        .filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()) || s.contactName.toLowerCase().includes(searchText.toLowerCase()))
        .sort((a, b) => {
            if (!sortConfig.key) return a.id - b.id;

            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (typeof aVal === "string") aVal = aVal.toLowerCase();
            if (typeof bVal === "string") bVal = bVal.toLowerCase();

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

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-semibold text-gray-800">Nhà cung cấp</h2>
                <div className="flex gap-2">
                    <button onClick={loadSuppliers} className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-300 transition">
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Reload
                    </button>
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                        Thêm nhà cung cấp
                    </button>
                </div>
            </div>

            {/* Search bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc người liên hệ..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="border p-2 rounded w-80"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse shadow rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-gray-700 text-left">
                        <tr>
                            <th className="p-3 border-b text-center">ID</th>
                            <th className="p-3 border-b text-center cursor-pointer select-none" onClick={() => handleSort("name")}>
                                Tên {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th className="p-3 border-b text-center">Người liên hệ</th>
                            <th className="p-3 border-b text-center">SĐT</th>
                            <th className="p-3 border-b text-center">Email</th>
                            <th className="p-3 border-b text-center">Địa chỉ</th>
                            <th className="p-3 border-b text-center">MST</th>
                            <th className="p-3 border-b text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 border-b text-center">{s.id}</td>
                                <td className="p-3 border-b text-center">{s.name}</td>
                                <td className="p-3 border-b text-center">{s.contactName}</td>
                                <td className="p-3 border-b text-center">{s.phone}</td>
                                <td className="p-3 border-b text-center">{s.email}</td>
                                <td className="p-3 border-b text-center">{s.address}</td>
                                <td className="p-3 border-b text-center">{s.taxCode}</td>
                                <td className="p-3 border-b text-center">
                                    <div className="inline-flex gap-2">
                                        <button
                                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                            onClick={() => { setForm(s); setEditingSupplierId(s.id); setShowForm(true); }}
                                        >
                                            Chỉnh sửa
                                        </button>
                                        <button
                                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                            onClick={() => toggleSupplierDelete(s.id, s.name)}
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSuppliers.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center p-4 text-gray-500">Không có nhà cung cấp phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Supplier Form */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
                        <h3 className="text-lg font-semibold mb-4">{editingSupplierId ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp"}</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input type="text" placeholder="Tên" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Người liên hệ" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="SĐT" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border p-2 rounded" />
                            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Địa chỉ" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="MST" value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} className="border p-2 rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={closeAndResetForm} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Hủy</button>
                            <button onClick={editingSupplierId ? handleUpdateSupplier : handleCreateSupplier} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                {editingSupplierId ? "Cập nhật" : "Thêm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />

            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); setConfirmPanel({ visible: false, message: "", onConfirm: null }); }}
                onCancel={closeConfirmPanel}
            />
        </div>
    );
}
