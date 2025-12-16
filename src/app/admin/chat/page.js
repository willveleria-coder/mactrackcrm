"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminChatPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    const channel = supabase.channel("admin-chat").on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, fetchConversations).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.id);
      const channel = supabase.channel(`chat-${selected.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selected.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      }).subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    const { data } = await supabase.from("chat_conversations").select("*").order("last_message_at", { ascending: false });
    const convos = await Promise.all((data || []).map(async (conv) => {
      const table = conv.participant_type === "client" ? "clients" : "drivers";
      const { data: participant } = await supabase.from(table).select("name, email").eq("id", conv.participant_id).single();
      return { ...conv, participant };
    }));
    setConversations(convos);
    setLoading(false);
  };

  const fetchMessages = async (convId) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selected) return;
    const msg = newMessage.trim();
    setNewMessage("");
    await supabase.from("chat_messages").insert({ conversation_id: selected.id, sender_type: "admin", message: msg });
    await supabase.from("chat_conversations").update({ last_message: msg, last_message_at: new Date().toISOString() }).eq("id", selected.id);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-2xl">←</Link>
          <div>
            <h1 className="text-2xl font-black">💬 Live Chat</h1>
            <p className="text-red-200">Support conversations</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex" style={{ height: "calc(100vh - 140px)" }}>
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white">
              <h2 className="font-bold text-lg">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations</div>
              ) : (
                conversations.map((conv) => (
                  <button key={conv.id} onClick={() => setSelected(conv)} className={`w-full p-4 text-left border-b hover:bg-gray-100 ${selected?.id === conv.id ? "bg-red-50 border-l-4 border-l-red-600" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${conv.participant_type === "client" ? "bg-blue-500" : "bg-green-500"}`}>
                        {conv.participant_type === "client" ? "👤" : "🚗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{conv.participant?.name || "Unknown"}</p>
                        <p className="text-sm text-gray-500 truncate">{conv.last_message || "No messages"}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selected ? (
              <>
                <div className="p-4 border-b bg-white flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${selected.participant_type === "client" ? "bg-blue-500" : "bg-green-500"}`}>
                    {selected.participant_type === "client" ? "👤" : "🚗"}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{selected.participant?.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{selected.participant_type}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl ${msg.sender_type === "admin" ? "bg-red-600 text-white rounded-br-md" : "bg-white text-gray-900 rounded-bl-md shadow"}`}>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 p-3 border-2 border-gray-200 rounded-xl" />
                    <button type="submit" className="px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Send</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-6xl mb-4">💬</p>
                  <p className="text-xl">Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}