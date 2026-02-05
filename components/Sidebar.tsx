
import React, { useState, useEffect, useRef } from 'react';
import { Chat, Gem } from '../types';
import { PlusIcon, SearchIcon, MoreIcon, TrashIcon, PinIcon, ChevronDownIcon, ChevronRightIcon, EditIcon, TaskListIcon } from './Icons';
import SettingsMenu from './SettingsMenu';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  gems: Gem[];
  currentChatId?: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onNewGem: () => void;
  onSelectGem: (gemId: string) => void;
  onDeleteChat: (e: React.MouseEvent, chatId: string) => void;
  onPinChat: (e: React.MouseEvent, chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void; // Added prop
  onOpenGemManager: () => void;
  onDeleteGem: (e: React.MouseEvent, gemId: string) => void;
  onPinGem: (e: React.MouseEvent, gemId: string) => void;
  onEditGem: (gemId: string) => void;
  onOpenSettings: () => void;
  isSettingsOpen: boolean;
  onOpenFormAgentManager: () => void;
  onOpenTodoManager: () => void;
  onOpenGeneralSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chats,
  gems,
  currentChatId,
  onSelectChat,
  onNewChat,
  onNewGem,
  onSelectGem,
  onDeleteChat,
  onPinChat,
  onRenameChat,
  onOpenGemManager,
  onDeleteGem,
  onPinGem,
  onEditGem,
  onOpenSettings,
  isSettingsOpen,
  onOpenFormAgentManager,
  onOpenTodoManager,
  onOpenGeneralSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isGemsCollapsed, setIsGemsCollapsed] = useState(false);
  
  // State for inline renaming
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus rename input
  useEffect(() => {
    if (renamingChatId && renameInputRef.current) {
        renameInputRef.current.focus();
    }
  }, [renamingChatId]);

  const filteredChats = chats
    .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // Sort by pinned first, then by date desc
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  
  const filteredGems = gems.sort((a, b) => {
    // Sort pinned gems first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; 
  });

  const getGemForChat = (chat: Chat) => {
    return chat.gemId ? gems.find(g => g.id === chat.gemId) : null;
  };

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const startRenaming = (e: React.MouseEvent, chat: Chat) => {
      e.stopPropagation();
      setRenamingChatId(chat.id);
      setRenameValue(chat.title);
      setMenuOpenId(null);
  };

  const submitRename = () => {
      if (renamingChatId && renameValue.trim()) {
          onRenameChat(renamingChatId, renameValue.trim());
      }
      setRenamingChatId(null);
      setRenameValue('');
  };

  const cancelRename = () => {
      setRenamingChatId(null);
      setRenameValue('');
  };

  const getLastMessagePreview = (chat: Chat) => {
      if (!chat.messages || chat.messages.length === 0) return '';
      // Find the last message that has some displayable content
      for (let i = chat.messages.length - 1; i >= 0; i--) {
          const msg = chat.messages[i];
          const textPart = msg.parts.find(p => p.text);
          if (textPart && textPart.text) {
              // Clean up system tags for preview
              return textPart.text
                  .replace(/<active_inference_audit>[\s\S]*?<\/active_inference_audit>/g, '')
                  .replace(/<form_payload>[\s\S]*?<\/form_payload>/g, '')
                  .replace(/\[SYSTEM_ANNOTATION.*?\]/g, 'Form Data')
                  .trim() || 'Form content';
          }
          if (msg.parts.some(p => p.inlineData)) return '[Image]';
          if (msg.parts.some(p => p.fileData)) return '[File]';
          if (msg.parts.some(p => p.functionCall)) return '[Action]';
      }
      return '';
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 w-[280px] bg-[#1e1e1e] z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header/Search */}
        <div className="p-4 space-y-4">
          <div className="flex items-center bg-[#2d2d2d] rounded-full px-4 py-2 text-gray-400">
            <SearchIcon className="w-4 h-4 mr-2" />
            <input 
              type="text" 
              placeholder="Search for chats" 
              className="bg-transparent border-none outline-none text-sm w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center bg-[#2d2d2d] rounded-xl px-4 py-3 hover:bg-[#3d3d3d] transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-3 text-blue-400" />
            <span className="font-medium text-sm">New chat</span>
          </button>
        </div>

        {/* My Stuff / Gems */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
           <section>
              <button 
                onClick={() => { onOpenTodoManager(); onClose(); }}
                className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-[#2d2d2d] transition-colors text-sm text-gray-300"
              >
                 <TaskListIcon className="w-5 h-5 mr-3 text-green-400" />
                 <span className="font-medium">Tasks</span>
              </button>
           </section>

          <section>
            {/* Gems Header with split click zones */}
            <div 
              className="flex items-center justify-between mb-2 px-1 py-1 rounded-lg hover:bg-white/5 cursor-pointer group"
              onClick={() => { onOpenGemManager(); onClose(); }} // Non-text click -> Open Manager
            >
               <div className="flex items-center">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setIsGemsCollapsed(!isGemsCollapsed); }}
                    className="p-1 mr-1 text-gray-500 hover:text-white rounded"
                 >
                    {isGemsCollapsed ? <ChevronRightIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                 </button>
                 <span 
                    onClick={(e) => { e.stopPropagation(); setIsGemsCollapsed(!isGemsCollapsed); }} // Text click -> Toggle Collapse
                    className="text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 select-none"
                 >
                   Gems
                 </span>
               </div>
               <button 
                 onClick={(e) => { e.stopPropagation(); onNewGem(); onClose(); }}
                 className="text-blue-400 text-xs font-medium hover:text-blue-300 px-2 py-1 rounded"
               >
                 Create
               </button>
            </div>

            {!isGemsCollapsed && (
              <div className="space-y-1">
                {filteredGems.map(gem => (
                  <div key={gem.id} className="relative group/item">
                    <button
                      onClick={() => { onSelectGem(gem.id); onClose(); }}
                      className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-[#2d2d2d] transition-colors group"
                    >
                      <div className={`w-6 h-6 rounded-full ${gem.color || 'bg-blue-500'} flex items-center justify-center mr-3 text-[10px] font-bold text-white shadow-sm`}>
                        {gem.name[0]}
                      </div>
                      <span className="text-sm text-gray-300 truncate flex-1 text-left">{gem.name}</span>
                      {gem.isPinned && <PinIcon className="w-3 h-3 text-gray-500 ml-1" />}
                    </button>

                     {/* Menu Trigger */}
                    <button 
                      onClick={(e) => handleMenuClick(e, gem.id)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-600 transition-all ${menuOpenId === gem.id ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
                    >
                      <MoreIcon className="w-4 h-4" />
                    </button>

                    {/* Context Menu */}
                    {menuOpenId === gem.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 w-32 bg-[#2d2d2d] rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right">
                         <button 
                          onClick={(e) => { e.stopPropagation(); onEditGem(gem.id); setMenuOpenId(null); onClose(); }}
                          className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#3d3d3d] flex items-center"
                        >
                          <EditIcon className="w-3 h-3 mr-2" />
                          Edit
                        </button>
                        <button 
                          onClick={(e) => { onPinGem(e, gem.id); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#3d3d3d] flex items-center"
                        >
                          <PinIcon className="w-3 h-3 mr-2" />
                          {gem.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button 
                          onClick={(e) => { onDeleteGem(e, gem.id); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-[#3d3d3d] flex items-center"
                        >
                          <TrashIcon className="w-3 h-3 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="px-1 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Chats</h3>
            </div>
            <div className="space-y-1 pb-10">
              {filteredChats.map(chat => {
                const chatGem = getGemForChat(chat);
                const isRenaming = renamingChatId === chat.id;
                const previewText = getLastMessagePreview(chat);

                if (isRenaming) {
                    return (
                        <div key={chat.id} className="w-full flex items-center px-3 py-2 rounded-lg bg-[#2d2d2d] text-sm">
                            <input 
                                ref={renameInputRef}
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitRename();
                                    if (e.key === 'Escape') cancelRename();
                                }}
                                onBlur={submitRename}
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm"
                            />
                        </div>
                    );
                }

                return (
                  <div key={chat.id} className="relative group/chat">
                    <button
                      onClick={() => { onSelectChat(chat.id); onClose(); }}
                      className={`w-full flex items-center text-left px-3 py-2 rounded-lg transition-colors text-sm group ${currentChatId === chat.id ? 'bg-[#2d2d2d] text-white' : 'text-gray-400 hover:bg-[#2d2d2d]'}`}
                    >
                      <div className="mr-3 flex-shrink-0 self-start mt-0.5">
                         {chatGem ? (
                           <div className={`w-4 h-4 rounded-full ${chatGem.color} flex items-center justify-center text-[8px] font-bold text-white`}>
                              {chatGem.name[0]}
                           </div>
                         ) : (
                           <span className="w-4 h-4 flex items-center justify-center text-gray-500">💬</span>
                         )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center justify-between">
                             <span className="truncate font-medium">{chat.title}</span>
                             {chat.isPinned && <PinIcon className="w-3 h-3 text-gray-500 ml-1 flex-shrink-0" />}
                          </div>
                          <div className="truncate text-xs text-gray-500 mt-0.5 font-normal">
                             {previewText || "New conversation"}
                          </div>
                      </div>
                    </button>
                    
                    {/* Menu Trigger */}
                    <button 
                      onClick={(e) => handleMenuClick(e, chat.id)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-600 transition-all ${menuOpenId === chat.id ? 'opacity-100' : 'opacity-0 group-hover/chat:opacity-100'}`}
                    >
                      <MoreIcon className="w-4 h-4" />
                    </button>

                    {/* Context Menu */}
                    {menuOpenId === chat.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 w-32 bg-[#2d2d2d] rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right">
                        <button 
                          onClick={(e) => { onPinChat(e, chat.id); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#3d3d3d] flex items-center"
                        >
                          <PinIcon className="w-3 h-3 mr-2" />
                          {chat.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        
                        <button 
                          onClick={(e) => startRenaming(e, chat)}
                          className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#3d3d3d] flex items-center"
                        >
                          <EditIcon className="w-3 h-3 mr-2" />
                          Rename
                        </button>

                        <button 
                          onClick={(e) => { onDeleteChat(e, chat.id); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-[#3d3d3d] flex items-center"
                        >
                          <TrashIcon className="w-3 h-3 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 relative">
          <SettingsMenu 
             isOpen={isSettingsOpen} 
             onClose={() => {}} // Handled by click outside in SettingsMenu
             onOpenFormAgentManager={onOpenFormAgentManager} 
             onOpenGeneralSettings={onOpenGeneralSettings}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
            className={`flex items-center text-sm w-full transition-colors ${isSettingsOpen ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <span className="p-1 rounded-md bg-gray-800 mr-3">⚙️</span>
            Settings & help
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
