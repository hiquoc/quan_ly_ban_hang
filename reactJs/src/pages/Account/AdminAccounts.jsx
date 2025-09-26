import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAllAccounts } from "../../api/authApi";
import { getAllUsers } from "../../api/userApi";
import { getAllCustomers } from "../../api/customerApi";
import { getDecodedToken } from "../../utils/jwt";
import AddAccountForm from "../../components/AddAccountForm";
import Popup from "../../components/Popup";

function AdminAccounts() {
    const token = getDecodedToken();
    if (token.role !== "ADMIN") return <Navigate to="/" replace />;

    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL"); // NEW: role filter
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [popup, setPopup] = useState({ message: "" });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);

    const mergeAccounts = (accounts, users, customers) => {
        return accounts.map(acc => {
            let profile = null;
            if (acc.role === "CUSTOMER") {
                profile = customers.find(c => c.id === acc.ownerId);
            } else {
                profile = users.find(u => u.id === acc.ownerId);
            }
            return { ...acc, profile };
        });
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [accRes, userRes, customerRes] = await Promise.all([
                    getAllAccounts(),
                    getAllUsers(),
                    getAllCustomers(),
                ]);
                const merged = mergeAccounts(accRes.data, userRes.data, customerRes.data);
                setAccounts(merged);
            } catch (err) {
                console.error("Failed to fetch data:", err);
                setPopup({ message: "Failed to load accounts." });
            }
        };
        fetchAll();
    }, []);

    // Filter accounts by search + role
    useEffect(() => {
        let filtered = accounts.filter(acc =>
            acc.username.toLowerCase().includes(search.toLowerCase()) ||
            (acc.email && acc.email.toLowerCase().includes(search.toLowerCase())) ||
            (acc.profile?.fullName?.toLowerCase().includes(search.toLowerCase()))
        );

        if (roleFilter !== "ALL") {
            filtered = filtered.filter(acc => acc.role === roleFilter);
        }

        setFilteredAccounts(filtered);
        setCurrentPage(1); // reset to first page when filtering
    }, [search, accounts, roleFilter]);

    const getCurrentPageData = () => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAccounts.slice(start, start + itemsPerPage);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Tài khoản</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Thêm tài khoản
                </button>
            </div>

            <div className="flex gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search by username, email, or name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                {/* Role filter */}
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    <option value="ALL">All Roles</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="MANAGER">Staff / Manager</option>
                    <option value="ADMIN">Admin</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse shadow rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-gray-700 text-left">
                        <tr>
                            <th className="p-3 border-b border-gray-200">ID</th>
                            <th className="p-3 border-b border-gray-200">Username</th>
                            <th className="p-3 border-b border-gray-200">Họ và tên</th>
                            <th className="p-3 border-b border-gray-200">Email</th>
                            <th className="p-3 border-b border-gray-200">Số điện thoại</th>
                            <th className="p-3 border-b border-gray-200">Quyền</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {getCurrentPageData().map(acc => (
                            <tr key={acc.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 border-b border-gray-200">{acc.id}</td>
                                <td className="p-3 border-b border-gray-200">{acc.username}</td>
                                <td className="p-3 border-b border-gray-200">{acc.profile?.fullName || "-"}</td>
                                <td className="p-3 border-b border-gray-200">{acc.email || "-"}</td>
                                <td className="p-3 border-b border-gray-200">{acc.profile?.phone || "-"}</td>
                                <td className="p-3 border-b border-gray-200">{acc.role || "-"}</td>
                            </tr>
                        ))}
                        {getCurrentPageData().length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center p-4 text-gray-500">
                                    Không tìm thấy tài khoản
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-4 gap-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                    Prev
                </button>
                <span className="px-3 py-1">{currentPage} / {totalPages}</span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                    Next
                </button>
            </div>

            {/* Add Account Form */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <AddAccountForm
                        onClose={() => setShowForm(false)}
                        onSuccess={() => {
                            setShowForm(false);
                            setPopup({ message: "Account created successfully!" });
                            // refetch accounts
                            Promise.all([getAllAccounts(), getAllUsers(), getAllCustomers()])
                                .then(([accRes, userRes, custRes]) => {
                                    const merged = mergeAccounts(accRes.data, userRes.data, custRes.data);
                                    setAccounts(merged);
                                })
                                .catch(err => console.error(err));
                        }}
                    />
                </div>
            )}

            <Popup
                message={popup.message}
                onClose={() => setPopup({ message: "" })}
                duration={3000}
                type="success"
            />
        </div>
    );
}

export default AdminAccounts;
