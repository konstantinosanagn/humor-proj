"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to continue</h1>
        <p className="text-gray-500">
          You need to sign in to view the Crackd data.
        </p>
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
