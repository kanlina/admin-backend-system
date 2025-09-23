import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Select, Space, Statistic, Row, Col, message, Progress } from 'antd';
import { FileTextOutlined, DownloadOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface PageDataRecord {
  id: string;
  pageName: string;
  pageUrl: string;
  pageType: string;
  visitCount: number;
  uniqueVisitors: number;
  avgStayTime: number;
  bounceRate: number;
  conversionRate: number;
  lastUpdate: string;
}

const PageData: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PageDataRecord[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pageType, setPageType] = useState<string>('all');

  // 模拟数据
  const mockData: PageDataRecord[] = [
    {
      id: '1',
      pageName: '首页',
      pageUrl: '/dashboard',
      pageType: '主要页面',
      visitCount: 12580,
      uniqueVisitors: 8920,
      avgStayTime: 180,
      bounceRate: 35.2,
      conversionRate: 12.8,
      lastUpdate: '2024-01-15 18:00:00'
    },
    {
      id: '2',
      pageName: '用户管理',
      pageUrl: '/users',
      pageType: '管理页面',
      visitCount: 3420,
      uniqueVisitors: 2100,
      avgStayTime: 240,
      bounceRate: 28.5,
      conversionRate: 8.5,
      lastUpdate: '2024-01-15 18:00:00'
    },
    {
      id: '3',
      pageName: '标签管理',
      pageUrl: '/tags',
      pageType: '功能页面',
      visitCount: 5680,
      uniqueVisitors: 4200,
      avgStayTime: 165,
      bounceRate: 42.1,
      conversionRate: 15.2,
      lastUpdate: '2024-01-15 18:00:00'
    },
    {
      id: '4',
      pageName: '数据监控',
      pageUrl: '/data-monitor',
      pageType: '监控页面',
      visitCount: 2890,
      uniqueVisitors: 1850,
      avgStayTime: 320,
      bounceRate: 25.8,
      conversionRate: 18.6,
      lastUpdate: '2024-01-15 18:00:00'
    }
  ];

  useEffect(() => {
    fetchData();
  }, [dateRange, pageType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(mockData);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const columns = [
    {
      title: '页面名称',
      dataIndex: 'pageName',
      key: 'pageName',
      render: (text: string, record: PageDataRecord) => (
        <Space>
          <span>{text}</span>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => window.open(record.pageUrl, '_blank')}
          >
            预览
          </Button>
        </Space>
      ),
    },
    {
      title: '页面类型',
      dataIndex: 'pageType',
      key: 'pageType',
    },
    {
      title: '访问次数',
      dataIndex: 'visitCount',
      key: 'visitCount',
      render: (count: number) => count.toLocaleString(),
      sorter: (a: PageDataRecord, b: PageDataRecord) => a.visitCount - b.visitCount,
    },
    {
      title: '独立访客',
      dataIndex: 'uniqueVisitors',
      key: 'uniqueVisitors',
      render: (count: number) => count.toLocaleString(),
      sorter: (a: PageDataRecord, b: PageDataRecord) => a.uniqueVisitors - b.uniqueVisitors,
    },
    {
      title: '平均停留时间',
      dataIndex: 'avgStayTime',
      key: 'avgStayTime',
      render: (time: number) => formatTime(time),
      sorter: (a: PageDataRecord, b: PageDataRecord) => a.avgStayTime - b.avgStayTime,
    },
    {
      title: '跳出率',
      dataIndex: 'bounceRate',
      key: 'bounceRate',
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate > 50 ? 'exception' : rate > 30 ? 'active' : 'success'}
          format={() => `${rate}%`}
        />
      ),
      sorter: (a: PageDataRecord, b: PageDataRecord) => a.bounceRate - b.bounceRate,
    },
    {
      title: '转化率',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate > 15 ? 'success' : rate > 10 ? 'active' : 'exception'}
          format={() => `${rate}%`}
        />
      ),
      sorter: (a: PageDataRecord, b: PageDataRecord) => a.conversionRate - b.conversionRate,
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
    },
  ];

  const handleExport = () => {
    message.success('导出功能开发中...');
  };

  const totalVisits = data.reduce((sum, record) => sum + record.visitCount, 0);
  const totalUniqueVisitors = data.reduce((sum, record) => sum + record.uniqueVisitors, 0);
  const avgBounceRate = data.length > 0 ? data.reduce((sum, record) => sum + record.bounceRate, 0) / data.length : 0;

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={
          <Space>
            <FileTextOutlined />
            页面数据监控
          </Space>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              placeholder={['开始日期', '结束日期']}
            />
            <Select
              value={pageType}
              onChange={setPageType}
              style={{ width: 120 }}
            >
              <Option value="all">全部类型</Option>
              <Option value="主要页面">主要页面</Option>
              <Option value="管理页面">管理页面</Option>
              <Option value="功能页面">功能页面</Option>
              <Option value="监控页面">监控页面</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Statistic
              title="总访问次数"
              value={totalVisits}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总独立访客"
              value={totalUniqueVisitors}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均跳出率"
              value={avgBounceRate.toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            total: data.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => t('common.pageRangeWithTotal', { start: range[0], end: range[1], total }),
          }}
        />
      </Card>
    </div>
  );
};

export default PageData;
