# rbt-player

rbt-player - JavaScript библиотека для воспроизведения видео из rbt.

## Содержание
- [Установка](#установка)
- [Использование](#использование)
- [Возможности](#возможности)
- [Разработка](#разработка)
- [Лицензия](#лицензия)

## Установка
Чтобы установить rbt-player с помощью npm, выполните следующую команду:

```bash
npm install rbt-player
```

Вы также можете установить rbt-player с помощью yarn:

```bash
yarn add rbt-player
```

## Использование
Пример создания проигрывателя:

```javascript
const { PlayerFactory } = require('rbt-player');

const camera = {
  serverType: 'flussonic',
  hlsMode: 'fmp4',
  url: 'https://your-flussonic-server.com/your-stream-name',
  token: 'your-token-here',
};

const videoElement = document.getElementById('video-element');

PlayerFactory.createPlayer({
  camera,
  videoElement: videoElement?.value,
  autoplay: true,
});
```

## Возможности
- Автоматическое создание URL-адресов проигрывателя видео и предварительного просмотра
- Настраиваемый видео формат и размер
- Поддержка сервера Flussonic
- Поддержка сервера Forpost

## Разработка
Чтобы начать разработку rbt-player, выполните следующие шаги:

1. Клонируйте репозиторий:

    ```bash
    git clone https://github.com/preyai/rbt-player.git
    ```

2. Установите зависимости:

    ```bash
    yarn install
    ```

4. Запустите проект:

    ```bash
    yarn dev
    ```

## Лицензия
Этот проект выпущен под лицензией MIT. Для получения дополнительной информации ознакомьтесь с файлом [ЛИЦЕНЗИЯ](LICENSE).