import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
      provideRouter(routes),
      provideAnimations(),
      importProvidersFrom(
          provideFirebaseApp(() => initializeApp({
              "projectId":"satisfactory-a0b5d",
              "appId":"1:703673039429:web:306193e44669982319412c",
              "storageBucket":"satisfactory-a0b5d.appspot.com",
              "apiKey":"AIzaSyBXmZbE1fMcDQURKrBH3JkjJVJ-46bjNeM",
              "authDomain":"satisfactory-a0b5d.firebaseapp.com"
              ,"messagingSenderId":"703673039429",
              "measurementId":"G-CLM77DC8XS"
          }))),
      importProvidersFrom(provideAuth(() => getAuth())),
      importProvidersFrom(provideAnalytics(() => getAnalytics())),
      ScreenTrackingService,
      UserTrackingService,
      importProvidersFrom(provideFirestore(() => getFirestore()))
  ]
};
