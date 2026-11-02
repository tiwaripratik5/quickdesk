import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import MyTickets from './pages/employee/MyTickets';
import SubmitTicket from './pages/employee/SubmitTicket';
import Dashboard from './pages/agent/Dashboard';
import TicketDetail from './pages/agent/TicketDetail';
import Metrics from './pages/agent/Metrics';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Employee routes */}
          <Route
            path="/employee/tickets"
            element={
              <ProtectedRoute role="employee">
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/submit"
            element={
              <ProtectedRoute role="employee">
                <SubmitTicket />
              </ProtectedRoute>
            }
          />

          {/* Agent routes */}
          <Route
            path="/agent/dashboard"
            element={
              <ProtectedRoute role="agent">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/tickets/:id"
            element={
              <ProtectedRoute role="agent">
                <TicketDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/metrics"
            element={
              <ProtectedRoute role="agent">
                <Metrics />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
