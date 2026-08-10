import React from 'react';

interface GlobalTopLoaderProps {
  isLoading: boolean;
}

export const GlobalTopLoader: React.FC<GlobalTopLoaderProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 pointer-events-none overflow-hidden bg-blue-100/30">
      <div className="h-full w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 animate-pulse shadow-[0_0_10px_#3b82f6]" />
      <div
        className="absolute top-0 bottom-0 bg-white/60 w-1/3 animate-[shimmer_1.2s_infinite]"
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
        }}
      />
    </div>
  );
};
