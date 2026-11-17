import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostCard } from './post-card';

describe('PostCard', () => {
  let component: PostCard;
  let fixture: ComponentFixture<PostCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('post', {
      id: 1,
      authorRole: 'vecino',
      type: 'publicacion',
      userId: 'user-1',
      userName: 'Persona',
      content: 'Publicación de prueba',
      createdAt: '2026-11-16T12:00:00Z',
      reactions: [],
      comments: [],
      commentsCount: 0,
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
