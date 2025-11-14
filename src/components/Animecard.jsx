// src/components/AnimeCard.jsx
import React, { useState, useEffect } from 'react';

const Animecard = ({ anime, onCardClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const imageUrl = anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url || 'https://placehold.co/225x318/E0E7FF/374151?text=No+Image';

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <div
      onClick={() => onCardClick(anime.mal_id)}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onTouchStart={() => isMobile && setIsHovered(true)}
      onTouchEnd={() => isMobile && setTimeout(() => setIsHovered(false), 2000)}
      // 1. TAMBAHKAN hover:scale-105 dan duration-300
      className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative group"
    >
      <img
        src={imageUrl}
        alt={anime.title}
        className="w-full h-64 sm:h-72 object-cover object-center"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'https://placehold.co/225x318/E0E7FF/374151?text=No+Image';
        }}
      />

      {/* 2. UBAH LOGIKA className INI */}
      <div className={`
        absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-end p-4 transition-all duration-300
        ${/* Logika ini HANYA akan menampilkan overlay di mobile, tidak di desktop */''}
        ${(isMobile && isHovered) ? 'opacity-100' : 'opacity-0'}
      `}>
        {/* Konten overlay ini (judul, rating) sekarang hanya muncul di mobile */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{anime.title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-gray-300 text-sm">{anime.type} ({anime.year || 'N/A'})</p>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-yellow-400 font-bold text-sm">{anime.score || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Desktop card info (ini akan selalu terlihat) */}
      <div className={`p-4 ${isMobile ? 'hidden' : 'block'}`}>
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">{anime.title}</h3>
        <p className="text-gray-600 text-sm mt-1">{anime.type} ({anime.year || 'N/A'})</p>
        <div className="flex items-center mt-2">
          <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-gray-700 font-medium text-sm">{anime.score || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default Animecard;