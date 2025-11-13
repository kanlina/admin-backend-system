import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Modal,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
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
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

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
  const { t } = useTranslation();
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
    setModalVisible(true);
  };

  const handleEdit = async (record: Content) => {
    try {
      setLoading(true);
      const response = await apiService.getContentById(record.id.toString());
      if (response.success) {
        setEditingContent(response.data);
        form.setFieldsValue(response.data);
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
          fetchContents();
        }
      } else {
        const response = await apiService.createContent(values);
        if (response.success) {
          message.success('创建成功');
          setModalVisible(false);
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
        
        // 这里需要调用上传接口，暂时使用 base64
        // 实际应该调用后端的图片上传接口
        const imageUrl = base64;
        form.setFieldsValue({ titleImg01: imageUrl });
        setUploading(false);
        message.success('图片上传成功');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      message.error('图片上传失败');
    }
    return false; // 阻止默认上传
  };

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
              {form.getFieldValue('titleImg01') && (
                <Image
                  src={form.getFieldValue('titleImg01')}
                  alt="预览"
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
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
        }}
        confirmLoading={loading}
        width={800}
      >
        <Form form={detailForm} layout="vertical">
          <Form.Item
            label="内容"
            name="content"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              rows={15}
              placeholder="请输入内容（支持HTML）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Content;

