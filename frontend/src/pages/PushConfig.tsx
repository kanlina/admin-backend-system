import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Table,
  Space,
  Modal,
  message,
  Popconfirm,
  Tag,
  Select,
  Switch,
  Typography,
  Divider,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../services/api';
import type { PushConfig as PushConfigType, PushConfigPayload } from '../types';
import './PushConfig.css';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

type PushConfigItem = PushConfigType;

const PushConfig: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [tableLoading, setTableLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [configs, setConfigs] = useState<PushConfigItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PushConfigItem | null>(null);

  // 模拟数据，后续替换为真实 API
  useEffect(() => {
    fetchConfigs();
  }, []);

  const buildErrorMessage = (defaultMessage: string, error?: any) => {
    const apiMessage = error?.response?.data?.message || error?.message;
    return apiMessage || defaultMessage;
  };

  const fetchConfigs = async () => {
    setTableLoading(true);
    try {
      const response = await apiService.getPushConfigs();
      if (response.success) {
        setConfigs(response.data || []);
      } else {
        message.error(response.message || t('pushConfig.messages.loadError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushConfig.messages.loadError'), error));
    } finally {
      setTableLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({ platform: 'all', enabled: true });
    setModalVisible(true);
  };

  const handleEdit = (record: PushConfigItem) => {
    setEditingConfig(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiService.deletePushConfig(id.toString());
      if (response.success) {
        message.success(t('pushConfig.messages.deleteSuccess'));
        fetchConfigs();
      } else {
        message.error(response.message || t('pushConfig.messages.deleteError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushConfig.messages.deleteError'), error));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: PushConfigPayload = {
        ...values,
        enabled: values.enabled ?? true,
      };

      setSubmitLoading(true);

      const response = editingConfig?.id
        ? await apiService.updatePushConfig(editingConfig.id.toString(), payload)
        : await apiService.createPushConfig(payload);

      if (response.success) {
        message.success(
          editingConfig?.id
            ? t('pushConfig.messages.updateSuccess')
            : t('pushConfig.messages.createSuccess')
        );
        setModalVisible(false);
        form.resetFields();
        setEditingConfig(null);
        fetchConfigs();
      } else {
        message.error(
          response.message ||
            (editingConfig?.id
              ? t('pushConfig.messages.updateError')
              : t('pushConfig.messages.createError'))
        );
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(
        buildErrorMessage(
          editingConfig?.id
            ? t('pushConfig.messages.updateError')
            : t('pushConfig.messages.createError'),
          error
        )
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingConfig(null);
  };

  const columns: ColumnsType<PushConfigItem> = [
    {
      title: t('common.index'),
      key: 'index',
      width: 70,
      align: 'center',
      render: (_: any, __: PushConfigItem, index: number) => index + 1,
    },
    {
      title: t('pushConfig.table.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('pushConfig.table.appId'),
      dataIndex: 'appId',
      key: 'appId',
      width: 200,
    },
    {
      title: t('pushConfig.table.platform'),
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (platform: string) => {
        const colors: Record<string, string> = {
          android: 'green',
          ios: 'blue',
          web: 'orange',
          all: 'purple',
        };
        const labels: Record<string, string> = {
          android: t('pushConfig.platform.android'),
          ios: t('pushConfig.platform.ios'),
          web: t('pushConfig.platform.web'),
          all: t('pushConfig.platform.all'),
        };
        return <Tag color={colors[platform]}>{labels[platform]}</Tag>;
      },
    },
    {
      title: t('pushConfig.table.projectId'),
      dataIndex: 'projectId',
      key: 'projectId',
      width: 200,
    },
    {
      title: t('pushConfig.table.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? t('pushConfig.status.enabled') : t('pushConfig.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('pushConfig.table.description'),
      dataIndex: 'description',
      key: 'description',
      width: 260,
      ellipsis: true,
      render: (text: string) => (
        <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
          {text}
        </Typography.Paragraph>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('pushConfig.messages.deleteConfirm')}
            onConfirm={() => record.id && handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
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
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {t('pushConfig.title')}
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('pushConfig.actions.add')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={tableLoading}
          className="push-config-table"
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => t('common.totalItems', { total }),
          }}
        />
      </Card>

      <Modal
        title={editingConfig ? t('pushConfig.actions.edit') : t('pushConfig.actions.add')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={800}
        confirmLoading={submitLoading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ platform: 'all', enabled: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('pushConfig.form.name')}
                name="name"
                rules={[{ required: true, message: t('pushConfig.form.nameRequired') }]}
              >
                <Input placeholder={t('pushConfig.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('pushConfig.form.appId')}
                name="appId"
                rules={[{ required: true, message: t('pushConfig.form.appIdRequired') }]}
              >
                <Input placeholder={t('pushConfig.form.appIdPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('pushConfig.form.platform')}
                name="platform"
                rules={[{ required: true, message: t('pushConfig.form.platformRequired') }]}
              >
                <Select>
                  <Option value="all">{t('pushConfig.platform.all')}</Option>
                  <Option value="android">{t('pushConfig.platform.android')}</Option>
                  <Option value="ios">{t('pushConfig.platform.ios')}</Option>
                  <Option value="web">{t('pushConfig.platform.web')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('pushConfig.form.projectId')}
                name="projectId"
                rules={[{ required: true, message: t('pushConfig.form.projectIdRequired') }]}
              >
                <Input placeholder={t('pushConfig.form.projectIdPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">{t('pushConfig.form.credentials')}</Divider>

          <Form.Item
            label={t('pushConfig.form.serverKey')}
            name="serverKey"
            tooltip={t('pushConfig.form.serverKeyTooltip')}
          >
            <TextArea
              rows={3}
              placeholder={t('pushConfig.form.serverKeyPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            label={t('pushConfig.form.serviceAccount')}
            name="serviceAccount"
            tooltip={t('pushConfig.form.serviceAccountTooltip')}
          >
            <TextArea
              rows={5}
              placeholder={t('pushConfig.form.serviceAccountPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            label={t('pushConfig.form.vapidKey')}
            name="vapidKey"
            tooltip={t('pushConfig.form.vapidKeyTooltip')}
          >
            <TextArea
              rows={3}
              placeholder={t('pushConfig.form.vapidKeyPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            label={t('pushConfig.form.description')}
            name="description"
          >
            <TextArea
              rows={3}
              placeholder={t('pushConfig.form.descriptionPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            label={t('pushConfig.form.status')}
            name="enabled"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={t('pushConfig.status.enabled')}
              unCheckedChildren={t('pushConfig.status.disabled')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PushConfig;

