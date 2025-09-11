import React from "react";
import { FiUsers, FiMapPin, FiActivity, FiFileText } from "react-icons/fi";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AdminDashboard = () => {
  // Mock data for charts
  const activityData = [
    { name: "Mon", users: 45, uploads: 12 },
    { name: "Tue", users: 52, uploads: 15 },
    { name: "Wed", users: 48, uploads: 18 },
    { name: "Thu", users: 65, uploads: 22 },
    { name: "Fri", users: 58, uploads: 16 },
    { name: "Sat", users: 32, uploads: 8 },
    { name: "Sun", users: 28, uploads: 5 },
  ];

  const dataTypeDistribution = [
    { name: "Shapefiles", value: 45, color: "#00519C" },
    { name: "CSV Files", value: 30, color: "#4B1F60" },
    { name: "GeoJSON", value: 15, color: "#F7C800" },
    { name: "Others", value: 10, color: "#666666" },
  ];

  const recentActivities = [
    {
      id: 1,
      user: "Maria Santos",
      action: "Uploaded new boundary shapefile",
      time: "2 hours ago",
      type: "upload",
    },
    {
      id: 2,
      user: "Jose Rizal",
      action: "Updated user permissions",
      time: "3 hours ago",
      type: "permission",
    },
    {
      id: 3,
      user: "Anna Reyes",
      action: "Created new user group",
      time: "5 hours ago",
      type: "group",
    },
    {
      id: 4,
      user: "Pedro Cruz",
      action: "Modified land use data",
      time: "8 hours ago",
      type: "edit",
    },
  ];

  const stats = [
    {
      title: "Total Users",
      value: "1,245",
      change: "+12%",
      icon: FiUsers,
      color: "bg-[#00519C]",
    },
    {
      title: "Map Layers",
      value: "48",
      change: "+5%",
      icon: FiMapPin,
      color: "bg-[#4B1F60]",
    },
    {
      title: "Active Sessions",
      value: "89",
      change: "+18%",
      icon: FiActivity,
      color: "bg-[#F7C800]",
    },
    {
      title: "Total Uploads",
      value: "2,456",
      change: "+23%",
      icon: FiFileText,
      color: "bg-[#D12D28]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  {stat.value}
                </h3>
                <p className="text-sm mt-2">
                  <span className="text-green-600 font-medium">
                    {stat.change}
                  </span>
                  <span className="text-gray-500"> from last month</span>
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white text-2xl" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="name" tick={{ fill: "#666" }} />
              <YAxis tick={{ fill: "#666" }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stackId="1"
                stroke="#00519C"
                fill="#00519C"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="uploads"
                stackId="1"
                stroke="#4B1F60"
                fill="#4B1F60"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#00519C] rounded-full"></div>
              <span className="text-sm text-gray-600">Active Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#4B1F60] rounded-full"></div>
              <span className="text-sm text-gray-600">File Uploads</span>
            </div>
          </div>
        </div>

        {/* Data Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Data Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dataTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {dataTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {dataTypeDistribution.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Activities
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  User
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Time
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#00519C] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {activity.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {activity.user}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {activity.action}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {activity.time}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.type === "upload"
                          ? "bg-green-100 text-green-800"
                          : activity.type === "permission"
                          ? "bg-blue-100 text-blue-800"
                          : activity.type === "group"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {activity.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Server Status
          </h4>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">
              All systems operational
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">CPU Usage</span>
              <span className="font-medium text-gray-800">45%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#00519C] h-2 rounded-full"
                style={{ width: "45%" }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Storage Used
          </h4>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-800">67.8</span>
            <span className="text-sm text-gray-600">GB of 100 GB</span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#F7C800] h-2 rounded-full"
                style={{ width: "67.8%" }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Active Connections
          </h4>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-800">89</span>
            <span className="text-sm text-gray-600">users online</span>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500">Peak today: 145 users</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
