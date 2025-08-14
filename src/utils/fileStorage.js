const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';

async function storeCallData(key, data) {
  const filePath = path.join(DATA_DIR, `${key}.json`);
  await fs.writeFile(filePath, JSON.stringify(data));
}

async function getCallData(key) {
  const filePath = path.join(DATA_DIR, `${key}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File not found
    }
    throw error;
  }
}

async function deleteCallData(key) {
  const filePath = path.join(DATA_DIR, `${key}.json`);
  await fs.unlink(filePath);
}

module.exports = { storeCallData, getCallData, deleteCallData };
