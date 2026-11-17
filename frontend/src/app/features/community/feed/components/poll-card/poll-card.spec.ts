import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PollCard } from './poll-card';

describe('PollCard', () => {
  let component: PollCard;
  let fixture: ComponentFixture<PollCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PollCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('encuesta', {
      id: 1,
      idPublicacion: 1,
      titulo: 'Encuesta de prueba',
      descripcion: '',
      opciones: ['A', 'B'],
      votacionActiva: true,
      comentariosActivos: true,
      prioritaria: false,
      fechaLimite: '2026-12-01T00:00:00Z',
      fechaPublicacion: '2026-11-16T12:00:00Z',
      estado: 'en-proceso',
      totalVotos: 0,
      votosPorOpcion: [],
      yaVote: false,
      miOpcionId: null,
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
