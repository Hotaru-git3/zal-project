import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Constants
const API_BASE_URL = 'https://api.jikan.moe/v4';
const PLACEHOLDER_IMAGE = 'https://placehold.co/64x64/374151/E5E7EB?text=No+Img';

// Custom hook for API data with enhanced error handling
const useApiData = (url, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!url) return;
    
    try {
      setLoading(true);
      if (!isRetry) setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AnimeList-App/1.0'
        }
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setError(null);
        setRetryCount(0);
      } else if (response.status === 404) {
        setError({ message: 'Data not found', type: 'not_found' });
        setData(null);
      } else if (response.status === 429) {
        setError({ message: 'Rate limit exceeded. Please try again later', type: 'rate_limit' });
        setData(null);
      } else if (response.status >= 500) {
        setError({ message: 'Server error. Please try again later', type: 'server_error' });
        setData(null);
      } else {
        setError({ message: `HTTP ${response.status}: ${response.statusText}`, type: 'http_error' });
        setData(null);
      }
    } catch (err) {
      let errorMessage = 'An unexpected error occurred';
      let errorType = 'unknown';
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection';
        errorType = 'network';
      } else if (err.name === 'AbortError') {
        errorMessage = 'Request timeout. Please try again';
        errorType = 'timeout';
      } else {
        errorMessage = err.message;
      }
      
      setError({ message: errorMessage, type: errorType });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const retryWithDelay = useCallback(async () => {
    if (retryCount < 3 && navigator.onLine) {
      setRetryCount(prev => prev + 1);
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await fetchData(true);
    }
  }, [fetchData, retryCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData, 
    retryWithDelay,
    retryCount 
  };
};

// Loading Spinner Component
const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClasses[size]} border-2 border-gray-600 border-t-white rounded-full animate-spin`}></div>
      {text && <span className="ml-2 text-gray-400 text-sm">{text}</span>}
    </div>
  );
};

// Enhanced Error Message Component
const ErrorMessage = ({ message, onRetry, retryCount = 0, maxRetries = 3, error = null }) => (
  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
    <div className="flex items-center justify-center mb-2">
      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-red-400 text-sm font-medium">
        {error?.type === 'network' ? 'Connection Error' :
         error?.type === 'timeout' ? 'Request Timeout' :
         error?.type === 'rate_limit' ? 'Rate Limit' :
         error?.type === 'not_found' ? 'Data Not Found' :
         'Error'}
      </p>
    </div>
    
    <p className="text-red-300 text-xs mb-3">{message || error?.message}</p>
    
    {onRetry && retryCount < maxRetries && navigator.onLine && (
      <div className="space-y-2">
        {retryCount > 0 && (
          <p className="text-xs text-gray-400">
            Retry attempt {retryCount}/{maxRetries}
          </p>
        )}
        <button 
          onClick={onRetry}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-3 py-1 rounded text-xs transition-colors border border-red-500/30"
        >
          {retryCount > 0 ? 'Retry Again' : 'Retry'}
        </button>
      </div>
    )}
    
    {(retryCount >= maxRetries || !navigator.onLine) && (
      <p className="text-xs text-gray-500 mt-2">
        {!navigator.onLine ? 'No internet connection' : 'Maximum retry attempts reached'}
      </p>
    )}
  </div>
);

// Network Status Component
const NetworkStatus = ({ isOnline }) => {
  if (isOnline) return null;
  
  return (
    <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 mb-4 mx-8">
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-orange-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-orange-400 text-sm">No internet connection</p>
      </div>
    </div>
  );
};

const SectionTitle = ({ children, className = '' }) => (
  <h4 className={`text-2xl font-bold border-b-2 border-gray-700 pb-2 mb-4 ${className}`}>
    {children}
  </h4>
);

const SidebarTitle = ({ children }) => (
  <h4 className="text-xl font-bold text-red-500">{children}</h4>
);

// Optimized Image Component with lazy loading
const OptimizedImage = ({ src, alt, className, placeholder = PLACEHOLDER_IMAGE, ...props }) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src && src !== placeholder) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
        setHasError(false);
      };
      img.onerror = () => {
        setImageSrc(placeholder);
        setIsLoading(false);
        setHasError(true);
      };
      img.src = src;
    }
  }, [src, placeholder]);

  return (
    <div className="relative">
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity`}
        {...props}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// Enhanced Video Player Component
