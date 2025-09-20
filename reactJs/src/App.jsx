import LoginPage from "./pages/Account/LoginPage";
import RegisterPage from "./pages/Account/RegisterPage";
import HomePage from "./pages/HomePage"
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFoundPage from "./pages/Others/NotFoundPage";
import { AuthProvider } from "./contexts/AuthContext";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout />
        <Routes>
          <Route path="/login" element={<LoginPage />}></Route>
          <Route path="/register" element={<RegisterPage />}></Route>
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage></HomePage>
            </ProtectedRoute>
          }></Route>
          <Route path="*" element={<NotFoundPage />}></Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
function Layout() {
  const location = useLocation();
  const noNavbarPages = ["/login", "/register"]
  const showNavbar = !noNavbarPages.includes(location.pathname);
  return <>
    {showNavbar && <Navbar></Navbar>}
  </>
}

export default App
