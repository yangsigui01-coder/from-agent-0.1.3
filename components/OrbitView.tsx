
import React, { useState, useEffect } from 'react';

interface Satellite {
  id: string;
  label: string;
  weight: number; // 0 to 1, determines line thickness
  data?: any;
}

interface OrbitViewProps {
  centerLabel: string;
  satellites: Satellite[];
  onSatelliteClick: (satellite: Satellite) => void;
}

const OrbitView: React.FC<OrbitViewProps> = ({ centerLabel, satellites, onSatelliteClick }) => {
  // Container dimensions
  const containerSize = 320;
  const radius = 110;
  const center = containerSize / 2;

  return (
    <div 
      className="relative rounded-2xl bg-[#0a0a0a] border border-gray-800 overflow-hidden shadow-inner flex items-center justify-center select-none"
      style={{ width: '100%', height: `${containerSize}px` }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50" />

      {/* Connection Lines Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox={`0 0 ${containerSize} ${containerSize}`}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {satellites.map((sat, index) => {
          const angle = (index * (360 / satellites.length) - 90) * (Math.PI / 180);
          
          // Target position
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;

          // Curve control point for organic look (swirl effect)
          const cpOffsetAngle = angle + 0.4; // Slight rotation for the curve
          const cpDist = radius * 0.5;
          const cpx = center + Math.cos(cpOffsetAngle) * cpDist;
          const cpy = center + Math.sin(cpOffsetAngle) * cpDist;

          return (
            <path
              key={`line-${sat.id}`}
              d={`M ${center},${center} Q ${cpx},${cpy} ${x},${y}`}
              stroke="url(#lineGradient)"
              strokeWidth={Math.max(1, sat.weight * 6)}
              fill="none"
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out opacity-80"
            />
          );
        })}
      </svg>

      {/* Satellites Layer */}
      {satellites.map((sat, index) => {
        const angle = (index * (360 / satellites.length) - 90) * (Math.PI / 180);
        // Translate from center
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <button
            key={sat.id}
            onClick={() => onSatelliteClick(sat)}
            className="absolute z-10 group transition-all duration-500 ease-in-out"
            style={{ 
              transform: `translate(${x}px, ${y}px)`,
            }}
          >
            <div className={`
              relative flex items-center justify-center 
              w-10 h-10 rounded-full 
              bg-[#1e1e1e] border border-gray-700 
              shadow-lg group-hover:scale-110 group-hover:border-blue-400 group-hover:shadow-blue-500/30
              transition-all duration-300
            `}>
              <div className="w-2 h-2 rounded-full bg-blue-400 opacity-60 group-hover:opacity-100" />
            </div>
            {/* Label */}
            <div className={`
              absolute top-full left-1/2 -translate-x-1/2 mt-2 
              text-[10px] font-medium text-gray-400 
              bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm
              whitespace-nowrap opacity-80 group-hover:opacity-100 group-hover:text-white
              transition-all duration-300 pointer-events-none
            `}>
              {sat.label}
              <span className="ml-1 text-gray-600">{(sat.weight * 100).toFixed(0)}%</span>
            </div>
          </button>
        );
      })}

      {/* Center Node Layer */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-900/50 flex items-center justify-center border-4 border-[#0a0a0a] animate-in zoom-in duration-300">
           <span className="text-xl font-bold text-white uppercase tracking-tight">
             {centerLabel.charAt(0)}
           </span>
        </div>
        <div className="absolute top-full mt-3 px-3 py-1 bg-[#1e1e1e]/80 border border-gray-700 rounded-lg backdrop-blur-md text-xs font-semibold text-gray-200 shadow-xl max-w-[120px] text-center truncate">
            {centerLabel}
        </div>
      </div>

    </div>
  );
};

export default OrbitView;
