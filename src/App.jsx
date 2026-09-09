import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LiveCountdown from './pages/LiveCountdown';
import EditTime from './pages/EditTime';
import JudgeBuzzer from './pages/JudgeBuzzer';
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
          {/* Public Stage Display for 4 Area Projectors / Screens */}
          <Route path="/" element={<LiveCountdown />} />
          
          {/* Dedicated VIP Judge Buzzer Mobile View */}
          <Route
            path="/buzzer"
            element={
              <ProtectedRoute>
                <JudgeBuzzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/buzzer"
            element={
              <ProtectedRoute>
                <JudgeBuzzer />
              </ProtectedRoute>
            }
          />

          {/* Admin Master Control Deck */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <EditTime />
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
