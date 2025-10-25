import { useRef, useEffect, useContext, useState } from "react";
import { Link, useNavigate, useLocation, NavLink } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { CartContext } from "../../contexts/CartContext";
import { FaSearch, FaShoppingCart, FaUserCircle, FaSignOutAlt, FaTimes } from "react-icons/fa";
import { FiCreditCard } from "react-icons/fi";

export default function Layout({ children }) {
  const { username } = useContext(AuthContext);
  const { cart, updateCart, removeFromCart } = useContext(CartContext);
  // console.log(cart)
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isCheckoutPage = location.pathname === "/checkout";
  const [keyword, setKeyword] = useState("");

  const toggleCart = () => !isCheckoutPage && setCartOpen(!cartOpen);
  const handleLogout = () => navigate("/logout", { replace: true });

  const [selectedItems, setSelectedItems] = useState(() => {
    const saved = localStorage.getItem("selectedItems");
    return saved ? JSON.parse(saved) : [];
  });

  const navItems = [
    { name: "Trang chủ", path: "/" },
    { name: "Đang giảm giá", path: "/sale" },
    { name: "Mua nhiều", path: "/popular" },
    { name: "Danh mục", path: "/categories" },
  ];
  useEffect(() => {
    localStorage.setItem("selectedItems", JSON.stringify(selectedItems));
  }, [selectedItems]);

  const toggleSelect = (variantId) => {
    setSelectedItems(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        setCartOpen(false);
      }
    };
    if (cartOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cartOpen]);

  const handleSearch = () => {
    if (keyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  return (
    <div className="h-screen bg-white">
      <nav className="bg-white border border-gray-300 border-b sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-40 py-3 flex items-center justify-between">
          <Link to="/" className="text-3xl font-bold text-black">Elec</Link>
          <div className="flex-1 max-w-80 mx-4 relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-3 py-2 rounded-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-700 transition"
            />
            <FaSearch
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black hover:cursor-pointer"
              onClick={handleSearch}
            />
          </div>

          <nav className="hidden md:flex space-x-10">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"} // Only exact match for home
                className={({ isActive }) =>
                  isActive
                    ? "text-gray-800 font-bold"
                    : "text-gray-500 hover:text-black hover:font-bold transition"
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {!!username ? (
              <>
                <div className="relative" ref={cartRef}>
                  <button
                    disabled={isCheckoutPage}
                    onClick={toggleCart}
                    className={`relative p-2 rounded-full hover:bg-gray-200 transition ${isCheckoutPage ? "opacity-50 cursor-not-allowed" : "hover:cursor-pointer"}`}                  >
                    <FaShoppingCart className="text-gray-700 text-lg" />
                    {cart?.totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1">
                        {cart.totalItems}
                      </span>
                    )}
                  </button>

                  {cartOpen && (
                    <div className="absolute right-0 mt-2 w-[28rem] bg-white border border-gray-300 rounded-lg shadow-lg z-50 flex flex-col max-h-[80vh]">
                      <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
                        <h3 className="text-lg font-medium">Giỏ hàng</h3>
                      </div>
                      <div className="max-h-70 overflow-y-auto scroll-smooth flex-1">
                        {cart.items.length === 0 ? (
                          <p className="text-gray-500 text-sm p-4">Giỏ hàng trống</p>
                        ) : (
                          cart.items.map((item) => (
                            <div
                              key={item.id}
                              className="px-3 relative"
                            >
                              <div className={`flex py-3 border-b border-gray-300 px-2 relative ${(item.status !== "OUT_OF_STOCK" ? "" : "bg-gray-100")}`}>
                                <input
                                  type="checkbox"
                                  checked={item.status === "OUT_OF_STOCK" ? false : selectedItems.includes(item.variantId)}
                                  onChange={() => toggleSelect(item.variantId)}
                                  disabled={item.status === "OUT_OF_STOCK"}
                                  className={`w-4 h-4 mr-3 mt-7 accent-black ${(item.status !== "OUT_OF_STOCK" ? "hover:cursor-pointer" : "cursor-not-allowed")} `}
                                />
                                <div className="relative w-20 h-20 mr-4">
                                  <img
                                    src={item.imageUrls?.main}
                                    alt={item.variantName}
                                    className="w-20 h-20 object-cover rounded hover:cursor-pointer"
                                    onClick={() => navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)}
                                  />
                                  {item.status === "OUT_OF_STOCK" && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold rounded">
                                      Hết hàng
                                    </span>
                                  )}
                                </div>

                                <div className="flex-1 flex flex-col relative">
                                  <div className="min-h-[2.5rem] flex items-center pr-5">
                                    <p
                                      onClick={() => navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)}
                                      className="font-medium line-clamp-2 leading-tight hover:cursor-pointer"
                                    >
                                      {item.variantName}
                                    </p>
                                  </div>
                                  <div className="flex justify-between items-center absolute bottom-1 w-full">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => updateCart(item.id, item.quantity - 1)}
                                        disabled={item.status === "OUT_OF_STOCK"}
                                        className={`p-1 hover:cursor-pointer" ${(item.status !== "OUT_OF_STOCK" ? "hover:cursor-pointer" : "cursor-not-allowed")}`}
                                      >
                                        -
                                      </button>
                                      <span className="w-8 h-8 border border-gray-200 flex items-center justify-center rounded">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateCart(item.id, item.quantity + 1)}
                                        disabled={item.status === "OUT_OF_STOCK"}
                                        className={`p-1 hover:cursor-pointer" ${(item.status !== "OUT_OF_STOCK" ? "hover:cursor-pointer" : "cursor-not-allowed")}`}
                                      >
                                        +
                                      </button>
                                    </div>

                                    <p className="font-medium text-gray-700">
                                      {item.totalPrice.toLocaleString("vi-VN")}₫
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => removeFromCart(item.variantId)}
                                  className={`absolute top-2 right-2 hover:cursor-pointer text-gray-500 hover:text-gray-700" 
                                    }`}

                                >
                                  <FaTimes />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {cart.items.length > 0 && (
                        <div className="p-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-lg font-semibold">Tạm tính:</span>
                            <span className="text-xl font-semibold">
                              {cart.items
                                .filter(item => selectedItems.includes(item.variantId))
                                .reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                          <Link
                            to={selectedItems.length > 0 ? "/checkout" : "#"}
                            onClick={() => {
                              if (selectedItems.length > 0) setCartOpen(false);
                            }}
                            className={`mt-3 flex-1 px-10 py-4 rounded-lg text-lg font-medium shadow flex items-center justify-center gap-2 transition
                              ${selectedItems.length > 0
                                ? "bg-black text-white hover:bg-gray-900 cursor-pointer"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"}`
                            }
                          >
                            <FiCreditCard className="text-xl" />
                            Thanh toán
                          </Link>

                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => navigate(`/customer`)}
                    className="flex gap-2 px-3 py-2 rounded-full text-gray-800 hover:bg-gray-200 hover:cursor-pointer font-medium">
                    {username} <FaUserCircle className="text-gray-700 text-2xl" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 hover:cursor-pointer transition text-red-500"
                  >
                    <FaSignOutAlt />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="py-2 px-4 rounded-full bg-gray-200 hover:bg-gray-300 transition flex gap-2"
              >
                Đăng nhập
                <FaUserCircle className="text-gray-700 text-2xl" />
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
