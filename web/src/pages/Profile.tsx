import React from 'react';
import './Profile.css';

const Profile: React.FC = () => {
  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-large">🐱</div>
        <div>
          <h1>Your Profile</h1>
          <p>Manage your account and preferences</p>
        </div>
      </div>

      <div className="profile-sections">
        <section className="profile-section">
          <h2>Account Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Username</label>
              <p>developer</p>
            </div>
            <div className="info-item">
              <label>Email</label>
              <p>dev@supru-ai.com</p>
            </div>
            <div className="info-item">
              <label>Joined</label>
              <p>January 2024</p>
            </div>
            <div className="info-item">
              <label>Status</label>
              <p className="status-badge">Active</p>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2>Recent Activity</h2>
          <ul className="activity-log">
            <li>✅ Completed: Feature Development (2 hours ago)</li>
            <li>⚙️ Started: Bug Fixes (30 minutes ago)</li>
            <li>✅ Completed: Code Review (1 day ago)</li>
          </ul>
        </section>

        <section className="profile-section danger-zone">
          <h2>Danger Zone</h2>
          <button className="btn-danger">Logout</button>
          <button className="btn-danger">Delete Account</button>
        </section>
      </div>
    </div>
  );
};

export default Profile;
