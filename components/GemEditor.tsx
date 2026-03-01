
import React, { useState } from 'react';
import { Gem } from '../types';
import OrbitView from './OrbitView';
import { SparklesIcon } from './Icons';

interface GemEditorProps {
  onSave: (gem: Gem) => void;
  onCancel: () => void;
  initialGem?: Gem;
}

const GemEditor: React.FC<GemEditorProps> = ({ onSave, onCancel, initialGem }) => {
  const [name, setName] = useState(initialGem?.name || '');
  const [description, setDescription] = useState(initialGem?.description || '');
  const [instructions, setInstructions] = useState(initialGem?.instructions || '');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'memory'>('editor');

  // Mock Data for OrbitView in Chinese
  const [orbitCenter, setOrbitCenter] = useState('开始');
  const [orbitSatellites, setOrbitSatellites] = useState([
      { id: '1', label: '用户意图', weight: 0.8 },
      { id: '2', label: '缺失数据', weight: 0.4 },
      { id: '3', label: '草拟表单', weight: 0.2 },
      { id: '4', label: '请求澄清', weight: 0.6 },
      { id: '5', label: '历史记录', weight: 0.3 }
  ]);

  const handleOrbitClick = (sat: any) => {
      setOrbitCenter(sat.label);
      // Randomize satellites for demo effect
      const newSatellites = [
          { id: 'a', label: '优化输入', weight: Math.random() },
          { id: 'b', label: '执行工具', weight: Math.random() },
          { id: 'c', label: '生成界面', weight: Math.random() },
          { id: 'd', label: '验证数据', weight: Math.random() }
      ].sort(() => Math.random() - 0.5);
      setOrbitSatellites(newSatellites);
  };

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
        <span className="font-medium">新建 Gem</span>
        <button 
          onClick={handleSave}
          disabled={!name.trim()}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
        >
          保存
        </button>
      </div>

      <div className="flex border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
        >
          编辑
        </button>
        <button 
          onClick={() => setActiveTab('memory')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'memory' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
        >
          记忆
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'preview' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
        >
          预览
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'editor' ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">名称</label>
              <input 
                type="text" 
                placeholder="给你的 Gem 起个名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">描述</label>
              <textarea 
                placeholder="描述你的 Gem 及其功能"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 font-medium">指令 (System Prompt)</label>
                <button className="text-blue-400 text-xs">帮我写</button>
              </div>
              <textarea 
                placeholder="示例：你是一位专注于学术写作的专业编辑..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                className="w-full bg-[#1a1a1a] border border-transparent rounded-xl px-4 py-3 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </>
        ) : activeTab === 'memory' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">思维星系 (Thought Galaxy)</h3>
                            <p className="text-xs text-gray-400">可视化该 Gem 的概率状态转移。</p>
                        </div>
                    </div>
                    
                    <OrbitView 
                        centerLabel={orbitCenter} 
                        satellites={orbitSatellites}
                        onSatelliteClick={handleOrbitClick}
                    />

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500 px-2">
                        <span>点击节点遍历状态空间</span>
                        <span>概率权重已激活</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">短期记忆</h4>
                        <div className="text-2xl font-mono text-white">4.2KB</div>
                        <div className="text-xs text-gray-500 mt-1">活跃上下文窗口</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">长期回忆</h4>
                        <div className="text-2xl font-mono text-white">92%</div>
                        <div className="text-xs text-gray-500 mt-1">检索准确率</div>
                    </div>
                </div>
            </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-10 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-4xl font-bold">
              {name ? name[0] : '?'}
            </div>
            <h2 className="text-2xl font-bold">{name || '你的 Gem 名称'}</h2>
            <p className="text-gray-400 text-sm max-w-xs">{description || '暂无描述'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GemEditor;
