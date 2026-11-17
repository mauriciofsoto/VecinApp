
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Post, PostComment, PostReaction } from '../models/post';
import { AuthService } from '../../../../core/services/auth';
import { EMPTY, Observable, catchError, finalize, tap, throwError } from 'rxjs';

import { CreatePostData } from '../components/create-post-form/create-post-form';
type CreatePostPayload = Omit<CreatePostData, 'attachments'>;

@Injectable({
  providedIn: 'root',
})
export class Feed {
  
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly postsState = signal<Post[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly postsOwner = signal<{ userId: string; version: number } | null>(null);
  readonly posts = computed(() => this.ownsCurrentPosts() ? this.postsState() : []);
  readonly loading = computed(() => this.ownsCurrentPosts() && this.loadingState());
  readonly error = computed(() => this.ownsCurrentPosts() ? this.errorState() : null);
  private readonly activeReactions = new Map<string, number>();

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      const version = this.auth.sessionVersion();
      void version;
      const session = this.auth.captureSession();
      this.postsOwner.set(session.userId ? { userId: session.userId, version: session.version } : null);
      this.postsState.set([]);
      this.loadingState.set(false);
      this.errorState.set(null);
      this.activeReactions.clear();
      if (userId) this.loadPosts();
    });
  }

  loadPosts(): void {
    const session = this.auth.captureSession();
    if (!session.userId) {
      this.postsState.set([]);
      this.loadingState.set(false);
      return;
    }
    this.postsOwner.set({ userId: session.userId, version: session.version });
    this.loadingState.set(true);
    this.errorState.set(null);

    this.http.get<Post[]>(`${this.apiUrl}/publicaciones`).subscribe({
      next: (posts) => {
        if (!this.auth.isCurrentSession(session)) return;
        this.postsState.set(
          posts.map((post) => ({
            ...post,
            reactions: post.reactions ?? [],
            comments: post.comments ?? [],
            commentsCount: post.commentsCount ?? 0,
          })),
        );

        this.loadingState.set(false);
      },
      error: (error) => {
        if (!this.auth.isCurrentSession(session)) return;
        console.error('Error al cargar publicaciones:', error);
        this.errorState.set('No se pudieron cargar las publicaciones.');
        this.loadingState.set(false);
      },
    });
  }

  setPosts(posts: Post[]): void {
    this.postsState.set(posts);
  }

  addPost(post: Post): void {
    this.postsState.update((posts) => [post, ...posts]);
  }

  updatePost(updatedPost: Post): void {
    this.postsState.update((posts) =>
      posts.map((post) =>
        post.id === updatedPost.id ? updatedPost : post,
      ),
    );
  }

  addComment(postId: number, content: string): Observable<PostComment> {
    const session = this.auth.captureSession();
    if (!session.userId) return throwError(() => new Error('Iniciá sesión para comentar.'));
    return this.http.post<PostComment>(`${this.apiUrl}/publicaciones/${postId}/comentarios`, { contenido: content }).pipe(
      tap(comment => {
        if (!this.auth.isCurrentSession(session)) return;
        this.postsState.update(posts => posts.map(post => post.id === postId
          ? { ...post, comments: [...post.comments, comment], commentsCount: post.commentsCount + 1 }
          : post));
      }),
    );
  }

  toggleReaction(postId: number, emoji: string): Observable<PostReaction[]> {
    const session = this.auth.captureSession();
    const key = `${postId}:${emoji}`;
    if (!session.userId || this.activeReactions.has(key)) return EMPTY;
    this.activeReactions.set(key, session.version);
    return this.http.post<PostReaction[]>(`${this.apiUrl}/publicaciones/${postId}/reacciones`, { emoji }).pipe(
      tap(reactions => {
        if (!this.auth.isCurrentSession(session)) return;
        this.postsState.update(posts => posts.map(post => post.id === postId ? { ...post, reactions } : post));
      }),
      catchError(error => {
        if (this.auth.isCurrentSession(session)) this.loadPosts();
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.activeReactions.get(key) === session.version) this.activeReactions.delete(key);
      }),
    );
  }

  removePost(postId: number): void {
    this.postsState.update((posts) =>
      posts.filter((post) => post.id !== postId),
    );
  }


createPost(data: CreatePostPayload) {
  this.errorState.set(null);
  const content = data.content.trim();

  return this.http.post<Post>(`${this.apiUrl}/publicaciones`, {
    tipo: data.type,
    titulo: content.split(/\r?\n/, 1)[0],
    contenido: content,
  });
}

createAdministrativePublication(data: {
  titulo: string;
  tipo: 'aviso';
  contenido: string;
  prioritaria: boolean;
  comentariosActivos: boolean;
  fechaLimite?: string;
}) {
  this.errorState.set(null);
  return this.http.post<Post>(`${this.apiUrl}/publicaciones`, {
    titulo: data.titulo,
    tipo: data.tipo,
    contenido: data.contenido,
    prioritaria: data.prioritaria,
    comentariosActivos: data.comentariosActivos,
    fechaLimite: data.fechaLimite,
  });
}

private ownsCurrentPosts(): boolean {
  const owner = this.postsOwner();
  const current = this.auth.captureSession();
  return !!owner && owner.userId === current.userId;
}

}
