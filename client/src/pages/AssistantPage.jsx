import { useState } from "react";
import { Link } from "react-router-dom";
import { api, dollars, toCents } from "../api.js";

export function AssistantPage() {
  const [message, setMessage] = useState("chemistry textbook");
  const [max, setMax] = useState("40");
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="card" style={{ maxWidth: 720, margin: "24px auto" }}>
      <form
        className="body stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setResult("");
          try {
            const data = await api("/api/ai/plan", {
              method: "POST",
              body: { message, maxSpendCents: toCents(max) },
            });
            setPlan(data);
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <h1>Sandboxed assistant</h1>
        <p className="lead">
          Uses only public search and the same proxy-bid engine. Needs an explicit confirmation and a hard spend cap.
          It never returns other students’ emails, passwords, or account records.
        </p>
        <label>
          What are you looking for?
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label>
          Maximum you will spend ($)
          <input value={max} onChange={(e) => setMax(e.target.value)} />
        </label>
        <button className="btn" type="submit">
          Search (no bid yet)
        </button>
        {error && <div className="error">{error}</div>}
        {plan && <p>{plan.reply}</p>}
        {plan?.listings?.map((l) => (
          <div key={l.id}>
            <Link to={`/auctions/${l.id}`}>{l.title}</Link> · {dollars(l.currentBidCents || l.startingPriceCents)} · {l.status}
          </div>
        ))}
        {plan?.needsConfirmation && (
          <div className="card panel">
            <p>
              Confirm proxy bid on <strong>{plan.proposal.title}</strong> up to {dollars(plan.proposal.maxCents)}?
            </p>
            <div className="row">
              <button
                className="btn gold"
                type="button"
                onClick={async () => {
                  const data = await api("/api/ai/confirm", {
                    method: "POST",
                    body: { confirmToken: plan.confirmToken, accept: true },
                  });
                  setResult(data.reply);
                  setPlan(null);
                }}
              >
                Yes, place proxy bid
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  await api("/api/ai/confirm", {
                    method: "POST",
                    body: { confirmToken: plan.confirmToken, accept: false },
                  });
                  setPlan(null);
                  setResult("Cancelled.");
                }}
              >
                No
              </button>
            </div>
          </div>
        )}
        {result && <p className="ok">{result}</p>}
      </form>
    </div>
  );
}
