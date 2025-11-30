import { supabase } from "./supabaseClient";

export async function createClientIfNotExists() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingClient) {
      const { error: insertError } = await supabase.from("clients").insert([
        {
          user_id: user.id,
          name: user.user_metadata?.name || "New Client",
          email: user.email,
        },
      ]);

      if (insertError) {
        console.error("❌ Error creating client:", insertError);
      } else {
        console.log("✅ New client record created for", user.email);
      }
    } else {
      console.log("🟢 Client already exists for", user.email);
    }
  } catch (err) {
    console.error("Error ensuring client record:", err);
  }
}