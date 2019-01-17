//Init all those variables
var canvas;
var FLOOR = gebi("floor");
var WALL = gebi("wall");
var PLAYERRIGHT = gebi("playerright");
var PLAYERLEFT = gebi("playerright");
var PLAYERUP = gebi("playerup");
var PLAYERDOWN = gebi("playerdown");
var SWORD = gebi("sword");
var BLOB = gebi("blob");
var CHEST = gebi("chest");
var CHEST_OPEN = gebi("chestopen");
var BOW = gebi("bow");
var BLUEBLOB = gebi("blueblob");
var WAND = gebi("wand");
var BOMB = gebi("bomb");
var LASERGUN = gebi("lasergun");
var FORTRESS = gebi("fortress");
var HOMINGFORT = gebi("homingfort");
var SPIRAL = gebi("spiral");
var ctx;
var player;
var transparent = false;
var intermission = false;
var level = 1;
var coins = 0;
var manaCost = 20;
var hpCost = 10;
var spellsUnlocked = 3;
var spellCost = 10;
var bow;
var synth;
var backgroundMusic;
var clicked = false;
var soundOn = true;
var bomb;
var bombs = [];
var laserGun;
var enemyProjectiles = [];
const tileWidth = 16;
//W3Schoools Sound Object
function sound(src) {
  this.sound = document.createElement("audio");
  this.sound.src = src;
  this.sound.setAttribute("preload", "auto");
  this.sound.setAttribute("controls", "none");
  this.sound.style.display = "none";
  document.body.appendChild(this.sound);
  this.play = function() {
    this.sound.play();
  }
  this.stop = function() {
    this.sound.pause();
  }
}
//Jquery to call init function onload
$(init);
//Some good functions to have
function gebi(id) {
  return document.getElementById(id);
}

function randInt(min, max) {
  return min + Math.ceil(Math.random() * (max - min))
}

