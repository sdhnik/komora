import { render } from 'preact';
import '@fontsource/onest/cyrillic-400.css';
import '@fontsource/onest/cyrillic-500.css';
import '@fontsource/onest/cyrillic-600.css';
import '@fontsource/onest/cyrillic-700.css';
import '@fontsource/onest/cyrillic-800.css';
import '@fontsource/onest/latin-400.css';
import '@fontsource/onest/latin-600.css';
import '@fontsource/onest/latin-700.css';
import { App } from './ui/App.jsx';
import { requestPersistence } from './db.js';
import './styles.css';

requestPersistence();
render(<App />, document.getElementById('app'));
