import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { from, take } from 'rxjs';
import { getAnalytics, logEvent } from '@angular/fire/analytics';
import { DialogModule } from 'primeng/dialog';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        NgOptimizedImage,
        AsyncPipe,
        ButtonModule,
        MenuModule,
        DialogModule
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent {
    private auth = inject(Auth);
    private analytics = getAnalytics();
    user$ = user(this.auth);

    howItWorksIsVisible = false;

    loggedInMenuItems = [
        {
            label: 'Sign Out',
            icon: 'pi pi-sign-out',
            command: this.signOut.bind(this)
        }
    ];

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
}
