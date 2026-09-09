import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LiveCountdown from './pages/LiveCountdown';
import EditTime from './pages/EditTime';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LiveCountdown />} />
        <Route path="/edittime" element={<EditTime />} />
        {/* Catch-all redirect to home */}
        <Route path="*" element={<LiveCountdown />} />
      </Routes>
    </Router>
  );
}
