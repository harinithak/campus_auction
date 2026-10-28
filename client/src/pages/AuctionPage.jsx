import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, dollars, toCents } from "../api.js";
import { useAuth } from "../auth.jsx";
import { getSocket } from "../socket.js";

function useCountdown(endsAt, serverOffset) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const remaining = new Date(endsAt).getTime() - (now + serverOffset);
  return remaining;
}

export function AuctionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [bids, setBids] = useState([]);
  const [maxes, setMaxes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [amount, setAmount] = useState("");
  const [proxy, setProxy] = useState(true);
  const [qtext, setQtext] = useState("");
  const [answer, setAnswer] = useState({});
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [note, setNote] = useState("");

  async function refresh() {
    const [l, b, qs] = await Promise.all([
      api(`/api/listings/${id}`),
      api(`/api/bids/${id}`),
      api(`/api/questions/${id}`, {}),
    ]);
    setListing(l.listing);
    setOffset(new Date(l.serverTime).getTime() - Date.now());
    setBids(b.bids);
    setMaxes(b.publicMaxes);
    setQuestions(qs.questions);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const sock = getSocket();
    sock.emit("join:listing", id);
    const bump = () => refresh().catch(() => {});
    sock.on("auction:update", bump);
    sock.on("bid:new", bump);
    sock.on("auction:extended", bump);
    sock.on("auction:closed", bump);
    sock.on("auction:cancelled", bump);
    return () => {
      sock.emit("leave:listing", id);
      sock.off("auction:update", bump);
      sock.off("bid:new", bump);
      sock.off("auction:extended", bump);
      sock.off("auction:closed", bump);
      sock.off("auction:cancelled", bump);
    };
  }, [id]);

  const remaining = useCountdown(listing?.endsAt || Date.now(), offset);
  const clock = useMemo(() => {
    if (!listing) return "";
    if (remaining <= 0) return "Closed on server clock";
    const s = Math.floor(remaining / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ${s % 60}s`;
  }, [remaining, listing]);

  const isSeller = user && listing && user.id === listing.seller.id;

  async function bid(e) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/bids/${id}`, {
        method: "POST",
        body: { amountCents: toCents(amount), proxy },
      });
      setAmount("");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!listing) return <p>{error || "Loading auction…"}</p>;

  return (
    <div className="auction" style={{ marginTop: 20 }}>
      <section className="card">
        {listing.imageUrl && <img src={listing.imageUrl} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover" }} />}
        <div className="body">
          <span className="pill">{listing.status}</span>
          <h1>{listing.title}</h1>
          <p className="muted">
            {listing.category} · {listing.condition.replace("_", " ")} · pickup {listing.pickupLocation} · seller{" "}
            {listing.seller?.name}
          </p>
          <p>{listing.description}</p>
          <div className="price">{dollars(listing.currentBidCents || listing.startingPriceCents)}</div>
          <div>
            Public max {dollars(listing.publicMaxCents)} · increment {dollars(listing.incrementCents)} · reserve{" "}
            {listing.reserveCents ? dollars(listing.reserveCents) : "none"}
          </div>
          <div className="countdown">{clock}</div>
          {listing.extensionCount > 0 && (
            <p className="muted">Anti-snipe extensions: {listing.extensionCount}</p>
          )}
          {isSeller && listing.bidCount === 0 && ["live", "scheduled"].includes(listing.status) && (
            <Link to={`/listings/${listing.id}/edit`}>Edit listing</Link>
          )}
        </div>
      </section>
      <aside className="stack">
        <div className="card panel">
          <h3>Place a bid</h3>
          <p className="muted">Server clock. Atomic compare on the listing document. Proxy bids only raise by the increment.</p>
          <form className="stack" onSubmit={bid}>
            <label>
              Amount (Rs.)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2500" />
            </label>
            <label className="row">
              <input type="checkbox" checked={proxy} onChange={(e) => setProxy(e.target.checked)} />
              Automatic bidding (max shown publicly; earlier max wins ties)
            </label>
            {error && <div className="error">{error}</div>}
            <button className="btn gold" disabled={!user || isSeller} type="submit">
              {user ? (proxy ? "Set max / bid" : "Bid now") : "Sign in to bid"}
            </button>
          </form>
        </div>
        {isSeller && ["live", "scheduled"].includes(listing.status) && (
          <button
            className="btn danger"
            onClick={async () => {
              if (!confirm("Cancel this auction for all bidders?")) return;
              await api(`/api/listings/${id}/cancel`, { method: "POST" });
              await refresh();
            }}
          >
            Cancel auction
          </button>
        )}
        {isSeller && listing.status === "pending_seller" && (
          <div className="card panel">
            <h3>Provisional winner</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to buyer" />
            <div className="row">
              <button
                className="btn"
                onClick={async () => {
                  await api(`/api/lifecycle/${id}/decision`, {
                    method: "POST",
                    body: { decision: "approve", note },
                  });
                  await refresh();
                }}
              >
                Approve
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  await api(`/api/lifecycle/${id}/decision`, {
                    method: "POST",
                    body: { decision: "reject", note },
                  });
                  await refresh();
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )}
        {isSeller && listing.status === "approved" && (
          <div className="card panel">
            <h3>Handover</h3>
            <div className="row">
              <button
                className="btn"
                onClick={async () => {
                  await api(`/api/lifecycle/${id}/handover`, {
                    method: "POST",
                    body: { result: "complete" },
                  });
                  await refresh();
                }}
              >
                Pickup complete
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  await api(`/api/lifecycle/${id}/handover`, {
                    method: "POST",
                    body: { result: "failed" },
                  });
                  await refresh();
                }}
              >
                Failed pickup
              </button>
            </div>
          </div>
        )}
        <div className="card panel">
          <h3>Public bid history</h3>
          <ul className="list">
            {bids.map((b) => (
              <li key={b.id}>
                {b.userName} · {dollars(b.amountCents)} · max {dollars(b.maxShownCents)} · {b.kind}
              </li>
            ))}
          </ul>
          <h4>Public maxes</h4>
          <ul className="list">
            {maxes.map((m) => (
              <li key={m.userId}>
                {dollars(m.maxCents)} since {new Date(m.since).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
        <div className="card panel">
          <h3>Q&A</h3>
          <ul className="list">
            {questions.map((q) => (
              <li key={q.id}>
                <strong>{q.askerName}:</strong> {q.body}
                {q.hidden && <span className="muted"> (hidden)</span>}
                {q.answer && <div className="ok">Seller: {q.answer}</div>}
                {isSeller && !q.answer && (
                  <form
                    className="row"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await api(`/api/questions/${id}/${q.id}/answer`, {
                        method: "POST",
                        body: { answer: answer[q.id] },
                      });
                      await refresh();
                    }}
                  >
                    <input value={answer[q.id] || ""} onChange={(e) => setAnswer({ ...answer, [q.id]: e.target.value })} />
                    <button className="btn" type="submit">
                      Answer
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={async () => {
                        await api(`/api/questions/${id}/${q.id}/hide`, { method: "POST" });
                        await refresh();
                      }}
                    >
                      Hide spam
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {user && !isSeller && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                try {
                  await api(`/api/questions/${id}`, { method: "POST", body: { body: qtext } });
                  setQtext("");
                  await refresh();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <input value={qtext} onChange={(e) => setQtext(e.target.value)} placeholder="Ask the seller" />
              <button className="btn ghost" type="submit">
                Ask
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
