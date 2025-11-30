"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function TemplatesPage() {
  const [admin, setAdmin] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'email',
    trigger_event: 'order_created',
    subject: '',
    body: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const triggerEvents = [
    { value: 'order_created', label: 'Order Created' },
    { value: 'order_assigned', label: 'Order Assigned to Driver' },
    { value: 'order_picked_up', label: 'Order Picked Up' },
    { value: 'order_delivered', label: 'Order Delivered' },
    { value: 'order_cancelled', label: 'Order Cancelled' },
    { value: 'payout_approved', label: 'Payout Approved' },
    { value: 'payout_rejected', label: 'Payout Rejected' },
    { value: 'feedback_received', label: 'Feedback Received' }
  ];

  const availableVariables = {
    order_created: ['{client_name}', '{order_id}', '{pickup_address}', '{dropoff_address}', '{price}', '{tracking_url}'],
    order_assigned: ['{driver_name}', '{order_id}', '{pickup_address}', '{dropoff_address}', '{price}'],
    order_picked_up: ['{client_name}', '{driver_name}', '{order_id}', '{pickup_time}'],
    order_delivered: ['{client_name}', '{driver_name}', '{order_id}', '{delivered_time}', '{feedback_url}'],
    order_cancelled: ['{client_name}', '{order_id}', '{cancellation_reason}'],
    payout_approved: ['{driver_name}', '{amount}', '{payment_method}'],
    payout_rejected: ['{driver_name}', '{amount}', '{rejection_reason}'],
    feedback_received: ['{client_name}', '{rating}', '{review_text}', '{order_id}']
  };

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    setAdmin(adminData);
    loadTemplates();
  }

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      setMessage("❌ Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      template_type: 'email',
      trigger_event: 'order_created',
      subject: '',
      body: '',
      is_active: true
    });
    setMessage('');
    setShowModal(true);
  }

  function openEditModal(template) {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_type: template.template_type,
      trigger_event: template.trigger_event,
      subject: template.subject || '',
      body: template.body,
      is_active: template.is_active
    });
    setMessage('');
    setShowModal(true);
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function insertVariable(variable) {
    setFormData(prev => ({
      ...prev,
      body: prev.body + variable
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const dataToSave = {
        name: formData.name,
        description: formData.description || null,
        template_type: formData.template_type,
        trigger_event: formData.trigger_event,
        subject: formData.template_type === 'email' ? formData.subject : null,
        body: formData.body,
        variables: availableVariables[formData.trigger_event] || [],
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("notification_templates")
          .update(dataToSave)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        setMessage("✅ Template updated successfully!");
      } else {
        dataToSave.created_by = admin.id;
        const { error } = await supabase
          .from("notification_templates")
          .insert([dataToSave]);

        if (error) throw error;
        setMessage("✅ Template created successfully!");
      }

      await loadTemplates();
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
      }, 1500);

    } catch (error) {
      console.error("Error saving template:", error);
      setMessage("❌ Failed to save template: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id, currentStatus) {
    try {
      const { error } = await supabase
        .from("notification_templates")
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error("Error toggling status:", error);
      setMessage("❌ Failed to update status");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("notification_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMessage("✅ Template deleted successfully!");
      await loadTemplates();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting template:", error);
      setMessage("❌ Failed to delete template");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const filteredTemplates = filterType === 'all' 
    ? templates 
    : templates.filter(t => t.template_type === filterType);

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
              <Link href="/admin/templates" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Templates
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">📧 Notification Templates</h2>
            <p className="text-gray-600">Manage email and SMS templates</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            + Create Template
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Templates</p>
            <p className="text-4xl font-black">{templates.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Email Templates</p>
            <p className="text-4xl font-black">{templates.filter(t => t.template_type === 'email').length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">SMS Templates</p>
            <p className="text-4xl font-black">{templates.filter(t => t.template_type === 'sms').length}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Active</p>
            <p className="text-4xl font-black">{templates.filter(t => t.is_active).length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'email', 'sms', 'push'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                  filterType === type
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {type !== 'all' && ` (${templates.filter(t => t.template_type === type).length})`}
                {type === 'all' && ` (${templates.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
              <div className="text-6xl mb-4">📧</div>
              <p className="text-gray-500 text-lg font-semibold mb-4">No {filterType !== 'all' ? filterType : ''} templates yet</p>
              <button
                onClick={openAddModal}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                Create Your First Template
              </button>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div key={template.id} className={`bg-white rounded-2xl shadow-lg border-2 p-6 ${template.is_active ? 'border-gray-100' : 'border-red-200 opacity-60'}`}>
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        template.template_type === 'email' ? 'bg-blue-100 text-blue-700' :
                        template.template_type === 'sms' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {template.template_type.toUpperCase()}
                      </span>
                      {!template.is_active && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          INACTIVE
                        </span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    )}

                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Trigger Event:</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {template.trigger_event.replace(/_/g, ' ')}
                      </p>
                    </div>

                    {template.subject && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Subject:</p>
                        <p className="text-sm font-semibold text-gray-900">{template.subject}</p>
                      </div>
                    )}

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">Body Preview:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{template.body}</p>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <button
                      onClick={() => openEditModal(template)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(template.id, template.is_active)}
                      className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-semibold transition text-sm ${
                        template.is_active 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {template.is_active ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Order Confirmation Email"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Template Type *
                    </label>
                    <select
                      name="template_type"
                      value={formData.template_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="push">Push Notification</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of when this is used"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Trigger Event *
                  </label>
                  <select
                    name="trigger_event"
                    value={formData.trigger_event}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    {triggerEvents.map(event => (
                      <option key={event.value} value={event.value}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.template_type === 'email' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Email Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required={formData.template_type === 'email'}
                      placeholder="e.g., Order Confirmed - #{order_id}"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Template Body *
                  </label>
                  <textarea
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    required
                    rows={8}
                    placeholder="Enter your template content here. Use variables like {client_name}, {order_id}, etc."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none font-mono text-sm"
                  />
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-blue-900 mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {(availableVariables[formData.trigger_event] || []).map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(variable)}
                        className="px-3 py-1 bg-blue-200 text-blue-900 rounded-lg text-sm font-semibold hover:bg-blue-300 transition"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">Click to insert into template</p>
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
                    Active (template will be used for notifications)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}