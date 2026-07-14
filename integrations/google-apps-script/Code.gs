const BLESK23_CONFIG = Object.freeze({
  amoBaseUrl: 'https://imperiableska2025.amocrm.ru',
  pipelineId: 10579898,
  firstStageName: 'В работе (связь с клиентом)',
  responsibleUserId: 13491146,
  sheetName: 'Ответы на форму (1)',
  mergeWindowDays: 30,
  phoneClickAttributionMinutes: 15,
  messengerClickAttributionMinutes: 20,
  operationalSyncMinutes: 15,
  metrikaCounterId: 107216997,
  metrikaSyncMinutes: 15,
  metrikaLookbackDays: 21,
  metrikaQueueSheetName: 'Метрика — конверсии',
  sourceExternalId: 'blesk23_google_forms_2026',
  sourceName: 'Blesk23 — формы сайта',
  mergeableStageNames: [
    'В работе (связь с клиентом)',
    'Нужен осмотр (дата осмотра)',
    'Принимают решение',
    'Чаты активные',
  ],
  metrikaGoals: [
    { target: 'qualified_lead', name: 'Квалифицированный лид (amoCRM)' },
    { target: 'booking', name: 'Запись на уборку (amoCRM)' },
    { target: 'service_completed', name: 'Уборка выполнена (amoCRM)' },
    { target: 'paid_order', name: 'Оплаченный заказ (amoCRM)' },
    { target: 'paid_new_client', name: 'Оплаченный новый клиент (amoCRM)' },
  ],
  siteEngagementGoals: [
    { target: 'reviews_open', name: 'Просмотр блока отзывов' },
    { target: 'review_card_click', name: 'Клик по выбранному отзыву' },
    { target: 'reviews_all_click', name: 'Переход ко всем отзывам' },
    { target: 'review_create_click', name: 'Переход к публикации отзыва' },
  ],
});

const ATTRIBUTION_HEADER_MAP = Object.freeze({
  source: 'Источник обращения',
  service: 'Услуга',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_content: 'utm_content',
  utm_term: 'utm_term',
  yclid: 'yclid',
  metrika_client_id: 'metrika_client_id',
  landing_page: 'Первая посадочная',
  current_page: 'Текущая страница',
  first_source: 'Первый источник',
  referrer: 'utm_referer',
  utm_referer: 'utm_referer',
  utm_ya_campaign: 'utm_ya_campaign',
  utm_candidate: 'utm_candidate',
  ybaip: 'ybaip',
  captured_at: 'captured_at',
});

function setupIntegration() {
  requireAmoToken_();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const handlers = ScriptApp.getProjectTriggers().filter(
    (trigger) => trigger.getHandlerFunction() === 'handleFormSubmit'
  );

  handlers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('handleFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  return Object.assign(testAmoConnection(), {
    sourceName: BLESK23_CONFIG.sourceName,
    sourceStatus: 'created_by_amocrm_after_first_lead',
  });
}

function testAmoConnection() {
  const account = amoRequest_('/api/v4/account', 'get');
  return {
    accountId: account.id,
    accountName: account.name,
    timezone: account.timezone,
  };
}

function handleFormSubmit(event) {
  if (!event || !event.range) {
    throw new Error('Функция должна запускаться установленным триггером Google Forms.');
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    syncRow_(event.range.getSheet(), event.range.getRow());
  } finally {
    lock.releaseLock();
  }
}

function retryRow(rowNumber) {
  const row = Number(rowNumber);
  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Укажите номер строки, начиная со 2.');
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    BLESK23_CONFIG.sheetName
  );
  if (!sheet) throw new Error(`Лист «${BLESK23_CONFIG.sheetName}» не найден.`);

  syncRow_(sheet, row, true);
}

function syncRow_(sheet, rowNumber, force) {
  if (sheet.getName() !== BLESK23_CONFIG.sheetName) return;

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const values = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  const record = rowToObject_(headers, values);

  if (!force && record.amo_sync_status) return;

  try {
    const parsed = parseLeadMessage_(record['Сообщение'] || '');
    if (isTrackingClickEvent_(parsed.attribution.event_kind)) {
      const clickSource = inferSource_(parsed.attribution);
      writeTechnicalValues_(
        sheet,
        rowNumber,
        headers,
        Object.assign({}, parsed.attribution, {
          source: clickSource,
          first_source: clickSource,
        })
      );
      writeSyncResult_(sheet, rowNumber, headers, {
        amo_sync_status: parsed.attribution.event_kind === 'phone_click'
          ? 'phone_click_logged'
          : 'messenger_click_logged',
        amo_sync_error: '',
        amo_synced_at: new Date().toISOString(),
      });
      return;
    }

    let phoneClickMatch = null;
    if (parsed.attribution.event_kind === 'internal_calc') {
      phoneClickMatch = findRecentPhoneClick_(sheet, rowNumber, headers);
      if (phoneClickMatch && phoneClickMatch.rowNumber) {
        parsed.attribution = Object.assign(
          {},
          phoneClickMatch.attribution,
          parsed.attribution,
          {
            attribution_method: 'single_phone_click_time_window',
            attribution_confidence: 'heuristic',
            phone_click_at: phoneClickMatch.createdAt.toISOString(),
          }
        );
      } else {
        parsed.attribution.attribution_method = phoneClickMatch && phoneClickMatch.ambiguous
          ? `ambiguous_phone_clicks_${phoneClickMatch.count}`
          : 'no_recent_phone_click';
        parsed.attribution.attribution_confidence = 'unattributed';
      }
    }

    const service = inferService_(parsed.message, parsed.attribution);
    const source = inferSource_(parsed.attribution);
    const technicalValues = Object.assign({}, parsed.attribution, {
      source,
      service,
      first_source: source,
    });

    writeTechnicalValues_(sheet, rowNumber, headers, technicalValues);

    const leadData = {
      name: record['Имя'] || 'Клиент с сайта',
      phone: record['Телефон'] || '',
      service,
      source,
      attribution: parsed.attribution,
      price: parseMoney_(parsed.attribution.calc_price),
      leadName: parsed.attribution.calc_lead_name || '',
      eventKind: parsed.attribution.event_kind || '',
    };
    const contactData = {
      name: leadData.name,
      phone: leadData.phone,
      email: record['E-mail'] || '',
    };
    const upsert = createOrMergeLead_(leadData, contactData);
    const lead = upsert.lead;

    if (phoneClickMatch && phoneClickMatch.rowNumber) {
      writeSyncResult_(sheet, phoneClickMatch.rowNumber, headers, {
        amo_lead_id: String(lead.id),
        amo_sync_status: 'phone_click_claimed',
        amo_sync_error: `claimed_by_row_${rowNumber}`,
        amo_synced_at: new Date().toISOString(),
      });
    }

    addLeadNote_(lead.id, parsed.message, parsed.attribution);

    writeSyncResult_(sheet, rowNumber, headers, {
      amo_lead_id: String(lead.id),
      amo_sync_status: upsert.action,
      amo_sync_error: '',
      amo_synced_at: new Date().toISOString(),
    });
  } catch (error) {
    writeSyncResult_(sheet, rowNumber, headers, {
      amo_sync_status: 'error',
      amo_sync_error: String(error && error.message ? error.message : error).slice(0, 500),
      amo_synced_at: new Date().toISOString(),
    });
    throw error;
  }
}

function parseLeadMessage_(rawMessage) {
  const marker = '\n\nАтрибуция:\n';
  const markerIndex = rawMessage.indexOf(marker);
  if (markerIndex === -1) {
    return { message: rawMessage.trim(), attribution: {} };
  }

  const message = rawMessage.slice(0, markerIndex).trim();
  const lines = rawMessage.slice(markerIndex + marker.length).split('\n');
  const attribution = {};

  lines.forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && value) attribution[key] = value;
  });

  return { message, attribution };
}

