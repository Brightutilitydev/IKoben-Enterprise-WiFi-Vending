'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { Activity, CreditCard, Tag, Wifi, Box, ShieldBan, Trash2, Check, Plus, Printer, X, Pencil, PhoneCall, MessageSquare, MapPin, Menu } from 'lucide-react';

export default function AdminDashboard({ token, onLogout }: { token: string, onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const [network, setNetwork] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  
  // Contact & Reception Settings
  const [contactSettings, setContactSettings] = useState({
    phone_primary: '',
    phone_secondary: '',
    whatsapp_number: '',
    support_email: '',
    physical_location: '',
    payment_instructions: ''
  });
  const [savingContact, setSavingContact] = useState(false);
  const [contactSavedSuccess, setContactSavedSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Filters
  const [voucherFilter, setVoucherFilter] = useState('ALL');
  const [txSearch, setTxSearch] = useState('');

  const API_BASE_URL = getApiBaseUrl();

  const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    if (res.status === 401) onLogout();
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const [dashStats, allPlans, contactData] = await Promise.all([
          fetchAPI('/admin/dashboard'),
          fetchAPI('/admin/plans'),
          fetchAPI('/contact/')
        ]);
        setStats(dashStats);
        setPlans(allPlans);
        if (contactData) setContactSettings(contactData);
      } else if (activeTab === 'network') {
        setNetwork(await fetchAPI('/admin/network/status'));
      } else if (activeTab === 'vouchers') {
        setVouchers(await fetchAPI('/admin/vouchers'));
      } else if (activeTab === 'transactions') {
        setTransactions(await fetchAPI('/admin/transactions'));
      } else if (activeTab === 'plans') {
        setPlans(await fetchAPI('/admin/plans'));
      } else if (activeTab === 'contact') {
        const contactData = await fetchAPI('/contact/');
        if (contactData) setContactSettings(contactData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    setContactSavedSuccess(false);
    try {
      const res = await fetchAPI('/contact/', {
        method: 'PUT',
        body: JSON.stringify(contactSettings)
      });
      if (res.contact) setContactSettings(res.contact);
      setContactSavedSuccess(true);
      setTimeout(() => setContactSavedSuccess(false), 4000);
    } catch (err: any) {
      alert("Error saving contact settings: " + err.message);
    } finally {
      setSavingContact(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
    const interval = setInterval(loadData, 10000); 
    return () => clearInterval(interval);
  }, [activeTab, token]);

  const killSession = async (id: string) => {
    if (!confirm("Disconnect this user?")) return;
    await fetchAPI(`/admin/network/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadData();
  };

  const revokeVoucher = async (id: number) => {
    if (!confirm("Revoke this voucher completely?")) return;
    await fetchAPI(`/admin/vouchers/${id}/revoke`, { method: 'POST' });
    loadData();
  };

  const togglePlan = async (id: number) => {
    await fetchAPI(`/admin/plans/${id}/toggle`, { method: 'PUT' });
    loadData();
  };

  // Plan Creation
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ 
    name: '', description: '', price: '', 
    data_val: '', data_unit: 'MB', data_unlimited: false,
    time_val: '', time_unit: 'Minutes', time_unlimited: false,
    validity_days: '', rate_limit: '2M/2M' 
  });
  
  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let data_mb = null;
      if (!newPlan.data_unlimited && newPlan.data_val) {
        data_mb = newPlan.data_unit === 'GB' ? parseInt(newPlan.data_val) * 1024 : parseInt(newPlan.data_val);
      }
      
      let uptime_mins = null;
      if (!newPlan.time_unlimited && newPlan.time_val) {
        uptime_mins = newPlan.time_unit === 'Hours' ? parseInt(newPlan.time_val) * 60 : parseInt(newPlan.time_val);
      }

      if (!data_mb && !uptime_mins && !newPlan.validity_days) {
         throw new Error("At least one quota/validity limit must be specified.");
      }

      const payload = {
        name: newPlan.name,
        description: newPlan.description,
        price: parseFloat(newPlan.price),
        data_mb,
        uptime_mins,
        validity_days: parseInt(newPlan.validity_days),
        rate_limit: newPlan.rate_limit
      };
      await fetchAPI('/admin/plans', { method: 'POST', body: JSON.stringify(payload) });
      setShowPlanModal(false);
      setNewPlan({ 
        name: '', description: '', price: '', 
        data_val: '', data_unit: 'MB', data_unlimited: false,
        time_val: '', time_unit: 'Minutes', time_unlimited: false,
        validity_days: '', rate_limit: '2M/2M' 
      });
      loadData();
    } catch(err:any) {
      alert("Error creating plan: " + err.message);
    }
  };

  // Plan Edit & Delete
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editPlanForm, setEditPlanForm] = useState({ 
    name: '', description: '', price: '', 
    data_val: '', data_unit: 'MB', data_unlimited: false,
    time_val: '', time_unit: 'Minutes', time_unlimited: false,
    validity_days: '', rate_limit: '2M/2M' 
  });

  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    const hasData = !!plan.data_mb;
    const isGB = hasData && plan.data_mb >= 1024 && plan.data_mb % 1024 === 0;
    const hasTime = !!plan.uptime_mins;
    const isHours = hasTime && plan.uptime_mins >= 60 && plan.uptime_mins % 60 === 0;

    setEditPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      data_val: hasData ? (isGB ? (plan.data_mb / 1024).toString() : plan.data_mb.toString()) : '',
      data_unit: isGB ? 'GB' : 'MB',
      data_unlimited: !hasData,
      time_val: hasTime ? (isHours ? (plan.uptime_mins / 60).toString() : plan.uptime_mins.toString()) : '',
      time_unit: isHours ? 'Hours' : 'Minutes',
      time_unlimited: !hasTime,
      validity_days: plan.validity_days ? plan.validity_days.toString() : '',
      rate_limit: plan.rate_limit || '2M/2M'
    });
  };

  const saveEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      let data_mb = null;
      if (!editPlanForm.data_unlimited && editPlanForm.data_val) {
        data_mb = editPlanForm.data_unit === 'GB' ? parseInt(editPlanForm.data_val) * 1024 : parseInt(editPlanForm.data_val);
      }
      
      let uptime_mins = null;
      if (!editPlanForm.time_unlimited && editPlanForm.time_val) {
        uptime_mins = editPlanForm.time_unit === 'Hours' ? parseInt(editPlanForm.time_val) * 60 : parseInt(editPlanForm.time_val);
      }

      if (!data_mb && !uptime_mins && !editPlanForm.validity_days) {
         throw new Error("At least one quota/validity limit must be specified.");
      }

      const payload = {
        name: editPlanForm.name,
        description: editPlanForm.description,
        price: parseFloat(editPlanForm.price),
        data_mb,
        uptime_mins,
        validity_days: parseInt(editPlanForm.validity_days),
        rate_limit: editPlanForm.rate_limit
      };
      await fetchAPI(`/admin/plans/${editingPlan.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setEditingPlan(null);
      loadData();
    } catch(err:any) {
      alert("Error updating plan: " + err.message);
    }
  };

  const deletePlan = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete plan "${name}"? This action cannot be undone.`)) return;
    try {
      await fetchAPI(`/admin/plans/${id}`, { method: 'DELETE' });
      loadData();
    } catch(err:any) {
      alert("Error deleting plan: " + err.message);
    }
  };

  // Batch generation
  const [batchPlanId, setBatchPlanId] = useState('');
  const [batchCount, setBatchCount] = useState('10');
  const [generatedPins, setGeneratedPins] = useState<string[]>([]);
  
  const generateVouchers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchPlanId) return alert("Select a plan");
    try {
      const res = await fetchAPI(`/admin/vouchers/batch`, {
        method: 'POST',
        body: JSON.stringify({ plan_id: parseInt(batchPlanId), count: parseInt(batchCount) })
      });
      setGeneratedPins(res.pins);
      loadData();
    } catch(e:any) {
      alert(e.message);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-vouchers');
    const windowPrint = window.open('', '', 'width=800,height=600');
    windowPrint?.document.write(`
      <html>
        <head><title>Print Vouchers</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h2>IKoben Wi-Fi Vouchers</h2>
          ${printContent?.innerHTML || ''}
        </body>
      </html>
    `);
    windowPrint?.document.close();
    windowPrint?.print();
  };

  const filteredVouchers = vouchers.filter(v => voucherFilter === 'ALL' || v.status === voucherFilter);
  const filteredTx = transactions.filter(tx => 
    txSearch === '' || 
    tx.reference.toLowerCase().includes(txSearch.toLowerCase()) || 
    (tx.voucher_pin && tx.voucher_pin.includes(txSearch))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Wifi className="w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900 text-base">IKoben Admin</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-xs animate-in fade-in"
        />
      )}

      {/* Sidebar (Desktop persistent + Mobile slide-out drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Wifi className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-gray-900">IKoben Admin</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'network', label: 'Network', icon: Wifi },
            { id: 'vouchers', label: 'Vouchers', icon: Tag },
            { id: 'plans', label: 'Plans', icon: Box },
            { id: 'contact', label: 'Reception & Contact', icon: PhoneCall },
            { id: 'transactions', label: 'Ledger', icon: CreditCard },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                  active ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <button onClick={onLogout} className="w-full text-center px-4 py-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 rounded-xl text-sm font-medium transition-colors">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 md:ml-64 overflow-y-auto min-w-0">
        {loading && !stats && !network && vouchers.length === 0 ? (
          <div className="text-gray-500 text-center py-12">Loading system metrics...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && stats && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Overview</h2>
                  <p className="text-xs sm:text-sm text-gray-500">Real-time captive portal and voucher statistics</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Vouchers</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">{stats.total_vouchers}</p>
                  </div>
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Active Sessions</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">{stats.active_sessions}</p>
                  </div>
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">₦{stats.total_revenue}</p>
                  </div>
                </div>


                {/* Wi-Fi Data Pricing Packages */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Current Data Pricing Packages</h3>
                      <p className="text-sm text-gray-500">Active Wi-Fi plans currently live on the main captive portal</p>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('plans'); setShowPlanModal(true); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Plan
                    </button>
                  </div>
                  
                  {plans.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No plans configured yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {plans.map((p: any) => (
                        <div key={p.id} className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${p.is_active ? 'border-blue-200 bg-blue-50/20 shadow-sm' : 'border-gray-200 bg-gray-50/60 opacity-60'}`}>
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900 text-base">{p.name}</h4>
                              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm">₦{p.price}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
                            <div className="text-xs space-y-1.5 text-gray-700 bg-white p-2.5 rounded-lg border border-gray-100">
                              <p className="flex justify-between"><span className="text-gray-400">Data Limit:</span> <span className="font-medium">{p.data_mb ? (p.data_mb >= 1024 ? `${(p.data_mb/1024).toFixed(1)} GB` : `${p.data_mb} MB`) : 'Unlimited'}</span></p>
                              <p className="flex justify-between"><span className="text-gray-400">Session Time:</span> <span className="font-medium">{p.uptime_mins ? (p.uptime_mins >= 60 ? `${(p.uptime_mins/60).toFixed(0)} Hours` : `${p.uptime_mins} Mins`) : 'Unlimited'}</span></p>
                              <p className="flex justify-between"><span className="text-gray-400">Validity:</span> <span className="font-medium">{p.validity_days ? `${p.validity_days} Days` : 'N/A'}</span></p>
                              <p className="flex justify-between"><span className="text-gray-400">Speed (Up/Down):</span> <span className="font-mono text-[11px] text-blue-600">{p.rate_limit}</span></p>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                              {p.is_active ? '● Live' : '○ Hidden'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => openEditPlan(p)}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => togglePlan(p.id)}
                                className="text-gray-600 hover:text-gray-800 font-medium"
                              >
                                {p.is_active ? 'Hide' : 'Show'}
                              </button>
                              <button 
                                onClick={() => deletePlan(p.id, p.name)}
                                className="text-red-600 hover:text-red-800 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vending Contact & Reception Card */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Vending Contact & Reception Info</h3>
                      <p className="text-sm text-gray-500">Contact details currently broadcast to guests on the portal</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('contact')}
                      className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Contact Info
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl border">
                      <span className="text-gray-400 block mb-1">Primary Call Line</span>
                      <span className="font-bold text-gray-900 text-sm">{contactSettings.phone_primary || 'Not configured'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border">
                      <span className="text-gray-400 block mb-1">WhatsApp Number</span>
                      <span className="font-bold text-emerald-700 text-sm font-mono">{contactSettings.whatsapp_number || 'Not configured'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border">
                      <span className="text-gray-400 block mb-1">Reception Desk Location</span>
                      <span className="font-bold text-gray-900 text-sm">{contactSettings.physical_location || 'Not configured'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'network' && network && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Live Network Monitor</h2>
                <div className="flex gap-4 mb-6">
                  <div className="px-4 py-2 bg-white rounded border flex items-center gap-2">
                    <span className="text-sm text-gray-500">API (8728):</span>
                    <span className={`font-bold ${network.api_status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>{network.api_status}</span>
                  </div>
                  <div className="px-4 py-2 bg-white rounded border flex items-center gap-2">
                    <span className="text-sm text-gray-500">WAN Uplink:</span>
                    <span className={`font-bold ${network.wan_status === 'Up' ? 'text-green-600' : 'text-red-600'}`}>{network.wan_status}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr><th className="p-4">User / PIN</th><th className="p-4">IP Address</th><th className="p-4">MAC</th><th className="p-4">Uptime</th><th className="p-4">Data (In/Out)</th><th className="p-4">Actions</th></tr>
                    </thead>
                    <tbody>
                      {network.active_sessions.map((s:any, i:number) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-bold">{s.user}</td>
                          <td className="p-4 font-mono">{s.address}</td>
                          <td className="p-4 font-mono">{s.mac_address}</td>
                          <td className="p-4">{s.uptime}</td>
                          <td className="p-4 text-xs">{(parseInt(s.bytes_in||"0")/1024/1024).toFixed(1)}MB / {(parseInt(s.bytes_out||"0")/1024/1024).toFixed(1)}MB</td>
                          <td className="p-4">
                            <button onClick={() => killSession(s.id)} className="text-red-600 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> Disconnect</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'vouchers' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Vouchers & Batch Minting</h2>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
                  <h3 className="font-semibold mb-4">Batch Generate PINs (For physical sales)</h3>
                  <form onSubmit={generateVouchers} className="flex gap-4 items-end">
                    <div>
                      <select required value={batchPlanId} onChange={e => setBatchPlanId(e.target.value)} className="border px-3 py-2 rounded" onClick={() => {if(plans.length===0) loadData()}}>
                        <option value="">Select Plan...</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <input type="number" min="1" max="100" value={batchCount} onChange={e => setBatchCount(e.target.value)} className="border px-3 py-2 rounded w-24" />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Mint</button>
                  </form>
                  {generatedPins.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 border rounded-lg relative">
                      <button onClick={handlePrint} className="absolute top-4 right-4 text-blue-600 flex items-center gap-1 text-sm"><Printer className="w-4 h-4"/> Print Batch</button>
                      <p className="text-sm font-semibold mb-2 text-green-700 flex items-center gap-2"><Check className="w-4 h-4"/> Successfully generated {generatedPins.length} PINs!</p>
                      <div id="printable-vouchers" className="grid grid-cols-3 gap-4 font-mono text-lg mt-4">
                        {generatedPins.map(pin => (
                          <div key={pin} className="border-2 border-dashed p-4 text-center">
                            <div className="text-sm text-gray-500 mb-1">Wi-Fi Access Code</div>
                            <div className="font-bold">{pin}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex gap-2">
                    {['ALL', 'UNUSED', 'ACTIVE', 'DEPLETED', 'EXPIRED'].map(st => (
                      <button key={st} onClick={() => setVoucherFilter(st)} className={`px-3 py-1 rounded-full text-xs font-semibold ${voucherFilter === st ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}>{st}</button>
                    ))}
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr><th className="p-4">PIN</th><th className="p-4">Status</th><th className="p-4">Data Used</th><th className="p-4">MAC</th><th className="p-4">Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredVouchers.map((v:any) => (
                        <tr key={v.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-mono font-bold tracking-widest">{v.pin}</td>
                          <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-semibold ${v.status==='ACTIVE'?'bg-blue-100 text-blue-800':v.status==='UNUSED'?'bg-gray-100 text-gray-800':v.status==='DEPLETED'?'bg-red-100 text-red-800':'bg-yellow-100 text-yellow-800'}`}>{v.status}</span></td>
                          <td className="p-4">{(v.bytes_used/1024/1024).toFixed(1)} MB</td>
                          <td className="p-4 font-mono text-xs">{v.mac_address || '-'}</td>
                          <td className="p-4">
                            {(v.status === 'ACTIVE' || v.status === 'UNUSED') && (
                              <button onClick={() => revokeVoucher(v.id)} className="text-red-600 text-xs flex items-center gap-1"><ShieldBan className="w-4 h-4" /> Revoke</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Plan Management</h2>
                  <button onClick={() => setShowPlanModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> Create Plan
                  </button>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4">Plan Name</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Limits</th>
                        <th className="p-4">Rate Limit</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p:any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-semibold text-gray-900">{p.name}</td>
                          <td className="p-4 font-bold text-blue-600">₦{p.price}</td>
                          <td className="p-4 text-xs">
                            <span className="font-medium text-gray-700">{p.data_mb ? `${p.data_mb >= 1024 ? `${(p.data_mb/1024).toFixed(1)}GB` : `${p.data_mb}MB`} Data` : 'Unlimited Data'}</span> <br/>
                            <span className="text-gray-500">{p.uptime_mins ? `${p.uptime_mins >= 60 ? `${(p.uptime_mins/60).toFixed(0)}h` : `${p.uptime_mins}m`} Time` : 'Unlimited Time'}</span> <br/>
                            {p.validity_days ? <span className="text-gray-500">{p.validity_days} Days Validity</span> : ''}
                          </td>
                          <td className="p-4 font-mono text-xs">{p.rate_limit}</td>
                          <td className="p-4">
                            <button onClick={() => togglePlan(p.id)} className={`px-3 py-1 rounded-full text-xs font-semibold ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                              {p.is_active ? '● Live' : '○ Hidden'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button 
                                onClick={() => openEditPlan(p)} 
                                className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button 
                                onClick={() => deletePlan(p.id, p.name)} 
                                className="text-red-600 hover:text-red-800 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 inline-flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reception & Contact Settings</h2>
                    <p className="text-sm text-gray-500">Configure the phone numbers, WhatsApp, and desk locations shown to guests on the captive portal</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Settings Form */}
                  <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <form onSubmit={saveContactSettings} className="space-y-4">
                      {contactSavedSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
                          <Check className="w-5 h-5 text-emerald-600" />
                          <span>Contact details saved! The main guest captive portal is updated.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Primary Call Line</label>
                          <div className="relative">
                            <PhoneCall className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              placeholder="+234 801 234 5678"
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              value={contactSettings.phone_primary}
                              onChange={e => setContactSettings({ ...contactSettings, phone_primary: e.target.value })}
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">Direct number for incoming guest calls</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-700 mb-1">WhatsApp Number</label>
                          <div className="relative">
                            <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                            <input
                              type="text"
                              placeholder="2348012345678"
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                              value={contactSettings.whatsapp_number}
                              onChange={e => setContactSettings({ ...contactSettings, whatsapp_number: e.target.value })}
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">Country code + number (no plus or spaces)</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Alternate Phone Line</label>
                          <input
                            type="text"
                            placeholder="Optional backup line"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={contactSettings.phone_secondary}
                            onChange={e => setContactSettings({ ...contactSettings, phone_secondary: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Support Email</label>
                          <input
                            type="email"
                            placeholder="support@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={contactSettings.support_email}
                            onChange={e => setContactSettings({ ...contactSettings, support_email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Physical Vending Desk / Location</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-red-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="e.g. Front Reception Desk, Block A"
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={contactSettings.physical_location}
                            onChange={e => setContactSettings({ ...contactSettings, physical_location: e.target.value })}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Tells guests where they can buy physical printed voucher cards</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Manual Payment / Bank Transfer Instructions</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Bank: OPay / Kuda&#10;Account No: 1234567890&#10;Name: IKoben Enterprise (Send proof on WhatsApp)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-xs"
                          value={contactSettings.payment_instructions}
                          onChange={e => setContactSettings({ ...contactSettings, payment_instructions: e.target.value })}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Displayed to guests if they prefer paying by direct bank transfer</p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingContact}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                          {savingContact ? 'Saving Changes...' : 'Save & Publish to Captive Portal'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Live Portal Preview */}
                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide text-gray-500">Live Captive Portal Preview</h3>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-1">
                          <PhoneCall className="w-4 h-4" />
                          <span>Purchase Voucher PIN from Admin</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Need internet access? Call, message on WhatsApp, or visit reception to buy an access PIN.
                        </p>
                        {contactSettings.physical_location && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                            <span>Desk: <strong>{contactSettings.physical_location}</strong></span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {contactSettings.phone_primary && (
                          <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm">
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call {contactSettings.phone_primary}</span>
                          </div>
                        )}
                        {contactSettings.whatsapp_number && (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Admin</span>
                          </div>
                        )}
                      </div>

                      {contactSettings.payment_instructions && (
                        <div className="mt-2 pt-2 border-t border-blue-200/60 text-xs text-blue-900 bg-white/70 p-2.5 rounded-lg flex items-start gap-2">
                          <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed">
                            {contactSettings.payment_instructions}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-white border rounded-xl text-xs text-gray-500 space-y-1">
                      <p className="font-semibold text-gray-700">💡 How guests use this:</p>
                      <p>1. When a guest connects to the Wi-Fi hotspot and opens the portal, this banner is displayed at the top.</p>
                      <p>2. When they click "Purchase Voucher" on any plan card, a detailed contact modal opens with one-click Call and WhatsApp links preloaded with the plan details.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Revenue Ledger & Kuda Audit</h2>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-gray-50">
                    <input type="text" placeholder="Search by Reference or PIN..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="border px-4 py-2 rounded-lg w-full max-w-md" />
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr><th className="p-4">Ref</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4">Issued PIN</th></tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((tx:any) => (
                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-mono">{tx.reference}</td>
                          <td className="p-4 font-semibold text-green-700">₦{tx.amount}</td>
                          <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-semibold ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{tx.status}</span></td>
                          <td className="p-4 text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                          <td className="p-4 font-mono font-bold text-blue-600">{tx.voucher_pin || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </>
        )}
      </main>


      {/* Plan Creation Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-900">Create New Plan</h3>
              <button onClick={() => setShowPlanModal(false)}><X className="text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={createPlan} className="space-y-4">
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={newPlan.name} onChange={e=>setNewPlan({...newPlan, name: e.target.value})} placeholder="e.g., Premium 24H" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={newPlan.description} onChange={e=>setNewPlan({...newPlan, description: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label><input type="number" required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={newPlan.price} onChange={e=>setNewPlan({...newPlan, price: e.target.value})} /></div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Router Quotas</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                      Data Limit
                      <label className="flex items-center gap-1 text-xs font-normal text-blue-600"><input type="checkbox" checked={newPlan.data_unlimited} onChange={e=>setNewPlan({...newPlan, data_unlimited: e.target.checked})} /> Unlimited</label>
                    </label>
                    <div className="flex">
                      <input type="number" disabled={newPlan.data_unlimited} className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-l-md outline-none disabled:bg-gray-100 disabled:text-gray-400" value={newPlan.data_val} onChange={e=>setNewPlan({...newPlan, data_val: e.target.value})} />
                      <select disabled={newPlan.data_unlimited} className="border-y border-r border-gray-300 bg-gray-50 px-2 rounded-r-md disabled:bg-gray-100 text-sm" value={newPlan.data_unit} onChange={e=>setNewPlan({...newPlan, data_unit: e.target.value})}>
                        <option>MB</option><option>GB</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                      Active Session Time
                      <label className="flex items-center gap-1 text-xs font-normal text-blue-600"><input type="checkbox" checked={newPlan.time_unlimited} onChange={e=>setNewPlan({...newPlan, time_unlimited: e.target.checked})} /> Unlimited</label>
                    </label>
                    <div className="flex">
                      <input type="number" disabled={newPlan.time_unlimited} className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-l-md outline-none disabled:bg-gray-100 disabled:text-gray-400" value={newPlan.time_val} onChange={e=>setNewPlan({...newPlan, time_val: e.target.value})} />
                      <select disabled={newPlan.time_unlimited} className="border-y border-r border-gray-300 bg-gray-50 px-2 rounded-r-md disabled:bg-gray-100 text-sm" value={newPlan.time_unit} onChange={e=>setNewPlan({...newPlan, time_unit: e.target.value})}>
                        <option>Minutes</option><option>Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Voucher Lifecycle</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validity Period (Days from first login)</label>
                  <input type="number" required min="1" className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={newPlan.validity_days} onChange={e=>setNewPlan({...newPlan, validity_days: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (Upload/Download)</label>
                  <input required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={newPlan.rate_limit} onChange={e=>setNewPlan({...newPlan, rate_limit: e.target.value})} placeholder="2M/3M" />
                  <p className="text-xs text-gray-500 mt-1">Format: [Upload]/[Download] e.g., 2M/3M</p>
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Edit Plan</h3>
                <p className="text-xs text-gray-500">Updating plan ID #{editingPlan.id}</p>
              </div>
              <button onClick={() => setEditingPlan(null)}><X className="text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={saveEditPlan} className="space-y-4">
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={editPlanForm.name} onChange={e=>setEditPlanForm({...editPlanForm, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={editPlanForm.description} onChange={e=>setEditPlanForm({...editPlanForm, description: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label><input type="number" required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={editPlanForm.price} onChange={e=>setEditPlanForm({...editPlanForm, price: e.target.value})} /></div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Router Quotas</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                      Data Limit
                      <label className="flex items-center gap-1 text-xs font-normal text-blue-600"><input type="checkbox" checked={editPlanForm.data_unlimited} onChange={e=>setEditPlanForm({...editPlanForm, data_unlimited: e.target.checked})} /> Unlimited</label>
                    </label>
                    <div className="flex">
                      <input type="number" disabled={editPlanForm.data_unlimited} className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-l-md outline-none disabled:bg-gray-100 disabled:text-gray-400" value={editPlanForm.data_val} onChange={e=>setEditPlanForm({...editPlanForm, data_val: e.target.value})} />
                      <select disabled={editPlanForm.data_unlimited} className="border-y border-r border-gray-300 bg-gray-50 px-2 rounded-r-md disabled:bg-gray-100 text-sm" value={editPlanForm.data_unit} onChange={e=>setEditPlanForm({...editPlanForm, data_unit: e.target.value})}>
                        <option>MB</option><option>GB</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                      Active Session Time
                      <label className="flex items-center gap-1 text-xs font-normal text-blue-600"><input type="checkbox" checked={editPlanForm.time_unlimited} onChange={e=>setEditPlanForm({...editPlanForm, time_unlimited: e.target.checked})} /> Unlimited</label>
                    </label>
                    <div className="flex">
                      <input type="number" disabled={editPlanForm.time_unlimited} className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-l-md outline-none disabled:bg-gray-100 disabled:text-gray-400" value={editPlanForm.time_val} onChange={e=>setEditPlanForm({...editPlanForm, time_val: e.target.value})} />
                      <select disabled={editPlanForm.time_unlimited} className="border-y border-r border-gray-300 bg-gray-50 px-2 rounded-r-md disabled:bg-gray-100 text-sm" value={editPlanForm.time_unit} onChange={e=>setEditPlanForm({...editPlanForm, time_unit: e.target.value})}>
                        <option>Minutes</option><option>Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Voucher Lifecycle</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validity Period (Days from first login)</label>
                  <input type="number" required min="1" className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={editPlanForm.validity_days} onChange={e=>setEditPlanForm({...editPlanForm, validity_days: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (Upload/Download)</label>
                  <input required className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-md outline-none" value={editPlanForm.rate_limit} onChange={e=>setEditPlanForm({...editPlanForm, rate_limit: e.target.value})} placeholder="2M/3M" />
                  <p className="text-xs text-gray-500 mt-1">Format: [Upload]/[Download] e.g., 2M/3M</p>
                </div>
              </div>
              
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingPlan(null)} className="w-1/3 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="w-2/3 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
