'use client';
import { Bell, BellOff } from 'lucide-react';
import { useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function CommlinkButton({ profileId }: { profileId: string }) {
    const [isSubscribed, setIsSubscribed] = useState(false);

    const subscribe = async () => {
        if (!('serviceWorker' in navigator)) return;

        try {
            // 1. Enregistrement du Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js');

            // 2. Demande de permission et souscription
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
            });

            // 3. Envoi au QG (Base de données)
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify({ subscription, profileId }),
                headers: { 'Content-Type': 'application/json' }
            });

            setIsSubscribed(true);
            alert("📡 Liaison Commlink établie !");
        } catch (e) {
            console.error("Erreur Commlink:", e);
            alert("Echec de la liaison Commlink.");
        }
    };

    return (
        <button
            onClick={subscribe}
            className={`p-2 rounded-lg border transition-all ${isSubscribed ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            title="Activer Commlink"
        >
            {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
    );
}
