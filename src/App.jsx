import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { HRDataProvider } from "./context/HRDataContext";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth, RequireRole } from "./components/RequireAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Directory from "./pages/Directory";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Onboarding from "./pages/Onboarding";
import Recognition from "./pages/Recognition";
import Announcements from "./pages/Announcements";
import OrgChart from "./pages/OrgChart";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <AuthProvider>
      <HRDataProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/:id" element={<EmployeeProfile />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/recognition" element={<Recognition />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/org-chart" element={<OrgChart />} />
              <Route element={<RequireRole roles={["admin", "hr"]} />}>
                <Route path="/analytics" element={<Analytics />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </HRDataProvider>
    </AuthProvider>
  );
}
