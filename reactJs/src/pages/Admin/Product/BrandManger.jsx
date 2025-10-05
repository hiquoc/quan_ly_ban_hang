import { useEffect, useState } from "react";
import { changeBrandActive, createBrand, getAllBrands, updateBrand, deleteBrand } from "../../../apis/productApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw } from "react-icons/fi";

export default function BrandManager() {
    const [brands, setBrands] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", slug: "", imageUrl: "", isActive: false });
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [popup, setPopup] = useState({ message: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [editingBrandId, setEditingBrandId] = useState(null);

    const [searchText, setSearchText] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    useEffect(() => {
        handleLoadBrands();
    }, []);

    useEffect(() => {
        if (!isSlugManuallyEdited) {
            setForm(prev => ({ ...prev, slug: generateSlug(prev.name) }));
        }
        if (form.name === "") setIsSlugManuallyEdited(false);
    }, [form.name]);

    const handleLoadBrands = async () => {
        const res = await getAllBrands();
        if (res.error) {
            console.error(res.error);
            setBrands([]);
            setPopup({ message: "Có lỗi khi lấy dữ liệu thương hiệu!", type: "error" });
        }
        setBrands(res.data);
    };

    const handleCreateBrand = async () => {
        const response = await createBrand(form.name, form.slug, form.imageUrl);
        if (response?.error) {
            setPopup({ message: response.error, type: "error" });
            return;
        }
        setPopup({ message: response.message || "Tạo thương hiệu thành công!", type: "success" });
        closeAndResetForm();
        handleLoadBrands();
    };

    const handleUpdateBrand = async () => {
        const response = await updateBrand(editingBrandId, form.name, form.slug, form.imageUrl);
        if (response?.error) {
            setPopup({ message: response.error, type: "error" });
            return;
        }
        setPopup({ message: response.message || "Cập nhật thương hiệu thành công!", type: "success" });
        closeAndResetForm();
        setEditingBrandId(null);
        handleLoadBrands();
    };

    const handleChangeBrandActive = async (id) => {
        const response = await changeBrandActive(id);
        if (response?.error) {
            setPopup({ message: response.error, type: "error" });
            return;
        }
        setPopup({ message: response.message || "Cập nhật trạng thái thành công!", type: "success" });
        setBrands(prev => prev.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
    };
    const handleDeleteBrand = async (id) => {
        const response = await deleteBrand(id);
        if (response?.error) {
            setPopup({ message: response.error, type: "error" });
            return;
        }
        setPopup({ message: response.message || "Xóa thương hiệu thành công!", type: "success" });
        setBrands(prev => prev.filter(b => b.id !== id)); // remove from list
    };


    const closeAndResetForm = () => {
        setForm({ name: "", slug: "", imageUrl: "", isActive: false });
        setShowForm(false);
        setIsSlugManuallyEdited(false);
        setEditingBrandId(null);
    };

    const toggleBrandActive = (id, isActive, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc chắn muốn ${isActive ? "khóa" : "mở khóa"} thương hiệu "${name}"?`,
            onConfirm: () => handleChangeBrandActive(id),
        });
    };
    const toggleBrandDelete = (id, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc chắn muốn xóa thương hiệu "${name}"?`,
            onConfirm: () => handleDeleteBrand(id)
        });
    };

    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    const filteredBrands = (brands ?? [])
        .filter(b => b.name.toLowerCase().includes(searchText.toLowerCase()) || b.slug.toLowerCase().includes(searchText.toLowerCase()))
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


    const generateSlug = text => text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-semibold text-gray-800">Thương hiệu</h2>
                <div className="flex gap-2">
                    <button onClick={handleLoadBrands} className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-300 transition">
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Reload
                    </button>
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                        Thêm thương hiệu
                    </button>
                </div>
            </div>

            {/* Search bar under header */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc slug..."
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
                            <th className="p-3 border-b text-center">Hình ảnh</th>
                            <th className="p-3 border-b text-center cursor-pointer select-none"
                                onClick={() => handleSort("name")}>
                                Tên {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>

                            <th className="p-3 border-b text-center">Slug</th>
                            <th
                                className="p-3 border-b text-center cursor-pointer select-none"
                                onClick={() => handleSort("isActive")}
                            >
                                Trạng thái {sortConfig.key === "isActive" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th className="p-3 border-b text-center">Ngày tạo</th>
                            <th className="p-3 border-b text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredBrands.map(b => (
                            <tr key={b.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 border-b text-center">{b.id}</td>
                                <td className="p-3 border-b text-center">{b.imageUrl ? <img src={b.imageUrl} alt={b.name} className="w-16 h-16 object-cover mx-auto rounded" /> : "-"}</td>
                                <td className="p-3 border-b text-center">{b.name}</td>
                                <td className="p-3 border-b text-center">{b.slug}</td>
                                <td className="p-3 border-b text-center">
                                    <button
                                        className={`px-3 py-1 rounded transition ${b.isActive ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                                        onClick={() => toggleBrandActive(b.id, b.isActive, b.name)}
                                    >
                                        {b.isActive ? "Hoạt động" : "Đã khóa"}
                                    </button>
                                </td>
                                <td className="p-3 border-b text-center">{new Date(b.createdAt).toLocaleDateString("vi-VN")}</td>
                                <td className="p-3 border-b text-center">
                                    <div className="inline-flex gap-2">
                                        <button
                                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                            onClick={() => { setForm({ name: b.name, slug: b.slug, imageUrl: b.imageUrl || "", isActive: b.isActive }); setEditingBrandId(b.id); setShowForm(true); }}
                                        >
                                            Chỉnh sửa
                                        </button>
                                        <button
                                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                            onClick={() => toggleBrandDelete(b.id, b.name)}
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredBrands.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-4 text-gray-500">Không có thương hiệu phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Brand Form */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
                        <h3 className="text-lg font-semibold mb-4">{editingBrandId ? "Cập nhật thương hiệu" : "Thêm thương hiệu"}</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input type="text" placeholder="Tên" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Slug" value={form.slug} onChange={e => { setForm({ ...form, slug: e.target.value }); setIsSlugManuallyEdited(true); }} className="border p-2 rounded" />
                            <input type="text" placeholder="Image URL" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className="border p-2 rounded" />
                            {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="w-32 h-32 object-cover rounded mt-2 mx-auto" />}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={closeAndResetForm} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Hủy</button>
                            <button onClick={editingBrandId ? handleUpdateBrand : handleCreateBrand} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                {editingBrandId ? "Cập nhật" : "Thêm"}
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
