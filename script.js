
(() => {
  "use strict";

  // ==========================================
  // INNOCENT RUNNER 3D
  // ==========================================

  const game = document.getElementById("game");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("startBtn");
  const speech = document.getElementById("speech");

  const scoreDisplay = document.getElementById("score");
  const coinDisplay = document.getElementById("coins");
  const sideScore = document.getElementById("sideScore");
  const sideCoins = document.getElementById("sideCoins");

  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const jumpBtn = document.getElementById("jumpBtn");
  const slideBtn = document.getElementById("slideBtn");

  if (!game || !menu || !startBtn) {
    console.error("Missing game HTML elements.");
    return;
  }

  if (!window.THREE) {
    game.innerHTML =
      '<div style="color:white;padding:30px;text-align:center;">Three.js failed to load. Check your internet connection.</div>';
    return;
  }

  const THREE = window.THREE;

  // ==========================================
  // GAME VARIABLES
  // ==========================================

  const LANES = [-2.4, 0, 2.4];

  let scene;
  let camera;
  let renderer;
  let clock;

  let player;
  let police;

  let running = false;

  let score = 0;
  let coins = 0;

  let speed = 18;
  let spawnTimer = 0;
  let coinTimer = 0;

  let lane = 1;

  let jumping = false;
  let sliding = false;

  let jumpTime = 0;
  let slideTime = 0;
  let playerY = 0;

  const obstacles = [];
  const coinObjects = [];
  const scenery = [];
  const particles = [];

  const materials = {
    road: new THREE.MeshStandardMaterial({
      color: 0x252a38
    }),

    sidewalk: new THREE.MeshStandardMaterial({
      color: 0x555b6c
    }),

    white: new THREE.MeshStandardMaterial({
      color: 0xffffff
    }),

    yellow: new THREE.MeshStandardMaterial({
      color: 0xffc928,
      emissive: 0x664400
    }),

    blue: new THREE.MeshStandardMaterial({
      color: 0x249bff
    }),

    orange: new THREE.MeshStandardMaterial({
      color: 0xff762b
    }),

    red: new THREE.MeshStandardMaterial({
      color: 0xe63946
    }),

    black: new THREE.MeshStandardMaterial({
      color: 0x15151b
    }),

    skin: new THREE.MeshStandardMaterial({
      color: 0x75452f
    }),

    shirt: new THREE.MeshStandardMaterial({
      color: 0x171d2e
    }),

    pants: new THREE.MeshStandardMaterial({
      color: 0x252b40
    }),

    police: new THREE.MeshStandardMaterial({
      color: 0x173d80
    }),

    policeHat: new THREE.MeshStandardMaterial({
      color: 0x101d40
    })
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================

  function init() {
    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x91c9ed);
    scene.fog = new THREE.Fog(0x91c9ed, 35, 150);

    camera = new THREE.PerspectiveCamera(
      65,
      1,
      0.1,
      250
    );

    camera.position.set(0, 6.5, 12);
    camera.lookAt(0, 1.3, -8);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderer.shadowMap.enabled = false;
    renderer.outputEncoding = THREE.sRGBEncoding;

    game.prepend(renderer.domElement);

    clock = new THREE.Clock();

    addLighting();
    createWorld();

    player = createCharacter(false);
    player.position.set(0, 0, 2);
    scene.add(player);

    police = createCharacter(true);
    police.position.set(0, 0, 9);
    scene.add(police);

    connectControls();
    resizeGame();

    window.addEventListener("resize", resizeGame);

    startBtn.addEventListener("click", startGame);

    animate();
  }

  // ==========================================
  // LIGHTING
  // ==========================================

  function addLighting() {
    const ambient = new THREE.HemisphereLight(
      0xffffff,
      0x596477,
      2
    );

    scene.add(ambient);

    const sunlight = new THREE.DirectionalLight(
      0xffffff,
      1.5
    );

    sunlight.position.set(-10, 20, 10);
    scene.add(sunlight);
  }

  // ==========================================
  // WORLD
  // ==========================================

  function createWorld() {
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.2, 240),
      materials.road
    );

    road.position.set(0, -0.15, -95);
    scene.add(road);

    for (const x of [-5.2, 5.2]) {
      const sidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.35, 240),
        materials.sidewalk
      );

      sidewalk.position.set(x, -0.1, -95);
      scene.add(sidewalk);
    }

    // Lane markings
    for (const x of [-1.2, 1.2]) {
      for (let i = 0; i < 40; i++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.025, 2.5),
          materials.white
        );

        line.position.set(x, -0.035, -i * 6);

        scene.add(line);
        scenery.push(line);
      }
    }

    // Buildings
    const buildingColors = [
      0x4a638b,
      0x725a8e,
      0x416b76,
      0x9b654d,
      0x40516e,
      0x626d83
    ];

    for (let i = 0; i < 32; i++) {
      createBuilding(
        -7.5,
        -i * 8,
        buildingColors[i % buildingColors.length]
      );

      createBuilding(
        7.5,
        -i * 8,
        buildingColors[(i + 3) % buildingColors.length]
      );
    }

    // Streetlights
    for (let i = 0; i < 20; i++) {
      createStreetlight(-5.1, -i * 12);
      createStreetlight(5.1, -i * 12);
    }

    const skyline = new THREE.Mesh(
      new THREE.BoxGeometry(100, 25, 20),
      new THREE.MeshStandardMaterial({
        color: 0x6687a5
      })
    );

    skyline.position.set(0, 10, -125);
    scene.add(skyline);
  }

  function createBuilding(x, z, color) {
    const group = new THREE.Group();

    const height = 9 + Math.random() * 17;
    const width = 4 + Math.random() * 2;

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 6),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8
      })
    );

    building.position.y = height / 2;
    group.add(building);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd77a,
      emissive: 0x332200
    });

    for (let y = 1.5; y < height - 1; y += 2.5) {
      for (let w = -1; w <= 1; w++) {
        const windowMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 1, 0.08),
          windowMaterial
        );

        windowMesh.position.set(w * 1.2, y, 3.04);
        group.add(windowMesh);
      }
    }

    group.position.set(x, 0, z);

    // Keep windows attached to their building.
    // Buildings are stationary scenery.
    scene.add(group);
  }

  function createStreetlight(x, z) {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 5, 8),
      materials.black
    );

    pole.position.y = 2.5;
    group.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 0.08),
      materials.black
    );

    arm.position.set(x < 0 ? 0.4 : -0.4, 4.8, 0);
    group.add(arm);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.4),
      materials.yellow
    );

    lamp.position.set(x < 0 ? 0.8 : -0.8, 4.7, 0);
    group.add(lamp);

    group.position.set(x, 0, z);

    scene.add(group);
    scenery.push(group);
  }

  // ==========================================
  // CHARACTERS
  // ==========================================

  function createCharacter(isPolice) {
    const group = new THREE.Group();

    const bodyMaterial = isPolice
      ? materials.police
      : materials.shirt;

    const pantsMaterial = isPolice
      ? materials.police
      : materials.pants;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 1, 0.42),
      bodyMaterial
    );

    body.position.y = 1.35;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      materials.skin
    );

    head.position.y = 2.1;
    group.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.33, 12, 8),
      materials.black
    );

    hair.scale.y = 0.55;
    hair.position.y = 2.32;
    group.add(hair);

    if (isPolice) {
      const hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.18, 0.55),
        materials.policeHat
      );

      hat.position.y = 2.43;
      group.add(hat);
    }

    const arms = [];
    const legs = [];

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.85, 0.23),
        bodyMaterial
      );

      arm.position.set(side * 0.5, 1.35, 0);
      group.add(arm);
      arms.push(arm);

      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.85, 0.3),
        pantsMaterial
      );

      leg.position.set(side * 0.2, 0.45, 0);
      group.add(leg);
      legs.push(leg);

      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, 0.5),
        materials.black
      );

      shoe.position.set(side * 0.2, 0.08, 0.08);
      group.add(shoe);
    }

    group.userData = {
      arms,
      legs
    };

    return group;
  }

  function animateCharacter(character, time, intensity = 1) {
    const data = character.userData;

    const swing = Math.sin(time * 12) * 0.55 * intensity;

    data.arms[0].rotation.x = swing;
    data.arms[1].rotation.x = -swing;

    data.legs[0].rotation.x = -swing;
    data.legs[1].rotation.x = swing;
  }

  // ==========================================
  // OBSTACLES
  // ==========================================

  function createObstacle() {
    const laneIndex = Math.floor(Math.random() * 3);
    const type = Math.floor(Math.random() * 4);

    const group = new THREE.Group();

    if (type === 0) {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.8, 0.5),
        materials.orange
      );

      barrier.position.y = 0.4;
      group.add(barrier);

      group.userData.type = "jump";
    } else if (type === 1) {
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.4, 0.5),
        materials.red
      );

      top.position.y = 2.2;
      group.add(top);

      for (const x of [-0.8, 0.8]) {
        const support = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 2.2, 0.4),
          materials.black
        );

        support.position.set(x, 1.1, 0);
        group.add(support);
      }

      group.userData.type = "slide";
    } else if (type === 2) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.3, 1),
        materials.orange
      );

      crate.position.y = 0.65;
      group.add(crate);

      group.userData.type = "block";
    } else {
      const train = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 3.5, 5),
        materials.blue
      );

      train.position.y = 1.75;
      group.add(train);

      const front = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1, 0.08),
        materials.white
      );

      front.position.set(0, 2.4, 2.55);
      group.add(front);

      group.userData.type = "block";
    }

    group.position.set(LANES[laneIndex], 0, -100);
    group.userData.passed = false;

    scene.add(group);
    obstacles.push(group);
  }

  // ==========================================
  // COINS
  // ==========================================

  function createCoin() {
    const laneIndex = Math.floor(Math.random() * 3);

    const group = new THREE.Group();

    const coin = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.1, 8, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.25,
        emissive: 0x664400
      })
    );

    group.add(coin);

    group.position.set(LANES[laneIndex], 1.25, -85);
    group.userData.collected = false;

    scene.add(group);
    coinObjects.push(group);
  }

  // ==========================================
  // PARTICLES
  // ==========================================

  function createParticles(position) {
    for (let i = 0; i < 7; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        materials.yellow
      );

      particle.position.copy(position);

      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4,
        (Math.random() - 0.5) * 4
      );

      particle.userData.life = 0.5;

      scene.add(particle);
      particles.push(particle);
    }
  }

  // ==========================================
  // CONTROLS
  // ==========================================

  function connectControls() {
    // Prevent arrow keys from scrolling the webpage.
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();

      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " "
        ].includes(key)
      ) {
        event.preventDefault();
      }

      if (!running) return;

      if (key === "arrowleft" || key === "a") {
        moveLeft();
      }

      if (key === "arrowright" || key === "d") {
        moveRight();
      }

      if (key === "arrowup" || key === " ") {
        jump();
      }

      if (key === "arrowdown" || key === "s") {
        slide();
      }
    }, { passive: false });

    if (leftBtn) {
      leftBtn.addEventListener("click", moveLeft);
    }

    if (rightBtn) {
      rightBtn.addEventListener("click", moveRight);
    }

    if (jumpBtn) {
      jumpBtn.addEventListener("click", jump);
    }

    if (slideBtn) {
      slideBtn.addEventListener("click", slide);
    }

    // Touch swipe controls
    let touchStartX = 0;
    let touchStartY = 0;

    game.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    game.addEventListener("touchend", (event) => {
      if (!running) return;

      const touch = event.changedTouches[0];

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 35) moveRight();
        if (dx < -35) moveLeft();
      } else {
        if (dy < -35) jump();
        if (dy > 35) slide();
      }
    }, { passive: true });
  }

  function moveLeft() {
    if (!running) return;

    lane = Math.max(0, lane - 1);
  }

  function moveRight() {
    if (!running) return;

    lane = Math.min(2, lane + 1);
  }

  function jump() {
    if (!running || jumping || sliding) return;

    jumping = true;
    jumpTime = 0;
  }

  function slide() {
    if (!running || jumping || sliding) return;

    sliding = true;
    slideTime = 0;
  }

  // ==========================================
  // START GAME
  // ==========================================

  function startGame() {
    if (running) return;

    clearObjects();

    score = 0;
    coins = 0;
    speed = 18;

    spawnTimer = 0;
    coinTimer = 0;

    lane = 1;

    jumping = false;
    sliding = false;

    jumpTime = 0;
    slideTime = 0;
    playerY = 0;

    player.position.set(0, 0, 2);
    police.position.set(0, 0, 9);

    player.scale.set(1, 1, 1);

    if (speech) {
      speech.textContent = "I'M INNOCENT!";
    }

    updateHUD();

    running = true;

    menu.style.display = "none";

    const title = menu.querySelector("h1");
    const description = menu.querySelector("p");

    if (title) title.textContent = "INNOCENT RUNNER";
    if (description) {
      description.textContent = "Can you escape the police?";
    }

    startBtn.textContent = "START GAME";
  }

  function clearObjects() {
    for (const object of obstacles) {
      scene.remove(object);
    }

    for (const object of coinObjects) {
      scene.remove(object);
    }

    for (const object of particles) {
      scene.remove(object);
    }

    obstacles.length = 0;
    coinObjects.length = 0;
    particles.length = 0;
  }

  // ==========================================
  // GAME OVER
  // ==========================================

  function endGame() {
    if (!running) return;

    running = false;

    menu.style.display = "flex";

    const title = menu.querySelector("h1");
    const description = menu.querySelector("p");

    if (title) title.textContent = "CAUGHT!";

    if (description) {
      description.textContent =
        "Your score: " + Math.floor(score);
    }

    startBtn.textContent = "TRY AGAIN";

    if (speech) {
      speech.textContent = "WAIT! I'M INNOCENT!";
    }
  }

  // ==========================================
  // HUD
  // ==========================================

  function updateHUD() {
    const displayedScore = Math.floor(score);

    if (scoreDisplay) {
      scoreDisplay.textContent = displayedScore;
    }

    if (coinDisplay) {
      coinDisplay.textContent = coins;
    }

    if (sideScore) {
      sideScore.textContent = displayedScore;
    }

    if (sideCoins) {
      sideCoins.textContent = coins;
    }
  }

  // ==========================================
  // PLAYER UPDATE
  // ==========================================

  function updatePlayer(delta) {
    const targetX = LANES[lane];

    player.position.x +=
      (targetX - player.position.x) *
      Math.min(1, delta * 12);

    // Jump animation
    if (jumping) {
      jumpTime += delta;

      const progress = jumpTime / 0.8;

      playerY = Math.sin(progress * Math.PI) * 2.3;

      if (progress >= 1) {
        jumping = false;
        playerY = 0;
      }
    }

    // Slide animation
    if (sliding) {
      slideTime += delta;
      player.scale.y = 0.5;

      if (slideTime >= 0.75) {
        sliding = false;
        player.scale.y = 1;
      }
    }

    if (!sliding) {
      player.scale.y = 1;
    }

    player.position.y = playerY;

    animateCharacter(player, clock.elapsedTime);

    // Police chase
    police.position.x +=
      (player.position.x - police.position.x) *
      Math.min(1, delta * 3);

    police.position.z =
      8.5 + Math.sin(clock.elapsedTime * 5) * 0.15;

    animateCharacter(police, clock.elapsedTime + 1);

    // Camera movement
    camera.position.x +=
      (player.position.x * 0.25 - camera.position.x) *
      Math.min(1, delta * 3);
  }

  // ==========================================
  // OBSTACLE UPDATE
  // ==========================================

  function updateObstacles(delta) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];

      obstacle.position.z += speed * delta;

      const closeEnough =
        Math.abs(obstacle.position.z - player.position.z) < 1.1 &&
        Math.abs(obstacle.position.x - player.position.x) < 1.1;

      if (closeEnough) {
        const type = obstacle.userData.type;

        let avoided = false;

        if (type === "jump" && jumping && playerY > 0.9) {
          avoided = true;
        }

        if (type === "slide" && sliding) {
          avoided = true;
        }

        if (!avoided) {
          endGame();
          return;
        }
      }

      if (
        !obstacle.userData.passed &&
        obstacle.position.z > player.position.z + 1
      ) {
        obstacle.userData.passed = true;
        score += 10;
      }

      if (obstacle.position.z > 18) {
        scene.remove(obstacle);
        obstacles.splice(i, 1);
      }
    }
  }

  // ==========================================
  // COIN UPDATE
  // ==========================================

  function updateCoins(delta) {
    for (let i = coinObjects.length - 1; i >= 0; i--) {
      const coin = coinObjects[i];

      coin.position.z += speed * delta;

      coin.rotation.y += delta * 4;
      coin.rotation.z += delta * 1.5;

      const distanceX = Math.abs(
        coin.position.x - player.position.x
      );

      const distanceZ = Math.abs(
        coin.position.z - player.position.z
      );

      const distanceY = Math.abs(
        coin.position.y - (player.position.y + 1.2)
      );

      if (
        distanceX < 0.9 &&
        distanceZ < 1 &&
        distanceY < 1.2 &&
        !coin.userData.collected
      ) {
        coin.userData.collected = true;

        coins++;
        score += 25;

        createParticles(coin.position);

        scene.remove(coin);
        coinObjects.splice(i, 1);

        updateHUD();
        continue;
      }

      if (coin.position.z > 18) {
        scene.remove(coin);
        coinObjects.splice(i, 1);
      }
    }
  }

  // ==========================================
  // PARTICLE UPDATE
  // ==========================================

  function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];

      particle.userData.life -= delta;

      particle.position.addScaledVector(
        particle.userData.velocity,
        delta
      );

      particle.userData.velocity.y -= 8 * delta;

      if (particle.userData.life <= 0) {
        scene.remove(particle);
        particles.splice(i, 1);
      }
    }
  }

  // ==========================================
  // SCENERY UPDATE
  // ==========================================

  function updateScenery(delta) {
    for (const object of scenery) {
      object.position.z += speed * delta * 0.85;

      if (object.position.z > 18) {
        object.position.z -= 240;
      }
    }
  }

  // ==========================================
  // SPAWNING
  // ==========================================

  function updateSpawning(delta) {
    spawnTimer -= delta;
    coinTimer -= delta;

    if (spawnTimer <= 0) {
      createObstacle();

      spawnTimer = Math.max(
        0.8,
        1.6 - (speed - 18) * 0.025
      );
    }

    if (coinTimer <= 0) {
      createCoin();

      coinTimer = 1.1 + Math.random() * 1.2;
    }
  }

  // ==========================================
  // MAIN UPDATE
  // ==========================================

  function update(delta) {
    if (!running) return;

    delta = Math.min(delta, 0.05);

    speed += delta * 0.35;
    score += delta * 8;

    updatePlayer(delta);
    updateObstacles(delta);

    if (!running) return;

    updateCoins(delta);
    updateParticles(delta);
    updateScenery(delta);
    updateSpawning(delta);

    updateHUD();
  }

  // ==========================================
  // ANIMATION LOOP
  // ==========================================

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    update(delta);

    renderer.render(scene, camera);
  }

  // ==========================================
  // RESIZE
  // ==========================================

  function resizeGame() {
    const width = game.clientWidth;
    const height = game.clientHeight;

    if (!width || !height || !renderer) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  // ==========================================
  // START
  // ==========================================

  init();

})();






