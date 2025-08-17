import React, { useState, useEffect, useCallback } from 'react';
import AnimeCard from '../components/AnimeCard.jsx';

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
  
  // Enhanced error state with more details
  const [errors, setErrors] = useState({
    popular: null,
    season: null,
    recommended: null,
    upcoming: null,
    search: null,
  });

  // Retry counts for each section
  const [retryCounts, setRetryCounts] = useState({
    popular: 0,
    season: 0,
    recommended: 0,
    upcoming: 0,
    search: 0,
  });

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

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

  // Enhanced fetch function with better error handling
  const fetchWithRetry = useCallback(async (url, section, setter, retryCount = 0) => {
    try {
      updateLoadingState(section, true);
      clearErrorForSection(section);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AnimeList-App/1.0'
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

      if (data.data.length === 0) {
        throw new Error('Empty data received');
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

      // Retry logic
      if (retryCount < MAX_RETRIES && errorType !== 'timeout') {
        console.log(`🔄 Retrying ${section} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        incrementRetryCount(section);
        
        setTimeout(() => {
          fetchWithRetry(url, section, setter, retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        
        return;
      }

      setErrorForSection(section, errorMessage, errorType);
      setter([]);
    } finally {
      updateLoadingState(section, false);
    }
  }, [updateLoadingState, clearErrorForSection, setErrorForSection, resetRetryCount, incrementRetryCount]);

  // Enhanced search with better error handling
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
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for search

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
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

  // Debounced search effect
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

  // Retry function for individual sections
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
  }, [fetchWithRetry, searchQuery, handleSearch]);

  // Enhanced recommended anime fetching
  const fetchSpecificAnimeIds = useCallback(async () => {
    try {
      updateLoadingState('recommended', true);
      clearErrorForSection('recommended');
      
      const selectedIds = [
        21,    // One Piece
        1535,  // Death Note
        22319, // Tokyo Ghoul
        20,    // Naruto
        40748, // Jujutsu Kaisen
        31240, // Re:Zero
        30831, // KonoSuba
        40052, // Dr. Stone
        34572, // Black Clover
        39551, // Tensura
        24833, // Ansatsu Kyoushitsu
        37999, // Kaguya-sama
        33255, // Saiki Kusuo
        23755, // Nanatsu no Taizai
        28171, // Shokugeki no Souma
        19815, // No Game No Life
        14719, // JoJo's Bizarre Adventure
        36035, // Grand Blue
        49596, // Blue Lock
        11757  // Sword Art Online
      ];

      const animePromises = selectedIds.map(async (id) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          
          const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json'
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
      
      if (validAnime.length < selectedIds.length) {
        const failedCount = selectedIds.length - validAnime.length;
        console.warn(`⚠️ ${failedCount} anime failed to load from recommendations`);
      }
      
    } catch (error) {
      console.error('❌ Error fetching recommended anime:', error);
      setErrorForSection('recommended', error.message, 'fetch');
      setRecommendedAnime([]);
    } finally {
      updateLoadingState('recommended', false);
    }
  }, [updateLoadingState, clearErrorForSection, setErrorForSection, resetRetryCount]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      const fetchPromises = [
        fetchWithRetry('https://api.jikan.moe/v4/top/anime', 'popular', setPopularAnime),
        fetchWithRetry('https://api.jikan.moe/v4/seasons/now', 'season', setSeasonAnime),
        fetchSpecificAnimeIds(),
        fetchWithRetry('https://api.jikan.moe/v4/seasons/upcoming', 'upcoming', setUpcomingAnime)
      ];

      try {
        await Promise.allSettled(fetchPromises);
        console.log('🏁 Initial data loading completed');
      } catch (error) {
        console.error('❌ Critical error during initial load:', error);
      }
    };

    loadInitialData();
  }, [fetchWithRetry, fetchSpecificAnimeIds]);

  // Loading and error state checks
  const isAllLoading = Object.values(loadingStates).some(loading => loading);
  const isInitialLoading = loadingStates.popular && loadingStates.season && 
                          loadingStates.recommended && loadingStates.upcoming;
  const isAllError = errors.popular && errors.season && errors.recommended && errors.upcoming;

  // Error display component
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
          <p className="text-xl">Loading anime data...</p>
          <div className="w-8 h-8 border-4 border-gray-500 border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-400 mt-4">Please wait while we fetch the latest anime information</p>
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
              🔥 Editor's Choice
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
              📺 This Season's Anime
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
              ⏳ Upcoming Anime
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
              ⭐ Popular Anime
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
      </main>
    </div>
  );
};

export default HomePage;