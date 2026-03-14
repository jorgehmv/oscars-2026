const PASSWORD = "jorge-oscars-2026";

function checkPassword() {
  const input = document.getElementById("passwordInput");
  if (input.value === PASSWORD) {
    sessionStorage.setItem("oscars_admin", "1");
    showAdmin();
  } else {
    document.getElementById("passwordError").classList.add("visible");
    input.value = "";
    input.focus();
  }
}

function showAdmin() {
  document.getElementById("passwordGate").style.display = "none";
  document.getElementById("adminContent").classList.add("visible");
  renderGameList();
}

function generateTemplate() {
  const lines = ["ParticipantName:"];
  CATEGORIES.forEach((cat) => {
    lines.push(`${cat.name}: `);
  });
  const template = lines.join("\n");
  navigator.clipboard.writeText(template).then(() => {
    alert("Template copied to clipboard! Paste it and fill in predictions.");
  });
}

function showFormat() {
  const example = `Jorge:
Best Picture: Sinners
Best Director: Ryan Coogler
Best Actor: Timothée Chalamet
Best Actress: Emma Stone
...

Maria:
Best Picture: Hamnet
Best Director: Chloé Zhao
...`;
  alert(
    "FORMAT:\n\n" +
      example +
      "\n\nEach participant starts with their name followed by a colon.\n" +
      "Each prediction is: Category: Pick\n" +
      "Separate participants with a blank line.\n" +
      "Picks are fuzzy-matched against nominees."
  );
}

function parsePredictions(text) {
  const participants = [];
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const nameMatch = lines[0].match(/^([^:]+):$/);
    if (!nameMatch) {
      throw new Error(`Expected participant name on line: "${lines[0]}"`);
    }

    const participant = {
      name: nameMatch[1].trim(),
      picks: {},
    };

    for (let i = 1; i < lines.length; i++) {
      const colonIdx = lines[i].indexOf(":");
      if (colonIdx === -1) continue;

      const catInput = lines[i].substring(0, colonIdx).trim();
      const pickInput = lines[i].substring(colonIdx + 1).trim();
      if (!pickInput) continue;

      const category = matchCategory(catInput);
      if (!category) {
        throw new Error(
          `Unknown category: "${catInput}" on line: "${lines[i]}"`
        );
      }

      const nominee = matchNominee(category, pickInput);
      participant.picks[category.slug] = nominee || pickInput;
    }

    participants.push(participant);
  }

  return participants;
}

function matchCategory(input) {
  const lower = input.toLowerCase();
  let best = null;
  let bestLen = 0;

  for (const cat of CATEGORIES) {
    const catLower = cat.name.toLowerCase();
    if (catLower === lower) return cat;
    if (
      catLower.includes(lower) ||
      lower.includes(catLower) ||
      catLower.replace(/best\s+/i, "").includes(lower.replace(/best\s+/i, ""))
    ) {
      if (cat.name.length > bestLen) {
        best = cat;
        bestLen = cat.name.length;
      }
    }
  }

  if (!best) {
    const words = lower.split(/\s+/);
    for (const cat of CATEGORIES) {
      const catWords = cat.name.toLowerCase().split(/\s+/);
      const matching = words.filter((w) => catWords.some((cw) => cw.startsWith(w)));
      if (matching.length >= Math.ceil(words.length * 0.6) && matching.length > 0) {
        best = cat;
        break;
      }
    }
  }

  return best;
}

function matchNominee(category, input) {
  const lower = input.toLowerCase();

  for (const nominee of category.nominees) {
    if (nominee.toLowerCase() === lower) return nominee;
  }

  for (const nominee of category.nominees) {
    if (nominee.toLowerCase().includes(lower)) return nominee;
  }

  for (const nominee of category.nominees) {
    if (lower.includes(nominee.toLowerCase())) return nominee;
  }

  const inputWords = lower.split(/\s+/);
  let bestNominee = null;
  let bestScore = 0;
  for (const nominee of category.nominees) {
    const nomineeWords = nominee.toLowerCase().split(/[\s,]+/);
    const score = inputWords.filter((w) =>
      nomineeWords.some((nw) => nw.includes(w) || w.includes(nw))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestNominee = nominee;
    }
  }

  return bestScore > 0 ? bestNominee : null;
}

