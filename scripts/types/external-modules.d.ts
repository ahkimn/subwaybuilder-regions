declare module 'adm-zip' {
  export type AdmZipEntry = {
    entryName: string;
    getData(): Buffer;
  };

  export default class AdmZip {
    constructor(path?: string);
    addLocalFile(
      localPath: string,
      zipPath?: string,
      zipName?: string,
      comment?: string,
    ): void;
    getEntries(): AdmZipEntry[];
    writeZip(targetFileName: string, callback?: (error?: Error) => void): void;
  }
}

declare module 'kuroshiro' {
  export type KuroshiroConvertOptions = {
    to?: 'hiragana' | 'katakana' | 'romaji';
    mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana';
    romajiSystem?: 'nippon' | 'passport' | 'hepburn';
    delimiter_start?: string;
    delimiter_end?: string;
  };

  export default class Kuroshiro {
    init(analyzer: {
      init(): Promise<void>;
      parse(value?: string): Promise<unknown[]>;
    }): Promise<void>;
    convert(value: string, options?: KuroshiroConvertOptions): Promise<string>;
  }
}

declare module 'kuroshiro-analyzer-kuromoji' {
  export default class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string });
    init(): Promise<void>;
    parse(value?: string): Promise<unknown[]>;
  }
}
