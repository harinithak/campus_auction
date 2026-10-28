import { useEffect, useState } from "react";
import { api, toCents } from "../api.js";

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [max, setMax] = useState("");

  async function load() {
    const d = await api("/api/alerts");
    setAlerts(d.alerts);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card" style={{ maxWidth: 560, margin: "24px auto" }}>
      <form
        className="body stack"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/api/alerts", {
            method: "POST",
            body: { keywords, category, maxPriceCents: max ? toCents(max) : 0 },
          });
          setKeywords("");
          await load();
        }}
      >
        <h1>Wanted alerts</h1>
        <p className="muted">Matched against new listings even if you are offline. You will see the notice when you return.</p>
        <input placeholder="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">any category</option>
          {["textbooks", "electronics", "furniture", "clothing", "bikes", "other"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input placeholder="max starting price" value={max} onChange={(e) => setMax(e.target.value)} />
        <button className="btn gold" type="submit">
          Save alert
        </button>
        <ul className="list">
          {alerts.map((a) => (
            <li key={a._id} className="row">
              <span>
                {a.keywords} {a.category && `· ${a.category}`}
              </span>
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  await api(`/api/alerts/${a._id}`, { method: "DELETE" });
                  await load();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