function createGame() {
  const nameInput = document.getElementById("gameName");
  const predictionsInput = document.getElementById("predictions");
  const errorEl = document.getElementById("parseError");

  errorEl.classList.remove("visible");
  errorEl.textContent = "";

  const gameName = nameInput.value.trim();
  if (!gameName) {
    errorEl.textContent = "Please enter a game name.";
    errorEl.classList.add("visible");
    return;
  }

  const text = predictionsInput.value.trim();
  if (!text) {
    errorEl.textContent = "Please enter predictions.";
    errorEl.classList.add("visible");
    return;
  }

  let participants;
  try {
    participants = parsePredictions(text);
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.classList.add("visible");
    return;
  }

  if (participants.length === 0) {
    errorEl.textContent = "No participants found. Check the format.";
    errorEl.classList.add("visible");
    return;
  }

  const missing = [];
  for (const p of participants) {
    const missingCats = CATEGORIES.filter((c) => !p.picks[c.slug]);
    if (missingCats.length > 0) {
      missing.push(
        `${p.name}: missing ${missingCats.map((c) => c.name).join(", ")}`
      );
    }
  }

  if (missing.length > 0) {
    errorEl.innerHTML =
      "<strong>Missing predictions:</strong><br>" +
      missing.join("<br>");
    errorEl.classList.add("visible");
    if (!confirm("Some participants have missing predictions. Create anyway?")) {
      return;
    }
  }

  const game = {
    id: generateId(),
    name: gameName,
    createdAt: new Date().toISOString(),
    participants,
  };

  saveGame(game);

  const hash = encodeGameToHash(game);
  const url = `${location.origin}${location.pathname.replace("admin.html", "")}ballot.html#${hash}`;

  const resultEl = document.getElementById("resultUrl");
  const shareUrlEl = document.getElementById("shareUrl");
  resultEl.dataset.url = url;
  resultEl.classList.add("visible");

  shareUrlEl.innerHTML = `<span style="color:#888">Shortening URL...</span>`;
  shortenUrl(url).then((shortUrl) => {
    const displayUrl = shortUrl || url;
    shareUrlEl.innerHTML = `<a href="${displayUrl}" target="_blank">${displayUrl}</a>`;
    resultEl.dataset.url = displayUrl;
  });

  renderGameList();
}

async function shortenUrl(longUrl) {
  try {
    const resp = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function copyUrl() {
  const url = document.getElementById("resultUrl").dataset.url;
  navigator.clipboard.writeText(url).then(() => {
    alert("URL copied to clipboard!");
  });
}

function renderGameList() {
  const games = listGames();
  const listEl = document.getElementById("gameList");
  const container = document.getElementById("existingGames");

  if (games.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  listEl.innerHTML = games
    .map((g) => {
      const hash = encodeGameToHash(g);
      const url = `ballot.html#${hash}`;
      const date = new Date(g.createdAt).toLocaleDateString();
      const count = g.participants.length;
      return `<li>
        <div class="game-info">
          <a href="${url}">${g.name}</a>
          <div class="game-meta">${count} participant${count !== 1 ? "s" : ""} &middot; ${date}</div>
        </div>
        <button class="danger" onclick="removeGame('${g.id}')">Delete</button>
      </li>`;
    })
    .join("");
}

function removeGame(id) {
  if (confirm("Delete this game?")) {
    deleteGame(id);
    renderGameList();
  }
}

document.getElementById("passwordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkPassword();
});

if (sessionStorage.getItem("oscars_admin") === "1") {
  showAdmin();
}
