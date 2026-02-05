
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SendIcon, SparklesIcon, ChevronDownIcon, PlusIcon, TrashIcon, CheckCircleIcon, CircleIcon, ChevronRightIcon, PlayIcon, PauseIcon, RefreshIcon, ClipboardListIcon, StarIcon, PinIcon, MoreIcon } from './Icons';
import { Message, FormFieldType, Todo, FormPayload, ApiSettings } from '../types';
import { geminiService } from '../services/gemini';

interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: any[]; 
  min?: number;
  max?: number;
  step?: number;
  currency?: string;
  filter?: 'all' | 'active' | 'completed';
  defaultValue?: any;
}

interface FormAgentCardProps {
  message: Message;
  onSubmit: (messageId: string, data: Record<string, any>) => void;
  todos?: Todo[];
  onAddTodo?: (text: string) => void;
  onToggleTodo?: (id: string) => void;
  onUpdateTodo?: (todo: Todo) => void;
  onSaveToLibrary?: (payload: FormPayload) => void;
  selectedModel?: string;
  apiSettings?: ApiSettings;
}

// --- Editable Select Component ---
interface EditableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: any }[];
  placeholder?: string;
  commonClasses: string;
}

const EditableSelect: React.FC<EditableSelectProps> = ({ value, onChange, options, placeholder, commonClasses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionLabel: string) => {
    onChange(optionLabel);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder || "Select or type..."}
          className={`${commonClasses} pr-8 cursor-text`}
        />
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 top-0 bottom-0 px-3 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && options.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {options.map((option, idx) => {
             const isSelected = String(value) === String(option.label);
             return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(String(option.label))}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-800 last:border-0 transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-blue-900/20 text-blue-300' : 'text-gray-300 hover:bg-[#2d2d2d] hover:text-white'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-blue-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ... FormTodoItem helper remains same ...
const FormTodoItem: React.FC<{
  todo: Todo;
  allTodos: Todo[];
  level: number;
  onToggle: (id: string) => void;
  onUpdateTodo?: (todo: Todo) => void;
  disabled: boolean;
}> = ({ todo, allTodos, level, onToggle, onUpdateTodo, disabled }) => {
  const subtasks = allTodos.filter(t => t.parentId === todo.id).sort((a, b) => b.createdAt - a.createdAt); 
  const hasSubtasks = subtasks.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(todo.timeSpent || 0);

  useEffect(() => {
      if (!isRunning) {
          setTime(todo.timeSpent || 0);
      }
  }, [todo.timeSpent, isRunning]);

  useEffect(() => {
      let interval: any;
      if (isRunning) {
          interval = setInterval(() => {
              setTime(t => t + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isRunning]);

  const toggleTimer = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isRunning) {
          setIsRunning(false);
          if (onUpdateTodo) {
              onUpdateTodo({ ...todo, timeSpent: time });
          }
      } else {
          setIsRunning(true);
      }
  };

  const formatTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`transition-all ${level > 0 ? 'ml-4 border-l border-gray-800 pl-3' : ''}`}>
      <div className="flex items-center p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors group">
        <button 
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1 mr-1 text-gray-500 hover:text-white transition-colors ${hasSubtasks ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
           {isExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        </button>

        <button 
            type="button"
            disabled={disabled}
            onClick={() => onToggle(todo.id)}
            className={`flex-shrink-0 mr-2 ${todo.completed ? 'text-green-500' : 'text-gray-500'}`}
        >
            {todo.completed ? <CheckCircleIcon className="w-4 h-4" /> : <CircleIcon className="w-4 h-4" />}
        </button>
        <span className={`text-sm flex-1 truncate ${todo.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
          {todo.text} 
        </span>

        <div className="flex items-center gap-2 ml-2">
             {(time > 0 || isRunning) && (
                 <span className={`text-xs font-mono tabular-nums ${isRunning ? 'text-blue-400' : 'text-gray-500'}`}>
                    {formatTime(time)}
                 </span>
             )}
             {!disabled && onUpdateTodo && (
                 <button 
                    onClick={toggleTimer} 
                    className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${isRunning ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`}
                    title={isRunning ? "Stop Timer" : "Start Timer"}
                 >
                    {isRunning ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                 </button>
             )}
        </div>
      </div>

      {isExpanded && hasSubtasks && (
        <div className="mt-1">
          {subtasks.map(sub => (
            <FormTodoItem 
              key={sub.id} 
              todo={sub} 
              allTodos={allTodos} 
              level={level + 1} 
              onToggle={onToggle}
              onUpdateTodo={onUpdateTodo}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FormAgentCard: React.FC<FormAgentCardProps> = ({ 
  message, 
  onSubmit, 
  todos = [], 
  onAddTodo, 
  onToggleTodo, 
  onUpdateTodo, 
  onSaveToLibrary,
  selectedModel,
  apiSettings
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [customFields, setCustomFields] = useState<{id: string, key: string, value: string}[]>([]);
  const [submissionNote, setSubmissionNote] = useState('');
  const [optionEdits, setOptionEdits] = useState<Record<string, Record<string, string>>>({});
  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [isSaved, setIsSaved] = useState(false); // Local visual state
  
  const [newTodoInput, setNewTodoInput] = useState<Record<string, string>>({});
  
  // AI Prefill State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefillCount, setPrefillCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const formSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const text = message.parts.map(p => p.text).join('');
    const payloadMatch = text.match(/<form_payload>([\s\S]*?)<\/form_payload>/);
    if (payloadMatch) {
      try {
        let jsonStr = payloadMatch[1].trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
        
        const parsed = JSON.parse(jsonStr);
        const seenKeys = new Set<string>();
        parsed.fields = (parsed.fields || []).map((f: FormField, index: number) => {
             let uniqueKey = f.key;
             if (!uniqueKey || seenKeys.has(uniqueKey)) {
                 uniqueKey = `${uniqueKey || 'field'}_${index}`;
             }
             seenKeys.add(uniqueKey);
             return { ...f, key: uniqueKey };
        });

        setPayload(parsed);
        
        setFormData(prev => {
            const next = { ...prev };
            let updated = false;
            parsed.fields.forEach((f: FormField) => {
                 if (next[f.key] === undefined) {
                     if (f.type === 'checkboxes') next[f.key] = f.defaultValue || [];
                     else if (f.type === 'range_slider') next[f.key] = f.defaultValue || f.min || 0;
                     else next[f.key] = f.defaultValue || '';
                     updated = true;
                 }
            });
            return updated ? next : prev;
        });

      } catch (e) {
        console.error("Failed to parse form payload", e);
      }
    }
  }, [message]);

  const handleSave = () => {
    if (onSaveToLibrary && payload) {
        onSaveToLibrary(payload);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleAiPrefill = async () => {
    if (!payload) return;
    setIsPrefilling(true);
    setIsMenuOpen(false);

    try {
        const model = selectedModel || 'gemini-3-flash-preview';
        const attempt = prefillCount + 1;
        const prompt = `
You are a helpful assistant filling out a form.
Form Title: ${payload.title}
Form Description: ${payload.description || 'No description'}
Fields Schema: ${JSON.stringify(payload.fields)}

Task: Generate a valid JSON object where keys match the field keys and values are realistic and creative data for this form.
Constraints:
- Return ONLY the JSON object, no markdown, no explanation.
- Be creative and realistic.
- Attempt #${attempt}: Try to provide a set of data that is distinct or has a different "style/persona" from typical generic defaults if possible.
        `;

        const response = await geminiService.generateChatResponse(
            model, 
            [{ role: 'user', parts: [{ text: prompt }], id: 'prefill-req', timestamp: Date.now() }], 
            '', 
            "You are a strict JSON generator.",
            { useThinking: false }, 
            [], 
            apiSettings
        );

        let jsonStr = response.text.trim();
        // Cleanup JSON
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
        
        const generatedData = JSON.parse(jsonStr);
        
        // Merge with existing structure, but respect generated values
        setFormData(prev => {
            const newData = { ...prev };
            Object.keys(generatedData).forEach(key => {
                // Ensure field exists in payload to avoid junk
                if (payload.fields.some(f => f.key === key)) {
                    newData[key] = generatedData[key];
                }
            });
            return newData;
        });
        
        setPrefillCount(c => c + 1);

    } catch (e) {
        console.error("AI Prefill failed", e);
        alert("Failed to generate prefill data. Please try again.");
    } finally {
        setIsPrefilling(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    let finalValue = value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        finalValue = value.value ?? value.label ?? String(value);
    }
    setFormData(prev => ({ ...prev, [key]: finalValue }));
  };

  const handleCheckboxChange = (key: string, optionValue: string) => {
    setFormData(prev => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      if (current.includes(optionValue)) {
        return { ...prev, [key]: current.filter((v: string) => v !== optionValue) };
      } else {
        return { ...prev, [key]: [...current, optionValue] };
      }
    });
  };

  const handleOptionTextChange = (key: string, originalLabel: string, newVal: string, isMulti: boolean) => {
    const currentMappedVal = optionEdits[key]?.[originalLabel] ?? originalLabel;
    
    setOptionEdits(prev => ({
        ...prev,
        [key]: {
            ...(prev[key] || {}),
            [originalLabel]: newVal
        }
    }));

    setFormData(prev => {
        const currentData = prev[key];
        if (isMulti) {
            const arr = Array.isArray(currentData) ? currentData : [];
            return {
                ...prev,
                [key]: arr.map((v: string) => v === currentMappedVal ? newVal : v)
            };
        } else {
            return {
                ...prev,
                [key]: newVal
            };
        }
    });
  };

  const handleCustomFieldChange = (id: string, field: 'key' | 'value', text: string) => {
    setCustomFields(prev => prev.map(cf => cf.id === id ? { ...cf, [field]: text } : cf));
  };

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { id: Date.now().toString(), key: '', value: '' }]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(cf => cf.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;
    
    const missing = payload.fields.filter(f => f.required && (
      !formData[f.key] || (Array.isArray(formData[f.key]) && formData[f.key].length === 0)
    ));
    
    if (missing.length > 0 && !submissionNote.trim()) {
      alert(`Please fill required fields: ${missing.map(f => f.label).join(', ')} or provide a supplementary note.`);
      return;
    }

    const finalData = { ...formData };
    if (submissionNote.trim()) {
        finalData['_user_note'] = submissionNote.trim();
    }
    
    customFields.forEach(cf => {
        if (cf.key.trim()) {
            finalData[cf.key] = cf.value;
        }
    });

    onSubmit(message.id, finalData);
  };

  const isSubmitted = !!message.formSubmission;
  const displayData = isSubmitted ? message.formSubmission!.values : formData;

  const renderFieldInput = (field: FormField) => {
    const commonClasses = `w-full p-3 rounded-lg border focus:ring-1 outline-none transition-all text-sm ${
        isSubmitted 
        ? 'bg-[#151515] border-gray-800 text-gray-400' 
        : 'bg-[#0a0a0a] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-blue-500/30 hover:border-gray-600'
    }`;
    
    // --- READ-ONLY RENDERER (SUBMITTED STATE) ---
    if (isSubmitted) {
        // ... (Same as before)
        const displayValue = (value: any) => { if (value === undefined || value === null || value === '') return ''; return String(value); };
        
        if (field.type === 'todo_list') {
             const filter = field.filter || 'all';
             const rootTodos = todos.filter(t => !t.parentId && (
                filter === 'all' ? true :
                filter === 'active' ? !t.completed :
                t.completed
             ));
             return (
                 <div className="bg-[#121212] border border-gray-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto p-2 opacity-80">
                     {rootTodos.length === 0 ? <div className="p-4 text-center text-xs text-gray-600">No tasks.</div> : (
                        <div className="space-y-1">
                            {rootTodos.map(todo => (
                                <FormTodoItem key={todo.id} todo={todo} allTodos={todos} level={0} onToggle={() => {}} disabled={true} />
                            ))}
                        </div>
                     )}
                 </div>
             );
        }

        if (['text', 'textarea', 'long_text_input', 'text_input'].includes(field.type)) {
            return (
                <div className="w-full p-3 rounded-lg bg-[#151515] border border-gray-800 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed min-h-[46px]">
                    {displayValue(displayData[field.key]) || <span className="text-gray-600 italic">No content</span>}
                </div>
            );
        }

        if (['select', 'number', 'email', 'phone', 'url', 'currency_input', 'single_select', 'todo_selector', 'link_input', 'date_picker', 'time_input', 'multiple_choice'].some(t => field.type.includes(t))) {
             return (
                <div className="w-full p-3 rounded-lg bg-[#151515] border border-gray-800 text-gray-300 text-sm">
                    {field.type === 'currency_input' && field.currency ? `${field.currency} ` : ''}
                    {displayValue(displayData[field.key]) || <span className="text-gray-600 italic">Empty</span>}
                </div>
            );
        }
        
        if (['checkboxes', 'multi_select'].includes(field.type)) {
             const vals = Array.isArray(displayData[field.key]) ? displayData[field.key] : [displayData[field.key]];
             return (
                 <div className="flex flex-wrap gap-2 mt-1">
                     {vals.filter(Boolean).map((v: any, i: number) => (
                         <span key={i} className="px-2 py-1 rounded-md bg-[#2d2d2d] border border-gray-700 text-xs text-gray-300">
                             {String(v)}
                         </span>
                     ))}
                     {vals.length === 0 && <span className="text-gray-600 italic text-sm">None selected</span>}
                 </div>
             );
        }
    }

    // --- EDITABLE RENDERER (ACTIVE STATE) ---
    switch (field.type) {
        case 'textarea':
        case 'long_text_input':
            return (
                <textarea
                    value={String(displayData[field.key] || '')}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className={commonClasses}
                />
            );
        
        case 'select':
        case 'single_select':
        case 'multi_select': 
        case 'todo_selector': 
             let options = field.options || [];
             if (field.type === 'todo_selector') {
                 options = todos.filter(t => !t.completed)
                    .map(t => ({ label: t.text, value: t.id }));
             }
             const normalizedOptions = options.map((opt: any) => {
                 if (opt && typeof opt === 'object') {
                     const labelText = opt.label || opt.value;
                     return { label: labelText, value: labelText }; 
                 }
                 const str = String(opt);
                 return { label: str, value: str };
             });

             return (
                 <EditableSelect
                    value={String(displayData[field.key] || '')}
                    onChange={(val) => handleChange(field.key, val)}
                    options={normalizedOptions}
                    placeholder={field.placeholder}
                    commonClasses={commonClasses}
                 />
             );
        
        case 'todo_list':
             const filter = field.filter || 'all';
             const rootTodos = todos.filter(t => !t.parentId && (
                filter === 'all' ? true :
                filter === 'active' ? !t.completed :
                t.completed
             ));

             return (
                 <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto p-2">
                     {rootTodos.length === 0 ? (
                         <div className="p-4 text-center text-xs text-gray-500">No tasks found.</div>
                     ) : (
                        <div className="space-y-1">
                            {rootTodos.map(todo => (
                                <FormTodoItem 
                                    key={todo.id}
                                    todo={todo}
                                    allTodos={todos}
                                    level={0}
                                    onToggle={onToggleTodo || (() => {})}
                                    onUpdateTodo={onUpdateTodo}
                                    disabled={false}
                                />
                            ))}
                        </div>
                     )}
                 </div>
             );

        case 'todo_add':
            return (
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={newTodoInput[field.key] || ''}
                        onChange={(e) => setNewTodoInput(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder || "Add a new task..."}
                        className={commonClasses}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newTodoInput[field.key]?.trim() && onAddTodo) {
                                    onAddTodo(newTodoInput[field.key].trim());
                                    setNewTodoInput(prev => ({ ...prev, [field.key]: '' }));
                                }
                            }
                        }}
                    />
                    <button
                        type="button"
                        disabled={!newTodoInput[field.key]?.trim()}
                        onClick={() => {
                            if (newTodoInput[field.key]?.trim() && onAddTodo) {
                                onAddTodo(newTodoInput[field.key].trim());
                                setNewTodoInput(prev => ({ ...prev, [field.key]: '' }));
                            }
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Add
                    </button>
                </div>
            );

        case 'checkboxes':
        case 'multiple_choice':
            const isMulti = field.type === 'checkboxes';
            return (
                <div className="space-y-2 mt-2">
                    {field.options?.map((option: any, idx) => {
                        const optionLabel = (option && typeof option === 'object') ? (option.label ?? option.value) : String(option);
                        const currentTextVal = optionEdits[field.key]?.[optionLabel] ?? optionLabel;
                        const currentFormData = displayData[field.key];
                        let isSelected = false;
                        if (isMulti) {
                            isSelected = Array.isArray(currentFormData) && currentFormData.includes(currentTextVal);
                        } else {
                            isSelected = String(currentFormData) === String(currentTextVal);
                        }

                        return (
                            <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors group ${isSelected ? 'bg-blue-900/10 border-blue-500/50' : 'bg-[#0a0a0a] border-gray-700 hover:border-gray-600'}`}>
                                <input 
                                    type={isMulti ? "checkbox" : "radio"}
                                    name={field.key}
                                    checked={isSelected}
                                    onChange={() => {
                                        if (isMulti) {
                                            handleCheckboxChange(field.key, currentTextVal); 
                                        } else {
                                            handleChange(field.key, currentTextVal);
                                        }
                                    }}
                                    className={`w-4 h-4 border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800 ${isSelected ? 'accent-blue-500' : ''}`}
                                />
                                <div className="ml-3 flex-1">
                                    {isSelected ? (
                                        <input
                                            type="text"
                                            value={currentTextVal}
                                            onClick={(e) => e.stopPropagation()} 
                                            onChange={(e) => handleOptionTextChange(field.key, optionLabel, e.target.value, isMulti)}
                                            className="w-full bg-transparent border-b border-blue-500/50 focus:border-blue-500 outline-none text-sm text-white px-0 py-0.5"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="text-sm text-gray-300 select-none block w-full">{currentTextVal}</span>
                                    )}
                                </div>
                            </label>
                        )
                    })}
                </div>
            );

        case 'range_slider':
            return (
                <div className="flex items-center space-x-4 mt-2">
                    <input 
                        type="range"
                        min={field.min ?? 0}
                        max={field.max ?? 100}
                        step={field.step ?? 1}
                        value={displayData[field.key] || (field.min ?? 0)}
                        onChange={(e) => handleChange(field.key, Number(e.target.value))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm font-mono bg-gray-800 px-2 py-1 rounded text-gray-300 min-w-[3rem] text-center border border-gray-700">
                        {displayData[field.key] || (field.min ?? 0)}
                    </span>
                </div>
            );
            
        case 'rating':
             return (
                 <div className="flex space-x-2 mt-2 p-2 bg-[#0a0a0a] rounded-lg border border-gray-700 w-fit">
                     {[...Array(field.max || 5)].map((_, i) => (
                         <button
                             key={i}
                             type="button"
                             onClick={() => handleChange(field.key, i + 1)}
                             className="p-1 transition-transform active:scale-95 hover:scale-110"
                         >
                             <svg className={`w-6 h-6 ${i < (displayData[field.key] || 0) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                             </svg>
                         </button>
                     ))}
                 </div>
             );

        // Fallback for simple inputs
        default: 
            const inputType = ['number_input', 'number', 'currency_input'].includes(field.type) ? 'number' 
                              : ['date_picker'].includes(field.type) ? 'date'
                              : ['time_input'].includes(field.type) ? 'time'
                              : 'text';
            
            return (
                <div className="relative">
                     {field.type === 'currency_input' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{field.currency || '$'}</span>}
                     <input
                        type={inputType}
                        value={String(displayData[field.key] || '')}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={`${commonClasses} ${field.type === 'currency_input' ? 'pl-8' : ''}`}
                    />
                </div>
            );
    }
  };

  if (!payload) return null;

  return (
    <div ref={formSectionRef} className={`w-full border rounded-2xl overflow-visible shadow-lg transition-colors mt-4 ${isSubmitted ? 'bg-[#121212] border-gray-800 opacity-80' : 'bg-[#1e1e1e] border-gray-700'}`}>
        
        {/* New Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700/50 bg-[#252525]">
            <div className="flex items-center gap-2">
                <ClipboardListIcon className={`w-4 h-4 text-gray-500`} />
                <span className={`text-xs font-bold uppercase tracking-wider text-gray-500`}>
                    Form Card
                </span>
                {!isSubmitted && (
                    <div className="relative ml-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <MoreIcon className="w-4 h-4" />
                        </button>
                        {isMenuOpen && (
                            <div ref={menuRef} className="absolute top-full left-0 mt-2 w-48 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                <button 
                                    onClick={handleAiPrefill}
                                    disabled={isPrefilling}
                                    className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-[#2d2d2d] transition-colors disabled:opacity-50"
                                >
                                    <SparklesIcon className={`w-4 h-4 text-purple-400 ${isPrefilling ? 'animate-spin' : ''}`} />
                                    <span className="text-gray-200">{isPrefilling ? 'Thinking...' : 'AI Smart Prefill'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {!isSubmitted && (
                <div>
                     <button 
                        type="button" 
                        onClick={handleSave}
                        className={`flex items-center gap-1.5 text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-all font-medium ${isSaved ? 'text-yellow-400' : ''}`}
                        title="Save to Form Library"
                    >
                        <StarIcon className="w-3 h-3" filled={isSaved} />
                        <span>{isSaved ? 'Saved!' : 'Save'}</span>
                    </button>
                </div>
            )}
        </div>

        {/* ... Rest of form body remains same ... */}
        <div className={`px-6 py-4 border-b ${isSubmitted ? 'bg-[#1a1a1a] border-gray-800' : 'bg-[#252525] border-gray-700'}`}>
            <h2 className={`text-lg font-bold ${isSubmitted ? 'text-gray-500' : 'text-blue-400'}`}>{payload.title}</h2>
            {payload.description && <p className="text-sm text-gray-400 mt-1">{payload.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {payload.fields.map(field => (
            <div key={field.key} className="space-y-2 relative">
            <label className="block text-sm text-gray-400 ml-1">
                {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            {renderFieldInput(field)}
            </div>
        ))}

        {!isSubmitted && (
            <div className="space-y-3 pt-6 border-t border-gray-800 mt-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        ADDITIONAL FIELDS (OPTIONAL)
                    </label>
                </div>
                
                {customFields.map((cf) => (
                    <div key={cf.id} className="flex gap-2 items-center animate-in slide-in-from-left-2 fade-in">
                        <input
                            type="text"
                            value={cf.key}
                            onChange={(e) => handleCustomFieldChange(cf.id, 'key', e.target.value)}
                            placeholder="Field Name"
                            className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-blue-500 outline-none"
                        />
                        <input
                            type="text"
                            value={cf.value}
                            onChange={(e) => handleCustomFieldChange(cf.id, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-[2] bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-blue-500 outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => removeCustomField(cf.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addCustomField}
                    className="flex items-center space-x-2 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1.5 rounded hover:bg-blue-900/20 transition-colors w-fit"
                >
                    <PlusIcon className="w-3 h-3" />
                    <span>Add Custom Field</span>
                </button>
            </div>
        )}

        {!isSubmitted && (
            <div className="pt-2 flex items-center gap-2">
                <input
                    type="text"
                    value={submissionNote}
                    onChange={(e) => setSubmissionNote(e.target.value)}
                    placeholder="Add an optional supplementary note or instruction..."
                    className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors placeholder-gray-500"
                />
                <button
                    type="submit"
                    className="bg-[#1c64f2] hover:bg-[#1a56db] text-white p-3 rounded-xl flex-shrink-0 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center"
                    title="Submit Form"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        )}
        </form>

        {isSubmitted && (
            <div className="px-6 py-3 bg-[#1a1a1a] border-t border-gray-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Submitted
            </span>
            <span className="text-[10px] text-gray-600 font-mono">
                {new Date(message.formSubmission!.submittedAt).toLocaleTimeString()}
            </span>
            </div>
        )}
    </div>
  );
};

export default FormAgentCard;
