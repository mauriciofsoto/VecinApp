import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Badge } from '../../../shared/components/ui/badge/badge';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CommentInput } from '../../../shared/components/ui/comment-input/comment-input';
import { SearchBar } from '../../../shared/components/ui/search-bar/search-bar';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { Modal } from '../../../shared/components/ui/modal/modal';
import { SidebarComponent } from '../../../shared/components/navigation/sidebar/sidebar.component';

import { BentoGridComponent, BentoWidget } from '../../../shared/components/layout/bento-grid/bento-grid';
import { BentoItemDirective } from '../../../shared/components/layout/bento-grid/bento-item.directive';
import { PollOptionMock } from '../../../shared/components/ui/poll-options/poll-options';

const DEFAULT_WIDGETS: BentoWidget[] = [
  { id: 'muro', title: 'Muro', variant: 'glass', cols: 2, rows: 2, visible: true },
  { id: 'encuesta_activa', title: 'Encuesta', variant: 'glass', cols: 2, rows: 1, visible: true },
  { id: 'incidencias', title: 'Incidencias', variant: 'solid', cols: 1, rows: 1, visible: true },
  { id: 'paquetes', title: 'Paquetes', variant: 'glass', cols: 1, rows: 1, visible: true },
];

const LAYOUT_STORAGE_KEY = 'bento_layout_sample';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    Badge,
    ButtonComponent,
    CommentInput,
    SearchBar,
    SidebarComponent,
    Modal,
    BentoGridComponent,
    BentoItemDirective,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  userVotedOptionId: string | null = 'opt1';

  widgets: BentoWidget[] = DEFAULT_WIDGETS.map((widget) => ({ ...widget }));

  protected readonly mockPollOptions: PollOptionMock[] = [
    { id: 'opt1', text: 'Viernes 25 - 19:00 hs', percentage: 45 },
    { id: 'opt2', text: 'Sábado 26 - 11:00 hs', percentage: 35 },
    { id: 'opt3', text: 'Domingo 27 - 18:00 hs', percentage: 20 },
  ];

  protected readonly showQr = signal(false);
  protected readonly showNuevaIncidencia = signal(false);

  ngOnInit(): void {
    this.restoreLayout();
  }

  onLayoutChange(newWidgets: BentoWidget[]): void {
    this.widgets = newWidgets;
    this.saveLayout();
  }

  resetLayout(): void {
    this.widgets = DEFAULT_WIDGETS.map((widget) => ({ ...widget }));
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  }

  openQr(): void {
    this.showQr.set(true);
  }

  closeQr(): void {
    this.showQr.set(false);
  }

  guardarQr(): void {
    this.closeQr();
  }

  crearIncidencia(): void {
    this.showNuevaIncidencia.set(false);
  }

  onNuevoComentario(texto: string, widgetId?: string): void {
    console.log('Comentario:', texto, widgetId);
  }

  onBuscar(termino: string): void {
    console.log('Buscar:', termino);
  }

  onVotarEncuesta(selectedOptionId: string): void {
    this.userVotedOptionId = selectedOptionId;
    console.log('Opción seleccionada en widget:', selectedOptionId);
  }

  private restoreLayout(): void {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (!savedLayout) return;

    try {
      const parsedLayout: unknown = JSON.parse(savedLayout);

      if (this.isValidLayout(parsedLayout)) {
        this.widgets = parsedLayout;
      } else {
        localStorage.removeItem(LAYOUT_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
      console.warn('No se pudo recuperar el layout guardado. Se utilizará el diseño predeterminado.');
    }
  }

  private saveLayout(): void {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.widgets));
  }

  private isValidLayout(value: unknown): value is BentoWidget[] {
    if (!Array.isArray(value)) return false;

    const validIds = new Set(DEFAULT_WIDGETS.map((widget) => widget.id));

    return (
      value.length === DEFAULT_WIDGETS.length &&
      value.every((item: unknown) => {
        if (typeof item !== 'object' || item === null) return false;

        const widget = item as Partial<BentoWidget>;

        return (
          typeof widget.id === 'string' &&
          validIds.has(widget.id) &&
          typeof widget.title === 'string' &&
          (widget.variant === 'glass' || widget.variant === 'solid') &&
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
      new Set(value.map((item: BentoWidget) => item.id)).size === value.length
    );
  }
}