const VideoPlayer = ({ video, index, type = 'promo' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoUrl = video.trailer?.embed_url || video.url;
  const thumbnailUrl = video.trailer?.images?.maximum_image_url || video.images?.jpg?.large_image_url;

  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="flex-shrink-0 w-80 bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-700">
        {videoUrl && !isPlaying ? (
          <div className="relative w-full h-full cursor-pointer" onClick={handlePlay}>
            {thumbnailUrl && (
              <OptimizedImage
                src={thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-red-500 rounded-full p-4 hover:bg-red-600 transition-colors">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>
        ) : videoUrl && isPlaying ? (
          <iframe
            src={videoUrl}
            title={video.title}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">Video Unavailable</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h4 className="font-semibold text-white text-sm line-clamp-2 mb-1">
          {video.title}
        </h4>
        {video.episode && (
          <p className="text-gray-400 text-xs">{video.episode}</p>
        )}
        {videoUrl && (
          <a 
            href={videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block mt-2 text-blue-400 hover:text-blue-300 text-xs underline"
          >
            Watch External →
          </a>
        )}
      </div>
    </div>
  );
};

// Enhanced Episodes Preview Component
const EpisodesPreview = ({ animeId, animeImage }) => {
  const episodesUrl = `${API_BASE_URL}/anime/${animeId}/episodes`;
  const videosUrl = `${API_BASE_URL}/anime/${animeId}/videos`;
  
  const { 
    data: episodesData, 
    loading: episodesLoading, 
    error: episodesError, 
    retryWithDelay: retryEpisodes,
    retryCount: episodesRetryCount 
  } = useApiData(episodesUrl, [animeId]);
  
  const { 
    data: videosData, 
    loading: videosLoading, 
    error: videosError,
    retryWithDelay: retryVideos,
    retryCount: videosRetryCount
  } = useApiData(videosUrl, [animeId]);

  const episodes = episodesData || [];
  const videos = videosData || { promo: [], episodes: [], music_videos: [] };

  const isLoading = episodesLoading || videosLoading;
  const hasError = episodesError || videosError;

  const videoSections = useMemo(() => [
    { title: 'Promotional Videos', videos: videos.promo, type: 'promo' },
    { title: 'Episode Previews', videos: videos.episodes, type: 'episode' },
    { title: 'Music Videos', videos: videos.music_videos, type: 'music' }
  ], [videos]);

  const renderEpisodeCard = (episode) => (
    <div key={episode.mal_id} className="flex-shrink-0 w-80 bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-700">
        <div className="relative w-full h-full overflow-hidden">
          <OptimizedImage
            src={animeImage}
            alt={`Episode ${episode.mal_id} Preview`}
            className="w-full h-full object-cover filter brightness-50"
            placeholder="https://placehold.co/320x180/374151/E5E7EB?text=Episode+Preview"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="bg-red-500 rounded-full p-3 mb-2 mx-auto w-fit">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <p className="text-sm font-semibold">Episode {episode.mal_id}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
            Ep {episode.mal_id}
          </span>
          {episode.aired && (
            <span className="text-gray-400 text-xs">
              {new Date(episode.aired).toLocaleDateString()}
            </span>
          )}
        </div>
        <h4 className="font-semibold text-white text-sm line-clamp-2 mb-2">
          {episode.title || `Episode ${episode.mal_id}`}
        </h4>
        {episode.synopsis && (
          <p className="text-gray-300 text-xs line-clamp-3">
            {episode.synopsis}
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mt-8">
        <SectionTitle>Episodes & Videos</SectionTitle>
        <LoadingSpinner size="lg" text="Loading episodes and videos..." />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <SectionTitle>Episodes & Videos</SectionTitle>
      
      {episodesError && (
        <div className="mb-6">
          <ErrorMessage 
            message={`Episodes: ${episodesError.message}`} 
            onRetry={retryEpisodes}
            retryCount={episodesRetryCount}
            error={episodesError}
          />
        </div>
      )}

      {videosError && !episodesError && (
        <div className="mb-6">
          <ErrorMessage 
            message={`Videos: ${videosError.message}`} 
            onRetry={retryVideos}
            retryCount={videosRetryCount}
            error={videosError}
          />
        </div>
      )}

      {!videosError && videoSections.map(({ title, videos: sectionVideos, type }) => 
        sectionVideos?.length > 0 && (
          <div key={type} className="mb-8">
            <h5 className="text-lg font-semibold text-red-500 mb-4">{title}</h5>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {sectionVideos.map((video, index) => (
                <VideoPlayer key={`${type}-${index}`} video={video} index={index} type={type} />
              ))}
            </div>
          </div>
        )
      )}

      {!episodesError && episodes.length > 0 && (
        <div>
          <h5 className="text-lg font-semibold text-red-500 mb-4">Episodes</h5>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {episodes.map(renderEpisodeCard)}
          </div>
        </div>
      )}

      {!hasError && !isLoading && videoSections.every(section => !section.videos?.length) && !episodes.length && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg mb-2">No episodes or videos available</p>
          <p className="text-sm">This anime doesn't have episode or video data yet.</p>
        </div>
      )}
    </div>
  );
};

// Mobile-Responsive Character Card Component with 2-column grid layout
const CharacterCard = ({ character, isMobile }) => {
  const japaneseVA = useMemo(() => 
    character.voice_actors?.find(actor => actor.language === 'Japanese'),
    [character.voice_actors]
  );
  
  if (isMobile) {
    // Mobile layout: 2-column grid format
    return (
      <div className="bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition-colors text-center">
        {/* Character Image */}
        <div className="flex-shrink-0 mb-3">
          <OptimizedImage
            src={character.character.images?.jpg?.image_url}
            alt={character.character.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-600 mx-auto"
          />
        </div>
        
        {/* Character Info */}
        <div className="mb-3">
          <h5 className="font-semibold text-white text-sm mb-1">{character.character.name}</h5>
          <p className="text-gray-400 text-xs capitalize">{character.role}</p>
        </div>

        {/* Voice Actor Info (if available) */}
        {japaneseVA && (
          <>
            <div className="flex-shrink-0 mb-2">
              <OptimizedImage
                src={japaneseVA.person.images?.jpg?.image_url}
                alt={japaneseVA.person.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-600 mx-auto"
              />
            </div>
            <div>
              <h6 className="font-medium text-white text-xs mb-1">{japaneseVA.person.name}</h6>
              <p className="text-gray-400 text-xs">Voice Actor</p>
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop layout: original horizontal layout
  return (
    <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex-shrink-0">
          <OptimizedImage
            src={character.character.images?.jpg?.image_url}
            alt={character.character.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
          />
        </div>
        <div className="flex-1">
          <h5 className="font-semibold text-white text-lg">{character.character.name}</h5>
          <p className="text-gray-400 capitalize">{character.role}</p>
        </div>
      </div>

      {japaneseVA && (
        <div className="flex items-center space-x-4 flex-1 justify-end">
          <div className="text-right">
            <h5 className="font-semibold text-white text-lg">{japaneseVA.person.name}</h5>
            <p className="text-gray-400">Voice Actor</p>
          </div>
          <div className="flex-shrink-0">
            <OptimizedImage
              src={japaneseVA.person.images?.jpg?.image_url}
              alt={japaneseVA.person.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Staff Card Component (always horizontal layout as requested)
const StaffCard = ({ staffMember }) => (
  <div className="flex items-center bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition-colors">
    <div className="flex-shrink-0">
      <OptimizedImage
        src={staffMember.person.images?.jpg?.image_url}
        alt={staffMember.person.name}
        className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
      />
    </div>
    <div className="ml-4 flex-1">
      <h5 className="font-semibold text-white text-lg">{staffMember.person.name}</h5>
      <p className="text-gray-400">{staffMember.positions.join(', ')}</p>
    </div>
  </div>
);

// Enhanced Person Voice Card Component
const PersonVoiceCard = ({ voice }) => (
  <div className="bg-gray-800 p-4 rounded-lg text-center hover:bg-gray-750 transition-colors">
    <div className="flex-shrink-0 mb-3">
      <OptimizedImage
        src={voice.person.images?.jpg?.image_url}
        alt={voice.person.name}
        className="w-20 h-20 rounded-full object-cover border-2 border-gray-600 mx-auto"
      />
    </div>
    <div>
      <h5 className="font-semibold text-white text-sm mb-1">{voice.person.name}</h5>
      <p className="text-gray-400 text-xs">{voice.language}</p>
      <p className="text-gray-500 text-xs">{voice.role}</p>
    </div>
  </div>
);

// Enhanced Sidebar Info Section Component
const SidebarInfoSection = ({ title, children, loading, error, onRetry, retryCount = 0 }) => (
  <div className="bg-gray-900 p-6 rounded-lg shadow-xl mt-6 space-y-4">
    <SidebarTitle>{title}</SidebarTitle>
    {loading ? (
      <LoadingSpinner size="sm" />
    ) : error ? (
      <ErrorMessage 
        message={error.message} 
        onRetry={onRetry} 
        retryCount={retryCount} 
        error={error}
      />
    ) : (
      children
    )}
  </div>
);

// Main AnimeDetailPage Component with comprehensive error handling
const AnimeDetailPage = ({ animeId, onBackClick }) => {
  // Network status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', checkIsMobile);
    
    checkIsMobile();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // API calls using custom hook with enhanced error handling
  const { 
    data: animeData, 
    loading, 
    error, 
    retryWithDelay: retryMain, 
    retryCount: mainRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/full`, [animeId]);
  
  const { 
    data: characters, 
    loading: charactersLoading, 
    error: charactersError, 
    retryWithDelay: retryCharacters,
    retryCount: charactersRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/characters`, [animeId]);
  
  const { 
    data: staff, 
    loading: staffLoading, 
    error: staffError, 
    retryWithDelay: retryStaff,
    retryCount: staffRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/staff`, [animeId]);
  
  const { 
    data: statistics, 
    loading: statisticsLoading, 
    error: statisticsError, 
    retryWithDelay: retryStatistics,
    retryCount: statisticsRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/statistics`, [animeId]);
  
  const { 
    data: moreInfo, 
    loading: moreInfoLoading, 
    error: moreInfoError, 
    retryWithDelay: retryMoreInfo,
    retryCount: moreInfoRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/moreinfo`, [animeId]);
  
  const { 
    data: reviews, 
    loading: reviewsLoading, 
    error: reviewsError, 
    retryWithDelay: retryReviews,
    retryCount: reviewsRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/reviews`, [animeId]);
  
  const { 
    data: streaming, 
    loading: streamingLoading, 
    error: streamingError, 
    retryWithDelay: retryStreaming,
    retryCount: streamingRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/streaming`, [animeId]);
  
  const { 
    data: pictures, 
    loading: picturesLoading, 
    error: picturesError, 
    retryWithDelay: retryPictures,
    retryCount: picturesRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/pictures`, [animeId]);
  
  const { 
    data: personVoices, 
    loading: personVoicesLoading, 
    error: personVoicesError, 
    retryWithDelay: retryPersonVoices,
    retryCount: personVoicesRetryCount 
  } = useApiData(`${API_BASE_URL}/anime/${animeId}/voices`, [animeId]);

  // Derived state from animeData
  const mainImage = useMemo(() => animeData?.images?.jpg?.large_image_url, [animeData]);
  const trailerUrl = useMemo(() => animeData?.trailer?.embed_url, [animeData]);

  // Loading state with better UX
  if (loading) {
    return (
      <div className="bg-gray-950 text-white min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <LoadingSpinner size="lg" />
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Loading Anime Details</h2>
          <p className="text-gray-400 mb-4">Fetching data from MyAnimeList...</p>
          {mainRetryCount > 0 && (
            <p className="text-sm text-gray-500">
              Retry attempt {mainRetryCount}/3
            </p>
          )}
        </div>
      </div>
    );
  }

  // Comprehensive error state
  if (error || !animeData) {
    return (
      <div className="bg-gray-950 text-white min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full">
          <NetworkStatus isOnline={isOnline} />
          
          <div className="text-center bg-gray-900 rounded-lg p-8">
            <svg className="w-20 h-20 mx-auto mb-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            
            <h2 className="text-2xl font-bold text-red-500 mb-4">Failed to Load Anime</h2>
            
            <div className="mb-6">
              <ErrorMessage 
                message={error?.message || 'Anime data not found'} 
                onRetry={isOnline ? retryMain : null}
                retryCount={mainRetryCount}
                error={error}
              />
            </div>

            {!isOnline && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-6">
                <p className="text-orange-400 text-sm">
                  Please check your internet connection and try again.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={onBackClick} 
                className="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Back to Search
              </button>
              
              {isOnline && (
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white min-h-screen font-sans">
      {/* Header */}
        <header className="py-4 px-6 flex items-center justify-between bg-gray-900 shadow-md sticky top-0 z-50 flex-wrap">
          <button
            onClick={onBackClick}
            className="bg-red-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-extrabold text-red-500 tracking-wide">ZidaneAnimeList</h1>
          
          {/* Connection Status Indicator */}
        {!isOnline && (
          <div className="ml-auto flex items-center text-orange-400">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm">Offline</span>
          </div>
        )}
      </header>

      <NetworkStatus isOnline={isOnline} />

      {/* Main Content */}
      <main className="p-8 container mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content */}
          <div className="lg:w-2/3 lg:order-2 order-1">
            {/* Title and Genres */}
            <div className="mb-6">
              <h2 className="text-4xl font-extrabold text-red-500 mb-2">{animeData.title}</h2>
              {animeData.title_japanese && (
                <h3 className="text-xl text-gray-400 mb-4">{animeData.title_japanese}</h3>
              )}

              {animeData.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {animeData.genres.map((genre) => (
                    <span key={genre.mal_id} className="bg-red-500 text-white text-sm px-4 py-1 rounded-full font-semibold hover:bg-red-600 transition-colors">
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Image */}
            <div className="mt-6 lg:hidden">
              <OptimizedImage
                src={mainImage}
                alt={animeData.title}
                className="rounded-lg shadow-2xl w-full max-w-sm mx-auto"
              />
            </div>

            {/* Trailer Section */}
            {trailerUrl && (
              <div className="mt-8">
                <SectionTitle>Trailer</SectionTitle>
                <div className="relative w-full overflow-hidden rounded-lg shadow-2xl bg-gray-800" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={trailerUrl}
                    title="Anime Trailer"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Synopsis Section */}
            {animeData.synopsis && (
              <div className="mt-8">
                <SectionTitle>Synopsis</SectionTitle>
                <div className="bg-gray-900 p-6 rounded-lg">
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {animeData.synopsis}
                  </p>
                </div>
              </div>
            )}

            {/* Cast Section with Enhanced Error Handling and Mobile Responsive Layout */}
            <div className="mt-8">
              <SectionTitle>Cast</SectionTitle>
              {charactersLoading ? (
                <LoadingSpinner text="Loading characters..." />
              ) : charactersError ? (
                <ErrorMessage 
                  message={`Failed to load character data: ${charactersError.message}`} 
                  onRetry={retryCharacters}
                  retryCount={charactersRetryCount}
                  error={charactersError}
                />
              ) : characters?.length > 0 ? (
                <div className={`${isMobile ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
                  {characters.slice(0, isMobile ? 6 : 8).map((character) => (
                    <CharacterCard key={character.character.mal_id} character={character} isMobile={isMobile} />
                  ))}
                  {characters.length > (isMobile ? 6 : 8) && (
                    <div className={`text-center ${isMobile ? 'col-span-2' : ''}`}>
                      <p className="text-gray-400 text-sm">
                        Showing {isMobile ? 6 : 8} of {characters.length} characters
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p>No character data available</p>
                </div>
              )}
            </div>

            {/* Staff Section with Enhanced Error Handling (Desktop layout only as requested) */}
            <div className="mt-8">
              <SectionTitle>Staff</SectionTitle>
              {staffLoading ? (
                <LoadingSpinner text="Loading staff..." />
              ) : staffError ? (
                <ErrorMessage 
                  message={`Failed to load staff data: ${staffError.message}`} 
                  onRetry={retryStaff}
                  retryCount={staffRetryCount}
                  error={staffError}
                />
              ) : staff?.length > 0 ? (
                <div className="space-y-4">
                  {staff.slice(0, 8).map((staffMember) => (
                    <StaffCard key={staffMember.person.mal_id} staffMember={staffMember} />
                  ))}
                  {staff.length > 8 && (
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Showing 8 of {staff.length} staff members</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>No staff data available</p>
                </div>
              )}
            </div>

            {/* Episodes Preview Section with Enhanced Error Handling */}
            <EpisodesPreview animeId={animeId} animeImage={mainImage} />
          </div>

          {/* Person Voices Section with Enhanced Error Handling */}
          {personVoices?.length > 0 && (
            <div className="lg:w-1/4 lg:order-3 order-3 flex-shrink-0">
              <SectionTitle>Voice Actors</SectionTitle>
              {personVoicesLoading ? (
                <LoadingSpinner text="Loading voice actors..." />
              ) : personVoicesError ? (
                <ErrorMessage 
                  message={`Failed to load voice actor data: ${personVoicesError.message}`} 
                  onRetry={retryPersonVoices}
                  retryCount={personVoicesRetryCount}
                  error={personVoicesError}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {personVoices.slice(0, 8).map((voice) => (
                    <PersonVoiceCard key={voice.person.mal_id} voice={voice} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sidebar */}
          <div className="lg:w-1/3 lg:order-1 order-2 flex-shrink-0">
            {/* Desktop Image */}
            <div className="hidden lg:block mb-6">
              <OptimizedImage
                src={mainImage}
                alt={animeData.title}
                className="rounded-lg shadow-2xl w-full"
              />
            </div>
            
            {/* Info Section */}
            <SidebarInfoSection title="Information">
              <div className="text-gray-300 space-y-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Rating:</span>
                  <span className="text-yellow-400 font-bold">
                    {animeData.score ? `★ ${animeData.score}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Episodes:</span>
                  <span>{animeData.episodes || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    animeData.status === 'Finished Airing' ? 'bg-green-600' :
                    animeData.status === 'Currently Airing' ? 'bg-blue-600' :
                    'bg-gray-600'
                  }`}>{animeData.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Studio:</span>
                  <span>{animeData.studios?.[0]?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Year:</span>
                  <span>{animeData.year || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Type:</span>
                  <span>{animeData.type || 'N/A'}</span>
                </div>
              </div>
            </SidebarInfoSection>

            {/* Statistics Section with Enhanced Error Handling */}
            <SidebarInfoSection 
              title="Statistics" 
              loading={statisticsLoading} 
              error={statisticsError}
              onRetry={retryStatistics}
              retryCount={statisticsRetryCount}
            >
              {statistics && (
                <div className="text-gray-300 space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Members:</span>
                    <span>{statistics.members?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Favorites:</span>
                    <span>{statistics.favorites?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Watching:</span>
                    <span>{statistics.watching?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Completed:</span>
                    <span>{statistics.completed?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Rank:</span>
                    <span>#{animeData.rank || 'N/A'}</span>
                  </div>
                </div>
              )}
            </SidebarInfoSection>

            {/* More Info Section with Enhanced Error Handling */}
            <SidebarInfoSection 
              title="More Info" 
              loading={moreInfoLoading} 
              error={moreInfoError && !animeData ? moreInfoError : null}
              onRetry={retryMoreInfo}
              retryCount={moreInfoRetryCount}
            >
              {moreInfo?.moreinfo ? (
                <div className="text-gray-300">
                  <p className="text-sm leading-relaxed">{moreInfo.moreinfo}</p>
                </div>
              ) : (
                <div className="text-gray-300 space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Source:</span>
                    <span>{animeData.source || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Duration:</span>
                    <span>{animeData.duration || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Rating:</span>
                    <span>{animeData.rating || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Aired:</span>
                    <span className="text-right text-sm">{animeData.aired?.string || 'N/A'}</span>
                  </div>
                </div>
              )}
            </SidebarInfoSection>

            {/* Reviews Preview Section with Enhanced Error Handling */}
            <SidebarInfoSection 
              title="Reviews" 
              loading={reviewsLoading} 
              error={reviewsError}
              onRetry={retryReviews}
              retryCount={reviewsRetryCount}
            >
              {reviews?.length > 0 ? (
                <div className="text-gray-300">
                  <p className="text-sm mb-3 text-red-400 font-semibold">Latest Review:</p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-white text-sm">{reviews[0].user?.username || 'Anonymous'}</p>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-yellow-400 text-sm">{reviews[0].score || 'N/A'}/10</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-4 leading-relaxed">
                      {reviews[0].review?.substring(0, 200)}...
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    {reviews.length} total review{reviews.length > 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                !reviewsError && (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">No reviews available</p>
                  </div>
                )
              )}
            </SidebarInfoSection>

            {/* Streaming Section with Enhanced Error Handling */}
            <SidebarInfoSection 
              title="Streaming" 
              loading={streamingLoading} 
              error={streamingError}
              onRetry={retryStreaming}
              retryCount={streamingRetryCount}
            >
              {streaming?.length > 0 ? (
                <div className="text-gray-300 space-y-3">
                  {streaming.map((stream, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg hover:bg-gray-750 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold">{stream.name}</span>
                      </div>
                      <a 
                        href={stream.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        Watch
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                !streamingError && (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">No streaming info available</p>
                  </div>
                )
              )}
            </SidebarInfoSection>

            {/* Pictures Section with Enhanced Error Handling */}
            <SidebarInfoSection 
              title="Gallery" 
              loading={picturesLoading} 
              error={picturesError}
              onRetry={retryPictures}
              retryCount={picturesRetryCount}
            >
              {pictures?.length > 0 ? (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {pictures.slice(0, 6).map((pic, index) => (
                      <div key={index} className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                        <OptimizedImage
                          src={pic.jpg?.image_url}
                          alt={`Gallery image ${index + 1}`}
                          className="w-full h-24 object-cover transition-transform hover:scale-105"
                          placeholder="https://placehold.co/200x150/374151/E5E7EB?text=Gallery"
                        />
                      </div>
                    ))}
                  </div>
                  {pictures.length > 6 && (
                    <p className="text-xs text-gray-500 text-center">
                      Showing 6 of {pictures.length} images
                    </p>
                  )}
                </div>
              ) : (
                !picturesError && (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">No pictures available</p>
                  </div>
                )
              )}
            </SidebarInfoSection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnimeDetailPage;