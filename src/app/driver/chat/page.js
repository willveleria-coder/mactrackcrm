"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function DriverChatPage() {
  const [driver, setDriver] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDriverAndChat();
  }, []);

  useEffect(() => {
    if (conversation) {
      const channel = supabase
        .channel(`driver-chat-${conversation.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`
        }, (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadDriverAndChat() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);

      // Find or create conversation
      let { data: existingConvo } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("participant_id", driverData.id)
        .eq("participant_type", "driver")
        .single();

      if (!existingConvo) {
        const { data: newConvo } = await supabase
          .from("chat_conversations")
          .insert({
            participant_id: driverData.id,
            participant_type: "driver"
          })
          .select()
          .single();
        existingConvo = newConvo;
      }

      setConversation(existingConvo);

      // Load messages
      if (existingConvo) {
        const { data: messagesData } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", existingConvo.id)
          .order("created_at", { ascending: true });

        setMessages(messagesData || []);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    const msg = newMessage.trim();
    setNewMessage("");

    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      sender_type: "driver",
      message: msg
    });

    await supabase.from("chat_conversations").update({
      last_message: msg,
      last_message_at: new Date().toISOString()
    }).eq("id", conversation.id);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/driver/dashboard" className="text-2xl">←</Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              💬
            </div>
            <div>
              <h1 className="text-xl font-black">Mac Track Support</h1>
              <p className="text-red-200 text-sm">Chat with admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">💬</p>
              <p className="text-gray-500 font-semibold">No messages yet</p>
              <p className="text-gray-400 text-sm mt-1">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === "driver" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.sender_type === "driver"
                    ? "bg-red-600 text-white rounded-br-md"
                    : "bg-white text-gray-900 rounded-bl-md shadow"
                }`}>
                  <p>{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender_type === "driver" ? "text-red-200" : "text-gray-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
