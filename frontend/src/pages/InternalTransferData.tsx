import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Space, message, Modal, Tabs, Tooltip } from 'antd';
import { EyeOutlined, DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

const { RangePicker } = DatePicker;

interface InternalTransferRecord {
  id: string;
  query_date: string;
  register_count: number;
  real_name_auth_count: number;
  credit_info_count: number;
  push_total_count: number;
  info_push_count: number;
  credit_success_count: number;
  loan_success_count: number;
  loan_approved_count: number;
  loan_repaid_count: number;
}

const InternalTransferData: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InternalTransferRecord[]>([]);
  const [allData, setAllData] = useState<InternalTransferRecord[]>([]); // 存储所有数据用于图表
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [showChart, setShowChart] = useState(false); // 控制图表显示，默认关闭
  
  // 详情Modal相关状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTabKey, setActiveTabKey] = useState('register');
  const [selectedRecord, setSelectedRecord] = useState<InternalTransferRecord | null>(null);


  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  const fetchData = async (resetPagination = false) => {
    setLoading(true);
    try {
      const params: any = {
        page: resetPagination ? 1 : pagination.current,
        pageSize: pagination.pageSize
      };
      
      // 如果有日期范围，添加到请求参数中
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      console.log('获取表格数据参数:', params);

      // 同时获取图表所需的全部数据
      const allDataParams: any = { page: 1, pageSize: 1000 }; // 获取大量数据用于图表
      if (dateRange && dateRange[0] && dateRange[1]) {
        allDataParams.startDate = dateRange[0].format('YYYY-MM-DD');
        allDataParams.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      // 并行请求表格数据和全部数据
      const [response, allResponse] = await Promise.all([
        apiService.getInternalTransferData(params),
        apiService.getInternalTransferData(allDataParams)
      ]);
      
      if (response.success && response.data && response.pagination) {
        const apiData = response.data;
        const paginationInfo = response.pagination;
        
        // 调试：打印第一条数据的字段名
        if (apiData.length > 0) {
          console.log('后端返回的第一条数据:', apiData[0]);
          console.log('数据字段名:', Object.keys(apiData[0]));
        }
        
        // 转换数据格式，添加id字段
        const formattedData = apiData.map((item: any, index: number) => ({
          id: ((paginationInfo.page - 1) * paginationInfo.limit + index + 1).toString(),
          ...item
        }));
        
        setData(formattedData);
        setPagination({
          current: paginationInfo.page,
          pageSize: paginationInfo.limit,
          total: paginationInfo.total,
          totalPages: paginationInfo.totalPages
        });

        // 保存全部数据用于图表
        if (allResponse.success && allResponse.data) {
          const formattedAllData = allResponse.data.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            ...item
          }));
          setAllData(formattedAllData);
        }
        
        console.log('表格数据加载成功:', {
          dataCount: formattedData.length,
          pagination: paginationInfo
        });
        
        message.success('数据加载成功');
      } else {
        message.error(response.message || '获取数据失败');
      }
    } catch (error) {
      console.error('API请求错误:', error);
      message.error('网络请求失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  // 查看详情
  const handleViewDetails = async (record: InternalTransferRecord) => {
    setSelectedDate(record.query_date);
    setSelectedRecord(record); // 保存选中的记录（用于显示总数）
    setDetailModalVisible(true);
    setActiveTabKey('register'); // 打开时重置到第一个Tab
    setDetailData({}); // 清空之前的数据
    
    // 立即加载第一个Tab的数据
    loadTabData('register', record.query_date);
  };

  // 懒加载Tab数据
  const loadTabData = async (type: string, date?: string) => {
    const queryDate = date || selectedDate;
    
    // 如果数据已经加载过，不重复请求
    if (detailData[type] && detailData[type].length >= 0) {
      return;
    }

    setDetailLoading(true);
    try {
      const response = await apiService.getInternalTransferDetails({ 
        date: queryDate, 
        type 
      });
      
      if (response.success) {
        setDetailData((prev: any) => ({
          ...prev,
          [type]: response.data || []
        }));
      } else {
        setDetailData((prev: any) => ({
          ...prev,
          [type]: []
        }));
        message.error(response.message || '获取详情数据失败');
      }
    } catch (error) {
      console.error('获取详情数据失败:', error);
      message.error(t('common.error'));
      setDetailData((prev: any) => ({
        ...prev,
        [type]: []
      }));
    } finally {
      setDetailLoading(false);
    }
  };

  // 处理Tab切换
  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    loadTabData(key);
  };

  // 生成动态表格列的辅助函数（处理超长字段）
  const generateDynamicColumns = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    // 可点击复制的字段（如token等）
    const copyableFields = ['token', 'refresh_token', 'access_token'];
    
    // 超长字段（需要截断显示）
    const longTextFields = ['device_id', 'ip_address', 'app_version', 'system_version'];
    
    // 复制到剪贴板的函数
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        message.success('Copied to clipboard');
      }).catch(() => {
        message.error('Copy failed');
      });
    };
    
    // Status状态映射
    const getStatusDisplay = (status: any) => {
      const statusNum = Number(status);
      const statusMap: { [key: number]: { text: string; color: string } } = {
        0: { text: 'PENDING', color: '#faad14' },
        1: { text: 'SUCCESS', color: '#52c41a' },
        2: { text: 'FAILED', color: '#f5222d' },
      };
      
      const statusInfo = statusMap[statusNum];
      if (statusInfo) {
        return (
          <span style={{ 
            color: statusInfo.color, 
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${statusInfo.color}15`,
          }}>
            {statusInfo.text}
          </span>
        );
      }
      return status;
    };
    
    // is_new_user字段映射
    const getIsNewUserDisplay = (isNewUser: any) => {
      const isNew = Number(isNewUser) === 1;
      return (
        <span style={{ 
          color: isNew ? '#52c41a' : '#1890ff', 
          fontWeight: 'bold',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: isNew ? '#52c41a15' : '#1890ff15',
        }}>
          {isNew ? 'New User' : 'Existing User'}
        </span>
      );
    };
    
    // recognition_status字段映射 (识别状态)
    const getRecognitionStatusDisplay = (status: any) => {
      const statusNum = Number(status);
      const statusMap: { [key: number]: { text: string; color: string } } = {
        0: { text: 'Processing', color: '#faad14' },      // 识别中
        1: { text: 'Recognized', color: '#52c41a' },      // 已识别
        2: { text: 'Failed', color: '#f5222d' },          // 识别失败
      };
      
      const statusInfo = statusMap[statusNum];
      if (statusInfo) {
        return (
          <span style={{ 
            color: statusInfo.color, 
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${statusInfo.color}15`,
          }}>
            {statusInfo.text}
          </span>
        );
      }
      return status;
    };
    
    // 验证状态字段映射 (通用: id_card_verify_status, face_verify_status, liveness_verify_status)
    const getVerifyStatusDisplay = (status: any) => {
      const statusNum = Number(status);
      const statusMap: { [key: number]: { text: string; color: string } } = {
        0: { text: 'In Progress', color: '#faad14' },     // 验证中
        1: { text: 'Successful', color: '#52c41a' },      // 验证成功
        2: { text: 'Failed', color: '#f5222d' },          // 验证失败
      };
      
      const statusInfo = statusMap[statusNum];
      if (statusInfo) {
        return (
          <span style={{ 
            color: statusInfo.color, 
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${statusInfo.color}15`,
          }}>
            {statusInfo.text}
          </span>
        );
      }
      return status;
    };
    
    // credit_status字段映射 (授信状态)
    const getCreditStatusDisplay = (status: any) => {
      const statusNum = Number(status);
      const statusMap: { [key: number]: { text: string; color: string } } = {
        1: { text: 'In Progress', color: '#faad14' },     // 授信中
        2: { text: 'Approved', color: '#52c41a' },        // 授信通过
        3: { text: 'Rejected', color: '#f5222d' },        // 授信拒绝
      };
      
      const statusInfo = statusMap[statusNum];
      if (statusInfo) {
        return (
          <span style={{ 
            color: statusInfo.color, 
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${statusInfo.color}15`,
          }}>
            {statusInfo.text}
          </span>
        );
      }
      return status;
    };
    
    // partner_order_status字段映射 (合作伙伴订单状态)
    const getPartnerOrderStatusDisplay = (status: any) => {
      const statusNum = Number(status);
      const statusMap: { [key: number]: { text: string; color: string } } = {
        1: { text: 'Not Disbursed', color: '#faad14' },       // 未放款
        2: { text: 'Disbursed', color: '#52c41a' },           // 放款成功
        3: { text: 'Repaid', color: '#1890ff' },              // 已还款
        4: { text: 'Overdue', color: '#f5222d' },             // 逾期
        5: { text: 'Disbursement Failed', color: '#ff4d4f' }, // 放款失败
        6: { text: 'Pending Signature', color: '#722ed1' },   // 待签名
      };
      
      const statusInfo = statusMap[statusNum];
      if (statusInfo) {
        return (
          <span style={{ 
            color: statusInfo.color, 
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${statusInfo.color}15`,
          }}>
            {statusInfo.text}
          </span>
        );
      }
      return status;
    };
    
    return Object.keys(data[0]).map((key) => ({
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dataIndex: key,
      key: key,
      width: key.includes('time') || key.includes('at') ? 180 : 
             copyableFields.includes(key.toLowerCase()) ? 200 :
             key.toLowerCase() === 'response' ? 150 :
             key.toLowerCase() === 'status' ? 120 :
             key.toLowerCase() === 'is_new_user' ? 140 :
             key.toLowerCase() === 'recognition_status' ? 130 :
             key.toLowerCase() === 'credit_status' ? 130 :
             key.toLowerCase() === 'partner_order_status' ? 160 :
             key.toLowerCase().includes('verify_status') ? 130 :
             longTextFields.includes(key.toLowerCase()) ? 150 : 120,
      render: (val: any) => {
        if (val === null || val === undefined) return '-';
        
        // 处理JSON对象字段（如response等）
        if (typeof val === 'object') {
          const jsonStr = JSON.stringify(val, null, 2);
          return (
            <Tooltip title={<pre style={{ margin: 0, maxHeight: '400px', overflow: 'auto' }}>{jsonStr}</pre>} placement="topLeft" overlayStyle={{ maxWidth: '600px' }}>
              <span 
                style={{ 
                  cursor: 'pointer', 
                  color: '#1890ff',
                  textDecoration: 'underline'
                }}
                onClick={() => copyToClipboard(jsonStr)}
              >
                {'{...}'} 点击复制
              </span>
            </Tooltip>
          );
        }
        
        // 处理JSON字符串字段（如partner_request_response、partner_response、result等）
        if (key.toLowerCase().includes('response') || key.toLowerCase().includes('request') || key.toLowerCase().includes('result')) {
          const strVal = String(val);
          try {
            // 尝试解析为JSON
            const parsed = JSON.parse(strVal);
            const jsonStr = JSON.stringify(parsed, null, 2);
            // 显示JSON的前50个字符作为预览
            const preview = jsonStr.substring(0, 50).replace(/\n/g, ' ');
            return (
              <Tooltip 
                title={<pre style={{ margin: 0, maxHeight: '400px', overflow: 'auto', fontSize: '12px' }}>{jsonStr}</pre>} 
                placement="topLeft" 
                overlayStyle={{ maxWidth: '600px' }}
              >
                <span 
                  style={{ 
                    cursor: 'pointer', 
                    color: '#1890ff',
                    textDecoration: 'underline',
                    fontWeight: 500
                  }}
                  onClick={() => copyToClipboard(jsonStr)}
                >
                  {preview}... <span style={{ fontSize: '11px', opacity: 0.8 }}>(Click to copy)</span>
                </span>
              </Tooltip>
            );
          } catch (e) {
            // 如果不是有效JSON，也显示部分内容并允许复制
            const displayText = strVal.length > 30 ? `${strVal.substring(0, 30)}...` : strVal;
            return (
              <Tooltip title="Click to copy full content" placement="topLeft">
                <span 
                  style={{ 
                    cursor: 'pointer', 
                    color: '#1890ff',
                    textDecoration: 'underline'
                  }}
                  onClick={() => copyToClipboard(strVal)}
                >
                  {displayText}
                </span>
              </Tooltip>
            );
          }
        }
        
        // 处理is_new_user字段
        if (key.toLowerCase() === 'is_new_user') {
          return getIsNewUserDisplay(val);
        }
        
        // 处理id_card_verify_status、face_verify_status、liveness_verify_status字段
        if (key.toLowerCase().includes('verify_status')) {
          return getVerifyStatusDisplay(val);
        }
        
        // 处理partner_order_status字段
        if (key.toLowerCase() === 'partner_order_status') {
          return getPartnerOrderStatusDisplay(val);
        }
        
        // 处理credit_status字段
        if (key.toLowerCase() === 'credit_status') {
          return getCreditStatusDisplay(val);
        }
        
        // 处理recognition_status字段
        if (key.toLowerCase() === 'recognition_status') {
          return getRecognitionStatusDisplay(val);
        }
        
        // 处理status字段
        if (key.toLowerCase() === 'status') {
          return getStatusDisplay(val);
        }
        
        // 处理时间字段（需要验证是否为有效日期）
        if (typeof val === 'string' && (key.includes('time') || key.includes('at'))) {
          const date = dayjs(val);
          // 验证日期是否有效
          if (date.isValid()) {
            return date.format('YYYY-MM-DD HH:mm:ss');
          }
          // 如果不是有效日期，返回原始值（可能是status等其他字段）
          return val;
        }
        
        // 处理金额和数量字段
        if (typeof val === 'number' && (key.includes('amount') || key.includes('count'))) {
          return val.toLocaleString();
        }
        
        const strVal = String(val);
        
        // 处理可复制字段（如token）- 点击复制（始终显示）
        if (copyableFields.includes(key.toLowerCase())) {
          const displayText = strVal.length > 20 ? `${strVal.substring(0, 20)}...` : strVal;
          return (
            <Tooltip title={strVal.length > 20 ? "Click to copy" : strVal} placement="topLeft">
              <span 
                style={{ 
                  cursor: 'pointer', 
                  color: '#1890ff',
                  textDecoration: 'underline'
                }}
                onClick={() => copyToClipboard(strVal)}
              >
                {displayText}
              </span>
            </Tooltip>
          );
        }
        
        // 处理超长文本字段 - 悬停查看
        if (longTextFields.includes(key.toLowerCase()) && strVal.length > 20) {
          return (
            <Tooltip title={strVal} placement="topLeft">
              <span style={{ cursor: 'pointer' }}>
                {strVal.substring(0, 20)}...
              </span>
            </Tooltip>
          );
        }
        
        // 处理其他超长文本 - 悬停查看
        if (strVal.length > 50) {
          return (
            <Tooltip title={strVal} placement="topLeft">
              <span style={{ cursor: 'pointer' }}>
                {strVal.substring(0, 50)}...
              </span>
            </Tooltip>
          );
        }
        
        return strVal;
      },
    }));
  };

  // 下载当前数据
  const downloadData = () => {
    try {
      const csvData = allData.map(item => ({
        date: item.query_date,
        register: item.register_count,
        realNameAuth: item.real_name_auth_count,
        creditInfo: item.credit_info_count,
        pushTotal: item.push_total_count,
        infoPush: item.info_push_count,
        creditSuccess: item.credit_success_count,
        loanSuccess: item.loan_success_count,
        loanApproved: item.loan_approved_count,
        loanRepaid: item.loan_repaid_count,
      }));

      const headers = [
        t('internalTransfer.downloadHeaders.date'),
        t('internalTransfer.downloadHeaders.register'),
        t('internalTransfer.downloadHeaders.realNameAuth'),
        t('internalTransfer.downloadHeaders.creditInfo'),
        t('internalTransfer.downloadHeaders.pushTotal'),
        t('internalTransfer.downloadHeaders.infoPush'),
        t('internalTransfer.downloadHeaders.creditSuccess'),
        t('internalTransfer.downloadHeaders.loanSuccess'),
        t('internalTransfer.downloadHeaders.loanApproved'),
        t('internalTransfer.downloadHeaders.loanRepaid')
      ];
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => [
          row.date,
          row.register,
          row.realNameAuth,
          row.creditInfo,
          row.pushTotal,
          row.infoPush,
          row.creditSuccess,
          row.loanSuccess,
          row.loanApproved,
          row.loanRepaid,
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // 根据当前语言生成文件名
      const fileName = `${t('internalTransfer.title')}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(t('common.success'));
    } catch (error) {
      console.error('下载数据失败:', error);
      message.error(t('common.error'));
    }
  };

  const columns = [
    {
      title: t('internalTransfer.rowNumber'),
      key: 'rowNumber',
      width: 80,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => {
        // 使用当前分页状态计算序号
        const currentPage = pagination.current || 1;
        const pageSize = pagination.pageSize || 10;
        const startIndex = (currentPage - 1) * pageSize;
        return startIndex + index + 1;
      },
    },
    {
      title: t('common.date'),
      dataIndex: 'query_date',
      key: 'query_date',
      width: 120,
      fixed: 'left' as const,
      render: (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('YYYY-MM-DD');
      },
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => {
        return dayjs(a.query_date).valueOf() - dayjs(b.query_date).valueOf();
      },
    },
    {
      title: t('internalTransfer.registerCount'),
      dataIndex: 'register_count',
      key: 'register_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.register_count || 0) - (b.register_count || 0),
    },
    {
      title: t('internalTransfer.realNameAuthCount'),
      dataIndex: 'real_name_auth_count',
      key: 'real_name_auth_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.real_name_auth_count || 0) - (b.real_name_auth_count || 0),
    },
    {
      title: t('internalTransfer.creditInfoCount'),
      dataIndex: 'credit_info_count',
      key: 'credit_info_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.credit_info_count || 0) - (b.credit_info_count || 0),
    },
    {
      title: t('internalTransfer.pushTotalCount'),
      dataIndex: 'push_total_count',
      key: 'push_total_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.push_total_count || 0) - (b.push_total_count || 0),
    },
    {
      title: t('internalTransfer.infoPushCount'),
      dataIndex: 'info_push_count',
      key: 'info_push_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.info_push_count || 0) - (b.info_push_count || 0),
    },
    {
      title: t('internalTransfer.creditSuccessCount'),
      dataIndex: 'credit_success_count',
      key: 'credit_success_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.credit_success_count || 0) - (b.credit_success_count || 0),
    },
    {
      title: t('internalTransfer.loanSuccessCount'),
      dataIndex: 'loan_success_count',
      key: 'loan_success_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.loan_success_count || 0) - (b.loan_success_count || 0),
    },
    {
      title: t('internalTransfer.loanApprovedCount'),
      dataIndex: 'loan_approved_count',
      key: 'loan_approved_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.loan_approved_count || 0) - (b.loan_approved_count || 0),
    },
    {
      title: t('internalTransfer.loanRepaidCount'),
      dataIndex: 'loan_repaid_count',
      key: 'loan_repaid_count',
      render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => (a.loan_repaid_count || 0) - (b.loan_repaid_count || 0),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: InternalTransferRecord) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          {t('common.details')}
        </Button>
      ),
    },
  ];


  // 转换图表数据格式，为每个数据点添加颜色信息
  const transformedChartData = allData
    .sort((a, b) => new Date(a.query_date).getTime() - new Date(b.query_date).getTime()) // 按日期排序
    .flatMap(item => {
      console.log('转换前的数据项:', item);
      
      // 确保所有数值都是有效的数字，使用英文字段名
      const registerCount = Number(item.register_count) || 0;
      const realNameAuthCount = Number(item.real_name_auth_count) || 0;
      const creditInfoCount = Number(item.credit_info_count) || 0;
      const pushTotalCount = Number(item.push_total_count) || 0;
      const infoPushCount = Number(item.info_push_count) || 0;
      const creditSuccessCount = Number(item.credit_success_count) || 0;
      const loanSuccessCount = Number(item.loan_success_count) || 0;
      const loanApprovedCount = Number(item.loan_approved_count) || 0;
      const loanRepaidCount = Number(item.loan_repaid_count) || 0;
      
      console.log('转换后的数值:', {
        registerCount,
        realNameAuthCount,
        creditInfoCount,
        pushTotalCount,
        infoPushCount,
        creditSuccessCount,
        loanSuccessCount,
        loanApprovedCount,
        loanRepaidCount
      });
      
      const result = [
        { date: item.query_date, category: t('internalTransfer.chartCategories.register'), value: registerCount, color: '#1890ff' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.realNameAuth'), value: realNameAuthCount, color: '#52c41a' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.creditInfo'), value: creditInfoCount, color: '#faad14' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.pushTotal'), value: pushTotalCount, color: '#ff7a45' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.infoPush'), value: infoPushCount, color: '#f5222d' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.creditSuccess'), value: creditSuccessCount, color: '#722ed1' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.loanSuccess'), value: loanSuccessCount, color: '#13c2c2' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.loanApproved'), value: loanApprovedCount, color: '#eb2f96' },
        { date: item.query_date, category: t('internalTransfer.chartCategories.loanRepaid'), value: loanRepaidCount, color: '#a0d911' },
      ];
      
      // 调试信息：打印转换后的数据
      console.log('Transformed chart data for date:', item.query_date, result);
      
      return result;
    });


  // 折线图配置
  const chartConfig = {
    data: transformedChartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
    colorField: 'category',
    color: ['#1890ff', '#52c41a', '#faad14', '#ff7a45', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#a0d911'],
    scale: {
      date: {
        type: 'cat',
        tickCount: Math.min(Math.max(transformedChartData.length / 6, 3), 15), // 根据数据量动态调整刻度数量，最少3个，最多15个
        range: [0, 1],
      },
      value: {
        nice: true,
        min: 0,
        max: Math.max(...transformedChartData.map(d => d.value)) * 1.1, // 设置最大值，留出10%空间
      },
    },
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    legend: {
      position: 'top' as const,
      layout: 'horizontal' as const,
      align: 'center' as const,
      itemName: {
        style: {
          fontSize: 12,
          fontWeight: 'normal',
          textAlign: 'center',
        },
      },
      itemMarker: {
        style: {
          marginRight: 8,
        },
      },
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: true,
        style: {
          fontSize: 12,
        },
        formatter: (text: string) => {
          // 格式化日期显示，如果是日期格式则显示月-日
          if (text && text.includes('-')) {
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
              return `${date.getMonth() + 1}-${date.getDate()}`;
            }
          }
          return text;
        },
      },
      tickLine: {
        style: {
          stroke: '#d9d9d9',
        },
      },
      grid: {
        line: {
          style: {
            stroke: '#f0f0f0',
            lineDash: [2, 2],
          },
        },
      },
    },
    // tooltip: {
    //   shared: true,
    //   showCrosshairs: true,
    //   formatter: (datum: any) => {
    //     // 直接处理数值，确保不为null或undefined
    //     // const value = ;
    //     return {
    //       name: datum.category || '未知',
    //       value: datum.value,
    //     };
    //   },
    // },
    yAxis: {
      label: {
        formatter: (text: string) => {
          return Number(text).toLocaleString();
        },
      },
    },
    point: {
      size: 4,
      shape: 'circle',
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 'bold', color: '#333' }}>{t('internalTransfer.dateRange')}：</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            placeholder={[t('internalTransfer.startDate'), t('internalTransfer.endDate')]}
          />
          <Button
            type="primary"
            onClick={async () => {
              console.log('确认筛选，开始查询数据...');
              await fetchData(true); // 重置分页到第一页
              message.success('数据筛选完成');
            }}
          >
            {t('common.confirm')}
          </Button>
          <Button 
            onClick={async () => {
              console.log('重置筛选条件...');
              setDateRange(null);
              setPagination(prev => ({ ...prev, current: 1 }));
              await fetchData(true);
              message.success('筛选条件已重置');
            }}
          >
            {t('common.reset')}
          </Button>
        </Space>
      </Card>

      {/* 折线图区域 */}
      {showChart && (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('internalTransfer.chartTitle')}</span>
              <Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => setShowChart(false)}
                  title={t('internalTransfer.chartControls.hideChart')}
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title={t('internalTransfer.chartControls.downloadData')}
                  disabled={allData.length === 0}
                />
              </Space>
            </div>
          }
          style={{ marginBottom: 16 }}
        >
          <div style={{ 
            height: '400px', 
            width: '100%',
            minHeight: '300px',
            position: 'relative'
          }}>
            {transformedChartData.length > 0 ? (
              <Line {...chartConfig} />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontSize: '16px'
              }}>
                {t('common.noData')}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 当图表隐藏时显示控制按钮 */}
      {!showChart && (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('internalTransfer.chartControls.chartHiddenTitle')}</span>
              <Space>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => {
                    setShowChart(true);
                  }}
                  title={t('internalTransfer.chartControls.showChart')}
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title={t('internalTransfer.chartControls.downloadData')}
                  disabled={allData.length === 0}
                />
              </Space>
            </div>
          }
          style={{ marginBottom: 16 }}
        >
          <div style={{
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px',
            background: '#f5f5f5',
            borderRadius: '6px'
          }}>
            {t('internalTransfer.chartControls.chartHidden')}
          </div>
        </Card>
      )}

      {/* 数据表格区域 */}
      <Card title={t('internalTransfer.tableTitle')}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => t('common.pageRangeWithTotal', { start: range[0], end: range[1], total }),
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              console.log('分页变化:', { page, pageSize, currentPagination: pagination });
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            },
            onShowSizeChange: (_, size) => {
              console.log('页面大小变化:', { size, currentPagination: pagination });
              setPagination(prev => ({
                ...prev,
                current: 1,
                pageSize: size
              }));
            }
          }}
        />
      </Card>

      {/* 详情Modal - 动态展示所有字段 */}
      <Modal
        title={`${t('internalTransfer.detailTitle')} - ${selectedDate}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setActiveTabKey('register'); // 关闭时重置到第一个Tab
        }}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTabKey}
          onChange={handleTabChange}
          type="card"
          tabBarStyle={{ 
            marginBottom: 16,
            overflow: 'auto',
            whiteSpace: 'nowrap'
          }}
          tabBarExtraContent={{
            left: (
              <Button
                size="small"
                icon={<LeftOutlined />}
                onClick={() => {
                  const keys = [
                    'register', 'real_name_auth', 'credit_info', 'push_total',
                    'info_push', 'credit_success', 'loan_success', 'loan_approved', 'loan_repaid'
                  ];
                  const currentIndex = keys.indexOf(activeTabKey);
                  if (currentIndex > 0) {
                    handleTabChange(keys[currentIndex - 1]);
                  }
                }}
                disabled={activeTabKey === 'register'}
                style={{ marginRight: 8 }}
              />
            ),
            right: (
              <Button
                size="small"
                icon={<RightOutlined />}
                onClick={() => {
                  const keys = [
                    'register', 'real_name_auth', 'credit_info', 'push_total',
                    'info_push', 'credit_success', 'loan_success', 'loan_approved', 'loan_repaid'
                  ];
                  const currentIndex = keys.indexOf(activeTabKey);
                  if (currentIndex < keys.length - 1) {
                    handleTabChange(keys[currentIndex + 1]);
                  }
                }}
                disabled={activeTabKey === 'loan_repaid'}
                style={{ marginLeft: 8 }}
              />
            ),
          }}
          items={[
            {
              key: 'register',
              label: `${t('internalTransfer.registerCount')} (${selectedRecord?.register_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.register || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.register || [])}
                />
              ),
            },
            {
              key: 'real_name_auth',
              label: `${t('internalTransfer.realNameAuthCount')} (${selectedRecord?.real_name_auth_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.real_name_auth || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.real_name_auth || [])}
                />
              ),
            },
            {
              key: 'credit_info',
              label: `${t('internalTransfer.creditInfoCount')} (${selectedRecord?.credit_info_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.credit_info || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.credit_info || [])}
                />
              ),
            },
            {
              key: 'push_total',
              label: `${t('internalTransfer.pushTotalCount')} (${selectedRecord?.push_total_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.push_total || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.push_total || [])}
                />
              ),
            },
            {
              key: 'info_push',
              label: `${t('internalTransfer.infoPushCount')} (${selectedRecord?.info_push_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.info_push || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.info_push || [])}
                />
              ),
            },
            {
              key: 'credit_success',
              label: `${t('internalTransfer.creditSuccessCount')} (${selectedRecord?.credit_success_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.credit_success || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.credit_success || [])}
                />
              ),
            },
            {
              key: 'loan_success',
              label: `${t('internalTransfer.loanSuccessCount')} (${selectedRecord?.loan_success_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.loan_success || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.loan_success || [])}
                />
              ),
            },
            {
              key: 'loan_approved',
              label: `${t('internalTransfer.loanApprovedCount')} (${selectedRecord?.loan_approved_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.loan_approved || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.loan_approved || [])}
                />
              ),
            },
            {
              key: 'loan_repaid',
              label: `${t('internalTransfer.loanRepaidCount')} (${selectedRecord?.loan_repaid_count || 0})`,
              children: (
                <Table
                  dataSource={detailData.loan_repaid || []}
                  loading={detailLoading}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                  pagination={{ pageSize: 10 }}
                  columns={generateDynamicColumns(detailData.loan_repaid || [])}
                />
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default InternalTransferData;
