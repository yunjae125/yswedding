const grid=document.getElementById('photo-grid');
const modal=document.getElementById('lightbox');
const large=document.getElementById('large-photo');
const more=document.getElementById('more');
let current=0,expanded=false,opener=null;
document.getElementById('cover').src=photos[0].url;
photos.forEach((photo,i)=>{const button=document.createElement('button');button.className='photo-card';button.hidden=i>=3;button.setAttribute('aria-label',`사진 ${i+1} 크게 보기`);const img=document.createElement('img');img.src=photo.url;img.alt=photo.alt;img.loading='lazy';button.append(img);button.addEventListener('click',()=>{opener=button;show(i);modal.showModal();document.body.classList.add('modal-open')});grid.append(button)});
function show(i){current=(i+photos.length)%photos.length;large.src=photos[current].url;large.alt=photos[current].alt;document.getElementById('counter').textContent=`${current+1} / ${photos.length}`}
more.addEventListener('click',()=>{expanded=!expanded;[...grid.children].forEach((el,i)=>el.hidden=!expanded&&i>=3);more.setAttribute('aria-expanded',String(expanded));more.innerHTML=expanded?'사진 접기 <span>−</span>':'사진 더보기 <span>+</span>';if(!expanded)document.getElementById('gallery').scrollIntoView({block:'start',behavior:'smooth'})});
document.getElementById('close').onclick=()=>modal.close();
document.getElementById('prev').onclick=()=>show(current-1);
document.getElementById('next').onclick=()=>show(current+1);
modal.addEventListener('close',()=>{document.body.classList.remove('modal-open');opener?.focus()});
modal.addEventListener('click',e=>{if(e.target.classList.contains('viewer-image'))modal.close()});
modal.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}});
let touchX=0;large.addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});large.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>45)show(current+(delta<0?1:-1))},{passive:true});
