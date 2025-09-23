import React from 'react';
import { Layout, Avatar, Dropdown, Button, Space } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // 根据当前路径获取页面标题
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return t('navigation.dashboard');
      case '/data-monitor/internal-transfer':
        return '内转数据';
      case '/data-monitor/adjust-data':
        return t('navigation.adjustData');
      case '/data-monitor/page-data':
        return t('navigation.pageData');
      case '/data-monitor/post-loan':
        return t('navigation.postLoanData');
      case '/users':
        return t('navigation.userManagement');
      case '/analytics':
        return t('navigation.analytics');
      case '/settings':
        return t('navigation.systemSettings');
      default:
        return t('navigation.adminPanel');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('common.profile'),
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('common.settings'),
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 24px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        fontSize: '20px', 
        fontWeight: 'bold', 
        color: '#1890ff' 
      }}>
        {getPageTitle()}
      </div>
      
      <Space>
        <LanguageSwitcher />
        <span style={{ color: '#666' }}>
          {t('common.welcome')}，{user?.username}
        </span>
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          arrow
        >
          <Button type="text" style={{ padding: 0 }}>
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              src={user?.avatar}
            />
          </Button>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
