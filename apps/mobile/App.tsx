import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <>
      {session ? <HomeScreen session={session} /> : <AuthScreen />}
      <StatusBar style="auto" />
    </>
  );
}
