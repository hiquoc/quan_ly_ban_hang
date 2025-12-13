import { useContext, useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveBrands, getActiveCategories, getActiveProducts } from "../../apis/productApi";
import { PopupContext } from "../../contexts/PopupContext";
import ProductCard from "../../components/ProductCard";
import { FiFilter } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Helmet } from "react-helmet-async";

export default function SearchPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const keyword = params.get("keyword") || "";
    const { showPopup } = useContext(PopupContext);

    // State
    const [products, setProducts] = useState(null);
    const [totalProducts, setTotalProducts] = useState(0);
    const [page, setPage] = useState(0);
    const [totalPage, setTotalPage] = useState(0);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false)
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [showCat, setShowCat] = useState(false);
    const [showBrand, setShowBrand] = useState(false);
    const [showPrice, setShowPrice] = useState(true);

    const [sort, setSort] = useState("");
    const [discountSort, setDiscountSort] = useState(false)
    const [selectedCats, setSelectedCats] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [priceRange, setPriceRange] = useState([null, null]);

    const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.slug, c.name])), [categories]);
    const brandMap = useMemo(() => Object.fromEntries(brands.map(b => [b.slug, b.name])), [brands]);

    const executeTimeoutRef = useRef(null);
    const lastRequestIdRef = useRef(0);

    // Load categories & brands once
    useEffect(() => {
        handleLoadCategories();
        handleLoadBrands();
    }, []);

    // Load products from URL params
    useEffect(() => {
        if (categories.length === 0 || brands.length === 0) return;
        const params = new URLSearchParams(location.search);
        const urlSort = params.get("sort") || "";
        const urlDiscount = params.get("discount") === "true";
        const urlCats = params.get("categories")?.split(",") || [];
        const urlBrands = params.get("brands")?.split(",") || [];
        const priceFrom = params.get("priceFrom") ? Number(params.get("priceFrom")) : null;
        const priceTo = params.get("priceTo") ? Number(params.get("priceTo")) : null;

        setSort(urlSort);
        setDiscountSort(urlDiscount);
        setSelectedCats(urlCats);
        setSelectedBrands(urlBrands);
        setPriceRange([priceFrom, priceTo]);
        handleLoadProducts(0, urlSort, urlDiscount, urlCats, urlBrands, [priceFrom, priceTo]);

    }, [location.search, categories, brands]);

    async function handleLoadProducts(
        newPage = 0,
        currentSort = sort,
        currentDiscount = discountSort,
        currentCatSlugs = selectedCats,
        currentBrandSlugs = selectedBrands,
        currentPrice = priceRange
    ) {
        const requestId = ++lastRequestIdRef.current;

        if (executeTimeoutRef.current) clearTimeout(executeTimeoutRef.current);

        executeTimeoutRef.current = setTimeout(() => {
            executeLoad(
                newPage,
                currentSort,
                currentDiscount,
                currentCatSlugs,
                currentBrandSlugs,
                currentPrice,
                requestId
            );
        }, 500);
    }

    async function executeLoad(
        newPage = 0,
        currentSort = sort,
        currentDiscount = discountSort, 
        currentCatSlugs = selectedCats,
        currentBrandSlugs = selectedBrands,
        currentPrice = priceRange,
        requestId
    ) {
        setIsLoadingProducts(true);
        const selectedCatNames = currentCatSlugs.map(slug => categoryMap[slug]).filter(Boolean);
        const selectedBrandNames = currentBrandSlugs.map(slug => brandMap[slug]).filter(Boolean);

        const res = await getActiveProducts(
            newPage,
            12,
            keyword,
            selectedCatNames,
            selectedBrandNames,
            null,
            currentSort === "priceHTL" ? true : currentSort === "priceLTH" ? false : true,
            currentSort === "priceHTL" ||currentSort === "priceLTH" ?  "price" : currentSort,
            currentDiscount,
            currentPrice[0] != null ? currentPrice[0] : undefined,
            currentPrice[1] != null ? currentPrice[1] : undefined
        );

        if (requestId !== lastRequestIdRef.current) return;

        setProducts(res.error ? [] : res.data.content);
        setTotalProducts(res.error ? 0 : res.data.totalElements);
        setTotalPage(res.error ? 0 : res.data.totalPages);
        setPage(newPage);
        setIsLoadingProducts(false);
    }

    // --- Load Categories & Brands ---
    async function handleLoadCategories() {
        const res = await getActiveCategories();
        if (res.error) return setCategories([]);
        setCategories(res.data.content);
    }

    async function handleLoadBrands() {
        const res = await getActiveBrands();
        if (res.error) return setBrands([]);
        setBrands(res.data.content);
    }

    // --- Update URL when checkboxes or sort change ---
    useEffect(() => {
        if (categories.length === 0 || brands.length === 0) return;
        const params = new URLSearchParams(location.search);

        if (selectedCats.length > 0) params.set("categories", selectedCats.join(","));
        else params.delete("categories");

        if (selectedBrands.length > 0) params.set("brands", selectedBrands.join(","));
        else params.delete("brands");

        if (sort) params.set("sort", sort);
        else params.delete("sort");

        if (discountSort) params.set("discount", discountSort);
        else params.delete("discount");

        const existingPriceFrom = new URLSearchParams(location.search).get("priceFrom");
        const existingPriceTo = new URLSearchParams(location.search).get("priceTo");
        if (existingPriceFrom) params.set("priceFrom", existingPriceFrom);
        if (existingPriceTo) params.set("priceTo", existingPriceTo);

        navigate(`/search?${params.toString()}`, { replace: true });
    }, [selectedCats, selectedBrands, sort, discountSort, navigate, categories, brands]);

    // --- Apply price filter button ---
    const applyPriceFilter = () => {
        const params = new URLSearchParams(location.search);

        if (priceRange[0] != null) params.set("priceFrom", priceRange[0]);
        else params.delete("priceFrom");

        if (priceRange[1] != null) params.set("priceTo", priceRange[1]);
        else params.delete("priceTo");

        navigate(`/search?${params.toString()}`, { replace: true });
    };

    const toggleCat = (slug) =>
        setSelectedCats((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]));

    const toggleBrand = (slug) =>
        setSelectedBrands((prev) => (prev.includes(slug) ? prev.filter((b) => b !== slug) : [...prev, slug]));

    // --- Pagination helper ---
    function getPageNumbers() {
        const pages = [];
        const maxVisible = 4;
        if (totalPage <= maxVisible + 2) {
            for (let i = 0; i < totalPage; i++) pages.push(i);
        } else {
            if (page <= 2) {
                pages.push(0, 1, 2, 3, "...", totalPage - 1);
            } else if (page >= totalPage - 3) {
                pages.push(0, "...", totalPage - 4, totalPage - 3, totalPage - 2, totalPage - 1);
            } else {
                pages.push(0, "...", page - 1, page, page + 1, "...", totalPage - 1);
            }
        }
        return pages;
    }

    return (
        <>
            <Helmet>
                <title>Tìm kiếm</title>
            </Helmet>
            <div className="pb-10">
                {/* Breadcrumb */}
                <div className="px-40 py-5 text-base text-gray-600 flex flex-wrap items-center gap-2">
                    <a href="/" className="hover:text-black hover:underline transition-colors">Trang chủ</a>
                    <span className="text-gray-400">›</span>
                    <a href="/search" className="hover:text-black hover:underline transition-colors">Tìm kiếm</a>
                    <span className="text-gray-400">›</span>
                    <span className="font-semibold text-gray-900">{keyword}</span>
                </div>


                <div className="flex px-40 pt-3 gap-15">
                    {/* Sidebar */}
                    <div className="w-80 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-20">
                            {/* Categories */}
                            <div className="mb-6">
                                <div
                                    onClick={() => setShowCat(!showCat)}
                                    className="flex justify-between items-center pb-3 border-b cursor-pointer group"
                                >
                                    <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <FiFilter className="text-lg" /> Danh mục
                                    </span>
                                    {showCat ?
                                        <FaChevronUp className="text-gray-400 group-hover:text-gray-600 transition" /> :
                                        <FaChevronDown className="text-gray-400 group-hover:text-gray-600 transition" />
                                    }
                                </div>
                                {showCat && (
                                    <div className="pt-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {categories.map((cat) => (
                                            <label key={cat.id} className="flex items-center gap-3 mb-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCats.includes(cat.slug)}
                                                    onChange={() => toggleCat(cat.slug)}
                                                    className="w-4 h-4 accent-black cursor-pointer rounded"
                                                />
                                                <span className="text-sm text-gray-700 group-hover:text-black transition-colors">
                                                    {cat.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Brands */}
                            <div className="mb-6">
                                <div
                                    onClick={() => setShowBrand(!showBrand)}
                                    className="flex justify-between items-center pb-3 border-b cursor-pointer group"
                                >
                                    <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <FiFilter className="text-lg" /> Thương hiệu
                                    </span>
                                    {showBrand ?
                                        <FaChevronUp className="text-gray-400 group-hover:text-gray-600 transition" /> :
                                        <FaChevronDown className="text-gray-400 group-hover:text-gray-600 transition" />
                                    }
                                </div>
                                {showBrand && (
                                    <div className="pt-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {brands.map((brand) => (
                                            <label key={brand.id} className="flex items-center gap-3 mb-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBrands.includes(brand.slug)}
                                                    onChange={() => toggleBrand(brand.slug)}
                                                    className="w-4 h-4 accent-black cursor-pointer rounded"
                                                />
                                                <span className="text-sm text-gray-700 group-hover:text-black transition-colors">
                                                    {brand.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Price */}
                            <div>
                                <div onClick={() => setShowPrice(!showPrice)}
                                    className="flex justify-between items-center pb-3 border-b cursor-pointer group"
                                >
                                    <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <FiFilter className="text-lg" /> Giá
                                    </span>
                                    {showPrice ?
                                        <FaChevronUp className="text-gray-400 group-hover:text-gray-600 transition" /> :
                                        <FaChevronDown className="text-gray-400 group-hover:text-gray-600 transition" />
                                    }
                                </div>
                                {showPrice && (
                                    <div className="pt-4 space-y-4">
                                        <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:border-red-400 hover:bg-red-50">
                                            <input
                                                type="checkbox"
                                                checked={discountSort}
                                                onChange={() => setDiscountSort(!discountSort)}
                                                className="w-4 h-4 accent-red-600 cursor-pointer rounded"
                                            />
                                            <span className="text-sm text-gray-800 font-semibold flex items-center gap-2">
                                                🏷️ Đang giảm giá
                                            </span>
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                placeholder="Từ"
                                                min={0}
                                                value={priceRange[0] ?? ""}
                                                onChange={(e) => {
                                                    const from = e.target.value ? Math.max(0, Number(e.target.value)) : null;
                                                    setPriceRange([from, priceRange[1]]);
                                                }}
                                                onBlur={(e) => {
                                                    const from = e.target.value ? Math.max(0, Number(e.target.value)) : null;
                                                    if (from !== null && priceRange[1] !== null && from > priceRange[1]) {
                                                        setPriceRange([priceRange[1], from]);
                                                    }
                                                }}
                                                className="w-full text-sm border border-gray-300 p-2.5 rounded-lg focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition"
                                            />
                                            <span className="text-gray-400 font-bold text-sm">-</span>
                                            <input
                                                type="number"
                                                placeholder="Đến"
                                                min={0}
                                                value={priceRange[1] ?? ""}
                                                onChange={(e) => {
                                                    const to = e.target.value ? Number(e.target.value) : null;
                                                    setPriceRange([priceRange[0], to]);
                                                }}
                                                onBlur={(e) => {
                                                    const to = e.target.value ? Number(e.target.value) : null;
                                                    if (to !== null && priceRange[0] !== null && to < priceRange[0]) {
                                                        setPriceRange([to, priceRange[0]]);
                                                    }
                                                }}
                                                className="w-full text-sm border border-gray-300 p-2.5 rounded-lg focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition"
                                            />
                                        </div>

                                        {(priceRange[0] !== null || priceRange[1] !== null) && (
                                            <div className="text-sm text-gray-700 text-center bg-gray-100 py-2.5 rounded-lg font-medium">
                                                {priceRange[0] !== null && priceRange[1] !== null ? (
                                                    <>
                                                        {priceRange[0].toLocaleString("vi-VN")}₫ - {priceRange[1].toLocaleString("vi-VN")}₫
                                                    </>
                                                ) : priceRange[0] !== null ? (
                                                    <>Từ {priceRange[0].toLocaleString("vi-VN")}₫</>
                                                ) : (
                                                    <>Đến {priceRange[1].toLocaleString("vi-VN")}₫</>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={applyPriceFilter}
                                            className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                                        >
                                            Áp dụng
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product list */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-600">
                            <span className="text-gray-700 font-semibold text-sm">
                                <span className="text-black font-bold">{totalProducts}</span> sản phẩm
                            </span>
                            <select
                                className="border border-gray-300 py-2 px-4 rounded-lg text-base focus:ring-1 focus:ring-gray-500 focus:border-black focus:outline-none transition-all cursor-pointer bg-white"
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                            >
                                <option value="">Mới nhất</option>
                                <option value="sold">Lượt mua</option>
                                <option value="rating">Đánh giá</option>
                                <option value="priceHTL">Giá giảm dần</option>
                                <option value="priceLTH">Giá tăng dần</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-3 lg:grid-cols-4 gap-5">

                            {!isLoadingProducts && products && products.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
                                    <img
                                        src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1763006398/product-not-found_bkrnsf.png"
                                        className="w-48 h-auto opacity-90"
                                        alt="No products"
                                    />
                                    <p className="mt-4 text-gray-600 text-lg font-medium">
                                        Không tìm thấy sản phẩm
                                    </p>
                                </div>
                            )}
                            {isLoadingProducts ? (
                                <div className="col-span-full flex justify-center items-center py-12">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600">Đang tải...</p>
                                    </div>
                                </div>
                            ) : (products && (
                                products.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        priceRange={priceRange}
                                    />
                                )))
                            )}
                        </div>


                        {totalPage > 0 && (
                            <div className="flex justify-center items-center gap-3 mt-10">
                                <button
                                    onClick={() => page > 0 && handleLoadProducts(page - 1, sort, discountSort, selectedCats, selectedBrands, priceRange)}
                                    disabled={page === 0}
                                    className={`p-3 rounded ${page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                                >
                                    <FaChevronLeft />
                                </button>

                                {getPageNumbers().map((num, i) =>
                                    num === "..." ? (
                                        <span key={i} className="px-2 text-gray-500">...</span>
                                    ) : (
                                        <button
                                            key={i}
                                            onClick={() => handleLoadProducts(num, sort, discountSort, selectedCats, selectedBrands, priceRange)}
                                            className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                    ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                                        >
                                            {num + 1}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => page < totalPage - 1 && handleLoadProducts(page + 1, sort, discountSort, selectedCats, selectedBrands, priceRange)}
                                    disabled={page === totalPage - 1}
                                    className={`p-3 rounded ${page === totalPage - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
