const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const miniCtx = minimap.getContext("2d");

const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const dialogue = document.getElementById("dialogue");
const dialogueName = document.getElementById("dialogue-name");
const dialogueText = document.getElementById("dialogue-text");
const dialogueContinue = document.getElementById("dialogue-continue");
const dialogueClose = document.getElementById("dialogue-close");
const shopModal = document.getElementById("shop");
const shopItems = document.getElementById("shop-items");
const shopCoins = document.getElementById("shop-coins");
const shopClose = document.getElementById("shop-close");
const shopTabs = document.querySelectorAll(".shop-tabs button");
const toggleMusic = document.getElementById("toggle-music");

const skillsPanel = document.getElementById("skills");
const questLog = document.getElementById("quest-log");
const inventoryGrid = document.getElementById("inventory");
const equipmentGrid = document.getElementById("equipment");
const bankGrid = document.getElementById("bank");

const tileSize = 16;
const scale = 3;
const renderSize = tileSize * scale;
const worldSize = 96;
const viewTilesX = Math.floor(canvas.width / renderSize);
const viewTilesY = Math.floor(canvas.height / renderSize);
const centerOffsetX = Math.floor(viewTilesX / 2);
const centerOffsetY = Math.floor(viewTilesY / 2);

const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const skills = [
  "Attack",
  "Strength",
  "Defense",
  "Hitpoints",
  "Woodcutting",
  "Mining",
  "Fishing",
  "Firemaking",
  "Cooking",
  "Magic",
];

const quests = [
  { name: "Mayor's Lost Hat", status: "Active" },
  { name: "The Fenwick Ferry", status: "New" },
  { name: "Graveyard Gossip", status: "New" },
  { name: "Runelight Relay", status: "New" },
];

const dialogueLines = [
  "Ah, an adventurer! My knees are starting to sound like maracas.",
  "You look like someone who can carry 200 logs and still smile.",
  "The wilderness smells of danger and moderately damp socks.",
  "I once fought a slime. It won. We're civil now.",
  "If you see the mayor, tell them the hat ran away again.",
];

const spritePalette = {
  skin: "#f1c27d",
  armor: "#6d7f91",
  cloth: "#3b4a5a",
  hair: "#3f2a1d",
  eyes: "#1b1e26",
};

const tileTypes = {
  grass: { color: "#2f7d32", walkable: true },
  dirt: { color: "#8b6b3f", walkable: true },
  stone: { color: "#5b5f67", walkable: true },
  water: { color: "#2d4f7a", walkable: false },
  plank: { color: "#a17c47", walkable: true },
  fence: { color: "#6b5432", walkable: false },
};

const resourceTemplates = {
  tree: { color: "#1f5c2c", skill: "Woodcutting", item: "Logs" },
  rock: { color: "#50535a", skill: "Mining", item: "Ore" },
  fish: { color: "#2c6fa1", skill: "Fishing", item: "Fish" },
};

const monsterTemplates = {
  slime: { color: "#4cc36f", hp: 12, maxHit: 3, loot: "Goo" },
  goblin: { color: "#6bbf5b", hp: 18, maxHit: 4, loot: "Bones" },
  zombie: { color: "#6b8f6d", hp: 24, maxHit: 5, loot: "Rotten Cloth" },
  skeleton: { color: "#b6b2a6", hp: 20, maxHit: 4, loot: "Bone" },
  bat: { color: "#4a4a66", hp: 14, maxHit: 3, loot: "Wing" },
};

const world = [];
const resources = [];
const decorations = [];
const npcs = [];
const players = [];
const monsters = [];
const particles = [];

const inventory = Array(28).fill(null);
const equipment = {
  weapon: null,
  shield: null,
  tool: null,
};
const bank = Array(80).fill(null);

const player = {
  name: "You",
  x: 24,
  y: 24,
  px: 24,
  py: 24,
  dir: "down",
  frame: 0,
  path: [],
  hp: 20,
  maxHp: 20,
  coins: 125,
  xp: skills.reduce((acc, skill) => ({ ...acc, [skill]: 0 }), {}),
  level: skills.reduce((acc, skill) => ({ ...acc, [skill]: 1 }), {}),
  target: null,
  dead: false,
  pendingAction: null,
  zone: "Timbercross",
};

let musicEnabled = true;
let audioCtx;
let musicInterval;

const townCenter = { x: 24, y: 24 };

