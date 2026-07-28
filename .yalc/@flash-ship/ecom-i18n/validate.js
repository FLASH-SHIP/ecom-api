const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const enDir = path.join(baseDir, 'locales', 'en');
const viDir = path.join(baseDir, 'locales', 'vi');

let hasErrors = false;

function getDeepKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getDeepKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

function validateFiles(file) {
  const enPath = path.join(enDir, file);
  const viPath = path.join(viDir, file);

  if (!fs.existsSync(enPath)) {
    console.error(`Error: File locales/en/${file} is missing.`);
    hasErrors = true;
    return;
  }
  if (!fs.existsSync(viPath)) {
    console.error(`Error: File locales/vi/${file} is missing.`);
    hasErrors = true;
    return;
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));

  const enKeys = getDeepKeys(enData);
  const viKeys = getDeepKeys(viData);

  const enSet = new Set(enKeys);
  const viSet = new Set(viKeys);

  // Check keys in EN but missing in VI
  enKeys.forEach((key) => {
    if (!viSet.has(key)) {
      console.error(`Error: Key "${key}" exists in en/${file} but is missing in vi/${file}`);
      hasErrors = true;
    }
  });

  // Check keys in VI but missing in EN
  viKeys.forEach((key) => {
    if (!enSet.has(key)) {
      console.error(`Error: Key "${key}" exists in vi/${file} but is missing in en/${file}`);
      hasErrors = true;
    }
  });
}

// Read all json files in locales/en
const files = fs.readdirSync(enDir).filter((file) => file.endsWith('.json'));

files.forEach(validateFiles);

if (hasErrors) {
  console.error('\n❌ Translation validation failed! Please fix the missing keys listed above.');
  process.exit(1);
} else {
  console.log('✅ Translation validation successful! All keys are fully synchronized.');
  process.exit(0);
}
