import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, DatePicker, Space, message, Modal, Checkbox, Select } from 'antd';
import { EyeOutlined, DownloadOutlined, ReloadOutlined, SettingOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, PlusOutlined, FunnelPlotOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

const { RangePicker } = DatePicker;

type DataSource = 'adjust' | 'appsflyer';

interface SelectedItem {
  type: 'event' | 'funnel';
  name: string; // 对于事件就是事件名，对于漏斗是"event1/event2"
  event1?: string; // 漏斗的第一个事件
  event2?: string; // 漏斗的第二个事件
}

const SELECTED_EVENTS_STORAGE_KEY = 'attribution_selected_items_v4';

const AdjustData: React.FC = () => {
  const { t } = useTranslation();
  const [dataSource, setDataSource] = useState<DataSource>('appsflyer');
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [allEventNames, setAllEventNames] = useState<Record<DataSource, string[]>>({
    adjust: [],
    appsflyer: []
  });
  const [selectedItems, setSelectedItems] = useState<Record<DataSource, SelectedItem[]>>({
    adjust: [],
    appsflyer: []
  });
  
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [showChart, setShowChart] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  
  // 漏斗选择器状态
  const [funnelEvent1, setFunnelEvent1] = useState<string | undefined>(undefined);
  const [funnelEvent2, setFunnelEvent2] = useState<string | undefined>(undefined);
  
  // 筛选条件状态（仅用于回调数据）
  const [allAppNames, setAllAppNames] = useState<string[]>([]);
  const [allMediaSources, setAllMediaSources] = useState<string[]>([]);
  const [selectedAppName, setSelectedAppName] = useState<string | undefined>(undefined);
  const [selectedMediaSource, setSelectedMediaSource] = useState<string | undefined>(undefined);
  
  const currentItems = selectedItems[dataSource];
  const currentAllEvents = allEventNames[dataSource];
  
  // 从 selectedItems 提取纯事件名称列表（用于API请求）
  const currentEvents = useMemo(() => {
    const eventSet = new Set<string>();
    currentItems.forEach(item => {
      if (item.type === 'event') {
        eventSet.add(item.name);
      } else if (item.type === 'funnel' && item.event1 && item.event2) {
        eventSet.add(item.event1);
        eventSet.add(item.event2);
      }
    });
    return Array.from(eventSet);
  }, [currentItems]);

  useEffect(() => {
    loadAllEventNames('adjust');
    loadAllEventNames('appsflyer');
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [appNamesRes, mediaSourcesRes] = await Promise.all([
        apiService.getAttributionAppNames(),
        apiService.getAttributionMediaSources()
      ]);
      
      if (appNamesRes.success && appNamesRes.data) {
        setAllAppNames(appNamesRes.data);
      }
      if (mediaSourcesRes.success && mediaSourcesRes.data) {
        setAllMediaSources(mediaSourcesRes.data);
      }
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  useEffect(() => {
    if (currentEvents.length > 0) {
    fetchData();
    }
  }, [pagination.current, pagination.pageSize, dataSource]);

  const loadAllEventNames = async (source: DataSource) => {
    try {
      const response = await apiService.getAttributionEventNames(source);
      
      if (response.success && response.data) {
        const events = response.data || [];
        setAllEventNames(prev => ({ ...prev, [source]: events }));
        
        const storageKey = `${SELECTED_EVENTS_STORAGE_KEY}_${source}`;
        const savedSelection = localStorage.getItem(storageKey);
        
        if (savedSelection) {
          try {
            const parsed = JSON.parse(savedSelection);
            const validSelection = parsed.filter((item: SelectedItem) => {
              if (item.type === 'event') {
                return events.includes(item.name);
              } else if (item.type === 'funnel') {
                return item.event1 && item.event2 && events.includes(item.event1) && events.includes(item.event2);
              }
              return false;
            });
            const defaultItems = validSelection.length > 0 ? validSelection : events.slice(0, 5).map(e => ({ type: 'event' as const, name: e }));
            setSelectedItems(prev => ({ ...prev, [source]: defaultItems }));
          } catch {
            setSelectedItems(prev => ({ ...prev, [source]: events.slice(0, 5).map(e => ({ type: 'event' as const, name: e })) }));
          }
        } else {
          setSelectedItems(prev => ({ ...prev, [source]: events.slice(0, 5).map(e => ({ type: 'event' as const, name: e })) }));
        }
      }
    } catch (error) {
      console.error(`加载 ${source} 事件类型失败:`, error);
    }
  };

  const saveSelectedItems = (items: SelectedItem[]) => {
    const storageKey = `${SELECTED_EVENTS_STORAGE_KEY}_${dataSource}`;
    localStorage.setItem(storageKey, JSON.stringify(items));
    setSelectedItems(prev => ({ ...prev, [dataSource]: items }));
  };

  const fetchData = async (resetPagination = false) => {
    if (currentEvents.length === 0) {
      console.log('⚠️ 没有选择任何事件，跳过数据查询');
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        page: resetPagination ? 1 : pagination.current,
        pageSize: pagination.pageSize,
        dataSource: dataSource
      };
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      // 添加筛选条件（仅回调数据源）
      if (dataSource === 'appsflyer') {
        if (selectedAppName) params.appName = selectedAppName;
        if (selectedMediaSource) params.mediaSource = selectedMediaSource;
      }

      console.log('📊 开始查询归因数据，参数:', params, '已选事件:', currentEvents);
      const response = await apiService.getAttributionData(params);
      
      console.log('📥 API响应:', {
        success: response.success,
        dataType: typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
        data: response.data,
        pagination: response.pagination,
        eventNames: (response as any).eventNames
      });
      
      if (response.success && response.data && response.pagination) {
        const formattedData = response.data.map((item: any, index: number) => ({
          id: ((response.pagination!.page - 1) * response.pagination!.limit + index + 1).toString(),
          ...item
        }));
        
        console.log('✅ 格式化后的数据:', formattedData.slice(0, 2));
        
        setData(formattedData);
        setPagination({
          current: response.pagination.page,
          pageSize: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages
        });
        
        message.success(`数据加载成功，共 ${formattedData.length} 条记录`);
      } else {
        console.error('❌ API响应格式错误:', response);
        message.error('数据格式错误');
        setData([]);
      }
    } catch (error) {
      console.error('API请求错误:', error);
      message.error('网络请求失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    if (currentEvents.length === 0) return;

    setChartLoading(true);
    try {
      const params: any = { dataSource: dataSource };
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      } else {
        const now = dayjs();
        params.startDate = now.startOf('month').format('YYYY-MM-DD');
        params.endDate = now.endOf('month').format('YYYY-MM-DD');
      }
      
      // 添加筛选条件（仅回调数据源）
      if (dataSource === 'appsflyer') {
        if (selectedAppName) params.appName = selectedAppName;
        if (selectedMediaSource) params.mediaSource = selectedMediaSource;
      }

      const response = await apiService.getAttributionChartData(params);
      
      if (response.success && response.data) {
        setChartData((response.data as any).data || response.data || []);
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

  const downloadData = () => {
    try {
      if (chartData.length === 0) {
        message.warning('暂无数据可下载');
        return;
      }

      const headers = ['日期', ...currentEvents];
      const csvRows = chartData.map(item => {
        const row = [item.query_date];
        currentEvents.forEach(eventName => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          row.push(item[`event_${sanitizedName}`] || 0);
        });
        return row.join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const sourceName = dataSource === 'adjust' ? '上报' : '回调';
      link.setAttribute('download', `归因数据_${sourceName}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
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

  const refreshChart = async () => {
    await fetchChartData();
    message.success(t('attributionData.chartControls.refreshChart'));
  };

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const columns = useMemo(() => {
    const baseColumns: any[] = [
      {
        title: t('attributionData.rowNumber'),
        key: 'rowNumber',
        width: 80,
        fixed: 'left' as const,
        render: (_: any, __: any, index: number) => {
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
        sorter: (a: any, b: any) => {
          return dayjs(a.query_date).valueOf() - dayjs(b.query_date).valueOf();
        },
      },
    ];

    // 按照用户排序生成列
    const itemColumns = currentItems.map(item => {
      if (item.type === 'event') {
        const sanitizedName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
        const fieldName = `event_${sanitizedName}`;
        
        return {
          title: item.name,
          dataIndex: fieldName,
          key: fieldName,
          render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
          sorter: (a: any, b: any) => (a[fieldName] || 0) - (b[fieldName] || 0),
        };
      } else {
        // 漏斗列（分组列）
        const sanitized1 = item.event1!.replace(/[^a-zA-Z0-9_]/g, '_');
        const sanitized2 = item.event2!.replace(/[^a-zA-Z0-9_]/g, '_');
        const field1 = `event_${sanitized1}`;
        const field2 = `event_${sanitized2}`;
        
        return {
          title: <span><FunnelPlotOutlined /> {item.event1} → {item.event2}</span>,
          key: `funnel_${sanitized1}_${sanitized2}`,
          children: [
            {
              title: item.event1,
              dataIndex: field1,
              key: `${field1}_in_funnel`,
              width: 100,
              render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
            },
            {
              title: item.event2,
              dataIndex: field2,
              key: `${field2}_in_funnel`,
              width: 100,
              render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
            },
            {
              title: '转化率',
              key: `conversion_${sanitized1}_${sanitized2}`,
              width: 90,
              render: (record: any) => {
                const val1 = record[field1] || 0;
                const val2 = record[field2] || 0;
                if (val1 === 0) return <span style={{ color: '#999' }}>-</span>;
                const rate = (val2 / val1 * 100).toFixed(2);
                return <span style={{ color: '#1890ff', fontWeight: 500 }}>{rate}%</span>;
              },
            },
          ],
        };
      }
    });

    return [...baseColumns, ...itemColumns];
  }, [currentItems, pagination, t]);

  const transformedChartData = useMemo(() => {
    return chartData
      .sort((a, b) => new Date(a.query_date).getTime() - new Date(b.query_date).getTime())
      .flatMap(item => {
        return currentEvents.map(eventName => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          const value = Number(item[`event_${sanitizedName}`]) || 0;
          
          return {
            date: item.query_date,
            category: eventName,
            value: value
          };
        });
      });
  }, [chartData, currentEvents]);

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
        tickCount: Math.min(Math.max(transformedChartData.length / 6, 3), 15),
        range: [0, 1],
      },
      value: {
        nice: true,
        min: 0,
        max: transformedChartData.length > 0 ? Math.max(...transformedChartData.map(d => d.value)) * 1.1 : 100,
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

  const handleEventToggle = (eventName: string) => {
    const isSelected = currentItems.some(item => item.type === 'event' && item.name === eventName);
    
    if (isSelected) {
      const newItems = currentItems.filter(item => !(item.type === 'event' && item.name === eventName));
      saveSelectedItems(newItems);
    } else {
      const newItems = [...currentItems, { type: 'event' as const, name: eventName }];
      saveSelectedItems(newItems);
    }
  };

  const addFunnel = () => {
    if (!funnelEvent1 || !funnelEvent2) {
      message.warning('请选择两个事件');
      return;
    }
    if (funnelEvent1 === funnelEvent2) {
      message.warning('请选择不同的事件');
      return;
    }
    
    const funnelName = `${funnelEvent1} → ${funnelEvent2}`;
    const alreadyExists = currentItems.some(item => 
      item.type === 'funnel' && item.event1 === funnelEvent1 && item.event2 === funnelEvent2
    );
    
    if (alreadyExists) {
      message.warning('该漏斗已存在');
      return;
    }
    
    const newItem: SelectedItem = {
      type: 'funnel',
      name: funnelName,
      event1: funnelEvent1,
      event2: funnelEvent2
    };
    
    saveSelectedItems([...currentItems, newItem]);
    setFunnelEvent1(undefined);
    setFunnelEvent2(undefined);
    message.success('漏斗已添加');
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...currentItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    saveSelectedItems(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index >= currentItems.length - 1) return;
    const newItems = [...currentItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    saveSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = currentItems.filter((_, i) => i !== index);
    saveSelectedItems(newItems);
  };

  const applySettings = async () => {
    setSettingsVisible(false);
    await fetchData(true);
    if (showChart) await fetchChartData();
    message.success('设置已应用');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 'bold', color: '#333' }}>数据源：</span>
          <Button.Group>
            <Button
              type={dataSource === 'appsflyer' ? 'primary' : 'default'}
              onClick={() => handleDataSourceChange('appsflyer')}
              style={{ 
                background: dataSource === 'appsflyer' ? '#52c41a' : undefined,
                borderColor: dataSource === 'appsflyer' ? '#52c41a' : undefined,
                fontWeight: dataSource === 'appsflyer' ? 600 : 400
              }}
            >
              回调
            </Button>
            <Button
              type={dataSource === 'adjust' ? 'primary' : 'default'}
              onClick={() => handleDataSourceChange('adjust')}
              style={{ 
                background: dataSource === 'adjust' ? '#1890ff' : undefined,
                borderColor: dataSource === 'adjust' ? '#1890ff' : undefined,
                fontWeight: dataSource === 'adjust' ? 600 : 400
              }}
            >
              上报
            </Button>
          </Button.Group>
          <span style={{ fontWeight: 'bold', color: '#333' }}>{t('attributionData.dateRange')}：</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            placeholder={[t('attributionData.startDate'), t('attributionData.endDate')]}
          />
          <Button
            type="primary"
            onClick={async () => {
              console.log('确认筛选，开始查询数据...');
              const promises = [fetchData(true)];
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
          <Button 
            icon={<SettingOutlined />}
            onClick={() => setSettingsVisible(true)}
          >
            选择事件
          </Button>
          {dataSource === 'appsflyer' && (
            <Button 
              icon={<PlusOutlined />}
              onClick={() => setFilterVisible(true)}
            >
              筛选条件
            </Button>
          )}
          </Space>
      </Card>

      {/* 折线图区域 */}
      {showChart && (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('attributionData.chartTitle')}</span>
              <Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => setShowChart(false)}
                  title={t('attributionData.chartControls.hideChart')}
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title={t('attributionData.chartControls.downloadData')}
                  disabled={chartData.length === 0}
                />
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={refreshChart}
                  title={t('attributionData.chartControls.refreshChart')}
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
                {t('attributionData.noData')}
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
              <span>{t('attributionData.chartControls.chartHiddenTitle')}</span>
              <Space>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={async () => {
                    setShowChart(true);
                    await fetchChartData();
                  }}
                  title={t('attributionData.chartControls.showChart')}
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadData}
                  title={t('attributionData.chartControls.downloadData')}
                  disabled={chartData.length === 0}
                />
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
            size="small" 
                  onClick={refreshChart}
                  title={t('attributionData.chartControls.refreshChart')}
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
            {t('attributionData.chartControls.chartHidden')}
          </div>
          </Card>
        )}

      {/* 数据表格区域 */}
      <Card title={t('attributionData.tableTitle')}>
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

      {/* 事件选择模态框 */}
      <Modal
        title="选择事件和配置漏斗"
        open={settingsVisible}
        onOk={applySettings}
        onCancel={() => setSettingsVisible(false)}
        width={800}
        okText="应用"
        cancelText="取消"
      >
        {/* 可用事件列表 */}
        <div style={{ marginBottom: 24 }}>
          <h4>可用事件列表：</h4>
          <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
            <Space wrap>
              {currentAllEvents.map(eventName => {
                const isSelected = currentItems.some(item => item.type === 'event' && item.name === eventName);
                return (
                  <Checkbox
                    key={eventName}
                    checked={isSelected}
                    onChange={() => handleEventToggle(eventName)}
                  >
                    {eventName}
                  </Checkbox>
                );
              })}
            </Space>
          </div>
        </div>

        {/* 添加漏斗 */}
        <div style={{ marginBottom: 24, padding: '16px', background: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>
            <FunnelPlotOutlined /> 添加转化漏斗
          </h4>
          <Space>
            <Select
              placeholder="选择第一个事件"
              value={funnelEvent1}
              onChange={setFunnelEvent1}
              style={{ width: 200 }}
              allowClear
            >
              {currentAllEvents.map(event => (
                <Select.Option key={event} value={event}>
                  {event}
                </Select.Option>
              ))}
            </Select>
            <span style={{ color: '#666' }}>/</span>
            <Select
              placeholder="选择第二个事件"
              value={funnelEvent2}
              onChange={setFunnelEvent2}
              style={{ width: 200 }}
              allowClear
            >
              {currentAllEvents.map(event => (
                <Select.Option key={event} value={event}>
                  {event}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addFunnel}
              disabled={!funnelEvent1 || !funnelEvent2}
            >
              添加漏斗
            </Button>
          </Space>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            💡 漏斗将展示转化率，计算方式为：事件2/事件1
          </div>
        </div>

        {/* 已选择的事件和漏斗 */}
        <div>
          <h4>已选择的项目（{currentItems.length}个，按此顺序显示）：</h4>
          {currentItems.length === 0 ? (
            <div style={{ color: '#999', padding: '20px', textAlign: 'center', background: '#fafafa', borderRadius: '4px' }}>
              请从上方选择事件或添加漏斗
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {currentItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    marginBottom: '8px',
                    background: item.type === 'funnel' ? '#fff7e6' : '#f5f5f5',
                    borderRadius: '4px',
                    border: `1px solid ${item.type === 'funnel' ? '#ffd591' : '#d9d9d9'}`
                  }}
                >
                  <Space>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      background: item.type === 'funnel' ? '#fa8c16' : '#1890ff',
                      color: 'white',
                      borderRadius: '50%',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </span>
                    {item.type === 'funnel' ? (
                      <span style={{ fontWeight: 500 }}>
                        <FunnelPlotOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
                        {item.event1}/{item.event2}
                      </span>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                    )}
                  </Space>
                  <Space>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      onClick={() => moveItemUp(index)}
                      disabled={index === 0}
                      title="上移"
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => moveItemDown(index)}
                      disabled={index === currentItems.length - 1}
                      title="下移"
                    />
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => removeItem(index)}
                      title="移除"
                    />
                  </Space>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* 筛选条件模态框（仅回调数据源） */}
      <Modal
        title="筛选条件"
        open={filterVisible}
        onOk={async () => {
          setFilterVisible(false);
          await fetchData(true);
          if (showChart) await fetchChartData();
          message.success('筛选条件已应用');
        }}
        onCancel={() => setFilterVisible(false)}
        width={600}
        okText="应用"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>应用名称（App Name）</div>
            <Select
              placeholder="全部应用"
              value={selectedAppName}
              onChange={setSelectedAppName}
              style={{ width: '100%' }}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children;
                return String(label || '').toLowerCase().includes(input.toLowerCase());
              }}
            >
              {allAppNames.map(name => (
                <Select.Option key={name} value={name}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>媒体来源（Media Source）</div>
            <Select
              placeholder="全部媒体来源"
              value={selectedMediaSource}
              onChange={setSelectedMediaSource}
              style={{ width: '100%' }}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children;
                return String(label || '').toLowerCase().includes(input.toLowerCase());
              }}
            >
              {allMediaSources.map(source => (
                <Select.Option key={source} value={source}>
                  {source}
                </Select.Option>
              ))}
            </Select>
          </div>

          {(selectedAppName || selectedMediaSource) && (
            <div style={{ 
              padding: '12px', 
              background: '#f0f5ff', 
              borderRadius: '4px',
              border: '1px solid #adc6ff'
            }}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>当前筛选条件：</div>
              <Space wrap>
                {selectedAppName && (
                  <span style={{ fontSize: '13px', color: '#1890ff' }}>
                    应用: <strong>{selectedAppName}</strong>
                  </span>
                )}
                {selectedMediaSource && (
                  <span style={{ fontSize: '13px', color: '#1890ff' }}>
                    媒体: <strong>{selectedMediaSource}</strong>
                  </span>
                )}
              </Space>
              <div style={{ marginTop: 8 }}>
                <Button 
                  size="small" 
                  danger
                  onClick={() => {
                    setSelectedAppName(undefined);
                    setSelectedMediaSource(undefined);
                    message.success('已清除筛选条件');
                  }}
                >
                  清除所有筛选
                </Button>
              </div>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default AdjustData;
