
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Post, PostComment } from '../models/post';

import { CreatePostData } from '../components/create-post-form/create-post-form';

@Injectable({
  providedIn: 'root',
})
export class Feed {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly postsState = signal<Post[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly posts = this.postsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  loadPosts(): void {
    this.loadingState.set(true);
    this.errorState.set(null);

    this.http.get<Post[]>(`${this.apiUrl}/publicaciones`).subscribe({
      next: (posts) => {
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

  addComment(postId: number, comment: PostComment): void {
    this.postsState.update((posts) =>
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, comment],
              commentsCount: post.commentsCount + 1,
            }
          : post,
      ),
    );
  }

  removePost(postId: number): void {
    this.postsState.update((posts) =>
      posts.filter((post) => post.id !== postId),
    );
  }


createPost(data: CreatePostData) {
  this.errorState.set(null);

  return this.http.post<Post>(`${this.apiUrl}/publicaciones`, {
    tipo: data.type,
    contenido: data.content,
  });
}

}
