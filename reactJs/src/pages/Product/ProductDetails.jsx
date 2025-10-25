import React, { useContext, useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getActiveProductDetails } from "../../apis/productApi";
import {
    FiCpu, FiHardDrive, FiBox, FiDroplet, FiSettings, FiShoppingCart, FiCreditCard,
    FiChevronDown, FiChevronUp
} from "react-icons/fi";
import ColorMap from "../../components/ColorMap";
import { PopupContext } from "../../contexts/PopupContext";
import { CartContext } from "../../contexts/CartContext";

export default function ProductDetails() {
    const { slug } = useParams();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const skuFromUrl = params.get("sku");
    const { addToCart } = useContext(CartContext)
    const navigate = useNavigate();

    const [product, setProduct] = useState({});
    const [variant, setVariant] = useState({});
    const [allVariants, setAllVariants] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const { showPopup } = useContext(PopupContext)
    const [selectedImage, setSelectedImage] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const isOutOfStock = variant.status === "OUT_OF_STOCK";
    const hasDiscount = variant.discountPercent > 0 && variant.basePrice > variant.sellingPrice;


    useEffect(() => {
        handleLoadProduct();
    }, [slug, skuFromUrl]);

    async function handleLoadProduct() {
        const res = await getActiveProductDetails(slug);
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

    const imageEntries = Object.entries(variant.imageUrls || {});
    const attributeOptions = {};
    allVariants.forEach((v) => {
        Object.entries(v.attributes).forEach(([key, value]) => {
            if (!attributeOptions[key]) attributeOptions[key] = new Set();
            attributeOptions[key].add(value);
        });
    });

    function getSpecIcon(name) {
        const key = name.toLowerCase();
        if (key.includes("cpu") || key.includes("chip")) return <FiCpu className="text-lg" />;
        if (key.includes("ổ") || key.includes("disk") || key.includes("drive"))
            return <FiHardDrive className="text-lg" />;
        if (key.includes("màu") || key.includes("color")) return <FiDroplet className="text-lg" />;
        if (key.includes("kích") || key.includes("size")) return <FiBox className="text-lg" />;
        return <FiSettings className="text-lg" />;
    }

    const combinedSpecs = {
        ...(variant.technicalSpecs || product.technicalSpecs || {}),
        ...selectedAttributes,
    };


    return (
        <>
            <div className="px-45 pt-10 text-base text-gray-500 flex flex-wrap items-center gap-4">
                <a href="/" className="hover:underline hover:cursor-pointer">Trang chủ</a>
                <span>›</span>
                <a href={`/category/${product.categorySlug}`} className="hover:underline hover:cursor-pointer">Điện thoại</a>
                <span>›</span>
                <a href={`/brand/${product.brandSlug}`} className="hover:underline hover:cursor-pointer">{product.brandName}</a>
                <span>›</span>
                <span className="font-semibold text-gray-900">{variant.name}</span>
            </div>

            <div className="flex flex-wrap gap-15 px-45 justify-center pt-4">
                {/* LEFT SIDE */}
                <div className="flex w-full flex-1 gap-6 justify-center items-center pb-30">
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
                        <div className="grid grid-cols-4 gap-3">
                            {Object.entries(combinedSpecs).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-center gap-2 bg-gray-50 px-5 py-3 rounded-lg shadow-sm border border-gray-100"
                                >
                                    {getSpecIcon(key)}
                                    <div>
                                        <p className="text-sm font-semibold">{key}</p>
                                        <p className="text-gray-600 text-sm">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            ${isOutOfStock
                                    ? "bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed"
                                    : "bg-white border border-black hover:bg-gray-100 hover:cursor-pointer"
                                }`}
                            onClick={() => {
                                if (!isOutOfStock) addToCart(variant.id);
                            }}
                            disabled={isOutOfStock}
                        >
                            <FiShoppingCart className="text-xl" />
                            {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                        </button>

                        <button
                            className={`flex-1 px-10 py-4 rounded-lg text-lg font-medium shadow flex items-center justify-center gap-2 transition
                            ${isOutOfStock
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-black text-white hover:bg-gray-900 hover:cursor-pointer"
                                }`}
                            onClick={() => {
                                if (!isOutOfStock) {
                                    addToCart(variant.id);
                                    if (localStorage.getItem("token") !== null)
                                        navigate(`/checkout`);
                                }
                            }}
                            disabled={isOutOfStock}
                        >
                            <FiCreditCard className="text-xl" />
                            {isOutOfStock ? "Hết hàng" : "Mua ngay"}
                        </button>
                    </div>

                </div>
            </div>

            <div className="bg-gray-100 py-10">
                <div className="px-45">
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

            <div className="px-45 pt-10">
                <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                    Đánh giá & Bình luận
                </h2>
            </div>
        </>
    );
}
