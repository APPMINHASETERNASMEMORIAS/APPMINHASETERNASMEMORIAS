import React, { useState } from 'react';

// Replace these with the actual image URLs from the user's Google Drive or hosted elsewhere
const FRAME_OPTIONS = [
  'https://lh3.googleusercontent.com/d/120rNh5NBi9PvY_39RhBXHPtgO-ebEQtN',
  'https://lh3.googleusercontent.com/d/1FggHjWmgmc9vEhGioanZ3AOuwrczlHJy',
  'https://lh3.googleusercontent.com/d/1HR57KOb3MsrbakmroB_A5p_5-2Gzc1pX',
  'https://lh3.googleusercontent.com/d/1MiTQtunEjExr5rt-E29Rfe641KIl6pzy',
  'https://lh3.googleusercontent.com/d/1Pj5xIiA8pgwcsJNWiITHw98q1C8E8dAW',
  'https://lh3.googleusercontent.com/d/1_b1MF4Tctc5aegI5KplZAxYAOAOT0EgI',
  'https://lh3.googleusercontent.com/d/1d9BLngmfACtXYzUW0meqOuRbnAnK6Y2B',
  'https://lh3.googleusercontent.com/d/1lJK0OCBDafda1kedU3lt-If7us1iWAzg',
  'https://lh3.googleusercontent.com/d/1mKl3ZdyBgE8-UTsXX0uTD2u7tPwwwntc',
  'https://lh3.googleusercontent.com/d/1qfiljJNdrCpTm2KS0HqjM6_JL_0BkdDr',
  'https://lh3.googleusercontent.com/d/1t8-igj8dualWINI6kQZlAZalPlLUD1OJ',
  'https://lh3.googleusercontent.com/d/1uQUN0-Jmggl678plcCFQWRhXoppMOQ5j',
];

export function FrameSelection({ onSelect }: { onSelect: (frameUrl: string | null) => void }) {
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Escolha uma Moldura (Opcional)</h3>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedFrame(null);
            onSelect(null);
          }}
          className={`relative rounded-xl overflow-hidden border-2 transition-all h-16 flex items-center justify-center bg-gray-100 ${
            selectedFrame === null ? 'border-purple-600' : 'border-transparent'
          }`}
        >
          <span className="text-xs text-gray-500">Nenhuma</span>
        </button>
        {FRAME_OPTIONS.map((frame, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setSelectedFrame(frame);
              onSelect(frame);
            }}
            className={`relative rounded-xl overflow-hidden border-2 transition-all h-16 ${
              selectedFrame === frame ? 'border-purple-600 scale-105' : 'border-transparent'
            }`}
          >
            <img 
              src={frame} 
              alt={`Moldura ${index + 1}`} 
              className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity"
              referrerPolicy="no-referrer"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
