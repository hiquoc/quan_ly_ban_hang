import { useContext, useEffect, useState } from "react";
import { PopupContext } from "../../../contexts/PopupContext";
import { deleteAccount, getAllAccounts } from "../../../apis/authApi";
import { FiLock, FiRefreshCcw, FiTrash2, FiUnlock } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getAllWarehouses } from "../../../apis/inventoryApi";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { changeStaffActive, changeStaffRole, changeStaffWarehouse, getAllStaffs } from "../../../apis/staffApi";
import AddStaffForm from "./AddStaffForm";

export default function AdminStaff() {
    const [showAccountForm, setShowAccountForm] = useState(false)
    const { showPopup } = useContext(PopupContext)
    const [staffs, setStaffs] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [keyword, setKeyword] = useState("")
    const [activeSort, setActiveSort] = useState(true)
    const [warehouseSort, setWarehouseSort] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null })

    useEffect(() => {
        handleLoadWarehouses();
    }, [])
    useEffect(() => {
        handleLoadStaffs(0);
    }, [warehouseSort, activeSort])

    async function handleLoadStaffs(currentPage = 0) {
        try {
            setIsLoading(true)
            setPage(currentPage)
            const res = await getAllStaffs(currentPage, 10, keyword, warehouseSort, activeSort)
            if (res.error)
                return showPopup(res.error)
            setStaffs(res.data.content || [])
            setPage(currentPage)
            setTotalPages(res.data.totalPages)
        }
        finally {
            setIsLoading(false)
        }
    }

    async function handleLoadWarehouses() {
        const res = await getAllWarehouses();
        if (res.error) return showPopup(res.error);
        const data = res.data;
        setWarehouses(data);
    }

    async function handleChangeStaffWarehouse(id, warehouseId) {
        const selectedWarehouse = warehouses.find(w => w.id === Number(warehouseId));
        setConfirmPanel({
            visible: true, message: `Thay đổi kho hoạt động của NV${id} thành ${selectedWarehouse.name}?`, onConfirm: async () => {
                const res = await changeStaffWarehouse(id, warehouseId);
                if (res.error) return showPopup(res.error);
                setStaffs(prev => prev.map(s => s.id === id ? { ...s, warehouseId: warehouseId } : s));
                handleOnCloseConfirmPanel();
            }
        });
    }
    function handleOnCloseConfirmPanel() {
        setConfirmPanel({ visible: false, message: '', onConfirm: null })
    }
    const handleToggleActive = async (id, isActive, currentRole) => {
        console.log(1)
        setConfirmPanel({
            visible: true, message: `${isActive ? "Khóa" : "Mở khóa"} tài khoản của NV${id}?`, onConfirm: async () => {
                const res = await changeStaffActive(id, currentRole);
                if (res.error) return showPopup(res.error);
                setStaffs(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
                handleOnCloseConfirmPanel();
            }
        });
    };

    const handleRoleChange = async (staffId, newRole) => {
        const roleMap = { MANAGER: 2, STAFF: 3 };
        const result = await changeStaffRole(staffId, roleMap[newRole]);
        if (result?.error) return showPopup(result.error);
        // showPopup("Thay đổi quyền thành công!", "success");
        setStaffs(prev => prev.map(staff => staff.id === staffId ? { ...staff, role: newRole } : staff));
        handleOnCloseConfirmPanel();
    };

    const confirmAction = (message, action) => setConfirmPanel({ visible: true, message, onConfirm: action });

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 4;

        if (totalPages <= maxVisible + 2) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 2) {
                pages.push(0, 1, 2, 3, "...", totalPages - 1);
            } else if (currentPage >= totalPages - 3) {
                pages.push(0, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
            } else {
                pages.push(0, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages - 1);
            }
        }

        return pages;
    };

    return (<div className="p-6 bg-white rounded shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-gray-800">Quản lý nhân viên</h2>
            <button
                onClick={() => setShowAccountForm(true)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 hover:cursor-pointer"
            >
                Tạo tài khoản
            </button>
        </div>
        <div className="flex justify-between">
            <div className="flex gap-1">
                <input
                    type="text"
                    placeholder="Từ khóa..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700"
                />
                <button
                    onClick={() => {
                        handleLoadStaffs(0);
                    }}
                    className="px-5 py-2 text-white bg-black rounded hover:bg-gray-800 hover:cursor-pointer"
                >
                    Tìm
                </button>
            </div>
            <div className="flex gap-2">
                <select
                    value={warehouseSort}
                    onChange={e => setWarehouseSort(e.target.value)}
                    className="p-2 border border-gray-700 rounded hover:cursor-pointer"
                >
                    <option value="">Tất cả kho</option>
                    {warehouses?.map(w =>
                        <option key={w.id} value={w.id}>
                            {w.code}
                        </option>
                    )}
                </select>

                <select
                    value={activeSort}
                    onChange={e => setActiveSort(e.target.value === "" ? "" : e.target.value === "true")}
                    className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer"
                >
                    <option value="">Tất cả tài khoản</option>
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Đã bị khóa</option>
                </select>
                <button onClick={() => handleLoadStaffs()} className="flex items-center px-4 py-2 border border-gray-700 rounded hover:bg-gray-200 hover:cursor-pointer">
                    <FiRefreshCcw className="h-5 w-5 mr-2" /> Làm mới
                </button>
            </div>


        </div>
        {/* Table */}
        <div className="mt-8 bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                <thead className="bg-gray-200 text-gray-700">
                    <tr>
                        {["Mã nhân viên", "Họ và tên", "Email", "SĐT", "Kho làm việc", "Quyền", "Hành động"].map(head => (
                            <th key={head} className="p-3 border-b border-gray-200 text-center">{head}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {isLoading ? (
                        <tr>
                            <td colSpan={9} className="p-4 text-gray-500 text-center align-middle">
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
                    ) : (staffs.length === 0 ? (
                        <tr className="hover:bg-gray-50 transition">
                            <td colSpan={6} className="text-center p-3">
                                Không có kết quả
                            </td>
                        </tr>
                    ) : (staffs.map(staff => (
                        <tr key={staff.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 border-b border-gray-200 text-center">{`NV${staff.id}`}</td>
                            <td className="p-3 border-b border-gray-200 text-center">{staff.fullName || "-"}</td>
                            <td className="p-3 border-b border-gray-200 text-center">{staff.email || "-"}</td>
                            <td className="p-3 border-b border-gray-200 text-center">{staff.phone || "-"}</td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                {staff.role === "STAFF" ? (
                                    <select
                                        className="p-1 border rounded"
                                        onChange={(e) => handleChangeStaffWarehouse(staff.id, e.target.value)}
                                        value={staff.warehouseId}>
                                        {warehouses && warehouses.map(w =>
                                            <option key={w.id} value={w.id}>{w.code}</option>
                                        )}

                                    </select>
                                ) : (<span className="text-gray-500">-</span>)}
                            </td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                {staff.role !== "ADMIN" ? (
                                    <select
                                        value={staff.role}
                                        onChange={e => {
                                            const newRole = e.target.value;
                                            confirmAction(
                                                `Bạn có chắc chắn muốn đổi quyền của NV${staff.id} thành ${newRole}?`,
                                                () => handleRoleChange(staff.id, newRole)
                                            );
                                        }}
                                        className="border rounded px-2 py-1"
                                    >
                                        <option value="STAFF">STAFF</option>
                                        <option value="MANAGER">MANAGER</option>
                                    </select>
                                ) : staff.role}
                            </td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                <div className="flex justify-center gap-2 flex-wrap">
                                    <button
                                        className={`p-2 rounded text-sm font-semibold cursor-pointer transition
                                                ${staff.active ? "text-green-500 hover:bg-green-100"
                                                : "text-gray-500  hover:bg-gray-300"
                                            }`}
                                        title={staff.active ? "Khóa" : "Mở khóa"}
                                        aria-label={staff.active ? "Khóa" : "Mở khóa"}
                                        onClick={() =>
                                            handleToggleActive(staff.id, staff.active, staff.role)
                                        }
                                    >
                                        {!staff.active ? <FiLock /> : <FiUnlock />}
                                        <span className="sr-only">{staff.active ? "Khóa" : "Mở khóa"}</span>
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
                    onClick={() => setPage(prev => Math.max(prev - 1, 0))}
                    disabled={page === 0}
                    className={`p-3 rounded ${page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                >
                    <FaChevronLeft />
                </button>

                {getPageNumbers().map((num, i) =>
                    num === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-500">...</span>
                    ) : (
                        <button
                            key={`page-${num}`}
                            onClick={() => setPage(num)}
                            className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${page === num
                                ? "bg-black text-white border-black"
                                : "bg-white hover:bg-gray-100"
                                }`}
                        >
                            {num + 1}
                        </button>
                    )
                )}

                <button
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages - 1))}
                    disabled={page >= totalPages - 1}
                    className={`p-3 rounded ${page >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                >
                    <FaChevronRight />
                </button>
            </div>
        )}
        {showAccountForm &&
            <AddStaffForm
                warehouses={warehouses}
                onClose={() => setShowAccountForm(false)}
                onSuccess={() => { setShowAccountForm(false); showPopup("Tạo tài khoản thành công!", "success"); handleLoadStaffs() }}
                showPopup={showPopup}
            />}
        <ConfirmPanel
            visible={confirmPanel.visible}
            message={confirmPanel.message}
            onConfirm={confirmPanel.onConfirm}
            onCancel={handleOnCloseConfirmPanel}
        ></ConfirmPanel>
    </div>)
}