"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function ServiceTypesPage() {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    base_price_multiplier: 1.0,
    estimated_delivery_hours: '',
    is_active: true,
    priority: 0,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }
    loadServiceTypes();
  }

  async function loadServiceTypes() {
    try {
      const { data, error } = await supabase
        .from("service_types")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error("Error loading service types:", error);
      setMessage("❌ Failed to load service types");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function openAddModal() {
    setEditingType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      base_price_multiplier: 1.0,
      estimated_delivery_hours: '',
      is_active: true,
      priority: 0,
    });
    setMessage('');
    setShowAddModal(true);
  }

  function openEditModal(type) {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      description: type.description || '',
      base_price_multiplier: type.base_price_multiplier,
      estimated_delivery_hours: type.estimated_delivery_hours || '',
      is_active: type.is_active,
      priority: type.priority || 0,
    });
    setMessage('');
    setShowAddModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const dataToSave = {
        name: formData.name,
        code: formData.code.toLowerCase().replace(/\s+/g, '_'),
        description: formData.description || null,
        base_price_multiplier: parseFloat(formData.base_price_multiplier),
        estimated_delivery_hours: formData.estimated_delivery_hours ? parseInt(formData.estimated_delivery_hours) : null,
        is_active: formData.is_active,
        priority: parseInt(formData.priority),
      };

      if (editingType) {
        // Update existing
        const { error } = await supabase
          .from("service_types")
          .update(dataToSave)
          .eq("id", editingType.id);

        if (error) throw error;
        setMessage("✅ Service type updated successfully!");
      } else {
        // Create new
        const { error } = await supabase
          .from("service_types")
          .insert([dataToSave]);

        if (error) throw error;
        setMessage("✅ Service type created successfully!");
      }

      await loadServiceTypes();
      setTimeout(() => {
        setShowAddModal(false);
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error("Error saving service type:", error);
      setMessage("❌ Failed to save service type: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this service type?")) return;

    try {
      const { error } = await supabase
        .from("service_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMessage("✅ Service type deleted successfully!");
      await loadServiceTypes();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting service type:", error);
      setMessage("❌ Failed to delete service type");
    }
  }

  async function handleToggleActive(id, currentStatus) {
    try {
      const { error } = await supabase
        .from("service_types")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      await loadServiceTypes();
    } catch (error) {
      console.error("Error toggling status:", error);
      setMessage("❌ Failed to update status");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

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
              <Link href="/admin/analytics" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Analytics
              </Link>
              <Link href="/admin/parcel-types" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Parcel Types
              </Link>
              <Link href="/admin/service-types" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Service Types
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">⚡ Service Types</h2>
            <p className="text-gray-600">Manage delivery speed options and pricing</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            + Add Service Type
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Service Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceTypes.map((type) => (
            <div key={type.id} className={`bg-white rounded-2xl shadow-lg border-2 p-6 ${type.is_active ? 'border-gray-100' : 'border-red-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{type.name}</h3>
                  <p className="text-xs font-mono text-gray-500 mt-1">{type.code}</p>
                  {!type.is_active && (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full mt-2">
                      INACTIVE
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-red-600">
                    {type.base_price_multiplier}x
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Priority: {type.priority}
                  </div>
                </div>
              </div>

              {type.description && (
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
              )}

              <div className="space-y-2 mb-4">
                {type.estimated_delivery_hours && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Est. Delivery:</span>
                    <span className="font-semibold">
                      {type.estimated_delivery_hours < 24 
                        ? `${type.estimated_delivery_hours}h` 
                        : `${Math.round(type.estimated_delivery_hours / 24)}d`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price Impact:</span>
                  <span className="font-semibold">
                    {type.base_price_multiplier > 1 
                      ? `+${((type.base_price_multiplier - 1) * 100).toFixed(0)}%`
                      : type.base_price_multiplier < 1
                      ? `-${((1 - type.base_price_multiplier) * 100).toFixed(0)}%`
                      : 'Standard'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(type)}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleToggleActive(type.id, type.is_active)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                    type.is_active 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {type.is_active ? '⏸️ Disable' : '▶️ Enable'}
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {serviceTypes.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-gray-500 text-lg font-semibold mb-4">No service types yet</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
            >
              Add Your First Service Type
            </button>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingType ? 'Edit Service Type' : 'Add Service Type'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold">{message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Express Delivery"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Code * (lowercase, underscores only)
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    disabled={!!editingType}
                    placeholder="e.g., express"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier (cannot be changed after creation)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Brief description of this service"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Price Multiplier *
                    </label>
                    <input
                      type="number"
                      name="base_price_multiplier"
                      value={formData.base_price_multiplier}
                      onChange={handleInputChange}
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="1.0"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      1.0 = standard, 1.5 = 50% more
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Est. Delivery (hours)
                    </label>
                    <input
                      type="number"
                      name="estimated_delivery_hours"
                      value={formData.estimated_delivery_hours}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="24"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Expected delivery time
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Priority (higher = shown first)
                  </label>
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-600"
                  />
                  <label className="text-sm font-bold text-gray-700">
                    Active (available for selection)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingType ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}