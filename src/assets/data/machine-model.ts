import { Machines } from './machines';

export type MachinesKey = keyof typeof Machines;

export interface IMachines {
    minerMk1: IMachine,
    minerMk2: IMachine,
    minerMk3: IMachine,
    oilExtractor: IMachine,
    waterExtractor: IMachine,
    resourceWellPressurizer: IMachine,
    resourceWellExtractor: IMachine,
    smelter: IMachine,
    foundry: IMachine,
    constructor: IMachine,
    assembler: IMachine,
    manufacturer: IMachine,
    refinery: IMachine,
    packager: IMachine,
    blender: IMachine,
    particleAcceleratorNuclearPasta: IMachine,
    particleAcceleratorPlutoniumPellet: IMachine,
    equipmentWorkshop: IMachine,
    nuclearPowerPlant: IMachine,
}

export interface IMachine {
    name: string,
    power: {
        min: number,
        max: number
    },
    ingredients: IMachineIngredients
}

export type IMachineIngredients = {
    [key: string]: number;
};
