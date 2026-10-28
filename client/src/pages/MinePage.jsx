import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, dollars } from "../api.js";

export function MinePage() {
  const [listings, setListings] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    api("/api/listings/mine").then((d) => setListings(d.listings));
    api("/api/notifications").then((d) => setNotes(d.notifications));
  }, []);

  return (
    <>
      <h1>Your lots & notices</h1>
      <div className="grid">
        {listings.map((l) => (
          <Link key={l.id} to={`/auctions/${l.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="body">
              <span className="pill">{l.status}</span>
              <h3>{l.title}</h3>
              <div>{dollars(l.currentBidCents || l.startingPriceCents)}</div>
            </div>
          </Link>
        ))}
      </div>
      <h2>Inbox</h2>
      <ul className="list">
        {notes.map((n) => (
          <li key={n.id}>
            <strong>{n.title}</strong> — {n.body}
          </li>
        ))}
      </ul>
    </>
  );
}
