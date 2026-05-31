// src/components/Auth/LoginScreen.jsx
// Speyside BOL Manager Login

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/store';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (user && role) {
      redirectByRole(role);
    }
  }, [user, role]);

  const redirectByRole = (userRole) => {
    if (userRole === 'admin') {
      navigate('/admin/schedule');
    } else if (userRole === 'supervisor') {
      navigate('/supervisor/dashboard');
    } else if (userRole === 'view_only') {
      navigate('/viewer/schedule');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const success = await login(email, password);

    if (!success) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }
  };

  const fillDemoCredentials = (role) => {
    const credentials = {
      admin: { email: 'admin@speysidebci.com', password: 'demo123' },
      supervisor: { email: 'supervisor@speysidebci.com', password: 'demo123' },
      viewer: { email: 'viewer@speysidebci.com', password: 'demo123' },
    };
    const cred = credentials[role];
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4 text-4xl">🛢️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Speyside BOL Manager</h1>
          <p className="text-slate-400">Barrel shipping made simple</p>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-8 mb-6">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? '👁️' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition duration-200 mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-6">
          <p className="text-sm font-medium text-slate-300 mb-4 text-center">
            Demo Accounts (Development)
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded transition"
            >
              Admin Account
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('supervisor')}
              className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded transition"
            >
              Supervisor Account
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('viewer')}
              className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded transition"
            >
              View-Only Account
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-4">
            Fills email and password — submit the form to sign in
          </p>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Speyside Bourbon Cooperage, Inc • Jackson, Ohio
        </p>
      </div>
    </div>
  );
}
