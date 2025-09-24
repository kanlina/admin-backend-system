import { ApiPartnerConf, CreateApiPartnerRequest, UpdateApiPartnerRequest, ApiPartnerQuery, PaginationResult } from '../types/apiPartner';
import { createCoreDbConnection } from '../utils/database';

export class ApiPartnerService {
  private async getDbConnection() {
    return await createCoreDbConnection();
  }

  /**
   * 获取API合作伙伴配置列表
   */
  async getApiPartnerConfigs(query: ApiPartnerQuery): Promise<PaginationResult<ApiPartnerConf>> {
    let connection;
    try {
      const { page = 1, limit = 10, status, type, search } = query;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let params: any[] = [];

      if (status !== undefined) {
        whereConditions.push('status = ?');
        params.push(status);
      }

      if (type !== undefined) {
        whereConditions.push('type = ?');
        params.push(type);
      }

      if (search) {
        whereConditions.push('(partner_name LIKE ? OR partner_description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      connection = await this.getDbConnection();
      
      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM api_partner_conf ${whereClause}`;
      const [countResult] = await connection.execute(countQuery, params);
      const total = (countResult as any)[0]?.total || 0;

      // 获取数据
      const dataQuery = `
        SELECT 
          id, app_id, partner_logo, partner_name, partner_description, partner_phone,
          partner_api, type, secret_key, default_amount, default_loan_days,
          default_interest_rate, extend, ios_download_url, android_download_url,
          admittance_url, credential_stuffing_url, push_user_data_url, credit_data_url,
          loan_product_url, loan_contract_url, submit_loan_url, loan_preview_url,
          bank_list_url, bind_bank_url, set_default_bank_url, pre_bind, get_bank,
          user_loan_amt, order_status_url, repay_plan_url, repay_details_url,
          contract_sign_url, query_user_url, status, is_head, add_bank, is_sign,
          is_reload, created_at, updated_at
        FROM api_partner_conf 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const [data] = await connection.execute(dataQuery, [...params, limit, offset]);

      return {
        data: data as ApiPartnerConf[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get API partner configs error:', error);
      throw new Error('获取API合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 根据ID获取API合作伙伴配置
   */
  async getApiPartnerConfigById(id: number): Promise<ApiPartnerConf | null> {
    let connection;
    try {
      connection = await this.getDbConnection();
      const query = `
        SELECT 
          id, app_id, partner_logo, partner_name, partner_description, partner_phone,
          partner_api, type, secret_key, default_amount, default_loan_days,
          default_interest_rate, extend, ios_download_url, android_download_url,
          admittance_url, credential_stuffing_url, push_user_data_url, credit_data_url,
          loan_product_url, loan_contract_url, submit_loan_url, loan_preview_url,
          bank_list_url, bind_bank_url, set_default_bank_url, pre_bind, get_bank,
          user_loan_amt, order_status_url, repay_plan_url, repay_details_url,
          contract_sign_url, query_user_url, status, is_head, add_bank, is_sign,
          is_reload, created_at, updated_at
        FROM api_partner_conf WHERE id = ?
      `;
      const [result] = await connection.execute(query, [id]);
      return (result as any)[0] as ApiPartnerConf || null;
    } catch (error) {
      console.error('Get API partner config by ID error:', error);
      throw new Error('获取API合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 创建API合作伙伴配置
   */
  async createApiPartnerConfig(data: CreateApiPartnerRequest): Promise<ApiPartnerConf> {
    let connection;
    try {
      const now = new Date().toISOString();
      
      const insertQuery = `
        INSERT INTO api_partner_conf (
          app_id, partner_logo, partner_name, partner_description, partner_phone,
          partner_api, type, secret_key, default_amount, default_loan_days,
          default_interest_rate, extend, ios_download_url, android_download_url,
          admittance_url, credential_stuffing_url, push_user_data_url, credit_data_url,
          loan_product_url, loan_contract_url, submit_loan_url, loan_preview_url,
          bank_list_url, bind_bank_url, set_default_bank_url, pre_bind, get_bank,
          user_loan_amt, order_status_url, repay_plan_url, repay_details_url,
          contract_sign_url, query_user_url, status, is_head, add_bank, is_sign,
          is_reload, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.app_id,
        data.partner_logo || null,
        data.partner_name,
        data.partner_description || null,
        data.partner_phone || null,
        data.partner_api,
        data.type || null,
        data.secret_key,
        data.default_amount || null,
        data.default_loan_days || null,
        data.default_interest_rate || null,
        data.extend || null,
        data.ios_download_url || null,
        data.android_download_url || null,
        data.admittance_url || null,
        data.credential_stuffing_url || null,
        data.push_user_data_url || null,
        data.credit_data_url || null,
        data.loan_product_url || null,
        data.loan_contract_url || null,
        data.submit_loan_url || null,
        data.loan_preview_url || null,
        data.bank_list_url || null,
        data.bind_bank_url || null,
        data.set_default_bank_url || null,
        data.pre_bind || null,
        data.get_bank || null,
        data.user_loan_amt || null,
        data.order_status_url || null,
        data.repay_plan_url || null,
        data.repay_details_url || null,
        data.contract_sign_url || null,
        data.query_user_url || null,
        data.status || 1,
        data.is_head || 0,
        data.add_bank || 1,
        data.is_sign || 1,
        data.is_reload || 0,
        now,
        now
      ];

      connection = await this.getDbConnection();
      const [result] = await connection.execute(insertQuery, values);
      const newId = (result as any).insertId;

      // 返回新创建的记录
      const newRecord = await this.getApiPartnerConfigById(newId);
      if (!newRecord) {
        throw new Error('创建后无法获取记录');
      }

      return newRecord;
    } catch (error) {
      console.error('Create API partner config error:', error);
      throw new Error('创建API合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 更新API合作伙伴配置
   */
  async updateApiPartnerConfig(id: number, data: UpdateApiPartnerRequest): Promise<ApiPartnerConf> {
    let connection;
    try {
      // 检查记录是否存在
      const existing = await this.getApiPartnerConfigById(id);
      if (!existing) {
        throw new Error('API合作伙伴配置不存在');
      }

      const now = new Date().toISOString();
      
      // 构建更新字段
      const updateFields: string[] = [];
      const values: any[] = [];

      Object.keys(data).forEach(key => {
        if (key !== 'id' && data[key as keyof UpdateApiPartnerRequest] !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(data[key as keyof UpdateApiPartnerRequest]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      updateFields.push('updated_at = ?');
      values.push(now, id);

      const updateQuery = `UPDATE api_partner_conf SET ${updateFields.join(', ')} WHERE id = ?`;
      connection = await this.getDbConnection();
      await connection.execute(updateQuery, values);

      // 返回更新后的记录
      const updatedRecord = await this.getApiPartnerConfigById(id);
      if (!updatedRecord) {
        throw new Error('更新后无法获取记录');
      }

      return updatedRecord;
    } catch (error) {
      console.error('Update API partner config error:', error);
      throw new Error('更新API合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 删除API合作伙伴配置
   */
  async deleteApiPartnerConfig(id: number): Promise<boolean> {
    let connection;
    try {
      // 检查记录是否存在
      const existing = await this.getApiPartnerConfigById(id);
      if (!existing) {
        throw new Error('API合作伙伴配置不存在');
      }

      const deleteQuery = 'DELETE FROM api_partner_conf WHERE id = ?';
      connection = await this.getDbConnection();
      const [result] = await connection.execute(deleteQuery, [id]);
      
      return (result as any).affectedRows > 0;
    } catch (error) {
      console.error('Delete API partner config error:', error);
      throw new Error('删除API合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 获取所有启用的API合作伙伴配置
   */
  async getAllEnabledPartners(): Promise<ApiPartnerConf[]> {
    let connection;
    try {
      connection = await this.getDbConnection();
      const query = `
        SELECT 
          id, app_id, partner_logo, partner_name, partner_description, partner_phone,
          partner_api, type, secret_key, default_amount, default_loan_days,
          default_interest_rate, extend, ios_download_url, android_download_url,
          admittance_url, credential_stuffing_url, push_user_data_url, credit_data_url,
          loan_product_url, loan_contract_url, submit_loan_url, loan_preview_url,
          bank_list_url, bind_bank_url, set_default_bank_url, pre_bind, get_bank,
          user_loan_amt, order_status_url, repay_plan_url, repay_details_url,
          contract_sign_url, query_user_url, status, is_head, add_bank, is_sign,
          is_reload, created_at, updated_at
        FROM api_partner_conf WHERE status = 1 ORDER BY created_at DESC
      `;
      const [result] = await connection.execute(query);
      return result as ApiPartnerConf[];
    } catch (error) {
      console.error('Get all enabled partners error:', error);
      throw new Error('获取启用的合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 根据应用ID获取API合作伙伴配置
   */
  async getApiPartnerConfigByAppId(appId: number): Promise<ApiPartnerConf | null> {
    let connection;
    try {
      connection = await this.getDbConnection();
      const query = `
        SELECT 
          id, app_id, partner_logo, partner_name, partner_description, partner_phone,
          partner_api, type, secret_key, default_amount, default_loan_days,
          default_interest_rate, extend, ios_download_url, android_download_url,
          admittance_url, credential_stuffing_url, push_user_data_url, credit_data_url,
          loan_product_url, loan_contract_url, submit_loan_url, loan_preview_url,
          bank_list_url, bind_bank_url, set_default_bank_url, pre_bind, get_bank,
          user_loan_amt, order_status_url, repay_plan_url, repay_details_url,
          contract_sign_url, query_user_url, status, is_head, add_bank, is_sign,
          is_reload, created_at, updated_at
        FROM api_partner_conf WHERE app_id = ?
      `;
      const [result] = await connection.execute(query, [appId]);
      return (result as any)[0] as ApiPartnerConf || null;
    } catch (error) {
      console.error('Get API partner config by app ID error:', error);
      throw new Error('根据应用ID获取API合作伙伴配置失败');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
