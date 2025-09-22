import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Space } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
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
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
        管理后台
      </div>
      
      <Space>
        <span style={{ color: '#666' }}>
          欢迎，{user?.username}
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
