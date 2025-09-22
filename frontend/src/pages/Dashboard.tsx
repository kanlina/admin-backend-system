import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Space } from 'antd';
import { 
  UserOutlined, 
  FileTextOutlined, 
  TagsOutlined, 
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Post, User } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: { totalUsers: 0, activeUsers: 0, adminUsers: 0 },
    posts: { totalPosts: 0, publishedPosts: 0, totalViews: 0 }
  });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [userStatsRes, postStatsRes, postsRes, usersRes] = await Promise.all([
        apiService.getUserStats(),
        apiService.getPostStats(),
        apiService.getPosts({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        apiService.getUsers({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
      ]);

      if (userStatsRes.success) setStats(prev => ({ ...prev, users: userStatsRes.data }));
      if (postStatsRes.success) setStats(prev => ({ ...prev, posts: postStatsRes.data }));
      if (postsRes.success) setRecentPosts(postsRes.data || []);
      if (usersRes.success) setRecentUsers(usersRes.data || []);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const postColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
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
  ];

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
              title="总文章数"
              value={stats.posts.totalPosts}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总浏览量"
              value={stats.posts.totalViews}
              prefix={<EyeOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近文章和用户 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="最近文章"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/posts/create')}
              >
                新建文章
              </Button>
            }
          >
            <Table
              columns={postColumns}
              dataSource={recentPosts}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
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
