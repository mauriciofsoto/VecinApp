import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePostForm } from './create-post-form';

describe('CreatePostForm', () => {
  let component: CreatePostForm;
  let fixture: ComponentFixture<CreatePostForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePostForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePostForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('role', 'vecino');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
