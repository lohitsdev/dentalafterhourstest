const { storeCallData, getCallData } = require('./fileStorage');

async function updatePatientRecord(patientInfo) {
  const key = patientInfo.phone.replace(/\D/g, ''); // Remove non-digit characters
  let existingData = await getCallData(key);

  if (existingData) {
    // Update existing record
    existingData = { ...existingData, ...patientInfo };
  } else {
    // Create new record
    existingData = patientInfo;
  }

  await storeCallData(key, existingData);
  console.log(`Patient record updated for ${patientInfo.name}`);
}

module.exports = { updatePatientRecord };
