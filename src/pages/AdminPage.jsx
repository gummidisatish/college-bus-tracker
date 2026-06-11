import useBusData from "../hooks/useBusData";

function AdminPage() {
  const { buses, loading } = useBusData();

  if (loading) {
    return (
      <div className="page">
        <div className="section">
          <h2>Loading admin data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Admin Panel</h1>
        <p>Admin can manage bus details here.</p>
      </header>

      <section className="section">
        <h2>Bus Details from Firebase</h2>

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
                  <td>{bus.liveStatus}</td>
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