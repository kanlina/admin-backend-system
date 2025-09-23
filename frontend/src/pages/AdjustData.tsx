import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Select, Space, Statistic, Row, Col, message, Tag } from 'antd';
import { DownloadOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface AdjustRecord {
  id: string;
  adjustId: string;
  accountId: string;
  accountName: string;
  adjustType: string;
  originalAmount: number;
  adjustedAmount: number;
  adjustValue: number;
  adjustReason: string;
  status: string;
  adjustTime: string;
  operator: string;
  approvalStatus: string;
}

const AdjustData: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdjustRecord[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [adjustType, setAdjustType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  // 模拟数据
  const mockData: AdjustRecord[] = [
    {
      id: '1',
      adjustId: 'ADJ001',
      accountId: 'ACC001',
      accountName: '账户A001',
      adjustType: '余额调整',
      originalAmount: 100000,
      adjustedAmount: 105000,
      adjustValue: 5000,
      adjustReason: '利息计算调整',
      status: '已完成',
      adjustTime: '2024-01-15 10:30:00',
      operator: '张三',
      approvalStatus: '已审批'
    },
    {
      id: '2',
      adjustId: 'ADJ002',
      accountId: 'ACC002',
      accountName: '账户B002',
      adjustType: '手续费调整',
      originalAmount: 50000,
      adjustedAmount: 47000,
      adjustValue: -3000,
      adjustReason: '手续费减免',
      status: '处理中',
      adjustTime: '2024-01-15 14:20:00',
      operator: '李四',
      approvalStatus: '待审批'
    },
    {
      id: '3',
      adjustId: 'ADJ003',
      accountId: 'ACC003',
      accountName: '账户C003',
      adjustType: '汇率调整',
      originalAmount: 200000,
      adjustedAmount: 198000,
      adjustValue: -2000,
      adjustReason: '汇率变动调整',
      status: '已完成',
      adjustTime: '2024-01-15 16:45:00',
      operator: '王五',
      approvalStatus: '已审批'
    },
    {
      id: '4',
      adjustId: 'ADJ004',
      accountId: 'ACC004',
      accountName: '账户D004',
      adjustType: '罚息调整',
      originalAmount: 80000,
      adjustedAmount: 82000,
      adjustValue: 2000,
      adjustReason: '罚息计算错误修正',
      status: '已完成',
      adjustTime: '2024-01-15 18:10:00',
      operator: '赵六',
      approvalStatus: '已审批'
    },
    {
      id: '5',
      adjustId: 'ADJ005',
      accountId: 'ACC005',
      accountName: '账户E005',
      adjustType: '系统调整',
      originalAmount: 150000,
      adjustedAmount: 150000,
      adjustValue: 0,
      adjustReason: '系统数据同步',
      status: '失败',
      adjustTime: '2024-01-15 19:30:00',
      operator: '孙七',
      approvalStatus: '审批拒绝'
    }
  ];

  useEffect(() => {
    fetchData();
  }, [dateRange, adjustType, status]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成': return 'green';
      case '处理中': return 'blue';
      case '失败': return 'red';
      default: return 'default';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case '已审批': return 'green';
      case '待审批': return 'orange';
      case '审批拒绝': return 'red';
      default: return 'default';
    }
  };

  const getAdjustValueColor = (value: number) => {
    if (value > 0) return '#52c41a';
    if (value < 0) return '#ff4d4f';
    return '#999';
  };

  const columns = [
    {
      title: '调整编号',
      dataIndex: 'adjustId',
      key: 'adjustId',
      width: 100,
    },
    {
      title: '账户信息',
      key: 'accountInfo',
      render: (record: AdjustRecord) => (
        <div>
          <div>{record.accountName}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.accountId}</div>
        </div>
      ),
    },
    {
      title: '调整类型',
      dataIndex: 'adjustType',
      key: 'adjustType',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: '原始金额',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
      sorter: (a: AdjustRecord, b: AdjustRecord) => a.originalAmount - b.originalAmount,
    },
    {
      title: '调整后金额',
      dataIndex: 'adjustedAmount',
      key: 'adjustedAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
      sorter: (a: AdjustRecord, b: AdjustRecord) => a.adjustedAmount - b.adjustedAmount,
    },
    {
      title: '调整金额',
      dataIndex: 'adjustValue',
      key: 'adjustValue',
      render: (value: number) => (
        <span style={{ 
          color: getAdjustValueColor(value),
          fontWeight: 'bold'
        }}>
          {value > 0 ? '+' : ''}¥{value.toLocaleString()}
        </span>
      ),
      sorter: (a: AdjustRecord, b: AdjustRecord) => a.adjustValue - b.adjustValue,
    },
    {
      title: '调整原因',
      dataIndex: 'adjustReason',
      key: 'adjustReason',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      render: (status: string) => (
        <Tag color={getApprovalStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
    },
    {
      title: '调整时间',
      dataIndex: 'adjustTime',
      key: 'adjustTime',
    },
  ];

  const handleExport = () => {
    message.success('导出功能开发中...');
  };

  const totalAdjustValue = data.reduce((sum, record) => sum + record.adjustValue, 0);
  const completedCount = data.filter(record => record.status === '已完成').length;
  const pendingCount = data.filter(record => record.status === '处理中').length;
  const failedCount = data.filter(record => record.status === '失败').length;

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
              value={adjustType}
              onChange={setAdjustType}
              style={{ width: 120 }}
            >
              <Option value="all">全部类型</Option>
              <Option value="余额调整">余额调整</Option>
              <Option value="手续费调整">手续费调整</Option>
              <Option value="汇率调整">汇率调整</Option>
              <Option value="罚息调整">罚息调整</Option>
              <Option value="系统调整">系统调整</Option>
            </Select>
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="已完成">已完成</Option>
              <Option value="处理中">处理中</Option>
              <Option value="失败">失败</Option>
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
              title="总调整金额"
              value={totalAdjustValue}
              prefix="¥"
              valueStyle={{ color: totalAdjustValue > 0 ? '#3f8600' : totalAdjustValue < 0 ? '#ff4d4f' : '#999' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已完成"
              value={completedCount}
              suffix={`/ ${data.length}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="处理中"
              value={pendingCount}
              suffix={`/ ${data.length}`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="失败"
              value={failedCount}
              suffix={`/ ${data.length}`}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>

        {failedCount > 0 && (
          <Card 
            size="small" 
            style={{ marginBottom: 16, backgroundColor: '#fff2f0', borderColor: '#ffccc7' }}
          >
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                警告：当前有 {failedCount} 条调整记录失败，需要及时处理！
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

export default AdjustData;
