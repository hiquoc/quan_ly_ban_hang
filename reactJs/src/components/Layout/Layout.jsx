import { Link ,useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { FaShoppingCart, FaSearch } from "react-icons/fa";

export default function Layout({ children }) {
  const { username, setUsername, role, setRole } = useContext(AuthContext);
  const navigate=useNavigate();
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
            to="/"
            className="text-2xl font-bold hover:text-red-200 transition"
          >
            Home
          </Link>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-md mx-4">
            <div className="flex">
              <input
                type="text"
                placeholder="Search products..."
                className="flex-1 px-3 py-2 rounded-l bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white transition"
              />
              <button className="px-3 py-2 bg-white text-white rounded-r flex items-center justify-center transition">
                <FaSearch className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Right: User & Cart */}
          <div className="flex items-center space-x-2">
            {/* Cart button */}
            <button className="relative px-3 py-3 rounded bg-white/30 hover:bg-white/50 transition flex items-center justify-center">
              <FaShoppingCart className="text-white" />
              <span className="absolute -top-1 -right-1 text-xs bg-white text-red-600 rounded-full px-1">
                3
              </span>
            </button>

            {/* User buttons */}
            {!!username ? (
              <>
                <Link
                  to="/customer"
                  className="px-3 py-2 rounded bg-white/30 hover:bg-white/50 text-white transition flex items-center justify-center"
                >
                  {username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded bg-white/30 hover:bg-white/50 text-white transition flex items-center justify-center"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-3 py-2 rounded bg-white/30 hover:bg-white/50 text-white transition flex items-center justify-center"
                >
                  Đăng kí
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded bg-white/30 hover:bg-white/50 text-white transition flex items-center justify-center"
                >
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 w-full flex justify-center py-6">
        <div className="w-full max-w-7xl px-4">
          {children}
        </div>
      </main>
    </div>
  );
}
