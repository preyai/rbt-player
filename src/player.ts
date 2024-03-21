/// <reference path="../node_modules/shaka-player/dist/shaka-player.compiled.d.ts" />

// @ts-ignore
import { Player as ShakaPlayer } from "shaka-player";
import axios from "axios";
interface Camera {
    serverType: string;
    hlsMode?: string;
    url: string;
    token: string;
}

interface PlayerParams {
    camera: Camera,
    videoElement: HTMLVideoElement,
    previewElement?: HTMLVideoElement,
    autoplay?: boolean,
    size?:number
}

type StyleValue = Record<string,string >

// Абстрактный класс Player, представляющий базовую модель плеера
abstract class Player {
    readonly camera: Camera; // Камера, с которой работает плеер
    protected videoElement: HTMLVideoElement; // HTML элемент видео
    protected previewElement?: HTMLVideoElement; // HTML элемент превью
    protected autoplay: boolean = false; // автовоспроизведение
    protected stream: string | undefined; // URL потока видео
    protected preview: string | undefined; // URL превью видео
    readonly previewType: "video" | "image" = "video"; // Тип превью
    protected aspectRatio: number = 1.6; // Соотношение сторон видео
    protected size: number = .9; // Соотношение сторон видео
    protected isLoaded: boolean = false; // Флаг загрузки видео
    protected player: ShakaPlayer | undefined; // Инстанс ShakaPlayer для воспроизведения видео

    // Конструктор класса Player
    protected constructor(params: PlayerParams) {
        if (!params.camera.token) throw new Error("no token"); // Проверка наличия токена у камеры
        this.camera = params.camera;
        this.videoElement = params.videoElement;
        this.previewElement = params.previewElement;
        this.autoplay = params.autoplay || false;
        if (params.size && params.size <= 1 && params.size >=0)
            this.size = params.size
    }

    // Метод для воспроизведения видео
    play() {
        this.videoElement.play();
    }

    // Метод для паузы видео
    pause() {
        this.videoElement.pause();
    }

    setPreview(){
        if (!this.preview) {
            return;
        }

        if (this.previewType === "image") {
            this.videoElement.poster = this.preview;
            if (this.previewElement)
                this.previewElement.poster = this.preview;
        } else if (this.previewType === "video" && this.previewElement) {
            this.previewElement.src = this.preview;
        }
    }

    // Абстрактные методы для генерации превью и потока видео
    abstract generatePreview(): void;
    abstract generateStream(from?: number, length?: number): void;

    // Метод для расчета соотношения сторон видео
    calculateAspectRatio(): number {
        this.aspectRatio =
            this.videoElement.videoWidth / this.videoElement.videoHeight ||
            this.aspectRatio;
        console.log(`ar - ${this.aspectRatio}`);
        return this.aspectRatio;
    }

    // Метод для вычисления размеров видео
     getSize(): StyleValue {
        const aspectRatio = this.aspectRatio;
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        let newVideoWidth, newVideoHeight;
        if (containerWidth / aspectRatio > containerHeight) {
            newVideoWidth = containerHeight * this.size * aspectRatio;
            newVideoHeight = containerHeight * this.size;
        } else {
            newVideoWidth = containerWidth * this.size;
            newVideoHeight = (containerWidth * this.size) / aspectRatio;
        }
        return {
            top: `${(containerHeight - newVideoHeight) / 2}px`,
            left: `${(containerWidth - newVideoWidth) / 2}px`,
            width: `${newVideoWidth}px`,
            height: `${newVideoHeight}px`,
        };
    }

