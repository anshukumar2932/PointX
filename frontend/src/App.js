import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StallDashboard from './components/StallDashboard';
import VisitorDashboard from './components/VisitorDashboard';
import Navigation from './components/Navigation';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Loading PointX...</h2>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={!user ? <Login /> : <Navigate to={`/${user.role}`} replace />} 
      />
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to={`/${user.role}`} replace />} 
      />
      <Route 
        path="/admin" 
        element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'admin' ? (
            <div className="container">
              <Navigation />
              <AdminDashboard />
            </div>
          ) : <Navigate to={`/${user.role}`} replace />
        } 
      />
      <Route 
        path="/stall" 
        element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'stall' ? (
            <div className="container">
              <Navigation />
              <StallDashboard />
            </div>
          ) : <Navigate to={`/${user.role}`} replace />
        } 
      />
      <Route 
        path="/visitor" 
        element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'visitor' ? (
            <div className="container">
              <Navigation />
              <VisitorDashboard />
            </div>
          ) : <Navigate to={`/${user.role}`} replace />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;