import { useState } from "react";
import ProductManager from "./ProductManager";
import CategoryManager from "./CategoryManager";
import BrandManager from "./BrandManger";
import ProductVariantManager from "./ProductVariantManager";


export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState("PRODUCT");

  const tabs = [
    { key: "PRODUCT", label: "Sản phẩm" },
    { key: "VARIANT", label: "Biến thể" },
    { key: "BRAND", label: "Thương hiệu" },
    { key: "CATEGORY", label: "Danh mục" }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Quản lý sản phẩm</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 border-b-2 transition ${
              activeTab === tab.key
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
    </div>
  );
}
