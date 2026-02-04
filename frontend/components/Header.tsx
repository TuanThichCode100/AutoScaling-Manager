import React from 'react';
import { RefreshCw, Infinity as InfinityIcon, Trash2 } from 'lucide-react';

interface HeaderProps {
    isAutoRefreshEnabled: boolean;
    onToggleAutoRefresh: (enabled: boolean) => void;
    onManualRefresh: () => void;
    onClearData: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isAutoRefreshEnabled, onToggleAutoRefresh, onManualRefresh, onClearData }) => {
    return (
        <header className="flex shrink-0 items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/80 backdrop-blur-md z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 mr-2">
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <InfinityIcon className="w-5 h-5" />
                    </div>
                    <h1 className="text-slate-900 text-sm font-bold leading-tight">ScaleOps</h1>
                </div>

                <div className="h-4 w-[1px] bg-slate-200"></div>

                <h2 className="text-slate-900 text-lg font-bold tracking-tight hidden sm:block">Multi-Model Comparison</h2>
                <h2 className="text-slate-900 text-lg font-bold tracking-tight sm:hidden">Multi-Model</h2>

                <div className="hidden md:block h-4 w-[1px] bg-slate-200"></div>

                <div className="hidden md:flex items-center gap-2 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                    <span className="flex size-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-700 text-xs font-bold uppercase tracking-wide">System Healthy</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-slate-500 text-xs font-medium text-right hidden lg:block">
                    <p>Last updated: <span className="text-slate-900 font-semibold">10:41:05 AM</span></p>
                </div>

                <div className="h-6 w-[1px] bg-slate-200 hidden lg:block"></div>

                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold transition-colors ${isAutoRefreshEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                        Auto-refresh
                    </span>
                    <button
                        onClick={() => onToggleAutoRefresh(!isAutoRefreshEnabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isAutoRefreshEnabled ? 'bg-green-500' : 'bg-slate-200'}`}
                        role="switch"
                        aria-checked={isAutoRefreshEnabled}
                    >
                        <span className="sr-only">Use setting</span>
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoRefreshEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                    </button>
                </div>

                <div className="flex items-center">
                    <button
                        onClick={onClearData}
                        className="bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 shadow-sm active:scale-95 group ml-2"
                        title="Clear Chart Data"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Clear</span>
                    </button>

                    <button
                        onClick={onManualRefresh}
                        className="bg-white hover:bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 shadow-sm hover:shadow active:scale-95 group ml-2"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${isAutoRefreshEnabled ? 'group-hover:rotate-180' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>
        </header>
    );
};
