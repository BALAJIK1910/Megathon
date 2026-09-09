import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LiveCountdown from './pages/LiveCountdown';
import EditTime from './pages/EditTime';
import Login from './pages/Login';
import { initSyncEngine } from './utils/storage';

export default function App() {
  useEffect(() => {
    initSyncEngine();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LiveCountdown />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edittime"
            element={
              <ProtectedRoute>
                <EditTime />
              </ProtectedRoute>
            }
          />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
