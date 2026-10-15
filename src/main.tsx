import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import Account from './redesign/Account';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Account />
  </StrictMode>,
);

if ('serviceWorker' in navigator) window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('ListIt installation support unavailable',error))});
