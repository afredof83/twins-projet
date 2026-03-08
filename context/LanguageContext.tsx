"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialLanguage = 'fr' }: { children: ReactNode, initialLanguage?: Language }) {
    const [language, setLanguageState] = useState<Language>(initialLanguage);
    const [messages, setMessages] = useState<any>({});

    useEffect(() => {
        const loadMessages = async () => {
            const response = await fetch(`/messages/${language}.json`);
            const data = await response.json();
            setMessages(data);
        };
        loadMessages();
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        // On pourrait aussi sauvegarder ici en localstorage ou via API
    };

    const t = (path: string) => {
        return path.split('.').reduce((obj, key) => obj?.[key], messages) || path;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
