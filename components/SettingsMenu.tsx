
import React, { useRef, useEffect } from 'react';
import { ClipboardListIcon, SettingsAdjustIcon, XIcon, ChevronRightIcon } from './Icons';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFormAgentManager: () => void;
  onOpenGeneralSettings: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onOpenFormAgentManager, onOpenGeneralSettings }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
        ref={menuRef}
        className="absolute bottom-16 left-4 z-50 w-64 bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-left"
    >
      <div className="p-2 space-y-1">
        <button 
          onClick={() => { onOpenFormAgentManager(); onClose(); }}
          className="w-full flex items-center p-2 rounded-lg hover:bg-[#2d2d2d] group transition-colors text-left"
        >
          <div className="p-1.5 bg-blue-900/20 text-blue-400 rounded-md mr-3 group-hover:bg-blue-900/30 transition-colors">
            <ClipboardListIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Form Agent Manager</div>
          </div>
        </button>

        <button 
          onClick={() => { onOpenGeneralSettings(); onClose(); }}
          className="w-full flex items-center p-2 rounded-lg hover:bg-[#2d2d2d] group transition-colors text-left"
        >
          <div className="p-1.5 bg-purple-900/20 text-purple-400 rounded-md mr-3 group-hover:bg-purple-900/30 transition-colors">
            <SettingsAdjustIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">General Settings</div>
          </div>
        </button>
      </div>
      
      <div className="px-4 py-2 bg-[#151515] border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-600">Gemini Clone v0.2.1</p>
      </div>
    </div>
  );
};

export default SettingsMenu;
