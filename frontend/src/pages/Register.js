import React, { useState } from "react";
import api from "../services/api";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const createUser = async () => {
    try {
      const res = await api.post("/access/register", {
        email,
        password,
        role
      });

      if (res.data.success) {
        alert("User created successfully");
        window.location.href = "/dashboard";
      } else {
        alert("Error creating user");
      }
    } catch (error) {
      alert("Error creating user");
      console.error("Registration error:", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create New User</h2>
      
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <br />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="customer">Customer</option>
        <option value="admin">Admin</option>
      </select>
      <br />
      <br />

      <button onClick={createUser}>Create User</button>
    </div>
  );
}

export default Register;
