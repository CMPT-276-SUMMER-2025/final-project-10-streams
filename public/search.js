// Search functionality
let searchTimeout;
let currentSearchTerm = '';
// Detect environment and set API base URL accordingly
const API_BASE = window.location.hostname === 'localhost' 
  ? "http://localhost:3000" 
  : "https://final-project-10-streams.onrender.com";

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.querySelector('.clear-btn');
    const searchResults = document.getElementById('search-results');
    const trendingSection = document.getElementById('trending-section');
    const noResults = document.getElementById('no-results');
    const resultsGrid = document.getElementById('results-grid');
    const trendingGrid = document.getElementById('trending-grid');

    // Auto-focus search input
    searchInput.focus();

    // Search input event listeners
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(searchInput.value.trim());
        }
    });

    // Show/hide clear button
    searchInput.addEventListener('input', function() {
        clearBtn.style.display = this.value ? 'block' : 'none';
    });

    clearBtn.addEventListener('click', function () {
    clearSearch();
    });


    // Load trending anime on page load
    loadTrendingAnime();
});

async function performSearch(searchTerm) {
  if (!searchTerm || searchTerm === currentSearchTerm) return;
  currentSearchTerm = searchTerm;
  showSearchResults();

  try {
    const res = await fetch(`${API_BASE}/mal/search?title=${encodeURIComponent(searchTerm)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); // { data: [ { node: {...} }, … ] }

    const animeArray = data.data.map(item => ({
      title: item.node.title,
      image: item.node.main_picture?.large || item.node.main_picture?.medium || 'images/placeholder.jpg',
      year: item.node.start_date ? item.node.start_date.split('-')[0] : 'N/A',
      rating: item.node.mean || 'N/A',
      synopsis: item.node.synopsis || 'No summary available.'
    }));

    displaySearchResults(animeArray);
  } catch (err) {
    console.error("Search error:", err);
    displayNoResults(`Error fetching results.`);
  }
}



async function loadTrendingAnime() {
    console.log('Loading trending anime...');
    try {
        const response = await fetch(`${API_BASE}/mal/trending`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Trending anime response:', data); // Debug log
        
        // Fix: Backend returns { anime: [...] }, not { data: [...] }
        const animeList = data.anime.map(item => ({
            title: item.title,
            image: item.main_picture ? item.main_picture.large || item.main_picture.medium : 'images/placeholder.jpg',
            year: item.start_date ? item.start_date.split('-')[0] : 'N/A',
            rating: item.mean || 'N/A',
            synopsis: item.synopsis || 'No summary available.'
        }));
        displayTrendingAnime(animeList);
    } catch (error) {
        console.error('Failed to load trending anime:', error);
        // Show fallback content or error message
        displayTrendingAnime([]);
    }
}

function showSearchResults() {
    document.getElementById('search-results').style.display = 'block';
    document.getElementById('trending-section').style.display = 'none';
    document.getElementById('no-results').style.display = 'none';
}

function showTrending() {
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('trending-section').style.display = 'block';
    document.getElementById('no-results').style.display = 'none';
    currentSearchTerm = '';
}

function showNoResults() {
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('trending-section').style.display = 'none';
    document.getElementById('no-results').style.display = 'block';
}

function showLoadingCards(gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    // Create 8 loading cards
    for (let i = 0; i < 8; i++) {
        const loadingCard = document.createElement('div');
        loadingCard.className = 'anime-card loading';
        loadingCard.innerHTML = `
            <div class="card-image-placeholder"></div>
            <div class="card-title-placeholder"></div>
        `;
        grid.appendChild(loadingCard);
    }
}

function displayNoResults(msg) {
  const box = document.getElementById('search-results');
  box.innerHTML = `<div class="no-results">${msg}</div>`;
}

function displaySearchResults(results) {
  const resultsEl = document.getElementById('search-results');
  if (!results || results.length === 0) {
    return displayNoResults(`No results found for "${currentSearchTerm}"`);
  }

  resultsEl.innerHTML = '';
  results.forEach(anime => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <img src="${anime.image}" alt="${anime.title}" class="result-thumb">
      <div class="result-info">
        <h4>${anime.title}</h4>
        <p><strong>Rating:</strong> ${anime.rating}/10</p>
        <p><strong>Released:</strong> ${anime.year}</p>
        <p class="result-synopsis">${anime.synopsis}</p>
      </div>`;
    resultsEl.appendChild(item);
  });
}


function displayTrendingAnime(animeList) {
    const grid = document.getElementById('trending-grid');
    grid.innerHTML = '';
    
    animeList.forEach(anime => {
        const card = createAnimeCard(anime);
        grid.appendChild(card);
    });
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.onclick = () => openAnimeDetails(anime);
    
    card.innerHTML = `
        <div class="anime-card-inner">
            <div class="anime-card-front">
                <div class="card-image-container">
                    <img src="${anime.image}" alt="${anime.title}" class="card-image" onerror="this.style.display='none';">
                </div>
                <div class="anime-card-content">
                    <div class="anime-card-title">${anime.title}</div>
                    <div class="anime-card-info">
                        <span class="anime-year">${anime.year || 'N/A'}</span>
                        <span class="anime-rating">${anime.rating || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div class="anime-card-back">
                <h3>${anime.title}</h3>
                <p>${anime.synopsis}</p>
            </div>
        </div>
    `;
    
    return card;
}

function openAnimeDetails(anime) {
    console.log('Opening details for:', anime.title);
    // TODO: Implement anime details page or modal
    alert(`Opening details for: ${anime.title}`);
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.querySelector('.clear-btn').style.display = 'none';
    showTrending();
    document.getElementById('search-input').focus();
}

function goBack() {
    window.history.back();
}

// Mock data generators (replace with actual API calls)
function generateMockSearchResults(searchTerm) {
    const mockAnime = [
        {
            title: 'Naruto',
            image: 'images/naruto.jpg',
            year: '2002',
            rating: '8.3'
        },
        {
            title: 'Naruto Shippuden',
            image: 'images/naruto image.jpg',
            year: '2007',
            rating: '8.7'
        },
        {
            title: 'One Piece',
            image: 'images/luffy.jpg',
            year: '1999',
            rating: '9.0'
        },
        {
            title: 'Dragon Ball Z',
            image: 'images/dbz.jpg',
            year: '1989',
            rating: '8.8'
        }
    ];
    
    // Filter based on search term
    return mockAnime.filter(anime => 
        anime.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

function generateMockTrendingAnime() {
    return [
        {
            title: 'Attack on Titan',
            image: 'images/placeholder.jpg',
            year: '2013',
            rating: '9.0'
        },
        {
            title: 'Hunter x Hunter',
            image: 'images/gon.jpg',
            year: '2011',
            rating: '9.1'
        },
        {
            title: 'One Piece',
            image: 'images/luffy.jpg',
            year: '1999',
            rating: '9.0'
        },
        {
            title: 'Naruto',
            image: 'images/naruto.jpg',
            year: '2002',
            rating: '8.3'
        },
        {
            title: 'Dragon Ball Z',
            image: 'images/dbz.jpg',
            year: '1989',
            rating: '8.8'
        },
        {
            title: 'Bleach',
            image: 'images/ichigo.png',
            year: '2004',
            rating: '8.2'
        },
        {
            title: 'My Hero Academia',
            image: 'images/placeholder.jpg',
            year: '2016',
            rating: '8.7'
        },
        {
            title: 'Demon Slayer',
            image: 'images/placeholder.jpg',
            year: '2019',
            rating: '8.9'
        }
    ];
}
