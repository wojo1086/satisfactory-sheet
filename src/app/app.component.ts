import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Recipes } from '../assets/data/recipes';
import { AsyncPipe, DecimalPipe, KeyValuePipe, NgClass, NgOptimizedImage } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { combineLatestWith, from, map, Observable, startWith, Subject, Subscription, take, tap } from 'rxjs';
import { TreeTableModule } from 'primeng/treetable';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { CheckboxModule } from 'primeng/checkbox';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, User, user } from '@angular/fire/auth';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { getAnalytics, logEvent } from '@angular/fire/analytics';
import { DropdownModule } from 'primeng/dropdown';
import { MenuModule } from 'primeng/menu';
import { RecipesKey } from '../assets/data/recipe-model';
import { Machines } from '../assets/data/machines';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        AutoCompleteModule,
        FormsModule,
        NgOptimizedImage,
        KeyValuePipe,
        InputTextModule,
        ReactiveFormsModule,
        TreeTableModule,
        AsyncPipe,
        NgClass,
        TableModule,
        ButtonModule,
        RippleModule,
        CheckboxModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        DecimalPipe,
        DropdownModule,
        MenuModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('treeTableWrapper') treeTableWrapper!: ElementRef
    private confirmationService = inject(ConfirmationService);
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private analytics = getAnalytics();
    private triggerSearchManually$ = new Subject<boolean>();
    user$ = user(this.auth);
    userSubscription!: Subscription;
    recipes = Recipes;
    selectedItems: any[] = [];
    filteredItems: any[] = [];
    searchText = new FormControl('');
    autocompleteSearch = new FormControl('');
    howItWorksIsVisible = false;
    loggedInMenuItems = [
        {
            label: 'Sign Out',
            icon: 'pi pi-sign-out',
            command: this.signOut.bind(this)
        }
    ];
    scrollHeight!: string;
    estimatedPowerUsage = 0;
    sinkPoints = 0;

    itemsToSearch$: Observable<any[]> = this.searchText.valueChanges.pipe(
        startWith(''),
        combineLatestWith(this.triggerSearchManually$.pipe(
            startWith(true))
        ),
        map((value: [string | null, boolean]) => {
            const searchText = value[0] ?? '';
            return Object.keys(Recipes).sort().filter(key => {
                return !this.alreadySelected(key) && Recipes[key as RecipesKey].name.toLowerCase().includes(searchText.toLowerCase());
            }).map(key => {
                return {
                    name: Recipes[key as RecipesKey].name,
                    image: `../assets/images/${key}.png`,
                    key
                };
            });
        })
    );

    ngOnInit() {
        this.userSubscription = this.user$.subscribe((user: User | null) => {
            if (!user) {
                this.loadLocalItems();
            } else {
                this.loadUserItems(user.uid);
            }
        });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.scrollHeight = this.treeTableWrapper.nativeElement.offsetHeight - 45 + 'px';
        }, 0);
    }

    ngOnDestroy() {
        this.userSubscription.unsubscribe();
    }

    filterItems(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        this.filteredItems = Object.keys(Recipes).sort().filter(key => {
            return !this.alreadySelected(key) && Recipes[key as RecipesKey].name.toLowerCase().includes(query.toLowerCase());
        }).map(key => {
            return {
                name: Recipes[key as RecipesKey].name,
                image: `../assets/images/${key}.png`,
                key
            };
        });
    }

    selectAutocompleteItem(event: AutoCompleteSelectEvent) {
        this.selectItem(event.value);
        this.autocompleteSearch.reset();
    }

    selectItem(item: any) {
        const copy = [...this.selectedItems];
        copy.push({
            data: {
                key: item.key,
                name: Recipes[item.key as RecipesKey].name,
                remaining: 0,
                total: 0,
                image: `../assets/images/${item.key}.png`,
                item: Recipes[item.key as RecipesKey],
            },
            children: Object.keys(Recipes[item.key as RecipesKey].recipes).map(key => {
                return {
                    data: {
                        name: Recipes[item.key as RecipesKey].recipes[key].name,
                        amount: 0,
                        parentKey: item.key,
                        key
                    },
                };
            }),
        });
        this.selectedItems = [...copy];
        this.updateTotals();
        this.saveData();
        this.triggerSearchManually$.next(true);
    }

    editingComplete(saveData = true) {
        this.updateTotals();
        if (saveData) {
            this.saveData();
        }
    }

    recalculateAmounts(item: any) {
        const parentKey = item.data.key as RecipesKey;

        item.children.forEach((child: any) => {
            const childKey = child.data.key;
            const recipeOutputValues = Recipes[parentKey].recipes[childKey].outputs[parentKey];
            for (const inputKey in Recipes[parentKey].recipes[childKey].inputs) {
                const selectedItemInput = this.alreadySelected(inputKey);
                const recipeInput = Recipes[parentKey].recipes[childKey].inputs[inputKey];
                if (selectedItemInput) {
                    if (!recipeOutputValues) {
                        console.log(child)
                    }
                    selectedItemInput.data.remaining -= (child.data.amount * recipeInput.amount) / recipeOutputValues.amount;
                }
            }

            for (const output in Recipes[parentKey].recipes[childKey].outputs) {
                const outputItem = this.alreadySelected(output);
                const outputRecipe = Recipes[parentKey].recipes[childKey].outputs[output];
                if (outputItem && child.data.amount !== 0) {
                    outputItem.data.remaining += (child.data.amount / recipeOutputValues.amount) * outputRecipe.amount;
                    outputItem.data.total += (child.data.amount / recipeOutputValues.amount) * outputRecipe.amount;
                }
            }
        });
    }

    deleteItem(node: any) {
        this.selectedItems.splice(this.selectedItems.indexOf(node.node), 1);
        this.selectedItems = [...this.selectedItems];
        this.updateTotals();
        this.saveData();
    }

    signIn() {
        const provider = new GoogleAuthProvider();
        from(signInWithPopup(this.auth, provider)).pipe(take(1)).subscribe();
    }

    signOut() {
        signOut(this.auth);
    }

    showHowItWorks() {
        this.howItWorksIsVisible = true;
        logEvent(this.analytics, 'how_it_works', { action: 'open' });
    }

    private updateTotals() {
        this.selectedItems.forEach(item => {
            item.data.remaining = 0;
            item.data.total = 0;

        });
        this.selectedItems.forEach(item => {
            this.recalculateAmounts(item);
        });
        this.calculatePowerUsage(this.selectedItems);
        this.calculateSinkPoints(this.selectedItems);
    }

    private saveData() {
        this.user$.pipe(take(1)).subscribe((user: User | null) => {
            if (user) {
                this.saveCloudData(user.uid);
            } else {
                this.saveLocalData();
            }
        });
    }

    private alreadySelected(key: string) {
        return this.selectedItems.find(item => item.data.key === key);
    }

    private clearLocalData() {
        localStorage.removeItem('selectedItems');
    }

    private saveLocalData() {
        const data = this.prepareSaveData();
        localStorage.setItem('selectedItems', JSON.stringify(data));
    }

    private saveCloudData(uid: string): Promise<any> {
        const userDataDoc = doc(this.firestore, `production/${uid}`);
        return setDoc(userDataDoc, this.prepareSaveData());
    }

    private prepareSaveData() {
        const saveObj: any = {};
        this.selectedItems.forEach(item => {
            saveObj[item.data.key] = {};
            item.children.forEach((child: any) => {
                saveObj[item.data.key][child.data.key] = child.data.amount;
            });
        });
        return saveObj;
    }

    private loadLocalItems() {
        const data = localStorage.getItem('selectedItems');
        if (data) {
            const parsedData = JSON.parse(data);
            this.prepareLoadData(parsedData);
            this.editingComplete(false);
            this.triggerSearchManually$.next(true);
        }
    }

    private prepareLoadData(data: any) {
        const selectedItems = [];
        for (const parentKey in data) {
            const pKey = parentKey as RecipesKey;
            selectedItems.push({
                data: {
                    key: parentKey,
                    name: Recipes[pKey].name,
                    remaining: 0,
                    total: 0,
                    image: `../assets/images/${pKey}.png`,
                    item: Recipes[pKey],
                },
                children: Object.keys(data[pKey]).map(key => {
                    return {
                        data: {
                            name: Recipes[pKey].recipes[key].name,
                            amount: data[parentKey][key],
                            parentKey,
                            key
                        },
                    };
                }),
            });
        }
        this.selectedItems = [...selectedItems];
        this.triggerSearchManually$.next(true);
    }

    private loadOldCloudFormat(data: any) {
        const selectedItems = [];
        for (const parentKey in data) {
            const pKey = parentKey as RecipesKey;
            if (data[parentKey].total > 0) {
                selectedItems.push({
                    data: {
                        key: pKey,
                        name: Recipes[pKey].name,
                        remaining: 0,
                        total: 0,
                        image: `../assets/images/${pKey}.png`,
                        item: Recipes[pKey],
                    },
                    children: Object.keys(data[pKey].recipes).map(recipeKey => {
                        return {
                            data: {
                                name: Recipes[pKey].recipes[recipeKey].name,
                                amount: data[pKey].recipes[recipeKey].rate,
                                pKey,
                                key: recipeKey
                            },
                        };
                    }),
                });
            }
        }

        this.selectedItems = [...selectedItems];
        this.triggerSearchManually$.next(true);
    }

    private loadUserItems(uid: string) {
        const userData = doc(this.firestore, `production/${uid}`)
        docData(userData).pipe(take(1)).subscribe((data: any) => {
            const localData = localStorage.getItem('selectedItems');
            if (data && localData) {
                this.confirmationService.confirm({
                    message: 'You have a local save and a cloud save. Which would you like to use?',
                    header: 'Data Conflict',
                    icon: 'pi pi-exclamation-triangle',
                    acceptIcon: 'none',
                    rejectIcon: 'none',
                    acceptLabel: 'Cloud',
                    rejectLabel: 'Local',
                    rejectButtonStyleClass: 'p-button-text',
                    accept: () => {
                        if (data.key) {
                            this.loadOldCloudFormat(data);
                            this.editingComplete();
                        } else {
                            this.prepareLoadData(data);
                            this.editingComplete(false);
                        }
                        this.clearLocalData();
                    },
                    reject: () => {
                        this.loadLocalItems();
                        this.saveCloudData(uid).then(() => {
                            this.clearLocalData();
                        });
                    }
                });
            } else if (localData) {
                this.loadLocalItems();
            } else if (data) {
                if (data['ironOre']?.total !== undefined) {
                    this.loadOldCloudFormat(data);
                    this.editingComplete();
                } else {
                    this.prepareLoadData(data);
                    this.editingComplete(false);
                }
            }
        });
    }

    private calculatePowerUsage(items : any) {
        this.estimatedPowerUsage = 0;
        items.forEach((item: any) => {
            item.children.forEach((child: any) => {
                const data = child.data;
                const recipe = Recipes[data.parentKey as RecipesKey].recipes[data.key];
                const machineToUse = recipe.machines[0];
                const machineData = Machines[machineToUse];
                const ratio = data.amount / recipe.outputs[data.parentKey].rate;
                const powerUsage = machineData.power.min * ratio;
                this.estimatedPowerUsage += powerUsage;
            });
        });
    }

    private calculateSinkPoints(items: any) {
        this.sinkPoints = 0;
        items.forEach((item: any) => {
            console.log(item);
            const remaining = item.data.remaining > 0 ? item.data.remaining : 0;
            const sinkPerItem = Recipes[item.data.key as RecipesKey].sinkPoints;
            this.sinkPoints += sinkPerItem * remaining;
        });
    }
}
