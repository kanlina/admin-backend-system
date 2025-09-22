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
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Post, CreatePostRequest } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const Posts: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tags, setTags] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPosts();
    fetchTags();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        status: statusFilter || undefined,
      };
      
      const response = await apiService.getPosts(params);
      if (response.success) {
        setPosts(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
        }));
      }
    } catch (error) {
      message.error('获取文章列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await apiService.getAllTags();
      if (response.success) {
        setTags(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleTableChange = (pagination: any) => {
    setPagination(pagination);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    form.setFieldsValue({
      ...post,
      tagIds: post.tags.map(t => t.tag.id),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await apiService.deletePost(id);
      if (response.success) {
        message.success('删除成功');
        fetchPosts();
      } else {
        message.error(response.error || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const postData: CreatePostRequest = {
        ...values,
        tagIds: values.tagIds || [],
      };

      if (editingPost) {
        const response = await apiService.updatePost(editingPost.id, postData);
        if (response.success) {
          message.success('更新成功');
          setModalVisible(false);
          setEditingPost(null);
          form.resetFields();
          fetchPosts();
        } else {
          message.error(response.error || '更新失败');
        }
      } else {
        const response = await apiService.createPost(postData);
        if (response.success) {
          message.success('创建成功');
          setModalVisible(false);
          form.resetFields();
          fetchPosts();
        } else {
          message.error(response.error || '创建失败');
        }
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingPost(null);
    form.resetFields();
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Post) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/posts/${record.id}`)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'PUBLISHED' ? 'green' : status === 'DRAFT' ? 'orange' : 'red';
        const text = status === 'PUBLISHED' ? '已发布' : status === 'DRAFT' ? '草稿' : '已归档';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '作者',
      dataIndex: ['author', 'username'],
      key: 'author',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: any[]) => (
        <Space wrap>
          {tags.slice(0, 2).map(tag => (
            <Tag key={tag.tag.id} color={tag.tag.color}>
              {tag.tag.name}
            </Tag>
          ))}
          {tags.length > 2 && <Tag>+{tags.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: '浏览量',
      dataIndex: 'views',
      key: 'views',
      render: (views: number) => (
        <Space>
          <EyeOutlined />
          {views}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: Post) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这篇文章吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1>文章管理</h1>
        <p style={{ color: '#666', margin: 0 }}>管理所有文章内容</p>
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索文章标题或内容"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={() => handleSearch(searchText)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="状态筛选"
              value={statusFilter}
              onChange={handleStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="DRAFT">草稿</Option>
              <Option value="PUBLISHED">已发布</Option>
              <Option value="ARCHIVED">已归档</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              新建文章
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={posts}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingPost ? '编辑文章' : '新建文章'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'DRAFT',
          }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入文章标题' }]}
          >
            <Input placeholder="请输入文章标题" />
          </Form.Item>

          <Form.Item
            name="summary"
            label="摘要"
          >
            <TextArea rows={3} placeholder="请输入文章摘要" />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入文章内容' }]}
          >
            <TextArea rows={8} placeholder="请输入文章内容" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择文章状态' }]}
              >
                <Select>
                  <Option value="DRAFT">草稿</Option>
                  <Option value="PUBLISHED">已发布</Option>
                  <Option value="ARCHIVED">已归档</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tagIds"
                label="标签"
              >
                <Select
                  mode="multiple"
                  placeholder="选择标签"
                  allowClear
                >
                  {tags.map(tag => (
                    <Option key={tag.id} value={tag.id}>
                      {tag.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Posts;
