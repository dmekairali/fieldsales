import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRupeeSign } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import { 
  Card, 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Select, 
  Button, 
  Statistic,
  Row,
  Col,
  Progress,
  Divider,
  Badge,
  Tooltip,
  Modal,
  List,
  Avatar,
  Input,
  Spin,
  notification,
  Alert,
  Empty
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  HistoryOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';

const { Title, Text } = Typography;
const { Option } = Select;

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const LostAnalysis = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mrPerformanceLoading, setMrPerformanceLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    total: 0,
  });
  const [filters, setFilters] = useState({
    lostStatus: [],
    territory: [],
    mrName: [],
    customerType: [],
  });
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [mrPerformance, setMrPerformance] = useState([]);
  const [showMrModal, setShowMrModal] = useState(false);
  const [uniqueOptions, setUniqueOptions] = useState({
    territories: [],
    mrNames: [],
    customerTypes: []
  });

  // Fetch unique filter options
  const fetchFilterOptions = async () => {
    try {
      const { data: filterData, error } = await supabase
        .from('lost_client_analysis')
        .select('territory, last_order_taken_by_mr, assigned_mr_name, customer_type');

      if (error) throw error;

      const territories = [...new Set(filterData.map(item => item.territory).filter(Boolean))];
      const mrNames = [...new Set([
        ...filterData.map(item => item.last_order_taken_by_mr).filter(Boolean),
        ...filterData.map(item => item.assigned_mr_name).filter(Boolean)
      ])];
      const customerTypes = [...new Set(filterData.map(item => item.customer_type).filter(Boolean))];

      setUniqueOptions({
        territories: territories.sort(),
        mrNames: mrNames.sort(),
        customerTypes: customerTypes.sort()
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load filter options',
      });
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchData();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, filters, searchText]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build the Supabase query
      let query = supabase
        .from('lost_client_analysis')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchText) {
        query = query.or(`customer_name.ilike.%${searchText}%,customer_code.ilike.%${searchText}%`);
      }

      // Apply status filters
      if (filters.lostStatus.length > 0) {
        query = query.in('lost_status', filters.lostStatus);
      }

      // Apply territory filters
      if (filters.territory.length > 0) {
        query = query.in('territory', filters.territory);
      }

      // Apply MR filters
      if (filters.mrName.length > 0) {
        query = query.or(
          filters.mrName.map(mr => 
            `assigned_mr_name.eq.${mr},last_order_taken_by_mr.eq.${mr}`
          ).join(',')
        );
      }

      // Apply customer type filters
      if (filters.customerType.length > 0) {
        query = query.in('customer_type', filters.customerType);
      }

      // Add pagination
      const from = (pagination.current - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      // Add ordering
      query = query.order('priority_score', { ascending: false });

      const { data: results, count, error } = await query.range(from, to);

      if (error) throw error;

      setData(results || []);
      setPagination(prev => ({
        ...prev,
        total: count || 0,
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load customer data',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get counts by status
      const { data: statusData, error: statusError } = await supabase
        .from('lost_client_analysis')
        .select('lost_status, estimated_lost_revenue');
        
      if (statusError) throw statusError;

      // Manually group the status counts
      const statusCounts = statusData.reduce((acc, item) => {
        acc[item.lost_status] = (acc[item.lost_status] || 0) + 1;
        return acc;
      }, {});

      // Get total lost revenue for LOST status customers
      const totalLostRevenue = statusData
        .filter(item => item.lost_status === 'LOST')
        .reduce((sum, item) => sum + (item.estimated_lost_revenue || 0), 0);

      // Get at-risk customer count (AT_RISK and OVERDUE)
      const atRiskCount = statusData.filter(item => 
        ['AT_RISK', 'OVERDUE'].includes(item.lost_status)
      ).length;

      setStats({
        statusCounts,
        totalLostRevenue,
        atRiskCount,
        totalCustomers: statusData.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load statistics',
      });
    }
  };

  const fetchMrPerformance = async () => {
    setMrPerformanceLoading(true);
    try {
      // First get all MR names from both fields
      const { data: mrData, error: mrError } = await supabase
        .from('lost_client_analysis')
        .select('last_order_taken_by_mr, assigned_mr_name');

      if (mrError) throw mrError;

      // Get unique MR names from both fields
      const allMrNames = new Set();
      mrData.forEach(item => {
        if (item.last_order_taken_by_mr) allMrNames.add(item.last_order_taken_by_mr);
        if (item.assigned_mr_name) allMrNames.add(item.assigned_mr_name);
      });

      const uniqueMrs = Array.from(allMrNames).filter(Boolean);

      if (uniqueMrs.length === 0) {
        setMrPerformance([]);
        return;
      }

      // Fetch stats for each MR
      const performanceData = await Promise.all(
        uniqueMrs.map(async (mr) => {
          try {
            const { data: mrCustomers, error: customersError } = await supabase
              .from('lost_client_analysis')
              .select('lost_status, estimated_lost_revenue, recovery_probability_percent')
              .or(`assigned_mr_name.eq.${mr},last_order_taken_by_mr.eq.${mr}`);

            if (customersError) {
              console.error(`Error fetching data for MR ${mr}:`, customersError);
              return null;
            }

            const lostCustomers = mrCustomers.filter(c => c.lost_status === 'LOST').length;
            const atRiskCustomers = mrCustomers.filter(c => 
              ['AT_RISK', 'OVERDUE'].includes(c.lost_status)
            ).length;
            const activeCustomers = mrCustomers.filter(c => c.lost_status === 'ACTIVE').length;
            
            const avgRecovery = mrCustomers.length > 0 
              ? mrCustomers.reduce((sum, c) => sum + (c.recovery_probability_percent || 0), 0) / mrCustomers.length
              : 0;
              
            const totalLostRevenue = mrCustomers
              .filter(c => c.lost_status === 'LOST')
              .reduce((sum, c) => sum + (c.estimated_lost_revenue || 0), 0);

            const potentialRecoveryRevenue = mrCustomers
              .filter(c => ['AT_RISK', 'OVERDUE'].includes(c.lost_status))
              .reduce((sum, c) => sum + (c.estimated_lost_revenue || 0), 0);

            return {
              mr_name: mr,
              total_customers: mrCustomers.length,
              active_customers: activeCustomers,
              lost_customers: lostCustomers,
              at_risk_customers: atRiskCustomers,
              avg_recovery_probability: Math.round(avgRecovery * 100) / 100,
              total_lost_revenue: totalLostRevenue,
              potential_recovery_revenue: potentialRecoveryRevenue,
              retention_rate: mrCustomers.length > 0 ? 
                Math.round(((activeCustomers / mrCustomers.length) * 100) * 100) / 100 : 0
            };
          } catch (error) {
            console.error(`Error processing MR ${mr}:`, error);
            return null;
          }
        })
      );

      // Filter out null results and sort by total lost revenue
      const validPerformanceData = performanceData
        .filter(Boolean)
        .sort((a, b) => b.total_lost_revenue - a.total_lost_revenue);

      setMrPerformance(validPerformanceData);
    } catch (error) {
      console.error('Error fetching MR performance:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load MR performance data',
      });
    } finally {
      setMrPerformanceLoading(false);
    }
  };

  const handleTableChange = (newPagination, tableFilters, sorter) => {
    setPagination(newPagination);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handleResetFilters = () => {
    const resetFilters = {
      lostStatus: [],
      territory: [],
      mrName: [],
      customerType: [],
    };
    setFilters(resetFilters);
    setSearchText('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleMrModalOpen = () => {
    setShowMrModal(true);
    if (mrPerformance.length === 0) {
      fetchMrPerformance();
    }
  };

  const renderLostStatus = (status) => {
    const statusMap = {
      ACTIVE: { color: 'green', icon: <CheckCircleOutlined /> },
      AT_RISK: { color: 'orange', icon: <ExclamationCircleOutlined /> },
      OVERDUE: { color: 'volcano', icon: <WarningOutlined /> },
      LOST: { color: 'red', icon: <StopOutlined /> },
      NEVER_ORDERED: { color: 'gray', icon: <UserOutlined /> },
      CONCERN: { color: 'gold', icon: <ExclamationCircleOutlined /> },
    };

    return (
      <Tag color={statusMap[status]?.color || 'default'} icon={statusMap[status]?.icon}>
        {status?.replace('_', ' ')}
      </Tag>
    );
  };

  const renderRecoveryProbability = (probability) => {
    let status = 'normal';
    let strokeColor = '#52c41a';
    
    if (probability > 70) {
      status = 'success';
      strokeColor = '#52c41a';
    } else if (probability > 40) {
      status = 'active';
      strokeColor = '#1890ff';
    } else if (probability > 10) {
      status = 'exception';
      strokeColor = '#faad14';
    } else {
      status = 'exception';
      strokeColor = '#ff4d4f';
    }

    return (
      <Progress 
        percent={probability} 
        status={status}
        strokeColor={strokeColor}
        format={(percent) => `${percent}%`}
        size="small"
      />
    );
  };

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => setSelectedCustomer(record)}
          style={{ padding: 0 }}
        >
          <div>
            <div>{text || record.customer_code}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.customer_code}
            </Text>
          </div>
        </Button>
      ),
      sorter: true,
      width: 200,
    },
    {
      title: 'Type',
      dataIndex: 'customer_type',
      key: 'customer_type',
      render: (type) => (
        <Tag color="blue">{type}</Tag>
      ),
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'lost_status',
      key: 'lost_status',
      render: renderLostStatus,
      width: 120,
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <div>
          <div>{record.city_name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.territory}
          </Text>
        </div>
      ),
      width: 120,
    },
    {
      title: 'Last Order',
      dataIndex: 'days_since_last_order',
      key: 'days_since_last_order',
      render: (days, record) => (
        <div>
          <div>{days} days ago</div>
          {record.last_order_date && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {moment(record.last_order_date).format('MMM DD, YYYY')}
            </Text>
          )}
        </div>
      ),
      sorter: true,
      width: 120,
    },
    {
      title: 'MR',
      key: 'mr',
      render: (_, record) => (
        <div>
          <Tooltip title={`Assigned: ${record.assigned_mr_name || 'None'}`}>
            <div>{record.last_order_taken_by_mr || 'Unknown'}</div>
            {record.assigned_mr_name && record.assigned_mr_name !== record.last_order_taken_by_mr && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Assigned: {record.assigned_mr_name}
              </Text>
            )}
          </Tooltip>
        </div>
      ),
      width: 150,
    },
    {
      title: 'Recovery Chance',
      dataIndex: 'recovery_probability_percent',
      key: 'recovery',
      render: renderRecoveryProbability,
      sorter: true,
      width: 150,
    },
    {
      title: 'Lost Revenue',
      dataIndex: 'estimated_lost_revenue',
      key: 'lost_revenue',
      render: (amount) => (
        <Text type={amount > 0 ? 'danger' : 'secondary'}>
          <FontAwesomeIcon icon={faRupeeSign} /> {amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      ),
      sorter: true,
      width: 130,
    },
    {
      title: 'Priority',
      dataIndex: 'priority_score',
      key: 'priority',
      render: (score) => (
        <div>
          <Progress 
            percent={score} 
            status="active" 
            showInfo={false}
            strokeColor={score > 80 ? '#ff4d4f' : score > 60 ? '#faad14' : '#52c41a'}
            size="small"
          />
          <Text style={{ fontSize: '12px' }}>{score}/100</Text>
        </div>
      ),
      sorter: true,
      width: 100,
    },
  ];

  const mrPerformanceColumns = [
    {
      title: 'MR Name',
      dataIndex: 'mr_name',
      key: 'mr_name',
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Total Customers',
      dataIndex: 'total_customers',
      key: 'total_customers',
      sorter: (a, b) => a.total_customers - b.total_customers,
      width: 120,
    },
    {
      title: 'Active',
      dataIndex: 'active_customers',
      key: 'active_customers',
      render: (value) => <Text style={{ color: '#52c41a' }}>{value}</Text>,
      sorter: (a, b) => a.active_customers - b.active_customers,
      width: 80,
    },
    {
      title: 'At Risk',
      dataIndex: 'at_risk_customers',
      key: 'at_risk_customers',
      render: (value) => <Text style={{ color: '#faad14' }}>{value}</Text>,
      sorter: (a, b) => a.at_risk_customers - b.at_risk_customers,
      width: 80,
    },
    {
      title: 'Lost',
      dataIndex: 'lost_customers',
      key: 'lost_customers',
      render: (value) => <Text type="danger">{value}</Text>,
      sorter: (a, b) => a.lost_customers - b.lost_customers,
      width: 80,
    },
    {
      title: 'Retention Rate',
      dataIndex: 'retention_rate',
      key: 'retention_rate',
      render: (rate) => (
        <div>
          <Progress 
            percent={rate} 
            size="small"
            status={rate > 80 ? 'success' : rate > 60 ? 'active' : 'exception'}
          />
        </div>
      ),
      sorter: (a, b) => a.retention_rate - b.retention_rate,
      width: 120,
    },
    {
      title: 'Avg Recovery Probability',
      dataIndex: 'avg_recovery_probability',
      key: 'avg_recovery_probability',
      render: (probability) => renderRecoveryProbability(probability),
      sorter: (a, b) => a.avg_recovery_probability - b.avg_recovery_probability,
      width: 150,
    },
    {
      title: 'Lost Revenue',
      dataIndex: 'total_lost_revenue',
      key: 'total_lost_revenue',
      render: (value) => (
        <Text type="danger">
          ₹{value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      ),
      sorter: (a, b) => a.total_lost_revenue - b.total_lost_revenue,
      width: 130,
    },
    {
      title: 'Recovery Potential',
      dataIndex: 'potential_recovery_revenue',
      key: 'potential_recovery_revenue',
      render: (value) => (
        <Text style={{ color: '#1890ff' }}>
          ₹{value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      ),
      sorter: (a, b) => a.potential_recovery_revenue - b.potential_recovery_revenue,
      width: 130,
    },
  ];

  return (
     <div className="lost-analysis-dashboard" style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Customer Retention Dashboard</Title>
        <Text type="secondary">Monitor at-risk and lost customers with actionable insights</Text>
      </div>
      
      
      <Divider />
      
      {/* Stats Overview */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Customers"
                value={stats.statusCounts?.ACTIVE || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
                suffix={`/ ${stats.totalCustomers}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="At Risk Customers"
                value={stats.atRiskCount}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
                suffix={`/ ${stats.totalCustomers}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Lost Customers"
                value={stats.statusCounts?.LOST || 0}
                prefix={<StopOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
                suffix={`/ ${stats.totalCustomers}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Potential Lost Revenue"
                value={stats.totalLostRevenue}
                prefix={<FontAwesomeIcon icon={faRupeeSign} />}
                valueStyle={{ color: '#ff4d4f' }}
                formatter={(value) => `${(value / 100000).toFixed(1)}L`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            <span>Filters & Search</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              onClick={handleResetFilters} 
              icon={<ReloadOutlined />}
            >
              Reset
            </Button>
            <Button 
              type="primary" 
              icon={<TeamOutlined />}
              onClick={handleMrModalOpen}
              loading={mrPerformanceLoading}
            >
              View MR Performance
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input.Search
              placeholder="Search customers"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              mode="multiple"
              placeholder="Filter by Status"
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('lostStatus', value)}
              value={filters.lostStatus}
              allowClear
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="AT_RISK">At Risk</Option>
              <Option value="OVERDUE">Overdue</Option>
              <Option value="LOST">Lost</Option>
              <Option value="NEVER_ORDERED">Never Ordered</Option>
              <Option value="CONCERN">Concern</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              mode="multiple"
              placeholder="Filter by Territory"
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('territory', value)}
              value={filters.territory}
              allowClear
            >
              {uniqueOptions.territories.map(territory => (
                <Option key={territory} value={territory}>{territory}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              mode="multiple"
              placeholder="Filter by MR"
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('mrName', value)}
              value={filters.mrName}
              allowClear
            >
              {uniqueOptions.mrNames.map(mr => (
                <Option key={mr} value={mr}>{mr}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card
        title={
          <Space>
            <span>Customer Retention Analysis</span>
            <Badge count={data.length} showZero style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
      >
        <Table
          columns={columns}
          rowKey="customer_code"
          dataSource={data}
          pagination={{
            ...pagination,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} customers`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* Customer Detail Modal */}
      <Modal
        title={
          selectedCustomer ? (
            <Space>
              <UserOutlined />
              <span>Customer Details - {selectedCustomer.customer_name}</span>
            </Space>
          ) : "Customer Details"
        }
        open={!!selectedCustomer}
        onCancel={() => setSelectedCustomer(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedCustomer && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={16}>
                <Title level={4}>{selectedCustomer.customer_name}</Title>
                <Text type="secondary">{selectedCustomer.customer_code}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                {renderLostStatus(selectedCustomer.lost_status)}
                <div style={{ marginTop: 8 }}>
                  <Text>Priority: </Text>
                  <Badge 
                    count={selectedCustomer.priority_score} 
                    style={{ 
                      backgroundColor: selectedCustomer.priority_score > 80 ? '#ff4d4f' : 
                                      selectedCustomer.priority_score > 60 ? '#faad14' : '#52c41a'
                    }} 
                  />
                </div>
              </Col>
            </Row>
            
            <Divider />
            
            <Row gutter={16}>
              <Col span={8}>
                <Card title="Basic Info" size="small">
                  <p><Text strong>Type:</Text> {selectedCustomer.customer_type}</p>
                  <p><Text strong>Location:</Text> {selectedCustomer.city_name}, {selectedCustomer.territory}</p>
                  <p><Text strong>Customer Since:</Text> {selectedCustomer.first_order_date ? moment(selectedCustomer.first_order_date).format('MMM D, YYYY') : 'N/A'}</p>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Order History" size="small">
                  <p><Text strong>Last Order:</Text> {selectedCustomer.last_order_date ? moment(selectedCustomer.last_order_date).format('MMM D, YYYY') : 'N/A'}</p>
                  <p><Text strong>Days Since Last Order:</Text> {selectedCustomer.days_since_last_order}</p>
                  <p><Text strong>Total Orders:</Text> {selectedCustomer.total_orders_all_time}</p>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Financials" size="small">
                  <p><Text strong>Lifetime Revenue:</Text> ₹{selectedCustomer.total_lifetime_revenue?.toLocaleString('en-IN') || '0'}</p>
                  <p><Text strong>Estimated Lost Revenue:</Text> ₹{selectedCustomer.estimated_lost_revenue?.toLocaleString('en-IN') || '0'}</p>
                  <p><Text strong>Avg Order Value (90d):</Text> ₹{selectedCustomer.avg_order_value_90d?.toLocaleString('en-IN') || '0'}</p>
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Row gutter={16}>
              <Col span={12}>
                <Card title="MR Relationships" size="small">
                  <p><Text strong>Assigned MR:</Text> {selectedCustomer.assigned_mr_name || 'None'}</p>
                  <p><Text strong>Last Order MR:</Text> {selectedCustomer.last_order_taken_by_mr || 'Unknown'}</p>
                  <p><Text strong>Most Frequent MR:</Text> {selectedCustomer.most_frequent_mr || 'N/A'}</p>
                  <p><Text strong>MR Changes:</Text> {selectedCustomer.mr_transition_count || 0}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Order Patterns" size="small">
                  <p><Text strong>Avg Order Cycle:</Text> {selectedCustomer.avg_order_cycle_days || 'N/A'} days</p>
                  <p><Text strong>Order Predictability:</Text> {selectedCustomer.order_predictability || 'N/A'}</p>
                  <p><Text strong>Expected Next Order:</Text> {selectedCustomer.expected_next_order_date ? moment(selectedCustomer.expected_next_order_date).format('MMM D, YYYY') : 'N/A'}</p>
                  <p><Text strong>Recovery Probability:</Text> {renderRecoveryProbability(selectedCustomer.recovery_probability_percent || 0)}</p>
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Card title="Recommended Action" size="small">
              <Alert
                message={selectedCustomer.recommended_action || 'No specific action recommended'}
                description={getActionDescription(selectedCustomer.recommended_action)}
                type={getActionAlertType(selectedCustomer.recommended_action)}
                showIcon
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* MR Performance Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined />
            <span>Medical Representative Performance Analysis</span>
            <Badge count={mrPerformance.length} showZero />
          </Space>
        }
        open={showMrModal}
        onCancel={() => setShowMrModal(false)}
        footer={
          <Space>
            <Button onClick={() => setShowMrModal(false)}>Close</Button>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={fetchMrPerformance}
              loading={mrPerformanceLoading}
            >
              Refresh Data
            </Button>
          </Space>
        }
        width={1200}
        destroyOnClose
      >
        {mrPerformanceLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>Loading MR performance data...</Text>
            </div>
          </div>
        ) : mrPerformance.length > 0 ? (
          <>
            <Alert
              message="Performance Summary"
              description={`Analysis of ${mrPerformance.length} Medical Representatives based on customer retention metrics`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              columns={mrPerformanceColumns}
              dataSource={mrPerformance}
              rowKey="mr_name"
              scroll={{ x: 1000 }}
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} MRs`,
              }}
            />
          </>
        ) : (
          <Empty
            description="No MR performance data available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              onClick={fetchMrPerformance}
              loading={mrPerformanceLoading}
            >
              Load Data
            </Button>
          </Empty>
        )}
      </Modal>
    </div>
  );
};

// Helper function for action descriptions
const getActionDescription = (action) => {
  const actions = {
    'PROSPECT_NURTURING': 'This customer has never ordered. Focus on initial engagement and education about your products/services.',
    'MAINTAIN_RELATIONSHIP': 'Customer is active. Continue regular engagement and look for upsell opportunities.',
    'PROACTIVE_FOLLOW_UP': 'Customer is slightly overdue. Reach out to understand any issues and remind them of your value.',
    'NEW_MR_FOLLOW_UP': 'Customer recently changed MRs. The new MR should establish relationship and address any concerns.',
    'URGENT_OUTREACH': 'Customer is significantly overdue. Immediate contact needed to prevent loss.',
    'RETENTION_CAMPAIGN': 'Customer is at high risk of churn. Implement targeted retention strategies.',
    'WIN_BACK_CAMPAIGN': 'Customer has likely churned. Consider special offers or incentives to regain business.',
    'ASSIGN_DEDICATED_MR': 'Customer has experienced high MR turnover. Assign a dedicated representative to rebuild trust.',
  };
  
  return actions[action] || 'No specific action description available.';
};

// Helper function for action alert type
const getActionAlertType = (action) => {
  const urgentActions = ['URGENT_OUTREACH', 'WIN_BACK_CAMPAIGN', 'RETENTION_CAMPAIGN'];
  const warningActions = ['PROACTIVE_FOLLOW_UP', 'NEW_MR_FOLLOW_UP', 'ASSIGN_DEDICATED_MR'];
  const infoActions = ['MAINTAIN_RELATIONSHIP', 'PROSPECT_NURTURING'];
  
  if (urgentActions.includes(action)) return 'error';
  if (warningActions.includes(action)) return 'warning';
  if (infoActions.includes(action)) return 'success';
  return 'info';
};

export default LostAnalysis;
