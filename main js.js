function cleanTitle(rawTitle) { //for getting rid of random characters or east-asian language characters or numbers, and just getting the anime title
  const match = rawTitle.match(/\[([^\]]*One_Piece[^\]]*)\]/i) || rawTitle.match(/\[([^\]]*Naruto[^\]]*)\]/i);
  if (match) return match[1].replace(/_/g, " ");

  // Fallback: remove anything in brackets and extensions
  return rawTitle.replace(/\[.*?\]/g, "").replace(/\.(mp4|mkv|avi)$/, "").trim();
}

function loginWithMAL() {
  window.location.href = "http://localhost:3000/login";
}

async function getAnimeInfo(title) {
  try {
    const response = await fetch(`http://localhost:3000/mal/anime-info?title=${encodeURIComponent(title)}`);
    if (!response.ok) {
      console.error("Failed to fetch anime info, server responded with:", response.status);
      return "Could not retrieve summary.";
    }
    const data = await response.json();
    const anime = data.data?.[0]?.node;

    if (!anime || !anime.synopsis) {
      console.error("Anime or synopsis not found for title:", title);
      return "Synopsis not available for this title.";
    }
    return anime.synopsis;
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
      const rawTitle = bestMatch.filename || bestMatch.anime || "Unknown Title";
      const title = cleanTitle(rawTitle);
      const episode = bestMatch.episode || "N/A";
      const similarity = bestMatch.similarity;
      const videoUrl = bestMatch.video;
      const from = bestMatch.from;
      const minutes = Math.floor(from / 60);
      const seconds = Math.floor(from % 60);
      
      // Call the improved getAnimeInfo function
      const summary = await getAnimeInfo(title);

      document.getElementById("tracemoeheading").innerHTML = `<strong>Title:</strong> ${title}`;
      document.getElementById("tracemoepara").innerHTML =
        `<strong>Episode:</strong> ${episode}<br>` +
        `<strong>Timestamp:</strong> ${minutes}:${seconds.toString().padStart(2, '0')}<br>` +
        `<strong>Similarity:</strong> ${(similarity * 100).toFixed(2)}%<br><br>` +
        `<video controls muted loop autoplay width="300" src="${videoUrl}"></video><br>` +
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