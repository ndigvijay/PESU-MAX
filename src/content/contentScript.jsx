import React from 'react';
import { createRoot} from 'react-dom/client';
import App from '../../frontend/App.jsx';
import { initMenuReorder } from './menuReorder';
import { initMenuIcons } from './menuIcons';
import { initSideMenuDock } from './sideMenuDock';
import { initMaterialColumns } from './materialColumns';
import { initMaterialTable } from './materialTable';
import { startSessionKeeper } from './sessionKeeper.js';
import { initHideTopBar } from './hideTopBar.js';
import { initSideMenuState } from './sideMenuState.js';
import { initTheme } from './theme';

const container = document.createElement('div');
container.id = 'pesu-max-root';
document.body.appendChild(container);
const root = createRoot(container);  
root.render(<App />);
startSessionKeeper();
initHideTopBar();
initSideMenuState();
initTheme();

initMenuReorder();
initMenuIcons();
initSideMenuDock();
initMaterialColumns();
initMaterialTable();
