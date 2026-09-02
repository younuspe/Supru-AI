import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: '🏠 Dashboard' },
    { path: '/sessions', label: '📋 Sessions' },
    { path: '/settings', label: '⚙️ Settings' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button className="new-session" onClick={() => navigate('/sessions')}
      >
        ✨ New Session
      </button>

      <nav className="nav-menu">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer"></div>

      <div className="user-panel">
        <div className="avatar">🐱</div>
        <div className="username">You</div>
        <div className="user-controls">
          <button className="gear-btn" title="Settings">⚙️</button>
          <button className="connect-btn">Connect</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
