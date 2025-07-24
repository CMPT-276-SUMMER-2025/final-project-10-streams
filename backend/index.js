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

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "Anime API is running successfully!" });
});

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
    const qs = require("qs");

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

  // Clean up the title for better search accuracy
  // Remove common suffixes like (TV), (Movie), season numbers, etc.
  const cleanedTitle = title
    .replace(/\s*\(tv\)|\s*\(movie\)|\s*\(ova\)|\s*\(special\)/gi, "")
    .replace(/\s+season\s+\d+|\s+s\d+|\s+\d+.*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const info = await axios.get("https://api.myanimelist.net/v2/anime", {
      params: {
        q: cleanedTitle,
        limit: 10,
        fields: "start_date,end_date,synopsis,title,alternative_titles"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const results = info.data?.data || [];
    if (results.length === 0) {
      return res.status(404).json({ error: "Anime not found" });
    }

    // Find the best match from the results
    let anime = null;
    const lowerCleanedTitle = cleanedTitle.toLowerCase();
    
    // First, try to find an exact match
    anime = results.find(item => {
      const nodeTitle = item.node.title.toLowerCase();
      return nodeTitle === lowerCleanedTitle || 
             nodeTitle.includes(lowerCleanedTitle) ||
             lowerCleanedTitle.includes(nodeTitle);
    })?.node;

    // If no good match found, use the first result
    if (!anime) {
      anime = results[0]?.node;
    }

    if (!anime) {
      return res.status(404).json({ error: "Anime not found in results" });
    }

    res.json(anime);
  } catch (err) {
    console.error("Anime info error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// === 4. Recommend based on genre ===
app.get("/mal/recommend", async (req, res) => {
  const title = (req.query.title || "").trim();
  if (!title) {
    return res.status(400).json({ error: "Title query is required" });
  }
  
  try {
    const searchRes = await axios.get(`https://api.myanimelist.net/v2/anime`, {
      params: {
        q: title,
        limit: 5,
        fields: "genres,mean,rank,popularity,title"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const anime = searchRes.data.data?.[0]?.node;
    if (!anime) {
      return res.status(404).json({ error: "Anime not found for recommendations" });
    }
    
    if (!anime.genres || anime.genres.length === 0) {
      return res.json({ 
        anime: {
          title: anime.title,
          genres: [],
          mean: anime.mean,
          popularity: anime.popularity
        }, 
        recommendations: [] 
      });
    }

    const genre = anime.genres[0].name;
    const recRes = await axios.get(`https://api.myanimelist.net/v2/anime`, {
      params: {
        q: genre,
        limit: 15,
        fields: "mean,title"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const recommendations = recRes.data.data
      .map(a => a.node)
      .filter(a => a.mean && a.mean > 7.0 && a.title !== anime.title)
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