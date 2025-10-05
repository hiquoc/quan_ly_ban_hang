import LoginPage from "./pages/Account/LoginPage";
import RegisterPage from "./pages/Account/RegisterPage";
import HomePage from "./pages/HomePage";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import NotFoundPage from "./pages/Others/NotFoundPage";
import { AuthProvider } from "./contexts/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminAccounts from "./pages/Admin/Account/AdminAccounts";
import AdminLayout from "./components/Layout/AdminLayout";
import Layout from "./components/Layout/Layout"
import AdminProducts from "./pages/Admin/Product/AdminProducts";
import CustomerPage from "./pages/Customer/CustomerPage";
import LogoutPage from "./components/LogoutPage";
import AdminInventory from "./pages/Admin/Inventory/AdminInventory"
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={
            <RegisterPage />
          } />
          <Route path="/" element={
            <Layout>
              <HomePage></HomePage>
            </Layout>
          }></Route>
          <Route path="/customer" element={
            <ProtectedRoute>
              <Layout>
                <CustomerPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/login" element={<LoginPage />} />

          <Route path="/admin/register" element={
            <ProtectedRoute>
              <AdminLayout>
                <RegisterPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/accounts" element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminAccounts />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminProducts />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminInventory />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout>
                <HomePage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/logout" element={<LogoutPage />} />
          <Route path="*" element={
            <NotFoundPage />
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
