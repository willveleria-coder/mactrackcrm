"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", company: "" });
  const [editingClient, setEditingClient] = useState(null);

  // ✅ Fetch clients
  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const { data, error } = await supabase.from("clients").select("*").order("id", { ascending: true });
    if (error) console.error("Error fetching clients:", error);
    else setClients(data);
  }

  // ✅ Add client
  async function addClient(e) {
    e.preventDefault();
    if (!newClient.name || !newClient.email) {
      alert("Please enter at least a name and email");
      return;
    }

    const { error } = await supabase.from("clients").insert([newClient]);
    if (error) console.error("Error adding client:", error);
    else {
      setNewClient({ name: "", email: "", phone: "", company: "" });
      fetchClients();
    }
  }

  // ✅ Delete client
  async function deleteClient(id) {
    if (!confirm("Are you sure you want to delete this client?")) return;

    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) console.error("Error deleting client:", error);
    else fetchClients();
  }

  // ✅ Edit mode
  function startEdit(client) {
    setEditingClient(client);
  }

  async function saveEdit(e) {
    e.preventDefault();

    const { error } = await supabase
      .from("clients")
      .update({
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone,
        company: editingClient.company,
      })
      .eq("id", editingClient.id);

    if (error) console.error("Error updating client:", error);
    else {
      setEditingClient(null);
      fetchClients();
    }
  }

  // ✅ Filtered clients
  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Clients</h1>

      {/* 🔍 Search bar */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search clients by name, company, or email..."
          className="border p-2 rounded w-full max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={() => setSearchQuery("")}
          className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>

      {/* ✅ Add or Edit form */}
      {editingClient ? (
        <form onSubmit={saveEdit} className="mb-6 flex flex-wrap gap-3 items-end">
          <input
            type="text"
            placeholder="Name"
            className="border p-2 rounded w-40"
            value={editingClient.name}
            onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded w-52"
            value={editingClient.email}
            onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone"
            className="border p-2 rounded w-40"
            value={editingClient.phone}
            onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
          />
          <input
            type="text"
            placeholder="Company"
            className="border p-2 rounded w-52"
            value={editingClient.company}
            onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditingClient(null)}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </form>
      ) : (
        <form onSubmit={addClient} className="mb-6 flex flex-wrap gap-3 items-end">
          <input
            type="text"
            placeholder="Name"
            className="border p-2 rounded w-40"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded w-52"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone"
            className="border p-2 rounded w-40"
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
          />
          <input
            type="text"
            placeholder="Company"
            className="border p-2 rounded w-52"
            value={newClient.company}
            onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Client
          </button>
        </form>
      )}

      {/* ✅ Clients Table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Phone</th>
            <th className="border p-2">Company</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <tr key={client.id}>
                <td className="border p-2">{client.name}</td>
                <td className="border p-2">{client.email}</td>
                <td className="border p-2">{client.phone}</td>
                <td className="border p-2">{client.company}</td>
                <td className="border p-2">
                  <button
                    onClick={() => startEdit(client)}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteClient(client.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center p-4 text-gray-500">
                No clients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}