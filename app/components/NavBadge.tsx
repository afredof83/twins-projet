"use client";

import React from "react";
import { useCortexGaps } from "@/app/hooks/useCortexGaps";

export default function NavBadge() {
    const { gaps, isLoading } = useCortexGaps();

    // Si ça charge ou qu'il n'y a pas de question, on ne montre pas le badge
    if (isLoading || !gaps?.question) return null;

    return (
        <span className="absolute top-1 right-1/4 translate-x-1/2 -translate-y-1/2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
    );
}
