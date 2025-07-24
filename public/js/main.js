// Cleans up raw filenames or titles returned by TraceMoe so that they can be
// reliably looked up on MAL. The old implementation only handled a couple of
// hard coded shows which resulted in failed lookups for most results.
function cleanTitle(rawTitle = "") {
  let cleaned = rawTitle;
  
  // First, remove file extension
  cleaned = cleaned.replace(/\.[^.]+$/, "");
  
  // Strategy: Extract anime title from brackets, but be smart about it
  // Look for patterns like [GroupName][Anime Title][Episode][Quality] etc.
  const bracketMatches = cleaned.match(/\[([^\]]+)\]/g);
  
  if (bracketMatches && bracketMatches.length > 1) {
    // Try to find the anime title - usually the longest meaningful bracket
    // or the second bracket (after group name)
    let animeTitle = "";
    
    for (let match of bracketMatches) {
      const content = match.slice(1, -1); // Remove [ and ]
      
      // Skip if it's clearly not an anime title
      if (content.match(/^\d+$|x\d+|^\d+_\d+$|^[A-Z]{2,5}$|x264|x265|aac|mp4|mkv|avi/i)) {
        continue;
      }
      
      // If it contains letters and is longer than 3 chars, likely the title
      if (content.length > 3 && /[a-zA-Z]/.test(content)) {
        animeTitle = content;
        break;
      }
    }
    
    if (animeTitle) {
      cleaned = animeTitle;
    }
  } else {
    // Fallback: remove all brackets and clean up
    cleaned = cleaned.replace(/\[[^\]]*\]/g, "");
  }
  
  // Additional cleanup
  cleaned = cleaned
    // Remove any remaining parentheses content
    .replace(/\([^)]*\)/g, "")
    // Replace underscores or dots with spaces
    .replace(/[_.]/g, " ")
    // Remove episode indicators
    .replace(/-?\s*(?:ep(?:isode)?\s*)?\d+\s*$/i, "")
    .replace(/\b(?:episode|ep|e)\s*\d+/gi, "")
    // Remove season indicators
    .replace(/\b(?:season|s)\s*\d+/gi, "")
    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    // Trim
    .trim();

  return cleaned || rawTitle.trim();
}

function loginWithMAL() {
  window.location.href = "http://localhost:3000/login";
}

async function getAnimeInfo(title) {

  if (!title || title.trim().length < 2) return "Could not retrieve summary.";


  async function fetchInfo(q) {
    const resp = await fetch(
      `http://localhost:3000/mal/anime-info?title=${encodeURIComponent(q)}`
    );
    if (!resp.ok) return null;
    const anime = await resp.json();
    return anime?.synopsis || null;
  }

  try {

    let synopsis = await fetchInfo(title);


    // Retry with a simplified title if initial lookup failed
    if (!synopsis && /[:\-]/.test(title)) {
      const alt = title.split(/[:\-]/)[0].trim();
      if (alt) synopsis = await fetchInfo(alt);
    }

    return synopsis || "Could not retrieve summary.";
  } catch (error) {
    console.error("Error in getAnimeInfo:", error);
    return "Error fetching summary.";
  }
}

async function getAnimeDetailsThenSuggest() {
  const title = document.getElementById('animeSuggest').value;
  if (!title) return;

  const response = await fetch(`http://localhost:3000/mal/recommend?title=${encodeURIComponent(title)}`);
  const data = await response.json();

  if (!data.anime) {
    document.getElementById("malResult2").innerText = "Anime not found.";
    return;
  }

  const anime = data.anime;
  const genreString = anime.genres.join(", ") || "N/A";

  document.getElementById("malResult2").innerHTML = `
    <h3>${anime.title}</h3>
    <p><strong>Genres:</strong> ${genreString}</p>
    <p><strong>Rating:</strong> ${anime.mean ?? "N/A"}</p>
    <p><strong>Popularity:</strong> ${anime.popularity ?? "N/A"}</p>
  `;

  if (data.recommendations?.length > 0) {
    document.getElementById("malSuggestions").innerHTML = `
      <h4>Recommended anime (based on genre: ${anime.genres[0]}):</h4>
      <ul>
        ${data.recommendations.map(a => `<li>${a.title} (Rating: ${a.mean})</li>`).join("")}
      </ul>
    `;
  } else {
    document.getElementById("malSuggestions").innerText = `No high-rated suggestions found for genre: ${anime.genres[0]}`;
  }
}