function inferSource_(attribution) {
  const source = String(attribution.utm_source || '').toLowerCase();
  if (source.includes('yandex_business') || attribution.ybaip) return 'Яндекс Бизнес';
  if (source.includes('yandex')) return 'Яндекс Директ';
  if (source.includes('google')) return 'Google';
  if (source) return `Сайт / ${attribution.utm_source}`;
  if (attribution.yclid) return 'Яндекс Директ';
  if (attribution.event_kind === 'internal_calc') return 'Телефон / источник не определён';
  return 'Сайт / прямой переход';
}

function isTrackingClickEvent_(eventKind) {
  return /^(phone|whatsapp|telegram|max)_click$/.test(String(eventKind || ''));
}

function getMessengerChannelFromEvent_(eventKind) {
  const match = String(eventKind || '').match(/^(whatsapp|telegram|max)_click$/);
  return match ? match[1] : '';
}

function findRecentPhoneClick_(sheet, calcRowNumber, headers) {
  const messageColumn = headers.indexOf('Сообщение');
  const statusColumn = headers.indexOf('amo_sync_status');
  const timestampColumn = Math.max(
    headers.indexOf('Отметка времени'),
    headers.indexOf('Timestamp'),
    0
  );
  if (messageColumn === -1 || calcRowNumber <= 2) return null;

  const calcTimestampValue = sheet.getRange(calcRowNumber, timestampColumn + 1).getValue();
  const calcTimestamp = calcTimestampValue instanceof Date
    ? calcTimestampValue
    : new Date(calcTimestampValue || Date.now());
  const cutoff = new Date(
    calcTimestamp.getTime() - BLESK23_CONFIG.phoneClickAttributionMinutes * 60000
  );
  const firstRow = Math.max(2, calcRowNumber - 200);
  const rows = sheet
    .getRange(firstRow, 1, calcRowNumber - firstRow, headers.length)
    .getValues();

  const candidates = [];
  rows.forEach((values, index) => {
    const status = statusColumn === -1 ? '' : String(values[statusColumn] || '');
    if (status && status !== 'phone_click_logged') return;

    const parsed = parseLeadMessage_(String(values[messageColumn] || ''));
    if (parsed.attribution.event_kind !== 'phone_click') return;

    const rawCreatedAt = values[timestampColumn];
    const createdAt = rawCreatedAt instanceof Date ? rawCreatedAt : new Date(rawCreatedAt);
    if (Number.isNaN(createdAt.getTime())) return;
    if (createdAt < cutoff || createdAt > calcTimestamp) return;

    candidates.push({
      rowNumber: firstRow + index,
      attribution: parsed.attribution,
      createdAt,
    });
  });

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) return { ambiguous: true, count: candidates.length };
  return null;
}

function parseMoney_(value) {
  const normalized = String(value || '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function inferService_(message, attribution) {
  const haystack = `${message} ${attribution.current_page || ''} ${
    attribution.landing_page || ''
  }`.toLowerCase();

  if (/после ремонта|posle-remonta/.test(haystack)) return 'Уборка после ремонта';
  if (/окн|moyka-okon/.test(haystack)) return 'Мойка окон';
  if (/мебел|химчист|furniture/.test(haystack)) return 'Химчистка мебели';
  if (/генеральн/.test(haystack)) return 'Генеральная уборка';
  if (/поддерживающ|влажн/.test(haystack)) return 'Поддерживающая уборка';
  return 'Клининг';
}

function findContactByPhone_(phoneValue) {
  const phone = normalizePhone_(phoneValue);
  if (!phone) return null;

  const query = encodeURIComponent(phone.replace(/\D/g, ''));
  const result = amoRequest_(`/api/v4/contacts?query=${query}&limit=50`, 'get');
  const contacts = result && result._embedded ? result._embedded.contacts || [] : [];
  return contacts.find((contact) => contactHasPhone_(contact, phone)) || null;
}

function createContact_(contactData) {
  const phone = normalizePhone_(contactData.phone);
  if (!phone) throw new Error('Некорректный телефон в заявке.');

  const fieldMap = getCustomFieldMap_('contacts');
  const customFields = [];
  const phoneField = fieldMap.byCode.PHONE;
  const emailField = fieldMap.byCode.EMAIL;

  if (!phoneField) throw new Error('Системное поле PHONE не найдено в amoCRM.');
  customFields.push({ field_id: phoneField.id, values: [{ value: phone, enum_code: 'WORK' }] });

  if (contactData.email && emailField) {
    customFields.push({
      field_id: emailField.id,
      values: [{ value: contactData.email, enum_code: 'WORK' }],
    });
  }

  const response = amoRequest_('/api/v4/contacts', 'post', [
    {
      name: contactData.name,
      responsible_user_id: BLESK23_CONFIG.responsibleUserId,
      custom_fields_values: customFields,
    },
  ]);
  return response._embedded.contacts[0];
}

function findOrCreateContact_(contactData) {
  return findContactByPhone_(contactData.phone) || createContact_(contactData);
}

function contactHasPhone_(contact, expectedPhone) {
  const values = contact.custom_fields_values || [];
  return values.some((field) => {
    if (field.field_code !== 'PHONE') return false;
    return (field.values || []).some(
      (item) => normalizePhone_(item.value) === expectedPhone
    );
  });
}

function createOrMergeLead_(leadData, contactData) {
  const pipeline = getPipeline_();
  const firstStage = getFirstStage_(pipeline);
  let contact = findContactByPhone_(contactData.phone);

  if (contact) {
    const unsorted = findUnsortedForContact_(contact.id);
    if (unsorted) {
      const accepted = amoRequest_(
        `/api/v4/leads/unsorted/${unsorted.uid}/accept`,
        'post',
        {
          user_id: BLESK23_CONFIG.responsibleUserId,
          status_id: firstStage.id,
        }
      );
      const acceptedLeadId = accepted._embedded.leads[0].id;
      const acceptedLead = amoRequest_(`/api/v4/leads/${acceptedLeadId}`, 'get');
      const lead = updateExistingLead_(acceptedLead, leadData);
      linkContactToLeadIfNeeded_(lead.id, contact.id);
      return { lead, contact, action: 'merged_unsorted' };
    }

    const existingLead = findMergeableLeadForContact_(contact.id, pipeline);
    if (existingLead) {
      const lead = updateExistingLead_(existingLead, leadData);
      linkContactToLeadIfNeeded_(lead.id, contact.id);
      return { lead, contact, action: 'merged_existing' };
    }
  }

  return createOrMergeWithDuplicationControl_(
    leadData,
    contactData,
    firstStage
  );
}

function createOrMergeWithDuplicationControl_(
  leadData,
  contactData,
  firstStage
) {
  const phone = normalizePhone_(contactData.phone);
  if (!phone) throw new Error('Некорректный телефон в заявке.');

  const leadFieldMap = getCustomFieldMap_('leads');
  const contactFieldMap = getCustomFieldMap_('contacts');
  const phoneField = contactFieldMap.byCode.PHONE;
  const emailField = contactFieldMap.byCode.EMAIL;
  if (!phoneField) throw new Error('Системное поле PHONE не найдено в amoCRM.');

  const contactFields = [
    {
      field_id: phoneField.id,
      values: [{ value: phone, enum_code: 'WORK' }],
    },
  ];
  if (contactData.email && emailField) {
    contactFields.push({
      field_id: emailField.id,
      values: [{ value: contactData.email, enum_code: 'WORK' }],
    });
  }

  const leadPayload = {
      name: leadData.leadName || `Заявка с сайта — ${leadData.service}`,
      pipeline_id: BLESK23_CONFIG.pipelineId,
      status_id: firstStage.id,
      responsible_user_id: BLESK23_CONFIG.responsibleUserId,
      custom_fields_values: buildLeadFieldValues_(leadData, leadFieldMap, null),
      request_id: `sheet_${Date.now()}_${phone.slice(-4)}`,
      _embedded: {
        contacts: [
          {
            name: contactData.name,
            responsible_user_id: BLESK23_CONFIG.responsibleUserId,
            custom_fields_values: contactFields,
          },
        ],
      },
    };
  if (leadData.price) leadPayload.price = leadData.price;

  const response = amoRequest_('/api/v4/leads/complex', 'post', [leadPayload]);

  const result = response && response[0];
  if (!result || !result.id) {
    throw new Error('amoCRM не вернула ID созданной или объединённой сделки.');
  }

  let lead = amoRequest_(`/api/v4/leads/${result.id}`, 'get');
  const unsorted = findUnsortedForLead_(lead.id);
  if (unsorted) {
    const accepted = amoRequest_(
      `/api/v4/leads/unsorted/${unsorted.uid}/accept`,
      'post',
      {
        user_id: BLESK23_CONFIG.responsibleUserId,
        status_id: firstStage.id,
      }
    );
    lead = amoRequest_(`/api/v4/leads/${accepted._embedded.leads[0].id}`, 'get');
  }

  lead = updateExistingLead_(lead, leadData);
  const contactId = Number(result.contact_id) || findMainContactIdForLead_(lead.id);
  const contact = contactId ? { id: contactId } : null;

  return {
    lead,
    contact,
    action: result.merged || unsorted ? 'merged_by_phone' : 'created',
  };
}

function findUnsortedForContact_(contactId) {
  const result = amoRequest_(
    `/api/v4/leads/unsorted?filter[pipeline_id]=${BLESK23_CONFIG.pipelineId}&limit=250&order[created_at]=desc`,
    'get'
  );
  const unsorted = result && result._embedded ? result._embedded.unsorted || [] : [];
  return (
    unsorted.find((item) =>
      ((item._embedded && item._embedded.contacts) || []).some(
        (contact) => Number(contact.id) === Number(contactId)
      )
    ) || null
  );
}

function findUnsortedForLead_(leadId) {
  const result = amoRequest_(
    `/api/v4/leads/unsorted?filter[pipeline_id]=${BLESK23_CONFIG.pipelineId}&limit=250&order[created_at]=desc`,
    'get'
  );
  const unsorted = result && result._embedded ? result._embedded.unsorted || [] : [];
  return (
    unsorted.find((item) =>
      ((item._embedded && item._embedded.leads) || []).some(
        (lead) => Number(lead.id) === Number(leadId)
      )
    ) || null
  );
}

function findMainContactIdForLead_(leadId) {
  const lead = amoRequest_(`/api/v4/leads/${leadId}?with=contacts`, 'get');
  const contacts = lead && lead._embedded ? lead._embedded.contacts || [] : [];
  const main = contacts.find((contact) => contact.is_main) || contacts[0];
  return main ? Number(main.id) : null;
}

function findMergeableLeadForContact_(contactId, pipeline) {
  const contact = amoRequest_(`/api/v4/contacts/${contactId}?with=leads`, 'get');
  const linkedLeads = contact && contact._embedded ? contact._embedded.leads || [] : [];
  const allowedStatusIds = new Set(
    getPipelineStatuses_(pipeline)
      .filter((status) => BLESK23_CONFIG.mergeableStageNames.indexOf(status.name) !== -1)
      .map((status) => Number(status.id))
  );
  const cutoff = Math.floor(Date.now() / 1000) - BLESK23_CONFIG.mergeWindowDays * 86400;

  return linkedLeads
    .map((item) => amoRequest_(`/api/v4/leads/${item.id}`, 'get'))
    .filter(
      (lead) =>
        Number(lead.pipeline_id) === BLESK23_CONFIG.pipelineId &&
        !lead.closed_at &&
        allowedStatusIds.has(Number(lead.status_id)) &&
        Number(lead.updated_at || lead.created_at || 0) >= cutoff
    )
    .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0))[0] || null;
}

