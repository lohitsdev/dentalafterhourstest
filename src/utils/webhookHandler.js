const { updatePatientRecord, getCallData, deleteCallData } = require('./patientData');

async function handleWebhook(webhookData) {
  console.log('Processing webhook data:', JSON.stringify(webhookData, null, 2));

  try {
    if (webhookData.event_type === 'conversation_insight_result') {
      await handleConversationInsight(webhookData);
    } else {
      await handleInitialWebhook(webhookData);
    }
  } catch (error) {
    console.error('Error processing webhook data:', error);
  }
}

async function handleInitialWebhook(webhookData) {
  const patientInfo = extractPatientInfo(webhookData);
  const storageKey = generateStorageKey(patientInfo.phone);
  await updatePatientRecord(storageKey, patientInfo);
  console.log('Initial patient record created:', patientInfo);
}

async function handleConversationInsight(webhookData) {
  const { payload } = webhookData;
  const callControlId = payload.metadata.call_control_id;
  const conversationId = payload.conversation_id;
  const aiSummary = payload.results[0]?.result || 'No summary available';

  const storageKey = generateStorageKey(extractPhoneFromSummary(aiSummary));
  let patientInfo = await getCallData(storageKey);

  if (patientInfo) {
    patientInfo = {
      ...patientInfo,
      aiSummary,
      symptoms: extractSymptomsFromSummary(aiSummary)
    };
    await updatePatientRecord(storageKey, patientInfo);
    console.log('Patient record updated with AI insights:', patientInfo);

    // Send email notification
    await sendEmailNotification(patientInfo);

    // Clean up stored data
    await deleteCallData(storageKey);
    console.log('Cleaned up stored data for key:', storageKey);
  } else {
    console.log('No matching patient record found for conversation insight');
  }
}

function extractPatientInfo(webhookData) {
  const { name, phone, pain_level } = webhookData;
  const status = determineEmergencyStatus(pain_level);

  return {
    name: name || 'Unknown',
    phone: phone || 'Unknown',
    pain_level: pain_level || null,
    symptoms: 'Not specified',
    status,
    timeCalled: new Date().toLocaleTimeString(),
    timestamp: new Date().toISOString(),
    aiSummary: ''
  };
}

function determineEmergencyStatus(painLevel) {
  if (painLevel === null || painLevel === undefined || isNaN(painLevel)) {
    return 'Non-Emergency';
  }
  const numericPainLevel = Number(painLevel);
  return numericPainLevel >= 7 ? 'Emergency' : 'Non-Emergency';
}

function generateStorageKey(phone) {
  return phone.replace(/\D/g, '');
}

function extractPhoneFromSummary(summary) {
  const phoneMatch = summary.match(/(\d{3}-\d{3}-\d{2})/);
  return phoneMatch ? phoneMatch[1].replace(/-/g, '') : 'Unknown';
}

function extractSymptomsFromSummary(summary) {
  const symptomsMatch = summary.match(/reason for his call is to address his (.*?) issue/);
  return symptomsMatch ? symptomsMatch[1] : 'Not specified';
}

const { sendReceptionistSummary } = require('../email');
const { getPracticeSettings } = require('../config');

async function sendEmailNotification(patientInfo) {
  try {
    const practiceSettings = getPracticeSettings();
    const emailData = {
      name: patientInfo.name,
      phone: patientInfo.phone,
      status: patientInfo.status,
      summary: patientInfo.aiSummary,
      timeCalled: patientInfo.timeCalled,
      timestamp: patientInfo.timestamp
    };
    
    await sendReceptionistSummary(emailData, practiceSettings);
    console.log('✅ Email notification sent for patient:', patientInfo.name);
  } catch (error) {
    console.error('❌ Error sending email notification:', error);
  }
}

module.exports = { handleWebhook };
