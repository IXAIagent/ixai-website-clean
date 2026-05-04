"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("https://ixai-backend.onrender.com/api/v1/dashboard/dev-real-summary")
      .then(res => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>IXAI Dashboard</h1>

      <h2>Summary</h2>
      <p>{data.summary}</p>

      <h2>Alerts</h2>
      <ul>
        {data.alerts.map((a: any, i: number) => (
          <li key={i}>{a.level.toUpperCase()} - {a.message}</li>
        ))}
      </ul>

      <h2>Stocks</h2>
      <ul>
        {data.stocks.map((s: any, i: number) => (
          <li key={i}>{s.symbol}: ${s.price}</li>
        ))}
      </ul>

      <h2>Summary Cards</h2>
      <ul>
        {data.summary_cards.map((c: any, i: number) => (
          <li key={i}>{c.title}: {c.value}</li>
        ))}
      </ul>
    </div>
  );
}