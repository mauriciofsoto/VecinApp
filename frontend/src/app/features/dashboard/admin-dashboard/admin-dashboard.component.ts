import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { SearchBar } from '../../../shared/components/ui/search-bar/search-bar';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { SidebarComponent } from '../../../shared/components/navigation/sidebar/sidebar.component';

import {
  BentoGridComponent,
  BentoWidget,
} from '../../../shared/components/layout/bento-grid/bento-grid';
import { BentoItemDirective } from '../../../shared/components/layout/bento-grid/bento-item.directive';

import { EmptyState } from '../../../shared/components/ui/empty-state/empty-state';

import { GestionarEncuestas } from '../../operations/encuestas/pages/gestionar-encuestas/gestionar-encuestas';
import { FeedPrincipal } from '../../community/feed/pages/feed-principal/feed-principal';
import { IncidenciasAdmin } from '../../operations/incidencias/pages/incidencias-admin/incidencias-admin';

const DEFAULT_WIDGETS: BentoWidget[] = [
  {
    id: 'incidencias',
    title: 'Incidencias',
    variant: 'solid',
    cols: 3,
    rows: 3,
    visible: true,
  },
  {
    id: 'encuestas',
    title: 'Encuestas',
    variant: 'glass',
    cols: 2,
    rows: 2,
    visible: true,
  },
  {
    id: 'muro',
    title: 'Muro de la comunidad',
    variant: 'glass',
    cols: 3,
    rows: 2,
    visible: true,
  },
  {
    id: 'paquetes',
    title: 'Paquetería',
    variant: 'glass',
    cols: 1,
    rows: 1,
    visible: true,
  },
];

const LAYOUT_STORAGE_KEY = 'vecinapp_admin_bento_layout';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CardComponent,
    SidebarComponent,
    BentoGridComponent,
    BentoItemDirective,
    GestionarEncuestas,
    FeedPrincipal,
    IncidenciasAdmin,
    EmptyState,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  widgets: BentoWidget[] = DEFAULT_WIDGETS.map((widget) => ({
    ...widget,
  }));

  readonly isLayoutEditable = signal(false);
  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.restoreLayout();
  }

  // Personalización del Bento Grid
  toggleLayoutEditing(): void {
    this.isLayoutEditable.update((editing) => !editing);
  }

  onLayoutChange(newWidgets: BentoWidget[]): void {
    this.widgets = newWidgets;
    this.saveLayout();
  }

  resetLayout(): void {
    this.widgets = DEFAULT_WIDGETS.map((widget) => ({
      ...widget,
    }));

    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  }

  // Búsqueda
  onBuscar(termino: string): void {
    console.log('Buscar:', termino);
  }

  // Recuperación del diseño guardado
  private restoreLayout(): void {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (!savedLayout) {
      return;
    }

    try {
      const parsedLayout: unknown = JSON.parse(savedLayout);

      if (this.isValidLayout(parsedLayout)) {
        this.widgets = parsedLayout;
      } else {
        localStorage.removeItem(LAYOUT_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);

      console.warn(
        'No se pudo recuperar el diseño guardado. Se utilizará el diseño predeterminado.',
      );
    }
  }

  private saveLayout(): void {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify(this.widgets),
    );
  }

  private isValidLayout(value: unknown): value is BentoWidget[] {
    if (!Array.isArray(value)) {
      return false;
    }

    const validIds = new Set(
      DEFAULT_WIDGETS.map((widget) => widget.id),
    );

    return (
      value.length === DEFAULT_WIDGETS.length &&
      value.every((item: unknown) => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        const widget = item as Partial<BentoWidget>;

        return (
          typeof widget.id === 'string' &&
          validIds.has(widget.id) &&
          typeof widget.title === 'string' &&
          (widget.variant === 'glass' ||
            widget.variant === 'solid') &&
          typeof widget.cols === 'number' &&
          Number.isInteger(widget.cols) &&
          widget.cols >= 1 &&
          widget.cols <= 4 &&
          typeof widget.rows === 'number' &&
          Number.isInteger(widget.rows) &&
          widget.rows >= 1 &&
          widget.rows <= 3 &&
          typeof widget.visible === 'boolean'
        );
      }) &&
      new Set(
        value.map((item: BentoWidget) => item.id),
      ).size === value.length
    );
  }
}
