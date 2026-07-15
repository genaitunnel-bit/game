"use strict";

const fs = require("fs");
const zlib = require("zlib");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// AUTOMATIC1111 系ツールが出力順に埋め込みやすいキーワード。
const PREFERRED_KEYWORDS = ["parameters", "prompt", "Comment", "Description"];

function readChunks(buf) {
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;
    chunks.push({ type, data: buf.subarray(dataStart, dataEnd) });
    offset = dataEnd + 4; // 4 bytes CRC
    if (type === "IEND") break;
  }
  return chunks;
}

function parseTEXt(data) {
  const nul = data.indexOf(0);
  if (nul < 0) return null;
  return { keyword: data.toString("latin1", 0, nul), text: data.toString("latin1", nul + 1) };
}

function parseZTXt(data) {
  const nul = data.indexOf(0);
  if (nul < 0) return null;
  const keyword = data.toString("latin1", 0, nul);
  const compressed = data.subarray(nul + 2); // skip NUL + compression method byte
  try {
    return { keyword, text: zlib.inflateSync(compressed).toString("utf8") };
  } catch {
    return null;
  }
}

function parseITXt(data) {
  let offset = data.indexOf(0);
  if (offset < 0) return null;
  const keyword = data.toString("latin1", 0, offset);
  offset += 1;
  const compressionFlag = data[offset];
  offset += 2; // flag byte + compression method byte
  const langEnd = data.indexOf(0, offset);
  if (langEnd < 0) return null;
  offset = langEnd + 1;
  const transKeyEnd = data.indexOf(0, offset);
  if (transKeyEnd < 0) return null;
  offset = transKeyEnd + 1;
  const rest = data.subarray(offset);
  try {
    const text = compressionFlag === 1 ? zlib.inflateSync(rest).toString("utf8") : rest.toString("utf8");
    return { keyword, text };
  } catch {
    return null;
  }
}

/**
 * PNG から生成メタデータ（Stable Diffusion 系ツールが埋め込む tEXt/zTXt/iTXt）を抽出する。
 * @param {string} filePath
 * @returns {string | null} 見つかったプロンプトテキスト。無ければ null。
 */
function extractPngPrompt(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`PNG形式ではありません: ${filePath}`);
  }

  const found = {};
  for (const chunk of readChunks(buf)) {
    let parsed = null;
    if (chunk.type === "tEXt") parsed = parseTEXt(chunk.data);
    else if (chunk.type === "zTXt") parsed = parseZTXt(chunk.data);
    else if (chunk.type === "iTXt") parsed = parseITXt(chunk.data);
    if (parsed && !(parsed.keyword in found)) found[parsed.keyword] = parsed.text;
  }

  for (const key of PREFERRED_KEYWORDS) {
    if (found[key]) return found[key];
  }
  const anyKey = Object.keys(found)[0];
  return anyKey ? found[anyKey] : null;
}

module.exports = { extractPngPrompt };
