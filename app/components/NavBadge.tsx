"use client";

import React, { useState, useEffect } from "react";

export default function NavBadge() {
    const [hasAlert, setHasAlert] = useState(false);

    useEffect(() => {
        async function fetchGap() {
            try {
                const res = await fetch("/api/cortex/analyze-gaps");
                const data = await res.json();
                if (data.question && data.field) {
                    setHasAlert(true);
                }
            } catch (e) {
                console.error("Failed to fetch gap analysis for nav:", e);
            }
        }

        fetchGap();
    }, []);

    if (!hasAlert) return null;

    return (
        <span className="absolute top-1 right-1/4 translate-x-1/2 -translate-y-1/2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
    );
}
