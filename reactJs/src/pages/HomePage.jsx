import React from "react";

const products = [
  { id: 1, name: "Táo", price: "50.000đ", image: "https://via.placeholder.com/150" },
  { id: 2, name: "Cam", price: "40.000đ", image: "https://via.placeholder.com/150" },
  { id: 3, name: "Chuối", price: "30.000đ", image: "https://via.placeholder.com/150" },
  { id: 4, name: "Dưa hấu", price: "60.000đ", image: "https://via.placeholder.com/150" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-green-600 text-white p-4">
        <h1 className="text-2xl font-bold">Cửa hàng trái cây</h1>
      </header>

      {/* Navbar */}
      <nav className="bg-green-100 p-2 flex justify-center gap-4">
        <a href="/" className="text-green-800 hover:underline">Trang chủ</a>
        <a href="/products" className="text-green-800 hover:underline">Sản phẩm</a>
        <a href="/cart" className="text-green-800 hover:underline">Giỏ hàng</a>
        <a href="/contact" className="text-green-800 hover:underline">Liên hệ</a>
      </nav>

      {/* Product Grid */}
      <main className="flex-1 p-6 bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Sản phẩm nổi bật</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white shadow rounded p-4 flex flex-col items-center">
              <img src={product.image} alt={product.name} className="w-32 h-32 object-cover mb-2" />
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-green-700 font-semibold">{product.price}</p>
              <button className="mt-2 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">
                Thêm vào giỏ
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-green-600 text-white text-center p-4">
        © 2025 Cửa hàng trái cây. All rights reserved.
      </footer>
    </div>
  );
}
