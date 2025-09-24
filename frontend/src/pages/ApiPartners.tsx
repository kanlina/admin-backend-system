import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  message, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  InputNumber, 
  Select,
  Row,
  Col,
  Tabs,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  LinkOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface ApiPartnerConfig {
  id: number;
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
  default_interest_rate?: string;
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
  created_at: string;
  updated_at: string;
}

const ApiPartners: React.FC = () => {
  console.log('ApiPartners组件正在渲染...');
  
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<ApiPartnerConfig[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiPartnerConfig | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []); // 只在组件挂载时执行一次

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };

      console.log('正在获取API合作伙伴配置数据...', params);
      console.log('当前token:', localStorage.getItem('token'));
      
      const response = await apiService.getApiPartnerConfigs(params);
      console.log('API响应:', response);
      
      if (response.success && response.data) {
        setData(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination!.total,
            totalPages: response.pagination!.totalPages
          }));
        }
        console.log('数据加载成功，共', response.data.length, '条记录');
      } else {
        console.error('API返回错误:', response.message);
        message.error(response.message || '获取数据失败');
      }
    } catch (error) {
      console.error('获取API合作伙伴配置失败:', error);
      console.error('错误详情:', {
        status: (error as any).response?.status,
        message: (error as any).message,
        response: (error as any).response?.data
      });
      
      // 如果是401错误，说明认证失败
      if ((error as any).response?.status === 401) {
        console.log('认证失败，使用模拟数据');
        message.warning('认证失败，使用模拟数据');
      } else if ((error as any).response?.status === 404) {
        console.log('后端API未实现，使用模拟数据');
        message.info('后端API未实现，使用模拟数据');
      } else {
        console.log('网络错误，使用模拟数据');
        message.warning('网络请求失败，使用模拟数据');
      }
      
      // 使用模拟数据
      const mockData: ApiPartnerConfig[] = [
        {
          id: 1,
          app_id: 1001,
          partner_name: '测试银行',
          partner_api: 'https://api.testbank.com/v1',
          type: 1,
          secret_key: 'sk_test_1234567890',
          default_amount: 10000,
          default_loan_days: 30,
          default_interest_rate: '0.05',
          status: 1,
          is_head: 0,
          add_bank: 1,
          is_sign: 1,
          is_reload: 0,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          app_id: 1002,
          partner_name: '金融科技公司',
          partner_api: 'https://api.fintech.com/v2',
          type: 2,
          secret_key: 'sk_fintech_abcdef',
          default_amount: 50000,
          default_loan_days: 60,
          default_interest_rate: '0.08',
          status: 1,
          is_head: 1,
          add_bank: 1,
          is_sign: 1,
          is_reload: 0,
          created_at: '2024-02-20T14:30:00Z',
          updated_at: '2024-02-20T14:30:00Z'
        }
      ];
      setData(mockData);
      setPagination(prev => ({
        ...prev,
        total: mockData.length,
        totalPages: 1
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ApiPartnerConfig) => {
    setEditingConfig(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: t('apiPartners.confirmDelete'),
      content: t('apiPartners.deleteConfirm'),
      onOk: async () => {
        try {
          const response = await apiService.deleteApiPartnerConfig(id.toString());
          if (response.success) {
            message.success(t('apiPartners.messages.deleteSuccess'));
            fetchData();
          } else {
            message.error(response.message || t('apiPartners.messages.deleteError'));
          }
        } catch (error) {
          if ((error as any).response?.status === 404) {
            // 后端API未实现，使用本地模拟删除
            setData(prev => prev.filter(item => item.id !== id));
            setPagination(prev => ({
              ...prev,
              total: prev.total - 1
            }));
            message.success(t('apiPartners.messages.deleteSuccess') + '（本地模拟）');
          } else {
            console.error('删除失败:', error);
            message.error(t('apiPartners.messages.deleteError'));
          }
        }
      }
    });
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingConfig) {
        // 编辑
        try {
          const response = await apiService.updateApiPartnerConfig(editingConfig.id.toString(), values);
          if (response.success) {
            message.success('更新成功');
            setModalVisible(false);
            form.resetFields();
            fetchData();
          } else {
            message.error(response.message || '更新失败，请检查数据格式');
          }
        } catch (error) {
          console.error('更新失败:', error);
          if ((error as any).response?.status === 404) {
            // 后端API未实现，使用本地模拟更新
            setData(prev => prev.map(item => 
              item.id === editingConfig.id ? { ...item, ...values } : item
            ));
            message.success('更新成功（本地模拟）');
            setModalVisible(false);
            form.resetFields();
          } else if ((error as any).response?.status === 401) {
            message.error('认证失败，请重新登录');
          } else if ((error as any).response?.status === 400) {
            message.error('数据格式错误，请检查输入内容');
          } else {
            message.error('网络错误，请稍后重试');
          }
        }
      } else {
        // 新增
        try {
          const response = await apiService.createApiPartnerConfig(values);
          if (response.success) {
            message.success('添加成功');
            setModalVisible(false);
            form.resetFields();
            fetchData();
          } else {
            message.error(response.message || '添加失败，请检查数据格式');
          }
        } catch (error) {
          console.error('添加失败:', error);
          if ((error as any).response?.status === 404) {
            // 后端API未实现，使用本地模拟添加
            const newConfig: ApiPartnerConfig = {
              id: Date.now(),
              app_id: values.app_id,
              partner_name: values.partner_name,
              partner_api: values.partner_api,
              secret_key: values.secret_key,
              type: values.type,
              default_amount: values.default_amount,
              default_loan_days: values.default_loan_days,
              default_interest_rate: values.default_interest_rate,
              status: values.status || 1,
              is_head: values.is_head || 0,
              add_bank: values.add_bank || 1,
              is_sign: values.is_sign || 1,
              is_reload: values.is_reload || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...values
            };
            setData(prev => [newConfig, ...prev]);
            setPagination(prev => ({
              ...prev,
              total: prev.total + 1
            }));
            message.success('添加成功（本地模拟）');
            setModalVisible(false);
            form.resetFields();
          } else if ((error as any).response?.status === 401) {
            message.error('认证失败，请重新登录');
          } else if ((error as any).response?.status === 400) {
            message.error('数据格式错误，请检查输入内容');
          } else {
            message.error('网络错误，请稍后重试');
          }
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: t('apiPartners.columns.index'),
      key: 'index',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => 
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: t('apiPartners.columns.appId'),
      dataIndex: 'app_id',
      key: 'app_id',
      width: 80,
      align: 'center' as const,
    },
    {
      title: t('apiPartners.columns.partnerName'),
      dataIndex: 'partner_name',
      key: 'partner_name',
      width: 180,
      ellipsis: true,
    },
    {
      title: t('apiPartners.columns.partnerApi'),
      dataIndex: 'partner_api',
      key: 'partner_api',
      width: 250,
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#1890ff', 
              textDecoration: 'none',
              fontSize: '12px'
            }}
          >
            <LinkOutlined style={{ marginRight: 4 }} />
            {url.length > 35 ? url.substring(0, 35) + '...' : url}
          </a>
        </Tooltip>
      ),
    },
    {
      title: t('apiPartners.columns.defaultInterestRate'),
      dataIndex: 'default_interest_rate',
      key: 'default_interest_rate',
      width: 100,
      align: 'right' as const,
      render: (rate: any) => (
        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
          {rate ? `${rate}%` : '-'}
        </span>
      ),
    },
    {
      title: t('apiPartners.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (status: number) => (
        <Tag 
          color={status === 1 ? 'green' : 'red'}
          style={{ margin: 0 }}
        >
          {status === 1 ? t('apiPartners.status.enabled') : t('apiPartners.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('apiPartners.columns.defaultAmount'),
      dataIndex: 'default_amount',
      key: 'default_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: any) => {
        const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        return (
          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            {numAmount && !isNaN(numAmount) ? numAmount.toLocaleString() : '-'}
          </span>
        );
      },
    },
    {
      title: t('apiPartners.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      align: 'center' as const,
      render: (date: string) => (
        <span style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: t('apiPartners.columns.action'),
      key: 'action',
      width: 140,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: ApiPartnerConfig) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ padding: '4px 8px' }}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            style={{ padding: '4px 8px' }}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  console.log('ApiPartners render - data:', data, 'loading:', loading);

  return (
    <div style={{ padding: '24px' }}>
      <style>
        {`
          .table-row-light {
            background-color: #fafafa;
          }
          .table-row-dark {
            background-color: #ffffff;
          }
          .ant-table-thead > tr > th {
            background-color: #f5f5f5 !important;
            font-weight: 600;
            color: #262626;
          }
          .ant-table-tbody > tr:hover > td {
            background-color: #e6f7ff !important;
          }
        `}
      </style>
      <Card
        title={t('apiPartners.title')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {t('apiPartners.addConfig')}
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          size="middle"
          bordered
          style={{ 
            fontSize: '13px',
            '--ant-table-header-bg': '#fafafa'
          } as any}
          rowClassName={(_, index) => 
            index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
          }
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10
              }));
              // 分页变化时重新获取数据
              fetchData();
            },
            pageSizeOptions: ['10', '20', '50', '100'],
            size: 'default'
          }}
        />
      </Card>

      <Modal
        title={editingConfig ? t('apiPartners.editConfig') : t('apiPartners.addConfigTitle')}
        open={modalVisible}
        onCancel={() => {
          if (!submitting) {
            setModalVisible(false);
            form.resetFields();
          }
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={submitting ? t('common.loading') : t('common.confirm')}
        cancelText={t('common.cancel')}
        width={1000}
        style={{ top: 20 }}
        closable={!submitting}
        maskClosable={!submitting}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="app_id"
                    label="应用ID"
                    rules={[{ required: true, message: '请输入应用ID' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="请输入应用ID"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="partner_name"
                    label="合作伙伴名称"
                    rules={[{ required: true, message: '请输入合作伙伴名称' }]}
                  >
                    <Input placeholder="请输入合作伙伴名称" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="partner_phone"
                    label="联系电话"
                  >
                    <Input placeholder="请输入联系电话" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="类型"
                  >
                    <Select placeholder="请选择类型">
                      <Select.Option value={1}>银行</Select.Option>
                      <Select.Option value={2}>金融</Select.Option>
                      <Select.Option value={3}>科技</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="partner_description"
                label="合作伙伴描述"
              >
                <TextArea
                  rows={3}
                  placeholder="请输入合作伙伴描述"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="partner_api"
                    label="API基础URL"
                    rules={[
                      { required: true, message: '请输入API基础URL' },
                      { type: 'url', message: '请输入有效的URL' }
                    ]}
                  >
                    <Input placeholder="https://api.example.com/v1" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="secret_key"
                    label="密钥"
                    rules={[{ required: true, message: '请输入密钥' }]}
                  >
                    <Input placeholder="请输入密钥" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="默认配置" key="defaults">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="default_amount"
                    label="默认金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="请输入默认金额"
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value!.replace(/,/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="default_loan_days"
                    label="默认借款天数"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="请输入默认借款天数"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="default_interest_rate"
                    label="默认利率"
                  >
                    <Input
                      style={{ width: '100%' }}
                      placeholder="请输入默认利率，如：0.05"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="下载链接" key="downloads">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="ios_download_url"
                    label="iOS下载链接"
                  >
                    <Input placeholder="请输入iOS下载链接" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="android_download_url"
                    label="Android下载链接"
                  >
                    <Input placeholder="请输入Android下载链接" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="API接口" key="apis">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="admittance_url"
                    label="准入URL"
                  >
                    <Input placeholder="请输入准入URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="credential_stuffing_url"
                    label="撞库URL"
                  >
                    <Input placeholder="请输入撞库URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="push_user_data_url"
                    label="推送用户数据URL"
                  >
                    <Input placeholder="请输入推送用户数据URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="credit_data_url"
                    label="信用数据URL"
                  >
                    <Input placeholder="请输入信用数据URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="loan_product_url"
                    label="贷款产品URL"
                  >
                    <Input placeholder="请输入贷款产品URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="loan_contract_url"
                    label="贷款合同URL"
                  >
                    <Input placeholder="请输入贷款合同URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="submit_loan_url"
                    label="提交贷款URL"
                  >
                    <Input placeholder="请输入提交贷款URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="loan_preview_url"
                    label="贷款预览URL"
                  >
                    <Input placeholder="请输入贷款预览URL" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="银行相关" key="bank">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="bank_list_url"
                    label="银行列表URL"
                  >
                    <Input placeholder="请输入银行列表URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="bind_bank_url"
                    label="绑定银行URL"
                  >
                    <Input placeholder="请输入绑定银行URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="set_default_bank_url"
                    label="设置默认银行URL"
                  >
                    <Input placeholder="请输入设置默认银行URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="pre_bind"
                    label="预绑定URL"
                  >
                    <Input placeholder="请输入预绑定URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="get_bank"
                    label="获取银行信息URL"
                  >
                    <Input placeholder="请输入获取银行信息URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="user_loan_amt"
                    label="用户贷款金额URL"
                  >
                    <Input placeholder="请输入用户贷款金额URL" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="其他功能" key="others">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="order_status_url"
                    label="订单状态URL"
                  >
                    <Input placeholder="请输入订单状态URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="repay_plan_url"
                    label="还款计划URL"
                  >
                    <Input placeholder="请输入还款计划URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="repay_details_url"
                    label="还款详情URL"
                  >
                    <Input placeholder="请输入还款详情URL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contract_sign_url"
                    label="合同签署URL"
                  >
                    <Input placeholder="请输入合同签署URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="query_user_url"
                label="查询用户URL"
              >
                <Input placeholder="请输入查询用户URL" />
              </Form.Item>

              <Form.Item
                name="extend"
                label="扩展信息(JSON格式)"
              >
                <TextArea
                  rows={4}
                  placeholder="请输入扩展信息，JSON格式"
                />
              </Form.Item>
            </TabPane>

            <TabPane tab="状态设置" key="status">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="状态"
                    valuePropName="checked"
                    getValueFromEvent={(checked) => checked ? 1 : 0}
                    getValueProps={(value) => ({ checked: value === 1 })}
                  >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="is_head"
                    label="是否头部"
                    valuePropName="checked"
                    getValueFromEvent={(checked) => checked ? 1 : 0}
                    getValueProps={(value) => ({ checked: value === 1 })}
                  >
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="add_bank"
                    label="添加银行"
                    valuePropName="checked"
                    getValueFromEvent={(checked) => checked ? 1 : 0}
                    getValueProps={(value) => ({ checked: value === 1 })}
                  >
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="is_sign"
                    label="是否签名"
                    valuePropName="checked"
                    getValueFromEvent={(checked) => checked ? 1 : 0}
                    getValueProps={(value) => ({ checked: value === 1 })}
                  >
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="is_reload"
                label="是否重新加载"
                valuePropName="checked"
                getValueFromEvent={(checked) => checked ? 1 : 0}
                getValueProps={(value) => ({ checked: value === 1 })}
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>
    </div>
  );
};

export default ApiPartners;