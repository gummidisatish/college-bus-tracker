import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ref, onValue, set, update, remove } from "firebase/database";
import { auth, db } from "../firebase";
import useBusData from "../hooks/useBusData";
import { getBusStatus } from "../utils/busStatus";

const emptyForm = {
  busNumber: "",
  routeName: "",
  morningStart: "",
  collegeArrival: "",
  eveningDeparture: "",
  driverName: "",
  driverPhone: "",
};

function createBusId(busNumber) {
  return `bus_${String(busNumber).trim().toLowerCase().replace(/\s+/g, "_")}`;
}

function AdminPage() {
  const { buses, loading, error } = useBusData();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("admin@bus.com");
  const [password, setPassword] = useState("123456");

  const [form, setForm] = useState(emptyForm);
  const [editingBusId, setEditingBusId] = useState("");

  const [driverUid, setDriverUid] = useState("");
  const [selectedDriverBusId, setSelectedDriverBusId] = useState("");
  const [driverAssignments, setDriverAssignments] = useState({});

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const adminRef = ref(db, `admins/${user.uid}`);

    const unsubscribe = onValue(
      adminRef,
      (snapshot) => {
        const value = snapshot.val();
        setIsAdmin(value === true);

        if (value !== true) {
          setErrorMessage("This account is not an admin.");
        } else {
          setErrorMessage("");
        }
      },
      (err) => {
        console.error(err);
        setIsAdmin(false);
        setErrorMessage("Could not check admin permission.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setDriverAssignments({});
      return;
    }

    const driverBusesRef = ref(db, "driverBuses");

    const unsubscribe = onValue(
      driverBusesRef,
      (snapshot) => {
        setDriverAssignments(snapshot.val() || {});
      },
      (err) => {
        console.error(err);
        setErrorMessage("Could not read driver assignments.");
      }
    );

    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful.");
    } catch (err) {
      console.error(err);
      setErrorMessage("Admin login failed. Check email/password.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);

    setUser(null);
    setIsAdmin(false);
    setForm(emptyForm);
    setEditingBusId("");
    setDriverUid("");
    setSelectedDriverBusId("");
    setDriverAssignments({});
    setMessage("Logged out.");
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingBusId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!isAdmin) {
      setErrorMessage("Only admin can save bus details.");
      return;
    }

    if (!form.busNumber.trim()) {
      setErrorMessage("Bus number is required.");
      return;
    }

    if (!form.routeName.trim()) {
      setErrorMessage("Route name is required.");
      return;
    }

    const busId = editingBusId || createBusId(form.busNumber);

    const busData = {
      id: busId,
      busNumber: form.busNumber.trim(),
      routeName: form.routeName.trim(),
      morningStart: form.morningStart.trim(),
      collegeArrival: form.collegeArrival.trim(),
      eveningDeparture: form.eveningDeparture.trim(),
      driverName: form.driverName.trim(),
      driverPhone: form.driverPhone.trim(),
      status: "Not Started",
    };

    try {
      if (editingBusId) {
        await update(ref(db, `buses/${busId}`), busData);
        setMessage("Bus updated successfully.");
      } else {
        await set(ref(db, `buses/${busId}`), busData);

        await set(ref(db, `locations/${busId}`), {
          lat: 0,
          lng: 0,
          speed: 0,
          accuracy: 0,
          status: "Not Started",
          updatedAt: 0,
        });

        setMessage("Bus added successfully.");
      }

      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to save bus. Check Firebase rules.");
    }
  };

  const handleEdit = (bus) => {
    setEditingBusId(bus.id);

    setForm({
      busNumber: bus.busNumber || "",
      routeName: bus.routeName || "",
      morningStart: bus.morningStart || "",
      collegeArrival: bus.collegeArrival || "",
      eveningDeparture: bus.eveningDeparture || "",
      driverName: bus.driverName || "",
      driverPhone: bus.driverPhone || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (bus) => {
    const confirmDelete = window.confirm(
      `Delete Bus ${bus.busNumber}? This will also remove its live location.`
    );

    if (!confirmDelete) return;

    setMessage("");
    setErrorMessage("");

    try {
      await remove(ref(db, `buses/${bus.id}`));
      await remove(ref(db, `locations/${bus.id}`));

      const assignments = Object.entries(driverAssignments);
      const matchingAssignments = assignments.filter(
        ([, busId]) => busId === bus.id
      );

      for (const [uid] of matchingAssignments) {
        await remove(ref(db, `driverBuses/${uid}`));
      }

      setMessage(`Bus ${bus.busNumber} deleted successfully.`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to delete bus. Check Firebase rules.");
    }
  };

  const handleAssignDriver = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!isAdmin) {
      setErrorMessage("Only admin can assign drivers.");
      return;
    }

    if (!driverUid.trim()) {
      setErrorMessage("Driver UID is required.");
      return;
    }

    if (!selectedDriverBusId) {
      setErrorMessage("Please select a bus.");
      return;
    }

    try {
      await set(
        ref(db, `driverBuses/${driverUid.trim()}`),
        selectedDriverBusId
      );

      setMessage("Driver assigned successfully.");
      setDriverUid("");
      setSelectedDriverBusId("");
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to assign driver. Check Firebase rules.");
    }
  };

  const handleRemoveDriverAssignment = async (uid) => {
    const confirmRemove = window.confirm(
      "Remove this driver's bus assignment?"
    );

    if (!confirmRemove) return;

    setMessage("");
    setErrorMessage("");

    try {
      await remove(ref(db, `driverBuses/${uid}`));
      setMessage("Driver assignment removed.");
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to remove driver assignment.");
    }
  };

  const getBusLabel = (busId) => {
    const bus = buses.find((item) => item.id === busId);

    if (!bus) {
      return busId;
    }

    return `Bus ${bus.busNumber} - ${bus.routeName}`;
  };

  if (authLoading) {
    return (
      <div className="page">
        <div className="section">
          <h2>Loading admin login...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <header className="hero">
          <h1>Admin Login</h1>
          <p>Login to manage college bus details.</p>
        </header>

        <form className="form-card" onSubmit={handleLogin}>
          <label>Email</label>
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="primary-btn" type="submit">
            Login
          </button>

          {message && <p className="status-text">{message}</p>}
          {errorMessage && <p className="error-text">{errorMessage}</p>}
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <header className="hero">
          <h1>Admin Access Denied</h1>
          <p>Logged in as {user.email}</p>
        </header>

        <section className="form-card">
          <p>
            <strong>User UID:</strong> {user.uid}
          </p>

          <p className="error-text">
            This UID is not added under admins in Firebase.
          </p>

          <button className="secondary-btn" onClick={handleLogout}>
            Logout
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Admin Panel</h1>
        <p>Logged in as {user.email}</p>
      </header>

      <section className="form-card">
        <h2>{editingBusId ? "Edit Bus" : "Add New Bus"}</h2>

        <form onSubmit={handleSubmit}>
          <label>Bus Number</label>
          <input
            className="text-input"
            value={form.busNumber}
            onChange={(e) => handleChange("busNumber", e.target.value)}
            placeholder="Example: 1"
            disabled={Boolean(editingBusId)}
          />

          <label>Route Name</label>
          <input
            className="text-input"
            value={form.routeName}
            onChange={(e) => handleChange("routeName", e.target.value)}
            placeholder="Example: Benz Circle to College"
          />

          <label>Morning Start</label>
          <input
            className="text-input"
            value={form.morningStart}
            onChange={(e) => handleChange("morningStart", e.target.value)}
            placeholder="Example: 7:30 AM"
          />

          <label>College Arrival</label>
          <input
            className="text-input"
            value={form.collegeArrival}
            onChange={(e) => handleChange("collegeArrival", e.target.value)}
            placeholder="Example: 8:45 AM"
          />

          <label>Evening Departure</label>
          <input
            className="text-input"
            value={form.eveningDeparture}
            onChange={(e) => handleChange("eveningDeparture", e.target.value)}
            placeholder="Example: 4:30 PM"
          />

          <label>Driver Name</label>
          <input
            className="text-input"
            value={form.driverName}
            onChange={(e) => handleChange("driverName", e.target.value)}
            placeholder="Example: Ramesh"
          />

          <label>Driver Phone</label>
          <input
            className="text-input"
            value={form.driverPhone}
            onChange={(e) => handleChange("driverPhone", e.target.value)}
            placeholder="Example: 9876543210"
          />

          <div className="button-row">
            <button className="primary-btn" type="submit">
              {editingBusId ? "Update Bus" : "Add Bus"}
            </button>

            {editingBusId && (
              <button
                className="secondary-btn"
                type="button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}

            <button
              className="secondary-btn"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </form>

        {message && <p className="status-text">{message}</p>}
        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </section>

      <br />

      <section className="form-card">
        <h2>Assign Driver to Bus</h2>

        <form onSubmit={handleAssignDriver}>
          <label>Driver UID</label>
          <input
            className="text-input"
            value={driverUid}
            onChange={(e) => setDriverUid(e.target.value)}
            placeholder="Paste driver Firebase Authentication UID"
          />

          <label>Select Bus</label>
          <select
            value={selectedDriverBusId}
            onChange={(e) => setSelectedDriverBusId(e.target.value)}
          >
            <option value="">Choose bus</option>

            {buses.map((bus) => (
              <option key={bus.id} value={bus.id}>
                Bus {bus.busNumber} - {bus.routeName}
              </option>
            ))}
          </select>

          <button className="primary-btn" type="submit">
            Assign Driver
          </button>
        </form>
      </section>

      <br />

      <section className="section">
        <h2>Driver Assignments</h2>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Driver UID</th>
                <th>Assigned Bus</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(driverAssignments).map(([uid, busId]) => (
                <tr key={uid}>
                  <td>{uid}</td>
                  <td>{getBusLabel(busId)}</td>
                  <td>
                    <button
                      className="danger-btn"
                      onClick={() => handleRemoveDriverAssignment(uid)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {Object.keys(driverAssignments).length === 0 && (
                <tr>
                  <td colSpan="3">No driver assignments yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <br />

      <section className="section">
        <h2>Bus Details</h2>

        {loading && <p>Loading bus data...</p>}

        {error && <p className="error-text">{error}</p>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Bus No</th>
                <th>Route</th>
                <th>Morning</th>
                <th>Arrival</th>
                <th>Evening</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Speed</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {buses.map((bus) => (
                <tr key={bus.id}>
                  <td>{bus.busNumber}</td>
                  <td>{bus.routeName}</td>
                  <td>{bus.morningStart}</td>
                  <td>{bus.collegeArrival}</td>
                  <td>{bus.eveningDeparture}</td>
                  <td>{bus.driverName}</td>
                  <td>{getBusStatus(bus)}</td>
                  <td>{bus.speed || 0} km/h</td>
                  <td>
                    <div className="button-row">
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => handleEdit(bus)}
                      >
                        Edit
                      </button>

                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => handleDelete(bus)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {buses.length === 0 && !loading && (
                <tr>
                  <td colSpan="9">No buses added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;