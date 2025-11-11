import React, { useContext, useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, NavLink } from "react-router-dom";
import { createProductReview, deleteProductReview, getActiveProductDetails, getProductDetails, getProductReviews, getRandomActiveProductByCategory, updateProductReview } from "../../apis/productApi";
import { FiSettings, FiShoppingCart, FiCreditCard,
    FiChevronDown, FiChevronUp, FiX, FiEdit, FiCpu, FiHardDrive, FiDroplet, FiBox,
    FiMonitor, FiBattery, FiZap, FiWifi, FiCamera,
    FiPackage, FiShield, FiTrendingUp, FiLayers,
    FiActivity, FiAperture, FiDisc
} from "react-icons/fi";
import ColorMap from "../../components/ColorMap";
import { PopupContext } from "../../contexts/PopupContext";
import { CartContext } from "../../contexts/CartContext";
import { FaStar, FaRegStar, FaStarHalfAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import { AuthContext } from "../../contexts/AuthContext";
import ConfirmPanel from "../../components/ConfirmPanel";
import { Helmet } from "react-helmet-async";
import ProductCard from "../../components/ProductCard";

export default function ProductDetails() {
    const { slug } = useParams();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const skuFromUrl = params.get("sku");
    const isSecurePath = location.pathname.includes("/admin/");
    const { addToCart, buyNow } = useContext(CartContext)
    const navigate = useNavigate();
    const { ownerId, role } = useContext(AuthContext)

    const [product, setProduct] = useState(null);
    const [randomProducts, setRandomProducts] = useState(null)
    const [isLoadingProduct, setIsLoadingProduct] = useState(false)
    const [isLoadingRandomProducts, setIsLoadingRandomProducts] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const [variant, setVariant] = useState({});
    const [allVariants, setAllVariants] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const { showPopup } = useContext(PopupContext)
    const [selectedImage, setSelectedImage] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const isOutOfStock = variant.status === "OUT_OF_STOCK";
    const hasDiscount = variant.discountPercent > 0 && variant.basePrice > variant.sellingPrice;
    const [specsExpanded, setSpecsExpanded] = useState(false);

    const [reviews, setReviews] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReviews, setTotalReviews] = useState(0);
    const [ratingCounts, setRatingCounts] = useState({});
    const [ratingFilter, setRatingFilter] = useState(null);
    const [averageRating, setAverageRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);

    const [editingReview, setEditingReview] = useState(null);
    const [reviewExpanded, setReviewExpanded] = useState(false);
    const [content, setContent] = useState("");
    const [rating, setRating] = useState(null);
    const [images, setImages] = useState([]);
    const [creatingReview, setCreatingReview] = useState(false);
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [hasUserReview, setHasUserReview] = useState(false);

    useEffect(() => {
        handleLoadProduct();
    }, [slug]);

    useEffect(() => {
        if (product === null) return;
        handleLoadRandomProducts();
    }, [product])

    useEffect(() => {
        fetchReviews();
    }, [product, page, ratingFilter]);

    useEffect(() => {
        setSku(variant.sku)
    }, [variant])

    async function handleLoadProduct() {
        try {
            setIsLoadingProduct(true)
            let res;
            if (!isSecurePath)
                res = await getActiveProductDetails(slug);
            else
                res = await getProductDetails(slug)
            if (res.error) {
                showPopup("Sản phẩm không tồn tại" || res.error, "error", () => navigate(-1))
                return;
            }
            const productData = res.data;
            const mainVariant =
                productData.variants.find((v) => v.sku === skuFromUrl) ||
                productData.variants.find((v) => v.id === productData.mainVariantId) ||
                productData.variants[0];
            setProduct(productData);
            setVariant(mainVariant);
            setAllVariants(productData.variants);
            setSelectedAttributes({ ...mainVariant.attributes });

            const images = Object.entries(mainVariant.imageUrls || {});
            const mainImage = images.find(([key]) => key === "main")?.[1];
            setSelectedImage(mainImage || images[0]?.[1] || "");
        } finally {
            setIsLoadingProduct(false)
        }
    }
    async function handleLoadRandomProducts() {
        try {
            setIsLoadingRandomProducts(true)
            const res = await getRandomActiveProductByCategory(product.categorySlug);
            if (res.error) return showPopup(res.error)
            setRandomProducts(res.data);
        } finally {
            setIsLoadingRandomProducts(false)
        }
    }

    function handleAttributeSelect(attrName, value) {
        const newSelected = { ...selectedAttributes, [attrName]: value };
        setSelectedAttributes(newSelected);

        const matchedVariant = allVariants.find((v) =>
            Object.entries(newSelected).every(([key, val]) => v.attributes[key] === val)
        );
        if (matchedVariant) {
            setVariant(matchedVariant);

            const images = Object.entries(matchedVariant.imageUrls || {});
            const mainImage = images.find(([key]) => key === "main")?.[1];
            setSelectedImage(mainImage || images[0]?.[1] || "");
        }
    }


    function getSpecIcon(name) {
        const key = name.toLowerCase();

        // CPU/Processor
        if (key.includes("cpu") || key.includes("chip") || key.includes("processor") || key.includes("bộ xử lý"))
            return <FiCpu className="text-lg text-purple-600" />;

        // Storage/Disk
        if (key.includes("ổ") || key.includes("disk") || key.includes("drive") || key.includes("ssd") || key.includes("hdd") || key.includes("lưu trữ"))
            return <FiHardDrive className="text-lg text-orange-600" />;

        // RAM/Memory
        if (key.includes("ram") || key.includes("memory") || key.includes("bộ nhớ"))
            return <FiLayers className="text-lg text-green-600" />;

        // Display/Screen
        if (key.includes("màn") || key.includes("screen") || key.includes("display") || key.includes("inch"))
            return <FiMonitor className="text-lg text-blue-600" />;

        // Battery
        if (key.includes("pin") || key.includes("battery") || key.includes("mah") || key.includes("wh"))
            return <FiBattery className="text-lg text-yellow-600" />;

        // Graphics/GPU
        if (key.includes("card") || key.includes("gpu") || key.includes("đồ họa") || key.includes("graphics"))
            return <FiActivity className="text-lg text-red-600" />;

        // Camera
        if (key.includes("camera") || key.includes("máy ảnh") || key.includes("mp") || key.includes("megapixel"))
            return <FiCamera className="text-lg text-pink-600" />;

        // Weight
        if (key.includes("trọng") || key.includes("weight") || key.includes("kg") || key.includes("gram"))
            return <FiPackage className="text-lg text-gray-600" />;

        // Connectivity/Wifi
        if (key.includes("wifi") || key.includes("bluetooth") || key.includes("kết nối") || key.includes("5g") || key.includes("4g"))
            return <FiWifi className="text-lg text-indigo-600" />;

        // Performance/Speed
        if (key.includes("ghz") || key.includes("tốc độ") || key.includes("speed") || key.includes("performance"))
            return <FiZap className="text-lg text-amber-600" />;

        // OS/Software
        if (key.includes("hệ điều hành") || key.includes("os") || key.includes("windows") || key.includes("android") || key.includes("ios"))
            return <FiDisc className="text-lg text-teal-600" />;

        // Warranty
        if (key.includes("bảo hành") || key.includes("warranty") || key.includes("guarantee"))
            return <FiShield className="text-lg text-cyan-600" />;

        // Resolution/Quality
        if (key.includes("độ phân giải") || key.includes("resolution") || key.includes("hd") || key.includes("4k") || key.includes("fhd"))
            return <FiAperture className="text-lg text-violet-600" />;

        // Size/Dimensions
        if (key.includes("kích") || key.includes("size") || key.includes("dimension") || key.includes("thước"))
            return <FiBox className="text-lg text-slate-600" />;

        // Color
        if (key.includes("màu") || key.includes("color"))
            return <FiDroplet className="text-lg text-rose-600" />;

        // Default
        return <FiSettings className="text-lg text-gray-500" />;
    }

    const fetchReviews = async (currentPage = page) => {
        if (!product?.id) return;
        const res = await getProductReviews(product.id, currentPage, 5, ratingFilter, ownerId);
        if (res.error) return;

        setReviews(res.data.reviews.content);
        setTotalPages(res.data.reviews.totalPages);
        if (!ratingFilter)
            setTotalReviews(res.data.reviews.totalElements);
        setPage(currentPage);

        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        Object.entries(res.data.ratingCounts).forEach(([key, value]) => {
            counts[key] = value;
        });

        setRatingCounts(counts);

        const totalReviewsCount = [1, 2, 3, 4, 5].reduce((sum, r) => sum + counts[r], 0);
        const average = [1, 2, 3, 4, 5].reduce((sum, r) => sum + r * counts[r], 0) / (totalReviewsCount || 1);
        setAverageRating(average.toFixed(1));
        if (currentPage === 0)
            setHasUserReview(res.data.reviews.content.some(r => r.customerId === ownerId && role === "CUSTOMER"));
    };


    const handleDeleteReview = async (id) => {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc muốn xóa đánh giá?`,
            onConfirm: async () => {
                const res = await deleteReview(id);
                if (res?.error) return showPopup(res.error);
                showPopup("Xóa đánh giá thành công!", "success");
                setReviews(prev => prev.filter(v => v.id !== id));
                setConfirmPanel({ visible: false, message: "", onConfirm: null });
            }
        });

    }
    const deleteReview = async (id) => {
        if (creatingReview) return;
        setCreatingReview(true);
        const res = await deleteProductReview(id);
        if (res.error) return showPopup(res.error);
        showPopup("Xóa đánh giá thành công!")
        setCreatingReview(false);
        setHasUserReview(false);
        fetchReviews();
    }
    const handleEditReview = (review) => {
        setEditingReview(review);
        setReviewExpanded(true);
        setRating(review.rating);
        setContent(review.content || "");

        const existingImages = Object.entries(review.images || {}).map(([key, url]) => ({
            url,
            key,
            isDeleted: false,
        }));
        setImages(existingImages);
    };
    const handleReviewImageChange = (e) => {
        const newFiles = Array.from(e.target.files).map((file) => ({
            file,
            url: URL.createObjectURL(file),
            isDeleted: false,
        }));
        setImages((prev) => [...prev, ...newFiles]);
    };
    const handleRemoveImage = (idx) => {
        setImages((prev) => {
            const copy = [...prev];
            if (copy[idx].key) {
                copy[idx].isDeleted = true;
            } else {
                copy.splice(idx, 1);
            }
            return copy;
        });
    };

    const handleUpdateReview = async (id) => {
        if (creatingReview) return;
        setCreatingReview(true);

        try {
            const newImagesFiles = images.filter(img => img.file && !img.isDeleted).map(img => img.file);
            const deletedKeys = images.filter(img => img.key && img.isDeleted).map(img => img.key);

            const res = await updateProductReview(
                id,
                rating,
                null,
                content,
                newImagesFiles,
                deletedKeys
            );

            if (res.error) return showPopup(res.error);
            fetchReviews();
            setEditingReview(null);
            setReviewExpanded(false);
            setRating(null);
            setContent("");
            setImages([]);
            showPopup("Cập nhật đánh giá thành công!");
        } finally {
            setCreatingReview(false);
        }
    };
    const handleRatingFilter = (star) => {
        if (ratingFilter === star) {
            setRatingFilter(null);
        } else {
            setRatingFilter(star);
        }
    };
    const setSku = (newSku) => {
        params.set("sku", newSku);
        window.history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
    };

    function getPageNumbers() {
        const pages = [];
        const maxVisible = 4;
        if (totalPages <= maxVisible + 2) {
            for (let i = 0; i < totalPages; i++) pages.push(i);
        } else {
            if (page <= 2) {
                pages.push(0, 1, 2, 3, "...", totalPages - 1);
            } else if (page >= totalPages - 3) {
                pages.push(0, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
            } else {
                pages.push(0, "...", page - 1, page, page + 1, "...", totalPages - 1);
            }
        }
        return pages;
    }
    if (isLoadingProduct || !product || !variant) {
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải...</p>
                </div>
            </div>
        );
    }

    const imageEntries = Object.entries(variant?.imageUrls || {});
    const attributeOptions = {};
    allVariants.forEach((v) => {
        Object.entries(v.attributes).forEach(([key, value]) => {
            if (!attributeOptions[key]) attributeOptions[key] = new Set();
            attributeOptions[key].add(value);
        });
    });

    const combinedSpecs = {
        ...(variant?.technicalSpecs || product?.technicalSpecs || {}),
        ...selectedAttributes,
    };

    return (
        <>
            <Helmet>
                <title>Sản phẩm</title>
            </Helmet>
            <>
                <div className="px-40 pt-5 text-base text-gray-500 flex flex-wrap items-center gap-4">
                    <a href="/" className="hover:underline hover:cursor-pointer">Trang chủ</a>
                    <span>›</span>
                    <NavLink to={`/search?categories=${product.categorySlug}`} className="hover:underline hover:cursor-pointer">{product.categoryName}</NavLink>
                    <span>›</span>
                    <NavLink to={`/search?brands=${product.brandSlug}`} className="hover:underline hover:cursor-pointer">{product.brandName}</NavLink>
                    <span>›</span>
                    <span className="font-semibold text-gray-900">{variant.name}</span>
                </div>

                <div className="flex flex-wrap gap-15 px-40 justify-center pt-4">
                    {/* LEFT SIDE */}
                    <div className="flex w-full flex-1 gap-6 justify-center items-center pb-0">
                        {/* Thumbnails */}
                        <div className="flex flex-col justify-center items-center gap-3 max-h-[500px] pr-1">
                            {imageEntries.map(([key, url]) => (
                                <img
                                    key={key}
                                    src={url}
                                    alt={key}
                                    onClick={() => setSelectedImage(url)}
                                    className={`w-20 h-20 object-cover rounded cursor-pointer transition ${selectedImage === url ? "border border-black" : "opacity-60"
                                        } hover:opacity-100 hover:scale-105`}
                                />
                            ))}
                        </div>

                        {/* Main Image */}
                        <div className="flex-1 flex items-center justify-center rounded-lg min-h-[500px] relative">
                            {selectedImage && (
                                <>
                                    <img
                                        src={selectedImage}
                                        alt="Selected"
                                        className={`object-contain max-h-[480px] rounded-lg transition-opacity ${isOutOfStock ? "opacity-50" : "opacity-100"}`}
                                    />

                                    {isOutOfStock && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-black bg-opacity-60 text-white text-2xl font-bold px-6 py-3 rounded-lg flex items-center gap-2">
                                                <FiShoppingCart className="text-3xl" />
                                                HẾT HÀNG
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex-1 min-w-[300px] bg-white flex flex-col py-6 gap-6 px-4 rounded-lg">

                        {/* Name */}
                        <h2 className="text-4xl font-semibold text-gray-900 leading-tight">
                            {variant.name}
                        </h2>

                        {/* Price */}
                        <div className="mt-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3 ">
                                    <div className="text-3xl font-bold text-b tracking-wide">
                                        {variant.sellingPrice?.toLocaleString()}₫
                                    </div>
                                    {hasDiscount && (
                                        <>
                                            <div className="text-lg text-gray-400 line-through">
                                                {variant.basePrice?.toLocaleString()}₫
                                            </div>
                                            <div className="text-red-600 text-base font-semibold bg-red-100 px-2 py-1 rounded-lg">
                                                -{variant.discountPercent}%
                                            </div>
                                        </>
                                    )}
                                </div>

                                <span className="text-gray-500 text-sm">{variant.soldCount} lượt mua</span>
                            </div>
                        </div>

                        {/* ATTRIBUTE SELECTORS */}
                        {Object.entries(attributeOptions)
                            // Sort to show "Màu" (color) first
                            .sort(([aName], [bName]) => {
                                const aIsColor = aName.toLowerCase().includes("màu");
                                const bIsColor = bName.toLowerCase().includes("màu");
                                if (aIsColor && !bIsColor) return -1;
                                if (!aIsColor && bIsColor) return 1;
                                return 0;
                            })
                            .map(([attrName, values]) => {
                                const sortedValues = attrName.toLowerCase().includes("màu")
                                    ? [...values].sort((a, b) => {
                                        const priority = { "Đen": 1, "Trắng": 2 };
                                        const pa = priority[a] || 999;
                                        const pb = priority[b] || 999;
                                        return pa - pb;
                                    })
                                    : [...values];

                                return (
                                    <div key={attrName} className="flex">
                                        <p className="font-semibold mb-2">{attrName}:</p>
                                        <div className="flex gap-2 flex-wrap ml-5 -mt-2">
                                            {sortedValues.map((value) => {
                                                const isColor = attrName.toLowerCase().includes("màu");
                                                const selected = selectedAttributes[attrName] === value;

                                                return (
                                                    <button
                                                        key={value}
                                                        className={`transition-all duration-150 hover:cursor-pointer ${isColor
                                                            ? `w-10 h-10 rounded-full border-2 ${selected ? "border-gray-700" : "border-gray-300"} hover:scale-105`
                                                            : `px-6 py-2 rounded border text-base font-medium ${selected ? "border-black text-black" : " text-gray-500 border-gray-300 hover:bg-gray-50 "} hover:scale-105`
                                                            }`}
                                                        style={isColor ? { backgroundColor: ColorMap[value] || "#ccc" } : {}}
                                                        onClick={() => handleAttributeSelect(attrName, value)}
                                                        title={isColor ? value : ""}
                                                    >
                                                        {!isColor && value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                        {/* TECHNICAL SPECS */}
                        <div className="mt-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {Object.entries(combinedSpecs)
                                    .slice(0, specsExpanded ? Object.keys(combinedSpecs).length : 4)
                                    .map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg shadow-sm border border-gray-100"
                                            title={`${key}: ${value}`}
                                        >
                                            {getSpecIcon(key)}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-700" title={key}>
                                                    {key}
                                                </p>
                                                <p className="text-gray-600 text-sm truncate" title={value}>
                                                    {value}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {Object.keys(combinedSpecs).length > 4 && (
                                <button
                                    onClick={() => setSpecsExpanded(!specsExpanded)}
                                    className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                                >
                                    {specsExpanded ? (
                                        <>
                                            Thu gọn
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </>
                                    ) : (
                                        <>
                                            Xem thêm {Object.keys(combinedSpecs).length - 4} thông số khác
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <div className="text-gray-700 text-base whitespace-pre-line">
                            <p className={`${!expanded ? "line-clamp-3" : ""}`}>
                                {product.shortDescription}
                            </p>
                            {product.shortDescription && product.shortDescription.split(" ").length > 10 && (
                                <button
                                    className=" underline text-sm mt-1"
                                    onClick={() => setExpanded(!expanded)}
                                >
                                    {expanded ? "Thu gọn" : "Xem tiếp..."}
                                </button>
                            )}
                        </div>

                        {/* Add to cart full width with cart icon */}
                        <div className="flex gap-3 mt-4 flex-col sm:flex-row">
                            <button
                                className={`flex-1 px-10 py-4 rounded-lg text-lg font-medium shadow flex items-center justify-center gap-2 transition
                            ${isOutOfStock || isSecurePath
                                        ? "bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed"
                                        : "bg-white border border-black hover:bg-gray-100 hover:cursor-pointer"
                                    }
                                    ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => {
                                    if (ownerId === null)
                                        showPopup("Vui lòng đăng nhập để tiếp tục!", "error", () => navigate(`/login`))

                                    if (!isOutOfStock) addToCart(variant.id);
                                }}
                                disabled={isOutOfStock || isSecurePath || isProcessing}
                            >
                                <FiShoppingCart className="text-xl" />
                                {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                            </button>

                            <button
                                className={`flex-1 px-10 py-4 rounded-lg text-lg font-medium shadow flex items-center justify-center gap-2 transition
                                    ${isOutOfStock || isSecurePath
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-black text-white hover:bg-gray-900 hover:cursor-pointer"
                                    }
                                    ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => {
                                    if (!isOutOfStock) {
                                        if (ownerId !== null) {
                                            try {
                                                setIsProcessing(true)
                                                buyNow(variant.id)
                                            } finally {
                                                setIsProcessing(false)
                                            }
                                        }
                                        else
                                            showPopup("Vui lòng đăng nhập để tiếp tục!", "error", () => navigate(`/login`))
                                    }
                                }}
                                disabled={isOutOfStock || isSecurePath || isProcessing}
                            >
                                {isProcessing && (
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        ></path>
                                    </svg>
                                )}
                                <FiCreditCard className="text-xl" />
                                {isOutOfStock ? "Hết hàng" : "Mua ngay"}
                            </button>
                        </div>

                    </div>
                </div >


                <div className="px-40 py-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Sản phẩm tương tự</h2>
                            {/* <p className="text-gray-600 mt-2">Săn sale ngay kẻo lỡ</p> */}
                        </div>
                    </div>
                    {isLoadingRandomProducts ? (
                        <div className="col-span-full flex justify-center items-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Đang tải...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-6">
                            {randomProducts && randomProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    priceRange={[]}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gray-100 py-10">
                    <div className="px-40">
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
                                Thông tin chi tiết
                            </h2>

                            <p className={`${!detailsExpanded ? "line-clamp-6" : ""} text-gray-600 whitespace-pre-line`}>
                                {product.description}
                            </p>

                            {product.description && product.description.split(" ").length > 10 && (
                                <div className="flex justify-center mt-2">
                                    <button
                                        className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-black hover:bg-gray-100 hover:cursor-pointer transition-all duration-150"
                                        onClick={() => setDetailsExpanded(!detailsExpanded)}
                                    >
                                        {detailsExpanded ? "Thu gọn" : "Xem tiếp"}
                                        {detailsExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-40 pt-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                        Đánh giá & Bình luận
                    </h2>
                    <div className="flex justify-between gap-10 pb-10">
                        {/* Average Rating */}
                        <div className="w-45 h-45 bg-gray-50 flex flex-col justify-center text-center rounded-2xl">
                            <span className="text-4xl font-bold -mt-2">{averageRating}</span>
                            <span className="text-base text-gray-500 font-medium mt-3">
                                {totalReviews} lượt đánh giá
                            </span>
                            <div className="flex justify-center mt-2 text-yellow-400 text-xl">
                                {[1, 2, 3, 4, 5].map((i) => {
                                    if (i <= Math.floor(averageRating)) return <FaStar key={i} />;
                                    else if (i - averageRating < 1) return <FaStarHalfAlt key={i} />;
                                    else return <FaRegStar key={i} />;
                                })}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center ">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = ratingCounts[star] || 0;
                                const totalForPercentage = [1, 2, 3, 4, 5].reduce((sum, r) => sum + (ratingCounts[r] || 0), 0);
                                const percentage = totalForPercentage > 0 ? (count / totalForPercentage) * 100 : 0;

                                return (
                                    <div
                                        key={star}
                                        className={`flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-gray-100`}
                                        onClick={() => handleRatingFilter(star)}
                                    >
                                        {/* Stars */}
                                        <div className="flex w-20">
                                            {[...Array(star)].map((_, idx) => (
                                                <FaStar
                                                    key={idx}
                                                    className={`${ratingFilter === star ? "text-sky-400" : "text-yellow-400"
                                                        }`}
                                                />
                                            ))}
                                        </div>

                                        {/* Progress bar */}
                                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${ratingFilter === star ? "bg-sky-400" : "bg-yellow-400"
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>

                                        {/* Count */}
                                        <span
                                            className={`w-10 text-right text-sm font-medium ${ratingFilter === star ? "text-sky-400" : "text-gray-500"
                                                }`}
                                        >
                                            {count}
                                        </span>
                                    </div>
                                );

                            })}
                        </div>

                    </div>
                    {ownerId && hasUserReview && (
                        <div className="w-full mb-3">
                            {editingReview && (
                                <div className="w-full bg-white rounded px-8 py-6 border border-gray-300 shadow-sm space-y-3">
                                    {/* Rating selector */}
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-700">Đánh giá:</span>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setRating(i)}
                                                onMouseEnter={() => setHoverRating(i)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="transition"
                                            >
                                                {i <= (hoverRating || rating) ? (
                                                    <AiFillStar className="text-yellow-400 text-2xl" />
                                                ) : (
                                                    <AiOutlineStar className="text-gray-400 text-2xl hover:text-yellow-300" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Content textarea */}
                                    <textarea
                                        placeholder="Nội dung đánh giá"
                                        className="w-full border border-gray-300 rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-800"
                                        rows={4}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />

                                    {/* Add images */}
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-gray-700 border border-gray-500 px-3 py-2 rounded hover:bg-gray-100">
                                            <FiCamera /> Hình ảnh
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleReviewImageChange}
                                            />
                                        </label>
                                        {images.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto mt-2">
                                                {images.map((img, idx) => (
                                                    !img.isDeleted && (
                                                        <div key={idx} className="relative">
                                                            <img
                                                                src={img.url}
                                                                alt={`preview-${idx}`}
                                                                className="w-20 h-20 object-cover border border-gray-300 rounded"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImage(idx)}
                                                                className="absolute top-0 right-0 bg-gray-800 text-white rounded-full p-1 hover:bg-red-500"
                                                            >
                                                                <FiX size={14} />
                                                            </button>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex justify-end gap-2">
                                        <button
                                            disabled={creatingReview}
                                            className={`px-4 py-2 rounded border border-gray-400 hover:bg-gray-100 text-gray-700  ${creatingReview ? "opacity-50 cursor-not-allowed" : ""}`}
                                            onClick={() => {
                                                setEditingReview(null);
                                                setRating(null);
                                                setContent("");
                                                setImages([]);
                                            }}
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            className={`px-4 py-2 rounded bg-black text-white hover:bg-gray-900 flex items-center gap-2 ${creatingReview ? "opacity-50 cursor-not-allowed" : ""}`}
                                            onClick={() => handleUpdateReview(editingReview.id)}
                                            disabled={creatingReview}
                                        >
                                            {creatingReview && (
                                                <svg
                                                    className="animate-spin h-5 w-5 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                    ></path>
                                                </svg>
                                            )}
                                            Cập nhật đánh giá
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reviews list */}
                    <div className="grid gap-6 pb-5">
                        {(!reviews || reviews.length === 0) ? (
                            <p className="text-gray-500">Chưa có đánh giá nào.</p>
                        ) : reviews.map((review) => {
                            if (review.customerId === editingReview?.customerId) return
                            const isUserReview = review.customerId === ownerId && role === "CUSTOMER";
                            const isDeletable = role === "ADMIN" || role === "MANAGER";
                            return (
                                <div key={review.id} className={`${isUserReview ? "border" : ""} bg-gray-50 rounded-lg px-10 py-6 relative`}>

                                    {/* Delete button top-right */}
                                    {(isUserReview || isDeletable) && (
                                        <button
                                            onClick={() => handleDeleteReview(review.id)}
                                            className="absolute top-2 right-2 text-gray-500 hover:text-red-500 cursor-pointer"
                                        >
                                            <FiX size={20} />
                                        </button>
                                    )}

                                    {/* Header: username + date */}
                                    <div className="flex flex-col mb-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex">
                                                <span className="text-xl font-semibold text-gray-900">{review.username}</span>
                                                <div className="text-gray-600 ml-2 mt-0.5">
                                                    ({review.attributes && Object.entries(review.attributes).map(([key, value]) => ` ${value}`).join(", ")})
                                                </div>


                                            </div>
                                            <span className="text-gray-500 text-sm">{new Date(review.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        {/* Rating as stars */}
                                        <div className="flex text-yellow-400 mt-1">
                                            {[1, 2, 3, 4, 5].map((i) =>
                                                i <= review.rating ? (
                                                    <AiFillStar key={i} className="text-xl" />
                                                ) : (
                                                    <AiOutlineStar key={i} className="text-xl" />
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    {review.content && (
                                        <p className="text-gray-700 white-space: pre-line mb-3">{review.content}</p>
                                    )}

                                    {/* Images */}
                                    {review.images && Object.values(review.images).length > 0 && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {Object.values(review.images).map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt={`review-${idx}`}
                                                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Edit button bottom-right */}
                                    {isUserReview && (
                                        <div className="flex justify-end mt-3">
                                            <button
                                                onClick={() => handleEditReview(review)}
                                                className="flex items-center gap-1 text-gray-700 hover:text-gray-900 border px-4 py-2 rounded hover:bg-gray-100 cursor-pointer"
                                            >
                                                <FiEdit />
                                                Chỉnh sửa
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 0 && (
                        <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                            <button
                                onClick={() => page > 0 && fetchReviews(page - 1)}
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
                                        onClick={() => fetchReviews(num)}
                                        className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                                              ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                                    >
                                        {num + 1}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => page < totalPages - 1 && fetchReviews(page + 1)}
                                disabled={page === totalPages - 1}
                                className={`p-3 rounded ${page === totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    )}
                </div>
                <ConfirmPanel
                    visible={confirmPanel.visible}
                    message={confirmPanel.message}
                    onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); }}
                    onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
                />
            </>
        </>

    );
}
