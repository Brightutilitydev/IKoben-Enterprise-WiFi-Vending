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
