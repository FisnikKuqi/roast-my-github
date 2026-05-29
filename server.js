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
// Generate a roast from the user's GitHub data using Gemini
app.get("/api/roast/:username", async (req, res) => {
  const username = req.params.username;

  try {
    // Reuse our own GitHub endpoint logic by fetching profile + repos
    const ghRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "User-Agent": "roast-my-github",
        Accept: "application/vnd.github+json",
      },
    });

    if (ghRes.status === 404)
      return res.status(404).json({ error: "not_found" });
    if (ghRes.status === 403)
      return res.status(403).json({ error: "rate_limited" });
    if (!ghRes.ok) return res.status(502).json({ error: "github_error" });

    const user = await ghRes.json();

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

    if (reposRaw.length === 0) {
      return res.json({
        roast: `@${username} has no public repos. Can't roast an empty fridge, but the courage to show up with nothing is its own kind of bold.`,
      });
    }

    // Build a compact summary for the prompt
    const repoSummary = reposRaw
      .map(
        (r) =>
          `- ${r.name} (${r.language || "no language"}, ${r.stargazers_count} stars, ${r.forks_count} forks${r.fork ? ", a FORK" : ""})${r.description ? ": " + r.description : " [no description]"}`,
      )
      .join("\n");

    const profileSummary = `Username: ${user.login}
Name: ${user.name || "not set"}
Bio: ${user.bio || "no bio"}
Followers: ${user.followers}, Following: ${user.following}
Public repos: ${user.public_repos}
Account created: ${user.created_at}`;

    const prompt = `You are a witty but good-natured roast comedian. Roast this GitHub user based on their profile and repos below. Be funny, specific, and a little savage, but never cruel, never personal about appearance or identity, never mean-spirited. Make it about their coding habits: forked repos with no original work, repos with no description, no stars, abandoned projects, generic repo names, language monogamy, empty bios, etc. Keep it to 3-4 short punchy sentences. End on a slightly affectionate note.

PROFILE:
${profileSummary}

REPOS:
${repoSummary}

Write only the roast, no preamble.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "no_api_key" });
    }

    async function callGemini() {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
    }

    let geminiRes = await callGemini();
    // Retry up to 2 times on transient overload/rate errors
    let attempts = 0;
    while (
      (geminiRes.status === 503 || geminiRes.status === 429) &&
      attempts < 2
    ) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1500));
      geminiRes = await callGemini();
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      return res.status(502).json({ error: "llm_error" });
    }

    const geminiData = await geminiRes.json();
    const roast =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "The AI was too stunned by this profile to respond.";

    res.json({ roast });
  } catch (err) {
    console.error("Roast error:", err);
    res.status(500).json({ error: "server_error" });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Running on " + PORT));
