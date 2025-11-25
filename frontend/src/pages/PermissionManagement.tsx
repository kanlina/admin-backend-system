import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 权限定义
const PERMISSIONS = {
  USER_MANAGEMENT: 'user_management',
  PERMISSION_MANAGEMENT: 'permission_management',
  DATA_MONITOR: 'data_monitor',
  PUSH_CENTER: 'push_center',
  PARTNER_CENTER: 'partner_center',
  NEWS_MANAGEMENT: 'news_management',
  SYSTEM_SETTINGS: 'system_settings',
};

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.USER_MANAGEMENT]: '用户管理',
  [PERMISSIONS.PERMISSION_MANAGEMENT]: '权限管理',
  [PERMISSIONS.DATA_MONITOR]: '数据监控',
  [PERMISSIONS.PUSH_CENTER]: '推送中心',
  [PERMISSIONS.PARTNER_CENTER]: '合作伙伴中心',
  [PERMISSIONS.NEWS_MANAGEMENT]: '新闻管理',
  [PERMISSIONS.SYSTEM_SETTINGS]: '系统设置',
};

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const PermissionManagement: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      // 模拟数据，实际应该从API获取
      const mockRoles: Role[] = [
        {
          id: '1',
          name: 'ADMIN',
          description: t('userManagement.role.adminDescription'),
          permissions: Object.values(PERMISSIONS),
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'USER',
          description: t('userManagement.role.userDescription'),
          permissions: [PERMISSIONS.DATA_MONITOR],
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setRoles(mockRoles);
    } catch (error) {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setModalVisible(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // 实际应该调用API删除
      setRoles(roles.filter((r) => r.id !== id));
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        // 更新角色
        setRoles(
          roles.map((r) =>
            r.id === editingRole.id
              ? { ...r, ...values, updatedAt: new Date().toISOString() }
              : r
          )
        );
        message.success('更新成功');
      } else {
        // 创建角色
        const newRole: Role = {
          id: Date.now().toString(),
          ...values,
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRoles([...roles, newRole]);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingRole(null);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingRole(null);
  };

  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record) => (
        <Space size="small">
          <SafetyOutlined />
          <Text strong={record.isSystem}>{name}</Text>
          {record.isSystem && <Tag color="blue">系统角色</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: '权限数量',
      key: 'permissionCount',
      width: 120,
      align: 'center' as const,
      render: (_: any, record) => (
        <Tag color="green">{record.permissions.length} 个权限</Tag>
      ),
    },
    {
      title: '权限列表',
      key: 'permissions',
      width: 300,
      render: (_: any, record) => (
        <Space wrap size="small">
          {record.permissions.slice(0, 3).map((perm) => (
            <Tag key={perm}>
              {PERMISSION_LABELS[perm] || perm}
            </Tag>
          ))}
          {record.permissions.length > 3 && (
            <Tag color="default">+{record.permissions.length - 3}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.isSystem}
            style={{ padding: 0 }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.isSystem}
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={record.isSystem}
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
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ marginBottom: 0 }}>
              权限管理
            </Title>
            <Text type="secondary">管理系统角色和权限分配</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchRoles}>
                刷新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                创建角色
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1080 }}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleModalCancel}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            required
            rules={[
              { required: true, message: '请输入角色名称' },
              { pattern: /^[A-Z_]+$/, message: '角色名称只能包含大写字母和下划线' },
            ]}
            tooltip="角色名称只能包含大写字母和下划线，例如：CUSTOM_ROLE"
          >
            <Input 
              placeholder="请输入角色名称（例如：CUSTOM_ROLE）" 
              disabled={!!editingRole}
              prefix={<SafetyOutlined />}
            />
          </Form.Item>

          <Form.Item 
            name="description" 
            label="描述"
            tooltip="简要描述该角色的用途和权限范围"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入角色描述（例如：自定义角色，拥有数据监控和推送中心权限）" 
            />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="权限"
            required
            rules={[{ required: true, message: '请至少选择一个权限' }]}
            tooltip="选择该角色拥有的权限，可多选"
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[12, 8]}>
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <Col span={12} key={key}>
                    <Checkbox value={key}>{label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionManagement;

