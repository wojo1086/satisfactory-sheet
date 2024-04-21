import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Recipes } from '../assets/data/recipes';
import { FilterService } from 'primeng/api';
import { KeyValuePipe, NgOptimizedImage } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, AutoCompleteModule, FormsModule, NgOptimizedImage, KeyValuePipe, InputTextModule, ReactiveFormsModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent {
    private filterService = inject(FilterService);
    recipes = Recipes;
    selectedFilteredRecipe: any;
    filteredRecipes: any[] = [];
    selectedRecipes: any[] = [];
    searchText = new FormControl('');

    filterRecipes(event: AutoCompleteCompleteEvent) {
        const query = event.query.toLowerCase();
        // const filteredRecipes: any[] = [];
        const filteredRecipes = Object.keys(Recipes).sort().filter(key => key.includes(query) && !Recipes[key as keyof typeof Recipes].handPicked).map(key => {
            return {
                name: Recipes[key as keyof typeof Recipes].name,
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
}
