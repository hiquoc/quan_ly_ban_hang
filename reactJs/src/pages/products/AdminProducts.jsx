import React from "react";

const products = [
  { id: 1, code: "SP001", name: "Táo Mỹ", category: "Trái cây", brand: "FruitLand", price: "50.000đ", stock: 120, status: "ACTIVE", image: "https://via.placeholder.com/80" },
  { id: 2, code: "SP002", name: "Cam Sành", category: "Trái cây", brand: "OranFresh", price: "40.000đ", stock: 80, status: "ACTIVE", image: "https://via.placeholder.com/80" },
];

export default function AdminProducts() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Quản lý sản phẩm</h1>
      <div className="mb-4 flex justify-between">
        <input type="text" placeholder="Tìm sản phẩm..." className="border p-2 rounded w-1/3" />
        <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          + Thêm sản phẩm
        </button>
      </div>
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2">Ảnh</th>
            <th className="p-2">Mã SP</th>
            <th className="p-2">Tên sản phẩm</th>
            <th className="p-2">Danh mục</th>
            <th className="p-2">Thương hiệu</th>
            <th className="p-2">Giá</th>
            <th className="p-2">Tồn kho</th>
            <th className="p-2">Trạng thái</th>
            <th className="p-2">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-t hover:bg-gray-50">
              <td className="p-2"><img src={p.image} alt={p.name} className="w-16 h-16" /></td>
              <td className="p-2">{p.code}</td>
              <td className="p-2 font-medium">{p.name}</td>
              <td className="p-2">{p.category}</td>
              <td className="p-2">{p.brand}</td>
              <td className="p-2">{p.price}</td>
              <td className="p-2">{p.stock}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-white ${p.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"}`}>
                  {p.status}
                </span>
              </td>
              <td className="p-2 space-x-2">
                <button className="text-blue-600 hover:underline">Sửa</button>
                <button className="text-red-600 hover:underline">Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
