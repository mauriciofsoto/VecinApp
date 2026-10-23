import { AuthorRole, Post } from '../../models/post';
import { Component, inject, signal } from '@angular/core';
import { Feed } from '../../services/feed';
import { PostCard } from '../../components/post-card/post-card';
import {
  CreatePostForm,
  CreatePostData,
} from '../../components/create-post-form/create-post-form';

@Component({
  selector: 'app-feed-principal',
  imports: [PostCard, CreatePostForm],
  templateUrl: './feed-principal.html',
  styleUrl: './feed-principal.scss',
})
export class FeedPrincipal {

  constructor() {
  this.feedService.loadPosts();
}


  protected readonly feedService = inject(Feed);
  protected readonly isCreatePostOpen = signal(false);

  readonly posts = this.feedService.posts;
  protected readonly userRole: AuthorRole = 'admin';


protected createPost(data: CreatePostData): void {
  this.feedService.createPost(data).subscribe({
    next: post => {
      this.feedService.addPost({
        ...post,
        reactions: post.reactions ?? [],
        comments: post.comments ?? [],
        commentsCount: post.commentsCount ?? 0,
      });

      this.closeCreatePost();
    },
    error: error => {
      console.error('Error al crear la publicación:', error);
    },
  });
}


  protected updatePost(
    post: Parameters<Feed['updatePost']>[0],
  ): void {
    this.feedService.updatePost(post);
  }

  protected addComment(event: {
    postId: number;
    content: string;
  }): void {
    this.feedService.addComment(event.postId, {
      id: Date.now(),
      userName: 'Vos',
      content: event.content,
      createdAt: new Date().toISOString(),
    });
  }

  protected openCreatePost(): void {
  this.isCreatePostOpen.set(true);
  }

  protected closeCreatePost(): void {
    this.isCreatePostOpen.set(false);
  }

}
