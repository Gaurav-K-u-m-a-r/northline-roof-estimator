import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminConfig, saveAdminConfig, getAdminLeads } from '../api.js';

export default function AdminPanel() {
  const [tab, setTab] = useState('pricing');
  const navigate = useNavigate();
  const username = localStorage.getItem('wantace_admin_username');

  function logout() {
    localStorage.removeItem('wantace_admin_token');
    localStorage.removeItem('wantace_admin_username');
    navigate('/admin/login');
  }

  return (
    <div className="page admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <div className="brand">Owner Panel</div>
            <div className="muted small">Logged in as {username}</div>
          </div>
          <button className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </header>

        <nav className="admin-tabs">
          <button
            className={`tab ${tab === 'pricing' ? 'active' : ''}`}
            onClick={() => setTab('pricing')}
          >
            Questions & Pricing
          </button>
          <button className={`tab ${tab === 'leads' ? 'active' : ''}`} onClick={() => setTab('leads')}>
            Leads
          </button>
        </nav>

        {tab === 'pricing' ? <PricingEditor /> : <LeadsView />}
      </div>
    </div>
  );
}

function PricingEditor() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveMsg, setSaveMsg] = useState('');

  function load() {
    setStatus('loading');
    getAdminConfig()
      .then((data) => {
        setConfig(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(load, []);

  if (status === 'loading') return <p className="muted">Loading current pricing…</p>;
  if (status === 'error')
    return <div className="error-box">Couldn't load the current configuration. Try refreshing.</div>;

  function updateQuestion(index, patch) {
    setConfig((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], ...patch };
      return { ...prev, questions };
    });
  }

  function updateOption(qIndex, optIndex, patch) {
    setConfig((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[qIndex].options];
      options[optIndex] = { ...options[optIndex], ...patch };
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  }

  function updateModifier(key, value) {
    setConfig((prev) => ({ ...prev, modifiers: { ...prev.modifiers, [key]: value } }));
  }

  async function handleSave() {
    setSaveState('saving');
    setSaveMsg('');
    try {
      const saved = await saveAdminConfig(config);
      setConfig(saved);
      setSaveState('saved');
      setSaveMsg(`Saved — now live as version ${saved.config_version}.`);
    } catch (err) {
      setSaveState('error');
      setSaveMsg(err.message || 'Could not save changes.');
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Questions & pricing</h2>
          <p className="muted small">
            Turn questions on or off, edit wording, and change rates. Changes go live the moment
            you save — homeowners mid-estimate keep going without interruption.
          </p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {saveMsg && (
        <div className={saveState === 'error' ? 'error-box' : 'success-box'}>{saveMsg}</div>
      )}

      {config.questions.map((q, qIndex) => (
        <div className={`admin-card ${q.active ? '' : 'inactive'}`} key={q.key}>
          <div className="admin-card-top">
            <label className="toggle">
              <input
                type="checkbox"
                checked={q.active}
                onChange={(e) => updateQuestion(qIndex, { active: e.target.checked })}
              />
              <span>{q.active ? 'Shown to homeowners' : 'Hidden'}</span>
            </label>
            <span className="muted small">key: {q.key}</span>
          </div>

          <label className="field">
            <span>Question wording</span>
            <input
              value={q.label}
              onChange={(e) => updateQuestion(qIndex, { label: e.target.value })}
            />
          </label>

          {q.type === 'number' && (
            <div className="inline-fields">
              <label className="field small-field">
                <span>Minimum ({q.unit})</span>
                <input
                  type="number"
                  value={q.min ?? ''}
                  onChange={(e) => updateQuestion(qIndex, { min: Number(e.target.value) })}
                />
              </label>
              <label className="field small-field">
                <span>Maximum ({q.unit})</span>
                <input
                  type="number"
                  value={q.max ?? ''}
                  onChange={(e) => updateQuestion(qIndex, { max: Number(e.target.value) })}
                />
              </label>
            </div>
          )}

          {q.type === 'select' && (
            <div className="options-editor">
              {q.options.map((opt, optIndex) => (
                <div className="option-row" key={opt.value}>
                  <input
                    className="option-label-input"
                    value={opt.label}
                    onChange={(e) => updateOption(qIndex, optIndex, { label: e.target.value })}
                  />
                  {opt.rate_per_sqft !== undefined && (
                    <RateField
                      label="$ / sq ft"
                      value={opt.rate_per_sqft}
                      onChange={(v) => updateOption(qIndex, optIndex, { rate_per_sqft: v })}
                    />
                  )}
                  {opt.multiplier !== undefined && (
                    <RateField
                      label="× multiplier"
                      value={opt.multiplier}
                      step="0.01"
                      onChange={(v) => updateOption(qIndex, optIndex, { multiplier: v })}
                    />
                  )}
                  {opt.tear_off_per_sqft !== undefined && (
                    <RateField
                      label="tear-off $/sqft"
                      value={opt.tear_off_per_sqft}
                      onChange={(v) => updateOption(qIndex, optIndex, { tear_off_per_sqft: v })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="admin-card">
        <h3>Global pricing settings</h3>
        <div className="inline-fields">
          <RateField
            label="Waste factor (e.g. 0.10 = 10%)"
            value={config.modifiers.waste_factor}
            step="0.01"
            onChange={(v) => updateModifier('waste_factor', v)}
          />
          <RateField
            label="Permit flat fee ($)"
            value={config.modifiers.permit_flat_fee}
            onChange={(v) => updateModifier('permit_flat_fee', v)}
          />
          <RateField
            label="Estimate range spread (%)"
            value={config.modifiers.range_spread_pct}
            onChange={(v) => updateModifier('range_spread_pct', v)}
          />
        </div>
      </div>
    </div>
  );
}

function RateField({ label, value, onChange, step = '0.01' }) {
  return (
    <label className="field small-field">
      <span>{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function LeadsView() {
  const [leads, setLeads] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getAdminLeads()
      .then((data) => {
        setLeads(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') return <p className="muted">Loading leads…</p>;
  if (status === 'error') return <div className="error-box">Couldn't load leads.</div>;
  if (leads.length === 0) return <p className="muted">No leads yet.</p>;

  return (
    <div className="admin-section">
      <h2>Leads ({leads.length})</h2>
      <div className="leads-table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Estimate</th>
              <th>Answers</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id}>
                <td>{new Date(lead.captured_at).toLocaleDateString()}</td>
                <td>{lead.name}</td>
                <td>{lead.phone}</td>
                <td>
                  ${Math.round(lead.estimate_low).toLocaleString()} – $
                  {Math.round(lead.estimate_high).toLocaleString()}
                </td>
                <td className="answers-cell">
                  {Object.entries(lead.answers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
