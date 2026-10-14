import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {

  isOpen = false;

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

}
