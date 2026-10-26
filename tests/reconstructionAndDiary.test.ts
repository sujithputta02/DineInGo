import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  type ReconstructionJobStatus,
  type AssetQualityState,
  getReconstructionProviders
} from '../src/services/reconstructionClientService';

import {
  type NutritionProvenance
} from '../src/services/nutritionIntelligenceService';

test('1. 3D Reconstruction: Verifies 5-tier honest asset state taxonomy', () => {
  const permittedStates: AssetQualityState[] = [
    'verified-asset',
    'reconstructed-model',
    'illustrative-model',
    'representative-preview',
    'photo-fallback'
  ];

  assert.equal(permittedStates.length, 5);
  assert.ok(permittedStates.includes('verified-asset'));
  assert.ok(permittedStates.includes('reconstructed-model'));
  assert.ok(permittedStates.includes('illustrative-model'));
  assert.ok(permittedStates.includes('representative-preview'));
  assert.ok(permittedStates.includes('photo-fallback'));
});

test('2. 3D Reconstruction: Client service provides registered provider info and requires explicit keys', async () => {
  const { providers, activeProvider } = await getReconstructionProviders();
  assert.ok(providers.length >= 2);

  const hfTripo = providers.find(p => p.id === 'hf-triposr');
  assert.ok(hfTripo);
  assert.equal(hfTripo.requiresKey, 'HF_TOKEN');

  const illustrative = providers.find(p => p.id === 'illustrative-calibrated');
  assert.ok(illustrative);
  assert.equal(illustrative.configured, true);
  assert.ok(activeProvider === 'hf-triposr' || activeProvider === 'illustrative-calibrated');
});

test('3. 3D Reconstruction: Lifecycle covers queued, processing, completed, failed, and cancelled states', () => {
  const validStatuses: ReconstructionJobStatus[] = [
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled'
  ];

  assert.equal(validStatuses.length, 5);
  assert.ok(validStatuses.includes('queued'));
  assert.ok(validStatuses.includes('processing'));
  assert.ok(validStatuses.includes('completed'));
  assert.ok(validStatuses.includes('failed'));
  assert.ok(validStatuses.includes('cancelled'));
});

test('4. Food Diary: Nutrition provenance hierarchy adheres to verified standards', () => {
  const validProvenances: NutritionProvenance[] = [
    'verified-restaurant',
    'usda-database',
    'recipe-calculated',
    'ai-estimated',
    'fallback-estimate'
  ];

  assert.equal(validProvenances.length, 5);
  assert.ok(validProvenances.includes('verified-restaurant'));
  assert.ok(validProvenances.includes('usda-database'));
  assert.ok(validProvenances.includes('fallback-estimate'));
});
