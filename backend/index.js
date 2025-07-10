const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const PORT = 3000;

const CLIENT_ID = process.env.MAL_CLIENT_ID;
// CLIENT_SECRET is not required when using the PKCE flow but was previously
// declared and unused. Removing it avoids confusion.
const REDIRECT_URI = process.env.REDIRECT_URI;

let access_token = "";

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// === 1. Login route ===
app.get("/login", (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store verifier in a cookie
  res.cookie("code_verifier", codeVerifier, {
    httpOnly: true,
    maxAge: 300000, // 5 mins
  });

  const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  res.redirect(authUrl);
});

// === 2. Callback handler ===
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const codeVerifier = req.cookies.code_verifier;

  if (!codeVerifier) {
    console.error("Missing code_verifier");
    return res.status(400).send("Missing code_verifier. Try logging in again.");
  }

  try {
    const qs = require("querystring");

    const tokenRes = await axios.post(
      "https://myanimelist.net/v1/oauth2/token",
      qs.stringify({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    access_token = tokenRes.data.access_token;
    res.send("✅ Login successful. You can close this tab.");
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    res.status(500).send("Login failed" + JSON.stringify(err.response?.data || err.message));
  }
});

// === 3. Get anime info ===
app.get("/mal/anime-info", async (req, res) => {
  const title = (req.query.title || "").trim();
  if (!title) {
    return res.status(400).json({ error: "Title query is required" });
  }
  try {
    const info = await axios.get("https://api.myanimelist.net/v2/anime", {
      params: {
        q: title,
        limit: 5,
        fields: "start_date,end_date,synopsis"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const anime = info.data?.data?.[0]?.node;
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    res.json(anime);
  } catch (err) {
    console.error("Anime info error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// === 4. Recommend based on genre ===
app.get("/mal/recommend", async (req, res) => {
  const title = req.query.title;
  try {
    const searchRes = await axios.get(`https://api.myanimelist.net/v2/anime`, {
      params: {
        q: title,
        limit: 10,
        fields: "genres,mean,rank,popularity"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const anime = searchRes.data.data?.[0]?.node;
    if (!anime || !anime.genres || anime.genres.length === 0) {
      return res.json({ anime, recommendations: [] });
    }

    const genre = anime.genres[0].name;
    const recRes = await axios.get(`https://api.myanimelist.net/v2/anime`, {
      params: {
        q: genre,
        limit: 10,
        fields: "mean"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const recommendations = recRes.data.data
      .map(a => a.node)
      .filter(a => a.mean && a.mean > 7 && a.title !== anime.title)
      .slice(0, 5);

    res.json({
      anime: {
        title: anime.title,
        genres: anime.genres.map(g => g.name),
        mean: anime.mean,
        popularity: anime.popularity
      },
      recommendations
    });
  } catch (err) {
    console.error("Recommendation error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

function base64URLEncode(str) {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(codeVerifier) {
  return base64URLEncode(crypto.createHash("sha256").update(codeVerifier).digest());
}