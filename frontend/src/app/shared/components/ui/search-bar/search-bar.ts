import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';


@Component({
  selector: 'app-search-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar {
  /** Placeholder personalizable */
  @Input() placeholder: string = 'Buscar en VecinApp...';

  /** Valor inicial de búsqueda */
  @Input() value: string = '';

  /** Estado de carga mientras se filtran/buscan datos */
  @Input() loading: boolean = false;

  /** Tiempo de espera en ms antes de emitir la búsqueda (debounce) */
  @Input() debounceMs: number = 300;

  /** Emite el término de búsqueda procesado */
  @Output() search = new EventEmitter<string>();

  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    this.searchTerm = this.value;

    // Emite el valor tras pausar de escribir para no saturar el filtrado
    this.searchSub = this.searchSubject.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged()
    ).subscribe(term => {
      this.search.emit(term);
    });
  }

  onInput(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

}
