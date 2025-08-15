const { updatePatientRecord } = require('./patientData');

async function handleWebhook(webhookData) {
  console.log('Processing webhook data:', JSON.stringify(webhookData, null, 2));

  try {
    const patientInfo = extractPatientInfo(webhookData);
    await updatePatientRecord(patientInfo);
    console.log('Patient record updated successfully:', patientInfo);
  } catch (error) {
    console.error('Error processing webhook data:', error);
  }
}

function extractPatientInfo(webhookData) {
  const { name, phone, pain_level } = webhookData;

  // Determine emergency status based on pain level
  const status = determineEmergencyStatus(pain_level);

  // Extract additional information from the AI summary if available
  let symptoms = 'Not specified';
  let aiSummary = '';
  if (webhookData.payload && webhookData.payload.results && webhookData.payload.results.length > 0) {
    aiSummary = webhookData.payload.results[0].result;
    const symptomsMatch = aiSummary.match(/about a (.*?) issue/);
    if (symptomsMatch) {
      symptoms = symptomsMatch[1];
    }
  }

  return {
    name: name || 'Unknown',
    phone: phone || 'Unknown',
    pain_level: pain_level || null,
    symptoms,
    status,
    timeCalled: new Date().toLocaleTimeString(),
    timestamp: new Date().toISOString(),
    aiSummary
  };
}

function determineEmergencyStatus(painLevel) {
  if (painLevel === null || painLevel === undefined || isNaN(painLevel)) {
    return 'Non-Emergency';
  }
  const numericPainLevel = Number(painLevel);
  return numericPainLevel >= 7 ? 'Emergency' : 'Non-Emergency';
}

module.exports = { handleWebhook };
