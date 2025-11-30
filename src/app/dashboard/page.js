export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-lg font-medium mb-2">Total Orders</h2>
          <p className="text-3xl font-bold">128</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-lg font-medium mb-2">Active Clients</h2>
          <p className="text-3xl font-bold">52</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-lg font-medium mb-2">Pending Deliveries</h2>
          <p className="text-3xl font-bold">9</p>
        </div>
      </div>
    </div>
  );
}