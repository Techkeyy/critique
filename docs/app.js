const app = document.getElementById("app");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pill(status) {
  const s = String(status || "").toLowerCase();
  const known = ["passed", "failed", "owed", "timeout", "error", "authored", "skipped"];
  const cls = known.includes(s) ? s : "skipped";
  return `<span class="pill ${cls}">${esc(s || "unknown")}</span>`;
}

function groupSessions(entries) {
  const map = new Map();
  for (const e of entries) {
    const id = e.session_id || "unknown";
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(e);
  }
  return [...map.entries()].map(([id, items]) => {
    items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return { id, items, last: items[items.length - 1] };
  });
}

const DOT = ' <span class="dot">·</span> ';

function renderHome(data) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const suite = data.suite || {};
  const sessions = groupSessions(entries);
  const tests = suite.tests ?? 0;
  const human = suite.humanWroteToVerifyAClaim ?? 0;

  // The breakdown must reconcile with the headline total or the stat reads as wrong.
  const parts = [];
  if (suite.generatedFromClaims) parts.push(`${suite.generatedFromClaims} authored from claims`);
  if (suite.subjectAppHarness) parts.push(`${suite.subjectAppHarness} subject app`);
  if (suite.seededBaseline) parts.push(`${suite.seededBaseline} baseline`);
  const breakdown = parts.length ? parts.join(" · ") : "no tests yet";

  const cards = !sessions.length
    ? `<div class="empty">No sessions recorded yet. An empty ledger is the honest state, not an error.</div>`
    : sessions
        .map((s) => {
          const claim = [...s.items].reverse().find((e) => e.claim)?.claim;
          const hasFail = s.items.some((e) => e && e.failureDetail);
          return `<a href="#/s/${encodeURIComponent(s.id)}">
            <div class="row-top">
              <span class="sid">${esc(s.id)}</span>
              ${pill(s.last.status)}
            </div>
            <div class="claim${claim ? "" : " muted"}">${claim ? esc(claim) : "No claim was extracted on this session"}</div>
            <div class="meta">${esc(s.items.length)} events${DOT}${esc(s.last.at || "")}${DOT}${esc(s.last.source || "not recorded")}</div>
            ${hasFail ? `<div class="hint">Kane falsified a claim here</div>` : ""}
          </a>`;
        })
        .join("");

  app.innerHTML = `
    <section class="hero">
      <div class="wrap">
        <p class="eyebrow gold">Kane CLI${DOT}Live verification ledger</p>
        <h1 class="wordmark">Critique</h1>
        <p class="statement">The agent marks its own <em>homework</em>.</p>
        <p class="lede">Critique intercepts a coding agent the moment it claims to be finished, prosecutes that claim in a real browser, and refuses to let it exit until the claim survives. Every prosecution becomes a cached test. The suite below grew by itself.</p>
        <div class="actions">
          <a class="btn solid" href="#ledger">Read the ledger</a>
          <a class="btn" href="./demo/">Open the app under test</a>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="stats">
          <div class="stat">
            <p class="eyebrow" style="margin:0">Tests in suite</p>
            <div class="n">${esc(tests)}</div>
            <p>${esc(breakdown)}</p>
          </div>
          <div class="stat gold">
            <p class="eyebrow" style="margin:0">Written by a human</p>
            <div class="n">${esc(human)}</div>
            <p>Kane authored every one of them from the agent's own sentences.</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <p class="eyebrow">How the loop closes</p>
        <h2 class="section-head">Three moves. No human in the middle.</h2>
        <div class="steps-grid">
          <div class="stepcard">
            <span class="num">01</span>
            <h3>The claim is caught</h3>
            <p>A Stop hook reads the agent's closing sentence and pulls the assertions out of it. "I added the dark mode toggle" becomes something a browser can test.</p>
          </div>
          <div class="stepcard">
            <span class="num">02</span>
            <h3>Kane tries to break it</h3>
            <p>Kane CLI drives a real browser against the running app. The diff goes in as context, so the test is about what actually changed.</p>
          </div>
          <div class="stepcard">
            <span class="num">03</span>
            <h3>Exit is denied</h3>
            <p>If the claim falls over, the agent cannot finish. It receives Kane's failure text, fixes the code, and tries again. The passing test caches and replays free forever.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="ledger">
      <div class="wrap">
        <p class="eyebrow">The ledger</p>
        <h2 class="section-head">Every claim, and what a browser proved.</h2>
        <div class="list">${cards}</div>
      </div>
    </section>
  `;
}

