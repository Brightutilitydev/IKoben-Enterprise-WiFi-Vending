import { Plan } from '@/types';

export const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8000/api`;
  }
  return 'http://127.0.0.1:8000/api';
};

export async function fetchPlans(): Promise<Plan[]> {
  const response = await fetch(`${getApiBaseUrl()}/plans/`, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch plans');
  }
  return response.json();
}

export async function fetchContactSettings() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/contact/`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch contact settings');
    return await response.json();
  } catch (e) {
    return {
      phone_primary: '',
      phone_secondary: '',
      whatsapp_number: '',
      support_email: '',
      physical_location: 'Reception Desk',
      payment_instructions: ''
    };
  }
}

export async function validateVoucher(data: { pin: string; mac_address?: string; ip_address?: string; link_login_only?: string }) {
  const response = await fetch(`${getApiBaseUrl()}/vouchers/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Validation failed');
  }
  return response.json();
}

export async function initiatePayment(plan_id: number) {
  const response = await fetch(`${getApiBaseUrl()}/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id }),
  });
  if (!response.ok) throw new Error('Failed to initiate payment');
  return response.json();
}

export async function checkPaymentStatus(reference: string) {
  const response = await fetch(`${getApiBaseUrl()}/payments/${reference}/status`);
  if (!response.ok) throw new Error('Failed to check status');
  return response.json();
}
