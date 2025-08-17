import React, { useState, useEffect, useCallback } from 'react';

// =========================================================================
// AnimeCard Component - Moved to same file to avoid import errors
// =========================================================================
const AnimeCard = ({ anime, onCardClick }) => {
  const imageUrl = anime?.images?.webp?.large_image_url || 
                   anime?.images?.jpg?.large_image_url || 
                   'https://placehold.co/225x318/374151/E5E7EB?text=No+Image';

  return (
    <div
      onClick={() => onCardClick(anime.mal_id)}
      className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={anime.title}
          className="w-full h-72 object-cover object-center"
          onError={(e) => { 
            e.target.onerror = null; 
            e.target.src = 'https://placehold.co/225x318/374151/E5E7EB?text=No+Image'; 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white line-clamp-2 min-h-[3rem] mb-2">
          {anime.title}
        </h3>
        <p className="text-gray-400 text-sm mb-2">
          {anime.type} ({anime.year || anime.aired?.prop?.from?.year || 'N/A'})
        </p>
        <div className="flex items-center">
          <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-yellow-400 font-bold text-sm">{anime.score || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// Main HomePage Component
// =========================================================================
const HomePage = ({ onCardClick }) => {
  const [popularAnime, setPopularAnime] = useState([]);
  const [seasonAnime, setSeasonAnime] = useState([]);
  const [recommendedAnime, setRecommendedAnime] = useState([]); 
  const [upcomingAnime, setUpcomingAnime] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingStates, setLoadingStates] = useState({
    popular: true,
    season: true,
    recommended: true,
    upcoming: true,
    search: false,
  });
  
  const [errors, setErrors] = useState({
    popular: null,
    season: null,
    recommended: null,
    upcoming: null,
    search: null,
  });

  const [retryCounts, setRetryCounts] = useState({
    popular: 0,
    season: 0,
    recommended: 0,
    upcoming: 0,
    search: 0,
  });

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const updateLoadingState = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const setErrorForSection = useCallback((section, errorMessage, errorType = 'fetch') => {
    setErrors(prev => ({ 
      ...prev, 
      [section]: {
        message: errorMessage,
        type: errorType,
        timestamp: new Date().toISOString()
      }
    }));
  }, []);

  const clearErrorForSection = useCallback((section) => {
    setErrors(prev => ({ ...prev, [section]: null }));
  }, []);

  const incrementRetryCount = useCallback((section) => {
    setRetryCounts(prev => ({ ...prev, [section]: prev[section] + 1 }));
  }, []);

  const resetRetryCount = useCallback((section) => {
    setRetryCounts(prev => ({ ...prev, [section]: 0 }));
  }, []);

  // Fixed: Define fetchSpecificAnimeIds before using it in fetchWithRetry
  const fetchSpecificAnimeIds = useCallback(async () => {
    try {
      updateLoadingState('recommended', true);
      clearErrorForSection('recommended');
      
      const selectedIds = [
        1, 5, 16, 20, 21, 22, 30, 199, 245, 269,
        431, 813, 820, 853, 918, 1535, 2001, 2167, 5114, 6547
      ];

      const animePromises = selectedIds.map(async (id) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 500)); // Rate limiting
          
          const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'ZidaneAnimeList/1.0'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`Failed to fetch anime ${id}: HTTP ${response.status}`);
            return null;
          }
          
          const data = await response.json();
          return data?.data || null;
        } catch (error) {
          console.warn(`Error fetching anime ${id}:`, error.message);
          return null;
        }
      });

      const results = await Promise.allSettled(animePromises);
      const validAnime = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
      
      if (validAnime.length === 0) {
        throw new Error('No recommended anime could be loaded');
      }
      
      setRecommendedAnime(validAnime);
      resetRetryCount('recommended');
      console.log(`✅ Recommended anime loaded: ${validAnime.length}/${selectedIds.length} anime`);
      
    } catch (error) {
      console.error('❌ Error fetching recommended anime:', error);
      setErrorForSection('recommended', error.message, 'fetch');
      setRecommendedAnime([]);
    } finally {
      updateLoadingState('recommended', false);
    }
  }, [updateLoadingState, clearErrorForSection, setErrorForSection, resetRetryCount]);

  const fetchWithRetry = useCallback(async (url, section, setter, retryCount = 0) => {
    try {
      updateLoadingState(section, true);
      clearErrorForSection(section);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZidaneAnimeList/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage;
        switch (response.status) {
          case 400:
            errorMessage = 'Bad request - Invalid parameters';
            break;
          case 404:
            errorMessage = 'Data not found';
            break;
          case 429:
            errorMessage = 'Rate limit exceeded. Please wait a moment';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
          case 503:
            errorMessage = 'Service temporarily unavailable';
            break;
          default:
            errorMessage = `HTTP ${response.status}: Failed to fetch data`;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format - Expected JSON');
      }

      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure received');
      }

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('No data available in response');
      }

      setter(data.data);
      resetRetryCount(section);
      console.log(`✅ ${section} data loaded successfully: ${data.data.length} items`);

    } catch (error) {
      console.error(`❌ Error fetching ${section} data:`, error);

      let errorMessage = error.message;
      let errorType = 'fetch';

      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection';
        errorType = 'timeout';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection';
        errorType = 'network';
      }

      if (retryCount < MAX_RETRIES && errorType !== 'timeout') {
        console.log(`🔄 Retrying ${section} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        incrementRetryCount(section);
        
        setTimeout(() => {
          fetchWithRetry(url, section, setter, retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1));
        
        return;
      }

      setErrorForSection(section, errorMessage, errorType);
      setter([]);
    } finally {
      updateLoadingState(section, false);
    }
  }, [updateLoadingState, clearErrorForSection, setErrorForSection, resetRetryCount, incrementRetryCount]);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      clearErrorForSection('search');
      return;
    }

    updateLoadingState('search', true);
    clearErrorForSection('search');

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `https://api.jikan.moe/v4/anime?q=${encodedQuery}&limit=20&order_by=popularity&sort=asc`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZidaneAnimeList/1.0'
        }
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `Search failed (HTTP ${response.status})`;
        if (response.status === 429) {
          errorMessage = 'Too many searches. Please wait a moment';
        } else if (response.status === 400) {
          errorMessage = 'Invalid search query';
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid search response format');
      }
      
      setSearchResults(data.data);
      console.log(`✅ Search results for "${query}": ${data.data.length} anime found`);
      
    } catch (error) {
      console.error(`❌ Search error for "${query}":`, error);
      
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Search timed out. Please try again';
      } else if (error.name === 'TypeError') {
        errorMessage = 'Network error during search';
      }
      
      setErrorForSection('search', errorMessage, 'search');
      setSearchResults([]);
    } finally {
      updateLoadingState('search', false);
    }
  }, [updateLoadingState, clearErrorForSection, setErrorForSection]);

  // Search debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        clearErrorForSection('search');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch, clearErrorForSection]);

  const handleSearchChange = useCallback((event) => {
    const query = event.target.value;
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    clearErrorForSection('search');
  }, [clearErrorForSection]);

  const retrySection = useCallback((section) => {
    const urlMap = {
      popular: 'https://api.jikan.moe/v4/top/anime',
      season: 'https://api.jikan.moe/v4/seasons/now',
      upcoming: 'https://api.jikan.moe/v4/seasons/upcoming'
    };

    const setterMap = {
      popular: setPopularAnime,
      season: setSeasonAnime,
      upcoming: setUpcomingAnime
    };

    if (section === 'recommended') {
      fetchSpecificAnimeIds();
    } else if (section === 'search') {
      handleSearch(searchQuery);
    } else if (urlMap[section] && setterMap[section]) {
      fetchWithRetry(urlMap[section], section, setterMap[section]);
    }
  }, [fetchWithRetry, searchQuery, handleSearch, fetchSpecificAnimeIds]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Add small delays to prevent rate limiting
        setTimeout(() => fetchWithRetry('https://api.jikan.moe/v4/top/anime', 'popular', setPopularAnime), 100);
        setTimeout(() => fetchWithRetry('https://api.jikan.moe/v4/seasons/now', 'season', setSeasonAnime), 300);
        setTimeout(() => fetchSpecificAnimeIds(), 500);
        setTimeout(() => fetchWithRetry('https://api.jikan.moe/v4/seasons/upcoming', 'upcoming', setUpcomingAnime), 700);
        
        console.log('🏁 Initial data loading started');
      } catch (error) {
        console.error('❌ Critical error during initial load:', error);
      }
    };

    loadInitialData();
  }, [fetchWithRetry, fetchSpecificAnimeIds]);

  const isInitialLoading = loadingStates.popular && loadingStates.season && 
                           loadingStates.recommended && loadingStates.upcoming;
  const isAllError = errors.popular && errors.season && errors.recommended && errors.upcoming;

  const ErrorDisplay = ({ section, error, onRetry }) => (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
      <div className="flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-400">
          {error.type === 'network' ? 'Connection Error' : 
           error.type === 'timeout' ? 'Request Timeout' : 'Loading Failed'}
        </h3>
      </div>
      <p className="text-red-300 text-sm mb-4">{error.message}</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button 
          onClick={() => onRetry(section)}
          disabled={retryCounts[section] >= MAX_RETRIES}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm transition-colors"
        >
          {retryCounts[section] >= MAX_RETRIES ? 'Max Retries Reached' : '🔄 Try Again'}
        </button>
        {error.type === 'network' && (
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            🔄 Reload Page
          </button>
        )}
      </div>
      {retryCounts[section] > 0 && (
        <p className="text-gray-400 text-xs mt-2">
          Retry attempts: {retryCounts[section]}/{MAX_RETRIES}
        </p>
      )}
    </div>
  );

  if (isInitialLoading) {
    return (
      <div className="bg-gray-950 text-white min-h-screen flex flex-col items-center justify-center p-8">
        <div className="flex items-center space-x-4">
          <p className="text-xl">Loading...</p>
          <div className="w-8 h-8 border-4 border-gray-500 border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-400 mt-4">Memuat data anime</p>
      </div>
    );
  }

  if (isAllError) {
    return (
      <div className="bg-gray-950 text-white min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">❌ Unable to Load Data</h2>
          <p className="text-gray-300 mb-6">
            All anime data failed to load. This might be due to network issues or server problems.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🔄 Reload Page
            </button>
            <button 
              onClick={() => {
                Object.keys(errors).forEach(section => {
                  if (errors[section]) retrySection(section);
                });
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🔄 Retry All Sections
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white min-h-screen font-sans">
      <header className="py-6 px-8 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-900 shadow-md fixed top-0 left-0 right-0 z-50 gap-4 sm:gap-0">
        <h1 className="text-3xl font-extrabold text-red-500 tracking-wide text-center sm:text-left">ZidaneAnimeList</h1>
        
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-gray-800 text-white placeholder-gray-400 rounded-full py-2 px-6 w-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors pr-20"
          />
          
          {loadingStates.search && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="p-8 pt-32">
        {/* Search Results Section */}
        {searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 border-b-2 border-red-500 pb-2 mt-7 sm:mt-0">
              🔍 Search Results for "{searchQuery}"
              {loadingStates.search && (
                <span className="ml-3 text-sm text-gray-400">Searching...</span>
              )}
            </h2>
            
            {loadingStates.search ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400">Searching anime...</span>
              </div>
            ) : errors.search ? (
              <ErrorDisplay section="search" error={errors.search} onRetry={retrySection} />
            ) : searchResults.length > 0 ? (
              <>
                <p className="text-gray-400 text-sm mb-4">Found {searchResults.length} results</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {searchResults.map((anime) => (
                    <AnimeCard key={`search-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
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
            <h2 className="text-3xl font-bold mb-6 border-b-2 border-red-500 pb-2 mt-7 sm:mt-0">
              ⭐ Anime Rekomendasi
              {loadingStates.recommended && (
                <span className="ml-3 text-sm text-gray-400">Loading...</span>
              )}
            </h2>
            
            {loadingStates.recommended ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400">Loading recommended anime...</span>
              </div>
            ) : errors.recommended ? (
              <ErrorDisplay section="recommended" error={errors.recommended} onRetry={retrySection} />
            ) : recommendedAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {recommendedAnime.map((anime) => (
                  <AnimeCard key={`recommended-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No recommended anime available.</p>
              </div>
            )}
          </section>
        )}

        {/* Season Anime Section */}
        {!searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 border-b-2 border-red-500 pb-2">
              🌸 Anime Season Ini 
              {loadingStates.season && (
                <span className="ml-3 text-sm text-gray-400">Loading...</span>
              )}
            </h2>
            
            {loadingStates.season ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400">Loading season anime...</span>
              </div>
            ) : errors.season ? (
              <ErrorDisplay section="season" error={errors.season} onRetry={retrySection} />
            ) : seasonAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {seasonAnime.map((anime) => (
                  <AnimeCard key={`season-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No season anime data available.</p>
              </div>
            )}
          </section>
        )}

        {/* Upcoming Anime Section */}
        {!searchQuery.trim() && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 border-b-2 border-red-500 pb-2">
              🔮 Anime Mendatang
              {loadingStates.upcoming && (
                <span className="ml-3 text-sm text-gray-400">Loading...</span>
              )}
            </h2>

            {loadingStates.upcoming ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400">Loading upcoming anime...</span>
              </div>
            ) : errors.upcoming ? (
              <ErrorDisplay section="upcoming" error={errors.upcoming} onRetry={retrySection} />
            ) : upcomingAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {upcomingAnime.map((anime) => (
                  <AnimeCard key={`upcoming-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No upcoming anime data available.</p>
              </div>
            )}
          </section>
        )}

        {/* Popular Anime Section */}
        {!searchQuery.trim() && (
          <section>
            <h2 className="text-3xl font-bold mb-6 border-b-2 border-red-500 pb-2">
              🔥 Anime Populer
              {loadingStates.popular && (
                <span className="ml-3 text-sm text-gray-400">Loading...</span>
              )}
            </h2>
            
            {loadingStates.popular ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400">Loading popular anime...</span>
              </div>
            ) : errors.popular ? (
              <ErrorDisplay section="popular" error={errors.popular} onRetry={retrySection} />
            ) : popularAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {popularAnime.map((anime) => (
                  <AnimeCard key={`popular-${anime.mal_id}`} anime={anime} onCardClick={onCardClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No popular anime data available.</p>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 bg-gray-900 rounded-lg p-8">
          <div className="text-center">
            <h4 className="text-2xl font-bold text-white mb-6">Made with ❤️ by Zidane</h4>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {/* Social Media Links */}
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10 c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56 c3.97,0,7.19,2.73,7.19,8.26V39z" />
                </svg>
              </a>
            </div>
            <div className="text-gray-400 text-sm">
              <p>&copy; 2024 ZidaneAnimeList. Powered by Jikan API.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;