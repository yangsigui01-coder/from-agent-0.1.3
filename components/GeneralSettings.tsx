
import React, { useState, useEffect } from 'react';
import { ApiSettings } from '../types';
import { XIcon, RefreshIcon, CheckIcon, SearchIcon, PlusIcon } from './Icons';

interface GeneralSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ApiSettings;
  onSave: (settings: ApiSettings) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleFetchModels = async () => {
    if (!localSettings.openai.baseUrl || !localSettings.openai.apiKey) {
        setFetchError("Please set Base URL and API Key first.");
        return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
        const baseUrl = localSettings.openai.baseUrl.replace(/\/$/, '');
        // Assumes standard OpenAI /v1/models endpoint structure
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localSettings.openai.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        // Standard OpenAI list format is { data: [ { id: "model-name", ... } ] }
        let models: string[] = [];
        
        if (Array.isArray(data.data)) {
            models = data.data.map((m: any) => m.id);
        } else if (Array.isArray(data)) {
            // Some non-standard proxies might return array directly
            models = data.map((m: any) => m.id || m);
        }

        if (models.length === 0) throw new Error("No models found in response.");

        setLocalSettings(prev => ({
            ...prev,
            openai: {
                ...prev.openai,
                availableModels: models.sort()
            }
        }));

    } catch (err: any) {
        console.error("Failed to fetch models", err);
        setFetchError(err.message || "Failed to fetch models");
    } finally {
        setIsFetching(false);
    }
  };

  const handleToggleModel = (modelId: string) => {
      setLocalSettings(prev => {
          const currentSelected = prev.openai.selectedModels || [];
          const isSelected = currentSelected.includes(modelId);
          let newSelected;
          
          if (isSelected) {
              newSelected = currentSelected.filter(m => m !== modelId);
          } else {
              newSelected = [...currentSelected, modelId];
          }

          return {
              ...prev,
              openai: {
                  ...prev.openai,
                  selectedModels: newSelected,
                  // Also set as active model if it was just selected and no model is set? 
                  // Or just keep the active model independent. 
                  // If we are unselecting the active model, we might want to warn or just leave it.
                  model: isSelected && prev.openai.model === modelId ? prev.openai.model : (isSelected ? prev.openai.model : modelId)
              }
          };
      });
  };

  const filteredModels = (localSettings.openai.availableModels || []).filter(m => 
      m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 ${!isOpen ? 'hidden' : ''}`}>
      <div className="bg-[#1e1e1e] w-full max-w-lg rounded-2xl border border-gray-800 flex flex-col shadow-2xl max-h-[90vh]">
         {/* Header */}
         <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
           <h2 className="text-lg font-bold text-white">General Settings</h2>
           <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><XIcon className="w-5 h-5" /></button>
         </div>
         {/* Body */}
         <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Model Provider</label>
               <div className="grid grid-cols-2 gap-2 bg-[#151515] p-1 rounded-xl border border-gray-800">
                  <button 
                    onClick={() => setLocalSettings({...localSettings, provider: 'gemini'})}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${localSettings.provider === 'gemini' ? 'bg-[#2d2d2d] text-white shadow-sm ring-1 ring-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Gemini (Official)
                  </button>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, provider: 'openai'})}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${localSettings.provider === 'openai' ? 'bg-[#2d2d2d] text-white shadow-sm ring-1 ring-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    OpenAI Format
                  </button>
               </div>
            </div>

            {localSettings.provider === 'openai' && (
               <div className="space-y-4 animate-in slide-in-from-top-2 fade-in bg-[#151515] p-4 rounded-xl border border-gray-800">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base URL</label>
                    <input 
                      className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono placeholder-gray-700"
                      value={localSettings.openai.baseUrl}
                      onChange={e => setLocalSettings({...localSettings, openai: {...localSettings.openai, baseUrl: e.target.value}})}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                    <input 
                      type="password"
                      className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono placeholder-gray-700"
                      value={localSettings.openai.apiKey}
                      onChange={e => setLocalSettings({...localSettings, openai: {...localSettings.openai, apiKey: e.target.value}})}
                      placeholder="sk-..."
                    />
                  </div>
                   
                  <div className="border-t border-gray-700/50 pt-4 mt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Model Selection</label>
                    <p className="text-[10px] text-gray-400 mb-3">Add models to your favorites list for quick access in the chat.</p>
                    
                    <div className="flex gap-2 mb-2">
                        <button 
                            onClick={handleFetchModels}
                            disabled={isFetching}
                            className="w-full px-3 py-2 bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-900/50 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <RefreshIcon className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
                            Fetch Available Models
                        </button>
                    </div>

                    {fetchError && (
                        <div className="text-[10px] text-red-400 mb-2">{fetchError}</div>
                    )}

                    {/* Available Models List */}
                    {localSettings.openai.availableModels && localSettings.openai.availableModels.length > 0 && (
                        <div className="mt-3 bg-[#0e0e0e] rounded-lg border border-gray-700 overflow-hidden">
                            <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2">
                                <SearchIcon className="w-3 h-3 text-gray-500" />
                                <input 
                                    type="text"
                                    placeholder="Filter models..."
                                    value={modelSearch}
                                    onChange={(e) => setModelSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs w-full text-gray-300"
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {filteredModels.map(m => {
                                    const isSelected = (localSettings.openai.selectedModels || []).includes(m);
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => handleToggleModel(m)}
                                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between group hover:bg-[#2d2d2d] transition-colors ${isSelected ? 'bg-blue-900/10 text-blue-300' : 'text-gray-400'}`}
                                        >
                                            <span className="truncate flex-1">{m}</span>
                                            {isSelected ? (
                                                <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                                                    <CheckIcon className="w-3 h-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-gray-600 group-hover:border-gray-400" />
                                            )}
                                        </button>
                                    );
                                })}
                                {filteredModels.length === 0 && (
                                    <div className="px-3 py-4 text-center text-[10px] text-gray-600">No models match</div>
                                )}
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-500 leading-relaxed pt-2">
                     Note: Switching to a third-party provider will bypass the Gemini SDK. Some features like Google Maps grounding, native file uploads, or deep thinking may behave differently or be unavailable.
                  </div>
               </div>
            )}
         </div>
         {/* Footer */}
         <div className="p-5 border-t border-gray-800 flex justify-end shrink-0">
            <button 
              onClick={() => onSave(localSettings)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              Save Configuration
            </button>
         </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