const getZone = (x, y) => {
  const distance = Math.abs(x - townCenter.x) + Math.abs(y - townCenter.y);
  if (distance < 14) return "Timbercross";
  if (y < 18) return "Northern Barrens";
  if (y > 60) return "Wilderness";
  return "Outer Fields";
};

const generateWorld = () => {
  for (let y = 0; y < worldSize; y += 1) {
    const row = [];
    for (let x = 0; x < worldSize; x += 1) {
      let type = "grass";
      const edge = x < 8 || y < 8 || x > worldSize - 9 || y > worldSize - 9;
      if (edge && Math.random() < 0.2) type = "water";
      if (Math.random() < 0.07) type = "stone";
      if (Math.random() < 0.07) type = "dirt";
      row.push(type);
    }
    world.push(row);
  }

  for (let y = townCenter.y - 6; y <= townCenter.y + 6; y += 1) {
    for (let x = townCenter.x - 8; x <= townCenter.x + 8; x += 1) {
      world[y][x] = "plank";
    }
  }

  for (let y = townCenter.y - 7; y <= townCenter.y + 7; y += 1) {
    for (let x = townCenter.x - 9; x <= townCenter.x + 9; x += 1) {
      if (y === townCenter.y - 7 || y === townCenter.y + 7 || x === townCenter.x - 9 || x === townCenter.x + 9) {
        world[y][x] = "fence";
      }
    }
  }
  const gates = [
    { x: townCenter.x, y: townCenter.y - 7 },
    { x: townCenter.x, y: townCenter.y + 7 },
    { x: townCenter.x - 9, y: townCenter.y },
    { x: townCenter.x + 9, y: townCenter.y },
  ];
  gates.forEach((gate) => {
    world[gate.y][gate.x] = "dirt";
  });

  addBuilding(townCenter.x - 5, townCenter.y - 4, 4, 3, "Bank");
  addBuilding(townCenter.x + 1, townCenter.y - 4, 4, 3, "Shop");
  addBuilding(townCenter.x - 7, townCenter.y + 2, 4, 3, "Town Hall");
  addBuilding(townCenter.x + 3, townCenter.y + 2, 4, 3, "House");
  addBuilding(townCenter.x - 2, townCenter.y + 2, 4, 3, "House");

  decorations.push(
    { x: townCenter.x, y: townCenter.y, type: "well" },
    { x: townCenter.x - 3, y: townCenter.y - 6, type: "lamp" },
    { x: townCenter.x + 3, y: townCenter.y - 6, type: "lamp" },
    { x: townCenter.x - 3, y: townCenter.y + 6, type: "lamp" },
    { x: townCenter.x + 3, y: townCenter.y + 6, type: "lamp" },
    { x: townCenter.x + 6, y: townCenter.y, type: "sign" },
  );

  for (let i = 0; i < 140; i += 1) {
    const x = rng(6, worldSize - 6);
    const y = rng(6, worldSize - 6);
    if (world[y][x] === "grass") {
      const decoTypes = ["bush", "flower", "tuft", "pebble", "stump", "reeds", "boulder"];
      decorations.push({ x, y, type: decoTypes[rng(0, decoTypes.length - 1)] });
    }
  }

  placeResources("tree", 110);
  placeResources("rock", 90);
  placeResources("fish", 70, "water");
};

const addBuilding = (x, y, w, h, label) => {
  for (let iy = y; iy < y + h; iy += 1) {
    for (let ix = x; ix < x + w; ix += 1) {
      world[iy][ix] = "stone";
    }
  }
  decorations.push({ x: x + 1, y: y + h, type: "door", label });
};

const placeResources = (type, count, base = "grass") => {
  for (let i = 0; i < count; i += 1) {
    const x = rng(2, worldSize - 3);
    const y = rng(2, worldSize - 3);
    if (world[y][x] === base) {
      resources.push({ x, y, type, depleted: false, timer: 0 });
    }
  }
};

const isWalkable = (x, y) => {
  if (x < 0 || y < 0 || x >= worldSize || y >= worldSize) return false;
  const tile = tileTypes[world[y][x]];
  if (!tile.walkable) return false;
  const blockedBuilding = decorations.find(
    (decor) => decor.type === "door" && decor.x === x && decor.y === y
  );
  if (blockedBuilding) return false;
  const resource = resources.find((node) => node.x === x && node.y === y && !node.depleted);
  if (resource && resource.type !== "fish") return false;
  return true;
};

