const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = 3000;

// CORS configuration to allow frontend access
app.use(cors({
  origin: ['http://localhost:5501', 'http://127.0.0.1:5501', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(cookieParser());

const CLIENT_ID = process.env.MAL_CLIENT_ID;
const CLIENT_SECRET = process.env.MAL_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

console.log("Loaded CLIENT_ID from env:", CLIENT_ID);

let access_token = "";

// === 1. Login route ===
app.get("/login", (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  console.log("Storing code_verifier:", codeVerifier);
  // Set as cookie for use in /callback
  res.cookie("code_verifier", codeVerifier, {
    httpOnly: true,
    maxAge: 300000 // 5 minutes
  });

  const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=http://localhost:3000/callback&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  res.redirect(authUrl);
});

// === 2. Callback handler ===
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const codeVerifier = req.cookies.code_verifier;

  console.log("Client ID:", CLIENT_ID);
  console.log("Redirect URI:", REDIRECT_URI);
  console.log("Code Verifier:", codeVerifier);
  console.log("Authorization Code:", code);
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
    res.redirect("http://localhost:5500/index.html");
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    res.status(500).send("Login failed" + JSON.stringify(err.response?.data || err.message));
  }
});

// === 3. Get anime info ===
app.get("/mal/anime-info", async (req, res) => {
  const title = req.query.title;
  try {
    const info = await axios.get(`https://api.myanimelist.net/v2/anime`, {
      params: {
        q: title,
        limit: 10,
        fields: "start_date,end_date,synopsis"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    res.json(info.data);
  } catch (err) {
    console.error("Anime info error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// === NEW: Get anime info by ID ===
app.get("/mal/anime-by-id/:id", async (req, res) => {
  const animeId = req.params.id;
  try {
        const info = await axios.get(`https://api.myanimelist.net/v2/anime/${animeId}`, {
      params: {
        fields: "title,start_date,end_date,synopsis"
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    res.json(info.data);
  } catch (err) {
    console.error("Anime info by ID error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch anime info by ID" });
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

// === 5. Get trending anime (updated to fetch by popularity) ===
app.get("/mal/trending", async (req, res) => {
  const limit = req.query.limit || 50; // Fetch a larger list for better shuffling
  const offset = req.query.offset || 0; // Support pagination

  try {
    const info = await axios.get('https://api.myanimelist.net/v2/anime/ranking', {
      params: {
        ranking_type: 'bypopularity',
        limit: limit,
        offset: offset,
        fields: 'id,title,main_picture,synopsis'
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });
    
    // Transform the response to match frontend expectations
    const anime = info.data.data.map(item => ({
      id: item.node.id,
      title: item.node.title,
      main_picture: item.node.main_picture,
      synopsis: item.node.synopsis
    }));
    
    res.json({ anime });
  } catch (err) {
    console.error('Trending anime error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch trending anime' });
  }
});

// === 6. Get similar anime based on anime ID ===
app.get("/mal/similar/:id", async (req, res) => {
  const animeId = req.params.id;
  const limit = req.query.limit || 10;

  try {
    // First get the anime details to find its genres
    const animeInfo = await axios.get(`https://api.myanimelist.net/v2/anime/${animeId}`, {
      params: {
        fields: 'genres'
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    const genres = animeInfo.data.genres;
    if (!genres || genres.length === 0) {
      return res.json({ similar: [] });
    }

    // Get anime by the same genres (using the first genre)
    const genreId = genres[0].id;
    const similarAnime = await axios.get('https://api.myanimelist.net/v2/anime/ranking', {
      params: {
        ranking_type: 'bypopularity',
        limit: limit * 2, // Get more to filter out the original
        fields: 'id,title,main_picture,synopsis,genres'
      },
      headers: {
        "X-MAL-CLIENT-ID": CLIENT_ID
      }
    });

    // Filter anime that share genres and exclude the original anime
    const similar = similarAnime.data.data
      .map(item => item.node)
      .filter(anime => 
        anime.id !== parseInt(animeId) && 
        anime.genres && 
        anime.genres.some(genre => genres.some(originalGenre => originalGenre.id === genre.id))
      )
      .slice(0, limit)
      .map(anime => ({
        id: anime.id,
        title: anime.title,
        main_picture: anime.main_picture,
        synopsis: anime.synopsis
      }));

    res.json({ similar });
  } catch (err) {
    console.error('Similar anime error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch similar anime' });
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
  return base64URLEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
}

const imageUrl = "https://example.com/myanimeimage.jpg";  