function drawCircle(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

function dist(x, y, x2, y2) {
  return Math.abs(x - x2) + Math.abs(y - y2)
}
//I need a two d array - let's make a function to generate one
function D2Array(length) {
  //Make an array
  var arr = [];
  for (var i = 0; i < length; i++) {
    //Add small arrays
    arr.push([])
  }
  //Return the psuedo 2D array
  return arr;
}
//Tile Class
class Tile {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
  }
  draw() {
    ctx.drawImage(this.img, this.x * tileWidth, this.y * tileWidth)
  }
}
//For type checking
class Floor extends Tile {
  constructor(x, y) {
    super(x, y, FLOOR)
  }
}
class Wall extends Tile {
  constructor(x, y) {
    super(x, y, WALL)
  }
}
//Weapon class
class Weapon {
  constructor(damage, effect, img, duration, cooldownMax) {
    this.damage = damage;
    this.effect = effect;
    this.img = img;
    this.duration = duration;
    this.cooldownMax = cooldownMax;
    this.cooldown = 0;
    this.active = false;
  }
  use() {
    if (this.cooldown < 1) {
      //Start weapon cooldown
      this.cooldown = this.cooldownMax;
      //Do additional weapon effect
      this.effect();
      var count = 0;
      var useInterval = setInterval(() => {
        this.active = true;
        //Draw weapon
        ctx.save();
        ctx.translate(player.x * tileWidth + this.img.width / 2, player.y * tileWidth + this.img.height / 2);
        ctx.rotate(player.rotation)
        ctx.drawImage(this.img, 0, 0)
        ctx.restore();
        //Check if weapon duration expired
        if (count >= this.duration * 60) {
          this.active = false;
          clearInterval(useInterval)
        }
        count++;
      }, 1)
    }
  }
}
//MORE VARIABLES
var sword = new Weapon(2, () => {}, SWORD, 3, 20)
var blocks = [];
var enemies = [];
var blockList = D2Array(32);
class Spell {
  constructor(duration, effect, antieffect, manacost) {
    this.duration = duration;
    this.effect = effect;
    this.antieffect = antieffect;
    this.manacost = manacost;
  }
  cast() {
    if (player.weapons[0] === wand) {
      var cost = this.manacost / 2;
      if (player.mana >= cost) {
        player.mana -= cost;
        this.effect();
        setTimeout(this.antieffect, this.duration);
        wand.use();
      }
    } else {
      if (player.mana >= this.manacost) {
        player.mana -= this.manacost;
        this.effect();
        setTimeout(this.antieffect, this.duration);
      }
    }
  }
}
var Transparency = new Spell(2500, () => {
  transparent = true
}, () => {
  transparent = false
}, 16)
var RowStrike = new Spell(1, () => {
  ctx.fillStyle = "White";
  ctx.fillRect(0, player.y * tileWidth, canvas.width(), tileWidth)
  enemies.forEach(enemy => {
    if (enemy.y === player.y) {
      enemy.hp -= 2;
    }
  })
}, () => {}, 1)
var ColStrike = new Spell(1, () => {
  ctx.fillStyle = "White";
  ctx.fillRect(player.x * tileWidth, 0, tileWidth, canvas.height())
  enemies.forEach(enemy => {
    if (enemy.x === player.x) {
      enemy.hp -= 2;
    }
  })
}, () => {}, 1)
var BallOfFire = new Spell(1, () => {
  playerProjectiles.push(new Fireball(player.x, player.y, player.rotation / 90 + 1))
}, () => {}, 1)
var DeepFreeze = new Spell(1, () => {
  enemies.forEach(enemy => {
    enemy.frozen = 1;
  })
}, () => {}, 2)
var EnergyBlaster = new Spell(1, () => {
  playerProjectiles.push(new EnergyBlast(player.x, player.y, player.rotation / 90 + 1))
}, () => {}, 1)
var CreateHomingMissile = new Spell(1, () => {
  playerProjectiles.push(new HomingMissile(player.x, player.y, player.rotation / 90 + 1))
}, () => {}, 2)
var Floorify = new Spell(1, () => {
  blockList[player.x][player.y] = new Floor(player.x, player.y);
  blocks.push(new Floor(player.x, player.y));
  blockList[player.x + 1][player.y] = new Floor(player.x + 1, player.y);
  blocks.push(new Floor(player.x + 1, player.y));
  blockList[player.x + 1][player.y + 1] = new Floor(player.x + 1, player.y + 1);
  blocks.push(new Floor(player.x + 1, player.y + 1));
  blockList[player.x - 1][player.y + 1] = new Floor(player.x - 1, player.y + 1);
  blocks.push(new Floor(player.x - 1, player.y + 1));
  blockList[player.x][player.y + 1] = new Floor(player.x, player.y + 1);
  blocks.push(new Floor(player.x, player.y + 1));
  blockList[player.x - 1][player.y] = new Floor(player.x - 1, player.y);
  blocks.push(new Floor(player.x - 1, player.y));
  blockList[player.x - 1][player.y - 1] = new Floor(player.x - 1, player.y - 1);
  blocks.push(new Floor(player.x - 1, player.y - 1));
  blockList[player.x][player.y - 1] = new Floor(player.x, player.y - 1);
  blocks.push(new Floor(player.x, player.y - 1));
  blockList[player.x + 1][player.y - 1] = new Floor(player.x + 1, player.y - 1);
  blocks.push(new Floor(player.x + 1, player.y - 1));
}, () => {}, 2)
var AllStrike = new Spell(1, () => {
  ctx.fillStyle = "White";
  ctx.fillRect(0, 0, canvas.width(), canvas.height())
  enemies.forEach(enemy => {
    enemy.hp -= 2;
  });
}, () => {}, 8)
var CreateBarrier = new Spell(1, () => {
  switch (player.rotation / 90 + 1) {
    case 1:
      blockList[player.x + 1][player.y] = new Wall(player.x + 1, player.y);
      blocks.push(new Wall(player.x + 1, player.y))
      break;
    case 2:
      blockList[player.x][player.y + 1] = new Wall(player.x, player.y + 1);
      blocks.push(new Wall(player.x, player.y + 1))
      break;
    case 3:
      blockList[player.x - 1][player.y] = new Wall(player.x - 1, player.y);
      blocks.push(new Wall(player.x - 1, player.y))
      break;
    case 4:
      blockList[player.x][player.y - 1] = new Wall(player.x, player.y - 1);
      blocks.push(new Wall(player.x, player.y - 1))
      break;
    default:
      blockList[player.x + 1][player.y] = new Wall(player.x + 1, player.y);
      blocks.push(new Wall(player.x + 1, player.y))
      break;
  }
}, () => {}, 1)
//Player class
class Player {
  constructor(x, y, hpMax, weapons) {
    this.x = x;
    this.y = y;
    this.hp = hpMax;
    this.hpMax = hpMax;
    this.weapons = weapons;
    this.img = PLAYERRIGHT;
    this.cooldown = 0;
    this.cooldownTime = 2;
    this.rotation = 0;
    this.mana = 2;
    this.manaMax = 2;
  }
  draw() {
    if (transparent) {
      ctx.globalAlpha = 0.5;
    }
    ctx.drawImage(this.img, this.x * tileWidth, this.y * tileWidth)
    ctx.globalAlpha = 1;
  }
  isTouchingWall(x = this.x, y = this.y) {
    if (transparent) {
      return false;
    }
    //Check if place we are checking is on screen
    if (x >= 0 && y >= 0 && x <= 31 && y <= 31) {
      //Is it a wall? If it is, then you're touching a wall.
      if (blockList[x][y] instanceof Wall) {
        return true;
      }
      return false;
    }
    //If it's not on the screen - you're TECHNICALLY not touching it
    return false;
  }
  cc() {
    enemyProjectiles.forEach(projectile => {
      if (this.x === projectile.x && this.y === projectile.y) {
        if (projectile instanceof Arrow) {
          this.hp -= 1;
          projectile.toRemove = true;
        }
        if (projectile instanceof EnemyHomingMissile) {
          this.hp -= 1;
          projectile.toRemove = true;
        }
      }
    });
  }
}
//Enemy class
class Enemy {
  constructor(x, y, img, hpMax, speed) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.hp = hpMax;
    this.hpMax = hpMax;
    this.frame = 0;
    this.speed = speed;
    this.frozen = 0;
    this.hit = false;
  }
  draw() {
    ctx.drawImage(this.img, this.x * tileWidth, this.y * tileWidth)
    if (this.frozen > 0) {
      ctx.globalAlpha = this.frozen;
      ctx.fillStyle = "Blue";
      ctx.fillRect(this.x * tileWidth, this.y * tileWidth, tileWidth, tileWidth)
      ctx.globalAlpha = 1;
    }
    //Increase frame for checking movement
    this.frame++;
    this.frozen -= 0.01;
  }
  cc() {
    if (!this.hit) {
      //If the player has drawn a sword, check if you're touching it
      if (player.weapons[0] === sword && sword.active) {
        //Are you touching the player's sword range (1 block)
        if (player.rotation === 0) {
          if (this.x === player.x + 1 && this.y === player.y) {
            this.hp -= sword.damage;
            this.hit = true;
          }
        }
        if (player.rotation === 90) {
          if (this.x === player.x && this.y === player.y + 1) {
            this.hp -= sword.damage;
            this.hit = true;
          }
        }
        if (player.rotation === 180) {
          if (this.x === player.x - 1 && this.y === player.y) {
            this.hp -= sword.damage;
            this.hit = true;
          }
        }
        if (player.rotation === 270) {
          if (this.x === player.x && this.y === player.y - 1) {
            this.hp -= sword.damage;
            this.hit = true;
          }
        }
        //Are you implaing yourself on the sword (These enemies have NO AI whatsoever)
        if (this.x === player.x && this.y === player.y) {
          this.hp -= sword.damage;
          this.hit = true;
        }
      }
      playerProjectiles.forEach(projectile => {
        if (dist(this.x, this.y, projectile.x, projectile.y) < 2) {
          this.hit = true;
          if (projectile instanceof Fireball) {
            this.hp -= 7;
            projectile.toRemove = true;
          } else if (projectile instanceof Arrow) {
            this.hp -= 1;
            projectile.toRemove = true;
          } else if (projectile instanceof EnergyBlast) {
            this.hp -= 2;
          } else if (projectile instanceof Blast) {
            this.hp -= 4;
            projectile.toRemove = true;
          } else if (projectile instanceof HomingMissile) {
            this.hp -= 4;
            projectile.toRemove = true;
          }
        }
      })
    }
  }
}
class Blob extends Enemy {
  constructor(x, y) {
    super(x, y, BLOB, 2, 2)
    //Setup left-right direction
    this.dir = randInt(0, 2)
    this.attackDone = false;
  }
  move() {
    this.hit = false;
    if (this.frozen <= 0) {
      //If the direction is 1 move right
      if (this.dir === 1) {
        //Reverse direction if touching wall or edge
        if (this.x < 31) {
          if (blockList[this.x + 1][this.y] instanceof Floor) {
            this.attackDone = false;
            this.x++;
          } else {
            this.dir = 2;
          }
        } else {
          this.dir = 2;
        }
      } else if (this.dir === 2) { // Otherwise, move left
        //Reverse direction if touching wall or edge
        if (this.x > 0) {
          if (blockList[this.x - 1][this.y] instanceof Floor) {
            this.attackDone = false;
            this.x--;
          } else {
            this.dir = 1;
          }
        } else {
          this.dir = 1;
        }
      }
    }
  }
  attack() {
    if (this.x === player.x && this.y === player.y && !this.attackDone) {
      this.attackDone = true;
      if (transparent) {
        player.hp -= 0.25;
      } else {
        player.hp -= 1;
      }
    }
  }
}
class BlueBlob extends Enemy {
  constructor(x, y) {
    super(x, y, BLUEBLOB, 4, 2)
    //Setup left-right direction
    this.dir = randInt(0, 2)
    this.attackDone = false;
  }
  move() {
    this.hit = false;
    if (this.frozen <= 0) {
      //If the direction is 1 move right
      if (this.dir === 1) {
        //Reverse direction if touching wall or edge
        if (this.y < 31) {
          if (blockList[this.x][this.y + 1] instanceof Floor) {
            this.attackDone = false;
            this.y++;
          } else {
            this.dir = 2;
          }
        } else {
          this.dir = 2;
        }
      } else if (this.dir === 2) { // Otherwise, move left
        //Reverse direction if touching wall or edge
        if (this.y > 0) {
          if (blockList[this.x][this.y - 1] instanceof Floor) {
            this.attackDone = false;
            this.y--;
          } else {
            this.dir = 1;
          }
        } else {
          this.dir = 1;
        }
      }
    }
  }
  attack() {
    if (this.x === player.x && this.y === player.y && !this.attackDone) {
      this.attackDone = true;
      if (transparent) {
        player.hp -= 0.5;
      } else {
        player.hp -= 2;
      }
    }
  }
}
class Fortress extends Enemy {
  constructor(x, y) {
    super(x, y, FORTRESS, 8, 8)
    this.attackDone = false;
  }
  move() {
    this.hit = false;
    this.attackDone = false;
  }
  attack() {
    if (!this.attackDone && Math.random() < 0.05) {
      if (player.x > this.x && this.y === player.y) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 1));
      } else if (player.x <= this.x && this.y === player.y) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 3));
      } else if (player.y > this.y && this.x === player.x) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 2));
      } else if (player.y <= player.y && this.x === player.x) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 4));
      }
      this.attackDone = true;
    }
  }
}
class HomingFort extends Enemy {
  constructor(x, y) {
    super(x, y, HOMINGFORT, 16, 8)
    this.attackDone = false;
  }
  move() {
    this.hit = false;
    this.attackDone = false;
  }
  attack() {
    if (!this.attackDone && Math.random() < 0.05 && dist(this.x, this.y, player.x, player.y) < 6) {
      enemyProjectiles.push(new EnemyHomingMissile(this.x, this.y, randInt(1, 4)))
      this.attackDone = true;
    }
  }
}
class DeathSpiral extends Enemy {
  constructor(x, y) {
    super(x, y, SPIRAL, 20, 4)
    //Setup left-right direction
    this.dir = randInt(0, 4)
    this.attackDone = false;
  }
  move() {
    var changeDir = ()=>{
      if (Math.random()<0.1){
        this.dir = randInt(0, 4);
      }
    }
    this.hit = false;
    if (this.frozen <= 0) {
      //If the direction is 1 move right
      if (this.dir === 1) {
        //Reverse direction if touching wall or edge
        if (this.x < 31) {
          if (blockList[this.x + 1][this.y] instanceof Floor) {
            this.attackDone = false;
            this.x++;
            changeDir();
          } else {
            this.dir = 2;
          }
        } else {
          this.dir = 2;
        }
      } else if (this.dir === 2) { // Otherwise, move left
        //Reverse direction if touching wall or edge
        if (this.x > 0) {
          if (blockList[this.x - 1][this.y] instanceof Floor) {
            this.attackDone = false;
            this.x--;
            changeDir();
          } else {
            this.dir = 1;
          }
        } else {
          this.dir = 1;
        }
      } else if (this.dir === 3) {
        //Reverse direction if touching wall or edge
        if (this.y < 31) {
          if (blockList[this.x][this.y + 1] instanceof Floor) {
            this.attackDone = false;
            this.y++;
            changeDir();
          } else {
            this.dir = 4;          }
        } else {
          this.dir = 4;
        }
      } else if (this.dir === 4) { // Otherwise, move left
        //Reverse direction if touching wall or edge
        if (this.y > 0) {
          if (blockList[this.x][this.y - 1] instanceof Floor) {
            this.attackDone = false;
            this.y--;
            changeDir();
          } else {
            this.dir = 3;
          }
        } else {
          this.dir = 3;
        }
      }
    }
  }
  attack() {
    if (this.x === player.x && this.y === player.y && !this.attackDone) {
      this.attackDone = true;
      if (transparent) {
        player.hp -= 0.5;
      } else {
        player.hp -= 4;
      }
    }
    if (!this.attackDone && Math.random() < 0.1) {
      if (player.x > this.x && this.y === player.y) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 1));
      } else if (player.x <= this.x && this.y === player.y) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 3));
      } else if (player.y > this.y && this.x === player.x) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 2));
      } else if (player.y <= player.y && this.x === player.x) {
        enemyProjectiles.push(new Arrow(this.x, this.y, 4));
      }
      this.attackDone = true;
    }
  }
}
class weaponDisplay {
  constructor(name, damage, cooldown, range, img, cost = 0, owned = false, selected = false) {
    this.name = name;
    this.damage = damage;
    this.cooldown = cooldown;
    this.range = range;
    this.img = img;
    this.cost = cost;
    this.owned = owned;
    this.selected = selected;
  }
  display() {
    $("#weaponDiv").html(`
      <img src="${this.img}" style="width: 100%" />
      <p class="w3-padding w3-display-topleft w3-xlarge w3-black">${this.name}:</p>
      <div class="w3-display-bottomright w3-tiny w3-black">
        <p>
          Damage: ${this.damage}
          <br />
          Cooldown: ${this.cooldown}
          <br />
          Range: ${this.range}
        </p>
      </div>
    `)
    if (this.owned) {
      $("#cost").html("Owned").attr("disabled", "")
    } else {
      $("#cost").html(`Buy for ${this.cost} <img src="coin.png" />`).removeAttr("disabled")
    }
    if (this.selected) {
      $("#select").html("Selected").attr("disabled", "")
    } else {
      $("#select").html("Select")
      $("#select").attr("disabled", "")
      if (this.owned) {
        $("#select").removeAttr("disabled")
      }
    }
  }
}

