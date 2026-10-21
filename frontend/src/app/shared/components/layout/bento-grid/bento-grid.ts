import {
  AfterContentInit,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  QueryList,
  signal,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';

import { BentoItemDirective } from './bento-item.directive';

export interface BentoWidget {
  id: string;
  title: string;
  variant: 'glass' | 'solid';
  cols: 1 | 2 | 3 | 4;
  rows?: number;
  visible?: boolean;
}

type ResizeDirection =
  | 'right'
  | 'left'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'corner';

interface ResizeHandle {
  direction: ResizeDirection;
  className: string;
}

interface GridMetrics {
  columns: number;
  columnStep: number;
  rowStep: number;
}

@Component({
  selector: 'app-bento-grid',
  standalone: true,
  imports: [
    CommonModule,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
  ],
  templateUrl: './bento-grid.html',
  styleUrl: './bento-grid.scss',
})
export class BentoGridComponent implements AfterContentInit, OnDestroy {
  // API pública
  readonly widgets = input<BentoWidget[]>([]);
  readonly layoutChange = output<BentoWidget[]>();

  // Configuración interna de los controles de resize
  readonly resizeHandles: ResizeHandle[] = [
    { direction: 'top', className: 'resize-handle--top' },
    { direction: 'right', className: 'resize-handle--right' },
    { direction: 'bottom', className: 'resize-handle--bottom' },
    { direction: 'left', className: 'resize-handle--left' },
    { direction: 'top-left', className: 'resize-handle--top-left' },
    { direction: 'top-right', className: 'resize-handle--top-right' },
    { direction: 'bottom-left', className: 'resize-handle--bottom-left' },
    { direction: 'corner', className: 'resize-handle--corner' },
  ];

  // Estado y dependencias
  private readonly currentWidgets = signal<BentoWidget[]>([]);
  private readonly destroy$ = new Subject<void>();
  private readonly cdr = inject(ChangeDetectorRef);

  @ContentChildren(BentoItemDirective)
  private items!: QueryList<BentoItemDirective>;

  private readonly templatesMap = new Map<
    string,
    TemplateRef<unknown>
  >();

  // Estado temporal del redimensionamiento
  private resizingWidgetId: string | null = null;
  private resizeDirection: ResizeDirection | null = null;
  private resizeGrid: HTMLElement | null = null;

  private startX = 0;
  private startY = 0;
  private startCols: BentoWidget['cols'] = 1;
  private startRows = 1;

  private removePointerListeners: (() => void) | null = null;

  constructor() {
    effect(() => {
      this.currentWidgets.set(this.widgets());
    });
  }

  // Ciclo de vida
  ngAfterContentInit(): void {
    this.updateTemplatesMap();

    this.items.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTemplatesMap();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.stopResize();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Widgets y plantillas
  visibleWidgets(): BentoWidget[] {
    return this.currentWidgets().filter(
      (widget) => widget.visible !== false,
    );
  }

  getTemplate(id: string): TemplateRef<unknown> | undefined {
    return this.templatesMap.get(id);
  }

  private updateTemplatesMap(): void {
    this.templatesMap.clear();

    this.items.forEach((item) => {
      this.templatesMap.set(item.bentoItem(), item.templateRef);
    });
  }

  // Drag & drop
  onDrop(event: CdkDragDrop<BentoWidget[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const updatedWidgets = [...this.currentWidgets()];
    const visibleWidgets = updatedWidgets.filter(
      (widget) => widget.visible !== false,
    );

    moveItemInArray(
      visibleWidgets,
      event.previousIndex,
      event.currentIndex,
    );

    let visibleIndex = 0;

    const reorderedWidgets = updatedWidgets.map((widget) =>
      widget.visible === false
        ? widget
        : visibleWidgets[visibleIndex++],
    );

    this.updateLayout(reorderedWidgets);
  }

  // Inicio del resize
  initResize(
    widget: BentoWidget,
    event: PointerEvent,
    direction: ResizeDirection,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    this.stopResize();

    const handle = event.currentTarget;

    if (!(handle instanceof HTMLElement)) {
      return;
    }

    const grid = handle.closest<HTMLElement>('.bento-grid');

    if (!grid) {
      return;
    }

    this.resizingWidgetId = widget.id;
    this.resizeDirection = direction;
    this.resizeGrid = grid;

    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startCols = widget.cols;
    this.startRows = widget.rows ?? 1;

    this.addPointerListeners();
  }

  private addPointerListeners(): void {
    const onPointerMove = (event: PointerEvent): void => {
      this.onResizing(event);
    };

    const onPointerUp = (): void => {
      this.stopResize();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    this.removePointerListeners = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }

  // Cálculo de tamaño
  private onResizing(event: PointerEvent): void {
    const widgetId = this.resizingWidgetId;
    const direction = this.resizeDirection;
    const grid = this.resizeGrid;

    if (!widgetId || !direction || !grid) {
      return;
    }

    const metrics = this.getGridMetrics(grid);

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    const horizontalDelta = this.invertsHorizontal(direction)
      ? -deltaX
      : deltaX;

    const verticalDelta = this.invertsVertical(direction)
      ? -deltaY
      : deltaY;

    const cols = this.changesWidth(direction)
  ? this.clamp(
      this.startCols +
        Math.trunc(horizontalDelta / metrics.columnStep),
      1,
      Math.min(4, metrics.columns),
    ) as BentoWidget['cols']
  : this.startCols;

const rows = this.changesHeight(direction)
  ? this.clamp(
      this.startRows +
        Math.trunc(verticalDelta / metrics.rowStep),
      1,
      3,
    )
  : this.startRows;

    const currentWidget = this.currentWidgets().find(
      (item) => item.id === widgetId,
    );

    if (
      !currentWidget ||
      (currentWidget.cols === cols &&
        (currentWidget.rows ?? 1) === rows)
    ) {
      return;
    }

    const updatedWidgets = this.currentWidgets().map((item) =>
      item.id === widgetId
        ? { ...item, cols, rows }
        : item,
    );

    this.updateLayout(updatedWidgets);
  }

  private getGridMetrics(grid: HTMLElement): GridMetrics {
    const styles = getComputedStyle(grid);

    const columns = styles.gridTemplateColumns
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    const columnGap = parseFloat(styles.columnGap) || 0;
    const rowGap = parseFloat(styles.rowGap) || 0;

    // grid-auto-rows usa minmax(180px, auto).
    // El tamaño mínimo de referencia es de 180px.
    const rowHeight = parseFloat(styles.gridAutoRows) || 180;

    const safeColumns = Math.max(columns, 1);
    const availableWidth =
      grid.clientWidth - columnGap * (safeColumns - 1);

    const columnWidth = availableWidth / safeColumns;

    return {
      columns: safeColumns,
      columnStep: Math.max(1, columnWidth + columnGap),
      rowStep: rowHeight + rowGap,
    };
  }

  // Dirección de resize
  private changesWidth(direction: ResizeDirection): boolean {
    return [
      'right',
      'left',
      'top-left',
      'top-right',
      'bottom-left',
      'corner',
    ].includes(direction);
  }

  private changesHeight(direction: ResizeDirection): boolean {
    return [
      'top',
      'bottom',
      'top-left',
      'top-right',
      'bottom-left',
      'corner',
    ].includes(direction);
  }

  private invertsHorizontal(direction: ResizeDirection): boolean {
    return ['left', 'top-left', 'bottom-left'].includes(direction);
  }

  private invertsVertical(direction: ResizeDirection): boolean {
    return ['top', 'top-left', 'top-right'].includes(direction);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // Actualización del layout y limpieza
  private updateLayout(widgets: BentoWidget[]): void {
    this.currentWidgets.set(widgets);
    this.layoutChange.emit(widgets);
  }

  private stopResize(): void {
    this.removePointerListeners?.();
    this.removePointerListeners = null;

    this.resizingWidgetId = null;
    this.resizeDirection = null;
    this.resizeGrid = null;
  }
}