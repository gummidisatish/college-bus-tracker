import { useEffect, useRef, useState } from "react";
import { ref, update } from "firebase/database";
import { db } from "../firebase";
import useBusData from "../hooks/useBusData";

function DriverPage() {
  const { buses, loading } = useBusData();

  const [selectedBusId, setSelectedBusId] = useState("");
  const [status, setStatus] = useState("Location sharing not started");
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const latestPositionRef = useRef(null);

  const selectedBus = buses.find((bus) => bus.id === selectedBusId);

  const writeLocationToFirebase = async (position, customStatus = "Running") => {
    if (!selectedBusId || !position) return;

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    const speedInMetersPerSecond = position.coords.speed || 0;
    const speedInKmph = Math.round(speedInMetersPerSecond * 3.6);

    const locationData = {
      lat: latitude,
      lng: longitude,
      accuracy: accuracy,
      speed: speedInKmph,
      status: customStatus,
      updatedAt: Date.now(),
    };

    await update(ref(db, `locations/${selectedBusId}`), locationData);

    setCurrentLocation(locationData);
  };

  const startSharing = () => {
    setErrorMessage("");

    if (!selectedBusId) {
      alert("Please select your bus number first");
      return;
    }

    if (!navigator.geolocation) {
      setErrorMessage("GPS is not supported on this device/browser.");
      setStatus("GPS not supported");
      return;
    }

    setStatus("Requesting location permission...");

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        latestPositionRef.current = position;

        try {
          await writeLocationToFirebase(position, "Running");
          setStatus(`Sharing live location for Bus ${selectedBus?.busNumber}`);
          setIsSharing(true);
        } catch (error) {
          console.error(error);
          setErrorMessage("Failed to update Firebase location.");
          setStatus("Firebase update failed");
        }
      },
      (error) => {
        console.error(error);

        let message = "Unable to access location.";

        if (error.code === 1) {
          message = "Location permission denied. Please allow location access.";
        } else if (error.code === 2) {
          message = "Location unavailable. Turn on GPS/location services.";
        } else if (error.code === 3) {
          message = "Location request timed out. Try again.";
        }

        setErrorMessage(message);
        setStatus("Location sharing failed");
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

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

  const stopSharing = async () => {
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
    setStatus("Location sharing stopped");

    if (selectedBusId) {
      try {
        await update(ref(db, `locations/${selectedBusId}`), {
          status: "Stopped",
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to update stopped status in Firebase.");
      }
    }
  };

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

  if (loading) {
    return (
      <div className="page">
        <div className="section">
          <h2>Loading driver data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Driver Panel</h1>
        <p>Drivers use this page to share live bus location.</p>
      </header>

      <section className="form-card">
        <label>Select Bus Number</label>

        <select
          value={selectedBusId}
          onChange={(e) => {
            if (isSharing) {
              alert("Stop sharing before changing bus.");
              return;
            }

            setSelectedBusId(e.target.value);
            setCurrentLocation(null);
            setErrorMessage("");
            setStatus("Location sharing not started");
          }}
          disabled={isSharing}
        >
          <option value="">Choose bus</option>

          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              Bus {bus.busNumber} - {bus.routeName}
            </option>
          ))}
        </select>

        <div className="button-row">
          <button
            className="primary-btn"
            onClick={startSharing}
            disabled={isSharing}
          >
            Start Sharing Location
          </button>

          <button
            className="danger-btn"
            onClick={stopSharing}
            disabled={!isSharing}
          >
            Stop Sharing
          </button>
        </div>

        <p className="status-text">Status: {status}</p>

        {selectedBus && (
          <div className="driver-info-box">
            <h3>Selected Bus</h3>
            <p>
              <strong>Bus:</strong> {selectedBus.busNumber}
            </p>
            <p>
              <strong>Route:</strong> {selectedBus.routeName}
            </p>
            <p>
              <strong>Driver:</strong> {selectedBus.driverName}
            </p>
          </div>
        )}

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
              <strong>Accuracy:</strong> {Math.round(currentLocation.accuracy)}{" "}
              meters
            </p>
            <p>
              <strong>Updated:</strong>{" "}
              {new Date(currentLocation.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        )}

        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <p className="driver-note">
          Keep this page open while the bus is running. If the phone locks or
          the browser closes, location sharing may stop.
        </p>
      </section>
    </div>
  );
}

export default DriverPage;