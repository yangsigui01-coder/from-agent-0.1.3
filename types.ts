
export interface Message {
  id: string;
  role: 'user' | 'model';
  parts: MessagePart[];
  timestamp: number;
  model?: string;
  groundingUrls?: string[];
  isThinking?: boolean;
  thinkingDuration?: number; // New: Track execution time in seconds
  // Tracks if this message contained a form and if it was submitted
  formSubmission?: {
    submittedAt: number;
    values: Record<string, any>;
  };
}

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    fileUri: string;
    mimeType: string;
  };
  functionCall?: {
    name: string;
    args: any;
  };
  functionResponse?: {
    name: string;
    response: any;
  };
}

export interface SavedForm {
  id: string;
  title: string;
  schema: FormPayload;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  gemId?: string;
  isPinned?: boolean;
}

export interface Gem {
  id: string;
  name: string;
  description: string;
  instructions: string;
  icon?: string;
  color?: string;
  isPinned?: boolean;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  parentId?: string; // New field for nesting
  timeSpent?: number; // Time tracked in seconds
}

export type FormFieldType = 
  // Core
  | 'text' | 'textarea' | 'select' | 'number'
  // Advanced
  | 'short_text_input' | 'long_text_input' | 'email_input' | 'phone_input' | 'number_input'
  | 'multiple_choice' | 'checkboxes' | 'multi_select' | 'single_select'
  | 'opinion_scale' | 'rating' | 'ranking_input'
  | 'date_picker' | 'time_input' | 'range_slider' | 'currency_input'
  | 'file_upload' | 'signature_input' | 'address_input' | 'link_input' | 'geo_capture'
  // Todo Integration
  | 'todo_list' | 'todo_add' | 'todo_selector';

export interface FormField {
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

export interface FormPayload {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormTool {
  id: string;
  name: string;
  key: string;
  type: FormFieldType;
  description: string;
  isEnabled: boolean;
  isSystem?: boolean;
  options?: string[];
  
  // Extra config props
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  currency?: string;
  filter?: 'all' | 'active' | 'completed'; // For todo lists
}

export enum FeatureType {
  DEEP_RESEARCH = 'deep_research',
  CREATE_VIDEO = 'create_video',
  CREATE_IMAGE = 'create_image',
  CANVAS = 'canvas',
  GUIDED_LEARNING = 'guided_learning',
  SPEECH = 'speech'
}

export interface ApiSettings {
  provider: 'gemini' | 'openai';
  openai: {
    baseUrl: string;
    apiKey: string;
    model: string;
    availableModels?: string[];
    selectedModels?: string[]; // List of favorite models to show in quick switcher
  };
}
