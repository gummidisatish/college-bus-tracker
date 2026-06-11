import { useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ref, onValue, update } from "firebase/database";
import { auth, db } from "../firebase";

function DriverPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("driver1@bus.com");
  const [password, setPassword] = useState("123456");

  const [assignedBusId, setAssignedBusId] = useState("");
  const [assignedBus, setAssignedBus] = useState(null);
  const [busLoading, setBusLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(
    "Location sharing not started"
  );

  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const latestPositionRef = useRef(null);

  // Login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      },
      (error) => {
        console.error(error);
        setErrorMessage("Firebase Auth failed to load.");
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Read assigned bus ID: driverBuses/userUID
  useEffect(() => {
    if (!user) {
      setAssignedBusId("");
      setAssignedBus(null);
      return;
    }

    setBusLoading(true);
    setErrorMessage("");

    const driverBusRef = ref(db, `driverBuses/${user.uid}`);

    const unsubscribe = onValue(
      driverBusRef,
      (snapshot) => {
        const busId = snapshot.val();

        if (!busId) {
          setAssignedBusId("");
          setAssignedBus(null);
          setBusLoading(false);
          setErrorMessage(
            "No bus assigned. Check Firebase → driverBuses → your UID."
          );
          return;
        }

        setAssignedBusId(busId);
        setBusLoading(false);
      },
      (error) => {
        console.error(error);
        setAssignedBusId("");
        setAssignedBus(null);
        setBusLoading(false);
        setErrorMessage("Could not read driverBuses. Check Firebase rules.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Read bus details: buses/bus_1
  useEffect(() => {
    if (!assignedBusId) {
      setAssignedBus(null);
      return;
    }

    setBusLoading(true);
    setErrorMessage("");

    const busRef = ref(db, `buses/${assignedBusId}`);

    const unsubscribe = onValue(
      busRef,
      (snapshot) => {
        const busData = snapshot.val();

        if (!busData) {
          setAssignedBus(null);
          setBusLoading(false);
          setErrorMessage(
            `Bus details not found. Check Firebase → buses → ${assignedBusId}.`
          );
          return;
        }

        setAssignedBus(busData);
        setBusLoading(false);
      },
      (error) => {
        console.error(error);
        setAssignedBus(null);
        setBusLoading(false);
        setErrorMessage("Could not read bus details. Check Firebase rules.");
      }
    );

    return () => unsubscribe();
  }, [assignedBusId]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful.");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Login failed. Check email/password in Firebase Authentication."
      );
    }
  };

  const writeLocationToFirebase = async (position, customStatus = "Running") => {
    if (!assignedBusId) {
      setErrorMessage("No bus assigned to this driver.");
      return;
    }

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy || 0;
    const speedInMetersPerSecond = position.coords.speed || 0;
    const speedInKmph = Math.round(speedInMetersPerSecond * 3.6);

    const locationData = {
      lat: latitude,
      lng: longitude,
      accuracy,
      speed: speedInKmph,
      status: customStatus,
      updatedAt: Date.now(),
    };

    await update(ref(db, `locations/${assignedBusId}`), locationData);

    setCurrentLocation(locationData);
  };

  const startSharingLocation = () => {
    setMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage("Please login first.");
      return;
    }

    if (!assignedBusId) {
      setErrorMessage("No bus assigned to this driver account.");
      return;
    }

    if (!navigator.geolocation) {
      setErrorMessage("GPS is not supported on this browser/device.");
      setLocationStatus("GPS not supported");
      return;
    }

    setLocationStatus("Requesting location permission...");

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        latestPositionRef.current = position;

        try {
          await writeLocationToFirebase(position, "Running");

          setIsSharing(true);
          setLocationStatus(
            `Sharing live location for Bus ${
              assignedBus?.busNumber || assignedBusId
            }`
          );
        } catch (error) {
          console.error(error);
          setLocationStatus("Firebase update failed");
          setErrorMessage(
            "Firebase write failed. Check Realtime Database rules and driverBuses UID."
          );
        }
      },
      (error) => {
        console.error(error);

        let message = "Unable to access location.";

        if (error.code === 1) {
          message = "Location permission denied. Allow location permission.";
        } else if (error.code === 2) {
          message = "Location unavailable. Turn on GPS/location services.";
        } else if (error.code === 3) {
          message = "Location request timed out. Try again.";
        }

        setErrorMessage(message);
        setLocationStatus("Location sharing failed");
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    // Sends latest known location every 5 seconds
    intervalRef.current = setInterval(async () => {
      if (latestPositionRef.current) {
        try {
          await writeLocationToFirebase(latestPositionRef.current, "Running");
        } catch (error) {
          console.error(error);
        }
      }
    }, 5000);
  };

  const stopSharingLocation = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    latestPositionRef.current = null;
    setIsSharing(false);
    setLocationStatus("Location sharing stopped");

    if (assignedBusId) {
      try {
        await update(ref(db, `locations/${assignedBusId}`), {
          status: "Stopped",
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not update stopped status in Firebase.");
      }
    }
  };

  const handleLogout = async () => {
    setMessage("");
    setErrorMessage("");

    try {
      await stopSharingLocation();
      await signOut(auth);

      setUser(null);
      setAssignedBusId("");
      setAssignedBus(null);
      setCurrentLocation(null);
      setMessage("Logged out.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Logout failed.");
    }
  };

  // Cleanup when page closes
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (authLoading) {
    return (
      <div className="page">
        <div className="section">
          <h2>Loading driver login...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <header className="hero">
          <h1>Driver Login</h1>
          <p>Login to share your assigned bus location.</p>
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

  return (
    <div className="page">
      <header className="hero">
        <h1>Driver Panel</h1>
        <p>Logged in as {user.email}</p>
      </header>

      <section className="form-card">
        <p>
          <strong>User UID:</strong> {user.uid}
        </p>

        <hr />

        <h3>Assigned Bus</h3>

        {busLoading && <p>Loading assigned bus...</p>}

        {!busLoading && assignedBusId && (
          <p>
            <strong>Assigned Bus ID:</strong> {assignedBusId}
          </p>
        )}

        {!busLoading && assignedBus && (
          <div className="driver-info-box">
            <p>
              <strong>Bus Number:</strong> {assignedBus.busNumber}
            </p>

            <p>
              <strong>Route:</strong> {assignedBus.routeName}
            </p>

            <p>
              <strong>Morning Start:</strong> {assignedBus.morningStart}
            </p>

            <p>
              <strong>College Arrival:</strong> {assignedBus.collegeArrival}
            </p>

            <p>
              <strong>Evening Departure:</strong>{" "}
              {assignedBus.eveningDeparture}
            </p>

            <p>
              <strong>Driver:</strong> {assignedBus.driverName}
            </p>
          </div>
        )}

        <div className="button-row">
          <button
            className="primary-btn"
            onClick={startSharingLocation}
            disabled={isSharing || !assignedBusId}
          >
            Start Sharing Location
          </button>

          <button
            className="danger-btn"
            onClick={stopSharingLocation}
            disabled={!isSharing}
          >
            Stop Sharing
          </button>

          <button className="secondary-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <p className="status-text">Status: {locationStatus}</p>

        {currentLocation && (
          <div className="location-box">
            <h3>Current Location Sent</h3>

            <p>
              <strong>Latitude:</strong> {currentLocation.lat}
            </p>

            <p>
              <strong>Longitude:</strong> {currentLocation.lng}
            </p>

            <p>
              <strong>Speed:</strong> {currentLocation.speed} km/h
            </p>

            <p>
              <strong>Accuracy:</strong>{" "}
              {Math.round(currentLocation.accuracy)} meters
            </p>

            <p>
              <strong>Updated:</strong>{" "}
              {new Date(currentLocation.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        )}

        {message && <p className="status-text">{message}</p>}
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <p className="driver-note">
          Keep this page open while the bus is running. If the phone locks or
          browser closes, browser GPS may stop.
        </p>
      </section>
    </div>
  );
}

export default DriverPage;