import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Select, Space, Statistic, Row, Col, message, Tag } from 'antd';
import { DownloadOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface PostLoanRecord {
  id: string;
  loanId: string;
  customerName: string;
  loanAmount: number;
  remainingAmount: number;
  loanStatus: string;
  riskLevel: string;
  overdueDays: number;
  nextPaymentDate: string;
  lastPaymentDate: string;
  contactStatus: string;
  collectionStatus: string;
}

const PostLoanData: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PostLoanRecord[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [loanStatus, setLoanStatus] = useState<string>('all');

  // 模拟数据
  const mockData: PostLoanRecord[] = [
    {
      id: '1',
      loanId: 'LOAN001',
      customerName: '张三',
      loanAmount: 100000,
      remainingAmount: 75000,
      loanStatus: '正常',
      riskLevel: '低风险',
      overdueDays: 0,
      nextPaymentDate: '2024-02-15',
      lastPaymentDate: '2024-01-15',
      contactStatus: '已联系',
      collectionStatus: '正常'
    },
    {
      id: '2',
      loanId: 'LOAN002',
      customerName: '李四',
      loanAmount: 50000,
      remainingAmount: 30000,
      loanStatus: '逾期',
      riskLevel: '中风险',
      overdueDays: 15,
      nextPaymentDate: '2024-01-30',
      lastPaymentDate: '2023-12-30',
      contactStatus: '联系中',
      collectionStatus: '催收中'
    },
    {
      id: '3',
      loanId: 'LOAN003',
      customerName: '王五',
      loanAmount: 200000,
      remainingAmount: 180000,
      loanStatus: '正常',
      riskLevel: '低风险',
      overdueDays: 0,
      nextPaymentDate: '2024-02-20',
      lastPaymentDate: '2024-01-20',
      contactStatus: '已联系',
      collectionStatus: '正常'
    },
    {
      id: '4',
      loanId: 'LOAN004',
      customerName: '赵六',
      loanAmount: 80000,
      remainingAmount: 0,
      loanStatus: '已结清',
      riskLevel: '低风险',
      overdueDays: 0,
      nextPaymentDate: '-',
      lastPaymentDate: '2024-01-10',
      contactStatus: '已联系',
      collectionStatus: '已结清'
    },
    {
      id: '5',
      loanId: 'LOAN005',
      customerName: '孙七',
      loanAmount: 150000,
      remainingAmount: 120000,
      loanStatus: '逾期',
      riskLevel: '高风险',
      overdueDays: 45,
      nextPaymentDate: '2023-12-15',
      lastPaymentDate: '2023-11-15',
      contactStatus: '失联',
      collectionStatus: '法务处理'
    }
  ];

  useEffect(() => {
    fetchData();
  }, [dateRange, riskLevel, loanStatus]);

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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case '低风险': return 'green';
      case '中风险': return 'orange';
      case '高风险': return 'red';
      default: return 'default';
    }
  };

  const getLoanStatusColor = (status: string) => {
    switch (status) {
      case '正常': return 'green';
      case '逾期': return 'red';
      case '已结清': return 'blue';
      default: return 'default';
    }
  };

  const getCollectionStatusColor = (status: string) => {
    switch (status) {
      case '正常': return 'green';
      case '催收中': return 'orange';
      case '法务处理': return 'red';
      case '已结清': return 'blue';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: '贷款编号',
      dataIndex: 'loanId',
      key: 'loanId',
      width: 100,
    },
    {
      title: '客户姓名',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 100,
    },
    {
      title: '贷款金额',
      dataIndex: 'loanAmount',
      key: 'loanAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
      sorter: (a: PostLoanRecord, b: PostLoanRecord) => a.loanAmount - b.loanAmount,
    },
    {
      title: '剩余金额',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
      sorter: (a: PostLoanRecord, b: PostLoanRecord) => a.remainingAmount - b.remainingAmount,
    },
    {
      title: '贷款状态',
      dataIndex: 'loanStatus',
      key: 'loanStatus',
      render: (status: string) => (
        <Tag color={getLoanStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: string) => (
        <Tag color={getRiskLevelColor(level)}>
          {level}
        </Tag>
      ),
    },
    {
      title: '逾期天数',
      dataIndex: 'overdueDays',
      key: 'overdueDays',
      render: (days: number) => (
        <span style={{ color: days > 0 ? '#ff4d4f' : '#52c41a' }}>
          {days > 0 ? `${days}天` : '无逾期'}
        </span>
      ),
      sorter: (a: PostLoanRecord, b: PostLoanRecord) => a.overdueDays - b.overdueDays,
    },
    {
      title: '下次还款日',
      dataIndex: 'nextPaymentDate',
      key: 'nextPaymentDate',
    },
    {
      title: '最后还款日',
      dataIndex: 'lastPaymentDate',
      key: 'lastPaymentDate',
    },
    {
      title: '联系状态',
      dataIndex: 'contactStatus',
      key: 'contactStatus',
      render: (status: string) => (
        <Tag color={status === '已联系' ? 'green' : status === '联系中' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '催收状态',
      dataIndex: 'collectionStatus',
      key: 'collectionStatus',
      render: (status: string) => (
        <Tag color={getCollectionStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
  ];

  const handleExport = () => {
    message.success('导出功能开发中...');
  };

  const totalLoanAmount = data.reduce((sum, record) => sum + record.loanAmount, 0);
  const totalRemainingAmount = data.reduce((sum, record) => sum + record.remainingAmount, 0);
  const overdueCount = data.filter(record => record.overdueDays > 0).length;
  const highRiskCount = data.filter(record => record.riskLevel === '高风险').length;

  return (
    <div style={{ padding: '24px' }}>
      <Card
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              placeholder={['开始日期', '结束日期']}
            />
            <Select
              value={riskLevel}
              onChange={setRiskLevel}
              style={{ width: 120 }}
            >
              <Option value="all">全部风险</Option>
              <Option value="低风险">低风险</Option>
              <Option value="中风险">中风险</Option>
              <Option value="高风险">高风险</Option>
            </Select>
            <Select
              value={loanStatus}
              onChange={setLoanStatus}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="正常">正常</Option>
              <Option value="逾期">逾期</Option>
              <Option value="已结清">已结清</Option>
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
          <Col span={6}>
            <Statistic
              title="总贷款金额"
              value={totalLoanAmount}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="剩余贷款金额"
              value={totalRemainingAmount}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="逾期笔数"
              value={overdueCount}
              suffix={`/ ${data.length}`}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="高风险笔数"
              value={highRiskCount}
              suffix={`/ ${data.length}`}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>

        {overdueCount > 0 && (
          <Card 
            size="small" 
            style={{ marginBottom: 16, backgroundColor: '#fff2f0', borderColor: '#ffccc7' }}
          >
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                警告：当前有 {overdueCount} 笔贷款逾期，需要及时处理！
              </span>
            </Space>
          </Card>
        )}

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

export default PostLoanData;
