import { useEffect, useState } from "react";
import { changeCategoryActive, createCategory, getAllCategories, updateCategory, deleteCategory } from "../../../apis/productApi";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    imageUrl: "",
    isActive: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [popup, setPopup] = useState({ message: "" });
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [status, setStatus] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPage, setTotalPage] = useState(0)
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    handleLoadCategories(0);
  }, []);

  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
    if (form.name === "") {
      setIsSlugManuallyEdited(false)
    }
  }, [form.name]);

  const handleLoadCategories = async (currentPage = page, newStatus = status) => {
    const res = await getAllCategories(currentPage, 20, searchText, newStatus);
    if (res.error) {
      console.error(res.error);
      setCategories([]);
      setPopup({ message: "Có lỗi khi lấy dữ liệu danh mục!", type: "error" });
      return;
    }
    setCategories(res.data.content);
    setTotalPage(res.data.totalPages)
  }

  const handleCreateCategory = async () => {
    const response = await createCategory(form.name, form.slug, imageFile || undefined);

    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }

    // Success
    setPopup({ message: response.message || "Tạo danh mục thành công!", type: "success" });
    setShowForm(false);
    setForm({ name: "", slug: "", imageUrl: "", isActive: false });
    setImageFile(null);
    handleLoadCategories();
  };
  const handleUpdateCategory = async () => {
    const response = await updateCategory(editingCategoryId, form.name, form.slug, imageFile || undefined);

    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }

    // Success
    setPopup({ message: response.message || "Cập nhật danh mục thành công!", type: "success" });
    setShowForm(false);
    setForm({ name: "", slug: "", imageUrl: "", isActive: false });
    setEditingCategoryId(null);
    setImageFile(null);
    handleLoadCategories();
  };

  const handleChangeCategoryActive = async (id) => {
    const response = await changeCategoryActive(id);

    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }

    // Success
    setPopup({ message: response.message || "Cập nhật trạng thái thành công!", type: "success" });
    setCategories((prevCategories) =>
      prevCategories.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      )
    );
  };
  const handleDeleteCategory = async (id) => {
    const response = await deleteCategory(id);
    if (response?.error) {
      setPopup({ message: response.error, type: "error" });
      return;
    }
    setPopup({ message: response.message || "Xóa danh mục thành công!", type: "success" });
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const closeAndResetForm = () => {
    setForm({
      name: "",
      slug: "",
      imageUrl: "",
      isActive: false,
    })
    setShowForm(false)
    setImageFile(null);
    setIsSlugManuallyEdited(false);
  }
  const toggleCategoryActive = (id, isActive, name) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn ${isActive ? "khóa" : "mở khóa"} danh mục "${name}"?`,
      onConfirm: () => handleChangeCategoryActive(id)
    });
  };
  const toggleCategoryDelete = (id, name) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn xóa danh mục "${name}"?`,
      onConfirm: () => handleDeleteCategory(id)
    });
  };

  const closeConfirmPanel = () => {
    setConfirmPanel({ visible: false, message: "", onConfirm: null });
  };
  function hanldeSortByStatus() {
    let newStatus;
    if (status === null) newStatus = true;
    else if (status) newStatus = false;
    else if (!status) newStatus = null;
    else newStatus = null;

    setStatus(newStatus);
    handleLoadCategories(page, newStatus);
  }

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      // Convert accented characters to plain letters
      .normalize("NFD")            // split accents from letters
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/đ/g, "d")          // special case for đ
      .replace(/\s+/g, "-")        // replace spaces with -
      .replace(/[^\w-]+/g, "")     // remove non-word characters
      .replace(/--+/g, "-");       // collapse multiple -
  };

  return (
    <div className="p-6 bg-gray-50 rounded shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Danh mục</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleLoadCategories(0)}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-300 transition"
            title="Reload Categories"
          >
            <FiRefreshCw className="h-5 w-5 mr-2" />
            Reload
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Thêm danh mục
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
          onClick={() => { handleLoadCategories(0) }}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Tìm
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
          <thead className="bg-gray-200 text-gray-700 text-left">
            <tr>
              <th className="p-3 text-center border-b border-gray-300">ID</th>
              <th className="p-3 text-center border-b border-gray-300">Hình ảnh</th>
              <th
                className="p-3 text-center border-b border-gray-300 cursor-pointer select-none"
                onClick={() => handleSort("name")}> Tên
              </th>

              <th className="p-3 text-center border-b border-gray-300">Slug</th>
              <th
                className={`p-4 text-center border-b border-gray-300 hover:cursor-pointer ${status !== null && status !== undefined ? "underline font-semibold text-blue-600" : "text-gray-700"
                  }`} onClick={hanldeSortByStatus}
              >
                Trạng thái
              </th>
              <th className="p-3 text-center border-b border-gray-300">Ngày tạo</th>
              <th className="p-3 text-center border-b border-gray-300">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition">
                <td className="p-3 border-b border-gray-200 text-center">{c.id}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} className="w-16 h-16 object-cover mx-auto rounded" />
                  ) : "-"}
                </td>
                <td className="p-3 border-b border-gray-200 text-center">{c.name}</td>
                <td className="p-3 border-b border-gray-200 text-center">{c.slug}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <button
                    className={`px-3 py-1 rounded transition ${c.isActive ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                    onClick={() => toggleCategoryActive(c.id, c.isActive, c.name)}
                  >
                    {c.isActive ? "Hoạt động" : "Đã khóa"}
                  </button>
                </td>
                <td className="p-3 border-b border-gray-200 text-center">{new Date(c.createdAt).toLocaleDateString("vi-VN")}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      onClick={() => {
                        setForm({ name: c.name, slug: c.slug, imageUrl: c.imageUrl || "", isActive: c.isActive });
                        setEditingCategoryId(c.id);
                        setShowForm(true);
                      }}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => toggleCategoryDelete(c.id, c.name)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-4 text-gray-500">Không có danh mục phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          disabled={page === 0}
          onClick={() => handleLoadCategories(page - 1)}
          className="flex items-center px-3 py-2 border rounded disabled:opacity-50 hover:bg-gray-100 transition"
        >
          <FiChevronLeft className="w-5 h-5" />
          <span className="ml-1">Trước</span>
        </button>
        <span className="text-gray-700 font-medium text-center">Trang {page + 1} / {totalPage}</span>
        <button
          disabled={page >= totalPage - 1}
          onClick={() => handleLoadCategories(page + 1)}
          className="flex items-center px-3 py-2 border rounded disabled:opacity-50 hover:bg-gray-100 transition"
        >
          <span className="mr-1">Sau</span>
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>
      {/* Add Category Form Popup */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Thêm danh mục</h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Slug"
                value={form.slug}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                  setIsSlugManuallyEdited(true);
                }}
                className="border p-2 rounded"
              />
              <label className="block">
                <span className="block text-sm font-medium mb-1">Hình ảnh sản phẩm</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-700 border border-gray-300 rounded cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {(imageFile || form.imageUrl) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded mt-2 mx-auto border"
                  />
                )}
              </label>

            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => closeAndResetForm()}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Hủy
              </button>
              <button
                onClick={editingCategoryId ? handleUpdateCategory : handleCreateCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingCategoryId ? "Cập nhật" : "Thêm"}
              </button>
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
      {/* Confirm Panel */}
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