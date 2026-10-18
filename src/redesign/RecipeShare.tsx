import {useEffect,useState} from 'react';
import {Share2,Copy} from 'lucide-react';
import type {Item} from './model';
import {recipesToText,hasRecipeContent} from './recipeSharing';
export default function RecipeShare({recipes,label='Share recipe'}:{recipes:Item[];label?:string}){
 const text=recipesToText(recipes);
 const [message,setMessage]=useState('');const [fallback,setFallback]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{setMessage('');setFallback('')},[text]);
 function ready(){const missing=recipes.filter(recipe=>!hasRecipeContent(recipe));if(missing.length){setMessage('No recipe details found for '+missing.map(recipe=>recipe.title).join(', ')+'. Add or save the ingredients and instructions before sharing.');return false}return true}
 async function copy(text:string){if(!ready())return;try{await navigator.clipboard.writeText(text);setFallback('');setMessage(recipes.length===1?'Recipe copied.':recipes.length+' recipes copied.')}catch{setFallback(text);setMessage('Select and copy the recipe text below.')}}
 async function share(){if(!recipes.length||!ready())return;setMessage('');setFallback('');setBusy(true);try{const text=recipesToText(recipes);if(navigator.share){try{await navigator.share({text});return}catch(error){if((error as Error).name==='AbortError')return}}await copy(text)}finally{setBusy(false)}}
 return <div className="r-recipe-share"><div className="r-actions"><button type="button" disabled={!recipes.length||busy} onClick={()=>void share()}><Share2 size={15}/>{label}</button><button type="button" disabled={!recipes.length||busy} aria-label={label==='Share selected'?'Copy selected recipes':'Copy recipe text'} onClick={()=>{setMessage('');void copy(recipesToText(recipes))}}><Copy size={15}/>Copy text</button></div>{message&&<p role="status">{message}</p>}{fallback&&<textarea aria-label="Recipe text to copy" readOnly rows={6} value={fallback} onFocus={event=>event.target.select()}/>}</div>
}
