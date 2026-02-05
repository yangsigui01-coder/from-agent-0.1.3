
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Chat, Gem, FeatureType, MessagePart, FormTool, Todo, ApiSettings, FormPayload, SavedForm } from './types';
import Sidebar from './components/Sidebar';
import GemEditor from './components/GemEditor';
import GemManager from './components/GemManager';
import TodoManager from './components/TodoManager';
import FormAgentCard from './components/FormAgentCard';
import FormAgentFullManager from './components/FormAgentFullManager';
import GeneralSettings from './components/GeneralSettings'; 
import FormLibraryMenu from './components/FormLibraryMenu';
import { geminiService, ChatConfig, AttachmentData } from './services/gemini';
import { dbService } from './services/db';
import { getFormAgentSystemPrompt } from './utils';
import { TODO_TOOLS } from './tools';
import { 
  MenuIcon, PlusIcon, SendIcon, MicIcon, SparklesIcon, CameraIcon, FileIcon, ImageIcon, 
  AiFeatureIcon, MoreIcon, ShareIcon, SearchIcon, BananaIcon, VideoIcon, CanvasIcon, 
  BookIcon, SettingsAdjustIcon, MapPinIcon, BrainIcon, Volume2Icon, CopyIcon, CheckIcon, 
  ThumbUpIcon, ThumbDownIcon, RefreshIcon, ClipboardListIcon, ChevronDownIcon, TaskListIcon,
  BookmarkIcon 
} from './components/Icons';

type FeatureMode = 'text' | 'image' | 'video' | 'audio';

interface ActiveFeature {
  id: string;
  name: string;
  mode: FeatureMode;
  model: string;
  placeholder: string;
  icon: React.ReactNode;
  config?: ChatConfig;
}

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  base64: string;
  mimeType: string;
}

const DEFAULT_FORM_TOOLS: FormTool[] = [
  { id: 'sys_text', name: 'Short Text', key: 'text_input', type: 'text', description: 'General purpose short text input.', isEnabled: true, isSystem: true },
  { id: 'sys_textarea', name: 'Long Text', key: 'long_text', type: 'textarea', description: 'Multi-line text area for detailed descriptions.', isEnabled: true, isSystem: true },
  { id: 'sys_number', name: 'Number', key: 'number_input', type: 'number', description: 'Numeric input values.', isEnabled: true, isSystem: true },
  { id: 'sys_select', name: 'Select', key: 'select_input', type: 'select', description: 'Dropdown selection from a list of options.', isEnabled: true, isSystem: true },
  { id: 'adv_email', name: 'Email Input', key: 'email', type: 'email_input', description: 'Validates email format.', isEnabled: true, isSystem: true },
  { id: 'adv_phone', name: 'Phone Input', key: 'phone', type: 'phone_input', description: 'Phone number with country code.', isEnabled: true, isSystem: true },
  { id: 'adv_multi_choice', name: 'Multiple Choice', key: 'choices', type: 'multiple_choice', description: 'Radio buttons for single selection.', isEnabled: true, isSystem: true, options: ['Option 1', 'Option 2'] },
  { id: 'adv_checkboxes', name: 'Checkboxes', key: 'checks', type: 'checkboxes', description: 'Select multiple options.', isEnabled: true, isSystem: true, options: ['Check A', 'Check B'] },
  { id: 'adv_rating', name: 'Rating', key: 'rating', type: 'rating', description: 'Star rating (1-5).', isEnabled: true, isSystem: true, max: 5 },
  { id: 'adv_date', name: 'Date Picker', key: 'date', type: 'date_picker', description: 'Select a calendar date.', isEnabled: true, isSystem: true },
  { id: 'adv_time', name: 'Time Input', key: 'time', type: 'time_input', description: 'Select time.', isEnabled: true, isSystem: true },
  { id: 'adv_range', name: 'Range Slider', key: 'range', type: 'range_slider', description: 'Slider for value range.', isEnabled: true, isSystem: true, min: 0, max: 100, step: 1 },
  { id: 'adv_link', name: 'Link Input', key: 'url', type: 'link_input', description: 'URL input.', isEnabled: true, isSystem: true },
  { id: 'adv_file', name: 'File Upload', key: 'file', type: 'file_upload', description: 'Upload documents/images.', isEnabled: true, isSystem: true },
  { id: 'adv_signature', name: 'Signature', key: 'signature', type: 'signature_input', description: 'Handwritten signature pad.', isEnabled: false, isSystem: true },
  { id: 'adv_currency', name: 'Currency', key: 'amount', type: 'currency_input', description: 'Monetary value input.', isEnabled: true, isSystem: true, currency: 'USD' },
  { id: 'adv_geo', name: 'Geo Location', key: 'location', type: 'geo_capture', description: 'Capture user coordinates.', isEnabled: false, isSystem: true },
  
  // --- TODO INTEGRATION ---
  { id: 'sys_todo_list', name: 'Todo List', key: 'tasks', type: 'todo_list', description: 'Display and manage a list of tasks.', isEnabled: true, isSystem: true, filter: 'active' },
  { id: 'sys_todo_add', name: 'Add Todo', key: 'new_task', type: 'todo_add', description: 'Input to add a new task to the system.', isEnabled: true, isSystem: true },
  { id: 'sys_todo_select', name: 'Select Todo', key: 'selected_task', type: 'todo_selector', description: 'Dropdown to select an existing task.', isEnabled: true, isSystem: true },
];

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 my-4 bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 border-b border-gray-700">
        <span className="font-mono">{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center hover:text-white transition-colors" title="Copy code">
          {isCopied ? <CheckIcon className="w-4 h-4 mr-1 text-green-400" /> : <CopyIcon className="w-4 h-4 mr-1" />}
        </button>
      </div>
      <div className="overflow-x-auto p-0">
        <pre className="!m-0 !rounded-none !border-none !bg-transparent !p-4">
          <code className={`language-${language} !bg-transparent !p-0`}>{value}</code>
        </pre>
      </div>
    </div>
  );
};

const features: ActiveFeature[] = [
  { id: 'search', name: 'Deep Research', mode: 'text', model: 'gemini-3-pro-preview', placeholder: 'Ask complex questions requiring web research...', icon: <SearchIcon className="w-5 h-5 text-blue-400" />, config: { useSearch: true } },
  { id: 'thinking', name: 'Deep Thinking', mode: 'text', model: 'gemini-3-pro-preview', placeholder: 'Ask questions that require deep reasoning...', icon: <BrainIcon className="w-5 h-5 text-purple-400" />, config: { useThinking: true } },
  { id: 'image', name: 'Create Image', mode: 'image', model: 'gemini-3-pro-image-preview', placeholder: 'Describe the image you want to create...', icon: <ImageIcon className="w-5 h-5 text-pink-400" /> },
  { id: 'video', name: 'Create Video', mode: 'video', model: 'veo-3.1-fast-generate-preview', placeholder: 'Describe the video you want to create...', icon: <VideoIcon className="w-5 h-5 text-orange-400" /> },
  { id: 'speech', name: 'Speech', mode: 'audio', model: 'gemini-2.5-flash-native-audio-preview-12-2025', placeholder: 'Type to hear the response...', icon: <Volume2Icon className="w-5 h-5 text-green-400" />, config: { isTTS: true } },
  { id: 'maps', name: 'Maps Grounding', mode: 'text', model: 'gemini-2.5-flash-preview-09-2025', placeholder: 'Ask for places or directions...', icon: <MapPinIcon className="w-5 h-5 text-red-400" />, config: { useMaps: true } }
];

