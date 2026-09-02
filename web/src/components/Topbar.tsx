import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Topbar.css';

interface TopbarProps {
  onToggleSidebar: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          ☰
        </button>
        <div className="brand">
          <div className="brand-name">Supru AI</div>
          <div className="brand-tag">Power of Meow!</div>
        </div>
        <div className="status">
          <div className="status-dot"></div>
          <span>Connected</span>
        </div>
      </div>

      <div className="topbar-right">
        <input type="text" className="search-box" placeholder="Search sessions..." />
        <a href="#docs" className="nav-link">Docs</a>
        <a href="#github" className="nav-link">GitHub</a>
        <button className="profile-avatar" onClick={() => navigate('/profile')}>
          👤
        </button>
      </div>
    </div>
  );
};

export default Topbar;
