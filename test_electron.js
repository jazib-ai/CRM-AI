try {
  const electron = require('electron');
  console.log('Electron path:', electron);
} catch (error) {
  console.error('Error requiring electron:', error);
}
