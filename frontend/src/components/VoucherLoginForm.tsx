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
    <div className="max-w-md mx-auto text-center space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Already have a PIN?</h2>
      <form onSubmit={handleValidate} className="space-y-2">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter your Voucher PIN" 
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg tracking-widest font-mono uppercase"
            maxLength={16}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={loading}
            required
          />
          <button 
            type="submit"
            disabled={loading || !pin.trim()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Connect'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      </form>
    </div>
  );
}
