export type Item = { id: string; title: string; done: boolean; fields: Record<string,string> };
export type List = { id: string; name: string; template: string; group: string; sharedId?: string; theme?: string; font?: string; items: Item[] };
export type State = { version: 1; defaultTheme: string; defaultFont?: string; openingGroup?: string; itemOrders?: Record<string,string[]>; listOrder?: string[]; lists: List[] };
export const templates = { Personal: ['Grocery','TV','Vacations','Household chores','Books','Birthdays','Payments','Other'], Work: ['To-Do','Projects','Other'] };
export const fields: Record<string,string[]> = { Grocery:['Store','Quantity','Date','Category','Notes'], TV:['Streaming service','Season','Episode','Next season date','Notes'], Books:['Author','Status','Notes'], Birthdays:['Date','Notes'], Payments:['Date','Amount','Notes'], Vacations:['Where','Date','Notes'], 'Household chores':['Where','Date','Priority','Notes'], Projects:['Where','Date','Priority','Notes'], 'To-Do':['Where','Date','Time','Duration minutes','Priority','Notes'], Other:['Where','Date','Notes'] };
export const fresh = (): State => ({version:1,defaultTheme:'blue',lists:[{id:crypto.randomUUID(),name:'To-Do',template:'To-Do',group:'Personal',items:[]}]});
export function escapeCalendar(value:string) { return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
export function calendarFile(item:Item) {
 const date=item.fields.Date; if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')) throw Error('Choose a date first.');
 const compact=date.replace(/-/g,'');const time=item.fields.Time;
 const start=time ? `DTSTART:${compact}T${time.replace(':','')}00` : `DTSTART;VALUE=DATE:${compact}`;
 const endDate=new Date(date+'T'+(time||'12:00'));
 if(time)endDate.setMinutes(endDate.getMinutes()+Math.max(1,Number(item.fields['Duration minutes']||30)));else endDate.setDate(endDate.getDate()+1);
 const endDay=`${endDate.getFullYear()}${String(endDate.getMonth()+1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}`;
 const end=time?`DTEND:${endDay}T${String(endDate.getHours()).padStart(2,'0')}${String(endDate.getMinutes()).padStart(2,'0')}00`:`DTEND;VALUE=DATE:${endDay}`;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ListIt//Calendar//EN','BEGIN:VEVENT',`UID:${item.id}@listit`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z')}`,start,end,`SUMMARY:${escapeCalendar(item.title)}`,`LOCATION:${escapeCalendar(item.fields.Where||'')}`,`DESCRIPTION:${escapeCalendar(item.fields.Notes||'')}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}

export function reorderTabs(order:string[],source:string,target:string){if(source===target||!order.includes(source)||!order.includes(target))return order;const next=order.filter(id=>id!==source);next.splice(order.indexOf(target),0,source);return next;}
export function orderedLists(lists:List[],order:string[]=[]){const ranks=new Map(order.map((id,index)=>[id,index]));return [...lists].sort((a,b)=>(ranks.get(a.id)??order.length)-(ranks.get(b.id)??order.length));}

// Item order is an account preference, never part of a shared list document.
export function orderedItems(items:Item[],order:string[]=[]){const ranks=new Map(order.map((id,index)=>[id,index]));return [...items].sort((a,b)=>(ranks.get(a.id)??order.length)-(ranks.get(b.id)??order.length));}
export function firstList(state:State,group:string){return orderedLists(state.lists,state.listOrder).find(list=>list.group===group);}
