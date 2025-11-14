// src/AnimeDetail.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';

// Placeholder versi light-mode
const PLACEHOLDER_IMAGE = 'https://placehold.co/64x64/E0E7FF/374151?text=No+Img';
const PLACEHOLDER_GALLERY = 'https://placehold.co/200x150/E0E7FF/374151?text=Gallery';

// =========================================================================
// Komponen-komponen - Diubah ke light mode
// =========================================================================

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin`}></div>
      {text && <span className="ml-2 text-gray-500 text-sm">{text}</span>}
    </div>
  );
};

const ErrorMessage = ({ message, onRetry, error = null }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
    <div className="flex items-center justify-center mb-2">
      <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p className="text-red-800 text-sm font-medium">
        {error?.type === 'network' ? 'Connection Error' :
         error?.type === 'timeout' ? 'Request Timeout' : 'Error'}
      </p>
    </div>
    <p className="text-red-700 text-xs mb-3">{message || error?.message}</p>
    {onRetry && navigator.onLine && (
      <button onClick={onRetry} className="bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 px-3 py-1 rounded text-xs transition-colors border border-red-300">
        Retry
      </button>
    )}
    {!navigator.onLine && <p className="text-xs text-gray-500 mt-2">No internet connection</p>}
  </div>
);

const NetworkStatus = ({ isOnline }) => {
  if (isOnline) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 mx-8">
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <p className="text-orange-800 text-sm">No internet connection</p>
      </div>
    </div>
  );
};

const SectionTitle = ({ children, className = '' }) => (
  <h4 className={`text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4 text-gray-900 ${className}`}>
    {children}
  </h4>
);

const SidebarTitle = ({ children }) => (
  <h4 className="text-xl font-bold text-red-500">{children}</h4>
);

const OptimizedImage = ({ src, alt, className, placeholder = PLACEHOLDER_IMAGE, ...props }) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let validSrc = src;
    if (!src || src.includes('No+Img')) {
        validSrc = placeholder;
    }
    
    const img = new Image();
    img.onload = () => { setImageSrc(validSrc); setIsLoading(false); };
    img.onerror = () => { setImageSrc(placeholder); setIsLoading(false); };
    img.src = validSrc;

  }, [src, placeholder]);

  return (
    <div className="relative">
      <img src={imageSrc} alt={alt} className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity`} {...props} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

