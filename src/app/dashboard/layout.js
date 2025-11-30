export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-blue-600">🚚 Delivery CRM</h1>
        <nav className="flex flex-col space-y-3">
          <a href="/dashboard" className="text-gray-700 hover:text-blue-500">Dashboard</a>
          <a href="/dashboard/orders" className="text-gray-700 hover:text-blue-500">Orders</a>
          <a href="/dashboard/clients" className="text-gray-700 hover:text-blue-500">Clients</a>
          <a href="/dashboard/settings" className="text-gray-700 hover:text-blue-500">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}