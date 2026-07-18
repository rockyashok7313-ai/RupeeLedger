/**
 * WASenderAPI utility for sending WhatsApp messages
 */

export interface SendMessageOptions {
  to: string;
  text: string;
  documentUrl?: string;
  customApiKey?: string;
}

export async function sendWhatsappMessage({ to, text, documentUrl, customApiKey }: SendMessageOptions) {
  const apiKey = customApiKey || process.env.WASENDER_API_KEY;

  // Clean phone number: keep only digits
  let cleanPhone = to.replace(/\D/g, '');

  // Default to Indian prefix (+91) if 10 digits
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  // Ensure it starts with a plus or has country code (WASender typically prefers +prefix or prefix)
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;

  console.log(`[WASender] Preparing message to ${formattedPhone}...`);

  if (!apiKey) {
    console.warn('[WASender] WASENDER_API_KEY is not set. Running in mock/simulation mode.');
    console.log(`[WASender Mock] TO: ${formattedPhone}`);
    console.log(`[WASender Mock] BODY: ${text}`);
    if (documentUrl) {
      console.log(`[WASender Mock] DOCUMENT: ${documentUrl}`);
    }
    return {
      success: true,
      mock: true,
      message: 'Message simulated (WASENDER_API_KEY missing).'
    };
  }

  try {
    const payload: any = {
      to: formattedPhone,
      text: text
    };

    if (documentUrl) {
      payload.documentUrl = documentUrl;
    }

    const response = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WASender API Error]', data);
      throw new Error(data.message || data.error || 'Failed to send WhatsApp message');
    }

    console.log(`[WASender] Message successfully sent to ${formattedPhone}`);
    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error(`[WASender] Failed to send message to ${formattedPhone}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown WASender error'
    };
  }
}
