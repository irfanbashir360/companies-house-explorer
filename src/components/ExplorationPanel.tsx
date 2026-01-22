import React, { useState } from 'react';
import { Network, Play } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

interface ExplorationPanelProps {
    onExplore: (depth: number) => void;
    isExploring: boolean;
}

export const ExplorationPanel: React.FC<ExplorationPanelProps> = ({
    onExplore,
    isExploring,
}) => {
    const { graphData } = useGraphStore();
    const [depth, setDepth] = useState(3);
    const [explorationMode, setExplorationMode] = useState<'manual' | 'auto'>('manual');

    const hasCompanyNode = graphData.nodes.some((n) => n.type === 'company');
    const canExplore = hasCompanyNode && !isExploring;

    const handleExplore = () => {
        if (canExplore && depth > 0) {
            onExplore(depth);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 bg-slate-100 rounded-lg">
                    <Network className="w-4 h-4 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Exploration</h3>
            </div>

            <div className="space-y-5">
                {/* Depth Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                        Depth Level
                    </label>
                    <div className="flex items-center gap-3 mb-2">
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={depth}
                            onChange={(e) => setDepth(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-700"
                        />
                        <span className="text-sm font-bold text-slate-900 min-w-[2rem] text-center bg-slate-100 px-2 py-1 rounded-md">
                            {depth}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        Explore {depth} level{depth > 1 ? 's' : ''} deep from starting company
                    </p>
                </div>

                {/* Mode Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                        Mode
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setExplorationMode('manual')}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${explorationMode === 'manual'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => setExplorationMode('auto')}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${explorationMode === 'auto'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Auto
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {explorationMode === 'manual'
                            ? 'Click "Explore" to start exploration'
                            : 'Exploration starts automatically when company is added'}
                    </p>
                </div>

                {/* Explore Button */}
                <button
                    onClick={handleExplore}
                    disabled={!canExplore || isExploring}
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                    {isExploring ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Exploring...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Explore to Depth {depth}
                        </>
                    )}
                </button>

                {!hasCompanyNode && (
                    <p className="text-xs text-slate-500 text-center py-2">
                        Search for a company to start exploring
                    </p>
                )}
            </div>
        </div>
    );
};
