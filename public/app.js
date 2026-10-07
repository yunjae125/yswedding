const grid=document.getElementById('photo-grid');
const modal=document.getElementById('lightbox');
const large=document.getElementById('large-photo');
const more=document.getElementById('more');
let current=0,expanded=false,opener=null;
document.getElementById('cover').src=photos[0].url;
photos.forEach((photo,i)=>{const button=document.createElement('button');button.className='photo-card';button.hidden=i>=3;button.setAttribute('aria-label',`사진 ${i+1} 크게 보기`);const img=document.createElement('img');img.src=photo.url;img.alt=photo.alt;img.loading='lazy';button.append(img);button.addEventListener('click',()=>{opener=button;show(i);modal.showModal();document.body.classList.add('modal-open')});grid.append(button)});
let slideVersion=0, slideAnimations=[], outgoingPhoto=null;
function clearSlide(){
  slideAnimations.forEach(animation=>animation.cancel());
  slideAnimations=[];
  outgoingPhoto?.remove();
  outgoingPhoto=null;
}
async function show(i){
  const direction=i<current?-1:1;
  const target=(i+photos.length)%photos.length;
  const previous=current;
  const version=++slideVersion;
  current=target;
  const animated=modal.open && target!==previous && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !!large.animate;
  if(animated){
    // Keep the current photo visible while the next one loads.
    const preload=new Image();
    preload.src=photos[target].url;
    try { await preload.decode(); } catch { if(version===slideVersion) current=previous; return; }
    if(version!==slideVersion || !modal.open) return;
  }
  clearSlide();
  const frame=large.parentElement;
  if(animated){
    frame.style.position='relative';
    frame.style.overflow='hidden';
    const rect=large.getBoundingClientRect(), parent=frame.getBoundingClientRect();
    outgoingPhoto=large.cloneNode(false);
    outgoingPhoto.removeAttribute('id');
    outgoingPhoto.alt='';
    outgoingPhoto.setAttribute('aria-hidden','true');
    Object.assign(outgoingPhoto.style,{position:'absolute',left:`${rect.left-parent.left}px`,top:`${rect.top-parent.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,pointerEvents:'none'});
    frame.append(outgoingPhoto);
  }
  large.src=photos[target].url;
  large.alt=photos[target].alt;
  document.getElementById('counter').textContent=`${target+1} / ${photos.length}`;
  if(animated){
    const options={duration:420,easing:'cubic-bezier(0.22, 0.61, 0.36, 1)'};
    slideAnimations=[
      outgoingPhoto.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*64}px)`,opacity:0}],{...options,fill:'forwards'}),
      large.animate([{transform:`translateX(${direction*64}px)`,opacity:0},{transform:'translateX(0)',opacity:1}],options)
    ];
    Promise.all(slideAnimations.map(animation=>animation.finished)).then(()=>{if(version===slideVersion)clearSlide()}).catch(()=>{});
  }
}

more.addEventListener('click',()=>{expanded=!expanded;[...grid.children].forEach((el,i)=>el.hidden=!expanded&&i>=3);more.setAttribute('aria-expanded',String(expanded));more.innerHTML=expanded?'사진 접기 <span>−</span>':'사진 더보기 <span>+</span>';if(!expanded)document.getElementById('gallery').scrollIntoView({block:'start',behavior:'smooth'})});
document.getElementById('close').onclick=()=>modal.close();
document.getElementById('prev').onclick=()=>show(current-1);
document.getElementById('next').onclick=()=>show(current+1);
modal.addEventListener('close',()=>{slideVersion++;clearSlide();document.body.classList.remove('modal-open');opener?.focus()});
modal.addEventListener('click',e=>{if(e.target.classList.contains('viewer-image'))modal.close()});
modal.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}});
let touchX=0;large.addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});large.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>45)show(current+(delta<0?1:-1))},{passive:true});

// Progressive enhancement: content remains visible when motion is unsupported.
(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const pending = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting, boundingClientRect}) => {
      const animation = pending.get(target);
      if (!animation) return;
      if (isIntersecting) {
        if (animation.playState === 'paused') animation.play();
      } else if (boundingClientRect.top > window.innerHeight / 2 && !target.contains(document.activeElement)) {
        // Re-arm only below the viewport, never hide content as it leaves at the top.
        animation.pause();
        animation.currentTime = 0;
      }
    });
  }, {threshold: 0, rootMargin: '0px 0px -100px 0px'});
  const selector = '.invitation > *, .gallery-heading, .photo-card, #more, .details > .eyebrow, .details > h2, .details-grid > div, .calendar-block, .location-block > *, .guestbook > .eyebrow, .guestbook > h2, .guestbook > .section-note, .share-section > *';
  document.querySelectorAll(selector).forEach(element => {
    const animation = element.animate([
      {opacity: 0, transform: 'translateY(36px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 1100, easing: 'cubic-bezier(0.45, 0, 0.35, 1)', fill: 'both'});
    animation.pause();
    pending.set(element, animation);
    observer.observe(element);
  });
  // Keyboard users should never focus an invisible control.
  document.addEventListener('focusin', event => {
    pending.forEach((animation, element) => {
      if (element.contains(event.target)) {
        animation.cancel(); pending.delete(element); observer.unobserve(element);
      }
    });
  });
  const revealAll = () => {
    observer.disconnect();
    pending.forEach(animation => animation.cancel());
    pending.clear();
  };
  motion.addEventListener('change', event => { if (event.matches) revealAll(); });
  window.addEventListener('beforeprint', revealAll);
})();

// Discourage casual photo saving without blocking gallery taps or swipe navigation.
(() => {
  const photoSelector = '.hero-photo, .photo-card, .viewer-image';
  document.querySelectorAll(photoSelector).forEach(container => {
    container.style.setProperty('-webkit-touch-callout', 'none');
    container.style.setProperty('-webkit-user-select', 'none');
    container.style.setProperty('user-select', 'none');
    container.querySelectorAll('img').forEach(img => {
      img.draggable = false;
      img.style.setProperty('-webkit-touch-callout', 'none');
      img.style.setProperty('-webkit-user-select', 'none');
      img.style.setProperty('user-select', 'none');
    });
  });
  for (const eventName of ['contextmenu', 'dragstart']) {
    document.addEventListener(eventName, event => {
      if (event.target instanceof Element && event.target.closest(photoSelector)) event.preventDefault();
    });
  }
})();
