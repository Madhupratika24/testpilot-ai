import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GitHub from "./pages/GitHub.jsx";
import RepoPullRequests from "./pages/RepoPullRequests.jsx";
import PullRequestDetails from "./pages/PullRequestDetails.jsx";
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

      {/* Private pages: only for logged-in users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/github" element={<GitHub />} />
          <Route path="/github/:owner/:repo" element={<RepoPullRequests />} />
          <Route path="/github/:owner/:repo/pulls/:number" element={<PullRequestDetails />} />
          <Route path="/analyzer" element={<Analyzer />} />
          <Route path="/review" element={<Review />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/test-cases" element={<TestCases />} />
          <Route path="/test-cases/:id" element={<TestCases />} />
          <Route path="/improve" element={<Improve />} />
          <Route path="/improve/:id" element={<Improve />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}