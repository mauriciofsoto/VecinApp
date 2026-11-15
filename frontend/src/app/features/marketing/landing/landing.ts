import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly menuOpen = signal(false);
  readonly formSent = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.closeMenu();
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  playFeatureVideo(video: HTMLVideoElement): void {
    video.muted = true;
    video.play().catch(() => {
      // Evita errores en consola si el navegador bloquea la reproducción antes de interactuar
    });
  }

  pauseFeatureVideo(video: HTMLVideoElement): void {
    video.pause();
    video.currentTime = 0;
  }

  submitContact(event: Event): void {
    event.preventDefault();
    this.formSent.set(true);
  }

  @HostListener('document:keydown.escape')
  closeMenuWithEscape(): void {
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  closeMenuOutside(event: MouseEvent): void {
    const target = event.target as Node;
    const menu = this.host.nativeElement.querySelector('.site-nav');
    const toggle = this.host.nativeElement.querySelector('.menu-toggle');
    if (!menu?.contains(target) && !toggle?.contains(target)) {
      this.closeMenu();
    }
  }
}