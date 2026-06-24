import React, { useEffect, useState } from 'react';
import './Maintenance.css';

const Maintenance: React.FC = () => {
  const [stars, setStars] = useState<{ id: number; left: string; top: string; duration: string; maxOpacity: string; size: string; delay: string }[]>([]);

  useEffect(() => {
    // Generate random stars for the background
    const newStars = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${Math.random() * 3 + 2}s`,
      maxOpacity: `${Math.random() * 0.6 + 0.4}`,
      size: `${Math.random() * 2 + 1}px`,
      delay: `${Math.random() * 5}s`,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="maintenance-container">
      {/* Background Stars */}
      <div className="stars">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              '--duration': star.duration,
              '--max-opacity': star.maxOpacity,
              animationDelay: star.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>



      {/* Main Content Card */}
      <div className="maintenance-content">
        <h1 
          className="text-6xl md:text-[8rem] font-extrabold text-center block bg-gradient-to-r from-space-accent via-amber-300 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,180,80,0.5)]"
          style={{ fontFamily: "'Orbitron', sans-serif", lineHeight: 1.1 }}
        >
          ISAC
        </h1>
        
        <p 
          className="font-extrabold text-center block bg-gradient-to-r from-orange-400 via-amber-300 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,180,80,0.5)] text-xl md:text-2xl mt-2 mb-6"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          Interstellar SpaceTech Astronomy Community
        </p>

        {/* <p className="text-center text-base sm:text-lg md:text-xl mb-12 text-gray-300 max-w-2xl">
          Bridging the gap between passion and profession by providing resources, networking, and hands-on projects for space enthusiasts.
        </p> */}

        <div className="status-badge mb-6">
          <span className="pulse-dot"></span>
          System Maintenance
        </div>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">We'll be back soon.</h2>
        
        <p className="text-gray-400 text-center max-w-md mb-8">
          Our cosmic engineers are currently upgrading the systems. We're launching back online shortly.
        </p>

        {/* <button className="refresh-button" onClick={() => window.location.reload()}>
          Refresh Status
        </button> */}
      </div>
    </div>
  );
};

export default Maintenance;
