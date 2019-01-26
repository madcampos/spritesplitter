/* eslint-env node */
const pkg = require('./package.json');
const {app, BrowserWindow} = require('electron');
const {join} = require('path');

let win;

const createWindow = () => {
	win = new BrowserWindow({
		width: pkg.window.width,
		height: pkg.window.height,
		minWidth: pkg.window.min_width,
		minHeight: pkg.window.min_height,
		title: pkg.window.title,
		center: true,
		fullscreenable: false,
		autoHideMenuBar: true
	});

	win.loadFile(join(__dirname, pkg.main));

	win.on('closed', () => {
		win = null;
	});
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (win === null) {
		createWindow();
	}
});