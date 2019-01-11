/* global Windows, nw */
/* eslint-env node */
/* eslint-disable global-require */

const generateButton = document.getElementById('generate-button');
const spriteSheet = document.getElementById('sprite-sheet').getContext('2d');
const sprite = document.getElementById('sprite').getContext('2d');
const directorySavePath = document.getElementById('option-filelocation').dataset.path || document.getElementById('option-filelocation').value;

/**
 * Configure the handling of the drag event.
 * @param {String} effect The effect to be used on the drag event.
 * @returns {Function} The handler function.
 */
function configureDragAndDrop(effect = 'none'){
	return (evt) => {
		evt.stopPropagation();
		evt.preventDefault();

		if (evt.dataTransfer) {
			evt.dataTransfer.dropEffect = effect;
		}
	};
}

/**
 * Process the files inputted.
 *
 * Process the files recieved from the input or from a drop event.
 * It also shows the options dialog.
 * @param {Promise<Function>} imageTransformation The function to transform the images.
 * @returns {Function} The function to be executed.
 */
function showOptionsDialog(imageTransformation){
	return async (evt) => {
		evt.stopPropagation();
		evt.preventDefault();

		const input = document.getElementById('hidden-input');

		if (evt.dataTransfer && evt.dataTransfer.files) {
			input.files = evt.dataTransfer.files;
		}

		if (document.getElementById('option-autoskip').checked) {
			await imageTransformation();
		} else {
			window.location.hash = '#config-options';
			generateButton.hidden = false;
		}
	};
}

/**
 * Sets the image transformation function to the events.
 * @param {Function} imageTransformation The image transformation function to be used.
 */
function setImageTransformation(imageTransformation){
	document.getElementById('drop-zone').addEventListener('drop', showOptionsDialog(imageTransformation));
	document.getElementById('hidden-input').addEventListener('change', showOptionsDialog(imageTransformation));
	generateButton.addEventListener('click', async (evt) => {
		evt.target.setAttribute('disabled', true);
		await imageTransformation();
		evt.target.removeAttribute('disabled');
	});
}

/**
 * Returns the files inputed by the user.
 * @returns {File[]} The files list;
 */
function getFiles(){
	const files = document.getElementById('hidden-input').files;

	if (files) {
		return [...files];
	}

	return [];
}

/**
 * Gets all the options setted.
 * @returns {Object} The options setted on the DOM.
 */
function getOptions(){
	return {
		xOffset: Number.parseInt(document.getElementById('option-xoffset').value),
		xPadding: Number.parseInt(document.getElementById('option-xpadding').value),
		width: Number.parseInt(document.getElementById('option-width').value),
		yOffset: Number.parseInt(document.getElementById('option-yoffset').value),
		yPadding: Number.parseInt(document.getElementById('option-ypadding').value),
		height: Number.parseInt(document.getElementById('option-height').value),
		autoCalcSpritesheet: document.getElementById('option-calcspritesheet').checked,
		columns: Number.parseInt(document.getElementById('option-columns').value),
		rows: Number.parseInt(document.getElementById('option-rows').value),
		bundleFiles: document.getElementById('option-zipbundle').checked,
		gmsCompatible: document.getElementById('option-gms').checked,
		autoSkip: document.getElementById('option-autoskip').checked,
		askFileLocation: document.getElementById('option-askfilelocation').checked
	};
}

document.body.addEventListener('dragover', configureDragAndDrop());
document.body.addEventListener('drop', configureDragAndDrop());
document.getElementById('drop-zone').addEventListener('dragover', configureDragAndDrop('copy'));
document.getElementById('config-close').addEventListener('click', () => {
	window.location.hash = '';
});

document.getElementById('config-button').addEventListener('click', () => {
	window.location.hash = '#config-options';
	generateButton.hidden = true;
});

document.querySelectorAll('#config-options input[type=number]').forEach((input) => {
	if (localStorage.getItem(input.id)) {
		input.value = localStorage.getItem(input.id);
	}

	input.addEventListener('input', (evt) => localStorage.setItem(evt.target.id, evt.target.value));
});

document.querySelectorAll('#config-options input[type=checkbox]').forEach((input) => {
	if (localStorage.getItem(input.id)) {
		input.checked = localStorage.getItem(input.id) === 'true';
	}

	input.addEventListener('change', (evt) => localStorage.setItem(evt.target.id, evt.target.checked.toString()));
});

document.getElementById('option-askfilelocation').addEventListener('change', (evt) => {
	if (evt.target.checked) {
		document.querySelector('label[for=option-filelocation]').setAttribute('hidden', true);
	} else {
		document.querySelector('label[for=option-filelocation]').removeAttribute('hidden');
	}
});

