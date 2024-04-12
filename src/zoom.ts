type StyleValue = {
    transformOrigin: string;
    transform: string;
};

class ZoomController {
    readonly videoElement: HTMLVideoElement | null;
    private scale: number;
    private offsetX: number;
    private offsetY: number;
    private dragX: number;
    private dragY: number;
    public isDragging: boolean;

    constructor(videoElement: HTMLVideoElement | null) {
        this.videoElement = videoElement;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.dragX = 0;
        this.dragY = 0;
        this.isDragging = false;
        this.setupEvents();
    }

    private getVideoStyles(): StyleValue {
        return {
            transformOrigin: `${this.offsetX}% ${this.offsetY}%`,
            transform: `scale(${this.scale})`,
        };
    }

    private handleScroll = (event: WheelEvent) => {
        if (!this.videoElement) return;

        const STEP = 0.2;
        const delta = Math.max(-1, Math.min(1, event.deltaY));

        if (this.scale < 2) {
            const rect = this.videoElement.getBoundingClientRect();
            this.offsetX = ((event.clientX - rect.left) / rect.width) * 100;
            this.offsetY = ((event.clientY - rect.top) / rect.height) * 100;
        }

        if (delta < 0 && this.scale < 10) {
            this.scale += STEP;
        } else if (delta > 0 && this.scale > 1) {
            this.scale -= STEP;
        }

        this.applyStyles();
    };

    private startDrag = (event: MouseEvent) => {
        event.preventDefault();
        this.dragX = event.clientX;
        this.dragY = event.clientY;
        document.addEventListener("mousemove", this.drag);
        document.addEventListener("mouseup", this.stopDrag);
    };

    private stopDrag = (event: MouseEvent) => {
        event.preventDefault();
        setTimeout(() => {
            this.isDragging = false;
        }, 500);
        document.removeEventListener("mousemove", this.drag);
        document.removeEventListener("mouseup", this.stopDrag);
    };

    private drag = (event: MouseEvent) => {
        event.preventDefault();
        this.isDragging = true;
        if (!this.videoElement) return;

        const deltaX = event.clientX - this.dragX;
        const deltaY = event.clientY - this.dragY;

        let _offsetX = this.offsetX - (deltaX / this.videoElement.offsetWidth) * 100 / this.scale;
        let _offsetY = this.offsetY - (deltaY / this.videoElement.offsetHeight) * 100 / this.scale;

        _offsetX = Math.max(0, Math.min(100, _offsetX));
        _offsetY = Math.max(0, Math.min(100, _offsetY));

        this.offsetX = _offsetX;
        this.offsetY = _offsetY;

        this.dragX = event.clientX;
        this.dragY = event.clientY;

        this.applyStyles();
    };

    private applyStyles() {
        if (this.videoElement) {
            const styles = this.getVideoStyles();
            this.videoElement.style.transformOrigin = styles.transformOrigin;
            this.videoElement.style.transform = styles.transform;
        }
    }

    private setupEvents() {
        if (this.videoElement) {
            this.videoElement.addEventListener("wheel", this.handleScroll);
            this.videoElement.addEventListener("mousedown", this.startDrag);
        }
    }

    public cleanup() {
        if (this.videoElement) {
            this.videoElement.removeEventListener("wheel", this.handleScroll);
            this.videoElement.removeEventListener("mousedown", this.startDrag);
        }
    }
}

export {ZoomController};
