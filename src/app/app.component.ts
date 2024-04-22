import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Item, Recipes, RecipesKey } from '../assets/data/recipes';
import { FilterService, TreeNode } from 'primeng/api';
import { AsyncPipe, KeyValuePipe, NgOptimizedImage } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { combineLatest, combineLatestWith, map, startWith, Subject, tap, withLatestFrom } from 'rxjs';
import { TreeTableModule } from 'primeng/treetable';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, AutoCompleteModule, FormsModule, NgOptimizedImage, KeyValuePipe, InputTextModule, ReactiveFormsModule, TreeTableModule, AsyncPipe],
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
    selectedItems: TreeNode[] = [];
    searchText = new FormControl('');
    itemsToSearch$ = this.searchText.valueChanges.pipe(startWith(''), combineLatestWith(this.triggerSearchManually$.pipe(startWith(true))), map(value => {
        return Object.keys(Recipes).sort().filter(key => !this.alreadySelected(key)).map(key => {
            return {
                name: Recipes[key as RecipesKey].name,
                image: `../assets/images/${key}.png`,
                key
            };
        })
    }));

    ngOnInit() {
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
                item
            },
            children: Object.keys(Recipes[item.key as RecipesKey].recipes).map(key => {
                return {
                    data: {
                        name: Recipes[item.key as RecipesKey].recipes[key].name,
                        amount: 0
                    },
                };
            }),
        });
        this.selectedItems = [...copy];
        this.triggerSearchManually$.next(true);
    }

    private alreadySelected(key: string) {
        return this.selectedItems.find(item => item.data === Recipes[key as RecipesKey]);
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