const getAdjacentWalkable = (targetX, targetY) => {
  const options = [
    { x: targetX + 1, y: targetY },
    { x: targetX - 1, y: targetY },
    { x: targetX, y: targetY + 1 },
    { x: targetX, y: targetY - 1 },
  ];
  return options.find((option) => isWalkable(option.x, option.y));
};

const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const findPath = (start, goal) => {
  const open = [start];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  const key = (p) => `${p.x},${p.y}`;

  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, goal));

  while (open.length > 0) {
    open.sort((a, b) => fScore.get(key(a)) - fScore.get(key(b)));
    const current = open.shift();
    if (current.x === goal.x && current.y === goal.y) {
      const path = [current];
      let currKey = key(current);
      while (cameFrom.has(currKey)) {
        const prev = cameFrom.get(currKey);
        path.unshift(prev);
        currKey = key(prev);
      }
      return path.slice(1);
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    neighbors.forEach((neighbor) => {
      if (!isWalkable(neighbor.x, neighbor.y)) return;
      const tentativeG = (gScore.get(key(current)) || 9999) + 1;
      const neighborKey = key(neighbor);
      if (tentativeG < (gScore.get(neighborKey) || 9999)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));
        if (!open.find((node) => node.x === neighbor.x && node.y === neighbor.y)) {
          open.push(neighbor);
        }
      }
    });
  }
  return [];
};

const addNPC = (name, role, x, y, task) => {
  npcs.push({
    name,
    role,
    x,
    y,
    px: x,
    py: y,
    dir: "down",
    frame: 0,
    task,
    path: [],
  });
};

const addPlayer = (name, x, y, task) => {
  players.push({
    name,
    x,
    y,
    px: x,
    py: y,
    dir: "down",
    frame: 0,
    task,
    path: [],
  });
};

const spawnNPCs = () => {
  addNPC("Mayor Alden", "Mayor", 23, 27, "pacing");
  addNPC("Trader Pippin", "Trader", 26, 26, "trading");
  addNPC("Town Guide", "Guide", 21, 24, "guiding");
  addNPC("Guard Rowan", "Guard", 19, 23, "patrolling");
  addNPC("Guard Vale", "Guard", 29, 23, "patrolling");
  addNPC("Healer Lysa", "Healer", 24, 29, "healing");
  addNPC("Wren", "Woodcutter", 18, 30, "woodcutting");
  addNPC("Milo", "Miner", 30, 30, "mining");
  addNPC("Fia", "Fisher", 26, 33, "fishing");

  addPlayer("Sera", 40, 26, "woodcutting");
  addPlayer("Bran", 46, 33, "mining");
  addPlayer("Kala", 36, 38, "fishing");
  addPlayer("Quill", 52, 28, "wandering");
};

const spawnMonsters = () => {
  const spawnPoints = [
    { type: "slime", count: 10 },
    { type: "goblin", count: 8 },
    { type: "zombie", count: 6 },
    { type: "skeleton", count: 6 },
    { type: "bat", count: 8 },
  ];
  spawnPoints.forEach((spawn) => {
    for (let i = 0; i < spawn.count; i += 1) {
      const x = rng(12, worldSize - 12);
      const y = rng(12, worldSize - 12);
      if (world[y][x] !== "grass") continue;
      monsters.push({
        type: spawn.type,
        x,
        y,
        px: x,
        py: y,
        hp: monsterTemplates[spawn.type].hp,
        dir: "down",
        frame: 0,
        roamTimer: rng(20, 200),
        target: null,
      });
    }
  });
};

const renderSkills = () => {
  skillsPanel.innerHTML = "";
  skills.forEach((skill) => {
    const div = document.createElement("div");
    div.className = "skill";
    div.textContent = `${skill}: ${player.level[skill]} (${player.xp[skill]}xp)`;
    skillsPanel.appendChild(div);
  });
};

const renderQuestLog = () => {
  questLog.innerHTML = "";
  quests.forEach((quest) => {
    const li = document.createElement("li");
    li.textContent = `${quest.name} - ${quest.status}`;
    questLog.appendChild(li);
  });
};

const renderSlots = (container, slots) => {
  container.innerHTML = "";
  slots.forEach((item) => {
    const div = document.createElement("div");
    div.className = "slot";
    div.textContent = item ? item : "";
    container.appendChild(div);
  });
};

