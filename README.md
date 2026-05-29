Roast My GitHub
Type a GitHub username. Get gently destroyed based on your public repos.
It pulls your profile and repositories straight from the GitHub API, hands the evidence to an AI, and hands you back a short, personalized roast — then shows the actual profile underneath so you can see exactly which of your life choices it judged you for.
Try it: https://51e49683-801c-49ef-bc8f-0681dfaa3dae-00-s4aovga4m2nq.picard.replit.dev:3000
Warning: it will find that repo you named project.
What it actually does

You type a username and pick a roast style (more on that below).
The server fetches the profile + up to 100 public repos from GitHub.
It quietly takes notes on the embarrassing stuff — forks with zero original commits, repos with no description, projects abandoned mid-2021, the bio you never filled in, the fact that you only speak one programming language.
It feeds those notes to Google Gemini, which returns a roast.
The roast lands in a green box up top. Your profile and repos show below it, as receipts.

Roast styles 🎭
Because one flavor of humiliation isn't enough, there's a dropdown:

Friendly — funny, a little savage, ends with a hug.
Corporate jargon — gets roasted in pure LinkedIn-speak. "Let's circle back on your commit cadence."
Pirate — arr, ye scurvy dog and yer barnacle-covered repos.
Haiku — your shame, in 5-7-5.

Under the hood

Backend: Node.js + Express. One `server.js`. No framework cosplay.
Frontend: plain HTML/CSS/vanilla JS. No build step, no bundler, nothing to `npm run` your way through.
Data: GitHub REST API (no auth needed for public data).
Roast engine: Google Gemini (`gemini-2.5-flash`) — the free tier is plenty for this.

The Gemini call happens server-side, so the API key lives on the server and never touches the browser. Nobody's stealing your key by viewing source.
Run it yourself
Fork on Replit (the 30-second version)

Fork the Repl.
Add a Secret called `GEMINI_API_KEY`. Grab a free key at https://aistudio.google.com/apikey — no card required.
Hit Run. It boots on port 3000.

Or locally
```bash
git clone https://github.com/FisnikKuqi/roast-my-github.git
cd roast-my-github
npm install
export GEMINI_API_KEY=your_key_here   # Windows: set GEMINI_API_KEY=your_key_here
node server.js
```
Open http://localhost:3000 and start roasting.

No API key? The profile fetch and repo list still work fine — only the roast step needs Gemini, and without a key it returns a clean error instead of exploding.

The "it doesn't fall over" details
Half the work in something like this is the unhappy paths. This handles them so a reviewer (hi 👋) doesn't hit a blank screen:

Username doesn't exist → "No GitHub user called @x. Check the spelling." Not a stack trace.
Account has no public repos → "Nothing to roast yet." Can't roast an empty fridge.
GitHub rate-limits us → tells you to wait a minute.
Gemini is overloaded (503) or rate-limited (429) → the server quietly retries twice before giving up, so a momentary blip doesn't ruin the roast.
No API key set → a specific, honest error.
Loading → the profile shows instantly while the roast cooks, with a "Warming up the roast..." placeholder. The page is never just frozen and staring at you.

The prompts
Built by kicking off the scaffold with Replit Agent, then writing the GitHub-fetch and roast logic by hand. (The Agent's default scaffold dragged in a giant unused monorepo, so step one was deleting all of it and keeping a clean Express app.)
Scaffold prompt (Replit Agent):
```
Build a minimal Node.js + Express web app called "Roast My GitHub".

server.js: serves /public statically, listens on process.env.PORT (fallback 3000), host 0.0.0.0.
public/index.html: centered dark card with a title, subtitle, a username input, and a "Roast me" button.
public/style.css: simple modern dark theme.
public/app.js: placeholder.
package.json with start script "node server.js"; .gitignore for node_modules and .env.
Plain HTML/CSS/JS only. No React, no build step. Do NOT add GitHub API or LLM calls yet.
```

The roast prompt (the one doing the actual damage):
```
You are a witty but good-natured roast comedian. Roast this GitHub user based on
their profile and repos below. Never be cruel, never personal about appearance or
identity, never mean-spirited. Focus on their coding habits: forked repos with no
original work, repos with no description, no stars, abandoned projects, generic
repo names, language monogamy, empty bios, etc.
STYLE: {style-specific instruction — friendly / corporate / pirate / haiku}
PROFILE:
{profile summary}
REPOS:
{repo summary}
Write only the roast, no preamble.
```
The "never cruel, never personal about appearance or identity" line is deliberate — the brief asked for a friendly roast, so the jokes stay aimed at the code, not the person.
If I wanted to go deeper

Cache by username for a few minutes, to be kind to GitHub's 60-requests/hour unauthenticated limit (and faster on repeat lookups).
Optional GitHub token to raise that limit and pull richer signals (commit streaks, language breakdown, PR history).
Sharper styles — the corporate/pirate voices could lean harder with a bit more prompt tuning.
A "copy roast" / share button.
A real deployment so the link never sleeps.
