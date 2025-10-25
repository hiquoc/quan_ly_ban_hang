import { useEffect, useState } from "react";
import { getAllWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from "../../../apis/inventoryApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw } from "react-icons/fi";

export default function WarehouseManager() {
    const [warehouses, setWarehouses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", code: "", address: "", description: "" });
    const [popup, setPopup] = useState({ message: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [editingWarehouseId, setEditingWarehouseId] = useState(null);
    const [readOnly, setReadOnly] = useState(false);
    const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    useEffect(() => { loadWarehouses(); }, []);

    // auto-generate code from name unless manually edited
    useEffect(() => {
        if (!isCodeManuallyEdited && !readOnly && !editingWarehouseId) {
            const codeFromName = form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            if (codeFromName) setForm(prev => ({ ...prev, code: `WH-${codeFromName}` }));
        }
    }, [form.name]);

    const loadWarehouses = async () => {
        const res = await getAllWarehouses();
        if (res.error) {
            console.error(res.error);
            setWarehouses([]);
            setPopup({ message: "Có lỗi khi lấy dữ liệu kho!", type: "error" });
            return;
        }
        setWarehouses(res.data);
    };

    const handleCreateWarehouse = async () => {
        const res = await createWarehouse(form.name, form.code, form.address, form.description);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setWarehouses(prev => [...prev, res.data]);
        setPopup({ message: res.message || "Tạo kho thành công!", type: "success" });
        closeAndResetForm();
    };

    const handleUpdateWarehouse = async () => {
        const res = await updateWarehouse(editingWarehouseId, form.name, form.code, form.address, form.description);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setWarehouses(prev => prev.map(w => w.id === editingWarehouseId ? res.data : w));
        setPopup({ message: res.message || "Cập nhật kho thành công!", type: "success" });
        closeAndResetForm();
    };

    const handleDeleteWarehouse = async (id) => {
        const res = await deleteWarehouse(id);
        if (res.error) {
            setPopup({ message: res.error, type: "error" });
            return;
        }
        setWarehouses(prev => prev.filter(w => w.id !== id));
        setPopup({ message: res.message || "Xóa kho thành công!", type: "success" });
        closeAndResetForm();
    };

    const closeAndResetForm = () => {
        setForm({ name: "", code: "", address: "", description: "" });
        setShowForm(false);
        setEditingWarehouseId(null);
        setReadOnly(false);
        setIsCodeManuallyEdited(false);
    };

    const toggleWarehouseDelete = (id, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc chắn muốn xóa kho "${name}"?`,
            onConfirm: () => handleDeleteWarehouse(id)
        });
    };

    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    const filteredWarehouses = (warehouses ?? [])
        .filter(w => w && w.name?.toLowerCase().includes(searchText.toLowerCase()))
        .sort((a, b) => {
            if (!sortConfig.key) return (a?.id || 0) - (b?.id || 0);
            let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
            if (typeof aVal === "string") aVal = aVal.toLowerCase();
            if (typeof bVal === "string") bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

    const handleSort = (key) => {
        setSortConfig(prev => prev.key === key
            ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
            : { key, direction: "asc" });
    };

   return (
  <div className="p-6 bg-gray-50 rounded shadow">
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-semibold text-gray-800">Kho</h2>
      <div className="flex gap-2">
        <button
          onClick={loadWarehouses}
          className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-200 transition"
        >
          <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Thêm kho
        </button>
      </div>
    </div>

    {/* Search bar */}
    <div className="mb-4">
      <input
        type="text"
        placeholder="Tìm kiếm theo tên kho..."
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        className="border p-2 rounded w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Table */}
    <div className="overflow-x-auto shadow-md rounded-lg mb-4">
      <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
        <thead className="bg-gray-200 text-gray-700 text-m font-medium">
          <tr>
            <th className="p-4 text-center border-b border-gray-300">ID</th>
            <th
              className="p-4 text-center border-b border-gray-300 cursor-pointer select-none"
              onClick={() => handleSort("name")}
            >
              Tên {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
            </th>
            <th className="p-4 text-center border-b border-gray-300">Mã</th>
            <th className="p-4 text-center border-b border-gray-300">Địa chỉ</th>
            <th className="p-4 text-center border-b border-gray-300">Chi tiết</th>
            <th className="p-4 text-center border-b border-gray-300">Hành động</th>
          </tr>
        </thead>
        <tbody className="bg-white text-gray-700">
          {filteredWarehouses.length > 0 ? (
            filteredWarehouses.map(w => (
              <tr key={w.id} className="hover:bg-gray-50 transition">
                <td className="p-4 text-center border-b border-gray-200">{w.id}</td>
                <td className="p-4 text-center border-b border-gray-200">{w.name}</td>
                <td className="p-4 text-center border-b border-gray-200">{w.code || "-"}</td>
                <td className="p-4 text-center border-b border-gray-200">{w.address || "-"}</td>
                <td className="p-4 text-center border-b border-gray-200">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    onClick={() => {
                      setForm(w);
                      setEditingWarehouseId(w.id);
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
                        setForm(w);
                        setEditingWarehouseId(w.id);
                        setShowForm(true);
                      }}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      onClick={() => toggleWarehouseDelete(w.id, w.name)}
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
                Không có kho phù hợp
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
            {editingWarehouseId ? "Thông tin kho" : "Thêm kho"}
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
              placeholder="Địa chỉ"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
            <textarea
              placeholder="Mô tả"
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
                onClick={editingWarehouseId ? handleUpdateWarehouse : handleCreateWarehouse}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                {editingWarehouseId ? "Cập nhật" : "Thêm"}
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
      onCancel={closeConfirmPanel}
    />
  </div>
);

}