const renderEquipment = () => {
  equipmentGrid.innerHTML = "";
  ["weapon", "shield", "tool"].forEach((slot) => {
    const div = document.createElement("div");
    div.className = "slot";
    div.textContent = equipment[slot] ? `${slot}\n${equipment[slot]}` : slot;
    equipmentGrid.appendChild(div);
  });
};

const addChat = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
};

const gainXp = (skill, amount) => {
  player.xp[skill] += amount;
  const nextLevel = player.level[skill] * 100;
  if (player.xp[skill] >= nextLevel) {
    player.level[skill] += 1;
    addChat(`${skill} level up! You're now level ${player.level[skill]}!`);
  }
  renderSkills();
};

const addItem = (itemName) => {
  const slot = inventory.findIndex((item) => item === null);
  if (slot !== -1) {
    inventory[slot] = itemName;
    renderSlots(inventoryGrid, inventory);
  } else {
    addChat("Inventory full.");
  }
};

const consumeFood = () => {
  const foods = ["Bread", "Fish"];
  const index = inventory.findIndex((item) => foods.includes(item));
  if (index === -1) {
    addChat("You have no food.");
    return;
  }
  const item = inventory[index];
  inventory[index] = null;
  player.hp = Math.min(player.maxHp, player.hp + 6);
  renderSlots(inventoryGrid, inventory);
  addChat(`You eat the ${item.toLowerCase()} and feel better.`);
};

const openDialogue = (npc) => {
  dialogue.classList.remove("hidden");
  dialogueName.textContent = npc.name;
  dialogueText.textContent = `${npc.role}: ${dialogueLines[rng(0, dialogueLines.length - 1)]}`;
};

const closeDialogue = () => {
  dialogue.classList.add("hidden");
};

const openShop = () => {
  shopModal.classList.remove("hidden");
  renderShop("buy");
};

const closeShop = () => {
  shopModal.classList.add("hidden");
};

const renderShop = (tab) => {
  shopTabs.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  shopItems.innerHTML = "";
  const shopInventory = [
    { name: "Bread", price: 8 },
    { name: "Bronze Sword", price: 40 },
    { name: "Small Shield", price: 30 },
    { name: "Bronze Pickaxe", price: 25 },
    { name: "Fishing Rod", price: 18 },
  ];
  const items = tab === "buy" ? shopInventory : inventory.filter(Boolean).map((name) => ({ name, price: 5 }));
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "shop-item";
    div.textContent = `${item.name} (${item.price}c)`;
    div.addEventListener("click", () => {
      if (tab === "buy") {
        if (player.coins >= item.price) {
          player.coins -= item.price;
          addItem(item.name);
          addChat(`Bought ${item.name}.`);
        } else {
          addChat("Not enough coins.");
        }
      } else {
        const itemIndex = inventory.findIndex((invItem) => invItem === item.name);
        if (itemIndex !== -1) {
          player.coins += item.price;
          inventory[itemIndex] = null;
          addChat(`Sold ${item.name}.`);
        }
      }
      renderSlots(inventoryGrid, inventory);
      shopCoins.textContent = `Coins: ${player.coins}`;
      if (tab === "sell") renderShop("sell");
    });
    shopItems.appendChild(div);
  });
  shopCoins.textContent = `Coins: ${player.coins}`;
};

const handleResource = (node) => {
  if (node.depleted) return;
  const template = resourceTemplates[node.type];
  gainXp(template.skill, 12);
  addItem(template.item);
  node.depleted = true;
  node.timer = 400 + rng(0, 200);
  addChat(`You gather ${template.item.toLowerCase()} from the ${node.type}.`);
};

const handleMonster = (monster) => {
  if (player.dead) return;
  monster.target = player;
  player.target = monster;
  addChat(`You engage the ${monster.type}!`);
};

const attackTarget = (attacker, target) => {
  if (!target || target.hp <= 0) return;
  const maxHit = attacker === player ? 6 + Math.floor(player.level.Attack / 2) : 4;
  const damage = rng(1, maxHit);
  target.hp -= damage;
  particles.push({ x: target.x, y: target.y, text: `-${damage}`, timer: 40 });
  if (target.hp <= 0) {
    if (target.type) {
      addChat(`You defeated the ${target.type} and loot ${monsterTemplates[target.type].loot}.`);
      addItem(monsterTemplates[target.type].loot);
      gainXp("Attack", 18);
      gainXp("Strength", 10);
      gainXp("Defense", 8);
      target.hp = 0;
      target.deadTimer = 300;
    } else {
      addChat("You collapse and wake up in Timbercross.");
      attacker.coins = Math.max(0, attacker.coins - 5);
      attacker.hp = attacker.maxHp;
      attacker.x = 24;
      attacker.y = 24;
      attacker.dead = false;
    }
  }
};

