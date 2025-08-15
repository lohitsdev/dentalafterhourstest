const { updatePatientRecord, getCallData } = require('./patientData');
const { sendReceptionistSummary } = require('../email');
const { getPracticeSettings } = require('../config');

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
  const aiSummary = payload.results[0]?.result || 'No summary available';
  const phone = extractPhoneFromSummary(aiSummary);
  const storageKey = generateStorageKey(phone);
  
  console.log('Extracted phone:', phone);
  console.log('Generated storage key:', storageKey);

  let patientInfo = await getCallData(storageKey);

  if (patientInfo) {
    console.log('Found existing patient record:', patientInfo);
    patientInfo = {
      ...patientInfo,
      aiSummary,
      symptoms: extractSymptomsFromSummary(aiSummary)
    };
    await updatePatientRecord(storageKey, patientInfo);
    console.log('Patient record updated with AI insights:', patientInfo);

    // Send email notification
    await sendEmailNotification(patientInfo);
  } else {
    console.log('No matching patient record found for phone:', phone);
    // Create a new record if not found
    patientInfo = {
      name: extractNameFromSummary(aiSummary),
      phone: phone,
      aiSummary,
      symptoms: extractSymptomsFromSummary(aiSummary),
      timeCalled: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };
    await updatePatientRecord(storageKey, patientInfo);
    console.log('New patient record created:', patientInfo);
    await sendEmailNotification(patientInfo);
  }
}

function extractPatientInfo(webhookData) {
  const { name, phone, pain_level } = webhookData;
  return {
    name: name || 'Unknown',
    phone: phone || 'Unknown',
    pain_level: pain_level || null,
    symptoms: 'Not specified',
    timeCalled: new Date().toLocaleTimeString(),
    timestamp: new Date().toISOString(),
    aiSummary: ''
  };
}

function generateStorageKey(phone) {
  return phone.replace(/\D/g, '');
}

function extractPhoneFromSummary(summary) {
  const phoneMatch = summary.match(/(\d{1}-\d{3}-\d{3}-\d{2}|\d{3}-\d{3}-\d{4}|\d{10})/);
  return phoneMatch ? phoneMatch[1].replace(/\D/g, '') : 'Unknown';
}

function extractNameFromSummary(summary) {
  const nameMatch = summary.match(/(\w+) contacted/);
  return nameMatch ? nameMatch[1] : 'Unknown';
}

function extractSymptomsFromSummary(summary) {
  const symptomsMatch = summary.match(/reason for calling as (.*?) with a pain level/);
  return symptomsMatch ? symptomsMatch[1] : 'Not specified';
}

async function sendEmailNotification(patientInfo) {
  try {
    const practiceSettings = getPracticeSettings();
    const emailData = {
      name: patientInfo.name,
      phone: patientInfo.phone,
      symptoms: patientInfo.symptoms,
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