function createLead_(leadData, pipeline, firstStage) {
  const fieldMap = getCustomFieldMap_('leads');
  const fieldValues = buildLeadFieldValues_(leadData, fieldMap, null);

  const payload = {
      name: leadData.leadName || `Заявка с сайта — ${leadData.service}`,
      pipeline_id: BLESK23_CONFIG.pipelineId,
      status_id: firstStage.id,
      responsible_user_id: BLESK23_CONFIG.responsibleUserId,
      custom_fields_values: fieldValues,
    };
  if (leadData.price) payload.price = leadData.price;

  const response = amoRequest_('/api/v4/leads', 'post', [payload]);
  return response._embedded.leads[0];
}

function updateExistingLead_(existingLead, leadData) {
  const fieldMap = getCustomFieldMap_('leads');
  const fieldValues = buildLeadFieldValues_(leadData, fieldMap, existingLead);
  const payload = {
    id: existingLead.id,
    responsible_user_id: BLESK23_CONFIG.responsibleUserId,
    custom_fields_values: fieldValues,
  };

  if (leadData.price) payload.price = leadData.price;

  if (leadData.leadName && leadData.eventKind === 'internal_calc') {
    payload.name = leadData.leadName;
  } else if (/^(Сделка #|Заявка от)/i.test(existingLead.name || '')) {
    payload.name = `Заявка — ${leadData.service} — ${leadData.name}`;
  }

  const response = amoRequest_('/api/v4/leads', 'patch', [payload]);
  return response._embedded.leads[0];
}

function buildLeadFieldValues_(leadData, fieldMap, existingLead) {
  const valuesByName = {
    'Источник обращения': leadData.source,
    'Услуга': leadData.service,
    utm_source: leadData.attribution.utm_source,
    utm_medium: leadData.attribution.utm_medium,
    utm_campaign: leadData.attribution.utm_campaign,
    utm_content: leadData.attribution.utm_content,
    utm_term: leadData.attribution.utm_term,
    yclid: leadData.attribution.yclid,
    metrika_client_id: leadData.attribution.metrika_client_id,
    'Первая посадочная': leadData.attribution.landing_page,
    'Текущая страница': leadData.attribution.current_page,
    'Первый источник': leadData.source,
    utm_referer: leadData.attribution.utm_referer || leadData.attribution.referrer,
    utm_ya_campaign: leadData.attribution.utm_ya_campaign,
    utm_candidate: leadData.attribution.utm_candidate,
    ybaip: leadData.attribution.ybaip,
    captured_at: leadData.attribution.captured_at,
  };
  const existingByFieldId = {};

  ((existingLead && existingLead.custom_fields_values) || []).forEach((field) => {
    const first = field.values && field.values[0];
    if (first && first.value !== undefined && first.value !== '') {
      existingByFieldId[Number(field.field_id)] = String(first.value);
    }
  });

  const fieldValues = [];

  Object.keys(valuesByName).forEach((name) => {
    let value = valuesByName[name];
    const field = fieldMap.byName[name];
    if (!value || !field) return;
    const existingValue = existingByFieldId[Number(field.id)];

    const replacesUnknownSource =
      (name === 'Источник обращения' || name === 'Первый источник') &&
      /не определ[её]н|прямой переход/i.test(existingValue || '') &&
      !/не определ[её]н|прямой переход/i.test(String(value));

    if (name === 'Услуга' && existingValue && existingValue !== String(value)) {
      const services = existingValue.split(';').map((item) => item.trim());
      if (services.indexOf(String(value)) === -1) value = `${existingValue}; ${value}`;
      else value = existingValue;
    } else if (name !== 'Текущая страница' && existingValue && !replacesUnknownSource) {
      value = existingValue;
    }

    fieldValues.push({ field_id: field.id, values: [{ value: String(value) }] });
  });
  return fieldValues;
}

function getPipeline_() {
  return amoRequest_(`/api/v4/leads/pipelines/${BLESK23_CONFIG.pipelineId}`, 'get');
}

function getPipelineStatuses_(pipeline) {
  return pipeline && pipeline._embedded ? pipeline._embedded.statuses || [] : [];
}

function getFirstStage_(pipeline) {
  const status = getPipelineStatuses_(pipeline).find(
    (item) => item.name === BLESK23_CONFIG.firstStageName
  );
  if (!status) throw new Error(`Этап «${BLESK23_CONFIG.firstStageName}» не найден.`);
  return status;
}

function linkContactToLeadIfNeeded_(leadId, contactId) {
  const links = amoRequest_(`/api/v4/leads/${leadId}/links`, 'get');
  const existingLinks = links && links._embedded ? links._embedded.links || [] : [];
  const alreadyLinked = existingLinks.some(
    (link) =>
      link.to_entity_type === 'contacts' && Number(link.to_entity_id) === Number(contactId)
  );
  if (alreadyLinked) return;

  amoRequest_(`/api/v4/leads/${leadId}/link`, 'post', [
    {
      to_entity_id: contactId,
      to_entity_type: 'contacts',
      metadata: { main_contact: true },
    },
  ]);
}

function addLeadNote_(leadId, message, attribution) {
  const attributionText = Object.keys(attribution)
    .sort()
    .map((key) => `${key}: ${attribution[key]}`)
    .join('\n');
  const text = [message || 'Заявка с сайта', attributionText]
    .filter(Boolean)
    .join('\n\nАтрибуция:\n');

  amoRequest_(`/api/v4/leads/${leadId}/notes`, 'post', [
    { note_type: 'common', params: { text: text.slice(0, 10000) } },
  ]);
}

function setupOperationalAutomation() {
  requireAmoToken_();

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'syncAmoLeadAutomation')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('syncAmoLeadAutomation')
    .timeBased()
    .everyMinutes(BLESK23_CONFIG.operationalSyncMinutes)
    .create();

  return Object.assign(syncAmoLeadAutomation(), {
    trigger: `every_${BLESK23_CONFIG.operationalSyncMinutes}_minutes`,
  });
}

