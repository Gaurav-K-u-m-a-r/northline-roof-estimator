import React, { useEffect, useState } from 'react';
import { getPublicConfig, submitEstimate } from '../api.js';

const STEP = { LOADING: 'loading', LOAD_ERROR: 'load_error', QUESTIONS: 'questions', CONTACT: 'contact', SUBMITTING: 'submitting', RESULT: 'result', SUBMIT_ERROR: 'submit_error' };

export default function Estimator() {
  const [phase, setPhase] = useState(STEP.LOADING);
  const [config, setConfig] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [fieldError, setFieldError] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [contactErrors, setContactErrors] = useState({});
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPublicConfig()
      .then((data) => {
        if (cancelled) return;
        if (!data.questions || data.questions.length === 0) {
          setPhase(STEP.LOAD_ERROR);
          return;
        }
        setConfig(data);
        setPhase(STEP.QUESTIONS);
      })
      .catch(() => !cancelled && setPhase(STEP.LOAD_ERROR));
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === STEP.LOADING) {
    return (
      <Shell>
        <p className="muted">Loading estimator…</p>
      </Shell>
    );
  }

  if (phase === STEP.LOAD_ERROR) {
    return (
      <Shell>
        <div className="error-box">
          Couldn't load the estimator right now. Please refresh the page, or check back shortly.
        </div>
      </Shell>
    );
  }

  const questions = config.questions;
  const question = questions[qIndex];

  function validateCurrent(value) {
    if (question.required && (value === undefined || value === null || value === '')) {
      return 'This one is required.';
    }
    if (question.type === 'number' && value !== '' && value !== undefined) {
      const num = Number(value);
      if (Number.isNaN(num)) return 'Please enter a number.';
      if (question.min !== undefined && num < question.min)
        return `Must be at least ${question.min}${question.unit ? ' ' + question.unit : ''}.`;
      if (question.max !== undefined && num > question.max)
        return `Must be at most ${question.max}${question.unit ? ' ' + question.unit : ''}.`;
    }
    return '';
  }

  function goNext(value) {
    const err = validateCurrent(value);
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError('');
    setAnswers((prev) => ({ ...prev, [question.key]: value }));
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      setPhase(STEP.CONTACT);
    }
  }

  function goBack() {
    setFieldError('');
    if (qIndex === 0) return;
    setQIndex(qIndex - 1);
  }

  function validateContact() {
    const errs = {};
    if (!contact.name.trim()) errs.name = 'Name is required.';
    if (!contact.phone.trim()) errs.phone = 'Phone number is required.';
    else if (!/^[\d+()\-.\s]{7,}$/.test(contact.phone.trim())) errs.phone = 'That phone number looks off.';
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()))
      errs.email = 'That email looks off.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateContact();
    setContactErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPhase(STEP.SUBMITTING);
    setSubmitError('');
    try {
      const data = await submitEstimate({
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim() || undefined,
        answers
      });
      setResult(data);
      setPhase(STEP.RESULT);
    } catch (err) {
      setSubmitError(
        err.code === 'STALE_CONFIG'
          ? 'The estimator was just updated. Please restart your estimate below.'
          : err.message || 'Something went wrong submitting your estimate.'
      );
      setPhase(STEP.SUBMIT_ERROR);
    }
  }

  function restart() {
    setAnswers({});
    setQIndex(0);
    setContact({ name: '', phone: '', email: '' });
    setContactErrors({});
    setResult(null);
    setSubmitError('');
    setPhase(STEP.LOADING);
    getPublicConfig()
      .then((data) => {
        setConfig(data);
        setPhase(STEP.QUESTIONS);
      })
      .catch(() => setPhase(STEP.LOAD_ERROR));
  }

  if (phase === STEP.RESULT) {
    return (
      <Shell business={config.business}>
        <div className="result-card">
          <h2>Your estimate</h2>
          <p className="estimate-range">
            {formatCurrency(result.estimate_low, result.currency)} –{' '}
            {formatCurrency(result.estimate_high, result.currency)}
          </p>
          <p className="muted">
            This is a preliminary range based on what you told us. A member of the{' '}
            {config.business.name} team will follow up to confirm the details.
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === STEP.CONTACT || phase === STEP.SUBMITTING || phase === STEP.SUBMIT_ERROR) {
    return (
      <Shell business={config.business}>
        <ProgressBar current={questions.length} total={questions.length + 1} />
        <form className="step" onSubmit={handleSubmit}>
          <h2>Almost done — where should we send this?</h2>
          <label className="field">
            <span>Your name</span>
            <input
              type="text"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              autoFocus
            />
            {contactErrors.name && <span className="field-error">{contactErrors.name}</span>}
          </label>
          <label className="field">
            <span>Phone number</span>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            />
            {contactErrors.phone && <span className="field-error">{contactErrors.phone}</span>}
          </label>
          <label className="field">
            <span>Email (optional)</span>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
            {contactErrors.email && <span className="field-error">{contactErrors.email}</span>}
          </label>

          {submitError && <div className="error-box">{submitError}</div>}

          <div className="step-actions">
            <button type="button" className="btn-secondary" onClick={() => setPhase(STEP.QUESTIONS)}>
              Back
            </button>
            {phase === STEP.SUBMIT_ERROR && submitError.includes('restart') ? (
              <button type="button" className="btn-primary" onClick={restart}>
                Restart estimate
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={phase === STEP.SUBMITTING}>
                {phase === STEP.SUBMITTING ? 'Calculating…' : 'Get my estimate'}
              </button>
            )}
          </div>
        </form>
      </Shell>
    );
  }

  // phase === QUESTIONS
  return (
    <Shell business={config.business}>
      <ProgressBar current={qIndex} total={questions.length + 1} />
      <QuestionStep
        key={question.key}
        question={question}
        initialValue={answers[question.key]}
        error={fieldError}
        onNext={goNext}
        onBack={qIndex > 0 ? goBack : null}
      />
    </Shell>
  );
}

function QuestionStep({ question, initialValue, error, onNext, onBack }) {
  const [value, setValue] = useState(initialValue ?? '');

  return (
    <div className="step">
      <h2>{question.label}</h2>
      {question.type === 'number' && (
        <input
          type="number"
          className="big-input"
          value={value}
          placeholder={question.unit ? `e.g. 1800 ${question.unit}` : ''}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      )}
      {question.type === 'select' && (
        <div className="option-grid">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-card ${value === opt.value ? 'selected' : ''}`}
              onClick={() => setValue(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
      <div className="step-actions">
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn-primary" onClick={() => onNext(value)}>
          Continue
        </button>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Shell({ children, business }) {
  return (
    <div className="page">
      <div className="card">
        <div className="brand">{business?.name || 'Roof Estimator'}</div>
        {children}
      </div>
    </div>
  );
}

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString()}`;
  }
}
