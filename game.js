const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==============================
// Загрузка изображений
// ==============================

// Задний фон
const bg = new Image();
bg.src = "images/background.png";

// Средний фон для параллакса
const midBg = new Image();
midBg.src = "images/midBg.png";

// Облака
const cloud1 = new Image();
cloud1.src = "images/cloud1.png";

const cloud2 = new Image();
cloud2.src = "images/cloud2.png";

// Стартовый экран (будет показываться до старта игры)
const startScreen = new Image();
startScreen.src = "images/startScreen.png";

// Анимация Пони – массив спрайтов
const ponyaFrames = [ new Image(), new Image() ];
ponyaFrames[0].src = "images/ponya1.png";
ponyaFrames[1].src = "images/ponya2.png";
// Переменные для анимации персонажа
let currentFrame = 0;
let frameTimer = 0;
const frameInterval = 10; // меняем кадр каждые 10 циклов (подберите значение для нужной скорости)

// Враги / боссы (наземные)
const magicKingImg = new Image();  // Король магии (при score < 8)
magicKingImg.src = "images/enemy.png";

const enemy2Img = new Image();     // Boss Краснуха (при 8 ≤ score < 12)
enemy2Img.src = "images/enemy2.png";

const zurganImg = new Image();     // Зурган (при score ≥ 12)
zurganImg.src = "images/zurgan.png";

// Изображение взрыва
const explosionImg = new Image();
explosionImg.src = "images/explosion.png";

// Финальные экраны
const winScreen = new Image();
winScreen.src = "images/winScreen.png";

const loseScreen = new Image();
loseScreen.src = "images/loseScreen.png";

// Летающий враг (осьминог)
const flyingEnemyImg = new Image();
flyingEnemyImg.src = "images/flyingEnemy.png";

// ==============================
// Новая механика: монетки
// ==============================
const coinImg = new Image();
coinImg.src = "images/coin.png";
let coins = [];           // массив монеток
let coinTimer = 0;        // таймер появления монеток
// Интервал появления монеток от 540 до 780 кадров (~9–13 секунд при 60 FPS)
let coinSpawnThreshold = Math.floor(Math.random() * (780 - 540 + 1)) + 540;
let coinCount = 0;        // количество собранных монеток
const coinSpeed = 2;      // скорость монеток

// ==============================
// Загрузка звуков
// ==============================
const bgMusic = new Audio("sounds/bgMusic.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.7;

const explosionSound = new Audio("sounds/explosion.mp3");
const bossChange1Sound = new Audio("sounds/bossChange1.mp3");
const bossChange2Sound = new Audio("sounds/bossChange2.mp3");
const loseSound = new Audio("sounds/lose.mp3");
const victorySound = new Audio("sounds/Victory.mp3");
const coinSound = new Audio("sounds/CoinCollected.mp3");

// Флаги для звуков
let bossChange1Triggered = false;
let bossChange2Triggered = false;
let loseSoundPlayed = false;

// ==============================
// Игровые переменные
// ==============================

// Состояние игры
let gameStarted = false;  // игра запускается по первому нажатию Space/touch
let isPaused = false;     // пауза отключена
let gameLoopId = null;    // ID игрового цикла

// Параметры Пони – позиция, размеры и физика
const pony = {
  x: 100,
  y: 280,
  width: 75,
  height: 75,
  velocityY: 0,
  jumpForce: -20,
  gravity: 0.4,
  isJumping: false,
};

// Фоновые слои для параллакса
let bgX = 0;
let midBgX = 0;
let cloud1X = 600;
let cloud2X = 900;

// Счёт и статус игры
const initialScore = 5;
let score = initialScore;
let gameEnded = false;  // false, "win" или "lose"

// Параметры наземного врага
let enemy = null;
let enemyTimer = 0;
const enemySpawnThreshold = 200;  // число кадров до появления врага
const enemySpeed = 2;

// Параметры летающего врага (осьминог)
let flyingEnemy = null;
let flyingEnemyTimer = 0;
let flyingEnemySpawnThreshold = Math.floor(Math.random() * (1200 - 840 + 1)) + 840;

// ==============================
// Функции запуска и сброса игры
// ==============================
function startGame() {
  gameStarted = true;
  bgMusic.currentTime = 0;
  bgMusic.play();
}

function resetGame() {
  gameStarted = false;
  isPaused = false;
  gameEnded = false;
  score = initialScore;
  pony.x = 100;
  pony.y = 280;
  pony.velocityY = 0;
  pony.isJumping = false;
  enemy = null;
  enemyTimer = 0;
  flyingEnemy = null;
  flyingEnemyTimer = 0;
  flyingEnemySpawnThreshold = Math.floor(Math.random() * (1200 - 840 + 1)) + 840;
  coins = [];
  coinTimer = 0;
  coinSpawnThreshold = Math.floor(Math.random() * (780 - 540 + 1)) + 540;
  coinCount = 0;
  explosions = [];
  bossChange1Triggered = false;
  bossChange2Triggered = false;
  loseSoundPlayed = false;
  pauseButton.textContent = "Пауза";
  if (gameLoopId !== null) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  startGame();
  gameLoop();
}

// ==============================
// Управление клавиатурой и сенсорное управление
// ==============================
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (!gameStarted) {
      startGame();
    }
    if (!pony.isJumping && !gameEnded && !isPaused) {
      pony.velocityY = pony.jumpForce;
      pony.isJumping = true;
    }
  }
});
document.addEventListener("touchstart", (e) => {
  if (!gameStarted) {
    startGame();
  }
  if (!pony.isJumping && !gameEnded && !isPaused) {
    pony.velocityY = pony.jumpForce;
    pony.isJumping = true;
  }
});

