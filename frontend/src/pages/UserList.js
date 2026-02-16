import React, { useEffect, useState } from "react";
import api from "../services/api";

function UsersList() {

  const [users, setUsers] = useState([]);

  const roles = ["admin", "customer"];

  const departments = ["sales", "hr", "finance"];

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {

      const res = await api.get("/access/all-users");

      if (res.data.result && res.data.result.data_array) {

        const formatted = res.data.result.data_array.map(row => ({
          email: row[0],
          role: row[2],
          department: row[3] || "sales"
        }));

        setUsers(formatted);
      }

    } catch (error) {
      console.log(error);
    }
  };

  // Update Role
  const updateRole = async (email, newRole) => {

    try {

      await api.post("/access/update-role", {
        email,
        role: newRole
      });

      alert("Role updated");

      load();

    } catch {
      alert("Error updating role");
    }
  };

  // Update Department
  const updateDepartment = async (email, newDept) => {

    try {

      await api.post("/access/update-department", {
        email,
        department: newDept
      });

      alert("Department updated");

      load();

    } catch {
      alert("Error updating department");
    }
  };

  // Delete User
  const deleteUser = async (email) => {

    if (!window.confirm("Delete user?")) return;

    try {

      await api.post("/access/delete-user", { email });

      load();

    } catch {
      alert("Error deleting");
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Manage Users</h2>

      <table border="1" cellPadding="10">

        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {users.map((user, index) => (

            <tr key={index}>

              <td>{user.email}</td>

              {/* ROLE DROPDOWN */}
              <td>

                <select
                  value={user.role}
                  onChange={(e) =>
                    updateRole(user.email, e.target.value)
                  }
                >

                  {roles.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}

                </select>

              </td>

              {/* DEPARTMENT DROPDOWN */}
              <td>

                <select
                  value={user.department}
                  onChange={(e) =>
                    updateDepartment(user.email, e.target.value)
                  }
                >

                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}

                </select>

              </td>

              <td>

                <button onClick={() => deleteUser(user.email)}>
                  Delete
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default UsersList;
