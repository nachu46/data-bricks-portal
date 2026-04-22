// Login.jsx - Premium Design matching your dashboard
import React, { useState } from "react";
import api from "../services/api";
import "../App.css";
import { useToast } from "../components/Toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast, ToastComponent } = useToast();

  const login = async () => {
    try {
      setLoading(true);
      setError("");
      // Use the new /admin/login endpoint
      const res = await api.post("/admin/login", { email, password });

      if (res.data.success) {
        // Store JWT token along with user info
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user", res.data.data.user.email);
        localStorage.setItem("role", res.data.data.user.role);
        window.location.href = "/dashboard";
      } else {
        setError("Invalid email or password");
        showToast("Invalid credentials", "error");
      }
    } catch (error) {
      const msg = error.response?.data?.error || "Login failed. Please check your credentials.";
      setError(msg);
      showToast(msg, "error");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login();
  };

  return (
    <div className="login-container">
      {ToastComponent}
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <span>&gt;biztras</span>
        </div>

        {/* Welcome */}
        <div className="login-welcome">
          <h1>Welcome !</h1>
          <p>Build all the databricks intelligence platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="forgot-password">
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Forgot password flow"); }}>
              Forgot Password ?
            </a>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !email || !password}
          >
            {loading ? <span className="loading-spinner"></span> : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;
