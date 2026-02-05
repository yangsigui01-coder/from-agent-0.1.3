
import React, { useState, useRef, useEffect } from 'react';
import { SavedForm } from '../types';
import { TrashIcon, EditIcon, CheckIcon, XIcon, ClipboardListIcon } from './Icons';

interface FormLibraryMenuProps {
  isOpen: boolean;
  onClose: () => void;
  savedForms: SavedForm[];
  onLoadForm: (form: SavedForm) => void;
  onDeleteForm: (id: string) => void;
  onRenameForm: (id: string, newTitle: string) => void;
}

const FormLibraryMenu: React.FC<FormLibraryMenuProps> = ({ 
  isOpen, 
  onClose, 
  savedForms, 
  onLoadForm, 
  onDeleteForm, 
  onRenameForm 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (editingId && editInputRef.current) {
        editInputRef.current.focus();
    }
  }, [editingId]);

  const startEditing = (e: React.MouseEvent, form: SavedForm) => {
      e.stopPropagation();
      setEditingId(form.id);
      setEditValue(form.title);
  };

  const saveEdit = () => {
      if (editingId && editValue.trim()) {
          onRenameForm(editingId, editValue.trim());
      }
      setEditingId(null);
      setEditValue('');
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditValue('');
  };

  if (!isOpen) return null;

  return (
    <div 
        ref={menuRef}
        className="absolute bottom-16 right-0 z-50 w-72 bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-right flex flex-col max-h-[60vh]"
    >
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-[#1a1a1a]">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ClipboardListIcon className="w-3 h-3 text-blue-400" />
              My Form Library
          </h3>
          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{savedForms.length}</span>
      </div>

      <div className="overflow-y-auto p-2 space-y-1">
          {savedForms.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500 text-xs">
                  <p>No saved forms.</p>
                  <p className="mt-1 opacity-70">Star a form card to save it here.</p>
              </div>
          ) : (
              savedForms.map(form => (
                  <div key={form.id} className="relative group rounded-lg overflow-hidden transition-colors hover:bg-[#2d2d2d] border border-transparent hover:border-gray-700">
                      {editingId === form.id ? (
                          <div className="flex items-center p-2 gap-2">
                              <input 
                                ref={editInputRef}
                                className="flex-1 bg-black/30 border border-blue-500/50 rounded text-sm px-2 py-1 outline-none text-white"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                onBlur={saveEdit}
                              />
                              <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><CheckIcon className="w-4 h-4" /></button>
                              <button onClick={cancelEdit} className="text-gray-500 hover:text-white"><XIcon className="w-4 h-4" /></button>
                          </div>
                      ) : (
                          <div 
                            onClick={() => { onLoadForm(form); onClose(); }}
                            className="flex items-center p-3 cursor-pointer"
                          >
                              <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-200 font-medium truncate">{form.title}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                      {form.schema.fields.length} fields • {new Date(form.createdAt).toLocaleDateString()}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => startEditing(e, form)}
                                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-600 rounded-md transition-colors"
                                    title="Rename"
                                  >
                                      <EditIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteForm(form.id); }}
                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                      <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              ))
          )}
      </div>
    </div>
  );
};

export default FormLibraryMenu;
