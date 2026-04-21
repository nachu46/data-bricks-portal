import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RequestAccess from "./pages/RequestAccess";
import Approvals from "./pages/Approvals";
import AuditLogs from "./pages/AuditLogs";
import MyRequests from "./pages/MyRequests";
import Register from "./pages/Register";
import UserList from "./pages/UserList";
import Policies from "./pages/Policies";
import ProtectedRoute from "./components/ProtectedRoute";
import DataAccess from "./pages/DataAccess";
import AdminAssignAccess from "./pages/AdminAssignAccess";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/request" element={
          <ProtectedRoute allowedRole="customer">
            <RequestAccess />
          </ProtectedRoute>
        } />

        <Route path="/myrequests" element={
          <ProtectedRoute allowedRole="customer">
            <MyRequests />
          </ProtectedRoute>
        } />

        <Route path="/approvals" element={
          <ProtectedRoute allowedRole="admin">
            <Approvals />
          </ProtectedRoute>
        } />

        <Route path="/audit" element={
          <ProtectedRoute allowedRole="admin">
            <AuditLogs />
          </ProtectedRoute>
        } />

        <Route path="/register" element={
          <ProtectedRoute allowedRole="admin">
            <Register />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute allowedRole="admin">
            <UserList />
          </ProtectedRoute>
        } />

        <Route path="/policies" element={
          <ProtectedRoute allowedRole="admin">
            <Policies />
          </ProtectedRoute>
        } />

        {/* Bug 9 Fixed: Now protected */}
        <Route path="/data-access" element={
          <ProtectedRoute>
            <DataAccess />
          </ProtectedRoute>
        } />

        {/* Admin Assign Access — both route names supported */}
        <Route path="/assign-access" element={
          <ProtectedRoute allowedRole="admin">
            <AdminAssignAccess />
          </ProtectedRoute>
        } />
        <Route path="/admin-assign-access" element={
          <ProtectedRoute allowedRole="admin">
            <AdminAssignAccess />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
