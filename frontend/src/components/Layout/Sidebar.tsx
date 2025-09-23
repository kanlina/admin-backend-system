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
import { useTranslation } from 'react-i18next';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
    },
    {
      key: 'data-monitor',
      icon: <MonitorOutlined />,
      label: t('navigation.dataMonitor'),
      children: [
        {
          key: '/data-monitor/internal-transfer',
          icon: <SwapOutlined />,
          label: t('navigation.internalTransfer'),
        },
        {
          key: '/data-monitor/adjust-data',
          icon: <ToolOutlined />,
          label: t('navigation.adjustData'),
        },
        {
          key: '/data-monitor/page-data',
          icon: <FileTextOutlined />,
          label: t('navigation.pageData'),
        },
        {
          key: '/data-monitor/post-loan',
          icon: <CreditCardOutlined />,
          label: t('navigation.postLoanData'),
        },
      ],
    },
    ...(user?.role === 'ADMIN' ? [
      {
        key: '/users',
        icon: <UserOutlined />,
        label: t('navigation.userManagement'),
      },
      {
        key: '/analytics',
        icon: <BarChartOutlined />,
        label: t('navigation.analytics'),
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: t('navigation.systemSettings'),
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
