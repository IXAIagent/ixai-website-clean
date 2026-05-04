"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `https://ixai-backend.onrender.com/api/v1/dashboard/dev-real-summary`
        );

        if (!res.ok) {
          throw new Error("API failed");
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to fetch");
      }
    }

    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>IXAI Dashboard</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}