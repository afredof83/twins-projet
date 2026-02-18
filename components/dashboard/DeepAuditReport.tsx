"use client";
import { useState } from "react";
import { motion } from "framer-motion";

type Tab = 'PSYCHE' | 'NETWORK' | 'RISK';

export default function DeepAuditReport({ data, onAction }: { data: any, onAction: (a: 'LINK' | 'BLOCK' | 'CANCEL') => void }) {
    const [activeTab, setActiveTab] = useState<Tab>('PSYCHE');

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-x-0 bottom-0 top-20 z-50 bg-black/90 backdrop-blur-xl border-t border-cyan-500/50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
        >
            {/* HEADER TACTIQUE */}
            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-gradient-to-r from-cyan-950/30 to-transparent">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-cyan-500 font-mono text-xs tracking-widest">CONFIDENTIAL // EYES ONLY</span>
                    </div>
                    <h2 className="text-3xl text-white font-bold tracking-tight">{data.identity.name.toUpperCase()}</h2>
                    <p className="text-slate-400 text-sm font-mono">{data.identity.role} // CLR: {data.identity.clearance}</p>
                </div>

                {/* GROS SCORE CIRCULAIRE */}
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 border-cyan-500/20 relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-cyan-900" />
                        <circle cx="50%" cy="50%" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-cyan-400" strokeDasharray="226" strokeDashoffset={226 - (226 * data.scores.match) / 100} />
                    </svg>
                    <span className="text-xl font-bold text-white">{data.scores.match}%</span>
                    <span className="text-[0.6rem] text-cyan-400 uppercase">Match</span>
                </div>
            </div>

            {/* NAVIGATION ONGLETS */}
            <div className="flex border-b border-white/10">
                {(['PSYCHE', 'NETWORK', 'RISK'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors relative ${activeTab === tab ? 'text-cyan-400 bg-cyan-950/20' : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENU DYNAMIQUE */}
            <div className="flex-1 p-6 overflow-y-auto">

                {activeTab === 'PSYCHE' && (
                    <div className="space-y-6">
                        <h3 className="text-white/50 text-xs font-mono mb-4">NEURAL PATTERN RECOGNITION</h3>
                        {data.psyche.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white font-medium">{item.trait}</span>
                                    <span className="text-cyan-400 font-mono">{item.value}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.value}%` }}
                                        transition={{ delay: idx * 0.1, duration: 0.8 }}
                                        className="h-full bg-cyan-500 rounded-full"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 text-right italic">{item.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'NETWORK' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900/50 p-3 rounded border border-white/5">
                                <p className="text-xs text-slate-400">INFLUENCE</p>
                                <p className="text-xl text-white font-mono">{data.scores.influence}/100</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded border border-white/5">
                                <p className="text-xs text-slate-400">RELIABILITY</p>
                                <p className="text-xl text-green-400 font-mono">{data.scores.reliability}%</p>
                            </div>
                        </div>
                        <h3 className="text-white/50 text-xs font-mono mb-2">CONNECTIONS</h3>
                        <ul className="space-y-3">
                            {data.network.map((node: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                                    <span className="mt-1 w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                                    {node}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {activeTab === 'RISK' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-lg mb-4">
                            <h4 className="text-red-400 text-sm font-bold flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                THREAT ASSESSMENT
                            </h4>
                        </div>
                        {data.risks.length > 0 ? (
                            <ul className="space-y-2">
                                {data.risks.map((risk: string, idx: number) => (
                                    <li key={idx} className="text-sm text-red-200/70 border-l-2 border-red-900 pl-3">
                                        {risk}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-green-500 text-sm font-mono">NO CRITICAL ANOMALIES DETECTED.</p>
                        )}
                    </div>
                )}
            </div>

            {/* FOOTER ACTIONS (Fixe en bas) */}
            <div className="p-4 bg-black border-t border-white/10 grid grid-cols-3 gap-3 pb-[env(safe-area-inset-bottom)]">
                <button onClick={() => onAction('CANCEL')} className="py-3 text-slate-400 text-xs font-bold bg-slate-900 rounded border border-slate-700 hover:bg-slate-800">
                    DISMISS
                </button>
                <button onClick={() => onAction('BLOCK')} className="py-3 text-red-400 text-xs font-bold bg-red-950/30 rounded border border-red-900/30 hover:bg-red-900/20">
                    NEUTRALIZE
                </button>
                <button onClick={() => onAction('LINK')} className="relative py-3 text-black text-xs font-bold bg-cyan-400 rounded hover:bg-cyan-300 overflow-hidden group">
                    <span className="relative z-10">INITIATE LINK</span>
                    <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
}
