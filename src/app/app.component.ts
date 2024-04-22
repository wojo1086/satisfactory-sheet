import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Item, Recipes, RecipesKey } from '../assets/data/recipes';
import { FilterService } from 'primeng/api';
import { KeyValuePipe, NgOptimizedImage } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { startWith } from 'rxjs';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, AutoCompleteModule, FormsModule, NgOptimizedImage, KeyValuePipe, InputTextModule, ReactiveFormsModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
    private filterService = inject(FilterService);
    recipes = Recipes;
    selectedFilteredRecipe: any;
    filteredRecipes: any[] = [];
    selectedItems: Item = {};
    searchText = new FormControl('');
    itemsToSearch: any[] = [];

    ngOnInit() {
        this.searchText.valueChanges.pipe(startWith('')).subscribe(value => {
            this.itemsToSearch = Object.keys(Recipes).sort().filter(key => key.includes(value ?? '')).map(key => {
                return {
                    name: Recipes[key as RecipesKey].name,
                    image: `../assets/images/${key}.png`,
                    key
                };
            })
        });
    }

    filterRecipes(event: AutoCompleteCompleteEvent) {
        const query = event.query.toLowerCase();
        // const filteredRecipes: any[] = [];
        const filteredRecipes = Object.keys(Recipes).sort().filter(key => key.includes(query) && !Recipes[key as RecipesKey].handPicked).map(key => {
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
        this.selectedItems[item.key] = Recipes[item.key as RecipesKey];

    }
}
