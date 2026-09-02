import React from 'react';
import './SessionCard.css';

interface SessionCardProps {
  session: {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    timestamp: string;
  };
}

const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const statusColors = {
    running: '#6fe3a0',
    completed: '#58a6ff',
    failed: '#f85149',
  };

  return (
    <div className="session-card">
      <div className="session-header">
        <div className="session-title">{session.name}</div>
        <div className={`session-status ${session.status}`}>
          {session.status === 'running' && '⚙️'}
          {session.status === 'completed' && '✅'}
          {session.status === 'failed' && '❌'}
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>Progress</span>
          <span className="progress-value">{session.progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${session.progress}%`,
              backgroundColor: statusColors[session.status],
            }}
          ></div>
        </div>
      </div>

      <div className="session-footer">
        <span className="session-time">{session.timestamp}</span>
        <button className="view-btn">View Details →</button>
      </div>
    </div>
  );
};

export default SessionCard;
