import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Recipes, RecipesKey } from '../assets/data/recipes';
import { AsyncPipe, KeyValuePipe, NgClass, NgOptimizedImage } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { combineLatestWith, from, map, startWith, Subject, Subscription, take } from 'rxjs';
import { TreeTableModule } from 'primeng/treetable';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { CheckboxModule } from 'primeng/checkbox';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, User, user, UserCredential } from '@angular/fire/auth';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

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
        ConfirmDialogModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit, OnDestroy {
    private confirmationService = inject(ConfirmationService);
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private triggerSearchManually$ = new Subject<boolean>();
    user$ = user(this.auth);
    userSubscription!: Subscription;
    recipes = Recipes;
    selectedItems: any[] = [];
    searchText = new FormControl('');

    itemsToSearch$ = this.searchText.valueChanges.pipe(
        startWith(''),
        combineLatestWith(this.triggerSearchManually$.pipe(
            startWith(true))
        ),
        map((value: [string | null, boolean]) => {
            const searchText = value[0] ?? '';
            return Object.keys(Recipes).sort().filter(key => {
                return !this.alreadySelected(key) && Recipes[key].name.toLowerCase().includes(searchText.toLowerCase());
            }).map(key => {
            return {
                name: Recipes[key as RecipesKey].name,
                image: `../assets/images/${key}.png`,
                key
            };
        })
    }));

    ngOnInit() {
        this.userSubscription = this.user$.subscribe((user: User | null) => {
            if (!user) {
                this.loadLocalItems();
            } else {
                this.loadUserItems(user.uid);
            }
        });
    }

    ngOnDestroy() {
        this.userSubscription.unsubscribe();
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
                item: Recipes[item.key],
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
        this.saveData();
        this.triggerSearchManually$.next(true);
    }

    editingComplete(saveData = true) {
        this.selectedItems.forEach(item => {
            item.data.remaining = 0;
            item.data.total = 0;
        });
        this.selectedItems.forEach(item => {
            this.recalculateAmounts(item);
        });
        if (saveData) {
            this.saveData();
        }
    }

    recalculateAmounts(item: any) {
        const parentKey = item.data.key;

        item.children.forEach((child: any) => {
            const childKey = child.data.key;
            const recipeOutputValues = Recipes[parentKey].recipes[childKey].outputs[parentKey];
            for (const inputKey in Recipes[parentKey].recipes[childKey].inputs) {
                const selectedItemInput = this.alreadySelected(inputKey);
                const recipeInput = Recipes[parentKey].recipes[childKey].inputs[inputKey];
                if (selectedItemInput) {
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
        this.saveData();
    }

    signIn() {
        const provider = new GoogleAuthProvider();
        from(signInWithPopup(this.auth, provider)).pipe(take(1)).subscribe();
    }

    signOut() {
        signOut(this.auth);
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
        }
    }

    private prepareLoadData(data: any) {
        const selectedItems = [];
        for (const parentKey in data) {
            selectedItems.push({
                data: {
                    key: parentKey,
                    name: Recipes[parentKey].name,
                    remaining: 0,
                    total: 0,
                    image: `../assets/images/${parentKey}.png`,
                    item: Recipes[parentKey],
                },
                children: Object.keys(data[parentKey]).map(key => {
                    return {
                        data: {
                            name: Recipes[parentKey].recipes[key].name,
                            amount: data[parentKey][key],
                            parentKey,
                            key
                        },
                    };
                }),
            });
        }
        this.selectedItems = [...selectedItems];
    }

    private loadOldCloudFormat(data: any) {
        const selectedItems = [];
        for (const parentKey in data) {
            if (data[parentKey].total > 0) {
                selectedItems.push({
                    data: {
                        key: parentKey,
                        name: Recipes[parentKey].name,
                        remaining: 0,
                        total: 0,
                        image: `../assets/images/${parentKey}.png`,
                        item: Recipes[parentKey],
                    },
                    children: Object.keys(data[parentKey].recipes).map(recipeKey => {
                        return {
                            data: {
                                name: Recipes[parentKey].recipes[recipeKey].name,
                                amount: data[parentKey].recipes[recipeKey].rate,
                                parentKey,
                                key: recipeKey
                            },
                        };
                    }),
                });
            }
        }
        this.selectedItems = [...selectedItems];
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
                            console.log('old format');
                        } else {
                            this.prepareLoadData(data);
                            this.editingComplete(false);
                        }
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
}
