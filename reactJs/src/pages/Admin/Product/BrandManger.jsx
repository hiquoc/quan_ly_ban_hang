import { useContext, useEffect, useState } from "react";
import { changeBrandActive, createBrand, getAllBrands, updateBrand, deleteBrand, changeBrandFeatured } from "../../../apis/productApi";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiEye, FiTrash2 } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { PopupContext } from "../../../contexts/PopupContext"
export default function BrandManager() {
    const { showPopup } = useContext(PopupContext)
    const [brands, setBrands] = useState([]);
    const [status, setStatus] = useState(null);
    const [featured, setFeatured] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0)
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", slug: "", description: "", imageUrl: "", isActive: false });
    const [imageFile, setImageFile] = useState(null);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [editingBrandId, setEditingBrandId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        handleLoadBrands(0);
    }, []);

    useEffect(() => {
        if (!isSlugManuallyEdited) {
            setForm(prev => ({ ...prev, slug: generateSlug(prev.name) }));
        }
        if (form.name === "") setIsSlugManuallyEdited(false);
    }, [form.name]);

    const handleLoadBrands = async (currentPage = page, newStatus = status, newFeatured = featured) => {
        setIsLoading(true);
        const res = await getAllBrands(currentPage, 10, searchText, newStatus, newFeatured);
        if (res.error) {
            console.error(res.error);
            setBrands([]);
            showPopup("Có lỗi khi lấy dữ liệu thương hiệu!");
            setIsLoading(false);
            return;
        }
        setBrands(res.data.content);
        setPage(currentPage);
        setTotalPages(res.data.totalPages);
        setIsLoading(false);
    };

    const handleCreateBrand = async () => {
        if (isProcessing) return;
        try {
            setIsProcessing(true)
            const response = await createBrand(form.name, form.slug, form.description, imageFile || undefined);
            if (response?.error) {
                showPopup(response.error);
                return;
            }
            showPopup(response.message || "Tạo thương hiệu thành công!", "success");
            closeAndResetForm();
            setImageFile(null);
            handleLoadBrands();
        } finally {
            setIsProcessing(false)
        }
    };

    const handleUpdateBrand = async () => {
        if (isProcessing) return;
        try {
            setIsProcessing(true)
            const response = await updateBrand(editingBrandId, form.name, form.slug, form.description, imageFile || undefined);
            if (response?.error) {
                showPopup(response.error);
                return;
            }
            showPopup(response.message || "Cập nhật thương hiệu thành công!", "success");
            closeAndResetForm();
            setEditingBrandId(null);
            setImageFile(null);
            handleLoadBrands();
        } finally {
            setIsProcessing(false)
        }
    };

    const handleChangeBrandActive = async (id) => {
        const response = await changeBrandActive(id);
        if (response?.error) {
            showPopup(response.error);
            return;
        }
        showPopup(response.message || "Cập nhật trạng thái thành công!", "success");
        setBrands(prev => prev.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
    };
    const handleChangeBrandFeatured = async (id) => {
        const response = await changeBrandFeatured(id);
        if (response?.error) {
            showPopup(response.error);
            return;
        }
        showPopup(response.message || "Cập nhật nổi bật thành công!", "success");
        setBrands(prev => prev.map(b => b.id === id ? { ...b, isFeatured: !b.isFeatured } : b));
    };
    const handleDeleteBrand = async (id) => {
        const response = await deleteBrand(id);
        if (response?.error) {
            showPopup(response.error);
            return;
        }
        showPopup(response.message || "Xóa thương hiệu thành công!", "success");
        setBrands(prev => prev.filter(b => b.id !== id));
    };

    function hanldeSortByStatus() {
        let newStatus;
        if (status === null) newStatus = true;
        else if (status) newStatus = false;
        else if (!status) newStatus = null;
        else newStatus = null;

        setStatus(newStatus);
        handleLoadBrands(page, newStatus);
    }
    function hanldeSortByFeatured() {
        let newFeatured;
        if (featured === null) newFeatured = true;
        else if (featured) newFeatured = false;
        else newFeatured = null;

        setFeatured(newFeatured);
        handleLoadBrands(page, status, newFeatured);
    }

    const closeAndResetForm = () => {
        setForm({ name: "", slug: "", description: "", imageUrl: "", isActive: false });
        setShowForm(false);
        setImageFile(null);
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
    const toggleBrandFeatured = (id, isFeatured, name) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc chắn muốn ${isFeatured ? "hủy nổi bật" : "nổi bật"} thương hiệu "${name}"?`,
            onConfirm: () => handleChangeBrandFeatured(id),
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

    const generateSlug = text => text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");

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
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-gray-800">Thương hiệu</h2>
                <div className="flex gap-2">
                    <button onClick={() => handleLoadBrands(0)} className="flex items-center px-4 py-2 border  text-gray-800 rounded hover:bg-gray-300 transition">
                        <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
                    </button>
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition">
                        Thêm thương hiệu
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row items-center gap-2">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="border p-2 rounded w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={() => { handleLoadBrands(0) }}
                    className="w-full sm:w-auto bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
                >
                    Tìm
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                    <thead className="bg-gray-200 text-gray-700 font-medium">
                        <tr>
                            <th className="p-3 text-center border-b border-gray-300">Hình ảnh</th>
                            <th className="p-3 text-center border-b border-gray-300 cursor-pointer select-none">
                                Tên
                            </th>

                            <th className="p-3 text-center border-b border-gray-300">Slug</th>
                            <th className="p-3 text-center border-b border-gray-300">Mô tả</th>
                            <th
                                className={`p-4 text-center border-b border-gray-300 hover:cursor-pointer ${status !== null ? " font-semibold text-blue-600" : "text-gray-700"}`}
                                onClick={hanldeSortByStatus}
                            >
                                {status === true ? "Hoạt động" : status === false ? "Đã khóa" : "Trạng thái"}
                            </th>

                            <th
                                className={`p-4 text-center border-b border-gray-300 hover:cursor-pointer ${featured !== null ? " font-semibold text-blue-600" : "text-gray-700"}`}
                                onClick={hanldeSortByFeatured}
                            >
                                {featured === true ? "Nổi bật" : featured === false ? "Không" : "Nổi bật"}
                            </th>
                            <th className="p-3 text-center border-b border-gray-300">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
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
                        ) : (brands.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center p-4 text-gray-500">Không có thương hiệu phù hợp</td>
                            </tr>
                        ) : (brands.map(b => (
                            <tr key={b.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 border-b border-gray-200 text-center">{b.imageUrl ? <img src={b.imageUrl} alt={b.name} className="w-16 h-16 object-cover mx-auto rounded" /> : "-"}</td>
                                <td className="p-3 border-b border-gray-200 text-center">{b.name}</td>
                                <td className="p-3 border-b border-gray-200 text-center">{b.slug}</td>

                                <td className="p-3 border-b border-gray-200 text-center max-w-50 truncate" title={b.description}>
                                    {b.description}
                                </td>
                                <td className="p-3 border-b border-gray-200 text-center">
                                    <button
                                        className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition
                                            ${b.isActive ? "bg-green-500 text-white hover:bg-green-400"
                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                            }`} onClick={() => toggleBrandActive(b.id, b.isActive, b.name)}
                                    >
                                        {b.isActive ? "Hoạt động" : "Đã khóa"}
                                    </button>
                                </td>

                                <td className="p-3 border-b border-gray-200 text-center">
                                    <button
                                        className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition
                                            ${b.isFeatured ? "bg-green-500 text-white hover:bg-green-400"
                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                            }`} onClick={() => toggleBrandFeatured(b.id, b.isFeatured, b.name)}
                                    >
                                        {b.isFeatured ? "Nổi bật" : "Không"}
                                    </button>
                                </td>
                                <td className="p-3 border-b border-gray-200 text-center">
                                    <div className="inline-flex gap-2">
                                        <button
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                                            onClick={() => { setForm({ name: b.name, slug: b.slug, description: b.description, imageUrl: b.imageUrl || "", isActive: b.isActive }); setEditingBrandId(b.id); setShowForm(true); }}
                                        >
                                            <FiEye></FiEye>
                                        </button>
                                        <button
                                            className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                                            onClick={() => toggleBrandDelete(b.id, b.name)}
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
            {totalPages > 0 && (
                <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                    <button
                        onClick={() => page > 0 && handleLoadBrands(page - 1)}
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
                                onClick={() => handleLoadBrands(num)}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                            ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                            >
                                {num + 1}
                            </button>
                        )
                    )}

                    <button
                        onClick={() => page < totalPages - 1 && handleLoadBrands(page + 1)}
                        disabled={page === totalPages - 1}
                        className={`p-3 rounded ${page === totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}
            {/* Add/Edit Brand Form */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 overflow-y-auto p-4">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-[600px] my-10 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-3xl font-bold mb-5 text-black">
                            {editingBrandId ? "Cập nhật thương hiệu" : "Thêm thương hiệu"}
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

                        <div className="space-y-3">
                            {/* Tên */}
                            <label className="flex flex-col">
                                <span className="text-gray-700 font-semibold mb-2 text-black">Tên thương hiệu</span>
                                <input
                                    type="text"
                                    placeholder="Nhập tên thương hiệu"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                                />
                            </label>

                            {/* Slug */}
                            <label className="flex flex-col">
                                <span className="text-gray-700 font-semibold mb-2 text-black">Slug</span>
                                <input
                                    type="text"
                                    placeholder="Nhập slug"
                                    value={form.slug}
                                    onChange={e => {
                                        setForm({ ...form, slug: e.target.value });
                                        setIsSlugManuallyEdited(true);
                                    }}
                                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring focus:ring-gray-700 transition-all"
                                />
                            </label>
                            <label className="flex flex-col">
                                <span className="text-gray-700 font-semibold mb-2 text-black">Mô tả ngắn</span>
                                <textarea
                                    placeholder="Nhập mô tả ngắn"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="bg-white border p-3 rounded text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-700 transition-all h-35 resize-none"
                                />
                            </label>

                            {/* Hình ảnh */}
                            <label className="flex flex-col">
                                <span className="text-gray-700 font-semibold mb-2 text-black">Hình ảnh thương hiệu</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setImageFile(e.target.files[0])}
                                    className="block w-full text-black bg-white border rounded cursor-pointer file:mr-4 file:py-3 file:px-6 file:rounded file:border-0 file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer transition-all"
                                />
                                {(imageFile || form.imageUrl) && (
                                    <div className="mt-4 flex justify-center">
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                                            alt="Preview"
                                            className="w-35 h-35 object-cover rounded border shadow-lg"
                                        />
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t-2 border-gray-200">
                            <button
                                onClick={closeAndResetForm}
                                className="px-8 py-3 bg-white border text-black rounded hover:bg-gray-100 transition-colors font-semibold"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={editingBrandId ? handleUpdateBrand : handleCreateBrand}
                                className="px-8 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors font-semibold"
                            >
                                {editingBrandId ? "Cập nhật" : "Thêm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
