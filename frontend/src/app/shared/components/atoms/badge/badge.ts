import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Input } from '@angular/core';

// Mapeo completo de variantes de estado y categoría para VecinApp
export type BadgeVariant = 
  | 'success'  // Al día, Resuelto, Entregado
  | 'warning'  // En proceso, Por vencer, Pendiente
  | 'danger'   // Impaga, Urgente, Reclamo
  | 'info'     // En portería, Comunicados, Novedades
  | 'accent'   // Roles de usuario, Destacados (Cyan/Primary)
  | 'purple'   // Mantenimiento, Espacios Comunes, Reservas
  | 'neutral'; // Archivado, Leído, Secundario

export type BadgeSize = 'sm' | 'md' | 'lg';
@Component({
  selector: 'app-badge',
  imports: [CommonModule],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  /** Variante visual según el estado */
  @Input() variant: BadgeVariant = 'neutral';
  
  /** Tamaño del badge */
  @Input() size: BadgeSize = 'md';

}