function syncAmoLeadAutomation() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    requireAmoToken_();
    const result = applyAmoLeadAutomation_();
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function applyAmoLeadAutomation_() {
  const pipeline = getPipeline_();
  const statuses = getPipelineStatuses_(pipeline);
  const statusesById = {};
  statuses.forEach((status) => {
    statusesById[Number(status.id)] = normalizeMetrikaState_(status.name);
  });

  const successfulStatusIds = new Set(
    statuses
      .filter((status) => /успешно реализовано/.test(normalizeMetrikaState_(status.name)))
      .map((status) => Number(status.id))
  );
  const fieldMap = getCustomFieldMap_('leads');
  const leads = listRecentAmoLeads_();
  const leadCache = {};
  leads.forEach((lead) => {
    leadCache[Number(lead.id)] = lead;
  });

  const updates = [];
  const result = {
    scannedLeads: leads.length,
    updatedLeads: 0,
    qualificationFilled: 0,
    clientTypeFilled: 0,
    paidFilled: 0,
    paidDateFilled: 0,
    skippedMissingFieldConfiguration: 0,
  };

  leads.forEach((lead) => {
    const status = statusesById[Number(lead.status_id)] || '';
    if (/закрыто и не реализовано/.test(status)) return;

    const fieldValues = [];
    const qualification = getLeadFieldValue_(lead, fieldMap, 'Квалификация');
    const isQualifiedStage = /нужен осмотр|принимают решение|назначена дата клининга|выполнен|успешно реализовано/.test(status);
    if (!hasAmoValue_(qualification) && isQualifiedStage) {
      const update = buildAmoChoiceUpdate_(
        fieldMap.byName['Квалификация'],
        (value) => /(квалифиц|целев)/.test(value) && !/(не квалифиц|неквалифиц|нецелев)/.test(value),
        'Квалифицирован'
      );
      if (update) {
        fieldValues.push(update);
        result.qualificationFilled += 1;
      } else {
        result.skippedMissingFieldConfiguration += 1;
      }
    }

    const clientType = getLeadFieldValue_(lead, fieldMap, 'Тип клиента');
    if (!hasAmoValue_(clientType) && isQualifiedStage) {
      const contactId = findMainContactIdForLead_(lead.id);
      if (contactId) {
        const isRepeat = hasPreviousSuccessfulLead_(
          lead,
          contactId,
          successfulStatusIds,
          leadCache
        );
        const update = buildAmoChoiceUpdate_(
          fieldMap.byName['Тип клиента'],
          isRepeat
            ? (value) => /повтор/.test(value)
            : (value) => /нов/.test(value) && !/повтор/.test(value),
          isRepeat ? 'Повторный' : 'Новый'
        );
        if (update) {
          fieldValues.push(update);
          result.clientTypeFilled += 1;
        } else {
          result.skippedMissingFieldConfiguration += 1;
        }
      }
    }

    if (successfulStatusIds.has(Number(lead.status_id))) {
      const paid = getLeadFieldValue_(lead, fieldMap, 'Оплачено');
      if (!isTruthyAmoValue_(paid)) {
        const update = buildAmoPaidUpdate_(fieldMap.byName['Оплачено']);
        if (update) {
          fieldValues.push(update);
          result.paidFilled += 1;
        } else {
          result.skippedMissingFieldConfiguration += 1;
        }
      }

      const paidDate = getLeadFieldValue_(lead, fieldMap, 'Дата оплаты');
      if (!parseAmoDate_(paidDate)) {
        const update = buildAmoDateUpdate_(
          fieldMap.byName['Дата оплаты'],
          Number(lead.closed_at || lead.updated_at || lead.created_at || Math.floor(Date.now() / 1000))
        );
        if (update) {
          fieldValues.push(update);
          result.paidDateFilled += 1;
        } else {
          result.skippedMissingFieldConfiguration += 1;
        }
      }
    }

    if (fieldValues.length > 0) {
      updates.push({ id: Number(lead.id), custom_fields_values: fieldValues });
    }
  });

  for (let index = 0; index < updates.length; index += 50) {
    amoRequest_('/api/v4/leads', 'patch', updates.slice(index, index + 50));
  }
  result.updatedLeads = updates.length;
  return result;
}

function hasPreviousSuccessfulLead_(lead, contactId, successfulStatusIds, leadCache) {
  const contact = amoRequest_(`/api/v4/contacts/${contactId}?with=leads`, 'get');
  const linkedLeads = contact && contact._embedded ? contact._embedded.leads || [] : [];
  const currentCreatedAt = Number(lead.created_at || 0);

  return linkedLeads.some((item) => {
    const leadId = Number(item.id);
    if (!leadId || leadId === Number(lead.id)) return false;

    if (!leadCache[leadId]) {
      leadCache[leadId] = amoRequest_(`/api/v4/leads/${leadId}`, 'get');
    }
    const previous = leadCache[leadId];
    return (
      Number(previous.pipeline_id) === BLESK23_CONFIG.pipelineId &&
      successfulStatusIds.has(Number(previous.status_id)) &&
      Number(previous.created_at || 0) < currentCreatedAt
    );
  });
}

