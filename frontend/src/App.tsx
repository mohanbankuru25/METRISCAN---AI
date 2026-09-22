import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Authentication
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// Landing Page
import { LandingPage } from "./pages/LandingPage";

// Existing Inspector components
import { Scanner } from "./pages/Scanner";
import { History } from "./pages/History";
import { HistoryDetail } from "./pages/HistoryDetail";
import { Settings } from "./pages/Settings";

// Inspector Portal
import { InspectorDashboard } from "./pages/inspector/InspectorDashboard";
import { InspectorReports } from "./pages/inspector/InspectorReports";
import { InspectorRules } from "./pages/inspector/InspectorRules";

// Admin Portal
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminInspectors } from "./pages/admin/AdminInspectors";
import { AdminInspections } from "./pages/admin/AdminInspections";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminReports } from "./pages/admin/AdminReports";
import { AdminRules } from "./pages/admin/AdminRules";
import { AdminNotifications } from "./pages/admin/AdminNotifications";
import { AdminLogs } from "./pages/admin/AdminLogs";
import { AdminUserScanIssues } from "./pages/admin/AdminUserScanIssues";
import { AdminUserIssues } from "./pages/admin/AdminUserIssues";

// Consumer / Citizen Portal
import ConsumerLogin from "./pages/consumer/ConsumerLogin";
import ConsumerSignup from "./pages/consumer/ConsumerSignup";
import { ConsumerLayout } from "./pages/consumer/ConsumerLayout";
import ConsumerDashboard from "./pages/consumer/ConsumerDashboard";
import ConsumerScanner from "./pages/consumer/ConsumerScanner";
import ConsumerScanResult from "./pages/consumer/ConsumerScanResult";
import ConsumerScansList from "./pages/consumer/ConsumerScansList";
import ConsumerSubmitIssue from "./pages/consumer/ConsumerSubmitIssue";
import ConsumerIssuesList from "./pages/consumer/ConsumerIssuesList";
import ConsumerCommunityFeed from "./pages/consumer/ConsumerCommunityFeed";
import ConsumerProfile from "./pages/consumer/ConsumerProfile";
import MultiScanProducts from "./pages/MultiScanProducts";


function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* ========================================================= */}
        {/* PUBLIC ROUTES                                             */}
        {/* ========================================================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        {/* Citizen Auth Public Routes */}
        <Route
          path="/user/login"
          element={<ConsumerLogin />}
        />

        <Route
          path="/user/signup"
          element={<ConsumerSignup />}
        />


        {/* ========================================================= */}
        {/* CONSUMER / CITIZEN PROTECTED ROUTES                       */}
        {/* ========================================================= */}

        <Route element={<ProtectedRoute allowedRole="consumer" />}>
          <Route element={<ConsumerLayout />}>
            <Route path="/user" element={<ConsumerDashboard />} />
            <Route path="/user/scan" element={<ConsumerScanner />} />
            <Route path="/user/multi-scan" element={<MultiScanProducts />} />
            <Route path="/user/multi-scan/:sessionId" element={<MultiScanProducts />} />
            <Route path="/user/scans" element={<ConsumerScansList />} />
            <Route path="/user/scans/:id" element={<ConsumerScanResult />} />
            <Route path="/user/report-issue" element={<ConsumerSubmitIssue />} />
            <Route path="/user/issues" element={<ConsumerIssuesList />} />
            <Route path="/user/community" element={<ConsumerCommunityFeed />} />
            <Route path="/user/profile" element={<ConsumerProfile />} />
          </Route>
        </Route>


        {/* ========================================================= */}
        {/* INSPECTOR PROTECTED ROUTES                               */}
        {/* ========================================================= */}

        <Route
          element={
            <ProtectedRoute allowedRole="inspector" />
          }
        >

          <Route
            path="/inspector"
            element={<InspectorDashboard />}
          />

          <Route
            path="/inspector/scan"
            element={<Scanner />}
          />

          <Route
            path="/inspector/multi-scan"
            element={<MultiScanProducts />}
          />

          <Route
            path="/inspector/multi-scan/:sessionId"
            element={<MultiScanProducts />}
          />

          <Route
            path="/inspector/history"
            element={<History />}
          />

          <Route
            path="/inspector/history/:id"
            element={<HistoryDetail />}
          />

          <Route
            path="/inspector/reports"
            element={<InspectorReports />}
          />

          <Route
            path="/inspector/rules"
            element={<InspectorRules />}
          />

          <Route
            path="/inspector/settings"
            element={<Settings />}
          />

        </Route>


        {/* ========================================================= */}
        {/* ADMIN PROTECTED ROUTES                                   */}
        {/* ========================================================= */}

        <Route
          element={
            <ProtectedRoute allowedRole="admin" />
          }
        >

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/inspectors"
            element={<AdminInspectors />}
          />

          <Route
            path="/admin/inspections"
            element={<AdminInspections />}
          />

          <Route
            path="/admin/user-scan-issues"
            element={<AdminUserScanIssues />}
          />

          <Route
            path="/admin/user-issues"
            element={<AdminUserIssues />}
          />

          <Route
            path="/admin/analytics"
            element={<AdminAnalytics />}
          />

          <Route
            path="/admin/reports"
            element={<AdminReports />}
          />

          <Route
            path="/admin/rules"
            element={<AdminRules />}
          />

          <Route
            path="/admin/notifications"
            element={<AdminNotifications />}
          />

          <Route
            path="/admin/logs"
            element={<AdminLogs />}
          />

          <Route
            path="/admin/settings"
            element={<Settings />}
          />

        </Route>


        {/* ========================================================= */}
        {/* BACKWARD COMPATIBILITY                                   */}
        {/* ========================================================= */}

        <Route
          path="/dashboard"
          element={
            <Navigate
              to="/inspector"
              replace
            />
          }
        />

        <Route
          path="/scanner"
          element={
            <Navigate
              to="/inspector/scan"
              replace
            />
          }
        />

        <Route
          path="/multi-scan"
          element={
            <Navigate
              to="/inspector/multi-scan"
              replace
            />
          }
        />

        <Route
          path="/multi-scan/:sessionId"
          element={
            <Navigate
              to="/inspector/multi-scan"
              replace
            />
          }
        />

        <Route
          path="/history"
          element={
            <Navigate
              to="/inspector/history"
              replace
            />
          }
        />

        <Route
          path="/history/:id"
          element={
            <Navigate
              to="/inspector/history"
              replace
            />
          }
        />

        <Route
          path="/scan-result/:id"
          element={
            <Navigate
              to="/inspector/history"
              replace
            />
          }
        />

        <Route
          path="/settings"
          element={
            <Navigate
              to="/inspector/settings"
              replace
            />
          }
        />


        {/* ========================================================= */}
        {/* CATCH ALL                                                */}
        {/* ========================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;