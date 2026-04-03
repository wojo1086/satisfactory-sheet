import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const SatisfactoryTheme = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{orange.50}',
            100: '{orange.100}',
            200: '{orange.200}',
            300: '{orange.300}',
            400: '{orange.400}',
            500: '#FA9549',
            600: '{orange.600}',
            700: '{orange.700}',
            800: '{orange.800}',
            900: '{orange.900}',
            950: '{orange.950}'
        }
    }
});

export const appConfig: ApplicationConfig = {
  providers: [
      provideRouter(routes),
      provideAnimationsAsync(),
      providePrimeNG({
          theme: {
              preset: SatisfactoryTheme,
              options: {
                  darkModeSelector: '.dark-mode',
                  cssLayer: false
              }
          }
      }),
      provideFirebaseApp(() => initializeApp({
          "projectId":"satisfactory-a0b5d",
          "appId":"1:703673039429:web:306193e44669982319412c",
          "storageBucket":"satisfactory-a0b5d.appspot.com",
          "apiKey":"AIzaSyBXmZbE1fMcDQURKrBH3JkjJVJ-46bjNeM",
          "authDomain":"satisfactory-a0b5d.firebaseapp.com",
          "messagingSenderId":"703673039429",
          "measurementId":"G-CLM77DC8XS"
      })),
      provideAuth(() => getAuth()),
      provideAnalytics(() => getAnalytics()),
      ScreenTrackingService,
      UserTrackingService,
      provideFirestore(() => getFirestore())
  ]
};
