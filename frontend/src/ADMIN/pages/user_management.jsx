import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';
import { Search, Edit2, Check, X, Clock, AlertCircle } from "lucide-react";
import UserModal from "../components/modals/AddUserModal";
import RejectModal from "../components/modals/RejectModal";
import { API_URL } from "../../config";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  // Location mapping
  const [provinceMap, setProvinceMap] = useState({});
  const [municipalityMap, setMunicipalityMap] = useState({});

  // Predefined rejection reasons
  const rejectionReasons = [
    "Province or Municipality chosen by the user is not available in the system",
    "Duplicate account found",
    "Invalid or incomplete information provided",
    "Suspicious registration attempt"
  ];

   const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

const fetchRegistrationRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_URL}/api/admin/registration-requests?status=pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRegistrationRequests(data.requests || []);
      } else {
        const errorText = await res.text();
        console.error("Failed to fetch registration requests:", errorText);
      }
    } catch (err) {
      console.error("Error fetching registration requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error("Error fetching statistics:", err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/locations`);
      if (res.ok) {
        const data = await res.json();

        // Build province code → name map
        const pMap = (data.provinces || []).reduce((acc, p) => {
          acc[p.code] = p.name;
          return acc;
        }, {});
        setProvinceMap(pMap);

        // Build municipal code → name map
        const mMap = {};
        Object.values(data.municipalities || {}).forEach((munis) => {
          munis.forEach((m) => {
            mMap[m.code] = m.name;
          });
        });
        setMunicipalityMap(mMap);
      }
    } catch (err) {
      console.error("Error loading locations:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRegistrationRequests();
    fetchStatistics();
    fetchLocations();
  }, []);

  const handleDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Delete ${selectedRows.length} user(s)?`)) return;

    try {
      const token = localStorage.getItem("access_token");
      for (const user of selectedRows) {
        await fetch(`${API_URL}/api/admin/users/${user.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchUsers();
      setSelectedRows([]);
    } catch (err) {
      console.error("Error deleting users:", err);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = async (userData) => {
    if (!editingUser) return;
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_URL}/api/admin/users/${editingUser.id}/access`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provincial_access: userData.provinceAccess,
          municipal_access: userData.municipalAccess,
        }),
      });
      fetchUsers();
      fetchStatistics();
    } catch (err) {
      console.error("Error updating user:", err);
    } finally {
      setEditingUser(null);
      setShowUserModal(false);
    }
  };

  const handleReviewRequest = async (
    requestId,
    action,
    remarks = "",
    accessOverrides = {}
  ) => {
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        request_id: requestId,
        action: action,
        remarks: remarks || null,
      };

      if (action === "approve") {
        if (accessOverrides.provincial_access !== undefined) {
          payload.provincial_access = accessOverrides.provincial_access;
        }
        if (accessOverrides.municipal_access !== undefined) {
          payload.municipal_access = accessOverrides.municipal_access;
        }
      }

      const res = await fetch(`${API_URL}/api/admin/review-registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      if (res.ok) {
        const data = JSON.parse(responseText);
        alert(data.message || `Registration ${action}d successfully!`);
        fetchUsers();
        fetchRegistrationRequests();
        fetchStatistics();
      } else {
        try {
          const error = JSON.parse(responseText);
          alert(error.detail || `Failed to ${action} registration`);
        } catch {
          alert(`Failed to ${action} registration: ${responseText}`);
        }
      }
    } catch (err) {
      console.error(`Error ${action}ing registration:`, err);
      alert(`Error ${action}ing registration: ${err.message}`);
    }
  };

  const userColumns = [
    {
      name: 'ID',
      selector: row => row.id,
      sortable: true,
      width: '60px',
    },
    {
      name: 'Username',
      selector: row => row.user_name,
      sortable: true,
      width: '120px',
    },
    {
      name: 'Full Name',
      selector: row => `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'N/A',
      sortable: true,
    },
    {
      name: 'Email',
      selector: row => row.email || 'N/A',
      sortable: true,
    },
    {
      name: 'Contact',
      selector: row => row.contact_number || 'N/A',
      width: '120px',
    },
    {
      name: 'Province Access',
      selector: row => row.provincial_access || 'NULL',
      sortable: true,
      cell: row => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.provincial_access ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
        }`}>
          {provinceMap[row.provincial_access] || row.provincial_access || 'Not Set'}
        </span>
      ),
    },
    {
      name: 'Municipal Access',
      selector: row => row.municipal_access || 'NULL',
      sortable: true,
      cell: row => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.municipal_access ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
        }`}>
          {municipalityMap[row.municipal_access] || row.municipal_access || 'Not Set'}
        </span>
      ),
    },
    {
      name: 'Status',
      cell: row => {
        const hasFullAccess = row.provincial_access && row.municipal_access;
        const hasPartialAccess = row.provincial_access || row.municipal_access;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            hasFullAccess 
              ? 'bg-green-100 text-green-800' 
              : hasPartialAccess
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {hasFullAccess ? 'Active' : hasPartialAccess ? 'Partial' : 'Inactive'}
          </span>
        );
      },
      width: '100px',
    },
    {
      name: 'Actions',
      cell: row => (
        <button
          onClick={() => handleEditUser(row)}
          className="p-2 text-gray-400 hover:text-[#00519C] transition-colors"
        >
          <Edit2 size={16} />
        </button>
      ),
      width: '80px',
      ignoreRowClick: true,
    },
  ];

  const requestColumns = [
    {
      name: 'ID',
      selector: row => row.id,
      sortable: true,
      width: '60px',
    },
    {
      name: 'Username',
      selector: row => row.username,
      sortable: true,
      width: '120px',
    },
    {
      name: 'Full Name',
      selector: row => `${row.first_name} ${row.last_name}`,
      sortable: true,
    },
    {
      name: 'Email',
      selector: row => row.email,
      sortable: true,
    },
    {
      name: 'Contact',
      selector: row => row.contact_number || 'N/A',
      width: '120px',
    },
    {
      name: 'Requested Province',
      selector: row => row.requested_provincial_access || 'N/A',
      cell: row => (
        <span className="text-sm font-medium">
          {provinceMap[row.requested_provincial_access] || row.requested_provincial_access || 'None'}
        </span>
      ),
    },
    {
      name: 'Requested Municipal',
      selector: row => row.requested_municipal_access || 'N/A',
      cell: row => (
        <span className="text-sm font-medium">
          {municipalityMap[row.requested_municipal_access] || row.requested_municipal_access || 'None'}
        </span>
      ),
    },
    {
      name: 'Available?',
      selector: row => row.is_available,
      cell: row => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {row.is_available ? "Yes" : "No"}
        </span>
      ),
      sortable: true,
      width: '120px',
    },
    {
      name: 'Request Date',
      selector: row => row.request_date,
      sortable: true,
      cell: row => {
        const date = new Date(row.request_date);
        const daysAgo = row.days_pending;
        return (
          <div>
            <div className="text-sm">{date.toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">{daysAgo} days ago</div>
          </div>
        );
      },
      width: '140px',
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="flex gap-1">
          <button
            onClick={() => {
              const provincial = prompt(
                `Approve provincial access (requested: ${provinceMap[row.requested_provincial_access] || row.requested_provincial_access || 'None'}):`, 
                row.requested_provincial_access || ""
              );
              const municipal = prompt(
                `Approve municipal access (requested: ${municipalityMap[row.requested_municipal_access] || row.requested_municipal_access || 'None'}):`,
                row.requested_municipal_access || ""
              );
              if (provincial !== null || municipal !== null) {
                handleReviewRequest(row.id, 'approve', '', {
                  provincial_access: provincial || row.requested_provincial_access,
                  municipal_access: municipal || row.requested_municipal_access
                });
              }
            }}
            className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors"
            title="Approve"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              const reason = window.prompt(
                `Select rejection reason:\n\n${rejectionReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nOr type your own:`
              );
              if (reason) {
                handleReviewRequest(row.id, 'reject', reason);
              }
            }}
            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors"
            title="Reject"
          >
            <X size={16} />
          </button>
        </div>
      ),
      width: '100px',
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // Filters
  const filteredUsers = users.filter(u =>
    Object.values(u).some(value => 
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const filteredRequests = registrationRequests.filter(r =>
    Object.values(r).some(value => 
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const customStyles = {
    rows: { style: { minHeight: '56px' } },
    headCells: {
      style: {
        paddingLeft: '16px',
        paddingRight: '16px',
        backgroundColor: '#f9fafb',
        fontWeight: '600',
        fontSize: '14px',
        color: '#374151',
      },
    },
    cells: {
      style: {
        paddingLeft: '16px',
        paddingRight: '16px',
        fontSize: '14px',
      },
    },
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        {statistics && (
          <div className="flex gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-blue-600">Total Users: </span>
              <span className="font-semibold text-blue-700">{statistics.users?.total || 0}</span>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-green-600">Active: </span>
              <span className="font-semibold text-green-700">{statistics.users?.with_full_access || 0}</span>
            </div>
            <div className="bg-orange-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-orange-600">Pending: </span>
              <span className="font-semibold text-orange-700">{statistics.registrations?.pending || 0}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "users"
                ? "border-b-2 border-[#00519C] text-[#00519C]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Active Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "requests"
                ? "border-b-2 border-[#00519C] text-[#00519C]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Registration Requests
            {registrationRequests.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                {registrationRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            {activeTab === "users" && selectedRows.length > 0 && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Delete ({selectedRows.length})
              </button>
            )}
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder={activeTab === "users" ? "Search users..." : "Search requests..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00519C] focus:border-transparent"
            />
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          columns={activeTab === "users" ? userColumns : requestColumns}
          data={activeTab === "users" ? filteredUsers : filteredRequests}
          selectableRows={activeTab === "users"}
          onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          progressPending={loading}
          noDataComponent={
            <div className="py-12 text-center">
              {activeTab === "users" ? (
                <div>
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No users found</p>
                  <p className="text-sm text-gray-400">Users will appear here once they register and get approved</p>
                </div>
              ) : (
                <div>
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No pending registration requests</p>
                  <p className="text-sm text-gray-400">New registration requests will appear here</p>
                </div>
              )}
            </div>
          }
          customStyles={customStyles}
          responsive
          striped
          highlightOnHover
        />
      </div>

      {/* Edit Modal */}
      <UserModal
        isVisible={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </div>
  );
};

export default UserManagement;
