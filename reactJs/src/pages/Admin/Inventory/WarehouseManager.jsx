import { useContext, useEffect, useState } from "react";
import { getAllWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from "../../../apis/inventoryApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiEye, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { AuthContext } from "../../../contexts/AuthContext";

export default function WarehouseManager() {
  const {role}=useContext(AuthContext)
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", description: "" });
  const [popup, setPopup] = useState({ message: "" });
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    setIsLoading(true);
    const res = await getAllWarehouses();
    if (res.error) {
      console.error(res.error);
      setWarehouses([]);
      setPopup({ message: "Có lỗi khi lấy dữ liệu kho!", type: "error" });
      setIsLoading(false);
      return;
    }
    console.log(res.data)
    setWarehouses(res.data);
    setIsLoading(false);
  };

  const handleCreateWarehouse = async () => {
    setIsProcessing(true);
    const res = await createWarehouse(form.name, form.code, form.address, form.description);
    if (res.error) {
      setPopup({ message: res.error, type: "error" });
      setIsProcessing(false);
      return;
    }
    setWarehouses(prev => [...prev, res.data]);
    setPopup({ message: res.message || "Tạo kho thành công!", type: "success" });
    closeAndResetForm();
    setIsProcessing(false);
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
    <div className="p-6 bg-white rounded shadow">
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
            className={`px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition
               ${role !== "ADMIN" && role !== "MANAGER" ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={role !== "ADMIN" && role !== "MANAGER"}
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
              <th className="p-4 text-center border-b border-gray-300">Ghi chú</th>
              <th className="p-4 text-center border-b border-gray-300">Hành động</th>
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
            ) : (filteredWarehouses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  Không có kho phù hợp
                </td>
              </tr>
            ) :
              (
                filteredWarehouses.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 text-center border-b border-gray-200">{w.id}</td>
                    <td className="p-4 text-center border-b border-gray-200">{w.name}</td>
                    <td className="p-4 text-center border-b border-gray-200">{w.code || "-"}</td>
                    <td className="p-4 text-center border-b border-gray-200">{w.address || "-"}</td>
                    <td className="p-4 text-center border-b border-gray-200 max-w-[200px] truncate overflow-hidden whitespace-nowrap">
                      {w.description}
                    </td>
                    <td className="p-4 text-center border-b border-gray-200">
                      <div className="inline-flex gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                          onClick={() => {
                            setForm(w);
                            setEditingWarehouseId(w.id);
                            setShowForm(true);
                          }}
                        >
                          <FiEye></FiEye>
                        </button>
                        <button
                          className={`p-2 text-red-600 hover:bg-red-100 rounded transition
                             ${(role !== "ADMIN" && role !== "MANAGER") ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => toggleWarehouseDelete(w.id, w.name)}
                          disabled={role !== "ADMIN" && role !== "MANAGER"}
                        >
                          <FiTrash2></FiTrash2>
                        </button>
                      </div>
                    </td>

                  </tr>
                )))
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
            <div className="grid grid-cols-1 gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Tên kho</label>
                <input
                  type="text"
                  placeholder="Tên"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={readOnly}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Mã kho</label>
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
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Địa chỉ"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={readOnly}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Mô tả</label>
                <textarea
                  placeholder="Mô tả"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="border p-2 rounded h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeAndResetForm}
                className="px-4 py-2 border rounded hover:bg-gray-100 transition"
              >
                Đóng
              </button>

              {!readOnly && (
                <button
                  onClick={editingWarehouseId ? handleUpdateWarehouse : handleCreateWarehouse}
                  className={`px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition
                     ${role !== "ADMIN" && role !== "MANAGER" ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={role !== "ADMIN" && role !== "MANAGER"}
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
