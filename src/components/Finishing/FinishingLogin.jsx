import { useState } from 'react';

export default function FinishingLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (
        username.trim().toLowerCase() === 'finishing' &&
        password.trim().toLowerCase() === 'finishing'
      ) {
        sessionStorage.setItem('finishing_auth', 'true');
        onLogin();
      } else {
        setError('Invalid username or password.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '12px',
          }}>🛢️</div>
          <div style={{
            color: '#c4a35a',
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            marginBottom: '4px',
          }}>
            Speyside Bourbon Cooperage
          </div>
          <div style={{
            color: '#475569',
            fontSize: '13px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            BOL Creator — Finishing Floor
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{
            color: '#f1f5f9',
            fontSize: '18px',
            fontWeight: '700',
            margin: '0 0 24px',
            textAlign: 'center',
          }}>
            Sign In
          </h2>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#ef4444',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: '600',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: '600',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '12px',
                background: loading ? 'rgba(196,163,90,0.5)' : '#c4a35a',
                border: 'none',
                borderRadius: '8px',
                color: '#1a1a1a',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a
            href="/login"
            style={{ color: '#475569', fontSize: '12px', textDecoration: 'none' }}
          >
            ← Back to main login
          </a>
        </div>
      </div>
    </div>
  );
}
