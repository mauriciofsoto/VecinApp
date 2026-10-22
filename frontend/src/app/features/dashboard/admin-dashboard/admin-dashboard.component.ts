import { ReactionBar,Reaction } from './../../../shared/components/ui/reaction-bar/reaction-bar';
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

import { MessageInput } from '../../../shared/components/ui/message-input/message-input';
import { EmptyState } from '../../../shared/components/ui/empty-state/empty-state';

import { GestionarEncuestas } from '../../operations/encuestas/pages/gestionar-encuestas/gestionar-encuestas';
import { HistorialEncuestas } from '../../operations/encuestas/pages/historial-encuestas/historial-encuestas';
import { ResponderEncuesta } from '../../operations/encuestas/pages/responder-encuesta/responder-encuesta';



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
    MessageInput,
    BentoGridComponent,
    BentoItemDirective,
    ReactionBar,
    EmptyState,
    GestionarEncuestas,
    ResponderEncuesta
],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  userVotedOptionId: string | null = 'opt1';

  widgets: BentoWidget[] = DEFAULT_WIDGETS.map((widget) => ({ ...widget }));


  readonly reaccionesMuro: Reaction[] = [
  { emoji: '👍', count: 4, reacted: false },
  { emoji: '❤️', count: 2, reacted: false },
  { emoji: '😂', count: 1, reacted: false },
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

  protected onEnviarMensaje(mensaje: string): void {
  console.log('Mensaje de prueba:', mensaje);
  }

  onReaccionMuro(emoji: string): void {
  const existente = this.reaccionesMuro.find(
    (reaction) => reaction.emoji === emoji
  );

  if (existente) {
    existente.count += existente.reacted ? -1 : 1;
    existente.reacted = !existente.reacted;
    return;
  }

  this.reaccionesMuro.push({
    emoji,
    count: 1,
    reacted: true,
  });
  }

}
