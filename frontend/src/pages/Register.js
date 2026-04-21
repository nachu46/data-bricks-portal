// Register.jsx - Premium White Theme User Registration
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const createUser = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.post("/access/register", {
        email,
        password,
        role
      }, {
        headers: {
          role: localStorage.getItem("role"),
          user: localStorage.getItem("user"),
        }
      });

      if (res.data.success) {
        showToast("User created successfully!");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setError("Error creating user");
      }
    } catch (error) {
      setError("Error creating user");
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }
    createUser();
  };

  return (
    <div className="register-container-white">
      {/* Inline Toast */}
      {toast && (
        <div className={`inline-toast-white toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="register-card-white">
        {/* Back Button */}
        <button
          className="back-btn-white floating"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {/* Header */}
        <div className="register-header">
          <h1>Create New User</h1>
          <p>Admin panel for user management</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message-white">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group-white">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group-white">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group-white">
            <label>Role</label>
            <div className="select-wrapper">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="register-btn-white"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <span className="spinner-white-small"></span>
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
