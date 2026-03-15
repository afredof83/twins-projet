import { create } from 'zustand';

export type PrismType = 'WORK' | 'HOBBY' | 'DATING';

interface PrismState {
    currentPrism: PrismType;
    setPrism: (prism: PrismType) => void;
    nextPrism: () => void;
    prevPrism: () => void;
}

const PRISMS: PrismType[] = ['WORK', 'HOBBY', 'DATING'];

export const usePrismStore = create<PrismState>((set, get) => ({
    currentPrism: 'WORK', // Par défaut
    setPrism: (prism) => set({ currentPrism: prism }),
    nextPrism: () => {
        const { currentPrism } = get();
        const currentIndex = PRISMS.indexOf(currentPrism);
        const nextIndex = (currentIndex + 1) % PRISMS.length;
        set({ currentPrism: PRISMS[nextIndex] });
    },
    prevPrism: () => {
        const { currentPrism } = get();
        const currentIndex = PRISMS.indexOf(currentPrism);
        const prevIndex = (currentIndex - 1 + PRISMS.length) % PRISMS.length;
        set({ currentPrism: PRISMS[prevIndex] });
    },
}));
