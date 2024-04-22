

// export interface Recipe {
//     name: string;
//     piped: boolean;
//     isRaw: boolean;
//     handPicked: boolean;
//     default: '' | keyof typeof RecipeNames;
//     recipes: {[key in RecipeNames]: RecipeData}
// }
//
// export interface RecipeData {
//     name: string;
//     machine: string;
//     inputs: {[key in RecipeNames]: {amount: number, rate: number}};
//     outputs: {[key in RecipeNames]: {amount: number, rate: number}};
//     parentRecipe: keyof typeof RecipeNames;
// }
//
// export type RecipeType = {
//     [key in RecipeNames]: Recipe;
// }
//
// export enum RecipeNames {
//     hatcherRemains = "Hatcher Remains",
//     hogRemains = "Hog Remains",
//     spitterRemains = "Plasma Spitter Remains",
//     stingerRemains = "Stinger Remains",
//     limestone = "Limestone",
//     ironOre = "Iron Ore",
//     copperOre = "Copper Ore",
//     cateriumOre = "Caterium Ore",
//     coal = "Coal",
//     rawQuartz = "Raw Quartz",
//     sulfur = "Sulfur",
//     bauxite = "Bauxite",
//     samOre = "S.A.M. Ore",
//     uranium = "Uranium",
//     leaves = "Leaves",
//     mycelia = "Mycelia",
//     flowerPetals = "Flower Petals",
//     wood = "Wood",
//     alienProtein = "Alien Protein",
//     organicDataCapsule = "Organic Data Capsule",
//     ironIngot = "Iron Ingot",
//     copperIngot = "Copper Ingot",
//     cateriumIngot = "Caterium Ingot",
//     steelIngot = "Steel Ingot",
//     aluminumIngot = "Aluminum Ingot",
//     concrete = "Concrete",
//     quartzCrystal = "Quartz Crystal",
//     silica = "Silica",
//     copperPowder = "Copper Powder",
//     polymerResin = "Polymer Resin",
//     petroleumCoke = "Petroleum Coke",
//     aluminumScrap = "Aluminum Scrap",
//     water = "Water",
//     crudeOil = "Crude Oil",
//     heavyOilResidue = "Heavy Oil Residue",
//     plastic = "Plastic",
//     rubber = "Rubber",
//     wire = "Wire",
//     circuitBoard = "Circuit Board",
//     ironPlate = "Iron Plate",
//     ironRod = "Iron Rod",
//     screw = "Screw",
//     modularFrame = "Modular Frame",
//     reinforcedIronPlate = "Reinforced Iron Plate",
//     rotor = "Rotor",
//     stator = "Stator",
//     motor = "Motor",
//     quickwire = "Quickwire",
//     cable = "Cable",
//     wireCable = "Wire Cable",
//     highSpeedConnector = "High-Speed Connector",
//     computer = "Computer",
//     supercomputer = "Supercomputer",
//     plasticSmartPlating = "Plastic Smart Plating",
//     versatileFramework = "Versatile Framework",
//     automatedWiring = "Automated Wiring",
//     heavyModularFrame = "Heavy Modular Frame",
//     crystalOscillator = "Crystal Oscillator",
//     radioControlUnit = "Radio Control Unit",
//     electromagneticControlRod = "Electromagnetic Control Rod",
//     nuclearPasta = "Nuclear Pasta",
//     nuclearFuelRod = "Nuclear Fuel Rod",
//     encasedUraniumCell = "Encased Uranium Cell",
//     uraniumFuelRod = "Uranium Fuel Rod",
//     heatSink = "Heat Sink",
//     coolingSystem = "Cooling System",
//     turboMotor = "Turbo Motor",
//     battery = "Battery",
//     emptyCanister = "Empty Canister",
//     packagedWater = "Packaged Water",
//     packagedOil = "Packaged Oil",
//     packagedFuel = "Packaged Fuel",
//     packagedHeavyOilResidue = "Packaged Heavy Oil Residue",
// }