// ==============================
// Элементы управления (кнопки)
// ==============================
const pauseButton = document.getElementById("pauseButton");
const newRunButton = document.getElementById("newRunButton");

pauseButton.addEventListener("click", () => {
  if (!gameStarted) return;
  isPaused = !isPaused;
  if (isPaused) {
    pauseButton.textContent = "Возобновить";
    bgMusic.pause();
    if (gameLoopId !== null) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
    draw(); // обновляем экран, чтобы показать "Пауза"
  } else {
    pauseButton.textContent = "Пауза";
    bgMusic.play();
    if (gameLoopId === null) {
      gameLoop();
    }
  }
  pauseButton.blur();
});

newRunButton.addEventListener("click", () => {
  resetGame();
  newRunButton.blur();
});

// ==============================
// Функция обновления (update)
// ==============================
function update() {
  if (!gameStarted || isPaused || gameEnded) return;
  
  // Обновляем положение Пони (вертикальное движение)
  pony.velocityY += pony.gravity;
  pony.y += pony.velocityY;
  if (pony.y > 280) {
    pony.y = 280;
    pony.velocityY = 0;
    pony.isJumping = false;
  }
  
  // Обновляем фоновые слои (параллакс)
  midBgX -= 0.2;
  if (midBgX <= -canvas.width) {
    midBgX = 0;
  }
  cloud1X -= 0.5;
  cloud2X -= 0.3;
  if (cloud1X < -100) {
    cloud1X = canvas.width + Math.random() * 100;
  }
  if (cloud2X < -100) {
    cloud2X = canvas.width + Math.random() * 100;
  }
  
  // ==============================
  // Обновляем монетки
  // ==============================
  coinTimer++;
  if (coinTimer >= coinSpawnThreshold) {
    let coinType = Math.random() < 0.5 ? "ground" : "flying";
    let coin = {};
    coin.x = canvas.width;
    coin.width = 30;
    coin.height = 30;
    if (coinType === "ground") {
      coin.y = 260;
    } else {
      coin.y = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    }
    coin.speed = coinSpeed;
    coins.push(coin);
    coinTimer = 0;
    coinSpawnThreshold = Math.floor(Math.random() * (780 - 540 + 1)) + 540;
  }
  
  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];
    coin.x -= coin.speed;
    if (coin.x + coin.width < 0) {
      coins.splice(i, 1);
      continue;
    }
    if (checkCollision(pony, coin)) {
      coins.splice(i, 1);
      coinCount++;
      coinSound.currentTime = 0;
      coinSound.play();
      if (coinCount >= 3) {
        coinCount = 0;
        score += 1;
      }
    }
  }
  
  // ==============================
  // Обновляем наземного врага
  // ==============================
  if (enemy === null) {
    enemyTimer++;
    if (enemyTimer >= enemySpawnThreshold) {
      let enemyType;
      if (score < 8) {
        enemyType = "king";
      } else if (score < 12) {
        enemyType = "boss2";
      } else {
        enemyType = "zurgan";
      }
      enemy = {
        x: canvas.width,
        y: 280,
        width: pony.width,
        height: pony.height,
        speed: enemySpeed,
        collided: false,
        type: enemyType,
      };
      enemyTimer = 0;
      
      if (score >= 8 && !bossChange1Triggered) {
        bossChange1Triggered = true;
        bossChange1Sound.currentTime = 0;
        bossChange1Sound.play();
      }
      if (score >= 12 && !bossChange2Triggered) {
        bossChange2Triggered = true;
        bossChange2Sound.currentTime = 0;
        bossChange2Sound.play();
      }
    }
  } else {
    enemy.x -= enemy.speed;
    if (!enemy.collided && checkCollision(pony, enemy)) {
      enemy.collided = true;
      score -= 2;
      explosionSound.currentTime = 0;
      explosionSound.play();
      explosions.push({
        x: enemy.x,
        y: enemy.y,
        width: enemy.width,
        height: enemy.height,
        start: Date.now(),
        duration: 500
      });
    }
    if (enemy.x + enemy.width < pony.x) {
      if (!enemy.collided) {
        score += 1;
      }
      enemy = null;
    }
  }
  
  // ==============================
  // Обновляем летающего врага (осьминог) — теперь появляется реже (14–20 секунд) и колеблется
  // ==============================
  if (flyingEnemy === null) {
    flyingEnemyTimer++;
    if (flyingEnemyTimer >= flyingEnemySpawnThreshold) {
      flyingEnemy = {
        x: canvas.width,
        baseY: 120,
        y: 120,
        width: 60,
        height: 60,
        speed: enemySpeed,
        collided: false,
        spawnTime: Date.now()
      };
      flyingEnemyTimer = 0;
      flyingEnemySpawnThreshold = Math.floor(Math.random() * (1200 - 840 + 1)) + 840;
    }
  } else {
    flyingEnemy.x -= flyingEnemy.speed;
    let elapsed = Date.now() - flyingEnemy.spawnTime;
    flyingEnemy.y = flyingEnemy.baseY + 20 * Math.sin(elapsed / 200);
    if (!flyingEnemy.collided && checkCollision(pony, flyingEnemy)) {
      flyingEnemy.collided = true;
      score -= 1;
      explosionSound.currentTime = 0;
      explosionSound.play();
      explosions.push({
        x: flyingEnemy.x,
        y: flyingEnemy.y,
        width: flyingEnemy.width,
        height: flyingEnemy.height,
        start: Date.now(),
        duration: 500
      });
    }
    if (flyingEnemy.x + flyingEnemy.width < pony.x) {
      flyingEnemy = null;
    }
  }
  
  // ==============================
  // Обновляем активные взрывы
  // ==============================
  explosions = explosions.filter(expl => (Date.now() - expl.start) < expl.duration);
  
  // ==============================
  // Проверка условий окончания игры
  // ==============================
  if (score >= 15) {
    gameEnded = "win";
    bgMusic.pause();
    bgMusic.currentTime = 0;
    victorySound.currentTime = 0;
    victorySound.play();
  } else if (score <= 0) {
    gameEnded = "lose";
    bgMusic.pause();
    bgMusic.currentTime = 0;
    if (!loseSoundPlayed) {
      loseSoundPlayed = true;
      loseSound.currentTime = 0;
      loseSound.play();
    }
  }
}