const App: React.FC = () => {
  // ... (State identical) ...
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGemEditor, setShowGemEditor] = useState(false);
  const [isGemManagerOpen, setIsGemManagerOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isFormAgentManagerOpen, setIsFormAgentManagerOpen] = useState(false);
  const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
  const [isTodoManagerOpen, setIsTodoManagerOpen] = useState(false);
  const [isTodoAiEnabled, setIsTodoAiEnabled] = useState(true); 
  const [isFormLibraryOpen, setIsFormLibraryOpen] = useState(false); // New state for library menu

  // Initial Settings with default models
  const [apiSettings, setApiSettings] = useState<ApiSettings>({ 
      provider: 'gemini', 
      openai: { 
          baseUrl: 'http://127.0.0.1:8045/v1', 
          apiKey: 'sk-17e90131b49f4b5e9673eed0d0b34e01', 
          model: 'gpt-4o', 
          availableModels: [], 
          selectedModels: [
              'claude-opus-4-5-thinking',
              'claude-sonnet-4-5',
              'gemini-3-flash',
              'gemini-3-pro'
          ] 
      } 
  });
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editingGem, setEditingGem] = useState<Gem | undefined>(undefined);
  const [chats, setChats] = useState<Chat[]>([]);
  const [gems, setGems] = useState<Gem[]>([
    { id: 'default-gem-1', name: '生成书籍领航员', description: '将静态书籍转化为动态AI技能', instructions: '你是顶级教学设计师和Prompt工程师，擅长分析书籍核心逻辑并转化为实操指南。', color: 'bg-blue-600' },
    { id: 'thinking-gem', name: '思考模式', description: '深度逻辑分析与推演', instructions: '始终开启深度思考，分步骤拆解问题，注重逻辑严密性。', color: 'bg-purple-600' }
  ]);
  const [formTools, setFormTools] = useState<FormTool[]>(DEFAULT_FORM_TOOLS);
  const [savedForms, setSavedForms] = useState<SavedForm[]>([]); // New state for saved forms

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [activeGem, setActiveGem] = useState<Gem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isAiFeatureMenuOpen, setIsAiFeatureMenuOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveFeature | null>(null);
  const [isFormAgentMode, setIsFormAgentMode] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-preview'); 
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentChat = chats.find(c => c.id === currentChatId);
  const ACCEPTED_FILE_TYPES = ['.pdf', '.docx', '.doc', '.dotx', '.txt', '.rtf', '.html', '.md', '.epub', '.xlsx', '.xls', '.csv', '.tsv', 'image/*', '.heic', '.heif', '.py', '.js', '.c', '.cpp', '.java', '.css', '.mp4', '.mpeg', '.mov', '.avi', '.flv', '.mpg', '.webm', '.wmv', '.3gpp', 'audio/*'].join(',');

  useEffect(() => {
    const initTodos = async () => { 
        const loadedTodos = await dbService.getAllTodos(); 
        setTodos(loadedTodos); 
    };
    initTodos();
    const savedChats = localStorage.getItem('gemini_chats'); if (savedChats) setChats(JSON.parse(savedChats));
    const savedGems = localStorage.getItem('gemini_gems'); if (savedGems) setGems(JSON.parse(savedGems));
    const savedTools = localStorage.getItem('gemini_form_tools'); if (savedTools) setFormTools(JSON.parse(savedTools));
    const savedApiSettings = localStorage.getItem('gemini_api_settings'); if (savedApiSettings) { const parsedSettings = JSON.parse(savedApiSettings); setApiSettings(prev => ({ ...prev, ...parsedSettings, openai: { ...prev.openai, ...(parsedSettings.openai || {}) } })); }
    
    // Load saved forms
    const storedForms = localStorage.getItem('gemini_saved_forms');
    if (storedForms) setSavedForms(JSON.parse(storedForms));
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_chats', JSON.stringify(chats));
    localStorage.setItem('gemini_gems', JSON.stringify(gems));
    localStorage.setItem('gemini_form_tools', JSON.stringify(formTools));
    localStorage.setItem('gemini_api_settings', JSON.stringify(apiSettings));
    localStorage.setItem('gemini_saved_forms', JSON.stringify(savedForms));
  }, [chats, gems, formTools, apiSettings, savedForms]);

  // ... (Handlers same as before) ...
  const handleAddTodo = async (text: string, parentId?: string) => { 
      const newTodo: Todo = { 
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
          text, 
          completed: false, 
          createdAt: Date.now(), 
          parentId,
          timeSpent: 0 
      }; 
      setTodos(prev => [...prev, newTodo]); 
      await dbService.addTodo(newTodo); 
      return newTodo.id; 
  };
  
  const handleReorderTodos = (newTodos: Todo[]) => {
      setTodos(newTodos);
  };

  const handleToggleTodo = async (id: string) => { const todo = todos.find(t => t.id === id); if (todo) { const updatedTodo = { ...todo, completed: !todo.completed }; setTodos(prev => prev.map(t => t.id === id ? updatedTodo : t)); await dbService.updateTodo(updatedTodo); } };
  
  const handleUpdateTodo = async (todo: Todo) => {
      setTodos(prev => prev.map(t => t.id === todo.id ? todo : t));
      await dbService.updateTodo(todo);
  };

  const handleDeleteTodo = async (id: string) => { setTodos(prev => prev.filter(t => t.id !== id)); await dbService.deleteTodo(id); };

  // Scroll to bottom when typing or receiving messages in current chat
  useEffect(() => { 
      if (chatContainerRef.current && isTyping) {
          chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
      }
  }, [isTyping, currentChat?.messages.length]); 

  // Scroll to last user message when switching chats
  useEffect(() => {
      if (currentChatId && currentChat?.messages.length > 0) {
          const lastUserMsg = [...currentChat.messages].reverse().find(m => m.role === 'user');
          if (lastUserMsg) {
              setTimeout(() => {
                  const el = document.getElementById(`message-${lastUserMsg.id}`);
                  if (el) {
                      el.scrollIntoView({ block: 'start', behavior: 'auto' });
                  } else {
                      if(chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                  }
              }, 100);
          } else {
             if(chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
      }
  }, [currentChatId]);

  useEffect(() => { if (!isFormAgentMode) setIsInputExpanded(true); }, [isFormAgentMode]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => { const val = e.target.value; setInputValue(val); if (isTodoAiEnabled) { const lastAt = val.lastIndexOf('@'); if (lastAt !== -1 && lastAt >= val.length - 30) { const query = val.slice(lastAt + 1); setMentionQuery(query); return; } } setMentionQuery(null); };
  const handleMentionSelect = (todo: Todo) => { const lastAt = inputValue.lastIndexOf('@'); const prefix = inputValue.slice(0, lastAt); const suffix = " "; const insert = `task "${todo.text}" (ID: ${todo.id})`; setInputValue(prefix + insert + suffix); setMentionQuery(null); };
  const handleModelSelect = (model: string, provider: 'gemini' | 'openai') => { setSelectedModel(model); setIsModelSelectorOpen(false); setActiveFeature(null); setApiSettings(prev => ({ ...prev, provider: provider, openai: { ...prev.openai, model: provider === 'openai' ? model : prev.openai.model } })); };
  
  // --- Chat Logic ---
  const handleNewChat = (specificGemId?: string) => { const targetGem = specificGemId ? gems.find(g => g.id === specificGemId) : null; const newChat: Chat = { id: Date.now().toString(), title: 'New Chat', messages: [], updatedAt: Date.now(), gemId: specificGemId }; setChats(prev => [newChat, ...prev]); setCurrentChatId(newChat.id); setActiveGem(targetGem || null); setActiveFeature(null); setAttachments([]); setInputValue(''); setIsGemManagerOpen(false); setIsSettingsMenuOpen(false); setIsFormAgentManagerOpen(false); setIsTodoManagerOpen(false); setIsGeneralSettingsOpen(false); };
  const handleSelectGem = (gemId: string) => { handleNewChat(gemId); setIsGemManagerOpen(false); };
  const handleSelectChat = (chatId: string) => { const chat = chats.find(c => c.id === chatId); if (chat) { setCurrentChatId(chatId); if (chat.gemId) setActiveGem(gems.find(g => g.id === chat.gemId) || null); else setActiveGem(null); setActiveFeature(null); setIsSidebarOpen(false); setIsGemManagerOpen(false); setIsSettingsMenuOpen(false); setIsTodoManagerOpen(false); setIsGeneralSettingsOpen(false); } };
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => { e.stopPropagation(); setChats(prev => prev.filter(c => c.id !== chatId)); if (currentChatId === chatId) { setCurrentChatId(null); setActiveGem(null); setActiveFeature(null); } };
  const handlePinChat = (e: React.MouseEvent, chatId: string) => { e.stopPropagation(); setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c)); };
  
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
  };

  // --- SAVE FORM TO LIBRARY LOGIC ---
  const handleSaveToLibrary = (payload: FormPayload) => {
      const newForm: SavedForm = {
          id: Date.now().toString(),
          title: payload.title || "Untitled Form",
          schema: payload,
          createdAt: Date.now()
      };
      setSavedForms(prev => [newForm, ...prev]);
  };

  const handleDeleteSavedForm = (id: string) => {
      setSavedForms(prev => prev.filter(f => f.id !== id));
  };

  const handleRenameSavedForm = (id: string, newTitle: string) => {
      setSavedForms(prev => prev.map(f => f.id === id ? { ...f, title: newTitle } : f));
  };

  const handleLoadSavedForm = async (form: SavedForm) => {
      // Simulate Model message to inject the form
      const payloadString = JSON.stringify(form.schema);
      const formMessageContent = `<form_payload>${payloadString}</form_payload>`;
      
      const newMessage: Message = {
          id: Date.now().toString(),
          role: 'model',
          parts: [{ text: formMessageContent }],
          timestamp: Date.now(),
          model: 'system-injected'
      };

      if (!currentChatId) {
          handleNewChat();
          // Need to wait for state update or use functional update pattern heavily, 
          // simplest is to just append to the new chat created.
          // Due to closure, currentChatId is still null.
          // We'll rely on setChats functional update looking for the latest chat.
          setChats(prev => {
              const latest = prev[0]; // Assuming new chat is at 0
              if (latest) {
                  return prev.map(c => c.id === latest.id ? { ...c, messages: [...c.messages, newMessage] } : c);
              }
              return prev;
          });
      } else {
          setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, newMessage] } : c));
      }
  };

  const handleDeleteGem = (e: React.MouseEvent, gemId: string) => { e.stopPropagation(); if (window.confirm("Are you sure?")) { setGems(prev => prev.filter(g => g.id !== gemId)); if (activeGem?.id === gemId) { setActiveGem(null); setCurrentChatId(null); } } };
  const handlePinGem = (e: React.MouseEvent, gemId: string) => { e.stopPropagation(); setGems(prev => prev.map(g => g.id === gemId ? { ...g, isPinned: !g.isPinned } : g)); };
  const handleEditGem = (gemId: string) => { const gemToEdit = gems.find(g => g.id === gemId); if (gemToEdit) { setEditingGem(gemToEdit); setShowGemEditor(true); setIsSidebarOpen(false); } };
  const handleSaveGem = (gem: Gem) => { setGems(prev => { const exists = prev.some(g => g.id === gem.id); if (exists) return prev.map(g => g.id === gem.id ? gem : g); return [gem, ...prev]; }); setShowGemEditor(false); setEditingGem(undefined); if (activeGem?.id === gem.id) setActiveGem(gem); else if (!gems.some(g => g.id === gem.id)) handleSelectGem(gem.id); };
  const handleSelectFeature = (feature: ActiveFeature) => { setActiveFeature(feature); handleModelSelect(feature.model, 'gemini'); setIsAiFeatureMenuOpen(false); setIsFormAgentMode(false); if (!currentChatId) handleNewChat(); setIsGemManagerOpen(false); setIsTodoManagerOpen(false); };
  const playAudio = async (base64Audio: string) => { try { if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); const ctx = audioContextRef.current; const binaryString = atob(base64Audio); const len = binaryString.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i); const audioBuffer = await ctx.decodeAudioData(bytes.buffer); const source = ctx.createBufferSource(); source.buffer = audioBuffer; source.connect(ctx.destination); source.start(0); } catch (e) { console.error("Error playing audio", e); } };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAttachments: PendingAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Promise = new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result as string); reader.onerror = error => reject(error); });
        try { const result = await base64Promise; const base64Data = result.split(',')[1]; let previewUrl = undefined; if (file.type.startsWith('image/')) previewUrl = result; let mimeType = file.type; const ext = file.name.split('.').pop()?.toLowerCase(); if (ext === 'epub') mimeType = 'application/epub+zip'; else if (ext === 'md' && !mimeType) mimeType = 'text/markdown'; else if (!mimeType) mimeType = 'application/octet-stream'; newAttachments.push({ file, previewUrl, base64: base64Data, mimeType }); } catch (error) { console.error("Error reading file:", error); }
      }
      setAttachments(prev => [...prev, ...newAttachments]); setIsAttachmentMenuOpen(false); if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };
  
  const handleFormSubmit = async (messageId: string, data: Record<string, any>) => {
    setChats(prev => prev.map(c => { if (c.id !== currentChatId) return c; return { ...c, messages: c.messages.map(m => { if (m.id !== messageId) return m; return { ...m, formSubmission: { submittedAt: Date.now(), values: data } }; }) }; }));
    if (isTodoAiEnabled) {
        const parentId = data['target_parent_id'] || data['parent_id'] || data['parent_task_id']; const potentialParentId = Object.values(data).find(v => typeof v === 'string' && todos.some(t => t.id === v)); const finalParentId = parentId || potentialParentId; const subtasks = data['new_subtasks'] || data['subtasks'] || data['subtasks_list'];
        if (finalParentId && Array.isArray(subtasks)) {
            for (const text of subtasks) await handleAddTodo(text, finalParentId);
            await handleSendMessageInternal(`[SYSTEM: Successfully created ${subtasks.length} subtasks for parent ID ${finalParentId}]`, true);
            return;
        }
    }
    const hiddenPrompt = `[SYSTEM_ANNOTATION: Form Submission Data]\n${JSON.stringify(data, null, 2)}`;
    await handleSendMessageInternal(hiddenPrompt, true); 
  };
  const handleSendMessage = async (e?: React.FormEvent) => { if (e) e.preventDefault(); if ((!inputValue.trim() && attachments.length === 0) || isTyping) return; if (isFormAgentMode) setIsInputExpanded(false); await handleSendMessageInternal(inputValue); };

  // --- CORE MESSAGE LOGIC ---
  const handleSendMessageInternal = async (promptText: string, isHiddenSubmission: boolean = false) => {
    const startTime = Date.now();
    let targetChatId = currentChatId;
    if (!targetChatId) {
      const newId = Date.now().toString(); 
      // Default to "New Chat" - title will be generated later
      const newChat: Chat = { id: newId, title: 'New Chat', messages: [], updatedAt: Date.now(), gemId: activeGem?.id };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newId);
      targetChatId = newId;
    }
    const currentAttachments = [...attachments];
    const userPrompt = promptText;
    if (!isHiddenSubmission) { setInputValue(''); setAttachments([]); }
    setIsTyping(true); setIsAttachmentMenuOpen(false); setIsAiFeatureMenuOpen(false);

    // Gemini-like System Instruction
    let finalSystemInstruction = activeGem?.instructions || 'You are Gemini, a large language model trained by Google. You are helpful, harmless, and honest.';
    if (isFormAgentMode) finalSystemInstruction += `\n\n${getFormAgentSystemPrompt(formTools, isTodoAiEnabled)}`;
    
    if (isTodoAiEnabled) {
        const idMatch = userPrompt.match(/\(ID: ([a-zA-Z0-9]+)\)/);
        if (idMatch) {
            const referencedId = idMatch[1];
            const referencedTask = todos.find(t => t.id === referencedId);
            if (referencedTask) {
                const subtasks = todos.filter(t => t.parentId === referencedId);
                const contextStr = `\n[SYSTEM CONTEXT: User referenced task: ${JSON.stringify({...referencedTask, subtasks_count: subtasks.length})}. Existing subtasks: ${JSON.stringify(subtasks.map(s => s.text))}]`;
                finalSystemInstruction += contextStr;
            }
        }
        // Force strict mode for todos
        finalSystemInstruction += `\n\nIMPORTANT: When using tools, be conservative. Only create tasks if the user explicitly requests it (e.g. 'create task', 'add to list'). If the user asks to 'see', 'list', 'query', or 'check' tasks, use get_todos and display the results textually. Do not invent new tasks or subtasks unless asked.`;
    }

    try {
      const serviceAttachments: AttachmentData[] = [];
      const messageParts: MessagePart[] = [];
      for (const att of currentAttachments) {
        if (att.mimeType.startsWith('image/')) {
          serviceAttachments.push({ mimeType: att.mimeType, data: att.base64 });
          messageParts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
        } else {
          try {
             const uploadResult = await geminiService.uploadFile(att.file, att.mimeType);
             serviceAttachments.push({ mimeType: uploadResult.mimeType, fileUri: uploadResult.uri });
             messageParts.push({ fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } });
          } catch (e) { messageParts.push({ text: `[Attachment: ${att.file.name} (Upload Failed)]` }); }
        }
      }
      if (userPrompt.trim()) messageParts.push({ text: userPrompt });
      const userMessage: Message = { id: Date.now().toString(), role: 'user', parts: messageParts, timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() } : c));
      let currentHistory = chats.find(c => c.id === targetChatId)?.messages || [];
      currentHistory = [...currentHistory, userMessage];

      // TOOL LOOP
      let finished = false;
      let loopCount = 0;
      const MAX_LOOPS = 5;

      while (!finished && loopCount < MAX_LOOPS) {
          loopCount++;
          const config: ChatConfig = {
            ...activeFeature?.config,
            useSearch: activeFeature?.id === 'search',
            useThinking: activeFeature?.id === 'thinking',
            isTTS: activeFeature?.id === 'speech',
            useMaps: activeFeature?.id === 'maps',
            tools: isTodoAiEnabled ? TODO_TOOLS : undefined
          };
          if (config.useMaps && config.location === undefined) {
               try { const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject)); config.location = { latitude: position.coords.latitude, longitude: position.coords.longitude }; } catch (e) { console.warn("Could not get location", e); }
          }

          const response = await geminiService.generateChatResponse(selectedModel, currentHistory, '', finalSystemInstruction, config, [], apiSettings);

          if (response.functionCalls && response.functionCalls.length > 0) {
               const functionResponses = [];
               const aiCallMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', parts: response.functionCalls.map(fc => ({ functionCall: fc })), timestamp: Date.now(), model: apiSettings.provider === 'openai' ? apiSettings.openai.model : selectedModel };
               if (response.text) aiCallMessage.parts.unshift({ text: response.text });

               setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, messages: [...c.messages, aiCallMessage] } : c));
               currentHistory = [...currentHistory, aiCallMessage];

               for (const call of response.functionCalls) {
                   let result = { error: "Unknown function" };
                   try {
                       if (call.name === 'create_todo') {
                           const id = await handleAddTodo(call.args.text, call.args.parent_id);
                           result = { id, status: 'success' } as any;
                       } else if (call.name === 'update_todo') { await handleToggleTodo(call.args.id); result = { status: 'success' } as any; } else if (call.name === 'delete_todo') { await handleDeleteTodo(call.args.id); result = { status: 'success' } as any; } else if (call.name === 'get_todos') { const all = await dbService.getAllTodos(); result = { count: all.length, todos: all.map(t => ({id: t.id, text: t.text, completed: t.completed})) } as any; }
                   } catch (e: any) { result = { error: e.message } as any; }
                   functionResponses.push({ functionResponse: { name: call.name, response: result, id: call.id } });
               }
               const toolResponseMessage: Message = { id: (Date.now() + 2).toString(), role: 'user', parts: functionResponses, timestamp: Date.now() };
               setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, messages: [...c.messages, toolResponseMessage] } : c));
               currentHistory = [...currentHistory, toolResponseMessage];
          } else {
              const duration = (Date.now() - startTime) / 1000;
              const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', parts: [{ text: response.text }], timestamp: Date.now(), model: apiSettings.provider === 'openai' ? apiSettings.openai.model : selectedModel, groundingUrls: response.groundingChunks.map((chunk: any) => chunk.web?.uri).filter(Boolean), thinkingDuration: duration };
              setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, messages: [...c.messages, aiMessage] } : c));
              
              currentHistory = [...currentHistory, aiMessage];
              if (response.audioData) playAudio(response.audioData);
              finished = true;

              // --- AUTO TITLE GENERATION ---
              const chatTitle = chats.find(c => c.id === targetChatId)?.title;
              if (targetChatId && currentHistory.length <= 4 && (chatTitle === 'New Chat' || !chatTitle)) {
                  const firstUserMsg = currentHistory.find(m => m.role === 'user')?.parts[0].text;
                  const firstModelMsg = response.text;
                  
                  if (firstUserMsg && firstModelMsg) {
                      geminiService.generateTitle(selectedModel, firstUserMsg, firstModelMsg, apiSettings)
                          .then(newTitle => {
                              if (newTitle) handleRenameChat(targetChatId!, newTitle);
                          })
                          .catch(e => console.error("Auto-title error", e));
                  }
              }
          }
      }
    } catch (err: any) {
      console.error("Message error:", err);
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', parts: [{ text: `Error: ${err.message}` }], timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, messages: [...c.messages, errorMessage] } : c));
    } finally { setIsTyping(false); }
  };

  const getModelLabel = (model: string) => { 
      if (model.includes('3-pro')) return '3 Pro'; 
      if (model.includes('3-flash')) return '3 Flash'; 
      if (model.includes('2.5-flash')) return '2.5 Flash'; 
      return model;
  };
  const getModelPlaceholder = () => { if (apiSettings.provider === 'openai') return `Ask ${apiSettings.openai.model || 'AI'}`; if (activeFeature) return activeFeature.placeholder; return `Ask ${getModelLabel(selectedModel)}`; };

  // --- RENDER HELPERS ---
  const getGroupedMessages = (messages: Message[]) => {
      const groups: (Message | { type: 'tool-group', messages: Message[] })[] = [];
      let currentToolSequence: Message[] = [];
      const isToolMsg = (m: Message) => (m.role === 'model' && m.parts.some(p => p.functionCall)) || (m.role === 'user' && m.parts.some(p => p.functionResponse));
      messages.forEach(msg => {
          if (isToolMsg(msg)) { currentToolSequence.push(msg); } 
          else { if (currentToolSequence.length > 0) { groups.push({ type: 'tool-group', messages: [...currentToolSequence] }); currentToolSequence = []; } groups.push(msg); }
      });
      if (currentToolSequence.length > 0) { groups.push({ type: 'tool-group', messages: [...currentToolSequence] }); }
      return groups;
  };

  const renderToolGroup = (msgs: Message[], idx: number) => {
      const totalCalls = msgs.reduce((acc, m) => acc + (m.parts.filter(p => p.functionCall).length), 0);
      return (
        <div key={`group-${idx}`} className="w-full max-w-[90%] mb-4">
            <details className="group">
                <summary className="list-none cursor-pointer flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors select-none py-1 bg-[#1e1e1e]/50 rounded-lg px-3 border border-transparent hover:border-gray-800">
                    <SparklesIcon className="w-3 h-3 text-blue-500" />
                    <span>Automated Action Sequence ({totalCalls} steps)</span>
                    <ChevronDownIcon className="w-3 h-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 pl-3 border-l-2 border-gray-800 space-y-3">
                    {msgs.map(msg => renderMessageContent(msg, true))}
                </div>
            </details>
        </div>
      );
  };

  const renderMessageContent = (msg: Message, isNested: boolean = false) => {
    const toolCallParts = msg.parts.filter(p => (p as any).functionCall);
    const toolResponseParts = msg.parts.filter(p => (p as any).functionResponse);
    const textParts = msg.parts.filter(p => p.text || p.inlineData || p.fileData);
    const auditPart = textParts.find(p => p.text?.includes('<active_inference_audit>'));
    let auditText = null;
    if (auditPart && auditPart.text) { const match = auditPart.text.match(/<active_inference_audit>([\s\S]*?)<\/active_inference_audit>/); if (match) auditText = match[1].trim(); }

    return (
      <div id={`message-${msg.id}`} className={`flex flex-col ${msg.role === 'user' && !toolResponseParts.length ? 'items-end' : 'items-start'} ${isNested ? 'mb-4' : 'mb-8'}`} key={msg.id}>
        {(auditText || msg.thinkingDuration) && !isNested && (
            <div className="w-full max-w-[90%] mb-2">
               <details className="group" open={false}>
                  <summary className="list-none cursor-pointer flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors select-none py-1">
                      <SparklesIcon className="w-3 h-3 text-purple-500" />
                      <span>Thinking Process {msg.thinkingDuration ? `(${msg.thinkingDuration.toFixed(1)}s)` : ''}</span>
                      <ChevronDownIcon className="w-3 h-3 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 pl-3 border-l-2 border-gray-800 space-y-3">
                      {auditText && ( <div className="text-gray-400 text-xs leading-relaxed font-mono whitespace-pre-wrap bg-[#151515] p-3 rounded-lg border border-gray-800/50">{auditText}</div> )}
                  </div>
               </details>
            </div>
        )}
        {(toolCallParts.length > 0 || toolResponseParts.length > 0) && (
             <div className="w-full max-w-[90%] mb-1">
                 {toolCallParts.length > 0 && (
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-lg overflow-hidden mb-2">
                        <div className="bg-[#1a1a1a] px-3 py-1.5 border-b border-gray-800 flex items-center gap-2">
                            <span className="text-[10px] text-blue-400 font-bold uppercase">⚡ Tool Call</span>
                        </div>
                        <div className="p-3 font-mono text-[10px] text-gray-500 overflow-x-auto">
                        {toolCallParts.map((part: any, i) => (
                            <div key={i} className="mb-2 last:mb-0">
                                <div className="text-blue-500 font-bold">{part.functionCall.name}</div>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(part.functionCall.args, null, 2)}</pre>
                            </div>
                        ))}
                        </div>
                    </div>
                 )}
                 {toolResponseParts.length > 0 && (
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-lg overflow-hidden">
                        <div className="bg-[#1a1a1a] px-3 py-1.5 border-b border-gray-800 flex items-center gap-2">
                            <span className="text-[10px] text-green-500 font-bold uppercase">✓ Tool Result</span>
                        </div>
                        <div className="p-3 font-mono text-[10px] text-gray-500 overflow-x-auto">
                        {toolResponseParts.map((part: any, i) => (
                            <div key={i} className="mb-2 last:mb-0">
                                <div className="text-green-600 font-bold">{part.functionResponse.name}</div>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(part.functionResponse.response, null, 2)}</pre>
                            </div>
                        ))}
                        </div>
                    </div>
                 )}
             </div>
        )}
        {textParts.length > 0 && (
            <div className={`w-full max-w-full rounded-2xl px-5 py-3 select-text ${ msg.role === 'user' ? 'bg-[#2d2d2d] text-white shadow-sm max-w-[90%] ml-auto' : 'bg-transparent text-[#e3e3e3] p-0' }`}>
            {textParts.map((part, i) => {
                const isFormAgentMessage = msg.role === 'model' && (part.text?.includes('<form_payload>'));
                let cleanText = part.text?.replace(/<active_inference_audit>[\s\S]*?<\/active_inference_audit>/g, '').replace(/<form_payload>[\s\S]*?<\/form_payload>/g, '').trim();
                const isSystemSubmission = msg.role === 'user' && part.text?.startsWith('[SYSTEM_ANNOTATION');
                if (!cleanText && !part.inlineData && !part.fileData && !isFormAgentMessage && !isSystemSubmission) return null;
                if (isSystemSubmission) {
                    let submittedData = {};
                    try { const jsonMatch = part.text?.match(/\[SYSTEM_ANNOTATION: Form Submission Data\]\s*([\s\S]*)/); if (jsonMatch && jsonMatch[1]) submittedData = JSON.parse(jsonMatch[1]); } catch (e) { }
                    return (
                        <div key={i} className="bg-[#1c64f2] text-white p-4 rounded-xl -mx-2 -my-1 shadow-md">
                            <div className="border-b border-white/20 pb-2 mb-2 text-xs font-bold uppercase opacity-80">Form Data</div>
                            <ul className="space-y-1">
                                {Object.entries(submittedData).map(([key, value]) => ( <li key={key} className="text-xs flex"><span className="opacity-70 mr-2">{key}:</span><span>{String(value)}</span></li> ))}
                            </ul>
                        </div>
                    );
                }
                if (isFormAgentMessage) {
                    return (
                        <div key={i} className="w-full mt-2">
                            {cleanText && ( <div className="markdown-body mb-4"> <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanText.replace(/<response>|<\/response>/g, '')}</ReactMarkdown> </div> )}
                            <FormAgentCard 
                                message={{...msg, parts: [{...part, text: part.text}]}} 
                                onSubmit={handleFormSubmit} 
                                todos={todos} 
                                onAddTodo={handleAddTodo} 
                                onToggleTodo={handleToggleTodo} 
                                onUpdateTodo={handleUpdateTodo} 
                                onSaveToLibrary={handleSaveToLibrary}
                                selectedModel={apiSettings.provider === 'openai' ? apiSettings.openai.model : selectedModel}
                                apiSettings={apiSettings}
                            />
                        </div>
                    );
                }
                return (
                    <div key={i} className="mb-2 last:mb-0 w-full">
                        {part.inlineData && part.inlineData.mimeType.startsWith('image') && ( <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="Attachment" className="rounded-xl mb-3 max-w-full h-auto max-h-[300px] object-cover" /> )}
                        {part.fileData && ( <div className="flex items-center p-3 bg-black/20 rounded-lg mb-2"> <FileIcon className="w-6 h-6 mr-2 text-green-400" /> <div className="flex flex-col"> <span className="text-xs text-gray-200 font-medium">Document Uploaded</span> <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{part.fileData.mimeType}</span> </div> </div> )}
                        {cleanText && ( <div className="markdown-body"> <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code({node, inline, className, children, ...props}: any) { const match = /language-(\w+)/.exec(className || ''); const isCodeBlock = !inline && match; if (isCodeBlock) return <CodeBlock language={match ? match[1] : ''} value={String(children).replace(/\n$/, '')} />; return <code className={className} {...props}>{children}</code>; } }}>{cleanText.replace(/<response>|<\/response>/g, '')}</ReactMarkdown> </div> )}
                    </div>
                );
            })}
            {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-800 space-y-3">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sources</p>
                <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.map((url, i) => ( <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center space-x-2 bg-[#1e1e1e] border border-gray-800 rounded-full px-3 py-1 text-xs text-blue-400 hover:bg-[#2d2d2d] transition-colors"> <span className="truncate max-w-[120px]">{new URL(url).hostname}</span> </a> ))}
                </div>
                </div>
            )}
            </div>
        )}
        {msg.role === 'model' && textParts.length > 0 && (
          <div className="flex items-center space-x-2 mt-1 px-2 select-none">
             <button className="p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-[#2d2d2d] transition-colors"><ThumbUpIcon className="w-4 h-4" /></button>
             <button className="p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-[#2d2d2d] transition-colors"><ThumbDownIcon className="w-4 h-4" /></button>
             <button className="p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-[#2d2d2d] transition-colors"><RefreshIcon className="w-4 h-4" /></button>
             <button className="p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-[#2d2d2d] transition-colors" onClick={() => copyToClipboard(textParts.map(p => p.text).join('\n'))}><CopyIcon className="w-4 h-4" /></button>
             <button className="p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-[#2d2d2d] transition-colors"><MoreIcon className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen text-[#e3e3e3] bg-[#0e0e0e] overflow-hidden select-none">
      <header className="flex items-center justify-between px-4 py-3 bg-[#0e0e0e] z-30 border-b border-gray-900/50">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 hover:bg-[#2d2d2d] rounded-full transition-all active:scale-95"><MenuIcon className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-medium tracking-tight">Gemini</span>
            {activeFeature ? (
                <div className="bg-[#2d2d2d] border border-gray-700 px-2 py-0.5 rounded text-[10px] text-gray-400 font-bold tracking-tighter">{activeFeature.name.split(' ')[0].toUpperCase()}</div>
            ) : isFormAgentMode ? (
                <div className="bg-blue-900/50 border border-blue-700 px-2 py-0.5 rounded text-[10px] text-blue-200 font-bold tracking-tighter">AGENT MODE</div>
            ) : (
                <div className="bg-[#2d2d2d] border border-gray-700 px-2 py-0.5 rounded text-[10px] text-gray-400 font-bold tracking-tighter max-w-[120px] truncate">{getModelLabel(selectedModel).toUpperCase()}</div>
            )}
          </div>
          <div className="flex items-center space-x-1">
             <button onClick={() => handleNewChat()} className="p-2.5 hover:bg-[#2d2d2d] rounded-full"><PlusIcon className="w-6 h-6" /></button>
             <button onClick={() => setIsTodoManagerOpen(!isTodoManagerOpen)} className={`p-2.5 hover:bg-[#2d2d2d] rounded-full transition-colors ${isTodoManagerOpen ? 'bg-[#2d2d2d] text-white' : 'text-gray-400'}`}>
                <TaskListIcon className="w-6 h-6" />
             </button>
          </div>
      </header>

      {isGemManagerOpen ? (
        <GemManager gems={gems} onNewGem={() => { setShowGemEditor(true); setEditingGem(undefined); setIsSidebarOpen(false); }} onEditGem={handleEditGem} onDeleteGem={handleDeleteGem} onPinGem={handlePinGem} />
      ) : isTodoManagerOpen ? (
        <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
            <div className="pointer-events-auto h-full shadow-2xl">
                <TodoManager 
                    todos={todos} 
                    onAddTodo={handleAddTodo} 
                    onToggleTodo={handleToggleTodo} 
                    onDeleteTodo={handleDeleteTodo} 
                    onClose={() => setIsTodoManagerOpen(false)} 
                    isAiEnabled={isTodoAiEnabled} 
                    onToggleAi={() => setIsTodoAiEnabled(!isTodoAiEnabled)} 
                    onUpdateTodo={handleUpdateTodo}
                    onReorderTodos={handleReorderTodos}
                />
            </div>
        </div>
      ) : null}
      
      {/* Main Content Area */}
      {!isGemManagerOpen && (
        <main className="flex-1 overflow-y-auto px-4 pt-6 pb-32 flex flex-col h-full" ref={chatContainerRef}>
          {!currentChatId || (currentChat?.messages.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 mt-12 animate-in fade-in duration-500">
               {activeGem ? (
                <div className="space-y-5">
                  <div className={`w-20 h-20 rounded-full mx-auto ${activeGem.color} flex items-center justify-center text-3xl font-bold shadow-2xl`}>{activeGem.name[0]}</div>
                  <h1 className="text-3xl font-bold tracking-tight">{activeGem.name}</h1>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">{activeGem.description}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">Hello, I'm Gemini.</h1>
                  <p className="text-gray-400 text-lg">How can I help you today?</p>
                </div>
              )}
              {!activeFeature && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-md px-4">
                  <button onClick={() => handleSelectFeature(features[0])} className="bg-[#1a1a1a] p-5 rounded-3xl text-left hover:bg-[#2d2d2d] transition-all border border-gray-800/30 active:scale-[0.98] group">
                    <div className="bg-blue-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform"><SearchIcon className="w-6 h-6"/></div>
                    <p className="text-xs font-semibold leading-tight">Use Deep Research</p>
                  </button>
                  <button onClick={() => handleSelectFeature(features[2])} className="bg-[#1a1a1a] p-5 rounded-3xl text-left hover:bg-[#2d2d2d] transition-all border border-gray-800/30 active:scale-[0.98] group">
                    <div className="bg-purple-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform"><BananaIcon className="w-6 h-6"/></div>
                    <p className="text-xs font-semibold leading-tight">Generate creative images</p>
                  </button>
                </div>
              )}
              {activeFeature && (
                 <div className="bg-[#1a1a1a] px-6 py-4 rounded-3xl border border-gray-800/50 flex items-center gap-4">
                    <div className="p-2 bg-gray-800 rounded-full">{activeFeature.icon}</div>
                    <div className="text-left"><p className="text-sm font-bold text-white">Active Mode: {activeFeature.name}</p><p className="text-xs text-gray-400">Model: {activeFeature.model}</p></div>
                 </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              {getGroupedMessages(currentChat.messages).map((item, idx) => {
                  if ('type' in item && item.type === 'tool-group') {
                      return renderToolGroup(item.messages as Message[], idx);
                  } else {
                      return renderMessageContent(item as Message);
                  }
              })}
              {isTyping && (
                <div className="flex items-center space-x-2 px-3 mb-10 text-gray-500 animate-pulse">
                  <SparklesIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Gemini is thinking...</span>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {(isAttachmentMenuOpen || isAiFeatureMenuOpen || isModelSelectorOpen) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity" onClick={() => { setIsAttachmentMenuOpen(false); setIsAiFeatureMenuOpen(false); setIsModelSelectorOpen(false); }} />
      )}

      {/* Form Library Popover */}
      <FormLibraryMenu 
          isOpen={isFormLibraryOpen} 
          onClose={() => setIsFormLibraryOpen(false)} 
          savedForms={savedForms} 
          onLoadForm={handleLoadSavedForm} 
          onDeleteForm={handleDeleteSavedForm} 
          onRenameForm={handleRenameSavedForm}
      />

      {!isGemManagerOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-4 pt-0">
          <div className="max-w-2xl mx-auto pointer-events-auto relative">
             {isFormAgentMode && !isInputExpanded && (
                <>
                  <button 
                    onClick={() => setIsFormLibraryOpen(!isFormLibraryOpen)} 
                    className="flex items-center justify-center w-12 h-12 bg-[#1e1e1e] hover:bg-[#2d2d2d] text-yellow-400 rounded-full shadow-xl border border-gray-800 animate-in zoom-in fade-in duration-300 delay-100 pointer-events-auto transition-transform active:scale-90 z-50" 
                    style={{ position: 'fixed', right: '24px', bottom: '90px' }}
                    title="Saved Forms"
                  >
                    <BookmarkIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsInputExpanded(true)} className="flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-500/50 animate-in zoom-in fade-in duration-300 pointer-events-auto transition-transform active:scale-90 border-4 border-[#0e0e0e] z-50" style={{ position: 'fixed', right: '20px', bottom: '20px' }}><ClipboardListIcon className="w-6 h-6" /></button>
                </>
             )}
             {/* ... mention query ... */}
             {mentionQuery !== null && (
               <div className="bg-[#1e1e1e] rounded-xl border border-gray-700 shadow-2xl overflow-hidden mb-2 animate-in slide-in-from-bottom-5 absolute bottom-full left-0 w-full z-50 max-h-48 overflow-y-auto">
                  <div className="px-3 py-2 bg-[#151515] border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Task to Reference</div>
                  {todos.filter(t => !t.completed && t.text.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 ? (
                     <div className="p-3 text-sm text-gray-500 text-center">No active tasks match "{mentionQuery}"</div>
                  ) : (
                     todos.filter(t => !t.completed && t.text.toLowerCase().includes(mentionQuery.toLowerCase())).map(todo => (
                        <button key={todo.id} onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(todo); }} className="w-full text-left px-4 py-3 hover:bg-[#2d2d2d] transition-colors flex items-center justify-between group"><span className="text-sm text-gray-300 group-hover:text-white truncate flex-1">{todo.text}</span><span className="text-xs text-gray-600 font-mono ml-2">#{todo.id.slice(-4)}</span></button>
                     ))
                  )}
               </div>
             )}
             {(isInputExpanded || !isFormAgentMode) && (
                <div className="animate-in slide-in-from-bottom-5 fade-in duration-300">
                  {/* ... menus ... */}
                  {isAttachmentMenuOpen && (<div className="bg-[#1e1e1e] rounded-[32px] p-2 custom-shadow mb-2 border border-gray-800 animate-in slide-in-from-bottom-10 fade-in duration-200"><div className="grid grid-cols-1 gap-1"><button className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><CameraIcon className="w-5 h-5 mr-4 text-gray-400" /> Camera</button><button onClick={() => fileInputRef.current?.click()} className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><FileIcon className="w-5 h-5 mr-4 text-gray-400" /> Upload (Images/PDF/EPUB)</button><button className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><span className="w-5 h-5 mr-4 flex items-center justify-center text-gray-400">📁</span> Add from Drive</button><button className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors"><ImageIcon className="w-5 h-5 mr-4 text-gray-400" /> Photos</button></div></div>)}
                  {isAiFeatureMenuOpen && (<div className="bg-[#1e1e1e] rounded-[32px] p-2 custom-shadow mb-2 border border-gray-800 animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[60vh] overflow-y-auto"><div className="grid grid-cols-1 gap-1">{features.map((feature) => (<button key={feature.id} onClick={() => handleSelectFeature(feature)} className="flex items-center px-5 py-4 hover:bg-[#2d2d2d] rounded-[24px] text-sm font-medium transition-colors">{feature.icon}{feature.name}</button>))}</div></div>)}
                  
                  {isModelSelectorOpen && (<div className="bg-[#1e1e1e] rounded-[32px] p-2 custom-shadow mb-2 border border-gray-800 animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[60vh] overflow-y-auto absolute bottom-full right-0 w-64 z-50"><p className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Model selection</p><div className="grid grid-cols-1 gap-1"><button onClick={() => handleModelSelect('gemini-3-pro-preview', 'gemini')} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === 'gemini-3-pro-preview' ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">Gemini 3 Pro</span><span className="text-xs text-gray-500">Next-gen reasoning engine</span></button><button onClick={() => handleModelSelect('gemini-3-flash-preview', 'gemini')} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === 'gemini-3-flash-preview' ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">Gemini 3 Flash</span><span className="text-xs text-gray-500">Next-gen speed model</span></button><button onClick={() => handleModelSelect('gemini-2.5-flash-preview-09-2025', 'gemini')} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === 'gemini-2.5-flash-preview-09-2025' ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">Gemini 2.5 Flash</span><span className="text-xs text-gray-500">Fast and efficient</span></button>{apiSettings.openai.selectedModels && apiSettings.openai.selectedModels.length > 0 && (<><div className="h-px bg-gray-800 mx-4 my-2"></div>{apiSettings.openai.selectedModels.map(modelId => (<button key={modelId} onClick={() => handleModelSelect(modelId, 'openai')} className={`flex flex-col px-5 py-3 rounded-[24px] transition-colors ${selectedModel === modelId ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}><span className="text-sm font-bold">{modelId}</span><span className="text-xs text-gray-500">Custom Favorite</span></button>))}</>)}</div></div>)}

                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept={ACCEPTED_FILE_TYPES} multiple />

                  <form onSubmit={handleSendMessage} className="bg-[#1e1e1e] rounded-[32px] border border-gray-800 shadow-2xl transition-all p-4 mb-0 relative">
                    {isFormAgentMode && (<button type="button" onClick={() => setIsInputExpanded(false)} className="absolute -top-2 -right-2 bg-gray-800 text-gray-400 p-1.5 rounded-full border border-gray-700 hover:text-white transition-colors z-10"><ChevronDownIcon className="w-4 h-4" /></button>)}
                    {attachments.length > 0 && (<div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">{attachments.map((att, idx) => (<div key={idx} className="relative group flex-shrink-0"><button onClick={() => removeAttachment(idx)} type="button" className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10 border border-[#1e1e1e]">✕</button>{att.previewUrl ? <img src={att.previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-700" /> : <div className="h-16 w-16 bg-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-700 p-1"><FileIcon className="w-6 h-6 text-gray-400 mb-1" /><span className="text-[8px] text-gray-400 w-full text-center truncate px-1">{att.file.name.split('.').pop()?.toUpperCase()}</span></div>}</div>))}</div>)}
                    <div className="w-full"><textarea value={inputValue} onChange={handleInput} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { if (mentionQuery !== null) { e.preventDefault(); } else { e.preventDefault(); handleSendMessage(); } } }} placeholder={isFormAgentMode ? "Describe task to start Form Agent..." : getModelPlaceholder()} className="w-full bg-transparent border-none outline-none text-[17px] text-[#e3e3e3] placeholder-gray-500 resize-none min-h-[24px] max-h-40 leading-relaxed" rows={1} /></div>
                    <div className="flex items-center justify-between mt-5">
                       <div className="flex items-center space-x-2">
                           <button type="button" onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} className="p-2 text-gray-400 hover:text-white transition-colors"><PlusIcon className="w-6 h-6" /></button>
                           <button type="button" onClick={() => setIsAiFeatureMenuOpen(!isAiFeatureMenuOpen)} className="p-2 text-gray-400 hover:text-white transition-colors"><SettingsAdjustIcon className="w-6 h-6" /></button>
                           <button type="button" onClick={() => setIsFormAgentMode(!isFormAgentMode)} className={`p-2 transition-colors rounded-lg ${isFormAgentMode ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400 hover:text-white'}`} title="Toggle Form Agent Mode"><ClipboardListIcon className="w-6 h-6" /></button>
                           {/* Saved Forms Button */}
                           <button type="button" onClick={() => setIsFormLibraryOpen(!isFormLibraryOpen)} className={`p-2 transition-colors rounded-lg ${isFormLibraryOpen ? 'text-yellow-400 bg-yellow-900/20' : 'text-gray-400 hover:text-white'}`} title="My Forms Library"><BookmarkIcon className="w-5 h-5" /></button>
                        </div>
                       <div className="flex items-center space-x-3"><button type="button" onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)} className="flex items-center space-x-1 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors text-sm font-medium text-gray-400"><span>{getModelLabel(selectedModel)}</span><span className="text-[8px] opacity-40 ml-1">▼</span></button>{(inputValue.trim() || attachments.length > 0) ? (<button type="submit" className="p-2.5 bg-blue-600 text-white rounded-full shadow-lg active:scale-95 transition-all"><SendIcon className="w-5 h-5" /></button>) : (<button type="button" className="p-2.5 text-gray-400 hover:text-white transition-colors"><MicIcon className="w-6 h-6" /></button>)}</div>
                    </div>
                  </form>
                </div>
             )}
          </div>
        </div>
      )}

      <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          chats={chats} 
          gems={gems} 
          currentChatId={currentChatId || undefined} 
          onSelectChat={handleSelectChat} 
          onNewChat={() => handleNewChat()} 
          onNewGem={() => { setShowGemEditor(true); setEditingGem(undefined); setIsSidebarOpen(false); }} 
          onSelectGem={handleSelectGem} 
          onDeleteChat={handleDeleteChat} 
          onPinChat={handlePinChat} 
          onRenameChat={handleRenameChat} // New prop
          onOpenGemManager={() => { setIsGemManagerOpen(true); setIsSidebarOpen(false); }} 
          onDeleteGem={handleDeleteGem} 
          onPinGem={handlePinGem} 
          onEditGem={handleEditGem} 
          onOpenSettings={() => { setIsSettingsMenuOpen(!isSettingsMenuOpen); }} 
          isSettingsOpen={isSettingsMenuOpen} 
          onOpenFormAgentManager={() => { setIsFormAgentManagerOpen(true); setIsSidebarOpen(false); }} 
          onOpenTodoManager={() => { setIsTodoManagerOpen(true); setIsSidebarOpen(false); }} 
          onOpenGeneralSettings={() => { setIsGeneralSettingsOpen(true); setIsSidebarOpen(false); }} 
      />
      {showGemEditor && <GemEditor onSave={handleSaveGem} onCancel={() => { setShowGemEditor(false); setEditingGem(undefined); }} initialGem={editingGem} />}
      <FormAgentFullManager isOpen={isFormAgentManagerOpen} onClose={() => setIsFormAgentManagerOpen(false)} tools={formTools} onUpdateTools={setFormTools} todos={todos} onAddTodo={handleAddTodo} onToggleTodo={handleToggleTodo} selectedModel={selectedModel} />
      <GeneralSettings isOpen={isGeneralSettingsOpen} onClose={() => setIsGeneralSettingsOpen(false)} settings={apiSettings} onSave={(newSettings) => { setApiSettings(newSettings); setIsGeneralSettingsOpen(false); }} />
    </div>
  );
};

export default App;
