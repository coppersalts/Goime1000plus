const cwidth = 850;
const cheight = 700;

let _xmouse = 0;
let _ymouse = 0;
const _keysDown = new Array(222).fill(false);
let _frameCount = 0;
function getTimer() { return _frameCount * 1000/60; }

const mapHeight = 400;
const mapWidth = 250;
let mapS;
const map = new Array(mapHeight);
for (let i = 0; i < mapHeight; i++) {
	map[i] = new Array(mapWidth);
}
const tileFrames = new Array(mapHeight);
for (let i = 0; i < mapHeight; i++) {
	tileFrames[i] = new Array(mapWidth);
}
const colorMap = new Array(9);
for (let i = 0; i < colorMap.length; i++) {
	colorMap[i] = new Array(11).fill(-1);
}
const portals = [
	[52,388,45,168],
	[168,366,233,389],
	[48,397,203,79],
	[237,388,101,124],
	[239,367,157,209],
	[1,397,121,322],
	[118,322,169,356],
	[130,317,230,20],
	[147,167,209,254]
];
const portalColors = [
	0x990000,
	0x000099,
	0xFFFF00,
	0x80FF00,
	0xFF7F00,
	0xFF3333,
	0x003300,
	0xFFFFFF,
	0x000000,
];
const flags = [[28,385,141,369],[93,396,52,396],[8,377,231,370],[128,174,151,168],[122,176,218,177]];
const flagNames = ['Bounceway','Ghostspike','Lie Low','Islands','Bottomless'];
const flagColors = [0x006600, 0x00CC00, 0x0088FF];
const finishFlagColors = [0x666666, 0xFFFFFF, 0xFF0000, 0xFF4000, 0xFF8000, 0xFFBF00, 0xFFFF00, 0xBFFF00, 0x80FF00, 0x40FF00, 0x00FF00, 0x00FF40, 0x00FF80, 0x00FFBF, 0x00FFFF, 0x00BFFF, 0x0080FF, 0x0040FF, 0x0000FF, 0x4000FF, 0x8000FF, 0xBF00FF, 0xFF00FF, 0xFF00BF, 0xFF0080, 0xFF0040, 0xFF0000, 0xFC000C, 0xE70D1B, 0xDB1324, 0xCE1A31, 0xC2203D, 0xB62749, 0xAA2D55, 0x9E3461, 0x923A6D, 0x864179, 0x794786, 0x6D4E92, 0x61549E, 0x555BAA, 0x4961B6, 0x3D68C2, 0x316ECE, 0x2475DB, 0x187BE7, 0x0C82F3, 0x0088FF];

async function loadSVGGraphics(path) {
	const svgString = await (await fetch('data/svg/' + path)).text();
	return new PIXI.GraphicsContext().svg(svgString);
}

const textures = {};
const colorWheelStreamAnimation = [1, 0.6, 1.3, 0.3, 0.8, 1.6, 0.3, 1.1, 0.6];
const app = new PIXI.Application();
async function init() {
	await app.init({
		width: cwidth,
		height: cheight,
		background: 0xAAAAAA,
		antialias: true,
	});
	document.body.appendChild(app.canvas);
	window.addEventListener('keydown', (event) => {
		_keysDown[event.keyCode || event.charCode] = true;
	});
	window.addEventListener('keyup', (event) => {
		_keysDown[event.keyCode || event.charCode] = false;
	});
	window.addEventListener('mousemove', (event) => {
		_xmouse = event.pageX - app.canvas.getBoundingClientRect().left;
		_ymouse = event.pageY - app.canvas.getBoundingClientRect().top;
	});
}

async function preload() {
	init();
	new PIXI.Text({
		parent: app.stage,
		label: 'loadingText',
		x: cwidth/2, y: cheight/2,
		anchor: 0.5,
		text: 'Loading...',
		style: {
			fontSize: 32,
			fill: 0x000000,
		},
	});

	// Load map
	mapS = await (await fetch('data/map.txt')).text();
	loadMap();

	// Load textures and graphics
	textures.bg = await PIXI.Assets.load('data/img/bg.jpg');
	textures.tiles = new Array(tileProperties.length);
	for (let i = 0; i < tileProperties.length; i++) {
		const frameCount = tileProperties[i][5];
		if (frameCount == 1) {
			textures.tiles[i] = await loadSVGGraphics(`tiles/t${i.toString().padStart(4, '0')}.svg`);
		} else if (frameCount > 1) {
			textures.tiles[i] = new Array(frameCount);
			for (let f = 0; f < frameCount; f++) {
				textures.tiles[i][f] = await loadSVGGraphics(`tiles/t${i.toString().padStart(4, '0')}f${f.toString().padStart(4, '0')}.svg`);
			}
		}
	}
	textures.colorWheelImage = await PIXI.Assets.load('data/img/colorwheel.jpg');
	textures.colorWheelMask = await loadSVGGraphics('tiles/t0016mask.svg');
	textures.playerShade = await loadSVGGraphics('playerShade.svg');
	textures.playerFace = await loadSVGGraphics('playerFace.svg');
	textures.flagpole = await loadSVGGraphics('flag/flagpole.svg');
	textures.flag = new Array(36);
	textures.flag2 = new Array(36);
	textures.checker = new Array(36);
	for (let f = 0; f < textures.flag.length; f++) {
		textures.flag[f] = await loadSVGGraphics(`flag/flag${f.toString().padStart(4, '0')}.svg`);
		textures.flag2[f] = await loadSVGGraphics(`flag/flag2${f.toString().padStart(4, '0')}.svg`);
		textures.checker[f] = await loadSVGGraphics(`flag/checker${f.toString().padStart(4, '0')}.svg`);
	}

	app.stage.getChildByLabel('loadingText').destroy();
	setup();
	app.ticker.add((time) => {draw()});
}

function loadMap() {
	for (let y = 0; y < mapHeight; y++) {
		for (let x = 0; x < mapWidth; x++) {
			map[y][x] = mapS.charCodeAt(y * (mapWidth + 2) + x) - 46;
		}
	}
	for (let i = 0; i < portals.length; i++) {
		map[portals[i][1]][portals[i][0]] = 100 + i * 4;
		map[portals[i][3]][portals[i][2]] = 102 + i * 4;
		map[portals[i][1] + 1][portals[i][0]] = 101 + i * 4;
		map[portals[i][3] + 1][portals[i][2]] = 103 + i * 4;
		map[portals[i][1]][portals[i][0] + 1] = 101 + i * 4;
		map[portals[i][3]][portals[i][2] + 1] = 103 + i * 4;
		map[portals[i][1] + 1][portals[i][0] + 1] = 101 + i * 4;
		map[portals[i][3] + 1][portals[i][2] + 1] = 103 + i * 4;
	}
	for (let i = 0; i < flags.length; i++) {
		map[flags[i][1]][flags[i][0]] = 200 + i;
		map[flags[i][3]][flags[i][2]] = 250 + i;
	}
}

function setup() {
	addMapVisuals();
}

