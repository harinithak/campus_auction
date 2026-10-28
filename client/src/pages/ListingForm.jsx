import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, toCents } from "../api.js";

const empty = {
  title: "",
  description: "",
  category: "textbooks",
  condition: "good",
  imageUrl: "",
  pickupLocation: "",
  startingPrice: "10",
  reserve: "0",
  increment: "1",
  startsAt: "",
  endsAt: "",
};

export function ListingForm({ edit }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!edit) {
      const start = new Date();
      const end = new Date(Date.now() + 20 * 60 * 1000);
      setForm((f) => ({
        ...f,
        startsAt: start.toISOString().slice(0, 16),
        endsAt: end.toISOString().slice(0, 16),
      }));
      return;
    }
    api(`/api/listings/${id}`).then(({ listing }) => {
      setForm({
        title: listing.title,
        description: listing.description,
        category: listing.category,
        condition: listing.condition,
        imageUrl: listing.imageUrl || "",
        pickupLocation: listing.pickupLocation,
        startingPrice: String(listing.startingPriceCents / 100),
        reserve: String(listing.reserveCents / 100),
        increment: String(listing.incrementCents / 100),
        startsAt: listing.startsAt.slice(0, 16),
        endsAt: listing.endsAt.slice(0, 16),
      });
    });
  }, [edit, id]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const body = {
      title: form.title,
      description: form.description,
      category: form.category,
      condition: form.condition,
      imageUrl: form.imageUrl,
      pickupLocation: form.pickupLocation,
      startingPriceCents: toCents(form.startingPrice),
      reserveCents: toCents(form.reserve || 0),
      incrementCents: toCents(form.increment),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };
    try {
      const data = edit
        ? await api(`/api/listings/${id}`, { method: "PATCH", body })
        : await api("/api/listings", { method: "POST", body });
      nav(`/auctions/${data.listing.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 640, margin: "24px auto" }}>
      <form className="body stack" onSubmit={onSubmit}>
        <h1>{edit ? "Edit listing" : "List an item"}</h1>
        <label>
          Title
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </label>
        <label>
          Description
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} required />
        </label>
        <div className="row">
          <label>
            Category
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {["textbooks", "electronics", "furniture", "clothing", "bikes", "other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
              {["new", "like_new", "good", "fair"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Pickup location
          <input value={form.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} required />
        </label>
        <label>
          Image URL
          <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </label>
        <div className="row">
          <label>
            Start $
            <input value={form.startingPrice} onChange={(e) => set("startingPrice", e.target.value)} />
          </label>
          <label>
            Reserve $
            <input value={form.reserve} onChange={(e) => set("reserve", e.target.value)} />
          </label>
          <label>
            Increment $
            <input value={form.increment} onChange={(e) => set("increment", e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label>
            Starts
            <input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </label>
          <label>
            Ends
            <input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn gold" type="submit">
          {edit ? "Save changes" : "Publish listing"}
        </button>
        <p className="muted">Edits lock after the first bid. Money is stored as integer cents on the server.</p>
      </form>
    </div>
  );
}
