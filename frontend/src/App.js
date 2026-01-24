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

  if (!user) {
    return <Login />;
  }

  return (
    <div className="container">
      <Navigation />
      <Routes>
        <Route path="/" element={<Navigate to={`/${user.role}`} replace />} />
        <Route 
          path="/admin" 
          element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to={`/${user.role}`} />} 
        />
        <Route 
          path="/stall" 
          element={user.role === 'stall' ? <StallDashboard /> : <Navigate to={`/${user.role}`} />} 
        />
        <Route 
          path="/visitor" 
          element={user.role === 'visitor' ? <VisitorDashboard /> : <Navigate to={`/${user.role}`} />} 
        />
      </Routes>
    </div>
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