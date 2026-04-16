import { getPopulationData } from '../../services/population';
import { POPULATION_UPDATE_INTERVAL } from '../../config/constants';

export function initPopulationCounter(): void {
    const popWorldEl = document.getElementById('popWorld')!;

    function update(): void {
        const data = getPopulationData();
        popWorldEl.textContent = data.worldPopFormatted;
    }

    update();
    setInterval(update, POPULATION_UPDATE_INTERVAL);
}
