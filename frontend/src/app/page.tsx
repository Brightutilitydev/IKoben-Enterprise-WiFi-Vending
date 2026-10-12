import PlanSelector from '@/components/PlanSelector';
import { fetchPlans, fetchContactSettings } from '@/lib/api';
import { Plan, ContactSetting } from '@/types';
import { Wifi, Phone, MessageSquare, MapPin, CreditCard } from 'lucide-react';

import { Suspense } from 'react';
import VoucherLoginForm from '@/components/VoucherLoginForm';

async function PlansSection() {
  let plans: Plan[] = [];
  let contact: ContactSetting = {
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
    <div className="space-y-5">
      {/* Contact Banner / Direct Purchase Info */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
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
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Desk: <strong>{contact.physical_location}</strong></span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 sm:pt-0">
            {telUrl && (
              <a
                href={telUrl}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all"
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
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all"
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
            <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed break-words">
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
    <main className="min-h-screen bg-slate-100/80 flex flex-col items-center justify-start sm:justify-center p-2.5 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-slate-200/60 my-2 sm:my-6">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 sm:p-8 text-center text-white relative">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Wifi className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1 sm:mb-2">IKoben Enterprise Wi-Fi</h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-md mx-auto">Fast, reliable, and affordable community internet access.</p>
        </div>

        {/* Captive Portal Core (Voucher Input) */}
        <div className="p-4 sm:p-6 border-b bg-slate-50/70">
          <VoucherLoginForm />
        </div>

        {/* Plans Section */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="text-center py-8 text-gray-400 text-sm">Loading available Wi-Fi packages...</div>}>
            <PlansSection />
          </Suspense>
        </div>

      </div>
      <p className="mt-4 sm:mt-6 text-xs text-gray-400 text-center pb-4">
        &copy; 2026 IKoben Networks. All rights reserved.
      </p>
    </main>
  );
}

