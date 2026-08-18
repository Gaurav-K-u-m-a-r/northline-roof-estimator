import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await adminLogin(username.trim(), password);
      localStorage.setItem('wantace_admin_token', data.token);
      localStorage.setItem('wantace_admin_username', data.username);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="brand">Owner Panel</div>
        <form className="step" onSubmit={handleSubmit}>
          <h2>Log in</h2>
          <label className="field">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="error-box">{error}</div>}
          <div className="step-actions">
            <span />
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
