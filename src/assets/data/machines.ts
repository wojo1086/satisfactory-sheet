import { IMachines } from './machine-model';

export const Machines: IMachines = {
    minerMk1: {
        name: 'Miner Mk1',
        power: {
            min: 5,
            max: 5
        },
        ingredients: {
            portableMiner: 1,
            ironPlate: 10,
            concrete: 10
        }
    },
    minerMk2: {
        name: 'Miner Mk2',
        power: {
            min: 12,
            max: 12
        },
        ingredients: {
            portableMiner: 2,
            encasedIndustrialBeam: 10,
            steelPipe: 20,
            modularFrame: 10
        }
    },
    minerMk3: {
        name: 'Miner Mk3',
        power: {
            min: 30,
            max: 30
        },
        ingredients: {
            portableMiner: 3,
            steelPipe: 50,
            supercomputer: 5,
            fusedModularFrame: 10,
            turboMotor: 3
        }
    },
    oilExtractor: {
        name: 'Oil Extractor',
        power: {
            min: 40,
            max: 40
        },
        ingredients: {
            motor: 15,
            encasedIndustrialBeam: 20,
            cable: 60
        }
    },
    waterExtractor: {
        name: 'Water Extractor',
        power: {
            min: 20,
            max: 20
        },
        ingredients: {
            copperSheet: 20,
            reinforcedIronPlate: 10,
            rotor: 10
        }
    },
    resourceWellPressurizer: {
        name: 'Resource Well Pressurizer',
        power: {
            min: 150,
            max: 150
        },
        ingredients: {
            wire: 200,
            rubber: 50,
            encasedIndustrialBeam: 50,
            motor: 50
        }
    },
    resourceWellExtractor: {
        name: 'Resource Well Extractor',
        power: {
            min: 0,
            max: 0
        },
        ingredients: {
            steelBeam: 10,
            plastic: 10
        }
    },
    smelter: {
        name: 'Smelter',
        power: {
            min: 4,
            max: 4
        },
        ingredients: {
            ironRod: 5,
            wire: 8
        }
    },
    foundry: {
        name: 'Foundry',
        power: {
            min: 16,
            max: 16
        },
        ingredients: {
            modularFrame: 10,
            rotor: 10,
            concrete: 20
        }
    },
    constructor: {
        name: 'Constructor',
        power: {
            min: 4,
            max: 4
        },
        ingredients: {
            reinforcedIronPlate: 2,
            cable: 8
        }
    },
    assembler: {
        name: 'Assembler',
        power: {
            min: 15,
            max: 15
        },
        ingredients: {
            reinforcedIronPlate: 8,
            rotor: 4,
            cable: 10
        }
    },
    manufacturer: {
        name: 'Manufacturer',
        power: {
            min: 55,
            max: 55
        },
        ingredients: {
            motor: 5,
            heavyModularFrame: 10,
            cable: 50,
            plastic: 50
        }
    },
    refinery: {
        name: 'Refinery',
        power: {
            min: 30,
            max: 30
        },
        ingredients: {
            motor: 10,
            encasedIndustrialBeam: 10,
            steelPipe: 30,
            copperSheet: 20
        }
    },
    packager: {
        name: 'Packager',
        power: {
            min: 10,
            max: 10
        },
        ingredients: {
            steelBeam: 20,
            rubber: 10,
            plastic: 10
        }
    },
    blender: {
        name: 'Blender',
        power: {
            min: 75,
            max: 75
        },
        ingredients: {
            motor: 20,
            heavyModularFrame: 10,
            aluminumCasing: 50,
            radioControlUnit: 5
        }
    },
    particleAcceleratorNuclearPasta: {
        name: 'Particle Accelerator',
        power: {
            min: 250,
            max: 750
        },
        ingredients: {
            radioControlUnit: 25,
            electromagneticControlRod: 100,
            supercomputer: 10,
            coolingSystem: 50,
            fusedModularFrame: 20,
            turboMotor: 10
        }
    },
    particleAcceleratorPlutoniumPellet: {
        name: 'Particle Accelerator',
        power: {
            min: 500,
            max: 1500
        },
        ingredients: {
            radioControlUnit: 25,
            electromagneticControlRod: 100,
            supercomputer: 10,
            coolingSystem: 50,
            fusedModularFrame: 20,
            turboMotor: 10
        }
    },
    equipmentWorkshop: {
        name: 'Equipment Workshop',
        power: {
            min: 0,
            max: 0
        },
        ingredients: {
            ironPlate: 6,
            ironRod: 4
        }
    },
    nuclearPowerPlant: {
        name: 'Nuclear Power Plant',
        power: {
            min: 0,
            max: 0
        },
        ingredients: {
            concrete: 250,
            heavyModularFrame: 25,
            supercomputer: 5,
            cable: 100,
            alcladAluminumSheet: 100
        }
    },
};
