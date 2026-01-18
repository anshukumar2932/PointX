import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'stall': return '🎪';
      case 'visitor': return '🎮';
      default: return '👤';
    }
  };

  return (
    <div className="header">
      <div className="nav">
        <div className="logo">
          🎮 Arcade Wallet
        </div>
        
        <div className="nav-links">
          <span className="nav-link">
            {getRoleIcon(user.role)} {user.username} ({user.role})
          </span>
          <button 
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navigation;