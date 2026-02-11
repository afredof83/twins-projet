// components/MessageBubble.tsx
'use client';
import { Shield } from 'lucide-react';
import Markdown from 'react-markdown';

interface MessageBubbleProps {
    message: { role: string; content: string };
    onSendPing?: (topic: string) => void;
}

export default function MessageBubble({ message, onSendPing }: MessageBubbleProps) {
    // On cherche si le message contient la balise TRIGGER_PING
    const pingMatch = message.content.match(/\[TRIGGER_PING:(.*?)\]/);
    // Remove both the trigger ping tag and any [SOURCE: ...] tags for cleaner display
    let cleanContent = message.content
        .replace(/\[TRIGGER_PING:.*?\]/, "")
        .replace(/\[SOURCE:.*?\]/, "")
        .trim();

    const isUser = message.role === 'user';

    return (
        <div className={`p-4 rounded-xl max-w-[85%] ${isUser ? 'bg-blue-600 self-end ml-auto' : 'bg-slate-800 self-start border border-slate-700'}`}>
            <div className="text-sm prose prose-invert max-w-none">
                <Markdown>{cleanContent}</Markdown>
            </div>

            {pingMatch && onSendPing && (
                <div className="mt-4 p-3 border border-blue-500/30 bg-blue-500/10 rounded-lg flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Shield size={12} className="text-blue-400" /> Action de sécurité disponible
                    </p>
                    <button
                        onClick={() => onSendPing(pingMatch[1])}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        🔔 ENVOYER UN PING AU CLONE
                        <span className="bg-black/20 px-1 py-0.5 rounded text-[10px] opacity-80">
                            (Sujet: {pingMatch[1]})
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
