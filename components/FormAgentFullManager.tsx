
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FormTool, Message, MessagePart, Todo } from '../types';
import { 
  XIcon, PlusIcon, TrashIcon, EditIcon, ToggleRightIcon, ToggleLeftIcon, 
  ClipboardListIcon, ChevronDownIcon, SendIcon, SparklesIcon, RefreshIcon, CheckIcon,
  CameraIcon, FileIcon, ImageIcon, MicIcon, SettingsAdjustIcon, ChevronRightIcon
} from './Icons';
import { geminiService, AttachmentData } from '../services/gemini';
import { getFormAgentSystemPrompt } from '../utils';
import FormAgentCard from './FormAgentCard';

interface FormAgentFullManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tools: FormTool[];
  onUpdateTools: (tools: FormTool[]) => void;
  // Todo Props from App
  todos: Todo[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  selectedModel?: string; // Passed from App
}

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  base64: string;
  mimeType: string;
}

const FormAgentFullManager: React.FC<FormAgentFullManagerProps> = ({ 
  isOpen, 
  onClose, 
  tools, 
  onUpdateTools,
  todos,
  onAddTodo,
  onToggleTodo,
  selectedModel: propSelectedModel
}) => {
  // --- Left Pane State ---
  const [editingTool, setEditingTool] = useState<FormTool | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdvancedCollapsed, setIsAdvancedCollapsed] = useState(true);

  // --- Right Pane (Preview) State ---
  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Input Area State (Copied from App.tsx) ---
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(propSelectedModel || 'gemini-3-flash-preview');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (propSelectedModel) {
        setSelectedModel(propSelectedModel);
    }
  }, [propSelectedModel]);

  const ACCEPTED_FILE_TYPES = [
    '.pdf', '.docx', '.doc', '.dotx', '.txt', '.rtf', '.html', '.md', '.epub',
    '.xlsx', '.xls', '.csv', '.tsv',
    'image/*', '.heic', '.heif',
    '.py', '.js', '.c', '.cpp', '.java', '.css',
    '.mp4', '.mpeg', '.mov', '.avi', '.flv', '.mpg', '.webm', '.wmv', '.3gpp',
    'audio/*'
  ].join(',');

  useEffect(() => {
    if (isOpen) {
        // Reset preview when opened
        setPreviewMessages([{
            id: 'system_welcome',
            role: 'model',
            parts: [{ text: '<response>Hello! I am the Form Agent Preview. Configure your fields on the left, and test me right here.</response>' }],
            timestamp: Date.now()
        }]);
        setAttachments([]);
        setInputValue('');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [previewMessages, isTyping]);

  if (!isOpen) return null;

  // --- Left Pane Logic ---
  const handleToggle = (id: string) => {
    onUpdateTools(tools.map(t => t.id === id ? { ...t, isEnabled: !t.isEnabled } : t));
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this tool?')) {
      onUpdateTools(tools.filter(t => t.id !== id));
    }
  };

  const handleSaveTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;
    if (tools.some(t => t.id === editingTool.id)) {
      onUpdateTools(tools.map(t => t.id === editingTool.id ? editingTool : t));
    } else {
      onUpdateTools([...tools, editingTool]);
    }
    setIsEditing(false);
    setEditingTool(null);
  };

  const startAdd = () => {
    setEditingTool({ id: Date.now().toString(), name: '', key: '', type: 'text', description: '', isEnabled: true, options: [] });
    setIsEditing(true);
  };

  const startEdit = (tool: FormTool) => {
    setEditingTool({ ...tool });
    setIsEditing(true);
  };
  
  // Auto-generate key from name
  const handleNameChange = (newName: string) => {
      if (!editingTool) return;
      // Simple snake_case conversion
      const generatedKey = newName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      
      // Update name
      const updatedTool = { ...editingTool, name: newName };
      
      // Only auto-update key if it's new (id timestamp is close to now) or user hasn't heavily modified it
      // For simplicity here: if key was empty or matches previous auto-gen logic, update it.
      // We'll just always update key if it matches the 'old' name transformation or if it's empty
      const oldKey = editingTool.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
      if (!editingTool.key || editingTool.key === oldKey || editingTool.key === '') {
          updatedTool.key = generatedKey;
      }
      
      setEditingTool(updatedTool);
  };

  // --- Input & Attachment Logic ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAttachments: PendingAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });

        try {
          const result = await base64Promise;
          const base64Data = result.split(',')[1];
          let previewUrl = undefined;
          if (file.type.startsWith('image/')) previewUrl = result;

          let mimeType = file.type;
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'epub') mimeType = 'application/epub+zip';
          else if (ext === 'md' && !mimeType) mimeType = 'text/markdown';
          else if (!mimeType) mimeType = 'application/octet-stream';

          newAttachments.push({ file, previewUrl, base64: base64Data, mimeType });
        } catch (error) { console.error("Error reading file:", error); }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      setIsAttachmentMenuOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getModelLabel = (model: string) => {
    if (model.includes('3-pro')) return '3 Pro';
    if (model.includes('3-flash')) return '3 Flash';
    if (model.includes('2.5-flash')) return '2.5 Flash';
    return 'Pro';
  };

  // --- Right Pane Logic (Chat) ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && attachments.length === 0) || isTyping) return;
    
    await processMessage(inputValue);
  };

  const processMessage = async (text: string, isHiddenSubmission = false) => {
    const currentAttachments = [...attachments];
    
    if (!isHiddenSubmission) {
        setInputValue('');
        setAttachments([]);
    }
    
    setIsTyping(true);
    setIsAttachmentMenuOpen(false);
    setIsModelSelectorOpen(false);

    try {
        const messageParts: MessagePart[] = [];
        const serviceAttachments: AttachmentData[] = [];

        for (const att of currentAttachments) {
            if (att.mimeType.startsWith('image/')) {
                serviceAttachments.push({ mimeType: att.mimeType, data: att.base64 });
                messageParts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
            } else {
                try {
                    const uploadResult = await geminiService.uploadFile(att.file, att.mimeType);
                    serviceAttachments.push({ mimeType: uploadResult.mimeType, fileUri: uploadResult.uri });
                    messageParts.push({ fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } });
                } catch (e) {
                    console.warn("Upload failed in preview", e);
                    messageParts.push({ text: `[File Upload Failed: ${att.file.name}]` });
                }
            }
        }

        if (text.trim()) {
            messageParts.push({ text });
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            parts: messageParts,
            timestamp: Date.now()
        };

        const newHistory = [...previewMessages, userMsg];
        setPreviewMessages(newHistory);

        const systemPrompt = getFormAgentSystemPrompt(tools);
        
        const response = await geminiService.generateChatResponse(
            selectedModel,
            newHistory,
            '', 
            systemPrompt,
            { useThinking: false },
            serviceAttachments
        );

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            parts: [{ text: response.text }],
            timestamp: Date.now(),
            model: selectedModel
        };
        setPreviewMessages(prev => [...prev, aiMsg]);

    } catch (error: any) {
        setPreviewMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            parts: [{ text: `Error: ${error.message}` }],
            timestamp: Date.now()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleFormSubmit = async (messageId: string, data: Record<string, any>) => {
     setPreviewMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, formSubmission: { submittedAt: Date.now(), values: data } } : m
     ));
     
     const hiddenPrompt = `[SYSTEM_ANNOTATION: Form Submission Data]\n${JSON.stringify(data, null, 2)}`;
     await processMessage(hiddenPrompt, true);
  };

  const renderToolEditor = () => {
    if (!editingTool) return null;
    return (
      <form onSubmit={handleSaveTool} className="space-y-4 p-4 bg-[#151515] rounded-xl border border-gray-800 animate-in slide-in-from-left-4 duration-200">
        <h3 className="text-sm font-bold text-white mb-2">{tools.some(t => t.id === editingTool.id) ? 'Edit Tool' : 'New Tool'}</h3>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tool Name</label>
          <input required className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none" placeholder="e.g. Project Deadline" value={editingTool.name} onChange={e => handleNameChange(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
           <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key (Auto-generated)</label>
            <input required className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none font-mono" placeholder="project_deadline" value={editingTool.key} onChange={e => setEditingTool({...editingTool, key: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
             <select className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none" value={editingTool.type} onChange={e => setEditingTool({...editingTool, type: e.target.value as any})}>
                  <optgroup label="Core">
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select (Dropdown)</option>
                  </optgroup>
                   <optgroup label="Todo System">
                    <option value="todo_list">Todo List (Display)</option>
                    <option value="todo_add">Add Todo Input</option>
                    <option value="todo_selector">Todo Selector</option>
                  </optgroup>
                  <optgroup label="Input Types">
                    <option value="short_text_input">Short Text Input</option>
                    <option value="long_text_input">Long Text Input</option>
                    <option value="email_input">Email Input</option>
                    <option value="phone_input">Phone Input</option>
                    <option value="number_input">Number Input</option>
                    <option value="link_input">Link (URL) Input</option>
                    <option value="currency_input">Currency Input</option>
                    <option value="address_input">Address Input</option>
                  </optgroup>
                  <optgroup label="Choices">
                    <option value="multiple_choice">Multiple Choice (Radio)</option>
                    <option value="checkboxes">Checkboxes</option>
                    <option value="single_select">Single Select</option>
                    <option value="multi_select">Multi Select</option>
                  </optgroup>
                  <optgroup label="Scales & Ratings">
                    <option value="rating">Rating (Stars)</option>
                    <option value="opinion_scale">Opinion Scale</option>
                    <option value="range_slider">Range Slider</option>
                    <option value="ranking_input">Ranking</option>
                  </optgroup>
                  <optgroup label="Date & Time">
                    <option value="date_picker">Date Picker</option>
                    <option value="time_input">Time Input</option>
                  </optgroup>
                  <optgroup label="Advanced">
                    <option value="file_upload">File Upload</option>
                    <option value="signature_input">Signature</option>
                    <option value="geo_capture">Geo Capture</option>
                  </optgroup>
             </select>
           </div>
        </div>
        
        {editingTool.type === 'todo_list' && (
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filter</label>
             <select className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none" value={editingTool.filter || 'all'} onChange={e => setEditingTool({...editingTool, filter: e.target.value as any})}>
                <option value="all">All Tasks</option>
                <option value="active">Active Only</option>
                <option value="completed">Completed Only</option>
             </select>
           </div>
        )}
        
        {['select', 'multiple_choice', 'checkboxes', 'single_select', 'multi_select', 'ranking_input'].includes(editingTool.type) && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Options</label>
            <input className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none" placeholder="A, B, C" value={editingTool.options?.join(', ') || ''} onChange={e => setEditingTool({...editingTool, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
          <textarea required rows={3} className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none" placeholder="Instructions for the AI..." value={editingTool.description} onChange={e => setEditingTool({...editingTool, description: e.target.value})} />
        </div>
        <div className="flex gap-2 pt-2">
           <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-lg bg-gray-800 text-xs font-medium">Cancel</button>
           <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium">Save</button>
        </div>
      </form>
    );
  };

  const coreTools = tools.filter(t => ['text', 'textarea', 'number', 'select'].includes(t.type));
  const advancedTools = tools.filter(t => t.isSystem && !['text', 'textarea', 'number', 'select'].includes(t.type));
  const customTools = tools.filter(t => !t.isSystem);

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0e0e] flex flex-row animate-in fade-in duration-300 font-sans">
      
      {/* --- LEFT PANE: Editor --- */}
      <div className="w-[400px] border-r border-gray-800 flex flex-col bg-[#1e1e1e] shadow-xl z-10">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1e1e1e]">
          <div className="flex items-center space-x-3">
             <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
               <XIcon className="w-5 h-5" />
             </button>
             <div>
               <h2 className="text-base font-bold text-white flex items-center gap-2">
                 <ClipboardListIcon className="w-4 h-4 text-blue-400" />
                 Schema Manager
               </h2>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
           {isEditing ? renderToolEditor() : (
             <div className="space-y-6">
                <section>
                   <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Core Fields</h3>
                   <div className="space-y-2">
                      {coreTools.map(tool => (
                        <div key={tool.id} className="flex items-center justify-between bg-[#151515] p-3 rounded-xl border border-gray-800/50">
                           <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-mono font-bold">
                                {tool.type === 'text' ? 'Ab' : tool.type === 'textarea' ? '¶' : tool.type === 'number' ? '#' : '≡'}
                              </div>
                              <span className="font-medium text-sm text-gray-200">{tool.name}</span>
                           </div>
                           <button onClick={() => handleToggle(tool.id)} className={`${tool.isEnabled ? 'text-blue-500' : 'text-gray-600'} transition-colors`}>
                             {tool.isEnabled ? <ToggleRightIcon className="w-8 h-8" /> : <ToggleLeftIcon className="w-8 h-8" />}
                           </button>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                    <div 
                        className="flex items-center justify-between mb-3 cursor-pointer group"
                        onClick={() => setIsAdvancedCollapsed(!isAdvancedCollapsed)}
                    >
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-300 flex items-center gap-2">
                            Advanced & System Fields 
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isAdvancedCollapsed ? '-rotate-90' : ''}`} />
                        </h3>
                        <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">{advancedTools.filter(t => t.isEnabled).length} active</span>
                    </div>
                    
                    {!isAdvancedCollapsed && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                             {advancedTools.map(tool => (
                                <div key={tool.id} className="flex items-center justify-between bg-[#151515] p-3 rounded-xl border border-gray-800/50">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-mono font-bold">
                                       {tool.type.includes('todo') ? 'TD' : tool.type.split('_')[0].substring(0,2).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-sm text-gray-200">{tool.name}</span>
                                </div>
                                <button onClick={() => handleToggle(tool.id)} className={`${tool.isEnabled ? 'text-blue-500' : 'text-gray-600'} transition-colors`}>
                                    {tool.isEnabled ? <ToggleRightIcon className="w-8 h-8" /> : <ToggleLeftIcon className="w-8 h-8" />}
                                </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                   <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Custom Modules</h3>
                      <button onClick={startAdd} className="p-1 hover:bg-gray-800 rounded text-blue-400"><PlusIcon className="w-4 h-4" /></button>
                   </div>
                   <div className="space-y-2">
                      {customTools.length === 0 && (
                        <div className="text-center py-6 border border-dashed border-gray-800 rounded-xl bg-[#151515]/50">
                          <p className="text-xs text-gray-500">No custom tools.</p>
                        </div>
                      )}
                      {customTools.map(tool => (
                         <div key={tool.id} className="bg-[#151515] p-3 rounded-xl border border-gray-800/50 group hover:border-gray-700 transition-colors">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tool.isEnabled ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>{tool.key}</span>
                                <span className="text-xs text-gray-400">{tool.type}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <button onClick={() => handleToggle(tool.id)} className={`${tool.isEnabled ? 'text-blue-500' : 'text-gray-600'}`}>
                                  {tool.isEnabled ? <ToggleRightIcon className="w-6 h-6" /> : <ToggleLeftIcon className="w-6 h-6" />}
                                </button>
                                <button onClick={() => startEdit(tool)} className="p-1 text-gray-500 hover:text-white"><EditIcon className="w-3 h-3" /></button>
                                <button onClick={() => handleDelete(tool.id)} className="p-1 text-gray-500 hover:text-red-400"><TrashIcon className="w-3 h-3" /></button>
                             </div>
                           </div>
                           <div className="text-sm font-medium text-white">{tool.name}</div>
                           <div className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</div>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
           )}
        </div>
      </div>

      {/* --- RIGHT PANE: Preview --- */}
      <div className="flex-1 flex flex-col bg-[#0e0e0e] relative">
         {/* (Preview logic remains the same, reusing existing code implicitly by not changing it here significantly beyond context) */}
         <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0e0e0e]/50 backdrop-blur-md z-10">
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <h2 className="text-sm font-medium text-gray-300">Live Preview Environment</h2>
           </div>
           <button 
             onClick={() => { setPreviewMessages([]); setAttachments([]); }} 
             className="text-xs flex items-center gap-2 text-gray-500 hover:text-white bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 transition-colors"
           >
             <RefreshIcon className="w-3 h-3" />
             Reset Session
           </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {previewMessages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#151515] flex items-center justify-center border border-gray-800">
                    <ClipboardListIcon className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-sm">Start testing your form agent configuration</p>
             </div>
           )}
           
           {previewMessages.map(msg => {
             const isFormPayload = msg.role === 'model' && msg.parts.some(p => p.text?.includes('<form_payload>'));
             const isSystemSubmission = msg.role === 'user' && msg.parts.some(p => p.text?.startsWith('[SYSTEM_ANNOTATION'));
             
             if (isSystemSubmission) {
                 let submittedData = {};
                 const text = msg.parts.map(p => p.text).join('');
                 try {
                     const jsonMatch = text.match(/\[SYSTEM_ANNOTATION: Form Submission Data\]\s*([\s\S]*)/);
                     if (jsonMatch && jsonMatch[1]) submittedData = JSON.parse(jsonMatch[1]);
                 } catch (e) { console.error("Error parsing submission", e); }
          
                 return (
                   <div key={msg.id} className="flex flex-col items-end mb-8 w-full animate-in slide-in-from-bottom-2 fade-in">
                      <div className="bg-[#1c64f2] text-white p-5 rounded-2xl rounded-tr-sm max-w-[85%] shadow-lg">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                               <h3 className="font-bold text-sm">Submitted values:</h3>
                               <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <ul className="space-y-2">
                              {Object.entries(submittedData).map(([key, value]) => (
                                  <li key={key} className="flex items-start text-sm">
                                      <span className="opacity-70 mr-2 min-w-[100px] text-right font-mono text-xs pt-0.5">{key}:</span>
                                      <span className="font-medium flex-1 break-words">{String(value)}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>
                   </div>
                 );
             }

             if (isFormPayload) {
                 return (
                    <div key={msg.id} className="flex justify-start w-full animate-in slide-in-from-bottom-2 fade-in">
                        <div className="w-full max-w-2xl">
                           <FormAgentCard 
                             message={msg} 
                             onSubmit={handleFormSubmit}
                             todos={todos}
                             onAddTodo={onAddTodo}
                             onToggleTodo={onToggleTodo}
                             selectedModel={selectedModel}
                           />
                        </div>
                    </div>
                 )
             }

             return (
               <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in`}>
                 <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-[#2d2d2d] text-white' : 'text-gray-300'
                 }`}>
                     {msg.parts.map((part, i) => (
                        <div key={i} className="mb-2 last:mb-0 w-full">
                           {/* ... rendering logic identical to original ... */}
                           {part.inlineData && part.inlineData.mimeType.startsWith('image') && (
                            <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="Attachment" className="rounded-xl mb-3 max-w-full h-auto max-h-[300px] object-cover" />
                          )}
                          {part.fileData && (
                             <div className="flex items-center p-3 bg-black/20 rounded-lg mb-2">
                              <FileIcon className="w-6 h-6 mr-2 text-green-400" />
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-200 font-medium">Document Uploaded</span>
                                <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{part.fileData.mimeType}</span>
                              </div>
                            </div>
                          )}
                          {part.text && (
                             <div className="markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                   {part.text.replace(/<response>|<\/response>/g, '')}
                                </ReactMarkdown>
                             </div>
                          )}
                        </div>
                     ))}
                 </div>
               </div>
             )
           })}
           
           {isTyping && (
             <div className="flex items-center gap-2 text-gray-500 text-xs pl-2">
                <SparklesIcon className="w-3 h-3 animate-pulse text-blue-500" />
                Agent is thinking...
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 pt-0 bg-transparent pointer-events-none">
           <div className="max-w-3xl mx-auto pointer-events-auto relative">
                {/* ... input logic identical to original ... */}
                {(isAttachmentMenuOpen || isModelSelectorOpen) && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity" onClick={() => { setIsAttachmentMenuOpen(false); setIsModelSelectorOpen(false); }} />
                )}

                {/* Attachments Menu */}
                {isAttachmentMenuOpen && (
                    <div className="bg-[#1e1e1e] rounded-[32px] p-2 custom-shadow mb-2 border border-gray-800 animate-in slide-in-from-bottom-10 fade-in duration-200 absolute bottom-full left-0 right-0 z-50">
                      <div className="grid grid-cols-1 gap-1">
                        <button className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><CameraIcon className="w-5 h-5 mr-4 text-gray-400" /> Camera</button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><FileIcon className="w-5 h-5 mr-4 text-gray-400" /> Upload (Images/PDF/EPUB)</button>
                        <button className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><ImageIcon className="w-5 h-5 mr-4 text-gray-400" /> Photos</button>
                      </div>
                    </div>
                )}

                {/* Model Selector */}
                {isModelSelectorOpen && (
                    <div className="bg-[#1e1e1e] rounded-[32px] p-2 custom-shadow mb-2 border border-gray-800 animate-in slide-in-from-bottom-10 fade-in duration-200 absolute bottom-full left-0 right-0 z-50">
                      <p className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Model selection</p>
                      <div className="grid grid-cols-1 gap-1">
                        <button onClick={() => { setSelectedModel('gemini-3-pro-preview'); setIsModelSelectorOpen(false); }} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === 'gemini-3-pro-preview' ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">Gemini 3 Pro</span><span className="text-xs text-gray-500">Next-gen reasoning engine</span></button>
                        <button onClick={() => { setSelectedModel('gemini-3-flash-preview'); setIsModelSelectorOpen(false); }} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === 'gemini-3-flash-preview' ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">Gemini 3 Flash</span><span className="text-xs text-gray-500">Next-gen speed model</span></button>
                        <button onClick={() => { setSelectedModel('gemini-2.5-flash-preview-09-2025'); setIsModelSelectorOpen(false); }} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === 'gemini-2.5-flash-preview-09-2025' ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">Gemini 2.5 Flash</span><span className="text-xs text-gray-500">Fast and efficient</span></button>
                      </div>
                    </div>
                )}

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept={ACCEPTED_FILE_TYPES} multiple />

                <form onSubmit={handleSendMessage} className="bg-[#1e1e1e] rounded-[32px] border border-gray-800 shadow-2xl transition-all p-4 mb-4 relative z-40">
                    {attachments.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                        {attachments.map((att, idx) => (
                          <div key={idx} className="relative group flex-shrink-0">
                            <button onClick={() => removeAttachment(idx)} type="button" className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10 border border-[#1e1e1e]">✕</button>
                            {att.previewUrl ? <img src={att.previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-700" /> : <div className="h-16 w-16 bg-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-700 p-1"><FileIcon className="w-6 h-6 text-gray-400 mb-1" /><span className="text-[8px] text-gray-400 w-full text-center truncate px-1">{att.file.name.split('.').pop()?.toUpperCase()}</span></div>}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="w-full">
                      <textarea 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder="Type a message to test..."
                        className="w-full bg-transparent border-none outline-none text-[17px] text-[#e3e3e3] placeholder-gray-500 resize-none min-h-[24px] max-h-40 leading-relaxed"
                        rows={1}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-5">
                       <div className="flex items-center space-x-2">
                          <button type="button" onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} className="p-2 text-gray-400 hover:text-white transition-colors"><PlusIcon className="w-6 h-6" /></button>
                       </div>
                       <div className="flex items-center space-x-3">
                           <button type="button" onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)} className="flex items-center space-x-1 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors text-sm font-medium text-gray-400">
                              <span>{getModelLabel(selectedModel)}</span><span className="text-[8px] opacity-40 ml-1">▼</span>
                           </button>
                           {(inputValue.trim() || attachments.length > 0) ? (
                              <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-full shadow-lg active:scale-95 transition-all"><SendIcon className="w-5 h-5" /></button>
                           ) : (
                              <button type="button" className="p-2.5 text-gray-400 hover:text-white transition-colors"><MicIcon className="w-6 h-6" /></button>
                           )}
                       </div>
                    </div>
                </form>
                <div className="text-center pb-2">
                   <p className="text-[10px] text-gray-600">Changes in the left panel apply immediately to the next turn.</p>
                </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default FormAgentFullManager;
