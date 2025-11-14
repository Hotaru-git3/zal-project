// src/Homepage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { queuedFetch } from '../api/jikanQueue';
import { useApiData } from '../hooks/useApiData';
import Animecard from '../components/AnimeCard'; // <-- Impor komponen kartu

// =========================================================================
// ErrorDisplay - Tampilan error versi light mode
// =========================================================================
const ErrorDisplay = ({ section, error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <div className="flex items-center justify-center mb-3">
      <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h3 className="text-lg font-semibold text-red-800">
        {error?.type === 'network' ? 'Connection Error' :
          error?.type === 'timeout' ? 'Request Timeout' : 'Loading Failed'}
      </h3>
    </div>
    <p className="text-red-700 text-sm mb-4">{error?.message || error}</p>
    <div className="flex flex-col sm:flex-row gap-2 justify-center">
      {onRetry && (
        <button
          onClick={() => onRetry(section)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          🔄 Try Again
        </button>
      )}
      {error?.type === 'network' && (
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          🔄 Reload Page
        </button>
      )}
    </div>
  </div>
);

// =========================================================================
// NetworkStatus - Tampilan status jaringan versi light mode
// =========================================================================
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 mx-4 md:mx-8">
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-orange-800 text-sm">No internet connection - Some features may not work</p>
      </div>
    </div>
  );
};

