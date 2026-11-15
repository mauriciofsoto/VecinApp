import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Landing } from './landing';

describe('Landing responsive navigation', () => {
  let fixture: ComponentFixture<Landing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
  });

  it('opens from the toggle and closes on outside click or Escape', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-toggle');
    const menu: HTMLElement = fixture.nativeElement.querySelector('.site-nav');

    toggle.click();
    fixture.detectChanges();
    expect(menu.classList.contains('site-nav--open')).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(menu.classList.contains('site-nav--open')).toBe(false);

    toggle.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(menu.classList.contains('site-nav--open')).toBe(false);
  });
});