class Projectile {
  constructor(x, y, dir, drawThing) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.drawThing = drawThing;
    this.toRemove = false;
  }
  draw() {
    this.drawThing();
  }
  move() {
    switch (this.dir) {
      case 1:
        this.x += 1;
        break;
      case 2:
        this.y += 1;
        break;
      case 3:
        this.x -= 1;
        break;
      case 4:
        this.y -= 1;
        break;
      default:
        this.x += 1;
        break;
    }
  }
}
class Fireball extends Projectile {
  constructor(x, y, dir) {
    super(x, y, dir, () => {
      ctx.fillStyle = "Orange";
      drawCircle(this.x * tileWidth + tileWidth / 2, this.y * tileWidth + tileWidth / 2, tileWidth / 2 - 2)
    })
  }
}

class Arrow extends Projectile {
  constructor(x, y, dir) {
    super(x, y, dir, () => {
      ctx.fillStyle = "White";
      drawCircle(this.x * tileWidth + tileWidth / 2, this.y * tileWidth + tileWidth / 2, tileWidth / 8)
    })
  }
}
class EnergyBlast extends Projectile {
  constructor(x, y, dir) {
    super(x, y, dir, () => {
      ctx.fillStyle = "White";
      drawCircle(this.x * tileWidth + tileWidth / 2, this.y * tileWidth + tileWidth / 2, tileWidth / 2 - 2)
    })
  }
}
class Blast extends Projectile {
  constructor(x, y, dir) {
    super(x, y, dir, () => {
      ctx.fillStyle = "Yellow";
      drawCircle(this.x * tileWidth + tileWidth / 2, this.y * tileWidth + tileWidth / 2, tileWidth / 8)
    })
  }
}
class HomingMissile extends Projectile {
  constructor(x, y, dir) {
    super(x, y, dir, () => {
      ctx.fillStyle = "Green";
      drawCircle(this.x * tileWidth + tileWidth / 2, this.y * tileWidth + tileWidth / 2, tileWidth / 2 - 2)
    })
    var closestEnemy = enemies[0];
    enemies.forEach(enemy => {
      if (dist(this.x, this.y, enemy.x, enemy.y) < dist(this.x, this.y, closestEnemy.x, closestEnemy.y)) {
        closestEnemy = enemy;
      }
    });
    this.target = closestEnemy;
  }
  point() {
    var rightValue = dist(this.x + 1, this.y, this.target.x, this.target.y);
    var downValue = dist(this.x, this.y + 1, this.target.x, this.target.y);
    var leftValue = dist(this.x - 1, this.y, this.target.x, this.target.y);
    var upValue = dist(this.x, this.y - 1, this.target.x, this.target.y);
    var min = Math.min(rightValue, downValue, leftValue, upValue)
    if (rightValue === min && blockList[this.x + 1][this.y] instanceof Floor) {
      this.dir = 1;
    } else if (downValue === min && blockList[this.x][this.y + 1] instanceof Floor) {
      this.dir = 2;
    } else if (leftValue === min && blockList[this.x - 1][this.y] instanceof Floor) {
      this.dir = 3;
    } else if (upValue === min && blockList[this.x][this.y - 1] instanceof Floor) {
      this.dir = 4;
    } else {
      this.dir *= -1;
      var closestEnemy = enemies[0];
      enemies.forEach(enemy => {
        if (dist(this.x, this.y, enemy.x, enemy.y) < dist(this.x, this.y, closestEnemy.x, closestEnemy.y)) {
          closestEnemy = enemy;
        }
      });
      this.target = closestEnemy;
    }
  }
}
class EnemyHomingMissile extends Projectile {
  constructor(x, y, dir) {
    super(x, y, dir, () => {
      ctx.fillStyle = "Red";
      drawCircle(this.x * tileWidth + tileWidth / 2, this.y * tileWidth + tileWidth / 2, tileWidth / 8)
    })
    this.target = player;
  }
  point() {
    var rightValue = dist(this.x + 1, this.y, this.target.x, this.target.y);
    var downValue = dist(this.x, this.y + 1, this.target.x, this.target.y);
    var leftValue = dist(this.x - 1, this.y, this.target.x, this.target.y);
    var upValue = dist(this.x, this.y - 1, this.target.x, this.target.y);
    var min = Math.min(rightValue, downValue, leftValue, upValue)
    if (rightValue === min && blockList[this.x + 1][this.y] instanceof Floor) {
      this.dir = 1;
    } else if (downValue === min && blockList[this.x][this.y + 1] instanceof Floor) {
      this.dir = 2;
    } else if (leftValue === min && blockList[this.x - 1][this.y] instanceof Floor) {
      this.dir = 3;
    } else if (upValue === min && blockList[this.x][this.y - 1] instanceof Floor) {
      this.dir = 4;
    } else {
      this.dir *= -1;
    }
  }
}
class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.detonated = false;
  }
  draw() {
    if (!this.detonated) {
      ctx.drawImage(BOMB, this.x * tileWidth, this.y * tileWidth);
    }
  }
  cc() {
    if (!this.detonated) {
      if (dist(this.x, this.y, player.x, player.y) < 1) {
        ctx.fillStyle = "White";
        ctx.fillRect((this.x - 1) * tileWidth, (this.y - 1) * tileWidth, tileWidth * 3, tileWidth * 3)
        player.hp -= 4;
        enemies.forEach(enemy => {
          if (dist(this.x, this.y, enemy.x, enemy.y) < 2) {
            enemy.hp -= 4;
          }
        })
        this.detonated = true;
      }
      var touchingEnemy = false;
      enemies.forEach(enemy => {
        if (dist(this.x, this.y, enemy.x, enemy.y) < 1) {
          touchingEnemy = true;
          return;
        }
      })
      if (touchingEnemy) {
        ctx.fillStyle = "White";
        ctx.fillRect((this.x - 1) * tileWidth, (this.y - 1) * tileWidth, tileWidth * 3, tileWidth * 3)
        if (dist(this.x, this.y, player.x, player.y) < 2) {
          player.hp -= 4;
        }
        enemies.forEach(enemy => {
          if (dist(this.x, this.y, enemy.x, enemy.y) < 2) {
            enemy.hp -= 4;
          }
        })
        this.detonated = true;
      }
    }
  }
}

