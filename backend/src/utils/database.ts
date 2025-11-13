import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 根据环境获取数据库配置
const getDbConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 支持环境变量覆盖
  const host = process.env.DB_HOST || (isProduction 
    ? 'rm-d9j40fh5e5ny3vr23.mysql.ap-southeast-5.rds.aliyuncs.com'  // 生产环境
    : 'rm-d9j40fh5e5ny3vr23zo.mysql.ap-southeast-5.rds.aliyuncs.com' // 开发环境
  );
  
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'pk_credit_core_pro_user';
  const password = process.env.DB_PASSWORD || 'qie7rjuzn5nvs35t3znhdk7lamsgh0@';
  
  return {
    host,
    port,
    user,
    password,
    charset: 'utf8mb4'
  };
};

// 主数据库连接（admin系统）
export const createMainDbConnection = () => {
  const config = getDbConfig();
  return mysql.createConnection({
    ...config,
    database: 'pk_credit_admin'
  });
};

// pk_credit_core_pro 数据库连接
export const createCoreDbConnection = () => {
  const config = getDbConfig();
  return mysql.createConnection({
    ...config,
    database: 'pk_credit_core_pro'
  });
};

// id-998 项目数据库连接（用于 Content 功能）
export const createId998DbConnection = () => {
  return mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'dbuser',
    password: 'wD2:aB1]mJ1%rB0}',
    database: 'loan',
    charset: 'utf8mb4'
  });
};
