import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Analyzer from "./pages/Analyzer.jsx";
import Review from "./pages/Review.jsx";
import TestCases from "./pages/TestCases.jsx";
import Improve from "./pages/Improve.jsx";
import History from "./pages/History.jsx";
import Reports from "./pages/Reports.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Pages inside the sidebar layout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analyzer" element={<Analyzer />} />
        <Route path="/review" element={<Review />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/improve" element={<Improve />} />
        <Route path="/history" element={<History />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Unknown address goes back to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}