// =========================================================================
// HomePage Component - Tampilan utama versi light mode
// =========================================================================
const HomePage = ({ onCardClick }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { 
    data: popularAnimeData, 
    loading: popularLoading, 
    error: popularError,
    refetch: retryPopular
  } = useApiData('/top/anime');
  
  const { 
    data: seasonAnimeData, 
    loading: seasonLoading, 
    error: seasonError,
    refetch: retrySeason
  } = useApiData('/seasons/now');
  
  const { 
    data: upcomingAnimeData, 
    loading: upcomingLoading, 
    error: upcomingError,
    refetch: retryUpcoming
  } = useApiData('/seasons/upcoming');

  const popularAnime = popularAnimeData || [];
  const seasonAnime = seasonAnimeData || [];
  const upcomingAnime = upcomingAnimeData || [];

  const [recommendedAnime, setRecommendedAnime] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [recommendedError, setRecommendedError] = useState(null);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // ... (Logika handleSearch, useEffect, dll. TETAP SAMA) ...
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `/anime?q=${encodedQuery}&limit=20&order_by=popularity&sort=asc`;
      const data = await queuedFetch(url);
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid search response format');
      }
      setSearchResults(data);
    } catch (error) {
      let errorType = 'search';
      if (error.message.includes('timeout')) errorType = 'timeout';
      if (error.message.includes('Network error')) errorType = 'network';
      setSearchError({ message: error.message, type: errorType });
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setSearchError(null);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const fetchSpecificAnimeIds = useCallback(async () => {
    setRecommendedLoading(true);
    setRecommendedError(null);
    try {
      const selectedIds = [
        21, 1535, 22319, 20, 40748, 31240, 30831, 40052, 34572, 39551,
        24833, 37999, 33255, 23755, 28171, 19815, 14719, 36035, 49596, 11757
      ];
      const animePromises = selectedIds.map(id => queuedFetch(`/anime/${id}`));
      const results = await Promise.allSettled(animePromises);
      const validAnime = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
      if (validAnime.length === 0) {
        throw new Error('No recommended anime could be loaded');
      }
      setRecommendedAnime(validAnime);
    } catch (error) {
      setRecommendedError({ message: error.message, type: 'fetch' });
      setRecommendedAnime([]);
    } finally {
      setRecommendedLoading(false);
    }
  }, []);

  const retrySection = useCallback((section) => {
    if (!navigator.onLine) return;
    if (section === 'popular') retryPopular();
    if (section === 'season') retrySeason();
    if (section === 'upcoming') retryUpcoming();
    if (section === 'recommended') fetchSpecificAnimeIds();
    if (section === 'search') handleSearch(searchQuery);
  }, [retryPopular, retrySeason, retryUpcoming, fetchSpecificAnimeIds, handleSearch, searchQuery]);

  useEffect(() => {
    if (!navigator.onLine) {
      setRecommendedError({ message: 'No internet connection', type: 'network' });
      setRecommendedLoading(false);
      return;
    }
    fetchSpecificAnimeIds();
  }, [fetchSpecificAnimeIds]);


  const isInitialLoading = popularLoading && seasonLoading && recommendedLoading && upcomingLoading;
  const isAllError = popularError && seasonError && recommendedError && upcomingError;

  if (isInitialLoading) {
    return (
      <div className="bg-white text-gray-900 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="flex items-center space-x-4 mb-4">
          <p className="text-xl">Sabar lagi loading...</p>
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-500 mb-4">Memuat data anime</p>
      </div>
    );
  }

  if (isAllError && !navigator.onLine) {
    return (
      <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md bg-white p-8 rounded-lg shadow-xl">
          <svg className="w-20 h-20 mx-auto mb-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-2xl font-bold text-orange-600 mb-4">📡 No Internet Connection</h2>
          <p className="text-gray-600 mb-6">Please check your internet connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    // BG Utama: Putih Keabuan
    <div className="bg-gray-50 text-gray-900 min-h-screen font-sans">
      {/* Header: Putih + Bayangan */}
      <header className="py-4 px-4 sm:py-6 sm:px-8 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white shadow-md fixed top-0 left-0 right-0 z-50 gap-4 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-red-500 tracking-wide text-center sm:text-left">ZidaneAnimeList</h1>

        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={handleSearchChange}
            // Search bar: Tema Putih
            className="bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full py-2 px-6 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors pr-20 border border-transparent focus:border-red-300"
          />

          {searchLoading && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          )}

          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <NetworkStatus />

      <main className="p-4 pt-28 sm:p-8 sm:pt-32">
        {/* Search Results Section */}
        {searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 border-b-2 border-red-500 pb-2 mt-7 sm:mt-0">
              🔍 Search Results for "{searchQuery}"
              {searchLoading && (
                <span className="ml-3 text-sm text-gray-500">Searching...</span>
              )}
            </h2>

            {searchLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Searching anime...</span>
              </div>
            ) : searchError ? (
              <ErrorDisplay section="search" error={searchError} onRetry={retrySection} />
            ) : searchResults.length > 0 ? (
              <>
                <p className="text-gray-500 text-sm mb-4">Found {searchResults.length} results</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {searchResults.map((anime) => (
                    <Animecard key={`search-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No anime found for "{searchQuery}"</p>
                <p className="text-sm mt-2">Try different keywords</p>
              </div>
            )}
          </section>
        )}

        {/* Recommended Section */}
        {!searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 border-b-2 border-red-500 pb-2 mt-7 sm:mt-0">
              Anime Gweh Banget
              {recommendedLoading && (
                <span className="ml-3 text-sm text-gray-500">Loading...</span>
              )}
            </h2>
            {recommendedLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading recommended anime...</span>
              </div>
            ) : recommendedError ? (
              <ErrorDisplay section="recommended" error={recommendedError} onRetry={retrySection} />
            ) : recommendedAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {recommendedAnime.map((anime) => (
                  <Animecard key={`recommended-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500"><p>No recommended anime available.</p></div>
            )}
          </section>
        )}

        {/* Season Anime Section */}
        {!searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 border-b-2 border-red-500 pb-2">
              Anime Season Ini
              {seasonLoading && (
                <span className="ml-3 text-sm text-gray-500">Loading...</span>
              )}
            </h2>
            {seasonLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading season anime...</span>
              </div>
            ) : seasonError ? (
              <ErrorDisplay section="season" error={seasonError} onRetry={retrySection} />
            ) : seasonAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {seasonAnime.map((anime) => (
                  <Animecard key={`season-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500"><p>No season anime data available.</p></div>
            )}
          </section>
        )}

        {/* Upcoming Anime Section */}
        {!searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 border-b-2 border-red-500 pb-2">
              Anime Mendatang
              {upcomingLoading && (
                <span className="ml-3 text-sm text-gray-500">Loading...</span>
              )}
            </h2>
            {upcomingLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading upcoming anime...</span>
              </div>
            ) : upcomingError ? (
              <ErrorDisplay section="upcoming" error={upcomingError} onRetry={retrySection} />
            ) : upcomingAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {upcomingAnime.map((anime) => (
                  <Animecard key={`upcoming-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500"><p>No upcoming anime data available.</p></div>
            )}
          </section>
        )}

        {/* Popular Anime Section */}
        {!searchQuery.trim() && (
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 border-b-2 border-red-500 pb-2">
              Anime Populer
              {popularLoading && (
                <span className="ml-3 text-sm text-gray-500">Loading...</span>
              )}
            </h2>
            {popularLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Sabar boy...</span>
              </div>
            ) : popularError ? (
              <ErrorDisplay section="popular" error={popularError} onRetry={retrySection} />
            ) : popularAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {popularAnime.map((anime) => (
                  <Animecard key={`popular-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500"><p>Gak ada anime populer yang lu cari hahay</p></div>
            )}
          </section>
        )}

        {/* Footer: Tema Putih */}
        <footer className="mt-12 text-gray-600 p-4 sm:p-8 bg-white rounded-t-lg border-t border-gray-200">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <h4 className="font-bold text-gray-800 text-xl text-center md:text-left">Made with ❤️ by Zidane</h4>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:space-x-4">
              <a href="https://www.instagram.com/zsn2.0?igsh=ejIyN3dpYzVnNXF4" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 border border-gray-400 rounded-full text-gray-500 flex justify-center items-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                <svg role="img" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg" className="fill-current"><title>Instagram</title><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" /></svg>
              </a>
              {/* ... (sisa ikon sosial) ... */}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;