import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MainChart, ChartDataPoint } from './components/MainChart';
import { StatsGrid } from './components/StatsGrid';
import { ViewMode } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
    const [realtimeData, setRealtimeData] = useState<ChartDataPoint[]>([]);
    const [historicalData, setHistoricalData] = useState<ChartDataPoint[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('Live');
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    // Fetch History Data
    const fetchHistory = useCallback(async (range: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/history?range=${range}`);
            if (response.ok) {
                const data = await response.json();
                // Map backend data to ChartDataPoint
                const formattedData = data.map((d: any) => ({
                    time: new Date(d.time).toLocaleTimeString([], { hour12: false }), // Backend now returns 'time', not 'timestamp'
                    actual: d.actual, // Use 'actual' directly
                    model1: d.model1, // Use 'model1' directly
                    model2: d.model2 // Use 'model2' directly
                }));
                setHistoricalData(formattedData);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // WebSocket Connection
    useEffect(() => {
        if (viewMode !== 'Live' || !isAutoRefreshEnabled) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // Handles proxy or same-origin
        // If dev mode without proxy, might need hardcoded localhost:8000, but proxy is better
        // Using relative path for WS if proxy is set up or same origin
        const wsUrl = `${protocol}//${host}/ws/live`;

        let ws: WebSocket | null = null;
        let retryInterval: NodeJS.Timeout;

        const connect = () => {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WS Connected');
                setWsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const point = JSON.parse(event.data);
                    // Point format: { time, actual, model1, model2 }
                    const timeStr = new Date(point.time).toLocaleTimeString([], { hour12: false });

                    setRealtimeData(prev => {
                        const newData = [...prev, {
                            time: timeStr,
                            actual: point.actual || 0, // Assume WS sends 'actual'
                            model1: point.model1 || 0, // Assume WS sends 'model1'
                            model2: point.model2 || 0  // Assume WS sends 'model2'
                        }];
                        // Keep last 50 points
                        return newData.slice(-50);
                    });
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            ws.onclose = () => {
                console.log('WS Disconnected');
                setWsConnected(false);
                // Retry params could be managed here
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
            if (retryInterval) clearInterval(retryInterval);
        };
    }, [viewMode, isAutoRefreshEnabled]);

    // Handle View Mode Change
    useEffect(() => {
        if (viewMode !== 'Live') {
            fetchHistory(viewMode);
        }
    }, [viewMode, fetchHistory]);

    const handleClearData = () => {
        setRealtimeData([]);
    };

    // Display Logic
    const displayedData = viewMode === 'Live' ? realtimeData : historicalData;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50">
            <Header
                isAutoRefreshEnabled={isAutoRefreshEnabled}
                onToggleAutoRefresh={setIsAutoRefreshEnabled}
                onManualRefresh={() => { }} // Not really manual refresh for WS, maybe reconnect
                onClearData={handleClearData}
            />

            {!wsConnected && viewMode === 'Live' && (
                <div className="bg-orange-100 text-orange-800 text-xs p-1 text-center">
                    Connecting to live stream...
                </div>
            )}

            <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
                <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                    <MainChart
                        data={displayedData}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />
                </div>
                <div className="shrink-0 h-[220px] sm:h-[180px] lg:h-[22vh] min-h-[160px]">
                    <StatsGrid onFileUpload={() => { /** Handled by component internal fetch, maybe trigger refresh? */ }} />
                </div>
            </main>
        </div>
    );
}
