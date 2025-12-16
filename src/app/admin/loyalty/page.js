'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Award, Users, Gift, TrendingUp, Search, Edit } from 'lucide-react';

export default function AdminLoyaltyPage() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPoints: 0,
    avgPoints: 0,
    redemptions: 0,
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('loyalty_points', { ascending: false });

      if (error) throw error;

      // If no customers exist, use demo data
      if (!data || data.length === 0) {
        setCustomers([
          {
            id: 'demo_1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            loyalty_points: 2500,
            loyalty_tier: 'Silver',
            redemptions: 2,
            created_at: '2024-01-15T00:00:00.000Z',
          },
          {
            id: 'demo_2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1234567891',
            loyalty_points: 5800,
            loyalty_tier: 'Gold',
            redemptions: 5,
            created_at: '2023-11-20T00:00:00.000Z',
          },
        ]);
      } else {
        setCustomers(data);
      }

      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (customersData) => {
    if (customersData.length === 0) return;

    const totalPoints = customersData.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
    const avgPoints = Math.round(totalPoints / customersData.length);
    const redemptions = customersData.reduce((sum, c) => sum + (c.redemptions || 0), 0);

    setStats({
      totalMembers: customersData.length,
      totalPoints,
      avgPoints,
      redemptions,
    });
  };

  const addPoints = async (customerId) => {
    if (!pointsToAdd || isNaN(pointsToAdd)) return;

    try {
      const customer = customers.find(c => c.id === customerId);
      const newPoints = (customer.loyalty_points || 0) + parseInt(pointsToAdd);
      const newTier = getTier(newPoints);

      const { error } = await supabase
        .from('customers')
        .update({ 
          loyalty_points: newPoints,
          loyalty_tier: newTier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;

      fetchCustomers();
      setEditingCustomer(null);
      setPointsToAdd('');
    } catch (error) {
      console.error('Error adding points:', error);
      alert('Failed to add points');
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      Bronze: 'text-amber-700 bg-amber-100',
      Silver: 'text-gray-600 bg-gray-100',
      Gold: 'text-yellow-600 bg-yellow-100',
      Platinum: 'text-purple-600 bg-purple-100',
    };
    return colors[tier] || colors.Bronze;
  };

  const getTier = (points) => {
    if (points >= 10000) return 'Platinum';
    if (points >= 5000) return 'Gold';
    if (points >= 2000) return 'Silver';
    return 'Bronze';
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading loyalty data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Loyalty Program Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Award className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Points</p>
                <p className="text-2xl font-bold">{stats.avgPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Gift className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Redemptions</p>
                <p className="text-2xl font-bold">{stats.redemptions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const tier = customer.loyalty_tier || getTier(customer.loyalty_points || 0);
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-gray-800">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(tier)}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-gray-800">{(customer.loyalty_points || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingCustomer === customer.id ? (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={pointsToAdd}
                                onChange={(e) => setPointsToAdd(e.target.value)}
                                placeholder="Points"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={() => addPoints(customer.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCustomer(null);
                                  setPointsToAdd('');
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingCustomer(customer.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <Edit size={16} />
                              <span className="text-sm">Add Points</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}