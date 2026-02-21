
import React from 'react';

export const NeuralLink: React.FC = () => {
    return (
        <div className="glass-panel rounded-2xl p-1 relative overflow-hidden aspect-square flex items-center justify-center group">
            {/* Decorative Corners */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black/40">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(19,200,236,0.1)_0%,transparent_70%)]"></div>
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAqc2MUNZfB4YyJqlqRW5aWQyXq7RhxNf6fF4w1PPVt6N5eR2KEKzXaATdxd-pnPT_U30EDoh5ykzBuJUBVnh0FXPLS69Z8LssaD-ngB3VNRi0aO63uUAvtbyZvbTGIps0V2tVKah4oLqR169WZx-XtgClTzHj1SGBAct5-KvGMKz01vx5xyNk55mxpkWJairrarl80hE07VUAESvNFfYpnhnn1dp3raYek2F7XcqF4q8kZHLws0iDW1_7RT98E7Ls6_M0rOmUH5Lp"
                    alt="Neural Map"
                    className="w-full h-full object-cover opacity-60 mix-blend-screen group-hover:scale-110 transition-transform duration-[10s] ease-linear"
                />

                {/* Animated HUD Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-primary/30 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <div className="w-[80%] h-[80%] border border-dashed border-primary/20 rounded-full"></div>
                </div>

                {/* Floating Markers */}
                <div className="absolute top-[30%] left-[20%] flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 bg-accent-amber rounded-full shadow-[0_0_8px_#ffb020]"></div>
                    <span className="text-[8px] bg-black/60 px-1 text-accent-amber border border-accent-amber/30 font-mono">ALERT_04</span>
                </div>
                <div className="absolute bottom-[40%] right-[25%] flex items-center gap-2">
                    <span className="text-[8px] bg-black/60 px-1 text-primary border border-primary/30 font-mono">SEC_09</span>
                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#13c8ec]"></div>
                </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-[10px] text-primary/80 tracking-[0.2em] font-mono">NEURAL_LINK_ESTABLISHED</p>
            </div>
        </div>
    );
};
