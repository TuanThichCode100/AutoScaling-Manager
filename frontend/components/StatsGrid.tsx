import React, { useRef, useState } from 'react';
import { CloudUpload, TrendingUp, Clock, History, Activity, Zap, Info, Building, Loader2, CheckCircle, FileSpreadsheet } from 'lucide-react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

interface StatsGridProps {
    onFileUpload?: (file: File) => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${className} ${onClick ? 'cursor-pointer' : ''}`}>
        {children}
    </div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ onFileUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
    const [fileName, setFileName] = useState<string>('');

    const handleInputClick = () => {
        if (uploadStatus !== 'uploading') {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            setUploadStatus('uploading');

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    if (onFileUpload) {
                        onFileUpload(file);
                    }
                    setUploadStatus('success');

                    // Reset status after a few seconds to allow new uploads
                    setTimeout(() => {
                        setUploadStatus('idle');
                        setFileName('');
                    }, 4000);
                } else {
                    console.error('Upload failed:', response.statusText);
                    setUploadStatus('idle');
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                setUploadStatus('idle');
            }
        }
    };

    return (
        <div className="h-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Input Model (Interactive Parquet Loader) */}
            <div
                onClick={handleInputClick}
                className={`col-span-1 bg-white border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50 rounded-xl p-4 flex flex-col justify-center items-center gap-2 cursor-pointer transition-all group relative overflow-hidden shadow-sm ${uploadStatus === 'success' ? 'border-green-300 bg-green-50' : ''}`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".parquet,.json,.csv"
                    className="hidden"
                />

                {uploadStatus === 'idle' && (
                    <>
                        <div className="bg-primary/10 p-2.5 rounded-full text-primary mb-1 group-hover:scale-110 transition-transform">
                            <CloudUpload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-900 text-center group-hover:text-primary transition-colors">Load Parquet</p>
                        <p className="text-[10px] text-slate-500 text-center font-medium">Extract Timestamp</p>
                    </>
                )}

                {uploadStatus === 'uploading' && (
                    <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-1" />
                        <p className="text-xs font-bold text-slate-700 text-center animate-pulse">Uploading...</p>
                        <p className="text-[9px] text-slate-400 text-center truncate max-w-[90%]">{fileName}</p>
                    </>
                )}

                {uploadStatus === 'success' && (
                    <>
                        <div className="bg-green-100 p-2.5 rounded-full text-green-600 mb-1 animate-in zoom-in">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-green-700 text-center">Uploaded</p>
                        <p className="text-[10px] text-green-600 text-center font-medium">Processing started</p>
                    </>
                )}
            </div>

            {/* 2. 1M Pred */}
            <Card>
                <div className="flex justify-between items-start z-10">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">1M Pred</span>
                    <Clock className="w-4 h-4 text-primary/30" />
                </div>
                <div className="z-10 mt-1">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">2,510</span>
                        <span className="text-[10px] text-slate-500">RPS</span>
                    </div>
                    <div className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="w-3 h-3" /> 3.2%
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 mt-auto rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '98%' }}></div>
                </div>
            </Card>

            {/* 3. 5M Pred */}
            <Card>
                <div className="flex justify-between items-start z-10">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">5M Pred</span>
                    <History className="w-4 h-4 text-primary/30" />
                </div>
                <div className="z-10 mt-1">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">2,840</span>
                        <span className="text-[10px] text-slate-500">RPS</span>
                    </div>
                    <div className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="w-3 h-3" /> 16.8%
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 mt-auto rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
            </Card>

            {/* 4. 15M Pred */}
            <Card>
                <div className="flex justify-between items-start z-10">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">15M Pred</span>
                    <History className="w-4 h-4 text-primary/30" />
                </div>
                <div className="z-10 mt-1">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">3,150</span>
                        <span className="text-[10px] text-slate-500">RPS</span>
                    </div>
                    <div className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="w-3 h-3" /> 29.6%
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 mt-auto rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '70%' }}></div>
                </div>
            </Card>

            {/* 5. Active Pods */}
            <Card>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">Active Pods</span>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </div>
                <div className="flex items-baseline gap-1 mb-auto">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">42</span>
                    <span className="text-[10px] text-slate-500">running</span>
                </div>
                <div className="space-y-1.5 mt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold w-6 text-slate-500 uppercase">Cpu</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full w-[78%]"></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold w-6 text-slate-500 uppercase">Mem</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-500 h-full w-[64%]"></div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 6. Forecast */}
            <Card>
                <div className="flex justify-between items-center mb-1 z-10">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">Forecast</span>
                    <Zap className="w-4 h-4 text-orange-500" fill="currentColor" />
                </div>
                <div className="z-10 mb-auto">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">58</span>
                        <span className="text-[10px] text-slate-500">pods</span>
                    </div>
                    <span className="text-[9px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-bold inline-block mt-1">+16 needed</span>
                </div>
                <button className="w-full mt-2 bg-primary hover:bg-blue-600 text-white py-1.5 rounded-lg text-[10px] font-bold shadow-sm shadow-blue-200 transition-all active:scale-95 uppercase tracking-wide z-10">
                    Approve
                </button>
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-orange-50/50 to-transparent pointer-events-none"></div>
            </Card>

            {/* 7. Strategy */}
            <Card className="border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">Strategy</span>
                    <Building className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-1 mb-auto">
                    <p className="text-[10px] text-slate-500 mb-0.5 font-medium">Proposed Action</p>
                    <p className="text-2xl font-black text-slate-900 leading-none tracking-tight">2x Scale</p>
                </div>
                <div className="mt-2 bg-slate-50 rounded p-2 border border-slate-100 flex items-start gap-1.5">
                    <Info className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-slate-500 font-medium leading-tight">Traffic spike &gt; 40% predicted in 15m.</p>
                </div>
            </Card>
        </div>
    );
};