function toggleSearch() {
  // You can implement search functionality here
  // For now, it will just show an alert
  const searchTerm = prompt("Enter your search term:");
  if (searchTerm) {
    alert(`Searching for: ${searchTerm}`);
    // Here you could redirect to a search page or perform a search
    // window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
  }
}

function toggleSearchBar() {
  const searchBar = document.querySelector('.searchbar');
  if (searchBar.style.display === 'none' || searchBar.style.display === '') {
    searchBar.style.display = 'block';
  } else {
    searchBar.style.display = 'none';
  }
}

// Consolidated event listeners
document.addEventListener("DOMContentLoaded", () => {
  const traceButton = document.getElementById("traceButton");
  if (traceButton) {
    traceButton.addEventListener("click", testTraceMoe);
  }
  
  const malLoginButton = document.getElementById("malLoginButton");
  if (malLoginButton) {
    malLoginButton.addEventListener("click", loginWithMAL);
  }

  const animeSuggestButton = document.getElementById("animeSuggestButton");
  if (animeSuggestButton) {
    animeSuggestButton.addEventListener("click", getAnimeDetailsThenSuggest);
  }

  const tracemoein = document.getElementById("tracemoein");
  if (tracemoein) {
    tracemoein.addEventListener("change", testTraceMoe);
  }
});

async function testTraceMoe() {
  const fileInput = document.getElementById('tracemoein');
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const traceRes = await fetch("https://api.trace.moe/search", {
      method: "POST",
      body: formData,
    });

    const traceData = await traceRes.json();
    const bestMatch = traceData.result?.[0];

    if (bestMatch) {
      const rawTitle =
        bestMatch.title_english ||
        bestMatch.title_romaji ||
        bestMatch.title ||
        bestMatch.filename ||
        bestMatch.anime ||
        "Unknown Title";
      
      const cleanedTitle = cleanTitle(rawTitle);
      const episode = bestMatch.episode || "N/A";
      const similarity = bestMatch.similarity;
      const videoUrl = bestMatch.video;
      const from = bestMatch.from;
      const minutes = Math.floor(from / 60);
      const seconds = Math.floor(from % 60);
      
      // Call the improved getAnimeInfo function with cleaned title
      const summary = await getAnimeInfo(cleanedTitle);

      // Display the cleaned title instead of raw title
      document.getElementById("tracemoeheading").innerHTML = `<strong>Title:</strong> ${cleanedTitle}`;
      document.getElementById("tracemoepara").innerHTML =
        `<strong>Episode:</strong> ${episode}<br>` +
        `<strong>Timestamp:</strong> ${minutes}:${seconds.toString().padStart(2, '0')}<br>` +
        `<strong>Similarity:</strong> ${(similarity * 100).toFixed(2)}%<br><br>` +
        `<video controls muted loop autoplay width="300" src="${videoUrl}"></video><br><br>` +
        `<strong>Summary:</strong> ${summary}`;
    } else {
      console.log("TraceMoe full response:", traceData);
      // Corrected selector: use ID without the '.'
      document.getElementById("tracemoeheading").textContent = "No match found.";
      document.getElementById("tracemoepara").textContent = "";
    }
  } catch (err) {
    console.error("Trace Moe error:", err);
    // Corrected selector: use ID without the '.'
    document.getElementById("tracemoeheading").textContent = "Error processing image.";
    document.getElementById("tracemoepara").textContent = "Please try another image or check the console.";
  }
}

