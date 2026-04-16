import { POP_BASE, POP_EPOCH, POP_RATE, THRESHOLD } from '../config/constants';
import { formatPop } from '../utils/format';

export interface PopulationData {
    worldPop: number;
    target: number;
    worldPopFormatted: string;
    targetFormatted: string;
}

export function getPopulationData(): PopulationData {
    const now = Date.now();
    const elapsed = (now - POP_EPOCH) / 1000;
    const worldPop = Math.floor(POP_BASE + elapsed * POP_RATE);
    const target = Math.floor(worldPop * THRESHOLD);

    return {
        worldPop,
        target,
        worldPopFormatted: formatPop(worldPop),
        targetFormatted: formatPop(target),
    };
}
