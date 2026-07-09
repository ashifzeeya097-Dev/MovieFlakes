// grabbing the trending movie section for scrolling

const STORAGE_KEY = "movieAppState";
const API_KEY = "3ea9b9899a266f601028fbdd3d760786";
const BASE_URL = "https://api.themoviedb.org/3";

let trendingMovies = [];
let searchResults = [];
const likedRow = document.querySelector(".liked-row");
const trendingRow = document.querySelector(".trending-carausel");
const nextBtn = document.querySelector(".next-btn");
const prevBtn = document.querySelector(".prev-btn");
const likedNextBtn = document.querySelector(".liked-next-btn");
const likedPrevBtn = document.querySelector(".liked-prev-btn");
const searchInput = document.querySelector(".search-input");

const sectionTitle = document.querySelector("#section-title");
const movieTabs = document.querySelector(".movie-tabs");
const likedWrapper = document.querySelector(".liked-wrapper");
const trendingWrapper = document.querySelector(".trending-wrapper");
const tabs = document.querySelectorAll(".tab-btn");
const trendingBtn = document.querySelector('[data-tab="trending"]');
const likedBtn = document.querySelector('[data-tab="liked"]');
const dropBtn = document.querySelector(".dropdown-btn");
const menu = document.querySelector(".dropdown-menu");

let currentView = "trending";

let isSearching = false;
let searchTimeout;
const genreMap = {};
const appState = loadAppState();

function createEmptyState() {
  return {
    liked: {}
  };
}

function loadAppState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") {
      return createEmptyState();
    }

    return {
      liked: stored.liked || {}
    };
  } catch (error) {
    console.warn("Failed to load saved movie state:", error);
    return createEmptyState();
  }
}

function saveAppState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function getMovieState(movieId) {
  return {
    liked: !!appState.liked[movieId]
  };
}

function updateMovieState(movie, updates) {
  const id = movie.id;
  if (!id) return;

  if (updates.hasOwnProperty("liked")) {
    if (updates.liked) {
      appState.liked[id] = movie;
    } else {
      delete appState.liked[id];
    }
  }

  saveAppState();
}

function getMoviesEndpoint(category, timeWindow = "day") {
  const normalized = String(category).toLowerCase().replace(/\s+/g, "_");

  switch (normalized) {
    case "popular":
      return "/movie/popular?";
    case "top_rated":
    case "top rated":
      return "/movie/top_rated?";
    case "upcoming":
      return "/movie/upcoming?";
    case "now_playing":
    case "now playing":
      return "/movie/now_playing?";
    case "trending":
      return `/trending/movie/${timeWindow}?`;
    default:
      return `/movie/${normalized}?`;
  }
}



async function fetchGenres() {
    const response = await fetch(
        `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`
    );

    const data = await response.json();

    data.genres.forEach(genre => {
        genreMap[genre.id] = genre.name;
    });
}

async function searchMovies(query){

    const endpoint =
        `/search/movie?query=${encodeURIComponent(query)}`;

    await fetchMovies(endpoint, ".trending-carausel");

}

searchInput.addEventListener("input", () => {

    const query = searchInput.value.trim();

    clearTimeout(searchTimeout);

    // Search cleared
    if(query.length === 0){

        exitSearchMode();

        displayMovies(trendingMovies, trendingRow);

        return;
    }

    // Wait until user types at least 3 characters
    if(query.length < 3){
        return;
    }

    searchTimeout = setTimeout(() => {

        enterSearchMode(query);

        searchMovies(query);

    },500);

});

function showLoader(movieRow) {
    movieRow.innerHTML = `
        <div class="loader-container">
            <div class="loader"></div>
            <p>Loading movies...</p>
        </div>
    `;
}

async function fetchMovies(endpoint, rowSelector = ".trending-carausel") {
  const movieRow = document.querySelector(rowSelector);
  if (!movieRow) {
    console.error("Movie row selector not found:", rowSelector);
    return;
  }

  showLoader(movieRow);

  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch movies:", response.status, response.statusText, url);
      return;
    }

    const data = await response.json();
    const movies = Array.isArray(data.results) ? data.results : [];

    if (endpoint.startsWith("/search/movie") && !isSearching) {
    return;
    }

  if (rowSelector === ".trending-carausel") {
    if (isSearching) {
        searchResults = movies;
    } else {
        trendingMovies = movies;
    }
  }

    if (!movies.length) {
      console.warn("No movie results returned for:", url);
    }

    if (rowSelector === ".trending-carausel") {
    if (isSearching) {
        displayMovies(searchResults, movieRow);
        searchResults = movies;
        console.log("Search stored:", searchResults.length);
    } else {
        displayMovies(trendingMovies, movieRow);
        trendingMovies = movies;
        console.log("Trending stored:", trendingMovies.length);
    }
  } else {
      displayMovies(movies, movieRow);
  }

renderLikedMovies();
  } catch (error) {
    console.error("Error fetching movies:", error, url);
  }
}

