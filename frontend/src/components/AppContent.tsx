import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import idID from 'antd/locale/id_ID';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from './Layout/AppLayout';
import LoginForm from './Auth/LoginForm';
import RegisterForm from './Auth/RegisterForm';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import InternalTransferData from '../pages/InternalTransferData';
import AdjustData from '../pages/AdjustData';
import PageData from '../pages/PageData';
import PostLoanData from '../pages/PostLoanData';
import ApiPartners from '../pages/ApiPartners';

// 配置 dayjs 多语言
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import 'dayjs/locale/id';

const AppContent: React.FC = () => {
  const { i18n } = useTranslation();

  // 根据语言设置 dayjs 和 Ant Design 的 locale
  useEffect(() => {
    const setLocale = () => {
      switch (i18n.language) {
        case 'zh-CN':
          dayjs.locale('zh-cn');
          break;
        case 'en-US':
          dayjs.locale('en');
          break;
        case 'id-ID':
          dayjs.locale('id');
          break;
        default:
          dayjs.locale('zh-cn');
      }
    };

    setLocale();
  }, [i18n.language]);

  // 获取对应的 Ant Design locale
  const getAntdLocale = () => {
    switch (i18n.language) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      case 'id-ID':
        return idID;
      default:
        return zhCN;
    }
  };

  return (
    <ConfigProvider locale={getAntdLocale()}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            
            {/* 受保护的路由 */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Navigate to="/dashboard" replace />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* 数据监控路由 */}
            <Route path="/data-monitor/internal-transfer" element={
              <ProtectedRoute>
                <AppLayout>
                  <InternalTransferData />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/data-monitor/adjust-data" element={
              <ProtectedRoute>
                <AppLayout>
                  <AdjustData />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/data-monitor/page-data" element={
              <ProtectedRoute>
                <AppLayout>
                  <PageData />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/data-monitor/post-loan" element={
              <ProtectedRoute>
                <AppLayout>
                  <PostLoanData />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* 合作伙伴中心路由 */}
            <Route path="/partner-center/api-partners" element={
              <ProtectedRoute>
                <AppLayout>
                  <ApiPartners />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* 管理员路由 */}
            <Route path="/users" element={
              <ProtectedRoute requireAdmin>
                <AppLayout>
                  <Users />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* 404 页面 */}
            <Route path="*" element={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column'
              }}>
                <h1>404</h1>
                <p>页面不存在</p>
              </div>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default AppContent;
