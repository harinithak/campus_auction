import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, dollars } from "../api.js";

export function BrowsePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("ending");
  const [listings, setListings] = useState([]);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (condition) params.set("condition", condition);
    params.set("sort", sort);
    const data = await api(`/api/listings?${params}`);
    setListings(data.listings);
  }

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const run = () =>
      load().catch(() => {
        tries += 1;
        if (!cancelled && tries < 8) setTimeout(run, 800);
      });
    run();
    return () => {
      cancelled = true;
    };
  }, [category, condition, sort]);

  return (
    <>
      <section className="hero">
        <h1>Student lots, open bidding.</h1>
        <p className="lead">Search live and upcoming campus auctions. Leading max is public. Server clock decides close.</p>
      </section>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input placeholder="Keyword search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {["textbooks", "electronics", "furniture", "clothing", "bikes", "other"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="">Any condition</option>
          {["new", "like_new", "good", "fair"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="ending">Ending soon</option>
          <option value="newest">Newest</option>
          <option value="price">Starting price</option>
        </select>
        <button className="btn" type="submit">
          Search
        </button>
      </form>
      <div className="grid">
        {listings.map((l) => (
          <Link key={l.id} to={`/auctions/${l.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            {l.imageUrl && <img src={l.imageUrl} alt="" />}
            <div className="body">
              <span className="pill">{l.status}</span>
              <h3>{l.title}</h3>
              <div className="muted">
                {l.category} · {l.condition.replace("_", " ")}
              </div>
              <div className="price">{dollars(l.currentBidCents || l.startingPriceCents)}</div>
              <div className="muted">Seller {l.seller?.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
