// src/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLoggedIn } from "./utils/auth";

const ProtectedRoute = () => {
  const location = useLocation();
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/llogin"
        replace
        state={{ from: location }}
      />
    );
  }
  return <Outlet />;
};

export default ProtectedRoute;
