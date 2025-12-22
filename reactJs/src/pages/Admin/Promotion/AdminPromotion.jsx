import React, { useContext, useEffect, useState } from "react";
import { FiRefreshCcw, FiX, FiEdit, FiTrash2, FiEye } from "react-icons/fi";
import { getAllPromotions, createPromotion, updatePromotion, deletePromotion, getPromotionById, updatePromotionActive } from "../../../apis/promotionApi";
import { PopupContext } from "../../../contexts/PopupContext";
import SearchableSelect from "../../../components/SearchableSelect";
import { getActiveProducts, getAllCategories, getAllBrands } from "../../../apis/productApi";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { Helmet } from "react-helmet-async";

export default function AdminPromotion() {
    const { showPopup } = useContext(PopupContext);
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [promotions, setPromotions] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0);
    const [sortActive, setSortActive] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create", "edit"
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [promotionForm, setPromotionForm] = useState({
        code: "",
        name: "",
        description: "",
        promotionType: "PERCENTAGE",
        discountValue: "",
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        usageLimit: "",
        usageLimitPerCustomer: 1,
        startDate: "",
        endDate: "",
        applicableProducts: [],
        applicableCategories: [],
        applicableBrands: []
    });

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        getData(currentPage);
    }, [currentPage]);

    const getData = async (currentPage = page) => {
        setIsLoading(true);
        const res = await getAllPromotions(currentPage, 20, keyword, sortActive);
        if (res.error) {
            showPopup(res.error);
            setIsLoading(false);
            return;
        }
        setPage(currentPage);
        setPromotions(res.data.content);
        setTotalPages(res.data.totalPages);
        setIsLoading(false);
    };

    const handleLoadProducts = async (keyword = "") => {
        try {
            const res = await getActiveProducts(0, 10, keyword);
            if (!res.error) {
                setProducts(res.data.content || []);
            } else {
                showPopup(res.error);
            }
        } catch (err) {
            showPopup(err.message);
        }
    };

    const handleLoadCategories = async (keyword = "") => {
        try {
            const res = await getAllCategories(0, 10, keyword);
            if (!res.error) {
                setCategories(res.data.content || []);
            } else {
                showPopup(res.error);
            }
        } catch (err) {
            showPopup(err.message);
        }
    };

    const handleLoadBrands = async (keyword = "") => {
        try {
            const res = await getAllBrands(0, 10, keyword);
            if (!res.error) {
                setBrands(res.data.content || []);
            } else {
                showPopup(res.error);
            }
        } catch (err) {
            showPopup(err.message);
        }
    };

    const handleSearch = () => {
        setCurrentPage(0);
        getData(0);
    };

    const handleRefresh = () => {
        setKeyword("");
        setSortActive("");
        setCurrentPage(0);
        getData(0);
    };

    const resetForm = () => {
        setPromotionForm({
            code: "",
            name: "",
            description: "",
            promotionType: "PERCENTAGE",
            discountValue: "",
            minOrderAmount: 0,
            maxDiscountAmount: 0,
            usageLimit: "",
            usageLimitPerCustomer: 1,
            startDate: "",
            endDate: "",
            applicableProducts: [],
            applicableCategories: [],
            applicableBrands: []
        });
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode("create");
        setSelectedPromotion(null);
        setShowModal(true);
        handleLoadProducts();
        handleLoadCategories();
        handleLoadBrands();
    };

    const openViewModal = async (promotion) => {
        const res = await getPromotionById(promotion.id);
        if (res.error) {
            showPopup(res.error);
            return;
        }
        const details = res.data;
        setModalMode("edit");
        setSelectedPromotion(promotion);
        setPromotionForm({
            code: details.code,
            name: details.name,
            description: details.description || "",
            promotionType: details.promotionType,
            discountValue: details.discountValue,
            minOrderAmount: details.minOrderAmount || 0,
            maxDiscountAmount: details.maxDiscountAmount || 0,
            usageLimit: details.usageLimit || "",
            usageLimitPerCustomer: details.usageLimitPerCustomer || 1,
            startDate: details.startDate ? new Date(details.startDate).toISOString().slice(0, 16) : "",
            endDate: details.endDate ? new Date(details.endDate).toISOString().slice(0, 16) : "",
            applicableProducts: details.applicableProducts || [],
            applicableCategories: details.applicableCategories || [],
            applicableBrands: details.applicableBrands || []
        });
        setShowModal(true);
        handleLoadProducts();
        handleLoadCategories();
        handleLoadBrands();
    };

    const buildPayload = () => {
        const payload = {};
        if (promotionForm.code !== selectedPromotion?.code) payload.code = promotionForm.code;
        if (promotionForm.name !== selectedPromotion?.name) payload.name = promotionForm.name;
        if (promotionForm.description !== selectedPromotion?.description) payload.description = promotionForm.description;

        const formDiscount = Number(promotionForm.discountValue || 0);
        const selectedDiscount = Number(selectedPromotion?.discountValue || 0);
        const formType = promotionForm.promotionType;
        const selectedType = selectedPromotion?.promotionType;
        if (formType !== selectedType || formDiscount !== selectedDiscount) {
            payload.promotionType = formType !== selectedType ? formType : selectedType || null;
            payload.discountValue = formDiscount !== selectedDiscount ? formDiscount : selectedDiscount || 0;
        }

        if (Number(promotionForm.minOrderAmount) !== Number(selectedPromotion?.minOrderAmount))
            payload.minOrderAmount = Number(promotionForm.minOrderAmount);
        if (Number(promotionForm.maxDiscountAmount) !== Number(selectedPromotion?.maxDiscountAmount))
            payload.maxDiscountAmount = Number(promotionForm.maxDiscountAmount);
        if (Number(promotionForm.usageLimit) !== Number(selectedPromotion?.usageLimit))
            payload.usageLimit = Number(promotionForm.usageLimit);
        if (Number(promotionForm.usageLimitPerCustomer) !== Number(selectedPromotion?.usageLimitPerCustomer))
            payload.usageLimitPerCustomer = Number(promotionForm.usageLimitPerCustomer);

        if (promotionForm.startDate !== selectedPromotion?.startDate)
            payload.startDate = toLocalISOString(promotionForm.startDate);
        if (promotionForm.endDate !== selectedPromotion?.endDate)
            payload.endDate = toLocalISOString(promotionForm.endDate);

        const compareIds = (arr1 = [], arr2 = []) => {
            const ids1 = arr1.map(x => typeof x === 'object' ? x.id : x);
            const ids2 = arr2.map(x => typeof x === 'object' ? x.id : x);
            return JSON.stringify(ids1) !== JSON.stringify(ids2) ? ids1 : null;
        };

        const changedProducts = compareIds(promotionForm.applicableProducts, selectedPromotion?.applicableProducts);
        if (changedProducts) payload.applicableProducts = changedProducts;

        const changedCategories = compareIds(promotionForm.applicableCategories, selectedPromotion?.applicableCategories);
        if (changedCategories) payload.applicableCategories = changedCategories;

        const changedBrands = compareIds(promotionForm.applicableBrands, selectedPromotion?.applicableBrands);
        if (changedBrands) payload.applicableBrands = changedBrands;

        return payload;
    };


    const handleSubmit = async () => {
        if (!promotionForm.code || !promotionForm.name || !promotionForm.startDate || !promotionForm.endDate) {
            showPopup("Vui lòng nhập đầy đủ thông tin bắt buộc!");
            return;
        }
        const { promotionType, discountValue } = promotionForm;

        if (promotionType === "PERCENTAGE" && discountValue > 100) {
            showPopup("Giá trị giảm tối đa là 100%");
            return;
        }

        if (discountValue < 0) {
            showPopup("Giá trị giảm không được âm");
            return;
        }
        if (modalMode === "edit" && !selectedPromotion) return;

        const payload = modalMode === "edit" ? buildPayload() : {
            ...promotionForm,
            startDate: toLocalISOString(promotionForm.startDate),
            endDate: toLocalISOString(promotionForm.endDate),
            applicableProducts: promotionForm.applicableProducts.map(p => typeof p === 'object' ? p.id : p),
            applicableCategories: promotionForm.applicableCategories.map(c => typeof c === 'object' ? c.id : c),
            applicableBrands: promotionForm.applicableBrands.map(b => typeof b === 'object' ? b.id : b),
        };
        let res;
        if (modalMode === "create") {
            res = await createPromotion(payload);
            if (!res.error) {
                setPromotions(prev => [res.data, ...prev]);
            }
        } else if (modalMode === "edit") {
            res = await updatePromotion(selectedPromotion.id, payload);
            if (!res.error) {
                setPromotions(prev => prev.map(p => p.id === selectedPromotion.id ? res.data : p));
            }
        }

        if (res.error) {
            showPopup(res.error);
            return;
        }

        showPopup(modalMode === "create" ? "Tạo khuyến mãi thành công!" : "Cập nhật khuyến mãi thành công!");
        setShowModal(false);
        resetForm();

    };

    const handlePromotionActive = async (promotionId) => {
        const res = await updatePromotionActive(promotionId);
        if (res.error) {
            showPopup(res.error);
            return;
        }
        showPopup("Cập nhật trạng thái thành công!");
        setPromotions(prev => prev.map(p =>
            p.id === promotionId ? { ...p, isActive: !p.isActive } : p
        ));

    };

    const handleDelete = async (promotionId) => {
        const res = await deletePromotion(promotionId);
        if (res.error) {
            showPopup(res.error);
            return;
        }
        showPopup("Xóa khuyến mãi thành công!");
        setPromotions(prev => prev.filter(p => p.id !== promotionId));
    };

    const addProduct = (productId) => {
        const product = products.find(p => p.id === productId);
        if (product && !promotionForm.applicableProducts.find(p => (typeof p === 'object' ? p.id : p) === productId)) {
            setPromotionForm({
                ...promotionForm,
                applicableProducts: [...promotionForm.applicableProducts, product]
            });
        }
    };

    const removeProduct = (productId) => {
        setPromotionForm({
            ...promotionForm,
            applicableProducts: promotionForm.applicableProducts.filter(p => (typeof p === 'object' ? p.id : p) !== productId)
        });
    };

    const addCategory = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        if (category && !promotionForm.applicableCategories.find(c => (typeof c === 'object' ? c.id : c) === categoryId)) {
            setPromotionForm({
                ...promotionForm,
                applicableCategories: [...promotionForm.applicableCategories, category]
            });
        }
    };

    const removeCategory = (categoryId) => {
        setPromotionForm({
            ...promotionForm,
            applicableCategories: promotionForm.applicableCategories.filter(c => (typeof c === 'object' ? c.id : c) !== categoryId)
        });
    };

    const addBrand = (brandId) => {
        const brand = brands.find(b => b.id === brandId);
        if (brand && !promotionForm.applicableBrands.find(b => (typeof b === 'object' ? b.id : b) === brandId)) {
            setPromotionForm({
                ...promotionForm,
                applicableBrands: [...promotionForm.applicableBrands, brand]
            });
        }
    };

    const removeBrand = (brandId) => {
        setPromotionForm({
            ...promotionForm,
            applicableBrands: promotionForm.applicableBrands.filter(b => (typeof b === 'object' ? b.id : b) !== brandId)
        });
    };

    function closeConfirmPanel() {
        setConfirmPanel({ visible: false, message: "", onConfirm: null })
    }
    const formatDate = (dateString) =>
        new Date(dateString).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    const toLocalISOString = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
    };
    // Filter out already selected items
    const availableProducts = products.filter(p =>
        !promotionForm.applicableProducts.find(selected => (typeof selected === 'object' ? selected.id : selected) === p.id)
    );
    const availableCategories = categories.filter(c =>
        !promotionForm.applicableCategories.find(selected => (typeof selected === 'object' ? selected.id : selected) === c.id)
    );
    const availableBrands = brands.filter(b =>
        !promotionForm.applicableBrands.find(selected => (typeof selected === 'object' ? selected.id : selected) === b.id)
    );

    const isReadOnly = modalMode === "view";

    return (
        <>
            <Helmet>
                <title>Khuyến mãi</title>
            </Helmet>
            <div className="p-8 bg-white rounded min-h-screen pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-semibold text-gray-800">Quản lý khuyến mãi</h2>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div className="flex gap-2 flex-wrap">
                        <input
                            type="text"
                            placeholder="Tìm theo mã hoặc tên khuyến mãi..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700 w-75"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-5 py-2 bg-black text-white rounded hover:bg-gray-800"
                        >
                            Tìm
                        </button>

                        <select
                            value={sortActive}
                            onChange={(e) => setSortActive(e.target.value)}
                            className="p-2 border border-gray-700 rounded"
                        >
                            <option value="">Tất cả</option>
                            <option value="true">Đang hoạt động</option>
                            <option value="false">Đã tắt</option>
                        </select>
                    </div>

                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handleRefresh}
                            className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 transition"
                        >
                            <FiRefreshCcw className="h-5 w-5 mr-2" /> Làm mới
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center px-4 py-2 border rounded bg-green-600 text-white hover:bg-green-700 transition"
                        >
                            Tạo khuyến mãi
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-8 bg-white rounded-xl shadow overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                        <thead className="bg-gray-200 text-gray-700">
                            <tr>
                                {[
                                    "Mã",
                                    "Tên",
                                    "Loại KM",
                                    "Giá trị giảm",
                                    "Ngày bắt đầu",
                                    "Ngày kết thúc",
                                    "Trạng thái",
                                    "Thao tác",
                                ].map((head) => (
                                    <th key={head} className="p-3 border-b border-gray-200 text-center">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-gray-500 text-center align-middle">
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
                            ) : (promotions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-gray-500">
                                        Không tìm thấy khuyến mãi
                                    </td>
                                </tr>
                            ) : (
                                promotions.map((promo) => (
                                    <tr key={promo.id} className="hover:bg-gray-50 transition">
                                        <td className="p-3 border-b border-gray-200 text-center font-semibold">{promo.code}</td>
                                        <td className="p-3 border-b border-gray-200 text-center">{promo.name}</td>
                                        <td className="p-3 border-b border-gray-200 text-center">
                                            {promo.promotionType === "PERCENTAGE" ? "Phần trăm" : "Số tiền"}
                                        </td>
                                        <td className="p-3 border-b border-gray-200 text-center">
                                            {promo.promotionType === "PERCENTAGE"
                                                ? `${promo.discountValue}%`
                                                : `${promo.discountValue?.toLocaleString("vi-VN")}₫`}
                                        </td>
                                        <td className="p-3 border-b border-gray-200 text-center">{formatDate(promo.startDate)}</td>
                                        <td className="p-3 border-b border-gray-200 text-center">{formatDate(promo.endDate)}</td>
                                        <td className="p-3 border-b border-gray-200 text-center">
                                            <button
                                                onClick={() => {
                                                    setConfirmPanel({
                                                        visible: true,
                                                        message: `Bạn có chắc là muốn ${promo.isActive ? "tắt" : "bật"} khuyến mãi này không?`,
                                                        onConfirm: () => handlePromotionActive(promo.id)
                                                    })
                                                }}
                                                className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition
                                                ${promo.isActive ? "bg-green-500 text-white hover:bg-green-400"
                                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                    }`}
                                            >
                                                {promo.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                                            </button>
                                        </td>
                                        <td className="p-3 border-b border-gray-200 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => openViewModal(promo)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                                    title="Xem chi tiết"
                                                >
                                                    <FiEye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setConfirmPanel({
                                                            visible: true,
                                                            message: `Bạn có chắc là muốn xóa khuyến mãi này không?`,
                                                            onConfirm: () => handleDelete(promo.id)
                                                        })
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                                    title="Xóa"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-6 gap-2">
                        <button
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                            className="px-4 py-2 border rounded disabled:opacity-50"
                        >
                            Trước
                        </button>
                        <span>Trang {currentPage + 1}/{totalPages}</span>
                        <button
                            disabled={currentPage === totalPages - 1}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
                            className="px-4 py-2 border rounded disabled:opacity-50"
                        >
                            Sau
                        </button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-2xl font-semibold text-gray-800">
                                    {modalMode === "create" && "Tạo khuyến mãi mới"}
                                    {modalMode === "edit" && "Chỉnh sửa khuyến mãi"}
                                    {modalMode === "view" && "Chi tiết khuyến mãi"}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Basic Information */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 mb-3">Thông tin cơ bản</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Mã khuyến mãi <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="VD: SUMMER2024"
                                                value={promotionForm.code}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tên khuyến mãi <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="VD: Giảm giá mùa hè"
                                                value={promotionForm.name}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                            <textarea
                                                placeholder="Mô tả chi tiết về khuyến mãi..."
                                                value={promotionForm.description}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Discount Settings */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 mb-3">Cài đặt giảm giá</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
                                            <select
                                                value={promotionForm.promotionType}
                                                onChange={(e) => {
                                                    const newType = e.target.value;
                                                    setPromotionForm({
                                                        ...promotionForm,
                                                        promotionType: newType,
                                                        maxDiscountAmount: newType === "FIXED_AMOUNT" ? promotionForm.discountValue : promotionForm.maxDiscountAmount
                                                    });
                                                }}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            >
                                                <option value="PERCENTAGE">Phần trăm (%)</option>
                                                <option value="FIXED_AMOUNT">Số tiền cố định (₫)</option>
                                            </select>

                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Giá trị giảm <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                placeholder={promotionForm.promotionType === "PERCENTAGE" ? "VD: 20" : "VD: 50000"}
                                                min="0"
                                                value={promotionForm.discountValue}
                                                onChange={(e) => {
                                                    const value = Number(e.target.value);
                                                    if (promotionForm.promotionType === "FIXED_AMOUNT") {
                                                        setPromotionForm({ ...promotionForm, discountValue: value, maxDiscountAmount: value });
                                                    } else {
                                                        setPromotionForm({ ...promotionForm, discountValue: value });
                                                    }
                                                }}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giảm tối đa (₫)</label>
                                            <input
                                                type="number"
                                                placeholder="VD: 100000"
                                                min="0"
                                                value={promotionForm.maxDiscountAmount}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, maxDiscountAmount: e.target.value })}
                                                disabled={isReadOnly || promotionForm.promotionType === "FIXED_AMOUNT"}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Đơn hàng tối thiểu (₫)</label>
                                            <input
                                                type="number"
                                                placeholder="VD: 200000"
                                                value={promotionForm.minOrderAmount}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, minOrderAmount: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn sử dụng</label>
                                            <input
                                                type="number"
                                                placeholder="VD: 100"
                                                value={promotionForm.usageLimit}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, usageLimit: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn/người</label>
                                            <input
                                                type="number"
                                                placeholder="VD: 1"
                                                value={promotionForm.usageLimitPerCustomer}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, usageLimitPerCustomer: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Time Period */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 mb-3">Thời gian áp dụng</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Ngày bắt đầu <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={promotionForm.startDate}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Ngày kết thúc <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={promotionForm.endDate}
                                                onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
                                                disabled={isReadOnly}
                                                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Applicable Products */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 mb-3">Sản phẩm áp dụng</h4>
                                    {!isReadOnly && (
                                        <SearchableSelect
                                            options={availableProducts.map(p => ({ label: p.name, value: p.id }))}
                                            value={null}
                                            onChange={(id) => addProduct(id)}
                                            placeholder="Tìm và chọn sản phẩm..."
                                            onInputChange={(keyword) => handleLoadProducts(keyword)}
                                        />
                                    )}
                                    {promotionForm.applicableProducts.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {promotionForm.applicableProducts.map((product) => {
                                                const productId = typeof product === 'object' ? product.id : product;
                                                const productName = typeof product === 'object' ? product.name : `Product ${product}`;
                                                return (
                                                    <div
                                                        key={productId}
                                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                                    >
                                                        <span className="truncate max-w-[200px]">{productName}</span>
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={() => removeProduct(productId)}
                                                                className="hover:bg-blue-200 rounded-full p-0.5"
                                                            >
                                                                <FiX size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {promotionForm.applicableProducts.length === 0 && (
                                        <p className="text-sm text-gray-500 mt-2">Chưa chọn sản phẩm nào (áp dụng cho tất cả)</p>
                                    )}
                                </div>

                                {/* Applicable Categories */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 mb-3">Danh mục áp dụng</h4>
                                    {!isReadOnly && (
                                        <SearchableSelect
                                            options={availableCategories.map(c => ({ label: c.name, value: c.id }))}
                                            value={null}
                                            onChange={(id) => addCategory(id)}
                                            placeholder="Tìm và chọn danh mục..."
                                            onInputChange={(keyword) => handleLoadCategories(keyword)}
                                        />
                                    )}
                                    {promotionForm.applicableCategories.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {promotionForm.applicableCategories.map((category) => {
                                                const categoryId = typeof category === 'object' ? category.id : category;
                                                const categoryName = typeof category === 'object' ? category.name : `Category ${category}`;
                                                return (
                                                    <div
                                                        key={categoryId}
                                                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                                    >
                                                        <span>{categoryName}</span>
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={() => removeCategory(categoryId)}
                                                                className="hover:bg-green-200 rounded-full p-0.5"
                                                            >
                                                                <FiX size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {promotionForm.applicableCategories.length === 0 && (
                                        <p className="text-sm text-gray-500 mt-2">Chưa chọn danh mục nào (áp dụng cho tất cả)</p>
                                    )}
                                </div>

                                {/* Applicable Brands */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 mb-3">Thương hiệu áp dụng</h4>
                                    {!isReadOnly && (
                                        <SearchableSelect
                                            options={availableBrands.map(b => ({ label: b.name, value: b.id }))}
                                            value={null}
                                            onChange={(id) => addBrand(id)}
                                            placeholder="Tìm và chọn thương hiệu..."
                                            onInputChange={(keyword) => handleLoadBrands(keyword)}
                                        />
                                    )}
                                    {promotionForm.applicableBrands.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {promotionForm.applicableBrands.map((brand) => {
                                                const brandId = typeof brand === 'object' ? brand.id : brand;
                                                const brandName = typeof brand === 'object' ? brand.name : `Brand ${brand}`;
                                                return (
                                                    <div
                                                        key={brandId}
                                                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                                    >
                                                        <span>{brandName}</span>
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={() => removeBrand(brandId)}
                                                                className="hover:bg-purple-200 rounded-full p-0.5"
                                                            >
                                                                <FiX size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {promotionForm.applicableBrands.length === 0 && (
                                        <p className="text-sm text-gray-500 mt-2">Chưa chọn thương hiệu nào (áp dụng cho tất cả)</p>
                                    )}
                                </div>

                                {/* Usage Statistics (only in view/edit mode) */}
                                {selectedPromotion && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-700 mb-3">Thống kê sử dụng</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">Đã sử dụng</label>
                                                <p className="text-lg font-semibold text-gray-800">{selectedPromotion.usageCount || 0}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">Ngày tạo</label>
                                                <p className="text-lg font-semibold text-gray-800">{formatDate(selectedPromotion.createdAt)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">Cập nhật lần cuối</label>
                                                <p className="text-lg font-semibold text-gray-800">{formatDate(selectedPromotion.updatedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-300 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 border border-gray-500 rounded hover:bg-gray-100 transition font-medium"
                                >
                                    {isReadOnly ? "Đóng" : "Hủy"}
                                </button>
                                {!isReadOnly && (
                                    <button
                                        onClick={handleSubmit}
                                        className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 transition font-medium"
                                    >
                                        {modalMode === "create" ? "Tạo khuyến mãi" : "Cập nhật"}
                                    </button>
                                )}
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
        </>
    );
}