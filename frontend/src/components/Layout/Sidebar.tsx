import React from 'react';
import { Layout, Menu } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  BarChartOutlined,
  SettingOutlined,
  MonitorOutlined,
  SwapOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ToolOutlined
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
      key: 'data-monitor',
      icon: <MonitorOutlined />,
      label: '数据监控',
      children: [
        {
          key: '/data-monitor/internal-transfer',
          icon: <SwapOutlined />,
          label: '内转数据',
        },
        {
          key: '/data-monitor/adjust-data',
          icon: <ToolOutlined />,
          label: 'Adjust数据',
        },
        {
          key: '/data-monitor/page-data',
          icon: <FileTextOutlined />,
          label: '页面数据',
        },
        {
          key: '/data-monitor/post-loan',
          icon: <CreditCardOutlined />,
          label: '贷后数据',
        },
      ],
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
