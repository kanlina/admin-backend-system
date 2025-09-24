import { PaginationQuery } from './index';

export interface ApiPartnerConf {
  id?: number;
  app_id: number;
  partner_logo?: string;
  partner_name: string;
  partner_description?: string;
  partner_phone?: string;
  partner_api: string;
  type?: number;
  secret_key: string;
  default_amount?: number;
  default_loan_days?: number;
  default_interest_rate?: number;
  extend?: string;
  ios_download_url?: string;
  android_download_url?: string;
  admittance_url?: string;
  credential_stuffing_url?: string;
  push_user_data_url?: string;
  credit_data_url?: string;
  loan_product_url?: string;
  loan_contract_url?: string;
  submit_loan_url?: string;
  loan_preview_url?: string;
  bank_list_url?: string;
  bind_bank_url?: string;
  set_default_bank_url?: string;
  pre_bind?: string;
  get_bank?: string;
  user_loan_amt?: string;
  order_status_url?: string;
  repay_plan_url?: string;
  repay_details_url?: string;
  contract_sign_url?: string;
  query_user_url?: string;
  status: number;
  is_head: number;
  add_bank: number;
  is_sign: number;
  is_reload: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApiPartnerRequest {
  app_id: number;
  partner_logo?: string;
  partner_name: string;
  partner_description?: string;
  partner_phone?: string;
  partner_api: string;
  type?: number;
  secret_key: string;
  default_amount?: number;
  default_loan_days?: number;
  default_interest_rate?: number;
  extend?: string;
  ios_download_url?: string;
  android_download_url?: string;
  admittance_url?: string;
  credential_stuffing_url?: string;
  push_user_data_url?: string;
  credit_data_url?: string;
  loan_product_url?: string;
  loan_contract_url?: string;
  submit_loan_url?: string;
  loan_preview_url?: string;
  bank_list_url?: string;
  bind_bank_url?: string;
  set_default_bank_url?: string;
  pre_bind?: string;
  get_bank?: string;
  user_loan_amt?: string;
  order_status_url?: string;
  repay_plan_url?: string;
  repay_details_url?: string;
  contract_sign_url?: string;
  query_user_url?: string;
  status?: number;
  is_head?: number;
  add_bank?: number;
  is_sign?: number;
  is_reload?: number;
}

export interface UpdateApiPartnerRequest extends Partial<CreateApiPartnerRequest> {
  id: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiPartnerQuery extends PaginationQuery {
  status?: number;
  type?: number;
  search?: string;
}
