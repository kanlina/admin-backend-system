import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Space, message } from 'antd';
import { EyeOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

const { RangePicker } = DatePicker;

interface InternalTransferRecord {
  id: string;
  query_date: string;
  register_count: number;
  adjust_registration_count: number;
  real_name_auth_count: number;
  credit_info_count: number;
  info_push_count: number;
  credit_success_count: number;
  loan_success_count: number;
}

interface ChartData {
  date: string;
  register_count: number;
  adjust_registration_count: number;
  real_name_auth_count: number;
  credit_info_count: number;
  info_push_count: number;
  credit_success_count: number;
  loan_success_count: number;
}

const InternalTransferData: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [data, setData] = useState<InternalTransferRecord[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [showChart, setShowChart] = useState(false); // 控制图表显示，默认关闭


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

      const response = await apiService.getInternalTransferData(params);
      
      if (response.success && response.data && response.pagination) {
        const apiData = response.data;
        const paginationInfo = response.pagination;
        
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

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const params: any = {};
      
      // 如果有日期范围，添加到请求参数中
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      } else {
        // 如果没有日期筛选，默认查询当月数据
        const now = dayjs();
        const startOfMonth = now.startOf('month');
        const endOfMonth = now.endOf('month');
        params.startDate = startOfMonth.format('YYYY-MM-DD');
        params.endDate = endOfMonth.format('YYYY-MM-DD');
      }

      const response = await apiService.getInternalTransferChartData(params);
      
      if (response.success && response.data) {
        const apiData = response.data;
        
        // 转换图表数据格式
        console.log('原始API数据:', apiData);
        const formattedChartData = apiData.map((item: any) => {
          console.log('处理单个数据项:', item);
          return {
            date: item.query_date,
            register_count: item.register_count,
            adjust_registration_count: item.adjust_registration_count,
            real_name_auth_count: item.real_name_auth_count,
            credit_info_count: item.credit_info_count,
            info_push_count: item.info_push_count,
            credit_success_count: item.credit_success_count,
            loan_success_count: item.loan_success_count,
          };
        });
        console.log('格式化后的图表数据:', formattedChartData);
        
        setChartData(formattedChartData);
      } else {
        message.error(response.message || '获取图表数据失败');
      }
    } catch (error) {
      console.error('图表数据请求错误:', error);
      message.error('获取图表数据失败，请检查后端服务');
    } finally {
      setChartLoading(false);
    }
  };

  // 下载当前数据
  const downloadData = () => {
    try {
      const csvData = chartData.map(item => ({
        date: item.date,
        register: item.register_count,
        adjustRegistration: item.adjust_registration_count,
        realNameAuth: item.real_name_auth_count,
        creditInfo: item.credit_info_count,
        infoPush: item.info_push_count,
        creditSuccess: item.credit_success_count,
        loanSuccess: item.loan_success_count,
      }));

      const headers = [
        t('internalTransfer.downloadHeaders.date'),
        t('internalTransfer.downloadHeaders.register'),
        t('internalTransfer.downloadHeaders.adjustRegistration'),
        t('internalTransfer.downloadHeaders.realNameAuth'),
        t('internalTransfer.downloadHeaders.creditInfo'),
        t('internalTransfer.downloadHeaders.infoPush'),
        t('internalTransfer.downloadHeaders.creditSuccess'),
        t('internalTransfer.downloadHeaders.loanSuccess')
      ];
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => [
          row.date,
          row.register,
          row.adjustRegistration,
          row.realNameAuth,
          row.creditInfo,
          row.infoPush,
          row.creditSuccess,
          row.loanSuccess,
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

  // 刷新趋势分析图
  const refreshChart = async () => {
    await fetchChartData();
    message.success(t('internalTransfer.chartControls.refreshChart'));
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
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.register_count - b.register_count,
    },
    {
      title: t('internalTransfer.adjustRegistrationCount'),
      dataIndex: 'adjust_registration_count',
      key: 'adjust_registration_count',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.adjust_registration_count - b.adjust_registration_count,
    },
    {
      title: t('internalTransfer.realNameAuthCount'),
      dataIndex: 'real_name_auth_count',
      key: 'real_name_auth_count',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.real_name_auth_count - b.real_name_auth_count,
    },
    {
      title: t('internalTransfer.creditInfoCount'),
      dataIndex: 'credit_info_count',
      key: 'credit_info_count',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.credit_info_count - b.credit_info_count,
    },
    {
      title: t('internalTransfer.infoPushCount'),
      dataIndex: 'info_push_count',
      key: 'info_push_count',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.info_push_count - b.info_push_count,
    },
    {
      title: t('internalTransfer.creditSuccessCount'),
      dataIndex: 'credit_success_count',
      key: 'credit_success_count',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.credit_success_count - b.credit_success_count,
    },
    {
      title: t('internalTransfer.loanSuccessCount'),
      dataIndex: 'loan_success_count',
      key: 'loan_success_count',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.loan_success_count - b.loan_success_count,
    },
  ];


  // 转换图表数据格式，为每个数据点添加颜色信息
  const transformedChartData = chartData
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // 按日期排序
    .flatMap(item => {
      console.log('转换前的数据项:', item);
      
      // 确保所有数值都是有效的数字，使用英文字段名
      const registerCount = Number(item.register_count) || 0;
      const adjustRegistrationCount = Number(item.adjust_registration_count) || 0;
      const realNameAuthCount = Number(item.real_name_auth_count) || 0;
      const creditInfoCount = Number(item.credit_info_count) || 0;
      const infoPushCount = Number(item.info_push_count) || 0;
      const creditSuccessCount = Number(item.credit_success_count) || 0;
      const loanSuccessCount = Number(item.loan_success_count) || 0;
      
      console.log('转换后的数值:', {
        registerCount,
        adjustRegistrationCount,
        realNameAuthCount,
        creditInfoCount,
        infoPushCount,
        creditSuccessCount,
        loanSuccessCount
      });
      
      const result = [
        { date: item.date, category: t('internalTransfer.chartCategories.register'), value: registerCount, color: '#1890ff' },
        { date: item.date, category: t('internalTransfer.chartCategories.adjustRegistration'), value: adjustRegistrationCount, color: '#fa8c16' },
        { date: item.date, category: t('internalTransfer.chartCategories.realNameAuth'), value: realNameAuthCount, color: '#52c41a' },
        { date: item.date, category: t('internalTransfer.chartCategories.creditInfo'), value: creditInfoCount, color: '#faad14' },
        { date: item.date, category: t('internalTransfer.chartCategories.infoPush'), value: infoPushCount, color: '#f5222d' },
        { date: item.date, category: t('internalTransfer.chartCategories.creditSuccess'), value: creditSuccessCount, color: '#722ed1' },
        { date: item.date, category: t('internalTransfer.chartCategories.loanSuccess'), value: loanSuccessCount, color: '#13c2c2' },
      ];
      
      // 调试信息：打印转换后的数据
      console.log('Transformed chart data for date:', item.date, result);
      
      return result;
    });


  // 折线图配置
  const chartConfig = {
    data: transformedChartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
    colorField: 'category',
    color: ['#1890ff', '#fa8c16', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'],
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
              // 获取表格数据，如果图表显示则同时获取图表数据
              const promises = [fetchData(true)]; // 重置分页到第一页
              if (showChart) {
                promises.push(fetchChartData());
              }
              await Promise.all(promises);
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
              // 重置后获取所有数据，如果图表显示则同时获取图表数据
              const promises = [fetchData(true)];
              if (showChart) {
                promises.push(fetchChartData());
              }
              await Promise.all(promises);
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
                  disabled={chartData.length === 0}
                />
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={refreshChart}
                  title={t('internalTransfer.chartControls.refreshChart')}
                  loading={chartLoading}
                />
              </Space>
            </div>
          }
          style={{ marginBottom: 16 }}
          loading={chartLoading}
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
                  onClick={async () => {
                    setShowChart(true);
                    // 显示图表时自动获取图表数据
                    await fetchChartData();
                  }}
                  title={t('internalTransfer.chartControls.showChart')}
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title={t('internalTransfer.chartControls.downloadData')}
                  disabled={chartData.length === 0}
                />
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={refreshChart}
                  title={t('internalTransfer.chartControls.refreshChart')}
                  loading={chartLoading}
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
    </div>
  );
};

export default InternalTransferData;
