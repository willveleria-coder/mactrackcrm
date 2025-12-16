"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function LiveChat({ userType, userId, userName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && userId) {
      initConversation();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
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
  }, [conversation]);

  const initConversation = async () => {
    setLoading(true);
    try {
      let { data: conv } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("participant_type", userType)
        .eq("participant_id", userId)
        .single();

      if (!conv) {
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({
            participant_type: userType,
            participant_id: userId
          })
          .select()
          .single();
        conv = newConv;
      }

      setConversation(conv);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);

      await supabase
        .from("chat_messages")
        .update({ read: true })
        .eq("conversation_id", conv.id)
        .neq("sender_type", userType);

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
      await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        sender_type: userType,
        sender_id: userId,
        message: msg
      });

      await supabase
        .from("chat_conversations")
        .update({ 
          last_message: msg, 
          last_message_at: new Date().toISOString() 
        })
        .eq("id", conversation.id);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:bg-red-700 transition-transform hover:scale-110 z-40"
      >
        💬
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border-2 border-gray-200">
          <div className="bg-red-600 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Mac Track Support</h3>
              <p className="text-red-200 text-sm">We typically reply instantly</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-2xl hover:bg-red-700 rounded-full w-8 h-8">
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {loading ? (
              <div className="text-center text-gray-500 py-10">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <p className="text-4xl mb-2">👋</p>
                <p>Start a conversation with our team!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === userType ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender_type === userType
                        ? "bg-red-600 text-white rounded-br-md"
                        : "bg-white text-gray-900 rounded-bl-md shadow"
                    }`}
                  >
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === userType ? "text-red-200" : "text-gray-400"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t bg-white">
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
                className="px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}