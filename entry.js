(function (root) {
  'use strict';
  const termsKey = 'charlie-storefront:purchase-terms';
  const languageKey = 'charlie-storefront:entry-language';
  const enteredKey = 'charlie-storefront:entered';
  const words = {
    he: {
      language:'שפה',title:'ברוכים הבאים לצ׳ארלי בוטיק 🐾',
      notice:'כדי לשפר את חוויית הקנייה באתר, נשמח לקבל את הסכמתכם למדידת שימוש באמצעות מזהה דפדפן אקראי. המדידה אינה כוללת שם, טלפון או פרטי הזמנה.',
      rights:'הבחירה בידיכם, והיא אינה משפיעה על אפשרות הקנייה. ניתן לשנות אותה בכל עת. לפרטים נוספים, ראו',
      withStats:'כניסה עם סטטיסטיקה',withoutStats:'כניסה ללא סטטיסטיקה',links:'מידע על החנות',
      terms:'תנאי שימוש',privacy:'מדיניות פרטיות',returns:'ביטולים והחזרות',accessibility:'נגישות',contact:'יצירת קשר',
      orderTitle:'אישור תנאי הרכישה',readTerms:'קריאת תנאי הרכישה המלאים',accept:'קראתי ואני מאשר/ת את תנאי הרכישה.',
      continue:'המשך ל־WhatsApp',cancel:'חזרה לסל',
    },
    ru: {
      language:'Язык',title:'Добро пожаловать в Charlie Boutique 🐾',
      notice:'Чтобы улучшить покупки на сайте, просим разрешить измерение использования со случайным идентификатором браузера. Имена, номера телефонов и данные заказов в аналитику не входят.',
      rights:'Выбор за вами и не влияет на покупки. Изменить его можно в любое время. Подробнее:',
      withStats:'Войти с аналитикой',withoutStats:'Войти без аналитики',links:'Информация о магазине',
      terms:'Условия',privacy:'Конфиденциальность',returns:'Возврат',accessibility:'Доступность',contact:'Контакты',
      orderTitle:'Подтверждение условий покупки',readTerms:'Прочитать условия покупки',accept:'Я ознакомился с условиями покупки и принимаю их.',
      continue:'Перейти в WhatsApp',cancel:'Вернуться в корзину',
    },
    en: {
      language:'Language',title:'Welcome to Charlie Boutique 🐾',
      notice:'To improve shopping on this site, we’d like your permission to measure usage with a random browser identifier. Analytics excludes names, phone numbers and order details.',
      rights:'Your choice does not affect shopping, and you can change it any time. For details, see the',
      withStats:'Enter with analytics',withoutStats:'Enter without analytics',links:'Store information',
      terms:'Terms',privacy:'Privacy policy',returns:'Returns',accessibility:'Accessibility',contact:'Contact',
      orderTitle:'Accept the purchase terms',readTerms:'Read the full purchase terms',accept:'I have read and accept the purchase terms.',
      continue:'Continue to WhatsApp',cancel:'Back to cart',
    },
  };

  function createTerms({storage, version, now = () => new Date()}) {
    let acceptedInPage = false;
    return {
      accepted() {
        if (acceptedInPage) return true;
        try {
          const record = JSON.parse(storage?.getItem(termsKey));
          return record?.version === version && typeof record.acceptedAt === 'string' &&
            Number.isFinite(Date.parse(record.acceptedAt));
        } catch { return false; }
      },
      accept() {
        acceptedInPage = true;
        try { storage?.setItem(termsKey, JSON.stringify({version,acceptedAt:now().toISOString()})); }
        catch {  }
      },
    };
  }

  function mount({measurement, termsEnabled, termsVersion}) {
    const doc = root.document;
    const el = id => doc.getElementById(id);
    const welcome = el('storeEntry');
    const dialog = el('purchaseTerms');
    const selector = el('entryLanguage');
    let storage;
    try { storage = root.localStorage; } catch {  }
    const terms = createTerms({storage,version:termsVersion});
    let language = 'he';
    try {
      const saved = storage?.getItem(languageKey);
      if (Object.hasOwn(words,saved)) language = saved;
    } catch {  }
    function render() {
      for (const button of selector.querySelectorAll('[data-language]')) {
        button.setAttribute('aria-pressed', String(button.dataset.language === language));
      }
      for (const container of [welcome,dialog]) {
        container.lang = language;
        container.dir = language === 'he' ? 'rtl' : 'ltr';
        for (const node of container.querySelectorAll('[data-entry]')) node.textContent = words[language][node.dataset.entry];
        for (const node of container.querySelectorAll('[data-entry-label]')) node.setAttribute('aria-label',words[language][node.dataset.entryLabel]);
      }
      for (const link of doc.querySelectorAll('a[href^="./privacy"],a[href^="./store-policies"]')) {
        const url = new URL(link.href);
        const name = url.pathname.split('/').at(-1).replace(/(?:-ru|-en)?[.]html$/, '');
        const suffix = language === 'he' ? '' : '-' + language;
        link.setAttribute('href','./' + name + suffix + '.html' + url.hash);
      }
    }
    selector.addEventListener('click', event => {
      const choice = event.target.closest('[data-language]')?.dataset.language;
      if (!Object.hasOwn(words, choice)) return;
      language = choice;
      try { storage?.setItem(languageKey, language); } catch {  }
      render();
    });
    render();

    const content = el('storeContent');
    const preferencePanel = el('measurementPreferences');
    const state = measurement?.state();
    const askForStatistics = Boolean(state && !state.gpc && !state.staff);
    el('entryAllow').hidden = !askForStatistics;
    el('entryMeasurement').hidden = !askForStatistics;
    let entered = state?.consent === 'yes' || state?.consent === 'no';
    try { entered ||= storage?.getItem(enteredKey) === 'yes'; } catch {  }
    let onEnter;
    function reveal(animate) {
      welcome.hidden = true;
      content.hidden = false;
      if (animate) {
        content.classList.add('entry-reveal');
        content.tabIndex = -1;
        content.focus({preventScroll:true});
        root.scrollTo(0,0);
      }
      onEnter?.();
    }
    if (entered) reveal(false);
    else if (measurement) {
      preferencePanel.hidden = true;
      el('measurementOpen').setAttribute('aria-expanded','false');
    }
    function choose(allow) {
      if (entered || (allow && !askForStatistics)) return;
      if (measurement) {
        preferencePanel.querySelector(allow ? '[data-metrics-allow]' : '[data-metrics-deny]').click();
      }
      try { storage?.setItem(enteredKey, 'yes'); } catch {  }
      entered = true;
      reveal(true);
    }
    el('entryAllow').onclick = () => choose(true);
    el('entryDeny').onclick = () => choose(false);
    let pendingOrder;
    const checkbox = el('termsAccept');
    dialog.addEventListener('cancel', () => { pendingOrder = undefined; });
    el('termsCancel').onclick = () => {
      pendingOrder = undefined;
      dialog.close();
    };
    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      if (!checkbox.checked || !pendingOrder) return;
      terms.accept();
      const order = pendingOrder;
      pendingOrder = undefined;
      dialog.close();
      order();
    });
    return {
      whenEntered(action) {
        if (entered) action();
        else onEnter = action;
      },
      checkout(order) {
        if (!termsEnabled || terms.accepted()) return order();
        if (dialog.open) return;
        pendingOrder = order;
        checkbox.checked = false;
        dialog.showModal();
        checkbox.focus();
      },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = {createTerms,termsKey};
  else root.CharlieStoreEntry = {mount};
})(typeof window === 'undefined' ? globalThis : window);
