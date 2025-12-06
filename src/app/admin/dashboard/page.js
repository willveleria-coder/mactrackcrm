"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";
import { ThemeProvider, useTheme } from "../../../context/ThemeContext";

function AdminDashboardContent() {
  const { theme } = useTheme();
  const [admin, setAdmin] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    todayOrders: 0,
    thisWeekOrders: 0,
    thisMonthRevenue: 0,
    avgOrderValue: 0,
    completionRate: 0,
    activeClients: 0
  });
  const [topDrivers, setTopDrivers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('up');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
  }, []);

  // Scroll detection
  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;

      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/admin/login");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminError || !adminData) {
        router.push("/admin/login");
        return;
      }

      setAdmin(adminData);

      // Load orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);

      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*");

      setClients(clientsData || []);

      // Load drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("*");

      setDrivers(driversData || []);

      // Calculate enhanced stats
      if (ordersData) {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalOrders = ordersData.length;
        const pendingOrders = ordersData.filter(o => o.status === "pending").length;
        const activeOrders = ordersData.filter(o => o.status === "active").length;
        const completedOrders = ordersData.filter(o => o.status === "delivered").length;
        const totalRevenue = ordersData
          .filter(o => o.status === "delivered")
          .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        
        const todayOrders = ordersData.filter(o => new Date(o.created_at) >= todayStart).length;
        const thisWeekOrders = ordersData.filter(o => new Date(o.created_at) >= weekStart).length;
        const thisMonthRevenue = ordersData
          .filter(o => o.status === "delivered" && new Date(o.created_at) >= monthStart)
          .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        
        const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
        const activeClients = clientsData?.filter(c => c.is_active).length || 0;

        setStats({
          totalOrders,
          pendingOrders,
          activeOrders,
          completedOrders,
          totalRevenue,
          todayOrders,
          thisWeekOrders,
          thisMonthRevenue,
          avgOrderValue,
          completionRate,
          activeClients
        });

        // Calculate top drivers
        const driverStats = driversData?.map(driver => {
          const driverOrders = ordersData.filter(o => o.driver_id === driver.id && o.status === 'delivered');
          const revenue = driverOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
          return {
            id: driver.id,
            name: driver.name,
            completedOrders: driverOrders.length,
            revenue: revenue,
            isOnDuty: driver.is_on_duty
          };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 5) || [];

        setTopDrivers(driverStats);

        // Generate recent activity
        const activities = [];
        
        // Add recent orders
        ordersData.slice(0, 10).forEach(order => {
          activities.push({
            type: 'order',
            icon: order.status === 'delivered' ? '✅' : order.status === 'active' ? '🚚' : '📦',
            message: `Order #${order.id.slice(0, 8)} ${order.status === 'delivered' ? 'completed' : order.status === 'active' ? 'is in transit' : 'was created'}`,
            time: new Date(order.created_at),
            color: order.status === 'delivered' ? 'text-green-600' : order.status === 'active' ? 'text-blue-600' : 'text-gray-600'
          });
        });

        // Sort by time
        activities.sort((a, b) => b.time - a.time);
        setRecentActivity(activities.slice(0, 10));
      }

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/tracking", icon: "🗺️", label: "Live Tracking" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
    { href: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];

  const quickActions = [
    { 
      label: "View All Orders", 
      icon: "📦", 
      href: "/admin/orders",
      color: "from-blue-500 to-blue-600"
    },
    { 
      label: "Manage Clients", 
      icon: "👥", 
      href: "/admin/clients",
      color: "from-green-500 to-green-600"
    },
    { 
      label: "Manage Drivers", 
      icon: "🚐", 
      href: "/admin/drivers",
      color: "from-purple-500 to-purple-600"
    },
    { 
      label: "View Analytics", 
      icon: "📊", 
      href: "/admin/analytics",
      color: "from-orange-500 to-orange-600"
    },
    { 
      label: "Manage Invoices", 
      icon: "💰", 
      href: "/admin/invoices",
      color: "from-red-500 to-red-600"
    },
    { 
      label: "Live Tracking", 
      icon: "🗺️", 
      href: "/admin/tracking",
      color: "from-indigo-500 to-indigo-600"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrdersList = orders.filter(o => o.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30 transition-transform duration-300" style={{
        transform: scrollDirection === 'down' ? 'translateY(-100%)' : 'translateY(0)'
      }}>
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
                <h1 className={`text-xl sm:text-2xl font-black ${theme.text}`}>Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {admin?.name || 'Admin'}</span>
              <HamburgerMenu
                items={menuItems}
                onLogout={handleLogout}
                userName={admin?.name || 'Admin'}
                userRole="Admin"
                onMenuToggle={setHamburgerMenuOpen}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Header with Quick Actions */}
        <div className="mb-6 sm:mb-8 flex justify-between items-start gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {admin?.name}! 👋
            </h2>
            <p className="text-sm sm:text-base text-gray-600">Here's what's happening with your business today</p>
          </div>

          {/* Quick Actions Button */}
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={`px-3 py-2.5 sm:px-6 sm:py-3 ${theme.bg} hover:${theme.bgHover} text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg z-[10000] ${
                hamburgerMenuOpen ? 'hidden' : ''
              }`}
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Quick Actions</span>
              <span className="sm:hidden">Actions</span>
            </button>

            {/* Quick Actions Dropdown */}
            {showQuickActions && (
              <>
                <div 
                  className="fixed inset-0 z-[90]" 
                  onClick={() => setShowQuickActions(false)}
                />
                
                <div className="absolute right-0 top-full mt-2 w-96 sm:w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100]">
                  <div className={`p-3 ${theme.bg} text-white`}>
                    <h3 className="font-bold text-sm">Quick Actions ⚡</h3>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto bg-white">
                    {quickActions.map((action, index) => (
                      <Link
                        key={index}
                        href={action.href}
                        onClick={() => setShowQuickActions(false)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white text-lg shadow-md`}>
                          {action.icon}
                        </div>
                        <span className="font-semibold text-gray-700 text-sm">
                          {action.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Enhanced Stats Grid - 2 cols mobile, 3 tablet, 6 desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Total Orders */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total Orders</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.totalOrders}</p>
            <p className="text-xs opacity-75">All time</p>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Pending</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.pendingOrders}</p>
            <p className="text-xs opacity-75">Awaiting</p>
          </div>

          {/* Active */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Active</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.activeOrders}</p>
            <p className="text-xs opacity-75">In transit</p>
          </div>

          {/* Completed */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Completed</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.completedOrders}</p>
            <p className="text-xs opacity-75">Delivered</p>
          </div>

          {/* Today's Orders */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Today</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.todayOrders}</p>
            <p className="text-xs opacity-75">Orders</p>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Revenue</p>
            <p className="text-2xl sm:text-3xl font-black mb-1">${stats.totalRevenue.toFixed(0)}</p>
            <p className="text-xs opacity-75">Total</p>
          </div>
        </div>

        {/* Live Tracking Banner */}
        {stats.activeOrders > 0 && (
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg mb-6 sm:mb-8 hover:shadow-xl transition">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">🗺️ Live Tracking</h3>
                <p className="text-sm opacity-90">
                  {stats.activeOrders} active {stats.activeOrders === 1 ? 'delivery' : 'deliveries'} in progress
                </p>
              </div>
              <Link
                href="/admin/tracking"
                className={`px-6 py-3 bg-white ${theme.text} rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-lg`}
              >
                View Live Map →
              </Link>
            </div>
          </div>
        )}

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">${stats.thisMonthRevenue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">Revenue</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Avg Order</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">${stats.avgOrderValue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">Value</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Completion</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{stats.completionRate.toFixed(0)}%</p>
            <p className="text-xs text-gray-500 mt-1">Rate</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Active Clients</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{stats.activeClients}</p>
            <p className="text-xs text-gray-500 mt-1">Customers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
          
          {/* Pending Orders - Priority Alert */}
          {pendingOrders.length > 0 && (
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">⏳ Pending Orders</h3>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    {pendingOrders.length} Pending
                  </span>
                </div>
                
                <div className="space-y-3">
                  {pendingOrders.slice(0, 5).map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders`}
                      className="block p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-500 hover:shadow-md transition bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <p className="text-base font-black text-green-600">${Number(order.price).toFixed(2)}</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600">📍</span>
                          <span className="text-gray-700 line-clamp-1">{order.pickup_address}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">🎯</span>
                          <span className="text-gray-700 line-clamp-1">{order.dropoff_address}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Drivers */}
          <div className={pendingOrders.length > 0 ? '' : 'lg:col-span-2'}>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">🏆 Top Drivers</h3>
              
              <div className="space-y-3">
                {topDrivers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🚐</div>
                    <p className="text-gray-500 font-semibold text-sm">No driver data yet</p>
                  </div>
                ) : (
                  topDrivers.map((driver, idx) => (
                    <div key={driver.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-black text-sm ${
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{driver.name}</p>
                        <p className="text-xs text-gray-600">{driver.completedOrders} deliveries</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base sm:text-lg font-black text-green-600">${driver.revenue.toFixed(0)}</p>
                        {driver.isOnDuty && (
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Link
                href="/admin/drivers"
                className={`block mt-4 text-center py-2 text-sm font-semibold ${theme.text} hover:underline`}
              >
                View All Drivers →
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={pendingOrders.length > 0 ? '' : ''}>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">⚡ Recent Activity</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-gray-500 font-semibold text-sm">No activity yet</p>
                  </div>
                ) : (
                  recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                      <div className="text-2xl flex-shrink-0">{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${activity.color}`}>{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time.toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/clients" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-1">Total Clients</p>
                <p className="text-4xl font-black">{clients.length}</p>
              </div>
              <div className="text-5xl opacity-20">👥</div>
            </div>
            <p className="text-xs opacity-75">{stats.activeClients} active</p>
          </Link>

          <Link href="/admin/drivers" className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-1">Total Drivers</p>
                <p className="text-4xl font-black">{drivers.length}</p>
              </div>
              <div className="text-5xl opacity-20">🚐</div>
            </div>
            <p className="text-xs opacity-75">{drivers.filter(d => d.is_on_duty).length} on duty</p>
          </Link>

          <Link href="/admin/analytics" className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-1">This Week</p>
                <p className="text-4xl font-black">{stats.thisWeekOrders}</p>
              </div>
              <div className="text-5xl opacity-20">📊</div>
            </div>
            <p className="text-xs opacity-75">Orders placed</p>
          </Link>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">📦 Recent Orders</h3>
            <Link
              href="/admin/orders"
              className={`px-4 py-2 bg-gradient-to-r ${theme.gradient} hover:${theme.gradientHover} text-white rounded-xl font-bold text-sm transition shadow-lg`}
            >
              View All
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 8).map((order) => (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="block p-4 border-2 border-gray-200 rounded-xl hover:border-red-600 hover:shadow-md transition bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-gray-900">#{order.id.slice(0, 8)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-gray-600 truncate">{order.pickup_address} → {order.dropoff_address}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-black text-green-600">${Number(order.price).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{order.parcel_size} • {order.service_type}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    active: "bg-blue-100 text-blue-700 border-blue-300",
    delivered: "bg-green-100 text-green-700 border-green-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };

  const labels = {
    pending: "⏳ Pending",
    active: "🚚 Active",
    delivered: "✅ Delivered",
    cancelled: "❌ Cancelled",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AdminDashboard() {
  return (
    <ThemeProvider userType="admin">
      <AdminDashboardContent />
    </ThemeProvider>
  );
}