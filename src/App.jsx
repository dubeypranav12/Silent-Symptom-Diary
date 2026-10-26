import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { hasConsent } from "./lib/data.js";
import Landing from "./pages/Landing.jsx";
import Consent from "./pages/Consent.jsx";
import Home from "./pages/Home.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import Result from "./pages/Result.jsx";
import Trends from "./pages/Trends.jsx";
import Settings from "./pages/Settings.jsx";
import Doctor from "./pages/Doctor.jsx";
import PatientDetail from "./pages/PatientDetail.jsx";

/* Patient pages need consent first. */
function Guard({ children }) {
  return hasConsent() ? children : <Navigate to="/consent" replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="/home" element={<Guard><Home /></Guard>} />
        <Route path="/checkin" element={<Guard><CheckIn /></Guard>} />
        <Route path="/result" element={<Guard><Result /></Guard>} />
        <Route path="/trends" element={<Guard><Trends /></Guard>} />
        <Route path="/settings" element={<Guard><Settings /></Guard>} />
        <Route path="/doctor" element={<Doctor />} />
        <Route path="/doctor/patient/:id" element={<PatientDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
