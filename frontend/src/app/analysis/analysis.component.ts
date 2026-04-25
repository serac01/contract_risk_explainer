import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {
  @Input() data: any;

  constructor() { }

  ngOnInit() {
  }

  selectedClause: any;

  selectClause(clause: any) {
    this.selectedClause = clause;
  }

}
