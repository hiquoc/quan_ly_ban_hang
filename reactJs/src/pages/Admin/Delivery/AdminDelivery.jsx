import { useContext, useEffect, useState } from "react"
import { Helmet } from "react-helmet-async"
import { AuthContext } from "../../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import DeliveryManager from "./DeliveryManager"
import ShipperManager from "./ShipperManager"


export default function AdminDelivery() {
    const navigate = useNavigate()
    const { role } = useContext(AuthContext)
    if (role !== "MANAGER" && role !== "ADMIN")
        return navigate(-1)

    const [activeTab, setActiveTab] = useState("DELIVERY");

    const tabs = [
        { key: "DELIVERY", label: "Giao hàng" },
        { key: "SHIPPER", label: "Shipper" }
    ];
    return (
        <>
            <Helmet>
                <title>Giao hàng</title>
            </Helmet>
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
                    {activeTab === "DELIVERY" && <DeliveryManager />}
                    {activeTab === "SHIPPER" && <ShipperManager/>}
                </div>
            </div>
        </>
    );
}