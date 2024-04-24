import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Recipes, RecipesKey } from '../assets/data/recipes';
import { FilterService, TreeNode } from 'primeng/api';
import { AsyncPipe, JsonPipe, KeyValuePipe, NgClass, NgOptimizedImage } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { combineLatestWith, map, startWith, Subject } from 'rxjs';
import { TreeTableEditEvent, TreeTableModule } from 'primeng/treetable';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, AutoCompleteModule, FormsModule, NgOptimizedImage, KeyValuePipe, InputTextModule, ReactiveFormsModule, TreeTableModule, AsyncPipe, NgClass, TableModule, JsonPipe, ButtonModule, RippleModule, CheckboxModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
    private filterService = inject(FilterService);
    private triggerSearchManually$ = new Subject<boolean>();
    recipes = Recipes;
    masterItems: any = {};
    selectedFilteredRecipe: any;
    filteredRecipes: any[] = [];
    selectedItems: any[] = [];
    searchText = new FormControl('');
    addPrecursor = new FormControl(false);

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
        this.loadData();
        // for(const key in Recipes) {
        //     if (!this.masterItems[key as RecipesKey]) {
        //         this.masterItems[key as RecipesKey] = {...Recipes[key as RecipesKey]};
        //     }
        //
        //     for (const itemKey in Recipes[key as RecipesKey].recipes) {
        //         for (const input in Recipes[key as RecipesKey].recipes[itemKey].inputs) {
        //             if (!this.masterItems[input as RecipesKey]) {
        //                 this.masterItems[input as RecipesKey] = {...Recipes[input as RecipesKey]};
        //             }
        //         }
        //         const objCopy = {...Recipes[key as RecipesKey].recipes[itemKey]};
        //     }
        // }
        //
        // console.log(this.masterItems);

    }

    filterRecipes(event: AutoCompleteCompleteEvent) {
        const query = event.query.toLowerCase();
        // const filteredRecipes: any[] = [];
        const filteredRecipes = Object.keys(Recipes).sort().filter(key => !this.alreadySelected(key) || !Recipes[key as RecipesKey].handPicked || key.includes(query)).map(key => {
            return {
                name: Recipes[key as RecipesKey].name,
                image: `../assets/images/${key}.png`,
                key
                // items
            };
        });
        console.log(filteredRecipes);
        // for (const itemName in Recipes) {
        //     console.log(itemName);
        //
        // }

        this.filteredRecipes = filteredRecipes;
    }

    selectRecipe(event: AutoCompleteSelectEvent) {
        console.log(event);
    }

    selectItem(item: any) {
        const copy = [...this.selectedItems];
        copy.push({
            data: {
                key: item.key,
                name: Recipes[item.key as RecipesKey].name,
                amount: 0,
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

        // if (this.addPrecursor) {
            // for (const key in Recipes[item.key as RecipesKey].recipes) {
        //
        //         for(const input in Recipes[item.key as RecipesKey].recipes[key].inputs) {
        //
        //         }
                // if (!this.alreadySelected(key)) {
                //     copy.push({
                //         data: {
                //             key,
                //             name: Recipes[key as RecipesKey].name,
                //             amount: 0,
                //             image: `../assets/images/${key}.png`,
                //             item: Recipes[key as RecipesKey],
                //         },
                //         children: Object.keys(Recipes[key as RecipesKey].recipes).map(key => {
                //             return {
                //                 data: {
                //                     name: Recipes[key as RecipesKey].recipes[key].name,
                //                     amount: 0,
                //                     parentKey: key,
                //                     key
                //                 },
                //             };
                //         }),
                //     });
                // }
            // }
        // }
        this.selectedItems = [...copy];
        this.saveData();
        this.triggerSearchManually$.next(true);
    }

    editingComplete() {
        this.selectedItems.forEach(item => {
            item.data.amount = 0;
        });
        this.selectedItems.forEach(item => {
            this.recalculateAmounts(item);
        });
        this.saveData();
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
                    selectedItemInput.data.amount -= (child.data.amount * recipeInput.amount) / recipeOutputValues.amount;
                }
            }

            for (const output in Recipes[parentKey].recipes[childKey].outputs) {
                const outputItem = this.alreadySelected(output);
                const outputRecipe = Recipes[parentKey].recipes[childKey].outputs[output];
                if (outputItem && child.data.amount !== 0) {
                    outputItem.data.amount += (child.data.amount / recipeOutputValues.amount) * outputRecipe.amount;
                }
            }
        });
    }

    deleteItem(node: any) {
        this.selectedItems.splice(this.selectedItems.indexOf(node.node), 1);
        this.selectedItems = [...this.selectedItems];
        this.saveData();
    }

    private alreadySelected(key: string) {
        return this.selectedItems.find(item => item.data.key === key);
    }

    private saveData() {
        const data = this.selectedItems.map(item => {
            console.log(item);
            return {
                key: item.data.key,
                amount: item.data.amount,
                children: item.children.map((child: { data: { key: any; amount: any; }; }) => {
                    return {
                        key: child.data.key,
                        amount: child.data.amount
                    }
                })
            }
        });
        localStorage.setItem('selectedItems', JSON.stringify(data));
    }

    private loadData() {
        const data = localStorage.getItem('selectedItems');
        if (data) {
            const parsedData = JSON.parse(data);
            this.selectedItems = parsedData.map((item: { key: any; amount: any; children: any; }) => {
                return {
                    data: {
                        key: item.key,
                        amount: item.amount,
                        name: Recipes[item.key].name,
                        image: `../assets/images/${item.key}.png`,
                        item: Recipes[item.key],
                    },
                    children: item.children.map((child: { key: any; amount: any; }) => {
                        return {
                            data: {
                                name: Recipes[item.key].recipes[child.key].name,
                                amount: child.amount,
                                parentKey: item.key,
                                key: child.key
                            },
                        };
                    }),
                };
            });
        }

    }
}


class ItemList {
    head = null;
    constructor(head = null) {
        this.head = head;
    }
}

class ItemNode {
    data = null;
    next = null;
    constructor(data = null) {
        this.data = data;
    }
}
