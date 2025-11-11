import { useState } from "react";
import SupplierManager from "./SupplierManager";
import WarehouseManager from "./WarehouseManager";
import PurchaseOrderManager from "./PurchaseOrderManager";
import InventoryManager from "./InventoryManager";
import InventoryTransactionManager from "./InventoryTransactionManager";
import { Helmet } from "react-helmet-async";
export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("INVENTORY");

  const tabs = [
    { key: "INVENTORY", label: "Kho hàng" },
    { key: "TRANSACTION", label: "Phiếu kho" },
    { key: "ORDER", label: "Đơn mua" },
    { key: "WAREHOUSE", label: "Kho" },
    { key: "SUPPLIER", label: "Nhà cung cấp" }
  ];

  return (
    <>
      <Helmet>
        <title>Kho hàng</title></Helmet>
      <div className="p-6 bg-white min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Quản lý kho hàng</h2>
        </div>

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
          {activeTab === "INVENTORY" && <InventoryManager />}
          {activeTab === "TRANSACTION" && <InventoryTransactionManager />}
          {activeTab === "ORDER" && <PurchaseOrderManager />}
          {activeTab === "WAREHOUSE" && <WarehouseManager />}
          {activeTab === "SUPPLIER" && <SupplierManager />}
        </div>
      </div></>

  );
}
