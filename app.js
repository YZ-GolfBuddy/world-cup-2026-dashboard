const { matches, standings, odds, snapshot, sources } = window.WC_DATA;

const FLAGS = {
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  "Bosnia and Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cape Verde": "🇨🇻",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  Curaçao: "🇨🇼",
  "Czech Republic": "🇨🇿",
  "DR Congo": "🇨🇩",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Haiti: "🇭🇹",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  "Ivory Coast": "🇨🇮",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Scotland: "🏴",
  Senegal: "🇸🇳",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  "United States": "🇺🇸",
  Uruguay: "🇺🇾",
  Uzbekistan: "🇺🇿"
};

const CONFED = {
  Algeria: "CAF",
  Argentina: "CONMEBOL",
  Australia: "AFC",
  Austria: "UEFA",
  Belgium: "UEFA",
  "Bosnia and Herzegovina": "UEFA",
  Brazil: "CONMEBOL",
  Canada: "CONCACAF",
  "Cape Verde": "CAF",
  Colombia: "CONMEBOL",
  Croatia: "UEFA",
  Curaçao: "CONCACAF",
  "Czech Republic": "UEFA",
  "DR Congo": "CAF",
  Ecuador: "CONMEBOL",
  Egypt: "CAF",
  England: "UEFA",
  France: "UEFA",
  Germany: "UEFA",
  Ghana: "CAF",
  Haiti: "CONCACAF",
  Iran: "AFC",
  Iraq: "AFC",
  "Ivory Coast": "CAF",
  Japan: "AFC",
  Jordan: "AFC",
  Mexico: "CONCACAF",
  Morocco: "CAF",
  Netherlands: "UEFA",
  "New Zealand": "OFC",
  Norway: "UEFA",
  Panama: "CONCACAF",
  Paraguay: "CONMEBOL",
  Portugal: "UEFA",
  Qatar: "AFC",
  "Saudi Arabia": "AFC",
  Scotland: "UEFA",
  Senegal: "CAF",
  "South Africa": "CAF",
  "South Korea": "AFC",
  Spain: "UEFA",
  Sweden: "UEFA",
  Switzerland: "UEFA",
  Tunisia: "CAF",
  Turkey: "UEFA",
  "United States": "CONCACAF",
  Uruguay: "CONMEBOL",
  Uzbekistan: "AFC"
};

const TEAM_ALIASES = {
  USA: "United States",
  "U.S.": "United States"
};

const state = {
  query: "",
  stage: "all",
  group: "all",
  standingGroup: "A",
  view: "schedule"
};

