import React, { act, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiShoppingBag, FiTruck, FiShield, FiCreditCard } from "react-icons/fi";
import { getActiveBrands, getActiveCategories, getActiveProducts, getHomeProducts, getRecommendedProducts } from "../apis/productApi";
import Popup from "../components/Popup";
import ProductCard from "../components/ProductCard";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AuthContext } from "../contexts/AuthContext";

export default function HomePage() {
  const { ownerId } = useContext(AuthContext);
  const [newProducts, setNewProducts] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [discountProducts, setDiscountProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const discountRef = useRef(null);
  const recommendRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeTab, setActiveTab] = useState("new");
  const [popup, setPopup] = useState({ message: "" });
  const categoriesRef = useRef(null);
  const brandsRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const navigate = useNavigate();
  const emptyRange = useMemo(() => [], []);

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const [canScrollDiscountLeft, setCanScrollDiscountLeft] = useState(false);
  const [canScrollDiscountRight, setCanScrollDiscountRight] = useState(true);

  const [canScrollRecommendLeft, setCanScrollRecommendLeft] = useState(false);
  const [canScrollRecommendRight, setCanScrollRecommendRight] = useState(true);

  const [canScrollBrandLeft, setCanScrollBrandLeft] = useState(false);
  const [canScrollBrandRight, setCanScrollBrandRight] = useState(true);

  const [canScrollCategoryLeft, setCanScrollCategoryLeft] = useState(false);
  const [canScrollCategoryRight, setCanScrollCategoryRight] = useState(true);

  const [heroSlides, setHeroSlides] = useState([
    {
      title: "iPhone 17 Pro Max",
      subtitle: "Trải nghiệm công nghệ đỉnh cao – Mua ngay hôm nay!",
      cta: "Mua ngay",
      imageUrl: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-pro-model-unselect-gallery-1-202509_FMT_WHH?wid=1280&hei=492&fmt=jpeg&qlt=90&.v=1757696065603",
      link: "/product/iphone-17-pro-max?sku=iphone-17-pro-max-cam-256gb"
    },
    {
      title: "PlayStation 5",
      subtitle: "Giải trí không giới hạn cùng gia đình",
      cta: "Mua ngay",
      imageUrl: "https://i.ytimg.com/vi/1BU4VXofbQk/maxresdefault.jpg",
      link: "/product/playstation-5?sku=playstation-5"
    },
    {
      title: "Samsung Galaxy S25 Ultra",
      subtitle: "Hiệu năng mạnh mẽ – Giá trị vượt trội",
      cta: "Xem thêm",
      imageUrl: "https://media.vietnamplus.vn/images/7c9de47923aa66aa3d70a2b6ee174cec84805872a0d596f69af26df51fa3ba96412351bb99fc88a0d50181b29f4e3bac23c824218db520a9ae8e9975906456124f9efb0c8972265f49d8f86164867992/samsung-galaxy-s25-ultra-1024x576-1.jpg"
    }
  ]);


  useEffect(() => {
    handleLoadHomeProducts();
    handleLoadRecommendedProducts();
    handleLoadCategories();
    handleBrands();
  }, []);


  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroInterval);
  }, []);

  const handleLoadHomeProducts = async () => {
    setIsLoadingProducts(true);
    const res = await getHomeProducts(12, 12);
    if (res.error) {
      console.error(res.error);
      setPopup({ message: res.error })
      setNewProducts([]);
      setDiscountProducts([]);
      setIsLoadingProducts(false);
      return;
    }
    setNewProducts(res.data.newProducts);
    setDiscountProducts(res.data.discountProducts);
    setIsLoadingProducts(false);
  };
  const handleLoadRecommendedProducts = async () => {
    setIsLoadingRecommended(true);
    const res = await getRecommendedProducts(ownerId != null ? ownerId : undefined);
    if (res.error) {
      console.error(res.error);
      setRecommendedProducts([]);
      setIsLoadingRecommended(false);
      return;
    }
    setRecommendedProducts(res.data);
    // setRecommendedProducts(Array(5).fill(res.data).flat());
    setIsLoadingRecommended(false);
  }
  const handleLoadHotProducts = async () => {
    if (hotProducts.length > 0)
      return;
    setIsLoadingProducts(true);
    const res = await getActiveProducts(0, 12, null, null, null, null, true, "sold", null, null, null, null);
    if (res.error) {
      console.error(res.error);
      setPopup({ message: res.error })
      setHotProducts([]);
      setIsLoadingProducts(false);
      return;
    }
    setHotProducts(res.data.content);
    setIsLoadingProducts(false);
  };
  const handleLoadFeaturedProducts = async () => {
    if (featuredProducts.length > 0)
      return;
    setIsLoadingProducts(true);
    const res = await getActiveProducts(0, 12, null, null, null, true, true, null, null, null, null, null);
    if (res.error) {
      console.error(res.error);
      setPopup({ message: res.error })
      setFeaturedProducts([]);
      setIsLoadingProducts(false);
      return;
    }
    setFeaturedProducts(res.data.content);
    setIsLoadingProducts(false);
  };

  const handleLoadCategories = async () => {
    setIsLoadingCategories(true);
    const res = await getActiveCategories();
    if (res.error) {
      console.error(res.error);
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }
    // console.log(res.data)
    setCategories(res.data.content);
    setIsLoadingCategories(false);
    // setCategories(Array(5).fill(res.data.content).flat());
  };

  const handleBrands = async () => {
    setIsLoadingBrands(true);
    const res = await getActiveBrands(0, 10, undefined, true);
    if (res.error) {
      console.error(res.error);
      setBrands([]);
      setIsLoadingBrands(false);
      return;
    }
    setIsLoadingBrands(false);
    setBrands(res.data.content);
    // setBrands(Array(5).fill(res.data.content).flat());

  };
  const scrollNextDiscount = () => {
    const container = discountRef.current;
    if (!container) return;
    container.scrollBy({ left: container.firstChild.offsetWidth + 26, behavior: "smooth" });
  };
  const scrollPrevDiscount = () => {
    const container = discountRef.current;
    if (!container) return;
    container.scrollBy({ left: -container.firstChild.offsetWidth - 26, behavior: "smooth" });
  };
  const scrollNextRecommend = () => {
    const container = recommendRef.current;
    if (!container) return;
    container.scrollBy({ left: container.firstChild.offsetWidth + 26, behavior: "smooth" });
  };
  const scrollPrevRecommend = () => {
    const container = recommendRef.current;
    if (!container) return;
    container.scrollBy({ left: -container.firstChild.offsetWidth - 26, behavior: "smooth" });
  };

  const scrollNextCategories = () => {
    const container = categoriesRef.current;
    if (!container) return;
    container.scrollBy({ left: container.firstChild.offsetWidth + 30, behavior: "smooth" });
  };
  const scrollPrevCategories = () => {
    const container = categoriesRef.current;
    if (!container) return;
    container.scrollBy({ left: -container.firstChild.offsetWidth - 30, behavior: "smooth" });
  };
  const scrollNextBrands = () => {
    const container = brandsRef.current;
    if (!container) return;
    container.scrollBy({ left: container.firstChild.offsetWidth + 26, behavior: "smooth" });
  };
  const scrollPrevBrands = () => {
    const container = brandsRef.current;
    if (!container) return;
    container.scrollBy({ left: -(container.firstChild.offsetWidth + 26), behavior: "smooth" });
  };
  useEffect(() => {
    const refs = [categoriesRef, brandsRef, discountRef, recommendRef];

    const handleScroll = (container, setLeft, setRight) => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setLeft(scrollLeft > 0);
      setRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    const scrollHandlers = refs.map((ref) => {
      const container = ref.current;
      if (!container) return null;

      const listener = () => {
        if (ref === discountRef) {
          handleScroll(container, setCanScrollDiscountLeft, setCanScrollDiscountRight);
        }
        else if (ref === recommendRef) {
          handleScroll(container, setCanScrollRecommendLeft, setCanScrollRecommendRight);
        }
        else if (ref === categoriesRef) {
          handleScroll(container, setCanScrollCategoryLeft, setCanScrollCategoryRight);
        } else {
          handleScroll(container, setCanScrollBrandLeft, setCanScrollBrandRight);
        }
      };

      const timeout = setTimeout(listener, 100);

      container.addEventListener("scroll", listener);
      window.addEventListener("resize", listener);

      return { container, listener, timeout };
    });

    return () => {
      scrollHandlers.forEach((h) => {
        if (!h) return;
        h.container.removeEventListener("scroll", h.listener);
        window.removeEventListener("resize", h.listener);
        clearTimeout(h.timeout);
      });
    };
  }, [categories, brands, discountProducts]);

  return (
    <>
      <Helmet>
        <title>Trang chủ</title>
      </Helmet>
      <div className="min-h-screen bg-white">
        {/* Hero Banner with Auto-Sliding */}
        <div className="relative h-[500px] w-full flex items-center justify-center bg-gradient-to-r from-gray-500 via-gray-400 to-gray-300 overflow-hidden">
          {heroSlides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === heroIndex ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-contain"
              />

              {/* Optional overlay for text */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="text-center px-4 text-white">
                  <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
                  <p className="text-2xl mb-8">{slide.subtitle}</p>
                  <button
                    onClick={() => navigate(slide.link)}
                    className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition transform hover:scale-105 shadow-lg">
                    {slide.cta}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Hero Navigation Dots */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroIndex(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${idx === heroIndex ? "bg-white w-8" : "bg-white/50 w-3"}`}
              />
            ))}
          </div>
        </div>

        {/* Features Bar */}
        <div className="bg-white border-y border-gray-200">
          <div className="px-60 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FiTruck className="text-2xl text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Giao hàng nhanh</h4>
                  <p className="text-sm text-gray-600">Miễn phí từ 500k</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <FiShield className="text-2xl text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Thanh toán an toàn</h4>
                  <p className="text-sm text-gray-600">Bảo mật 100%</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <FiCreditCard className="text-2xl text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Đa dạng thanh toán</h4>
                  <p className="text-sm text-gray-600">ATM, COD, VNPAY</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <FiShoppingBag className="text-2xl text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Đổi trả dễ dàng</h4>
                  <p className="text-sm text-gray-600">Trong vòng 30 ngày</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="w-full bg-gray-50">
          <div className="px-40 py-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Danh mục sản phẩm</h2>
                <p className="text-gray-600 mt-2">Khám phá các danh mục phổ biến</p>
              </div>
              <div className="flex gap-2">
                {canScrollCategoryLeft && (
                  <button
                    onClick={scrollPrevCategories}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition transform hover:scale-110"
                  >
                    <FiChevronLeft className="text-xl" />
                  </button>
                )}
                {canScrollCategoryRight && (
                  <button
                    onClick={scrollNextCategories}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition transform hover:scale-110"
                  >
                    <FiChevronRight className="text-xl" />
                  </button>
                )}
              </div>
            </div>
            {isLoadingCategories ? (
              <div className="w-full flex justify-center items-center py-12"
                style={{ height: "420px" }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={categoriesRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
                >
                  {categories && categories.map((cat, idx) => (
                    <a
                      key={`category-${cat.id}-${idx}`}
                      href={`search?categories=${cat.slug}`}
                      className="group py-4"
                    >
                      <div className="bg-white rounded-2xl p-4 transition transform hover:scale-105 hover:shadow-xl group flex-shrink-0 w-35">
                        <div className="overflow-hidden rounded-xl mb-4">
                          <img
                            src={cat.imageUrl}
                            className="w-full aspect-square object-cover transform transition-transform duration-300 group-hover:scale-110"
                            alt={cat.name}
                          />
                        </div>
                        <span className="text-gray-800 text-sm font-semibold text-center block group-hover:text-blue-600 transition">
                          {cat.name}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>


        {/* Discount Products */}
        <div className="px-40 pt-12 pb-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Khuyến mãi hot 🔥</h2>
              <p className="text-gray-600 mt-2">Săn sale ngay kẻo lỡ</p>
            </div>
            <Link
              to="/search?discount=true"
              className="text-blue-600 font-semibold hover:text-blue-700 transition flex items-center gap-2 group"
            >
              Xem tất cả
              <FiChevronRight className="transform group-hover:translate-x-1 transition" />
            </Link>
          </div>
          <div className="relative">
            {canScrollDiscountLeft && (
              <button
                onClick={scrollPrevDiscount}
                className="absolute -left-15 top-40 -translate-y-1/2 z-20 p-3 bg-white rounded-full shadow hover:bg-gray-100 transition transform hover:scale-110"
              >
                <FiChevronLeft className="text-2xl text-gray-800" />
              </button>
            )}

            {canScrollDiscountRight && (
              <button
                onClick={scrollNextDiscount}
                className="absolute -right-15 top-40 -translate-y-1/2 z-20 p-3 bg-white rounded-full shadow hover:bg-gray-100 transition transform hover:scale-110"
              >
                <FiChevronRight className="text-2xl text-gray-800" />
              </button>
            )}
            {isLoadingProducts ? (
              <div className="col-span-full flex justify-center items-center py-12"
                style={{ height: "420px" }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              </div>
            ) : (
              <div
                ref={discountRef}
                className="flex overflow-x-auto scroll-smooth gap-6 scrollbar-hide"
              >
                {discountProducts && discountProducts.map((product, idx) => (
                  <div
                    key={`discount-${product.id}-${idx}`}
                    className="flex-shrink-0 pb-12 overflow-visible"
                    style={{
                      width: `calc((100% - 5 * 1.5rem) / 6)`
                    }}
                  >
                    <ProductCard
                      product={product}
                      preferDiscounted={true}
                      priceRange={emptyRange}
                    />
                  </div>
                ))}


              </div>
            )}
          </div>
        </div>

        {/* Recommended Products Section */}
        <div className="px-40 py-12 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Dành riêng cho bạn ✨</h2>
              <p className="text-gray-600 mt-2">Những sản phẩm phù hợp với sở thích của bạn</p>
            </div>
          </div>
          <div className="relative">
            {canScrollRecommendLeft && (
              <button
                onClick={scrollPrevRecommend}
                className="absolute -left-15 top-40 -translate-y-1/2 z-20 p-3 bg-white rounded-full shadow hover:bg-gray-100 transition transform hover:scale-110"
              >
                <FiChevronLeft className="text-2xl text-gray-800" />
              </button>
            )}

            {canScrollRecommendRight && (
              <button
                onClick={scrollNextRecommend}
                className="absolute -right-15 top-40 -translate-y-1/2 z-20 p-3 bg-white rounded-full shadow hover:bg-gray-100 transition transform hover:scale-110"
              >
                <FiChevronRight className="text-2xl text-gray-800" />
              </button>
            )}
            {isLoadingRecommended ? (
              <div className="col-span-full flex justify-center items-center py-12"
                style={{ height: "420px" }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              </div>
            ) : (
              <div
                ref={recommendRef}
                className="flex overflow-x-auto scroll-smooth gap-6 scrollbar-hide"
              >
                {recommendedProducts && recommendedProducts.map((product, idx) => (
                  <div
                    key={`recommended-${product.id}-${idx}`}
                    className="flex-shrink-0 pb-12 overflow-visible"
                    style={{
                      width: `calc((100% - 5 * 1.5rem) / 6)`
                    }}
                  >
                    <ProductCard
                      product={product}
                      preferDiscounted={true}
                      priceRange={emptyRange}
                    />
                  </div>
                ))}


              </div>
            )}
          </div>
        </div>

        {/* Mid Promotional Banner */}
        <div className="relative h-80 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 flex items-center">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 flex items-center">

              {/* Image on top of gradient */}
              <img
                className="absolute right-100 max-h-full"
                src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1762272034/illustration-beautiful-woman-shopping_149195-343_y5igck.png"
                alt="shopping"
              />
            </div>
            <div className="relative px-60 w-full">
              <div className="max-w-xl">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Mua sắm thông minh hơn
                </h2>
                <p className="text-xl text-blue-100 mb-6">
                  Nhận ngay voucher 200k cho đơn hàng đầu tiên
                </p>
                <button className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition transform hover:scale-105 shadow-xl">
                  Đặt hàng ngay thôi
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Product Tabs Section */}
        <div className="px-40 py-10">
          <div className="flex justify-between items-center">
            <div className="flex gap-8 mb-8 border-b border-gray-200">
              {["new", "hot", "featured"].map((tab) => (
                <button
                  key={tab}
                  className={`pb-4 text-lg font-semibold transition relative ${activeTab === tab
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-900"
                    }`}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "hot")
                      handleLoadHotProducts();
                    else if (tab === "featured")
                      handleLoadFeaturedProducts();
                  }}
                >
                  {tab === "new"
                    ? "Sản phẩm mới"
                    : tab === "hot"
                      ? "Bán chạy nhất"
                      : "Nổi bật"}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t" />
                  )}
                </button>
              ))}
            </div>
            {activeTab !== "featured" && (
              <Link
                to={activeTab === "new" ? "/search?" : activeTab === "hot" ? "/search?sort=sold" : "/search?featured=true"}
                className="text-blue-600 mb-8 font-semibold hover:text-blue-700 transition flex items-center gap-2 group"
              >
                Xem tất cả
                <FiChevronRight className="transform group-hover:translate-x-1 transition" />
              </Link>
            )}

          </div>

          {isLoadingProducts ? (
            <div className="col-span-full flex justify-center items-center py-12"
              style={{ height: "420px" }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải...</p>
              </div>
            </div>
          ) : (<div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {(activeTab === "new"
              ? newProducts
              : activeTab === "hot"
                ? hotProducts
                : featuredProducts
            ).map((product, idx) => (
              <ProductCard
                key={`tab-${product.id}-${idx}`}
                product={product}
                priceRange={emptyRange}
              />
            ))}
          </div>
          )}

        </div>

        {/* Brands Showcase */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 pt-12">
          <div className="px-40">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Thương hiệu nổi bật</h2>
              <p className="text-gray-600">Những thương hiệu hàng đầu được yêu thích nhất</p>
            </div>

            <div className="relative">
              {canScrollBrandLeft && (
                <button
                  onClick={scrollPrevBrands}
                  className="absolute -left-15 top-1/2 -translate-y-1/2 z-20 p-3 bg-white rounded-full shadow hover:bg-gray-100 transition transform hover:scale-110"
                >
                  <FiChevronLeft className="text-2xl text-gray-800" />
                </button>
              )}

              {canScrollBrandRight && (
                <button
                  onClick={scrollNextBrands}
                  className="absolute -right-15 top-1/2 -translate-y-1/2 z-20 p-3 bg-white rounded-full shadow hover:bg-gray-100 transition transform hover:scale-110"
                >
                  <FiChevronRight className="text-2xl text-gray-800" />
                </button>
              )}

              {isLoadingBrands ? (
                <div className="w-full flex justify-center items-center py-12"
                  style={{ height: "420px" }}>
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải...</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={brandsRef}
                  className="flex overflow-x-auto scroll-smooth gap-3 py-12 scrollbar-hide"
                >
                  {brands && brands.map((b) => (
                    <div
                      key={b.id}
                      className="py-3 flex-shrink-0 w-72 bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
                    >
                      <div className="h-48 w-full flex justify-center items-center overflow-hidden bg-white">
                        <img
                          src={b.imageUrl}
                          alt={b.name}
                          className="h-full w-auto max-w-full object-cover scale-75 transform transition-transform duration-500 hover:scale-90"
                        />
                      </div>
                      <div className="p-6 -mt-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{b.name}</h3>
                        <p className="text-gray-600 text-sm mb-6 line-clamp-4">{b.description}</p>
                        <Link
                          to={`search?brands=${b.slug}`}
                          className="text-center border border-gray-400 px-6 py-3 mt-5 rounded font-semibold transition transform hover:bg-gray-200 "
                        >
                          Xem sản phẩm
                        </Link>
                      </div>
                    </div>
                  ))}

                </div>
              )}

            </div>
          </div>
        </div>

        {/* Decorative Footer */}
        <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-12">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Cửa hàng Elec</h2>
            <p className="text-gray-400 text-sm">
              Mang đến trải nghiệm mua sắm tốt nhất
            </p>
            <p className="text-gray-500 text-xs mt-4">
              © 2025 Elec. Bản quyền thuộc về Elec.
            </p>
          </div>
        </div>


        <Popup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ message: "", type: "" })}
          duration={3000}
        />
      </div>
    </>
  );
}