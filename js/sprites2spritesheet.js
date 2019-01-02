/**
 * Configure a transformation function from a number of sprites to a spritesheet.
 * @param {CanvasRenderingContext2D} spritesheet The spritesheet canvas to use for manipulation.
 * @returns {Function} The function to transform images.
 */
function sprites2SpriteSheet(spritesheet){
	/**
	 * Converts a array of sprites in a single spritesheet.
	 *
	 * The sprites will have the size normalized and then will be drawn in the spritesheet.
	 * @param {Images[]} sprites The sprites to convert to a spritesheet.
	 * @param {Object} options The options to use.
	 * @returns {Promise<File>[]} A array containing a single image file, the spritesheet.
	 */
	return function(sprites, options){
		options = Object.assign({}, {
			xOffset: 0,
			xPadding: 0,
			width: 32,
			yOffset: 0,
			yPadding: 0,
			height: 32,
			columns: 4,
			bundleFiles: false,
			gmsCompatible: false
		}, options);

		[options.width, options.height] = sprites.reduce((largestSize, sprite) => {
			if (largestSize[0] < sprite.width) {
				largestSize[0] = sprite.width;
			}

			if (largestSize[1] < sprite.height) {
				largestSize[1] = sprite.height;
			}

			return largestSize;
		}, [options.width, options.height]);

		if (options.gmsCompatible) {
			sprites = [new Image(options.width, options.height), ...sprites];
		}

		if (sprites.length < options.columns) {
			options.rows = 1;
		} else {
			options.rows = Math.ceil(sprites.length / options.columns);
		}

		spritesheet.canvas.width = options.xOffset + ((options.width + options.xPadding) * options.columns);
		spritesheet.canvas.height = options.yOffset + ((options.height + options.yPadding) * options.rows);

		sprites.forEach((sprite, i) => {
			const xCenter = Math.floor(options.width / 2 - sprite.width / 2);
			const yCenter = Math.floor(options.height / 2 - sprite.height / 2);

			const column = i % options.columns;
			const row = Math.floor(i / options.columns);

			const x = options.xOffset + column * (options.width + options.xPadding) + xCenter;
			const y = options.yOffset + row * (options.height + options.yPadding) + yCenter;

			spritesheet.drawImage(sprite, x, y);
		});

		return Promise.all([new Promise((resolve, reject) => {
			try {
				spritesheet.canvas.toBlob((imageBlob) => {
					let file;

					try {
						file = new File([imageBlob], 'Sprite Sheet.png', {type: 'image/png'});
					} catch (err) { //eslint-disable-line
						file = new Blob([imageBlob], {type: 'image/png'});
						file.name = 'Sprite Sheet.png';
						file.lastModified = Date.now();
						file.lastModifiedDate = new Date(file.lastModified);
						file.webkitRelativePath = '';
					}

					file.path = sprites[0].path;
					file.width = spritesheet.canvas.width;
					file.height = spritesheet.canvas.height;

					resolve(file);
				});
			} catch (err) {
				reject(err);
			}
		})]);
	};
}
export {sprites2SpriteSheet};