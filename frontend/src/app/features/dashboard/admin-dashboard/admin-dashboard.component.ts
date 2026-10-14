import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Badge } from '../../../shared/components/ui/badge/badge';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CommentInput } from '../../../shared/components/ui/comment-input/comment-input';
import { SearchBar } from '../../../shared/components/ui/search-bar/search-bar';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { SidebarComponent } from '../../../shared/components/navigation/sidebar/sidebar.component';
import { Modal } from '../../../shared/components/ui/modal/modal';

export interface DashboardWidget {
  id: string;
  title: string;
  variant: 'glass' | 'solid';
  cols: 1 | 2 | 3;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CdkDropList,
    CdkDrag,
    CardComponent,
    Badge,
    ButtonComponent,
    CommentInput,
    SearchBar,
    SidebarComponent,
    Modal
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {

  widgets: DashboardWidget[] = [
    { id: '1', title: 'Contenedor 1', variant: 'glass', cols: 2 },
    { id: '2', title: 'Contenedor 2', variant: 'solid', cols: 1 },
    { id: '3', title: 'Contenedor 3', variant: 'glass', cols: 1 },
    { id: '4', title: 'Contenedor 4', variant: 'glass', cols: 1 },
    { id: '5', title: 'Contenedor 5', variant: 'glass', cols: 1 }
  ];

  // Modal "Asignar QR"
  protected readonly showQr = signal(false);

  ngOnInit(): void {
    const savedLayout = localStorage.getItem('bento_layout_sample');
    if (savedLayout) {
      try {
        this.widgets = JSON.parse(savedLayout);
      } catch (e) {
        console.error('Error al recuperar layout', e);
      }
    }
  }

  onDrop(event: CdkDragDrop<DashboardWidget[]>): void {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    localStorage.setItem('bento_layout_sample', JSON.stringify(this.widgets));
  }

  resetLayout(): void {
    localStorage.removeItem('bento_layout_sample');
    window.location.reload();
  }

  // Modal QR
  openQr(): void {
    this.showQr.set(true);
  }

  closeQr(): void {
    this.showQr.set(false);
  }

  guardarQr(): void {
    // Acá va la llamada al servicio cuando esté listo
    this.closeQr();
  }

  // Escucha el (submitComment) emitido por el app-comment-input
  onNuevoComentario(texto: string, widgetId?: string): void {
    console.log('Nuevo comentario recibido:', texto);

    if (widgetId) {
      console.log(`Comentario enviado al widget ID: ${widgetId}`);
    }

    // this.incidenciasService.agregarComentario(widgetId, texto).subscribe();
  }

  // Escucha el evento (search) emitido por el app-search-bar
  onBuscar(termino: string): void {
    console.log('Término de búsqueda:', termino);
  }
}
