'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { Wifi } from 'lucide-react';

export default function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = getApiBaseUrl();
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      onLogin(data.access_token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-sm mb-3">
            <Wifi className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Portal</h2>
          <p className="text-xs text-gray-500 mt-1">Sign in to manage vouchers, plans & router</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Username</label>
            <input 
              type="text" 
              required
              placeholder="e.g. admin"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold text-center">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

