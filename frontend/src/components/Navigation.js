import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'stall': return 'Stall';
      case 'visitor': return 'Visitor';
      default: return 'User';
    }
  };

  return (
    <div className="header">
      <div className="nav">
        <div className="logo">
          PointX
        </div>
        
        <div className="nav-links">
          <span className="nav-link hidden-mobile">
            {getRoleIcon(user.role)} - {user.username}
          </span>
          <span className="nav-link hidden-desktop">
            {user.username}
          </span>
          <button 
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ 
              background: 'rgba(255, 255, 255, 0.2)', 
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              backdropFilter: 'blur(10px)'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navigation;