var swordDisplay = new weaponDisplay("Sword", "Small", "Moderate", "1 Block", "swordDisplay.png", 0, true, true);
var bowDisplay = new weaponDisplay("Bow", "Tiny", "Moderate", "Unlimited", "bowDisplay.png", 50);
var wandDisplay = new weaponDisplay("Wand", "Halves the mana <br> it costs to cast a spell", "NA", "NA", "wandDisplay.png", 60);
var bombDisplay = new weaponDisplay("Bomb", "High", "Long", "1 block", "bombDisplay.png", 100);
var gunDisplay = new weaponDisplay("Laser Gun", "High", "Low", "Unlimited", "gunDisplay.png", 350)
var displays = [swordDisplay, bowDisplay, wandDisplay, bombDisplay, gunDisplay]
var selectedWeaponDisplay = 0;
var playerProjectiles = []

function init() {
  //Setup variables once all the images have loaded
  canvas = $("#canvas");
  ctx = gebi("canvas").getContext('2d')
  player = new Player(0, 0, 10, [sword])
  FLOOR = gebi("floor")
  WALL = gebi("wall")
  PLAYERRIGHT = gebi("playerright");
  PLAYERLEFT = gebi("playerleft");
  PLAYERUP = gebi("playerup");
  PLAYERDOWN = gebi("playerdown");
  SWORD = gebi("sword");
  BLOB = gebi("blob");
  CHEST = gebi("chest");
  CHEST_OPEN = gebi("chestopen");
  BOW = gebi("bow");
  WAND = gebi("wand")
  BOMB = gebi("bomb");
  LASERGUN = gebi("lasergun")
  FORTRESS = gebi("fortress");
  HOMINGFORT = gebi("homingfort");
  SPIRAL = gebi("spiral");
  $("#introModal").css("display", "block")
  $("[data-toggle='tooltip']").attr("title", "???")
  $("#spell1").attr("title", `Transparency:
  You become semi-invisible. You can walk through walls.
  Magic deals 50% damage against you. Physical attacks deal 25% damage.
  Duration: 2.5s,
  Mana Cost: 16,
  Key: 1`)
  $("#spell2").attr("title", `Row Strike:
  Does 2 damage to all enemies in your row.
  Duration: Instant,
  Mana Cost: 1,
  Key: 2`)
  $("#spell3").attr("title", `Col Strike:
  Does 2 damage to all enemies in your collum.
  Duration: Instant,
  Mana Cost: 1,
  Key: 3`)
  $('[data-toggle="tooltip"]').tooltip();
  //Center the canvas!
  canvas.css("margin-left", window.innerWidth / 2 - canvas.width() / 2 - $("#weaponArea").width() * 1.25)
  setInterval(() => {
    if (window.innerWidth > 1200) {
      canvas.css("display", "inline")
      $("#healthStatus").css("float", "right")
      canvas.css("float", "none")
      canvas.css("margin-left", window.innerWidth / 2 - canvas.width() / 2 - $("#weaponArea").width() * 1.25)
    } else {
      canvas.css("margin-left", "16px")
      canvas.css("dispay", "block")
      canvas.css("float", "left")
      $("#healthStatus").css("float", "left")
    }
  }, 1)
  //Take away loading screen, display main screen
  gebi("loading").setAttribute("hidden", "")
  gebi("main").removeAttribute("hidden")
  //Add floors and walls
  genLevel(level)
  //Set up the game
  var game = setInterval(animation, 60)
}

