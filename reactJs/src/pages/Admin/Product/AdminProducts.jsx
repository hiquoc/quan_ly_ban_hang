import { useState } from "react";
import ProductManager from "./ProductManager";
import CategoryManager from "./CategoryManager";
import BrandManager from "./BrandManger";
import ProductVariantManager from "./ProductVariantManager";
import { Helmet } from "react-helmet-async";


export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState("PRODUCT");

  const tabs = [
    { key: "PRODUCT", label: "Sản phẩm" },
    { key: "VARIANT", label: "Biến thể" },
    { key: "BRAND", label: "Thương hiệu" },
    { key: "CATEGORY", label: "Danh mục" }
  ];

  return (
    <>
      <Helmet>
        <title>
          Sản phẩm</title></Helmet>
      <div className="p-6 bg-white min-h-screen">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 border-b-2 transition ${activeTab === tab.key
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-600 hover:text-blue-500"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Render content */}
        <div>
          {activeTab === "PRODUCT" && <ProductManager />}
          {activeTab === "CATEGORY" && <CategoryManager />}
          {activeTab === "BRAND" && <BrandManager />}
          {activeTab === "VARIANT" && <ProductVariantManager />}
        </div>
      </div></>
  );
}
