import React from 'react';

interface Particle {
  id: number;
  left: string;
  animationDelay: string;
  animationDuration: string;
  size: string;
  opacity: string;
}

export default function FloatingParticles() {
  const particles: Particle[] = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${15 + Math.random() * 10}s`,
    size: `${4 + Math.random() * 8}px`,
    opacity: `${0.2 + Math.random() * 0.3}`
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] animate-float-up"
          style={{
            left: particle.left,
            bottom: '-20px',
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
            filter: 'blur(1px)'
          }}
        />
      ))}
    </div>
  );
}
