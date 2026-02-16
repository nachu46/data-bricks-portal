import React, { useState } from "react";
import api from "../services/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await api.post("/access/login", {
        email,
        password
      });

      if (res.data.success) {
        localStorage.setItem("user", res.data.email);
        localStorage.setItem("role", res.data.role);

        window.location.href = "/dashboard";
      } else {
        alert("Invalid email or password");
      }
    } catch (error) {
      alert("Login error");
      console.log(error);
    }
  };

  // Styling to approximate the image layout
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f7fa",
    fontFamily: "sans-serif"
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    width: "360px",
    maxWidth: "90%"
  };

  const headerStyle = {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "4px",
    color: "#1e293b"
  };

  const subHeaderStyle = {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "24px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "16px"
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "4px",
    display: "block"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    marginBottom: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "#f8fafc"
  };

  const forgotStyle = {
    textAlign: "right",
    marginBottom: "24px"
  };

  const forgotLinkStyle = {
    fontSize: "12px",
    color: "#3b82f6",
    textDecoration: "none",
    cursor: "pointer"
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "16px"
  };

  const createAccountStyle = {
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b"
  };

  const createAccountLinkStyle = {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "600",
    marginLeft: "4px",
    cursor: "pointer"
  };

  const biztrasStyle = {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px",
    marginBottom: "20px",
    textAlign: "center"
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* biztras header as per image */}
        <div style={biztrasStyle}>&gt;biztras</div>

        {/* Welcome text from image */}
        <h2 style={headerStyle}>Welcome !</h2>
        <div style={subHeaderStyle}>Build all the databricks intelligence platform</div>

        {/* Email field with label from image */}
        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          placeholder="Enter your email id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password field with label from image */}
        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Forgot password link as per image */}
        <div style={forgotStyle}>
          <span style={forgotLinkStyle} onClick={() => alert("Forgot password flow")}>
            Forgot Password ?
          </span>
        </div>

        {/* Sign in button as per image */}
        <button style={buttonStyle} onClick={login}>
          Sign in
        </button>

        Create account link as per image
        <div style={createAccountStyle}>
          <span style={createAccountLinkStyle} onClick={() => alert("Create account flow")}>
            Create Account
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;