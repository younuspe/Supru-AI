import React, { useState, useEffect } from 'react';
import SessionCard from '../components/SessionCard';
import './Dashboard.css';

interface Session {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  timestamp: string;
}

const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      name: 'Feature: User Authentication',
      status: 'running',
      progress: 65,
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      name: 'Bug Fix: Navigation',
      status: 'completed',
      progress: 100,
      timestamp: '1 hour ago',
    },
    {
      id: '3',
      name: 'Refactor: API Layer',
      status: 'running',
      progress: 40,
      timestamp: 'Just now',
    },
  ]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Welcome back! Here's your AI coding sessions.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">3</div>
          <div className="stat-label">Active Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">12</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">2h 30m</div>
          <div className="stat-label">Total Runtime</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">95%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      <section className="sessions-section">
        <h2>Recent Sessions</h2>
        <div className="sessions-grid">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </section>

      <section className="activity-section">
        <h2>Activity Feed</h2>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">✅</div>
            <div className="activity-content">
              <p className="activity-title">Session Completed</p>
              <p className="activity-desc">Bug Fix: Navigation - 100% success</p>
              <p className="activity-time">1 hour ago</p>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">⚙️</div>
            <div className="activity-content">
              <p className="activity-title">Session Started</p>
              <p className="activity-desc">Refactor: API Layer - Now running</p>
              <p className="activity-time">Just now</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
