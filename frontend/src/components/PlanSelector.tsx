'use client';

import { useState } from 'react';
import { Plan } from '@/types';
import { Wifi, Clock, Database, CheckCircle2, Calendar, ShoppingCart } from 'lucide-react';
import ManualPurchaseModal from '@/components/ManualPurchaseModal';

interface PlanSelectorProps {
  plans: Plan[];
  contact?: {
    phone_primary?: string;
    phone_secondary?: string;
    whatsapp_number?: string;
    support_email?: string;
    physical_location?: string;
    payment_instructions?: string;
  };
}

export default function PlanSelector({ plans, contact = {} }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  if (!plans || plans.length === 0) {
    return <div className="text-center text-gray-500 py-4">No plans available at the moment.</div>;
  }

  return (
    <div className="space-y-4 relative">
      {selectedPlan && (
        <ManualPurchaseModal plan={selectedPlan} contact={contact} onClose={() => setSelectedPlan(null)} />
      )}
      
      <h3 className="text-lg font-semibold text-gray-800 text-center">Available Wi-Fi Plans</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map(plan => (
          <div key={plan.id} className="border rounded-xl p-4 flex flex-col justify-between bg-white shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-900">{plan.name}</h4>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                  ₦{plan.price}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>
                    {plan.data_mb 
                      ? `${plan.data_mb >= 1024 ? `${(plan.data_mb / 1024).toFixed(1)} GB` : `${plan.data_mb} MB`} data` 
                      : 'Unlimited Data'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>
                    {plan.uptime_mins 
                      ? `${plan.uptime_mins >= 60 ? `${(plan.uptime_mins / 60).toFixed(0)} Hours` : `${plan.uptime_mins} Mins`} session` 
                      : 'Unlimited Time'}
                  </span>
                </li>
                {plan.validity_days && (
                  <li className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Valid {plan.validity_days} {plan.validity_days === 1 ? 'day' : 'days'} from first login</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span>Speed: {plan.rate_limit}</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => setSelectedPlan(plan)}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Purchase Voucher
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
