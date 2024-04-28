import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { DragDropModule } from 'primeng/dragdrop';
import { fromEvent } from 'rxjs';
import { NgOptimizedImage } from '@angular/common';

const dotSpacing = 20;
const dragHandleSize = 10;

const ITEMS = [
    {
        id: 'factory',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: 'black',
        hasDragHandlers: false
    },
    {
        type: 'line',
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        strokeStyle: 'rgba(255, 255, 255, 0.25)',
        lineWidth: 3
    }
];

@Component({
    selector: 'app-diagram',
    standalone: true,
    imports: [
        DragDropModule,
        NgOptimizedImage
    ],
    templateUrl: './diagram.component.html',
    styleUrl: './diagram.component.sass'
})
export class DiagramComponent implements AfterViewInit {
    @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>
    @ViewChild('production') production!: ElementRef<HTMLCanvasElement>
    draggableItems: any[] = [
        {
            key: 'miner_mk1',
            src: 'assets/images/machines/miner_mk1.png',
            alt: 'Miner Mk.1',
            width: '100',
            height: '100'
        }
    ];
    canvas!: CanvasRenderingContext2D | null;
    itemBeingDragged!: any | null;
    canvasItems: any[] = [];
    currentlyDragging = false;
    isLeftMouseDown = false;
    isDrawingArrow = null;

    ngAfterViewInit() {
        this.production.nativeElement.width = this.canvasWrapper.nativeElement.offsetWidth;
        this.production.nativeElement.height = this.canvasWrapper.nativeElement.offsetHeight;
        this.canvas = this.production.nativeElement.getContext('2d');
        this.drawGridDots();
        fromEvent(this.production.nativeElement, 'click').subscribe((event: any) => {
            this.clearAllDragHandles();
            for (let i = 0 ; i < this.canvasItems.length; i++) {
                if (event.offsetX >= this.canvasItems[i].x && event.offsetX <= this.canvasItems[i].x + this.canvasItems[i].width
                    && event.offsetY >= this.canvasItems[i].y && event.offsetY <= this.canvasItems[i].y + this.canvasItems[i].height) {
                    if (this.isDrawingArrow) {
                        const [fromX, fromY] = this.getLineFromStartPoint(this.isDrawingArrow);
                        const [toX, toY] = this.getLineToEndPoint(this.canvasItems[i]);
                        const lineToAdd: any = {...ITEMS.find(item => item.type === 'line')};
                        lineToAdd.fromX = fromX;
                        lineToAdd.fromY = fromY;
                        lineToAdd.toX = toX;
                        lineToAdd.toY = toY;
                        this.canvasItems.push(lineToAdd);
                    } else {
                        this.canvasItems[i].hasDragHandlers = true;
                    }
                    break;
                }
            }
            this.isDrawingArrow = null;
            this.drawItems();
        });

        fromEvent(this.production.nativeElement, 'mousemove').subscribe((event: any) => {
            for (let i = 0 ; i < this.canvasItems.length; i++) {
                if (this.canvasItems[i].hasDragHandlers) {
                    const tl = this.canvasItems[i].x + (this.canvasItems[i].width / 2) - (dragHandleSize / 2);
                    const tr = this.canvasItems[i].x + (this.canvasItems[i].width / 2) + (dragHandleSize / 2);
                    const bl = this.canvasItems[i].y + (this.canvasItems[i].height / 2) - (dragHandleSize / 2);
                    const br = this.canvasItems[i].y + (this.canvasItems[i].height / 2) + (dragHandleSize / 2);
                    if ((event.offsetX >= tl && event.offsetX <= tr && event.offsetY >= bl && event.offsetY <= br) || this.currentlyDragging) {
                        document.body.style.cursor = 'move';
                        if (this.currentlyDragging) {
                            this.setCoordinates(this.canvasItems[i], event.offsetX - (this.canvasItems[i].width / 2), event.offsetY - (this.canvasItems[i].height / 2));
                            this.drawItems();
                        }
                        break;

                    } else {
                        document.body.style.cursor = 'default';
                    }
                } else {
                    if (this.isDrawingArrow) {
                        this.drawArrow(this.isDrawingArrow, event.offsetX, event.offsetY);
                        break;
                    }

                    if (event.offsetX >= this.canvasItems[i].x && event.offsetX <= this.canvasItems[i].x + this.canvasItems[i].width
                        && event.offsetY >= this.canvasItems[i].y && event.offsetY <= this.canvasItems[i].y + this.canvasItems[i].height) {
                        if (this.isLeftMouseDown) {
                            this.isDrawingArrow = this.canvasItems[i];
                        }
                        document.body.style.cursor = 'pointer';
                        break;
                    } else {
                        document.body.style.cursor = 'default';

                    }
                }
            }
        });

        fromEvent(this.production.nativeElement, 'mousedown').subscribe((event: any) => {
            this.isLeftMouseDown = true;
            for (let i = 0 ; i < this.canvasItems.length; i++) {
                if (this.canvasItems[i].hasDragHandlers) {
                    const tl = this.canvasItems[i].x + (this.canvasItems[i].width / 2) - (dragHandleSize / 2);
                    const tr = this.canvasItems[i].x + (this.canvasItems[i].width / 2) + (dragHandleSize / 2);
                    const bl = this.canvasItems[i].y + (this.canvasItems[i].height / 2) - (dragHandleSize / 2);
                    const br = this.canvasItems[i].y + (this.canvasItems[i].height / 2) + (dragHandleSize / 2);
                    if (event.offsetX >= tl && event.offsetX <= tr && event.offsetY >= bl && event.offsetY <= br) {
                        this.currentlyDragging = true;
                    }
                }
            }
        });

        fromEvent(this.production.nativeElement, 'mouseup').subscribe((event: any) => {
            this.currentlyDragging = false;
            this.isLeftMouseDown = false;
        });
    }

