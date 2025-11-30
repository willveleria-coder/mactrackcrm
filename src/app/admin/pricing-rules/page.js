"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function PricingRulesPage() {
  const [pricingRules, setPricingRules] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'distance',
    condition_operator: 'greater_than',
    condition_value_min: '',
    condition_value_max: '',
    price_adjustment_type: 'fixed',
    price_adjustment_value: '',
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
    loadPricingRules();
  }

  async function loadPricingRules() {
    try {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setPricingRules(data || []);
    } catch (error) {
      console.error("Error loading pricing rules:", error);
      setMessage("❌ Failed to load pricing rules");
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
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      rule_type: 'distance',
      condition_operator: 'greater_than',
      condition_value_min: '',
      condition_value_max: '',
      price_adjustment_type: 'fixed',
      price_adjustment_value: '',
      is_active: true,
      priority: 0,
    });
    setMessage('');
    setShowAddModal(true);
  }

  function openEditModal(rule) {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      condition_operator: rule.condition_operator,
      condition_value_min: rule.condition_value_min || '',
      condition_value_max: rule.condition_value_max || '',
      price_adjustment_type: rule.price_adjustment_type,
      price_adjustment_value: rule.price_adjustment_value,
      is_active: rule.is_active,
      priority: rule.priority || 0,
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
        description: formData.description || null,
        rule_type: formData.rule_type,
        condition_operator: formData.condition_operator,
        condition_value_min: formData.condition_value_min ? parseFloat(formData.condition_value_min) : null,
        condition_value_max: formData.condition_value_max ? parseFloat(formData.condition_value_max) : null,
        price_adjustment_type: formData.price_adjustment_type,
        price_adjustment_value: parseFloat(formData.price_adjustment_value),
        is_active: formData.is_active,
        priority: parseInt(formData.priority),
      };

      if (editingRule) {
        const { error } = await supabase
          .from("pricing_rules")
          .update(dataToSave)
          .eq("id", editingRule.id);

        if (error) throw error;
        setMessage("✅ Pricing rule updated successfully!");
      } else {
        const { error } = await supabase
          .from("pricing_rules")
          .insert([dataToSave]);

        if (error) throw error;
        setMessage("✅ Pricing rule created successfully!");
      }

      await loadPricingRules();
      setTimeout(() => {
        setShowAddModal(false);
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error("Error saving pricing rule:", error);
      setMessage("❌ Failed to save pricing rule: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;

    try {
      const { error } = await supabase
        .from("pricing_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMessage("✅ Pricing rule deleted successfully!");
      await loadPricingRules();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting pricing rule:", error);
      setMessage("❌ Failed to delete pricing rule");
    }
  }

  async function handleToggleActive(id, currentStatus) {
    try {
      const { error } = await supabase
        .from("pricing_rules")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      await loadPricingRules();
    } catch (error) {
      console.error("Error toggling status:", error);
      setMessage("❌ Failed to update status");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  function getRuleTypeLabel(type) {
    const labels = {
      distance: '📏 Distance',
      weight: '⚖️ Weight',
      time_of_day: '🕐 Time of Day',
      day_of_week: '📅 Day of Week',
      location: '📍 Location'
    };
    return labels[type] || type;
  }

  function getOperatorLabel(operator) {
    const labels = {
      greater_than: '>',
      less_than: '<',
      equals: '=',
      between: 'Between'
    };
    return labels[operator] || operator;
  }

  function getAdjustmentLabel(type, value) {
    if (type === 'fixed') return `+$${value}`;
    if (type === 'percentage') return `+${value}%`;
    if (type === 'multiplier') return `×${value}`;
    return value;
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
              <Link href="/admin/pricing-rules" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Pricing Rules
              </Link>
              <Link href="/admin/orders" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Orders
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">💰 Pricing Rules</h2>
            <p className="text-gray-600">Dynamic pricing based on conditions</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            + Add Pricing Rule
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Pricing Rules List */}
        <div className="space-y-4">
          {pricingRules.map((rule) => (
            <div key={rule.id} className={`bg-white rounded-2xl shadow-lg border-2 p-6 ${rule.is_active ? 'border-gray-100' : 'border-red-200 opacity-60'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{rule.name}</h3>
                    {!rule.is_active && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        INACTIVE
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      Priority: {rule.priority}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 font-semibold rounded-full">
                      {getRuleTypeLabel(rule.rule_type)}
                    </span>
                    <span className="text-gray-600">
                      {getOperatorLabel(rule.condition_operator)}
                    </span>
                    <span className="font-bold text-gray-900">
                      {rule.condition_value_min}
                      {rule.condition_value_max && ` - ${rule.condition_value_max}`}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded-full">
                      {getAdjustmentLabel(rule.price_adjustment_type, rule.price_adjustment_value)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(rule)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                    className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
                      rule.is_active 
                        ? 'bg-orange-500 text-white hover:bg-orange-600' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {rule.is_active ? '⏸️ Disable' : '▶️ Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pricingRules.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">💰</div>
            <p className="text-gray-500 text-lg font-semibold mb-4">No pricing rules yet</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
            >
              Add Your First Pricing Rule
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
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
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
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Long Distance Premium"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
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
                    placeholder="Explain when this rule applies"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Rule Type *
                    </label>
                    <select
                      name="rule_type"
                      value={formData.rule_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="distance">Distance (km)</option>
                      <option value="weight">Weight (kg)</option>
                      <option value="time_of_day">Time of Day (hour)</option>
                      <option value="day_of_week">Day of Week (1-7)</option>
                      <option value="location">Location</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Condition *
                    </label>
                    <select
                      name="condition_operator"
                      value={formData.condition_operator}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                      <option value="equals">Equals</option>
                      <option value="between">Between</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {formData.condition_operator === 'between' ? 'Min Value *' : 'Value *'}
                    </label>
                    <input
                      type="number"
                      name="condition_value_min"
                      value={formData.condition_value_min}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="50"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  {formData.condition_operator === 'between' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Max Value *
                      </label>
                      <input
                        type="number"
                        name="condition_value_max"
                        value={formData.condition_value_max}
                        onChange={handleInputChange}
                        required={formData.condition_operator === 'between'}
                        min="0"
                        step="0.01"
                        placeholder="100"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-gray-200 pt-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Price Adjustment</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Adjustment Type *
                      </label>
                      <select
                        name="price_adjustment_type"
                        value={formData.price_adjustment_type}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      >
                        <option value="fixed">Fixed Amount ($)</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="multiplier">Multiplier (×)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Adjustment Value *
                      </label>
                      <input
                        type="number"
                        name="price_adjustment_value"
                        value={formData.price_adjustment_value}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder={formData.price_adjustment_type === 'fixed' ? '20' : formData.price_adjustment_type === 'percentage' ? '50' : '1.5'}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.price_adjustment_type === 'fixed' && 'Add this dollar amount'}
                        {formData.price_adjustment_type === 'percentage' && 'Add this % to base price'}
                        {formData.price_adjustment_type === 'multiplier' && 'Multiply base price by this'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Priority (higher = applied first)
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
                    Active (rule will be applied to calculations)
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
                  {saving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}