    // Метод для инициализации видеопотока
    initializeVideoStream(): void {
        if (!this.stream) return console.error("Doesn't have stream url"); // Проверка наличия URL потока
        if (!ShakaPlayer.isBrowserSupported())
            return console.error("Browser does not support Shaka Player"); // Проверка поддержки Shaka Player
        const player = this.player || new ShakaPlayer(); // Создание нового инстанса ShakaPlayer
        player.configure({
            streaming: {
                retryParameters: {
                    timeout: 30000,
                    stallTimeout: 5000,
                    connectionTimeout: 10000,
                    maxAttempts: 5,
                    baseDelay: 1000,
                    backoffFactor: 2,
                    fuzzFactor: 0.5,
                },
                bufferBehind: 60,
                // Обработчик ошибок потока
                failureCallback: (e: any) => {
                    console.log(`${this.stream} stream fall ${e.code}`); // Вывод сообщения о сбое потока
                    if (e.severity === 2) {
                        // Повторная загрузка видео с задержкой 10 секунд
                        setTimeout(() => this.initializeVideoStream(), 1000 * 10);
                    }
                },
            },
        });
        player.attach(this.videoElement);
        player
            .load(this.stream)
            .then(() => this.autoplay && this.play())
            .catch((err:any) => console.error(err.message));
    }
}

// Класс FlussonicPlayer, наследующийся от Player для работы с Flussonic сервером
class FlussonicPlayer extends Player {
    constructor(params:PlayerParams) {
        super(params);
        this.generatePreview();
        this.generateStream();
    }

    // Метод для генерации превью видео
    generatePreview = (): void => {
        const { url, token } = this.camera;
        this.preview = `${url}/preview.mp4?token=${token}`;
        this.setPreview()
    };

    // Метод для генерации потока видео
    generateStream = (from?: number, length?: number): void => {
        const { url, hlsMode, token } = this.camera;
        const time = from && length ? `-${from}-${length}` : "";
        this.stream =
            hlsMode === "fmp4"
                ? `${url}/index${time}.fmp4.m3u8?token=${token}`
                : `${url}/index${time}.m3u8?token=${token}`;
        this.initializeVideoStream();
    };
}

// Класс ForpostPlayer, наследующийся от Player для работы с Forpost сервером
class ForpostPlayer extends Player {
    readonly previewType = "image";

    constructor(params:PlayerParams) {
        super(params);
        this.generatePreview();
        this.generateStream();
    }

    // Метод для форматирования запроса к Forpost серверу
    getForpostFormat = (from?: number) => {
        const url = this.camera.url;
        const speed = 1;
        const speedStr = speed < 1 ? speed.toFixed(2) : speed.toFixed(0);
        const tz = new Date().getTimezoneOffset() * 60;
        const parameters = from ? `&TS=${from}&TZ=${tz}&Speed=${speedStr}` : "";
        let urlBase = new URL(url + parameters + `&${this.camera.token}`);
        if (!urlBase || !urlBase.searchParams) {
            return "empty";
        }
        return urlBase.toString();
    };

    // Метод для генерации превью видео
    generatePreview = (): void => {
        const urlBase = new URL(this.getForpostFormat());
        urlBase.searchParams.delete("Format");
        urlBase.searchParams.append("Format", "JPG");
        const postParams = new URLSearchParams(urlBase.searchParams);
        urlBase.search = "";
        const _url = urlBase.href;
        axios.post(_url, postParams.toString()).then((response) => {
            const jsonData = response.data;
            this.preview = jsonData["URL"] || "empty";
            this.setPreview()
        });
    };

    // Метод для генерации потока видео
    generateStream = (from?: number): void => {
        const urlBase = new URL(this.getForpostFormat(from));
        const postParams = new URLSearchParams(urlBase.searchParams);
        urlBase.search = "";
        const _url = urlBase.href;
        axios.post(_url, postParams.toString()).then((response) => {
            const jsonData = response.data;
            this.stream = jsonData["URL"] || "empty";
            this.initializeVideoStream();
        });
    };
}

// Фабрика PlayerFactory для создания плееров в зависимости от типа сервера
class PlayerFactory {
    static createPlayer(params:PlayerParams) {
        switch (params.camera.serverType) {
            case "flussonic":
                return new FlussonicPlayer(params);
            case "forpost":
                return new ForpostPlayer(params);
            default:
                throw new Error("Unknown server type");
        }
    }
}

// Экспорт классов FlussonicPlayer, ForpostPlayer, Player и PlayerFactory
export { FlussonicPlayer, ForpostPlayer, Player, PlayerFactory };