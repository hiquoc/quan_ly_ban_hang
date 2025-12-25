import React, { useState, useRef, useEffect, useCallback, useContext, memo } from "react";
import { FiShoppingCart, FiXCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import ColorMap from "./ColorMap";
import { FaCartPlus, FaStar } from "react-icons/fa";

const ProductCard = memo(function ProductCard({ product, preferDiscounted = true, priceRange = [] }) {
  const { buyNow } = useContext(CartContext);
  const navigate = useNavigate();
  const [showAttributes, setShowAttributes] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const getDefaultVariant = useCallback(() => {
    if (!product.variants?.length) return null;

    const available = product.variants.filter(v => v.status !== "OUT_OF_STOCK");
    if (available.length === 0) return null;

    const [min, max] = priceRange;

    const inPriceRange = available.filter(v =>
      (min == null || v.sellingPrice >= min) &&
      (max == null || v.sellingPrice <= max)
    );

    if (preferDiscounted) {
      const discounted = inPriceRange.filter(v => v.discountPercent > 0);
      if (discounted.length > 0) return discounted[0];
      return inPriceRange[0] || available[0];
    }

    const mainVariant = available.find(v => v.id === product.mainVariantId);
    if (mainVariant && (min == null && max == null || (mainVariant.sellingPrice >= (min || 0) && mainVariant.sellingPrice <= (max || Infinity)))) {
      return mainVariant;
    }

    return inPriceRange[0] || available[0];
  }, [product, preferDiscounted, priceRange]);

  useEffect(() => {
    setSelectedVariant(getDefaultVariant());
  }, [product, preferDiscounted, priceRange, getDefaultVariant]);

  const toggleAttributes = () => setShowAttributes(prev => !prev);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowAttributes(false);
      }
    };
    if (showAttributes) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttributes]);

  if (!selectedVariant) return null;
  const isOutOfStock = selectedVariant.status === "OUT_OF_STOCK";

  const attributeOptions = {};
  product.variants.forEach((v) => {
    Object.entries(v.attributes || {}).forEach(([k, val]) => {
      if (!attributeOptions[k]) attributeOptions[k] = new Set();
      attributeOptions[k].add(val);
    });
  });

  const sortedAttributes = Object.keys(attributeOptions).sort((a, b) =>
    a === "Màu" ? -1 : b === "Màu" ? 1 : 0
  );

  const handleBuyNow = () => buyNow(selectedVariant.id);

  function normalizeColorName(name) {
    if (!name) return null;

    const lower = name.toLowerCase();

    if (lower.includes("xanh lá")) return "Xanh lá";
    if (lower.includes("xanh")) return "Xanh";

    return name;
  }



  return (
    <div className="group relative flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 h-[24rem]">
      {product.variants.length > 1 && (
        <button
          ref={buttonRef}
          onClick={toggleAttributes}
          className="absolute top-2 right-2 bg-gray-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-gray-800 transition-all z-20 shadow-lg"
        >
          {showAttributes ? "Đóng" : "Mẫu"}
        </button>
      )}

      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <div className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
          <FaCartPlus className="text-blue-500 text-sm" />
          <span className="text-gray-900">{product.totalSold}</span>
          {product.ratingCount > 0 && (
            <>
              <div className="w-px h-3 bg-gray-300 mx-0.5"></div>
              <FaStar className="text-yellow-400 text-sm" />
              <span className="text-gray-900 font-bold">{product.ratingAvg.toFixed(1)}</span>
              <span className="text-gray-500 text-[10px]">({product.ratingCount})</span>
            </>
          )}
        </div>

        {selectedVariant.discountPercent > 0 && (
          <div className="w-fit bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md">
            -{selectedVariant.discountPercent}%
          </div>
        )}
      </div>

      <div
        className="relative h-56 overflow-hidden cursor-pointer group"
        onClick={() => navigate(`/product/${product.slug}?sku=${selectedVariant.sku}`)}
      >
        <img
          src={selectedVariant.imageUrls?.main || product.imageUrl}
          alt={selectedVariant.name}
          className="w-full h-full object-contain p-4 transform transition-transform duration-500 scale-95 group-hover:scale-105"
        />
        <div className="absolute inset-0 transition-all duration-300"></div>
      </div>

      <div className="flex flex-col flex-1 p-4 text-center">
        <h3
          className="text-gray-900 font-semibold leading-tight line-clamp-2 -mt-3 mb-4 h-10 cursor-pointer hover:text-blue-600 transition"
          onClick={() => navigate(`/product/${product.slug}?sku=${selectedVariant.sku}`)}
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="flex flex-col mb-2 mt-auto max-h-[30px] justify-end">
          {selectedVariant.discountPercent > 0 ? (
            <div className="flex flex-col">
              <span className="text-gray-400 text-sm line-through -mb-1">
                {selectedVariant.basePrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
              <span className="text-red-600 font-bold text-lg">
                {selectedVariant.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
            </div>
          ) : (
            <span className="text-gray-900 font-bold text-lg">
              {selectedVariant.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {isOutOfStock ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 bg-gray-300 text-gray-500 px-4 py-3 rounded font-medium cursor-not-allowed"
            >
              <FiXCircle className="text-lg" />
              <span>Hết hàng</span>
            </button>
          ) : (
            <button
              onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-2 cursor-pointer bg-black text-white px-4 py-3 rounded-lg font-semibold hover:from-gray-800 hover:to-gray-700 transform hover:scale-[1.02] transition-all duration-200 shadow-md hover:shadow-xl"
            >
              <FiShoppingCart className="text-lg" />
              <span>Mua ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* Attribute Panel Overlay - positioned over the card */}
      {showAttributes && (
        <div
          ref={panelRef}
          className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-2xl z-30 p-4 max-h-[55%] overflow-y-auto"
        >
          <button
            onClick={() => setShowAttributes(false)}
            className="absolute top-2 right-2 bg-gray-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-gray-800 transition-all shadow-lg z-10"
          >
            Đóng
          </button>
          <h4 className="text-sm font-bold text-gray-900 mb-3 pr-16">Chọn phân loại</h4>
          {sortedAttributes.map((attrName) => (
            <div key={attrName} className="mb-3">
              <span className="text-xs font-medium text-gray-600 block mb-2">{attrName}:</span>
              <div className="flex gap-2 flex-wrap">
                {[...attributeOptions[attrName]].map((value) => {
                  const isColor = attrName.toLowerCase().includes("màu");
                  const isSelected = selectedVariant.attributes?.[attrName] === value;
                  return (
                    <button
                      key={value}
                      className={`transition-all duration-150 ${isColor
                        ? `w-8 h-8 rounded-full border-2 ${isSelected ? "border-gray-900 ring-2 ring-gray-300" : "border-gray-300"}`
                        : `px-3 py-2 rounded-lg border text-xs font-medium ${isSelected
                          ? "border-black bg-black text-white"
                          : "text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`
                        }`}
                      style={isColor ? { backgroundColor: ColorMap[normalizeColorName(value)] || "#ccc" } : {}}
                      onClick={() => {
                        const newAttrs = { ...selectedVariant.attributes, [attrName]: value };
                        const matched = product.variants.find((v) =>
                          Object.entries(newAttrs).every(([k, val]) => v.attributes[k] === val)
                        );
                        if (matched) {
                          setSelectedVariant(matched);
                          setShowAttributes(false);
                        }
                      }}
                    >
                      {isColor ? "" : value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ProductCard;