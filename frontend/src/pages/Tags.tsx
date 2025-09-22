import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
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
  SearchOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';
import { Tag as TagType, CreateTagRequest } from '../types';
import dayjs from 'dayjs';

const Tags: React.FC = () => {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTags();
  }, [pagination.current, pagination.pageSize, searchText]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
      };
      
      const response = await apiService.getTags(params);
      if (response.success) {
        setTags(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
        }));
      }
    } catch (error) {
      message.error('获取标签列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination: any) => {
    setPagination(pagination);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name,
      color: tag.color,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await apiService.deleteTag(id);
      if (response.success) {
        message.success('删除成功');
        fetchTags();
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
      const tagData: CreateTagRequest = {
        ...values,
      };

      if (editingTag) {
        const response = await apiService.updateTag(editingTag.id, tagData);
        if (response.success) {
          message.success('更新成功');
          setModalVisible(false);
          setEditingTag(null);
          form.resetFields();
          fetchTags();
        } else {
          message.error(response.error || '更新失败');
        }
      } else {
        const response = await apiService.createTag(tagData);
        if (response.success) {
          message.success('创建成功');
          setModalVisible(false);
          form.resetFields();
          fetchTags();
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
    setEditingTag(null);
    form.resetFields();
  };

  const columns = [
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TagType) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <Space>
          <div 
            style={{ 
              width: 20, 
              height: 20, 
              backgroundColor: color || '#1890ff',
              borderRadius: 4,
              border: '1px solid #d9d9d9'
            }} 
          />
          {color || '#1890ff'}
        </Space>
      ),
    },
    {
      title: '文章数量',
      dataIndex: ['_count', 'posts'],
      key: 'posts',
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
      render: (_, record: TagType) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个标签吗？"
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
        <h1>标签管理</h1>
        <p style={{ color: '#666', margin: 0 }}>管理文章标签</p>
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索标签名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={() => handleSearch(searchText)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              新建标签
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={tags}
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
        title={editingTag ? '编辑标签' : '新建标签'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="标签名称"
            rules={[
              { required: true, message: '请输入标签名称' },
              { min: 1, max: 20, message: '标签名称长度必须在1-20个字符之间' }
            ]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>

          <Form.Item
            name="color"
            label="颜色"
            rules={[
              { pattern: /^#[0-9A-Fa-f]{6}$/, message: '请输入有效的十六进制颜色值' }
            ]}
          >
            <Input 
              placeholder="#1890ff" 
              addonBefore={
                <div 
                  style={{ 
                    width: 20, 
                    height: 20, 
                    backgroundColor: form.getFieldValue('color') || '#1890ff',
                    borderRadius: 4,
                    border: '1px solid #d9d9d9'
                  }} 
                />
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tags;
