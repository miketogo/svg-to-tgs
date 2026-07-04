#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const files = process.argv.slice(2);

if (!files.length) {
  console.error('Usage: node scripts/validate-tgs.mjs file.tgs [...file.tgs]');
  process.exit(2);
}

let failed = false;

for (const file of files) {
  const result = validateFile(file);
  failed ||= result.errors.length > 0;
  printResult(file, result);
}

process.exit(failed ? 1 : 0);

function validateFile(file) {
  const errors = [];
  const warnings = [];
  let raw;
  let json;

  try {
    raw = readFileSync(file);
  } catch (error) {
    return { errors: [`Cannot read file: ${error.message}`], warnings };
  }

  if (raw.length > 64 * 1024) errors.push(`gzip size is ${kb(raw.length)} KB; Telegram limit is 64 KB.`);

  try {
    json = gunzipSync(raw).toString('utf8');
  } catch (error) {
    return { errors: [`File is not valid gzip: ${error.message}`], warnings };
  }

  let lottie;
  try {
    lottie = JSON.parse(json);
  } catch (error) {
    return { errors: [`Gunzipped payload is not valid JSON: ${error.message}`], warnings };
  }

  validateRoot(lottie, raw.length, json.length, errors, warnings);
  return { errors, warnings, gzipBytes: raw.length, jsonBytes: Buffer.byteLength(json), lottie };
}

function validateRoot(root, gzipBytes, jsonBytes, errors, warnings) {
  if (!isObject(root)) return errors.push('Root must be an object.');

  if (root.tgs !== 1) errors.push('root.tgs must be 1.');
  if (root.ddd !== 0) warnings.push('root.ddd should be 0.');
  if (root.fr !== 60) errors.push(`root.fr must be 60, got ${root.fr}.`);
  if (root.w !== 512 || root.h !== 512) errors.push(`root.w/root.h must be 512x512, got ${root.w}x${root.h}.`);
  if (root.ip !== 0) errors.push(`root.ip must be 0, got ${root.ip}.`);
  if (!finite(root.op) || root.op <= 0) errors.push('root.op must be a positive number.');
  if (finite(root.op) && root.op > 180) errors.push(`root.op is ${root.op}; Telegram max is 180 frames at 60fps.`);
  if (!Array.isArray(root.assets)) errors.push('root.assets must be an array.');
  if (Array.isArray(root.assets) && root.assets.some((asset) => isObject(asset) && (asset.p || asset.u || asset.e))) {
    errors.push('assets contains embedded or external media fields.');
  }
  if (!Array.isArray(root.layers) || !root.layers.length) errors.push('root.layers must contain at least one layer.');

  root.layers?.forEach((layer, index) => validateLayer(layer, `layers[${index}]`, root.op, errors, warnings));

  warnings.push(`gzip=${kb(gzipBytes)} KB, json=${kb(jsonBytes)} KB, layers=${root.layers?.length ?? 0}, assets=${root.assets?.length ?? 0}`);
}

function validateLayer(layer, path, compOp, errors, warnings) {
  if (!isObject(layer)) return errors.push(`${path} must be an object.`);
  if (layer.ty !== 4) errors.push(`${path}.ty must be 4 shape layer; got ${layer.ty}.`);
  if (layer.ddd !== 0) errors.push(`${path}.ddd must be 0.`);
  if (layer.hasMask || Array.isArray(layer.masksProperties)) errors.push(`${path} uses masks.`);
  if (Array.isArray(layer.ef) && layer.ef.length) errors.push(`${path} uses effects.`);
  if (!finite(layer.ip) || !finite(layer.op)) errors.push(`${path}.ip/op must be numeric.`);
  if (finite(layer.op) && finite(compOp) && layer.op > compOp) warnings.push(`${path}.op (${layer.op}) is greater than comp op (${compOp}).`);
  validateTransform(layer.ks, `${path}.ks`, layer.op ?? compOp, errors, warnings);
  if (!Array.isArray(layer.shapes) || !layer.shapes.length) errors.push(`${path}.shapes must contain shape items.`);
  layer.shapes?.forEach((shape, index) => validateShape(shape, `${path}.shapes[${index}]`, layer.op ?? compOp, errors, warnings));
}

function validateShape(shape, path, op, errors, warnings) {
  if (!isObject(shape)) return errors.push(`${path} must be an object.`);
  if (!['gr', 'sh', 'fl', 'st', 'gf', 'gs', 'tm', 'tr'].includes(shape.ty)) errors.push(`${path}.ty "${shape.ty}" is outside strict debug allowlist.`);

  if (shape.ty === 'gr') {
    if (!Array.isArray(shape.it) || !shape.it.length) errors.push(`${path}.it must contain group items.`);
    const transformIndex = shape.it?.findIndex((item) => item?.ty === 'tr') ?? -1;
    if (transformIndex !== shape.it.length - 1) warnings.push(`${path} transform should be the last group item.`);
    shape.it?.forEach((item, index) => validateShape(item, `${path}.it[${index}]`, op, errors, warnings));
  }

  if (shape.ty === 'sh') validatePath(shape, path, errors);
  if (shape.ty === 'fl' || shape.ty === 'st') validatePaint(shape, path, op, errors, warnings);
  if (shape.ty === 'gf' || shape.ty === 'gs') validateGradientPaint(shape, path, op, errors);
  if (shape.ty === 'tm') validateTrimPath(shape, path, op, errors);
  if (shape.ty === 'tr') validateTransform(shape, path, op, errors, warnings);
}

