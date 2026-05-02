const { evalGet } = require('../utils/evaluationHttp');
const { knapsackDp } = require('./vehicleKnapsack');

async function buildSchedule() {
    const [depotsRes, vehiclesRes] = await Promise.all([
        evalGet('/depots'),
        evalGet('/vehicles'),
    ]);

    const depots = depotsRes.data.depots || [];
    const vehicles = vehiclesRes.data.vehicles || [];

    const results = depots.map((depot) => {
        const budget = depot.MechanicHours;
        const { maxImpact, selectedTaskIds } = knapsackDp(budget, vehicles);
        const selectedSet = new Set(selectedTaskIds);
        const hoursUsed = vehicles
            .filter((v) => selectedSet.has(v.TaskID))
            .reduce((sum, v) => sum + v.Duration, 0);

        return {
            depotId: depot.ID,
            budgetMechanicHours: budget,
            maxImpact,
            selectedTaskIds,
            hoursUsed,
            withinBudget: hoursUsed <= budget,
        };
    });

    return {
        depotCount: depots.length,
        vehicleCount: vehicles.length,
        results,
    };
}

module.exports = { buildSchedule };
