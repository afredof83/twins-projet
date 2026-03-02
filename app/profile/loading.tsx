export default function Loading() {
    return (
        <div className="p-6 space-y-8 animate-pulse bg-zinc-950 min-h-screen">
            <div className="h-10 w-48 bg-zinc-900 rounded-xl" /> {/* Titre */}
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 w-full bg-zinc-900/50 border border-white/5 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
