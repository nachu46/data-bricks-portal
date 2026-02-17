import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Dashboard() {

  const navigate = useNavigate();

  const role = localStorage.getItem("role");
  const user = localStorage.getItem("user");
  const department = localStorage.getItem("department");

  const [accessLinks, setAccessLinks] = useState([]);

  // Load access links when dashboard opens
  useEffect(() => {

    if (user) {
      loadAccessLinks();
    }

  }, []);

  // Fetch approved access policies
  const loadAccessLinks = async () => {

    try {

      const res = await api.get(`/access/my-access-links/${user}`);

      if (res.data.result && res.data.result.data_array) {

        setAccessLinks(res.data.result.data_array);

      }

    } catch (error) {

      console.log("Error loading access links:", error);

    }

  };

  const logout = () => {

    localStorage.clear();
    navigate("/");

  };

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

          {/* USER INFO */}

          <div className="section-box">

            <h2>Welcome, {user}</h2>

            <div className="info-row">
              <span><strong>Role:</strong></span>
              <span>{role}</span>
            </div>

            {department && (

              <div className="info-row">
                <span><strong>Department:</strong></span>
                <span>{department}</span>
              </div>

            )}

          </div>

          {/* ================= ACCESS LINKS SECTION ================= */}

          <div className="section-box">

            <h3>My Data Access</h3>

            {accessLinks.length === 0 && (

              <p>No access granted yet. Request access from admin.</p>

            )}

            {accessLinks.map((link, index) => {

              const catalog = link[0];
              const schema = link[1];
              const table = link[2];

              const databricksLink =
                `https://dbc-6c5e2a27-b2cf.cloud.databricks.com/explore/data/${catalog}/${schema}/${table}`;

              return (

                <div key={index} className="info-row">

                  <span>
                    {catalog}.{schema}.{table}
                  </span>

                  <a
                    href={databricksLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-btn"
                    style={{ marginLeft: "15px" }}
                  >
                    Open
                  </a>

                </div>

              );

            })}

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

          {/* FOOTER */}

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
