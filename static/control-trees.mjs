/** Screen-pixel rectangles adapt to layout; a small edge touch is harmless. */
export function treeOverlapsControls(tree,controls,tolerance=.05){
 return controls.some(b=>{
  const width=Math.max(0,Math.min(tree.right,b.right)-Math.max(tree.left,b.left));
  const height=Math.max(0,Math.min(tree.bottom,b.bottom)-Math.max(tree.top,b.top));
  return width*height>Math.max(0,b.right-b.left)*Math.max(0,b.bottom-b.top)*tolerance+1e-7;
 });
}
