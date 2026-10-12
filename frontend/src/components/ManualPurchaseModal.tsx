'use client';

import { Plan } from '@/types';
import { Phone, MessageSquare, MapPin, CreditCard, X, CheckCircle, Wifi, Clock, Database, Calendar } from 'lucide-react';

interface ManualPurchaseModalProps {
  plan: Plan;
  contact: {
    phone_primary?: string;
    phone_secondary?: string;
    whatsapp_number?: string;
    support_email?: string;
    physical_location?: string;
    payment_instructions?: string;
  };
  onClose: () => void;
}

export default function ManualPurchaseModal({ plan, contact, onClose }: ManualPurchaseModalProps) {
  // Format WhatsApp link
  const rawWa = contact.whatsapp_number || contact.phone_primary || '';
  const cleanWa = rawWa.replace(/[^0-9]/g, '');
  const waMessage = encodeURIComponent(
    `Hello! I want to purchase the "${plan.name}" (₦${plan.price}) Wi-Fi voucher. Please provide payment details or my voucher PIN.`
  );
  const waUrl = cleanWa ? `https://wa.me/${cleanWa}?text=${waMessage}` : null;
  const telUrl = contact.phone_primary ? `tel:${contact.phone_primary.replace(/[^0-9+]/g, '')}` : null;
  const secTelUrl = contact.phone_secondary ? `tel:${contact.phone_secondary.replace(/[^0-9+]/g, '')}` : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-xs uppercase tracking-wider font-semibold text-blue-200 mb-1">
            Purchase Wi-Fi Voucher
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">₦{plan.price}</span>
            <span className="text-sm text-blue-100">one-time access</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Plan Highlights */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 grid grid-cols-2 gap-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Data: <strong>{plan.data_mb ? `${plan.data_mb >= 1024 ? `${(plan.data_mb/1024).toFixed(1)} GB` : `${plan.data_mb} MB`}` : 'Unlimited'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Time: <strong>{plan.uptime_mins ? `${plan.uptime_mins >= 60 ? `${(plan.uptime_mins/60).toFixed(0)} Hours` : `${plan.uptime_mins} Mins`}` : 'Unlimited'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Validity: <strong>{plan.validity_days ? `${plan.validity_days} Days` : 'N/A'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-600" />
              <span>Speed: <strong>{plan.rate_limit}</strong></span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide text-[11px] text-gray-500">
              Direct Contact to Purchase PIN
            </h4>
            
            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {telUrl && (
                <a
                  href={telUrl}
                  className="flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call to Order</span>
                </a>
              )}

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Order on WhatsApp</span>
                </a>
              )}
            </div>

            {/* Contact details list */}
            <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-200/80 text-sm">
              {contact.phone_primary && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" /> Primary Line:
                  </span>
                  <a href={telUrl || '#'} className="font-semibold text-blue-600 hover:underline">
                    {contact.phone_primary}
                  </a>
                </div>
              )}

              {contact.phone_secondary && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" /> Alternate Line:
                  </span>
                  <a href={secTelUrl || '#'} className="font-semibold text-blue-600 hover:underline">
                    {contact.phone_secondary}
                  </a>
                </div>
              )}

              {contact.whatsapp_number && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp:
                  </span>
                  <a href={waUrl || '#'} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:underline">
                    {contact.whatsapp_number}
                  </a>
                </div>
              )}

              {contact.physical_location && (
                <div className="flex items-start justify-between pt-1 border-t border-gray-200">
                  <span className="text-gray-500 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" /> Reception Desk:
                  </span>
                  <span className="font-medium text-gray-800 text-right">
                    {contact.physical_location}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Instructions if provided */}
          {contact.payment_instructions && (
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Payment & Transfer Details:
              </div>
              <p className="text-amber-800 whitespace-pre-line leading-relaxed font-mono">
                {contact.payment_instructions}
              </p>
            </div>
          )}

          {/* Step by Step Guide */}
          <div className="border-t pt-4">
            <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">How It Works:</h5>
            <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Call, message on WhatsApp, or walk up to reception.</li>
              <li>Pay <strong>₦{plan.price}</strong> cash or manual transfer.</li>
              <li>You will receive your <strong>12-digit PIN</strong> voucher immediately.</li>
              <li>Input the PIN on the login box on this page to get instant internet access!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
