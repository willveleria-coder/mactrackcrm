"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    completionRate: 0,
    avgDeliveryTime: 0,
  });
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [revenueByDay, setRevenueByDay] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // 7, 30, 90 days
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  async function loadAnalytics() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }

      // Load all data
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: driversData } = await supabase
        .from("drivers")
        .select("*");

      setOrders(ordersData || []);
      setDrivers(driversData || []);

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
      const filteredOrders = ordersData?.filter(o => 
        new Date(o.created_at) >= cutoffDate
      ) || [];

      // Calculate stats
      const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter(o => o.status === "delivered");
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

      // Calculate average delivery time
      const deliveryTimes = completedOrders
        .filter(o => o.created_at && o.delivered_at)
        .map(o => {
          const created = new Date(o.created_at);
          const delivered = new Date(o.delivered_at);
          return (delivered - created) / (1000 * 60 * 60); // hours
        });
      const avgDeliveryTime = deliveryTimes.length > 0 
        ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length 
        : 0;

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        completionRate,
        avgDeliveryTime,
      });

      // Revenue by day
      const days = parseInt(dateRange);
      const revenueData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = ordersData?.filter(o => 
          o.created_at.startsWith(dateStr)
        ).reduce((sum, o) => sum + (o.price || 0), 0) || 0;

        const dayOrders = ordersData?.filter(o => 
          o.created_at.startsWith(dateStr)
        ).length || 0;

        revenueData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          orders: dayOrders,
        });
      }
      setRevenueByDay(revenueData);

      // Orders by status
      const statusCounts = [
        { status: 'Pending', count: filteredOrders.filter(o => o.status === 'pending').length, color: 'bg-yellow-500' },
        { status: 'Active', count: filteredOrders.filter(o => o.status === 'active').length, color: 'bg-blue-500' },
        { status: 'Delivered', count: filteredOrders.filter(o => o.status === 'delivered').length, color: 'bg-green-500' },
        { status: 'Cancelled', count: filteredOrders.filter(o => o.status === 'cancelled').length, color: 'bg-red-500' },
      ];
      setOrdersByStatus(statusCounts);

      // Top performing drivers
      const driverStats = driversData?.map(driver => {
        const driverOrders = filteredOrders.filter(o => o.driver_id === driver.id);
        const completed = driverOrders.filter(o => o.status === 'delivered').length;
        const revenue = driverOrders.reduce((sum, o) => sum + (o.price || 0), 0);
        const avgTime = driverOrders
          .filter(o => o.created_at && o.delivered_at)
          .map(o => (new Date(o.delivered_at) - new Date(o.created_at)) / (1000 * 60 * 60))
          .reduce((sum, t, _, arr) => sum + t / arr.length, 0) || 0;
        
        return {
          name: driver.name,
          completed,
          revenue,
          avgTime: avgTime.toFixed(1),
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5) || [];

      setTopDrivers(driverStats);

      // Recent deliveries
      const recent = completedOrders.slice(0, 10).map(o => {
        const created = new Date(o.created_at);
        const delivered = new Date(o.delivered_at);
        const hours = ((delivered - created) / (1000 * 60 * 60)).toFixed(1);
        return {
          id: o.id,
          driver: driversData?.find(d => d.id === o.driver_id)?.name || 'N/A',
          time: hours,
          pickup: o.pickup_address,
          dropoff: o.dropoff_address,
        };
      });
      setRecentDeliveries(recent);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading analytics...</div>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueByDay.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/bus-icon.png" 
                alt="Mac Track" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/admin/dashboard" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Analytics
              </Link>
              <Link href="/admin/orders" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Orders
              </Link>
              <Link href="/admin/drivers" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Drivers
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-gray-700 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 Analytics Dashboard</h2>
            <p className="text-gray-600">Business insights and performance metrics</p>
          </div>
          
          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Revenue</p>
            <p className="text-4xl font-black">${stats.totalRevenue.toFixed(0)}</p>
            <p className="text-xs opacity-75 mt-2">Last {dateRange} days</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Orders</p>
            <p className="text-4xl font-black">{stats.totalOrders}</p>
            <p className="text-xs opacity-75 mt-2">Last {dateRange} days</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Avg Order Value</p>
            <p className="text-4xl font-black">${stats.avgOrderValue.toFixed(0)}</p>
            <p className="text-xs opacity-75 mt-2">Per order</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Completion Rate</p>
            <p className="text-4xl font-black">{stats.completionRate.toFixed(0)}%</p>
            <p className="text-xs opacity-75 mt-2">Success rate</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Avg Delivery Time</p>
            <p className="text-4xl font-black">{stats.avgDeliveryTime.toFixed(1)}h</p>
            <p className="text-xs opacity-75 mt-2">Hours average</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">📈 Revenue & Orders Trend</h3>
            <div className="space-y-3">
              {revenueByDay.map((day, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-700">{day.date}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-green-600">${day.revenue.toFixed(0)}</span>
                      <span className="text-xs text-gray-500 ml-2">({day.orders} orders)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders by Status */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">📦 Orders by Status</h3>
            <div className="space-y-4">
              {ordersByStatus.map((status, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${status.color}`}></div>
                      <span className="text-sm font-semibold text-gray-700">{status.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-gray-900">{status.count}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({stats.totalOrders > 0 ? ((status.count / stats.totalOrders) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${status.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${stats.totalOrders > 0 ? (status.count / stats.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Drivers & Recent Deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Drivers */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">🏆 Top Performing Drivers</h3>
            <div className="space-y-4">
              {topDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🚐</div>
                  <p className="text-gray-500 font-semibold">No driver data yet</p>
                </div>
              ) : (
                topDrivers.map((driver, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black ${
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{driver.name}</p>
                        <p className="text-sm text-gray-600">{driver.completed} completed • {driver.avgTime}h avg</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-600">${driver.revenue.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Deliveries */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">⚡ Recent Delivery Times</h3>
            <div className="space-y-3">
              {recentDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-gray-500 font-semibold">No completed deliveries yet</p>
                </div>
              ) : (
                recentDeliveries.map((delivery, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="flex-1">
                      <p className="text-xs font-mono text-gray-500 mb-1">#{delivery.id.slice(0, 8)}</p>
                      <p className="text-sm font-semibold text-gray-900">{delivery.driver}</p>
                      <p className="text-xs text-gray-600 truncate">{delivery.pickup} → {delivery.dropoff}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-black text-blue-600">{delivery.time}h</p>
                      <p className="text-xs text-gray-500">Delivery time</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}