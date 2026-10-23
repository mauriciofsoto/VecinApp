import { Injectable, computed, signal } from '@angular/core';
import { Paquete } from '../models/paquete';

export interface CrearPaquete {
  destinatarioId: number;
  destinatarioNombre: string;
  edificioId: number;
  edificioNombre: string;
  descripcion: string;
  remitente: string;
}

@Injectable({ providedIn: 'root' })
export class Paqueteria {
  private readonly estado = signal<Paquete[]>([
    {
      id: 1,
      destinatarioId: 1,
      destinatarioNombre: 'Residente de prueba',
      edificioId: 1,
      edificioNombre: 'Edificio A',
      descripcion: 'Caja mediana',
      remitente: 'Correo',
      fechaRecepcion: new Date().toISOString(),
      estado: 'pendiente',
    },
  ]);

  readonly paquetes = this.estado.asReadonly();

  readonly pendientes = computed(() =>
    this.estado().filter(p => p.estado === 'pendiente'),
  );

  readonly entregados = computed(() =>
    this.estado().filter(p => p.estado === 'entregado'),
  );

  registrar(datos: CrearPaquete): void {
    const paquete: Paquete = {
      ...datos,
      id: Date.now(),
      fechaRecepcion: new Date().toISOString(),
      estado: 'pendiente',
    };

    this.estado.update(lista => [paquete, ...lista]);
  }

  entregar(id: number): void {
    this.estado.update(lista =>
      lista.map(paquete =>
        paquete.id === id
          ? {
              ...paquete,
              estado: 'entregado',
              fechaEntrega: new Date().toISOString(),
            }
          : paquete,
      ),
    );
  }

  paquetesDeResidente(residenteId: number): Paquete[] {
    return this.estado().filter(
      paquete => paquete.destinatarioId === residenteId,
    );
  }
}