function genWalls() {
  for (var i = 0; i < 32; i++) {
    for (var j = 0; j < 32; j++) {
      //Check if there are no walls near the wall
      var lastGood1 = i > 0 ? blockList[i - 1][j] instanceof Floor ? true : false : true;
      var lastGood2 = j > 0 ? blockList[i][j - 1] instanceof Floor ? true : false : true;
      var lastGood3 = i > 0 && j > 0 ? blockList[i - 1][j - 1] instanceof Floor ? true : false : true;
      //Check if the wall could make an impossible maze
      //If everything works out, make a wall
      if (randInt(1, 4) === 2 && i + j !== 0 && i + j !== 62 && i + j !== 1 && i + j !== 61 && i + j !== 2 && i + j !== 60 && i + j !== 3 && i + j !== 59 && lastGood1 && lastGood2 && lastGood3) {
        blockList[i][j] = new Wall(i, j)
        blocks.push(new Wall(i, j))
      } else { //Otherwise, make a floor
        blockList[i][j] = new Floor(i, j)
        blocks.push(new Floor(i, j))
      }
    }
  }
}

function genLevel(lev) {
  player.x = 0;
  player.y = 0;
  player.hp = player.hpMax;
  player.mana = player.manaMax;
  enemies = [];
  switch (lev) {
    case 1:
      genWalls();
      //Make some enemies!
      genBlobEnemies(100, 25);
      break;
    case 2:
      genWalls();
      genBlobEnemies(100, 80);
      genBlobEnemies(100, 80);
      genBlueBlobEnemies(100, 80);
      genBlueBlobEnemies(100, 80);
      break;
    case 3:
      genWalls();
      genBlobEnemies(100, 25);
      genBlueBlobEnemies(100, 25);
      break;
    case 4:
      genWalls();
      genBlobEnemies(100, 75);
      genBlueBlobEnemies(100, 75);
      genFortresses(100, 30);
      break;
    case 5:
      genWalls();
      genBlobEnemies(100, 50);
      genBlueBlobEnemies(100, 50);
      genFortresses(100, 25);
      break;
    case 6:
      genWalls();
      genBlobEnemies(100, 75);
      genBlueBlobEnemies(100, 75);
      genHomingForts(100, 60);
      break;
    case 7:
      genWalls();
      genBlobEnemies(100, 75);
      genBlueBlobEnemies(100, 75);
      genFortresses(100, 60);
      genHomingForts(100, 60);
      break;
    case 8:
      genWalls();
      genBlobEnemies(100, 75);
      genBlueBlobEnemies(100, 75);
      genDeathSpirals(100, 75);
      break;
    case 9:
      genWalls();
      genBlobEnemies(100, 75)
      genBlueBlobEnemies(100, 75);
      genFortresses(100, 100);
      genHomingForts(100, 100);
      genDeathSpirals(100, 50);
      break;
    default:
      genWalls();
      var genLevel = (level < 50) ? 100 - level: 50;
      genBlobEnemies(100, genLevel-25);
      genBlueBlobEnemies(100, genLevel-25);
      genFortresses(100, genLevel);
      genHomingForts(100, genLevel)
      genDeathSpirals(100, genLevel/2);
  }
}

