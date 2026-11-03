import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { ButtonComponent } from '../../atoms/button/button.component';
import { InputComponent } from '../../atoms/input/input';
import { SelectComponent, SelectOption } from '../../atoms/select/select';

export interface SearchBarFilters {
  search: string;
  status: unknown;
  dateFrom: string;
  dateTo: string;
  sort: string;
}

let nextSearchBarId = 0;

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar implements OnInit, OnDestroy {
  /** Placeholder personalizable del campo de búsqueda. */
  @Input() placeholder = 'Buscar en VecinApp...';

  /** Valor inicial de búsqueda; se conserva por compatibilidad con el API anterior. */
  @Input() value = '';

  /** Estado de carga mientras se filtran o buscan datos. */
  @Input() loading = false;

  /** Tiempo de espera en ms antes de emitir cambios de texto. */
  @Input() debounceMs = 300;

  /** Opciones de estado para el filtro avanzado. */
  @Input() statusOptions: SelectOption[] = [];

  /** Muestra los filtros de estado y fechas. */
  @Input() showFilters = false;

  /** Muestra el selector de ordenamiento. */
  @Input() showSort = false;

  /** Valores actuales de los filtros; pueden inicializarse desde el componente padre. */
  @Input() status: unknown = null;
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() sort = 'recent';

  @Input() sortOptions: SelectOption<string>[] = [
    { label: 'Más recientes', value: 'recent' },
    { label: 'Más viejos', value: 'oldest' },
  ];

  /** Evento existente, mantenido para no romper los usos actuales. */
  @Output() readonly search = new EventEmitter<string>();

  /** Emite el estado combinado de búsqueda, filtros y ordenamiento. */
  @Output() readonly filterChange = new EventEmitter<SearchBarFilters>();

  readonly idPrefix = `search-bar-${nextSearchBarId++}`;
  searchTerm = '';

  private readonly searchSubject = new Subject<string | null>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    this.searchTerm = this.value;

    this.searchSub = this.searchSubject.pipe(
      switchMap(term =>
        term === null
          ? of(null)
          : timer(this.debounceMs).pipe(map(() => term)),
      ),
    ).subscribe(term => {
      const currentTerm = term ?? '';
      this.search.emit(currentTerm);
      this.emitFilterChange();
    });
  }

  onInput(value: string | number): void {
    this.searchTerm = value.toString();
    this.value = this.searchTerm;
    this.searchSubject.next(this.searchTerm);
  }

  updateStatus(value: unknown): void {
    this.status = value;
    this.emitFilterChange();
  }

  updateDateFrom(value: string | number): void {
    this.dateFrom = value.toString();
    this.emitFilterChange();
  }

  updateDateTo(value: string | number): void {
    this.dateTo = value.toString();
    this.emitFilterChange();
  }

  updateSort(value: unknown): void {
    this.sort = value?.toString() ?? 'recent';
    this.emitFilterChange();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.value = '';
    this.searchSubject.next(null);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.value = '';
    this.status = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.sort = 'recent';
    this.searchSubject.next(null);
  }

  get hasActiveFilters(): boolean {
    return Boolean(
      this.searchTerm ||
      this.status !== null && this.status !== undefined && this.status !== '' ||
      this.dateFrom ||
      this.dateTo ||
      this.sort !== 'recent',
    );
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  private emitFilterChange(): void {
    this.filterChange.emit({
      search: this.searchTerm,
      status: this.status,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      sort: this.sort,
    });
  }
}
