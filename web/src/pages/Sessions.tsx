import React, { useState } from 'react';
import './Sessions.css';

const Sessions: React.FC = () => {
  const [sessions, setSession] = useState<any[]>([
    { id: 1, name: 'Session 1', status: 'running', progress: 50 },
    { id: 2, name: 'Session 2', status: 'completed', progress: 100 },
  ]);

  return (
    <div className="sessions-page">
      <div className="page-header">
        <h1>All Sessions</h1>
        <button className="btn-primary">+ Create New Session</button>
      </div>

      <div className="filters">
        <select className="filter-select">
          <option>All Status</option>
          <option>Running</option>
          <option>Completed</option>
          <option>Failed</option>
        </select>
        <select className="filter-select">
          <option>All Projects</option>
        </select>
      </div>

      <div className="sessions-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Started</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.name}</td>
                <td><span className={`badge ${session.status}`}>{session.status}</span></td>
                <td>
                  <div className="progress-mini">
                    <div className="progress-fill" style={{ width: `${session.progress}%` }}></div>
                  </div>
                </td>
                <td>2 hours ago</td>
                <td>
                  <button className="btn-action">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sessions;