function genBlobEnemies(num, freq) {
  //Num is the maximum number of enemies to add to the screen, could be less than that
  //Freq(uency) is the chance of adding an enemy
  var count = 0;
  //If the enemy isn't touching a wall, by all means, add one.
  for (var i = 0; i < 32; i++) {
    for (var j = 0; j < 32; j++) {
      if (blockList[i][j] instanceof Floor) {
        if (randInt(1, freq) === 2 && count < num && j !== 0) {
          enemies.push(new Blob(i, j))
          count++;
        }
      }
    }
  }
}

function genBlueBlobEnemies(num, freq) {
  //Num is the maximum number of enemies to add to the screen, could be less than that
  //Freq(uency) is the chance of adding an enemy
  var count = 0;
  //If the enemy isn't touching a wall, by all means, add one.
  for (var i = 0; i < 32; i++) {
    for (var j = 0; j < 32; j++) {
      if (blockList[i][j] instanceof Floor) {
        if (randInt(1, freq) === 2 && count < num && i !== 0) {
          enemies.push(new BlueBlob(i, j))
          count++;
        }
      }
    }
  }
}

function genFortresses(num, freq) {
  //Num is the maximum number of enemies to add to the screen, could be less than that
  //Freq(uency) is the chance of adding an enemy
  var count = 0;
  //If the enemy isn't touching a wall, by all means, add one.
  for (var i = 0; i < 32; i++) {
    for (var j = 0; j < 32; j++) {
      if (blockList[i][j] instanceof Floor) {
        if (randInt(1, freq) === 2 && count < num && i !== 0) {
          enemies.push(new Fortress(i, j))
          count++;
        }
      }
    }
  }
}

function genHomingForts(num, freq) {
  //Num is the maximum number of enemies to add to the screen, could be less than that
  //Freq(uency) is the chance of adding an enemy
  var count = 0;
  //If the enemy isn't touching a wall, by all means, add one.
  for (var i = 0; i < 32; i++) {
    for (var j = 0; j < 32; j++) {
      if (blockList[i][j] instanceof Floor) {
        if (randInt(1, freq) === 2 && count < num && i !== 0) {
          enemies.push(new HomingFort(i, j))
          count++;
        }
      }
    }
  }
}

function genDeathSpirals(num, freq) {
  //Num is the maximum number of enemies to add to the screen, could be less than that
  //Freq(uency) is the chance of adding an enemy
  var count = 0;
  //If the enemy isn't touching a wall, by all means, add one.
  for (var i = 0; i < 32; i++) {
    for (var j = 0; j < 32; j++) {
      if (blockList[i][j] instanceof Floor) {
        if (randInt(1, freq) === 2 && count < num && i !== 0) {
          enemies.push(new DeathSpiral(i, j));
          count++;
        }
      }
    }
  }
}

function gainReward(level) {
  coins += level * 50;
  theId = Math.random()
  $("#main").append(`<div id="${theId}" class="w3-modal w3-animate-zoom">
        <div class="w3-modal-content">
          <div class="w3-container">
            <header>
              <h1>Level ${level} Complete!</h1>
              <span onclick="gebi(${theId}).remove()" class="w3-button w3-display-topright">&times;</span>
            </header>
            <p>You got ${level*50} <img src="coin.png" style="margin-bottom: 3px"/>!</p>
          </div>
        </div>
      </div>`)
  gebi(theId).style.display = "block";
}

function animation() {
  gebi("manaBar").setAttribute("value", player.mana)
  gebi("manaBar").setAttribute("max", player.manaMax)
  gebi("hpBar").setAttribute("value", player.hp)
  gebi("hpBar").setAttribute("max", player.hpMax) //Draw the blocks
  $("#coinP").html("Coins: " + coins + " " + "<img src='coin.png' />")
  $("#maxHpVal").html("Max HP: " + player.hpMax)
  $("#hpUp").html(`Buy more 5 more HP for ${hpCost} <img src='coin.png' style='margin-bottom: 3px' />`)
  $("#maxManaVal").html("Mana Max: " + player.manaMax)
  $("#manaUp").html(`Buy more 1 more Mana for ${manaCost} <img src='coin.png' style='margin-bottom: 3px' />`)
  $("#spellUp").html(`Buy the next spell for ${spellCost} <img src="coin.png" style="margin-bottom: 3px" />`)
  blocks.forEach(block => {
    block.draw();
  })
  if (player.x === 31 && player.y === 31 && intermission === false) {
    ctx.drawImage(CHEST_OPEN, 31 * tileWidth, 31 * tileWidth)
    gainReward(level)
    intermission = true;
    level++;
    genLevel(level)
  } else {
    ctx.drawImage(CHEST, 31 * tileWidth, 31 * tileWidth)
  }
  bombs.forEach(bomb => {
    bomb.draw();
    bomb.cc();
  })
  //Draw the player
  player.draw();
  player.cc();
  if (player.hp < 1) {
    player.x = 0;
    player.y = 0;
    player.hp = player.hpMax;
  }
  //Decrease the move cooldown for the player
  player.cooldown--;
  //Decrease the weapon cooldown
  player.weapons.forEach(weapon => {
    weapon.cooldown--;
  })
  playerProjectiles.forEach(projectile => {
    projectile.draw();
    projectile.move();
    if (projectile instanceof HomingMissile) {
      projectile.point();
    }
  })
  enemyProjectiles.forEach(projectile => {
    projectile.draw();
    projectile.move();
    if (projectile instanceof EnemyHomingMissile) {
      projectile.point();
    }
  })
  for (var i = 0; i < playerProjectiles.length; i++) {
    if (playerProjectiles[i].x < 0 || playerProjectiles[i].x > 31 || playerProjectiles[i].y < 0 || playerProjectiles[i].y > 31) {
      playerProjectiles.splice(i, 1);
      continue;

    }
    if (blockList[playerProjectiles[i].x][playerProjectiles[i].y] instanceof Wall || playerProjectiles[i].toRemove) {
      if (playerProjectiles[i] instanceof Blast && Math.random() <= 0.1) {
        blockList[playerProjectiles[i].x][playerProjectiles[i].y] = new Floor(playerProjectiles[i].x, playerProjectiles[i].y);
        blocks.push(new Floor(playerProjectiles[i].x, playerProjectiles[i].y));
      }
      playerProjectiles.splice(i, 1);
      i -= 1;
    }
  }
  for (var i = 0; i < enemyProjectiles.length; i++) {
    if (enemyProjectiles[i].x < 0 || enemyProjectiles[i].x > 31 || enemyProjectiles[i].y < 0 || enemyProjectiles[i].y > 31) {
      enemyProjectiles.splice(i, 1);
      continue;

    }
    if (blockList[enemyProjectiles[i].x][enemyProjectiles[i].y] instanceof Wall || enemyProjectiles[i].toRemove) {
      if (enemyProjectiles[i] instanceof Blast && Math.random() <= 0.1) {
        blockList[enemyProjectiles[i].x][enemyProjectiles[i].y] = new Floor(enemyProjectiles[i].x, enemyProjectiles[i].y);
        blocks.push(new Floor(enemyProjectiles[i].x, enemyProjectiles[i].y));
      }
      enemyProjectiles.splice(i, 1);
      i -= 1;
    }
  }
  //Cycle through the enemies - draw them, move them, check if they have taken damage
  enemies.forEach(enemy => {
    enemy.draw();
    if (enemy.frame % enemy.speed === 0) {
      enemy.move();
    }
    enemy.cc();
    enemy.attack();
  })
  //If an enemy has less than 1 HP, this loop kills it
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].hp < 1) {
      coins += Math.ceil(enemies[i].hpMax / 2)
      enemies.splice(i, 1);
    }
  }
  for (var i = 0; i < bombs.length; i++) {
    if (bombs[i].detonated) {
      bombs.splice(i, 1)
    }
  }
  if (intermission) {
    ctx.fillStyle = "Black";
    ctx.fillRect(0, 0, canvas.width(), canvas.height());
    ctx.font = "40px Monospace"
    ctx.textAlign = "center"
    ctx.fillStyle = "White"
    ctx.fillText("Level " + level, canvas.width() / 2, canvas.height() / 2)
    if (Math.random() < 0.1) {
      intermission = false;
    }
  }
}

