import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Paquete } from '../../models/paquete';
import { Paqueteria } from '../../services/paqueteria';
import { Inquilinos } from '../../../inquilinos/services/inquilinos';

import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/components/atoms/select/select';

import { ChatPaquete } from '../../components/chat-paquete/chat-paquete';

@Component({
  selector: 'app-recepcion-paquetes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    SelectComponent,
    ChatPaquete,
  ],
  templateUrl: './recepcion-paquetes.html',
  styleUrl: './recepcion-paquetes.scss',
})
export class RecepcionPaquetes {
  readonly paqueteria = inject(Paqueteria);
  private readonly servicioInquilinos = inject(Inquilinos);

  destinatarioId: number | null = null;
  descripcion = '';
  remitente = '';

  readonly mensaje = signal('');
  readonly paqueteSeleccionado = signal<Paquete | null>(null);

  readonly inquilinosActivos = computed(() =>
    this.servicioInquilinos.inquilinos().filter(
      inquilino => inquilino.estado === 'activo',
    ),
  );

  readonly opcionesDestinatario = computed<SelectOption<number>[]>(() =>
    this.inquilinosActivos().map(inquilino => ({
      value: inquilino.id,
      label: `${inquilino.nombre} ${inquilino.apellido} · Unidad ${inquilino.unidad} · ${inquilino.edificioNombre}`,
    })),
  );

  seleccionarPaquete(paquete: Paquete): void {
    this.paqueteSeleccionado.set(paquete);
  }

  registrar(): void {
    const destinatario = this.inquilinosActivos().find(
      inquilino => inquilino.id === Number(this.destinatarioId),
    );

    if (!destinatario || !this.descripcion.trim() || !this.remitente.trim()) {
      this.mensaje.set('Completá todos los datos del paquete.');
      return;
    }

    const paquete = this.paqueteria.registrar({
      destinatarioId: destinatario.id,
      destinatarioNombre: `${destinatario.nombre} ${destinatario.apellido}`,
      edificioId: destinatario.edificioId,
      edificioNombre: destinatario.edificioNombre,
      unidad: destinatario.unidad,
      descripcion: this.descripcion.trim(),
      remitente: this.remitente.trim(),
    });

    this.paqueteSeleccionado.set(paquete);

    this.destinatarioId = null;
    this.descripcion = '';
    this.remitente = '';

    this.mensaje.set('Paquete registrado correctamente.');
  }
}