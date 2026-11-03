import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

import { ButtonComponent } from '../../../shared/components/atoms/button/button.component';
import { SearchBar } from '../../../shared/components/molecules/search-bar/search-bar';
import { CardComponent } from '../../../shared/components/atoms/card/card.component';
import { SidebarComponent } from '../../../shared/components/navigation/sidebar/sidebar.component';
import { InputComponent } from '../../../shared/components/atoms/input/input'
import { EmptyState } from '../../../shared/components/molecules/empty-state/empty-state';

import { ReactionBar, type Reaction } from '../../../shared/components/organisms/reaction-bar/reaction-bar';
import { PollOption } from '../../../shared/models/poll-option.model';
import { HistorialEncuestas } from '../../operations/encuestas/pages/historial-encuestas/historial-encuestas';

import {
  BentoGridComponent,
  BentoWidget,
} from '../../../shared/components/layout/bento-grid/bento-grid';
import { BentoItemDirective } from '../../../shared/components/layout/bento-grid/bento-item.directive';

import { FeedPrincipal } from '../../community/feed/pages/feed-principal/feed-principal';
import { IncidenciasAdmin } from '../../operations/incidencias/pages/incidencias-admin/incidencias-admin';
import { CrearIncidencia } from '../../operations/incidencias/pages/crear-incidencia/crear-incidencia';
import { MisIncidencias } from '../../operations/incidencias/pages/mis-incidencias/mis-incidencias';

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
    InputComponent,
    SearchBar,
    EmptyState, SidebarComponent,
    BentoGridComponent,
    BentoItemDirective,
    HistorialEncuestas,
    FeedPrincipal,
    IncidenciasAdmin,
    CrearIncidencia,
    MisIncidencias
],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  // Propiedad agregada para la galería de validación de Shared
  previewInput = '';
  previewComment = '';
  previewMessage = '';
  previewVote = '';
  previewReaction = '';
  isPreviewModalOpen = false;

  readonly previewPollOptions: PollOption[] = [
    { id: 'approve', text: 'Aprobar propuesta', percentage: 68, votes: 17 },
    { id: 'reject', text: 'Revisar más adelante', percentage: 32, votes: 8 },
  ];

  readonly previewReactions: Reaction[] = [
    { emoji: '👍', count: 8, reacted: true },
    { emoji: '🎉', count: 3, reacted: false },
  ];

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

  onPreviewComment(comment: string): void {
    this.previewComment = comment;
  }

  onPreviewMessage(message: string): void {
    this.previewMessage = message;
  }

  onPreviewVote(optionId: string): void {
    this.previewVote = optionId;
  }

  onPreviewReaction(emoji: string): void {
    this.previewReaction = emoji;
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
