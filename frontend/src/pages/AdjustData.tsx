import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, DatePicker, Space, message, Modal, Checkbox, Select, Tag } from 'antd';
import { EyeOutlined, DownloadOutlined, SettingOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, PlusOutlined, FunnelPlotOutlined } from '@ant-design/icons';
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
  
  const [data, setData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]); // 存储所有数据用于图表和下载
  
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
  const [allAppIds, setAllAppIds] = useState<string[]>([]);
  const [allMediaSources, setAllMediaSources] = useState<string[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [selectedMediaSources, setSelectedMediaSources] = useState<string[]>([]); // 改为数组支持多选
  
  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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
      const [appIdsRes, mediaSourcesRes] = await Promise.all([
        apiService.getAttributionAppIds(),
        apiService.getAttributionMediaSources()
      ]);
      
      if (appIdsRes.success && appIdsRes.data) {
        setAllAppIds(appIdsRes.data);
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
      setAllData([]);
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
        if (selectedAppId) params.appId = selectedAppId;
        if (selectedMediaSources && selectedMediaSources.length > 0) {
          params.mediaSource = selectedMediaSources.join(',');
        }
      }

      // 同时获取图表所需的全部数据
      const allDataParams: any = { ...params, page: 1, pageSize: 1000 };

      console.log('📊 开始查询归因数据，参数:', params, '已选事件:', currentEvents);
      
      // 并行请求表格数据和全部数据
      const [response, allResponse] = await Promise.all([
        apiService.getAttributionData(params),
        apiService.getAttributionData(allDataParams)
      ]);
      
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

        // 保存全部数据用于图表和下载
        if (allResponse.success && allResponse.data) {
          const formattedAllData = allResponse.data.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            ...item
          }));
          setAllData(formattedAllData);
        }
        
        message.success(t('attributionData.dataLoaded', { count: formattedData.length }));
      } else {
        console.error('❌ API响应格式错误:', response);
        message.error(t('attributionData.dataFormatError'));
        setData([]);
        setAllData([]);
      }
    } catch (error) {
      console.error('API请求错误:', error);
      message.error(t('attributionData.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const downloadData = () => {
    try {
      if (allData.length === 0) {
        message.warning(t('attributionData.noDataToDownload'));
        return;
      }

      // 构建表头（包含事件和漏斗，按照currentItems的顺序）
      const headers = [t('attributionData.downloadHeaders.date')];
      if (dataSource === 'appsflyer' && selectedMediaSources.length > 0) {
        headers.push(t('attributionData.mediaSource'));
      }
      
      // 添加所有列（事件和漏斗）
      currentItems.forEach(item => {
        if (item.type === 'event') {
          headers.push(item.name);
        } else if (item.type === 'funnel' && item.event1 && item.event2) {
          // 漏斗列只显示转化率
          headers.push(`${item.event1} → ${item.event2}`);
        }
      });

      // 构建数据行
      const csvRows = allData.map(item => {
        const row = [item.query_date];
        if (dataSource === 'appsflyer' && selectedMediaSources.length > 0) {
          row.push(item.media_source || '');
        }
        
        currentItems.forEach(selectedItem => {
          if (selectedItem.type === 'event') {
            // 普通事件：输出数量
            const sanitizedName = selectedItem.name.replace(/[^a-zA-Z0-9_]/g, '_');
            row.push(item[`event_${sanitizedName}`] || 0);
          } else if (selectedItem.type === 'funnel' && selectedItem.event1 && selectedItem.event2) {
            // 漏斗：只输出转化率
            const sanitizedName1 = selectedItem.event1.replace(/[^a-zA-Z0-9_]/g, '_');
            const sanitizedName2 = selectedItem.event2.replace(/[^a-zA-Z0-9_]/g, '_');
            const val1 = Number(item[`event_${sanitizedName1}`]) || 0;
            const val2 = Number(item[`event_${sanitizedName2}`]) || 0;
            const conversionRate = val1 > 0 ? ((val2 / val1) * 100).toFixed(2) : '0.00';
            
            row.push(`${conversionRate}%`); // 只输出转化率
          }
        });
        
        return row.join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const sourceName = dataSource === 'adjust' ? t('attributionData.reported') : t('attributionData.callback');
      link.setAttribute('download', `${t('attributionData.title')}_${sourceName}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(t('attributionData.downloadSuccess'));
    } catch (error) {
      console.error('下载数据失败:', error);
      message.error(t('attributionData.downloadError'));
    }
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
        width: 140,
        fixed: 'left' as const,
        render: (date: string, _: any, index: number) => {
          if (!date) return '-';
          
          // 判断是否是该日期的第一行
          const isFirstOfDate = index === 0 || data[index - 1]?.query_date !== date;
          
          return (
            <div style={{ 
              fontWeight: isFirstOfDate ? 600 : 400,
              fontSize: '13px',
              color: isFirstOfDate ? '#262626' : '#8c8c8c'
            }}>
              {isFirstOfDate ? dayjs(date).format('YYYY-MM-DD') : ''}
        </div>
          );
        },
        sorter: (a: any, b: any) => {
          return dayjs(a.query_date).valueOf() - dayjs(b.query_date).valueOf();
        },
      },
    ];

    // 如果是回调数据源且选择了媒体渠道，添加媒体渠道列
    if (dataSource === 'appsflyer' && selectedMediaSources.length > 0) {
      baseColumns.push({
        title: t('attributionData.mediaSource'),
        dataIndex: 'media_source',
        key: 'media_source',
        width: 180,
        fixed: 'left' as const,
        render: (source: string) => (
        <span style={{ 
            fontSize: '13px',
            fontWeight: 500,
            color: '#262626'
        }}>
            {source}
        </span>
      ),
        filters: selectedMediaSources.map(s => ({ text: s, value: s })),
        onFilter: (value: any, record: any) => record.media_source === value,
      });
    }

    // 按照用户排序生成列
    const itemColumns = currentItems.map(item => {
      if (item.type === 'event') {
        const sanitizedName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
        const fieldName = `event_${sanitizedName}`;
        
        return {
          title: item.name,
          dataIndex: fieldName,
          key: fieldName,
          width: isMobile ? 90 : 120,
          align: 'right' as const,
          render: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '0',
          sorter: (a: any, b: any) => (a[fieldName] || 0) - (b[fieldName] || 0),
        };
      } else {
        // 漏斗列（只显示转化率，不重复显示事件）
        const sanitized1 = item.event1!.replace(/[^a-zA-Z0-9_]/g, '_');
        const sanitized2 = item.event2!.replace(/[^a-zA-Z0-9_]/g, '_');
        const field1 = `event_${sanitized1}`;
        const field2 = `event_${sanitized2}`;
        
        return {
          title: isMobile ? <span><FunnelPlotOutlined /></span> : <span><FunnelPlotOutlined /> {item.event1} → {item.event2}</span>,
          key: `conversion_${sanitized1}_${sanitized2}`,
          width: isMobile ? 80 : 140,
          align: 'center' as const,
          render: (record: any) => {
            const val1 = record[field1] || 0;
            const val2 = record[field2] || 0;
            if (val1 === 0) return <span style={{ color: '#999' }}>-</span>;
            const rate = (val2 / val1 * 100).toFixed(2);
            return <span style={{ color: '#1890ff', fontWeight: 500 }}>{rate}%</span>;
          },
          sorter: (a: any, b: any) => {
            const rate1 = (a[field1] || 0) > 0 ? ((a[field2] || 0) / (a[field1] || 0)) : 0;
            const rate2 = (b[field1] || 0) > 0 ? ((b[field2] || 0) / (b[field1] || 0)) : 0;
            return rate1 - rate2;
          },
        };
      }
    });

    return [...baseColumns, ...itemColumns];
  }, [currentItems, pagination, t, isMobile, dataSource, selectedMediaSources]);

  const transformedChartData = useMemo(() => {
    return allData
      .sort((a, b) => new Date(a.query_date).getTime() - new Date(b.query_date).getTime())
      .flatMap(item => {
        return currentEvents.map(eventName => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          const value = Number(item[`event_${sanitizedName}`]) || 0;
          
          // 如果有多个媒体渠道，在category中包含媒体渠道信息
          const category = (dataSource === 'appsflyer' && selectedMediaSources.length > 0 && item.media_source)
            ? `${item.media_source} - ${eventName}`
            : eventName;
          
          return {
            date: item.query_date,
            category: category,
            value: value
          };
        });
      });
  }, [allData, currentEvents, dataSource, selectedMediaSources]);

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
      message.warning(t('attributionData.funnelDescription'));
      return;
    }
    if (funnelEvent1 === funnelEvent2) {
      message.warning(t('attributionData.funnelDescription'));
      return;
    }
    
    const funnelName = `${funnelEvent1} → ${funnelEvent2}`;
    const alreadyExists = currentItems.some(item => 
      item.type === 'funnel' && item.event1 === funnelEvent1 && item.event2 === funnelEvent2
    );
    
    if (alreadyExists) {
      message.warning(t('attributionData.funnelDescription'));
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
    message.success(t('attributionData.funnelTitle'));
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
    message.success(t('attributionData.filterApplied'));
  };

  return (
    <div style={{ padding: isMobile ? '0' : '24px' }}>
      {/* 数据源选择和筛选区域 */}
      <Card style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* 第一行：数据源、日期、按钮 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: (dataSource === 'appsflyer' && (selectedAppId || selectedMediaSources.length > 0)) ? 16 : 0
        }}>
          <span style={{ fontWeight: 'bold', color: '#333' }}>{t('attributionData.dataSource')}：</span>
          <Button.Group>
            <Button
              type={dataSource === 'appsflyer' ? 'primary' : 'default'}
              onClick={() => handleDataSourceChange('appsflyer')}
              style={{ 
                background: dataSource === 'appsflyer' ? '#52c41a' : undefined,
                borderColor: dataSource === 'appsflyer' ? '#52c41a' : undefined,
                fontWeight: dataSource === 'appsflyer' ? 600 : 400,
                minWidth: '80px'
              }}
            >
              {t('attributionData.callback')}
            </Button>
            <Button
              type={dataSource === 'adjust' ? 'primary' : 'default'}
              onClick={() => handleDataSourceChange('adjust')}
              style={{ 
                background: dataSource === 'adjust' ? '#1890ff' : undefined,
                borderColor: dataSource === 'adjust' ? '#1890ff' : undefined,
                fontWeight: dataSource === 'adjust' ? 600 : 400,
                minWidth: '80px'
              }}
            >
              {t('attributionData.reported')}
            </Button>
          </Button.Group>
          
          <span style={{ fontWeight: 'bold', color: '#333' }}>{t('attributionData.dateRange')}：</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            placeholder={[t('attributionData.startDate'), t('attributionData.endDate')]}
            style={{ width: '240px' }}
          />
          
          <Button
            type="primary"
            onClick={async () => {
              console.log('确认筛选，开始查询数据...');
              await fetchData(true);
              message.success(t('attributionData.filterApplied'));
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
              message.success(t('attributionData.filterCleared'));
            }}
          >
            {t('common.reset')}
          </Button>
          <Button 
            icon={<SettingOutlined />}
            onClick={() => setSettingsVisible(true)}
          >
            {t('attributionData.selectEvents')}
          </Button>
          {dataSource === 'appsflyer' && (
            <Button 
              icon={<PlusOutlined />}
              onClick={() => setFilterVisible(true)}
              style={{ 
                background: '#f0f5ff',
                borderColor: '#91d5ff',
                color: '#1890ff'
              }}
            >
              {t('attributionData.filterConditions')}
            </Button>
          )}
        </div>

        {/* 第二行：筛选条件显示区域 */}
        {dataSource === 'appsflyer' && (selectedAppId || selectedMediaSources.length > 0) && (
          <div style={{ 
            padding: '12px 16px', 
            background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)', 
            borderRadius: '8px',
            border: '1px solid #91d5ff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                flex: 1
              }}>
                <span style={{ 
                  fontSize: '14px', 
                  color: '#1890ff', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: '#1890ff', 
                    borderRadius: '50%',
                    display: 'inline-block'
                  }}></span>
                  {t('attributionData.currentFilter')}：
                </span>
                <Space wrap size="small">
                  {selectedAppId && (
                    <Tag 
                      color="purple" 
                      style={{ 
                        margin: 0,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: '#f9f0ff',
                        borderColor: '#9254de',
                        color: '#722ed1'
                      }}
                    >
                      app_id: {selectedAppId}
                    </Tag>
                  )}
                  {selectedMediaSources.map(source => (
                    <Tag 
                      key={source}
                      color="orange"
                      closable
                      onClose={() => {
                        const newSources = selectedMediaSources.filter(s => s !== source);
                        setSelectedMediaSources(newSources);
                        message.success(`已移除媒体渠道: ${source}`);
                      }}
                      style={{ 
                        margin: 0,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: '#fff7e6',
                        borderColor: '#ffa940',
                        color: '#d46b08'
                      }}
                    >
                      媒体: {source}
                    </Tag>
                  ))}
          </Space>
              </div>
              <Button 
                size="small" 
                type="link"
                danger
                onClick={() => {
                  setSelectedAppId(undefined);
                  setSelectedMediaSources([]);
                  message.success(t('attributionData.filterCleared'));
                }}
                style={{ padding: '0 8px', height: '24px', flexShrink: 0 }}
              >
                {t('attributionData.clearAll')}
              </Button>
            </div>
          </div>
        )}
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
                  onClick={() => {
                    setShowChart(true);
                  }}
                  title={t('attributionData.chartControls.showChart')}
                />
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
            size="small" 
                  onClick={downloadData}
                  title={t('attributionData.chartControls.downloadData')}
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
            {t('attributionData.chartControls.chartHidden')}
          </div>
          </Card>
        )}

      {/* 数据表格区域 */}
      <Card title={t('attributionData.tableTitle')}>
        <style>{`
          .date-group-even {
            background-color: #fafafa !important;
          }
          .date-group-odd {
            background-color: #ffffff !important;
          }
          .date-group-even:hover,
          .date-group-odd:hover {
            background-color: #e6f7ff !important;
          }
          .date-group-separator {
            border-top: 2px solid #d9d9d9 !important;
          }
        `}</style>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          rowClassName={(record: any, index: number) => {
            // 为同一天的数据添加相同的背景色
            const classes: string[] = [];
            
            if (dataSource === 'appsflyer' && selectedMediaSources.length > 0) {
              // 根据日期分组
              const dateIndex = data.findIndex(item => item.query_date === record.query_date);
              const dateGroupIndex = Math.floor(dateIndex / selectedMediaSources.length);
              classes.push(dateGroupIndex % 2 === 0 ? 'date-group-even' : 'date-group-odd');
              
              // 为每个日期组的第一行添加分隔线
              const isFirstOfDate = index === 0 || data[index - 1]?.query_date !== record.query_date;
              if (isFirstOfDate && index !== 0) {
                classes.push('date-group-separator');
              }
            } else {
              classes.push(index % 2 === 0 ? 'date-group-even' : 'date-group-odd');
            }
            
            return classes.join(' ');
          }}
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
          bordered
          size="middle"
        />
      </Card>

      {/* 事件选择模态框 */}
      <Modal
        title={t('attributionData.selectEvents')}
        open={settingsVisible}
        onOk={applySettings}
        onCancel={() => setSettingsVisible(false)}
        width={isMobile ? '100%' : 800}
        okText={t('attributionData.applyFilter')}
        cancelText={t('common.cancel')}
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
            <FunnelPlotOutlined /> {t('attributionData.funnelTitle')}
          </h4>
          <Space>
            <Select
              placeholder={t('attributionData.funnelEvent1')}
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
              placeholder={t('attributionData.funnelEvent2')}
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
          <h4>{t('attributionData.selectedItems')}（{currentItems.length}个，按此顺序显示）：</h4>
          {currentItems.length === 0 ? (
            <div style={{ color: '#999', padding: '20px', textAlign: 'center', background: '#fafafa', borderRadius: '4px' }}>
              {t('attributionData.selectEvents')}
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
                      title={t('common.previous')}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => moveItemDown(index)}
                      disabled={index === currentItems.length - 1}
                      title={t('common.next')}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => removeItem(index)}
                      title={t('common.delete')}
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
        title={t('attributionData.filterConditions')}
        open={filterVisible}
        onOk={async () => {
          setFilterVisible(false);
          await fetchData(true);
          message.success('筛选条件已应用');
        }}
        onCancel={() => setFilterVisible(false)}
        width={600}
        okText={t('attributionData.applyFilter')}
        cancelText={t('common.cancel')}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('attributionData.appId')}（app_id）</div>
            <Select
              placeholder={t('attributionData.allAppIds')}
              value={selectedAppId}
              onChange={setSelectedAppId}
              style={{ width: '100%' }}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children;
                return String(label || '').toLowerCase().includes(input.toLowerCase());
              }}
            >
              {allAppIds.map(id => (
                <Select.Option key={id} value={id}>
                  {id}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('attributionData.mediaSource')}（Media Source）</div>
            <Select
              mode="multiple"
              placeholder={t('attributionData.allMediaSources')}
              value={selectedMediaSources}
              onChange={setSelectedMediaSources}
              style={{ width: '100%' }}
              allowClear
              showSearch
              maxTagCount="responsive"
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

          {(selectedAppId || selectedMediaSources.length > 0) && (
            <div style={{ 
              padding: '12px', 
              background: '#f0f5ff', 
              borderRadius: '4px',
              border: '1px solid #adc6ff'
            }}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>当前筛选条件：</div>
              <Space wrap>
                {selectedAppId && (
                  <span style={{ fontSize: '13px', color: '#1890ff' }}>
                    app_id: <strong>{selectedAppId}</strong>
                  </span>
                )}
                {selectedMediaSources.length > 0 && (
                  <span style={{ fontSize: '13px', color: '#1890ff' }}>
                    媒体: <strong>{selectedMediaSources.join(', ')}</strong>
                  </span>
                )}
              </Space>
              <div style={{ marginTop: 8 }}>
                <Button 
                  size="small" 
                  danger
                  onClick={() => {
                    setSelectedAppId(undefined);
                    setSelectedMediaSources([]);
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