let _root = {};
let player, deathFlash, bg, achievementList;
function addMapVisuals() {
	new PIXI.Graphics({
		parent: app.stage,
		context: textures.tiles[13],
		label: 'coin',
		zIndex: 9995,
		scale: 3,
		x: -10,
		y: 20,
	});
	_root.stat1 = new PIXI.Text({
		parent: app.stage,
		label: 'stat1',
		zIndex: 9999,
		x: 550, y: 0,
		anchor: {x: 1, y: 0},
		text: '',
		style: {
			fontSize: 36,
			fill: 0xFFFFFF,
		},
	});
	_root.stat2 = new PIXI.Text({
		parent: app.stage,
		label: 'stat2',
		zIndex: 9998,
		x: 550, y: 16,
		anchor: {x: 0, y: 0},
		text: '/1000',
		style: {
			fontSize: 18,
			fill: 0xFFFFFF,
		},
	});
	_root.stat3 = new PIXI.Text({
		parent: app.stage,
		label: 'stat3',
		zIndex: 9997,
		x: 5, y: 0,
		anchor: {x: 0, y: 0},
		text: '',
		style: {
			fontSize: 28,
			fill: 0x000000,
		},
	});
	_root.stat4 = new PIXI.Text({
		parent: app.stage,
		label: 'stat4',
		zIndex: 9996,
		x: 27.5, y: 40,
		anchor: {x: 0.5, y: 0},
		text: '',
		style: {
			fontSize: 28,
			fill: 0x000000,
		},
	});
	deathFlash = new PIXI.Graphics({
		parent: app.stage,
		label: 'deathFlash',
		zIndex: 9994,
		visible: false,
	})
		.rect(0, 0, 700, 700)
		.fill(0xFFFFFF);
	player = new PIXI.Container({
		parent: app.stage,
		label: 'player',
		zIndex: 9993,
	});
	new PIXI.Graphics({parent: player, label: 'backing'})
	new PIXI.Graphics({parent: player, context: textures.playerShade, label: 'playerShade'})
	const faceMask = new PIXI.Graphics({parent: player, label: 'faceMask'})
		.circle(0, -10, 10)
		.fill(0xFFFF00);
	const playerFace = new PIXI.Graphics({parent: player, context: textures.playerFace, label: 'playerFace'})
	playerFace.setMask({mask: faceMask});
	drawPlayer();
	const bgFilter = new PIXI.ColorMatrixFilter();
	bgFilter.matrix = [
		0.56, 0, 0, 0, 112/255,
		0, 0.56, 0, 0, 112/255,
		0, 0, 0.56, 0, 112/255,
		0, 0, 0, 1, 0,
	];
	bg = new PIXI.Sprite({
		texture: textures.bg,
		parent: app.stage,
		label: 'bg',
		filters: [bgFilter],
		zIndex: 0,
		scale: 5,
	});
	achievementList = new PIXI.Container({
		parent: app.stage,
		label: 'achievementList',
		zIndex: 10000,
	});
	_root.bubble = new PIXI.Container({
		parent: app.stage,
		label: 'bubble',
		zIndex: 10001,
	});
	doBubbleText(_root.bubble, -bubblePointLength);
	achievementList.x = 700;
	achievementListSprite = new PIXI.Sprite({parent: achievementList});
	achievementListBitmap = new PIXI.Graphics({parent: achievementList});
	for (let i = 0; i < 1000; i++) drawach(i, achievements[i]);
	flushAchievementList();
	for (let y = 0; y < mapHeight / 10; y++) {
		for (let x = 0; x < mapWidth / 10; x++) {
			const newPiece = new PIXI.Container({
				parent: app.stage,
				label: `mapPiece${x},${y}`,
				zIndex: y * mapWidth + x + 1,
				visible: false,
			});
			for (let y2 = 0; y2 < 10; y2++) {
				for (let x2 = 0; x2 < 10; x2++) {
					const x3 = x * 10 + x2
					const y3 = y * 10 + y2;
					if (map[y3][x3] >= 1) {
						const newTile = new PIXI.Container({
							parent: newPiece,
							label: `tile${x2},${y2}`,
							zIndex: y2 * 10 + x2,
							x: x2 * 25,
							y: y2 * 25,
						});
						if (tileProperties[map[y3][x3]]?.[5] > 1) tileFrames[y3][x3] = {cf: 0, playing: false, update: false};
						addTile(newTile, map[y3][x3]);
					}
				}
			}
		}
	}
}

function addTile(container, tileType) {
	if (tileType < tileProperties.length && tileProperties[tileType][5] > 0) {
		const frameCount = tileProperties[tileType][5];
		new PIXI.Graphics({parent: container, label: 'main', zIndex: 1, context: frameCount == 1 ? textures.tiles[tileType] : textures.tiles[tileType][0]})
	}
	if (tileType == 16) {
		const mask = new PIXI.Graphics({parent: container, label: 'mask', context: textures.colorWheelMask});
		const img = new PIXI.Sprite({
			parent: container,
			texture: textures.colorWheelImage,
			label: 'colors',
			anchor: 0.5,
			scale: 0.375,
			x: 37.45, y: -39.65,
		});
		img.setMask({mask: mask});
		new PIXI.Graphics({
			parent: container,
			label: 'stream',
			// x: 50.05, y: -109.9,
			x: 37.5, y: -109.9,
		});
		setColorWheel(container);
	}
	if (tileType == 19) {
		new PIXI.Graphics({parent: container, label: 'tileCanvas', zIndex: 0})
			.clear()
			.rect(0, 0, 25, 25)
			.fill(0xFFFFFF);
	}
	if (tileType >= 100 && tileType < 200 && tileType % 2 == 0) {
		const portalType = Math.floor((tileType - 100) / 4);
		container.tint = portalColors[portalType];
		const innerRadius = 14.65;
		const portalStatic = new PIXI.Graphics({parent: container, zIndex: 1, label: 'portalStatic', x: 25, y: 25})
			.circle(0, 0, innerRadius)
			.fill({color: 0xFFFFFF, alpha: 0.3})
			.circle(0, 0, 18.35)
			.fill(0xFFFFFF)
			.circle(0, 0, innerRadius)
			.cut();
		const gradient = new PIXI.FillGradient({
				type: 'linear',
				start: { x: 0, y: 0 },
				end: { x: 0, y: 1 },
				colorStops: [
					{ offset: 0, color: '0xFFFFFF00' },
					{ offset: 0.5, color: 0xFFFFFF },
				],
				textureSpace: 'local'
		});
		for (let i = 0; i < 8; i++) {
			portalStatic
				.translateTransform(0, -18.3)
				.rotateTransform((Math.PI * 2 * i) / 8)
				.rect(-3.65, -3.65, 7.3, 7.3)
				.fill(gradient)
				.resetTransform();
		}
		const gradient2 = new PIXI.FillGradient({
				type: 'radial',
				// center: {x: 26.5, y: 26.5},
				// outerRadius: 26.5,
				colorStops: [
					{ offset: 0.69, color: '0xFFFFFF30' },
					{ offset: 1, color: '0xFFFFFF00' },
				],
				textureSpace: 'local'
		});
		for (let i = 0; i < 3; i++) {
			new PIXI.Graphics({parent: container, label: 'rotate' + i, x: 25, y: 25, angle: 45 * (i == 2 ? -3 : i)})
				.circle(3.7, 0, 26.5)
				.fill(gradient2);
		}
	}
	if (tileType >= 200 && tileType < 250) {
		new PIXI.Graphics({parent: container, label: 'flagpole', zIndex: 1, context: textures.flagpole});
		new PIXI.Graphics({parent: container, label: 'flag', zIndex: 0, context: textures.flag[0]});
		new PIXI.Text({
			parent: container,
			zIndex: 2,
			text: flagNames[tileType - 200],
			x: 44.3, y: -10.8,
			anchor: 0.5,
			style: {
				fontSize: 10,
				fill: 0xFFFFFF,
			},
		});
		setFlagColor(container, 0, 0);
	} else if (tileType >= 250 && tileType < 300) {
		new PIXI.Graphics({parent: container, label: 'flagpole', zIndex: 2, context: textures.flagpole});
		new PIXI.Graphics({parent: container, label: 'flag', zIndex: 0, context: textures.flag2[0]});
		new PIXI.Graphics({parent: container, label: 'checker', zIndex: 1, context: textures.checker[0]});
		setFlagColor(container, 1, 0);
	}
}

class GoimePlayer{
	constructor(vx, vy, cx, cy, cr, ax, ay, onob, jumpPower) {
		this.vx = vx;
		this.vy = vy;
		this.cx = cx;
		this.cy = cy;
		this.cr = cr;
		this.ax = ax;
		this.ay = ay;
		this.onob = onob;
		this.jumpPower = jumpPower;
	}

	jump() {
		this.vy = -this.jumpPower;
		this.onob = false;
	}
}

