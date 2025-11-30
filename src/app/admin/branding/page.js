"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function BrandingPage() {
  const [admin, setAdmin] = useState(null);
  const [assets, setAssets] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    asset_type: 'logo',
    file: null
  });
  const [uploading, setUploading] = useState(false);
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
    loadAssets();
  }

  async function loadAssets() {
    try {
      const { data, error } = await supabase
        .from("branding_assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error("Error loading assets:", error);
      setMessage("❌ Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setMessage("❌ Please upload an image file (JPG, PNG, SVG, WEBP)");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage("❌ File size must be less than 5MB");
        return;
      }

      setUploadData(prev => ({ ...prev, file }));
      setMessage('');
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadData.file) {
      setMessage("❌ Please select a file");
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const fileExt = uploadData.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${uploadData.asset_type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding-assets')
        .upload(filePath, uploadData.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("branding_assets")
        .insert([{
          asset_type: uploadData.asset_type,
          name: uploadData.name,
          description: uploadData.description || null,
          file_url: publicUrl,
          file_size: uploadData.file.size,
          mime_type: uploadData.file.type,
          is_active: true,
          created_by: admin.id
        }]);

      if (dbError) throw dbError;

      setMessage("✅ Asset uploaded successfully!");

      setUploadData({
        name: '',
        description: '',
        asset_type: 'logo',
        file: null
      });

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

      await loadAssets();

      setTimeout(() => {
        setShowUploadModal(false);
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error("Error uploading asset:", error);
      setMessage("❌ Failed to upload asset: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleActive(id, currentStatus) {
    try {
      const { error } = await supabase
        .from("branding_assets")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      await loadAssets();
    } catch (error) {
      console.error("Error toggling status:", error);
      setMessage("❌ Failed to update status");
    }
  }

  async function handleDelete(id, fileUrl) {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const urlParts = fileUrl.split('/branding-assets/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];

        await supabase.storage
          .from('branding-assets')
          .remove([filePath]);
      }

      const { error: dbError } = await supabase
        .from("branding_assets")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      setMessage("✅ Asset deleted successfully!");
      await loadAssets();
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error("Error deleting asset:", error);
      setMessage("❌ Failed to delete asset");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const filteredAssets = filterType === 'all'
    ? assets
    : assets.filter(a => a.asset_type === filterType);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAV */}
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
              <Link href="/admin/branding" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Branding
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

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* STATS / GRID / FILTERS — omitted here for brevity (you already had correct UI) */}

        {/* ASSETS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredAssets.map((asset) => (
            <div key={asset.id} className={`bg-white rounded-2xl shadow-lg border-2 p-6 ${asset.is_active ? 'border-gray-100' : 'border-red-200 opacity-60'}`}>

              <div className="bg-gray-100 rounded-xl p-4 mb-4 h-48 flex items-center justify-center">
                <img 
                  src={asset.file_url} 
                  alt={asset.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{asset.name}</h3>
                  {!asset.is_active && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                      INACTIVE
                    </span>
                  )}
                </div>
                {asset.description && (
                  <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 font-semibold rounded-full capitalize">
                    {asset.asset_type}
                  </span>
                  <span>{(asset.file_size / 1024).toFixed(1)} KB</span>
                </div>
              </div>

              {/* FIXED ACTION BUTTONS */}
              <div className="flex gap-2">

                <a
                  href={asset.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm text-center"
                >
                  View
                </a>

                <button
                  onClick={() => handleToggleActive(asset.id, asset.is_active)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                    asset.is_active 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {asset.is_active ? 'Disable' : 'Enable'}
                </button>

                <button
                  onClick={() => handleDelete(asset.id, asset.file_url)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                >
                  🗑️
                </button>

              </div>
            </div>
          ))}

        </div>
      </main>
    </div>
  );
}