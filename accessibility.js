(() => {
  'use strict';
  const documentRoot = document.documentElement;
  const baseFontSize = Number.parseFloat(getComputedStyle(documentRoot).fontSize);
  const key = 'charlie-storefront:accessibility';
  const defaults = {size:100,contrast:false,gray:false,links:false,font:false,motion:false};
  const labels = {
    he:{title:'נגישות',smaller:'הקטנת טקסט',larger:'הגדלת טקסט',size:'גודל טקסט',contrast:'ניגודיות גבוהה',gray:'גווני אפור',links:'הדגשת קישורים',font:'גופן קריא',motion:'הפחתת אנימציות',reset:'איפוס הגדרות',close:'סגירת תפריט נגישות',restored:'הגדרות הנגישות אופסו'},
    ru:{title:'Доступность',smaller:'Уменьшить текст',larger:'Увеличить текст',size:'Размер текста',contrast:'Высокий контраст',gray:'Оттенки серого',links:'Выделить ссылки',font:'Читаемый шрифт',motion:'Уменьшить анимацию',reset:'Сбросить настройки',close:'Закрыть меню доступности',restored:'Настройки доступности сброшены'},
    en:{title:'Accessibility',smaller:'Decrease text',larger:'Increase text',size:'Text size',contrast:'High contrast',gray:'Grayscale',links:'Highlight links',font:'Readable font',motion:'Reduce motion',reset:'Reset settings',close:'Close accessibility menu',restored:'Accessibility settings reset'},
  };
  const settings = {...defaults};
  const toggles = ['contrast','gray','links','font','motion'];
  const linkText = {
    he:['הצהרת נגישות','יצירת קשר'],
    ru:['Заявление о доступности','Связаться с нами'],
    en:['Accessibility statement','Contact us'],
  };
  const icons = {
    access:'M13.8 4.7a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0ZM12 8l.8 6H18l2.4 4.4 1.6-1M12.4 10.5h5M8 11.5a5.5 5.5 0 1 0 7.5 7',
    close:'m6 6 12 12M18 6 6 18',
    contrast:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18M12 8l4-3m-4 7 7-5m-7 9 9-6m-9 10 8-6',
    gray:'M12 3c-2.5 3.8-6 7-6 11a6 6 0 0 0 12 0c0-4-3.5-7.2-6-11Zm-3 12.5a3.2 3.2 0 0 0 3 2',
    links:'m10 13 4-4m-6 6-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 8a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1',
    font:'m3 19 6-14 6 14M5 15h8m3-4h5m0 0v8m0-6c-4-2-6 6-2 6h2',
    motion:'M3 8h9M3 12h6m-6 4h9m3-8v8m4-8v8',
    reset:'M4 11a8 8 0 1 1 1.8 6m-2-10v5h5',
    check:'m5 12 4 4L19 6',
    minus:'M5 12h14',
    plus:'M5 12h14M12 5v14',
  };
  let storage;
  try {
    storage = window.localStorage;
    const saved = JSON.parse(storage.getItem(key));
    if ([90,100,110,120,130,140].includes(saved?.size)) settings.size = saved.size;
    for (const option of toggles) settings[option] = saved?.[option] === true;
  } catch {  }

  const element = (tag, parent, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (tag === 'button') node.type = 'button';
    parent.append(node);
    return node;
  };
  function addIcon(parent, name, className = '') {
    const ns = 'http://www.w3.org/2000/svg';
    const graphic = document.createElementNS(ns,'svg');
    graphic.setAttribute('viewBox','0 0 24 24');
    graphic.setAttribute('aria-hidden','true');
    graphic.setAttribute('focusable','false');
    graphic.setAttribute('class','access-icon ' + className);
    const path = document.createElementNS(ns,'path');
    path.setAttribute('d',icons[name]);
    graphic.append(path);
    parent.append(graphic);
  }
  const widget = element('div',document.body,'access-widget');
  const trigger = element('button',widget,'access-trigger');
  addIcon(trigger,'access');
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-controls','accessPanel');
  const panel = element('section',widget,'access-panel');
  panel.id = 'accessPanel';
  panel.hidden = true;
  panel.inert = true;
  panel.setAttribute('aria-labelledby','accessTitle');
  const banner = element('div',panel,'access-banner');
  addIcon(banner,'access','access-brand-icon');
  const heading = element('h2',banner);
  heading.id = 'accessTitle';
  const close = element('button',banner,'access-close');
  addIcon(close,'close');
  const content = element('div',panel,'access-content');
  const sizeArea = element('div',content,'access-text-area');
  const sizeTitle = element('h3',sizeArea);
  const sizeRow = element('div',sizeArea,'access-size');
  const smaller = element('button',sizeRow);
  addIcon(smaller,'minus');
  const currentSize = element('output',sizeRow);
  const larger = element('button',sizeRow);
  addIcon(larger,'plus');
  const controls = element('div',content,'access-controls');
  const buttons = {};
  const captions = {};
  for (const option of [...toggles,'reset']) {
    const button = element('button',controls,option === 'reset' ? 'access-reset' : 'access-mode');
    addIcon(button,option);
    captions[option] = element('span',button);
    if (option !== 'reset') addIcon(button,'check','access-check');
    buttons[option] = button;
  }
  const footer = element('div',panel,'access-footer');
  const statement = element('a',footer);
  const contact = element('a',footer);
  const status = element('span',panel,'access-status');
  status.setAttribute('role','status');
  const entry = document.getElementById('storeEntry');
  const purchase = document.getElementById('purchaseTerms');
  let strings;

  function translate() {
    const lang = entry?.lang || documentRoot.lang;
    strings = labels[lang] ?? labels.he;
    widget.lang = Object.hasOwn(labels, lang) ? lang : 'he';
    widget.dir = widget.lang === 'he' ? 'rtl' : 'ltr';
    trigger.setAttribute('aria-label',strings.title);
    heading.textContent = strings.title;
    sizeTitle.textContent = strings.size;
    close.setAttribute('aria-label',strings.close);
    smaller.setAttribute('aria-label',strings.smaller);
    larger.setAttribute('aria-label',strings.larger);
    currentSize.setAttribute('aria-label',strings.size);
    for (const option of [...toggles,'reset']) captions[option].textContent = strings[option];
    const suffix = widget.lang === 'he' ? '' : '-' + widget.lang;
    [statement.textContent,contact.textContent] = linkText[widget.lang];
    statement.href = './store-policies' + suffix + '.html#accessibility';
    contact.href = './privacy' + suffix + '.html#privacyContact';
  }

  function apply() {
    if (settings.size === 100) documentRoot.style.removeProperty('font-size');
    else documentRoot.style.fontSize = (baseFontSize * settings.size / 100) + 'px';
    for (const option of toggles) {
      documentRoot.classList.toggle('access-' + option, settings[option]);
      buttons[option].setAttribute('aria-pressed', String(settings[option]));
    }
    currentSize.value = settings.size + '%';
    smaller.disabled = settings.size === 90;
    larger.disabled = settings.size === 140;
  }

  function save() {
    try { storage?.setItem(key, JSON.stringify(settings)); } catch {  }
    apply();
  }

  function show(open, restoreFocus = true) {
    panel.hidden = !open;
    panel.inert = !open;
    trigger.setAttribute('aria-expanded',String(open));
    if (open) close.focus();
    else if (restoreFocus) trigger.focus();
  }

  trigger.onclick = () => show(panel.hidden);
  close.onclick = () => show(false);
  smaller.onclick = () => { settings.size -= 10; save(); };
  larger.onclick = () => { settings.size += 10; save(); };
  for (const option of toggles) buttons[option].onclick = () => { settings[option] = !settings[option]; save(); };
  buttons.reset.onclick = () => {
    Object.assign(settings,defaults);
    try { storage?.removeItem(key); } catch {  }
    apply();
    status.textContent = strings.restored;
  };
  widget.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      event.stopPropagation();
      show(false);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !widget.contains(event.target)) show(false,false);
  });

  if (entry) new MutationObserver(translate).observe(entry,{attributes:true,attributeFilter:['lang']});
  if (purchase) new MutationObserver(() => {
    show(false,false);
    (purchase.open ? purchase : document.body).append(widget);
  }).observe(purchase,{attributes:true,attributeFilter:['open']});
  translate();
  apply();
})();
