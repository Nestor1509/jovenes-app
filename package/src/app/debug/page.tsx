"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugPage() {
  const [out, setOut] = useState<any>({});

  useEffect(() => {
    (async () => {
      const res: any = {};

      const { data: sessionData } = await supabase.auth.getSession();
      res.session = sessionData?.session
        ? {
            userId: sessionData.session.user.id,
            email: sessionData.session.user.email,
          }
        : null;

      // Probar lectura directa de profiles por el user.id (NO por auth.uid)
      if (sessionData?.session?.user?.id) {
        const userId = sessionData.session.user.id;

        const { data, error, status } = await supabase
          .from("profiles")
          .select("id,name,role,group_id")
          .eq("id", userId)
          .maybeSingle();

        res.profileQuery = { status, data, error: error?.message ?? null };
      }

      // Probar si la tabla existe/permite select simple
      const { error: pingErr } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      res.pingProfiles = { ok: !pingErr, error: pingErr?.message ?? null };

      setOut(res);
    })();
  }, []);

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Debug</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(out, null, 2)}
      </pre>
    </div>
  );
}
