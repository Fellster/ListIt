import {useState} from 'react';
import {Share2,Copy} from 'lucide-react';
const appUrl='https://list-it-ruby.vercel.app/';
export default function ShareApp(){
 const [message,setMessage]=useState('');const [fallback,setFallback]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(appUrl);setMessage('ListIt link copied.')}catch{setFallback(true);setMessage('Copy the link below to share ListIt.')}}
 async function share(){setMessage('');if(navigator.share){try{await navigator.share({title:'ListIt',text:'Keep your personal and work lists together with ListIt.',url:appUrl});return}catch(error){if((error as Error).name==='AbortError')return}}await copy()}
 return <section className="r-share-app"><h3>Share ListIt</h3><div className="r-actions"><button type="button" onClick={()=>void share()}><Share2 size={16}/>Share ListIt</button><button type="button" onClick={()=>void copy()} aria-label="Copy ListIt app link"><Copy size={16}/>Copy link</button></div>{fallback&&<input aria-label="ListIt app link" readOnly value={appUrl} onFocus={e=>e.target.select()}/>}<p role="status">{message}</p></section>
}
