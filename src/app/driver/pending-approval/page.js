"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function DriverPendingApprovalPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  async function checkApproval() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: driver } = await supabase
        .from("drivers")
        .select("is_approved")
        .eq("user_id", user.id)
        .single();
      
      if (driver?.is_approved) {
        router.push("/driver/dashboard");
      } else {
        alert("Your account is still pending approval. Please wait for admin confirmation.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-lg w-full text-center border border-gray-100">
        <div className="mb-6">
          <Image src="/bus-icon.png" alt="Mac With A Van" width={80} height={80} className="mx-auto" />
        </div>
        
        <div className="text-6xl mb-6">⏳</div>
        
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
          Account Pending Approval
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for registering as a driver with Mac With A Van. Your account is currently being reviewed by our team.
        </p>
        
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
          <p className="text-yellow-800 font-bold mb-2">What happens next?</p>
          <ul className="text-yellow-700 text-sm text-left space-y-2">
            <li>✓ Our team will review your application</li>
            <li>✓ You'll receive an email once approved</li>
            <li>✓ Then you can start accepting jobs!</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={checkApproval}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition"
          >
            🔄 Check Approval Status
          </button>
          
          <p className="text-sm text-gray-500">
            Questions? Contact us at <a href="mailto:macwithavan@mail.com" className="text-red-600 font-bold hover:underline">macwithavan@mail.com</a>
          </p>
          
          <button 
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
          >
            ← Logout
          </button>
        </div>
      </div>
    </div>
  );
}
