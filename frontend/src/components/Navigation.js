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
          POINTX
        </div>
        
        <div className="nav-links">
          <span className="member-badge hidden-mobile">
            {getRoleIcon(user.role)} - {user.username}
          </span>
          <span className="member-badge hidden-desktop">
            {user.username}
          </span>
          <button 
            onClick={logout}
            className="btn btn-secondary btn-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navigation;