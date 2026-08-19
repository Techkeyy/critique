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
  const cls = s === "failed" || s === "error" ? "fail" : s === "passed" || s === "authored" ? "pass" : s === "owed" ? "owed" : "";
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
    const last = items[items.length - 1];
    return { id, items, last };
  });
}

function renderHome(data) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const suite = data.suite || {};
  const sessions = groupSessions(entries);
  const tests = suite.tests ?? "—";
  const human = suite.humanWroteToVerifyAClaim ?? 0;

  app.innerHTML = `
    <p class="eyebrow">Kane CLI hackathon · live ledger</p>
    <h1>The agent<br>marks its own<br>homework.</h1>
    <p class="lede">Critique intercepts a coding agent at Stop, prosecutes the claim in a real browser, and refuses exit until the claim survives. The suite is exhaust — nobody wrote it.</p>
    <div class="stats">
      <div class="stat">
        <div class="eyebrow">Tests in suite</div>
        <div class="n">${esc(tests)}</div>
        <p>${esc(suite.generatedFromClaims ?? "—")} generated from claims · ${esc(suite.seededBaseline ?? "—")} seeded baseline</p>
      </div>
      <div class="stat">
        <div class="eyebrow">Written by humans to verify a claim</div>
        <div class="n">${esc(human)}</div>
        <p>Zero. Prosecutions are authored by Kane from the agent's own words.</p>
      </div>
    </div>
    <p class="eyebrow" style="margin-bottom:14px">Sessions</p>
    <div class="list" id="sessions"></div>
  `;

  const list = document.getElementById("sessions");
  if (!sessions.length) {
    list.innerHTML = `<div class="empty">No sessions recorded yet. The ledger is empty — that is the honest state, not an error.</div>`;
    return;
  }
  list.innerHTML = sessions
    .map((s) => {
      const claim = [...s.items].reverse().find((e) => e.claim)?.claim;
      const failIdx = s.items.findIndex((e) => e && e.failureDetail);
      const href = `#/s/${encodeURIComponent(s.id)}`;
      const failHint =
        failIdx >= 0
          ? `<div class="muted" style="margin-top:8px;color:var(--fail)">Has Kane failure — open, then click the failed event</div>`
          : "";
      return `<a class="card session-link" href="${href}" data-session="${esc(s.id)}">
        <div class="row">
          <span class="sid">${esc(s.id)}</span>
          ${pill(s.last.status)}
        </div>
        <div style="margin-top:10px;color:var(--text-2)">${claim ? esc(claim) : "<span class='unavail'>No claim extracted on this session</span>"}</div>
        <div class="muted" style="margin-top:8px;font-size:12px">${esc(s.items.length)} events · last ${esc(s.last.at || "")} · source ${esc(s.last.source || "—")}</div>
        ${failHint}
      </a>`;
    })
    .join("");
}

function renderSession(data, id) {
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter((e) => e.session_id === id);
  app.innerHTML = `
    <a class="back" href="#/">← Sessions</a>
    <p class="eyebrow" style="margin-top:28px">Session</p>
    <h1 style="font-size:clamp(28px,5vw,48px)">${esc(id)}</h1>
    <div class="list" id="events"></div>
  `;
  const list = document.getElementById("events");
  if (!entries.length) {
    list.innerHTML = `<div class="empty">No events for this session.</div>`;
    return;
  }
  list.innerHTML = entries
    .map((e, i) => {
      const href = `#/s/${encodeURIComponent(id)}/e/${i}`;
      const failBit = e.failureDetail
        ? `<pre class="mono" style="margin-top:12px;max-height:8em;overflow:auto">${esc(e.failureDetail)}</pre>`
        : "";
      return `<a class="card event-link" href="${href}" data-event="${i}">
        <div class="row">
          <span class="eyebrow">${esc(e.phase || "event")} · ${esc(e.source || "—")}</span>
          ${pill(e.status)}
        </div>
        <div class="claim" style="font-size:22px;margin:12px 0 0">${e.claim ? esc(e.claim) : "<span class='unavail'>No claim</span>"}</div>
        <div class="muted" style="margin-top:8px;font-size:12px">${esc(e.at || "")}${e.durationWallClock != null ? " · " + esc(e.durationWallClock) + "s" : ""}</div>
        ${failBit}
      </a>`;
    })
    .join("");
}

function renderEvent(data, id, index) {
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter((e) => e.session_id === id);
  const e = entries[Number(index)];
  if (!e) {
    app.innerHTML = `<a class="back" href="#/s/${encodeURIComponent(id)}">← Session</a><div class="empty">Event not found.</div>`;
    return;
  }
  const url = e.testUrl
    ? `<a href="${esc(e.testUrl)}" target="_blank" rel="noreferrer">Open Kane dashboard</a>`
    : `<span class="unavail">Dashboard URL unavailable (cached replay did not return testUrl)</span>`;
  const steps = Array.isArray(e.steps) && e.steps.length
    ? `<ol class="steps">${e.steps
        .map(
          (s) => `<li><span class="i">${esc(s.index ?? "")}</span><span class="pill ${s.status === "failed" ? "fail" : "pass"}">${esc(s.status || "")}</span><span>${esc(s.summary || "")}</span></li>`,
        )
        .join("")}</ol>`
    : `<p class="unavail">No step timeline on this entry.</p>`;
  app.innerHTML = `
    <a class="back" href="#/s/${encodeURIComponent(id)}">← Session</a>
    <p class="eyebrow" style="margin-top:28px">${esc(e.phase || "event")} · ${esc(e.source || "—")}</p>
    <div class="claim">${e.claim ? esc(e.claim) : "<span class='unavail'>No claim stated</span>"}</div>
    <div class="row" style="margin-bottom:24px">${pill(e.status)}<span class="muted">${esc(e.at || "")}</span></div>
    <p class="eyebrow">Failure detail</p>
    <pre class="mono">${e.failureDetail ? esc(e.failureDetail) : "— none. This entry did not record a Kane failure."}</pre>
    <p class="eyebrow" style="margin-top:28px">Kane dashboard</p>
    <p>${url}</p>
    <p class="eyebrow" style="margin-top:28px">Step timeline</p>
    ${steps}
  `;
}

function route(data) {
  const hash = (location.hash || "#/").replace(/^#/, "") || "/";
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
    data = { entries: [], suite: { tests: 0, humanWroteToVerifyAClaim: 0 } };
  }
  if (!data || typeof data !== "object") data = { entries: [] };
  if (!Array.isArray(data.entries)) data.entries = [];
  window.__ledger = data;
  route(data);
}

window.addEventListener("hashchange", () => route(window.__ledger || { entries: [] }));
boot();
