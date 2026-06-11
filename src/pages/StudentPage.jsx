import { useRef, useState } from "react";
import BusMap from "../components/BusMap";
import useBusData from "../hooks/useBusData";
import { getBusStatus } from "../utils/busStatus";

function StudentPage() {
  const { collegeInfo, buses, loading } = useBusData();

  const [showMap, setShowMap] = useState(false);
  const [selectedBusNumber, setSelectedBusNumber] = useState("All");

  const mapSectionRef = useRef(null);

  if (loading) {
    return (
      <div className="page">
        <div className="section">
          <h2>Loading bus data...</h2>
        </div>
      </div>
    );
  }

  if (!collegeInfo) {
    return (
      <div className="page">
        <div className="section">
          <h2>College data not found in Firebase.</h2>
          <p>Check whether you imported collegeInfo in Realtime Database.</p>
        </div>
      </div>
    );
  }

  const filteredBuses =
    selectedBusNumber === "All"
      ? buses
      : buses.filter(
          (bus) => String(bus.busNumber) === String(selectedBusNumber)
        );

  const handleViewLocation = (busNumber) => {
    setSelectedBusNumber(String(busNumber));
    setShowMap(true);

    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>{collegeInfo.name}</h1>
        <p>{collegeInfo.address}</p>
        <h2>College Bus Tracker</h2>
      </header>

      <section className="section">
        <div className="section-header">
          <h2>Available Buses</h2>

          <button
            className="primary-btn"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        <div className="filter-box">
          <label>Select Bus</label>

          <select
            value={selectedBusNumber}
            onChange={(e) => {
              setSelectedBusNumber(e.target.value);
              setShowMap(true);
            }}
          >
            <option value="All">All Buses</option>

            {buses.map((bus) => (
              <option key={bus.id} value={String(bus.busNumber)}>
                Bus {bus.busNumber}
              </option>
            ))}
          </select>
        </div>

        <div ref={mapSectionRef}>
          {showMap && (
            <BusMap collegeInfo={collegeInfo} buses={filteredBuses} />
          )}
        </div>

        {filteredBuses.length === 0 && (
          <div className="empty-message">
            <h3>No bus found.</h3>
            <p>
              Check whether busNumber in Firebase is matching correctly.
            </p>
          </div>
        )}

        <div className="bus-grid">
          {filteredBuses.map((bus) => {
            const displayStatus = getBusStatus(bus);

            return (
              <div className="bus-card" key={bus.id}>
                <div className="bus-card-header">
                  <h3>Bus {bus.busNumber}</h3>

                  <span
                    className={`status ${
                      displayStatus === "Running" ? "green" : ""
                    }`}
                  >
                    {displayStatus}
                  </span>
                </div>

                <p>
                  <strong>Route:</strong> {bus.routeName}
                </p>

                <p>
                  <strong>Morning Start:</strong> {bus.morningStart}
                </p>

                <p>
                  <strong>College Arrival:</strong> {bus.collegeArrival}
                </p>

                <p>
                  <strong>Evening Departure:</strong> {bus.eveningDeparture}
                </p>

                <p>
                  <strong>Driver:</strong> {bus.driverName}
                </p>

                <p>
                  <strong>Last Updated:</strong>{" "}
                  {bus.updatedAt
                    ? new Date(bus.updatedAt).toLocaleTimeString()
                    : "Not available"}
                </p>

                <button
                  className="primary-btn"
                  onClick={() => handleViewLocation(bus.busNumber)}
                >
                  View Live Location
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default StudentPage;