$(document).keydown(e => {
  if (!intermission) {
    event.preventDefault();
    //Switch player direction and move
    if (e.which === 39) {
      if (player.cooldown < 1 && !player.isTouchingWall(player.x + 1) && player.x < 31) {
        player.rotation = 0;
        player.img = PLAYERRIGHT;
        player.x += 1;
        player.cooldown = player.cooldownTime;
      }
    }
    if (e.which === 37) {
      if (player.cooldown < 1 && !player.isTouchingWall(player.x - 1) && player.x > 0) {
        player.rotation = 180;
        player.img = PLAYERLEFT;
        player.x -= 1;
        player.cooldown = player.cooldownTime;
      }
    }
    if (e.which === 38) {
      if (player.cooldown < 1 && !player.isTouchingWall(player.x, player.y - 1) && player.y > 0) {
        player.rotation = 270;
        player.img = PLAYERUP;
        player.y -= 1;
        player.cooldown = player.cooldownTime;
      }
    }
    if (e.which === 40) {
      if (player.cooldown < 1 && !player.isTouchingWall(player.x, player.y + 1) && player.y < 31) {
        player.rotation = 90;
        player.img = PLAYERDOWN;
        player.y += 1;
        player.cooldown = player.cooldownTime;
      }
    }
    //Use the weapon
    if (e.which === 32) {
      player.weapons[0].use();
    }
    if (e.which === 49) {
      Transparency.cast();
    }
    if (e.which === 50) {
      RowStrike.cast();
    }
    if (e.which === 51) {
      ColStrike.cast();
    }
    if (e.which === 52) {
      if (spellsUnlocked > 3) {
        BallOfFire.cast();
      }
    }
    if (e.which === 53) {
      if (spellsUnlocked > 4) {
        DeepFreeze.cast();
      }
    }
    if (e.which === 54) {
      if (spellsUnlocked > 5) {
        EnergyBlaster.cast();
      }
    }
    if (e.which === 55) {
      if (spellsUnlocked > 6 && enemies.length > 0) {
        CreateHomingMissile.cast();
      }
    }
    if (e.which === 56) {
      if (spellsUnlocked > 7) {
        Floorify.cast();
      }
    }
    if (e.which === 57) {
      if (spellsUnlocked > 8) {
        CreateBarrier.cast();
      }
    }
    if (e.which === 48) {
      if (spellsUnlocked > 9) {
        AllStrike.cast();
      }
    }
  }
})
$("#weaponUp").click(() => {
  if (selectedWeaponDisplay > 0) {
    selectedWeaponDisplay -= 1;
  } else {
    selectedWeaponDisplay = displays.length - 1;
  }
  displays[selectedWeaponDisplay].display()
})
$("#weaponDown").click(() => {
  if (selectedWeaponDisplay < displays.length - 1) {
    selectedWeaponDisplay += 1;
  } else {
    selectedWeaponDisplay = 0;
  }
  displays[selectedWeaponDisplay].display()
})
$("#instruct").click(() => {
  document.getElementById('guideModal').style.display = 'block';
})
$("#hpUp").click(() => {
  if (coins >= hpCost) {
    coins -= hpCost;
    player.hpMax += 5;
    player.hp = player.hpMax;
    hpCost *= 2;
  }
})
$("#manaUp").click(() => {
  if (coins >= manaCost) {
    coins -= manaCost;
    player.manaMax += 1;
    player.mana = player.manaMax;
    if (manaCost < 100) {
      manaCost += 20;
    } else {
      manaCost *= 2;
    }
  }
})
$("#spellUp").click(() => {
  if (coins >= spellCost) {
    coins -= spellCost;
    spellsUnlocked += 1;
    spellCost += 10;
    if (spellsUnlocked === 4) {
      $("#spell4").tooltip('hide').attr('data-original-title', `
      Fireball: Conjures a ball of fire that does 7 damage on impact
      Duration: Instant,
      Mana Cost: 1,
      Key: 4
      `)
      $("#spell4").html(`<svg width="15" height="15">
        <circle cx="7.5" cy="7.5" r="5" stroke="red" stroke-width="2" fill="orange" />
        </svg>`)
      $("#spell4").addClass("w3-grey")
    }
    if (spellsUnlocked === 5) {
      $("#spell5").tooltip('hide').attr('data-original-title', `
      Deep Freeze: Freezes all enemies on screen.
      Duration: 5s,
      Mana Cost: 2,
      Key: 5
      `)
      $("#spell5").html(`<svg width="15" height="15">
        <circle cx="7.5" cy="7.5" r="5" stroke="teal" stroke-width="2" fill="blue" />
        </svg>`)
      $("#spell5").addClass("w3-grey")
    }
    if (spellsUnlocked === 6) {
      $("#spell6").tooltip('hide').attr('data-original-title', `
      Energy Blast: Creates a ball of pure energy that goes through enemies,
      and deals 5 damage to anything in its path (until it hits a wall).
      Duration: Instant,
      Mana Cost: 1,
      Key: 6
      `)
      $("#spell6").html(`<svg width="15" height="15">
        <circle cx="7.5" cy="7.5" r="5" stroke="grey" stroke-width="2" fill="white" />
        </svg>`)
      $("#spell6").addClass("w3-grey")
    }
    if (spellsUnlocked === 7) {
      $("#spell7").tooltip('hide').attr('data-original-title', `
      Homing Missile: Spawns a missile that chases after the nearest enemy, dealing 4
      damage on impact.
      Duration: Instant,
      Mana Cost: 1,
      Key: 7
      `)
      $("#spell7").html(`<svg width="15" height="15">
        <circle cx="7.5" cy="7.5" r="5" stroke="yellow" stroke-width="2" fill="green" />
        </svg>`)
      $("#spell7").addClass("w3-grey")
    }
    if (spellsUnlocked === 8) {
      $("#spell8").tooltip('hide').attr('data-original-title', `
      Floorify: Turns just a 3x3 square centered on you into floor.
      Duration: Instant,
      Mana Cost: 2,
      Key: 8
      `)
      $("#spell8").html(`<img src="floor.png" />`)
      $("#spell8").addClass("w3-grey")
    }
    if (spellsUnlocked === 9) {
      $("#spell9").tooltip('hide').attr('data-original-title', `
      Create Barrier: Creates a wall in whatever direction you're facing.
      Duration: Instant,
      Mana Cost: 1,
      Key: 9
      `)
      $("#spell9").html(`<img src="wall.png" />`)
      $("#spell9").addClass("w3-grey")
    }
    if (spellsUnlocked === 10) {
      $("#spell10").tooltip('hide').attr('data-original-title', `
      All Strike: Does two damage to all enemies on the screen.
      Duration: Instant,
      Mana Cost: 6,
      Key: 0
      `)
      $("#spell10").html(`<img style="padding-right: 10px;" src="allstrike.png" />`)
      $("#spell10").addClass("w3-grey")
    }
  }
})
$("#cost").click(() => {
  if (selectedWeaponDisplay === 1) {
    if (coins >= bowDisplay.cost && !bowDisplay.owned) {
      bowDisplay.owned = true;
      coins -= bowDisplay.cost;
      bowDisplay.display();
      bow = new Weapon(2, () => {
        playerProjectiles.push(new Arrow(player.x, player.y, player.rotation / 90 + 1));
      }, BOW, 1, 5)
    }
  }
  if (selectedWeaponDisplay === 2) {
    if (coins >= wandDisplay.cost && !wandDisplay.owned) {
      wandDisplay.owned = true;
      coins -= wandDisplay.cost;
      wandDisplay.display();
      wand = new Weapon(2, () => {}, WAND, 5, 5)
    }
  }
  if (selectedWeaponDisplay === 3) {
    if (coins >= bombDisplay.cost && !bombDisplay.owned) {
      bombDisplay.owned = true;
      coins -= bombDisplay.cost;
      bombDisplay.display();
      bomb = new Weapon(2, () => {
        switch (player.rotation) {
          case 0:
            if (blockList[player.x + 1][player.y] instanceof Floor) bombs.push(new Bomb(player.x + 1, player.y));
            break;
          case 90:
            if (blockList[player.x][player.y + 1] instanceof Floor) bombs.push(new Bomb(player.x, player.y + 1));
            break;
          case 180:
            if (blockList[player.x - 1][player.y] instanceof Floor) bombs.push(new Bomb(player.x - 1, player.y))
            break;
          case 270:
            if (blockList[player.x][player.y - 1] instanceof Floor) bombs.push(new Bomb(player.x, player.y - 1))
            break;
          default:
            if (blockList[player.x][player.y] instanceof Floor) bombs.push(new Bomb(player.x, player.y))
        }
      }, BOMB, 1, 30)
    }
  }
  if (selectedWeaponDisplay === 4) {
    if (coins >= gunDisplay.cost && !gunDisplay.owned) {
      gunDisplay.owned = true;
      coins -= gunDisplay.cost;
      gunDisplay.display();
      laserGun = new Weapon(2, () => {
        playerProjectiles.push(new Blast(player.x, player.y, player.rotation / 90 + 1));
      }, LASERGUN, 1, 5)
    }
  }
})
$("#select").click(() => {
  if (selectedWeaponDisplay === 0) {
    displays.forEach(display => {
      display.selected = false;
    })
    swordDisplay.selected = true;
    player.weapons[0] = sword;
    swordDisplay.display();
  }
  if (selectedWeaponDisplay === 1) {
    displays.forEach(display => {
      display.selected = false;
    })
    bowDisplay.selected = true;
    player.weapons[0] = bow;
    bowDisplay.display();
  }
  if (selectedWeaponDisplay === 2) {
    displays.forEach(display => {
      display.selected = false;
    })
    wandDisplay.selected = true;
    player.weapons[0] = wand;
    wandDisplay.display();
  }
  if (selectedWeaponDisplay === 3) {
    displays.forEach(display => {
      display.selected = false;
    })
    bombDisplay.selected = true;
    player.weapons[0] = bomb;
    bombDisplay.display();
  }
  if (selectedWeaponDisplay === 4) {
    displays.forEach(display => {
      display.selected = false;
    })
    gunDisplay.selected = true;
    player.weapons[0] = laserGun;
    gunDisplay.display();
  }
})
$(document).click(() => {
  /*if (synth === undefined) {
    synth = new Tone.Synth();
    synth.toMaster();
    pattern = new Tone.Pattern(function(time, note) {
      synth.triggerAttackRelease(note, 0.001);
    }, ["G4", "B4", "D5", "E5", "F5", "E5", "D5", "B4", "G4"]);
    pattern.start(0)
    Tone.Transport.start();
  }*/
  if (!clicked) {
    backgroundMusic = new sound("Dramatic music.mp3")
    backgroundMusic.play();
    clicked = true;
  }
})
$("#sound").click(() => {
  console.log(soundOn)
  if (soundOn === true) {
    $("#sound").html("<i class='fa fa-volume-off w3-xlarge'></i>")
    soundOn = false;
    backgroundMusic.stop();
  } else {
    $("#sound").html("<i class='fa fa-volume-up w3-xlarge'></i>")
    soundOn = true;
    backgroundMusic.play();
  }
})
