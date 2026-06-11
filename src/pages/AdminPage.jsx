import useBusData from "../hooks/useBusData";
import { getBusStatus } from "../utils/busStatus";

function AdminPage() {
  const { buses, loading, error } = useBusData();

  if (loading) {
    return (
      <div className="page">
        <div className="section">
          <h2>Loading admin data...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="section">
          <h2>Firebase Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Admin Panel</h1>
        <p>Bus details and live status.</p>
      </header>

      <section className="section">
        <h2>Bus Details</h2>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Bus No</th>
                <th>Route</th>
                <th>Morning Start</th>
                <th>Arrival</th>
                <th>Evening</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Speed</th>
                <th>Last Updated</th>
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
                    {bus.updatedAt
                      ? new Date(bus.updatedAt).toLocaleTimeString()
                      : "Not available"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;