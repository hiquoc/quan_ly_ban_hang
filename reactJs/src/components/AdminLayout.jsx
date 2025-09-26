import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function AdminLayout({ children }) {
  const { username, setUsername, role, setRole } = useContext(AuthContext);

  function handleLogout() {
    localStorage.removeItem("token");
    setUsername(null);
    setRole(null);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar trên cùng */}
      <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <Link to="/" className="text-xl font-bold pl-5">Home</Link>
        <div className="flex space-x-4">
          {!!username ? (
            <>
              <Link to="/admin/user" className="hover:bg-blue-700 px-3 py-1 rounded transition">{username}</Link>
              {role === "ADMIN" && (
                <Link to="/admin/register" className="hover:bg-blue-700 px-3 py-1 rounded transition">Đăng kí</Link>
              )}
              <button onClick={handleLogout} className="hover:bg-blue-700 px-3 py-1 rounded transition">Đăng xuất</button>
            </>
          ) : (
            <Link to="/admin/login" className="hover:bg-blue-700 px-3 py-1 rounded transition">Đăng nhập</Link>
          )}
        </div>
      </nav>

      {/* Container chính: Sidebar bên trái, content bên phải */}
      <div className="flex flex-1">
        <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 space-y-2">
          <Link to="/admin/orders">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">Đơn hàng</button>
          </Link>
          <Link to="/admin/accounts">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">Tài khoản</button>
          </Link>
          <Link to="/admin/products">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">Sản phẩm</button>
          </Link>
          <Link to="/admin/revenue">
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition">Doanh thu</button>
          </Link>
        </aside>

        <main className="flex-1 bg-gray-100 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