function renderSession(data, id) {
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter((e) => e.session_id === id);
  const cards = !entries.length
    ? `<div class="empty">No events for this session.</div>`
    : entries
        .map((e, i) => {
          const excerpt = e.failureDetail ? `<pre class="mono excerpt">${esc(e.failureDetail)}</pre>` : "";
          return `<a href="#/s/${encodeURIComponent(id)}/e/${i}">
            <div class="row-top">
              <span class="eyebrow" style="margin:0">${esc(e.phase || "event")}${DOT}${esc(e.source || "not recorded")}</span>
              ${pill(e.status)}
            </div>
            <div class="claim${e.claim ? "" : " muted"}">${e.claim ? esc(e.claim) : "No claim"}</div>
            <div class="meta">${esc(e.at || "")}${e.durationWallClock != null ? DOT + esc(e.durationWallClock) + "s" : ""}</div>
            ${excerpt}
          </a>`;
        })
        .join("");

  app.innerHTML = `
    <section>
      <div class="wrap">
        <a class="back" href="#/">Back to the ledger</a>
        <p class="eyebrow">Session</p>
        <h1 class="sid-title">${esc(id)}</h1>
        <div class="list">${cards}</div>
      </div>
    </section>
  `;
}

function renderEvent(data, id, index) {
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter((e) => e.session_id === id);
  const e = entries[Number(index)];
  if (!e) {
    app.innerHTML = `<section><div class="wrap"><a class="back" href="#/s/${encodeURIComponent(id)}">Back to session</a><div class="empty">Event not found.</div></div></section>`;
    return;
  }
  const url = e.testUrl
    ? `<a class="btn" href="${esc(e.testUrl)}" target="_blank" rel="noreferrer">Open Kane dashboard</a>`
    : `<p class="muted">No Kane dashboard link. Cached replays do not return one.</p>`;
  const steps = Array.isArray(e.steps) && e.steps.length
    ? `<div class="steps">${e.steps
        .map(
          (s) => `<div class="step"><span class="i">${esc(s.index ?? "")}</span>${pill(s.status === "failed" ? "failed" : "passed")}<span class="what">${esc(s.summary || "")}</span></div>`,
        )
        .join("")}</div>`
    : `<p class="muted">No step timeline on this entry.</p>`;

  app.innerHTML = `
    <section>
      <div class="wrap">
        <a class="back" href="#/s/${encodeURIComponent(id)}">Back to session</a>
        <p class="eyebrow">${esc(e.phase || "event")}${DOT}${esc(e.source || "not recorded")}</p>
        <p class="statement" style="font-size:clamp(24px,3.4vw,38px);max-width:24ch">${e.claim ? esc(e.claim) : "No claim stated"}</p>
        <div class="row-top" style="margin-bottom:36px">${pill(e.status)}<span class="meta" style="margin:0">${esc(e.at || "")}</span></div>

        <p class="eyebrow">What Kane said</p>
        <pre class="mono">${e.failureDetail ? esc(e.failureDetail) : "No Kane failure was recorded on this entry."}</pre>

        <p class="eyebrow" style="margin-top:44px">Evidence</p>
        ${url}

        <p class="eyebrow" style="margin-top:44px">Step timeline</p>
        ${steps}
      </div>
    </section>
  `;
}

function route(data) {
  const hash = (location.hash || "#/").replace(/^#/, "") || "/";
  if (hash.startsWith("ledger")) return;
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "s" && parts[1] && parts[2] === "e") return renderEvent(data, decodeURIComponent(parts[1]), parts[3]);
  if (parts[0] === "s" && parts[1]) return renderSession(data, decodeURIComponent(parts[1]));
  return renderHome(data);
}

async function boot() {
  let data = { entries: [], suite: { tests: 0, humanWroteToVerifyAClaim: 0 } };
  try {
    const src = new URLSearchParams(location.search).has("empty") ? "./empty-ledger.json" : "./ledger.json";
    const res = await fetch(src, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {
    /* keep the honest empty state */
  }
  route(data);
  window.addEventListener("hashchange", () => {
    route(data);
    if (!location.hash.startsWith("#ledger")) window.scrollTo(0, 0);
  });
}

boot();
