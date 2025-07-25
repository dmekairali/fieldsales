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
  Spin
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  UserOutlined,
  HistoryOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined
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
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
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

  useEffect(() => {
    fetchData();
    fetchStats();
    fetchMrPerformance();
  }, []);

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
          `assigned_mr_name.in.(${filters.mrName.join(',')}),last_order_taken_by_mr.in.(${filters.mrName.join(',')})`
        );
      }

      // Apply customer type filters
      if (filters.customerType.length > 0) {
        query = query.in('customer_type', filters.customerType);
      }

      // Add pagination
      const from = (pagination.current - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      const { data: results, count, error } = await query.range(from, to);

      if (error) throw error;

      setData(results);
      setPagination({
        ...pagination,
        total: count,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get counts by status
      const { data: statusCounts } = await supabase
        .from('lost_client_analysis')
        .select('lost_status, count(*)')
        .group('lost_status');

      // Get total lost revenue
      const { data: lostRevenue } = await supabase
        .from('lost_client_analysis')
        .select('sum(estimated_lost_revenue)')
        .eq('lost_status', 'LOST');

      // Get at-risk customer count
      const { data: atRiskCount } = await supabase
        .from('lost_client_analysis')
        .select('count(*)')
        .in('lost_status', ['AT_RISK', 'OVERDUE']);

      setStats({
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.lost_status] = item.count;
          return acc;
        }, {}),
        totalLostRevenue: lostRevenue[0]?.sum || 0,
        atRiskCount: atRiskCount[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMrPerformance = async () => {
    try {
      // Get MR performance data
      const { data: performanceData } = await supabase
        .rpc('get_mr_performance_stats');

      setMrPerformance(performanceData || []);
    } catch (error) {
      console.error('Error fetching MR performance:', error);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
    fetchData();
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchData();
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchData();
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
    fetchData();
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
        {status}
      </Tag>
    );
  };

  const renderRecoveryProbability = (probability) => {
    let status = 'normal';
    if (probability > 70) status = 'success';
    else if (probability > 40) status = 'active';
    else if (probability > 10) status = 'exception';

    return (
      <Progress 
        percent={probability} 
        status={status}
        format={(percent) => `${percent}%`}
        width={80}
      />
    );
  };

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text, record) => (
        <Button type="link" onClick={() => setSelectedCustomer(record)}>
          {text || record.customer_code}
        </Button>
      ),
      sorter: true,
    },
    {
      title: 'Type',
      dataIndex: 'customer_type',
      key: 'customer_type',
      filters: [
        { text: 'Retail', value: 'Retail' },
        { text: 'Wholesale', value: 'Wholesale' },
        { text: 'Corporate', value: 'Corporate' },
      ],
    },
    {
      title: 'Status',
      dataIndex: 'lost_status',
      key: 'lost_status',
      render: renderLostStatus,
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'At Risk', value: 'AT_RISK' },
        { text: 'Overdue', value: 'OVERDUE' },
        { text: 'Lost', value: 'LOST' },
      ],
    },
    {
      title: 'Last Order',
      dataIndex: 'days_since_last_order',
      key: 'days_since_last_order',
      render: (days) => `${days} days ago`,
      sorter: true,
    },
    {
      title: 'MR',
      dataIndex: 'last_order_taken_by_mr',
      key: 'mr',
      render: (text, record) => (
        <Tooltip title={`Assigned: ${record.assigned_mr_name || 'None'}`}>
          {text || 'Unknown'}
        </Tooltip>
      ),
    },
    {
      title: 'Recovery Chance',
      dataIndex: 'recovery_probability_percent',
      key: 'recovery',
      render: renderRecoveryProbability,
      sorter: true,
    },
    {
      title: 'Lost Revenue',
      dataIndex: 'estimated_lost_revenue',
      key: 'lost_revenue',
      render: (amount) => (
        <Text type={amount > 0 ? 'danger' : 'secondary'}>
          <DollarOutlined /> {amount.toFixed(2)}
        </Text>
      ),
      sorter: true,
    },
    {
      title: 'Priority',
      dataIndex: 'priority_score',
      key: 'priority',
      render: (score) => (
        <Progress 
          percent={score} 
          status="active" 
          showInfo={false}
          strokeColor={score > 80 ? '#ff4d4f' : score > 60 ? '#faad14' : '#52c41a'}
        />
      ),
      sorter: true,
    },
  ];

  return (
    <div className="lost-analysis-dashboard">
      <Title level={2}>Customer Retention Dashboard</Title>
      <Text type="secondary">Monitor at-risk and lost customers</Text>
      
      <Divider />
      
      {/* Stats Overview */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Active Customers"
                value={stats.statusCounts?.ACTIVE || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="At Risk Customers"
                value={stats.atRiskCount}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Lost Customers"
                value={stats.statusCounts?.LOST || 0}
                prefix={<StopOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Potential Lost Revenue"
                value={stats.totalLostRevenue}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
                precision={2}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card
        title="Filters"
        extra={
          <Button onClick={handleResetFilters} icon={<FilterOutlined />}>
            Reset Filters
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Space size="large">
          <Input.Search
            placeholder="Search customers"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          
          <Select
            mode="multiple"
            placeholder="Filter by Status"
            style={{ width: 200 }}
            onChange={(value) => handleFilterChange('lostStatus', value)}
            value={filters.lostStatus}
          >
            <Option value="ACTIVE">Active</Option>
            <Option value="AT_RISK">At Risk</Option>
            <Option value="OVERDUE">Overdue</Option>
            <Option value="LOST">Lost</Option>
          </Select>
          
          <Select
            mode="multiple"
            placeholder="Filter by Territory"
            style={{ width: 200 }}
            onChange={(value) => handleFilterChange('territory', value)}
            value={filters.territory}
          >
            {/* These options should be dynamic based on your data */}
            <Option value="North">North</Option>
            <Option value="South">South</Option>
            <Option value="East">East</Option>
            <Option value="West">West</Option>
          </Select>
          
          <Select
            mode="multiple"
            placeholder="Filter by MR"
            style={{ width: 200 }}
            onChange={(value) => handleFilterChange('mrName', value)}
            value={filters.mrName}
          >
            {/* These options should be dynamic based on your data */}
            <Option value="John Doe">John Doe</Option>
            <Option value="Jane Smith">Jane Smith</Option>
          </Select>
        </Space>
      </Card>

      {/* Main Table */}
      <Card
        title="Customer Retention Analysis"
        extra={
          <Button 
            type="primary" 
            icon={<TeamOutlined />}
            onClick={() => setShowMrModal(true)}
          >
            View MR Performance
          </Button>
        }
      >
        <Table
          columns={columns}
          rowKey="customer_code"
          dataSource={data}
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Customer Detail Modal */}
      <Modal
        title="Customer Details"
        visible={!!selectedCustomer}
        onCancel={() => setSelectedCustomer(null)}
        footer={null}
        width={800}
      >
        {selectedCustomer && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Title level={4}>{selectedCustomer.customer_name}</Title>
                <Text type="secondary">{selectedCustomer.customer_code}</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                {renderLostStatus(selectedCustomer.lost_status)}
                <div>
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
                  <p><Text strong>Customer Since:</Text> {moment(selectedCustomer.first_order_date).format('MMM D, YYYY')}</p>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Order History" size="small">
                  <p><Text strong>Last Order:</Text> {moment(selectedCustomer.last_order_date).format('MMM D, YYYY')}</p>
                  <p><Text strong>Days Since Last Order:</Text> {selectedCustomer.days_since_last_order}</p>
                  <p><Text strong>Total Orders:</Text> {selectedCustomer.total_orders_all_time}</p>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Financials" size="small">
                  <p><Text strong>Lifetime Revenue:</Text> ${selectedCustomer.total_lifetime_revenue.toFixed(2)}</p>
                  <p><Text strong>Estimated Lost Revenue:</Text> ${selectedCustomer.estimated_lost_revenue.toFixed(2)}</p>
                  <p><Text strong>Avg Order Value (90d):</Text> ${selectedCustomer.avg_order_value_90d.toFixed(2)}</p>
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Row gutter={16}>
              <Col span={12}>
                <Card title="MR Relationships" size="small">
                  <p><Text strong>Assigned MR:</Text> {selectedCustomer.assigned_mr_name || 'None'}</p>
                  <p><Text strong>Last Order MR:</Text> {selectedCustomer.last_order_taken_by_mr}</p>
                  <p><Text strong>Most Frequent MR:</Text> {selectedCustomer.most_frequent_mr}</p>
                  <p><Text strong>MR Changes:</Text> {selectedCustomer.mr_transition_count}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Order Patterns" size="small">
                  <p><Text strong>Avg Order Cycle:</Text> {selectedCustomer.avg_order_cycle_days} days</p>
                  <p><Text strong>Order Predictability:</Text> {selectedCustomer.order_predictability}</p>
                  <p><Text strong>Expected Next Order:</Text> {moment(selectedCustomer.expected_next_order_date).format('MMM D, YYYY')}</p>
                  <p><Text strong>Recovery Probability:</Text> {renderRecoveryProbability(selectedCustomer.recovery_probability_percent)}</p>
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Card title="Recommended Action" size="small">
              <Text strong>{selectedCustomer.recommended_action}</Text>
              <p>{getActionDescription(selectedCustomer.recommended_action)}</p>
            </Card>
          </div>
        )}
      </Modal>

      {/* MR Performance Modal */}
      <Modal
        title="Medical Representative Performance"
        visible={showMrModal}
        onCancel={() => setShowMrModal(false)}
        footer={null}
        width={1000}
      >
        {mrPerformance.length > 0 ? (
          <Table
            columns={[
              {
                title: 'MR Name',
                dataIndex: 'mr_name',
                key: 'mr_name',
                fixed: 'left',
              },
              {
                title: 'Total Customers',
                dataIndex: 'total_customers',
                key: 'total_customers',
                sorter: (a, b) => a.total_customers - b.total_customers,
              },
              {
                title: 'Lost Customers',
                dataIndex: 'lost_customers',
                key: 'lost_customers',
                render: (value) => <Text type="danger">{value}</Text>,
                sorter: (a, b) => a.lost_customers - b.lost_customers,
              },
              {
                title: 'At Risk Customers',
                dataIndex: 'at_risk_customers',
                key: 'at_risk_customers',
                render: (value) => <Text type="warning">{value}</Text>,
                sorter: (a, b) => a.at_risk_customers - b.at_risk_customers,
              },
              {
                title: 'Avg Recovery Probability',
                dataIndex: 'avg_recovery_probability',
                key: 'avg_recovery_probability',
                render: renderRecoveryProbability,
                sorter: (a, b) => a.avg_recovery_probability - b.avg_recovery_probability,
              },
              {
                title: 'Total Lost Revenue',
                dataIndex: 'total_lost_revenue',
                key: 'total_lost_revenue',
                render: (value) => <Text type="danger">${value.toFixed(2)}</Text>,
                sorter: (a, b) => a.total_lost_revenue - b.total_lost_revenue,
              },
            ]}
            dataSource={mrPerformance}
            rowKey="mr_name"
            scroll={{ x: true }}
          />
        ) : (
          <Spin tip="Loading MR performance data..." />
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

export default LostAnalysis;
