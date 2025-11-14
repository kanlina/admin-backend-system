import React from 'react';
import { Layout, Avatar, Dropdown, Button, Space } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  SettingOutlined, 
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  isMobile?: boolean;
  onMenuClick?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isMobile = false,
  onMenuClick,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
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
      case '/data-monitor/partner-center':
        return t('navigation.partnerCenter');
      case '/data-monitor/partner-center/api-partners':
        return t('navigation.apiPartners');
      case '/users':
        return t('navigation.userManagement');
      case '/analytics':
        return t('navigation.analytics');
      case '/settings':
        return t('navigation.systemSettings');
      case '/push-center/config':
        return t('navigation.pushConfig');
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
      padding: isMobile ? '0 12px' : '0 24px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      height: '64px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isMobile && onToggleSidebar && (
          <Button
            type="text"
            icon={isSidebarCollapsed ? <MenuUnfoldOutlined style={{ fontSize: '18px' }} /> : <MenuFoldOutlined style={{ fontSize: '18px' }} />}
            onClick={onToggleSidebar}
          />
        )}
        {/* 移动端菜单按钮 */}
        {isMobile && onMenuClick && (
          <Button 
            type="text" 
            icon={<MenuOutlined style={{ fontSize: '18px' }} />}
            onClick={onMenuClick}
          />
        )}
        
        <div style={{ 
          fontSize: isMobile ? '16px' : '20px', 
          fontWeight: 'bold', 
          color: '#1890ff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: isMobile ? '150px' : 'none'
        }}>
          {getPageTitle()}
        </div>
      </div>
      
      <Space size={isMobile ? 'small' : 'middle'}>
        <LanguageSwitcher />
        {!isMobile && (
          <span style={{ color: '#666' }}>
            {t('common.welcome')}，{user?.username}
          </span>
        )}
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
