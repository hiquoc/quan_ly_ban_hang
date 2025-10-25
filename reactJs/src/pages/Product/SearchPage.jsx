import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getActiveBrands, getActiveCategories, getActiveProducts } from "../../apis/productApi";
import { PopupContext } from "../../contexts/PopupContext";
import ProductCard from "../../components/ProductCard";
import { FiFilter } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function SearchPage() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const keyword = params.get("keyword");
    const { showPopup } = useContext(PopupContext);

    const [products, setProducts] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [page, setPage] = useState(0);
    const [totalPage, setTotalPage] = useState(0);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [showCat, setShowCat] = useState(false);
    const [showBrand, setShowBrand] = useState(false);
    const [sort, setSort] = useState("");
    const [selectedCats, setSelectedCats] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [priceRange, setPriceRange] = useState([]);
    const [showPrice, setShowPrice] = useState(true)

    useEffect(() => {
        handleLoadProducts(0);
    }, [sort, selectedCats, selectedBrands]);

    useEffect(() => {
        handleLoadProducts(0);
        handleLoadCategories();
        handleLoadBrands();
    }, []);

    async function handleLoadProducts(newPage = 0) {
        const res = await getActiveProducts(
            newPage,
            12,
            keyword,
            selectedCats,
            selectedBrands,
            null,
            null,
            sort === "sold" ? sort : null,
            sort === "discount" ? true : null,
            priceRange[0] !== null ? priceRange[0] : undefined,
            priceRange[1] !== null ? priceRange[1] : undefined
        );

        if (res.error) {
            setProducts([]);
            return;
        }
        setProducts(res.data.content);
        setTotalProducts(res.data.totalElements);
        setTotalPage(res.data.totalPages);
        setPage(newPage);
    }

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

    const toggleCat = (name) =>
        setSelectedCats((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
    const toggleBrand = (name) =>
        setSelectedBrands((prev) => (prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]));

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
        <div className="pb-10">
            <div className="px-40 pt-8 text-base text-gray-500 flex flex-wrap items-center gap-4">
                <a href="/" className="hover:underline">Trang chủ</a>
                <span>›</span>
                <a href="/search" className="hover:underline">Tìm kiếm</a>
                <span>›</span>
                <span className="font-semibold text-gray-900">{keyword}</span>
            </div>

            <div className="flex px-40 pt-10 gap-15">
                <div className="w-72 pt-3 flex-shrink-0">
                    <div
                        onClick={() => setShowCat(!showCat)}
                        className="flex justify-between items-center border-b border-gray-300 pb-2 cursor-pointer"
                    >
                        <span className="text-xl font-semibold flex items-center gap-2">
                            <FiFilter /> Danh mục
                        </span>
                        {showCat ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {showCat && (
                        <div className="pt-3 max-h-60 overflow-y-auto">
                            {categories.map((cat) => (
                                <label key={cat.id} className="flex items-center gap-3 mb-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedCats.includes(cat.name)}
                                        onChange={() => toggleCat(cat.name)}
                                        className="accent-black"
                                    />
                                    <span className="text-gray-700 font-medium">{cat.name}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div
                        onClick={() => setShowBrand(!showBrand)}
                        className="flex justify-between items-center border-b border-gray-300 pb-2 mt-6 cursor-pointer"
                    >
                        <span className="text-xl font-semibold flex items-center gap-2">
                            <FiFilter /> Thương hiệu
                        </span>
                        {showBrand ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {showBrand && (
                        <div className="pt-3 max-h-60 overflow-y-auto">
                            {brands.map((brand) => (
                                <label key={brand.id} className="flex items-center gap-3 mb-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedBrands.includes(brand.name)}
                                        onChange={() => toggleBrand(brand.name)}
                                        className="accent-black"
                                    />
                                    <span className="text-gray-700 font-medium">{brand.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="mt-6">
                        <div
                            onClick={() => setShowPrice(!showPrice)}
                            className="flex justify-between items-center border-b border-gray-300 pb-2 cursor-pointer"
                        >
                            <span className="text-xl font-semibold flex items-center gap-2">
                                <FiFilter /> Giá
                            </span>
                            {showPrice ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                        {showPrice && (
                            <div className="pt-3 flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1 flex flex-col">
                                        <input
                                            type="number"
                                            placeholder="Từ"
                                            min={0}
                                            value={priceRange[0] ?? ""}
                                            onChange={(e) => {
                                                const from = e.target.value ? Math.max(0, Number(e.target.value)) : null;
                                                setPriceRange([from, priceRange[1]]);
                                            }}
                                            className="w-full border p-2 rounded"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <input
                                            type="number"
                                            placeholder="Đến"
                                            min={0}
                                            value={priceRange[1] ?? ""}
                                            onChange={(e) => {
                                                const to = e.target.value ? Number(e.target.value) : null;
                                                setPriceRange([priceRange[0], to]);
                                            }}
                                            className="w-full border p-2 rounded"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between text-gray-700 text-sm mt-1">
                                    {priceRange[0] != null ? (<span>Từ: {priceRange[0].toLocaleString("vi-VN")}₫</span>) : (<span>Từ: 0₫</span>)}
                                    {priceRange[1] != null && <span>Đến: {priceRange[1].toLocaleString("vi-VN")}₫</span>}
                                </div>

                                <button
                                    onClick={() => {
                                        const from = priceRange[0] ?? 0;
                                        const to = priceRange[1] && priceRange[1] > from ? priceRange[1] : null;
                                        setPriceRange([from, to]);
                                        handleLoadProducts(0, from, to);
                                    }}
                                    className="mt-2 px-4 py-3 bg-black text-white rounded hover:bg-gray-800 transition hover:cursor-pointer"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        )}

                    </div>


                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-gray-700 font-medium">Số sản phẩm: {totalProducts}</span>
                        <select
                            className="border py-2 px-3 rounded focus:ring-1 focus:ring-gray-800"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                        >
                            <option value="">Mới nhất</option>
                            <option value="sold">Lượt mua</option>
                            <option value="discount">Đang giảm giá</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                preferDiscounted={sort==="discount"}
                                priceRange={[priceRange[0], priceRange[1]]} />
                        ))}
                    </div>

                    {totalPage > 0 && (
                        <div className="flex justify-center items-center gap-3 mt-10">
                            <button
                                onClick={() => page > 0 && handleLoadProducts(page - 1)}
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
                                        onClick={() => handleLoadProducts(num)}
                                        className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                    ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                                    >
                                        {num + 1}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => page < totalPage - 1 && handleLoadProducts(page + 1)}
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
    );
}
