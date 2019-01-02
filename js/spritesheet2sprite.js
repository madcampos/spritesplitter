/**
 * Configure a transformation function from a spritesheet to a number of sprites.
 * @param {CanvasRenderingContext2D} spritesheet The spritesheet canvas to use for manipulation.
 * @param {CanvasRenderingContext2D} sprite The sprite canvas to use por manipulation.
 * @returns {Function} The function to transform images.
 */
function spriteSheet2Sprites(spritesheet, sprite){
	/**
	 * Transforms a spritesheet in an array of images.
	 *
	 * The spritesheet will be sliced based on the options passed and the resulting images will be returned.
	 * @param {Image} spriteSheetImage The Spritesheet to be sliced.
	 * @param {Object} options The options to use.
	 * @returns {Promise<File>[]} The resulting image files.
	 */
	return function(spriteSheetImage, options){
		const sprites = [];

		options = Object.assign({}, {
			xOffset: 0,
			xPadding: 0,
			width: 32,
			yOffset: 0,
			yPadding: 0,
			height: 32,
			autoCalcSpritesheet: false,
			columns: 4,
			rows: 4,
			bundleFiles: false,
			gmsCompatible: false
		}, options);

		if (options.autoCalcSpritesheet) {
			options.columns = spriteSheetImage.width / (options.width + options.xPadding);
			options.rows = spriteSheetImage.height / (options.height + options.yPadding);
		}

		options.width = sprite.canvas.width = spriteSheetImage.width / options.columns;
		options.height = sprite.canvas.height = spriteSheetImage.height / options.rows;

		spritesheet.canvas.width = spriteSheetImage.width;
		spritesheet.canvas.height = spriteSheetImage.height;

		spritesheet.drawImage(spriteSheetImage, 0, 0);

		for (let i = 0; i < options.rows; i++) {
			for (let j = 0; j < options.columns; j++) {
				const x = options.xOffset + ((options.width + options.xPadding) * j);
				const y = options.yOffset + ((options.height + options.yPadding) * i);
				sprite.putImageData(spritesheet.getImageData(x, y, options.width, options.height), 0, 0);

				/*eslint-disable no-loop-func*/
				sprites.push(new Promise((resolve, reject) => {
					try {
						sprite.canvas.toBlob((imageBlob) => {
							let file;

							try {
								file = new File([imageBlob], `${i}${j}-${spriteSheetImage.name}`, {type: 'image/png'});
							} catch (err) { //eslint-disable-line
								file = new Blob([imageBlob], {type: 'image/png'});
								file.name = `${i}${j}-${spriteSheetImage.name}`;
								file.lastModified = Date.now();
								file.lastModifiedDate = new Date(file.lastModified);
								file.webkitRelativePath = '';
							}

							file.path = spriteSheetImage.path;
							file.width = sprite.canvas.width;
							file.height = sprite.canvas.height;

							resolve(file);
						});
					} catch (err) {
						reject(err);
					}
				}));
				/*eslint-disable no-loop-func*/
			}
		}

		return Promise.all(sprites);
	};
}

export {spriteSheet2Sprites};