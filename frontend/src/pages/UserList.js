import React, { useEffect, useState } from "react";
import api from "../services/api";

function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const roles = ["admin", "customer"];
  const departments = ["sales", "hr", "finance"];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Fetching users...");
      const res = await api.get("/access/all-users");
      
      console.log("✅ API Response:", res.data);
      
      if (res.data.result && res.data.result.data_array) {
        const formattedUsers = res.data.result.data_array.map((row, index) => ({
          id: index, // Use index as ID
          email: row[0],
          password: row[1] || "****",
          role: row[2] || "customer",
          department: row[3] || "sales"
        }));
        
        console.log("✨ Formatted users:", formattedUsers);
        setUsers(formattedUsers);
      } else {
        console.log("❌ No data found in response");
        setUsers([]);
      }
    } catch (error) {
      console.error("❌ Error loading users:", error);
      console.error("Status:", error.response?.status);
      console.error("Response:", error.response?.data);
      setError("Failed to load users. Are you logged in as admin?");
    } finally {
      setLoading(false);
    }
  };

  // Update Role
  const updateRole = async (email, newRole) => {
    try {
      await api.post("/access/update-role", {
        email,
        role: newRole
      });
      alert("✅ Role updated successfully!");
      loadUsers();
    } catch (error) {
      console.error("Role update error:", error);
      alert("❌ Error updating role");
    }
  };

  // Update Department
  const updateDepartment = async (email, newDept) => {
    try {
      await api.post("/access/update-department", {
        email,
        department: newDept
      });
      alert("✅ Department updated successfully!");
      loadUsers();
    } catch (error) {
      console.error("Dept update error:", error);
      alert("❌ Error updating department");
    }
  };

  // Delete User
  const deleteUser = async (email) => {
    if (!window.confirm(`Delete user ${email}?`)) return;
    
    try {
      await api.post("/access/delete-user", { email });
      alert("✅ User deleted successfully!");
      loadUsers();
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Error deleting user");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Manage Users</h2>
        <p>🔄 Loading users...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Manage Users</h2>
        <div style={{ color: 'red', padding: 10, border: '1px solid red' }}>
          <p>❌ {error}</p>
          <button onClick={loadUsers} style={{ marginTop: 10 }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 Manage Users ({users.length})</h2>
      
      {users.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          <p>📭 No users found</p>
          <button onClick={loadUsers} style={{ marginTop: 10 }}>
            🔄 Refresh
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table 
            border="1" 
            cellPadding="12" 
            cellSpacing="0"
            style={{ 
              borderCollapse: 'collapse', 
              width: '100%', 
              minWidth: '600px',
              background: 'white'
            }}
          >
            <thead style={{ background: '#f5f5f5' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px' }}>📧 Email</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>🎭 Role</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>🏢 Department</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>⚡ Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{user.email}</td>
                  
                  {/* ROLE DROPDOWN */}
                  <td style={{ padding: '12px' }}>
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.email, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {roles.map(r => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  {/* DEPARTMENT DROPDOWN */}
                  <td style={{ padding: '12px' }}>
                    <select
                      value={user.department}
                      onChange={(e) => updateDepartment(user.email, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => deleteUser(user.email)}
                      style={{
                        padding: '8px 16px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#c82333'}
                      onMouseOut={(e) => e.target.style.background = '#dc3545'}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UsersList;
