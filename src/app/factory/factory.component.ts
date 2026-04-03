import { Component, HostListener, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Machines } from '../../assets/data/machines';
import { MachinesKey } from '../../assets/data/machine-model';
import { Recipes } from '../../assets/data/recipes';
import { RecipesKey } from '../../assets/data/recipe-model';
import { Auth, User, user } from '@angular/fire/auth';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { take } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export interface RecipeOutput {
    key: string;
    name: string;
    rate: number;
    piped: boolean;
}

export interface RecipeOption {
    recipeKey: string;
    parentKey: string;
    name: string;
    inputs: RecipeOutput[];
    outputs: RecipeOutput[];
}

export interface PlacedMachine {
    id: string;
    machineKey: string;
    name: string;
    x: number;
    y: number;
    power: { min: number; max: number };
    selectedRecipe?: { recipeKey: string; parentKey: string } | null;
    /** Manual clock speed override in percent (1–250). null/undefined = auto (belt-derived). */
    overclockPercent?: number | null;
    /** Number of Somersloops inserted (0–2). Each adds ×0.5 to output multiplier. */
    somersloops?: number;
    /** Resource node purity — only relevant for miners and extractors. */
    purity?: 'impure' | 'normal' | 'pure';
    /** Train station slots (load/unload items). Only present on trainStation nodes. */
    trainSlots?: TrainSlot[];
    /** Minutes for one full roundtrip. Used to compute train slot rates. */
    roundtripMinutes?: number;
    /** If set, this node represents another factory in the project. */
    subFactoryId?: string | null;
}

export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    type: 'belt' | 'pipe';
    /** Conveyor mark 1–6 for belts, 1–2 for pipes. Defaults to 1. */
    mark?: number;
}

export interface TrainSlot {
    id: string;
    /** Item key from Recipes. Empty string = not yet selected. */
    itemKey: string;
    /** load = factory fills the train; unload = train delivers to factory. */
    direction: 'load' | 'unload';
    quantityPerTrip: number;
}

export interface FactoryLayout {
    id: string;
    name: string;
    machines: PlacedMachine[];
    connections: Connection[];
}

export interface FactoryProject {
    factories: FactoryLayout[];
}

const GRID_SIZE = 100;
const SPLITTER_KEYS = new Set<string>(['conveyorSplitter', 'smartSplitter', 'programmableSplitter']);
const MERGER_KEYS = new Set<string>(['conveyorMerger']);
const PIPE_JUNCTION_KEYS = new Set<string>(['pipelineJunction']);

const TRAIN_STATION_KEY = 'trainStation';

/** Machines that extract from resource nodes and support purity selection. */
const EXTRACTOR_KEYS = new Set<string>(['minerMk1', 'minerMk2', 'minerMk3', 'oilExtractor', 'resourceWellExtractor']);

/** Output multiplier per resource node purity.
 *  Recipe base rates are authored at impure values, so impure = ×1, normal = ×2, pure = ×4. */
const PURITY_MULTIPLIERS: Record<string, number> = { impure: 1, normal: 2, pure: 4 };

/** Additional output multiplier by miner mark (stacks with purity). */
const MINER_MARK_MULTIPLIERS: Record<string, number> = { minerMk1: 1, minerMk2: 2, minerMk3: 4 };

/** Max throughput per conveyor belt mark (items/min) */
const BELT_SPEEDS: Record<number, number> = { 1: 60, 2: 120, 3: 270, 4: 480, 5: 780, 6: 1200 };
/** Max throughput per pipeline mark (m³/min) */
const PIPE_SPEEDS: Record<number, number> = { 1: 300, 2: 600 };

/** SVG stroke color per belt mark */
const BELT_COLORS: Record<number, string> = {
    1: '#9E9E9E',   // Mk1 — gray
    2: '#FFCA28',   // Mk2 — amber
    3: '#FF7043',   // Mk3 — deep orange
    4: '#42A5F5',   // Mk4 — blue
    5: '#AB47BC',   // Mk5 — purple
    6: '#FA9549',   // Mk6 — gold/orange
};
/** SVG stroke color per pipe mark */
const PIPE_COLORS: Record<number, string> = {
    1: '#4FC3F7',   // Mk1 — light blue
    2: '#26C6DA',   // Mk2 — cyan
};

