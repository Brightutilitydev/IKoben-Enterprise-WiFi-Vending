import PlanSelector from '@/components/PlanSelector';
import { fetchPlans, fetchContactSettings } from '@/lib/api';
import { Wifi, Phone, MessageSquare, MapPin, CreditCard } from 'lucide-react';

import { Suspense } from 'react';
import VoucherLoginForm from '@/components/VoucherLoginForm';

async function PlansSection() {
  let plans = [];
  let contact = {
    phone_primary: '',
    phone_secondary: '',
    whatsapp_number: '',
    physical_location: 'Reception Desk',
    payment_instructions: ''
  };
  try {
    const [fetchedPlans, fetchedContact] = await Promise.all([
      fetchPlans(),
      fetchContactSettings()
    ]);
    plans = fetchedPlans;
    contact = fetchedContact;
  } catch (error) {
    console.error("Failed to load plans or contact:", error);
  }

  const cleanWa = (contact.whatsapp_number || contact.phone_primary || '').replace(/[^0-9]/g, '');
  const waUrl = cleanWa ? `https://wa.me/${cleanWa}?text=${encodeURIComponent("Hello Admin, I want to purchase an internet voucher.")}` : null;
  const telUrl = contact.phone_primary ? `tel:${contact.phone_primary.replace(/[^0-9+]/g, '')}` : null;

  return (
    <div className="space-y-6">
      {/* Contact Banner / Direct Purchase Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-1">
              <Phone className="w-4 h-4" />
              <span>Purchase Voucher PIN from Admin</span>
            </div>
            <p className="text-xs text-gray-600">
              Need internet access? Call, message on WhatsApp, or visit reception to buy an access PIN.
            </p>
            {contact.physical_location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Desk: <strong>{contact.physical_location}</strong></span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {telUrl && (
              <a
                href={telUrl}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {contact.phone_primary}</span>
              </a>
            )}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Admin</span>
              </a>
            )}
          </div>
        </div>

        {contact.payment_instructions && (
          <div className="mt-3 pt-3 border-t border-blue-200/60 text-xs text-blue-900 bg-white/70 p-2.5 rounded-lg flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed">
              {contact.payment_instructions}
            </div>
          </div>
        )}
      </div>

      {/* Plans List */}
      <PlanSelector plans={plans} contact={contact} />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500 rounded-full">
              <Wifi className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">IKoben Enterprise Wi-Fi</h1>
          <p className="text-blue-100">Fast, reliable, and affordable community internet.</p>
        </div>

        {/* Captive Portal Core (Voucher Input) */}
        <div className="p-6 border-b bg-gray-50/50">
          <VoucherLoginForm />
        </div>

        {/* Plans Section */}
        <div className="p-6">
          <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading available Wi-Fi packages...</div>}>
            <PlansSection />
          </Suspense>
        </div>

      </div>
      <p className="mt-8 text-sm text-gray-500">
        &copy; 2026 IKoben Networks. All rights reserved.
      </p>
    </main>
  );
}