// ==============================
// Функция отрисовки (draw)
// ==============================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Если игра не началась, показываем стартовый экран
  if (!gameStarted) {
    if (startScreen.complete) {
      ctx.drawImage(startScreen, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "black";
      ctx.font = "30px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("Pongosh, пиксельное приключение", canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "16px Courier New";
      ctx.fillText("Нажми Space или коснись экрана, чтобы начать", canvas.width / 2, canvas.height / 2 + 10);
    }
    return;
  }
  
  // Рисуем задний фон
  if (bg.complete) {
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  }
  
  // Рисуем средний фон (параллакс-эффект)
  if (midBg.complete) {
    ctx.drawImage(midBg, midBgX, 0, canvas.width, canvas.height);
    ctx.drawImage(midBg, midBgX + canvas.width, 0, canvas.width, canvas.height);
  }
  
  // Рисуем облака
  if (cloud1.complete) {
    ctx.drawImage(cloud1, cloud1X, 50, 100, 50);
  }
  if (cloud2.complete) {
    ctx.drawImage(cloud2, cloud2X, 100, 120, 60);
  }
  
  // Рисуем монетки
  coins.forEach(coin => {
    if (coinImg.complete) {
      ctx.drawImage(coinImg, coin.x, coin.y, coin.width, coin.height);
    } else {
      ctx.fillStyle = "gold";
      ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
    }
  });
  
  // Рисуем Поню с анимацией (смена кадров)
  frameTimer++;
  if (frameTimer % frameInterval === 0) {
    currentFrame = (currentFrame + 1) % ponyaFrames.length;
  }
  if (ponyaFrames[currentFrame].complete) {
    ctx.drawImage(ponyaFrames[currentFrame], pony.x, pony.y, pony.width, pony.height);
  } else {
    ctx.fillStyle = "orange";
    ctx.fillRect(pony.x, pony.y, pony.width, pony.height);
  }
  
  // Рисуем наземного врага
  if (enemy !== null) {
    if (enemy.type === "king") {
      if (magicKingImg.complete) {
        ctx.drawImage(magicKingImg, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    } else if (enemy.type === "boss2") {
      if (enemy2Img.complete) {
        ctx.drawImage(enemy2Img, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    } else if (enemy.type === "zurgan") {
      if (zurganImg.complete) {
        ctx.drawImage(zurganImg, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    }
  }
  
  // Рисуем летающего врага (осьминог)
  if (flyingEnemy !== null) {
    if (flyingEnemyImg.complete) {
      ctx.drawImage(flyingEnemyImg, flyingEnemy.x, flyingEnemy.y, flyingEnemy.width, flyingEnemy.height);
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(flyingEnemy.x, flyingEnemy.y, flyingEnemy.width, flyingEnemy.height);
    }
  }
  
  // Рисуем активные взрывы
  explosions.forEach(expl => {
    if (explosionImg.complete) {
      ctx.drawImage(explosionImg, expl.x, expl.y, expl.width, expl.height);
    } else {
      ctx.fillStyle = "yellow";
      ctx.fillRect(expl.x, expl.y, expl.width, expl.height);
    }
  });
  
  // Выводим счёт и индикатор монеток
  if (!gameEnded) {
    ctx.fillStyle = "black";
    ctx.font = "20px Courier New";
    ctx.textAlign = "left";
    ctx.fillText("Счёт: " + score, 10, 30);
    ctx.fillStyle = "gold";
    ctx.fillText("Монетки: " + coinCount + "/3", 10, 60);
  }
  
  // Если игра на паузе – накладываем затемнённый слой с надписью "Пауза"
  if (isPaused && gameStarted && !gameEnded) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Пауза", canvas.width / 2, canvas.height / 2);
  }
  
  // Если игра окончена, отображаем финальный экран (только картинка)
  if (gameEnded === "win") {
    if (winScreen.complete) {
      ctx.drawImage(winScreen, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "green";
      ctx.font = "40px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("Понгош победил!", canvas.width / 2, canvas.height / 2);
    }
  } else if (gameEnded === "lose") {
    if (loseScreen.complete) {
      ctx.drawImage(loseScreen, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "red";
      ctx.font = "40px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("Тьма победила...", canvas.width / 2, canvas.height / 2);
    }
  }
}

// ==============================
// Функция проверки столкновения (с уменьшённой зоной соприкосновения)
// ==============================
function checkCollision(a, b) {
  const marginX = b.width * 0.2;
  const marginY = b.height * 0.2;
  const effectiveX = b.x + marginX / 2;
  const effectiveY = b.y + marginY / 2;
  const effectiveWidth = b.width - marginX;
  const effectiveHeight = b.height - marginY;
  return (
    a.x < effectiveX + effectiveWidth &&
    a.x + a.width > effectiveX &&
    a.y < effectiveY + effectiveHeight &&
    a.y + a.height > effectiveY
  );
}

// ==============================
// Игровой цикл
// ==============================
function gameLoop() {
  update();
  draw();
  gameLoopId = requestAnimationFrame(gameLoop);
}

gameLoop();
