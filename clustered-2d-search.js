const calcDist = ({ x: ax, y: ay }, { x: bx, y: by }) => {
	const dx = bx - ax;
	const dy = by - ay;
	return Math.sqrt(dx*dx + dy*dy);
};

const search = ({

	calcError,
	nIterations = 50,
	output = 2,
	nClusters = 8,
	shrinkFactor = 0.6,
	box = [ -1, -1, 1, 1 ],

}) => {

	const [ x0, y0, x1, y1 ] = box;
	const sx = x1 - x0;
	const sy = y1 - y0;
	let range = 0.25;

	const newPoint = (x, y) => {
		const error = calcError(x0 + x*sx, y0 + y*sy);
		const point = { x, y, error };
		return point;
	};

	const clusters = [ newPoint(0.5, 0.5) ];

	const getClosestCluster = (point) => {
		let index = -1;
		let minDist = Infinity;
		for (let i=0; i<clusters.length; ++i) {
			const cluster = clusters[i];
			const dist = calcDist(cluster, point);
			if (dist < minDist) {
				index = i;
				minDist = dist;
			}
		}
		return index;
	};

	const add = (point) => {
		if (clusters.length !== nClusters) {
			clusters.push(point);
			return;
		}
		const index = getClosestCluster(point);
		const cluster = clusters[index];
		if (point.error < cluster.error) {
			clusters[index] = point;
		}
	};

	const visit = (point) => {
		const { x: px, y: py } = point;
		for (let i=-1; i<=1; i+=2) {
			const x = px + i*range;
			if (x < 0 || x > 1) continue;
			for (let j=-1; j<=1; j+=2) {
				const y = py + j*range;
				if (y < 0 || y > 1) continue;
				add(newPoint(x, y));
			}
		}
	};

	const iterate = () => {
		for (let i=0; i<nClusters; ++i) {
			visit(clusters[i]);
		}
		range *= shrinkFactor;
	};

	for (let i=0; i<nIterations; ++i) {
		iterate();
	}

	const collapse = () => {
		let minDist = Infinity;
		let pair = null;
		const n = clusters.length;
		for (let j=1; j<n; ++j) {
			const a = clusters[j];
			for (let i=0; i<j; ++i) {
				const b = clusters[i];
				const dist = calcDist(a, b);
				if (dist < minDist) {
					minDist = dist;
					pair = [i, j];
				}
			}
		}
		const [i, j] = pair;
		const a = clusters[i];
		const b = clusters[j];
		const min = a.error < b.error ? a : b;
		clusters.splice(j, 1);
		clusters[i] = min;
	};

	while (clusters.length > output) {
		collapse();
	}

	clusters.sort((a, b) => a.error - b.error);

	return clusters.map(({ x, y }) => [ x0 + x*sx, y0 + y*sy ]);

};

export default search;
