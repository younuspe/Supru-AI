import React, { useState } from 'react';
import './Settings.css';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    autoSave: true,
    apiKey: '****',
  });

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <div className="settings-sections">
        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="setting-item">
            <label>Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
            >
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>Notifications</h2>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) =>
                  setSettings({ ...settings, notifications: e.target.checked })
                }
              />
              Enable Notifications
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>Behavior</h2>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) =>
                  setSettings({ ...settings, autoSave: e.target.checked })
                }
              />
              Auto-save Sessions
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>API Configuration</h2>
          <div className="setting-item">
            <label>API Key</label>
            <input type="password" value={settings.apiKey} readOnly />
          </div>
          <button className="btn-secondary">Generate New Key</button>
        </section>
      </div>
    </div>
  );
};

export default Settings;
