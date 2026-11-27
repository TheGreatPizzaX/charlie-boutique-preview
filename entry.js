(function (root) {
  'use strict';
  const termsKey = 'charlie-storefront:purchase-terms';
  const languageKey = 'charlie-storefront:entry-language';
  const enteredKey = 'charlie-storefront:entered';
  const words = {
    he: {
      language:'שפה',title:'ברוכים הבאים לצ׳ארלי בוטיק 🐾',
      notice: "רק בהסכמתכם נמדוד ביקורים, צפיות במוצרים, הוספות לסל ולחיצות ל־WhatsApp, כדי לשפר את החנות. המדידה משתמשת במזהה דפדפן אקראי ואינה כוללת שם, טלפון או תוכן הזמנה.",
      choice: "אפשר לקנות גם ללא מדידה ולשנות את הבחירה בכל עת דרך ״העדפות פרטיות״ בתחתית האתר.",
      policyLead: " לפרטים נוספים, ראו",
      prefs: "העדפות פרטיות",
      allow: "אישור מדידה",
      deny: "ללא מדידה",
      withdraw: "ביטול הסכמה",
      staff: "ביקור צוות · החרגה ממדידה בדפדפן זה",
      gpc: "הדפדפן מבקש שלא למדוד שימוש.",
      internal: "המדידה כבויה לביקור צוות.",
      yes: "המדידה פעילה בהסכמתכם.",
      no: "בחרתם להמשיך ללא מדידה.",
      pending: "טרם בחרתם אם לאפשר מדידה.",
      details: "המדידה כוללת גם סוג מכשיר כללי וקטגוריית מקור ההגעה. הנתונים נקלטים ונשמרים ב־Supabase. הדוחות זמינים למנהלים מורשים. לפניות פרטיות ולבקשות עיון ותיקון פנו לאלכסנדר אטוס בדוא״ל",
      withStats:'כניסה עם סטטיסטיקה',withoutStats:'כניסה ללא סטטיסטיקה',links:'מידע על החנות',
      terms:'תנאי שימוש',privacy:'מדיניות פרטיות',returns:'ביטולים והחזרות',accessibility:'נגישות',contact:'יצירת קשר',
      orderTitle:'אישור תנאי הרכישה',readTerms:'קריאת תנאי הרכישה המלאים',accept:'קראתי ואני מאשר/ת את תנאי הרכישה.',
      continue:'המשך ל־WhatsApp',cancel:'חזרה לסל',
    },
    ru: {
      language:'Язык',title:'Добро пожаловать в Charlie Boutique 🐾',
      notice: "Только с вашего согласия мы учитываем посещения, просмотры товаров, добавления в корзину и нажатия для перехода в WhatsApp, чтобы улучшать магазин. Используется случайный идентификатор браузера. Имя, телефон и содержание заказа в аналитику не входят.",
      choice: "Покупки доступны и без аналитики. Выбор можно изменить в любое время в разделе «Настройки конфиденциальности» внизу страницы.",
      policyLead: " Подробнее:",
      prefs: "Настройки конфиденциальности",
      allow: "Разрешить аналитику",
      deny: "Без аналитики",
      withdraw: "Отозвать согласие",
      staff: "Визит сотрудника · исключить этот браузер из аналитики",
      gpc: "Браузер запрашивает отключение аналитики.",
      internal: "Аналитика отключена для сотрудника.",
      yes: "Аналитика включена с вашего согласия.",
      no: "Вы выбрали режим без аналитики.",
      pending: "Вы ещё не выбрали режим аналитики.",
      details: "Мы также учитываем общий тип устройства и категорию источника перехода. Данные поступают в Supabase и хранятся там. Отчёты доступны уполномоченным администраторам. По вопросам конфиденциальности, доступа и исправления данных пишите Александру Атосу:",
      withStats:'Войти с аналитикой',withoutStats:'Войти без аналитики',links:'Информация о магазине',
      terms:'Условия',privacy:'Конфиденциальность',returns:'Возврат',accessibility:'Доступность',contact:'Контакты',
      orderTitle:'Подтверждение условий покупки',readTerms:'Прочитать условия покупки',accept:'Я ознакомился с условиями покупки и принимаю их.',
      continue:'Перейти в WhatsApp',cancel:'Вернуться в корзину',
    },
    en: {
      language:'Language',title:'Welcome to Charlie Boutique 🐾',
      notice: "Only with your permission, we measure visits, product views, cart additions and clicks to open WhatsApp to improve the store. Analytics uses a random browser identifier and excludes your name, phone number and order contents.",
      choice: "You can shop without analytics and change your choice anytime under Privacy preferences in the footer.",
      policyLead: " Learn more in our",
      prefs: "Privacy preferences",
      allow: "Allow analytics",
      deny: "No analytics",
      withdraw: "Withdraw consent",
      staff: "Staff visit · exclude this browser from analytics",
      gpc: "Your browser requests that analytics remain off.",
      internal: "Analytics is off for this staff visit.",
      yes: "Analytics is on with your permission.",
      no: "You chose to shop without analytics.",
      pending: "You have not chosen an analytics preference yet.",
      details: "We also record the broad device type and referral category. Supabase receives and stores the data. Only authorized administrators can view reports. For privacy questions or requests to access or correct your data, email Alexander Atos at",
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
      measurement?.localize(words[language], language);
      for (const container of [welcome,dialog]) {
        container.lang = language;
        container.dir = language === 'he' ? 'rtl' : 'ltr';
        for (const node of container.querySelectorAll('[data-entry]')) node.textContent = node.dataset.entry === 'rights' ? words[language].choice + words[language].policyLead : words[language][node.dataset.entry];
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
    try { if (!askForStatistics) entered ||= storage?.getItem(enteredKey) === 'yes'; } catch {  }
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
