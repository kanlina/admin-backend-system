import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar 
        isMobile={isMobile} 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
      />
      <Layout>
        <Header 
          isMobile={isMobile} 
          onMenuClick={() => setSidebarVisible(true)} 
        />
        <Content style={{ 
          margin: isMobile ? '12px 8px' : '24px 16px', 
          padding: isMobile ? 12 : 24, 
          background: '#fff',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 112px)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
