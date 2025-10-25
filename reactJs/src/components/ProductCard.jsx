import React, { useState, useRef, useEffect, useCallback, useContext, memo } from "react";
import { FiShoppingCart, FiXCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import ColorMap from "./ColorMap";

const ProductCard = memo(function ProductCard({ product, preferDiscounted = false, priceRange = [] }) {  const { buyNow } = useContext(CartContext);
  const navigate = useNavigate();
  const [showAttributes, setShowAttributes] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

 const getDefaultVariant = useCallback(() => {
    if (!product.variants?.length) return null;
    const available = product.variants.filter(v => v.status !== "OUT_OF_STOCK");
    // if (available.length === 0) return null;

    const [min, max] = priceRange;

    const inPriceRange = available.filter(v => 
      (min == null || v.sellingPrice >= min) &&
      (max == null || v.sellingPrice <= max)
    );

    if (preferDiscounted) {
      const discounted = inPriceRange.filter(v => v.discountPercent > 0);
      if (discounted.length > 0) return discounted[0];
      return inPriceRange.find(v => v.id !== product.mainVariantId) || available[0];
    }

    const mainVariant = available.find(v => v.id === product.mainVariantId);
    if (mainVariant && (!min && !max || (mainVariant.sellingPrice >= (min || 0) && mainVariant.sellingPrice <= (max || Infinity)))) {
      return mainVariant;
    }

    return product.variants[0];
  }, [product, preferDiscounted, priceRange]);

  useEffect(() => {
    setSelectedVariant(getDefaultVariant());
  }, [getDefaultVariant]);

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

  // Attribute map
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

  return (
    <div className="relative flex flex-col bg-zinc-100 rounded-lg p-4 hover:bg-zinc-200 transition min-h-[26rem] justify-between">
      {product.variants.length > 1 && (
        <button
          ref={buttonRef}
          onClick={toggleAttributes}
          className="absolute top-2 right-2 bg-black text-white px-2 py-1 rounded-full text-xs hover:bg-gray-800 transition z-20"
        >
          {showAttributes ? "Đóng" : "Chọn mẫu"}
        </button>
      )}

      <img
        src={selectedVariant.imageUrls?.main || product.imageUrl}
        alt={selectedVariant.name}
        className="w-full h-52 object-cover rounded cursor-pointer"
        onClick={() => navigate(`/product/${product.slug}?sku=${selectedVariant.sku}`)}
      />

      <div className="flex flex-col items-center min-h-[6rem] mb-1">
        <span className="text-gray-900 text-base text-center line-clamp-2 font-semibold leading-snug h-12">
          {selectedVariant.name}
        </span>

        <div className="flex flex-col items-center h-12 justify-end">
          {selectedVariant.discountPercent > 0 ? (
            <>
              <span className="text-gray-500 text-sm line-through">
                {selectedVariant.basePrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
              <span className="text-red-600 font-bold text-lg leading-tight">
                {selectedVariant.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
            </>
          ) : (
            <span className="text-gray-800 font-bold text-lg leading-tight">
              {selectedVariant.sellingPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        {isOutOfStock ? (
          <button
            disabled
            className="flex justify-center gap-1 text-m text-center bg-gray-400 text-white px-3 py-2.5 rounded-lg w-40 cursor-not-allowed"
          >
            <FiXCircle className="text-lg mt-0.5 mr-1" /> Hết hàng
          </button>
        ) : (
          <button
            onClick={handleBuyNow}
            className="flex justify-center gap-1 text-m text-center bg-black text-white px-3 py-2.5 rounded-lg w-40 hover:scale-110 hover:cursor-pointer hover:shadow-2xl transition-all duration-150"
          >
            <FiShoppingCart className="text-lg mt-0.5 mr-1" /> Mua ngay
          </button>
        )}
      </div>

      {showAttributes && (
        <div
          ref={panelRef}
          className="absolute top-0 left-full ml-2 bg-white shadow-lg border border-gray-200 rounded p-3 z-50 max-w-xs min-w-[140px]"
        >
          {sortedAttributes.map((attrName) => (
            <div key={attrName} className="flex items-center mb-2">
              <span className="text-xs font-medium text-gray-600 mr-2 min-w-[40px]">{attrName}:</span>
              <div className="flex gap-1 flex-wrap">
                {[...attributeOptions[attrName]].map((value) => {
                  const isColor = attrName.toLowerCase().includes("màu");
                  const isSelected = selectedVariant.attributes?.[attrName] === value;
                  return (
                    <button
                      key={value}
                      className={`transition-all duration-150 ${isColor
                        ? `w-5 h-5 rounded-full border-2 ${isSelected ? "border-gray-700" : "border-gray-300"}`
                        : `px-2 py-1 rounded border text-xs font-medium ${isSelected
                          ? "border-black text-black"
                          : "text-gray-500 border-gray-300 hover:bg-gray-50"
                        }`
                        }`}
                      style={isColor ? { backgroundColor: ColorMap[value] || "#ccc" } : {}}
                      onClick={() => {
                        const newAttrs = { ...selectedVariant.attributes, [attrName]: value };
                        const matched = product.variants.find((v) =>
                          Object.entries(newAttrs).every(([k, val]) => v.attributes[k] === val)
                        );
                        if (matched) setSelectedVariant(matched);
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
