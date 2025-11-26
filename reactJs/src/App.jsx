import LoginPage from "./pages/Account/LoginPage";
import RegisterPage from "./pages/Account/RegisterPage";
import HomePage from "./pages/HomePage";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import NotFoundPage from "./pages/Others/NotFoundPage";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { PopupProvider } from "./contexts/PopupContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import AdminAccounts from "./pages/Admin/Account/AdminAccounts";
import AdminLayout from "./components/Layout/AdminLayout";
import Layout from "./components/Layout/Layout";
import AdminProducts from "./pages/Admin/Product/AdminProducts";
import CustomerPage from "./pages/Customer/CustomerPage";
import LogoutPage from "./components/LogoutPage";
import AdminInventory from "./pages/Admin/Inventory/AdminInventory";
import ProductDetails from "./pages/Product/ProductDetails";
import CheckoutPage from "./pages/CheckoutPage";
import SearchPage from "./pages/Product/SearchPage";
import AdminOrder from "./pages/Admin/Order/AdminOrder";
import AdminPromotion from "./pages/Admin/Promotion/AdminPromotion";
import AdminDashboard from "./pages/Admin/Dashboard/AdminDasboard";
import PaymentCheck from "./pages/PaymentCheck";
import ScrollToTop from "./components/ScrollToTop";
import AdminDelivery from "./pages/Admin/Delivery/AdminDelivery";
import ChatBox from "./components/ChatBox/ChatBox";
import AdminStaff from "./pages/Admin/Staff/AdminStaff";

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <link rel="icon" type="image/png" href="/shopping-cart.webp" />
      </Helmet>

      <PopupProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <ChatBox />

            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/product/:slug"
                element={
                  <CartProvider>
                    <Layout>
                      <ProductDetails />
                    </Layout>
                  </CartProvider>
                }
              />

              <Route
                path="/"
                element={
                  <CartProvider>
                    <Layout>
                      <HomePage />
                    </Layout>
                  </CartProvider>
                }
              />

              <Route
                path="/search"
                element={
                  <CartProvider>
                    <Layout>
                      <SearchPage />
                    </Layout>
                  </CartProvider>
                }
              />

              {/* Customer */}
              <Route
                path="/customer"
                element={
                  <ProtectedRoute>
                    <CartProvider>
                      <Layout>
                        <CustomerPage />
                      </Layout>
                    </CartProvider>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CartProvider>
                      <Layout>
                        <CheckoutPage />
                      </Layout>
                    </CartProvider>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payment/*"
                element={
                  <ProtectedRoute>
                    <PaymentCheck />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route path="/admin/login" element={<LoginPage />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminOrder />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/deliveries"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminDelivery />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/accounts"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminAccounts />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/staffs"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminStaff />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminProducts />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/promotions"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminPromotion />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/inventory"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminInventory />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/product/:slug"
                element={
                  <ProtectedRoute>
                    <CartProvider>
                      <Layout>
                        <ProductDetails />
                      </Layout>
                    </CartProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              />

              {/* Logout & 404 */}
              <Route path="/logout" element={<LogoutPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </AuthProvider>
      </PopupProvider>
    </HelmetProvider>
  );
}

export default App;