let sx = 3750;
let sy = 8124;
const p = new GoimePlayer(0,0,sx,sy,0,0,0,false,8);
let num2 = 0;
let cameraX = sx - 350;
let cameraXV = 0;
let cameraY = sy - 440;
let oldCameraX = 0;
let oldCameraY = 0;
let oldXmouse = 0;
let oldYmouse = 0;
const gravity = 0.5;
const friction = 0.85;
const power = 0.6;
const panpower = 50;
let ghost = 0;
let ghostKey = false;
let timer = 0;
let timerl = 0;
let timerr = 0;
let noAchTimer = 0;
let noAchTimerStart = getTimer();
let noDeathTimer = 0;
let noDeathTimerStart = getTimer();
let flashTimer = 100;
let portalTimer = 0;
let noCoinTimer = 0;
let noCoinTimerStart = getTimer();
let freefallTimer = 0;
let money = 0;
let money2 = 0;
let deathCount = 0;
const colorPower = 0.004;
let colorc = 0.16666666666666666;
let pColor = 0.16666666666666666;
let colorMin = 0.16666666666666666;
let colorMax = 0.16666666666666666;
let pColorCountInMainCanvas = 0;
let colorCountInMainCanvas = 0;
let changedColor = true;
let curCourse = -1;
const completedCourses = new Array(flags.length).fill(false);
const colors = [
	[[0x101010,0x404040,0x909090,0xD0D0D0],[0x000000,0x202029,0x707070,0xC0C0C0]],
	[[0x0055BB,0x0088FF,0x00FFFF,0xFFFFFF],[0x003388,0x0055BB,0x00FFFF,0xFFFFFF]]];
