import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  uploadContract(file: File) {

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.baseUrl}/contracts/upload`,
      formData
    );
  }
}