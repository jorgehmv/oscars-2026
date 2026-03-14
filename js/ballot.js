let currentGame = null;
let winners = {};
let adminMode = false;

function init() {
  const hash = location.hash.substring(1);
  if (hash) {
    currentGame = decodeGameFromHash(hash);
    if (currentGame) {
      saveGame(currentGame);
    }
  }

  if (!currentGame) {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (id) {
      currentGame = loadGame(id);
    }
  }

  if (!currentGame) {
    document.getElementById("notFound").style.display = "block";
    return;
  }

  document.getElementById("gameName").textContent = currentGame.name;
  document.title = `${currentGame.name} - Oscars 2026`;

  const localWinners = getWinners(currentGame.id);
  const hashWinners = currentGame.winners || {};
  winners = { ...hashWinners, ...localWinners };
  saveWinners(currentGame.id, winners);

  delete currentGame.winners;

  render();
}

function render() {
  const content = document.getElementById("ballotContent");
  content.innerHTML = "";

  content.appendChild(buildControls());
  content.appendChild(buildScoreboard());
  content.appendChild(buildDesktopGrid());
  content.appendChild(buildMobileCards());
}

function buildControls() {
  const div = document.createElement("div");
  div.className = "ballot-header";

  const participants = currentGame.participants;
  const h2 = document.createElement("h2");
  h2.textContent = `${participants.length} Participant${participants.length !== 1 ? "s" : ""}`;

  const controls = document.createElement("div");
  controls.className = "ballot-controls";

  const toggle = document.createElement("label");
  toggle.className = "toggle-winners";
  toggle.innerHTML = `<input type="checkbox" id="adminToggle" ${adminMode ? "checked" : ""}> Mark Winners`;
  toggle.querySelector("input").addEventListener("change", (e) => {
    adminMode = e.target.checked;
    render();
  });

  const shareBtn = document.createElement("button");
  shareBtn.className = "share-btn";
  shareBtn.textContent = "Share";
  shareBtn.addEventListener("click", shareCurrentState);

  controls.appendChild(toggle);
  controls.appendChild(shareBtn);

  div.appendChild(h2);
  div.appendChild(controls);
  return div;
}

function buildScoreboard() {
  const div = document.createElement("div");
  div.className = "scoreboard";

  const scores = calculateScores();
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const totalAnnounced = CATEGORIES.filter((c) => winners[c.slug]).length;

  sorted.forEach((s) => {
    const card = document.createElement("div");
    card.className = "score-card";
    card.innerHTML = `
      <span class="score-name">${s.name}</span>
      <span class="score-value">${s.score}</span>
      <span class="score-total">/ ${totalAnnounced}</span>
    `;
    div.appendChild(card);
  });

  return div;
}

function buildDesktopGrid() {
  const wrapper = document.createElement("div");
  wrapper.className = "ballot-grid";

  const table = document.createElement("table");
  table.className = "ballot-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const catTh = document.createElement("th");
  catTh.className = "category-col";
  catTh.textContent = "Category";
  headerRow.appendChild(catTh);

  currentGame.participants.forEach((p) => {
    const th = document.createElement("th");
    th.textContent = p.name;
    headerRow.appendChild(th);
  });

  if (adminMode) {
    const winnerTh = document.createElement("th");
    winnerTh.className = "winner-col";
    winnerTh.textContent = "Winner";
    headerRow.appendChild(winnerTh);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  CATEGORIES.forEach((cat) => {
    const row = document.createElement("tr");
    const winner = winners[cat.slug];

    const catTd = document.createElement("td");
    catTd.className = "category-cell";
    catTd.textContent = cat.name;
    row.appendChild(catTd);

    currentGame.participants.forEach((p) => {
      const td = document.createElement("td");
      td.className = "pick-cell";
      const pick = p.picks[cat.slug] || "—";
      td.textContent = pick;

      if (winner) {
        if (isCorrect(pick, winner)) {
          td.classList.add("correct");
        } else {
          td.classList.add("wrong");
        }
      }

      row.appendChild(td);
    });

    if (adminMode) {
      const winnerTd = document.createElement("td");
      winnerTd.className = "winner-cell";

      const select = document.createElement("select");
      select.className = "winner-select";
      select.innerHTML = `<option value="">Select winner...</option>`;
      cat.nominees.forEach((n) => {
        const opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n;
        if (n === winner) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        setWinner(cat.slug, select.value);
      });
      winnerTd.appendChild(select);

      row.appendChild(winnerTd);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function buildMobileCards() {
  const wrapper = document.createElement("div");
  wrapper.className = "ballot-cards";

  CATEGORIES.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "category-card";
    const winner = winners[cat.slug];

    const header = document.createElement("div");
    header.className = "category-card-header";
    header.innerHTML = `<span>${cat.name}</span>`;
    if (winner) {
      header.innerHTML += `<span class="winner-indicator">&#10003;</span>`;
    }
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "category-card-body";

    if (winner && !adminMode) {
      const winnerDiv = document.createElement("div");
      winnerDiv.className = "category-card-winner";
      winnerDiv.innerHTML = `<span class="winner-label">Winner</span> ${winner}`;
      body.appendChild(winnerDiv);
    }

    currentGame.participants.forEach((p) => {
      const pick = p.picks[cat.slug] || "—";
      const pickRow = document.createElement("div");
      pickRow.className = "pick-row";

      if (winner) {
        pickRow.classList.add(isCorrect(pick, winner) ? "correct" : "wrong");
      }

      pickRow.innerHTML = `
        <span class="pick-name">${p.name}</span>
        <span class="pick-value">${pick}</span>
      `;
      body.appendChild(pickRow);
    });

    if (adminMode) {
      const select = document.createElement("select");
      select.className = "mobile-winner-select";
      select.innerHTML = `<option value="">Select winner...</option>`;
      cat.nominees.forEach((n) => {
        const opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n;
        if (n === winner) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        setWinner(cat.slug, select.value);
      });
      body.appendChild(select);
    }

    card.appendChild(body);
    wrapper.appendChild(card);
  });

  return wrapper;
}

function setWinner(slug, nominee) {
  if (nominee) {
    winners[slug] = nominee;
  } else {
    delete winners[slug];
  }
  saveWinners(currentGame.id, winners);
  render();
}

function isCorrect(pick, winner) {
  if (!pick || !winner || pick === "—") return false;
  const pLower = pick.toLowerCase();
  const wLower = winner.toLowerCase();
  return (
    pLower === wLower ||
    wLower.includes(pLower) ||
    pLower.includes(wLower)
  );
}

function calculateScores() {
  return currentGame.participants.map((p) => ({
    name: p.name,
    score: CATEGORIES.reduce((sum, cat) => {
      const winner = winners[cat.slug];
      if (!winner) return sum;
      const pick = p.picks[cat.slug];
      return sum + (isCorrect(pick, winner) ? 1 : 0);
    }, 0),
  }));
}

function shareCurrentState() {
  const gameWithWinners = { ...currentGame, winners };
  const hash = encodeGameToHash(gameWithWinners);
  const url = `${location.origin}${location.pathname}#${hash}`;
  navigator.clipboard.writeText(url).then(() => {
    alert("Updated ballot URL copied to clipboard!");
  });
}

init();
