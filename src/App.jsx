import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { HRDataProvider } from "./context/HRDataContext";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth, RequireRole, RequireProjectManager } from "./components/RequireAuth";
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
import Settings from "./pages/Settings";
import MyDay from "./pages/MyDay";
import Board from "./pages/Board";
import Performance from "./pages/Performance";
import Backlog from "./pages/Backlog";
import Issues from "./pages/Issues";
import IssuePage from "./pages/IssuePage";
import Projects from "./pages/Projects";
import SprintReport from "./pages/SprintReport";
import BniData from "./pages/BniData";
import BniEmails from "./pages/BniEmails";
import BeebarkWaitlist from "./pages/BeebarkWaitlist";

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
              <Route path="/my-day" element={<MyDay />} />
              <Route path="/board" element={<Board />} />
              <Route path="/backlog" element={<Backlog />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="/browse/:issueKey" element={<IssuePage />} />
              <Route element={<RequireProjectManager />}>
                <Route path="/projects" element={<Projects />} />
              </Route>
              <Route path="/sprints/:sprintId/report" element={<SprintReport />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/recognition" element={<Recognition />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/org-chart" element={<OrgChart />} />
              <Route element={<RequireRole roles={["admin", "hr"]} />}>
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route element={<RequireRole roles={["admin"]} />}>
                <Route path="/bni" element={<BniData />} />
                <Route path="/bni/emails" element={<BniEmails />} />
                <Route path="/beebark-waitlist" element={<BeebarkWaitlist />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </HRDataProvider>
    </AuthProvider>
  );
}
