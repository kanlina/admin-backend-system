import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Tags from './pages/Tags';

// 配置 dayjs 中文
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
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
            
            
            <Route path="/tags" element={
              <ProtectedRoute>
                <AppLayout>
                  <Tags />
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

export default App;