const updateEntityMovement = (entity) => {
  if (entity.path.length > 0) {
    const next = entity.path.shift();
    entity.px = entity.x;
    entity.py = entity.y;
    entity.x = next.x;
    entity.y = next.y;
    if (next.x > entity.px) entity.dir = "right";
    if (next.x < entity.px) entity.dir = "left";
    if (next.y > entity.py) entity.dir = "down";
    if (next.y < entity.py) entity.dir = "up";
    entity.frame = (entity.frame + 1) % 2;
  }
};

const updateNPCs = () => {
  npcs.forEach((npc) => {
    if (npc.task === "patrolling" && npc.path.length === 0) {
      const target = { x: npc.x + rng(-4, 4), y: npc.y + rng(-4, 4) };
      npc.path = findPath({ x: npc.x, y: npc.y }, target);
    }
    updateEntityMovement(npc);
  });
};

const updatePlayers = () => {
  players.forEach((npc) => {
    if (npc.path.length === 0 && Math.random() < 0.02) {
      const target = { x: npc.x + rng(-6, 6), y: npc.y + rng(-6, 6) };
      npc.path = findPath({ x: npc.x, y: npc.y }, target);
    }
    updateEntityMovement(npc);
  });
};

const updateMonsters = () => {
  monsters.forEach((monster) => {
    if (monster.hp <= 0) {
      monster.deadTimer -= 1;
      if (monster.deadTimer <= 0) {
        monster.hp = monsterTemplates[monster.type].hp;
        monster.x = rng(12, worldSize - 12);
        monster.y = rng(12, worldSize - 12);
        monster.deadTimer = null;
      }
      return;
    }
    monster.roamTimer -= 1;
    if (monster.roamTimer <= 0) {
      const target = { x: monster.x + rng(-5, 5), y: monster.y + rng(-5, 5) };
      monster.path = findPath({ x: monster.x, y: monster.y }, target);
      monster.roamTimer = rng(40, 200);
    }
    updateEntityMovement(monster);
    if (Math.abs(monster.x - player.x) + Math.abs(monster.y - player.y) < 2 && monster.hp > 0) {
      player.hp -= rng(1, monsterTemplates[monster.type].maxHit);
      particles.push({ x: player.x, y: player.y, text: "-" + rng(1, 3), timer: 30 });
      if (player.hp <= 0) {
        player.dead = true;
      }
    }
  });
};

const updateResources = () => {
  resources.forEach((node) => {
    if (node.depleted) {
      node.timer -= 1;
      if (node.timer <= 0) {
        node.depleted = false;
      }
    }
  });
};

const updateParticles = () => {
  particles.forEach((particle) => (particle.timer -= 1));
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].timer <= 0) particles.splice(i, 1);
  }
};

const drawTile = (x, y, type) => {
  ctx.fillStyle = tileTypes[type].color;
  ctx.fillRect(x * renderSize, y * renderSize, renderSize, renderSize);
};

