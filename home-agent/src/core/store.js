import fs from 'node:fs';
import path from 'node:path';

/**
 * エージェントの「記憶」を保存する場所。
 * 落ちても、再起動しても、昨日のことを覚えていてほしいので毎回ファイルに落とす。
 */
export class Store {
  constructor(filePath, defaults = {}) {
    this.filePath = path.resolve(filePath);
    this.data = structuredClone(defaults);
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.data = { ...this.data, ...JSON.parse(raw) };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return this.data;
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.filePath); // 書き込み中に落ちても壊れないように
  }
}
