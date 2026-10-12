export interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  data_mb?: number;
  uptime_mins?: number;
  validity_days?: number;
  rate_limit: string;
}

export interface ContactSetting {
  id?: number;
  phone_primary: string;
  phone_secondary?: string;
  whatsapp_number?: string;
  physical_location?: string;
  payment_instructions?: string;
}

