import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { FaSignOutAlt, FaChartLine, FaShoppingCart, FaUsers, FaBox, FaTags, FaWarehouse, FaUserCircle, FaBoxOpen,FaUserTie  } from "react-icons/fa";
import StaffDetails from "../StaffDetails";

export default function AdminLayout({ children }) {
  const { username, role, ownerId } = useContext(AuthContext);
  const [showStaffDetails, setShowStaffDetails] = useState(false)
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    navigate("/logout", { replace: true });
  }

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const menuItems = [
    { path: "/admin/orders", label: "Đơn hàng", icon: FaShoppingCart },
    { path: "/admin/accounts", label: "Tài khoản", icon: FaUsers, hideForStaff: true },
    { path: "/admin/staffs", label: "Nhân viên", icon: FaUserTie, hideForStaff: true },
    { path: "/admin/products", label: "Sản phẩm", icon: FaBox },
    { path: "/admin/promotions", label: "Khuyến mãi", icon: FaTags, hideForStaff: true },
    { path: "/admin/inventory", label: "Tồn kho", icon: FaWarehouse },
    { path: "/admin/deliveries", label: "Giao hàng", icon: FaBoxOpen, hideForStaff: true },
    { path: "/admin/dashboard", label: "Thống kê", icon: FaChartLine, hideForStaff: true },
  ];


  return (
    <div className="h-screen flex flex-col bg-gray-50 z-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-300 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-8xl mx-auto px-40 py-3 flex items-center justify-between">
          <Link to="/admin/orders" className="text-2xl font-bold tracking-tight text-gray-800">
            Elec<span className="text-blue-500">Admin</span>
          </Link>

          <div className="flex items-center gap-4">
            {username ? (
              <>
                <button onClick={() => setShowStaffDetails(true)} className="px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 hover:cursor-pointer">Thông tin cá nhân</button>

                <div className="relative group">
                  <button onClick={() => navigate(`/`)}
                    className="flex items-center gap-2 bg-gray-100 px-4 py-2 cursor-pointer rounded-full text-gray-700 font-medium hover:bg-gray-200 transition">
                    <FaUserCircle className="text-xl" />
                    <span className="max-w-[130px] truncate">{username}</span>
                  </button>

                  {/* Tooltip only if long */}
                  {username.length > 12 && (
                    <div
                      className="absolute top-full mt-1 bg-black text-white text-sm px-3 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition">
                      {username}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full bg-gray-100 hover:bg-red-200 text-red-500 transition"
                  title="Đăng xuất"
                >
                  <FaSignOutAlt />
                </button>
              </>
            ) : (
              <Link to="/admin/login" className="px-4 py-2 rounded hover:bg-gray-100 transition">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Container */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col h-screen fixed">
          <div className="p-6 overflow-y-auto h-full">
            <div className="mt-17">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
                Menu
              </h2>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  if (item.hideForStaff && role === "STAFF") return null;
                  const active = isActive(item.path);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      <Icon className={`text-lg ${active ? "text-blue-600" : "text-gray-400"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

        </aside>

        {/* Content */}
        <main className="flex-1 ml-64 mt-16">
          {children}
        </main>
        {showStaffDetails && (
          <StaffDetails
            ownerId={ownerId}
            onClose={() => setShowStaffDetails(false)} />
        )}
      </div>
    </div>
  );
}
