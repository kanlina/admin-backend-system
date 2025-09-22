import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Space, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InternalTransferRecord[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });


  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };
      
      // 如果有日期范围，添加到请求参数中
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await apiService.getInternalTransferData(params);
      
      if (response.success && response.data && response.pagination) {
        const apiData = response.data;
        const paginationInfo = response.pagination;
        
        // 转换数据格式，添加id字段
        const formattedData = apiData.map((item: any, index: number) => ({
          id: ((paginationInfo.current - 1) * paginationInfo.pageSize + index + 1).toString(),
          ...item
        }));
        
        setData(formattedData);
        setPagination({
          current: paginationInfo.current || paginationInfo.page,
          pageSize: paginationInfo.pageSize || paginationInfo.limit,
          total: paginationInfo.total,
          totalPages: paginationInfo.totalPages
        });
        
        // 转换图表数据格式（图表显示所有数据，不分页）
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

  const columns = [
    {
      title: '时间',
      dataIndex: 'query_date',
      key: 'query_date',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '注册人数',
      dataIndex: '注册人数',
      key: '注册人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.注册人数 - b.注册人数,
    },
    {
      title: '实名认证完成人数',
      dataIndex: '实名认证完成人数',
      key: '实名认证完成人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.实名认证完成人数 - b.实名认证完成人数,
    },
    {
      title: '获取个信人数',
      dataIndex: '获取个信人数',
      key: '获取个信人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.获取个信人数 - b.获取个信人数,
    },
    {
      title: '个人信息推送成功人数',
      dataIndex: '个人信息推送成功人数',
      key: '个人信息推送成功人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.个人信息推送成功人数 - b.个人信息推送成功人数,
    },
    {
      title: '授信成功人数',
      dataIndex: '授信成功人数',
      key: '授信成功人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.授信成功人数 - b.授信成功人数,
    },
    {
      title: '借款成功人数',
      dataIndex: '借款成功人数',
      key: '借款成功人数',
      render: (value: number) => value.toLocaleString(),
      sorter: (a: InternalTransferRecord, b: InternalTransferRecord) => a.借款成功人数 - b.借款成功人数,
    },
  ];


  // 折线图配置
  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
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
    tooltip: {
      shared: true,
      showCrosshairs: true,
    },
    point: {
      size: 4,
      shape: 'circle',
    },
  };

  // 转换图表数据格式
  const transformedChartData = chartData.flatMap(item => [
    { date: item.date, category: '注册人数', value: item.注册人数 },
    { date: item.date, category: '实名认证完成人数', value: item.实名认证完成人数 },
    { date: item.date, category: '获取个信人数', value: item.获取个信人数 },
    { date: item.date, category: '个人信息推送成功人数', value: item.个人信息推送成功人数 },
    { date: item.date, category: '授信成功人数', value: item.授信成功人数 },
    { date: item.date, category: '借款成功人数', value: item.借款成功人数 },
  ]);

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
        内转数据监控
      </div>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span style={{ fontWeight: 'bold', color: '#333' }}>时间筛选：</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            placeholder={['开始日期', '结束日期']}
          />
          <Button type="primary" onClick={() => {
            setPagination(prev => ({ ...prev, current: 1 }));
            fetchData();
          }}>
            确认
          </Button>
        </Space>
      </Card>

      {/* 折线图区域 */}
      <Card 
        title="数据趋势图"
        style={{ marginBottom: 16 }}
      >
        <div style={{ height: '400px' }}>
          <Line {...chartConfig} data={transformedChartData} />
        </div>
      </Card>

      {/* 数据表格区域 */}
      <Card title="详细数据">
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
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            },
            onShowSizeChange: (_, size) => {
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