    dropHandler(event: DragEvent) {
        console.log(event);
        const id = (this.itemBeingDragged.target as HTMLDivElement)!.id;
        const itemToAdd = {...ITEMS.find(item => item.id === id)};

        this.setCoordinates(itemToAdd, event.offsetX - this.itemBeingDragged.offsetX, event.offsetY - this.itemBeingDragged.offsetY)
        this.canvasItems.push(itemToAdd);
        this.drawItems();
    }

    dragStartHandler(event: DragEvent) {
        this.itemBeingDragged = event;
    }

    dragEndHandler(event: DragEvent) {
        this.itemBeingDragged = null;
    }

    private setCoordinates(item: any, x: number, y: number) {
        item.x = x;
        item.y = y;
    }

    private drawArrow(item: any, toX: number, toY: number) {
        this.drawItems();
        const [x, y] = this.getLineFromStartPoint(item);
        this.canvas!.beginPath();
        this.canvas!.moveTo(x, y);
        this.canvas!.lineTo(toX, toY);
        this.canvas!.stroke();
    }

    private getLineFromStartPoint(item: any): [number, number] {
        const itemX = item.x + item.width;
        const itemY = item.y + (item.height / 2);
        return [itemX, itemY];

    }

    private getLineToEndPoint(item: any): [number, number] {
        const itemX = item.x;
        const itemY = item.y + (item.height / 2);
        return [itemX, itemY];
    }

    private addDragHandlers(item: any) {
        this.canvas!.strokeStyle = 'white';
        this.canvas!.strokeRect(
            item.x + (item.width / 2) - (dragHandleSize / 2),
            item.y + (item.height / 2) - (dragHandleSize / 2),
            dragHandleSize,
            dragHandleSize
        );
    }

    private drawItems() {
        this.clearCanvas();
        this.drawGridDots();
        this.canvasItems.forEach(item => {
            switch (item.type) {
                case 'rect':
                    this.canvas!.fillStyle = item.fill;
                    this.canvas!.fillRect(item.x, item.y, item.width, item.height);
                    this.canvas!.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    this.canvas!.lineWidth = 1;
                    this.canvas!.strokeRect(item.x - 1, item.y - 1, item.width + 2, item.height + 2);
                    if (item.hasDragHandlers) {
                        this.addDragHandlers(item);
                    }
                    break;
                case 'line':
                    this.canvas!.beginPath();
                    this.canvas!.moveTo(item.fromX, item.fromY);
                    this.canvas!.lineTo(item.toX, item.toY);
                    this.canvas!.lineWidth = item.lineWidth;
                    this.canvas!.strokeStyle = item.strokeStyle;
                    this.canvas!.stroke();
            }

        });
    }

    private clearAllDragHandles() {
        this.canvasItems.forEach(item => item.hasDragHandlers = false);
    }

    private drawGridDots() {
        const canvasWidth = this.production.nativeElement.width;
        const canvasHeight = this.production.nativeElement.height;
        let x = dotSpacing;
        let y = dotSpacing;
        if (this.canvas) {
            this.canvas.fillStyle = 'rgba(255, 255, 255, 0.15)';
            while (y < canvasHeight) {
                while (x < canvasWidth) {
                    this.canvas.fillRect(x, y, 2, 2)
                    x += dotSpacing;
                }
                x = dotSpacing;
                y += dotSpacing;
            }
        }
    }

    private clearCanvas() {
        this.canvas!.clearRect(0, 0, this.production.nativeElement.width, this.production.nativeElement.height);
    }
}
