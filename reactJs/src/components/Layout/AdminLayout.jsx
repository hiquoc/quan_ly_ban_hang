import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { FaSignOutAlt } from "react-icons/fa";
export default function AdminLayout({ children }) {
  const { username, setUsername, role, setRole } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleLogout() {
    navigate("/logout", { replace: true });
  }

  return (
    <div className="h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border border-gray-300 border-b sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-40 py-3 flex items-center justify-between">
          {/* Left: Logo */}
          <Link
            to="/admin"
            className="text-2xl font-bold hover:text-red-200 transition"
          >
            Elec
          </Link>

          {/* Right: User */}
          <div className="flex items-center space-x-4">
            {!!username ? (
              <>
                <Link
                  to="/admin"
                  className="px-3 py-1 rounded border border-gray-300 transition flex items-center justify-center"
                >
                  {username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 hover:cursor-pointer transition text-red-500"
                >
                  <FaSignOutAlt />
                </button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="px-3 py-2 rounded transition flex items-center justify-center"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Container: Sidebar + Main content */}
      <div className="flex flex-1">
        <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 space-y-2">
          <Link to="/admin/orders">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">
              Đơn hàng
            </button>
          </Link>
          {role !== "STAFF" && (
            <Link to="/admin/accounts">
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">
                Tài khoản
              </button>
            </Link>
          )}
          <Link to="/admin/products">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">
              Sản phẩm
            </button>
          </Link>
          <Link to="/admin/promotions">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">
              Khuyến mãi
            </button>
          </Link>
          <Link to="/admin/inventory">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">
              Tồn kho
            </button>
          </Link>
        </aside>

        <main className="flex-1 bg-gray-100 p-4 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
