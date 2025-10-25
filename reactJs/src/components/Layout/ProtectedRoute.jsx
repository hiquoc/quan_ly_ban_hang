import { Navigate, useLocation } from "react-router-dom";
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { username, role } = useContext(AuthContext);
  const location = useLocation();

  const isAuth = !!username;
  const isAdminPath = location.pathname.startsWith("/admin");

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminPath && role === "CUSTOMER") {
    return <Navigate to="/" replace />;
  }

  return children;
}
