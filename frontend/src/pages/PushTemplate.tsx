import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { PushTemplate, PushTemplatePayload, PushConfig, PushAudience } from '../types';
import './PushTemplate.css';

const { TextArea } = Input;

interface TemplateFilters {
  search?: string;
  pushConfigId?: number;
  pushAudienceId?: number;
  enabled?: boolean;
}

const PushTemplatePage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [templates, setTemplates] = useState<PushTemplate[]>([]);
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PushTemplate | null>(null);
  const [pushConfigs, setPushConfigs] = useState<PushConfig[]>([]);
  const [audiences, setAudiences] = useState<PushAudience[]>([]);
  const [pageLocked, setPageLocked] = useState(false);

  useEffect(() => {
    fetchTemplates(filters);
    fetchReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [configResponse, audienceResponse] = await Promise.all([
        apiService.getPushConfigs({ enabled: true }),
        apiService.getPushAudiences({ status: 'active' }),
      ]);
      if (configResponse.success) {
        setPushConfigs(configResponse.data || []);
      }
      if (audienceResponse.success) {
        setAudiences(audienceResponse.data || []);
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTemplate.messages.loadReferenceError'), error));
    }
  };

  const buildErrorMessage = (defaultMessage: string, error?: any) => {
    const apiMessage = error?.response?.data?.message || error?.message;
    return apiMessage || defaultMessage;
  };

  const fetchTemplates = async (params = filters) => {
    setLoading(true);
    try {
      const cleanedParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
      ) as TemplateFilters;
      const response = await apiService.getPushTemplates(cleanedParams);
      if (response.success) {
        setTemplates(response.data || []);
      } else {
        message.error(response.message || t('pushTemplate.messages.loadError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTemplate.messages.loadError'), error));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (_changedValues: any, allValues: any) => {
    const nextFilters: TemplateFilters = {
      search: allValues.search,
      pushConfigId: allValues.pushConfigId,
      pushAudienceId: allValues.pushAudienceId,
      enabled: allValues.enabled,
    };
    setFilters(nextFilters);
  };

  const applyFilters = () => {
    fetchTemplates(filters);
  };

  const resetFilters = () => {
    filterForm.resetFields();
    const nextFilters: TemplateFilters = {};
    setFilters(nextFilters);
    fetchTemplates(nextFilters);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: PushTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      ...record,
      dataPayload: record.dataPayload ? JSON.stringify(record.dataPayload, null, 2) : '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: PushTemplate) => {
    if (!record.id) return;
    try {
      const response = await apiService.deletePushTemplate(String(record.id));
      if (response.success) {
        message.success(t('pushTemplate.messages.deleteSuccess'));
        fetchTemplates(filters);
      } else {
        message.error(response.message || t('pushTemplate.messages.deleteError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTemplate.messages.deleteError'), error));
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingTemplate(null);
  };

  const parseDataPayload = (value?: string) => {
    if (!value) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error();
      }
      return parsed;
    } catch {
      throw new Error(t('pushTemplate.form.dataPayloadInvalid'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let dataPayload;
      try {
        dataPayload = parseDataPayload(values.dataPayload);
      } catch (error) {
        message.error(error instanceof Error ? error.message : t('pushTemplate.form.dataPayloadInvalid'));
        return;
      }

      const payload: PushTemplatePayload = {
        name: values.name,
        pushConfigId: values.pushConfigId,
        pushAudienceId: values.pushAudienceId,
        title: values.title,
        body: values.body,
        clickAction: values.clickAction,
        imageUrl: values.imageUrl,
        description: values.description,
        dataPayload,
        tags: values.tags?.filter((tag: string) => tag?.trim()),
        enabled: values.enabled,
      };

      setSubmitLoading(true);
      setPageLocked(true);
      const response = editingTemplate
        ? await apiService.updatePushTemplate(String(editingTemplate.id), payload)
        : await apiService.createPushTemplate(payload);

      if (response.success) {
        message.success(
          editingTemplate ? t('pushTemplate.messages.updateSuccess') : t('pushTemplate.messages.createSuccess')
        );
        handleModalCancel();
        fetchTemplates(filters);
      } else {
        message.error(
          response.message ||
            (editingTemplate ? t('pushTemplate.messages.updateError') : t('pushTemplate.messages.createError'))
        );
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(
        buildErrorMessage(
          editingTemplate ? t('pushTemplate.messages.updateError') : t('pushTemplate.messages.createError'),
          error
        )
      );
    } finally {
      setSubmitLoading(false);
      setPageLocked(false);
    }
  };

  const templateStats = useMemo(() => {
    const total = templates.length;
    const enabled = templates.filter((item) => item.enabled).length;
    const disabled = total - enabled;
    return { total, enabled, disabled };
  }, [templates]);

  const formatDateTime = (value?: string) =>
    value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

  const columns: ColumnsType<PushTemplate> = [
    {
      title: t('common.index'),
      width: 70,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t('pushTemplate.table.name'),
      dataIndex: 'name',
      width: 200,
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {record.templateKey}
          </Typography.Paragraph>
        </div>
      ),
    },
    {
      title: t('pushTemplate.table.pushConfig'),
      dataIndex: 'pushConfigName',
      width: 200,
      render: (value?: string) =>
        value ? (
          <Typography.Text>{value}</Typography.Text>
        ) : (
          <span className="push-template-empty">{t('pushTemplate.common.noData')}</span>
        ),
    },
    {
      title: t('pushTemplate.table.pushAudience'),
      dataIndex: 'pushAudienceName',
      width: 200,
      render: (value?: string) =>
        value ? (
          <Typography.Text>{value}</Typography.Text>
        ) : (
          <span className="push-template-empty">{t('pushTemplate.common.noData')}</span>
        ),
    },
    {
      title: t('pushTemplate.table.title'),
      dataIndex: 'title',
      width: 240,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis style={{ maxWidth: 220 }}>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: t('pushTemplate.table.status'),
      dataIndex: 'enabled',
      width: 120,
      align: 'center',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? t('pushTemplate.status.enabled') : t('pushTemplate.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('pushTemplate.table.updatedAt'),
      dataIndex: 'updatedAt',
      width: 200,
      align: 'center',
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 200,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('pushTemplate.messages.deleteTitle')}
            description={t('pushTemplate.messages.deleteConfirm', { name: record.name })}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="push-template-container">
      {pageLocked && (
        <div className="push-template-lock-mask">
          <Spin tip={t('common.loading')} />
        </div>
      )}
      <div className={`push-template-page${pageLocked ? ' locked' : ''}`}>
      <Card className="push-template-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              {t('pushTemplate.title')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('pushTemplate.subtitle')}</Typography.Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchTemplates(filters)}>
                {t('common.refresh')}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                {t('pushTemplate.actions.add')}
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <div className="push-template-stat-card">
              <Typography.Text>{t('pushTemplate.stats.total')}</Typography.Text>
              <Typography.Title level={3}>{templateStats.total}</Typography.Title>
            </div>
          </Col>
          <Col span={8}>
            <div className="push-template-stat-card">
              <Typography.Text>{t('pushTemplate.stats.enabled')}</Typography.Text>
              <Typography.Title level={3}>{templateStats.enabled}</Typography.Title>
            </div>
          </Col>
          <Col span={8}>
            <div className="push-template-stat-card">
              <Typography.Text>{t('pushTemplate.stats.disabled')}</Typography.Text>
              <Typography.Title level={3}>{templateStats.disabled}</Typography.Title>
            </div>
          </Col>
        </Row>
      </Card>

      <Card>
        <Form
          form={filterForm}
          layout="inline"
          className="push-template-filters"
          onValuesChange={handleFilterChange}
        >
          <Form.Item name="search">
            <Input.Search
              allowClear
              placeholder={t('pushTemplate.filters.searchPlaceholder')}
              onSearch={applyFilters}
              style={{ width: 260 }}
            />
          </Form.Item>
          <Form.Item name="pushConfigId">
            <Select
              allowClear
              placeholder={t('pushTemplate.filters.pushConfigPlaceholder')}
              style={{ width: 200 }}
            >
              {pushConfigs.map((config) => (
                <Select.Option key={config.id} value={config.id}>
                  {config.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="pushAudienceId">
            <Select
              allowClear
              placeholder={t('pushTemplate.filters.pushAudiencePlaceholder')}
              style={{ width: 200 }}
            >
              {audiences.map((audience) => (
                <Select.Option key={audience.id} value={audience.id}>
                  {audience.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="enabled">
            <Select
              allowClear
              placeholder={t('pushTemplate.filters.statusPlaceholder')}
              style={{ width: 160 }}
            >
              <Select.Option value={true}>{t('pushTemplate.status.enabled')}</Select.Option>
              <Select.Option value={false}>{t('pushTemplate.status.disabled')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={applyFilters}>
                {t('pushTemplate.filters.apply')}
              </Button>
              <Button onClick={resetFilters}>{t('pushTemplate.filters.reset')}</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          rowKey="id"
          loading={loading}
          className="push-template-table"
          columns={columns}
          dataSource={templates}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => t('common.totalItems', { total }),
          }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={
          editingTemplate ? t('pushTemplate.actions.edit') : t('pushTemplate.actions.add')
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleModalCancel}
        width={900}
        confirmLoading={submitLoading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
        okButtonProps={{ disabled: submitLoading }}
        cancelButtonProps={{ disabled: submitLoading }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: true,
          }}
        >
          <Form.Item
            label={t('pushTemplate.form.name')}
            name="name"
            rules={[{ required: true, message: t('pushTemplate.form.nameRequired') }]}
          >
            <Input placeholder={t('pushTemplate.form.namePlaceholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('pushTemplate.form.pushConfig')}
                name="pushConfigId"
                rules={[{ required: true, message: t('pushTemplate.form.pushConfigRequired') }]}
              >
                <Select placeholder={t('pushTemplate.form.pushConfigPlaceholder')}>
                  {pushConfigs.map((config) => (
                    <Select.Option key={config.id} value={config.id}>
                      {config.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('pushTemplate.form.pushAudience')}
                name="pushAudienceId"
                rules={[{ required: true, message: t('pushTemplate.form.pushAudienceRequired') }]}
              >
                <Select placeholder={t('pushTemplate.form.pushAudiencePlaceholder')}>
                  {audiences.map((audience) => (
                    <Select.Option key={audience.id} value={audience.id}>
                      {audience.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t('pushTemplate.form.tags')}
            name="tags"
          >
            <Select mode="tags" allowClear placeholder={t('pushTemplate.form.tagsPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('pushTemplate.form.title')}
            name="title"
            rules={[{ required: true, message: t('pushTemplate.form.titleRequired') }]}
          >
            <Input placeholder={t('pushTemplate.form.titlePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('pushTemplate.form.body')}
            name="body"
            rules={[{ required: true, message: t('pushTemplate.form.bodyRequired') }]}
          >
            <TextArea rows={4} placeholder={t('pushTemplate.form.bodyPlaceholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('pushTemplate.form.clickAction')} name="clickAction">
                <Input placeholder={t('pushTemplate.form.clickActionPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('pushTemplate.form.imageUrl')} name="imageUrl">
                <Input placeholder={t('pushTemplate.form.imageUrlPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t('pushTemplate.form.dataPayload')}
            name="dataPayload"
            tooltip={t('pushTemplate.form.dataPayloadTip')}
          >
            <TextArea
              rows={5}
              className="push-template-json-textarea"
              placeholder={t('pushTemplate.form.dataPayloadPlaceholder')}
            />
          </Form.Item>

          <Form.Item label={t('pushTemplate.form.description')} name="description">
            <TextArea rows={3} placeholder={t('pushTemplate.form.descriptionPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('pushTemplate.form.enabled')}
            name="enabled"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={t('pushTemplate.status.enabled')}
              unCheckedChildren={t('pushTemplate.status.disabled')}
            />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </div>
  );
};

export default PushTemplatePage;

