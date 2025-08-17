

// src/App.jsx
import { useState } from 'react';
import HomePage from './pages/Homepage.jsx';
import AnimeDetailPage from './pages/AnimeDetail.jsx';

function App() {
  // state untuk melacak ID anime yang dipilih, defaultnya null
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);

  // Fungsi yang dipanggil saat kartu anime diklik di HomePage.
  // Menerima mal_id dan menyetel state.
  const handleCardClick = (animeId) => {
    setSelectedAnimeId(animeId);
  };

  // Fungsi untuk kembali ke halaman utama dari halaman detail.
  const handleBackClick = () => {
    setSelectedAnimeId(null);
  };

  return (
    <div className="font-sans">
      {/* Rendering kondisional: jika ada ID, tampilkan halaman detail, jika tidak, tampilkan halaman utama. */}
      {selectedAnimeId ? (
        <AnimeDetailPage animeId={selectedAnimeId} onBackClick={handleBackClick} />
      ) : (
        <HomePage onCardClick={handleCardClick} />
      )}
    </div>
  );
}

export default App;
