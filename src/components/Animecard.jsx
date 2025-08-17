// src/components/AnimeCard.jsx
import React from 'react';

const Animecard = ({ anime, onCardClick }) => {
  return (
    <div 
      className="bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-2xl cursor-pointer relative group"
      // onClick: Meneruskan ID anime ke fungsi onCardClick.
      onClick={() => onCardClick(anime.mal_id)}
    >
      <img
        // Menggunakan properti dari Jikan API untuk URL gambar
        src={anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url}
        alt={anime.title}
        className="w-full h-72 object-cover object-center group-hover:opacity-75 transition-opacity duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
        <div className="w-full">
          <h3 className="text-white text-lg font-bold truncate mb-1">
            {anime.title}
          </h3>
          <p className="text-gray-400 text-sm">
            Rating: <span className="text-yellow-400 font-bold">{anime.score}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Animecard;
