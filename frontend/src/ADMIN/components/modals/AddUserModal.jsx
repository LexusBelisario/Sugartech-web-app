import React, { useState, useEffect } from "react";
import "../css_files/animation.css";
import { ArrowLeft, User, ChevronDown } from "lucide-react";
import SuccessModal from "./sucess_modal";

const UserModal = ({ isVisible, onClose, user = null, onSave }) => {
  if (!isVisible) return null;

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalClasses, setModalClasses] = useState(
    isVisible ? "slide-in" : "slide-out"
  );
  const [errors, setErrors] = useState({});

  const isEditMode = !!user;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNo: "",
    provinceAccess: "NULL",
    municipalAccess: "NULL",
  });

  // Province and Municipal data (mock)
  const provinces = ["Rizal", "Laguna", "Cavite", "Bulacan", "NULL"];
  const municipalitiesByProvince = {
    Rizal: ["Binangonan", "Taytay", "Antipolo", "Angono", "Cainta"],
    Laguna: ["San Pedro", "Biñan", "Santa Rosa", "Cabuyao"],
    Cavite: ["Bacoor", "Imus", "Dasmariñas", "General Trias"],
    Bulacan: ["Malolos", "Meycauayan", "San Jose del Monte"],
    NULL: ["NULL"],
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        contactNo: user.contactNo || "",
        provinceAccess: user.provinceAccess || "NULL",
        municipalAccess: user.municipalAccess || "NULL",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Reset municipal when province changes
    if (name === "provinceAccess") {
      setFormData((prev) => ({ ...prev, municipalAccess: "NULL" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

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
        ? `Are you sure you want to update ${formData.name}'s information?`
        : `Are you sure you want to add ${formData.name} as a new user?`;

      if (window.confirm(confirmMessage)) {
        onSave(formData);
        openSuccessModal();
      }
    }
  };

  const openSuccessModal = () => {
    setShowSuccessModal(true);
  };

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
              className="flex cursor-pointer hover:text-[#00519C]"
            >
              <ArrowLeft size={24} />
              <div className="font-semibold text-base ml-2">Back</div>
            </div>

            <div className="flex flex-col pt-5 px-3 text-gray-800">
              <div>
                <p className="font-bold text-2xl py-2">
                  {isEditMode ? "Edit User" : "Add New User"}
                </p>
                <p className="text-sm text-gray-600">
                  Fill out the fields below to {isEditMode ? "edit" : "add"}{" "}
                  user
                </p>
              </div>
            </div>

            <div className="flex py-5 px-3 items-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <User size={40} className="text-gray-500" />
              </div>
              <button
                type="button"
                className="cursor-pointer bg-[#00519C] font-semibold rounded-lg px-5 py-3 text-white text-sm ml-4 hover:bg-blue-700 transition-colors"
              >
                Upload Avatar
              </button>
            </div>

            <div className="px-3 space-y-4">
              <div>
                <p className="font-semibold py-1 text-gray-700">
                  Full Name <span className="text-[#D12D28]">*</span>
                </p>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full rounded-lg border-2 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } py-2 px-3 text-gray-800 focus:outline-none focus:border-[#00519C]`}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="text-[#D12D28] text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <p className="font-semibold py-1 text-gray-700">
                  Email Address <span className="text-[#D12D28]">*</span>
                </p>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full rounded-lg border-2 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } py-2 px-3 text-gray-800 focus:outline-none focus:border-[#00519C]`}
                  placeholder="example@email.com"
                />
                {errors.email && (
                  <p className="text-[#D12D28] text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <p className="font-semibold py-1 text-gray-700">
                  Contact Number <span className="text-[#D12D28]">*</span>
                </p>
                <input
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  className={`w-full rounded-lg border-2 ${
                    errors.contactNo ? "border-red-500" : "border-gray-300"
                  } py-2 px-3 text-gray-800 focus:outline-none focus:border-[#00519C]`}
                  placeholder="09XXXXXXXXX"
                />
                {errors.contactNo && (
                  <p className="text-[#D12D28] text-sm mt-1">
                    {errors.contactNo}
                  </p>
                )}
              </div>

              <div>
                <p className="font-semibold py-1 text-gray-700">
                  Province Access
                </p>
                <div className="relative">
                  <select
                    name="provinceAccess"
                    value={formData.provinceAccess}
                    onChange={handleChange}
                    className="w-full rounded-lg border-2 border-gray-300 py-2 px-3 text-gray-800 focus:outline-none focus:border-[#00519C] appearance-none"
                  >
                    {provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={20}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <p className="font-semibold py-1 text-gray-700">
                  Municipal Access
                </p>
                <div className="relative">
                  <select
                    name="municipalAccess"
                    value={formData.municipalAccess}
                    onChange={handleChange}
                    className="w-full rounded-lg border-2 border-gray-300 py-2 px-3 text-gray-800 focus:outline-none focus:border-[#00519C] appearance-none"
                    disabled={formData.provinceAccess === "NULL"}
                  >
                    {(
                      municipalitiesByProvince[formData.provinceAccess] || [
                        "NULL",
                      ]
                    ).map((municipality) => (
                      <option key={municipality} value={municipality}>
                        {municipality}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={20}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-12 px-3">
              <button
                type="button"
                onClick={handleModalBack}
                className="bg-white hover:bg-gray-100 font-semibold rounded-lg px-10 py-3 mr-2 text-gray-700 text-base border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#00519C] hover:bg-blue-700 font-semibold rounded-lg px-10 py-3 text-white text-base transition-colors"
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
