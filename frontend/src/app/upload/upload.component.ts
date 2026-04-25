import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {

  file?: File;

  @Output() result = new EventEmitter<any>();

  constructor(private api: ApiService) {}

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  upload() {
    if (!this.file) return;

    this.api.uploadContract(this.file)
      .subscribe({
        next: (res) => {
          this.result.emit(res);
        },
        error: (err) => {
          console.error('Upload failed', err);
        }
      });
  }
}