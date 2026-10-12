'use client';

import { useState, useEffect } from 'react';
import { Plan } from '@/types';
import { initiatePayment, checkPaymentStatus } from '@/lib/api';
import { Copy, X, Loader2, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  plan: Plan;
  onClose: () => void;
}

export default function PaymentModal({ plan, onClose }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [status, setStatus] = useState('PENDING'); // PENDING, SUCCESS
  const [voucherPin, setVoucherPin] = useState('');

  useEffect(() => {
    // Initiate payment on mount
    initiatePayment(plan.id)
      .then(data => {
        setPaymentDetails(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to initiate payment.');
        setLoading(false);
      });
  }, [plan.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (paymentDetails && status === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const res = await checkPaymentStatus(paymentDetails.reference);
          if (res.status === 'SUCCESS') {
            setStatus('SUCCESS');
            setVoucherPin(res.voucher_pin);
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000); // Poll every 5s
    }
    return () => clearInterval(interval);
  }, [paymentDetails, status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Buy Wi-Fi Plan</h2>
          <p className="text-gray-600 mb-6">{plan.name}</p>

          {loading ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Generating virtual account...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          ) : status === 'SUCCESS' ? (
             <div className="text-center py-6">
               <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                 <CheckCircle2 className="w-10 h-10 text-green-600" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
               <p className="text-gray-600 mb-6">Your Wi-Fi Voucher PIN is ready.</p>
               
               <div className="bg-gray-100 rounded-lg p-4 mb-6">
                 <p className="text-sm text-gray-500 mb-1">Your PIN</p>
                 <div className="flex items-center justify-center gap-3">
                   <span className="text-3xl font-mono tracking-widest font-bold text-gray-900">
                     {voucherPin}
                   </span>
                   <button 
                     onClick={() => copyToClipboard(voucherPin)}
                     className="text-blue-600 hover:text-blue-800"
                   >
                     <Copy className="w-5 h-5" />
                   </button>
                 </div>
               </div>

               <p className="text-sm text-gray-500">
                 Please close this window and enter your PIN in the connection form to access the internet.
               </p>
             </div>
          ) : (
            <div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                  <span className="text-gray-600">Amount to pay</span>
                  <span className="text-2xl font-bold text-gray-900">₦{paymentDetails.amount}</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                    <p className="font-semibold text-gray-900">{paymentDetails.bank_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Number</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xl font-bold text-blue-600 tracking-wider">
                        {paymentDetails.account_number}
                      </p>
                      <button onClick={() => copyToClipboard(paymentDetails.account_number)} className="text-gray-400 hover:text-gray-800">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Name</p>
                    <p className="font-semibold text-gray-900">{paymentDetails.account_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-blue-600 font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for transfer...
              </div>
              <p className="text-center text-xs text-gray-400 mt-2">
                This page will automatically update once your transfer is received.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
