/** Native dialogs with a neutral initial focus and one shared background scroll lock. */
const openDialogs=new Set();let previous;
export function openCourseDialog(dialog){
 if(dialog.open)return;
 const heading=dialog.querySelector('h2');if(heading){heading.tabIndex=-1;heading.autofocus=true;}
 if(!openDialogs.size){
  const body=document.body,root=document.documentElement;
  previous={x:window.scrollX,y:window.scrollY,position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:root.style.overflow};
  Object.assign(body.style,{position:'fixed',top:`-${previous.y}px`,left:`-${previous.x}px`,width:'100%'});root.style.overflow='hidden';
 }
 openDialogs.add(dialog);
 dialog.addEventListener('close',()=>{
  openDialogs.delete(dialog);if(openDialogs.size||!previous)return;
  const saved=previous;previous=null;
  Object.assign(document.body.style,{position:saved.position,top:saved.top,left:saved.left,width:saved.width});document.documentElement.style.overflow=saved.overflow;
  window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
 },{once:true});
 dialog.showModal();heading?.focus({preventScroll:true});
}
