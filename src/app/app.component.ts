import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { getAnalytics, logEvent } from '@angular/fire/analytics';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { from, take } from 'rxjs';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        AsyncPipe,
        ButtonModule,
        NgOptimizedImage,
        DialogModule,
        MenuModule
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent {
    private analytics = getAnalytics();
    private auth = inject(Auth);
    user$ = user(this.auth);
    howItWorksIsVisible = false;
    loggedInMenuItems = [
        {
            label: 'Sign Out',
            icon: 'pi pi-sign-out',
            command: this.signOut.bind(this)
        }
    ];

    showHowItWorks() {
        this.howItWorksIsVisible = true;
        logEvent(this.analytics, 'how_it_works', {action: 'open'});
    }

    signIn() {
        const provider = new GoogleAuthProvider();
        from(signInWithPopup(this.auth, provider)).pipe(take(1)).subscribe();
    }

    signOut() {
        signOut(this.auth);
    }
}
