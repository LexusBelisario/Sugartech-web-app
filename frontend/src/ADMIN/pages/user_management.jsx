import React, { useState } from "react";
import { Search, Edit2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import UserModal from "../components/modals/AddUserModal";

const UserManagement = () => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Mock data for users
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Lexus John H. Belisario",
      email: "lexusbelisario@gmail.com",
      contactNo: "09562245433",
      provinceAccess: "Rizal",
      municipalAccess: "Binangonan",
    },
    {
      id: 2,
      name: "Randy K. Orton",
      email: "randalkeilh@gmail.com",
      contactNo: "09273232228",
      provinceAccess: "Rizal",
      municipalAccess: "Taytay",
    },
    {
      id: 3,
      name: "John F. Cena",
      email: "johnfelixcena@gmail.com",
      contactNo: "09228531345",
      provinceAccess: "NULL",
      municipalAccess: "NULL",
    },
    {
      id: 4,
      name: "Nerdy C. Belisario",
      email: "nerdynerdy@gmail.com",
      contactNo: "09813462012",
      provinceAccess: "Rizal",
      municipalAccess: "Antipolo",
    },
    {
      id: 5,
      name: "Jennifer Anne M. Cardano",
      email: "jamcardano19@gmail.com",
      contactNo: "09487624992",
      provinceAccess: "Rizal",
      municipalAccess: "Angono",
    },
  ]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleDelete = () => {
    if (selectedUsers.length > 0) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${selectedUsers.length} user(s)?`
      );
      if (confirmDelete) {
        setUsers(users.filter((user) => !selectedUsers.includes(user.id)));
        setSelectedUsers([]);
      }
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = (userData) => {
    if (editingUser) {
      // Update existing user
      setUsers(
        users.map((user) =>
          user.id === editingUser.id ? { ...user, ...userData } : user
        )
      );
    } else {
      // Add new user
      const newUser = {
        id: Math.max(...users.map((u) => u.id)) + 1,
        ...userData,
      };
      setUsers([...users, newUser]);
    }
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contactNo.includes(searchTerm) ||
      user.provinceAccess.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.municipalAccess.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === "NULL") return 1;
    if (bValue === "NULL") return -1;

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Users</h2>
            <button
              onClick={handleDelete}
              disabled={selectedUsers.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedUsers.length > 0
                  ? "bg-[#4B1F60] text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Delete
            </button>
            <button
              onClick={handleAddUser}
              className="px-4 py-2 bg-[#00519C] text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add User
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00519C] focus:border-transparent"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.length === users.length && users.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#00519C] focus:ring-[#00519C]"
                  />
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("id")}
                    className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    Id
                    {sortConfig.key === "id" &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("name")}
                    className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    Name
                    {sortConfig.key === "name" &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("email")}
                    className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    Email
                    {sortConfig.key === "email" &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("contactNo")}
                    className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    Contact No.
                    {sortConfig.key === "contactNo" &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("provinceAccess")}
                    className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    Province_Access
                    {sortConfig.key === "provinceAccess" &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("municipalAccess")}
                    className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    Municipal_Access
                    {sortConfig.key === "municipalAccess" &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </button>
                </th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#00519C] focus:ring-[#00519C]"
                    />
                  </td>
                  <td className="p-4 text-gray-700">{user.id}</td>
                  <td className="p-4 text-gray-700">{user.name}</td>
                  <td className="p-4 text-gray-700">{user.email}</td>
                  <td className="p-4 text-gray-700">{user.contactNo}</td>
                  <td className="p-4 text-gray-700">
                    <span
                      className={
                        user.provinceAccess === "NULL" ? "text-gray-400" : ""
                      }
                    >
                      {user.provinceAccess}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700">
                    <span
                      className={
                        user.municipalAccess === "NULL" ? "text-gray-400" : ""
                      }
                    >
                      {user.municipalAccess}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-gray-400 hover:text-[#00519C] transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>

        {/* Pagination (placeholder) */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {sortedUsers.length} of {users.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Previous
            </button>
            <button className="px-3 py-1 bg-[#00519C] text-white rounded-lg">
              1
            </button>
            <button
              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isVisible={showUserModal}
        onClose={handleCloseModal}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </div>
  );
};

export default UserManagement;
