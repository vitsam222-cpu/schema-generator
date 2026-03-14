const STORAGE_KEY = 'schemaGeneratorStateV1';

const TYPES = {
  Organization: {
    label: 'Organization',
    fields: [
      { key: 'name', label: 'Название', required: true },
      { key: 'url', label: 'URL' },
      { key: 'logo', label: 'Лого URL' }
    ]
  },
  WebSite: {
    label: 'WebSite',
    fields: [
      { key: 'name', label: 'Название', required: true },
      { key: 'url', label: 'URL', required: true }
    ]
  },
  Article: {
    label: 'Article',
    fields: [
      { key: 'headline', label: 'Headline', required: true },
      { key: 'description', label: 'Описание' },
      { key: 'author', label: 'Автор' },
      { key: 'datePublished', label: 'Дата публикации' }
    ]
  },
  Service: {
    label: 'Service',
    fields: [
      { key: 'name', label: 'Название', required: true },
      { key: 'description', label: 'Описание', required: true },
      { key: 'serviceType', label: 'Тип услуги' }
    ]
  },
  Product: {
    label: 'Product',
    fields: [
      { key: 'name', label: 'Название', required: true },
      { key: 'description', label: 'Описание' },
      { key: 'price', label: 'Цена', required: true },
      { key: 'priceCurrency', label: 'Валюта (например, USD)', required: true },
      { key: 'availability', label: 'Наличие (URL schema.org)', required: true }
    ]
  },
  FAQPage: {
    label: 'FAQPage',
    fields: []
  },
  BreadcrumbList: {
    label: 'BreadcrumbList',
    fields: []
  },
  HowTo: {
    label: 'HowTo',
    fields: [
      { key: 'name', label: 'Название', required: true },
      { key: 'description', label: 'Описание' }
    ]
  },
  Recipe: {
    label: 'Recipe',
    fields: [
      { key: 'name', label: 'Название рецепта', required: true },
      { key: 'description', label: 'Описание' }
    ]
  }
};

const PRESETS = {
  sitewideHead: {
    label: 'Общий head для всего сайта',
    types: ['Organization', 'WebSite']
  },
  articlePage: { label: 'Статья', types: ['Article', 'BreadcrumbList'] },
  servicePage: { label: 'Услуга', types: ['Service', 'BreadcrumbList'] },
  productPage: { label: 'Товар', types: ['Product', 'BreadcrumbList'] },
  faqPage: { label: 'FAQ страница', types: ['FAQPage', 'BreadcrumbList'] },
  recipePage: { label: 'Рецепт', types: ['Recipe', 'HowTo', 'BreadcrumbList'] }
};

const defaultState = {
  selectedPreset: 'sitewideHead',
  selectedTypes: PRESETS.sitewideHead.types,
  data: {
    Organization: {}, WebSite: {}, Article: {}, Service: {}, Product: {}, FAQPage: {}, BreadcrumbList: {}, HowTo: {}, Recipe: {}
  }
};

const state = loadState();

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      data: { ...structuredClone(defaultState.data), ...(parsed.data || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderPresets() {
  const el = document.getElementById('presets');
  el.innerHTML = '';
  Object.entries(PRESETS).forEach(([id, preset]) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'preset';
    radio.checked = state.selectedPreset === id;
    radio.addEventListener('change', () => {
      state.selectedPreset = id;
      state.selectedTypes = [...preset.types];
      syncAndRender();
    });
    label.append(radio, document.createTextNode(preset.label));
    el.append(label);
  });
}

function renderTypes() {
  const el = document.getElementById('types');
  el.innerHTML = '';
  Object.keys(TYPES).forEach((type) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.selectedTypes.includes(type);
    cb.addEventListener('change', () => {
      if (cb.checked && !state.selectedTypes.includes(type)) state.selectedTypes.push(type);
      if (!cb.checked) state.selectedTypes = state.selectedTypes.filter((t) => t !== type);
      if (state.selectedPreset && !arraysEqual(state.selectedTypes, PRESETS[state.selectedPreset].types)) {
        state.selectedPreset = null;
      }
      syncAndRender();
    });
    label.append(cb, document.createTextNode(TYPES[type].label));
    el.append(label);
  });
}

