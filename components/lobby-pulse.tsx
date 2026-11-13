"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react";
import type { LobbyPulse as Pulse } from "@/lib/realtime";

export type LobbyLiveQuery = { sealed: SealedLiveQuery<Pulse>; version: string; userId: string };

// A full page load resets this; the hook retries a failed renewal every second.
let signedOut = false;

// Subscribes to the group's lobby_pulse row and calls onChange whenever its version
// moves past the one the page rendered with. Renders nothing.
export function LobbyPulse({ groupId, live, onChange }: {
  groupId: string;
  live: LobbyLiveQuery;
  onChange: () => void;
}) {
  // Created in the browser tree, not at module level, so the server render never connects.
  const [client] = useState(() =>
    createRealtimeClient({ url: process.env.NEXT_PUBLIC_NEON_REALTIME_URL! }),
  );
  return (
    <RealtimeProvider client={client}>
      <Subscriber groupId={groupId} live={live} onChange={onChange} />
    </RealtimeProvider>
  );
}

function Subscriber({ groupId, live, onChange }: Parameters<typeof LobbyPulse>[0]) {
  const [sealed] = useState(live.sealed); // renewals go through refreshQuery
  const refreshQuery = useCallback(async () => {
    if (signedOut) throw new Error("Signed out");
    const res = await fetch(`/api/lobby/${groupId}/live`, {
      method: "POST",
      body: JSON.stringify({ userId: live.userId }),
    });
    if (res.status === 401 || res.status === 403) {
      // Signed out, another account, or removed from the group: let the page decide.
      signedOut = true;
      window.location.reload();
      throw new Error("Signed out");
    }
    if (!res.ok) throw new Error(`Lobby renewal failed: ${res.status}`);
    return (await res.json()) as SealedLiveQuery<Pulse>;
  }, [groupId, live.userId]);

  const { data } = useLiveQuery(sealed, { refreshQuery });
  const version = data?.[0]?.version;

  // Compare against the last version handled, starting from the server render's.
  const seen = useRef(live.version);
  useEffect(() => {
    if (version !== undefined && version !== seen.current) {
      seen.current = version;
      onChange();
    }
  }, [version, onChange]);

  return null;
}
