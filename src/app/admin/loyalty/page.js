"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminLoyaltyPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data: clientsData } = await supabase.from("clients").select("*").order("name");
    const clientsWithPoints = await Promise.all((clientsData || []).map(async (client) => {
      const { data: loyalty } = await supabase.from("loyalty_points").select("*").eq("client_id", client.id).single();
      return { ...client, loyalty: loyalty || { points: 0, lifetime_points: 0 } };
    }));
    setClients(clientsWithPoints);
    setLoading(false);
  };

  const handleAdjustPoints = async () => {
    if (!selectedClient || !adjustPoints || !adjustReason) return;
    const pts = parseInt(adjustPoints);
    const type = pts > 0 ? "earned" : "redeemed";

    let { data: loyalty } = await supabase.from("loyalty_points").select("*").eq("client_id", selectedClient.id).single();
    if (!loyalty) {
      const { data: newLoyalty } = await supabase.from("loyalty_points").insert({ client_id: selectedClient.id, points: 0, lifetime_points: 0 }).select().single();
      loyalty = newLoyalty;
    }

    const newPoints = Math.max(0, loyalty.points + pts);
    const newLifetime = pts > 0 ? loyalty.lifetime_points + pts : loyalty.lifetime_points;

    await supabase.from("loyalty_points").update({ points: newPoints, lifetime_points: newLifetime }).eq("client_id", selectedClient.id);
    await supabase.from("loyalty_transactions").insert({ client_id: selectedClient.id, points: Math.abs(pts), type, description: adjustReason });

    setSelectedClient(null);
    setAdjustPoints("");
    setAdjustReason("");
    fetchClients();
  };

  const getTier = (pts) => {
    if (pts >= 1000) return { name: "Gold", color: "bg-yellow-100 text-yellow-700" };
    if (pts >= 500) return { name: "Silver", color: "bg-gray-100 text-gray-700" };
    return { name: "Bronze", color: "bg-orange-100 text-orange-700" };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-2xl">←</Link>
          <div>
            <h1 className="text-2xl font-black">🎁 Loyalty Program</h1>
            <p className="text-red-200">Manage customer rewards</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Client</th>
                <th className="px-4 py-3 text-left font-bold">Tier</th>
                <th className="px-4 py-3 text-left font-bold">Points</th>
                <th className="px-4 py-3 text-left font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-500">Loading...</td></tr>
              ) : (
                clients.map((client) => {
                  const tier = getTier(client.loyalty?.lifetime_points || 0);
                  return (
                    <tr key={client.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-bold">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${tier.color}`}>{tier.name}</span>
                      </td>
                      <td className="px-4 py-3 font-bold">{client.loyalty?.points || 0}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedClient(client)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-black mb-4">Adjust Points for {selectedClient.name}</h2>
            <input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} placeholder="Points (+ or -)" className="w-full p-3 border-2 rounded-xl mb-3" />
            <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason" className="w-full p-3 border-2 rounded-xl mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setSelectedClient(null)} className="flex-1 py-3 border-2 rounded-xl font-bold">Cancel</button>
              <button onClick={handleAdjustPoints} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}