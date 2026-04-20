import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";

import Login from "./appwrite/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Signup from "./appwrite/Signup";
import RegisteredUsersData from "./pages/RegisteredUsersData";
import ProtectedRoute from "./ProtectedRoute";
import "./index.css";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import Services from "./pages/Services";
import FinalData from "./pages/FinalData";
import BookAppoEntry from "./pages/BookAppoEntry";
import LLogin from "./appwrite/LLogin";

const App = () => {
  const [role, setRole] = useState("admin"); // Initialize from localStorage
  const [registrationNumber, setRegistrationNumber] = useState(
    localStorage.getItem("registrationNumber")
  ); // Initialize from localStorage

  useEffect(() => {
    const updateRole = () => setRole("admin");
    const updateRegNumber = () =>
      setRegistrationNumber(localStorage.getItem("registrationNumber"));

    window.addEventListener("storage", updateRole);
    window.addEventListener("storage", updateRegNumber);

    return () => {
      window.removeEventListener("storage", updateRole);
      window.removeEventListener("storage", updateRegNumber);
    };
  }, []);

  const handleLogin = (userRole, regNumber = null) => {
    setRole("admin");
    localStorage.setItem("role", userRole);

    if (regNumber) {
      setRegistrationNumber(regNumber);
      localStorage.setItem("registrationNumber", regNumber);
    }
  };

  return (
    <div>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/finalData" element={<FinalData />} />
          <Route path="/bookAppointment" element={<BookAppoEntry />} />
          <Route path="/llogin" element={<LLogin />} />

          <Route path="/" element={<LLogin />} />
          {/* Login Route */}
          {/* <Route path="/" element={<Login asLogin={handleLogin} />} /> */}
          <Route path="/login" element={<Login asLogin={handleLogin} />} />

          {/* Protected Routes */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route
            path="/user-dashboard"
            element={<UserDashboard registrationNumber={registrationNumber} />}
          />
          <Route
            path="/registered-users-data"
            element={<RegisteredUsersData />}
          />

          {/* Catch-All Redirect */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </div>
  );
};

export default App;