const drawDecoration = (decor, screenX, screenY) => {
  const baseX = screenX * renderSize;
  const baseY = screenY * renderSize;
  ctx.fillStyle = "#1f3522";
  if (decor.type === "bush") ctx.fillRect(baseX + 8, baseY + 8, 12, 12);
  if (decor.type === "flower") {
    ctx.fillStyle = "#c65a6b";
    ctx.fillRect(baseX + 10, baseY + 12, 6, 6);
  }
  if (decor.type === "tuft") {
    ctx.fillStyle = "#2a8f2c";
    ctx.fillRect(baseX + 6, baseY + 10, 10, 10);
  }
  if (decor.type === "pebble") {
    ctx.fillStyle = "#7a7d83";
    ctx.fillRect(baseX + 10, baseY + 14, 6, 4);
  }
  if (decor.type === "stump") {
    ctx.fillStyle = "#6f4c2f";
    ctx.fillRect(baseX + 8, baseY + 10, 10, 10);
  }
  if (decor.type === "reeds") {
    ctx.fillStyle = "#6f8f4c";
    ctx.fillRect(baseX + 6, baseY + 6, 4, 12);
    ctx.fillRect(baseX + 12, baseY + 8, 4, 10);
  }
  if (decor.type === "boulder") {
    ctx.fillStyle = "#6c6f76";
    ctx.fillRect(baseX + 6, baseY + 8, 14, 12);
  }
  if (decor.type === "well") {
    ctx.fillStyle = "#6e5d47";
    ctx.fillRect(baseX + 6, baseY + 8, 12, 10);
    ctx.fillStyle = "#2d4f7a";
    ctx.fillRect(baseX + 8, baseY + 10, 8, 6);
  }
  if (decor.type === "lamp") {
    ctx.fillStyle = "#bfa14a";
    ctx.fillRect(baseX + 10, baseY + 4, 4, 18);
    ctx.fillStyle = "#f6e082";
    ctx.fillRect(baseX + 8, baseY + 2, 8, 6);
  }
  if (decor.type === "sign") {
    ctx.fillStyle = "#6e5d47";
    ctx.fillRect(baseX + 8, baseY + 4, 10, 8);
  }
  if (decor.type === "door") {
    ctx.fillStyle = "#8a6b3f";
    ctx.fillRect(baseX + 6, baseY + 8, 12, 12);
    ctx.fillStyle = "#d1c6a0";
    ctx.fillText(decor.label, baseX + 2, baseY + 30);
  }
};

const drawSprite = (entity, screenX, screenY, paletteOverride) => {
  const baseX = screenX * renderSize + 4;
  const baseY = screenY * renderSize + 2;
  const palette = paletteOverride || spritePalette;

  const armOffset = entity.frame === 0 ? 0 : 1;
  const legOffset = entity.frame === 0 ? 1 : 0;

  ctx.fillStyle = palette.armor;
  ctx.fillRect(baseX + 6, baseY + 12, 10, 12);

  ctx.fillStyle = palette.cloth;
  ctx.fillRect(baseX + 6, baseY + 24, 4, 6 + legOffset);
  ctx.fillRect(baseX + 12, baseY + 24, 4, 6 - legOffset);

  ctx.fillStyle = palette.skin;
  ctx.fillRect(baseX + 5, baseY + 8, 12, 8);
  ctx.fillStyle = palette.hair;
  ctx.fillRect(baseX + 5, baseY + 6, 12, 4);

  ctx.fillStyle = palette.eyes;
  ctx.fillRect(baseX + 8, baseY + 10, 2, 2);
  ctx.fillRect(baseX + 12, baseY + 10, 2, 2);

  ctx.fillStyle = palette.skin;
  ctx.fillRect(baseX + 2, baseY + 14, 4, 6 + armOffset);
  ctx.fillRect(baseX + 16, baseY + 14, 4, 6 - armOffset);
};

const drawMonster = (monster, screenX, screenY) => {
  const baseX = screenX * renderSize + 4;
  const baseY = screenY * renderSize + 4;
  if (monster.type === "zombie") {
    ctx.fillStyle = "#5f7f67";
    ctx.fillRect(baseX + 4, baseY + 6, 14, 14);
    ctx.fillStyle = "#324b3a";
    ctx.fillRect(baseX + 6, baseY + 10, 10, 6);
    ctx.fillStyle = "#d1d3cf";
    ctx.fillRect(baseX + 8, baseY + 8, 4, 2);
  } else {
    ctx.fillStyle = monsterTemplates[monster.type].color;
    ctx.fillRect(baseX + 6, baseY + 8, 12, 12);
    ctx.fillStyle = "#1b1e26";
    ctx.fillRect(baseX + 9, baseY + 12, 2, 2);
    ctx.fillRect(baseX + 13, baseY + 12, 2, 2);
  }
};

const drawResource = (node, screenX, screenY) => {
  if (node.depleted) return;
  const baseX = screenX * renderSize;
  const baseY = screenY * renderSize;
  ctx.fillStyle = resourceTemplates[node.type].color;
  if (node.type === "tree") ctx.fillRect(baseX + 6, baseY + 4, 12, 20);
  if (node.type === "rock") ctx.fillRect(baseX + 6, baseY + 10, 14, 12);
  if (node.type === "fish") ctx.fillRect(baseX + 8, baseY + 12, 10, 6);
};

