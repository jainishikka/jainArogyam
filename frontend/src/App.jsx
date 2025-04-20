import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";

import LLogin              from "./appwrite/LLogin";
import Signup              from "./appwrite/Signup";
import FinalData           from "./pages/FinalData";
import BookAppoEntry       from "./pages/BookAppoEntry";

import AdminDashboard      from "./pages/AdminDashboard";
import UserDashboard       from "./pages/UserDashboard";
import RegisteredUsersData from "./pages/RegisteredUsersData";
import Login from "./appwrite/Login";

import ProtectedRoute      from "./ProtectedRoute";
import "./index.css";

function App() {
  // Ensure registrationNumber is at least an empty string
//   const registrationNumber = localStorage.getItem("registrationNumber") || "";
  const [role, setRole] = useState("admin"); // Initialize from localStorage
      const [registrationNumber, setRegistrationNumber] = useState(localStorage.getItem("registrationNumber")); // Initialize from localStorage
  

  const handleLogin = (userRole, regNumber = null) => {
    setRole("admin");
    localStorage.setItem("role", userRole);

    if (regNumber) {
        setRegistrationNumber(regNumber);
        localStorage.setItem("registrationNumber", regNumber);
    }
};

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/llogin"          element={<LLogin />} />

        {/* Protected block */}
        <Route element={<ProtectedRoute />}>
        <Route path="/signup"          element={<Signup />} />
          <Route path="/admin-dashboard"       element={<AdminDashboard />} />
          <Route path="/finalData"       element={<FinalData />} />
        <Route path="/login" element={<Login asLogin={handleLogin} />} />
        <Route path="/bookAppointment" element={<BookAppoEntry />} />
          <Route
            path="/user-dashboard"
            element={<UserDashboard registrationNumber={registrationNumber} />}
          />
          <Route
            path="/registered-users-data"
            element={<RegisteredUsersData />}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/llogin" replace />} />
      </Routes>

      <ToastContainer />
    </>
  );
}

export default App;