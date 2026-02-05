
import React, { useState } from 'react';
import { FormTool } from '../types';
import { 
  XIcon, 
  PlusIcon, 
  TrashIcon, 
  EditIcon, 
  ToggleRightIcon, 
  ToggleLeftIcon, 
  ClipboardListIcon,
  ChevronDownIcon
} from './Icons';

interface FormAgentSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  tools: FormTool[];
  onUpdateTools: (tools: FormTool[]) => void;
}

const FormAgentSettings: React.FC<FormAgentSettingsProps> = ({ 
  isOpen, 
  onClose, 
  tools, 
  onUpdateTools 
}) => {
  const [editingTool, setEditingTool] = useState<FormTool | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    onUpdateTools(tools.map(t => 
      t.id === id ? { ...t, isEnabled: !t.isEnabled } : t
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tool?')) {
      onUpdateTools(tools.filter(t => t.id !== id));
    }
  };

  const handleSaveTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;

    if (tools.some(t => t.id === editingTool.id)) {
      // Edit existing
      onUpdateTools(tools.map(t => t.id === editingTool.id ? editingTool : t));
    } else {
      // Add new
      onUpdateTools([...tools, editingTool]);
    }
    setIsEditing(false);
    setEditingTool(null);
  };

  const startAdd = () => {
    setEditingTool({
      id: Date.now().toString(),
      name: '',
      key: '',
      type: 'text',
      description: '',
      isEnabled: true,
      options: []
    });
    setIsEditing(true);
  };

  const startEdit = (tool: FormTool) => {
    setEditingTool({ ...tool });
    setIsEditing(true);
  };

  const renderToolEditor = () => {
    if (!editingTool) return null;

    return (
      <form onSubmit={handleSaveTool} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tool Name (Label)</label>
          <input 
            required
            className="w-full bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
            placeholder="e.g. Notion Get Page"
            value={editingTool.name}
            onChange={e => setEditingTool({...editingTool, name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key (Variable)</label>
            <input 
              required
              className="w-full bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none font-mono"
              placeholder="e.g. page_id"
              value={editingTool.key}
              onChange={e => setEditingTool({...editingTool, key: e.target.value})}
            />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Input Type</label>
             <div className="relative">
                <select 
                  className="w-full bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none appearance-none"
                  value={editingTool.type}
                  onChange={e => setEditingTool({...editingTool, type: e.target.value as any})}
                >
                  <option value="text">Short Text</option>
                  <option value="textarea">Long Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select (Dropdown)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ChevronDownIcon className="w-3 h-3" />
                </div>
             </div>
           </div>
        </div>

        {editingTool.type === 'select' && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Options (comma separated)</label>
            <input 
              className="w-full bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              placeholder="Option 1, Option 2, Option 3"
              value={editingTool.options?.join(', ') || ''}
              onChange={e => setEditingTool({...editingTool, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (Context for AI)</label>
          <textarea 
            required
            rows={3}
            className="w-full bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
            placeholder="Explain when the AI should use this tool and what data it expects."
            value={editingTool.description}
            onChange={e => setEditingTool({...editingTool, description: e.target.value})}
          />
        </div>

        <div className="flex gap-3 pt-2">
           <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
           <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Save Tool</button>
        </div>
      </form>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-800 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
                <ClipboardListIcon className="w-6 h-6" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">Form Agent Schema</h2>
               <p className="text-xs text-gray-400">Configure the input capabilities available to the agent.</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
             renderToolEditor()
          ) : (
            <div className="space-y-6">
              
              {/* Core Tools Section */}
              <section>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Core Capabilities</h3>
                 <div className="space-y-2">
                    {tools.filter(t => t.isSystem).map(tool => (
                      <div key={tool.id} className="flex items-center justify-between bg-[#151515] p-3 rounded-xl border border-gray-800/50">
                         <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-mono font-bold">
                              {tool.type === 'text' && 'Ab'}
                              {tool.type === 'textarea' && '¶'}
                              {tool.type === 'number' && '#'}
                              {tool.type === 'select' && '≡'}
                            </div>
                            <div>
                               <div className="font-medium text-sm text-gray-200">{tool.name}</div>
                               <div className="text-[10px] text-gray-500">{tool.description}</div>
                            </div>
                         </div>
                         <button onClick={() => handleToggle(tool.id)} className={`${tool.isEnabled ? 'text-blue-500' : 'text-gray-600'} transition-colors`}>
                           {tool.isEnabled ? <ToggleRightIcon className="w-8 h-8" /> : <ToggleLeftIcon className="w-8 h-8" />}
                         </button>
                      </div>
                    ))}
                 </div>
              </section>

              {/* Custom Tools Section */}
              <section>
                 <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Custom Tools</h3>
                 </div>
                 
                 <div className="space-y-2">
                    {tools.filter(t => !t.isSystem).length === 0 && (
                      <div className="text-center py-8 border border-dashed border-gray-800 rounded-xl">
                        <p className="text-sm text-gray-500">No custom tools added yet.</p>
                        <p className="text-xs text-gray-600 mt-1">Add tools to let the agent collect specific data like "Notion Page ID" or "User Email".</p>
                      </div>
                    )}

                    {tools.filter(t => !t.isSystem).map(tool => (
                       <div key={tool.id} className="flex items-center justify-between bg-[#151515] p-3 rounded-xl border border-gray-800/50 group hover:border-gray-700 transition-colors">
                         <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-blue-900/20 flex items-center justify-center text-blue-400 text-xs font-mono font-bold flex-shrink-0">
                               {tool.type.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                               <div className="font-medium text-sm text-gray-200 truncate">{tool.name} <span className="text-gray-600 font-normal font-mono text-xs ml-1">({tool.key})</span></div>
                               <div className="text-[10px] text-gray-500 truncate">{tool.description}</div>
                            </div>
                         </div>
                         <div className="flex items-center space-x-2 pl-2">
                            <button onClick={() => handleToggle(tool.id)} className={`${tool.isEnabled ? 'text-blue-500' : 'text-gray-600'} transition-colors`}>
                              {tool.isEnabled ? <ToggleRightIcon className="w-8 h-8" /> : <ToggleLeftIcon className="w-8 h-8" />}
                            </button>
                            <button onClick={() => startEdit(tool)} className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-gray-700">
                               <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(tool.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-md hover:bg-red-900/20">
                               <TrashIcon className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
              </section>

              <button 
                onClick={startAdd}
                className="w-full py-3 border border-dashed border-gray-700 rounded-xl flex items-center justify-center space-x-2 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-[#1a1a1a] transition-all"
              >
                 <PlusIcon className="w-5 h-5" />
                 <span className="text-sm font-medium">Add Module Tool</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormAgentSettings;
