import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Card,
  Modal,
  Form,
  message,
  Popconfirm,
  Switch,
  Image,
  Upload,
  Tooltip,
  Typography
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';
import dayjs from 'dayjs';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { Text } = Typography;

interface NewsItem {
  id: number;
  title: string;
  subtitle?: string;
  author?: string;
  titleImg01?: string;
  enabled: number;
  publishedAt?: string;
  urlPath?: string;
  type?: number;
  parentId?: number;
  alias?: string;
}

const NewsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [contents, setContents] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [searchTitle, setSearchTitle] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<number | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingContent, setEditingContent] = useState<NewsItem | null>(null);
  const [form] = Form.useForm();
  const [detailForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [detailEditorValue, setDetailEditorValue] = useState('');
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = useRef<any>(null);

  const appId = 15; // 默认 appId

  useEffect(() => {
    fetchContents();
  }, [pagination.current, pagination.pageSize, searchTitle, enabledFilter]);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        appId
      };

      if (searchTitle) {
        params.title = searchTitle;
      }
      if (enabledFilter !== undefined) {
        params.enabled = enabledFilter;
      }

      const response = await apiService.getContents(params);
      if (response.success) {
        setContents(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0
        }));
      }
    } catch (error) {
      message.error(t('news.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages
    });
  };

  const handleAdd = () => {
    setEditingContent(null);
    form.resetFields();
    form.setFieldsValue({ appId, enabled: 1 });
    setThumbnailPreview(null);
    setModalVisible(true);
  };

  const handleEdit = async (record: NewsItem) => {
    try {
      setLoading(true);
      const response = await apiService.getContentById(record.id.toString());
      if (response.success) {
        setEditingContent(response.data);
        form.setFieldsValue(response.data);
        setThumbnailPreview(response.data?.titleImg01 || null);
        setModalVisible(true);
      }
    } catch (error) {
      message.error(t('news.messages.detailLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiService.deleteContent(id.toString());
      if (response.success) {
        message.success(t('news.messages.deleteSuccess'));
        fetchContents();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || t('news.messages.deleteError'));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('news.messages.selectWarning'));
      return;
    }

    try {
      const response = await apiService.deleteContents(selectedRowKeys.map(key => key.toString()));
      if (response.success) {
        message.success(t('news.messages.batchDeleteSuccess'));
        setSelectedRowKeys([]);
        fetchContents();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || t('news.messages.batchDeleteError'));
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingContent) {
        const response = await apiService.updateContent(editingContent.id.toString(), values);
        if (response.success) {
          message.success(t('news.messages.updateSuccess'));
          setModalVisible(false);
          setThumbnailPreview(null);
          fetchContents();
        }
      } else {
        const response = await apiService.createContent(values);
        if (response.success) {
          message.success(t('news.messages.createSuccess'));
          setModalVisible(false);
          setThumbnailPreview(null);
          fetchContents();
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      const fallbackMessage = editingContent ? t('news.messages.updateError') : t('news.messages.createError');
      message.error(error.response?.data?.message || fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: number, enabled: number) => {
    try {
      const newEnabled = enabled === 1 ? 0 : 1;
      const response = await apiService.toggleContentEnabled(id.toString(), newEnabled);
      if (response.success) {
        message.success(t('news.messages.statusUpdateSuccess'));
        fetchContents();
      }
    } catch (error) {
      message.error(t('news.messages.statusUpdateError'));
      fetchContents();
    }
  };

  const handleViewDetail = async (record: NewsItem) => {
    try {
      setLoading(true);
      const response = await apiService.getContentById(record.id.toString());
      if (response.success) {
        setEditingContent(response.data);
        detailForm.setFieldsValue({ content: response.data.content });
        setDetailEditorValue(response.data.content || '');
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error(t('news.messages.detailLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetail = async () => {
    try {
      const values = await detailForm.validateFields();
      if (!editingContent) return;

      setLoading(true);
      const response = await apiService.updateContentDetail(editingContent.id.toString(), values.content);
      if (response.success) {
        message.success(t('news.messages.detailSaveSuccess'));
        setDetailModalVisible(false);
        detailForm.resetFields();
        setDetailEditorValue('');
        fetchContents();
      }
    } catch (error) {
      message.error(t('news.messages.detailSaveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const extension = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
      const response = await apiService.uploadContentImage(file, extension);

      if (!response.success) {
        throw new Error(response.message || t('news.messages.uploadError'));
      }

      const imageUrl = response.data?.url;
      form.setFieldsValue({ titleImg01: imageUrl });
      setThumbnailPreview(imageUrl || null);
      message.success(t('news.messages.uploadSuccess'));
    } catch (error: any) {
      message.error(error?.message || t('news.messages.uploadError'));
    } finally {
      setUploading(false);
    }

    return false;
  };

  useEffect(() => {
    if (detailModalVisible) {
      if (editorContainerRef.current) {
        if (!quillInstanceRef.current) {
          const toolbarContainer = document.createElement('div');
          toolbarContainer.innerHTML = `
            <span class="ql-formats">
              <select class="ql-header">
                <option selected></option>
                <option value="1"></option>
                <option value="2"></option>
                <option value="3"></option>
              </select>
            </span>
            <span class="ql-formats">
              <button class="ql-bold"></button>
              <button class="ql-italic"></button>
              <button class="ql-underline"></button>
              <button class="ql-strike"></button>
            </span>
            <span class="ql-formats">
              <button class="ql-list" value="ordered"></button>
              <button class="ql-list" value="bullet"></button>
            </span>
            <span class="ql-formats">
              <select class="ql-align"></select>
            </span>
            <span class="ql-formats">
              <button class="ql-link"></button>
              <button class="ql-image"></button>
            </span>
            <span class="ql-formats">
              <button class="ql-clean"></button>
            </span>
          `;

          const wrapper = document.createElement('div');
          wrapper.className = 'ql-container ql-snow';
          const editorDiv = document.createElement('div');
          editorDiv.className = 'ql-editor';
          wrapper.appendChild(editorDiv);

          editorContainerRef.current.innerHTML = '';
          editorContainerRef.current.appendChild(toolbarContainer);
          editorContainerRef.current.appendChild(wrapper);

          quillInstanceRef.current = new Quill(editorDiv, {
            theme: 'snow',
            modules: {
              toolbar: toolbarContainer,
            },
          });

          quillInstanceRef.current.on('text-change', () => {
            const html = editorDiv.innerHTML;
            setDetailEditorValue(html);
            detailForm.setFieldsValue({ content: html });
          });
        }

        if (quillInstanceRef.current) {
          const quill = quillInstanceRef.current;
          const html = detailEditorValue || '';
          const delta = quill.clipboard.convert(html);
          quill.setContents(delta);
          quill.setSelection(quill.getLength(), 0);
        }
      }
    } else {
      if (quillInstanceRef.current) {
        quillInstanceRef.current.off('text-change');
        quillInstanceRef.current = null;
      }
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = '';
      }
    }
  }, [detailModalVisible, detailEditorValue, detailForm, t]);

  const columns = [
    {
      title: t('news.columns.id'),
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: t('news.columns.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 110,
      render: (enabled: number, record: NewsItem) => (
        <Switch
          checked={enabled === 1}
          onChange={() => handleToggleEnabled(record.id, enabled)}
          checkedChildren={t('news.status.enabled')}
          unCheckedChildren={t('news.status.disabled')}
        />
      )
    },
    {
      title: t('news.columns.title'),
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
      render: (value: string) => {
        const text = value || '-';
        return (
          <Tooltip title={text} placement="topLeft">
            <Text ellipsis style={{ maxWidth: 200, display: 'block' }}>
              {text}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: t('news.columns.thumbnail'),
      dataIndex: 'titleImg01',
      key: 'titleImg01',
      width: 120,
      render: (url: string) => url ? (
        <Image
          src={url}
          alt={t('news.columns.thumbnail')}
          width={60}
          height={60}
          style={{ objectFit: 'cover' }}
        />
      ) : '-'
    },
    {
      title: t('news.columns.publishedAt'),
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 160,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: t('news.columns.urlPath'),
      dataIndex: 'urlPath',
      key: 'urlPath',
      width: 220,
      ellipsis: true,
      render: (value: string) => {
        const text = value || '-';
        return (
          <Tooltip title={text} placement="topLeft">
            <Text ellipsis style={{ maxWidth: 200, display: 'block' }}>
              {text}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: t('news.columns.actions'),
      key: 'action',
      width: 220,
      render: (_: any, record: NewsItem) => (
        <Space size={8} style={{ whiteSpace: 'nowrap' }}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {t('common.details')}
          </Button>
          <Popconfirm
            title={t('news.confirm.delete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title={t('news.title')}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {t('news.actions.add')}
          </Button>
          <Button
            danger
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDelete}
          >
            {t('news.actions.batchDeleteWithCount', { count: selectedRowKeys.length })}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchContents}
            loading={loading}
          >
            {t('common.refresh')}
          </Button>
        </Space>

        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t('news.filters.searchTitlePlaceholder')}
            prefix={<SearchOutlined />}
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            onPressEnter={fetchContents}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder={t('news.filters.statusPlaceholder')}
            value={enabledFilter}
            onChange={setEnabledFilter}
            allowClear
            style={{ width: 120 }}
          >
            <Option value={1}>{t('news.status.enabled')}</Option>
            <Option value={0}>{t('news.status.disabled')}</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchContents}>
            {t('common.search')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={contents}
          loading={loading}
          rowKey="id"
          tableLayout="fixed"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('common.totalItems', { total }),
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingContent ? t('news.modals.editTitle') : t('news.modals.addTitle')}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setThumbnailPreview(null);
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ appId, enabled: 1, type: 2 }}
        >
          <Form.Item name="appId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label={t('news.form.fields.title')}
            name="title"
            rules={[{ required: true, message: t('news.form.placeholders.title') }]}
          >
            <Input placeholder={t('news.form.placeholders.title')} />
          </Form.Item>
          <Form.Item
            label={t('news.form.fields.subtitle')}
            name="subtitle"
          >
            <Input placeholder={t('news.form.placeholders.subtitle')} />
          </Form.Item>
          <Form.Item
            label={t('news.form.fields.author')}
            name="author"
          >
            <Input placeholder={t('news.form.placeholders.author')} />
          </Form.Item>
          <Form.Item
            label={t('news.form.fields.alias')}
            name="alias"
          >
            <Input placeholder={t('news.form.placeholders.alias')} />
          </Form.Item>
          <Form.Item
            label={t('news.form.fields.thumbnail')}
            name="titleImg01"
          >
            <Space direction="vertical">
              <Upload
                beforeUpload={handleImageUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button loading={uploading} icon={<PlusOutlined />}>
                  {t('news.upload.button')}
                </Button>
              </Upload>
              {thumbnailPreview && (
                <Image
                  src={thumbnailPreview}
                  alt={t('news.form.fields.thumbnail')}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                  fallback=""
                />
              )}
            </Space>
          </Form.Item>
          <Form.Item
            label={t('news.form.fields.status')}
            name="enabled"
          >
            <Select>
              <Option value={1}>{t('news.status.enabled')}</Option>
              <Option value={0}>{t('news.status.disabled')}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 内容详情编辑模态框 */}
      <Modal
        title={t('news.modals.detailTitle')}
        open={detailModalVisible}
        onOk={handleSaveDetail}
        onCancel={() => {
          setDetailModalVisible(false);
          detailForm.resetFields();
          setDetailEditorValue('');
        }}
        confirmLoading={loading}
        width={800}
      >
        <Form form={detailForm} layout="vertical">
          <Form.Item
            label={t('news.form.fields.content')}
            required
            validateStatus={!detailEditorValue ? 'error' : undefined}
            help={!detailEditorValue ? t('news.detail.placeholder') : undefined}
          >
            <div ref={editorContainerRef} style={{ minHeight: 300 }} />
          </Form.Item>
          <Form.Item name="content" rules={[{ required: true, message: t('news.detail.placeholder') }]} style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewsManagement;

