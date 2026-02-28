'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

export default function SplashHider() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            SplashScreen.hide();
        }
    }, []);

    return null;
}