@Component({
    selector: 'app-factory',
    standalone: true,
    imports: [
        CdkDrag,
        CdkDragPlaceholder,
        CdkDragPreview,
        CdkDropList,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        SelectModule,
        FormsModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './factory.component.html',
    styleUrl: './factory.component.sass'
})
export class FactoryComponent implements OnInit {
    @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;

    machines = Machines;

    // Deduplicate machines by name, merging power ranges for same-named entries (e.g. Particle Accelerator variants)
    paletteMachines: { key: string; name: string; power: { min: number; max: number } }[] = (() => {
        const seen = new Map<string, { key: string; name: string; power: { min: number; max: number } }>();
        for (const key of Object.keys(Machines) as MachinesKey[]) {
            const m = Machines[key];
            if (seen.has(m.name)) {
                const existing = seen.get(m.name)!;
                existing.power.min = Math.min(existing.power.min, m.power.min);
                existing.power.max = Math.max(existing.power.max, m.power.max);
            } else {
                seen.set(m.name, { key, name: m.name, power: { min: m.power.min, max: m.power.max } });
            }
        }
        return Array.from(seen.values());
    })();

    /** Special nodes (not in Machines data) available in the Logistics palette section. */
    specialPaletteItems = [
        { key: TRAIN_STATION_KEY, name: 'Train Station' }
    ];

    /** All recipe items sorted alphabetically — used by the train slot item picker. */
    allItems: { key: string; name: string; piped: boolean }[] = (() => {
        return (Object.keys(Recipes) as RecipesKey[])
            .map(key => ({ key, name: Recipes[key].name, piped: Recipes[key].piped ?? false }))
            .filter(item => item.name)
            .sort((a, b) => a.name.localeCompare(b.name));
    })();

    // Pre-built lookup: machineKey -> RecipeOption[]
    private recipesByMachine: Map<string, RecipeOption[]> = (() => {
        const map = new Map<string, RecipeOption[]>();

        for (const parentKey of Object.keys(Recipes) as RecipesKey[]) {
            const item = Recipes[parentKey];
            for (const recipeKey of Object.keys(item.recipes)) {
                const recipe = item.recipes[recipeKey];
                const inputs: RecipeOutput[] = Object.keys(recipe.inputs).map(inKey => ({
                    key: inKey,
                    name: Recipes[inKey as RecipesKey]?.name ?? inKey,
                    rate: recipe.inputs[inKey].rate,
                    piped: Recipes[inKey as RecipesKey]?.piped ?? false
                }));

                const outputs: RecipeOutput[] = Object.keys(recipe.outputs).map(outKey => ({
                    key: outKey,
                    name: Recipes[outKey as RecipesKey]?.name ?? outKey,
                    rate: recipe.outputs[outKey].rate,
                    piped: Recipes[outKey as RecipesKey]?.piped ?? false
                }));

                const option: RecipeOption = { recipeKey, parentKey, name: recipe.name, inputs, outputs };

                for (const machineKey of recipe.machines) {
                    if (!map.has(machineKey)) map.set(machineKey, []);
                    map.get(machineKey)!.push(option);
                }
            }
        }
        return map;
    })();

    // --- Project / multi-factory state ---
    project: FactoryProject = {
        factories: [{ id: crypto.randomUUID(), name: 'Factory 1', machines: [], connections: [] }]
    };
    activeFactoryId: string = this.project.factories[0].id;

    // These always point into the active factory's arrays.
    placedMachines: PlacedMachine[] = this.project.factories[0].machines;
    connections: Connection[] = this.project.factories[0].connections;
    factoryName = 'Factory 1';

    selectedMachineId: string | null = null;
    selectedConnectionId: string | null = null;
    editingTabId: string | null = null;
    connectingFromId: string | null = null;
    connectionType: 'belt' | 'pipe' = 'belt';

    gridSize = GRID_SIZE;

    private draggingMachine: PlacedMachine | null = null;
    private dragOffsetX = 0;
    private dragOffsetY = 0;

    pendingCopy: PlacedMachine | null = null;
    ghostX = 0;
    ghostY = 0;

    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private messageService = inject(MessageService);
    private user$ = user(this.auth);

    ngOnInit() {
        this.loadData();
    }

    // ─── Factory management ──────────────────────────────────────────────────

    switchFactory(id: string) {
        this.selectedMachineId = null;
        this.selectedConnectionId = null;
        this.editingTabId = null;
        this.connectingFromId = null;
        this.pendingCopy = null;
        this.activeFactoryId = id;
        const f = this.project.factories.find(f => f.id === id)!;
        this.placedMachines = f.machines;
        this.connections = f.connections;
        this.factoryName = f.name;
    }

    addFactory() {
        const newFactory: FactoryLayout = {
            id: crypto.randomUUID(),
            name: `Factory ${this.project.factories.length + 1}`,
            machines: [],
            connections: []
        };
        this.project.factories.push(newFactory);
        this.switchFactory(newFactory.id);
        this.saveData();
    }

    deleteFactory(id: string) {
        if (this.project.factories.length <= 1) return;
        this.project.factories = this.project.factories.filter(f => f.id !== id);
        if (this.activeFactoryId === id) {
            this.switchFactory(this.project.factories[0].id);
        }
        this.saveData();
    }

    startEditingTab(id: string, event: MouseEvent) {
        event.stopPropagation();
        this.editingTabId = id;
        setTimeout(() => {
            const input = document.getElementById(`tab-input-${id}`) as HTMLInputElement;
            if (input) { input.focus(); input.select(); }
        }, 0);
    }

    stopEditingTab() {
        this.editingTabId = null;
    }

    renameFactory(id: string, name: string) {
        const f = this.project.factories.find(f => f.id === id);
        if (f) {
            f.name = name;
            if (this.activeFactoryId === id) this.factoryName = name;
            this.saveData();
        }
    }

    getOtherFactories(): FactoryLayout[] {
        return this.project.factories.filter(f => f.id !== this.activeFactoryId);
    }

    // ─── Sub-factory logic ───────────────────────────────────────────────────

    /** Factory IDs currently being computed — prevents infinite recursion when sub-factories nest. */
    private computingFactoryInterface = new Set<string>();

    /**
     * Computes the public interface of a factory:
     * - outputs: recipe outputs on machines with no outgoing connection
     * - inputs:  recipe inputs on machines with no incoming connection
     *
     * Temporarily swaps this.placedMachines / this.connections to the target factory's arrays so
     * that getEffectiveClockSpeed (and everything it calls) resolves belt-derived rates correctly
     * against that factory's internal wiring, not the currently-active factory's wiring.
     */
    getFactoryInterface(factoryId: string): { inputs: RecipeOutput[], outputs: RecipeOutput[] } {
        const factory = this.project.factories.find(f => f.id === factoryId);
        if (!factory) return { inputs: [], outputs: [] };

        // Cycle / reentrancy guard
        if (this.computingFactoryInterface.has(factoryId)) return { inputs: [], outputs: [] };
        this.computingFactoryInterface.add(factoryId);

        // Swap context so all rate helpers operate on this factory's arrays
        const savedMachines     = this.placedMachines;
        const savedConnections  = this.connections;
        this.placedMachines = factory.machines;
        this.connections    = factory.connections;

        try {
            const outputMap = new Map<string, RecipeOutput>();
            const inputMap  = new Map<string, RecipeOutput>();

            for (const machine of factory.machines) {
                if (machine.subFactoryId) continue;

            // Train station inside a sub-factory
            if (machine.machineKey === TRAIN_STATION_KEY) {
                const rt = machine.roundtripMinutes ?? 5;
                const hasOutgoing = factory.connections.some(c => c.fromId === machine.id);
                const hasIncoming = factory.connections.some(c => c.toId   === machine.id);
                if (!hasOutgoing) {
                    for (const slot of (machine.trainSlots ?? []).filter(s => s.direction === 'unload' && s.itemKey)) {
                        const rate = this.getTrainSlotRate(slot, rt);
                        const info = Recipes[slot.itemKey as RecipesKey];
                        if (outputMap.has(slot.itemKey)) {
                            outputMap.get(slot.itemKey)!.rate += rate;
                        } else {
                            outputMap.set(slot.itemKey, { key: slot.itemKey, name: info?.name ?? slot.itemKey, rate, piped: info?.piped ?? false });
                        }
                    }
                }
                if (!hasIncoming) {
                    for (const slot of (machine.trainSlots ?? []).filter(s => s.direction === 'load' && s.itemKey)) {
                        const rate = this.getTrainSlotRate(slot, rt);
                        const info = Recipes[slot.itemKey as RecipesKey];
                        if (inputMap.has(slot.itemKey)) {
                            inputMap.get(slot.itemKey)!.rate += rate;
                        } else {
                            inputMap.set(slot.itemKey, { key: slot.itemKey, name: info?.name ?? slot.itemKey, rate, piped: info?.piped ?? false });
                        }
                    }
                }
                continue;
            }

                const recipe = this.getSelectedRecipeOption(machine);
                if (!recipe) continue;

                // Uses belt-derived or manual clock speed — now correct because this.connections
                // points at the sub-factory's internal wiring.
                const clockSpeed  = this.getEffectiveClockSpeed(machine);
                const sloopMult   = this.getSomersloopMultiplier(machine);
                const purityMult  = this.getPurityMultiplier(machine);

                const hasOutgoing = factory.connections.some(c => c.fromId === machine.id);
                if (!hasOutgoing) {
                    for (const out of recipe.outputs) {
                        const rate = Math.round(out.rate * clockSpeed * sloopMult * purityMult * 100) / 100;
                        if (outputMap.has(out.key)) {
                            outputMap.get(out.key)!.rate += rate;
                        } else {
                            outputMap.set(out.key, { key: out.key, name: out.name, rate, piped: out.piped });
                        }
                    }
                }

                const hasIncoming = factory.connections.some(c => c.toId === machine.id);
                if (!hasIncoming) {
                    for (const inp of recipe.inputs) {
                        const rate = Math.round(inp.rate * clockSpeed * purityMult * 100) / 100;
                        if (inputMap.has(inp.key)) {
                            inputMap.get(inp.key)!.rate += rate;
                        } else {
                            inputMap.set(inp.key, { key: inp.key, name: inp.name, rate, piped: inp.piped });
                        }
                    }
                }
            }

            return {
                inputs:  Array.from(inputMap.values()),
                outputs: Array.from(outputMap.values())
            };
        } finally {
            this.placedMachines = savedMachines;
            this.connections    = savedConnections;
            this.computingFactoryInterface.delete(factoryId);
        }
    }

    /** Returns true if adding candidateId as a sub-factory inside currentFactoryId would create a cycle. */
    wouldCreateCycle(currentFactoryId: string, candidateId: string, visited = new Set<string>()): boolean {
        if (candidateId === currentFactoryId) return true;
        if (visited.has(candidateId)) return false;
        visited.add(candidateId);

        const factory = this.project.factories.find(f => f.id === candidateId);
        if (!factory) return false;

        for (const machine of factory.machines) {
            if (machine.subFactoryId &&
                this.wouldCreateCycle(currentFactoryId, machine.subFactoryId, visited)) {
                return true;
            }
        }
        return false;
    }

    navigateToSubFactory(machine: PlacedMachine) {
        if (machine.subFactoryId) this.switchFactory(machine.subFactoryId);
    }

    // ─── Machine helpers ─────────────────────────────────────────────────────

    getMachineName(key: string): string {
        return this.machines[key as MachinesKey]?.name ?? key;
    }

    getMachineImage(key: string): string {
        return `assets/images/machines/${key}.png`;
    }

    getMachinePower(key: string): { min: number; max: number } {
        return this.machines[key as MachinesKey]?.power ?? { min: 0, max: 0 };
    }

    getPowerDisplay(power: { min: number; max: number }): string {
        if (power.min === power.max) return `${power.min} MW`;
        return `${power.min}–${power.max} MW`;
    }

    getTotalPower(): number {
        return this.placedMachines.reduce((sum, m) => sum + m.power.max, 0);
    }

    getItemImage(key: string): string {
        return `assets/images/${key}.png`;
    }

    /** Returns all recipes usable by a given machine key, including grouped variants. */
    getRecipesForMachine(machineKey: string): RecipeOption[] {
        const machineName = this.getMachineName(machineKey);
        const relatedKeys = (Object.keys(Machines) as MachinesKey[])
            .filter(k => Machines[k].name === machineName);

        const seen = new Set<string>();
        const results: RecipeOption[] = [];
        for (const key of relatedKeys) {
            for (const option of this.recipesByMachine.get(key) ?? []) {
                const id = `${option.parentKey}:${option.recipeKey}`;
                if (!seen.has(id)) { seen.add(id); results.push(option); }
            }
        }
        return results;
    }

    getSelectedRecipeOption(machine: PlacedMachine): RecipeOption | null {
        if (!machine.selectedRecipe) return null;
        const options = this.getRecipesForMachine(machine.machineKey);
        return options.find(o =>
            o.recipeKey === machine.selectedRecipe!.recipeKey &&
            o.parentKey === machine.selectedRecipe!.parentKey
        ) ?? null;
    }

    getIncomingItems(machineId: string): Set<string> {
        const items = new Set<string>();
        for (const conn of this.connections) {
            if (conn.toId !== machineId) continue;
            const source = this.placedMachines.find(m => m.id === conn.fromId);
            if (!source) continue;
            if (source.machineKey === TRAIN_STATION_KEY) {
                // Train station: unload slots are its outputs into the factory
                (source.trainSlots ?? [])
                    .filter(s => s.direction === 'unload' && s.itemKey)
                    .forEach(s => items.add(s.itemKey));
            } else if (source.subFactoryId) {
                this.getFactoryInterface(source.subFactoryId).outputs.forEach(o => items.add(o.key));
            } else {
                const recipe = this.getSelectedRecipeOption(source);
                if (recipe) recipe.outputs.forEach(o => items.add(o.key));
            }
        }
        return items;
    }

    recipeMatchesIncoming(option: RecipeOption, machineId: string): boolean {
        const incoming = this.getIncomingItems(machineId);
        if (incoming.size === 0) return false;
        return option.inputs.some(i => incoming.has(i.key));
    }

    selectRecipe(machine: PlacedMachine, option: RecipeOption | null) {
        machine.selectedRecipe = option ? { recipeKey: option.recipeKey, parentKey: option.parentKey } : null;
        this.saveData();
    }

    // ─── Canvas interactions ─────────────────────────────────────────────────

    dropOnCanvas(event: CdkDragDrop<any>) {
        if (event.previousContainer === event.container) return;

        const machineKey = event.item.data as string;
        const canvasRect  = this.canvasRef.nativeElement.getBoundingClientRect();
        const dropPoint   = event.dropPoint;

        const rawX = dropPoint.x - canvasRect.left + this.canvasRef.nativeElement.scrollLeft;
        const rawY = dropPoint.y - canvasRect.top  + this.canvasRef.nativeElement.scrollTop;

        const x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        const y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

        // Sub-factory drop
        if (machineKey.startsWith('subfactory:')) {
            const subFactoryId = machineKey.slice('subfactory:'.length);
            if (this.wouldCreateCycle(this.activeFactoryId, subFactoryId)) return;
            const subFactory = this.project.factories.find(f => f.id === subFactoryId);
            if (!subFactory) return;

            this.placedMachines.push({
                id: crypto.randomUUID(),
                machineKey: 'subfactory',
                name: subFactory.name,
                x, y,
                power: { min: 0, max: 0 },
                selectedRecipe: null,
                subFactoryId
            });
            this.saveData();
            return;
        }

        // Train station drop
        if (machineKey === TRAIN_STATION_KEY) {
            this.placedMachines.push({
                id: crypto.randomUUID(),
                machineKey: TRAIN_STATION_KEY,
                name: 'Train Station',
                x, y,
                power: { min: 0, max: 0 },
                selectedRecipe: null,
                trainSlots: [],
                roundtripMinutes: 5
            });
            this.saveData();
            return;
        }

        // Regular machine drop
        this.placedMachines.push({
            id: crypto.randomUUID(),
            machineKey,
            name: this.getMachineName(machineKey),
            x, y,
            power: this.getMachinePower(machineKey),
            selectedRecipe: null
        });
        this.saveData();
    }

    onMachineMouseDown(event: MouseEvent, machine: PlacedMachine) {
        if (this.connectingFromId) return;
        event.stopPropagation();
        event.preventDefault();
        const canvasRect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.draggingMachine = machine;
        this.dragOffsetX = event.clientX - canvasRect.left - machine.x;
        this.dragOffsetY = event.clientY - canvasRect.top  - machine.y;
    }

    @HostListener('window:mousemove', ['$event'])
    onWindowMouseMove(event: MouseEvent) {
        const canvasRect = this.canvasRef.nativeElement.getBoundingClientRect();
        if (this.draggingMachine) {
            const rawX = event.clientX - canvasRect.left - this.dragOffsetX;
            const rawY = event.clientY - canvasRect.top  - this.dragOffsetY;
            this.draggingMachine.x = Math.max(0, Math.round(rawX / GRID_SIZE) * GRID_SIZE);
            this.draggingMachine.y = Math.max(0, Math.round(rawY / GRID_SIZE) * GRID_SIZE);
        }
        if (this.pendingCopy) {
            this.ghostX = Math.max(0, Math.round((event.clientX - canvasRect.left) / GRID_SIZE) * GRID_SIZE);
            this.ghostY = Math.max(0, Math.round((event.clientY - canvasRect.top)  / GRID_SIZE) * GRID_SIZE);
        }
    }

    @HostListener('window:keydown.escape')
    onEscape() { this.cancelPendingCopy(); }

    @HostListener('window:mouseup')
    onWindowMouseUp() {
        if (this.draggingMachine) { this.saveData(); this.draggingMachine = null; }
    }

    selectMachine(machine: PlacedMachine, event: MouseEvent) {
        event.stopPropagation();

        if (this.connectingFromId) {
            if (this.connectingFromId !== machine.id) {
                const alreadyConnected = this.connections.some(c =>
                    (c.fromId === this.connectingFromId && c.toId === machine.id) ||
                    (c.fromId === machine.id && c.toId === this.connectingFromId)
                );
                if (!alreadyConnected && this.canAddConnection(this.connectingFromId, machine.id)) {
                    this.connections.push({
                        id: crypto.randomUUID(),
                        fromId: this.connectingFromId,
                        toId: machine.id,
                        type: this.connectionType
                    });
                    this.saveData();
                }
            }
            this.connectingFromId = null;
            return;
        }

        this.selectedMachineId = machine.id;
        this.selectedConnectionId = null;
    }

    deselectAll() {
        this.selectedMachineId = null;
        this.selectedConnectionId = null;
        this.connectingFromId = null;
    }

    copyMachine(machine: PlacedMachine, event: MouseEvent) {
        if (event.button !== 1) return;
        event.preventDefault();
        event.stopPropagation();
        this.pendingCopy = { ...machine, id: crypto.randomUUID() };
        const canvasRect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.ghostX = Math.round((event.clientX - canvasRect.left) / GRID_SIZE) * GRID_SIZE;
        this.ghostY = Math.round((event.clientY - canvasRect.top)  / GRID_SIZE) * GRID_SIZE;
    }

    placePendingCopy(event: MouseEvent) {
        if (!this.pendingCopy) return;
        event.stopPropagation();
        const copy = { ...this.pendingCopy, x: this.ghostX, y: this.ghostY };
        this.placedMachines.push(copy);
        this.selectedMachineId = copy.id;
        this.pendingCopy = null;
        this.saveData();
    }

    cancelPendingCopy() { this.pendingCopy = null; }

    deleteMachine(id: string) {
        const machines = this.placedMachines.filter(m => m.id !== id);
        const conns    = this.connections.filter(c => c.fromId !== id && c.toId !== id);
        this.placedMachines = machines;
        this.connections    = conns;
        this.syncActiveFactoryArrays();
        this.selectedMachineId = null;
        this.saveData();
    }

    startConnection(machineId: string, type: 'belt' | 'pipe') {
        this.connectingFromId = machineId;
        this.connectionType   = type;
        this.selectedMachineId = null;
    }

    deleteConnection(connId: string) {
        this.connections = this.connections.filter(c => c.id !== connId);
        this.syncActiveFactoryArrays();
        this.saveData();
    }

    clearCanvas() {
        this.placedMachines = [];
        this.connections    = [];
        this.syncActiveFactoryArrays();
        this.selectedMachineId = null;
        this.connectingFromId  = null;
        this.saveData();
    }

    /** After any reassignment of placedMachines/connections, sync back into the project. */
    private syncActiveFactoryArrays() {
        const f = this.project.factories.find(f => f.id === this.activeFactoryId);
        if (f) { f.machines = this.placedMachines; f.connections = this.connections; }
    }

    // ─── Connection selection / mark helpers ────────────────────────────────

    selectConnection(conn: Connection, event: MouseEvent) {
        event.stopPropagation();
        this.selectedMachineId = null;
        this.selectedConnectionId = conn.id;
    }

    setConnectionMark(conn: Connection, mark: number) {
        conn.mark = mark;
        this.saveData();
    }

    getConnectionMaxRate(conn: Connection): number {
        const mark = conn.mark ?? 1;
        return conn.type === 'pipe' ? (PIPE_SPEEDS[mark] ?? 300) : (BELT_SPEEDS[mark] ?? 60);
    }

    getBeltColorForMark(type: 'belt' | 'pipe', mark: number): string {
        return type === 'pipe' ? (PIPE_COLORS[mark] ?? PIPE_COLORS[1]) : (BELT_COLORS[mark] ?? BELT_COLORS[1]);
    }

    getBeltColor(conn: Connection): string {
        return this.getBeltColorForMark(conn.type, conn.mark ?? 1);
    }

    getBeltMarks(type: 'belt' | 'pipe'): number[] {
        return type === 'pipe' ? [1, 2] : [1, 2, 3, 4, 5, 6];
    }

    // ─── SVG / path helpers ──────────────────────────────────────────────────

    getConnectionPath(conn: Connection): string {
        const from = this.placedMachines.find(m => m.id === conn.fromId);
        const to   = this.placedMachines.find(m => m.id === conn.toId);
        if (!from || !to) return '';
        const sx = from.x + GRID_SIZE;
        const sy = from.y + GRID_SIZE / 2;
        const tx = to.x;
        const ty = to.y + GRID_SIZE / 2;
        if (Math.abs(sy - ty) < 1) return `M ${sx},${sy} H ${tx}`;
        const midX = (sx + tx) / 2;
        return `M ${sx},${sy} H ${midX} V ${ty} H ${tx}`;
    }

    getConnectionMidpoint(conn: Connection): { x: number; y: number } {
        const from = this.placedMachines.find(m => m.id === conn.fromId);
        const to   = this.placedMachines.find(m => m.id === conn.toId);
        if (!from || !to) return { x: 0, y: 0 };
        const sx = from.x + GRID_SIZE;
        const sy = from.y + GRID_SIZE / 2;
        const tx = to.x;
        const ty = to.y + GRID_SIZE / 2;
        return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
    }

    // ─── Rate propagation ────────────────────────────────────────────────────

    getConnectionRate(conn: Connection, visited = new Set<string>()): number | null {
        if (visited.has(conn.id)) return null;
        visited.add(conn.id);

        const from = this.placedMachines.find(m => m.id === conn.fromId);
        if (!from) return null;

        const maxRate = this.getConnectionMaxRate(conn);

        // Splitters / pipe junctions: divide total in equally
        if (SPLITTER_KEYS.has(from.machineKey) || PIPE_JUNCTION_KEYS.has(from.machineKey)) {
            const totalIn = this.connections
                .filter(c => c.toId === from.id)
                .reduce((sum, c) => sum + (this.getConnectionRate(c, new Set(visited)) ?? 0), 0);
            const outCount = this.connections.filter(c => c.fromId === from.id).length;
            if (outCount === 0) return null;
            return Math.min(Math.round((totalIn / outCount) * 100) / 100, maxRate);
        }

        // Mergers: sum all incoming
        if (MERGER_KEYS.has(from.machineKey)) {
            const totalIn = this.connections
                .filter(c => c.toId === from.id)
                .reduce((sum, c) => sum + (this.getConnectionRate(c, new Set(visited)) ?? 0), 0);
            return totalIn > 0 ? Math.min(Math.round(totalIn * 100) / 100, maxRate) : null;
        }

        // Train station: unload slot rate by type-indexed order
        if (from.machineKey === TRAIN_STATION_KEY) {
            const rt = from.roundtripMinutes ?? 5;
            const unload = (from.trainSlots ?? []).filter(s => s.direction === 'unload' && s.itemKey);
            const typeConns = this.connections.filter(c => c.fromId === from.id && c.type === conn.type);
            const idx = typeConns.findIndex(c => c.id === conn.id);
            const typeSlots = conn.type === 'pipe'
                ? unload.filter(s => Recipes[s.itemKey as RecipesKey]?.piped)
                : unload.filter(s => !Recipes[s.itemKey as RecipesKey]?.piped);
            const slot = typeSlots[idx] ?? typeSlots[0];
            if (!slot) return null;
            return Math.min(this.getTrainSlotRate(slot, rt), maxRate);
        }

        // Sub-factory node: static rate from the referenced factory's interface
        if (from.subFactoryId) {
            const iface = this.getFactoryInterface(from.subFactoryId);
            const relevant = conn.type === 'pipe'
                ? iface.outputs.filter(o => o.piped)
                : iface.outputs.filter(o => !o.piped);
            if (relevant.length === 0) return null;
            return Math.min(relevant[0].rate, maxRate);
        }

        // Regular machine
        const recipe = this.getSelectedRecipeOption(from);
        if (!recipe) return null;
        const relevant = conn.type === 'pipe'
            ? recipe.outputs.filter(o => o.piped)
            : recipe.outputs.filter(o => !o.piped);
        if (relevant.length === 0) return null;
        const clockSpeed   = this.getEffectiveClockSpeed(from, visited);
        const sloopMult    = this.getSomersloopMultiplier(from);
        const purityMult   = this.getPurityMultiplier(from);
        const raw = Math.round(relevant[0].rate * clockSpeed * sloopMult * purityMult * 100) / 100;
        return Math.min(raw, maxRate);
    }

    getSomersloopMultiplier(machine: PlacedMachine): number {
        const sloops = machine.somersloops ?? 0;
        return sloops === 0 ? 1 : 1 + sloops * 0.5;
    }

    getEffectiveClockSpeed(machine: PlacedMachine, visited = new Set<string>()): number {
        if (machine.overclockPercent != null) return machine.overclockPercent / 100;

        const recipe = this.getSelectedRecipeOption(machine);
        if (!recipe || recipe.inputs.length === 0) return 1;

        const incomingConns = this.connections.filter(c => c.toId === machine.id);
        if (incomingConns.length === 0) return 1;

        let minClockSpeed: number | null = null;
        for (const conn of incomingConns) {
            if (visited.has(conn.id)) continue;
            const itemKey = this.getConnectionItemKey(conn);
            const rate    = this.getConnectionRate(conn, new Set(visited));
            if (itemKey === null || rate === null) continue;

            const recipeInput = recipe.inputs.find(i => i.key === itemKey);
            if (!recipeInput || recipeInput.rate === 0) continue;

            const cs = rate / recipeInput.rate;
            if (minClockSpeed === null || cs < minClockSpeed) minClockSpeed = cs;
        }
        return minClockSpeed ?? 1;
    }

    getEffectiveOutputRate(machine: PlacedMachine, outputKey: string): number {
        // Train station: rate of the matching unload slot
        if (machine.machineKey === TRAIN_STATION_KEY) {
            const rt = machine.roundtripMinutes ?? 5;
            const slot = (machine.trainSlots ?? []).find(s => s.direction === 'unload' && s.itemKey === outputKey);
            return slot ? this.getTrainSlotRate(slot, rt) : 0;
        }

        // Sub-factory node: delegate to factory interface
        if (machine.subFactoryId) {
            const iface = this.getFactoryInterface(machine.subFactoryId);
            return iface.outputs.find(o => o.key === outputKey)?.rate ?? 0;
        }

        const recipe = this.getSelectedRecipeOption(machine);
        if (!recipe) return 0;
        const output = recipe.outputs.find(o => o.key === outputKey);
        if (!output) return 0;
        return Math.round(
            output.rate
            * this.getEffectiveClockSpeed(machine)
            * this.getSomersloopMultiplier(machine)
            * this.getPurityMultiplier(machine)
            * 100
        ) / 100;
    }

    getConnectionItemKey(conn: Connection, visited = new Set<string>()): string | null {
        if (visited.has(conn.id)) return null;
        visited.add(conn.id);

        const from = this.placedMachines.find(m => m.id === conn.fromId);
        if (!from) return null;

        if (SPLITTER_KEYS.has(from.machineKey) || MERGER_KEYS.has(from.machineKey) || PIPE_JUNCTION_KEYS.has(from.machineKey)) {
            for (const c of this.connections.filter(c2 => c2.toId === from.id)) {
                const key = this.getConnectionItemKey(c, new Set(visited));
                if (key) return key;
            }
            return null;
        }

        // Train station: match unload slot to connection by type-indexed order
        if (from.machineKey === TRAIN_STATION_KEY) {
            const unload = (from.trainSlots ?? []).filter(s => s.direction === 'unload' && s.itemKey);
            const typeConns = this.connections.filter(c => c.fromId === from.id && c.type === conn.type);
            const idx = typeConns.findIndex(c => c.id === conn.id);
            const typeSlots = conn.type === 'pipe'
                ? unload.filter(s => Recipes[s.itemKey as RecipesKey]?.piped)
                : unload.filter(s => !Recipes[s.itemKey as RecipesKey]?.piped);
            return typeSlots[idx]?.itemKey ?? typeSlots[0]?.itemKey ?? null;
        }

        // Sub-factory node
        if (from.subFactoryId) {
            const iface = this.getFactoryInterface(from.subFactoryId);
            const relevant = conn.type === 'pipe'
                ? iface.outputs.filter(o => o.piped)
                : iface.outputs.filter(o => !o.piped);
            return relevant.length > 0 ? relevant[0].key : null;
        }

        const recipe = this.getSelectedRecipeOption(from);
        if (!recipe) return null;
        const relevant = conn.type === 'pipe'
            ? recipe.outputs.filter(o => o.piped)
            : recipe.outputs.filter(o => !o.piped);
        return relevant.length > 0 ? relevant[0].key : null;
    }

    canAddConnection(fromId: string, toId: string): boolean {
        const from = this.placedMachines.find(m => m.id === fromId);
        const to   = this.placedMachines.find(m => m.id === toId);
        if (!from || !to) return false;

        const fromIsSplitter    = SPLITTER_KEYS.has(from.machineKey) || PIPE_JUNCTION_KEYS.has(from.machineKey);
        const fromIsSubFactory  = !!from.subFactoryId;
        const fromIsTrainStation = from.machineKey === TRAIN_STATION_KEY;
        const toIsMerger        = MERGER_KEYS.has(to.machineKey) || PIPE_JUNCTION_KEYS.has(to.machineKey);
        const toIsTrainStation  = to.machineKey === TRAIN_STATION_KEY;

        const maxOut = fromIsSplitter ? 3 : (fromIsSubFactory || fromIsTrainStation) ? 8 : 1;
        if (this.connections.filter(c => c.fromId === fromId).length >= maxOut) return false;

        const maxIn = (toIsMerger || toIsTrainStation) ? 8 : 1;
        if (this.connections.filter(c => c.toId === toId).length >= maxIn) return false;

        return true;
    }

    // ─── Train Station helpers ───────────────────────────────────────────────

    isTrainStation(machine: PlacedMachine): boolean {
        return machine.machineKey === TRAIN_STATION_KEY;
    }

    getTrainSlotRate(slot: TrainSlot, roundtripMinutes: number): number {
        if (roundtripMinutes <= 0) return 0;
        return Math.round((slot.quantityPerTrip / roundtripMinutes) * 100) / 100;
    }

    addTrainSlot(machine: PlacedMachine) {
        if (!machine.trainSlots) machine.trainSlots = [];
        machine.trainSlots.push({
            id: crypto.randomUUID(),
            itemKey: '',
            direction: 'unload',
            quantityPerTrip: 0
        });
        this.saveData();
    }

    removeTrainSlot(machine: PlacedMachine, slotId: string) {
        machine.trainSlots = (machine.trainSlots ?? []).filter(s => s.id !== slotId);
        this.saveData();
    }

    setTrainSlotItem(machine: PlacedMachine, slotId: string, itemKey: string) {
        const slot = machine.trainSlots?.find(s => s.id === slotId);
        if (slot) { slot.itemKey = itemKey; this.saveData(); }
    }

    toggleSlotDirection(machine: PlacedMachine, slotId: string) {
        const slot = machine.trainSlots?.find(s => s.id === slotId);
        if (slot) { slot.direction = slot.direction === 'load' ? 'unload' : 'load'; this.saveData(); }
    }

    setSlotQty(machine: PlacedMachine, slotId: string, qty: number) {
        const slot = machine.trainSlots?.find(s => s.id === slotId);
        if (slot) { slot.quantityPerTrip = Math.max(0, qty); this.saveData(); }
    }

    setRoundtrip(machine: PlacedMachine, minutes: number) {
        machine.roundtripMinutes = Math.max(0.01, minutes);
        this.saveData();
    }

    // ─── Purity helpers ──────────────────────────────────────────────────────

    isExtractor(machine: PlacedMachine): boolean {
        return EXTRACTOR_KEYS.has(machine.machineKey);
    }

    getPurityMultiplier(machine: PlacedMachine): number {
        if (!this.isExtractor(machine)) return 1;
        const purity = PURITY_MULTIPLIERS[machine.purity ?? 'impure'] ?? 1;
        const mark   = MINER_MARK_MULTIPLIERS[machine.machineKey] ?? 1;
        return purity * mark;
    }

    setPurity(machine: PlacedMachine, purity: 'impure' | 'normal' | 'pure') {
        machine.purity = purity;
        this.saveData();
    }

    // ─── Overclock / Somersloop helpers ──────────────────────────────────────

    setOverclock(machine: PlacedMachine, value: number | null) {
        machine.overclockPercent = value !== null ? Math.min(250, Math.max(1, value)) : null;
        this.saveData();
    }

    getOverclockSliderValue(machine: PlacedMachine): number {
        const raw = machine.overclockPercent ?? (this.getEffectiveClockSpeed(machine) * 100);
        return Math.round(Math.min(250, Math.max(1, raw)));
    }

    clearOverclock(machine: PlacedMachine) {
        machine.overclockPercent = null;
        this.saveData();
    }

    setSomersloops(machine: PlacedMachine, count: number) {
        machine.somersloops = count;
        this.saveData();
    }

    alwaysTrue = () => true;

    // ─── Persistence ─────────────────────────────────────────────────────────

    saveData() {
        // Sync active factory name before saving
        const active = this.project.factories.find(f => f.id === this.activeFactoryId);
        if (active) active.name = this.factoryName;

        this.user$.pipe(take(1)).subscribe((u: User | null) => {
            const project = this.prepareProjectData();
            if (u) {
                this.saveCloudData(u.uid, project);
            } else {
                this.saveLocalData(project);
            }
        });
    }

    private prepareProjectData(): FactoryProject {
        return {
            factories: this.project.factories.map(f => ({
                id: f.id,
                name: f.name,
                machines: f.machines.map(m => ({
                    id: m.id,
                    machineKey: m.machineKey,
                    name: m.name,
                    x: m.x,
                    y: m.y,
                    power: m.power,
                    selectedRecipe:   m.selectedRecipe  ?? null,
                    overclockPercent: m.overclockPercent ?? null,
                    somersloops:      m.somersloops ?? 0,
                    purity:           m.purity ?? 'impure',
                    trainSlots:       m.trainSlots ?? [],
                    roundtripMinutes: m.roundtripMinutes ?? 5,
                    subFactoryId:     m.subFactoryId ?? null
                })),
                connections: f.connections.map(c => ({
                    id: c.id, fromId: c.fromId, toId: c.toId, type: c.type, mark: c.mark ?? 1
                }))
            }))
        };
    }

    private saveLocalData(project: FactoryProject) {
        localStorage.setItem('factoryProject', JSON.stringify(project));
    }

    private saveCloudData(uid: string, project: FactoryProject) {
        const ref = doc(this.firestore, `factories/${uid}`);
        setDoc(ref, project as any);
    }

    private loadData() {
        this.user$.pipe(take(1)).subscribe((u: User | null) => {
            if (u) { this.loadCloudData(u.uid); } else { this.loadLocalData(); }
        });
    }

    private loadLocalData() {
        // New format
        const raw = localStorage.getItem('factoryProject');
        if (raw) { this.applyProject(JSON.parse(raw)); return; }

        // Legacy single-factory format
        const oldRaw = localStorage.getItem('factoryLayout');
        if (oldRaw) {
            const layout = JSON.parse(oldRaw);
            this.applyProject({ factories: [{ id: crypto.randomUUID(), ...layout }] });
        }
    }

    private loadCloudData(uid: string) {
        const ref = doc(this.firestore, `factories/${uid}`);
        docData(ref).pipe(take(1)).subscribe((data: any) => {
            if (data) { this.applyProject(data); } else { this.loadLocalData(); }
        });
    }

    private applyProject(data: any) {
        // Handle legacy format: single FactoryLayout (has .name but no .factories array)
        if (!data.factories) {
            data = {
                factories: [{
                    id: crypto.randomUUID(),
                    name: data.name ?? 'Factory 1',
                    machines: data.machines ?? [],
                    connections: data.connections ?? []
                }]
            };
        }

        this.project = data as FactoryProject;

        // Back-fill missing ids
        for (const f of this.project.factories) {
            if (!f.id) f.id = crypto.randomUUID();
        }

        this.switchFactory(this.project.factories[0].id);
    }
}
