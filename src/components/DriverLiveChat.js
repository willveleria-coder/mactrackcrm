"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DriverLiveChat({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && userId) initConversation();
  }, [isOpen, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversation) return;
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversation.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        if (payload.new.sender_type !== "driver" && !isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [conversation, isOpen]);

  const initConversation = async () => {
    setLoading(true);
    try {
      let { data: conv } = await supabase.from("chat_conversations").select("*").eq("participant_type", "driver").eq("participant_id", userId).single();
      if (!conv) {
        const { data: newConv } = await supabase.from("chat_conversations").insert({ participant_type: "driver", participant_id: userId }).select().single();
        conv = newConv;
      }
      setConversation(conv);
      const { data: msgs } = await supabase.from("chat_messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
      setMessages(msgs || []);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;
    const msg = newMessage.trim();
    setNewMessage("");
    try {
      await supabase.from("chat_messages").insert({ conversation_id: conversation.id, sender_type: "driver", sender_id: userId, message: msg });
      await supabase.from("chat_conversations").update({ last_message: msg, last_message_at: new Date().toISOString() }).eq("id", conversation.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Chat Button - Bottom Left */}
      {!isOpen && (
        <button onClick={handleOpen} className="fixed bottom-6 left-6 w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-xl sm:text-2xl hover:bg-blue-700 transition-transform hover:scale-110 z-40">
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed left-4 sm:left-6 bottom-4 sm:bottom-6 ${isMinimized ? 'w-64' : 'right-4 sm:right-auto sm:w-96 h-[calc(100vh-120px)] sm:h-[500px]'} bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border-2 border-gray-200 transition-all duration-300`}>
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 sm:p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Mac Track Support</h3>
              {!isMinimized && <p className="text-xs sm:text-sm opacity-75">We typically reply instantly</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-lg w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full">
                {isMinimized ? '▲' : '▼'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-2xl w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full">×</button>
            </div>
          </div>

          {/* Content - Hidden when minimized */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                  <div className="text-center text-gray-500 py-10">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    <p className="text-4xl mb-2">👋</p>
                    <p>Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "driver" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender_type === "driver" ? "bg-blue-600 text-white rounded-br-md" : "bg-white text-gray-900 rounded-bl-md shadow"}`}>
                        <p className="break-words">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender_type === "driver" ? "opacity-75" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t bg-white">
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
                  <button type="submit" disabled={!newMessage.trim()} className="px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
