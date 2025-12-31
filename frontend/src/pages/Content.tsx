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
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { Text } = Typography;

const TIMEOUT_MS = 15000;

const withTimeout = async <T,>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const isTimeoutError = (error: any) => {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error?.message;
  if (typeof message !== 'string') return false;
  return message.toLowerCase().includes('timeout');
};

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
  const navigate = useNavigate();
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
  const isEditorInitializedRef = useRef(false);
  const initialContentRef = useRef<string>('');
  const [statusLoadingIds, setStatusLoadingIds] = useState<Set<number>>(new Set());

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

      const response = await withTimeout(apiService.getContents(params));
      if (response.success) {
        setContents(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0
        }));
      } else {
        message.error(t('news.messages.loadError'));
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        message.error(t('news.messages.loadTimeout'));
      } else {
        message.error(t('news.messages.loadError'));
      }
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
    form.setFieldsValue({ appId, enabled: 2 });
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
      setStatusLoadingIds(prev => new Set(prev).add(id));
      const targetEnabled = enabled === 2 ? 1 : 2;
      const response = await withTimeout(apiService.toggleContentEnabled(id.toString(), targetEnabled));
      if (response.success) {
        message.success(t('news.messages.statusUpdateSuccess'));
        fetchContents();
      } else {
        message.error(t('news.messages.statusUpdateError'));
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        message.error(t('news.messages.statusUpdateTimeout'));
      } else {
        message.error(t('news.messages.statusUpdateError'));
      }
    } finally {
      setStatusLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setLoading(false);
    }
  };

  const handleViewDetail = async (record: NewsItem) => {
    try {
      setLoading(true);
      const response = await apiService.getContentById(record.id.toString());
      if (response.success) {
        setEditingContent(response.data);
        const originalHtml = response.data.content || '';
        detailForm.setFieldsValue({ content: originalHtml });
        setDetailEditorValue(originalHtml);
        // 设置初始内容到 ref，用于编辑器初始化
        initialContentRef.current = originalHtml;
        isEditorInitializedRef.current = false;
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error(t('news.messages.detailLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (record: NewsItem) => {
    navigate(`/news/preview/${record.id}`);
  };


  // 清理HTML中的表单元素，将表单元素转换为文本内容
  const cleanHtmlFromFormElements = (html: string): string => {
    if (!html) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 如果内容在ql-editor中，先提取其内容
    const qlEditor = tempDiv.querySelector('.ql-editor');
    if (qlEditor) {
      tempDiv.innerHTML = qlEditor.innerHTML;
    }
    
    // 处理input元素：替换为文本节点，显示其value
    tempDiv.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input[type="number"], input:not([type])').forEach(input => {
      const value = (input as HTMLInputElement).value || '';
      if (value) {
        const textNode = document.createTextNode(value);
        input.parentNode?.replaceChild(textNode, input);
      } else {
        input.remove();
      }
    });
    
    // 处理textarea元素：替换为文本节点，显示其内容
    tempDiv.querySelectorAll('textarea').forEach(textarea => {
      const content = textarea.textContent || '';
      if (content) {
        const textNode = document.createTextNode(content);
        textarea.parentNode?.replaceChild(textNode, textarea);
      } else {
        textarea.remove();
      }
    });
    
    // 处理select元素：替换为文本节点，显示选中的option文本
    tempDiv.querySelectorAll('select').forEach(select => {
      const selectedOption = (select as HTMLSelectElement).options[(select as HTMLSelectElement).selectedIndex];
      const text = selectedOption?.textContent || '';
      if (text) {
        const textNode = document.createTextNode(text);
        select.parentNode?.replaceChild(textNode, select);
      } else {
        select.remove();
      }
    });
    
    // 移除button和form元素
    tempDiv.querySelectorAll('button, form').forEach(el => el.remove());
    
    // 移除其他类型的input（checkbox、radio等）
    tempDiv.querySelectorAll('input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"], input[type="hidden"]').forEach(input => {
      input.remove();
    });
    
    return tempDiv.innerHTML;
  };

  const handleSaveDetail = async () => {
    try {
      const values = await detailForm.validateFields();
      if (!editingContent) return;

      setLoading(true);
      // 获取Quill编辑器当前的内容
      let contentToSave = values.content || '';
      
      // 保存前再次清理HTML，确保不包含任何表单元素，只保存纯文本内容
      contentToSave = cleanHtmlFromFormElements(contentToSave);
      
      const response = await apiService.updateContentDetail(editingContent.id.toString(), contentToSave);
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

          // 保存光标位置
          let savedSelection: any = null;
          quillInstanceRef.current.on('selection-change', (range: any) => {
            if (range) {
              savedSelection = range;
            }
          });

          quillInstanceRef.current.on('text-change', () => {
            const html = editorDiv.innerHTML;
            setDetailEditorValue(html);
            detailForm.setFieldsValue({ content: html });
          });

          // 只在初始化时设置内容
          if (!isEditorInitializedRef.current && initialContentRef.current) {
            let html = initialContentRef.current || '';
            html = cleanHtmlFromFormElements(html);
            const delta = quillInstanceRef.current.clipboard.convert(html);
            quillInstanceRef.current.setContents(delta);
            // 设置光标到末尾
            quillInstanceRef.current.setSelection(quillInstanceRef.current.getLength(), 0);
            isEditorInitializedRef.current = true;
          }
        }
      }
    } else {
      // 模态框关闭时重置
      if (quillInstanceRef.current) {
        quillInstanceRef.current.off('text-change');
        quillInstanceRef.current.off('selection-change');
        quillInstanceRef.current = null;
      }
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = '';
      }
      isEditorInitializedRef.current = false;
      initialContentRef.current = '';
    }
  }, [detailModalVisible, detailForm]);

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
          checked={enabled === 2}
          loading={statusLoadingIds.has(record.id)}
          disabled={statusLoadingIds.has(record.id)}
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
        <Space size={4} style={{ whiteSpace: 'nowrap' }}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ padding: '0 4px' }}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record)}
            style={{ padding: '0 4px' }}
          >
            {t('common.details')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
            style={{ padding: '0 4px' }}
          >
            {t('common.preview')}
          </Button>
          <Popconfirm
            title={t('news.confirm.delete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        extra={
          <Space wrap>
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
        }
      >
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
          initialValues={{ appId, enabled: 2, type: 2 }}
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
            getValueFromEvent={(value) => value}
          >
            <Select>
              <Option value={2}>{t('news.status.enabled')}</Option>
              <Option value={1}>{t('news.status.disabled')}</Option>
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
          <Form.Item name="content" rules={[{ required: true, message: t('news.detail.placeholder') }]} hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default NewsManagement;

