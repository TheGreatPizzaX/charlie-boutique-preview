// Shared presentation helpers. Catalogue rows and calculations stay in store.js.
const animalPaths = {
  'כלבים':'M7 11 4 16 1.5 13l3-7 4-2 3 2 3-2 4 2 3 7-2.5 3-3-5m-10 0v4c0 4 3 6 5 6s5-2 5-6v-4 M9 12h.1 M14.9 12h.1 M10.5 16h3L12 18Z',
  'חתולים':'M4 11 3 3l6 4a12 12 0 0 1 6 0l6-4-1 8c2 6-1.5 10-8 10S2 17 4 11Z M7 12h1m8 0h1m-6 3h2l-1 1.5Z M6 16l-5-1m5 3-4 1m16-3 5-1m-5 3 4 1',
  'דגים':'M3 12c3-5 7-7 11-5 2 1 3.5 3 4 4l4-3v8l-4-3c-1 2-3 5-7 5-3 0-6-3-8-6Z M8 8c2 3 2 5 0 8 M6 11h.1',
  'ציפורים':'M3 18c4-1 5-4 6-9s7-7 10-2l3 1-3 2c-1 6-5 10-11 9l-5 1 2-3 M8 15c4 1 7-2 7-5 M16.5 6.5h.1 M12 19v3m3-4v3',
  'מכרסמים':'M5 15c0-3 1-5 4-6-3-5 3-8 5-3 4-2 6 1 4 4l4 4c0 3-4 5-9 5H8c-2 0-3-2-3-4Z M5 16c-6-1-5 6 1 5 M16 12h.1m3 3 4 1',
};
const categoryOrder=Object.keys(animalPaths);
let pendingDestination=null;
let pendingCategory=null;
let returnFocus=null;

function categoryIcon(name) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('class','animal-icon');
  svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(ns,'path');
  path.setAttribute('d',animalPaths[name] || 'M4 6h16v14H4ZM7 6V4h10v2');
  svg.append(path);
  return svg;
}
function goToShelf(id) {
  if (!$('storeEntry').hidden) {
    pendingDestination=id;
    $('storeEntry').scrollIntoView({block:'center'});
    $('entryDeny').focus({preventScroll:true});
    return;
  }
  if (id==='cart') {openCart();return;}
  const target=$(id==='search'?'catalog':id);
  if (!target || target.hidden) return;
  target.scrollIntoView({block:'start'});
  if (id==='search') $('search').focus({preventScroll:true});
}
function selectCategory(id) {
  pendingCategory=id;
  if ($('storeEntry').hidden) {
    active=id;selected.clear();$('search').value='';
    filters();render();pendingCategory=null;
  }
  goToShelf('catalog');
}
function showShortcuts(rows) {
  const priority=c=>categoryOrder.includes(c.name)?categoryOrder.indexOf(c.name):99;
  const buttons=rows.filter(c=>!c.parent_id).sort((a,b)=>priority(a)-priority(b)).map(c=>{
    const button=node('button',null,'category-card');
    button.append(categoryIcon(c.name),node('span',c.name));
    button.onclick=()=>selectCategory(c.id);
    return button;
  });
  $('shortcuts').replaceChildren(...buttons);
}
function openCart() {
  if (!$('storeEntry').hidden) {goToShelf('cart');return;}
  const overlay=$('cartOverlay');
  if (overlay.classList.contains('open')) return;
  returnFocus=document.activeElement;
  overlay.classList.add('open');document.body.style.overflow='hidden';
  $('cartClose').focus();
}
function closeCart() {
  const overlay=$('cartOverlay');
  if (!overlay.classList.contains('open')) return;
  overlay.classList.remove('open');document.body.style.overflow='';
  if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
}
function shopFilter(search) {
  active='';selected.clear();$('search').value=search;
  filters();render();goToShelf('catalog');
}
function renderMerchandising() {
  const offers=activePromos().filter(r=>products.some(p=>p.product_variants.some(v=>eligible(r,v))));
  $('offers').hidden=$('offersNav').hidden=!offers.length;
  $('offerList').replaceChildren(...offers.map(offer=>{
    const panel=node('article',null,'offer-panel');
    const amount=node('strong',offer.discount_percent+'%');amount.dir='ltr';
    const action=node('button','למוצרים שבמבצע','btn');
    action.onclick=()=>{
      active='';selected.clear();$('search').value='';filters();render();
      const eligibleIds=new Set(products.filter(p=>p.product_variants.some(v=>eligible(offer,v))).map(p=>String(p.id)));
      const cards=Array.from($('products').children);
      cards.forEach(card=>{card.hidden=!eligibleIds.has(card.dataset.productId);});
      $('resultCount').textContent=eligibleIds.size+' מוצרים במבצע';
      goToShelf('catalog');
    };
    panel.append(amount,node('h3',offer.name),action);return panel;
  }));
  const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))];
  $('brands').hidden=!brands.length;
  $('brandList').replaceChildren(...brands.map(name=>{
    const button=node('button',name,'brand-filter');button.onclick=()=>shopFilter(name);return button;
  }));
  // Keep the approved editorial selection while it remains available in the catalogue.
  const featured=products.find(p=>p.id==='e3b37c4b-9ee0-4e9a-8315-88ff86cc891c' &&
    p.product_variants.some(variant=>variant.in_stock));
  $('spotlight').hidden=!featured;
  if(featured){
    const row=node('article',null,'feature-row'),copy=node('div'),action=node('button','לפרטי המוצר','btn');
    row.append(productPhoto(featured));
    action.onclick=()=>{shopFilter(featured.name);const details=$('products').querySelector('details');if(details)details.open=true;};
    copy.append(node('span',featured.brand,'brand-tag'),node('h3',featured.name),action);
    row.append(copy);$('featured').replaceChildren(row);
  }
  if(pendingCategory!==null){active=pendingCategory;selected.clear();pendingCategory=null;filters();render();}
  if(pendingDestination){const target=pendingDestination;pendingDestination=null;goToShelf(target);}
}
function bindPresentation() {
  $('dockCart').onclick=()=>$('cartOpen').click();
  document.querySelectorAll('[data-shop],[data-search]').forEach(link=>{
    link.addEventListener('click',event=>{event.preventDefault();goToShelf(link.hasAttribute('data-search')?'search':link.hash.slice(1));});
  });
  $('entryLanguage').addEventListener('click',()=>{$('languageMenu').open=false;});
  document.addEventListener('click',event=>{if(!$('languageMenu').contains(event.target))$('languageMenu').open=false;});
  $('cartOverlay').addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=Array.from($('cartOverlay').querySelectorAll('button:not(:disabled)'));
    const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
}
