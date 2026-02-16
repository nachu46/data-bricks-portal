import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

function Dashboard() {
  const navigate = useNavigate();

  const role = localStorage.getItem("role");
  const user = localStorage.getItem("user");
  const department = localStorage.getItem("department");

  const [recentApprovals, setRecentApprovals] = useState([]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Fetch recent approvals for admin
  useEffect(() => {
    if (role === "admin") {
      axios
        .get("http://localhost:5000/api/access/recent-approvals")
        .then((res) => {
          if (res.data.result && res.data.result.data_array) {
            setRecentApprovals(res.data.result.data_array);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [role]);

  return (
    <div className="outer-wrapper">
      <div className="dashboard-box">

        {/* ================= SIDEBAR ================= */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Access Portal</h3>
          </div>

          <div className="menu-item active">🏠 Dashboard</div>

          {/* CUSTOMER MENU */}
          {role === "customer" && (
            <>
              <Link to="/request" className="menu-link">
                <div className="menu-item">📄 Request Access</div>
              </Link>

              <Link to="/myrequests" className="menu-link">
                <div className="menu-item">📋 My Requests</div>
              </Link>
            </>
          )}

          {/* ADMIN MENU */}
          {role === "admin" && (
            <>
              <Link to="/approvals" className="menu-link">
                <div className="menu-item">✔ Approve Requests</div>
              </Link>

              <Link to="/policies" className="menu-link">
                <div className="menu-item">🛡 Manage Policies</div>
              </Link>

              <Link to="/users" className="menu-link">
                <div className="menu-item">👥 Manage Users</div>
              </Link>

              <Link to="/register" className="menu-link">
                <div className="menu-item">➕ Register User</div>
              </Link>

              <Link to="/audit" className="menu-link">
                <div className="menu-item">📊 Audit Logs</div>
              </Link>
            </>
          )}
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="content">

          {/* TOP BAR */}
          <div className="topbar">
            <div className="profile">
              <strong>{user}</strong>
            </div>
          </div>

          {/* USER INFO SECTION */}
          <div className="section-box">
            <h2>Welcome, {user}</h2>

            <p><strong>Role:</strong> {role}</p>

            {department && (
              <p><strong>Department:</strong> {department}</p>
            )}
          </div>

          {/* QUICK ACTIONS */}
          <div className="section-box">
            <h3>Quick Actions</h3>

            <div className="quick-links">

              {role === "customer" && (
                <>
                  <Link to="/request" className="quick-btn">
                    Request Access
                  </Link>

                  <Link to="/myrequests" className="quick-btn">
                    View My Requests
                  </Link>
                </>
              )}

              {role === "admin" && (
                <>
                  <Link to="/approvals" className="quick-btn">
                    Approve Requests
                  </Link>

                  <Link to="/policies" className="quick-btn">
                    Manage Policies
                  </Link>

                  <Link to="/users" className="quick-btn">
                    Manage Users
                  </Link>

                  <Link to="/register" className="quick-btn">
                    Register User
                  </Link>

                  <Link to="/audit" className="quick-btn">
                    Audit Logs
                  </Link>
                </>
              )}

            </div>
          </div>

          {/* RECENT APPROVALS (ADMIN ONLY) */}
          {role === "admin" && (
            <div className="section-box">
              <h3>Recent Approvals</h3>

              {recentApprovals.length === 0 ? (
                <p>No recent approvals found.</p>
              ) : (
                <table className="approval-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Schema</th>
                      <th>Table</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApprovals.map((item, index) => (
                      <tr key={index}>
                        <td>{item[0]}</td>
                        <td>{item[2]}</td>
                        <td>{item[3]}</td>
                        <td>{item[5]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* FOOTER BUTTONS */}
          <div className="bottom-buttons">
            <button className="back-btn" onClick={() => navigate(-1)}>
              ⬅ Back
            </button>

            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
