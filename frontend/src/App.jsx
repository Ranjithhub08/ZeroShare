import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyOTP from './pages/VerifyOTP';

// User pages
import Dashboard from './pages/Dashboard';
import DataVault from './pages/DataVault';
import ConsentRequests from './pages/ConsentRequests';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminConsents from './pages/admin/AdminConsents';
import AdminUsers from './pages/AdminUsers';
import AdminML from './pages/admin/AdminML';

// Route guards
const UserRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
      <Routes>
        {/* Public */}
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp"     element={<VerifyOTP />} />

        {/* ── USER PORTAL ── */}
        <Route path="/" element={<UserRoute><Layout /></UserRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vault"     element={<DataVault />} />
          <Route path="consents"  element={<ConsentRequests />} />
          <Route path="audit"     element={<AuditLogs />} />
          <Route path="settings"  element={<Settings />} />
          <Route path="privacy"   element={<ConsentRequests />} />
        </Route>

        {/* ── ADMIN PORTAL ── */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"     element={<AdminDashboard />} />
          <Route path="consents"      element={<AdminConsents />} />
          <Route path="users"         element={<AdminUsers />} />
          <Route path="ml"            element={<AdminML />} />
          <Route path="audit"         element={<AuditLogs />} />
          <Route path="settings"      element={<Settings />} />
          <Route path="notifications" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
