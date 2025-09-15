import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiLogOut, FiUser, FiChevronDown } from "react-icons/fi";

const AdminHeader = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("dashboard")) return "Dashboard";
    if (path.includes("user-management")) return "User Management";
    if (path.includes("role-management")) return "Role Management";
    if (path.includes("user-groups")) return "User Groups";
    if (path.includes("data-upload")) return "CSV/SHP File Upload";
    if (path.includes("data-manager")) return "Data Manager";
    return "Dashboard";
  };

  const handleLogout = () => {
    console.log("Logging out...");
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-[#E0E0E0]">
      <div className="px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-[#222222]">
          {getPageTitle()}
        </h1>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
          >
            <div className="w-10 h-10 bg-[#00519C] rounded-full flex items-center justify-center">
              <FiUser className="text-white text-lg" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-[#222222]">Juan Dela Cruz</p>
              <p className="text-xs font-bold text-[#777777]">Admin</p>
            </div>
            <FiChevronDown
              className={`text-gray-400 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-[#E0E0E0] shadow-sm py-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
              >
                <FiLogOut className="text-[#E90000]" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
