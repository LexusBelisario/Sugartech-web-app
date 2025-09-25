import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff } from "react-icons/fi";

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",  // NEW
    contactNo: "",
    tentativeProvince: "",
    tentativeMunicipal: "",
  });
  const [provinces, setProvinces] = useState([]);
  const [municipalitiesByProvince, setMunicipalitiesByProvince] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);  // NEW
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);  // NEW
  const [passwordError, setPasswordError] = useState("");  // NEW

useEffect(() => {
  const fetchLocations = async () => {
    try {
      // Use the admin locations endpoint (no auth required)
      const res = await fetch(`${API_URL}/api/admin/locations`);
      console.log("Fetching locations from:", `${API_URL}/api/admin/locations`);
      
      if (res.ok) {
        const data = await res.json();
        console.log("Locations data:", data);
        setProvinces(data.provinces || []);
        setMunicipalitiesByProvince(data.municipalities || {});
      } else {
        console.error("Failed to fetch locations:", res.status, res.statusText);
      }
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };
  fetchLocations();
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Reset municipal if province changes
    if (name === "tentativeProvince") {
      setFormData((prev) => ({ ...prev, tentativeMunicipal: "" }));
    }

    // Check password match
    if (name === "confirmPassword" || name === "password") {
      if (name === "confirmPassword") {
        setPasswordError(value !== formData.password ? "Passwords do not match" : "");
      } else if (name === "password" && formData.confirmPassword) {
        setPasswordError(value !== formData.confirmPassword ? "Passwords do not match" : "");
      }
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  // Debug log to see what we're sending
  const requestData = {
    username: formData.username,
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    password: formData.password,
    contact_number: formData.contactNo,
    requested_provincial_access: formData.tentativeProvince,
    requested_municipal_access: formData.tentativeMunicipal,
  };
  
  console.log("Sending registration data:", requestData);

  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    const data = await res.json();
    console.log("Registration response:", data);
    
    if (!res.ok) {
      alert(data?.detail || "Registration failed");
      return;
    }

    alert("Registration request submitted! Please wait for admin approval.");
    navigate("/login");
  } catch (err) {
    console.error("Registration error:", err);
    alert("Failed to register. Try again later.");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-xl p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center text-[#00519C] mb-6">
          Create an Account
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Username */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Username
            </label>
            <div className="flex items-center border rounded-lg px-3">
              <FiUser className="text-gray-400 mr-2" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
            </div>
          </div>

          {/* First Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              First Name
            </label>
            <div className="flex items-center border rounded-lg px-3">
              <FiUser className="text-gray-400 mr-2" />
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Last Name
            </label>
            <div className="flex items-center border rounded-lg px-3">
              <FiUser className="text-gray-400 mr-2" />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <div className="flex items-center border rounded-lg px-3">
              <FiMail className="text-gray-400 mr-2" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
            </div>
          </div>

          {/* Password - UPDATED */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="flex items-center border rounded-lg px-3">
              <FiLock className="text-gray-400 mr-2" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          {/* Confirm Password - NEW */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Confirm Password
            </label>
            <div className={`flex items-center border rounded-lg px-3 ${passwordError ? 'border-red-500' : ''}`}>
              <FiLock className="text-gray-400 mr-2" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-500 mt-1">{passwordError}</p>
            )}
          </div>

          {/* Contact No. */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Contact Number
            </label>
            <div className="flex items-center border rounded-lg px-3">
              <FiPhone className="text-gray-400 mr-2" />
              <input
                type="text"
                name="contactNo"
                value={formData.contactNo}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                placeholder="09XXXXXXXXX"
              />
            </div>
          </div>

          {/* Requested Province */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Requested Province Access
            </label>
            <select
              name="tentativeProvince"
              value={formData.tentativeProvince}
              onChange={handleChange}
              className="w-full border rounded-lg py-2 px-3"
            >
              <option value="">Select Province</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Municipality */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Requested Municipality Access
            </label>
            <select
              name="tentativeMunicipal"
              value={formData.tentativeMunicipal}
              onChange={handleChange}
              className="w-full border rounded-lg py-2 px-3"
              disabled={!formData.tentativeProvince}
            >
              <option value="">Select Municipality</option>
              {municipalitiesByProvince[formData.tentativeProvince]?.map(
                (m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || passwordError}
            className={`w-full font-bold py-3 rounded-lg transition ${
              loading || passwordError
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#00519C] hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? "Submitting..." : "Submit Registration Request"}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <span
              className="text-[#00519C] font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Login
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;