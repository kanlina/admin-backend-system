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
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  UserOutlined,
  PlusOutlined,
  ReloadOutlined,
  KeyOutlined,
  MailOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { User, UpdateUserRequest } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [passwordSubmitLoading, setPasswordSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
      };
      
      const response = await apiService.getUsers(params);
      if (response.success) {
        let filteredUsers = response.data || [];
        
        // 客户端过滤角色和状态
        if (roleFilter) {
          filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }
        if (statusFilter) {
          filteredUsers = filteredUsers.filter(user => 
            statusFilter === 'active' ? user.isActive : !user.isActive
          );
        }
        
        setUsers(filteredUsers);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
        }));
      }
    } catch (error) {
      message.error('获取用户列表失败');
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

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'USER',
      isActive: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setModalVisible(true);
  };

  const handleResetPassword = (user: User) => {
    setResettingUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await apiService.deleteUser(id);
      if (response.success) {
        message.success('删除成功');
        fetchUsers();
      } else {
        message.error(response.error || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    // 如果正在提交，禁止重复提交
    if (submitLoading) {
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      
      if (editingUser) {
        // 更新用户
        const userData: UpdateUserRequest = {
          ...values,
        };
        const response = await apiService.updateUser(editingUser.id, userData);
        if (response.success) {
          message.success('更新成功');
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
          fetchUsers();
        } else {
          message.error(response.error || '更新失败');
        }
      } else {
        // 创建用户，如果没有提供密码，使用默认密码123456
        const response = await apiService.createUser({
          username: values.username,
          email: values.email,
          password: values.password || '123456',
          role: values.role,
        });
        if (response.success) {
          message.success('创建成功');
          setModalVisible(false);
          form.resetFields();
          fetchUsers();
        } else {
          message.error(response.error || response.message || '创建失败');
        }
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.response?.data?.error || error?.response?.data?.message || '操作失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    // 如果正在提交，禁止重复提交
    if (passwordSubmitLoading) {
      return;
    }

    try {
      const values = await passwordForm.validateFields();
      if (!resettingUser) return;
      
      setPasswordSubmitLoading(true);
      const response = await apiService.resetPassword(resettingUser.id, values.password);
      if (response.success) {
        message.success('密码重置成功');
        setPasswordModalVisible(false);
        setResettingUser(null);
        passwordForm.resetFields();
      } else {
        message.error(response.error || response.message || '密码重置失败');
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.response?.data?.error || error?.response?.data?.message || '密码重置失败');
    } finally {
      setPasswordSubmitLoading(false);
    }
  };

  const handleModalCancel = () => {
    // 如果正在提交，禁止关闭
    if (submitLoading) {
      return;
    }
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
    setSubmitLoading(false);
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (text: string) => (
        <Space size="small">
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('userManagement.table.role'),
      dataIndex: 'role',
      key: 'role',
      width: 100,
      align: 'center' as const,
      render: (role: string) => {
        const color = role === 'ADMIN' ? 'red' : 'green';
        const text = role === 'ADMIN' ? t('userManagement.role.admin') : t('userManagement.role.user');
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center' as const,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活跃' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ padding: 0 }}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
            style={{ padding: 0 }}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger 
              size="small"
              icon={<DeleteOutlined />}
              style={{ padding: 0 }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              创建用户
            </Button>
          </Space>
        }
      >
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="搜索" style={{ marginBottom: 0 }}>
              <Input
                placeholder="搜索用户名或邮箱"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => handleSearch(searchText)}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="角色" style={{ marginBottom: 0 }}>
              <Select
                placeholder="请选择角色"
                value={roleFilter}
                onChange={handleRoleFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="ADMIN">{t('userManagement.role.admin')}</Option>
                <Option value="USER">{t('userManagement.role.user')}</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="状态" style={{ marginBottom: 0 }}>
              <Select
                placeholder="请选择状态"
                value={statusFilter}
                onChange={handleStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="active">活跃</Option>
                <Option value="inactive">禁用</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => t('common.pageRangeWithTotal', { start: range[0], end: range[1], total }),
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 930 }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
        width={600}
        confirmLoading={submitLoading}
        maskClosable={!submitLoading}
        closable={!submitLoading}
        okButtonProps={{ loading: submitLoading, disabled: submitLoading }}
        cancelButtonProps={{ disabled: submitLoading }}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={submitLoading}
        >
          <Form.Item
            name="username"
            label="用户名"
            required
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度必须在3-20个字符之间' }
            ]}
            tooltip="用户登录时使用的唯一标识，3-20个字符"
          >
            <Input 
              placeholder="请输入用户名（3-20个字符）" 
              disabled={!!editingUser}
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            required
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
            tooltip="用户登录邮箱，用于接收系统通知"
          >
            <Input 
              placeholder="请输入邮箱地址（例如：user@example.com）" 
              prefix={<MailOutlined />}
            />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { min: 6, message: '密码长度至少为6个字符' }
              ]}
              initialValue="123456"
              tooltip="留空则使用默认密码：123456"
              extra="留空则使用默认密码：123456"
            >
              <Input.Password 
                placeholder="请输入密码（至少6个字符，留空使用默认密码123456）" 
                prefix={<LockOutlined />}
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                required
                rules={[{ required: true, message: '请选择用户角色' }]}
                tooltip="选择用户的权限角色：管理员拥有所有权限，用户仅有查看权限"
              >
                <Select placeholder="请选择用户角色">
                  <Option value="USER">{t('userManagement.role.user')} - 普通用户</Option>
                  <Option value="ADMIN">{t('userManagement.role.admin')} - 管理员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="状态"
                required
                rules={[{ required: true, message: '请选择用户状态' }]}
                tooltip="活跃：用户可以正常登录使用；禁用：用户无法登录"
              >
                <Select placeholder="请选择用户状态">
                  <Option value={true}>活跃 - 可正常使用</Option>
                  <Option value={false}>禁用 - 无法登录</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onOk={handlePasswordReset}
        onCancel={() => {
          if (passwordSubmitLoading) {
            return;
          }
          setPasswordModalVisible(false);
          setResettingUser(null);
          passwordForm.resetFields();
          setPasswordSubmitLoading(false);
        }}
        okText="确定"
        cancelText="取消"
        confirmLoading={passwordSubmitLoading}
        maskClosable={!passwordSubmitLoading}
        closable={!passwordSubmitLoading}
        okButtonProps={{ loading: passwordSubmitLoading, disabled: passwordSubmitLoading }}
        cancelButtonProps={{ disabled: passwordSubmitLoading }}
      >
        <Form form={passwordForm} layout="vertical" disabled={passwordSubmitLoading}>
          <Form.Item
            name="password"
            label="新密码"
            required
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6个字符' }
            ]}
            tooltip="新密码长度至少为6个字符"
          >
            <Input.Password 
              placeholder="请输入新密码（至少6个字符）" 
              prefix={<LockOutlined />}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            required
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
            tooltip="请再次输入新密码，确保两次输入一致"
          >
            <Input.Password 
              placeholder="请再次输入新密码（确保与上方密码一致）" 
              prefix={<LockOutlined />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
