export type Crop={left:number;top:number;right:number;bottom:number};
export const fullCrop=():Crop=>({left:0,top:0,right:1,bottom:1});
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function resizeCrop(crop:Crop,corner:string,x:number,y:number):Crop{const next={...crop};if(corner.includes('w'))next.left=clamp(x,0,next.right-.02);if(corner.includes('e'))next.right=clamp(x,next.left+.02,1);if(corner.includes('n'))next.top=clamp(y,0,next.bottom-.02);if(corner.includes('s'))next.bottom=clamp(y,next.top+.02,1);return next}
export function moveCrop(crop:Crop,dx:number,dy:number):Crop{const x=clamp(dx,-crop.left,1-crop.right),y=clamp(dy,-crop.top,1-crop.bottom);return {left:crop.left+x,right:crop.right+x,top:crop.top+y,bottom:crop.bottom+y}}
