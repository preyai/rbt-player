import axios from "axios";
import Shaka from 'shaka-player'

/**
 * Класс NoTs представляет базовую модель плеера.
 * @param {Object} camera - Объект, представляющий камеру.
 * @param {HTMLVideoElement} videoElement - HTML элемент видео.
 */
class NoTs {
  constructor(camera, videoElement) {
    if (!camera.token) throw new Error("no token");
    this.camera = camera;
    this.videoElement = videoElement;
  }

  /**
   * Метод для воспроизведения видео.
   */
  play() {
    this.videoElement.play();
  }

  /**
   * Метод для приостановки видео.
   */
  pause() {
    this.videoElement.pause();
  }

  /**
   * Метод для вычисления соотношения сторон видео.
   * @returns {number} - Соотношение сторон видео.
   */
  calculateAspectRatio() {
    this.aspectRatio =
        this.videoElement.videoWidth / this.videoElement.videoHeight ||
        this.aspectRatio;
    console.log(`ar - ${this.aspectRatio}`);
    return this.aspectRatio;
  }

  /**
   * Метод для получения размеров видео.
   * @returns {Object} - Объект с CSS-свойствами для размеров видео.
   */
  getSize() {
    const aspectRatio = this.aspectRatio;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    let newVideoWidth, newVideoHeight;
    if (containerWidth / aspectRatio > containerHeight) {
      newVideoWidth = containerHeight * 0.9 * aspectRatio;
      newVideoHeight = containerHeight * 0.9;
    } else {
      newVideoWidth = containerWidth * 0.9;
      newVideoHeight = (containerWidth * 0.9) / aspectRatio;
    }
    return {
      top: `${(containerHeight - newVideoHeight) / 2}px`,
      left: `${(containerWidth - newVideoWidth) / 2}px`,
      width: `${newVideoWidth}px`,
      height: `${newVideoHeight}px`,
    };
  }

  /**
   * Метод для инициализации видеопотока.
   */
  initializeVideoStream() {
    if (!this.stream) return console.error("Doesn't have stream url");
    const player = this.player || new Shaka.Player();
    player.configure({});
    player.attach(this.videoElement);
    player
        .load(this.stream)
        .then(() => this.videoElement.play())
        .catch((err) => console.error(err));
  }
}

/**
 * Класс FlussonicPlayer наследуется от NoTs для работы с Flussonic сервером.
 */
class FlussonicPlayer extends NoTs {
  constructor(camera, videoElement) {
    super(camera, videoElement);
    this.generatePreview();
    this.generateStream();
  }

  /**
   * Метод для генерации превью видео.
   */
  generatePreview() {
    const { url, token } = this.camera;
    this.preview = `${url}/preview.mp4?token=${token}`;
  }

  /**
   * Метод для генерации потока видео.
   * @param {number} from - Начальный момент времени для потока.
   * @param {number} length - Длина потока.
   */
  generateStream(from, length) {
    const { url, hlsMode, token } = this.camera;
    const time = from && length ? `-${from}-${length}` : "";
    this.stream =
        hlsMode === "fmp4"
            ? `${url}/index${time}.fmp4.m3u8?token=${token}`
            : `${url}/index${time}.m3u8?token=${token}`;
    this.initializeVideoStream();
  }
}

/**
 * Класс ForpostPlayer наследуется от NoTs для работы с Forpost сервером.
 */
class ForpostPlayer extends NoTs {
  /**
   * Метод для форматирования запроса к Forpost серверу.
   * @param {number} from - Начальный момент времени для запроса.
   * @returns {string} - Форматированный URL запроса.
   */
  getForpostFormat(from) {
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
  }

  /**
   * Метод для генерации превью видео.
   */
  generatePreview() {
    const urlBase = new URL(this.getForpostFormat());
    urlBase.searchParams.delete("Format");
    urlBase.searchParams.append("Format", "JPG");
    const postParams = new URLSearchParams(urlBase.searchParams);
    urlBase.search = "";
    const _url = urlBase.href;
    axios.post(_url, postParams.toString()).then((response) => {
      const jsonData = response.data;
      this.preview = jsonData["URL"] || "empty";
    });
  }

  /**
   * Метод для генерации потока видео.
   * @param {number} from - Начальный момент времени для потока.
   */
  generateStream(from) {
    const urlBase = new URL(this.getForpostFormat(from));
    const postParams = new URLSearchParams(urlBase.searchParams);
    urlBase.search = "";
    const _url = urlBase.href;
    axios.post(_url, postParams.toString()).then((response) => {
      const jsonData = response.data;
      this.stream = jsonData["URL"] || "empty";
      this.initializeVideoStream();
    });
  }
}

/**
 * Класс PlayerFactory для создания плееров в зависимости от типа сервера.
 */
class PlayerFactory {
  /**
   * Метод для создания плеера в зависимости от типа сервера.
   * @param {Object} camera - Объект, представляющий камеру.
   * @param {HTMLVideoElement} videoElement - HTML элемент видео.
   * @returns {NoTs} - Экземпляр класса плеера.
   * @throws {Error} - Если тип сервера неизвестен.
   */
  static createPlayer(camera, videoElement) {
    switch (camera.serverType) {
      case "flussonic":
        return new FlussonicPlayer(camera, videoElement);
      case "forpost":
        return new ForpostPlayer(camera, videoElement);
      default:
        throw new Error
    }
  }
}