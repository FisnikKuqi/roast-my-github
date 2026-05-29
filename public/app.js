console.log("ready");

const input = document.getElementById("username");
const button = document.getElementById("roastBtn");

// We'll add a results area below the card if it doesn't exist
let resultsEl = document.getElementById("results");
if (!resultsEl) {
  resultsEl = document.createElement("div");
  resultsEl.id = "results";
  document.querySelector(".card").appendChild(resultsEl);
}

async function handleRoast() {
  const username = input.value.trim();

  if (!username) {
    resultsEl.innerHTML = `<p class="msg">Type a GitHub username first.</p>`;
    return;
  }

  // Loading state
  button.disabled = true;
  resultsEl.innerHTML = `<p class="msg">Digging through @${username}'s repos...</p>`;

  try {
    const res = await fetch(`/api/github/${encodeURIComponent(username)}`);
    const data = await res.json();

    if (res.status === 404) {
      resultsEl.innerHTML = `<p class="msg">No GitHub user called "@${username}". Check the spelling.</p>`;
      return;
    }
    if (res.status === 403) {
      resultsEl.innerHTML = `<p class="msg">GitHub is rate-limiting us. Try again in a minute.</p>`;
      return;
    }
    if (!res.ok) {
      resultsEl.innerHTML = `<p class="msg">Something went wrong fetching that profile.</p>`;
      return;
    }

    renderProfile(data);
  } catch (err) {
    resultsEl.innerHTML = `<p class="msg">Network error. Is the server running?</p>`;
  } finally {
    button.disabled = false;
  }
}

function renderProfile(data) {
  const p = data.profile;
  const repos = data.repos || [];

  if (repos.length === 0) {
    resultsEl.innerHTML = `
      <div class="profile">
        <img src="${p.avatarUrl}" alt="" class="avatar" />
        <h2>${p.name || p.login}</h2>
        <p class="msg">This account has no public repos. Nothing to roast yet.</p>
      </div>`;
    return;
  }

  const repoRows = repos
    .map(
      (r) => `
    <div class="repo">
      <span class="repo-name">${r.name}</span>
      <span class="repo-meta">${r.language || "?"} · ★ ${r.stars} · ⑂ ${r.forks}${r.isFork ? " · fork" : ""}</span>
    </div>
  `,
    )
    .join("");

  resultsEl.innerHTML = `
    <div class="profile">
      <img src="${p.avatarUrl}" alt="" class="avatar" />
      <h2>${p.name || p.login}</h2>
      <p class="sub">${p.publicRepos} public repos · ${p.followers} followers</p>
    </div>
    <div class="repos">${repoRows}</div>
  `;
}

button.addEventListener("click", handleRoast);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleRoast();
});
