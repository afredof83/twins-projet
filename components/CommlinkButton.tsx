'use client';
export default function CommlinkButton({ profileId }: { profileId: string | null }) {
    return (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-900/10 border border-green-900/50 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.2)]">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-mono text-green-500 tracking-wider">LIAISON: ACTIVE</span>
        </div>
    );
}
