import React from 'react';
import { Layout, Menu } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  TagsOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/tags',
      icon: <TagsOutlined />,
      label: '标签管理',
    },
    ...(user?.role === 'ADMIN' ? [
      {
        key: '/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
      {
        key: '/analytics',
        icon: <BarChartOutlined />,
        label: '数据分析',
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: '系统设置',
      },
    ] : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider 
      width={200} 
      style={{ 
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ height: '100%', borderRight: 0 }}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;
