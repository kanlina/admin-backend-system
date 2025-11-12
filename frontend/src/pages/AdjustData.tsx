import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { Card, Table, Button, DatePicker, Space, message, Modal, Checkbox, Select, Tag, Segmented, Spin } from 'antd';
import { EyeOutlined, DownloadOutlined, SettingOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, PlusOutlined, FunnelPlotOutlined, MenuOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { FavoriteAdSequence } from '../types';

const { RangePicker } = DatePicker;

type DataSource = 'adjust' | 'appsflyer';

interface SelectedItem {
  type: 'event' | 'funnel';
  name: string; // 对于事件就是事件名，对于漏斗是"event1/event2"
  event1?: string; // 漏斗的第一个事件
  event2?: string; // 漏斗的第二个事件
}

type PaginationState = {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

interface AdjustDataPageSnapshot {
  timestamp: number;
  userId?: string;
  dataSource: DataSource;
  dateRange: { start: string; end: string } | null;
  pagination: PaginationState;
  data: any[];
  allData: any[];
  selectedAppId?: string;
  selectedMediaSources: string[];
  selectedAdSequences: string[];
  selectedUserType?: string;
  mediaAdPairs: Array<{ id: string; media?: string; ad?: string[] }>;
  tableLayout: 'default' | 'transposed';
  showChart: boolean;
  allEventNames: Record<DataSource, string[]>;
  selectedItems: Record<DataSource, SelectedItem[]>;
  mediaToAdSeqs: Record<string, string[]>;
  favoriteAdSequences: Record<string, FavoriteAdSequence[]>;
  favoritesBaseline: Record<string, FavoriteAdSequence[]>;
  favoritesDirty: boolean;
}

let adjustDataPageSnapshot: AdjustDataPageSnapshot | null = null;

const SELECTED_EVENTS_STORAGE_KEY = 'attribution_selected_items_v4';
const QUERY_STATE_STORAGE_KEY = 'attribution_query_state_v1';
const DATA_CACHE_STORAGE_KEY = 'attribution_data_cache_v1';

const ResizableHeaderCell: React.FC<any> = ({ onResize, width, children, ...restProps }) => {
  if (!width) {
    return <th {...restProps}>{children}</th>;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="resizable-handle"
          onClick={(event) => {
            event.stopPropagation();
          }}
        />
      }
      onResize={onResize}
    >
      <th {...restProps}>{children}</th>
    </Resizable>
  );
};

const AdjustData: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dataSource, setDataSource] = useState<DataSource>('appsflyer');
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
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
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [showChart, setShowChart] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [filterConfirmLoading, setFilterConfirmLoading] = useState(false);
  const [applyFilterLoading, setApplyFilterLoading] = useState(false);
  const [mediaFilterLoading, setMediaFilterLoading] = useState(false);
  const [filtersLocked, setFiltersLocked] = useState(false);
  const [isRestoringFromCache, setIsRestoringFromCache] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimeoutNotifiedRef = useRef(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const favoritesSyncPromiseRef = useRef<Promise<boolean> | null>(null);
  const hasRestoredSnapshotRef = useRef(false);

  const restoreSnapshot = useCallback((snapshot: AdjustDataPageSnapshot) => {
    setDataSource(snapshot.dataSource);
    setDateRange(snapshot.dateRange ? [dayjs(snapshot.dateRange.start), dayjs(snapshot.dateRange.end)] : null);
    setPagination({ ...snapshot.pagination });
    setData(snapshot.data);
    setAllData(snapshot.allData);
    setSelectedAppId(snapshot.selectedAppId);
    setSelectedMediaSources([...(snapshot.selectedMediaSources || [])]);
    setSelectedAdSequences([...(snapshot.selectedAdSequences || [])]);
    setSelectedUserType(snapshot.selectedUserType);
    setMediaAdPairs((snapshot.mediaAdPairs || []).map(pair => ({ ...pair, ad: pair.ad ? [...pair.ad] : undefined })));
    setTableLayout(snapshot.tableLayout);
    setShowChart(snapshot.showChart);
    const adjustEvents = snapshot.allEventNames?.adjust || [];
    const appsflyerEvents = snapshot.allEventNames?.appsflyer || [];
    setAllEventNames({ adjust: [...adjustEvents], appsflyer: [...appsflyerEvents] });
    setSelectedItems({
      adjust: (snapshot.selectedItems.adjust || []).map(item => ({ ...item })),
      appsflyer: (snapshot.selectedItems.appsflyer || []).map(item => ({ ...item })),
    });
    setMediaToAdSeqs({ ...(snapshot.mediaToAdSeqs || {}) });
    setFavoriteAdSequences(JSON.parse(JSON.stringify(snapshot.favoriteAdSequences || {})));
    favoritesBaselineRef.current = JSON.parse(JSON.stringify(snapshot.favoritesBaseline || {}));
    favoritesDirtyRef.current = snapshot.favoritesDirty;
    setIsRestoringFromCache(false);
    setLoading(false);
  }, []);

  const handleColumnResize = useCallback(
    (columnKey: string) =>
      (_: React.SyntheticEvent<Element>, { size }: { size: { width: number } }) => {
        setColumnWidths(prev => ({
          ...prev,
          [columnKey]: size.width,
        }));
      },
    [],
  );

  const attachResizableProps = useCallback(
    (cols: any[]): any[] =>
      cols.map(col => {
        const colKey = String(col.key ?? col.dataIndex ?? '');
        const isLeaf = !col.children || col.children.length === 0;
        const baseWidth = isLeaf ? col.width ?? 120 : col.width;
        const width = columnWidths[colKey] ?? baseWidth;
        const nextCol: any = {
          ...col,
        };
        if (isLeaf && width) {
          nextCol.width = width;
        }
        if (col.children && col.children.length > 0) {
          nextCol.children = attachResizableProps(col.children);
        } else if (isLeaf && colKey) {
          nextCol.onHeaderCell = () => ({
            width: nextCol.width,
            onResize: handleColumnResize(colKey),
          });
        }
        return nextCol;
      }),
    [columnWidths, handleColumnResize],
  );
  const defaultTableComponents = useMemo(
    () => ({
      header: {
        cell: ResizableHeaderCell,
      },
    }),
    [],
  );
  const [filterVisible, setFilterVisible] = useState(false);
  const [tableLayout, setTableLayout] = useState<'default' | 'transposed'>('default');
  
  // 漏斗选择器状态
  const [funnelEvent1, setFunnelEvent1] = useState<string | undefined>(undefined);
  const [funnelEvent2, setFunnelEvent2] = useState<string | undefined>(undefined);
  
  // 筛选条件状态（仅用于回调数据）
  const [allAppIds, setAllAppIds] = useState<string[]>([]);
  const [allMediaSources, setAllMediaSources] = useState<string[]>([]);
  const [mediaToAdSeqs, setMediaToAdSeqs] = useState<Record<string, string[]>>({});
  const [mediaLoading, setMediaLoading] = useState<boolean>(false);
  const [adSequenceLoading, setAdSequenceLoading] = useState<Record<string, boolean>>({});
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [selectedMediaSources, setSelectedMediaSources] = useState<string[]>([]); // 改为数组支持多选
  const [selectedAdSequences, setSelectedAdSequences] = useState<string[]>([]);
  const [mediaAdPairs, setMediaAdPairs] = useState<Array<{ id: string; media?: string; ad?: string[] }>>([]);
  const [favoriteAdSequences, setFavoriteAdSequences] = useState<Record<string, FavoriteAdSequence[]>>({});
  const favoritesBaselineRef = useRef<Record<string, FavoriteAdSequence[]>>({});
  const favoritesDirtyRef = useRef(false);

  const normalizeFavoriteMap = useCallback((raw?: Record<string, FavoriteAdSequence[]>) => {
    if (!raw || typeof raw !== 'object') return {};
    const normalized: Record<string, FavoriteAdSequence[]> = {};
    Object.entries(raw).forEach(([media, list]) => {
      if (!Array.isArray(list) || list.length === 0) return;
      const dedup = new Map<string, FavoriteAdSequence>();
      list.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const value = typeof item.value === 'string' ? item.value.trim() : '';
        if (!value) return;
        const favoritedAt = typeof item.favoritedAt === 'number' ? item.favoritedAt : Date.now();
        const existing = dedup.get(value);
        if (!existing || favoritedAt > existing.favoritedAt) {
          dedup.set(value, { value, favoritedAt });
        }
      });
      if (dedup.size > 0) {
        normalized[media] = Array.from(dedup.values()).sort((a, b) => b.favoritedAt - a.favoritedAt);
      }
    });
    return normalized;
  }, []);
  const [selectedUserType, setSelectedUserType] = useState<string | undefined>(undefined);
  
  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false);
  const dragItemIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const restoredFromCacheRef = useRef(false);
  const cacheRestoreMessageRef = useRef<(() => void) | null>(null);
  
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

  const hasEvents = currentEvents.length > 0;

  // 保存查询状态到 localStorage
  const saveQueryState = () => {
    try {
      const queryState = {
        dataSource,
        dateRange: dateRange ? {
          start: dateRange[0].format('YYYY-MM-DD'),
          end: dateRange[1].format('YYYY-MM-DD')
        } : null,
        selectedAppId,
        selectedMediaSources,
        selectedUserType,
        showChart,
        pagination: {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          totalPages: pagination.totalPages
        },
        timestamp: Date.now()
      };
      localStorage.setItem(QUERY_STATE_STORAGE_KEY, JSON.stringify(queryState));
    } catch (error) {
      console.error('保存查询状态失败:', error);
    }
  };

  // 保存数据到 localStorage
  const saveDataCache = () => {
    try {
      const dataCache = {
        data,
        allData,
        timestamp: Date.now()
      };
      // 限制保存的数据量，避免 localStorage 溢出
      const cacheString = JSON.stringify(dataCache);
      if (cacheString.length < 5 * 1024 * 1024) { // 限制 5MB
        localStorage.setItem(DATA_CACHE_STORAGE_KEY, cacheString);
      } else {
        console.warn('数据缓存过大，跳过保存');
      }
    } catch (error) {
      console.error('保存数据缓存失败:', error);
    }
  };

  // 从 localStorage 恢复查询状态
  const restoreQueryState = () => {
    try {
      const savedState = localStorage.getItem(QUERY_STATE_STORAGE_KEY);
      if (savedState) {
        const queryState = JSON.parse(savedState);
        
        // 检查是否在24小时内
        const isRecent = queryState.timestamp && (Date.now() - queryState.timestamp < 24 * 60 * 60 * 1000);
        
        if (isRecent) {
          if (queryState.dataSource) {
            setDataSource(queryState.dataSource);
          }
          if (queryState.dateRange) {
            setDateRange([
              dayjs(queryState.dateRange.start),
              dayjs(queryState.dateRange.end)
            ]);
          }
          if (queryState.selectedAppId) {
            setSelectedAppId(queryState.selectedAppId);
          }
          if (queryState.selectedMediaSources) {
            setSelectedMediaSources(queryState.selectedMediaSources);
          }
          if (queryState.selectedUserType !== undefined) {
            setSelectedUserType(queryState.selectedUserType);
          }
          if (queryState.showChart !== undefined) {
            setShowChart(queryState.showChart);
          }
          if (queryState.pagination) {
            setPagination(queryState.pagination);
          }
          
          return true; // 表示成功恢复了状态
        }
      }
    } catch (error) {
      console.error('恢复查询状态失败:', error);
    }
    return false;
  };

  // 从 localStorage 恢复数据缓存
  const restoreDataCache = () => {
    try {
      const savedCache = localStorage.getItem(DATA_CACHE_STORAGE_KEY);
      if (savedCache) {
        const dataCache = JSON.parse(savedCache);

        // 检查是否在24小时内
        const isRecent = dataCache.timestamp && (Date.now() - dataCache.timestamp < 24 * 60 * 60 * 1000);

        if (isRecent && dataCache.data && dataCache.allData) {
          cacheRestoreMessageRef.current?.();
          cacheRestoreMessageRef.current = message.loading(t('attributionData.cacheRestoring'), 0);
          setIsRestoringFromCache(true);
          setLoading(true);
          setData(dataCache.data);
          setAllData(dataCache.allData);
          restoredFromCacheRef.current = true;
          console.log('✅ 成功恢复数据缓存:', {
            dataLength: dataCache.data.length,
            allDataLength: dataCache.allData.length,
          });
          setTimeout(() => {
            cacheRestoreMessageRef.current?.();
            cacheRestoreMessageRef.current = null;
            setLoading(false);
            setIsRestoringFromCache(false);
            message.success(t('attributionData.cacheRestored'));
          }, 300);
          return true;
        }
      }
    } catch (error) {
      console.error('恢复数据缓存失败:', error);
      setIsRestoringFromCache(false);
    }
    return false;
  };

  useEffect(() => {
    if (!user?.id) {
      setFavoriteAdSequences({});
      favoritesBaselineRef.current = {};
      favoritesDirtyRef.current = false;
      return;
    }
    const fetchFavorites = async () => {
      try {
        const response = await apiService.getAttributionFavorites();
        if (response.success && response.data) {
          const normalized = normalizeFavoriteMap(response.data);
          setFavoriteAdSequences(normalized);
          favoritesBaselineRef.current = JSON.parse(JSON.stringify(normalized));
          favoritesDirtyRef.current = false;
        } else {
          setFavoriteAdSequences({});
          favoritesBaselineRef.current = {};
          favoritesDirtyRef.current = false;
        }
      } catch (error) {
        console.error('加载收藏广告序列失败:', error);
        setFavoriteAdSequences({});
        favoritesBaselineRef.current = {};
        favoritesDirtyRef.current = false;
      }
    };
    fetchFavorites();
  }, [normalizeFavoriteMap, user?.id]);

  const toggleFavoriteAdSequence = useCallback((media: string, seq: string) => {
    if (!media || !seq) return;
    if (!user?.id) {
      message.warning('请先登录后再进行收藏操作');
      return;
    }

    let action: 'added' | 'removed' = 'added';
    setFavoriteAdSequences(prev => {
      const cloned: Record<string, FavoriteAdSequence[]> = JSON.parse(JSON.stringify(prev || {}));
      const currentList = cloned[media] ? [...cloned[media]!] : [];
      const existingIndex = currentList.findIndex(entry => entry.value === seq);
      if (existingIndex >= 0) {
        currentList.splice(existingIndex, 1);
        if (currentList.length > 0) {
          cloned[media] = currentList;
        } else {
          delete cloned[media];
        }
        action = 'removed';
      } else {
        cloned[media] = [
          { value: seq, favoritedAt: Date.now() },
          ...currentList,
        ];
        action = 'added';
      }
      return normalizeFavoriteMap(cloned);
    });

    favoritesDirtyRef.current = true;
    const tip =
      action === 'added'
        ? `${media} / ${seq} 已标记收藏，将在应用筛选后保存`
        : `${media} / ${seq} 已取消收藏，将在应用筛选后保存`;
    message.success(tip);
  }, [normalizeFavoriteMap, user?.id]);

  const persistFavoriteChanges = useCallback(async (): Promise<boolean> => {
    if (favoritesSyncPromiseRef.current) {
      return favoritesSyncPromiseRef.current;
    }

    const run = async (): Promise<boolean> => {
      if (!favoritesDirtyRef.current) return true;
      if (!user?.id) {
        message.warning('请先登录后再保存收藏');
        return false;
      }

      setFiltersLocked(true);
      try {
        const current = normalizeFavoriteMap(favoriteAdSequences);
        const favoritesPayload = Object.entries(current).flatMap(([media, list]) =>
          list.map(item => ({ mediaSource: media, adSequence: item.value })),
        );

        const response = await apiService.syncAttributionFavorites({
          favorites: favoritesPayload,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || '更新收藏失败');
        }

        const syncedFavorites = normalizeFavoriteMap(response.data.favorites || {});
        favoritesBaselineRef.current = JSON.parse(JSON.stringify(syncedFavorites));
        favoritesDirtyRef.current = false;
        setFavoriteAdSequences(syncedFavorites);
        return true;
      } catch (error) {
        console.error('同步收藏广告序列失败:', error);
        message.error('同步收藏失败，请稍后再试');
        return false;
      } finally {
        setFiltersLocked(false);
      }
    };

    const promise = run().finally(() => {
      favoritesSyncPromiseRef.current = null;
    });
    favoritesSyncPromiseRef.current = promise;
    return promise;
  }, [favoriteAdSequences, normalizeFavoriteMap, user?.id]);

  const handleFavoriteIconClick =
    (media?: string, seq?: string) => (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!media || !seq || filtersLocked) return;
      toggleFavoriteAdSequence(media, seq);
    };

  useEffect(() => {
    if (!hasRestoredSnapshotRef.current && adjustDataPageSnapshot && adjustDataPageSnapshot.userId === user?.id) {
      restoreSnapshot(adjustDataPageSnapshot);
      hasRestoredSnapshotRef.current = true;
      restoredFromCacheRef.current = true;
      setIsInitialized(true);
      return;
    }

    const initPage = async () => {
      await loadAllEventNames('adjust');
      await loadAllEventNames('appsflyer');
      await loadFilterOptions();
      
      // 恢复查询状态
      const hasRestoredState = restoreQueryState();
      // 尝试恢复数据缓存
      const hasRestoredData = restoreDataCache();
      
      setIsInitialized(true);
      
      if (!hasRestoredState && !hasRestoredData) {
        console.log('ℹ️ 未检测到缓存或历史状态，等待用户操作后再查询数据');
      } else if (hasRestoredState && !hasRestoredData) {
        setTimeout(() => {
          console.log('🔄 检测到保存的查询状态但没有数据缓存，重新查询数据');
          fetchData(true);
        }, 500);
      } else if (hasRestoredState && hasRestoredData) {
        console.log('✅ 成功恢复查询状态和数据，无需重新查询');
      }
    };
    
    initPage();
  }, [restoreSnapshot, user?.id]);

  const loadFilterOptions = async () => {
    try {
      setMediaLoading(true);
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
    finally {
      setMediaLoading(false);
    }
  };

  const loadAdSequencesForSingleMedia = async (media: string) => {
    if (!media) return;
    try {
      setAdSequenceLoading(prev => ({ ...prev, [media]: true }));
      const res = await apiService.getAttributionAdSequences({ mediaSource: media });
      if (res.success && Array.isArray(res.data)) {
        setMediaToAdSeqs(prev => ({ ...prev, [media]: res.data as string[] }));
      }
    } catch (e) {
      console.error('加载单个媒体的广告序列失败:', e);
      message.error('加载广告序列失败，请稍后再试');
    } finally {
      setAdSequenceLoading(prev => ({ ...prev, [media]: false }));
    }
  };

  // 自动查询数据的 effect
  useEffect(() => {
    if (isInitialized && hasEvents) {
      if (restoredFromCacheRef.current) {
        restoredFromCacheRef.current = false;
        return;
      }
      fetchData(true);
    }
  }, [dataSource, isInitialized, hasEvents]);

  useEffect(() => {
    return () => {
      cacheRestoreMessageRef.current?.();
      cacheRestoreMessageRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (adjustDataPageSnapshot && adjustDataPageSnapshot.userId && adjustDataPageSnapshot.userId !== user?.id) {
      adjustDataPageSnapshot = null;
    }
  }, [user?.id]);

  useEffect(() => {
    const isSpinning = isRestoringFromCache || loading;
    if (isSpinning) {
      if (!loadingTimeoutRef.current && !loadingTimeoutNotifiedRef.current) {
        loadingTimeoutRef.current = setTimeout(() => {
          if (isRestoringFromCache || loading) {
            if (!loadingTimeoutNotifiedRef.current) {
              loadingTimeoutNotifiedRef.current = true;
              message.error('提取缓存失败，请刷新页面后重试');
            }
          }
          loadingTimeoutRef.current = null;
        }, 40000);
      }
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      loadingTimeoutNotifiedRef.current = false;
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [isRestoringFromCache, loading]);

  useEffect(() => {
    if (!isRestoringFromCache && !loading) {
      loadingTimeoutNotifiedRef.current = false;
    }
  }, [isRestoringFromCache, loading]);

  useEffect(() => {
    if (!isInitialized) return;

    const clonedAllEventNames: Record<DataSource, string[]> = {
      adjust: [...(allEventNames.adjust || [])],
      appsflyer: [...(allEventNames.appsflyer || [])],
    };

    const clonedSelectedItems: Record<DataSource, SelectedItem[]> = {
      adjust: (selectedItems.adjust || []).map(item => ({ ...item })),
      appsflyer: (selectedItems.appsflyer || []).map(item => ({ ...item })),
    };

    const clonedMediaAdPairs = mediaAdPairs.map(pair => ({ ...pair, ad: pair.ad ? [...pair.ad] : undefined }));
    const clonedMediaToAdSeqs = Object.fromEntries(Object.entries(mediaToAdSeqs).map(([key, value]) => [key, [...value]]));

    adjustDataPageSnapshot = {
      timestamp: Date.now(),
      userId: user?.id,
      dataSource,
      dateRange: dateRange ? { start: dateRange[0].toISOString(), end: dateRange[1].toISOString() } : null,
      pagination: { ...pagination },
      data,
      allData,
      selectedAppId,
      selectedMediaSources: [...selectedMediaSources],
      selectedAdSequences: [...selectedAdSequences],
      selectedUserType,
      mediaAdPairs: clonedMediaAdPairs,
      tableLayout,
      showChart,
      allEventNames: clonedAllEventNames,
      selectedItems: clonedSelectedItems,
      mediaToAdSeqs: clonedMediaToAdSeqs,
      favoriteAdSequences: JSON.parse(JSON.stringify(favoriteAdSequences || {})),
      favoritesBaseline: JSON.parse(JSON.stringify(favoritesBaselineRef.current || {})),
      favoritesDirty: favoritesDirtyRef.current,
    };
  }, [
    allData,
    allEventNames,
    data,
    dataSource,
    dateRange,
    favoriteAdSequences,
    isInitialized,
    mediaAdPairs,
    mediaToAdSeqs,
    pagination,
    selectedAdSequences,
    selectedAppId,
    selectedItems,
    selectedMediaSources,
    selectedUserType,
    showChart,
    tableLayout,
    user?.id,
  ]);

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
    // 保存查询状态
    setTimeout(() => saveQueryState(), 100);
  };

  const resetDragState = () => {
    dragItemIndexRef.current = null;
    setDragOverIndex(null);
  };

  const reorderSelectedItems = (from: number, to: number) => {
    const updated = Array.from(currentItems);
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    saveSelectedItems(updated);
  };

  const handleDragStartItem = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    dragItemIndexRef.current = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnterItem = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragItemIndexRef.current !== null && dragItemIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOverItem = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragItemIndexRef.current !== null) {
      event.dataTransfer.dropEffect = 'move';
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    }
  };

  const handleDropOnItem = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragItemIndexRef.current === null) {
      resetDragState();
      return;
    }
    const from = dragItemIndexRef.current;
    if (from !== index) {
      reorderSelectedItems(from, index);
    }
    resetDragState();
  };

  const handleDropAtEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragItemIndexRef.current === null) {
      resetDragState();
      return;
    }
    const from = dragItemIndexRef.current;
    reorderSelectedItems(from, currentItems.length);
    resetDragState();
  };

  const handleDragEndItem = () => {
    resetDragState();
  };

  const fetchData = async (resetPagination = false) => {
    restoredFromCacheRef.current = false;
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
        // 从配对中提取媒体与广告序列（混合模式：有的选了序列，有的没选）
        const pairMedias = Array.from(new Set(mediaAdPairs.map(p => p.media).filter(Boolean))) as string[];
        const pairAdPairs = mediaAdPairs
          .filter(p => p.media && p.ad && (p.ad as string[]).length > 0)
          .flatMap(p => (p.ad as string[]).map(ad => `${p.media}|${ad}`));
        const mediasWithoutAd = mediaAdPairs
          .filter(p => p.media && (!p.ad || (p.ad as string[]).length === 0))
          .map(p => p.media) as string[];
        
        if (pairMedias.length > 0) params.mediaSource = pairMedias.join(',');
        if (pairAdPairs.length > 0) params.adPairs = pairAdPairs.join(',');
        if (mediasWithoutAd.length > 0) params.mediasWithoutAd = mediasWithoutAd.join(',');
        if (selectedUserType !== undefined) params.reloanStatus = selectedUserType;
      }

      // 获取全部数据（用于表格分页和图表）
      const allDataParams: any = { ...params, page: 1, pageSize: 1000 };

      console.log('📊 开始查询归因数据，参数:', allDataParams, '已选事件:', currentEvents);

      const allResponse = await apiService.getAttributionData(allDataParams);

      if (allResponse.success && Array.isArray(allResponse.data)) {
        const formattedAllData = allResponse.data.map((item: any, index: number) => ({
          id: (index + 1).toString(),
          ...item
        }));

        const totalCount = formattedAllData.length;
        const pageSize = pagination.pageSize || 10;
        const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

        let nextCurrent = resetPagination ? 1 : (pagination.current || 1);
        if (totalPages > 0) {
          nextCurrent = Math.max(1, Math.min(nextCurrent, totalPages));
        } else {
          nextCurrent = 1;
        }

        const startIndex = (nextCurrent - 1) * pageSize;
        const pageSlice = formattedAllData.slice(startIndex, startIndex + pageSize).map((item: any, idx: number) => ({
          ...item,
          id: item.id ?? `${startIndex + idx + 1}`
        }));

        console.log('✅ 成功获取数据，共:', totalCount, '条，当前页数据:', pageSlice.length, '条');

        setAllData(formattedAllData);
        setData(pageSlice);
        setPagination(prev => ({
          ...prev,
          current: nextCurrent,
          pageSize,
          total: totalCount,
          totalPages
        }));

        setTimeout(() => {
          saveQueryState();
          saveDataCache();
        }, 100);

        message.success(t('attributionData.dataLoaded', { count: pageSlice.length }));
      } else {
        console.error('❌ API响应格式错误:', allResponse);
        message.error(t('attributionData.dataFormatError'));
        setData([]);
        setAllData([]);
        setPagination(prev => ({
          ...prev,
          current: 1,
          total: 0,
          totalPages: 0
        }));
      }
    } catch (error) {
      console.error('API请求错误:', error);
      message.error(t('attributionData.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const updatePagedData = useCallback(() => {
    const totalCount = allData.length;
    const pageSize = pagination.pageSize || 10;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    if (pagination.total !== totalCount || pagination.totalPages !== totalPages) {
      setPagination(prev => ({
        ...prev,
        total: totalCount,
        totalPages
      }));
    }

    const desiredCurrent = totalPages > 0 ? Math.max(1, Math.min(pagination.current || 1, totalPages)) : 1;
    if ((pagination.current || 1) !== desiredCurrent) {
      setPagination(prev => ({
        ...prev,
        current: desiredCurrent
      }));
      return;
    }

    if (totalCount === 0) {
      setData([]);
      return;
    }

    const startIndex = (desiredCurrent - 1) * pageSize;
    const pageSlice = allData.slice(startIndex, startIndex + pageSize).map((item: any, idx: number) => ({
      ...item,
      id: item.id ?? `${startIndex + idx + 1}`
    }));
    setData(pageSlice);
  }, [allData, pagination.current, pagination.pageSize, pagination.total, pagination.totalPages]);

  useEffect(() => {
    updatePagedData();
  }, [updatePagedData]);

  const downloadData = () => {
    try {
      if (allData.length === 0) {
        message.warning(t('attributionData.noDataToDownload'));
        return;
      }

      // 构建表头（包含事件和漏斗，按照currentItems的顺序）
      const headers = [t('attributionData.downloadHeaders.date')];
      if (dataSource === 'appsflyer') {
        if (selectedMediaSources.length > 0) headers.push(t('attributionData.mediaSource'));
        if (selectedAdSequences.length > 0) headers.push(t('attributionData.adSequence'));
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
        if (dataSource === 'appsflyer') {
          if (selectedMediaSources.length > 0) row.push(item.media_source || '');
          if (selectedAdSequences.length > 0) row.push(item.ad_sequence || '');
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
            const raw1 = item[`event_${sanitizedName1}`];
            const raw2 = item[`event_${sanitizedName2}`];
            const val1 = Number(raw1);
            const val2 = Number(raw2);
            let out = '-';
            if (Number.isFinite(val1) && Number.isFinite(val2) && val1 > 0) {
              const ratio = val2 / val1;
              if (Number.isFinite(ratio) && !Number.isNaN(ratio)) {
                out = `${(ratio * 100).toFixed(2)}%`;
              }
            }
            row.push(out);
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
    // 保存状态
    setTimeout(() => saveQueryState(), 100);
  };

  const comboEntries = useMemo(() => {
    return data.map((record, index) => {
      const comboKeyParts = [record?.query_date ?? `row-${index}`];
      if (dataSource === 'appsflyer') {
        comboKeyParts.push(record?.media_source ?? 'ALL');
        comboKeyParts.push(record?.ad_sequence ?? 'ALL');
      }
      return {
        key: comboKeyParts.join('||') || `combo-${index}`,
        record,
      };
    });
  }, [data, dataSource]);

  const transposedData = useMemo(() => {
    if (!currentItems.length) return [];

    return currentItems.map((item, idx) => {
      const baseRow: any = {
        id: `${item.type}-${idx}`,
        eventName: item.type === 'event' ? item.name : `${item.event1} → ${item.event2}`,
        eventType: item.type,
      };

      comboEntries.forEach(({ key, record }) => {
        if (!record) {
          baseRow[key] = null;
          return;
        }

        if (item.type === 'event') {
          const sanitizedName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
          const fieldName = `event_${sanitizedName}`;
          const rawValue = Number(record[fieldName] ?? 0);
          baseRow[key] = {
            rawValue,
            formatted: rawValue.toLocaleString(),
          };
        } else {
          const sanitized1 = item.event1!.replace(/[^a-zA-Z0-9_]/g, '_');
          const sanitized2 = item.event2!.replace(/[^a-zA-Z0-9_]/g, '_');
          const field1 = `event_${sanitized1}`;
          const field2 = `event_${sanitized2}`;
          const count1 = Number(record[field1] ?? 0);
          const count2 = Number(record[field2] ?? 0);
          const rate = count1 > 0 ? count2 / count1 : 0;
          baseRow[key] = {
            rawValue: rate,
            formatted: count1 > 0 ? `${(rate * 100).toFixed(2)}%` : '-',
            sourceValue: count1,
            targetValue: count2,
          };
        }
      });

      return baseRow;
    });
  }, [comboEntries, currentItems]);

  const transposedColumns = useMemo(() => {
    const baseColumns: any[] = [
      {
        title: t('attributionData.rowNumber'),
        key: 'rowNumber',
        width: 80,
        fixed: 'left' as const,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: t('attributionData.eventName'),
        dataIndex: 'eventName',
        key: 'eventName',
        width: 220,
        fixed: 'left' as const,
        render: (value: string, record: any) => (
          <Space size={6}>
            {record.eventType === 'funnel' && <FunnelPlotOutlined style={{ color: '#fa8c16' }} />}
            <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>{value}</span>
          </Space>
        ),
      },
    ];

    const dateGroupMap = new Map<string, { date: string; combos: Array<{ key: string; record: any }> }>();

    comboEntries.forEach(entry => {
      const rawDate = entry.record?.query_date ?? '';
      const dateKey = rawDate ? dayjs(rawDate).format('YYYY-MM-DD') : '-';
      if (!dateGroupMap.has(dateKey)) {
        dateGroupMap.set(dateKey, { date: dateKey, combos: [] });
      }
      dateGroupMap.get(dateKey)!.combos.push(entry);
    });

    const dateGroups = Array.from(dateGroupMap.values()).sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

    dateGroups.forEach(group => {
      if (dataSource !== 'appsflyer') {
        const combos = group.combos;
        if (!combos.length) return;
        const columnKey = combos[0].key;
        baseColumns.push({
          title: group.date,
          dataIndex: columnKey,
          key: columnKey,
          align: 'right' as const,
          width: 160,
          render: (cell: any, record: any) => {
            if (!cell) return <span style={{ color: '#999' }}>-</span>;
            if (record.eventType === 'funnel') {
              return (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: cell.rawValue > 0 ? '#fa8c16' : '#8c8c8c' }}>{cell.formatted}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {(cell.targetValue ?? 0).toLocaleString()} / {(cell.sourceValue ?? 0).toLocaleString()}
                  </div>
                </div>
              );
            }
            return <span style={{ fontWeight: 600 }}>{cell.formatted}</span>;
          },
        });
      } else {
        const renderValueCell = (cell: any, record: any) => {
          if (!cell) return <span style={{ color: '#999' }}>-</span>;
          if (record.eventType === 'funnel') {
            return (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: cell.rawValue > 0 ? '#fa8c16' : '#8c8c8c' }}>{cell.formatted}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {(cell.targetValue ?? 0).toLocaleString()} / {(cell.sourceValue ?? 0).toLocaleString()}
                </div>
              </div>
            );
          }
          return <span style={{ fontWeight: 600 }}>{cell.formatted}</span>;
        };

        const mediaGroupMap = new Map<
          string,
          {
            mediaKey: string;
            display: string;
            combos: Array<typeof group.combos[number]>;
          }
        >();

        group.combos.forEach(entry => {
          const keyParts = entry.key?.split('||') ?? [];
          const keyMedia = keyParts[1] ?? '';

          const rawMedia = String(
            entry.record?.media_source ??
              entry.record?.media_source_name ??
              entry.record?.media_name ??
              keyMedia ??
              ''
          ).trim();

          const mediaDisplay =
            rawMedia && rawMedia !== 'ALL'
              ? rawMedia
              : t('attributionData.allMediaSources') ?? 'ALL';

          const mediaKey = rawMedia || keyMedia || '__UNSPECIFIED_MEDIA__';

          if (!mediaGroupMap.has(mediaKey)) {
            mediaGroupMap.set(mediaKey, {
              mediaKey,
              display: mediaDisplay,
              combos: [],
            });
          }
          mediaGroupMap.get(mediaKey)!.combos.push(entry);
        });

        const mediaColumns = Array.from(mediaGroupMap.values()).map(mediaGroup => {
          if (mediaGroup.combos.length === 1) {
            const entry = mediaGroup.combos[0];
            const keyParts = entry.key?.split('||') ?? [];
            const keyAd = keyParts[2] ?? '';

            const rawAd = String(
              entry.record?.ad_sequence ??
                entry.record?.af_c_id ??
                entry.record?.campaign ??
                keyAd ??
                ''
            ).trim();

            const adDisplay =
              rawAd && rawAd !== 'ALL'
                ? rawAd
                : t('attributionData.allAdSequences') ?? 'ALL';

            return {
              title: (
                <div style={{ textAlign: 'center', whiteSpace: 'normal' }}>
                  <div>{mediaGroup.display}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{adDisplay}</div>
                </div>
              ),
              dataIndex: entry.key,
              key: `${group.date}-${mediaGroup.mediaKey}`,
              align: 'right' as const,
              width: 180,
              render: renderValueCell,
            };
          }

          const adColumns = mediaGroup.combos.map(entry => {
            const keyParts = entry.key?.split('||') ?? [];
            const keyAd = keyParts[2] ?? '';

            const rawAd = String(
              entry.record?.ad_sequence ??
                entry.record?.af_c_id ??
                entry.record?.campaign ??
                keyAd ??
                ''
            ).trim();

            const adDisplay =
              rawAd && rawAd !== 'ALL'
                ? rawAd
                : t('attributionData.allAdSequences') ?? 'ALL';

            return {
              title: (
                <div style={{ textAlign: 'center', whiteSpace: 'normal' }}>
                  <div>{adDisplay}</div>
                </div>
              ),
              dataIndex: entry.key,
              key: `${group.date}-${mediaGroup.mediaKey}-${entry.key}`,
              align: 'right' as const,
              width: 180,
              render: renderValueCell,
            };
          });

          return {
            title: (
              <div style={{ textAlign: 'center', whiteSpace: 'normal' }}>
                <div>{mediaGroup.display}</div>
              </div>
            ),
            key: `${group.date}-${mediaGroup.mediaKey}`,
            children: adColumns,
          };
        });

        baseColumns.push({
          title: group.date,
          key: `date-${group.date}`,
          children: mediaColumns,
        });
      }
    });

    return baseColumns;
  }, [comboEntries, dataSource, t]);

  const resizableTransposedColumns = useMemo(
    () => attachResizableProps(transposedColumns),
    [transposedColumns, attachResizableProps],
  );

  const columns = useMemo(() => {
    const dateRowSpan: number[] = [];
    const mediaRowSpan: number[] = [];

    {
      let i = 0;
      while (i < data.length) {
        const start = i;
        const dateValue = data[i]?.query_date;
        let count = 1;
        i++;
        while (i < data.length && data[i]?.query_date === dateValue) {
          count++;
          i++;
        }
        dateRowSpan[start] = count;
        for (let k = start + 1; k < start + count; k++) dateRowSpan[k] = 0;
      }
    }

    if (dataSource === 'appsflyer') {
      // 按媒体资源合并，不按日期分组
      let i = 0;
      while (i < data.length) {
        const start = i;
        const media = data[i]?.media_source;
        let count = 1;
        i++;
        // 继续查找相同媒体资源的所有行（不管日期）
        while (i < data.length && data[i]?.media_source === media) {
          count++;
          i++;
        }
        mediaRowSpan[start] = count;
        for (let k = start + 1; k < start + count; k++) mediaRowSpan[k] = 0;
      }
    }

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
          const span = dateRowSpan[index] ?? 1;
          const isFirst = span > 0;
          const content = date ? dayjs(date).format('YYYY-MM-DD') : '-';
          return {
            children: (
              <div
                style={{
                  fontWeight: isFirst ? 600 : 400,
                  fontSize: '13px',
                  color: isFirst ? '#262626' : '#8c8c8c',
                }}
              >
                {isFirst ? content : ''}
              </div>
            ),
            props: { rowSpan: span },
          } as any;
        },
        sorter: (a: any, b: any) => dayjs(a.query_date).valueOf() - dayjs(b.query_date).valueOf(),
      },
    ];

    const shouldShowMediaColumn = dataSource === 'appsflyer';
    if (shouldShowMediaColumn) {
      baseColumns.push({
        title: t('attributionData.mediaSource'),
        dataIndex: 'media_source',
        key: 'media_source',
        width: 180,
        fixed: 'left' as const,
        render: (source: string, record: any, index: number) => {
          const span = mediaRowSpan[index] ?? 1;
          const isFirst = span > 0;
          const rawMedia = String(
            source ??
              record?.media_source ??
              record?.media_source_name ??
              record?.media_name ??
              ''
          ).trim();
          const displayMedia =
            rawMedia && rawMedia !== 'ALL'
              ? rawMedia
              : t('attributionData.allMediaSources') ?? 'ALL';
          return {
            children: isFirst ? (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#262626',
                }}
              >
                {displayMedia}
              </span>
            ) : null,
            props: { rowSpan: span },
          } as any;
        },
      });

      baseColumns.push({
        title: t('attributionData.adSequence'),
        dataIndex: 'ad_sequence',
        key: 'ad_sequence',
        width: 200,
        fixed: 'left' as const,
        render: (seq: string) => {
          const rawSeq = String(seq ?? '').trim();
          const displaySeq =
            rawSeq && rawSeq !== 'ALL'
              ? rawSeq
              : t('attributionData.allAdSequences') ?? 'ALL';
          return (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#262626',
              }}
            >
              {displaySeq}
            </span>
          );
        },
      });
    }

    const itemColumns = currentItems.map(item => {
      if (item.type === 'event') {
        const sanitizedName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
        const fieldName = `event_${sanitizedName}`;

        return {
          title: (
            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>{item.name}</div>
          ),
          dataIndex: fieldName,
          key: fieldName,
          width: isMobile ? 90 : 135,
          align: 'right' as const,
          ellipsis: {
            showTitle: true,
          },
          render: (value: number) => (value !== undefined && value !== null ? value.toLocaleString() : '0'),
          sorter: (a: any, b: any) => (a[fieldName] || 0) - (b[fieldName] || 0),
        };
      }

      const sanitized1 = item.event1!.replace(/[^a-zA-Z0-9_]/g, '_');
      const sanitized2 = item.event2!.replace(/[^a-zA-Z0-9_]/g, '_');
      const field1 = `event_${sanitized1}`;
      const field2 = `event_${sanitized2}`;

      return {
        title: isMobile ? (
          <span>
            <FunnelPlotOutlined />
          </span>
        ) : (
          <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3', textAlign: 'center' }}>
            <FunnelPlotOutlined /> {item.event1} → {item.event2}
          </div>
        ),
        key: `conversion_${sanitized1}_${sanitized2}`,
        width: isMobile ? 80 : 145,
        align: 'center' as const,
        ellipsis: {
          showTitle: true,
        },
        render: (_: any, record: any) => {
          const total = record[field1] || 0;
          const completed = record[field2] || 0;
          if (!total) {
            return <span style={{ color: '#8c8c8c' }}>0%</span>;
          }
          const percent = (completed / total) * 100;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 600, color: percent > 0 ? '#fa8c16' : '#8c8c8c' }}>{percent.toFixed(2)}%</span>
              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                ({completed.toLocaleString()} / {total.toLocaleString()})
              </span>
            </div>
          );
        },
        sorter: (a: any, b: any) => {
          const rate1 = (a[field1] || 0) > 0 ? (a[field2] || 0) / (a[field1] || 0) : 0;
          const rate2 = (b[field1] || 0) > 0 ? (b[field2] || 0) / (b[field1] || 0) : 0;
          return rate1 - rate2;
        },
      };
    });

    return [...baseColumns, ...itemColumns];
  }, [currentItems, pagination, t, isMobile, dataSource, mediaAdPairs, data]);

  const resizableDefaultColumns = useMemo(
    () => attachResizableProps(columns),
    [columns, attachResizableProps],
  );

  const transformedChartData = useMemo(() => {
    return allData
      .sort((a, b) => new Date(a.query_date).getTime() - new Date(b.query_date).getTime())
      .flatMap(item => {
        return currentEvents.map(eventName => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          const value = Number(item[`event_${sanitizedName}`]) || 0;
          
          // 分类：支持媒体与广告序列双维度
          let category = eventName;
          if (dataSource === 'appsflyer') {
            if (selectedMediaSources.length > 0 && selectedAdSequences.length > 0 && item.media_source && item.ad_sequence) {
              category = `${item.media_source} | ${item.ad_sequence} - ${eventName}`;
            } else if (selectedMediaSources.length > 0 && item.media_source) {
              category = `${item.media_source} - ${eventName}`;
            } else if (selectedAdSequences.length > 0 && item.ad_sequence) {
              category = `${item.ad_sequence} - ${eventName}`;
            }
          }
          
          return {
            date: item.query_date,
            category: category,
            value: value
          };
        });
      });
  }, [allData, currentEvents, dataSource, selectedMediaSources, selectedAdSequences]);

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

  const renderTransposedBodyCell = useCallback(
    (cellProps: any) => {
      const { children, column, record, index } = cellProps;
      if (column && column.key === 'eventName') {
        const isFirst = index === 0 || transposedData[index - 1]?.eventName !== record.eventName;
        const span = (() => {
          if (!isFirst) return 0;
          let count = 1;
          for (let i = index + 1; i < transposedData.length; i++) {
            if (transposedData[i].eventName === record.eventName) {
              count++;
            } else {
              break;
            }
          }
          return count;
        })();
        return (
          <td {...cellProps} rowSpan={span} style={{ verticalAlign: 'middle' }}>
            {span > 0 ? children : null}
          </td>
        );
      }
      return <td {...cellProps}>{children}</td>;
    },
    [transposedData],
  );

  const transposedTableComponents = useMemo(
    () => ({
      header: {
        cell: ResizableHeaderCell,
      },
      body: {
        cell: renderTransposedBodyCell,
      },
    }),
    [renderTransposedBodyCell],
  );

  const spinTipText = isRestoringFromCache
    ? t('attributionData.cacheRestoring')
    : t('attributionData.loadingData', { defaultValue: '数据加载中...' });

  return (
    <Spin spinning={isRestoringFromCache || loading} tip={spinTipText}>
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
            <Space.Compact>
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
            </Space.Compact>
            
            <span style={{ fontWeight: 'bold', color: '#333' }}>{t('attributionData.dateRange')}：</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
                  // 保存状态
                  setTimeout(() => saveQueryState(), 100);
                }}
                placeholder={[t('attributionData.startDate'), t('attributionData.endDate')]}
                style={{ width: '240px' }}
                disabled={filtersLocked}
              />
            
            <Button
              type="primary"
              loading={applyFilterLoading}
              disabled={filtersLocked}
              onClick={async () => {
                if (applyFilterLoading || filtersLocked) return;
                setApplyFilterLoading(true);
                console.log('确认筛选，开始查询数据...');
                try {
                  const favoritesSaved = await persistFavoriteChanges();
                  if (!favoritesSaved) {
                    return;
                  }
                  saveQueryState(); // 保存查询状态
                  await fetchData(true);
                  message.success(t('attributionData.filterApplied'));
                } finally {
                  setApplyFilterLoading(false);
                }
              }}
            >
              {t('common.confirm')}
            </Button>
            <Button 
              onClick={async () => {
                console.log('重置筛选条件...');
                setDateRange(null);
                setPagination(prev => ({ ...prev, current: 1 }));
                setSelectedUserType(undefined);
                await fetchData(true);
                message.success(t('attributionData.filterCleared'));
              }}
              disabled={applyFilterLoading || filtersLocked}
            >
              {t('common.reset')}
            </Button>
            <Button 
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
              disabled={filtersLocked}
            >
              {t('attributionData.selectEvents')}
            </Button>
            {dataSource === 'appsflyer' && (
              <Button 
                icon={<PlusOutlined />}
                onClick={() => {
                  if (filtersLocked) return;
                  setFilterVisible(true);
                }}
                style={{ 
                  background: '#f0f5ff',
                  borderColor: '#91d5ff',
                  color: '#1890ff'
                }}
                loading={mediaFilterLoading}
                disabled={mediaFilterLoading || filtersLocked}
              >
                {t('attributionData.filterConditions')}
              </Button>
            )}
          </div>

          {/* 第二行：筛选条件显示区域 */}
          {dataSource === 'appsflyer' && (selectedAppId || mediaAdPairs.length > 0 || selectedUserType !== undefined) && (
            <div style={{ 
              padding: '12px 16px', 
              background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)', 
              borderRadius: '8px',
              border: '1px solid #91d5ff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              marginTop: 12
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
                    {selectedUserType !== undefined && (
                      <Tag
                        color="blue"
                        closable
                        onClose={() => {
                          setSelectedUserType(undefined);
                          setTimeout(() => saveQueryState(), 100);
                          message.success(t('attributionData.userType.cleared'));
                        }}
                        style={{
                          margin: 0,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: '#e6f7ff',
                          borderColor: '#1890ff',
                          color: '#0958d9',
                        }}
                      >
                        {t('attributionData.userType.label')}: {selectedUserType === '0' ? t('attributionData.userType.new') : t('attributionData.userType.returning')}
                      </Tag>
                    )}
                    {mediaAdPairs.map((pair) => {
                      if (!pair.media) return null;
                      const hasAds = pair.ad && (pair.ad as string[]).length > 0;
                      return (
                        <React.Fragment key={pair.id}>
                          <Tag 
                            color="orange"
                            closable
                            onClose={() => {
                              setMediaAdPairs(prev => prev.filter(p => p.id !== pair.id));
                              message.success(`已移除媒体渠道: ${pair.media}`);
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
                            媒体: {pair.media}
                          </Tag>
                          {hasAds && (pair.ad as string[]).map(seq => (
                            <Tag 
                              key={`${pair.id}_${seq}`}
                              color="geekblue"
                              closable
                              onClose={() => {
                                const newPairs = [...mediaAdPairs];
                                const pairIdx = newPairs.findIndex(p => p.id === pair.id);
                                if (pairIdx >= 0) {
                                  const newAds = (newPairs[pairIdx].ad as string[]).filter(a => a !== seq);
                                  newPairs[pairIdx] = { ...newPairs[pairIdx], ad: newAds };
                                  setMediaAdPairs(newPairs);
                                  message.success(`已移除广告序列: ${seq}`);
                                }
                              }}
                              style={{ 
                                margin: 0,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: '#f0f5ff',
                                borderColor: '#2f54eb',
                                color: '#1d39c4'
                              }}
                            >
                              广告序列: {seq}
                            </Tag>
                          ))}
                        </React.Fragment>
                      );
                    })}
            </Space>
                </div>
                <Button 
                  size="small" 
                  type="link"
                  danger
                  onClick={() => {
                    setSelectedAppId(undefined);
                    setSelectedMediaSources([]);
                    setSelectedAdSequences([]);
                    setMediaAdPairs([]);
                    setSelectedUserType(undefined);
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
                    onClick={() => {
                      setShowChart(false);
                      setTimeout(() => saveQueryState(), 100);
                    }}
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
                      setTimeout(() => saveQueryState(), 100);
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
        <Card
          title={t('attributionData.tableTitle')}
          extra={
            <Segmented
              options={[
                { label: t('attributionData.tableViewDefault'), value: 'default' },
                { label: t('attributionData.tableViewTranspose'), value: 'transposed' },
              ]}
              value={tableLayout}
              onChange={value => setTableLayout(value as 'default' | 'transposed')}
              style={{
                backgroundColor: '#f5f5f5',
              }}
              className="table-view-segmented"
            />
          }
        >
          <style>{`
            .table-view-segmented .ant-segmented-item-selected {
              background-color: #1890ff !important;
              color: #ffffff !important;
              font-weight: 600 !important;
              box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3) !important;
            }
            .table-view-segmented .ant-segmented-item-selected:hover {
              background-color: #40a9ff !important;
            }
            .table-view-segmented .ant-segmented-item:not(.ant-segmented-item-selected):hover {
              background-color: #e6f7ff !important;
              color: #1890ff !important;
            }
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
            .ant-table-thead > tr > th {
              position: relative;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .resizable-handle {
              position: absolute;
              right: -4px;
              top: 0;
              bottom: 0;
              width: 8px;
              cursor: col-resize;
            }
            .resizable-handle::after {
              content: '';
              position: absolute;
              left: 3px;
              top: 25%;
              bottom: 25%;
              width: 1px;
              background: #d9d9d9;
            }
          `}</style>
          {tableLayout === 'default' ? (
            <Table
              columns={resizableDefaultColumns}
              dataSource={data}
              loading={loading}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              components={defaultTableComponents}
              style={{ minWidth: '100%' }}
              rowClassName={(record: any, index: number) => {
                const classes: string[] = [];

                if (dataSource === 'appsflyer' && (selectedMediaSources.length > 0 || selectedAdSequences.length > 0)) {
                  const dateIndex = data.findIndex(item => item.query_date === record.query_date);
                  const mediaCount = selectedMediaSources.length > 0 ? selectedMediaSources.length : 1;
                  const adCount = selectedAdSequences.length > 0 ? selectedAdSequences.length : 1;
                  const dimensionCount = mediaCount * adCount;
                  const dateGroupIndex = Math.floor(dateIndex / dimensionCount);
                  classes.push(dateGroupIndex % 2 === 0 ? 'date-group-even' : 'date-group-odd');

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
                  setPagination(prev => ({
                    ...prev,
                    current: page,
                    pageSize: pageSize || prev.pageSize,
                  }));
                  setTimeout(() => saveQueryState(), 100);
                },
                onShowSizeChange: (_, size) => {
                  setPagination(prev => ({
                    ...prev,
                    current: 1,
                    pageSize: size,
                  }));
                  setTimeout(() => saveQueryState(), 100);
                },
              }}
              bordered
              size="middle"
            />
          ) : (
            <Table
              columns={resizableTransposedColumns}
              dataSource={transposedData}
              loading={loading}
              rowKey="id"
              scroll={{ x: 'max-content', y: 600 }}
              rowClassName={(_: any, index: number) => (index % 2 === 0 ? 'date-group-even' : 'date-group-odd')}
              onRow={() => ({ style: { cursor: 'default' } })}
              pagination={false}
              bordered
              size="middle"
              components={transposedTableComponents}
              style={{ minWidth: '100%' }}
            />
          )}
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
                {currentItems.map((item, index) => {
                  const key = `${item.type}-${item.type === 'event' ? item.name : `${item.event1}-${item.event2}`}-${index}`;
                  const isDragOver = dragOverIndex === index;
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={handleDragStartItem(index)}
                      onDragEnter={handleDragEnterItem(index)}
                      onDragOver={handleDragOverItem(index)}
                      onDrop={handleDropOnItem(index)}
                      onDragEnd={handleDragEndItem}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        marginBottom: '8px',
                        background: item.type === 'funnel' ? '#fff7e6' : '#f5f5f5',
                        borderRadius: '4px',
                        border: `1px ${isDragOver ? 'dashed #1677ff' : item.type === 'funnel' ? '#ffd591' : '#d9d9d9'}`,
                        boxShadow: isDragOver ? '0 6px 12px rgba(22,119,255,0.2)' : 'none',
                        cursor: 'grab',
                      }}
                      title={t('attributionData.dragToReorder') ?? '拖拽调整顺序'}
                    >
                      <Space size="middle">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '4px',
                            background: '#e6f4ff',
                            color: '#1677ff',
                            cursor: 'grab',
                          }}
                        >
                          <MenuOutlined />
                        </span>
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
                  );
                })}
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragItemIndexRef.current !== null) {
                      setDragOverIndex(currentItems.length);
                    }
                  }}
                  onDrop={handleDropAtEnd}
                  style={{ height: 12 }}
                />
              </div>
            )}
          </div>
        </Modal>

        {/* 筛选条件模态框（仅回调数据源） */}
        <Modal
          title={t('attributionData.filterConditions')}
          open={filterVisible}
          confirmLoading={filterConfirmLoading}
          maskClosable={!filtersLocked}
          closable={!filtersLocked}
          okButtonProps={{ disabled: filtersLocked }}
          cancelButtonProps={{ disabled: filtersLocked }}
          onOk={async () => {
            setFilterConfirmLoading(true);
            setMediaFilterLoading(true);
            try {
              const favoritesSaved = await persistFavoriteChanges();
              if (!favoritesSaved) {
                setMediaFilterLoading(false);
                return;
              }
              setFilterVisible(false);
              await fetchData(true);
              message.success('筛选条件已应用');
            } finally {
              setFilterConfirmLoading(false);
              setMediaFilterLoading(false);
            }
          }}
          onCancel={() => {
            if (filtersLocked) return;
            setFilterVisible(false);
          }}
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
                onChange={(value) => {
                  setSelectedAppId(value);
                  // 保存状态
                  setTimeout(() => saveQueryState(), 100);
                }}
                style={{ width: '100%' }}
                allowClear
                showSearch
                disabled={filtersLocked}
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
              <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('attributionData.userType.label')}</div>
              <Select
                placeholder={t('attributionData.userType.all')}
                value={selectedUserType}
                allowClear
                style={{ width: '100%' }}
                disabled={filtersLocked}
                onChange={(value) => {
                  setSelectedUserType(value);
                  setTimeout(() => saveQueryState(), 100);
                }}
              >
                <Select.Option value="0">{t('attributionData.userType.new')}</Select.Option>
                <Select.Option value="1">{t('attributionData.userType.returning')}</Select.Option>
              </Select>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('attributionData.mediaSource')} × {t('attributionData.adSequence')}</div>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {mediaAdPairs.map((pair, idx) => (
                  <Space key={pair.id} align="baseline" style={{ width: '100%' }}>
                    <Select
                      placeholder={t('attributionData.selectMediaSource')}
                      value={pair.media}
                      loading={mediaLoading}
                      style={{ width: 220 }}
                      showSearch
                      onChange={async (val) => {
                        const newPairs = [...mediaAdPairs];
                        newPairs[idx] = { ...newPairs[idx], media: val, ad: [] };
                        setMediaAdPairs(newPairs);
                        await loadAdSequencesForSingleMedia(val);
                        setTimeout(() => saveQueryState(), 100);
                      }}
                      disabled={filtersLocked}
                      filterOption={(input, option) => String(option?.children || '').toLowerCase().includes(input.toLowerCase())}
                    >
                      {allMediaSources.map(source => (
                        <Select.Option key={source} value={source}>{source}</Select.Option>
                      ))}
                    </Select>
                    <Select
                      mode="multiple"
                      placeholder={t('attributionData.allAdSequences')}
                      value={pair.ad}
                      style={{ width: 260 }}
                      disabled={filtersLocked || !pair.media || (pair.media ? adSequenceLoading[pair.media] : false)}
                      loading={pair.media ? adSequenceLoading[pair.media] : false}
                      showSearch
                      onChange={(val) => {
                        const newPairs = [...mediaAdPairs];
                        newPairs[idx] = { ...newPairs[idx], ad: val };
                        setMediaAdPairs(newPairs);
                        setTimeout(() => saveQueryState(), 100);
                      }}
                      filterOption={(input, option) => String(option?.children || '').toLowerCase().includes(input.toLowerCase())}
                    >
                      {(pair.media ? (mediaToAdSeqs[pair.media] || []) : []).length > 0 && pair.media
                        ? (() => {
                            const availableSeqs = mediaToAdSeqs[pair.media!] || [];
                            const favoriteEntries = (favoriteAdSequences[pair.media!] || []).filter(entry =>
                              availableSeqs.includes(entry.value),
                            );
                            const favoriteValues = favoriteEntries
                              .sort((a, b) => b.favoritedAt - a.favoritedAt)
                              .map(entry => entry.value);
                            const remaining = availableSeqs.filter(seq => !favoriteValues.includes(seq));
                            const displaySeqs = [...favoriteValues, ...remaining];
                            return displaySeqs.map(seq => {
                              const isFavorited = favoriteValues.includes(seq);
                              return (
                                <Select.Option key={seq} value={seq}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <span>{seq}</span>
                                    <span
                                      onMouseDown={handleFavoriteIconClick(pair.media!, seq)}
                                      style={{
                                        color: isFavorited ? '#faad14' : '#d9d9d9',
                                        fontSize: 16,
                                        cursor: filtersLocked ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        opacity: filtersLocked ? 0.5 : 1,
                                      }}
                                      onClick={(e) => {
                                        if (filtersLocked) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }
                                      }}
                                      title={isFavorited ? '取消收藏' : '收藏此广告序列'}
                                    >
                                      {isFavorited ? <StarFilled /> : <StarOutlined />}
                                    </span>
                                  </div>
                                </Select.Option>
                              );
                            });
                          })()
                        : null}
                    </Select>
                    <Button danger size="small" onClick={() => {
                      setMediaAdPairs(prev => prev.filter(p => p.id !== pair.id));
                      setTimeout(() => saveQueryState(), 100);
                    }} disabled={filtersLocked}>{t('common.delete')}</Button>
                  </Space>
                ))}
                <Button size="small" onClick={() => {
                  if (filtersLocked) return;
                  setMediaAdPairs(prev => [...prev, { id: `${Date.now()}_${Math.random()}`, media: undefined, ad: undefined }]);
                  setTimeout(() => saveQueryState(), 100);
                }} disabled={filtersLocked}>{t('common.add')}</Button>
              </Space>
            </div>

        {(selectedAppId || selectedMediaSources.length > 0 || selectedAdSequences.length > 0) && (
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
                  {selectedAdSequences.length > 0 && (
                    <span style={{ fontSize: '13px', color: '#1890ff' }}>
                      广告序列: <strong>{selectedAdSequences.join(', ')}</strong>
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
                      setSelectedAdSequences([]);
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
    </Spin>
  );
};

export default AdjustData;