function renderForms(errorsByType) {
  const container = document.getElementById('forms');
  container.innerHTML = '';

  state.selectedTypes.forEach((type) => {
    const section = document.createElement('section');
    section.className = 'form-section';
    section.innerHTML = `<h3>${type}</h3>`;

    TYPES[type].fields.forEach((field) => {
      const input = document.createElement('input');
      input.placeholder = `${field.label}${field.required ? ' *' : ''}`;
      input.value = state.data[type][field.key] || '';
      if (errorsByType[type]?.includes(field.key)) input.classList.add('error-field');
      input.addEventListener('input', (e) => {
        state.data[type][field.key] = e.target.value;
        syncAndRender();
      });
      section.append(input);
    });

    if (type === 'FAQPage') section.append(renderListEditor('FAQ', type, 'questions', ['question', 'answer']));
    if (type === 'BreadcrumbList') section.append(renderListEditor('Хлебные крошки', type, 'items', ['name', 'url']));
    if (type === 'HowTo') section.append(renderListEditor('Шаги', type, 'steps', ['name', 'text']));
    if (type === 'Recipe') {
      section.append(renderSimpleStringListEditor('Ингредиенты', type, 'ingredients'));
      section.append(renderListEditor('Шаги', type, 'steps', ['name', 'text']));
    }

    container.append(section);
  });
}

function renderListEditor(title, type, key, fields) {
  const wrap = document.createElement('div');
  const list = state.data[type][key] || [];
  wrap.innerHTML = `<strong>${title}</strong>`;
  list.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    const left = document.createElement('div');
    fields.forEach((field) => {
      const input = document.createElement('input');
      input.placeholder = field;
      input.value = item[field] || '';
      input.addEventListener('input', (e) => {
        state.data[type][key][idx][field] = e.target.value;
        syncAndRender();
      });
      left.append(input);
    });
    const del = document.createElement('button');
    del.textContent = '✕';
    del.addEventListener('click', () => {
      state.data[type][key].splice(idx, 1);
      syncAndRender();
    });
    row.append(left, del);
    wrap.append(row);
  });
  const add = document.createElement('button');
  add.textContent = `Добавить: ${title}`;
  add.addEventListener('click', () => {
    if (!state.data[type][key]) state.data[type][key] = [];
    state.data[type][key].push(Object.fromEntries(fields.map((f) => [f, ''])));
    syncAndRender();
  });
  wrap.append(add);
  return wrap;
}

function renderSimpleStringListEditor(title, type, key) {
  const wrap = document.createElement('div');
  const list = state.data[type][key] || [];
  wrap.innerHTML = `<strong>${title}</strong>`;
  list.forEach((value, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    const input = document.createElement('input');
    input.value = value;
    input.placeholder = 'ingredient';
    input.addEventListener('input', (e) => {
      state.data[type][key][idx] = e.target.value;
      syncAndRender();
    });
    const del = document.createElement('button');
    del.textContent = '✕';
    del.addEventListener('click', () => {
      state.data[type][key].splice(idx, 1);
      syncAndRender();
    });
    row.append(input, del);
    wrap.append(row);
  });
  const add = document.createElement('button');
  add.textContent = `Добавить: ${title}`;
  add.addEventListener('click', () => {
    if (!state.data[type][key]) state.data[type][key] = [];
    state.data[type][key].push('');
    syncAndRender();
  });
  wrap.append(add);
  return wrap;
}

