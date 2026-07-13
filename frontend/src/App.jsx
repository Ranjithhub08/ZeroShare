import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DataVault from './pages/DataVault';
import ConsentRequests from './pages/ConsentRequests';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import AdminUsers from './pages/AdminUsers';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vault" element={<DataVault />} />
          <Route path="consents" element={<ConsentRequests />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
