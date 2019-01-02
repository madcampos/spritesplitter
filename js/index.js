import {saveFiles} from './saveFile.js';
import {getOptions, setImageTransformation, getFiles, sprite, spriteSheet} from './dom-manipulation.js';
import {spriteSheet2Sprites as ss2s} from './spritesheet2sprite.js';
import {sprites2SpriteSheet as s2ss} from './sprites2spritesheet.js';

const spriteSheet2Sprites = ss2s(spriteSheet, sprite);
const sprites2SpriteSheet = s2ss(spriteSheet);

/**
 * Reads a list of files and transform them in images.
 *
 * The files ares read and transformed. They are filtered for images only.
 * @param {FileList|File[]} files The files to be processed.
 * @returns {Promise<Image>[]} A list of Image files.
 */
async function readImages(files = []){
	const images = [...files].filter((file) => file.type.match(/image.*/));
	return Promise.all(images.map((file) => new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.addEventListener('load', (fileData) => {
			const img = new Image();
			img.src = fileData.target.result;
			img.addEventListener('load', () => {
				img.width = img.naturalWidth;
				img.height = img.naturalHeight;

				img.name = file.name;
				img.path = file.path;
				img.lastModified = file.lastModified;
				img.lastModifiedDate = file.lastModifiedDate;
				img.size = file.size;
				img.type = file.type;
				img.webkitRelativePath = file.webkitRelativePath;

				resolve(img);
			});
		});

		reader.addEventListener('error', reject);
		reader.readAsDataURL(file);
	})));
}

/**
 * Transforms the files to images, joining in a single spritesheet or slicing to sprites.
 */
async function transformImages(){
	let images = await readImages(getFiles());

	if (images.length === 0) {
		return;
	}

	if (images.length > 1) {
		images = await sprites2SpriteSheet(images, getOptions);
	} else {
		images = await spriteSheet2Sprites(images[0], getOptions);
	}

	await saveFiles(images, getOptions());
}

setImageTransformation(() => transformImages(getOptions()));