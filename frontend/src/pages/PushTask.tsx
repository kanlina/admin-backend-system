import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { PushTask, PushTaskPayload, PushTemplate } from '../types';
import './PushTask.css';

const PushTaskPage: React.FC = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<PushTask[]>([]);
  const [pushTemplates, setPushTemplates] = useState<PushTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PushTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<PushTask | null>(null);
  const [filters, setFilters] = useState<{ status?: string; search?: string }>({});
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (editingTask) {
      const template = pushTemplates.find((tpl) => tpl.id === editingTask.pushTemplateId) || null;
      setSelectedTemplate(template);
    }
  }, [editingTask, pushTemplates]);

  const fetchInitialData = async () => {
    await Promise.all([fetchTasks(), fetchReferenceData()]);
  };

  const fetchTasks = async (params = filters) => {
    setLoading(true);
    try {
      const response = await apiService.getPushTasks(params);
      if (response.success) {
        setTasks(response.data || []);
      } else {
        message.error(response.message || t('pushTask.messages.loadError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTask.messages.loadError'), error));
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const templateRes = await apiService.getPushTemplates({ enabled: true });
      if (templateRes.success) {
        setPushTemplates(templateRes.data || []);
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTask.messages.loadReferenceError'), error));
    }
  };

  const buildErrorMessage = (defaultMessage: string, error?: any) => {
    const apiMessage = error?.response?.data?.message || error?.message;
    return apiMessage || defaultMessage;
  };

  const handleFilterChange = (_changed: any, values: any) => {
    const nextFilters = {
      search: values.search,
      status: values.status,
    };
    setFilters(nextFilters);
  };

  const applyFilters = () => {
    fetchTasks(filters);
  };

  const resetFilters = () => {
    filterForm.resetFields();
    const nextFilters = {};
    setFilters(nextFilters);
    fetchTasks(nextFilters);
  };

  const handleAdd = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
    });
    setSelectedTemplate(null);
    setModalVisible(true);
  };

  const handleEdit = (task: PushTask) => {
    setEditingTask(task);
    form.setFieldsValue({
      ...task,
    });
    setSelectedTemplate(pushTemplates.find((tpl) => tpl.id === task.pushTemplateId) || null);
    setModalVisible(true);
  };

  const handleDelete = async (task: PushTask) => {
    try {
      const response = await apiService.deletePushTask(String(task.id));
      if (response.success) {
        message.success(t('pushTask.messages.deleteSuccess'));
        fetchTasks(filters);
      } else {
        message.error(response.message || t('pushTask.messages.deleteError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTask.messages.deleteError'), error));
    }
  };

  const handleExecute = async (task: PushTask) => {
    try {
      const response = await apiService.executePushTask(String(task.id));
      if (response.success) {
        message.success(t('pushTask.messages.executeSuccess'));
        fetchTasks(filters);
      } else {
        message.error(response.message || t('pushTask.messages.executeError'));
      }
    } catch (error) {
      message.error(buildErrorMessage(t('pushTask.messages.executeError'), error));
    }
  };

  const handleTemplateChange = (templateId?: number) => {
    if (!templateId) {
      setSelectedTemplate(null);
      return;
    }
    const template = pushTemplates.find((tpl) => tpl.id === templateId) || null;
    setSelectedTemplate(template);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingTask(null);
    setSelectedTemplate(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: PushTaskPayload = {
        name: values.name,
        description: values.description,
        pushTemplateId: values.pushTemplateId,
        status: values.status,
      };

      setSubmitLoading(true);
      const response = editingTask
        ? await apiService.updatePushTask(String(editingTask.id), payload)
        : await apiService.createPushTask(payload);

      if (response.success) {
        message.success(
          editingTask ? t('pushTask.messages.updateSuccess') : t('pushTask.messages.createSuccess')
        );
        handleModalCancel();
        fetchTasks(filters);
      } else {
        message.error(
          response.message ||
            (editingTask ? t('pushTask.messages.updateError') : t('pushTask.messages.createError'))
        );
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(
        buildErrorMessage(
          editingTask ? t('pushTask.messages.updateError') : t('pushTask.messages.createError'),
          error
        )
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const processing = tasks.filter((task) => task.status === 'processing').length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    return { total, processing, completed };
  }, [tasks]);

  const renderStatusTag = (status: PushTask['status']) => {
    const map: Record<PushTask['status'], { color: string; text: string }> = {
      draft: { color: 'default', text: t('pushTask.status.draft') },
      scheduled: { color: 'cyan', text: t('pushTask.status.scheduled') },
      processing: { color: 'blue', text: t('pushTask.status.processing') },
      completed: { color: 'green', text: t('pushTask.status.completed') },
      failed: { color: 'red', text: t('pushTask.status.failed') },
    };
    const meta = map[status];
    return <Tag color={meta.color}>{meta.text}</Tag>;
  };

  const columns: ColumnsType<PushTask> = [
    {
      title: t('common.index'),
      width: 70,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t('pushTask.table.name'),
      dataIndex: 'name',
      width: 220,
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {record.description || t('pushTask.common.noDescription')}
          </Typography.Paragraph>
        </div>
      ),
    },
    {
      title: t('pushTask.table.pushConfig'),
      dataIndex: 'pushConfigName',
      width: 180,
    },
    {
      title: t('pushTask.table.pushTemplate'),
      dataIndex: 'pushTemplateName',
      width: 180,
    },
    {
      title: t('pushTask.table.pushAudience'),
      dataIndex: 'pushAudienceName',
      width: 180,
    },
    {
      title: t('pushTask.table.scheduleTime'),
      dataIndex: 'scheduleTime',
      width: 200,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: t('pushTask.table.status'),
      dataIndex: 'status',
      width: 140,
      align: 'center',
      render: (status: PushTask['status']) => renderStatusTag(status),
    },
    {
      title: t('pushTask.table.result'),
      dataIndex: 'successCount',
      width: 200,
      render: (_value, record) => (
        <div>
          <Typography.Text>
            {t('pushTask.table.success')}: {record.successCount ?? '-'}
          </Typography.Text>
          <br />
          <Typography.Text>
            {t('pushTask.table.failure')}: {record.failureCount ?? '-'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t('pushTask.table.updatedAt'),
      dataIndex: 'updatedAt',
      width: 200,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 240,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record)}
            disabled={record.status === 'processing'}
          >
            {t('pushTask.actions.execute')}
          </Button>
          <Popconfirm
            title={t('pushTask.messages.deleteTitle')}
            description={t('pushTask.messages.deleteConfirm', { name: record.name })}
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
    <div className="push-task-page">
      <Card className="push-task-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              {t('pushTask.title')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('pushTask.subtitle')}</Typography.Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchTasks(filters)}>
                {t('common.refresh')}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                {t('pushTask.actions.add')}
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={8}>
            <div className="push-task-stat-card">
              <Typography.Text>{t('pushTask.stats.total')}</Typography.Text>
              <Typography.Title level={3}>{taskStats.total}</Typography.Title>
            </div>
          </Col>
          <Col span={8}>
            <div className="push-task-stat-card">
              <Typography.Text>{t('pushTask.stats.processing')}</Typography.Text>
              <Typography.Title level={3}>{taskStats.processing}</Typography.Title>
            </div>
          </Col>
          <Col span={8}>
            <div className="push-task-stat-card">
              <Typography.Text>{t('pushTask.stats.completed')}</Typography.Text>
              <Typography.Title level={3}>{taskStats.completed}</Typography.Title>
            </div>
          </Col>
        </Row>
      </Card>

      <Card>
        <Form
          form={filterForm}
          layout="inline"
          className="push-task-filters"
          onValuesChange={handleFilterChange}
        >
          <Form.Item name="search">
            <Input.Search
              allowClear
              placeholder={t('pushTask.filters.searchPlaceholder')}
              onSearch={applyFilters}
              style={{ width: 260 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder={t('pushTask.filters.statusPlaceholder')}
              style={{ width: 200 }}
            >
              <Select.Option value="draft">{t('pushTask.status.draft')}</Select.Option>
              <Select.Option value="scheduled">{t('pushTask.status.scheduled')}</Select.Option>
              <Select.Option value="processing">{t('pushTask.status.processing')}</Select.Option>
              <Select.Option value="completed">{t('pushTask.status.completed')}</Select.Option>
              <Select.Option value="failed">{t('pushTask.status.failed')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={applyFilters}>
                {t('pushTask.filters.apply')}
              </Button>
              <Button onClick={resetFilters}>{t('pushTask.filters.reset')}</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          rowKey="id"
          loading={loading}
          className="push-task-table"
          columns={columns}
          dataSource={tasks}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => t('common.totalItems', { total }),
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title={editingTask ? t('pushTask.actions.edit') : t('pushTask.actions.add')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleModalCancel}
        width={800}
        confirmLoading={submitLoading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'draft' }}>
          <Form.Item
            label={t('pushTask.form.name')}
            name="name"
            rules={[{ required: true, message: t('pushTask.form.nameRequired') }]}
          >
            <Input placeholder={t('pushTask.form.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('pushTask.form.description')}
            name="description"
          >
            <Input.TextArea rows={3} placeholder={t('pushTask.form.descriptionPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('pushTask.form.pushTemplate')}
            name="pushTemplateId"
            rules={[{ required: true, message: t('pushTask.form.pushTemplateRequired') }]}
          >
            <Select
              placeholder={t('pushTask.form.pushTemplatePlaceholder')}
              onChange={handleTemplateChange}
            >
              {pushTemplates.map((template) => (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedTemplate && (
            <div className="push-task-template-meta">
              <Typography.Text strong>{t('pushTask.form.templateInfoTitle')}</Typography.Text>
              <div>{t('pushTask.form.templateInfoConfig', { name: selectedTemplate.pushConfigName || '-' })}</div>
              <div>{t('pushTask.form.templateInfoAudience', { name: selectedTemplate.pushAudienceName || '-' })}</div>
            </div>
          )}

          <div className="push-task-schedule-hint">
            <Typography.Text strong>{t('pushTask.form.scheduleTime')}</Typography.Text>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t('pushTask.form.scheduleTimeImmediate')} · {t('pushTask.form.scheduleTimeImmediateDesc')}
            </Typography.Paragraph>
          </div>

          <Form.Item label={t('pushTask.form.status')} name="status">
            <Select>
              <Select.Option value="draft">{t('pushTask.status.draft')}</Select.Option>
              <Select.Option value="scheduled">{t('pushTask.status.scheduled')}</Select.Option>
              <Select.Option value="processing">{t('pushTask.status.processing')}</Select.Option>
              <Select.Option value="completed">{t('pushTask.status.completed')}</Select.Option>
              <Select.Option value="failed">{t('pushTask.status.failed')}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PushTaskPage;
