import React, { useState, useEffect, useContext } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { FaShoppingCart, FaDollarSign, FaChevronLeft } from 'react-icons/fa';
import { FiTrendingUp, FiTrendingDown, FiEye, FiUser, FiMapPin, FiPhone } from 'react-icons/fi';
import { PopupContext } from '../../../contexts/PopupContext';
import { getAllOrders, getOrderDashboard, getOrderDetails } from '../../../apis/orderApi';
import { FaChevronRight } from 'react-icons/fa6';
import { getAllInventories, getInventoryOrderByStock } from '../../../apis/inventoryApi';
import { getCustomerDashboard } from '../../../apis/customerApi';
import { Helmet } from 'react-helmet-async';

const AdminDashboard = () => {
  const { showPopup } = useContext(PopupContext);
  const [orderData, setOrderData] = useState(null);

  const [recentOrdersData, setRecentOrdersData] = useState(null)
  const [recentOrderPage, setRecentOrderPage] = useState(0)
  const [totalRecentOrderPages, setTotalRecentOrderPages] = useState(0)
  const [orderDetails, setOrderDetails] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [customerData, setCustommerData] = useState(null)

  const [topProductsData, setTopProductData] = useState(null)
  const [topVariantsData, setTopVariantData] = useState(null)

  const [inventoryData, setInventoryData] = useState([])
  const [inventoryPage, setInventoryPage] = useState(0)
  const [hasMoreInventory, setHasMoreInventory] = useState(true)
  const [loadingInventory, setLoadingInventory] = useState(false)

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    if (!from || !to) return;

    const handler = setTimeout(() => {
      handleLoadOrderDashboard();
      handleLoadRecenOrderData(0);
      handleLoadInventoryData(0);
      handleLoadCustomerData();
    }, 500);

    return () => clearTimeout(handler);
  }, [from, to]);

  const formatLocalDate = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  async function handleLoadOrderDashboard() {
    const res = await getOrderDashboard(formatLocalDate(from), formatLocalDate(to));
    if (res.error) return showPopup(res.error);
    // console.log(res.data)
    setOrderData(res.data);
    setTopProductData(res.data.topProducts);
    setTopVariantData(res.data.topVariants);

  }
  async function handleLoadRecenOrderData(currentPage = recentOrderPage) {
    const res = await getAllOrders(
      currentPage,
      10,
      null,
      null,
      formatLocalDate(from),
      formatLocalDate(to),
      null,
      true
    );

    if (res.error) return showPopup(res.error);
    console.log(res.data)
    setRecentOrdersData(res.data.content);
    setRecentOrderPage(currentPage);
    setTotalRecentOrderPages(res.data.totalPages - 1);
  }
  async function handleLoadInventoryData(page = 0) {
    if (loadingInventory) return;

    setLoadingInventory(true);
    const res = await getInventoryOrderByStock(page, 10);

    if (res.error) {
      showPopup(res.error);
      setLoadingInventory(false);
      return;
    }

    if (page === 0) {
      setInventoryData(res.data.content);
    } else {
      setInventoryData(prev => [...prev, ...res.data.content]);
    }

    setInventoryPage(page);
    setHasMoreInventory(res.data.content.length === 10);
    setLoadingInventory(false);
  }
  async function handleLoadCustomerData() {
    const res = await getCustomerDashboard(from, to);
    if (res.error) return showPopup(res.error)
    // console.log(res.data)
    setCustommerData(res.data);
  }
  const handleGetOrderDetails = async (ownerNumber) => {
    const res = await getOrderDetails(ownerNumber);
    if (res.error) return showPopup(res.error);
    console.log(res.data)
    setOrderDetails(res.data);
    setIsDetailOpen(true);
  }

  function handleInventoryScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;

    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMoreInventory && !loadingInventory) {
      handleLoadInventoryData(inventoryPage + 1);
    }
  }

  function handleDateRangeChange(value) {
    setDateRange(value);

    const now = new Date();
    let start = null;
    let end = null;

    switch (value) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case 'yesterday':
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;

      case '7days':
        start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case '30days':
        start = new Date();
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case '6months':
        start = new Date();
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case 'custom':
        start = from ? new Date(from) : null;
        end = to ? new Date(to) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        break;

      default:
        start = null;
        end = null;
    }

    setFrom(start);
    setTo(end);
  }
  const statusMap = {
    PENDING: { id: 1, label: "Đang chờ", color: "#FBBF24" },
    CONFIRMED: { id: 2, label: "Đã xác nhận", color: "#3B82F6" },
    PROCESSING: { id: 3, label: "Đang xử lý", color: "#ee9219ff" },
    SHIPPED: { id: 4, label: "Đang vận chuyển", color: "#8B5CF6" },
    DELIVERED: { id: 5, label: "Đã giao", color: "#19c790ff" },
    CANCELLED: { id: 6, label: "Đã hủy", color: "#EF4444" },
    RETURNED: { id: 7, label: "Trả hàng", color: "#c9c7c6ff" },
  };

  const getStatusColor = (status) => {
    const colors = {
      CANCELLED: 'bg-red-500 text-white',
      DELIVERED: 'bg-green-500 text-white',
      CONFIRMED: 'bg-blue-500 text-white',
      RETURNED: 'bg-gray-200 text-white',
      PENDING: 'bg-yellow-500 text-white',
      PROCESSING: 'bg-orange-500 text-white',
      SHIPPED: 'bg-purple-500 text-white',
    };
    return colors[status] || 'bg-gray-500 text-gray-800';
  };

  if (!orderData) return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải...</p>
      </div>
    </div>
  );

  const stockStatus = inventoryData.map(item => {
    const availableStock = item.quantity - item.reservedQuantity;
    let status = 'normal';

    if (availableStock <= 0) {
      status = 'critical';
    } else if (availableStock <= 10) {
      status = 'low';
    }

    return {
      name: `${item.variant.name}`,
      sku: item.variant.sku,
      stock: availableStock,
      warehouse: item.warehouse.code,
      status: status
    };
  });

  const { totalCustomers, preTotalCustomers } = customerData || {};

  const { currentOrders, currentRevenue, previousOrders, previousRevenue } = orderData.orderStats;
  const statsCards = [
    {
      title: 'Tổng doanh thu',
      value: <>{currentRevenue?.toLocaleString()}₫</>,
      prevValue: <span className="text-gray-400 text-sm">({previousRevenue?.toLocaleString()}₫)</span>,
      change: previousRevenue ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1) : '0',
      isPositive: currentRevenue >= previousRevenue,
      bgGradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Đơn hàng hoàn tất',
      value: <>
        {currentOrders} <FaShoppingCart className="text-base inline-block mb-1" />
      </>,
      prevValue: <span className="text-gray-400 text-sm">({previousOrders})</span>,
      change: previousOrders ? (((currentOrders - previousOrders) / previousOrders) * 100).toFixed(1) : '0',
      isPositive: currentOrders >= previousOrders,
      bgGradient: 'from-green-500 to-green-600',
    },
    {
      title: 'Tài khoản mới',
      value: totalCustomers,
      prevValue: preTotalCustomers != null && preTotalCustomers >= 0
        ? <span className="text-gray-400 text-sm">({preTotalCustomers})</span>
        : null,
      change: preTotalCustomers
        ? ((totalCustomers - preTotalCustomers) / preTotalCustomers * 100).toFixed(1)
        : '0',
      isPositive: totalCustomers >= preTotalCustomers,
      bgGradient: 'from-purple-500 to-purple-600',
    },
  ];

  const revenueData = orderData.dailyStats.length <= 1 && (dateRange === 'today' || dateRange === 'yesterday') ? [
    {
      date: dateRange === 'today' ? 'Hôm qua' : '2 ngày trước',
      revenue: orderData.orderStats.previousRevenue || 0,
      orders: orderData.orderStats.previousOrders || 0,
    },
    {
      date: dateRange === 'today' ? 'Hôm nay' : 'Hôm qua',
      revenue: orderData.orderStats.currentRevenue || 0,
      orders: orderData.orderStats.currentOrders || 0,
    }
  ]
    : orderData.dailyStats.map(d => ({
      date: d.date,
      revenue: d.totalRevenue || 0,
      orders: d.totalOrders || 0,
    }));

  const orderStatusData = Object.entries(orderData.ordersByStatus).map(([status, count]) => ({
    status,
    count,
  }));

  const recentOrders = recentOrdersData.map(o => ({
    orderNumber: o.orderNumber,
    customer: `KH${o.customerId}`,
    total: o.totalAmount,
    revenue: o.revenue,
    status: o.statusName,
    revenueTextGreen: o.statusName === "DELIVERED",
    orderDate: new Date(o.orderDate).toLocaleString(),
    deliveredDate: o.deliveredDate? new Date(o.deliveredDate).toLocaleString():"-",
  }));

  function getPageNumbers() {
    const pages = [];
    const maxVisible = 4;
    if (totalRecentOrderPages <= maxVisible + 2) {
      for (let i = 0; i < totalRecentOrderPages; i++) pages.push(i);
    } else {
      if (recentOrderPage <= 2) {
        pages.push(0, 1, 2, 3, "...", totalRecentOrderPages - 1);
      } else if (recentOrderPage >= totalRecentOrderPages - 3) {
        pages.push(0, "...", totalRecentOrderPages - 4, totalRecentOrderPages - 3, totalRecentOrderPages - 2, totalRecentOrderPages - 1);
      } else {
        pages.push(0, "...", recentOrderPage - 1, recentOrderPage, recentOrderPage + 1, "...", totalRecentOrderPages - 1);
      }
    }
    return pages;
  }
  const statusBgColor = (status) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500 text-white";
      case "CONFIRMED": return "bg-blue-500 text-white";
      case "PROCESSING": return "bg-orange-500 text-white";
      case "SHIPPED": return "bg-purple-500 text-white";
      case "DELIVERED": return "bg-green-500 text-white";
      case "CANCELLED": return "bg-rose-500 text-white";
      case "RETURNED": return "bg-gray-500 text-white";
      default: return "";
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "PENDING": return "Đang chờ";
      case "CONFIRMED": return "Đã xác nhận";
      case "PROCESSING": return "Đang xử lý";
      case "SHIPPED": return "Đang giao";
      case "DELIVERED": return "Đã giao";
      case "CANCELLED": return "Đã hủy";
      case "RETURNED": return "Trả lại";
      default: return status;
    }
  };
  const paymentStatusMap = {
    PENDING: { label: "Chờ thanh toán", bg: "bg-yellow-500" },
    PAID: { label: "Đã thanh toán", bg: "bg-green-500" },
    FAILED: { label: "Thanh toán thất bại", bg: "bg-gray-500" },
    REFUNDED: { label: "Đã hoàn tiền", bg: "bg-purple-500" },
    CANCELLED: { label: "Đã hủy", bg: "bg-red-500" },
  };

  function getPaymentStatusLabel(status) {
    return paymentStatusMap[status]?.label || status;
  }
  function getPaymentStatusClass(status) {
    const mapping = paymentStatusMap[status];
    return mapping ? `${mapping.bg} ${mapping.text}` : "bg-gray-100 text-gray-800";
  }
  return (
    <>
      <Helmet>
        <title>Thống kê</title></Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Tổng quan hoạt động kinh doanh</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="6months">6 tháng qua</option>
                <option value="year">Năm nay</option>
                <option value="custom">Tùy chỉnh</option>
              </select>

              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={from ? from.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFrom(new Date(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={to ? to.toISOString().split('T')[0] : ''}
                    onChange={(e) => setTo(new Date(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards - Single Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statsCards.map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className={`h-2 bg-gradient-to-r ${stat.bgGradient}`}></div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-gray-900 mb-3">{stat.value}</h3>
                  <div className="flex items-center gap-2">
                    {stat.isPositive ? (
                      <FiTrendingUp className="text-green-600 text-lg" />
                    ) : (
                      <FiTrendingDown className="text-red-600 text-lg" />
                    )}
                    <span className={`text-sm font-bold ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}%
                    </span>
                    {stat.prevValue && <span className="ml-1">{stat.prevValue}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue & Orders Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Doanh thu & Đơn hàng</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: 70, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  padding={{ left: 10, right: 10 }}
                  tickMargin={15}
                  tickFormatter={(date) => {
                    if (typeof date === 'string') return date; // keep "Hôm nay"/"Hôm qua"
                    const d = new Date(date);
                    return `${d.getDate()}/${d.getMonth() + 1}`; // short date
                  }}
                  ticks={revenueData.length > 10
                    ? revenueData
                      .filter((_, i) => i % Math.ceil(revenueData.length / 10) === 0)
                      .map(d => d.date)
                    : revenueData.map(d => d.date)
                  }
                />

                <YAxis
                  yAxisId="left"
                  stroke="#3B82F6"
                  domain={['dataMin', (dataMax) => Math.ceil(dataMax * 1.1)]}  // Min=actual min (but clamp data first), max=110% of data
                  tickFormatter={(value) => value.toLocaleString('vi-VN') + '₫'}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10B981"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => {
                    if (name === 'Doanh thu') {
                      return value.toLocaleString('vi-VN') + '₫';
                    }
                    return value;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={20}
                  wrapperStyle={{ bottom: 0 }}
                />


                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6"
                  strokeWidth={3} fill="url(#colorRevenue)" name="Doanh thu"
                />
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981"
                  strokeWidth={3} fill="url(#colorOrders)" name="Đơn hàng" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className='flex gap-6 items-stretch'>
            <div className="flex-2 flex flex-col gap-6">
              {/* Top Products */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Sản phẩm bán chạy</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={topProductsData?.map(p => ({
                      code: p.productCode,
                      name: p.productName,
                      totalSold: p.totalSold,
                    })) ?? []}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="code"
                      type="category"
                      stroke="#6B7280"
                      interval={0}
                      tick={{ angle: -45, textAnchor: 'end' }}
                      height={100}
                    />
                    <YAxis
                      type="number"
                      stroke="#6B7280"
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => value.toLocaleString('vi-VN')}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          return payload[0].payload.name;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="totalSold" fill="#3B82F6" radius={[0, 8, 8, 0]} name="Đã bán" />
                  </BarChart>
                </ResponsiveContainer>


              </div>

              {/* Top Variants */}
              <div className=" bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Biến thể bán chạy</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={topVariantsData?.map(p => ({
                      sku: p.variantSku,
                      name: p.variantName,
                      totalSold: p.totalSold,
                    })) ?? []}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="sku" stroke="#6B7280" angle={-45} textAnchor="end" height={150} />
                    <YAxis type="number" stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => value.toLocaleString('vi-VN')}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          return payload[0].payload.name;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="totalSold" fill="#10B981" radius={[8, 8, 0, 0]} name="Đã bán" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Low Stock Alert Header */}
              <div className="flex items-center gap-3 p-6 border-b border-gray-200">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Cảnh báo tồn kho</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Danh sách sản phẩm cần bổ sung</p>
                </div>
              </div>

              {/* Scrollable Content */}
              <div
                className="flex-1 overflow-y-auto p-6 space-y-3"
                style={{ maxHeight: 'calc(100vh - 97px)' }}
                onScroll={handleInventoryScroll}
              >
                {stockStatus.length === 0 && !loadingInventory ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">Không có cảnh báo tồn kho</p>
                    <p className="text-sm mt-1">Tất cả sản phẩm đều còn đủ hàng</p>
                  </div>
                ) : (
                  <>
                    {stockStatus.map((item, index) => (
                      <div
                        key={`${item.sku}-${index}`}
                        className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
                      >
                        {/* Status Indicator Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${item.status === 'normal' ? 'bg-green-500' :
                          item.status === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                          }`} />

                        {/* Content */}
                        <div className="flex-1 ml-2">
                          <p className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                            {item.sku}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              {item.stock} sản phẩm
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {item.warehouse}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm ${item.status === 'normal' ? 'bg-green-500 text-white' :
                          item.status === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                          }`}>
                          {item.status === 'normal' ? "Còn hàng" : item.status === 'critical' ? 'Hết hàng' : 'Thấp'}
                        </span>
                      </div>
                    ))}

                    {/* Loading State */}
                    {loadingInventory && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200"></div>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-orange-600 absolute top-0 left-0"></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3 font-medium">Đang tải thêm...</p>
                      </div>
                    )}

                    {/* End State */}
                    {!hasMoreInventory && stockStatus.length > 0 && (
                      <div className="flex items-center justify-center py-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-600 font-medium">Đã hiển thị tất cả</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {/* Order Status Chart */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trạng thái đơn hàng</h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orderStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="status"
                  stroke="#6B7280"
                  tickFormatter={(status) => statusMap[status]?.label || status}
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value) => [value]}
                  labelFormatter={(status) => statusMap[status]?.label || status}
                />

                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {orderStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={statusMap[entry.status]?.color || "#9CA3AF"}
                      statusId={statusMap[entry.status]?.id || 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>



          {/* Recent Orders Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Đơn hàng gần đây</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 text-center border-gray-200">
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Mã đơn</th>
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Khách hàng</th>
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Tổng tiền</th>
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Lợi nhuận</th>
                    <th className="py-4 px-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Ngày đặt</th>
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Ngày giao</th>
                    <th className="py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.orderNumber} className="border-b border-gray-100 text-center hover:bg-blue-50 transition-colors">
                      <td className="py-4 px-4 text-gray-700">{order.orderNumber}</td>
                      <td className="py-4 px-4 text-gray-700">{order.customer}</td>
                      <td className="py-4 px-4 font-bold text-gray-900">
                        {order.total?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                      </td>
                      <td className={`py-4 px-4 font-bold ${order.revenueTextGreen ? " text-green-600" : " text-red-600"}`}>
                        {order.revenue?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-4 py-2 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                          {statusMap[order.status]?.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{order.orderDate}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{order.deliveredDate}</td>
                      <td className="p-2 text-sm text-gray-600">
                        <button
                          onClick={() => handleGetOrderDetails(order.orderNumber)}
                          className="p-2 text-blue-500 rounded hover:bg-blue-100 transition"
                        >
                          <FiEye></FiEye>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalRecentOrderPages > 0 && (
            <div className="flex justify-center items-center gap-3 mt-10 pb-5">
              <button
                onClick={() => handleLoadRecenOrderData(recentOrderPage - 1)}
                disabled={recentOrderPage === 0}
                className={`p-3 rounded ${recentOrderPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
              >
                <FaChevronLeft />
              </button>

              {getPageNumbers().map((num, i) =>
                num === "..." ? (
                  <span key={i} className="px-2 text-gray-500">...</span>
                ) : (
                  <button
                    key={i}
                    onClick={() => handleLoadRecenOrderData(num)}
                    className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                        ${recentOrderPage === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                  >
                    {num + 1}
                  </button>
                )
              )}
              <button
                onClick={() => handleLoadRecenOrderData(recentOrderPage + 1)}
                disabled={recentOrderPage >= totalRecentOrderPages - 1}
                className={`p-3 rounded ${recentOrderPage >= totalRecentOrderPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>
        {isDetailOpen && orderDetails && (
          <div onClick={() => setIsDetailOpen(false)}
            className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex justify-center items-center pb-30 z-50">
            <div onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-[95%] max-w-4xl p-8 overflow-hidden max-h-[90vh] relative">

              {/* Close Button */}
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-2xl hover:cursor-pointer"
                onClick={() => setIsDetailOpen(false)}
              >
                &times;
              </button>

              {/* Header: Order Number + Status + Payment */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4 mb-4">
                <div className="flex flex-col justify-between gap-2">
                  <span className="text-xl font-semibold text-gray-800">{orderDetails.orderNumber}</span>

                  {/* Status */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-600">Trạng thái:</span>
                      <span className={`px-3 py-1 rounded-full font-semibold ${statusBgColor(orderDetails.statusName)}`}>
                        {statusLabel(orderDetails.statusName)}
                      </span>
                    </div>

                    {/* Method + Payment Status */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-600">Thanh toán:</span>
                      <span className="font-semibold text-gray-800">
                        {orderDetails.paymentMethod === "COD"
                          ? "Thanh toán khi nhận hàng"
                          : orderDetails.paymentMethod}
                      </span>

                      {orderDetails.paymentMethod === "VNPAY" && (
                        <span
                          className={`px-3 py-1 text-white rounded-full font-semibold ${getPaymentStatusClass(orderDetails.paymentStatus)}`}
                        >
                          {getPaymentStatusLabel(orderDetails.paymentStatus)}
                        </span>
                      )}
                    </div>

                  </div>
                </div>


                <div className="text-gray-600 text-sm pt-2 ">
                  <p className="font-bold">Mã khách hàng: KH{orderDetails.customerId}</p>
                  {orderDetails.createdAt && <p>Ngày tạo: {new Date(orderDetails.createdAt).toLocaleString("vi-VN")}</p>}
                  {orderDetails.updatedAt && <p>Ngày cập nhật: {new Date(orderDetails.updatedAt).toLocaleString("vi-VN")}</p>}
                  {orderDetails.cancelledDate && <p>Ngày hủy: {new Date(orderDetails.cancelledDate).toLocaleString("vi-VN")}</p>}
                </div>
              </div>


              {/* Items List */}
              <div className="overflow-y-auto max-h-[40vh] flex flex-col gap-3 mb-4">
                {orderDetails.items.map(item => (
                  <div key={item.id} className="flex items-center bg-gray-100 p-3 rounded-lg">
                    <img
                      src={item.imageUrl}
                      alt={item.variantName}
                      className="w-20 h-20 object-cover rounded-md mr-4"
                    />
                    <div className="flex flex-1 justify-between">
                      <div>
                        <p className="font-medium text-gray-800 line-clamp-1">{item.variantName}</p>
                        <p className="text-xs text-gray-500">{item.variantSku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-600 text-sm">x{item.quantity}</p>
                        <div className="text-gray-800 font-semibold">{item.totalPrice.toLocaleString()}₫</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Main Panel: Address Left, Price Right */}
              <div className="flex flex-col md:flex-row gap-4 mb-4 px-2">
                {/* Address */}
                <div className="flex-1 flex flex-col gap-1 text-gray-700">
                  <div className="flex gap-3 items-center">
                    <FiUser className="text-xl flex-shrink-0" />
                    <p className="text-gray-700 font-semibold text-black">{orderDetails.shippingName}</p>
                  </div>

                  <div className="flex gap-3 items-center">
                    <FiMapPin className="text-xl flex-shrink-0" />
                    <p className="text-gray-700 line-clamp-1" title={` ${orderDetails.shippingAddress || "-"}`}>
                      {orderDetails.shippingAddress || "-"}
                    </p>
                  </div>

                  <div className="flex gap-3 items-center">
                    <FiPhone className="text-xl flex-shrink-0" />
                    <p className="text-gray-700">{orderDetails.shippingPhone || "-"}</p>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="flex-1 flex justify-end">
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 w-55 text-right items-center">
                    <span className="text-gray-600">Tạm tính:</span>
                    <span className="text-gray-800 font-semibold">{orderDetails.subtotal.toLocaleString()}₫</span>

                    {orderDetails.fee > 0 && (
                      <>
                        <span className="text-gray-600">Phí vận chuyển:</span>
                        <span className="text-gray-800 font-semibold">{orderDetails.fee.toLocaleString()}₫</span>
                      </>
                    )}
                    {orderDetails.discountAmount > 0 && (
                      <>
                        <span className="text-red-500">Giảm giá:</span>
                        <span className="text-red-500 font-semibold">{orderDetails.discountAmount.toLocaleString()}₫</span>
                      </>
                    )}
                    <span className="font-semibold text-gray-800">Tổng:</span>
                    <span className="font-semibold text-red-500 text-lg">{orderDetails.totalAmount.toLocaleString()}₫</span>
                    {orderDetails.revenue !== null && orderDetails.revenue > 0 && (
                      <>
                        <span className="font-semibold text-gray-800">Lợi nhuận:</span>
                        <span className="font-semibold text-green-500 text-lg">
                          {Math.round(orderDetails.revenue).toLocaleString("vi-VN")}₫
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {orderDetails.notes && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-gray-700 whitespace-pre-wrap">
                  <span className="font-semibold">Ghi chú:</span>
                  <p>{orderDetails.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div ></>
  );
};

export default AdminDashboard;