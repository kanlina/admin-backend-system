import React, { useEffect, useState } from 'react';
import { Card, DatePicker, Button, Space, Table, message } from 'antd';
import { EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { apiService } from '../services/api';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const { RangePicker } = DatePicker;

interface RawRecord {
  query_date: string;
  rating_level: number;
  user_count: number;
}

interface TableRecord {
  key: string;
  query_date: string;
  [rating: string]: number | string;
}

// 表格 0-5，折线 1-5
const tableLevels = [0, 1, 2, 3, 4, 5];
const chartLevels = [1, 2, 3, 4, 5];

const RatingData: React.FC = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<TableRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [showChart, setShowChart] = useState(false);

  const fetchData = async (isReset: boolean = false) => {
    setLoading(true);
    try {
      const params: any = {};
      const currentRange = isReset ? null : dateRange;
      if (currentRange && currentRange[0] && currentRange[1]) {
        params.startDate = currentRange[0].format('YYYY-MM-DD');
        params.endDate = currentRange[1].format('YYYY-MM-DD');
      }
      const res = await apiService.getRatingData(params);
      if (res.success) {
        const raw: RawRecord[] = res.data || [];
        // 转表格：按日期聚合
        const map: Record<string, TableRecord> = {};
        raw.forEach((r) => {
          const dateStr = dayjs(r.query_date).format('YYYY-MM-DD');
          if (!map[dateStr]) {
            map[dateStr] = { key: dateStr, query_date: dateStr } as TableRecord;
            tableLevels.forEach((lv) => (map[dateStr][`level_${lv}`] = 0));
          }
          map[dateStr][`level_${r.rating_level}`] = r.user_count;
        });
        const tableArr = Object.values(map).sort((a, b) => (a.query_date > b.query_date ? -1 : 1));
        setTableData(tableArr);

        // --- 修复：为保证图表数据连续，补全日期范围 --- 
        const cData: any[] = [];
        if (tableArr.length > 0) {
          // 确定一个完整的日期范围
          const allDates = tableArr.map(r => r.query_date);
          let minDate = dayjs(allDates.reduce((a, b) => a < b ? a : b));
          const maxDate = dayjs(allDates.reduce((a, b) => a > b ? a : b));

          // 遍历范围内的每一天
          while (minDate.isBefore(maxDate) || minDate.isSame(maxDate)) {
            const dateStr = minDate.format('YYYY-MM-DD');
            const tableRow = map[dateStr]; // 从 map 中查找当天数据

            chartLevels.forEach((lv) => {
              cData.push({
                date: dateStr,
                category: `评分 ${lv}`,
                value: tableRow ? (tableRow[`level_${lv}`] ?? 0) : 0, // 如果当天没数据，则为0
              });
            });
            minDate = minDate.add(1, 'day');
          }
        }
        setChartData(cData);
      } else {
        message.error(res.message || 'Failed');
      }
    } catch (e) {
      console.error(e);
      message.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    {
      title: t('common.date'),
      dataIndex: 'query_date',
      key: 'query_date',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    ...tableLevels.map((lv) => ({
      title: `${lv}分`,
      dataIndex: `level_${lv}`,
      key: `level_${lv}`,
      render: (v: number) => v ?? 0,
    })),
  ];

  const downloadData = () => {
    try {
      if (tableData.length === 0) {
        message.warning('没有数据可下载');
        return;
      }

      // 构建表头
      const headers = ['日期', ...tableLevels.map(lv => `${lv}分`)];

      // 构建数据行
      const csvRows = tableData.map(item => {
        const row = [item.query_date];
        tableLevels.forEach(lv => {
          row.push(String(item[`level_${lv}`] ?? 0));
        });
        return row.join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `评分数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('数据下载成功');
    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败，请稍后再试');
    }
  };

  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
    colorField: 'category',
    smooth: false,
    yAxis: {
      title: {
        text: '人数',
        position: 'end',
      },
    },
    tooltip: false,
    xAxis: {
      label: {
        formatter: (v: string) => dayjs(v).format('MM-DD'),
        autoRotate: false,
      },
    },
    color: ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E8684A', '#9270CA'],
    legend: { position: 'right' },
  } as const;

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker 
            value={dateRange}
            onChange={(d) => setDateRange(d as any)}
          />
          <Button type="primary" onClick={() => fetchData()}> {t('common.confirm')} </Button>
          <Button onClick={() => { setDateRange(null); fetchData(true); }}> {t('common.reset')} </Button>
        </Space>
      </Card>

      {showChart ? (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('navigation.ratingData')}</span>
              <Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => setShowChart(false)}
                  title="隐藏图表"
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title="下载数据"
                  disabled={tableData.length === 0}
                />
              </Space>
            </div>
          }
          bordered 
          style={{ marginBottom: 16 }}
        >
          <div style={{ height: 400, padding: '10px 0' }}>
            {chartData.length > 0 ? (
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
                暂无数据
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>趋势分析（已隐藏）</span>
              <Space>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => setShowChart(true)}
                  title="显示图表"
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title="下载数据"
                  disabled={tableData.length === 0}
                />
              </Space>
            </div>
          }
          bordered 
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
            图表已隐藏，点击"显示图表"按钮可重新显示
          </div>
        </Card>
      )}

      <Card bordered style={{ border: '1px solid rgb(39, 38, 38)' }}>
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={{ pageSize: 5, showSizeChanger: true }}
          rowKey="key"
          scroll={{ x: 'max-content' }}
          bordered
        />
      </Card>
    </div>
  );
};

export default RatingData;