function hasAmoValue_(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getAmoEnums_(field) {
  if (!field || !field.enums) return [];
  return Array.isArray(field.enums) ? field.enums : Object.keys(field.enums).map((key) => field.enums[key]);
}

function buildAmoChoiceUpdate_(field, matcher, fallbackValue) {
  if (!field) return null;
  const enums = getAmoEnums_(field);
  if (enums.length > 0) {
    const match = enums.find((item) => matcher(normalizeMetrikaState_(item.value)));
    return match ? { field_id: field.id, values: [{ enum_id: match.id }] } : null;
  }
  return { field_id: field.id, values: [{ value: fallbackValue }] };
}

function buildAmoPaidUpdate_(field) {
  if (!field) return null;
  if (field.type === 'checkbox') {
    return { field_id: field.id, values: [{ value: true }] };
  }
  return buildAmoChoiceUpdate_(
    field,
    (value) => /^(да|оплачено|оплачен)$/.test(value) || (/оплач/.test(value) && !/не оплач/.test(value)),
    'Да'
  );
}

function buildAmoDateUpdate_(field, timestamp) {
  if (!field || !timestamp) return null;
  return { field_id: field.id, values: [{ value: Number(timestamp) }] };
}

function getCustomFieldMap_(entity) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `amo_custom_fields_${entity}`;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const byName = {};
  const byCode = {};
  let page = 1;

  while (true) {
    const result = amoRequest_(`/api/v4/${entity}/custom_fields?limit=250&page=${page}`, 'get');
    const fields = result && result._embedded ? result._embedded.custom_fields || [] : [];
    fields.forEach((field) => {
      if (!byName[field.name] || Number(field.id) > Number(byName[field.name].id)) {
        byName[field.name] = field;
      }
      if (field.code) byCode[field.code] = field;
    });
    if (fields.length < 250) break;
    page += 1;
  }

  const mapping = { byName, byCode };
  cache.put(cacheKey, JSON.stringify(mapping), 21600);
  return mapping;
}

function amoRequest_(path, method, payload) {
  const token = requireAmoToken_();
  const options = {
    method: method || 'get',
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (payload !== undefined) options.payload = JSON.stringify(payload);

  const response = UrlFetchApp.fetch(`${BLESK23_CONFIG.amoBaseUrl}${path}`, options);
  const status = response.getResponseCode();
  const body = response.getContentText();
  const parsed = body ? JSON.parse(body) : {};

  if (status < 200 || status >= 300) {
    throw new Error(`amoCRM API ${status}: ${body.slice(0, 800)}`);
  }
  return parsed;
}

function requireAmoToken_() {
  const token = PropertiesService.getScriptProperties().getProperty(
    'AMO_LONG_LIVED_TOKEN'
  );
  if (!token) {
    throw new Error(
      'В свойствах скрипта не задан AMO_LONG_LIVED_TOKEN. Добавьте токен приватной интеграции amoCRM.'
    );
  }
  return token;
}

function setupMetrikaIntegration() {
  requireAmoToken_();
  requireMetrikaToken_();
  ensureMetrikaQueueSheet_();
  validateMetrikaGoals_();

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'syncAmoConversionsToMetrika')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('syncAmoConversionsToMetrika')
    .timeBased()
    .everyMinutes(BLESK23_CONFIG.metrikaSyncMinutes)
    .create();

  return Object.assign(testMetrikaConnection(), previewMetrikaConversions(), {
    trigger: `every_${BLESK23_CONFIG.metrikaSyncMinutes}_minutes`,
  });
}

function testMetrikaConnection() {
  const counter = metrikaRequest_(
    `/management/v1/counter/${BLESK23_CONFIG.metrikaCounterId}`,
    'get'
  );
  return {
    metrikaCounterId: counter.counter && counter.counter.id,
    metrikaCounterName: counter.counter && counter.counter.name,
    site: counter.counter && counter.counter.site,
  };
}

function setupSiteEngagementGoals() {
  requireMetrikaToken_();
  const path = `/management/v1/counter/${BLESK23_CONFIG.metrikaCounterId}/goals`;
  const response = metrikaRequest_(path, 'get');
  const identifiers = new Set();

  (response.goals || []).forEach((goal) => {
    (goal.conditions || []).forEach((condition) => {
      if (condition.url) identifiers.add(String(condition.url));
    });
  });

  const result = { created: [], existing: [] };
  BLESK23_CONFIG.siteEngagementGoals.forEach((goal) => {
    if (identifiers.has(goal.target)) {
      result.existing.push(goal.target);
      return;
    }

    const created = metrikaRequest_(path, 'post', {
      goal: {
        name: goal.name,
        type: 'action',
        conditions: [{ type: 'exact', url: goal.target }],
      },
    });
    result.created.push({
      target: goal.target,
      id: created.goal && created.goal.id,
    });
    identifiers.add(goal.target);
  });

  console.log(JSON.stringify(result));
  return result;
}

function syncMessengerClicksToAmo() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    requireAmoToken_();
    const result = syncMessengerClickAttributions_();
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function syncMessengerClickAttributions_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(BLESK23_CONFIG.sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    return { pendingClicks: 0, matchedClicks: 0, ambiguousClicks: 0 };
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const messageColumn = headers.indexOf('Сообщение');
  const statusColumn = headers.indexOf('amo_sync_status');
  const timestampColumn = Math.max(
    headers.indexOf('Отметка времени'),
    headers.indexOf('Timestamp'),
    0
  );
  if (messageColumn === -1 || statusColumn === -1) {
    return { pendingClicks: 0, matchedClicks: 0, ambiguousClicks: 0 };
  }

  const firstRow = Math.max(2, sheet.getLastRow() - 500);
  const rows = sheet
    .getRange(firstRow, 1, sheet.getLastRow() - firstRow + 1, lastColumn)
    .getValues();
  const clicks = [];

  rows.forEach((values, index) => {
    if (String(values[statusColumn] || '') !== 'messenger_click_logged') return;
    const parsed = parseLeadMessage_(String(values[messageColumn] || ''));
    const channel = getMessengerChannelFromEvent_(parsed.attribution.event_kind);
    if (!channel) return;

    const rawCreatedAt = values[timestampColumn];
    const createdAt = rawCreatedAt instanceof Date
      ? rawCreatedAt
      : new Date(rawCreatedAt);
    if (Number.isNaN(createdAt.getTime())) return;

    clicks.push({
      rowNumber: firstRow + index,
      attribution: parsed.attribution,
      channel,
      createdAt,
    });
  });

  if (clicks.length === 0) {
    return { pendingClicks: 0, matchedClicks: 0, ambiguousClicks: 0 };
  }

  const windowMs = BLESK23_CONFIG.messengerClickAttributionMinutes * 60000;
  const from = Math.min.apply(null, clicks.map((item) => item.createdAt.getTime()));
  const to = Math.max.apply(null, clicks.map((item) => item.createdAt.getTime())) + windowMs;
  const talks = listTalksForAttribution_(from, to);
  const pairsByClick = {};
  const pairsByTalk = {};

  clicks.forEach((click) => {
    pairsByClick[click.rowNumber] = [];
    talks.forEach((talk) => {
      const delta = Number(talk.created_at || 0) * 1000 - click.createdAt.getTime();
      if (talk.channel !== click.channel || delta < 0 || delta > windowMs) return;

      const pair = { click, talk };
      pairsByClick[click.rowNumber].push(pair);
      if (!pairsByTalk[talk.talk_id]) pairsByTalk[talk.talk_id] = [];
      pairsByTalk[talk.talk_id].push(pair);
    });
  });

  const fieldMap = getCustomFieldMap_('leads');
  const claimedTalkIds = new Set();
  let matchedClicks = 0;
  let ambiguousClicks = 0;

  clicks.forEach((click) => {
    const candidates = pairsByClick[click.rowNumber] || [];
    if (candidates.length !== 1) {
      if (candidates.length > 1) ambiguousClicks += 1;
      return;
    }

    const pair = candidates[0];
    if ((pairsByTalk[pair.talk.talk_id] || []).length !== 1) {
      ambiguousClicks += 1;
      return;
    }
    if (claimedTalkIds.has(pair.talk.talk_id)) return;

    const leadId = Number(pair.talk.entity_id || 0);
    if (!leadId) return;
    const lead = amoRequest_(`/api/v4/leads/${leadId}`, 'get');
    const source = inferSource_(click.attribution);
    const currentService = getLeadFieldValue_(lead, fieldMap, 'Услуга');
    const leadData = {
      source,
      service: currentService || inferService_('', click.attribution),
      attribution: click.attribution,
    };
    const fieldValues = buildLeadFieldValues_(leadData, fieldMap, lead);
    if (fieldValues.length > 0) {
      amoRequest_('/api/v4/leads', 'patch', [
        { id: leadId, custom_fields_values: fieldValues },
      ]);
    }

    writeSyncResult_(sheet, click.rowNumber, headers, {
      amo_lead_id: String(leadId),
      amo_sync_status: 'messenger_click_claimed',
      amo_sync_error: `matched_${click.channel}_talk_${pair.talk.talk_id}`,
      amo_synced_at: new Date().toISOString(),
    });
    addLeadNote_(
      leadId,
      `Атрибуция чата ${click.channel}: переход с сайта сопоставлен с началом беседы по времени.`,
      click.attribution
    );
    claimedTalkIds.add(pair.talk.talk_id);
    matchedClicks += 1;
  });

  return {
    pendingClicks: clicks.length,
    matchedClicks,
    ambiguousClicks,
  };
}

