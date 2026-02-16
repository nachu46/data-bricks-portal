import React, { useState } from "react";
import api from "../services/api";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const createUser = async () => {
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
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create New User</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <select onChange={(e) => setRole(e.target.value)}>
        <option value="customer">Customer</option>
        <option value="admin">Admin</option>
      </select>

      <br /><br />

      <button onClick={createUser}>Create User</button>
    </div>
  );
}

export default Register;
