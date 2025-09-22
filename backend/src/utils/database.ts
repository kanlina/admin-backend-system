import mysql from 'mysql2/promise';

// 主数据库连接（admin系统）
export const createMainDbConnection = () => {
  return mysql.createConnection({
    host: 'rm-d9j40fh5e5ny3vr23.mysql.ap-southeast-5.rds.aliyuncs.com',
    port: 3306,
    user: 'pk_credit_core_pro_user',
    password: 'qie7rjuzn5nvs35t3znhdk7lamsgh0@',
    database: 'pk_credit_admin',
    charset: 'utf8mb4'
  });
};

// pk_credit_core_pro 数据库连接
export const createCoreDbConnection = () => {
  return mysql.createConnection({
    host: 'rm-d9j40fh5e5ny3vr23.mysql.ap-southeast-5.rds.aliyuncs.com',
    port: 3306,
    user: 'pk_credit_core_pro_user',
    password: 'qie7rjuzn5nvs35t3znhdk7lamsgh0@',
    database: 'pk_credit_core_pro',
    charset: 'utf8mb4'
  });
};
