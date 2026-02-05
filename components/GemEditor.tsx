
import React, { useState } from 'react';
import { Gem } from '../types';

interface GemEditorProps {
  onSave: (gem: Gem) => void;
  onCancel: () => void;
  initialGem?: Gem;
}

const GemEditor: React.FC<GemEditorProps> = ({ onSave, onCancel, initialGem }) => {
  const [name, setName] = useState(initialGem?.name || '');
  const [description, setDescription] = useState(initialGem?.description || '');
  const [instructions, setInstructions] = useState(initialGem?.instructions || '');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initialGem?.id || Date.now().toString(),
      name,
      description,
      instructions,
      color: initialGem?.color || 'bg-purple-600'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0e0e] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={onCancel} className="text-gray-400">✕</button>
        <span className="font-medium">New Gem</span>
        <button 
          onClick={handleSave}
          disabled={!name.trim()}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <div className="flex border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
        >
          Editor
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'preview' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
        >
          Preview
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'editor' ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Name</label>
              <input 
                type="text" 
                placeholder="Give your Gem a name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Description</label>
              <textarea 
                placeholder="Describe your Gem and explain what it does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 font-medium">Instructions</label>
                <button className="text-blue-400 text-xs">Help me write</button>
              </div>
              <textarea 
                placeholder="Example: You are a professional editor with a focus on academic writing..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                className="w-full bg-[#1a1a1a] border border-transparent rounded-xl px-4 py-3 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-10 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-4xl font-bold">
              {name ? name[0] : '?'}
            </div>
            <h2 className="text-2xl font-bold">{name || 'Your Gem Name'}</h2>
            <p className="text-gray-400 text-sm max-w-xs">{description || 'No description provided'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GemEditor;
