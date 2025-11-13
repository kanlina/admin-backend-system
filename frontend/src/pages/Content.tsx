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
  Upload
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

const { Option } = Select;

interface Content {
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

const Content: React.FC = () => {
  const [contents, setContents] = useState<Content[]>([]);
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
  const [editingContent, setEditingContent] = useState<Content | null>(null);
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
      message.error('获取内容列表失败');
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

  const handleEdit = async (record: Content) => {
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
      message.error('获取内容详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiService.deleteContent(id.toString());
      if (response.success) {
        message.success('删除成功');
        fetchContents();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的内容');
      return;
    }

    try {
      const response = await apiService.deleteContents(selectedRowKeys.map(key => key.toString()));
      if (response.success) {
        message.success('批量删除成功');
        setSelectedRowKeys([]);
        fetchContents();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '批量删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingContent) {
        const response = await apiService.updateContent(editingContent.id.toString(), values);
        if (response.success) {
          message.success('更新成功');
          setModalVisible(false);
          setThumbnailPreview(null);
          fetchContents();
        }
      } else {
        const response = await apiService.createContent(values);
        if (response.success) {
          message.success('创建成功');
          setModalVisible(false);
          setThumbnailPreview(null);
          fetchContents();
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: number, enabled: number) => {
    try {
      const newEnabled = enabled === 1 ? 0 : 1;
      const response = await apiService.toggleContentEnabled(id.toString(), newEnabled);
      if (response.success) {
        message.success('状态更新成功');
        fetchContents();
      }
    } catch (error) {
      message.error('状态更新失败');
      fetchContents();
    }
  };

  const handleViewDetail = async (record: Content) => {
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
      message.error('获取内容详情失败');
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
        message.success('保存成功');
        setDetailModalVisible(false);
        detailForm.resetFields();
        setDetailEditorValue('');
        fetchContents();
      }
    } catch (error) {
      message.error('保存失败');
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
        throw new Error(response.message || '上传失败');
      }

      const imageUrl = response.data?.url;
      form.setFieldsValue({ titleImg01: imageUrl });
      setThumbnailPreview(imageUrl || null);
      message.success('图片上传成功');
    } catch (error: any) {
      message.error(error?.message || '图片上传失败');
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
  }, [detailModalVisible, detailEditorValue, detailForm]);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: number, record: Content) => (
        <Switch
          checked={enabled === 1}
          onChange={() => handleToggleEnabled(record.id, enabled)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '缩略图',
      dataIndex: 'titleImg01',
      key: 'titleImg01',
      width: 100,
      render: (url: string) => url ? (
        <Image
          src={url}
          alt="缩略图"
          width={60}
          height={60}
          style={{ objectFit: 'cover' }}
        />
      ) : '-'
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 180,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: 'URL路径',
      dataIndex: 'urlPath',
      key: 'urlPath',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Content) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Popconfirm
            title="确定要删除这条内容吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增内容
          </Button>
          <Button
            danger
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDelete}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchContents}
            loading={loading}
          >
            刷新
          </Button>
        </Space>

        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索标题"
            prefix={<SearchOutlined />}
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            onPressEnter={fetchContents}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            value={enabledFilter}
            onChange={setEnabledFilter}
            allowClear
            style={{ width: 120 }}
          >
            <Option value={1}>启用</Option>
            <Option value={0}>禁用</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchContents}>
            查询
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={contents}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingContent ? '编辑内容' : '新增内容'}
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
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item
            label="副标题"
            name="subtitle"
          >
            <Input placeholder="请输入副标题" />
          </Form.Item>
          <Form.Item
            label="作者"
            name="author"
          >
            <Input placeholder="请输入作者" />
          </Form.Item>
          <Form.Item
            label="别名"
            name="alias"
          >
            <Input placeholder="请输入别名（可选）" />
          </Form.Item>
          <Form.Item
            label="缩略图"
            name="titleImg01"
          >
            <Space direction="vertical">
              <Upload
                beforeUpload={handleImageUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button loading={uploading} icon={<PlusOutlined />}>
                  上传图片
                </Button>
              </Upload>
              {thumbnailPreview && (
                <Image
                  src={thumbnailPreview}
                  alt="预览"
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                  fallback=""
                />
              )}
            </Space>
          </Form.Item>
          <Form.Item
            label="状态"
            name="enabled"
          >
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 内容详情编辑模态框 */}
      <Modal
        title="编辑内容详情"
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
            label="内容"
            required
            validateStatus={!detailEditorValue ? 'error' : undefined}
            help={!detailEditorValue ? '请输入内容' : undefined}
          >
            <div ref={editorContainerRef} style={{ minHeight: 300 }} />
          </Form.Item>
          <Form.Item name="content" rules={[{ required: true, message: '请输入内容' }]} style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Content;

