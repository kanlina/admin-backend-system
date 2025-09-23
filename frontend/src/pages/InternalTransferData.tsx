import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Space, message } from 'antd';
import { SwapOutlined, EyeOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

const { RangePicker } = DatePicker;

interface InternalTransferRecord {
  id: string;
  query_date: string;
  注册人数: number;
  实名认证完成人数: number;
  获取个信人数: number;
  个人信息推送成功人数: number;
  授信成功人数: number;
  借款成功人数: number;
}

interface ChartData {
  date: string;
  注册人数: number;
  实名认证完成人数: number;
  获取个信人数: number;
  个人信息推送成功人数: number;
  授信成功人数: number;
  借款成功人数: number;
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
  const [showChart, setShowChart] = useState(true); // 控制图表显示


  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  // 移除时间选择后自动触发查询，改为手动控制
  // useEffect(() => {
  //   fetchChartData();
  // }, [dateRange]);

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
      }

      const response = await apiService.getInternalTransferChartData(params);
      
      if (response.success && response.data) {
        const apiData = response.data;
        
        // 转换图表数据格式
        const formattedChartData = apiData.map((item: any) => ({
          date: item.query_date,
          注册人数: item.注册人数,
          实名认证完成人数: item.实名认证完成人数,
          获取个信人数: item.获取个信人数,
          个人信息推送成功人数: item.个人信息推送成功人数,
          授信成功人数: item.授信成功人数,
          借款成功人数: item.借款成功人数,
        }));
        
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
        register: item.注册人数,
        realNameAuth: item.实名认证完成人数,
        creditInfo: item.获取个信人数,
        infoPush: item.个人信息推送成功人数,
        creditSuccess: item.授信成功人数,
        loanSuccess: item.借款成功人数,
      }));

      const headers = [
        t('internalTransfer.downloadHeaders.date'),
        t('internalTransfer.downloadHeaders.register'),
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
      dataIndex: '注册人数',
      key: '注册人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.注册人数 - b.注册人数,
    },
    {
      title: t('internalTransfer.realNameAuthCount'),
      dataIndex: '实名认证完成人数',
      key: '实名认证完成人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.实名认证完成人数 - b.实名认证完成人数,
    },
    {
      title: t('internalTransfer.creditInfoCount'),
      dataIndex: '获取个信人数',
      key: '获取个信人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.获取个信人数 - b.获取个信人数,
    },
    {
      title: t('internalTransfer.infoPushCount'),
      dataIndex: '个人信息推送成功人数',
      key: '个人信息推送成功人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.个人信息推送成功人数 - b.个人信息推送成功人数,
    },
    {
      title: t('internalTransfer.creditSuccessCount'),
      dataIndex: '授信成功人数',
      key: '授信成功人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.授信成功人数 - b.授信成功人数,
    },
    {
      title: t('internalTransfer.loanSuccessCount'),
      dataIndex: '借款成功人数',
      key: '借款成功人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.借款成功人数 - b.借款成功人数,
    },
  ];


  // 转换图表数据格式，为每个数据点添加颜色信息
  const transformedChartData = chartData
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // 按日期排序
    .flatMap(item => [
      { date: item.date, category: t('internalTransfer.chartCategories.register'), value: Number(item.注册人数) || 0, color: '#1890ff' },
      { date: item.date, category: t('internalTransfer.chartCategories.realNameAuth'), value: Number(item.实名认证完成人数) || 0, color: '#52c41a' },
      { date: item.date, category: t('internalTransfer.chartCategories.creditInfo'), value: Number(item.获取个信人数) || 0, color: '#faad14' },
      { date: item.date, category: t('internalTransfer.chartCategories.infoPush'), value: Number(item.个人信息推送成功人数) || 0, color: '#f5222d' },
      { date: item.date, category: t('internalTransfer.chartCategories.creditSuccess'), value: Number(item.授信成功人数) || 0, color: '#722ed1' },
      { date: item.date, category: t('internalTransfer.chartCategories.loanSuccess'), value: Number(item.借款成功人数) || 0, color: '#13c2c2' },
    ]);


  // 折线图配置
  const chartConfig = {
    data: transformedChartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
    colorField: 'category',
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'],
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
    tooltip: {
      shared: true,
      showCrosshairs: true,
      formatter: (datum: any) => {
        const value = Number(datum.value) || 0;
        return {
          name: datum.category || '未知',
          value: value.toLocaleString(),
        };
      },
      customContent: (title: string, items: any[]) => {
        if (!items || items.length === 0) return '';
        
        const content = items.map(item => {
          const value = Number(item.value) || 0;
          return `<div style="margin: 4px 0;">
            <span style="color: ${item.color}; margin-right: 8px;">●</span>
            <span style="font-weight: 500;">${item.name}:</span>
            <span style="margin-left: 8px; font-weight: 600;">${value.toLocaleString()}</span>
          </div>`;
        }).join('');
        
        return `<div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 8px;">${title}</div>
          ${content}
        </div>`;
      },
    },
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
      {/* 页面标题 */}
      <div style={{ 
        marginBottom: '16px', 
        fontSize: '18px', 
        fontWeight: 'bold',
        color: '#1890ff',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <SwapOutlined />
        {t('internalTransfer.title')}
      </div>

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
              // 同时获取表格数据和图表数据
              await Promise.all([
                fetchData(true), // 重置分页到第一页
                fetchChartData()
              ]);
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
              // 重置后获取所有数据
              await Promise.all([
                fetchData(true),
                fetchChartData()
              ]);
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
                  onClick={() => setShowChart(true)}
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