const VideoPlayer = ({ video, index, type = 'promo' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = video.trailer?.embed_url || video.url;
  const thumbnailUrl = video.trailer?.images?.maximum_image_url || video.images?.jpg?.large_image_url;

  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        {videoUrl && !isPlaying ? (
          <div className="relative w-full h-full cursor-pointer" onClick={() => setIsPlaying(true)}>
            {thumbnailUrl && <OptimizedImage src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-red-500 rounded-full p-4 hover:bg-red-600 transition-colors">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
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
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <p className="text-xs">Video Unavailable</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{video.title}</h4>
        {video.episode && <p className="text-gray-500 text-xs">{video.episode}</p>}
        {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-blue-500 hover:text-blue-600 text-xs underline">Watch External →</a>}
      </div>
    </div>
  );
};


const EpisodesPreview = ({ animeId, animeImage }) => {
  const { 
    data: episodesData, 
    loading: episodesLoading, 
    error: episodesError, 
    refetch: retryEpisodes
  } = useApiData(`/anime/${animeId}/episodes`, [animeId]);
  
  const { 
    data: videosData, 
    loading: videosLoading, 
    error: videosError,
    refetch: retryVideos
  } = useApiData(`/anime/${animeId}/videos`, [animeId]);

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
    <div key={episode.mal_id} className="flex-shrink-0 w-80 bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        <div className="relative w-full h-full overflow-hidden">
          <OptimizedImage
            src={animeImage}
            alt={`Episode ${episode.mal_id} Preview`}
            className="w-full h-full object-cover filter brightness-50"
            placeholder="https://placehold.co/320x180/E0E7FF/374151?text=Episode+Preview"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="bg-red-500 rounded-full p-3 mb-2 mx-auto w-fit">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <p className="text-sm font-semibold">Episode {episode.mal_id}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Ep {episode.mal_id}</span>
          {episode.aired && <span className="text-gray-500 text-xs">{new Date(episode.aired).toLocaleDateString()}</span>}
        </div>
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">{episode.title || `Episode ${episode.mal_id}`}</h4>
        {episode.synopsis && <p className="text-gray-700 text-xs line-clamp-3">{episode.synopsis}</p>}
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
          <ErrorMessage message={`Episodes: ${episodesError.message}`} onRetry={retryEpisodes} error={episodesError} />
        </div>
      )}
      {videosError && !episodesError && (
        <div className="mb-6">
          <ErrorMessage message={`Videos: ${videosError.message}`} onRetry={retryVideos} error={videosError} />
        </div>
      )}

      {/* Scrollbar: Tema Putih */}
      {!videosError && videoSections.map(({ title, videos: sectionVideos, type }) => 
        sectionVideos?.length > 0 && (
          <div key={type} className="mb-8">
            <h5 className="text-lg font-semibold text-red-500 mb-4">{title}</h5>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
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
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {episodes.map(renderEpisodeCard)}
          </div>
        </div>
      )}
      {!hasError && !isLoading && videoSections.every(section => !section.videos?.length) && !episodes.length && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <p className="text-lg mb-2">No episodes or videos available</p>
        </div>
      )}
    </div>
  );
};

const CharacterCard = ({ character, isMobile }) => {
  const japaneseVA = useMemo(() => 
    character.voice_actors?.find(actor => actor.language === 'Japanese'),
    [character.voice_actors]
  );
  
  if (isMobile) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center border border-gray-100">
        <div className="flex-shrink-0 mb-3">
          <OptimizedImage src={character.character.images?.jpg?.image_url} alt={character.character.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 mx-auto" />
        </div>
        <div className="mb-3">
          <h5 className="font-semibold text-gray-900 text-sm mb-1">{character.character.name}</h5>
          <p className="text-gray-500 text-xs capitalize">{character.role}</p>
        </div>
        {japaneseVA && (
          <>
            <div className="flex-shrink-0 mb-2">
              <OptimizedImage src={japaneseVA.person.images?.jpg?.image_url} alt={japaneseVA.person.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 mx-auto" />
            </div>
            <div>
              <h6 className="font-medium text-gray-800 text-xs mb-1">{japaneseVA.person.name}</h6>
              <p className="text-gray-500 text-xs">Voice Actor</p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100">
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex-shrink-0">
          <OptimizedImage src={character.character.images?.jpg?.image_url} alt={character.character.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
        </div>
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 text-lg">{character.character.name}</h5>
          <p className="text-gray-600 capitalize">{character.role}</p>
        </div>
      </div>
      {japaneseVA && (
        <div className="flex items-center space-x-4 flex-1 justify-end">
          <div className="text-right">
            <h5 className="font-semibold text-gray-900 text-lg">{japaneseVA.person.name}</h5>
            <p className="text-gray-600">Voice Actor</p>
          </div>
          <div className="flex-shrink-0">
            <OptimizedImage src={japaneseVA.person.images?.jpg?.image_url} alt={japaneseVA.person.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
          </div>
        </div>
      )}
    </div>
  );
};

const StaffCard = ({ staffMember }) => (
  <div className="flex items-center bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100">
    <div className="flex-shrink-0">
      <OptimizedImage src={staffMember.person.images?.jpg?.image_url} alt={staffMember.person.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
    </div>
    <div className="ml-4 flex-1">
      <h5 className="font-semibold text-gray-900 text-lg">{staffMember.person.name}</h5>
      <p className="text-gray-600">{staffMember.positions.join(', ')}</p>
    </div>
  </div>
);

const PersonVoiceCard = ({ voice }) => (
  <div className="bg-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow border border-gray-100">
    <div className="flex-shrink-0 mb-3">
      <OptimizedImage src={voice.person.images?.jpg?.image_url} alt={voice.person.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 mx-auto" />
    </div>
    <div>
      <h5 className="font-semibold text-gray-900 text-sm mb-1">{voice.person.name}</h5>
      <p className="text-gray-500 text-xs">{voice.language}</p>
      <p className="text-gray-400 text-xs">{voice.role}</p>
    </div>
  </div>
);

const SidebarInfoSection = ({ title, children, loading, error, onRetry }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg mt-6 space-y-4">
    <SidebarTitle>{title}</SidebarTitle>
    {loading ? (
      <LoadingSpinner size="sm" />
    ) : error ? (
      <ErrorMessage 
        message={error.message} 
        onRetry={onRetry} 
        error={error}
      />
    ) : (
      children
    )}
  </div>
);

// =========================================
// Main AnimeDetailPage Component
// =========================================
const AnimeDetailPage = ({ animeId, onBackClick }) => {
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

  // API calls
  const { 
    data: animeData, 
    loading, 
    error, 
    refetch: retryMain, 
  } = useApiData(`/anime/${animeId}/full`, [animeId]);
  
  const { 
    data: characters, 
    loading: charactersLoading, 
    error: charactersError, 
    refetch: retryCharacters,
  } = useApiData(`/anime/${animeId}/characters`, [animeId]);
  
  const { 
    data: staff, 
    loading: staffLoading, 
    error: staffError, 
    refetch: retryStaff,
  } = useApiData(`/anime/${animeId}/staff`, [animeId]);
  
  const { 
    data: statistics, 
    loading: statisticsLoading, 
    error: statisticsError, 
    refetch: retryStatistics,
  } = useApiData(`/anime/${animeId}/statistics`, [animeId]);
  
  const { 
    data: moreInfo, 
    loading: moreInfoLoading, 
    error: moreInfoError, 
    refetch: retryMoreInfo,
  } = useApiData(`/anime/${animeId}/moreinfo`, [animeId]);
  
  const { 
    data: reviews, 
    loading: reviewsLoading, 
    error: reviewsError, 
    refetch: retryReviews,
  } = useApiData(`/anime/${animeId}/reviews`, [animeId]);
  
  const { 
    data: streaming, 
    loading: streamingLoading, 
    error: streamingError, 
    refetch: retryStreaming,
  } = useApiData(`/anime/${animeId}/streaming`, [animeId]);
  
  const { 
    data: pictures, 
    loading: picturesLoading, 
    error: picturesError, 
    refetch: retryPictures,
  } = useApiData(`/anime/${animeId}/pictures`, [animeId]);
  
  const { 
    data: personVoices, 
    loading: personVoicesLoading, 
    error: personVoicesError, 
    refetch: retryPersonVoices,
  } = useApiData(`/anime/${animeId}/voices`, [animeId]);

  // Derived state (FIXED BUG)
  const mainImage = useMemo(() => animeData?.images?.jpg?.large_image_url, [animeData]);
  const trailerUrl = useMemo(() => animeData?.trailer?.embed_url, [animeData]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white text-gray-900 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <LoadingSpinner size="lg" />
          <h2 className="text-2xl font-bold text-red-500 mb-2 mt-6">Loading Anime Details</h2>
          <p className="text-gray-600 mb-4">Fetching data from MyAnimeList...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !animeData) {
    return (
      <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full">
          <NetworkStatus isOnline={isOnline} />
          <div className="text-center bg-white shadow-xl rounded-lg p-8">
            <svg className="w-20 h-20 mx-auto mb-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Failed to Load Anime</h2>
            <div className="mb-6">
              <ErrorMessage message={error?.message || 'Anime data not found'} onRetry={isOnline ? retryMain : null} error={error} />
            </div>
            {!isOnline && <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6"><p className="text-orange-800 text-sm">Please check your internet connection and try again.</p></div>}
            <div className="space-y-3">
              <button onClick={onBackClick} className="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors">Back to Search</button>
              {isOnline && <button onClick={() => window.location.reload()} className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Refresh Page</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // BG Utama: Putih Keabuan
    <div className="bg-gray-50 text-gray-900 min-h-screen font-sans">
      {/* Header: Putih + Bayangan */}
      <header className="py-4 px-6 flex items-center justify-between bg-white shadow-md sticky top-0 z-50 flex-wrap">
        <button onClick={onBackClick} className="bg-red-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Back
        </button>
        <h1 className="text-2xl font-extrabold text-red-500 tracking-wide">ZidaneAnimeList</h1>
        {!isOnline && (
          <div className="ml-auto flex items-center text-orange-600">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span className="text-sm">Offline</span>
          </div>
        )}
      </header>

      <NetworkStatus isOnline={isOnline} />

      <main className="p-8 container mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="lg:w-2/3 lg:order-2 order-1">
            {/* Title and Genres */}
            <div className="mb-6">
              <h2 className="text-4xl font-extrabold text-red-500 mb-2">{animeData.title}</h2>
              {animeData.title_japanese && <h3 className="text-xl text-gray-500 mb-4">{animeData.title_japanese}</h3>}
              {animeData.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {animeData.genres.map((genre) => (
                    <span key={genre.mal_id} className="bg-red-500 text-white text-sm px-4 py-1 rounded-full font-semibold hover:bg-red-600 transition-colors">{genre.name}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 lg:hidden">
              <OptimizedImage src={mainImage} alt={animeData.title} className="rounded-lg shadow-2xl w-full max-w-sm mx-auto" />
            </div>

            {trailerUrl && (
              <div className="mt-8">
                <SectionTitle>Trailer</SectionTitle>
                <div className="relative w-full overflow-hidden rounded-lg shadow-2xl bg-gray-100" style={{ paddingTop: '56.25%' }}>
                  <iframe className="absolute top-0 left-0 w-full h-full" src={trailerUrl} title="Anime Trailer" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </div>
            )}

            {animeData.synopsis && (
              <div className="mt-8">
                <SectionTitle>Synopsis</SectionTitle>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <p className="text-gray-700 leading-relaxed text-lg">{animeData.synopsis}</p>
                </div>
              </div>
            )}

            <div className="mt-8">
              <SectionTitle>Cast</SectionTitle>
              {charactersLoading ? (
                <LoadingSpinner text="Loading characters..." />
              ) : charactersError ? (
                <ErrorMessage message={`Failed to load character data: ${charactersError.message}`} onRetry={retryCharacters} error={charactersError} />
              ) : characters?.length > 0 ? (
                <div className={`${isMobile ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
                  {characters.slice(0, isMobile ? 6 : 8).map((character) => (
                    <CharacterCard key={character.character.mal_id} character={character} isMobile={isMobile} />
                  ))}
                  {characters.length > (isMobile ? 6 : 8) && (
                    <div className={`text-center ${isMobile ? 'col-span-2' : ''}`}>
                      <p className="text-gray-500 text-sm">Showing {isMobile ? 6 : 8} of {characters.length} characters</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <p>No character data available</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <SectionTitle>Staff</SectionTitle>
              {staffLoading ? (
                <LoadingSpinner text="Loading staff..." />
              ) : staffError ? (
                <ErrorMessage message={`Failed to load staff data: ${staffError.message}`} onRetry={retryStaff} error={staffError} />
              ) : staff?.length > 0 ? (
                <div className="space-y-4">
                  {staff.slice(0, 8).map((staffMember) => (
                    <StaffCard key={staffMember.person.mal_id} staffMember={staffMember} />
                  ))}
                  {staff.length > 8 && <div className="text-center"><p className="text-gray-500 text-sm">Showing 8 of {staff.length} staff members</p></div>}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p>No staff data available</p>
                </div>
              )}
            </div>

            <EpisodesPreview animeId={animeId} animeImage={mainImage} />
          </div>

          {personVoices?.length > 0 && (
            <div className="lg:w-1/4 lg:order-3 order-3 flex-shrink-0">
              <SectionTitle>Voice Actors</SectionTitle>
              {personVoicesLoading ? (
                <LoadingSpinner text="Loading voice actors..." />
              ) : personVoicesError ? (
                <ErrorMessage message={`Failed to load voice actor data: ${personVoicesError.message}`} onRetry={retryPersonVoices} error={personVoicesError} />
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
            <div className="hidden lg:block mb-6">
              <OptimizedImage src={mainImage} alt={animeData.title} className="rounded-lg shadow-2xl w-full" />
            </div>
            
            <SidebarInfoSection title="Information">
              <div className="text-gray-700 space-y-3">
                <div className="flex justify-between"><span className="font-semibold text-gray-900">Rating:</span><span className="text-yellow-500 font-bold">{animeData.score ? `★ ${animeData.score}` : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-gray-900">Episodes:</span><span>{animeData.episodes || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-gray-900">Status:</span><span className={`px-2 py-1 rounded text-xs text-white ${animeData.status === 'Finished Airing' ? 'bg-green-600' : animeData.status === 'Currently Airing' ? 'bg-blue-600' : 'bg-gray-600'}`}>{animeData.status}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-gray-900">Studio:</span><span>{animeData.studios?.[0]?.name || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-gray-900">Year:</span><span>{animeData.year || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-gray-900">Type:</span><span>{animeData.type || 'N/A'}</span></div>
              </div>
            </SidebarInfoSection>

            <SidebarInfoSection title="Statistics" loading={statisticsLoading} error={statisticsError} onRetry={retryStatistics}>
              {statistics && (
                <div className="text-gray-700 space-y-3">
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Members:</span><span>{statistics.members?.toLocaleString() || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Favorites:</span><span>{statistics.favorites?.toLocaleString() || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Watching:</span><span>{statistics.watching?.toLocaleString() || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Completed:</span><span>{statistics.completed?.toLocaleString() || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Rank:</span><span>#{animeData.rank || 'N/A'}</span></div>
                </div>
              )}
            </SidebarInfoSection>

            <SidebarInfoSection title="More Info" loading={moreInfoLoading} error={moreInfoError} onRetry={retryMoreInfo}>
              {moreInfo?.moreinfo ? (
                <div className="text-gray-700"><p className="text-sm leading-relaxed">{moreInfo.moreinfo}</p></div>
              ) : (
                <div className="text-gray-700 space-y-3">
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Source:</span><span>{animeData.source || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Duration:</span><span>{animeData.duration || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Rating:</span><span>{animeData.rating || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-900">Aired:</span><span className="text-right text-sm">{animeData.aired?.string || 'N/A'}</span></div>
                </div>
              )}
            </SidebarInfoSection>

            <SidebarInfoSection title="Reviews" loading={reviewsLoading} error={reviewsError} onRetry={retryReviews}>
              {reviews?.length > 0 ? (
                <div className="text-gray-700">
                  <p className="text-sm mb-3 text-red-500 font-semibold">Latest Review:</p>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-sm">{reviews[0].user?.username || 'Anonymous'}</p>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        <span className="text-yellow-600 text-sm">{reviews[0].score || 'N/A'}/10</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed">{reviews[0].review?.substring(0, 200)}...</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">{reviews.length} total review{reviews.length > 1 ? 's' : ''}</p>
                </div>
              ) : (
                !reviewsError && <div className="text-center py-4 text-gray-500"><p className="text-sm">No reviews available</p></div>
              )}
            </SidebarInfoSection>

            <SidebarInfoSection title="Streaming" loading={streamingLoading} error={streamingError} onRetry={retryStreaming}>
              {streaming?.length > 0 ? (
                <div className="text-gray-700 space-y-3">
                  {streaming.map((stream, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg hover:bg-gray-200 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></div>
                        <span className="text-sm font-semibold text-gray-800">{stream.name}</span>
                      </div>
                      <a href={stream.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 text-sm underline">Watch</a>
                    </div>
                  ))}
                </div>
              ) : (
                !streamingError && <div className="text-center py-4 text-gray-500"><p className="text-sm">No streaming info available</p></div>
              )}
            </SidebarInfoSection>

            <SidebarInfoSection title="Gallery" loading={picturesLoading} error={picturesError} onRetry={retryPictures}>
              {pictures?.length > 0 ? (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {pictures.slice(0, 6).map((pic, index) => (
                      <div key={index} className="overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <OptimizedImage
                          src={pic.jpg?.image_url}
                          alt={`Gallery image ${index + 1}`}
                          className="w-full h-24 object-cover transition-transform hover:scale-105"
                          placeholder={PLACEHOLDER_GALLERY}
                        />
                      </div>
                    ))}
                  </div>
                  {pictures.length > 6 && <p className="text-xs text-gray-400 text-center">Showing 6 of {pictures.length} images</p>}
                </div>
              ) : (
                !picturesError && <div className="text-center py-4 text-gray-500"><p className="text-sm">No pictures available</p></div>
              )}
            </SidebarInfoSection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnimeDetailPage;