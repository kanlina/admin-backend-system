import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag } from 'antd';
import { 
  UserOutlined, 
  TagsOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { User } from '../types';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
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
        const color = role === 'ADMIN' ? 'red' : 'green';
        const text = role === 'ADMIN' ? t('userManagement.role.admin') : t('userManagement.role.user');
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