const renderWorld = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const startX = player.x - centerOffsetX;
  const startY = player.y - centerOffsetY;

  for (let y = 0; y < viewTilesY; y += 1) {
    for (let x = 0; x < viewTilesX; x += 1) {
      const worldX = startX + x;
      const worldY = startY + y;
      if (worldX < 0 || worldY < 0 || worldX >= worldSize || worldY >= worldSize) {
        ctx.fillStyle = "#000";
        ctx.fillRect(x * renderSize, y * renderSize, renderSize, renderSize);
        continue;
      }
      drawTile(x, y, world[worldY][worldX]);
      resources
        .filter((node) => node.x === worldX && node.y === worldY)
        .forEach((node) => drawResource(node, x, y));
      decorations
        .filter((decor) => decor.x === worldX && decor.y === worldY)
        .forEach((decor) => drawDecoration(decor, x, y));
    }
  }

  const drawEntities = (list, palette) => {
    list.forEach((entity) => {
      const screenX = entity.x - startX;
      const screenY = entity.y - startY;
      if (screenX < 0 || screenY < 0 || screenX >= viewTilesX || screenY >= viewTilesY) return;
      drawSprite(entity, screenX, screenY, palette);
    });
  };

  drawEntities(players, { ...spritePalette, cloth: "#4f6c8a" });
  drawEntities(npcs, { ...spritePalette, cloth: "#6a4d8a" });

  monsters.forEach((monster) => {
    if (monster.hp <= 0) return;
    const screenX = monster.x - startX;
    const screenY = monster.y - startY;
    if (screenX < 0 || screenY < 0 || screenX >= viewTilesX || screenY >= viewTilesY) return;
    drawMonster(monster, screenX, screenY);
  });

  drawSprite(player, centerOffsetX, centerOffsetY, { ...spritePalette, cloth: "#2f6a8a" });

  particles.forEach((particle) => {
    const screenX = particle.x - startX;
    const screenY = particle.y - startY;
    if (screenX < 0 || screenY < 0 || screenX >= viewTilesX || screenY >= viewTilesY) return;
    ctx.fillStyle = "#f2d56b";
    ctx.fillText(particle.text, screenX * renderSize + 8, screenY * renderSize + 10);
  });
};

const renderMinimap = () => {
  const scaleX = minimap.width / worldSize;
  const scaleY = minimap.height / worldSize;
  miniCtx.clearRect(0, 0, minimap.width, minimap.height);
  for (let y = 0; y < worldSize; y += 1) {
    for (let x = 0; x < worldSize; x += 1) {
      miniCtx.fillStyle = tileTypes[world[y][x]].color;
      miniCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
    }
  }
  miniCtx.fillStyle = "#f2d56b";
  miniCtx.fillRect(player.x * scaleX, player.y * scaleY, 2, 2);
};

const update = () => {
  if (!player.dead) {
    if (player.path.length > 0) {
      updateEntityMovement(player);
    }
    const zone = getZone(player.x, player.y);
    if (zone !== player.zone) {
      player.zone = zone;
      addChat(`You enter ${zone}.`);
    }
    if (player.pendingAction && player.path.length === 0) {
      const { type, target } = player.pendingAction;
      if (type === "resource" && target && !target.depleted) {
        if (Math.abs(player.x - target.x) + Math.abs(player.y - target.y) <= 1) {
          handleResource(target);
          player.pendingAction = null;
        }
      }
      if (type === "monster" && target && target.hp > 0) {
        player.target = target;
        player.pendingAction = null;
      }
    }
    if (player.target && player.target.hp > 0 && Math.abs(player.x - player.target.x) + Math.abs(player.y - player.target.y) <= 1) {
      attackTarget(player, player.target);
    }
  } else {
    player.dead = false;
    player.hp = player.maxHp;
    player.x = 24;
    player.y = 24;
  }

  updateNPCs();
  updatePlayers();
  updateMonsters();
  updateResources();
  updateParticles();

  renderWorld();
  renderMinimap();
  requestAnimationFrame(update);
};

const saveGame = () => {
  const saveData = {
    player,
    inventory,
    equipment,
    bank,
  };
  localStorage.setItem("runelight-save", JSON.stringify(saveData));
  addChat("Game saved.");
};