function buildGraph() {
  const errors = [];
  const errorsByType = {};
  const graph = [];

  for (const type of state.selectedTypes) {
    const data = state.data[type] || {};
    const commonMissing = TYPES[type].fields
      .filter((f) => f.required && !data[f.key])
      .map((f) => f.key);
    if (commonMissing.length) errorsByType[type] = [...(errorsByType[type] || []), ...commonMissing];

    if (type === 'FAQPage') {
      const qa = (data.questions || []).filter((x) => x.question && x.answer);
      if (!qa.length) {
        errors.push('FAQPage: добавьте хотя бы один вопрос и ответ.');
        continue;
      }
      graph.push({ '@type': 'FAQPage', mainEntity: qa.map((x) => ({ '@type': 'Question', name: x.question, acceptedAnswer: { '@type': 'Answer', text: x.answer } })) });
      continue;
    }

    if (type === 'BreadcrumbList') {
      const items = (data.items || []).filter((x) => x.name && x.url);
      if (items.length < 2) {
        errors.push('BreadcrumbList: минимум 2 элемента.');
        continue;
      }
      graph.push({ '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.url })) });
      continue;
    }

    if (type === 'HowTo') {
      const steps = (data.steps || []).filter((x) => x.name || x.text);
      if (!steps.length) {
        errors.push('HowTo: добавьте шаги.');
        continue;
      }
      if (!data.name) errors.push('HowTo: заполните name.');
      graph.push({ '@type': 'HowTo', name: data.name || 'HowTo title', description: data.description || '', step: steps.map((x) => ({ '@type': 'HowToStep', name: x.name || 'Step', text: x.text || '' })) });
      continue;
    }

    if (type === 'Recipe') {
      const ingredients = (data.ingredients || []).filter(Boolean);
      const steps = (data.steps || []).filter((x) => x.name || x.text);
      if (!ingredients.length || !steps.length) {
        errors.push('Recipe: нужны ингредиенты и шаги.');
        continue;
      }
      if (!data.name) errors.push('Recipe: заполните name.');
      graph.push({ '@type': 'Recipe', name: data.name || 'Recipe title', description: data.description || '', recipeIngredient: ingredients, recipeInstructions: steps.map((x) => ({ '@type': 'HowToStep', name: x.name || 'Step', text: x.text || '' })) });
      continue;
    }

    if (type === 'Product') {
      const required = ['name', 'price', 'priceCurrency', 'availability'];
      if (required.some((k) => !data[k])) {
        errors.push('Product: обязательны name/price/priceCurrency/availability.');
        continue;
      }
      graph.push({ '@type': 'Product', name: data.name, description: data.description || '', offers: { '@type': 'Offer', price: data.price, priceCurrency: data.priceCurrency, availability: data.availability } });
      continue;
    }

    if (type === 'Service') {
      if (!data.name || !(data.description || data.serviceType)) {
        errors.push('Service: обязательны name и описание/тип услуги.');
        continue;
      }
      graph.push({ '@type': 'Service', name: data.name, description: data.description || '', serviceType: data.serviceType || '' });
      continue;
    }

    const payload = { '@type': type };
    for (const [k, v] of Object.entries(data)) {
      if (v !== '' && v != null) payload[k] = v;
    }
    if (Object.keys(payload).length === 1) {
      errors.push(`${type}: сущность пустая и исключена.`);
      continue;
    }
    graph.push(payload);
  }

  return { graph, errors, errorsByType };
}

function renderOutput() {
  const { graph, errors, errorsByType } = buildGraph();
  const obj = graph.length > 1
    ? { '@context': 'https://schema.org', '@graph': graph }
    : { '@context': 'https://schema.org', ...(graph[0] || {}) };

  document.getElementById('output').textContent = JSON.stringify(obj, null, 2);
  document.getElementById('errors').innerHTML = errors.map((e) => `<div>• ${e}</div>`).join('') || 'Ошибок нет';
  renderForms(errorsByType);
}

function syncAndRender() {
  saveState();
  renderPresets();
  renderTypes();
  renderOutput();
}

function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const sa = [...a].sort().join(',');
  const sb = [...b].sort().join(',');
  return sa === sb;
}

document.getElementById('clearBtn').addEventListener('click', () => {
  state.data = structuredClone(defaultState.data);
  state.selectedPreset = 'sitewideHead';
  state.selectedTypes = [...PRESETS.sitewideHead.types];
  syncAndRender();
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(document.getElementById('output').textContent);
  document.getElementById('copyBtn').textContent = 'Скопировано!';
  setTimeout(() => (document.getElementById('copyBtn').textContent = 'Копировать'), 1200);
});

syncAndRender();
