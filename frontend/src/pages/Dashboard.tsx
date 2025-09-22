import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag } from 'antd';
import { 
  UserOutlined, 
  TagsOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';
import type { User } from '../types';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: { totalUsers: 0, activeUsers: 0, adminUsers: 0 }
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [userStatsRes, usersRes] = await Promise.all([
        apiService.getUserStats(),
        apiService.getUsers({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
      ]);

      if (userStatsRes.success) setStats(prev => ({ ...prev, users: userStatsRes.data }));
      if (usersRes.success) setRecentUsers(usersRes.data || []);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const color = role === 'ADMIN' ? 'red' : role === 'MODERATOR' ? 'blue' : 'green';
        const text = role === 'ADMIN' ? '管理员' : role === 'MODERATOR' ? '版主' : '用户';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活跃' : '禁用'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1>仪表盘</h1>
        <p style={{ color: '#666', margin: 0 }}>欢迎使用管理后台，这里是系统概览</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.users.totalUsers}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={stats.users.activeUsers}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="管理员数量"
              value={stats.users.adminUsers}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="标签数量"
              value="0"
              prefix={<TagsOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近用户 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="最近用户">
            <Table
              columns={userColumns}
              dataSource={recentUsers}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