function listTalksForAttribution_(fromMs, toMs) {
  const talks = [];
  const contactCache = {};
  const contactFieldMap = getCustomFieldMap_('contacts');

  for (let page = 1; page <= 4; page += 1) {
    const response = amoRequest_(`/api/v4/talks?limit=250&page=${page}`, 'get');
    const batch = response && response._embedded ? response._embedded.talks || [] : [];
    batch.forEach((talk) => {
      const createdAtMs = Number(talk.created_at || 0) * 1000;
      if (
        talk.entity_type !== 'lead' ||
        !talk.entity_id ||
        createdAtMs < fromMs ||
        createdAtMs > toMs
      ) {
        return;
      }

      const contactId = Number(talk.contact_id || 0);
      if (!contactId) return;
      if (!contactCache[contactId]) {
        contactCache[contactId] = amoRequest_(`/api/v4/contacts/${contactId}`, 'get');
      }
      const channel = detectMessengerChannel_(
        contactCache[contactId],
        contactFieldMap,
        talk.origin
      );
      if (channel) talks.push(Object.assign({}, talk, { channel }));
    });
    if (batch.length < 250) break;
  }

  return talks;
}

function detectMessengerChannel_(contact, fieldMap, origin) {
  const hasValue = (name) => Boolean(getEntityFieldValue_(contact, fieldMap, name));
  if (hasValue('MaxId_WZ') || hasValue('MaxgroupId_WZ')) return 'max';
  if (hasValue('TelegramId_WZ') || hasValue('TelegramUsername_WZ')) return 'telegram';
  if (
    hasValue('WhatsappLid_WZ') ||
    hasValue('WhatsappUsername_WZ') ||
    hasValue('Whatsgroup_WZ')
  ) {
    return 'whatsapp';
  }

  const normalizedOrigin = String(origin || '').toLowerCase();
  if (normalizedOrigin.includes('max')) return 'max';
  if (normalizedOrigin.includes('telegram')) return 'telegram';
  if (normalizedOrigin.includes('whatsapp')) return 'whatsapp';
  return '';
}

function getEntityFieldValue_(entity, fieldMap, fieldName) {
  const field = fieldMap.byName[fieldName];
  if (!field) return '';
  const current = (entity.custom_fields_values || []).find(
    (item) => Number(item.field_id) === Number(field.id)
  );
  const first = current && current.values && current.values[0];
  return first && first.value !== undefined && first.value !== null ? first.value : '';
}

function previewMetrikaConversions() {
  const collected = collectMetrikaConversions_();
  const result = {
    scannedLeads: collected.scannedLeads,
    leadsWithoutIdentifiers: collected.leadsWithoutIdentifiers,
    detectedConversions: collected.conversions.length,
    sample: collected.conversions.slice(0, 20).map((item) => ({
      leadId: item.leadId,
      leadName: item.leadName,
      target: item.target,
      eventTime: item.eventTime,
      price: item.price,
      hasClientId: Boolean(item.clientId),
      hasYclid: Boolean(item.yclid),
    })),
  };
  console.log(JSON.stringify(result));
  return result;
}

function syncAmoConversionsToMetrika() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    requireAmoToken_();
    requireMetrikaToken_();
    validateMetrikaGoals_();

    let messengerAttribution = null;
    try {
      messengerAttribution = syncMessengerClickAttributions_();
    } catch (error) {
      messengerAttribution = {
        error: String(error && error.message ? error.message : error).slice(0, 500),
      };
      console.error(JSON.stringify({ messengerAttribution }));
    }

    const collected = collectMetrikaConversions_();
    const queueSheet = ensureMetrikaQueueSheet_();
    const sentSignatures = getMetrikaSentSignatures_(queueSheet);
    const pending = collected.conversions.filter(
      (item) => !sentSignatures.has(item.signature)
    );

    if (pending.length === 0) {
      const emptyResult = {
        scannedLeads: collected.scannedLeads,
        leadsWithoutIdentifiers: collected.leadsWithoutIdentifiers,
        detectedConversions: collected.conversions.length,
        uploadedConversions: 0,
        messengerAttribution,
      };
      console.log(JSON.stringify(emptyResult));
      return emptyResult;
    }

    const upload = uploadMetrikaConversions_(pending);
    appendMetrikaQueueRows_(queueSheet, pending, upload);

    const result = {
      scannedLeads: collected.scannedLeads,
      leadsWithoutIdentifiers: collected.leadsWithoutIdentifiers,
      detectedConversions: collected.conversions.length,
      uploadedConversions: pending.length,
      uploadId: getMetrikaUploadId_(upload),
      messengerAttribution,
    };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function validateMetrikaGoals_() {
  const response = metrikaRequest_(
    `/management/v1/counter/${BLESK23_CONFIG.metrikaCounterId}/goals`,
    'get'
  );
  const goals = response.goals || [];
  const identifiers = new Set();

  goals.forEach((goal) => {
    (goal.conditions || []).forEach((condition) => {
      if (condition.url) identifiers.add(String(condition.url));
    });
  });

  const missing = BLESK23_CONFIG.metrikaGoals
    .map((goal) => goal.target)
    .filter((target) => !identifiers.has(target));
  if (missing.length > 0) {
    throw new Error(`В Метрике не найдены цели: ${missing.join(', ')}`);
  }
  return true;
}