const numbers = [[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],[[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],[[1,1,0],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],[[1,1,0],[0,0,1],[1,1,0],[0,0,1],[1,1,0]],[[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],[[1,1,1],[1,0,0],[1,1,0],[0,0,1],[1,1,0]],[[0,1,0],[1,0,0],[1,1,0],[1,0,1],[0,1,0]],[[1,1,1],[0,0,1],[0,0,1],[0,1,0],[0,1,0]],[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],[[0,1,0],[1,0,1],[0,1,1],[0,0,1],[0,1,0]]];
const achievements = new Array(1000).fill(false);
const achShowing = new Array(0);
let achCount = 0;
const startTimer = getTimer();
// [0] solid
// [1] hurts
// [2] is trampoline
// [3] (unused)
// [4] impermeable to ghosts
// [5] frame count
const tileProperties = [
	[false,false,false,true, false,0 ], // . Air
	[true, false,false,true, false,1 ], // / Red tile
	[true, false,false,true, false,1 ], // 0 Green tile
	[true, false,false,true, false,1 ], // 1 Gray spikes
	[false,true, false,true, false,1 ], // 2 Yellow tile
	[true, false,false,true, false,1 ], // 3 Gray tile
	[true, false,false,true, false,1 ], // 4 Wood tile
	[true, false,true, true, false,11], // 5 Trampoline
	[false,true, false,true, false,1 ], // 6 Fire
	[true, false,false,true, false,1 ], // 7 White tile
	[true, false,false,true, false,1 ], // 8 Light blue tile
	[true, false,false,true, true, 1 ], // 9 Black tile
	[false,true, false,true, true, 1 ], // : Dark spikes
	[false,false,false,true, false,1 ], // ; Coin
	[true, false,false,true, false,2 ], // < Spawn point (left)
	[true, false,false,true, false,2 ], // = Spawn point (right)
	[true, false,false,true, false,1 ], // > Color wheel
	[true, false,false,true, false,0 ], // ? Tangible invisible tile
	[true, false,false,true, false,1 ], // @ Temporary tile
	[false,false,false,true, false,1 ], // A Paintable tile
	[false,false,false,true, false,1 ], // B Unused and unpaintable paintable tile duplicate
	[false,false,false,false,false,1 ], // C Guy
];
const achievementNames = ["Best thing ever","Bonk","Bouncy ball","To the left!","Going the right way","Painful landing","Full sprint","Very painful landing","Play for a second","A minute minute","Uneventful","The inevitable","Ouch!","Die from starvation","Boing!","Red Zone","Don\'t get splinters","Green zone","Yellow zone","Migration","More details","Bright blue bubble","Gray zone","Survive","Survive and thrive","Supernatural","Revival","Ghostly death","Paranormal step","Empty list","Ghosts cheat death","Left smush","Right smush","Blue zone","Join the work force","I hate nickels","Penny pincher","Teleporter","Splash of color","Across the rainbow","Bull in a china shop","Unemployed","A colorful way to die","No one can die twice...","Clumsy","White zone","Very clumsy","Too clumsy","Way too clumsy","Coin collector","Coin snatcher","Leave a mark","A big canvas","A second coat","Uniform painter","Paint everywhere","Multicolor","Ghost make bad painters","Exotic ghost","Extremely painful landing","Bounceway","Ghostspike","Lie Low","Islands","Bottomless","Superbonk","Finish line","Giving it a try","Daredevil meets doom","Ghosts in the portal","Seeing red","Juicy Orange","N","Green with Envy","Waterdrop","Pale blue dot","You are a grape","Fuchsiania"];
const achievementDescriptions = ["Start playing this game.","Hit your head on a ceiling.","Jump.","Move left.","Move right.","Land.","Reach maximum running speed.","Land from a high distance.","Until you get to the second second!","Play for a minute.","Don\'t get an achievement for ten seconds.","Die.","Touch a deadly block.","Die from falling into the abyss.","Bounce on a trampoline.","Walk on red land.","Walk on wood.","Walk on green land.","Walk on yellow land.","Set a different spawn point.","Roll over an achievement.","Roll over an achieved achievement.","Walk on gray land.","Don\'t die for ten seconds.","Don\'t die for thirty seconds.","Become a ghost.","Turn from ghost to normal.","Die as a ghost.","Land as a ghost (on black land).","Get the list of recent achievements blank.","Be in front of a spikeball as a ghost.","Press against a wall to the left.","Press against a wall to the right.","Walk on blue land.","Collect a coin.","Collect five coins.","Collect all 100 coins.","Use a portal.","Paint yourself a different color.","Paint yourself all possible colors.","Destroy a temporary block.","Go thirty seconds without collecting a coin.","Die as a color other than yellow.","Die twice.","Die five times.","Walk on white land.","Die 25 times.","Die 50 times.","Die 100 times.","Collect 10 coins","Collect 20 coins.","Paint a canvas.","Paint the main canvas.","Paint a canvas twice with different colors.","Paint the main canvas entirely one color.","Paint the entire main canvas.","Get two colors visible on the main canvas.","Try to paint as a ghost.","Be a ghost as a color other than yellow.","Land from falling for three whole seconds.","Complete the \"Bounceway\" course.","Complete the \"Ghostspike\" course.","Complete the \"Lie Low\" course.","Complete the \"Islands\" course.","Complete the \"Bottomless\" course.","Hit your head on a ceiling very hard.","Complete a course.","Start a course by going to a green flag.","Die after starting a course.","Use a portal as a ghost.","Paint yourself red.","Paint yourself orange.","D","Paint yourself green.","Paint yourself cyan.","Paint yourself blue.","Paint yourself purple.","Paint yourself pink."];
let achievementListBitmap, achievementListSprite;
const bubbleRadius = 10;
const bubblePointLength = 15;
const bubblePointWidth = 15;
const bubbleBoxLength = 280;
const bubbleBoxWidth = 45;
const bubblePreviewSize = 0.8;
const stageOffsetX = -25;
const stageOffsetY = -25;
const swap = new Array(1000);
for (let i = 0; i < 1000; i++) {
	swap[i] = i;
}

// Game functions
function drawach(num, t) {
	var _loc2_ = getX(num);
	var _loc1_ = getY(num);
	var _loc3_ = checkerboard(_loc2_,_loc1_);
	achievementListBitmap
		.rect(_loc2_ * 15, _loc1_ * 7, 15, 7)
		.fill(getColor(t, _loc3_, 0));
	achievementListBitmap
		.rect(_loc2_ * 15, _loc1_ * 7, 14, 6)
		.fill(getColor(t, _loc3_, 1));
	num2 = num + 1;
	drawnum(num2 % 10,_loc2_ * 15 + 11,_loc1_ * 7 + 1,getColor(t,_loc3_,2));
	if (num2 >= 10) {
		drawnum(Math.floor(num2 / 10) % 10,_loc2_ * 15 + 7,_loc1_ * 7 + 1,getColor(t,_loc3_,2));
	}
	if (num2 >= 100) {
		drawnum(Math.floor(num2 / 100) % 10,_loc2_ * 15 + 3,_loc1_ * 7 + 1,getColor(t,_loc3_,2));
	}
	if (num2 >= 1000) {
		drawnum(1,_loc2_ * 15,_loc1_ * 7 + 1,getColor(t,_loc3_,2));
	}
}
function drawnum(num, nx, ny, color) {
	var _loc2_ = 0;
	var _loc1_;
	while (_loc2_ < 3) {
		_loc1_ = 0;
		while (_loc1_ < 5) {
			if (numbers[num][_loc1_][_loc2_] == 1) {
				 achievementListBitmap.rect(_loc2_ + nx, _loc1_ + ny, 1, 1).fill(color);
			}
			_loc1_ = _loc1_ + 1;
		}
		_loc2_ = _loc2_ + 1;
	}
}
function flushAchievementList() {
	achievementListSprite.texture = app.renderer.textureGenerator.generateTexture({
		target: achievementList,
		frame: new PIXI.Rectangle(0, 0, 150, 700)
	});
	achievementListBitmap.clear();
}
function drawbubble(num, bubble, yoffset, pointer) {
	var _loc7_ = getX(num);
	var _loc6_ = getY(num);
	var _loc5_ = checkerboard(_loc7_,_loc6_);
	const backing = bubble.getChildByLabel('backing')
	backing.clear();
	backing.moveTo((- bubblePointLength) * pointer,(- bubblePointWidth) / 2 + yoffset);
	if (pointer == 1) {
		backing.lineTo(0,0);
	}
	backing
		.lineTo((- bubblePointLength) * pointer,bubblePointWidth / 2 + yoffset)
		.lineTo((- bubblePointLength) * pointer,bubbleBoxWidth / 2 - bubbleRadius + yoffset)
		.quadraticCurveTo((- bubblePointLength) * pointer,bubbleBoxWidth / 2 + yoffset,(- bubblePointLength) * pointer - bubbleRadius,bubbleBoxWidth / 2 + yoffset)
		.lineTo((- bubblePointLength) * pointer - bubbleBoxLength + bubbleRadius,bubbleBoxWidth / 2 + yoffset)
		.quadraticCurveTo((- bubblePointLength) * pointer - bubbleBoxLength,bubbleBoxWidth / 2 + yoffset,(- bubblePointLength) * pointer - bubbleBoxLength,bubbleBoxWidth / 2 - bubbleRadius + yoffset)
		.lineTo((- bubblePointLength) * pointer - bubbleBoxLength,(- bubbleBoxWidth) / 2 + bubbleRadius + yoffset)
		.quadraticCurveTo((- bubblePointLength) * pointer - bubbleBoxLength,(- bubbleBoxWidth) / 2 + yoffset,(- bubblePointLength) * pointer - bubbleBoxLength + bubbleRadius,(- bubbleBoxWidth) / 2 + yoffset)
		.lineTo((- bubblePointLength) * pointer - bubbleRadius,(- bubbleBoxWidth) / 2 + yoffset)
		.quadraticCurveTo((- bubblePointLength) * pointer,(- bubbleBoxWidth) / 2 + yoffset,(- bubblePointLength) * pointer,(- bubbleBoxWidth) / 2 + bubbleRadius + yoffset)
		.fill(getColor(achievements[num],_loc5_,1));
	bubble.getChildByLabel('achNumText').text = num + 1 + '  ' + achievementNames[num];
	bubble.getChildByLabel('achNumText').y = -bubbleBoxWidth / 2 + yoffset;
	bubble.getChildByLabel('achNumText').style.fill = getColor(achievements[num],_loc5_,3);
	if (achievements[num]) {
		bubble.getChildByLabel('descriptionText').text = achievementDescriptions[num];
		bubble.getChildByLabel('descriptionText').y = -bubbleBoxWidth / 2 + yoffset + 23;
	} else {
		bubble.getChildByLabel('descriptionText').text = '';
	}
}
function checkerboard(bx, by) {
	if ((bx + by) / 2 == Math.floor((bx + by) / 2)) {
		return 0;
	}
	return 1;
}
function getIndex(x, y) {
	return x + y * 10;
}
function getX(index) {
	return index % 10;
}
function getY(index) {
	return Math.floor(index / 10);
}
function getColor(t, color, fillType) {
	var _loc1_ = !t ? 0 : 1;
	return colors[_loc1_][color][fillType];
}
function getYoffset(y) {
	if (y < bubbleBoxWidth / 2) {
		return bubbleBoxWidth / 2 - y;
	}
	if (y >= cheight - bubbleBoxWidth / 2) {
		return cheight - bubbleBoxWidth / 2 - y;
	}
	return 0;
}
function getChunkX(num, camera, leng) {
	var _loc1_ = Math.floor(camera / 250) + num;
	if (_loc1_ < 0) {
		_loc1_ += leng;
	} else if (_loc1_ >= leng) {
		_loc1_ -= leng;
	}
	return _loc1_;
}
function getChunkY(num, camera, leng) {
	var _loc1_ = Math.floor(camera / 250) + num;
	return _loc1_;
}
function makeSideInvisible(i) {
	for (let _loc3_ = 0; _loc3_ < 4; _loc3_++) {
		let _loc4_ = getChunkX(i, oldCameraX, mapWidth / 10);
		let _loc2_ = getChunkY(_loc3_, oldCameraY, mapHeight / 10);
		if (_loc2_ >= 0 && _loc2_ < mapHeight / 10) {
			app.stage.getChildByLabel(`mapPiece${_loc4_},${_loc2_}`).visible = false;
		}
	}
}
function makeTBInvisible(i) {
	for (let _loc3_ = 0; _loc3_ < 4; _loc3_++) {
		let _loc4_ = getChunkX(_loc3_, oldCameraX,mapWidth / 10);
		let _loc2_ = getChunkY(i, oldCameraY, mapHeight / 10);
		if (_loc2_ >= 0 && _loc2_ < mapHeight / 10) {
			app.stage.getChildByLabel(`mapPiece${_loc4_},${_loc2_}`).visible = false;
		}
	}
}
function drawmap() {
	if (getChunkX(0,cameraX,mapWidth / 10) > getChunkX(0,oldCameraX,mapWidth / 10) || getChunkX(0,cameraX,mapWidth / 10) < getChunkX(0,oldCameraX,mapWidth / 10)) {
		makeSideInvisible(0);
		makeSideInvisible(3);
	}
	if (getChunkY(0,cameraY,mapHeight / 10) > getChunkY(0,oldCameraY,mapHeight / 10)) {
		makeTBInvisible(0);
	}
	if (getChunkY(0,cameraY,mapHeight / 10) < getChunkY(0,oldCameraY,mapHeight / 10)) {
		makeTBInvisible(3);
	}
	for (let _loc5_ = 0; _loc5_ < 4; _loc5_++) {
		for (let _loc3_ = 0; _loc3_ < 4; _loc3_++) {
			let _loc4_ = getChunkX(_loc3_, cameraX, mapWidth / 10);
			let _loc2_ = getChunkY(_loc5_, cameraY, mapHeight / 10);
			if (_loc2_ >= 0 && _loc2_ < mapHeight / 10) {
				const mapPiece = app.stage.getChildByLabel(`mapPiece${_loc4_},${_loc2_}`);
				mapPiece.visible = true;
				mapPiece.x = -cameraX % 250 + _loc3_ * 250 + stageOffsetX;
				mapPiece.y = -(cameraY + 25000) % 250 + _loc5_ * 250 + stageOffsetY;
			}
		}
	}
}
function clearMap() {
	for (let _loc3_ = 0; _loc3_ < mapHeight / 10; _loc3_++) {
		for (let _loc2_ = 0; _loc2_ < mapWidth / 10; _loc2_++) {
			app.stage.getChildByLabel(`mapPiece${_loc2_},${_loc3_}`).visible = false;
		}
	}
}
function loopOver(x, minX, maxX) {
	var _loc1_;
	if (minX == 0) {
		_loc1_ = x % maxX;
		return _loc1_ >= 0 ? _loc1_ : _loc1_ + maxX;
	}
	var _loc5_ = x - minX;
	var _loc3_ = maxX - minX;
	_loc1_ = _loc5_ % _loc3_;
	_loc1_ = looped >= 0 ? _loc1_ : _loc1_ + _loc3_;
	return _loc1_ + minX;
}
function blockAt(x, y) {
	var _loc1_ = Math.floor(y / 25);
	if (_loc1_ < 0 || _loc1_ >= mapHeight) {
		return 0;
	}
	var _loc2_ = Math.floor(x / 25);
	_loc2_ = loopOver(_loc2_,0,mapWidth);
	return map[_loc1_][_loc2_];
}
function setBlockAt(x, y, t) {
	var _loc1_ = Math.floor(y / 25);
	var _loc2_;
	if (_loc1_ >= 0 && _loc1_ < mapHeight) {
		_loc2_ = Math.floor(x / 25);
		_loc2_ = loopOver(_loc2_,0,mapWidth);
		map[_loc1_][_loc2_] = t;
		if (tileProperties[t][5] > 0) {
			blockMovieAt(x,y).getChildByLabel('main').context = tileProperties[t][5] == 1 ? textures.tiles[t] : textures.tiles[t][0];
		} else {
			removeBlockAt(x,y);
		}
	}
}
function blockMovieAt(x, y) {
	let _loc2_ = Math.floor(y / 25);
	if (_loc2_ < 0 || _loc2_ > mapHeight) return 0;
	let _loc3_ = Math.floor(x / 25);
	_loc3_ = loopOver(_loc3_,0,mapWidth);
	return app.stage
		.getChildByLabel(`mapPiece${Math.floor(_loc3_ / 10)},${Math.floor(_loc2_ / 10)}`)
		.getChildByLabel(`tile${_loc3_ % 10},${_loc2_ % 10}`);
}
function getTileY(y) {
	let _loc2_ = Math.floor(y / 25);
	if (_loc2_ < 0 || _loc2_ > mapHeight) return;
	return _loc2_;
}
function getTileX(x) {
	let _loc3_ = Math.floor(x / 25);
	_loc3_ = loopOver(_loc3_, 0, mapWidth);
	return _loc3_;
}
function removeBlockAt(x, y) {
	var _loc2_ = Math.floor(y / 25);
	if (_loc2_ < 0 || _loc2_ > mapHeight) {
		return 0;
	}
	var _loc3_ = Math.floor(x / 25);
	_loc3_ = loopOver(_loc3_,0,mapWidth);
	map[_loc2_][_loc3_] = 0;
	app.stage
		.getChildByLabel(`mapPiece${Math.floor(_loc3_ / 10)},${Math.floor(_loc2_ / 10)}`)
		.getChildByLabel(`tile${_loc3_ % 10},${_loc2_ % 10}`).destroy();
}
function achget(num) {
	var _loc2_ = swap[num];
	if (!achievements[_loc2_]) {
		console.log(achievementNames[num]);
		noAchTimerStart = getTimer();
		drawach(_loc2_,true);
		flushAchievementList();
		achievements[_loc2_] = true;
		achShowing.push([_loc2_, 700 + bubbleBoxLength,lowestPossibleAch()]);

		const bubble = new PIXI.Container({
			parent: app.stage,
			label: 'bubble' + achCount,
			zIndex: 11000 + achCount,
			y: achShowing[achShowing.length - 1][2],
			scale: bubblePreviewSize,
		});
		doBubbleText(bubble,0);
		drawbubble(_loc2_,bubble,0,0);
		achCount++;
	}
}
function lowestPossibleAch() {
	var _loc3_ = 700 - bubbleBoxWidth / 2 * bubblePreviewSize;
	var _loc4_ = false;
	var _loc2_;
	var _loc1_;
	while (!_loc4_) {
		_loc2_ = true;
		_loc1_ = 0;
		while (_loc1_ < achShowing.length) {
			if (achShowing[_loc1_][1] > bubbleBoxLength / 2 && achShowing[_loc1_][2] == _loc3_) {
				_loc2_ = false;
			}
			_loc1_ = _loc1_ + 1;
		}
		if (_loc2_) {
			_loc4_ = true;
			return _loc3_;
		}
		_loc3_ -= bubbleBoxWidth * bubblePreviewSize;
	}
}
function die() {
	p.cx = sx;
	p.cy = sy - 1;
	cameraX = p.cx - 350 + stageOffsetX;
	cameraY = p.cy - 460 + stageOffsetY;
	clearMap();
	p.vx = 0;
	p.vy = 0;
	p.onob = false;
	p.cr = 0;
	player.alpha = 1;
	timerl = 0;
	timerr = 0;
	noDeathTimerStart = getTimer();
	// setFlag(); // This function does not exist.
	flashTimer = 0;
	deathCount++;
	achget(11);
	if (deathCount >= 2) {
		achget(43);
	}
	if (deathCount >= 5) {
		achget(44);
	}
	if (deathCount >= 25) {
		achget(46);
	}
	if (deathCount >= 50) {
		achget(47);
	}
	if (deathCount >= 100) {
		achget(48);
	}
	if (curCourse >= 0) {
		achget(68);
	}
	if (ghost == 1) {
		achget(27);
	}
	if (pColor <= 0.13333333333333333 || pColor >= 0.1875) {
		achget(42);
	}
	ghost = 0;
	// Commented out because camerax doesn't exist (though cameraX does)
	// if (camerax < mapWidth * 12.5) {
		// camerax += mapWidth * 25;
	// }
}
function blockUnderType(x, y, t) {
	if (blockAt(x,y) == t) {
		return 2;
	}
	if (x % 25 >= 16 && blockAt(x + 25,y) == t) {
		return 3;
	}
	if (x % 25 <= 9 && blockAt(x - 25,y) == t) {
		return 1;
	}
}
function blockStraightUnderType(x, y, t) {
	if (blockAt(x,y) == t) {
		return true;
	}
}
function blockUnderProp(x, y, prop) {
	if (tileProperties[blockAt(x,y)]?.[prop]) {
		return 2;
	}
	if (x % 25 >= 16 && tileProperties[blockAt(x + 25,y)]?.[prop]) {
		return 3;
	}
	if (x % 25 <= 9 && tileProperties[blockAt(x - 25,y)]?.[prop]) {
		return 1;
	}
}
function playerIntersect() {
	return tileProperties[blockAt(p.cx - 10,p.cy - 1)]?.[0] || tileProperties[blockAt(p.cx + 10,p.cy - 1)]?.[0] || tileProperties[blockAt(p.cx - 10,p.cy - 20)]?.[0] || tileProperties[blockAt(p.cx + 10,p.cy - 20)]?.[0];
}
function getCoinAt(x, y) {
	if (blockAt(x,y) == 13) {
		setBlockAt(x,y,0);
		money++;
		money2++;
		noCoinTimerStart = getTimer();
		achget(34);
		if (money2 >= 5) {
			achget(35);
		}
		if (money2 >= 10) {
			achget(49);
		}
		if (money2 >= 20) {
			achget(50);
		}
		if (money2 >= 100) {
			achget(36);
		}
	}
}
function getPortalAt(x, y) {
	var _loc2_ = blockAt(x,y);
	var _loc3_;
	var _loc1_;
	if (_loc2_ >= 100 && _loc2_ < 200) {
		if (portalTimer >= 15) {
			achget(37);
			if (ghost == 1) {
				achget(69);
			}
			_loc3_ = Math.floor(_loc2_ / 2) - 50;
			_loc1_ = _loc3_ - _loc3_ % 2 * 2 + 1;
			p.cx = portals[Math.floor(_loc1_ / 2)][_loc1_ % 2 * 2] * 25 + 25;
			p.cy = portals[Math.floor(_loc1_ / 2)][_loc1_ % 2 * 2 + 1] * 25 + 40;
			cameraX = p.cx - 370;
			cameraY = p.cy - 440;
			portalTimer = 0;
			clearMap();
			flashTimer = 0;
		}
	} else {
		portalTimer++;
	}
}
function solidAt(x, y) {
	return tileProperties[blockAt(x,y)]?.[0] && (ghost == 0 || tileProperties[blockAt(x,y)]?.[4]);
}
function painfulAt(x, y) {
	return tileProperties[blockAt(x,y)]?.[1] && (ghost == 0 || tileProperties[blockAt(x,y)]?.[4]);
}
function minutes() {
	return Math.floor(timer / 60000);
}
function seconds() {
	return Math.floor(timer % 60000 / 1000);
}
function secondTenths() {
	return Math.floor(timer % 1000 / 100);
}
function doBubbleText(bub, xoffset) {
	new PIXI.Graphics({
		parent: bub,
		label: 'backing',
	});
	new PIXI.Text({
		parent: bub,
		label: 'achNumText',
		x: -bubbleBoxLength + 3 + xoffset,
		y: -bubbleBoxWidth / 2,
		text: 'asd',
		style: {
			fontSize: 20,
			fill: 0xFFFFFF,
		},
	});
	new PIXI.Text({
		parent: bub,
		label: 'descriptionText',
		x: -bubbleBoxLength + 3 + xoffset,
		y: -bubbleBoxWidth / 2,
		text: 'asd',
		style: {
			fontSize: 14,
			fill: 0xFFFFFF,
			leading: -3,
			wordWrapWidth: bubbleBoxLength - 5,
			wordWrap: true,
		},
	});
}
function turnSpawnOff(x, y) {
	const _loc1_ = setSpawnI(x,y);
	const tileX = getTileX(x + _loc1_);
	const tileX2 = getTileX(x + _loc1_ + 25);
	const tileY = getTileY(y + 5);
	if (tileFrames[tileY][tileX].cf != 0) {
		tileFrames[tileY][tileX].update = true;
		tileFrames[tileY][tileX2].update = true;
		tileFrames[tileY][tileX].cf = 0;
		tileFrames[tileY][tileX2].cf = 0;
	}
}
function turnSpawnOn(x, y) {
	var _loc1_ = setSpawnI(x,y);
	const tileX = getTileX(x + _loc1_);
	const tileX2 = getTileX(x + _loc1_ + 25);
	const tileY = getTileY(y + 5);
	if (tileFrames[tileY][tileX].cf != 1) {
		tileFrames[tileY][tileX].update = true;
		tileFrames[tileY][tileX2].update = true;
		tileFrames[tileY][tileX].cf = 1;
		tileFrames[tileY][tileX2].cf = 1;
	}
	sx = Math.floor((x + _loc1_ + 25) / 25) * 25;
	sy = Math.floor(y / 25) * 25;
}
function setSpawnI(x, y) {
	if (blockStraightUnderType(x,y + 5,14)) {
		return 0;
	}
	if (blockStraightUnderType(x,y + 5,15)) {
		return -25;
	}
	if (blockStraightUnderType(x - 25,y + 5,15)) {
		return -50;
	}
	if (blockStraightUnderType(x + 25,y + 5,14)) {
		return 25;
	}
}
function vanish(x, y) {
	if (blockAt(x,y) == 18) {
		removeBlockAt(x,y);
		achget(40);
	}
}
function curCol(x, y) {
	return colorMap[Math.floor(y / 25) - 163][Math.floor(x / 25) - 83];
}
function setCurCol(x, y, i) {
	colorMap[Math.floor(y / 25) - 163][Math.floor(x / 25) - 83] = i;
}
function paint(x, y) {
	if (blockAt(x,y) == 19) {
		if (ghost == 0) {
			if (pColor != curCol(x,y)) {
				achget(51);
				achget(52);
				if (curCol(x,y) == -1) {
					colorCountInMainCanvas++;
					if (colorCountInMainCanvas >= 99) {
						achget(55);
					}
				} else {
					achget(53);
				}
				blockMovieAt(x,y).getChildByLabel('tileCanvas')
					.clear()
					.rect(0, 0, 25, 25)
					.fill(getRGB(pColor));
				if (changedColor) {
					getPColorCountInMainCanvas(pColor);
				}
				changedColor = false;
				if (getSimpleColor(curCol(x,y)) != getSimpleColor(pColor)) {
					pColorCountInMainCanvas++;
				}
				if (pColorCountInMainCanvas >= 99) {
					achget(54);
				}
				setCurCol(x,y,pColor);
			}
		} else {
			achget(57);
		}
	}
}
function getPColorCountInMainCanvas(color) {
	var _loc3_ = 0;
	var _loc2_ = 0;
	var _loc1_;
	while (_loc2_ < 9) {
		_loc1_ = 0;
		while (_loc1_ < 11) {
			if (getSimpleColor(colorMap[_loc2_][_loc1_]) == getSimpleColor(color)) {
				_loc3_ = _loc3_ + 1;
			}
			if (colorMap[_loc2_][_loc1_] != pColor && colorMap[_loc2_][_loc1_] != -1) {
				achget(56);
			}
			_loc1_ = _loc1_ + 1;
		}
		_loc2_ = _loc2_ + 1;
	}
	pColorCountInMainCanvas = _loc3_;
}
function setColorWheel(m) {
	m.getChildByLabel('colors').angle = -colorc * 360 + 90;
	pColor = (colorc + 1000) % 1;
	if (getSimpleColor(pColor) != 2) {
		achget(getSimpleColor(pColor) + 70);
	}
	changedColor = true;
	if (timer > 3) {
		achget(38);
		if (colorc < colorMin) {
			colorMin = colorc;
		}
		if (colorc > colorMax) {
			colorMax = colorc;
		}
		if (colorMax - colorMin >= 1) {
			achget(39);
		}
	}
	drawPlayer();

	m.getChildByLabel('stream')
		.clear()
		.rect(-2.5, 0, 5, 150)
		.fill(getRGB((colorc + 1000) % 1));
}
function drawPlayer() {
	player.getChildByLabel('backing')
		.clear()
		.circle(0, -10, 10)
		.fill(getRGB(pColor))
		.stroke(0x000000);
}
function getRGB(a) {
	const _loc4_ = Math.floor(Math.min(Math.max(2 - Math.abs(a - 0.3333333333333333) * 6,0),1) * 255);
	const _loc1_ = Math.floor(Math.min(Math.max(2 - Math.abs(a - 0.6666666666666666) * 6,0),1) * 255);
	const _loc3_ = Math.floor(Math.min(Math.max(Math.abs(a - 0.5) * 6 - 1,0),1) * 255);
	return _loc3_ * 0x10000 + _loc4_ * 0x100 + _loc1_;
}
function getSimpleColor(i) {
	if (i == -1) {
		return -1;
	}
	if (i < 0.041666666666666664 || i >= 0.9583333333333334) {
		return 0;
	}
	if (i < 0.125) {
		return 1;
	}
	if (i < 0.192) {
		return 2;
	}
	if (i < 0.421) {
		return 3;
	}
	if (i < 0.5833333333333334) {
		return 4;
	}
	if (i < 0.696) {
		return 5;
	}
	if (i < 0.7916666666666666) {
		return 6;
	}
	return 7;
}
function checkFlag(x, y) {
	var _loc1_ = blockAt(x,y);
	if (_loc1_ >= 200 && _loc1_ < 250) {
		achget(67);
		if (curCourse >= 0 && curCourse != _loc1_ - 200) {
			if (completedCourses[curCourse]) {
				setFlagColor(blockMovieAt(flags[curCourse][0] * 25,flags[curCourse][1] * 25), 0, 2);
				setFlagColor(blockMovieAt(flags[curCourse][2] * 25,flags[curCourse][3] * 25), 1, finishFlagColors.length - 1);
			} else {
				setFlagColor(blockMovieAt(flags[curCourse][0] * 25,flags[curCourse][1] * 25), 0, 0);
				setFlagColor(blockMovieAt(flags[curCourse][2] * 25,flags[curCourse][3] * 25), 1, 0);
			}
		}
		curCourse = _loc1_ - 200;
		setFlagColor(blockMovieAt(x, y), 0, 1);
		setFlagColor(blockMovieAt(flags[curCourse][2] * 25,flags[curCourse][3] * 25), 1, 1);
	}
	if (_loc1_ == curCourse + 250) {
		achget(66);
		if (curCourse == 0) achget(60);
		if (curCourse == 1) achget(61);
		if (curCourse == 2) achget(62);
		if (curCourse == 3) achget(63);
		if (curCourse == 4) achget(64);
		setFlagColor(blockMovieAt(x, y), 1, 2);
		setFlagColor(blockMovieAt(flags[curCourse][0] * 25,flags[curCourse][1] * 25), 0, 2);
		completedCourses[curCourse] = true;
		curCourse = -1;
	}
}

function setFlagColor(m, flagType, frame) {
	const flag = m.getChildByLabel('flag')
	flag.tint = (flagType == 0 ? flagColors : finishFlagColors)[frame];
	flag.dataFrame = frame;
}

function draw() {
	achget(0);
	if (achShowing.length == 0) {
		achget(29);
	}
	if (ghost == 1 && blockAt(p.cx,p.cy - 5) == 4) {
		achget(30);
	}
	if (ghost == 2 && !playerIntersect()) {
		ghost = 0;
	}
	if (ghost == 1 && p.onob) {
		achget(28);
	}
	var _loc3_ = 0;
	var _loc2_;
	while (_loc3_ < achShowing.length) {
		_loc2_ = achCount - achShowing.length + _loc3_;
		if (achShowing[_loc3_][1] < 0) {
			app.stage.getChildByLabel('bubble' + _loc2_)?.destroy();
			achShowing.splice(0, 1);
		}
		_loc3_ = _loc3_ + 1;
	}
	_loc3_ = 0;
	while (_loc3_ < achShowing.length) {
		_loc2_ = achCount - achShowing.length + _loc3_;
		if (achShowing[_loc3_][1] > bubbleBoxLength * bubblePreviewSize + 0.01) {
			achShowing[_loc3_][1] -= (achShowing[_loc3_][1] - bubbleBoxLength * bubblePreviewSize) / 10;
		} else {
			achShowing[_loc3_][1] -= (bubbleBoxLength * bubblePreviewSize - achShowing[_loc3_][1] + 2) / 10;
		}
		const bubble = app.stage.getChildByLabel('bubble' + _loc2_);
		if (bubble) bubble.x = achShowing[_loc3_][1];
		_loc3_ = _loc3_ + 1;
	}
	if (Math.abs(_xmouse - 774.5) <= 74.5 && Math.abs(_ymouse - 349.5) <= 349.5) {
		if (oldXmouse != _xmouse || oldYmouse != _ymouse || noAchTimer == 1) {
			_root.bubble.visible = true;
			_loc3_ = getIndex(Math.floor((_xmouse - 700) / 15),Math.floor(_ymouse / 7));
			drawbubble(_loc3_, _root.bubble, getYoffset(_ymouse),1);
			_root.bubble.x = _xmouse;
			_root.bubble.y = _ymouse;
			achget(20);
			if (achievements[_loc3_]) {
				achget(21);
			}
		}
	} else if (oldXmouse >= 700) {
		_root.bubble.visible = false;
	}
	if (_keysDown[37]) {
		p.vx -= power * (1 + timerl * 0.02);
		timerl = Math.min(timerl + 1,100);
		timerr = 0;
		p.cr = Math.max(p.cr - 0.8,-8);
		achget(3);
	} else {
		timerl = 0;
	}
	if (_keysDown[39]) {
		p.vx += power * (1 + timerr * 0.02);
		timerr = Math.min(timerr + 1,100);
		timerl = 0;
		p.cr = Math.min(p.cr + 0.8,8);
		achget(4);
	} else {
		timerr = 0;
	}
	if ((_keysDown[38] || _keysDown[32]) && p.onob) {
		p.jump();
		achget(2);
	}
	if (_keysDown[71]) {
		if (!ghostKey) {
			if (ghost == 1) {
				if (playerIntersect()) {
					ghost = 2;
				} else {
					ghost = 0;
				}
				player.alpha = 1;
				achget(26);
			} else if (ghost == 0) {
				ghost = 1;
				player.alpha = 0.5;
				achget(25);
				if (pColor <= 0.1666 || pColor >= 0.1667) {
					achget(58);
				}
			}
		}
		ghostKey = true;
	} else {
		ghostKey = false;
	}
	p.vx *= friction;
	if (!p.onob) {
		p.vy = Math.min(p.vy + gravity,20);
		if (p.vy > 0) {
			freefallTimer++;
		}
	}
	if (Math.abs(p.vx) >= 10.1) {
		achget(6);
	}
	p.cx += p.vx;
	p.cy += p.vy;
	if (p.cy >= mapHeight * 25 + 500) {
		achget(13);
		die();
	}
	if (p.vy > p.cy % 25 && (solidAt(p.cx,p.cy) && !solidAt(p.cx,p.cy - 25) || p.cx % 25 >= 16 && (solidAt(p.cx + 25,p.cy) && !solidAt(p.cx + 25,p.cy - 25)) || p.cx % 25 <= 9 && (solidAt(p.cx - 25,p.cy) && !solidAt(p.cx - 25,p.cy - 25)))) {
		achget(5);
		if (p.vy > 17) {
			achget(7);
		}
		if (blockUnderType(p.cx,p.cy,1) > 0) {
			achget(15);
		}
		if (blockUnderType(p.cx,p.cy,2) > 0) {
			achget(16);
		}
		if (blockUnderType(p.cx,p.cy,3) > 0) {
			achget(17);
		}
		if (blockUnderType(p.cx,p.cy,5) > 0) {
			achget(18);
		}
		if (blockUnderType(p.cx,p.cy,6) > 0) {
			achget(22);
		}
		if (blockUnderType(p.cx,p.cy,10) > 0) {
			achget(33);
		}
		if (blockUnderType(p.cx,p.cy,9) > 0) {
			achget(45);
		}
		if (freefallTimer > 80) {
			achget(59);
		}
		p.onob = true;
		p.cy = Math.floor(p.cy / 25) * 25;
		p.vy = 0;
		freefallTimer = 0;
	}
	if (p.onob && (blockUnderType(p.cx,p.cy,14) > 0 || blockUnderType(p.cx,p.cy,15))) {
		if (p.cy != 8125 || Math.abs(p.cx - 3375) > 50) {
			achget(19);
		}
		turnSpawnOff(sx,sy);
		turnSpawnOn(p.cx,p.cy);
	}
	if (ghost == 0) {
		_loc3_ = blockUnderProp(p.cx,p.cy,2);
		if (_loc3_ > 0) {
			achget(14);
			const tileX = getTileX(p.cx + (_loc3_ * 25 - 50));
			const tileY = getTileY(p.cy);
			if (tileFrames[tileY][tileX]) {
				tileFrames[tileY][tileX].cf = 1;
				tileFrames[tileY][tileX].playing = true;
				tileFrames[tileY][tileX].update = true;
			}
			p.cy = Math.floor((p.cy - 10) / 25) * 25;
			p.vy = -14.7;
		}
	}
	if (p.onob && !solidAt(p.cx,p.cy) && (p.cx % 25 <= 17 || !solidAt(p.cx + 25,p.cy)) && (p.cx % 25 >= 8 || !solidAt(p.cx - 25,p.cy))) {
		p.onob = false;
	}
	if (p.vy < 0 && (solidAt(p.cx,p.cy - 20) || p.cx % 25 >= 16 && solidAt(p.cx + 25,p.cy - 20) || p.cx % 25 <= 9 && solidAt(p.cx - 25,p.cy - 20))) {
		p.cy = Math.floor((p.cy + 30) / 25) * 25 - 5;
		achget(1);
		if (p.vy < -9) {
			achget(65);
		}
		p.vy = 0;
	}
	if (p.vx > 0 && (solidAt(p.cx + 10,p.cy) && p.cy % 25 > 0 || solidAt(p.cx + 10,p.cy - 25) && p.cy % 25 < 20)) {
		if (blockAt(p.cx - 40,p.cy) == 16 && p.onob) {
			colorc += colorPower;
			setColorWheel(blockMovieAt(p.cx - 40,p.cy));
		}
		if (blockAt(p.cx - 40,p.cy - 25) == 16 && p.onob) {
			colorc += colorPower;
			setColorWheel(blockMovieAt(p.cx - 40,p.cy - 25));
		}
		p.vx = 0;
		p.cx = Math.floor((p.cx - 15) / 25) * 25 + 15;
		achget(32);
		timerr = 0;
	}
	if (p.vx < 0 && (solidAt(p.cx - 10,p.cy) && p.cy % 25 > 0 || solidAt(p.cx - 10,p.cy - 25) && p.cy % 25 < 20)) {
		if (blockAt(p.cx - 10,p.cy) == 16 && p.onob) {
			colorc -= colorPower;
			setColorWheel(blockMovieAt(p.cx - 10,p.cy));
		}
		if (blockAt(p.cx - 10,p.cy - 25) == 16 && p.onob) {
			colorc -= colorPower;
			setColorWheel(blockMovieAt(p.cx - 10,p.cy - 25));
		}
		p.vx = 0;
		p.cx = Math.ceil((p.cx + 15) / 25) * 25 - 15;
		achget(31);
		timerl = 0;
	}
	if (painfulAt(p.cx - 8,p.cy - 2) || painfulAt(p.cx + 8,p.cy - 2) || painfulAt(p.cx - 8,p.cy - 18) || painfulAt(p.cx + 8,p.cy - 18)) {
		die();
		achget(12);
	}
	if (ghost == 0) {
		getCoinAt(p.cx + 10,p.cy);
		getCoinAt(p.cx - 10,p.cy);
		getCoinAt(p.cx + 10,p.cy - 20);
		getCoinAt(p.cx - 10,p.cy - 20);
	}
	getPortalAt(p.cx,p.cy - 10);
	vanish(p.cx,p.cy);
	paint(p.cx,p.cy - 10);
	checkFlag(p.cx - 10,p.cy - 5);
	checkFlag(p.cx - 10,p.cy - 30);
	checkFlag(p.cx + 10,p.cy - 5);
	checkFlag(p.cx + 10,p.cy - 30);
	oldCameraX = cameraX;
	oldCameraY = cameraY;
	cameraXV = 370 - p.ax;
	if (cameraXV > mapWidth * 12.5) {
		cameraXV -= mapWidth * 25;
	}
	if (cameraXV < (-mapWidth) * 12.5) {
		cameraXV += mapWidth * 25;
	}
	cameraX -= Math.min(Math.max(cameraXV / 8,- panpower),panpower);
	cameraY -= Math.min(Math.max((460 - Math.min(Math.max(freefallTimer - 40,0) * 10,500) - p.ay) / 8,- panpower),panpower);
	if (cameraX < 0) {
		cameraX += mapWidth * 25;
	}
	if (cameraX > mapWidth * 25) {
		cameraX -= mapWidth * 25;
	}
	if (p.cx < 0) {
		p.cx += mapWidth * 25;
	}
	if (p.cx > mapWidth * 25) {
		p.cx -= mapWidth * 25;
	}
	p.ax = (p.cx - cameraX + mapWidth * 25) % (mapWidth * 25) + stageOffsetX;
	p.ay = p.cy - cameraY + stageOffsetY;
	player.x = p.ax;
	player.y = p.ay;
	player.getChildByLabel('playerFace').y = -10 + p.vy * 0.4;
	player.getChildByLabel('playerFace').x = p.cr;
	bg.x = (Math.max(Math.min(-cameraX / 10, 0), -625)) * 5;
	bg.y = (-cameraY / 10 - 150) * 5;
	drawmap();
	_root.stat1.text = achCount;
	if (seconds() < 10) {
		_root.stat3.text = minutes() + ":0" + seconds() + "." + secondTenths();
	} else {
		_root.stat3.text = minutes() + ":" + seconds() + "." + secondTenths();
	}
	_root.stat4.text = money;
	oldXmouse = _xmouse;
	oldYmouse = _ymouse;
	timer = getTimer() - startTimer;
	noAchTimer = getTimer() - noAchTimerStart;
	noDeathTimer = getTimer() - noDeathTimerStart;
	noCoinTimer = getTimer() - noCoinTimerStart;
	if (timer >= 1000) {
		achget(8);
	}
	if (timer >= 60000) {
		achget(9);
	}
	if (noAchTimer >= 10000) {
		achget(10);
	}
	if (noDeathTimer >= 10000) {
		achget(23);
	}
	if (noDeathTimer >= 30000) {
		achget(24);
	}
	if (noCoinTimer >= 1800) {
		achget(41);
	}
	if (flashTimer == 0) {
		deathFlash.visible = true;
		deathFlash.alpha = 1;
	} else if (flashTimer < 30) {
		deathFlash.alpha = ((30 - flashTimer) * 3.3333333333333335) / 100;
	} else if (flashTimer == 30) {
		deathFlash.visible = false;
	}
	flashTimer++;
	if (_keysDown[16]) {
		p.vy -= 1;
	}

	for (let y = 0; y < mapHeight; y++) {
		for (let x = 0; x < mapWidth; x++) {
			if (tileFrames[y][x]) {
				if (tileFrames[y][x].playing) {
					tileFrames[y][x].cf = (tileFrames[y][x].cf + 1) % tileProperties[map[y][x]][5];
					if (tileFrames[y][x].cf == 0) tileFrames[y][x].playing = false;
				}
				if (tileFrames[y][x].playing || tileFrames[y][x].update) {
					blockMovieAt(x*25, y*25).getChildByLabel('main').context = textures.tiles[map[y][x]][tileFrames[y][x].cf];
					tileFrames[y][x].update = false;
				}
			}
			const tileType = map[y][x];
			if (tileType == 16) { // Maybe also add a check here for if it's on screen?
				blockMovieAt(x*25, y*25).getChildByLabel('stream').scale = {x: colorWheelStreamAnimation[_frameCount % colorWheelStreamAnimation.length], y: 1};
			}
			if (tileType >= 100 && tileType < 200 && tileType % 2 == 0) {
				blockMovieAt(x*25, y*25).getChildByLabel('rotate0').angle += 360/49;
				blockMovieAt(x*25, y*25).getChildByLabel('rotate1').angle += -720/49;
				blockMovieAt(x*25, y*25).getChildByLabel('rotate2').angle += -360/49;
			}
			if (tileType >= 200 && tileType < 250) { // Maybe also add a check here for if it's on screen?
				blockMovieAt(x*25, y*25).getChildByLabel('flag').context = textures.flag[_frameCount % textures.flag.length];
			} else if (tileType >= 250 && tileType < 300) { // Maybe also add a check here for if it's on screen?
				const flag = blockMovieAt(x*25, y*25).getChildByLabel('flag')
				flag.context = textures.flag2[_frameCount % textures.flag.length];
				blockMovieAt(x*25, y*25).getChildByLabel('checker').context = textures.checker[_frameCount % textures.flag.length];
				if (flag.dataFrame >= 2 && flag.dataFrame < finishFlagColors.length - 1) {
					setFlagColor(flag.parent, 1, flag.dataFrame + 1);
				}
			}
		}
	}
	_frameCount++;
}

window.addEventListener('load', ()=>{ preload(); });
