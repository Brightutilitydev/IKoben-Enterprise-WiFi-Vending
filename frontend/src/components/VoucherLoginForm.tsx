'use client';

import { useState, useEffect } from 'react';
import { validateVoucher } from '@/lib/api';

export default function VoucherLoginForm() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // MikroTik Query Params
  const [mac, setMac] = useState('');
  const [ip, setIp] = useState('');
  const [linkLoginOnly, setLinkLoginOnly] = useState('');

  useEffect(() => {
    // Extract query parameters from URL safely in client component
    const params = new URLSearchParams(window.location.search);
    setMac(params.get('mac') || '');
    setIp(params.get('ip') || '');
    
    const linkOnly = params.get('link-login-only');
    if (linkOnly && (linkOnly.startsWith('http://') || linkOnly.startsWith('https://'))) {
      setLinkLoginOnly(linkOnly);
    }
  }, []);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await validateVoucher({
        pin,
        mac_address: mac,
        ip_address: ip,
        link_login_only: linkLoginOnly
      });
      
      // If validation is successful and RouterOS account is mocked/provisioned,
      // we must submit a POST form to MikroTik's login URL with CHAP/PAP credentials.
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = res.login_url || 'http://10.5.50.1/login';
      
      const usernameInput = document.createElement('input');
      usernameInput.type = 'hidden';
      usernameInput.name = 'username';
      usernameInput.value = res.mikrotik_username;
      
      const passwordInput = document.createElement('input');
      passwordInput.type = 'hidden';
      passwordInput.name = 'password';
      passwordInput.value = res.mikrotik_password;
      
      form.appendChild(usernameInput);
      form.appendChild(passwordInput);
      document.body.appendChild(form);
      form.submit();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during validation.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center space-y-3.5">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">Have a Voucher PIN?</h2>
        <p className="text-xs text-gray-500">Enter your access code below to start browsing</p>
      </div>
      <form onSubmit={handleValidate} className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text" 
            placeholder="ENTER VOUCHER PIN" 
            className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-base sm:text-lg tracking-wider font-mono uppercase bg-white shadow-xs transition-all"
            maxLength={16}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={loading}
            required
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button 
            type="submit"
            disabled={loading || !pin.trim()} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 sm:py-2.5 rounded-xl font-bold text-sm tracking-wide disabled:opacity-50 transition-all shadow-xs shrink-0 flex items-center justify-center gap-2"
          >
            {loading ? 'Connecting...' : 'Connect Now'}
          </button>
        </div>
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold text-center animate-in fade-in">
            {error}
          </div>
        )}
      </form>
    </div>
  );

}
