import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../App";
import { FiUser, FiMail, FiLock, FiPhone } from "react-icons/fi";

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    contactNo: "",
    tentativeProvince: "",
    tentativeMunicipal: "",
  });
  const [provinces, setProvinces] = useState([]);
  const [municipalitiesByProvince, setMunicipalitiesByProvince] = useState({});
  const [loading, setLoading] = useState(false);

  // ✅ Fetch provinces + municipalities
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/locations`);
        if (res.ok) {
          const data = await res.json();
          setProvinces(data.provinces || []);
          setMunicipalitiesByProvince(data.municipalities || {});
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          contact_no: formData.contactNo,
          provincial_access: null, // official still null
          municipal_access: null, // official still null
          tentative_province: formData.tentativeProvince,
          tentative_municipal: formData.tentativeMunicipal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.detail || "Registration failed");
        return;
      }

      alert("Registered successfully! Please wait for admin approval.");
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
      <div className="w-full max-w-lg bg-white shadow-lg rounded-xl p-8">
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

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="flex items-center border rounded-lg px-3">
              <FiLock className="text-gray-400 mr-2" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="flex-1 py-2 outline-none"
                required
              />
            </div>
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
                required
              />
            </div>
          </div>

          {/* Tentative Province */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Tentative Province
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

          {/* Tentative Municipality */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Tentative Municipality
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
            disabled={loading}
            className="w-full bg-[#00519C] hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <span
              className="text-[#00519C] font-semibold cursor-pointer"
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