function displayMovies(movies, movieRow) {
  if (!movieRow) return;

  movieRow.innerHTML = "";

  if (!movies.length) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-state";
    emptyMessage.textContent = "No movies available.";
    movieRow.appendChild(emptyMessage);
    return;
  }

  movies.forEach((movie) => {
    movieRow.appendChild(createMovieCard(movie));
  });
}

function createMovieCard(movie) {
  const state = getMovieState(movie.id);
  const posterPath = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : " ";
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
  const genre = movie.genre_ids?.length
    ? genreMap[movie.genre_ids[0]]
    : "N/A";
  const movieCard = document.createElement("div");
  movieCard.classList.add("movie-card");

  movieCard.innerHTML = `
    <div class="movie-actions">
            <button class="icon-btn like-btn ${state.liked ? "active liked" : "liked"}" title="${state.liked ? "Remove like" : "Like"}">${state.liked ? "❤️" : "🤍"}</button>
    </div>
    <img src="${posterPath}" alt="${movie.title || "Movie Poster"}" />
    <div class="movie-info">
      <h3 class="movie-title">${movie.title || "Untitled"}</h3>
      <div class="details">
        <span>${genre}</span>
        <span>${releaseYear}</span>
        <span>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}</span>
      </div>
    </div>
  `;

  const likeButton = movieCard.querySelector(".like-btn");

  likeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    updateMovieState(movie, { liked: !state.liked });
    renderAllRows();
  });

  return movieCard;
}

function renderLikedMovies() {
  if (!likedRow) return;
  displayMovies(Object.values(appState.liked), likedRow);
}

function renderAllRows() {
    if (!trendingRow) return;

    if (isSearching) {
        displayMovies(searchResults, trendingRow);
    } else {
        displayMovies(trendingMovies, trendingRow);
    }

    renderLikedMovies();
}


async function init() {

    exitSearchMode();

    await fetchGenres();

    await fetchMovies("/movie/popular",".trending-carausel");

}

init();

function setupScrollButtons(buttonPrev, buttonNext, row) {
  if (!row) return;

  if (buttonNext) {
    buttonNext.addEventListener("click", () => {
      row.scrollBy({
        left: 500,
        behavior: "smooth"
      });
    });
  }

  if (buttonPrev) {
    buttonPrev.addEventListener("click", () => {
      row.scrollBy({
        left: -500,
        behavior: "smooth"
      });
    });
  }
}

if (trendingRow && nextBtn && prevBtn) {
  setupScrollButtons(prevBtn, nextBtn, trendingRow);
}

setupScrollButtons(likedPrevBtn, likedNextBtn, likedRow);

renderLikedMovies();




dropBtn.addEventListener("click", () => {
  menu.classList.toggle("show");
  dropBtn.classList.toggle("active");

});

document.addEventListener("click", (e) => {
    if (
        !menu.contains(e.target) &&
        !dropBtn.contains(e.target)
    ) {
        menu.classList.remove("show");
        dropBtn.classList.remove("active");
    }
});

const menuBtn = document.querySelector(".menu-btn");
const mobileNav = document.querySelector(".navbar-mobile");
menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    menuBtn.classList.toggle("active");
    mobileNav.classList.toggle("show");
});
document.addEventListener("click", (e) => {
    if (
        !mobileNav.contains(e.target) &&
        !menuBtn.contains(e.target)
    ) {
        mobileNav.classList.remove("show");
        menuBtn.classList.remove("active");
    }
});



tabs.forEach(tab=>{
    tab.addEventListener("click",()=>{

        tabs.forEach(btn=>btn.classList.remove("active"));
        tab.classList.add("active");

        if(tab.dataset.tab==="trending"){
            movieTabs.classList.remove("liked");
            showTrending();
        }
        else{
            movieTabs.classList.add("liked");
            showLiked();
        }
    });
});



trendingWrapper.classList.add("active");
likedWrapper.classList.remove("active");

function showTrending() {
    trendingWrapper.classList.add("active");
    likedWrapper.classList.remove("active");
}

function showLiked() {
    likedWrapper.classList.add("active");
    trendingWrapper.classList.remove("active");
}

function enterSearchMode(query) {

    isSearching = true;

    // Always switch to the Trending view
    showTrending();

    // Make Trending tab active
    tabs.forEach(tab => tab.classList.remove("active"));

    if (trendingBtn) {
        trendingBtn.classList.add("active");
    }

    movieTabs.classList.remove("liked");

    // Hide the tab selector during search
    movieTabs.classList.add("hidden");

    // Show search heading
    sectionTitle.textContent = `🔍 Search Results for "${query}"`;
    sectionTitle.style.display = "block";
    sectionTitle.classList.remove("hidden");
}

function exitSearchMode() {
    isSearching = false;

    showTrending();

    tabs.forEach(tab => tab.classList.remove("active"));
    trendingBtn.classList.add("active");

    movieTabs.classList.remove("liked");
    movieTabs.classList.remove("hidden");

    sectionTitle.classList.add("hidden");
    sectionTitle.style.display = "none";
}