const express = require("express");
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Fetch a GitHub user's profile + public repos
app.get("/api/github/:username", async (req, res) => {
  const username = req.params.username;

  try {
    // 1. Fetch the user profile
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "User-Agent": "roast-my-github",
        Accept: "application/vnd.github+json",
      },
    });

    if (userRes.status === 404) {
      return res.status(404).json({ error: "not_found" });
    }
    if (userRes.status === 403) {
      return res.status(403).json({ error: "rate_limited" });
    }
    if (!userRes.ok) {
      return res.status(502).json({ error: "github_error" });
    }

    const user = await userRes.json();

    // 2. Fetch their public repos (most recently updated first, up to 100)
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      {
        headers: {
          "User-Agent": "roast-my-github",
          Accept: "application/vnd.github+json",
        },
      },
    );

    const reposRaw = reposRes.ok ? await reposRes.json() : [];

    // 3. Trim to just the signals we care about for the roast
    const repos = reposRaw.map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      isFork: r.fork,
      updatedAt: r.updated_at,
    }));

    // 4. Send back a clean payload
    res.json({
      profile: {
        login: user.login,
        name: user.name,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        publicRepos: user.public_repos,
        createdAt: user.created_at,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
      },
      repos,
    });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Running on " + PORT));
