import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { TrendingUp, AlertCircle, RotateCcw, ZoomIn, Star, Trophy, CalendarClock, Activity, BookOpen, X, HelpCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { ViewMode } from '../types';

export interface ChartDataPoint {
    time: string;
    actual?: number | null;
    model1: number;
    model2: number;
}

interface MainChartProps {
    data: ChartDataPoint[];
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

const ERROR_THRESHOLD = 0.15; // 15% deviation triggers error state

// Custom Dot Component to show errors on the line
const ErrorDot = ({ cx, cy, payload, dataKey }: any) => {
    if (!cx || !cy || !payload || !payload.actual) return null;

    const actual = payload.actual;
    const val = payload[dataKey];
    const deviation = Math.abs(actual - val) / actual;

    if (deviation > ERROR_THRESHOLD) {
        return (
            <g transform={`translate(${cx},${cy})`}>
                <circle r="3.5" fill="#fff" stroke="#ef4444" strokeWidth="1.5" />
                <circle r="8" fill="none" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" className="animate-pulse" />
            </g>
        );
    }
    return null;
};

// Lightweight Sparkline Component for Tooltip
const Sparkline = ({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) => {
    if (!data || data.length < 2) return <div className="w-[40px]" />;

    const width = 40;
    const height = 16;
    const values = data.map(d => d[dataKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((val, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const lastX = width;
    const lastY = height - ((values[values.length - 1] - min) / range) * height;

    return (
        <div className="flex items-center justify-center w-[40px] h-[16px] mx-2">
            <svg width={width} height={height} className="overflow-visible">
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.8}
                />
                <circle cx={lastX} cy={lastY} r={1.5} fill={color} />
            </svg>
        </div>
    );
};

// Modal for explaining deviation
const DeviationModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: any }) => {
    if (!isOpen || !data) return null;

    const modelName = data.modelKey === 'model1' ? 'LightGBM + EMWA' : 'LightGBM';
    const deviationPct = (data.deviation * 100).toFixed(1);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-900">Prediction Deviation</h3>
                            <p className="text-xs text-red-700 font-medium">{modelName} • {deviationPct}% Error</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        The model's prediction significantly diverged from the actual request per second (RPS) count. This anomaly exceeds the configured threshold of <strong>{(ERROR_THRESHOLD * 100)}%</strong>.
                    </p>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                            Potential Root Causes
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                "Sudden unscheduled traffic spike (DDoS or Flash Crowd)",
                                "Feature drift: Input data distribution has changed significantly",
                                "Model is over-smoothing recent volatile data points",
                                "Infrastructure latency affecting metric collection"
                            ].map((cause, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                    <span className="mt-1 size-1.5 rounded-full bg-slate-400 shrink-0" />
                                    {cause}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex gap-3">
                        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900">Recommended Action</p>
                            <p className="text-[11px] text-blue-800 leading-snug">
                                Check system logs for traffic anomalies. If traffic is legitimate, consider retraining the model with the latest dataset to capture this new trend.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all hover:text-slate-900"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label, chartData, onLearnMore }: any) => {
    if (active && payload && payload.length) {
        // label is the index, get the time string from chartData
        const dataPoint = chartData[label];
        const timeLabel = dataPoint?.time || label;
        const currentIndex = typeof label === 'number' ? label : 0;

        // Get last 6 points including current for trend (approx 30 mins)
        const startIndex = Math.max(0, currentIndex - 5);
        const trendData = chartData.slice(startIndex, currentIndex + 1);

        // Find actual value for comparison
        const actualEntry = payload.find((p: any) => p.dataKey === 'actual');
        const actualValue = actualEntry ? actualEntry.value : 0;

        // Check if this is a future prediction point (no actual data)
        const isPrediction = actualValue === null || actualValue === undefined;

        // Determine Best Model at this point
        let bestModelAtPoint = '';
        if (!isPrediction) {
            const m1Entry = payload.find((p: any) => p.dataKey === 'model1');
            const m2Entry = payload.find((p: any) => p.dataKey === 'model2');
            if (m1Entry && m2Entry) {
                const dev1 = Math.abs(actualValue - m1Entry.value);
                const dev2 = Math.abs(actualValue - m2Entry.value);
                bestModelAtPoint = dev1 <= dev2 ? 'model1' : 'model2';
            }
        }

        return (
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg shadow-slate-200/50 min-w-[220px] z-50 pointer-events-auto select-text">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-2">
                    <p className="text-slate-500 text-[10px] font-medium font-mono">{timeLabel}</p>
                    {isPrediction && <span className="text-[9px] font-bold bg-purple-100 text-purple-600 px-1.5 rounded-full">FORECAST</span>}
                </div>
                <div className="flex flex-col gap-3">
                    {payload.map((entry: any) => {
                        if (entry.value === null || entry.value === undefined) return null;

                        const isModel = entry.dataKey !== 'actual';
                        const deviation = !isPrediction && isModel && actualValue > 0 ? Math.abs(actualValue - entry.value) / actualValue : 0;
                        const isError = !isPrediction && deviation > ERROR_THRESHOLD;
                        const isBest = !isPrediction && isModel && entry.dataKey === bestModelAtPoint;

                        // Error details
                        const diff = entry.value - actualValue;
                        const type = diff > 0 ? 'Over' : 'Under';

                        return (
                            <div key={entry.dataKey} className="flex flex-col gap-0.5">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                        <span className="font-bold capitalize w-14 truncate flex items-center gap-1" style={{ color: entry.color }}>
                                            {entry.dataKey === 'actual' ? 'Actual' : entry.dataKey === 'model1' ? 'LGBM+' : 'LGBM'}
                                            {isBest && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                        </span>
                                        <Sparkline data={trendData} dataKey={entry.dataKey} color={entry.color} />
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <span className={`font-mono font-medium ${isError ? 'text-red-600 font-bold' : (isBest ? 'text-slate-900 font-bold' : 'text-slate-700')}`}>
                                            {entry.value.toLocaleString()}
                                        </span>
                                        {isError && (
                                            <div className="flex items-center gap-1 text-red-600 bg-red-50 px-1 rounded-sm border border-red-100/50">
                                                <span className="text-[9px] font-bold">DEV &gt; 15%</span>
                                                <AlertCircle className="w-3 h-3 shrink-0 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isError && (
                                    <div className="mt-1 bg-red-50/80 border border-red-100 rounded-md p-1.5 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-red-700">Deviation</span>
                                            <span className="text-[10px] font-mono font-bold text-red-600">{(deviation * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] text-red-600/80 mb-1">
                                            <span>{type}estimate</span>
                                            <span className="font-mono">{diff > 0 ? '+' : ''}{diff.toLocaleString()}</span>
                                        </div>
                                        <button
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                onLearnMore({ modelKey: entry.dataKey, deviation });
                                            }}
                                            className="text-[9px] font-bold text-red-700 underline decoration-red-300 hover:text-red-900 hover:decoration-red-700 transition-all self-start flex items-center gap-1 cursor-pointer bg-white/50 px-1 rounded w-full justify-center py-0.5 hover:bg-white"
                                        >
                                            <BookOpen className="w-2.5 h-2.5" />
                                            Learn more
                                            <ArrowRight className="w-2.5 h-2.5 ml-auto opacity-50" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

// Overlay component shown during selection
const SelectionOverlay = ({ viewBox, startIndex, endIndex, data }: any) => {
    if (!viewBox || startIndex === undefined || endIndex === undefined || !data) return null;
    const { x, width } = viewBox;

    const i1 = Number(startIndex);
    const i2 = Number(endIndex);

    if (isNaN(i1) || isNaN(i2)) return null;

    const start = Math.min(i1, i2);
    const end = Math.max(i1, i2);
    const count = end - start + 1;

    if (count <= 1) return null;

    const t1 = data[start]?.time;
    const t2 = data[end]?.time;

    if (!t1 || !t2) return null;

    const parseToSeconds = (t: string) => {
        const [h, m, s] = t.split(':').map(Number);
        return h * 3600 + m * 60 + s;
    };

    const diffSeconds = Math.abs(parseToSeconds(t2) - parseToSeconds(t1));

    let durationLabel = `${diffSeconds}s`;
    if (diffSeconds >= 60) {
        const min = Math.floor(diffSeconds / 60);
        const sec = diffSeconds % 60;
        durationLabel = `${min}m ${sec}s`;
    }

    return (
        <foreignObject x={x} y={0} width={width} height={30} style={{ overflow: 'visible', pointerEvents: 'none' }}>
            <div className="flex justify-center w-full pt-1">
                <div className="bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-md flex items-center gap-2 whitespace-nowrap opacity-90 backdrop-blur-sm border border-slate-600/50 transform transition-all animate-in fade-in zoom-in-95 duration-150">
                    <span className="font-bold text-blue-200">{count} pts</span>
                    <span className="w-px h-2.5 bg-slate-600"></span>
                    <span className="font-mono">{durationLabel}</span>
                </div>
            </div>
        </foreignObject>
    );
};

const ReferenceAreaAny = ReferenceArea as any;

export const MainChart: React.FC<MainChartProps> = ({ data, viewMode, onViewModeChange }) => {
    const [models, setModels] = useState({ model1: true, model2: true });

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>(null);

    // Zoom State
    const [left, setLeft] = useState<string | number>('dataMin');
    const [right, setRight] = useState<string | number>('dataMax');
    const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
    const [refAreaRight, setRefAreaRight] = useState<string | number>('');

    // Add index for numeric x-axis scaling
    const chartData = data.map((d, i) => ({ ...d, index: i }));

    const isZoomed = left !== 'dataMin' || right !== 'dataMax';
    const isHistory = viewMode !== 'Live';

    const handleLearnMore = (data: any) => {
        setModalData(data);
        setModalOpen(true);
    };

    const zoom = () => {
        let l = refAreaLeft;
        let r = refAreaRight;

        if (l === r || r === '') {
            setRefAreaLeft('');
            setRefAreaRight('');
            return;
        }

        // Ensure l is the smaller index
        if (l > r) [l, r] = [r, l];

        setRefAreaLeft('');
        setRefAreaRight('');
        setLeft(l);
        setRight(r);
    };

    const zoomOut = () => {
        setLeft('dataMin');
        setRight('dataMax');
        setRefAreaLeft('');
        setRefAreaRight('');
    };

    // Logic to calculate 5 distinct ticks (4 intervals) based on current zoom
    const getAxisTicks = () => {
        if (!chartData || chartData.length === 0) return undefined;

        // Resolve 'dataMin'/'dataMax' to actual indices
        const minIndex = left === 'dataMin' ? 0 : Number(left);
        const maxIndex = right === 'dataMax' ? chartData.length - 1 : Number(right);

        // Safety check
        if (minIndex >= maxIndex) return [minIndex];

        const tickCount = 5; // Start, 25%, 50%, 75%, End
        const step = (maxIndex - minIndex) / (tickCount - 1);

        const ticks = [];
        for (let i = 0; i < tickCount; i++) {
            const val = Math.round(minIndex + (i * step));
            // Ensure we don't go out of bounds (though clamp logic above helps)
            ticks.push(val);
        }

        // Filter duplicates and ensure within data bounds
        const uniqueTicks = [...new Set(ticks)]
            .filter(t => t >= 0 && t < chartData.length)
            .sort((a, b) => a - b);

        return uniqueTicks;
    };

    // Safe access to last element
    const currentRPS = chartData.length > 0 && chartData[chartData.length - 1].actual
        ? chartData[chartData.length - 1].actual
        : chartData.length > 1 ? chartData[chartData.length - 2].actual : 0;

    // Calculate Currently Best Performing Model (Legend) based on last actual data point
    const lastValidPoint = [...chartData].reverse().find(d => d.actual !== undefined && d.actual !== null);
    let legendBestModel = '';
    if (lastValidPoint && lastValidPoint.actual) {
        const dev1 = Math.abs(lastValidPoint.actual - lastValidPoint.model1);
        const dev2 = Math.abs(lastValidPoint.actual - lastValidPoint.model2);
        legendBestModel = dev1 <= dev2 ? 'model1' : 'model2';
    }

    const getTitle = () => {
        switch (viewMode) {
            case 'Live': return 'Real-time RPS';
            case '1H': return 'Historical RPS (Last Hour)';
            case '6H': return 'Historical RPS (Last 6 Hours)';
            case '24H': return 'Historical RPS (Last 24 Hours)';
            default: return 'RPS Overview';
        }
    }

    return (
        <div className="flex flex-col h-full relative group select-none">
            {/* Chart Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center shrink-0 bg-white z-10">
                <div className="flex flex-wrap gap-6 items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            {isHistory ? <CalendarClock className="w-4 h-4 text-purple-600" /> : <TrendingUp className="w-4 h-4 text-slate-500" />}
                            <div className="flex items-center gap-2">
                                <p className={`text-xs font-bold uppercase tracking-wider ${isHistory ? 'text-purple-700' : 'text-slate-500'}`}>
                                    {getTitle()}
                                </p>
                                {!isHistory && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                                {currentRPS?.toLocaleString() || '...'}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">req/sec</span>
                            {!isHistory && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200">+5.2%</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-4 shadow-sm overflow-x-auto">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 border-r border-slate-200 shrink-0 flex items-center gap-1">
                            Models <Trophy className="w-3 h-3 text-yellow-500 ml-1" />
                        </span>
                        <label className={`flex items-center gap-2 cursor-pointer group select-none px-2 py-1.5 rounded-md transition-all whitespace-nowrap relative border ${legendBestModel === 'model1' ? 'bg-amber-50 border-amber-200 shadow-sm' : 'hover:bg-white border-transparent'}`}>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={models.model1}
                                    onChange={(e) => setModels(prev => ({ ...prev, model1: e.target.checked }))}
                                    className="peer appearance-none size-4 border border-slate-300 rounded bg-white checked:bg-model1 checked:border-model1 focus:ring-offset-0 focus:ring-0 cursor-pointer transition-colors"
                                />
                                <div className="absolute inset-0 hidden peer-checked:block pointer-events-none">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <div className="h-0.5 w-4 bg-model1"></div>
                            <div className="flex flex-col">
                                <span className={`text-xs text-slate-900 group-hover:text-model1 transition-colors flex items-center gap-1 ${legendBestModel === 'model1' ? 'font-bold' : 'font-medium'}`}>
                                    LightGBM + EMWA
                                    {models.model1 ? <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                                </span>
                                {legendBestModel === 'model1' && (
                                    <span className="text-[9px] leading-none text-amber-700 font-bold bg-amber-100/50 px-1 py-0.5 rounded-sm self-start flex items-center gap-0.5 border border-amber-200/50 mt-0.5">
                                        <Star className="w-2 h-2 fill-amber-700" /> Best Fit
                                    </span>
                                )}
                            </div>
                        </label>
                        <label className={`flex items-center gap-2 cursor-pointer group select-none px-2 py-1.5 rounded-md transition-all whitespace-nowrap relative border ${legendBestModel === 'model2' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'hover:bg-white border-transparent'}`}>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={models.model2}
                                    onChange={(e) => setModels(prev => ({ ...prev, model2: e.target.checked }))}
                                    className="peer appearance-none size-4 border border-slate-300 rounded bg-white checked:bg-model2 checked:border-model2 focus:ring-offset-0 focus:ring-0 cursor-pointer transition-colors"
                                />
                                <div className="absolute inset-0 hidden peer-checked:block pointer-events-none">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <div className="h-0.5 w-4 bg-model2 border-dashed border-t border-transparent"></div>
                            <div className="flex flex-col">
                                <span className={`text-xs text-slate-900 group-hover:text-model2 transition-colors flex items-center gap-1 ${legendBestModel === 'model2' ? 'font-bold' : 'font-medium'}`}>
                                    LightGBM
                                    {models.model2 ? <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                                </span>
                                {legendBestModel === 'model2' && (
                                    <span className="text-[9px] leading-none text-emerald-700 font-bold bg-emerald-100/50 px-1 py-0.5 rounded-sm self-start flex items-center gap-0.5 border border-emerald-200/50 mt-0.5">
                                        <Star className="w-2 h-2 fill-emerald-700" /> Best Fit
                                    </span>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                    {/* Zoom Indicator/Reset */}
                    {isZoomed ? (
                        <button
                            onClick={zoomOut}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-primary rounded-lg text-xs font-bold transition-all border border-blue-200 shadow-sm animate-in fade-in"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Zoom
                        </button>
                    ) : (
                        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-2">
                            <ZoomIn className="w-3 h-3" />
                            <span>Drag to zoom</span>
                        </div>
                    )}

                    <div className="hidden lg:flex items-center gap-4 text-[10px] text-slate-500 border border-slate-200 rounded px-3 py-1.5 bg-slate-50 shadow-sm">
                        <div className="flex items-center gap-1.5 cursor-default select-none">
                            <div className="w-3 h-0.5 bg-primary"></div>
                            <span className="font-medium text-slate-900">Actual</span>
                        </div>

                        <button
                            onClick={() => setModels(prev => ({ ...prev, model1: !prev.model1 }))}
                            className={`flex items-center gap-1.5 transition-all outline-none focus:ring-1 focus:ring-primary/20 rounded px-1 -mx-1 ${models.model1 ? 'opacity-100 hover:bg-slate-100' : 'opacity-40 hover:opacity-60'}`}
                            title="Toggle LightGBM + EMWA"
                        >
                            <div className="w-3 h-0.5 bg-model1 border-dashed border-t-0"></div>
                            <span className={`font-medium ${models.model1 ? 'text-slate-900' : 'text-slate-500 decoration-slate-400 line-through'}`}>LGBM+</span>
                        </button>

                        <button
                            onClick={() => setModels(prev => ({ ...prev, model2: !prev.model2 }))}
                            className={`flex items-center gap-1.5 transition-all outline-none focus:ring-1 focus:ring-primary/20 rounded px-1 -mx-1 ${models.model2 ? 'opacity-100 hover:bg-slate-100' : 'opacity-40 hover:opacity-60'}`}
                            title="Toggle LightGBM"
                        >
                            <div className="w-3 h-0.5 bg-model2 border-dashed border-t-0"></div>
                            <span className={`font-medium ${models.model2 ? 'text-slate-900' : 'text-slate-500 decoration-slate-400 line-through'}`}>LGBM</span>
                        </button>
                    </div>

                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 gap-1">
                        <button
                            onClick={() => {
                                onViewModeChange('Live');
                                zoomOut();
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'Live'
                                ? 'bg-white text-green-600 shadow-sm border border-slate-200'
                                : 'text-slate-500 hover:text-green-600 hover:bg-white/50'
                                }`}
                        >
                            <Activity className="w-3.5 h-3.5" />
                            Live
                        </button>
                        <div className="w-px bg-slate-300 mx-0.5 my-1"></div>
                        {['1H', '6H', '24H'].map((range) => (
                            <button
                                key={range}
                                onClick={() => {
                                    onViewModeChange(range as ViewMode);
                                    zoomOut(); // Reset zoom when changing range context
                                }}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === range
                                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-purple-700 hover:bg-white/50'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                        onMouseDown={(e: any) => e && setRefAreaLeft(e.activeLabel)}
                        onMouseMove={(e: any) => refAreaLeft !== '' && e && setRefAreaRight(e.activeLabel)}
                        onMouseUp={zoom}
                    >
                        <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#137fec" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="index"
                            type="number"
                            domain={[left, right]}
                            allowDataOverflow={true}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            ticks={getAxisTicks()} // Apply dynamic 4-interval logic
                            dy={10}
                            padding={{ left: 30, right: 30 }}
                            tickFormatter={(index) => chartData[index]?.time || ''}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                            domain={[0, 4000]}
                            tickCount={5}
                            width={60}
                            label={{ value: 'REQS/S', angle: 0, position: 'insideTopLeft', dy: -20, dx: 10, fontSize: 9, fontWeight: 'bold', fill: '#64748b' }}
                        />
                        {/* Pass chartData explicitly to Tooltip so it can resolve time labels correctly */}
                        <Tooltip
                            content={<CustomTooltip chartData={chartData} onLearnMore={handleLearnMore} />}
                            wrapperStyle={{ pointerEvents: 'auto', outline: 'none' }}
                            cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />

                        {models.model2 && (
                            <Area
                                type="monotone"
                                dataKey="model2"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="none"
                                strokeDasharray="3 3"
                                isAnimationActive={!isZoomed}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                dot={<ErrorDot dataKey="model2" />}
                                connectNulls={true}
                            />
                        )}

                        {models.model1 && (
                            <Area
                                type="monotone"
                                dataKey="model1"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fill="none"
                                strokeDasharray="5 5"
                                isAnimationActive={!isZoomed}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                dot={<ErrorDot dataKey="model1" />}
                                connectNulls={true}
                            />
                        )}

                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="#137fec"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorActual)"
                            isAnimationActive={!isZoomed}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                            connectNulls={false}
                        />

                        {/* Selection Area Overlay - Enhanced visibility */}
                        {(refAreaLeft !== '') && (refAreaRight !== '') ? (
                            <ReferenceAreaAny
                                x1={refAreaLeft}
                                x2={refAreaRight}
                                strokeOpacity={0.3}
                                fill="#137fec"
                                fillOpacity={0.2}
                                label={(props: any) => (
                                    <SelectionOverlay
                                        {...props}
                                        startIndex={refAreaLeft}
                                        endIndex={refAreaRight}
                                        data={chartData}
                                    />
                                )}
                            />
                        ) : null}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Render Modal */}
            <DeviationModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                data={modalData}
            />
        </div>
    );
};
