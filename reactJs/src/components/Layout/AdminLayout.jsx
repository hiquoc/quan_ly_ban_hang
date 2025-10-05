import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";

export default function AdminLayout({ children }) {
  const { username, setUsername, role, setRole } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleLogout() {
    navigate("/logout", { replace: true });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-red-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left: Logo */}
          <Link
            to="/admin"
            className="text-2xl font-bold hover:text-red-200 transition"
          >
            Home
          </Link>

          {/* Right: User */}
          <div className="flex items-center space-x-2">
            {!!username ? (
              <>
                <Link
                  to="/admin/product"
                  className="px-3 py-2 rounded bg-white/20 hover:bg-white/40 text-white transition flex items-center justify-center"
                >
                  {username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded bg-white/20 hover:bg-white/40 text-white transition flex items-center justify-center"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="px-3 py-2 rounded bg-white/20 hover:bg-white/40 text-white transition flex items-center justify-center"
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
