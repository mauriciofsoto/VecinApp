import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Feed } from './feed';
import { AuthService } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user';
import { Post } from '../models/post';
import { environment } from '../../../../../environments/environment';

describe('Feed', () => {
  let service: Feed;
  let http: HttpTestingController;
  const currentUser = signal<User | null>(null);
  const sessionVersion = signal(0);
  const authFake = {
    currentUser,
    sessionVersion,
    captureSession: () => ({ userId: currentUser()?.id ?? null, version: sessionVersion() }),
    isCurrentSession: (session: { userId: string | null; version: number }) =>
      session.userId !== null && session.userId === (currentUser()?.id ?? null) && session.version === sessionVersion(),
  };
  const basePost: Post = {
    id: 3, authorRole: 'vecino', type: 'publicacion', userId: 'user-a', userName: 'A',
    title: 'Aviso de vecino', content: 'Contenido', createdAt: '2026-11-16T12:00:00Z',
    reactions: [], comments: [], commentsCount: 0,
  };

  beforeEach(() => {
    currentUser.set({ id: 'user-a', nombre: 'A', apellido: 'Prueba', email: 'a@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false });
    sessionVersion.set(0);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: authFake },
    ] });
    service = TestBed.inject(Feed);
    http = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
  });

  afterEach(() => http.verify());

  it('carga las publicaciones desde la sesión actual', () => {
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([basePost]);
    expect(service.posts()).toEqual([{ ...basePost, comments: [], reactions: [], commentsCount: 0 }]);
  });

  it('persiste el comentario y solo agrega la respuesta real del servidor', () => {
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([basePost]);
    service.addComment(3, 'Comentario real').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/publicaciones/3/comentarios`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ contenido: 'Comentario real' });
    request.flush({ id: 14, userName: 'Ana Vecina', content: 'Comentario real', createdAt: '2026-11-16T12:10:00Z', isMine: true });

    expect(service.posts()[0].comments).toEqual([
      { id: 14, userName: 'Ana Vecina', content: 'Comentario real', createdAt: '2026-11-16T12:10:00Z', isMine: true },
    ]);
  });

  it('persiste la reacción y aplica el agregado y la marca personal devueltos por API', () => {
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([basePost]);
    service.toggleReaction(3, '👍').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/publicaciones/3/reacciones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ emoji: '👍' });
    request.flush([{ emoji: '👍', count: 2, reacted: true }]);

    expect(service.posts()[0].reactions).toEqual([{ emoji: '👍', count: 2, reacted: true }]);
  });

  it('evita dos solicitudes simultáneas para la misma reacción y recarga al fallar', () => {
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([basePost]);
    let fallo = false;
    service.toggleReaction(3, '👍').subscribe({ error: () => fallo = true });
    service.toggleReaction(3, '👍').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/publicaciones/3/reacciones`);
    request.flush('conflict', { status: 409, statusText: 'Conflict' });
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([basePost]);

    expect(fallo).toBe(true);
    expect(service.posts()[0].reactions).toEqual([]);
  });

  it('oculta los datos previos inmediatamente y descarta una respuesta tardía de otra sesión', () => {
    const oldRequest = http.expectOne(`${environment.apiUrl}/publicaciones`);
    currentUser.set({ id: 'user-b', nombre: 'B', apellido: 'Prueba', email: 'b@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false });
    sessionVersion.set(1);
    expect(service.posts()).toEqual([]);
    TestBed.flushEffects();
    const newRequest = http.expectOne(`${environment.apiUrl}/publicaciones`);
    newRequest.flush([{ ...basePost, id: 4, userId: 'user-b', userName: 'B' }]);
    expect(service.posts().map(post => post.id)).toEqual([4]);
    oldRequest.flush([basePost]);

    expect(service.posts().map(post => post.id)).toEqual([4]);
  });

  it('se crea', () => {
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([]);
    expect(service).toBeTruthy();
  });
});
