import { useRef, useEffect, useContext, useState } from "react";
import { Link, useNavigate, useLocation, NavLink } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { CartContext } from "../../contexts/CartContext";
import { FaSearch, FaShoppingCart, FaUserCircle, FaSignOutAlt, FaTimes } from "react-icons/fa";
import { FiCreditCard } from "react-icons/fi";
import { getActiveProducts } from "../../apis/productApi";

export default function Layout({ children }) {
  const { username, role } = useContext(AuthContext);
  const { cart, updateCart, removeFromCart } = useContext(CartContext);
  // console.log(cart)
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isCheckoutPage = location.pathname === "/checkout";
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState(null);

  const toggleCart = () => !isCheckoutPage && setCartOpen(!cartOpen);
  const handleLogout = () => navigate("/logout", { replace: true });

  const [selectedItems, setSelectedItems] = useState(() => {
    const saved = localStorage.getItem("selectedItems");
    return saved ? JSON.parse(saved) : [];
  });

  const navItems = [
    { name: "Trang chủ", pathname: "/", search: "" },
    { name: "Đang giảm giá", pathname: "/search", search: "?discount=true" },
    { name: "Mua nhiều", pathname: "/search", search: "?sort=sold" },
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

  const handleLoadingProducts = async (text) => {
    setLoading(true);
    try {
      const response = await getActiveProducts(0, 5, text)
      if (response.error) return;
      setProducts(response.data.content);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  return (
    <div className=" bg-white">
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-300">
        <div className="max-w-8xl mx-auto px-40 py-3 flex items-center justify-between">
          <Link to="/" className="text-3xl font-bold text-black">Elec</Link>
          <div className="flex-1 max-w-80 mx-4 relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                handleLoadingProducts(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-3 py-2 rounded-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-700 transition"
            />
            <FaSearch
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black hover:cursor-pointer"
              onClick={handleSearch}
            />

            {/* Search Results Dropdown */}
            {keyword.trim() && products && products.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-[32rem] overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs text-gray-500 px-2 py-1">
                    {products.length} kết quả
                  </p>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        navigate(`/product/${product.slug}`);
                        setKeyword("");
                        setProducts(null);
                      }}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                    >
                      <img
                        src={product.imageUrls?.main}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2 leading-tight text-gray-900">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-semibold text-gray-900">
                            {product.minPrice.toLocaleString("vi-VN")}₫
                          </span>
                          {product.discountPercent > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                              -{product.discountPercent}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {products.length >= 5 && (
                  <div className="border-t border-gray-200 p-2">
                    <button
                      onClick={handleSearch}
                      className="w-full py-2 text-sm text-gray-700 hover:text-black font-medium hover:bg-gray-50 rounded transition"
                    >
                      Xem tất cả kết quả
                    </button>
                  </div>
                )}
              </div>
            )}

            {keyword.trim() && loading && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                </div>
              </div>
            )}

            {/* No Results State */}
            {keyword.trim() && !loading && products && products.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
                <p className="text-sm text-gray-500 text-center">Không tìm thấy sản phẩm</p>
              </div>
            )}
          </div>

          <nav className="hidden md:flex space-x-10">
            {navItems.map((item) => {
              const matchPath = location.pathname === item.pathname;
              const matchSearch = location.search === item.search;
              const isActive = matchPath && matchSearch;

              return (
                <NavLink
                  key={item.name}
                  to={{ pathname: item.pathname, search: item.search }}
                  className={isActive
                    ? "text-gray-800 font-bold"
                    : "text-gray-500 hover:text-black hover:font-bold transition"
                  }
                >
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            {!!username ? (
              <>
                <div className="relative" ref={cartRef}>
                  <button
                    disabled={isCheckoutPage}
                    onClick={toggleCart}
                    className={`bg-gray-100 relative p-2 rounded-full hover:bg-gray-200 transition ${isCheckoutPage ? "opacity-50 cursor-not-allowed" : "hover:cursor-pointer"}`}                  >
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

                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      if (role !== "CUSTOMER")
                        navigate(`/admin/orders`)
                      else
                        navigate(`/customer`)
                    }}
                    className="cursor-pointer group relative flex items-center gap-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 "
                  >

                    <span className="text-gray-800 max-w-[120px] truncate">{username}</span>

                    <FaUserCircle className="text-gray-700 text-2xl" />

                    {username?.length > 12 && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap 
                      bg-black text-white text-sm px-2 py-1 rounded shadow-lg opacity-0 
                      group-hover:opacity-100 transition-opacity z-50 pointer-events-none"
                      >
                        {username}
                      </div>
                    )}
                  </button>


                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full bg-gray-100 hover:bg-red-200 hover:cursor-pointer transition text-red-500"
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