function validatePath(shape, path, errors) {
  const data = shape.ks?.k;
  if (!isObject(data)) return errors.push(`${path}.ks.k must be path data object.`);
  if (typeof data.c !== 'boolean') errors.push(`${path}.ks.k.c must be boolean.`);
  if (!points(data.v) || !points(data.i) || !points(data.o)) return errors.push(`${path}.ks.k v/i/o must be numeric [x,y] arrays.`);
  if (data.v.length !== data.i.length || data.v.length !== data.o.length) errors.push(`${path}.ks.k v/i/o lengths differ.`);
  if (data.v.length < 2) errors.push(`${path}.ks.k has fewer than 2 vertices.`);
}

function validatePaint(shape, path, op, errors, warnings) {
  const color = shape.c?.k;
  if (!Array.isArray(color) || ![3, 4].includes(color.length) || !color.every(finite)) errors.push(`${path}.c.k must be RGB/RGBA number array.`);
  if (Array.isArray(color) && color.some((value) => value < 0 || value > 1)) errors.push(`${path}.c.k values must be normalized 0..1.`);
  if (Array.isArray(color) && color.length === 4) warnings.push(`${path}.c.k has alpha channel.`);
  validateOpacity(shape.o, `${path}.o`, op, errors);
  if (shape.ty === 'st' && (!finite(shape.w?.k) || shape.w.k < 0)) errors.push(`${path}.w.k stroke width must be >= 0.`);
}

function validateGradientPaint(shape, path, op, errors) {
  if (!shape.g || !Number.isFinite(shape.g.p) || shape.g.p <= 0) errors.push(`${path}.g.p must be a positive stop count.`);
  if (!Array.isArray(shape.g?.k?.k) || !shape.g.k.k.every(finite)) errors.push(`${path}.g.k.k must be numeric gradient stops.`);
  if (!numeric(shape.s?.k)) errors.push(`${path}.s.k must be a numeric start point.`);
  if (!numeric(shape.e?.k)) errors.push(`${path}.e.k must be a numeric end point.`);
  if (shape.t !== 1 && shape.t !== 2) errors.push(`${path}.t must be 1 linear or 2 radial.`);
  validateOpacity(shape.o, `${path}.o`, op, errors);
}

function validateTrimPath(shape, path, op, errors) {
  for (const key of ['s', 'e', 'o']) {
    if (!isObject(shape[key])) {
      errors.push(`${path}.${key} is missing.`);
      continue;
    }
    validateAnimatable(shape[key], `${path}.${key}`, op, errors);
  }
  if (shape.m !== undefined && shape.m !== 1 && shape.m !== 2) errors.push(`${path}.m must be 1 or 2.`);
}

function validateOpacity(prop, path, op, errors) {
  if (!isObject(prop)) {
    errors.push(`${path} is missing.`);
    return;
  }
  validateAnimatable(prop, path, op, errors);
  collectAnimatableNumbers(prop).forEach((value) => {
    if (value < 0 || value > 100) errors.push(`${path}.k must be 0..100.`);
  });
}

function validateTransform(transform, path, op, errors, warnings) {
  if (!isObject(transform)) return errors.push(`${path} must be transform object.`);
  for (const key of ['a', 'p', 's', 'r', 'o']) {
    if (!isObject(transform[key])) {
      errors.push(`${path}.${key} is missing.`);
      continue;
    }
    validateAnimatable(transform[key], `${path}.${key}`, op, errors, warnings);
  }
}

function validateAnimatable(prop, path, op, errors) {
  if (![0, 1].includes(prop.a)) errors.push(`${path}.a must be 0 or 1.`);
  if (prop.x) errors.push(`${path} has expression field x.`);
  if (prop.a === 0) {
    if (!numeric(prop.k)) errors.push(`${path}.k static value must be numeric.`);
    return;
  }
  if (!Array.isArray(prop.k) || prop.k.length < 2) return errors.push(`${path}.k must contain keyframes.`);
  let prev = -1;
  prop.k.forEach((frame, index) => {
    if (!isObject(frame)) return errors.push(`${path}.k[${index}] must be object.`);
    if (!Number.isInteger(frame.t)) errors.push(`${path}.k[${index}].t must be integer, got ${frame.t}.`);
    if (finite(frame.t) && frame.t <= prev) errors.push(`${path}.k frame times must be strictly increasing.`);
    if (finite(frame.t) && finite(op) && (frame.t < 0 || frame.t >= op)) errors.push(`${path}.k[${index}].t=${frame.t} outside 0..op-1 (${op - 1}).`);
    if (!numeric(frame.s)) errors.push(`${path}.k[${index}].s must be numeric.`);
    if (frame.e !== undefined && !numeric(frame.e)) errors.push(`${path}.k[${index}].e must be numeric when present.`);
    prev = finite(frame.t) ? frame.t : prev;
  });
}

function collectAnimatableNumbers(prop) {
  const collect = (value) => {
    if (finite(value)) return [value];
    if (Array.isArray(value)) return value.filter(finite);
    return [];
  };

  if (prop.a === 0) return collect(prop.k);
  if (!Array.isArray(prop.k)) return [];
  return prop.k.flatMap((frame) => (isObject(frame) ? [...collect(frame.s), ...collect(frame.e)] : []));
}

function printResult(file, result) {
  console.log(`\n${file}`);
  if (!result.errors.length && !result.warnings.length) console.log('  OK');
  result.errors.forEach((item) => console.log(`  ERROR: ${item}`));
  result.warnings.forEach((item) => console.log(`  WARN: ${item}`));
}

function points(value) {
  return Array.isArray(value) && value.every((point) => Array.isArray(point) && point.length === 2 && point.every(finite));
}

function numeric(value) {
  return finite(value) || (Array.isArray(value) && value.length > 0 && value.every(finite));
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}
