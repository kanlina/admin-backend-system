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
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type {
  PushAudience,
  PushAudiencePayload,
  PushToken,
  PushTokenPayload,
} from '../types';
import type { UploadProps } from 'antd';
import './PushAudience.css';

const { TextArea } = Input;

const PushAudiencePage: React.FC = () => {
  const { t } = useTranslation();
  const [audienceForm] = Form.useForm();
  const [tokenFilterForm] = Form.useForm();
  const [tokenImportForm] = Form.useForm();
  const [tokenEditForm] = Form.useForm();
  const [audiences, setAudiences] = useState<PushAudience[]>([]);
  const [tokens, setTokens] = useState<PushToken[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);
  const [tokenImportModalVisible, setTokenImportModalVisible] = useState(false);
  const [editingAudience, setEditingAudience] = useState<PushAudience | null>(null);
  const [activeTab, setActiveTab] = useState<'audiences' | 'tokens'>('audiences');
  const [audienceSubmitLoading, setAudienceSubmitLoading] = useState(false);
  const [tokenFilters, setTokenFilters] = useState<{
    status?: string;
    search?: string;
  }>({});
  const [tokenImportLoading, setTokenImportLoading] = useState(false);
  const [excelUploading, setExcelUploading] = useState(false);
  const [tokenEditVisible, setTokenEditVisible] = useState(false);
  const [editingToken, setEditingToken] = useState<PushToken | null>(null);
  const [tokenEditLoading, setTokenEditLoading] = useState(false);

  useEffect(() => {
    fetchAudiences();
    fetchTokens();
  }, []);

  const buildErrorMessage = (defaultMessage: string, error?: any) => {
    const apiMessage = error?.response?.data?.message || error?.message;
    return apiMessage || defaultMessage;
  };

  const fetchAudiences = async () => {
    setAudienceLoading(true);
    try {
      const response = await apiService.getPushAudiences();
      if (response.success) {
        setAudiences(response.data || []);
      } else {
        message.error(response.message || t('pushAudience.messages.loadAudienceError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushAudience.messages.loadAudienceError'), error));
    } finally {
      setAudienceLoading(false);
    }
  };

  const fetchTokens = async (params = tokenFilters) => {
    setTokenLoading(true);
    try {
      const response = await apiService.getPushTokens(params);
      if (response.success) {
        setTokens(response.data || []);
      } else {
        message.error(response.message || t('pushAudience.messages.loadTokenError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushAudience.messages.loadTokenError'), error));
    } finally {
      setTokenLoading(false);
    }
  };

  const handleAddAudience = () => {
    setEditingAudience(null);
    audienceForm.resetFields();
    audienceForm.setFieldsValue({
      status: true,
    });
    setAudienceModalVisible(true);
  };

  const handleEditAudience = (audience: PushAudience) => {
    setEditingAudience(audience);
    audienceForm.setFieldsValue({
      ...audience,
      status: audience.status === 'active',
    });
    setAudienceModalVisible(true);
  };

  const handleDeleteAudience = async (audience: PushAudience) => {
    if (!audience?.id) return;
    try {
      setAudienceLoading(true);
      const response = await apiService.deletePushAudience(String(audience.id));
      if (response.success) {
        message.success(t('pushAudience.messages.deleteAudienceSuccess'));
        fetchAudiences();
      } else {
        message.error(response.message || t('pushAudience.messages.deleteAudienceError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushAudience.messages.deleteAudienceError'), error));
    } finally {
      setAudienceLoading(false);
    }
  };

  const handleAudienceSubmit = async () => {
    try {
      const values = await audienceForm.validateFields();
      setAudienceSubmitLoading(true);
      const payload: PushAudiencePayload = {
        name: values.name,
        description: values.description,
        tags: values.tags,
        status: values.status ? 'active' : 'inactive',
      };

      const response = editingAudience
        ? await apiService.updatePushAudience(String(editingAudience.id), payload)
        : await apiService.createPushAudience(payload);

      if (response.success) {
        message.success(
          editingAudience
            ? t('pushAudience.messages.updateAudienceSuccess')
            : t('pushAudience.messages.createAudienceSuccess')
        );
        setAudienceModalVisible(false);
        setEditingAudience(null);
        audienceForm.resetFields();
        fetchAudiences();
      } else {
        message.error(
          response.message ||
            (editingAudience
              ? t('pushAudience.messages.updateAudienceError')
              : t('pushAudience.messages.createAudienceError'))
        );
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(
        buildErrorMessage(
          editingAudience
            ? t('pushAudience.messages.updateAudienceError')
            : t('pushAudience.messages.createAudienceError'),
          error
        )
      );
    } finally {
      setAudienceSubmitLoading(false);
    }
  };

  const handleFilterTokens = (_changedValues: any, allValues: any) => {
    const nextFilters = {
      ...tokenFilters,
      ...allValues,
    };
    setTokenFilters(nextFilters);
  };

  const applyTokenFilters = () => {
    fetchTokens(tokenFilters);
  };

  const resetTokenFilters = () => {
    setTokenFilters({});
    tokenFilterForm.resetFields();
    fetchTokens({});
  };

  const handleDeleteToken = async (token: PushToken) => {
    if (!token?.id) return;
    try {
      setTokenLoading(true);
      const response = await apiService.deletePushToken(String(token.id));
      if (response.success) {
        message.success(t('pushAudience.messages.deleteTokenSuccess'));
        fetchTokens(tokenFilters);
      } else {
        message.error(response.message || t('pushAudience.messages.deleteTokenError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushAudience.messages.deleteTokenError'), error));
    } finally {
      setTokenLoading(false);
    }
  };

  const handleOpenTokenImport = () => {
    tokenImportForm.resetFields();
    setTokenImportModalVisible(true);
  };

  const handleTokenImport = async () => {
    try {
      const values = await tokenImportForm.validateFields();
      if (!values.audienceId) {
        message.warning(t('pushAudience.tokens.import.audienceRequired'));
        return;
      }

      const tokensInput: string[] = values.tokens
        .replace(/\n/g, ',')
        .split(',')
        .map((line: string) => line.trim())
        .filter(Boolean);

      const uniqueTokens = Array.from(new Set(tokensInput));

      if (!uniqueTokens.length) {
        message.warning(t('pushAudience.tokens.import.noTokenInput'));
        return;
      }

      setTokenImportLoading(true);

      const payloadTokens: PushTokenPayload[] = uniqueTokens.map((tokenValue) => ({
        token: tokenValue,
        tags: values.tags,
      }));

      const response = await apiService.importPushTokens({
        tokens: payloadTokens,
        replace: values.replaceExisting,
        audienceId: values.audienceId,
      });

      if (response.success) {
        message.success(
          t('pushAudience.tokens.import.success', { count: response.data?.imported || payloadTokens.length })
        );
        setTokenImportModalVisible(false);
        fetchTokens(tokenFilters);
      } else {
        message.error(response.message || t('pushAudience.tokens.import.error'));
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(buildErrorMessage(t('pushAudience.tokens.import.error'), error));
    } finally {
      setTokenImportLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiService.downloadPushTokenTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'push-token-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error(buildErrorMessage(t('pushAudience.tokens.import.templateError'), error));
    }
  };

  const handleExcelUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onError, onSuccess } = options;
    try {
      const formData = new FormData();
      formData.append('file', file as File);

      setExcelUploading(true);
      const response = await apiService.parsePushTokensFromFile(formData);
      if (response.success) {
        const parsedTokens = response.data?.tokens || [];
        if (!parsedTokens.length) {
          throw new Error(t('pushAudience.tokens.import.parseEmpty'));
        }
        const formattedTokens = parsedTokens.join('\n');
        tokenImportForm.setFieldsValue({
          tokens: formattedTokens,
        });
        tokenImportForm.validateFields(['tokens']).catch(() => undefined);
        message.success(
          t('pushAudience.tokens.import.parseSuccess', { count: parsedTokens.length })
        );
        onSuccess?.(response, new XMLHttpRequest());
      } else {
        throw new Error(response.message || 'upload failed');
      }
    } catch (error: any) {
      message.error(buildErrorMessage(t('pushAudience.tokens.import.parseError'), error));
      onError?.(error instanceof Error ? error : new Error('upload failed'));
    } finally {
      setExcelUploading(false);
    }
  };

  const audienceMap = useMemo(() => {
    const map = new Map<number, PushAudience>();
    audiences.forEach((audience) => map.set(audience.id, audience));
    return map;
  }, [audiences]);

  const audienceStats = useMemo(() => {
    const total = audiences.length;
    const active = audiences.filter((item) => item.status === 'active').length;
    const tokensCount = tokens.length;
    return { total, active, tokensCount };
  }, [audiences, tokens]);

  const isImportProcessing = tokenImportLoading || excelUploading;

  const formatDateTime = (value?: string) =>
    value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

  const handleEditToken = (record: PushToken) => {
    setEditingToken(record);
    tokenEditForm.setFieldsValue({
      token: record.token,
      tags: record.tags,
      status: record.status,
      audienceIds: record.audienceIds,
    });
    setTokenEditVisible(true);
  };

  const handleTokenEditCancel = () => {
    setTokenEditVisible(false);
    setEditingToken(null);
    tokenEditForm.resetFields();
  };

  const handleTokenUpdate = async () => {
    if (!editingToken) {
      return;
    }
    try {
      const values = await tokenEditForm.validateFields();
      setTokenEditLoading(true);
      const response = await apiService.updatePushToken(String(editingToken.id), {
        token: values.token,
        tags: values.tags,
        status: values.status,
        audienceIds: values.audienceIds,
      });
      if (response.success) {
        message.success(t('pushAudience.tokens.actions.updateSuccess'));
        handleTokenEditCancel();
        fetchTokens(tokenFilters);
      } else {
        message.error(response.message || t('pushAudience.tokens.actions.updateError'));
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(buildErrorMessage(t('pushAudience.tokens.actions.updateError'), error));
    } finally {
      setTokenEditLoading(false);
    }
  };

  const renderTags = (tags?: string[]) => {
    if (!tags?.length) {
      return <span className="push-audience-empty">{t('pushAudience.common.noData')}</span>;
    }
    return (
      <Space size={[4, 4]} wrap>
        {tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>
    );
  };

  const renderAudienceNames = (ids?: number[]) => {
    if (!ids?.length) {
      return <span className="push-audience-empty">{t('pushAudience.common.noData')}</span>;
    }
    const names = ids
      .map((id) => audienceMap.get(id)?.name)
      .filter((name): name is string => Boolean(name));
    if (!names.length) {
      return <span className="push-audience-empty">{t('pushAudience.common.noData')}</span>;
    }
    return (
      <Space size={[4, 4]} wrap>
        {names.map((name) => (
          <Tag key={name}>{name}</Tag>
        ))}
      </Space>
    );
  };

  const audienceColumns: ColumnsType<PushAudience> = [
    {
      title: t('common.index'),
      width: 70,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t('pushAudience.audience.columns.name'),
      dataIndex: 'name',
      width: 220,
      align: 'center',
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    {
      title: t('pushAudience.audience.columns.tags'),
      dataIndex: 'tags',
      width: 220,
      align: 'center',
      render: (tags?: string[]) => renderTags(tags),
    },
    {
      title: t('pushAudience.audience.columns.description'),
      dataIndex: 'description',
      width: 240,
      align: 'center',
      render: (value?: string) =>
        value ? (
          <Typography.Text ellipsis={{ tooltip: true }}>{value}</Typography.Text>
        ) : (
          <span className="push-audience-empty">{t('pushAudience.common.noData')}</span>
        ),
    },
    {
      title: t('pushAudience.audience.columns.createdAt'),
      dataIndex: 'createdAt',
      width: 200,
      align: 'center',
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: t('pushAudience.audience.columns.status'),
      dataIndex: 'status',
      width: 140,
      align: 'center',
      render: (status: PushAudience['status']) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active'
            ? t('pushAudience.status.active')
            : t('pushAudience.status.inactive')}
        </Tag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 220,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditAudience(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('pushAudience.messages.deleteAudienceTitle')}
            description={t('pushAudience.messages.deleteAudienceContent', { name: record.name })}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteAudience(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tokenColumns: ColumnsType<PushToken> = [
    {
      title: t('common.index'),
      width: 70,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t('pushAudience.tokens.columns.token'),
      dataIndex: 'token',
      width: 320,
      align: 'center',
      render: (tokenValue: string) => (
        <Tooltip title={tokenValue}>
          <Typography.Text copyable ellipsis style={{ maxWidth: 280 }}>
            {tokenValue}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: t('pushAudience.tokens.columns.status'),
      dataIndex: 'status',
      width: 140,
      align: 'center',
      render: (status: PushToken['status']) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active'
            ? t('pushAudience.status.active')
            : t('pushAudience.status.inactive')}
        </Tag>
      ),
    },
    {
      title: t('pushAudience.tokens.columns.tags'),
      dataIndex: 'tags',
      width: 220,
      align: 'center',
      render: (tags?: string[]) => renderTags(tags),
    },
    {
      title: t('pushAudience.tokens.columns.createdAt'),
      dataIndex: 'createdAt',
      width: 200,
      align: 'center',
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: t('pushAudience.tokens.columns.audiences'),
      dataIndex: 'audienceIds',
      width: 260,
      align: 'center',
      render: (ids?: number[]) => renderAudienceNames(ids),
    },
    {
      title: t('common.action'),
      width: 180,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditToken(record)}>
            {t('pushAudience.tokens.actions.edit')}
          </Button>
          <Popconfirm
            title={t('pushAudience.messages.deleteTokenTitle')}
            description={t('pushAudience.messages.deleteTokenContent')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteToken(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tokenFilterFormElement = (
    <Form
      form={tokenFilterForm}
      layout="inline"
      className="push-token-filters"
      onValuesChange={handleFilterTokens}
      initialValues={tokenFilters}
    >
      <Form.Item name="search">
        <Input.Search
          allowClear
          placeholder={t('pushAudience.tokens.filters.searchPlaceholder')}
          onSearch={applyTokenFilters}
          style={{ width: 240 }}
        />
      </Form.Item>
      <Form.Item name="status">
        <Select
          allowClear
          placeholder={t('pushAudience.tokens.filters.statusPlaceholder')}
          style={{ width: 180 }}
        >
          <Select.Option value="active">{t('pushAudience.status.active')}</Select.Option>
          <Select.Option value="inactive">{t('pushAudience.status.inactive')}</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={applyTokenFilters}>
            {t('common.refresh')}
          </Button>
          <Button onClick={resetTokenFilters}>{t('common.reset')}</Button>
        </Space>
      </Form.Item>
    </Form>
  );

  return (
    <div className="push-audience-page">
      <Card className="push-audience-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              {t('pushAudience.title')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('pushAudience.subtitle')}
            </Typography.Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => {
                fetchAudiences();
                fetchTokens(tokenFilters);
              }}>
                {t('common.refresh')}
              </Button>
              {activeTab === 'audiences' ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAudience}>
                  {t('pushAudience.actions.addAudience')}
                </Button>
              ) : (
                <Button type="primary" icon={<ImportOutlined />} onClick={handleOpenTokenImport}>
                  {t('pushAudience.tokens.import.title')}
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <div className="push-audience-stat-card">
              <Typography.Text>{t('pushAudience.stats.total')}</Typography.Text>
              <Typography.Title level={3}>{audienceStats.total}</Typography.Title>
            </div>
          </Col>
          <Col span={8}>
            <div className="push-audience-stat-card">
              <Typography.Text>{t('pushAudience.stats.active')}</Typography.Text>
              <Typography.Title level={3}>{audienceStats.active}</Typography.Title>
            </div>
          </Col>
          <Col span={8}>
            <div className="push-audience-stat-card">
              <Typography.Text>{t('pushAudience.stats.tokens')}</Typography.Text>
              <Typography.Title level={3}>{audienceStats.tokensCount}</Typography.Title>
            </div>
          </Col>
        </Row>
      </Card>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'audiences' | 'tokens')}
          items={[
            {
              key: 'audiences',
              label: t('pushAudience.tabs.audiences'),
              children: (
                <Table
                  rowKey="id"
                  loading={audienceLoading}
                  className="push-audience-table"
                  columns={audienceColumns}
                  dataSource={audiences}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => t('common.totalItems', { total }),
                    pageSize: 10,
                  }}
                  scroll={{ x: 1100 }}
                />
              ),
            },
            {
              key: 'tokens',
              label: t('pushAudience.tabs.tokens'),
              children: (
                <>
                  {tokenFilterFormElement}
                  <Table
                    rowKey="id"
                    loading={tokenLoading}
                    className="push-audience-table"
                    columns={tokenColumns}
                    dataSource={tokens}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => t('common.totalItems', { total }),
                      pageSize: 20,
                    }}
                    scroll={{ x: 1200 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={
          editingAudience
            ? t('pushAudience.actions.editAudience')
            : t('pushAudience.actions.addAudience')
        }
        open={audienceModalVisible}
        onOk={handleAudienceSubmit}
        onCancel={() => {
          setAudienceModalVisible(false);
          setEditingAudience(null);
        }}
        width={800}
        confirmLoading={audienceSubmitLoading}
        maskClosable={false}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={audienceForm} layout="vertical" disabled={audienceSubmitLoading}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('pushAudience.form.name')}
                name="name"
                rules={[{ required: true, message: t('pushAudience.form.nameRequired') }]}
              >
                <Input placeholder={t('pushAudience.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('pushAudience.form.tags')} name="tags">
                <Select mode="tags" placeholder={t('pushAudience.form.tagsPlaceholder')} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('pushAudience.form.description')} name="description">
            <TextArea rows={3} placeholder={t('pushAudience.form.descriptionPlaceholder')} />
          </Form.Item>

          <Form.Item label={t('pushAudience.form.status')} name="status" valuePropName="checked">
            <Switch
              checkedChildren={t('pushAudience.status.active')}
              unCheckedChildren={t('pushAudience.status.inactive')}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('pushAudience.tokens.import.title')}
        open={tokenImportModalVisible}
        onOk={handleTokenImport}
        onCancel={() => setTokenImportModalVisible(false)}
        width={700}
        confirmLoading={isImportProcessing}
        maskClosable={false}
        destroyOnClose
        okText={t('common.submit')}
        cancelText={t('common.cancel')}
      >
        <Form form={tokenImportForm} layout="vertical" disabled={isImportProcessing}>
          <Form.Item
            label={t('pushAudience.tokens.import.tokensLabel')}
            name="tokens"
            rules={[{ required: true, message: t('pushAudience.tokens.import.tokensRequired') }]}
          >
            <TextArea
              rows={6}
              placeholder={t('pushAudience.tokens.import.tokensPlaceholder')}
            />
          </Form.Item>
          <Form.Item label={t('pushAudience.tokens.import.audience')} name="audienceId">
            <Select allowClear placeholder={t('pushAudience.tokens.import.audiencePlaceholder')}>
              {audiences.map((audience) => (
                <Select.Option key={audience.id} value={audience.id}>
                  {audience.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={t('pushAudience.tokens.import.tags')} name="tags">
            <Select mode="tags" allowClear placeholder={t('pushAudience.tokens.import.tagsPlaceholder')} />
          </Form.Item>

          <Form.Item label={t('pushAudience.tokens.import.replace')} name="replaceExisting" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider plain>{t('pushAudience.tokens.import.orUpload')}</Divider>
          <Space direction="vertical">
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} disabled={isImportProcessing}>
                {t('pushAudience.tokens.import.downloadTemplate')}
              </Button>
              <Upload
                accept=".xlsx,.xls,.csv"
                showUploadList={false}
                customRequest={handleExcelUpload}
                disabled={isImportProcessing}
              >
                <Button icon={<UploadOutlined />} loading={excelUploading} disabled={isImportProcessing}>
                  {t('pushAudience.tokens.import.uploadExcel')}
                </Button>
              </Upload>
            </Space>
            <Typography.Text type="secondary">
              {t('pushAudience.tokens.import.excelHint')}
            </Typography.Text>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={t('pushAudience.tokens.actions.editTitle')}
        open={tokenEditVisible}
        onOk={handleTokenUpdate}
        onCancel={handleTokenEditCancel}
        confirmLoading={tokenEditLoading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={tokenEditForm} layout="vertical" disabled={tokenEditLoading}>
          <Form.Item
            label={t('pushAudience.tokens.columns.token')}
            name="token"
            rules={[{ required: true, message: t('pushAudience.tokens.import.tokensRequired') }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item label={t('pushAudience.tokens.columns.status')} name="status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="active">{t('pushAudience.status.active')}</Select.Option>
              <Select.Option value="revoked">{t('pushAudience.status.inactive')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('pushAudience.tokens.columns.tags')} name="tags">
            <Select mode="tags" allowClear placeholder={t('pushAudience.tokens.import.tagsPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('pushAudience.tokens.columns.audiences')} name="audienceIds">
            <Select
              mode="multiple"
              allowClear
              placeholder={t('pushAudience.tokens.import.audiencePlaceholder')}
            >
              {audiences.map((audience) => (
                <Select.Option key={audience.id} value={audience.id}>
                  {audience.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PushAudiencePage;

