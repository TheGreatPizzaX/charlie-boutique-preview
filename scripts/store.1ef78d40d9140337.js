
const liveStore = location.origin === 'https://thegreatpizzax.github.io' &&
  ['/charlie-boutique-preview/', '/charlie-boutique-preview/index.html'].includes(location.pathname);
const base=catalogue.origin;
const measurementEnabled=liveStore;
const purchaseTermsEnabled=false;
const measurement=measurementEnabled ? window.CharlieMeasurement?.mount(base+'/functions/v1/analytics-ingest') : undefined;
const entry=window.CharlieStoreEntry.mount({
  measurement, termsEnabled: purchaseTermsEnabled, termsVersion: 'v0.2.1-1',
});
const $=id=>document.getElementById(id);
let products=[],cats=[],promos=[],promoError=false,active='',selected=new Set();
function node(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function belongs(id,root){const seen=new Set();while(id&&!seen.has(id)){if(id===root)return true;seen.add(id);id=cats.find(c=>c.id===id)?.parent_id;}return false;}
function filters(){const box=$('categories');box.replaceChildren();for(const c of [{id:'',name:'הכול'},...cats.filter(c=>!c.parent_id)]){const b=node('button',c.name,'chip'+(active===c.id?' active':''));b.onclick=()=>{active=c.id;selected.clear();filters();render()};box.append(b);}const f=$('filters');f.replaceChildren();if(active)for(const c of cats.filter(c=>c.id!==active&&belongs(c.id,active))){const l=node('label');const i=node('input');i.type='checkbox';i.checked=selected.has(c.id);i.onchange=()=>{i.checked?selected.add(c.id):selected.delete(c.id);render()};l.append(i,document.createTextNode(c.name));f.append(l);}}
const price=v=>Number(v.sale_price??v.price);const min=p=>Math.min(...p.product_variants.map(price));const money=n=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS'}).format(n);
function productPhoto(product) {
  const photo=node('div',null,'photo');
  try {
    const url=new URL(product.image_url);
    if(url.origin===base && url.pathname.startsWith('/storage/v1/object/public/product-images/')){
      const img=node('img');
      img.src=url.href;
      img.alt=product.name;
      img.loading='lazy';
      img.decoding='async';
      img.addEventListener('error',()=>{photo.replaceChildren(node('span',product.brand || product.name,'photo-fallback'));});
      photo.append(img);
    }
  } catch {}
  if(!photo.childNodes.length)photo.append(node('span',product.brand || product.name,'photo-fallback'));
  return photo;
}

function productCard(product) {
  const card=node('article',null,'product');
  const body=node('div',null,'pbody');
  card.dataset.productId=String(product.id);
  if(measurement)card.dataset.analyticsProduct=String(product.id);
  body.append(node('small',product.brand || ''),node('h3',product.name));
  if(product.description){
    const details=node('details');
    details.append(node('summary','פרטי המוצר'),node('p',product.description,'desc'));
    body.append(details);
  }
  const variants=product.product_variants;
  const select=node('select',null,'variant');
  select.setAttribute('aria-label','גודל או משקל');
  variants.forEach((variant,index)=>{
    const option=node('option',variant.size);
    option.value=index;
    select.append(option);
  });
  if(variants.length)body.append(select);
  for(const offer of activePromos().filter(rule=>variants.some(v=>eligible(rule,v)))){
    body.append(node('div',offer.name,'promo'));
  }
  const cost=node('div',null,'price'),stock=node('div'),button=node('button',null,'btn');
  function showVariant(){
    const variant=variants[Number(select.value)];
    cost.replaceChildren();
    if(variant){
      if(variant.sale_price!=null && Number(variant.sale_price)<Number(variant.price))
        cost.append(node('del',money(Number(variant.price))),document.createTextNode(' '));
      cost.append(document.createTextNode(money(price(variant))));
    } else cost.textContent='מחיר בבירור';
    stock.textContent=variant?.in_stock?'זמין במלאי':'אזל מהמלאי';
    stock.className=variant?.in_stock?'stock':'stock out';
    button.disabled=!variant?.in_stock;
    button.textContent=variant?.in_stock?'הוספה לסל':'אזל מהמלאי';
  }
  button.onclick=()=>addCart(product,variants[Number(select.value)]);
  select.onchange=showVariant;
  showVariant();
  body.append(cost,stock,button);
  card.append(productPhoto(product),body);
  return card;
}

function render(){
  const query=$('search').value.trim().toLowerCase();
  const visible=products.filter(product=>{
    const inCategory=!active || belongs(product.category_id,active);
    const inSubcategory=!selected.size || [...selected].some(id=>belongs(product.category_id,id));
    return inCategory && inSubcategory && [product.name,product.brand].join(' ').toLowerCase().includes(query);
  });
  const sort=$('sort').value;
  if(sort==='low')visible.sort((a,b)=>min(a)-min(b));
  if(sort==='high')visible.sort((a,b)=>min(b)-min(a));
  $('resultCount').textContent=visible.length+' מוצרים';
  const box=$('products');
  box.replaceChildren(...visible.map(productCard));
  if(!visible.length)box.append(node('div','לא נמצאו מוצרים מתאימים','empty'));
  measurement?.renderCards(box);
}
$('year').textContent=new Date().getFullYear();$('search').oninput=render;$('sort').onchange=render;
// Shortcuts are visible on the welcome screen. Reuse that read on entry.
let categoryRequest;
function loadCategories() {
  if (!categoryRequest) {
    categoryRequest=catalogue.read('categories').then(rows=>{
      cats=rows;
      showShortcuts(rows);
      return rows;
    }).catch(error=>{categoryRequest=undefined; throw error;});
  }
  return categoryRequest;
}
async function loadCatalog() {
  const loading=node('div','טוען מוצרים…','loading');
  loading.setAttribute('role','status');
  $('products').replaceChildren(loading);
  try {
    const [, productRows, offers] = await Promise.all([
      loadCategories(),
      catalogue.read('products'),
      catalogue.read('promotions').catch(() => null),
    ]);
    products=productRows;
    promoError=offers===null;
    promos=offers ?? [];
    filters();render();drawCart();renderMerchandising();
  } catch {
    const status=node('p','לא ניתן לטעון את הקטלוג כרגע.');
    status.setAttribute('role','status');
    const retry=node('button','טעינה מחדש','btn');
    retry.onclick=loadCatalog;
    $('products').replaceChildren(status,retry);
  }
}

const cart=new Map();
function addCart(p,v){if(!v?.in_stock)return;const item=cart.get(v.id);if(item)item.qty++;else cart.set(v.id,{p,v,qty:1});drawCart();$('cartOpen').classList.remove('bump');requestAnimationFrame(()=>$('cartOpen').classList.add('bump'));openCart();measurement?.track('add_to_cart',String(p.id));}
function drawCart(){const box=$('cartItems');box.replaceChildren();for(const [id,item] of cart){const {p,v,qty}=item;const row=node('div',null,'cart-row');row.append(node('strong',p.name),node('div',v.size+' · '+money(price(v))+' ליחידה'));const actions=node('div',null,'cart-actions');for(const [label,delta] of [['−',-1],['+',1]]){const b=node('button',label,'mini');b.onclick=()=>{item.qty+=delta;if(item.qty<=0)cart.delete(id);drawCart();if(delta>0)measurement?.track('add_to_cart',String(p.id));};actions.append(b);}actions.append(node('span','כמות: '+qty),node('strong',money(price(v)*qty)));const remove=node('button','הסרה','mini');remove.onclick=()=>{cart.delete(id);drawCart();};actions.append(remove);row.append(actions);box.append(row);}const t=totals();$('cartCount').textContent=t.count;$('cartOpen').setAttribute('aria-label','סל קניות ('+t.count+')');const delivery=$('deliveryStatus');delivery.hidden=!t.count;delivery.textContent=t.total>=25000?'הסל זכאי למשלוח חינם באשקלון.':'איסוף עצמי בתיאום מראש. משלוח חינם באשקלון מ־250 ₪ לאחר הנחות.';if(!t.count)box.append(node('p','הסל ריק'));$('cartTotal').replaceChildren(node('div','לפני הנחה: '+money(t.subtotal/100)),...t.applied.map(r=>node('div',r.name+': '+money(r.discount/100),'promo')), ...(promoError?[node('div','לא ניתן לאמת מבצעים כרגע. יש לאשר מחיר מול החנות.','notice')]:[]),node('strong','סה״כ: '+money(t.total/100)));$('checkout').disabled=!t.count;}
$('cartOpen').onclick=()=>{drawCart();openCart();};$('cartClose').onclick=()=>closeCart();$('cartOverlay').onclick=e=>{if(e.target===$('cartOverlay'))closeCart();};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});
$('checkout').onclick=()=>entry.checkout(()=>{const t=totals();if(!t.count)return;const lines=['שלום צ׳ארלי בוטיק!','אשמח לבצע הזמנה:',''];for(const {p,v,qty} of cart.values())lines.push(p.name+' | '+v.size+' × '+qty+' — '+money(price(v)*qty));lines.push('','לפני הנחה: '+money(t.subtotal/100),...t.applied.map(r=>r.name+': '+money(r.discount/100)),...(promoError?['לא ניתן לאמת מבצעים — נא לאשר מחיר מול החנות.']:[]),'סה״כ: '+money(t.total/100),'אשמח לאישור ההזמנה.');const orderUrl='https://wa.me/972546375055?text='+encodeURIComponent(lines.join('\n'));measurement?.track('whatsapp_click','cart');window.open(orderUrl,'_blank','noopener,noreferrer');});
drawCart();
document.querySelector('footer a[href^="https://wa.me/"]').addEventListener('click',()=>measurement?.track('whatsapp_click','direct'));

bindPresentation();
loadCategories().catch(()=>{}); // A failed welcome-screen read is retried when entering.
entry.whenEntered(loadCatalog);
