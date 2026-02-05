
import React, { useState, useRef, useEffect } from 'react';
import { Gem } from '../types';
import { InfoIcon, PlusIcon, ShareIcon, EditIcon, MoreIcon, PinIcon, TrashIcon } from './Icons';

interface GemManagerProps {
  gems: Gem[];
  onNewGem: () => void;
  onEditGem: (id: string) => void;
  onDeleteGem: (e: React.MouseEvent, id: string) => void;
  onPinGem: (e: React.MouseEvent, id: string) => void;
}

const GemManager: React.FC<GemManagerProps> = ({ gems, onNewGem, onEditGem, onDeleteGem, onPinGem }) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e0e] text-[#e3e3e3] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-medium">My Gems</h1>
            <InfoIcon className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-300" />
          </div>
          <button 
            onClick={onNewGem}
            className="flex items-center space-x-2 bg-[#a8c7fa] hover:bg-[#d3e3fd] text-[#001d35] px-4 py-2 rounded-full font-medium transition-colors text-sm"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Gem</span>
          </button>
        </div>

        {/* Gems List */}
        <div className="grid grid-cols-1 gap-4">
          {gems.map(gem => (
            <div key={gem.id} className="bg-[#1e1e1e] rounded-xl p-4 flex items-start group hover:bg-[#2d2d2d] transition-colors border border-transparent hover:border-gray-700">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full ${gem.color || 'bg-blue-600'} flex items-center justify-center text-xl font-bold text-white shadow-sm flex-shrink-0 mr-4`}>
                {gem.name[0]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-base font-medium text-white mb-1 truncate">{gem.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{gem.description || 'No description provided.'}</p>
                <div className="mt-2 text-xs text-gray-500">
                  {gem.isPinned && <span className="flex items-center text-gray-400"><PinIcon className="w-3 h-3 mr-1" /> Pinned</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                 <button className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10" title="Share">
                   <ShareIcon className="w-5 h-5" />
                 </button>
                 <button onClick={() => onEditGem(gem.id)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10" title="Edit">
                   <EditIcon className="w-5 h-5" />
                 </button>
                 
                 <div className="relative">
                   <button 
                     onClick={(e) => handleMenuClick(e, gem.id)}
                     className={`p-2 rounded-full hover:bg-white/10 ${menuOpenId === gem.id ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
                   >
                     <MoreIcon className="w-5 h-5" />
                   </button>

                   {/* Context Menu */}
                   {menuOpenId === gem.id && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-1 w-48 bg-[#2d2d2d] rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right">
                       <button 
                        onClick={(e) => { onPinGem(e, gem.id); setMenuOpenId(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#3d3d3d] flex items-center"
                      >
                        <PinIcon className="w-4 h-4 mr-3" />
                        {gem.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button 
                        onClick={(e) => { onDeleteGem(e, gem.id); setMenuOpenId(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#3d3d3d] flex items-center"
                      >
                        <TrashIcon className="w-4 h-4 mr-3" />
                        Delete
                      </button>
                    </div>
                   )}
                 </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default GemManager;