function collectMetrikaConversions_() {
  const pipeline = getPipeline_();
  const statusesById = {};
  getPipelineStatuses_(pipeline).forEach((status) => {
    statusesById[Number(status.id)] = status.name;
  });

  const fieldMap = getCustomFieldMap_('leads');
  const leads = listRecentAmoLeads_();
  const conversions = [];
  let leadsWithoutIdentifiers = 0;

  leads.forEach((lead) => {
    const clientId = getLeadFieldValue_(lead, fieldMap, 'metrika_client_id');
    const yclid = getLeadFieldValue_(lead, fieldMap, 'yclid');
    if (!clientId && !yclid) {
      leadsWithoutIdentifiers += 1;
      return;
    }

    const statusName = statusesById[Number(lead.status_id)] || '';
    const status = normalizeMetrikaState_(statusName);
    if (status.indexOf('закрыто и не реализовано') !== -1) return;

    const qualification = normalizeMetrikaState_(
      getLeadFieldValue_(lead, fieldMap, 'Квалификация')
    );
    const clientType = normalizeMetrikaState_(
      getLeadFieldValue_(lead, fieldMap, 'Тип клиента')
    );
    const paidValue = getLeadFieldValue_(lead, fieldMap, 'Оплачено');
    const paidDateValue = getLeadFieldValue_(lead, fieldMap, 'Дата оплаты');

    const qualifiedByField =
      /(квалифиц|целев)/.test(qualification) &&
      !/(не квалифиц|неквалифиц|нецелев|спам|мусор)/.test(qualification);
    const qualifiedByStage = /нужен осмотр|принимают решение|назначена дата клининга|выполнен|успешно реализовано/.test(status);
    const isBooked = /назначена дата клининга|выполнен|успешно реализовано/.test(status);
    const isCompleted = /выполнен|успешно реализовано/.test(status);
    const paidDate = parseAmoDate_(paidDateValue);
    const isPaid =
      /успешно реализовано/.test(status) ||
      isTruthyAmoValue_(paidValue) ||
      Boolean(paidDate);
    const isNewClient = /нов/.test(clientType) && !/повтор/.test(clientType);

    const standardEventTime = clampMetrikaEventTime_(
      Number(lead.updated_at || lead.created_at || 0)
    );
    const paidEventTime = clampMetrikaEventTime_(
      paidDate || Number(lead.closed_at || lead.updated_at || lead.created_at || 0)
    );

    if (qualifiedByField || qualifiedByStage) {
      addMetrikaConversion_(conversions, lead, 'qualified_lead', standardEventTime, 0, clientId, yclid);
    }
    if (isBooked) {
      addMetrikaConversion_(conversions, lead, 'booking', standardEventTime, 0, clientId, yclid);
    }
    if (isCompleted) {
      addMetrikaConversion_(conversions, lead, 'service_completed', standardEventTime, 0, clientId, yclid);
    }
    if (isPaid) {
      const revenue = Math.max(0, Math.round(Number(lead.price || 0)));
      addMetrikaConversion_(conversions, lead, 'paid_order', paidEventTime, revenue, clientId, yclid);
      if (isNewClient) {
        addMetrikaConversion_(conversions, lead, 'paid_new_client', paidEventTime, revenue, clientId, yclid);
      }
    }
  });

  return {
    scannedLeads: leads.length,
    leadsWithoutIdentifiers,
    conversions,
  };
}

function listRecentAmoLeads_() {
  const cutoff = Math.floor(Date.now() / 1000) - BLESK23_CONFIG.metrikaLookbackDays * 86400;
  const leads = [];
  let page = 1;

  while (true) {
    const response = amoRequest_(
      `/api/v4/leads?filter[pipeline_id]=${BLESK23_CONFIG.pipelineId}&limit=250&page=${page}`,
      'get'
    );
    const batch = response && response._embedded ? response._embedded.leads || [] : [];
    batch.forEach((lead) => {
      if (Number(lead.updated_at || lead.created_at || 0) >= cutoff) leads.push(lead);
    });
    if (batch.length < 250) break;
    page += 1;
  }
  return leads;
}

function getLeadFieldValue_(lead, fieldMap, fieldName) {
  const field = fieldMap.byName[fieldName];
  if (!field) return '';
  const current = (lead.custom_fields_values || []).find(
    (item) => Number(item.field_id) === Number(field.id)
  );
  const first = current && current.values && current.values[0];
  return first && first.value !== undefined && first.value !== null ? first.value : '';
}

function addMetrikaConversion_(collection, lead, target, eventTime, price, clientId, yclid) {
  if (!eventTime) return;
  const cutoff = Math.floor(Date.now() / 1000) - BLESK23_CONFIG.metrikaLookbackDays * 86400;
  if (eventTime < cutoff) return;

  const normalizedPrice = Math.max(0, Math.round(Number(price || 0)));
  collection.push({
    detectedAt: new Date().toISOString(),
    leadId: Number(lead.id),
    leadName: String(lead.name || ''),
    target,
    clientId: String(clientId || ''),
    yclid: String(yclid || ''),
    purchaseId: `amo_${lead.id}_${target}`,
    eventTime,
    price: normalizedPrice,
    currency: 'RUB',
    signature: `${lead.id}:${target}:${normalizedPrice}`,
  });
}

function clampMetrikaEventTime_(value) {
  let timestamp = Number(value || 0);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
  if (timestamp > 1000000000000) timestamp = Math.floor(timestamp / 1000);
  const now = Math.floor(Date.now() / 1000);
  return Math.min(Math.floor(timestamp), now);
}

function parseAmoDate_(value) {
  if (!value) return 0;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 1000000000000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : Math.floor(parsed.getTime() / 1000);
}

function isTruthyAmoValue_(value) {
  if (value === true || value === 1) return true;
  return /^(1|true|да|оплачен|оплачено)$/i.test(String(value || '').trim());
}

function normalizeMetrikaState_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uploadMetrikaConversions_(conversions) {
  const headers = ['ClientID', 'yclid', 'PurchaseId', 'Target', 'DateTime', 'Price', 'Currency'];
  const rows = conversions.map((item) => [
    item.clientId,
    item.yclid,
    item.purchaseId,
    item.target,
    item.eventTime,
    item.price || '',
    item.price ? item.currency : '',
  ]);
  const csv = [headers].concat(rows)
    .map((row) => row.map(csvCell_).join(','))
    .join('\n');
  const token = requireMetrikaToken_();
  const url =
    `https://api-metrika.yandex.net/management/v1/counter/${BLESK23_CONFIG.metrikaCounterId}` +
    '/offline_conversions/upload?type=BASIC&comment=Blesk23%20amoCRM';
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    muteHttpExceptions: true,
    headers: { Authorization: `OAuth ${token}` },
    payload: {
      file: Utilities.newBlob(csv, 'text/csv', 'blesk23_offline_conversions.csv'),
    },
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  const parsed = body ? JSON.parse(body) : {};
  if (status < 200 || status >= 300) {
    throw new Error(`Метрика offline API ${status}: ${body.slice(0, 1000)}`);
  }
  return parsed;
}

function ensureMetrikaQueueSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(BLESK23_CONFIG.metrikaQueueSheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(BLESK23_CONFIG.metrikaQueueSheetName);

  const headers = [
    'detected_at',
    'amo_lead_id',
    'lead_name',
    'target',
    'client_id',
    'yclid',
    'purchase_id',
    'event_time',
    'price',
    'currency',
    'signature',
    'upload_id',
    'status',
    'error',
  ];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getMetrikaSentSignatures_(sheet) {
  if (sheet.getLastRow() < 2) return new Set();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const signatureColumn = headers.indexOf('signature');
  const statusColumn = headers.indexOf('status');
  if (signatureColumn === -1 || statusColumn === -1) return new Set();

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
  return new Set(
    rows
      .filter((row) => row[statusColumn] === 'uploaded')
      .map((row) => row[signatureColumn])
      .filter(Boolean)
  );
}

function appendMetrikaQueueRows_(sheet, conversions, upload) {
  const uploadId = getMetrikaUploadId_(upload);
  const rows = conversions.map((item) => [
    item.detectedAt,
    item.leadId,
    item.leadName,
    item.target,
    item.clientId,
    item.yclid,
    item.purchaseId,
    item.eventTime,
    item.price,
    item.currency,
    item.signature,
    uploadId,
    'uploaded',
    '',
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function getMetrikaUploadId_(response) {
  return String(
    (response && response.uploading && response.uploading.id) ||
    (response && response.id) ||
    ''
  );
}

function csvCell_(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function metrikaRequest_(path, method, payload) {
  const options = {
    method: method || 'get',
    muteHttpExceptions: true,
    headers: {
      Authorization: `OAuth ${requireMetrikaToken_()}`,
      'Content-Type': 'application/json',
    },
  };
  if (payload !== undefined) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch(`https://api-metrika.yandex.net${path}`, options);
  const status = response.getResponseCode();
  const body = response.getContentText();
  const parsed = body ? JSON.parse(body) : {};
  if (status < 200 || status >= 300) {
    throw new Error(`Метрика API ${status}: ${body.slice(0, 1000)}`);
  }
  return parsed;
}

function requireMetrikaToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('METRIKA_OAUTH_TOKEN');
  if (!token) {
    throw new Error(
      'В свойствах скрипта не задан METRIKA_OAUTH_TOKEN с правами metrika:read и metrika:offline_data.'
    );
  }
  return token;
}

function setupWazzupWebhookSecret() {
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty('WAZZUP_WEBHOOK_SECRET');
  if (!secret) {
    secret = `${Utilities.getUuid()}${Utilities.getUuid()}`.replace(/-/g, '');
    properties.setProperty('WAZZUP_WEBHOOK_SECRET', secret);
  }
  return {
    secret,
    query: `secret=${encodeURIComponent(secret)}`,
  };
}

function doPost(event) {
  try {
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(
      'WAZZUP_WEBHOOK_SECRET'
    );
    const receivedSecret = event && event.parameter ? event.parameter.secret : '';
    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return jsonOutput_({ ok: false, error: 'unauthorized' });
    }

    const raw = event && event.postData ? event.postData.contents : '';
    const payload = raw ? JSON.parse(raw) : {};
    const messages = collectWazzupMessageEvents_(payload);
    const results = messages.map(handleWazzupMessageEvent_);
    return jsonOutput_({ ok: true, received: messages.length, results });
  } catch (error) {
    console.error(String(error && error.stack ? error.stack : error));
    return jsonOutput_({
      ok: false,
      error: String(error && error.message ? error.message : error).slice(0, 500),
    });
  }
}

function collectWazzupMessageEvents_(payload) {
  const messages = [];
  const seen = new Set();

  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'object') return;

    if (value.message_id && value.direction && value.recipient) {
      const messageId = String(value.message_id);
      if (!seen.has(messageId)) {
        seen.add(messageId);
        messages.push(value);
      }
    }

    if (value.data) visit(value.data);
    if (value.events) visit(value.events);
  };

  visit(payload);
  return messages;
}

function handleWazzupMessageEvent_(message) {
  if (String(message.direction || '').toLowerCase() !== 'inbound') {
    return { messageId: String(message.message_id || ''), status: 'ignored_outbound' };
  }

  const phones = extractRussianPhones_(message.text || '');
  if (phones.length === 0) {
    return { messageId: String(message.message_id || ''), status: 'no_phone' };
  }
  if (phones.length > 1) {
    return {
      messageId: String(message.message_id || ''),
      status: 'ambiguous_phones',
      count: phones.length,
    };
  }

  const contact = findContactByWazzupRecipient_(message.recipient || {});
  if (!contact) {
    return { messageId: String(message.message_id || ''), status: 'contact_not_found' };
  }

  const phone = phones[0];
  const action = appendPhoneToContact_(contact, phone);
  return {
    messageId: String(message.message_id || ''),
    contactId: Number(contact.id),
    phone,
    status: action,
  };
}

function extractRussianPhones_(text) {
  const matches = String(text || '').match(/(?:\+?7|8)[\s().-]*(?:\d[\s().-]*){10}/g) || [];
  return Array.from(
    new Set(matches.map(normalizePhone_).filter(Boolean))
  );
}

function findContactByWazzupRecipient_(recipient) {
  const chatType = String(recipient.chat_type || '').toLowerCase();
  const chatId = String(recipient.chat_id || '').trim();
  const username = String(recipient.username || '').trim();
  const recipientPhone = normalizePhone_(recipient.phone || '');

  if (recipientPhone) {
    const byPhone = findContactByPhone_(recipientPhone);
    if (byPhone) return byPhone;
  }
  if (chatType === 'whatsapp') {
    const byChatPhone = findContactByPhone_(chatId);
    if (byChatPhone) return byChatPhone;
  }

  const fieldMap = getCustomFieldMap_('contacts');
  const fieldNamesByChannel = {
    max: ['MaxId_WZ', 'MaxgroupId_WZ'],
    maxgroup: ['MaxgroupId_WZ', 'MaxId_WZ'],
    telegram: ['TelegramId_WZ', 'TelegramUsername_WZ'],
    telegroup: ['TelegramId_WZ', 'TelegramUsername_WZ'],
    whatsapp: ['WhatsappLid_WZ', 'WhatsappUsername_WZ'],
    whatsgroup: ['Whatsgroup_WZ', 'WhatsappLid_WZ'],
  };
  const expectedValues = [chatId, username, String(recipient.phone || '')].filter(Boolean);
  const queries = Array.from(new Set(expectedValues));

  for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
    const query = queries[queryIndex];
    const response = amoRequest_(
      `/api/v4/contacts?query=${encodeURIComponent(query)}&limit=50`,
      'get'
    );
    const contacts = response && response._embedded
      ? response._embedded.contacts || []
      : [];
    const fieldNames = fieldNamesByChannel[chatType] || [];
    const match = contacts.find((contact) =>
      fieldNames.some((fieldName) => {
        const value = String(getEntityFieldValue_(contact, fieldMap, fieldName) || '');
        return expectedValues.some(
          (expected) => value === expected || value.replace(/\D/g, '') === expected.replace(/\D/g, '')
        );
      })
    );
    if (match) return match;
  }
  return null;
}

function appendPhoneToContact_(contact, phoneValue) {
  const phone = normalizePhone_(phoneValue);
  if (!phone) return 'invalid_phone';

  const fieldMap = getCustomFieldMap_('contacts');
  const phoneField = fieldMap.byCode.PHONE;
  if (!phoneField) throw new Error('Системное поле PHONE не найдено в amoCRM.');

  const currentField = (contact.custom_fields_values || []).find(
    (field) => Number(field.field_id) === Number(phoneField.id)
  );
  const currentValues = (currentField && currentField.values) || [];
  if (currentValues.some((item) => normalizePhone_(item.value) === phone)) {
    return 'phone_already_present';
  }

  const values = currentValues.map((item) => ({
    value: item.value,
    enum_id: item.enum_id,
    enum_code: item.enum_code,
  }));
  values.push({ value: phone, enum_code: 'WORK' });

  amoRequest_('/api/v4/contacts', 'patch', [
    {
      id: Number(contact.id),
      custom_fields_values: [{ field_id: phoneField.id, values }],
    },
  ]);
  return 'phone_added';
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function normalizePhone_(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.charAt(0) === '8') digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits.length === 11 && digits.charAt(0) === '7' ? `+${digits}` : '';
}

function rowToObject_(headers, values) {
  return headers.reduce((result, header, index) => {
    if (header) result[header] = values[index] || '';
    return result;
  }, {});
}

function writeTechnicalValues_(sheet, rowNumber, headers, values) {
  const updates = {};
  Object.keys(ATTRIBUTION_HEADER_MAP).forEach((key) => {
    const header = ATTRIBUTION_HEADER_MAP[key];
    if (values[key] !== undefined) updates[header] = values[key];
  });
  writeValuesByHeader_(sheet, rowNumber, headers, updates);
}

function writeSyncResult_(sheet, rowNumber, headers, values) {
  writeValuesByHeader_(sheet, rowNumber, headers, values);
}

function writeValuesByHeader_(sheet, rowNumber, headers, values) {
  Object.keys(values).forEach((header) => {
    const columnIndex = headers.indexOf(header);
    if (columnIndex === -1) return;
    sheet.getRange(rowNumber, columnIndex + 1).setValue(values[header]);
  });
}
