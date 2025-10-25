import React, { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { getActiveBrands, getActiveCategories, getHomeProduct } from "../apis/productApi";
import Popup from "../components/Popup";
import ProductCard from "../components/ProductCard";
import { Link, useNavigate } from "react-router-dom";

export default function HomePage() {
  const [newProducts, setNewProducts] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [discountProducts, setDiscountProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeTab, setActiveTab] = useState("new");
  const [popup, setPopup] = useState({ message: "" });
  const carouselRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    handleLoadProducts();
    handleLoadCategories();
    handleBrands();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => nextItem(), 3000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleLoadProducts = async () => {
    const res = await getHomeProduct(8, 8, 8, 8);
    if (res.error) {
      console.error(res.error);
      setNewProducts([]);
      setHotProducts([]);
      setFeaturedProducts([]);
      setDiscountProducts([]);
      return;
    }
    
    setNewProducts(res.data.newProducts);
    setHotProducts(res.data.hotProducts);
    setFeaturedProducts(res.data.featuredProducts);
    setDiscountProducts(res.data.discountProducts);
  };

  const handleLoadCategories = async () => {
    const res = await getActiveCategories();
    if (res.error) {
      console.error(res.error);
      setCategories([]);
      return;
    }
    setCategories(res.data.content);
  };

  const handleBrands = async () => {
    const res = await getActiveBrands(0, 10);
    if (res.error) {
      console.error(res.error);
      setBrands([]);
      return;
    }
    setBrands(res.data.content);
  };

  const nextItem = () => {
    const container = carouselRef.current;
    if (!container) return;
    const itemWidth = container.firstChild.offsetWidth;
    let newIndex = currentIndex + 1;
    if (newIndex >= categories.length) newIndex = 0;
    container.scrollTo({ left: itemWidth * newIndex, behavior: "smooth" });
    setCurrentIndex(newIndex);
  };

  const prevItem = () => {
    const container = carouselRef.current;
    if (!container) return;
    const itemWidth = container.firstChild.offsetWidth;
    let newIndex = currentIndex - 1;
    if (newIndex < 0) newIndex = categories.length - 1;
    container.scrollTo({ left: itemWidth * newIndex, behavior: "smooth" });
    setCurrentIndex(newIndex);
  };


  return (
    <div className="">
      {/* Categories */}
      <div className="bg-gray-100 px-40 py-5">
        <div className="flex justify-between items-center mb-4 rounded">
          <h2 className="text-xl font-semibold">Tìm theo danh mục</h2>
          <div className="flex gap-2">
            <FiChevronLeft
              className="text-2xl cursor-pointer hover:text-gray-600"
              onClick={prevItem}
            />
            <FiChevronRight
              className="text-2xl cursor-pointer hover:text-gray-600"
              onClick={nextItem}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center justify-center bg-gray-200 rounded p-4 sm:p-6 hover:bg-gray-300 transition"
            >
              <img
                src={cat.imageUrl}
                className="w-full aspect-square object-cover rounded mb-4"
                alt={cat.name}
              />
              <span className="text-gray-800 font-semibold text-center">{cat.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Tabs: New / Hot / Featured */}
      <div className="px-40 py-8">
        <div className="flex text-xl gap-6 mb-6 justify-center ">
          {["new", "hot", "featured"].map((tab) => (
            <h3
              key={tab}
              className={`font-semibold cursor-pointer ${activeTab === tab ? "text-gray-900" : "text-gray-400 hover:text-gray-900"
                }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "new"
                ? "Sản phẩm mới"
                : tab === "hot"
                  ? "Mua nhiều nhất"
                  : "Nổi bật"}
            </h3>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-5">
          {(activeTab === "new"
            ? newProducts
            : activeTab === "hot"
              ? hotProducts
              : featuredProducts
          ).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </div>

      {/* Brands Carousel */}
      <div className="relative bg-gray-100 group mt-8">
        <div ref={carouselRef} className="flex overflow-x-hidden scroll-smooth gap-4 px-2">
          {brands.map((b) => (
            <div
              key={b.id}
              className="flex-shrink-0 flex flex-col justify-between bg-gray-100 rounded p-4 hover:bg-gray-200 transition w-60"
            >
              <img src={b.imageUrl} alt={b.name} className="w-full h-40 object-cover rounded mb-4" />
              <span className="text-gray-800 font-bold text-lg mb-2">{b.name}</span>
              <span className="text-gray-600 text-sm mb-4 line-clamp-3">{b.description}</span>
              <Link
                to={`/brand/${b.slug}`}
                className="text-sm text-black border border-black px-6 py-2 mb-3 rounded hover:bg-black hover:text-white transition w-max"
              >
                Mua ngay
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Discount Products */}
      <div className="px-40 py-8">
        <h2 className="text-xl font-semibold mb-4">Khuyến mãi</h2>
        <div className="grid grid-cols-6 gap-6">
          {discountProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </div>

      <Popup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "" })}
        duration={3000}
      />
    </div>
  );
}
