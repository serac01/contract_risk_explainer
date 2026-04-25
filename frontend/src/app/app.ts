import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UploadComponent } from './upload/upload.component';
import { AnalysisComponent } from './analysis/analysis.component';

@Component({
  selector: 'app-root',
  imports: [UploadComponent, AnalysisComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  result: any;
}