const knownTeams = new Set(standings.map((row) => row.team));
const groups = [...new Set(standings.map((row) => row.group))];
const ptDate = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
  weekday: "short"
});
const ptTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "numeric",
  minute: "2-digit"
});
const ptISODate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function $(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function normalizeTeam(team) {
  return TEAM_ALIASES[team] || team;
}

function teamLabel(team) {
  const clean = normalizeTeam(team);
  return `${FLAGS[clean] || "⚽"} ${clean}`;
}

function matchDate(match) {
  return match.kickoff ? new Date(match.kickoff) : null;
}

function formatPT(match) {
  const date = matchDate(match);
  if (!date) return { date: "待定", time: "TBD" };
  return {
    date: ptDate.format(date),
    time: ptTime.format(date)
  };
}

function isToday(match) {
  const date = matchDate(match);
  if (!date) return false;
  const parts = Object.fromEntries(ptISODate.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}` === snapshot;
}

function scoreText(match) {
  if (match.status === "final") return match.score;
  return match.score.replace("Match ", "M");
}

function renderTabs() {
  const stageTabs = [
    ["all", "全部"],
    ["today", "今天"],
    ["final", "已完赛"],
    ["group", "小组赛"],
    ["knockout", "淘汰赛"]
  ];
  $("stageTabs").innerHTML = stageTabs.map(([value, label]) => (
    `<button class="${state.stage === value ? "active" : ""}" data-stage="${value}">${label}</button>`
  )).join("");

  $("groupTabs").innerHTML = [
    `<button class="${state.group === "all" ? "active" : ""}" data-group="all">全部组</button>`,
    ...groups.map((group) => `<button class="${state.group === group ? "active" : ""}" data-group="${group}">${group}</button>`)
  ].join("");

  $("standingGroup").innerHTML = groups.map((group) => (
    `<option value="${group}" ${state.standingGroup === group ? "selected" : ""}>Group ${group}</option>`
  )).join("");
}

function filteredMatches() {
  const query = state.query.toLowerCase();
  return matches
    .filter((match) => {
      if (state.stage === "today" && !isToday(match)) return false;
      if (state.stage === "final" && match.status !== "final") return false;
      if (state.stage === "group" && !match.group) return false;
      if (state.stage === "knockout" && match.group) return false;
      if (state.group !== "all" && match.group !== state.group) return false;
      if (!query) return true;
      return [match.home, match.away, match.venue, match.city, match.stage].some((value) => (
        String(value).toLowerCase().includes(query)
      ));
    })
    .sort((a, b) => (matchDate(a)?.getTime() || 0) - (matchDate(b)?.getTime() || 0));
}

function renderMatches() {
  const list = filteredMatches();
  $("matchCount").textContent = `${list.length} 场`;
  $("matches").innerHTML = list.map((match) => {
    const time = formatPT(match);
    return `
      <article class="match ${match.status}">
        <div class="time">
          <strong>${esc(time.time)}</strong>
          <span>${esc(time.date)} · PT</span>
          <span>${esc(match.stage)}</span>
        </div>
        <div class="teams">
          ${teamRow(match.home, match, "home")}
          ${teamRow(match.away, match, "away")}
        </div>
        <div class="place">
          <strong>${esc(match.venue || "Venue TBD")}</strong>
          <span>${esc(match.city)}</span>
          <span>${match.status === "final" ? "Final" : esc(match.timeLocal)}</span>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty">没有匹配的比赛。</div>`;
}

function teamRow(team, match, side) {
  const goals = side === "home" ? match.homeGoals : match.awayGoals;
  const button = knownTeams.has(normalizeTeam(team))
    ? `<button class="team-button" data-team="${esc(normalizeTeam(team))}">${esc(teamLabel(team))}</button>`
    : `<span>${esc(team)}</span>`;
  return `
    <div class="team-line">
      ${button}
      <span class="score">${side === "home" ? esc(scoreText(match)) : ""}</span>
      ${goals ? `<small>${esc(goals)}</small>` : ""}
    </div>
  `;
}

function renderStandings() {
  const rows = standings.filter((row) => row.group === state.standingGroup);
  $("standings").innerHTML = `
    <table>
      <thead>
        <tr><th>#</th><th>球队</th><th>赛</th><th>净</th><th>分</th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.pos}</td>
            <td><button class="team-button" data-team="${esc(row.team)}">${esc(teamLabel(row.team))}</button></td>
            <td>${row.pld}</td>
            <td>${row.gd}</td>
            <td><strong>${row.pts}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderOdds() {
  const topOdds = odds.slice(0, 12);
  const max = Math.max(...topOdds.map((item) => item.probability), 1);
  $("oddsStamp").textContent = `快照 ${snapshot}`;
  $("oddsList").innerHTML = topOdds.map((item) => `
    <a class="odd" href="https://polymarket.com/event/2026-fifa-world-cup/${esc(item.slug)}" target="_blank" rel="noreferrer">
      <strong>${esc(teamLabel(item.team))}</strong>
      <span>${item.probability.toFixed(1)}%</span>
      <div class="bar"><span style="width:${Math.max(3, item.probability / max * 100)}%"></span></div>
    </a>
  `).join("");
}

function renderVenues() {
  const venueMap = new Map();
  matches.forEach((match) => {
    const key = `${match.venue} | ${match.city}`;
    if (!venueMap.has(key)) {
      venueMap.set(key, { venue: match.venue, city: match.city, count: 0, finals: 0 });
    }
    const item = venueMap.get(key);
    item.count += 1;
    if (match.stage.includes("Final")) item.finals += 1;
  });
  const venues = [...venueMap.values()].sort((a, b) => b.count - a.count).slice(0, 16);
  const max = Math.max(...venues.map((venue) => venue.count), 1);
  $("venues").innerHTML = venues.map((venue) => `
    <div class="venue">
      <div>
        <strong>${esc(venue.venue)}</strong>
        <div>${esc(venue.city)}</div>
      </div>
      <strong>${venue.count}</strong>
      <div class="bar"><span style="width:${venue.count / max * 100}%"></span></div>
    </div>
  `).join("");
}

function renderHeroBoard() {
  const today = matches.filter(isToday).sort((a, b) => (matchDate(a)?.getTime() || 0) - (matchDate(b)?.getTime() || 0));
  const upcoming = matches
    .filter((match) => match.status !== "final")
    .sort((a, b) => (matchDate(a)?.getTime() || 0) - (matchDate(b)?.getTime() || 0));
  const focus = today[0] || upcoming[0] || matches[0];
  const focusTime = formatPT(focus);
  const mini = (today.length ? today : upcoming).slice(0, 4);
  $("heroBoard").innerHTML = `
    <section class="focus-match">
      <div>
        <span class="badge">${esc(focus.stage)} · ${esc(focusTime.date)} PT</span>
        <h2>${focus.status === "final" ? "最近赛果" : "下一场"}</h2>
      </div>
      <div class="versus">
        <span>${esc(teamLabel(focus.home))}</span>
        <span>${esc(scoreText(focus))}</span>
        <span>${esc(teamLabel(focus.away))}</span>
      </div>
      <div class="place">
        <strong>${esc(focusTime.time)} · ${esc(focus.venue)}</strong>
        <span>${esc(focus.city)}</span>
      </div>
    </section>
    <section class="today-stack">
      <div class="panel-head">
        <h2>今日赛程</h2>
        <span>${today.length} 场</span>
      </div>
      ${mini.map((match) => {
        const time = formatPT(match);
        return `
          <article class="mini-match">
            <strong>${esc(time.time)} · ${esc(match.stage)}</strong>
            <span>${esc(teamLabel(match.home))} vs ${esc(teamLabel(match.away))}</span>
            <small>${esc(match.city)}</small>
          </article>
        `;
      }).join("")}
    </section>
  `;
}

function renderBracket() {
  const knockout = {
    r32: matches.filter((match) => match.stage === "Round of 32"),
    r16: matches.filter((match) => match.stage === "Round of 16"),
    qf: matches.filter((match) => match.stage === "Quarterfinals"),
    sf: matches.filter((match) => match.stage === "Semifinals"),
    third: matches.filter((match) => match.stage === "Match for third place"),
    final: matches.filter((match) => match.stage === "Final")
  };
  const leftGroups = groups.slice(0, 6);
  const rightGroups = groups.slice(6);
  const groupCard = (group, side, row) => {
    const rows = standings.filter((item) => item.group === group);
    return `
      <section class="group-card ${side}" style="grid-row:${row} / span 2">
        <h4>Group ${group}</h4>
        ${rows.map((item) => `
          <div class="group-row">
            <span class="seed">${esc(teamLabel(item.team))}</span>
            <strong>${item.pts}</strong>
          </div>
        `).join("")}
      </section>
    `;
  };
  const positions = [
    ...knockout.r32.slice(0, 8).map((match, index) => ({ match, side: "left", col: 2, row: 2 + index * 2 })),
    ...knockout.r16.slice(0, 4).map((match, index) => ({ match, side: "left", col: 3, row: 3 + index * 4 })),
    ...knockout.qf.slice(0, 2).map((match, index) => ({ match, side: "left", col: 4, row: 5 + index * 8 })),
    ...knockout.sf.slice(0, 1).map((match) => ({ match, side: "left", col: 5, row: 9 })),
    ...knockout.sf.slice(1, 2).map((match) => ({ match, side: "right", col: 9, row: 9 })),
    ...knockout.qf.slice(2, 4).map((match, index) => ({ match, side: "right", col: 10, row: 5 + index * 8 })),
    ...knockout.r16.slice(4, 8).map((match, index) => ({ match, side: "right", col: 11, row: 3 + index * 4 })),
    ...knockout.r32.slice(8, 16).map((match, index) => ({ match, side: "right", col: 12, row: 2 + index * 2 }))
  ];
  const matchNode = ({ match, side, col, row }) => {
    const time = formatPT(match);
    return `
      <button class="poster-match ${side}" data-match="${match.id}" style="grid-column:${col}; grid-row:${row}">
        <span class="meta">${esc(scoreText(match))} · ${esc(time.date)}</span>
        <span class="poster-team">${esc(teamLabel(match.home))}</span>
        <span class="poster-team">${esc(teamLabel(match.away))}</span>
      </button>
    `;
  };
  $("bracket").innerHTML = `
    <div class="poster-bracket">
      <header class="poster-title">
        <span>FIFA</span>
        <h3>2026 FIFA WORLD CUP</h3>
      </header>
      ${leftGroups.map((group, index) => groupCard(group, "left", 2 + index * 2)).join("")}
      ${rightGroups.map((group, index) => groupCard(group, "right", 2 + index * 2)).join("")}
      ${positions.map(matchNode).join("")}
      <section class="poster-center">
        <div class="trophy" aria-hidden="true"></div>
        <button class="final-box" data-match="${knockout.final[0]?.id || ""}">
          <h4>FINAL</h4>
          <span>${esc(knockout.final[0] ? scoreText(knockout.final[0]) : "TBD")}</span>
        </button>
        <button class="final-box" data-match="${knockout.third[0]?.id || ""}" style="margin-top:10px;border-width:2px">
          <h4>3RD PLACE</h4>
          <span>${esc(knockout.third[0] ? scoreText(knockout.third[0]) : "TBD")}</span>
        </button>
      </section>
    </div>
  `;
}

function renderStats() {
  const finalCount = matches.filter((match) => match.status === "final").length;
  const todayCount = matches.filter(isToday).length;
  $("quickStats").innerHTML = [
    [`${matches.length}`, "总场次"],
    [`${knownTeams.size}`, "参赛球队"],
    [`${finalCount}`, "已完赛"],
    [`${todayCount}`, "今日美西日程"]
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderSources() {
  $("sources").innerHTML = `数据快照：${snapshot} · ${sources.map((source) => (
    `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)}</a>`
  )).join(" · ")}`;
}

function teamMatches(team) {
  return matches
    .filter((match) => match.home === team || match.away === team)
    .sort((a, b) => (matchDate(a)?.getTime() || 0) - (matchDate(b)?.getTime() || 0));
}

function openTeam(team) {
  const row = standings.find((item) => item.team === team);
  const market = odds.find((item) => normalizeTeam(item.team) === team);
  const games = teamMatches(team);
  $("teamDetail").innerHTML = `
    <section class="team-detail">
      <div class="team-title">
        <div>
          <span class="badge">Group ${esc(row?.group || "-")} · ${esc(CONFED[team] || "FIFA")}</span>
          <h2>${esc(teamLabel(team))}</h2>
        </div>
      </div>
      <div class="facts">
        <div class="stat"><strong>${row?.pts ?? 0}</strong><span>积分</span></div>
        <div class="stat"><strong>${row ? `${row.w}-${row.d}-${row.l}` : "0-0-0"}</strong><span>战绩</span></div>
        <div class="stat"><strong>${row?.gd ?? 0}</strong><span>净胜球</span></div>
        <div class="stat"><strong>${market ? `${market.probability.toFixed(1)}%` : "-"}</strong><span>Polymarket</span></div>
      </div>
      <div class="matches">
        ${games.map((match) => {
          const time = formatPT(match);
          const opponent = match.home === team ? match.away : match.home;
          return `
            <article class="match ${match.status}">
              <div class="time"><strong>${esc(time.time)}</strong><span>${esc(time.date)} · PT</span></div>
              <div class="teams"><strong>${esc(teamLabel(opponent))}</strong><span>${esc(match.stage)} · ${esc(scoreText(match))}</span></div>
              <div class="place"><strong>${esc(match.venue)}</strong><span>${esc(match.city)}</span></div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
  $("teamDialog").showModal();
}

function openMatch(matchId) {
  const match = matches.find((item) => item.id === Number(matchId));
  if (!match) return;
  const time = formatPT(match);
  $("teamDetail").innerHTML = `
    <section class="team-detail">
      <div class="team-title">
        <div>
          <span class="badge">${esc(match.stage)} · ${esc(time.date)} PT</span>
          <h2>${esc(teamLabel(match.home))} vs ${esc(teamLabel(match.away))}</h2>
        </div>
      </div>
      <div class="facts">
        <div class="stat"><strong>${esc(time.time)}</strong><span>美西时间</span></div>
        <div class="stat"><strong>${esc(scoreText(match))}</strong><span>${match.status === "final" ? "赛果" : "比赛编号"}</span></div>
        <div class="stat"><strong>${esc(match.venue)}</strong><span>场馆</span></div>
        <div class="stat"><strong>${esc(match.city)}</strong><span>城市</span></div>
      </div>
      <div class="matches">
        <article class="match ${match.status}">
          <div class="time"><strong>${esc(time.time)}</strong><span>${esc(time.date)} · PT</span></div>
          <div class="teams">
            ${teamRow(match.home, match, "home")}
            ${teamRow(match.away, match, "away")}
          </div>
          <div class="place"><strong>${esc(match.venue)}</strong><span>${esc(match.city)}</span></div>
        </article>
      </div>
    </section>
  `;
  $("teamDialog").showModal();
}

function renderViewTabs() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === state.view);
  });
}

function bindEvents() {
  $("searchInput").addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderMatches();
  });
  $("stageTabs").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-stage]");
    if (!button) return;
    state.stage = button.dataset.stage;
    renderTabs();
    renderMatches();
  });
  $("groupTabs").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-group]");
    if (!button) return;
    state.group = button.dataset.group;
    renderTabs();
    renderMatches();
  });
  $("standingGroup").addEventListener("change", (event) => {
    state.standingGroup = event.target.value;
    renderStandings();
  });
  document.body.addEventListener("click", (event) => {
    const view = event.target.closest("[data-view]");
    if (view) {
      state.view = view.dataset.view;
      renderViewTabs();
      return;
    }
    const match = event.target.closest("[data-match]");
    if (match) {
      openMatch(match.dataset.match);
      return;
    }
    const button = event.target.closest("[data-team]");
    if (button) openTeam(button.dataset.team);
  });
  $("closeDialog").addEventListener("click", () => $("teamDialog").close());
}

function render() {
  renderViewTabs();
  renderHeroBoard();
  renderStats();
  renderTabs();
  renderMatches();
  renderStandings();
  renderOdds();
  renderVenues();
  renderBracket();
  renderSources();
}

bindEvents();
render();
