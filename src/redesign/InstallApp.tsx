import {useEffect,useState} from 'react';
interface InstallPrompt extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
let pending:InstallPrompt|null=null;
const listeners=new Set<()=>void>();
const announce=()=>listeners.forEach(fn=>fn());
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event as InstallPrompt;announce()});
window.addEventListener('appinstalled',()=>{pending=null;announce()});
function installed(){return window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)}
export default function InstallApp(){const [,refresh]=useState(0);const [help,setHelp]=useState(false);useEffect(()=>{const update=()=>refresh(n=>n+1);listeners.add(update);const mode=window.matchMedia('(display-mode: standalone)');mode.addEventListener('change',update);return()=>{listeners.delete(update);mode.removeEventListener('change',update)}},[]);
async function install(){if(!pending){setHelp(true);return}const prompt=pending;pending=null;await prompt.prompt();await prompt.userChoice;announce()}
return <div className="r-install">{installed()?<p>ListIt is installed on this device.</p>:<><button type="button" onClick={()=>void install().catch(()=>setHelp(true))}>Install ListIt</button>{help&&<p role="status">On iPhone or iPad, open ListIt in Safari, tap Share, then Add to Home Screen. On Android or a computer, open your browser menu and choose Install app or Add to Home Screen if available.</p>}</>}</div>}
