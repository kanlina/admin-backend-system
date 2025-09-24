import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Tag, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface Partner {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  contact: string;
  email: string;
  createdAt: string;
}

const PartnerCenter: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Partner[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟数据
      const mockData: Partner[] = [
        {
          id: '1',
          name: 'ABC银行',
          type: 'bank',
          status: 'active',
          contact: '张三',
          email: 'zhangsan@abc.com',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'XYZ金融',
          type: 'finance',
          status: 'active',
          contact: '李四',
          email: 'lisi@xyz.com',
          createdAt: '2024-02-20'
        },
        {
          id: '3',
          name: 'DEF科技',
          type: 'tech',
          status: 'inactive',
          contact: '王五',
          email: 'wangwu@def.com',
          createdAt: '2024-03-10'
        }
      ];

      setData(mockData);
      setPagination(prev => ({
        ...prev,
        total: mockData.length,
        totalPages: Math.ceil(mockData.length / pagination.pageSize)
      }));
    } catch (error) {
      console.error('获取合作伙伴数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPartner(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Partner) => {
    setEditingPartner(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个合作伙伴吗？',
      onOk: () => {
        setData(prev => prev.filter(item => item.id !== id));
        message.success('删除成功');
      }
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingPartner) {
        // 编辑
        setData(prev => prev.map(item => 
          item.id === editingPartner.id ? { ...item, ...values } : item
        ));
        message.success('更新成功');
      } else {
        // 新增
        const newPartner: Partner = {
          id: Date.now().toString(),
          ...values,
          createdAt: new Date().toISOString().split('T')[0]
        };
        setData(prev => [newPartner, ...prev]);
        message.success('添加成功');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      render: (_: any, __: any, index: number) => 
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '合作伙伴名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: { [key: string]: { color: string; text: string } } = {
          bank: { color: 'blue', text: '银行' },
          finance: { color: 'green', text: '金融' },
          tech: { color: 'orange', text: '科技' }
        };
        const config = typeMap[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Partner) => (
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
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加合作伙伴
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10
              }));
            },
          }}
        />
      </Card>

      <Modal
        title={editingPartner ? '编辑合作伙伴' : '添加合作伙伴'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="合作伙伴名称"
            rules={[{ required: true, message: '请输入合作伙伴名称' }]}
          >
            <Input placeholder="请输入合作伙伴名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="请选择类型">
              <Select.Option value="bank">银行</Select.Option>
              <Select.Option value="finance">金融</Select.Option>
              <Select.Option value="tech">科技</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">非活跃</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="contact"
            label="联系人"
            rules={[{ required: true, message: '请输入联系人' }]}
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartnerCenter;