const loadGame = () => {
  const save = localStorage.getItem("runelight-save");
  if (!save) {
    addChat("No save found.");
    return;
  }
  const data = JSON.parse(save);
  Object.assign(player, data.player);
  data.inventory.forEach((item, index) => (inventory[index] = item));
  data.bank.forEach((item, index) => (bank[index] = item));
  Object.assign(equipment, data.equipment);
  renderSlots(inventoryGrid, inventory);
  renderSlots(bankGrid, bank);
  renderEquipment();
  renderSkills();
  addChat("Loaded saved game.");
};

const spawnMusic = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (musicInterval) clearInterval(musicInterval);
  const notes = [261, 293, 329, 392, 440, 392, 329, 293];
  let index = 0;
  musicInterval = setInterval(() => {
    if (!musicEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = notes[index % notes.length];
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
    index += 1;
  }, 420);
};

const handleClick = (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / renderSize) + player.x - centerOffsetX;
  const y = Math.floor((event.clientY - rect.top) / renderSize) + player.y - centerOffsetY;

  const clickEntity = (entity) => Math.abs(entity.x - x) <= 1 && Math.abs(entity.y - y) <= 1;
  const npc = npcs.find(clickEntity);
  const monster = monsters.find((mob) => mob.x === x && mob.y === y && mob.hp > 0);
  const resource = resources.find((node) => node.x === x && node.y === y);

  if (npc) {
    openDialogue(npc);
    if (npc.role === "Trader") {
      openShop();
    }
    if (npc.role === "Healer") {
      player.hp = player.maxHp;
      addChat("Healer Lysa restores your health.");
    }
    return;
  }

  if (monster) {
    const adjacent = getAdjacentWalkable(monster.x, monster.y);
    if (adjacent) {
      player.path = findPath({ x: player.x, y: player.y }, adjacent);
      player.pendingAction = { type: "monster", target: monster };
    }
    handleMonster(monster);
    return;
  }

  if (resource && !resource.depleted) {
    const adjacent = getAdjacentWalkable(resource.x, resource.y);
    if (adjacent) {
      player.path = findPath({ x: player.x, y: player.y }, adjacent);
      player.pendingAction = { type: "resource", target: resource };
    }
    return;
  }

  if (isWalkable(x, y)) {
    player.path = findPath({ x: player.x, y: player.y }, { x, y });
    player.target = null;
  }
};

const handleChatCommand = (command) => {
  const [cmd, ...args] = command.slice(1).split(" ");
  if (cmd === "help") {
    addChat("Commands: /save, /load, /bank, /stats, /quest, /eat");
  }
  if (cmd === "save") saveGame();
  if (cmd === "load") loadGame();
  if (cmd === "bank") {
    bankGrid.scrollIntoView({ behavior: "smooth" });
  }
  if (cmd === "stats") {
    addChat(`HP: ${player.hp}/${player.maxHp}`);
  }
  if (cmd === "quest") {
    addChat("Quest log updated in the panel.");
  }
  if (cmd === "eat") {
    consumeFood();
  }
  if (cmd === "teleport") {
    const [x, y] = args.map((value) => Number(value));
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      player.x = Math.min(worldSize - 1, Math.max(0, x));
      player.y = Math.min(worldSize - 1, Math.max(0, y));
    }
  }
};

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const message = chatInput.value.trim();
    if (!message) return;
    if (message.startsWith("/")) {
      handleChatCommand(message);
    } else {
      addChat(`You: ${message}`);
    }
    chatInput.value = "";
  }
});

canvas.addEventListener("click", handleClick);

shopClose.addEventListener("click", closeShop);
shopTabs.forEach((button) =>
  button.addEventListener("click", () => {
    renderShop(button.dataset.tab);
  })
);

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  closeShop();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeShop();
    closeDialogue();
  }
});

dialogueContinue.addEventListener("click", () => {
  dialogueText.textContent = dialogueLines[rng(0, dialogueLines.length - 1)];
});

dialogueClose.addEventListener("click", closeDialogue);

toggleMusic.addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  toggleMusic.textContent = `Music: ${musicEnabled ? "On" : "Off"}`;
  if (musicEnabled) spawnMusic();
});

const init = () => {
  generateWorld();
  spawnNPCs();
  spawnMonsters();
  renderSkills();
  renderQuestLog();
  renderSlots(inventoryGrid, inventory);
  renderSlots(bankGrid, bank);
  renderEquipment();
  addChat("Welcome to Runelight Realms. Adventure awaits.");
  spawnMusic();
  update();
};

init();
