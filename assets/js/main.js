
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
function setYear(){ $$("#year").forEach(el=>el.textContent=new Date().getFullYear()); }
setYear();