document.getElementById('option-calcspritesheet').addEventListener('change', (evt) => {
	if (evt.target.checked) {
		document.querySelector('label[for=option-columns]').setAttribute('hidden', true);
		document.querySelector('label[for=option-rows]').setAttribute('hidden', true);
	} else {
		document.querySelector('label[for=option-columns]').removeAttribute('hidden');
		document.querySelector('label[for=option-rows]').removeAttribute('hidden');
	}
});

document.addEventListener('DOMContentLoaded', () => {
	window.location.hash = '';
});

if (typeof Windows !== 'undefined') {
	//UWP
	Windows.UI.ViewManagement.ApplicationView.getForCurrentView().tryResizeView({height: 400, width: 400});

	const fileInput = document.getElementById('option-filelocation');
	const fileLabel = document.querySelector('label[for=option-filelocation]');
	const fileSelectorButton = document.createElement('button');

	fileInput.type = 'text';
	fileInput.addEventListener('input', (evt) => localStorage.setItem(evt.target.id, evt.target.value));

	fileSelectorButton.type = 'button';
	fileSelectorButton.textContent = 'Select Folder';
	fileSelectorButton.addEventListener('click', async (evt) => {
		evt.stopPropagation();
		evt.preventDefault();

		const folderPicker = new Windows.Storage.Pickers.FolderPicker();

		folderPicker.fileTypeFilter.replaceAll(['*']);

		const folder = await folderPicker.pickSingleFolderAsync();

		if (folder) {
			Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.addOrReplace('PickedFolderToken', folder);
			fileInput.value = folder.path;
		} else {
			fileInput.value = Windows.Storage.UserDataPaths.getDefault().downloads;
		}

		localStorage.setItem(fileInput.id, fileInput.value);
	});

	if (localStorage.getItem(fileInput.id)) {
		fileInput.value = localStorage.getItem(fileInput.id);
	} else {
		fileInput.value = Windows.Storage.UserDataPaths.getDefault().downloads;
	}

	fileLabel.appendChild(fileSelectorButton);
	//Keep hidden as folder access is hard on UWP
	// fileLabel.removeAttribute('hidden');
	// document.querySelector('label[for=option-askfilelocation]').removeAttribute('hidden');

	document.getElementById('option-zipbundle').checked = false;
} else if (typeof require === 'function' && process && process.versions && process.versions.electron) {
	//Electron
	const {app, dialog} = require('electron').remote;
	const fileInput = document.getElementById('option-filelocation');
	const fileLabel = document.querySelector('label[for=option-filelocation]');
	const fileSelectorButton = document.createElement('button');

	fileInput.type = 'text';
	fileInput.addEventListener('input', (evt) => localStorage.setItem(evt.target.id, evt.target.value));

	fileSelectorButton.type = 'button';
	fileSelectorButton.textContent = 'Select Folder';
	fileSelectorButton.addEventListener('click', async (evt) => {
		evt.stopPropagation();
		evt.preventDefault();

		const paths = await dialog.showOpenDialog({
			properties: ['openDirectory']
		});

		try {
			fileInput.value = paths ? paths[0] : app.getPath('downloads');
		} catch (err) { //eslint-disable-line
			fileInput.value = app.getAppPath();
		}

		localStorage.setItem(fileInput.id, fileInput.value);
	});

	if (localStorage.getItem(fileInput.id)) {
		fileInput.value = localStorage.getItem(fileInput.id);
	} else {
		try {
			fileInput.value = app.getPath('downloads');
		} catch (err) { //eslint-disable-line
			fileInput.value = app.getAppPath();
		}
	}

	fileLabel.appendChild(fileSelectorButton);
	fileLabel.removeAttribute('hidden');
	document.querySelector('label[for=option-askfilelocation]').removeAttribute('hidden');

	document.getElementById('option-zipbundle').checked = false;
} else if (typeof require === 'function' && typeof nw === 'object') {
	//NWJS
	const fileInput = document.getElementById('option-filelocation');

	fileInput.removeAttribute('webkitdirectory');
	fileInput.setAttribute('nwdirectory', true);

	fileInput.addEventListener('change', (evt) => {
		localStorage.setItem(evt.target.id, evt.target.value);
		evt.target.dataset.path = evt.target.value;
	});

	if (localStorage.getItem(fileInput.id)) {
		fileInput.dataset.path = localStorage.getItem(fileInput.id);
		fileInput.setAttribute('nwworkingdir', localStorage.getItem(fileInput.id));
	} else {
		fileInput.dataset.path = nw.App.dataPath;
	}

	document.querySelector('label[for=option-filelocation]').removeAttribute('hidden');
	document.querySelector('label[for=option-askfilelocation]').removeAttribute('hidden');
	document.getElementById('option-zipbundle').checked = false;
}

export {getOptions, setImageTransformation, getFiles, sprite, spriteSheet, directorySavePath};