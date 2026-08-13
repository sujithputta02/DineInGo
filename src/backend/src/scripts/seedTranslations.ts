import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Translation from '../models/Translation';
import { TranslationService } from '../services/translationService';
import { translations, Language } from '../utils/translations';

dotenv.config();

const TARGET_LANGUAGES: Language[] = ['hindi', 'tamil', 'kannada', 'telugu', 'malayalam'];

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing translations
  // console.log('Clearing existing translations...');
  // await Translation.deleteMany({});
  // console.log('Collection cleared.');

  const englishKeys = translations.english;
  const totalKeys = Object.keys(englishKeys).length;

  console.log(`Starting bulk translation for ${totalKeys} keys into ${TARGET_LANGUAGES.length} languages...`);

  // First, seed English
  console.log('Seeding English (source)...');
  for (const [key, value] of Object.entries(englishKeys)) {
    if (typeof value === 'string') {
      await Translation.findOneAndUpdate(
        { key, language: 'english' },
        { value, isAutomatic: false },
        { upsert: true }
      );
    }
  }

  // Then, translate to other languages
  for (const lang of TARGET_LANGUAGES) {
    console.log(`\nTranslating to ${lang}...`);
    let count = 0;
    for (const [key, englishValue] of Object.entries(englishKeys)) {
      if (typeof englishValue === 'string') {
        try {
          await TranslationService.getTranslation(key, lang, englishValue);
          count++;
          if (count % 10 === 0) {
            process.stdout.write(`.`);
          }
          // Add a tiny delay for stability
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`\nFailed to translate "${key}" to ${lang}`);
        }
      }
    }
    console.log(`\nCompleted ${lang}: ${count}/${totalKeys} keys processed.`);
  }

  console.log('\nFull database-driven translation setup completed');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

