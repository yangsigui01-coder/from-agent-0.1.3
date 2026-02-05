
import React, { useState, useEffect, useRef } from 'react';
import { Todo } from '../types';
import { 
  PlusIcon, CheckCircleIcon, CircleIcon, TrashIcon, XIcon, TaskListIcon, 
  ChevronDownIcon, ChevronRightIcon, BrainIcon, PlayIcon, PauseIcon, TimerIcon 
} from './Icons';

interface TodoManagerProps {
  todos: Todo[];
  onAddTodo: (text: string, parentId?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onClose: () => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
  onUpdateTodo?: (todo: Todo) => void;
  onReorderTodos?: (todos: Todo[]) => void;
}

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  
  if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const TodoItem: React.FC<{
  todo: Todo;
  allTodos: Todo[];
  level: number;
  onAddTodo: (text: string, parentId?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  filter: 'all' | 'active' | 'completed';
  isFlat: boolean;
  activeTaskId: string | null;
  activeTaskTimerValue?: number;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}> = ({ todo, allTodos, level, onAddTodo, onToggleTodo, onDeleteTodo, filter, isFlat, activeTaskId, activeTaskTimerValue, onStartTimer, onStopTimer, onDragStart, onDragOver, onDrop }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Subtasks inherit parent sorting if any, but since we rely on array order in allTodos now,
  // we filter and map based on appearance in main array.
  // Actually, filtering `allTodos` loses relative order if not careful.
  // We should just iterate `allTodos` and find children.
  // But wait, `allTodos` contains EVERYTHING in order.
  // We need to render children in the order they appear in `allTodos`.
  const subtasks = allTodos.filter(t => t.parentId === todo.id);
  
  const visibleSubtasks = filter === 'active' 
    ? subtasks.filter(t => !t.completed) 
    : subtasks;
  
  const hasSubtasks = subtasks.length > 0 && !isFlat;
  
  const completedSubtasksCount = subtasks.filter(t => t.completed).length;
  const progressLabel = hasSubtasks ? `${completedSubtasksCount}/${subtasks.length}` : null;
  
  const parentTask = isFlat && todo.parentId ? allTodos.find(t => t.id === todo.parentId) : null;
  const isActive = activeTaskId === todo.id;
  
  const displayTime = isActive && activeTaskTimerValue !== undefined ? activeTaskTimerValue : (todo.timeSpent || 0);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (subtaskInput.trim()) {
      onAddTodo(subtaskInput.trim(), todo.id);
      setSubtaskInput('');
      setIsAddingSubtask(false);
      setIsExpanded(true);
    }
  };

  return (
    <div 
        className={`transition-all duration-300 ${level > 0 && !isFlat ? 'ml-6 border-l border-gray-800 pl-4' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, todo.id)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, todo.id)}
    >
      <div 
        className={`group flex items-center p-3 rounded-xl border transition-all mb-2 cursor-grab active:cursor-grabbing ${
            isActive ? 'bg-[#1e1e1e] border-blue-500/50 shadow-lg shadow-blue-900/10' : 
            todo.completed ? 'bg-[#151515] border-transparent opacity-60' : 
            'bg-[#1e1e1e] border-gray-800 hover:border-gray-700'
        }`}
      >
        {!isFlat && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 mr-2 rounded hover:bg-white/10 text-gray-500 transition-colors ${hasSubtasks ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
          >
            {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        )}
        
        <button 
          onClick={() => onToggleTodo(todo.id)}
          className={`flex-shrink-0 mr-3 transition-colors ${todo.completed ? 'text-green-500' : 'text-gray-500 hover:text-gray-400'}`}
        >
          {todo.completed ? <CheckCircleIcon className="w-5 h-5" /> : <CircleIcon className="w-5 h-5" />}
        </button>
        
        <div className="flex-1 flex flex-col justify-center min-w-0">
            <span className={`text-sm truncate ${todo.completed ? 'line-through text-gray-500' : isActive ? 'text-blue-300 font-medium' : 'text-gray-200'}`}>
            {todo.text}
            </span>
            {parentTask && (
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                    <span className="text-xs">↳</span>
                    From: {parentTask.text}
                </div>
            )}
            {progressLabel && !isFlat && (
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <span className="text-xs">↳</span>
                    {progressLabel}
                </div>
            )}
        </div>

        <div className="flex items-center space-x-1 pl-2">
            {displayTime > 0 && (
                 <span className={`text-xs font-mono mr-2 tabular-nums ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
                    {formatTime(displayTime)}
                 </span>
            )}

            {!todo.completed && (
                <button
                    onClick={() => isActive ? onStopTimer() : onStartTimer(todo.id)}
                    className={`p-2 rounded-full transition-all ${isActive ? 'text-blue-400 bg-blue-900/20' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
                    title={isActive ? "Pause Timer" : "Start Timer"}
                >
                    {isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </button>
            )}
            
            <div className={`flex items-center space-x-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {!isFlat && (
                    <button 
                        onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                        className="p-2 text-gray-600 hover:text-blue-400 transition-colors"
                        title="Add Subtask"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                )}
                <button 
                    onClick={() => onDeleteTodo(todo.id)}
                    className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {isAddingSubtask && !isFlat && (
          <form onSubmit={handleAddSubtask} className="ml-8 mb-3 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
              <input 
                  autoFocus
                  type="text"
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  placeholder={`Subtask for "${todo.text}"...`}
                  className="flex-1 bg-transparent border-b border-gray-700 focus:border-blue-500 outline-none text-sm py-1 text-gray-300"
                  onBlur={() => !subtaskInput && setIsAddingSubtask(false)}
              />
          </form>
      )}

      {isExpanded && visibleSubtasks.length > 0 && !isFlat && (
        <div className="mt-1">
          {visibleSubtasks.map(sub => (
            <TodoItem 
              key={sub.id} 
              todo={sub} 
              allTodos={allTodos} 
              level={level + 1}
              onAddTodo={onAddTodo} 
              onToggleTodo={onToggleTodo} 
              onDeleteTodo={onDeleteTodo} 
              filter={filter}
              isFlat={isFlat}
              activeTaskId={activeTaskId}
              activeTaskTimerValue={activeTaskTimerValue}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TodoManager: React.FC<TodoManagerProps> = ({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onClose, isAiEnabled, onToggleAi, onUpdateTodo, onReorderTodos }) => {
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  
  // Timer State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskTime, setActiveTaskTime] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTask = activeTaskId ? todos.find(t => t.id === activeTaskId) : null;

  // Drag State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
      setDraggedItemId(id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedItemId || draggedItemId === targetId) return;
      if (!onReorderTodos) return;

      const draggedItemIndex = todos.findIndex(t => t.id === draggedItemId);
      const targetItemIndex = todos.findIndex(t => t.id === targetId);

      if (draggedItemIndex === -1 || targetItemIndex === -1) return;

      const newTodos = [...todos];
      const [removed] = newTodos.splice(draggedItemIndex, 1);
      newTodos.splice(targetItemIndex, 0, removed);

      onReorderTodos(newTodos);
      setDraggedItemId(null);
  };

  // Initialize display time when switching tasks
  useEffect(() => {
      if (activeTask) {
          setActiveTaskTime(activeTask.timeSpent || 0);
      } else {
          setActiveTaskTime(0);
          setIsRunning(false);
      }
  }, [activeTaskId, activeTask?.timeSpent]); // Include timeSpent dependency to update if externally changed (rare)

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isRunning && activeTaskId) {
      interval = setInterval(() => {
        setActiveTaskTime(prev => {
            const nextTime = prev + 1;
            return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeTaskId]);

  // Sync time to DB when stopping or switching
  const syncTime = () => {
      if (activeTask && onUpdateTodo) {
          onUpdateTodo({ ...activeTask, timeSpent: activeTaskTime });
      }
  };

  const handleStartTimer = (id: string) => {
      if (activeTaskId && activeTaskId !== id) {
          syncTime(); // Sync previous task before switching
      }
      const targetTask = todos.find(t => t.id === id);
      if (targetTask) {
          setActiveTaskId(id);
          setActiveTaskTime(targetTask.timeSpent || 0);
          setIsRunning(true);
      }
  };

  const handleStopTimer = () => {
      setIsRunning(false);
      syncTime();
  };

  const toggleTimer = () => {
      if (isRunning) {
          handleStopTimer();
      } else if (activeTaskId) {
          setIsRunning(true);
      } else {
          setIsTaskSelectorOpen(true);
      }
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsTaskSelectorOpen(false);
          }
      };
      if (isTaskSelectorOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTaskSelectorOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddTodo(inputValue.trim());
      setInputValue('');
    }
  };

  let displayTodos: Todo[] = [];
  const isFlat = filter === 'completed';

  if (isFlat) {
      // In flat view, we just show filtered list. Order is controlled by main array.
      displayTodos = todos.filter(t => t.completed);
  } else {
      // Hierarchical View: We only render roots here.
      // Order of roots is determined by their position in `todos`.
      displayTodos = todos.filter(t => !t.parentId && (
        filter === 'active' ? !t.completed : true
      ));
  }

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const circumference = 56.54; 
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e] text-[#e3e3e3] border-l border-gray-800 w-[400px] animate-in slide-in-from-right duration-300">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <TaskListIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Tasks</h1>
                    <p className="text-xs text-gray-500">Drag to reorder</p>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={onToggleAi}
                    className={`p-2 rounded-lg border transition-all ${isAiEnabled ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}
                    title={isAiEnabled ? "AI Connected" : "AI Disconnected"}
                >
                    <BrainIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            </div>

            {/* Timer Section */}
            <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden group">
                {isRunning && (
                    <div className="absolute inset-0 bg-blue-500/5 blur-3xl animate-pulse"></div>
                )}
                
                <div className="z-10 flex flex-col items-center w-full">
                    <div className="relative mb-2" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsTaskSelectorOpen(!isTaskSelectorOpen)}
                            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 truncate max-w-[250px]"
                        >
                            {activeTask ? (
                                <span className="flex items-center gap-2 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                                    {activeTask.text}
                                </span>
                            ) : (
                                <span>Select task...</span>
                            )}
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isTaskSelectorOpen ? 'rotate-180' : ''} flex-shrink-0`} />
                        </button>

                        {isTaskSelectorOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 max-h-60 overflow-y-auto bg-[#252525] border border-gray-700 rounded-xl shadow-2xl z-50 py-1">
                                {todos.filter(t => !t.completed).length === 0 && (
                                    <div className="px-4 py-3 text-xs text-gray-500 text-center">No active tasks</div>
                                )}
                                {todos.filter(t => !t.completed && !t.parentId).map(t => (
                                    <div key={t.id}>
                                        <button 
                                            onClick={() => { handleStartTimer(t.id); setIsTaskSelectorOpen(false); }}
                                            className={`w-full text-left px-4 py-2 text-xs hover:bg-blue-600/20 hover:text-blue-200 transition-colors truncate ${activeTaskId === t.id ? 'text-blue-400 bg-blue-900/10' : 'text-gray-300'}`}
                                        >
                                            {t.text}
                                        </button>
                                        {todos.filter(sub => sub.parentId === t.id && !sub.completed).map(sub => (
                                            <button 
                                                key={sub.id}
                                                onClick={() => { handleStartTimer(sub.id); setIsTaskSelectorOpen(false); }}
                                                className={`w-full text-left pl-8 pr-4 py-2 text-[10px] hover:bg-blue-600/20 hover:text-blue-200 transition-colors truncate flex items-center gap-1 ${activeTaskId === sub.id ? 'text-blue-400 bg-blue-900/10' : 'text-gray-400'}`}
                                            >
                                                <span className="opacity-50">↳</span> {sub.text}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="font-mono text-5xl font-bold tracking-tight text-white tabular-nums mb-4 drop-shadow-2xl">
                        {formatTime(activeTaskTime)}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={toggleTimer}
                            disabled={!activeTaskId && !isRunning}
                            className={`p-3 rounded-full transition-all active:scale-95 shadow-xl ${isRunning ? 'bg-gray-800 text-blue-400 hover:bg-gray-700 ring-1 ring-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        >
                            {isRunning ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-0.5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="relative group">
            <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Add a new task..."
                className="w-full bg-[#1e1e1e] border border-gray-800 rounded-xl px-4 py-3 pl-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                <PlusIcon className="w-4 h-4" />
            </div>
            </form>

            {/* Filter Controls */}
            <div className="flex items-center justify-between pt-1">
            <div className="flex bg-[#1e1e1e] p-1 rounded-lg border border-gray-800">
                {(['active', 'all', 'completed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold capitalize transition-all ${filter === f ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
                <div className="text-[10px] font-mono text-gray-500">{progress}% Done</div>
            </div>

            {/* List */}
            <div className="space-y-1 pb-10">
            {displayTodos.length === 0 && (
                <div className="text-center py-10 text-gray-600 text-sm">
                    <p>No tasks.</p>
                </div>
            )}
            {displayTodos.map(todo => (
                <TodoItem 
                key={todo.id} 
                todo={todo} 
                allTodos={todos} 
                level={0}
                onAddTodo={onAddTodo}
                onToggleTodo={onToggleTodo}
                onDeleteTodo={onDeleteTodo}
                filter={filter}
                isFlat={isFlat}
                activeTaskId={activeTaskId}
                activeTaskTimerValue={activeTaskTime}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                />
            ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TodoManager;
