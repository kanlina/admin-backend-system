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
    const path = location.pathname;
    
    // 精确匹配
    if (path === '/dashboard') return t('navigation.dashboard');
    if (path === '/data-monitor/internal-transfer') return t('navigation.internalTransfer');
    if (path === '/data-monitor/adjust-data') return t('navigation.adjustData');
    if (path === '/data-monitor/page-data') return t('navigation.pageData');
    if (path === '/data-monitor/post-loan') return t('navigation.postLoanData');
    if (path === '/partner-center/api-partners') return t('navigation.apiPartners');
    if (path === '/news') return t('navigation.newsManagement');
    if (path === '/push-center/config') return t('navigation.pushConfig');
    if (path === '/push-center/audiences') return t('navigation.pushAudience');
    if (path === '/push-center/templates') return t('navigation.pushTemplate');
    if (path === '/push-center/tasks') return t('navigation.pushTask');
    if (path === '/user-center/users') return t('navigation.userManagement');
    if (path === '/user-center/permissions') return t('navigation.permissionManagement');
    if (path === '/analytics') return t('navigation.analytics');
    if (path === '/settings') return t('navigation.systemSettings');
    
    // 路径前缀匹配
    if (path.startsWith('/news/preview/')) return t('navigation.newsManagement');
    
    return t('navigation.adminPanel');
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
