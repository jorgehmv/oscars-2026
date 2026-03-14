const STORAGE_KEY = "oscars2026";

function loadAllGames() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAllGames(games) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

function saveGame(game) {
  const games = loadAllGames();
  games[game.id] = game;
  saveAllGames(games);
}

function loadGame(id) {
  return loadAllGames()[id] || null;
}

function deleteGame(id) {
  const games = loadAllGames();
  delete games[id];
  saveAllGames(games);
}

function listGames() {
  const games = loadAllGames();
  return Object.values(games).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function generateId() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 6);
}

function encodeGameToHash(game) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(game))));
}

function decodeGameFromHash(hash) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(hash))));
  } catch {
    return null;
  }
}

function getWinners(gameId) {
  try {
    return JSON.parse(
      localStorage.getItem(`oscars2026_winners_${gameId}`) || "{}"
    );
  } catch {
    return {};
  }
}

function saveWinners(gameId, winners) {
  localStorage.setItem(
    `oscars2026_winners_${gameId}`,
    JSON.stringify(winners)
  );
}
