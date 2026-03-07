import { create } from 'zustand';

interface KeyState {
    masterKey: string | null;
    setMasterKey: (key: string | null) => void;
    clearMasterKey: () => void;
}

export const useKeyStore = create<KeyState>((set) => ({
    masterKey: null,
    setMasterKey: (key) => set({ masterKey: key }),
    clearMasterKey: () => set({ masterKey: null }),
}));
