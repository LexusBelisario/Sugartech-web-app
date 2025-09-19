import React, { useState, useEffect } from "react";
import "../css_files/animation.css";
import { ArrowLeft, User, ChevronDown } from "lucide-react";
import SuccessModal from "./sucess_modal";
import { API_URL } from "../../../App";

const UserModal = ({ isVisible, onClose, user = null, onSave }) => {
  if (!isVisible) return null;

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalClasses, setModalClasses] = useState(
    isVisible ? "slide-in" : "slide-out"
  );
  const [errors, setErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);

  const isEditMode = !!user;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNo: "",
    provinceAccess: "NULL",
    municipalAccess: "NULL",
  });

  // 🔹 Fetch provinces when modal opens
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/locations/provinces`);
        if (res.ok) {
          const data = await res.json();
          setProvinces(data);
        }
      } catch (err) {
        console.error("Error fetching provinces:", err);
      }
    };
    fetchProvinces();
  }, [isVisible]);

  // 🔹 Fetch municipalities when province changes
  useEffect(() => {
    if (!formData.provinceAccess || formData.provinceAccess === "NULL") {
      setMunicipalities([]);
      return;
    }
    const fetchMunicipalities = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/admin/locations/municipalities?province=${formData.provinceAccess}`
        );
        if (res.ok) {
          const data = await res.json();
          setMunicipalities(data);
        }
      } catch (err) {
        console.error("Error fetching municipalities:", err);
      }
    };
    fetchMunicipalities();
  }, [formData.provinceAccess]);

  // 🔹 Populate form when editing
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.user_name || "",
        email: user.email || "",
        contactNo: user.contact_no || "",
        provinceAccess: user.provincial_access || "NULL",
        municipalAccess: user.municipal_access || "NULL",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "provinceAccess") {
      setFormData((prev) => ({ ...prev, municipalAccess: "NULL" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = "Contact number is required";
    } else if (!/^09\d{9}$/.test(formData.contactNo)) {
      newErrors.contactNo = "Invalid contact number format (09XXXXXXXXX)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const confirmMessage = isEditMode
        ? `Update ${formData.name}'s information?`
        : `Add ${formData.name} as a new user?`;

      if (window.confirm(confirmMessage)) {
        onSave(formData);
        openSuccessModal();
      }
    }
  };

  const openSuccessModal = () => setShowSuccessModal(true);

  const closeSuccessModal = () => {
    setModalClasses("slide-out");
    setTimeout(() => {
      onClose();
      setShowSuccessModal(false);
    }, 490);
  };

  const handleModalBack = () => {
    setModalClasses("slide-out");
    setTimeout(() => onClose(), 490);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-25 flex justify-end z-50 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleModalBack}
      >
        <div
          className={`${modalClasses} flex flex-wrap justify-start px-14 py-12 md:w-5/12 bg-white rounded-s-lg overflow-y-auto no-scrollbar`}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit} className="flex-grow">
            <div
              onClick={handleModalBack}
              className="flex cursor-pointer hover:text-[#00519C] mb-4"
            >
              <ArrowLeft size={24} />
              <span className="font-semibold ml-2">Back</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {isEditMode ? "Edit User" : "Add New User"}
            </h2>
            <p className="text-gray-600 mb-6">
              {isEditMode
                ? "Update user details"
                : "Fill out the form to add a user"}
            </p>

            {/* Avatar placeholder */}
            <div className="flex items-center mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <User size={40} className="text-gray-500" />
              </div>
              <button
                type="button"
                className="ml-4 px-4 py-2 bg-[#00519C] text-white rounded-lg hover:bg-blue-700"
              >
                Upload Avatar
              </button>
            </div>

            {/* Full Name */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full border-2 rounded-lg px-3 py-2 ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full border-2 rounded-lg px-3 py-2 ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Contact */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                name="contactNo"
                value={formData.contactNo}
                onChange={handleChange}
                className={`w-full border-2 rounded-lg px-3 py-2 ${
                  errors.contactNo ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="09XXXXXXXXX"
              />
              {errors.contactNo && (
                <p className="text-red-500 text-sm">{errors.contactNo}</p>
              )}
            </div>

            {/* Province */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-700">
                Province Access
              </label>
              <div className="relative">
                <select
                  name="provinceAccess"
                  value={formData.provinceAccess}
                  onChange={handleChange}
                  className="w-full border-2 rounded-lg px-3 py-2"
                >
                  <option value="NULL">Select Province</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Municipality */}
            <div className="mb-6">
              <label className="block font-semibold text-gray-700">
                Municipal Access
              </label>
              <div className="relative">
                <select
                  name="municipalAccess"
                  value={formData.municipalAccess}
                  onChange={handleChange}
                  className="w-full border-2 rounded-lg px-3 py-2"
                  disabled={formData.provinceAccess === "NULL"}
                >
                  <option value="NULL">Select Municipality</option>
                  {municipalities.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleModalBack}
                className="px-6 py-2 border rounded-lg mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#00519C] text-white rounded-lg"
              >
                {isEditMode ? "Save Changes" : "Add User"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SuccessModal
        isVisible={showSuccessModal}
        onClose={closeSuccessModal}
        text1={isEditMode ? "Successfully updated!" : "Successfully added!"}
        text2={
          isEditMode
            ? "User details have been updated"
            : "New user has been added"
        }
      />
    </>
  );
};

export default UserModal;
