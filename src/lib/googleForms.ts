export const GOOGLE_LEAD_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfb28U4RIVI2K9h6cyjSbwxRqMVMUyUeuKuQADfPWonb71ypQ/formResponse';

export type GoogleLeadPayload = {
  name: string;
  phone: string;
  email?: string;
  message?: string;
};

export const buildGoogleLeadBody = (payload: GoogleLeadPayload) => {
  const body = new URLSearchParams();
  body.append('entry.727782635', payload.name || '');
  body.append('entry.1862926664', payload.phone || '');
  body.append('entry.557277616', payload.email || '');
  body.append('entry.1008164226', payload.message || '');
  return body;
};

export const submitGoogleLead = async (payload: GoogleLeadPayload) => {
  await fetch(GOOGLE_LEAD_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: buildGoogleLeadBody(payload),
  });
};

export const queueGoogleLead = (payload: GoogleLeadPayload) => {
  const body = buildGoogleLeadBody(payload);

  if (typeof navigator.sendBeacon === 'function') {
    return navigator.sendBeacon(GOOGLE_LEAD_FORM_URL, body);
  }

  void fetch(GOOGLE_LEAD_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  }).catch(() => undefined);
  return true;
};
