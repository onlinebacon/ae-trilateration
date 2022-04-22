import search from './clustered-2d-search.js';

const size = 700;
const { PI } = Math;
const TAU = PI*2;
const TO_RAD = PI/180;
const TO_DEG = 180/PI;
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const divOutput = document.querySelector('#output');

canvas.width = size;
canvas.height = size;

const nLatLines = 18;
const halfNLonLines = 18;

const NORMAL_MIN = -1;
const NORMAL_MAX = 1;

const coordToNormal = (lat, lon) => {
	const rad = (90 - lat)/180;
	const x = Math.sin(lon*TO_RAD)*rad;
	const y = Math.cos(lon*TO_RAD)*rad;
	return [ x, y ];
};

const normalToCoord = (x, y) => {
	const len = Math.sqrt(x*x + y*y);
	if (len === 0) return [ 90, 0 ];
	const lat = 90 - len*180;
	const dy = y/len;
	const acos = Math.acos(dy)*TO_DEG;
	const lon = x >= 0 ? acos : - acos;
	return [ lat, lon ];
};

const projectToPx = (lat, lon) => {
	const rad = (90 - lat)/360*size;
	const x = size/2 + Math.sin(lon*TO_RAD)*rad;
	const y = size/2 + Math.cos(lon*TO_RAD)*rad;
	return [ x, y ];
};

const drawGrid = () => {
	const c = size/2;
	const rad = c;
	const latLen = rad/nLatLines;
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
	const step = PI/halfNLonLines;
	ctx.beginPath();
	for (let i=0; i<halfNLonLines; ++i) {
		const dx = Math.sin(step*i);
		const dy = Math.cos(step*i);
		const ax = c + dx*size/2;
		const ay = c + dy*size/2;
		const bx = c - dx*size/2;
		const by = c - dy*size/2;
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
	}
	ctx.stroke();
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
	for (let i=1; i<=nLatLines; ++i) {
		ctx.beginPath();
		ctx.arc(c, c, i*latLen, 0, TAU);
		ctx.stroke();
	}
};

const drawCircle = (lat, lon, radius, color = '#000') => {
	const [ x, y ] = projectToPx(lat, lon);
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius/360*size, 0, TAU);
	ctx.stroke();
};

const drawSpot = (lat, lon, label, color = '#000') => {
	const [ x, y ] = projectToPx(lat, lon);
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, 2, 0, TAU);
	ctx.fill();
};

const clearCanvas = () => {
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, size, size);
};

let mapImg = null;
const drawMap = () => {
	if (mapImg == null) return;
	ctx.drawImage(mapImg, 0, 0, size, size);
};

clearCanvas();
drawGrid();

const textarea = document.querySelector('textarea');
const parseDeg = str => {
	str = str.replace(/[^\+\-\d\.sw]/ig, '\x20').trim();
	let sign = str.startsWith('-') ? -1 : 1;
	str = str.replace(/^[\-\+]\s*/, '');
	if (/^[sw]|[sw]$/i.test(str)) {
		str = str.replace(/^[sw]|[sw]$/ig, '').trim();
		sign *= -1;
	}
	let val = str.split(/\s/).map((x, i) => x*Math.pow(60, -i)).reduce((a, b) => a + b);
	return val*sign;
};

const circlesOfEqualAltitude = [];

let degToLen = 1;
const trilaterate = () => {
	const refs = circlesOfEqualAltitude.map(({ lat, lon, rad }) => ({
		coord: coordToNormal(lat, lon),
		dist: rad/180,
	}));
	const calcDist = ([ ax, ay ], [ bx, by ]) => {
		const dx = bx - ax;
		const dy = by - ay;
		return Math.sqrt(dx*dx + dy*dy);
	};
	const calcError = (x, y) => {
		const coord = [ x, y ];
		let sum = 0;
		for (const ref of refs) {
			const dif = calcDist(ref.coord, coord) - ref.dist;
			sum += dif*dif;
		}
		return sum;
	};
	const output = refs.length > 2 ? 1 : 2;
	return search({ calcError, output })
		.map(([ x, y ]) => normalToCoord(x, y))
		.sort(([ a ], [ b ]) => b - a);
};

const render = () => {
	clearCanvas();
	drawMap();
	drawGrid();
	for (let circle of circlesOfEqualAltitude) {
		const { lat, lon, rad } = circle;
		drawCircle(lat, lon, rad);
		drawSpot(lat, lon, rad);
	}
	const res = trilaterate();
	divOutput.innerHTML = '';
	for (let coord of res) {
		const [ lat, lon ] = coord.map(val => val.toFixed(5)*1);
		drawSpot(lat, lon, null, '#f00');
		divOutput.innerText += `${lat}, ${lon}\n`;
	}
};

textarea.value = `
	26°02'52"N, 50°58'18"W, 51.6192°
	7°24'40"N, 105°00'51"W, 59.0633°
`.trim().replace(/\s*\n\s*/g, '\n');

const readInput = () => {
	circlesOfEqualAltitude.length = 0;
	const lines = textarea.value.trim().split(/\s*\n\s*/);
	for (let line of lines) {
		const args = line.split(/\s*,\s*/);
		if (args.length < 3) continue;
		let [ lat, lon, rad, label, color ] = args;
		lat = parseDeg(lat);
		lon = parseDeg(lon);
		rad = parseDeg(rad);
		circlesOfEqualAltitude.push({ lat, lon, rad });
	}
	render();
};

textarea.oninput = readInput;

const img = document.createElement('img');
img.onload = () => {
	mapImg = img;
	readInput();
};
img.src = './ae-projection.png';
