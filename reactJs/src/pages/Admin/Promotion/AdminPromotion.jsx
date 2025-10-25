import React, { useContext, useEffect, useState } from "react";
import { FiRefreshCcw } from "react-icons/fi";
import { getAllPromotions, createPromotion } from "../../../apis/promotionApi";
import { PopupContext } from "../../../contexts/PopupContext";

export default function AdminPromotion() {
    const { showPopup } = useContext(PopupContext);
    const [promotions, setPromotions] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortActive, setSortActive] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPromotion, setNewPromotion] = useState({
        code: "",
        name: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        usageLimit: "",
        usageLimitPerCustomer: 1,
        startDate: "",
        endDate: "",
    });

    useEffect(() => {
        getData(currentPage);
    }, [currentPage]);

    const getData = async (page = 0) => {
        const res = await getAllPromotions(page, 20, keyword, sortActive);
        if (res.error) {
            showPopup(res.error);
            return;
        }
        setPromotions(res.data.content);
        setTotalPages(res.data.totalPages);
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

    const handleCreatePromotion = () => {
        setShowCreateModal(true);
    };

    const handleSubmitPromotion = async () => {
        if (!newPromotion.code || !newPromotion.name || !newPromotion.startDate || !newPromotion.endDate) {
            showPopup("Vui lòng nhập đầy đủ thông tin bắt buộc!");
            return;
        }

        const payload = {
            ...newPromotion,
            startDate: new Date(newPromotion.startDate).toISOString(),
            endDate: new Date(newPromotion.endDate).toISOString(),
        };

        const res = await createPromotion(payload);
        if (res.error) {
            showPopup(res.error);
            return;
        }

        showPopup("Tạo khuyến mãi thành công!");
        setShowCreateModal(false);
        getData(0);
    };

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
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
                        className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700"
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
                        onClick={handleCreatePromotion}
                        className="flex items-center px-4 py-2 border rounded bg-green-600 text-white hover:bg-green-700 transition"
                    >
                        Tạo khuyến mãi
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="mt-8 bg-white rounded-xl shadow">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                            {[
                                "Mã",
                                "Tên",
                                "Loại KM",
                                "Giá trị giảm",
                                "Ngày bắt đầu",
                                "Ngày kết thúc",
                                "Trạng thái",
                                "Ngày tạo",
                            ].map((head) => (
                                <th key={head} className="p-3 border-b border-gray-200 text-center">
                                    {head}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {promotions.length === 0 ? (
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
                                    <td className="p-3 border-b border-gray-200 text-center">{promo.discountType}</td>
                                    <td className="p-3 border-b border-gray-200 text-center">
                                        {promo.discountType === "PERCENTAGE"
                                            ? `${promo.discountValue}%`
                                            : `${promo.discountValue?.toLocaleString("vi-VN")}₫`}
                                    </td>
                                    <td className="p-3 border-b border-gray-200 text-center">{formatDate(promo.startDate)}</td>
                                    <td className="p-3 border-b border-gray-200 text-center">{formatDate(promo.endDate)}</td>
                                    <td className="p-3 border-b border-gray-200 text-center">
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-semibold ${promo.isActive
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {promo.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200 text-center">{formatDate(promo.createdAt)}</td>
                                </tr>
                            ))
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

            {/* Create Promotion Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
                        <h3 className="text-xl font-semibold mb-4">Tạo khuyến mãi mới</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Mã khuyến mãi"
                                value={newPromotion.code}
                                onChange={(e) => setNewPromotion({ ...newPromotion, code: e.target.value })}
                                className="border p-2 rounded"
                            />
                            <input
                                type="text"
                                placeholder="Tên khuyến mãi"
                                value={newPromotion.name}
                                onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                                className="border p-2 rounded"
                            />
                            <select
                                value={newPromotion.discountType}
                                onChange={(e) => setNewPromotion({ ...newPromotion, discountType: e.target.value })}
                                className="border p-2 rounded"
                            >
                                <option value="PERCENTAGE">Phần trăm</option>
                                <option value="FIXED_AMOUNT">Số tiền</option>
                            </select>

                            <input
                                type="number"
                                placeholder="Giá trị giảm"
                                value={newPromotion.discountValue}
                                onChange={(e) => setNewPromotion({ ...newPromotion, discountValue: e.target.value })}
                                className="border p-2 rounded"
                            />
                            <input
                                type="datetime-local"
                                placeholder="Ngày bắt đầu"
                                value={newPromotion.startDate}
                                onChange={(e) => setNewPromotion({ ...newPromotion, startDate: e.target.value })}
                                className="border p-2 rounded"
                            />
                            <input
                                type="datetime-local"
                                placeholder="Ngày kết thúc"
                                value={newPromotion.endDate}
                                onChange={(e) => setNewPromotion({ ...newPromotion, endDate: e.target.value })}
                                className="border p-2 rounded"
                            />
                            <input
                                type="number"
                                placeholder="Giới hạn sử dụng"
                                value={newPromotion.usageLimit}
                                onChange={(e) => setNewPromotion({ ...newPromotion, usageLimit: e.target.value })}
                                className="border p-2 rounded"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmitPromotion}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Tạo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
