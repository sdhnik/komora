import { render } from 'preact';
import { App } from './ui/App.jsx';
import { requestPersistence } from './db.js';
import './styles.css';

requestPersistence();
render(<App />, document.getElementById('app'));
