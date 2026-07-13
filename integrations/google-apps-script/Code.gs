const BLESK23_CONFIG = Object.freeze({
  amoBaseUrl: 'https://imperiableska2025.amocrm.ru',
  pipelineId: 10579898,
  firstStageName: 'В работе (связь с клиентом)',
  responsibleUserId: 13491146,
  sheetName: 'Ответы на форму (1)',
  workdayStartHour: 8,
  workdayEndHour: 23,
  firstContactSlaMinutes: 5,
  mergeWindowDays: 30,
  phoneClickAttributionMinutes: 15,
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
    if (parsed.attribution.event_kind === 'phone_click') {
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
        amo_sync_status: 'phone_click_logged',
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

    createFirstContactTaskIfNeeded_(lead.id);
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

    if (name === 'Услуга' && existingValue && existingValue !== String(value)) {
      const services = existingValue.split(';').map((item) => item.trim());
      if (services.indexOf(String(value)) === -1) value = `${existingValue}; ${value}`;
      else value = existingValue;
    } else if (name !== 'Текущая страница' && existingValue) {
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

function createFirstContactTaskIfNeeded_(leadId) {
  const tasks = amoRequest_(
    `/api/v4/tasks?filter[entity_type]=leads&filter[entity_id]=${leadId}&filter[is_completed]=0&limit=50`,
    'get'
  );
  const openTasks = tasks && tasks._embedded ? tasks._embedded.tasks || [] : [];
  if (openTasks.length > 0) return;

  amoRequest_('/api/v4/tasks', 'post', [
    {
      entity_id: leadId,
      entity_type: 'leads',
      responsible_user_id: BLESK23_CONFIG.responsibleUserId,
      task_type_id: 1,
      complete_till: calculateSlaDeadline_(),
      text: 'Связаться с новым клиентом в течение 5 минут. Уточнить услугу, адрес, площадь, желаемую дату и бюджет.',
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

function calculateSlaDeadline_() {
  const now = new Date();
  const timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const hour = Number(Utilities.formatDate(now, timezone, 'H'));
  const minute = Number(Utilities.formatDate(now, timezone, 'm'));
  const currentMinutes = hour * 60 + minute;
  const startMinutes = BLESK23_CONFIG.workdayStartHour * 60;
  const endMinutes = BLESK23_CONFIG.workdayEndHour * 60;
  const sla = BLESK23_CONFIG.firstContactSlaMinutes;
  let due;

  if (currentMinutes < startMinutes) {
    due = new Date(now.getTime() + (startMinutes + sla - currentMinutes) * 60000);
  } else if (currentMinutes + sla >= endMinutes) {
    due = new Date(now.getTime() + (24 * 60 + startMinutes + sla - currentMinutes) * 60000);
  } else {
    due = new Date(now.getTime() + sla * 60000);
  }

  return Math.floor(due.getTime() / 1000);
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
