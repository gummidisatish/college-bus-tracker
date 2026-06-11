import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import StudentPage from "./pages/StudentPage";
import DriverPage from "./pages/DriverPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <h2>Bus Tracker</h2>

        <div className="nav-links">
          <Link to="/">Student</Link>
          <Link to="/driver">Driver</Link>
          <Link to="/admin">Admin</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<StudentPage />} />
        <Route path="/driver" element={<DriverPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;