import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeTr from '@angular/common/locales/tr';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';

registerLocaleData(localeTr);

bootstrapApplication(App, { providers: [provideHttpClient()] }).catch(console.error);
