import type {Item} from './model';
export function recipesToText(recipes:Item[]){return recipes.map(recipe=>[recipe.title.trim()||'Untitled recipe',...['Ingredients','Instructions','Notes'].filter(key=>recipe.fields[key]?.trim()).map(key=>key+'\n'+recipe.fields[key].trim())].join('\n\n')).join('\n\n---\n\n')}

export function hasRecipeContent(recipe:Item){return ['Ingredients','Instructions','Notes'].some(key=>Boolean(recipe.fields[key]?.trim()))}
