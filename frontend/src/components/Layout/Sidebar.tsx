import React from 'react';
import { Layout, Menu, Drawer } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  BarChartOutlined,
  SettingOutlined,
  MonitorOutlined,
  SwapOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ToolOutlined,
  TeamOutlined,
  ApiOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const { Sider } = Layout;

interface SidebarProps {
  isMobile?: boolean;
  visible?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobile = false,
  visible = false,
  onClose,
  collapsed = false,
}) => {
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
    {
      key: 'partner-center',
      icon: <TeamOutlined />,
      label: t('navigation.partnerCenter'),
      children: [
        {
          key: '/partner-center/api-partners',
          icon: <ApiOutlined />,
          label: t('navigation.apiPartners'),
        },
      ],
    },
    {
      key: '/news',
      icon: <BookOutlined />,
      label: t('navigation.newsManagement'),
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
    if (isMobile && onClose) {
      onClose(); // 移动端点击菜单后关闭Drawer
    }
  };

  const menuContent = (
    <>
      {/* Logo和项目名称 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <img 
          src="https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com/appConf/logo.jpeg" 
          alt="Pilih Kredit Logo" 
          style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '4px',
            objectFit: 'contain'
          }} 
        />
        <span style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#1890ff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          Pilih Kredit
        </span>
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ height: isMobile ? 'auto' : 'calc(100% - 80px)', borderRight: 0 }}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  // 移动端使用Drawer
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        onClose={onClose}
        open={visible}
        bodyStyle={{ padding: 0 }}
        width={250}
      >
        {menuContent}
      </Drawer>
    );
  }

  // 桌面端使用Sider
  return (
    <Sider 
      width={200}
      collapsedWidth={0}
      collapsible
      collapsed={collapsed}
      trigger={null}
      style={{ 
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >
      {menuContent}
    </Sider>
  );
};

export default Sidebar;
