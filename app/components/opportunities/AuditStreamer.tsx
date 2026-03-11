'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Zap, AlertCircle } from 'lucide-react';

interface AuditStreamerProps {
    opportunityId: string;
    onComplete?: (finalAudit: string) => void;
}

/**
 * 🛰️ AuditStreamer
 * Consumes the Edge-streamed Markdown audit from Mistral AI.
 */
export default function AuditStreamer({ opportunityId, onComplete }: AuditStreamerProps) {
    const [streamedText, setStreamedText] = useState('');
    const [status, setStatus] = useState<'idle' | 'streaming' | 'completed' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const startStream = async () => {
            setStatus('streaming');
            setError(null);
            setStreamedText('');

            try {
                const response = await fetch('/api/opportunities/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ opportunityId }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to start evaluation');
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                if (!reader) throw new Error('No stream reader available');

                let accumulatedText = '';
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    accumulatedText += chunk;
                    setStreamedText(accumulatedText);
                    
                    // Auto-scroll to bottom
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                }

                setStatus('completed');
                if (onComplete) onComplete(accumulatedText);

            } catch (err: any) {
                console.error("❌ [STREAM ERROR]:", err);
                setError(err.message);
                setStatus('error');
            }
        };

        startStream();
    }, [opportunityId, onComplete]);

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${status === 'streaming' ? 'text-yellow-400 animate-pulse' : 'text-blue-400'}`} />
                    <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                        Analyse Cortex en temps réel
                    </span>
                </div>
                {status === 'streaming' && (
                    <div className="flex items-center gap-2 text-[10px] text-yellow-400 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        STREAMING_ACTIVE
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div 
                ref={scrollRef}
                className="flex-1 p-6 overflow-y-auto font-sans text-slate-200 selection:bg-blue-500/30"
            >
                {status === 'error' ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                        <p className="text-sm text-red-200 font-medium">{error}</p>
                    </div>
                ) : streamedText ? (
                    <article className="prose prose-invert prose-blue max-w-none">
                        <ReactMarkdown 
                            components={{
                                h3: ({node, ...props}) => <h3 className="text-blue-400 border-l-2 border-blue-500 pl-4 mt-8 mb-4 tracking-tight" {...props} />,
                                p: ({node, ...props}) => <p className="leading-relaxed text-slate-300 mb-4" {...props} />,
                                li: ({node, ...props}) => <li className="text-slate-300 marker:text-blue-500" {...props} />,
                            }}
                        >
                            {streamedText}
                        </ReactMarkdown>
                        {status === 'streaming' && (
                            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 align-middle" />
                        )}
                    </article>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-xs text-blue-400 font-mono animate-pulse">
                            Initialisation du moteur de synergie...
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-black/40 border-t border-white/5 text-[10px] text-slate-500 font-mono flex justify-between">
                <span>Mistral-Small-Latest</span>
                <span>{streamedText.length} bytes received</span>
            </div>
        </div>
    );
}
