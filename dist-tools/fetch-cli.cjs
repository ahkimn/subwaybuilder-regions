#!/usr/bin/env node
'use strict';
const fs$2 = require('fs');
const path = require('path');
const require$$0$2 = require('constants');
const require$$0$3 = require('stream');
const require$$4 = require('util');
const require$$5 = require('assert');
const readline = require('readline');
const require$$0$4 = require('process');
const require$$0$5 = require('buffer');
const zlib = require('zlib');
var commonjsGlobal =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
          ? self
          : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default')
    ? x['default']
    : x;
}
function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
  var f = n.default;
  if (typeof f == 'function') {
    var a = function a2() {
      var isInstance = false;
      try {
        isInstance = this instanceof a2;
      } catch {}
      if (isInstance) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', { value: true });
  Object.keys(n).forEach(function (k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(
      a,
      k,
      d.get
        ? d
        : {
            enumerable: true,
            get: function () {
              return n[k];
            },
          },
    );
  });
  return a;
}
var minimist$1;
var hasRequiredMinimist;
function requireMinimist() {
  if (hasRequiredMinimist) return minimist$1;
  hasRequiredMinimist = 1;
  function hasKey(obj, keys) {
    var o = obj;
    keys.slice(0, -1).forEach(function (key2) {
      o = o[key2] || {};
    });
    var key = keys[keys.length - 1];
    return key in o;
  }
  function isNumber2(x) {
    if (typeof x === 'number') {
      return true;
    }
    if (/^0x[0-9a-f]+$/i.test(x)) {
      return true;
    }
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
  }
  function isConstructorOrProto(obj, key) {
    return (
      (key === 'constructor' && typeof obj[key] === 'function') ||
      key === '__proto__'
    );
  }
  minimist$1 = function (args, opts) {
    if (!opts) {
      opts = {};
    }
    var flags = {
      bools: {},
      strings: {},
      unknownFn: null,
    };
    if (typeof opts.unknown === 'function') {
      flags.unknownFn = opts.unknown;
    }
    if (typeof opts.boolean === 'boolean' && opts.boolean) {
      flags.allBools = true;
    } else {
      []
        .concat(opts.boolean)
        .filter(Boolean)
        .forEach(function (key2) {
          flags.bools[key2] = true;
        });
    }
    var aliases = {};
    function aliasIsBoolean(key2) {
      return aliases[key2].some(function (x) {
        return flags.bools[x];
      });
    }
    Object.keys(opts.alias || {}).forEach(function (key2) {
      aliases[key2] = [].concat(opts.alias[key2]);
      aliases[key2].forEach(function (x) {
        aliases[x] = [key2].concat(
          aliases[key2].filter(function (y) {
            return x !== y;
          }),
        );
      });
    });
    []
      .concat(opts.string)
      .filter(Boolean)
      .forEach(function (key2) {
        flags.strings[key2] = true;
        if (aliases[key2]) {
          [].concat(aliases[key2]).forEach(function (k) {
            flags.strings[k] = true;
          });
        }
      });
    var defaults = opts.default || {};
    var argv = { _: [] };
    function argDefined(key2, arg2) {
      return (
        (flags.allBools && /^--[^=]+$/.test(arg2)) ||
        flags.strings[key2] ||
        flags.bools[key2] ||
        aliases[key2]
      );
    }
    function setKey(obj, keys, value2) {
      var o = obj;
      for (var i2 = 0; i2 < keys.length - 1; i2++) {
        var key2 = keys[i2];
        if (isConstructorOrProto(o, key2)) {
          return;
        }
        if (o[key2] === void 0) {
          o[key2] = {};
        }
        if (
          o[key2] === Object.prototype ||
          o[key2] === Number.prototype ||
          o[key2] === String.prototype
        ) {
          o[key2] = {};
        }
        if (o[key2] === Array.prototype) {
          o[key2] = [];
        }
        o = o[key2];
      }
      var lastKey = keys[keys.length - 1];
      if (isConstructorOrProto(o, lastKey)) {
        return;
      }
      if (
        o === Object.prototype ||
        o === Number.prototype ||
        o === String.prototype
      ) {
        o = {};
      }
      if (o === Array.prototype) {
        o = [];
      }
      if (
        o[lastKey] === void 0 ||
        flags.bools[lastKey] ||
        typeof o[lastKey] === 'boolean'
      ) {
        o[lastKey] = value2;
      } else if (Array.isArray(o[lastKey])) {
        o[lastKey].push(value2);
      } else {
        o[lastKey] = [o[lastKey], value2];
      }
    }
    function setArg(key2, val, arg2) {
      if (arg2 && flags.unknownFn && !argDefined(key2, arg2)) {
        if (flags.unknownFn(arg2) === false) {
          return;
        }
      }
      var value2 = !flags.strings[key2] && isNumber2(val) ? Number(val) : val;
      setKey(argv, key2.split('.'), value2);
      (aliases[key2] || []).forEach(function (x) {
        setKey(argv, x.split('.'), value2);
      });
    }
    Object.keys(flags.bools).forEach(function (key2) {
      setArg(key2, defaults[key2] === void 0 ? false : defaults[key2]);
    });
    var notFlags = [];
    if (args.indexOf('--') !== -1) {
      notFlags = args.slice(args.indexOf('--') + 1);
      args = args.slice(0, args.indexOf('--'));
    }
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      var key;
      var next;
      if (/^--.+=/.test(arg)) {
        var m = arg.match(/^--([^=]+)=([\s\S]*)$/);
        key = m[1];
        var value = m[2];
        if (flags.bools[key]) {
          value = value !== 'false';
        }
        setArg(key, value, arg);
      } else if (/^--no-.+/.test(arg)) {
        key = arg.match(/^--no-(.+)/)[1];
        setArg(key, false, arg);
      } else if (/^--.+/.test(arg)) {
        key = arg.match(/^--(.+)/)[1];
        next = args[i + 1];
        if (
          next !== void 0 &&
          !/^(-|--)[^-]/.test(next) &&
          !flags.bools[key] &&
          !flags.allBools &&
          (aliases[key] ? !aliasIsBoolean(key) : true)
        ) {
          setArg(key, next, arg);
          i += 1;
        } else if (/^(true|false)$/.test(next)) {
          setArg(key, next === 'true', arg);
          i += 1;
        } else {
          setArg(key, flags.strings[key] ? '' : true, arg);
        }
      } else if (/^-[^-]+/.test(arg)) {
        var letters = arg.slice(1, -1).split('');
        var broken = false;
        for (var j = 0; j < letters.length; j++) {
          next = arg.slice(j + 2);
          if (next === '-') {
            setArg(letters[j], next, arg);
            continue;
          }
          if (/[A-Za-z]/.test(letters[j]) && next[0] === '=') {
            setArg(letters[j], next.slice(1), arg);
            broken = true;
            break;
          }
          if (
            /[A-Za-z]/.test(letters[j]) &&
            /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)
          ) {
            setArg(letters[j], next, arg);
            broken = true;
            break;
          }
          if (letters[j + 1] && letters[j + 1].match(/\W/)) {
            setArg(letters[j], arg.slice(j + 2), arg);
            broken = true;
            break;
          } else {
            setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg);
          }
        }
        key = arg.slice(-1)[0];
        if (!broken && key !== '-') {
          if (
            args[i + 1] &&
            !/^(-|--)[^-]/.test(args[i + 1]) &&
            !flags.bools[key] &&
            (aliases[key] ? !aliasIsBoolean(key) : true)
          ) {
            setArg(key, args[i + 1], arg);
            i += 1;
          } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
            setArg(key, args[i + 1] === 'true', arg);
            i += 1;
          } else {
            setArg(key, flags.strings[key] ? '' : true, arg);
          }
        }
      } else {
        if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
          argv._.push(flags.strings._ || !isNumber2(arg) ? arg : Number(arg));
        }
        if (opts.stopEarly) {
          argv._.push.apply(argv._, args.slice(i + 1));
          break;
        }
      }
    }
    Object.keys(defaults).forEach(function (k) {
      if (!hasKey(argv, k.split('.'))) {
        setKey(argv, k.split('.'), defaults[k]);
        (aliases[k] || []).forEach(function (x) {
          setKey(argv, x.split('.'), defaults[k]);
        });
      }
    });
    if (opts['--']) {
      argv['--'] = notFlags.slice();
    } else {
      notFlags.forEach(function (k) {
        argv._.push(k);
      });
    }
    return argv;
  };
  return minimist$1;
}
var minimistExports = requireMinimist();
const minimist = /* @__PURE__ */ getDefaultExportFromCjs(minimistExports);
const SOURCE_DATA_DIR = 'source_data';
const DATA_INDEX_FILE = 'data_index.json';
const OSM_COUNTRY_CONFIG_FILE = 'osm-country-admin-levels.json';
const OSM_COUNTRY_CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  SOURCE_DATA_DIR,
  OSM_COUNTRY_CONFIG_FILE,
);
let cachedOsmCountryConfigs = null;
function assertOsmCountryConfigs(value) {
  if (!Array.isArray(value)) {
    throw new Error(
      `[OSM Config] Expected an array in ${OSM_COUNTRY_CONFIG_PATH}`,
    );
  }
  for (let i = 0; i < value.length; i += 1) {
    const config = value[i];
    if (
      typeof config !== 'object' ||
      config === null ||
      typeof config.countryCode !== 'string' ||
      !Array.isArray(config.availableBoundaryTypes)
    ) {
      throw new Error(
        `[OSM Config] Invalid country config at index ${i} in ${OSM_COUNTRY_CONFIG_PATH}`,
      );
    }
  }
}
function loadOsmCountryConfigs() {
  if (cachedOsmCountryConfigs) {
    return cachedOsmCountryConfigs;
  }
  const fileContents = fs$2.readFileSync(OSM_COUNTRY_CONFIG_PATH, 'utf-8');
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(
      `[OSM Config] Failed to parse JSON at ${OSM_COUNTRY_CONFIG_PATH}: ${String(error)}`,
    );
  }
  assertOsmCountryConfigs(parsedConfig);
  cachedOsmCountryConfigs = parsedConfig;
  return cachedOsmCountryConfigs;
}
function findOsmCountryConfig(countryCode) {
  return loadOsmCountryConfigs().find(
    (config) => config.countryCode === countryCode,
  );
}
function requireString$1(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`Missing or invalid argument: --${name}`);
    process.exit(1);
  }
  return value;
}
function parseNumber(value) {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedNumber = Number(normalizedValue);
  return Number.isFinite(parsedNumber) ? parsedNumber : void 0;
}
function parseValidBBox(value) {
  const splitInput = value.split(',').map((part) => part.trim());
  if (splitInput.length !== 4) {
    throw new Error(
      `Invalid bbox format: expected 4 comma-separated values (west,south,east,north), got ${splitInput.length}`,
    );
  }
  const [westStr, southStr, eastStr, northStr] = splitInput;
  const west = parseNumber(westStr);
  const south = parseNumber(southStr);
  const east = parseNumber(eastStr);
  const north = parseNumber(northStr);
  if ([west, south, east, north].some((coord) => coord === void 0)) {
    throw new Error(
      `Invalid bbox format: all values must be valid numbers. Received: west=${westStr}, south=${southStr}, east=${eastStr}, north=${northStr}`,
    );
  }
  if (west >= east || west <= -180 || east > 180) {
    {
      throw new Error(
        `Invalid bbox format: west coordinate must be less than east coordinate and within [-180, 180]. Received: west=${west}, east=${east}`,
      );
    }
  }
  if (south >= north || south <= -90 || north > 90) {
    throw new Error(
      `Invalid bbox format: south coordinate must be less than north coordinate and within [-90, 90]. Received: south=${south}, north=${north}`,
    );
  }
  return {
    west,
    south,
    east,
    north,
  };
}
function parseDatasets(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
function parseFetchArgs(argvInput = process.argv.slice(2)) {
  const argv = minimist(argvInput, {
    string: ['cityCode', 'countryCode', 'datasets', 'bbox', 'out'],
    boolean: ['compress'],
    default: {
      compress: true,
      out: './data',
    },
    alias: {
      'city-code': 'cityCode',
      'country-code': 'countryCode',
    },
  });
  const cityCode = requireString$1(
    argv.cityCode ?? argv['city-code'],
    'cityCode',
  ).toUpperCase();
  const countryCode = requireString$1(
    argv.countryCode ?? argv['country-code'],
    'countryCode',
  ).toUpperCase();
  const datasets = parseDatasets(requireString$1(argv.datasets, 'datasets'));
  const bbox2 = parseValidBBox(requireString$1(argv.bbox, 'bbox'));
  const out = requireString$1(argv.out, 'out');
  const compress = Boolean(argv.compress);
  return {
    cityCode,
    countryCode,
    datasets,
    bbox: bbox2,
    compress,
    out,
  };
}
class CsvError extends Error {
  constructor(code, message, options, ...contexts) {
    if (Array.isArray(message)) message = message.join(' ').trim();
    super(message);
    if (Error.captureStackTrace !== void 0) {
      Error.captureStackTrace(this, CsvError);
    }
    this.code = code;
    for (const context of contexts) {
      for (const key in context) {
        const value = context[key];
        this[key] = Buffer.isBuffer(value)
          ? value.toString(options.encoding)
          : value == null
            ? value
            : JSON.parse(JSON.stringify(value));
      }
    }
  }
}
const is_object = function (obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
};
const normalize_columns_array = function (columns) {
  const normalizedColumns = [];
  for (let i = 0, l = columns.length; i < l; i++) {
    const column = columns[i];
    if (column === void 0 || column === null || column === false) {
      normalizedColumns[i] = { disabled: true };
    } else if (typeof column === 'string') {
      normalizedColumns[i] = { name: column };
    } else if (is_object(column)) {
      if (typeof column.name !== 'string') {
        throw new CsvError('CSV_OPTION_COLUMNS_MISSING_NAME', [
          'Option columns missing name:',
          `property "name" is required at position ${i}`,
          'when column is an object literal',
        ]);
      }
      normalizedColumns[i] = column;
    } else {
      throw new CsvError('CSV_INVALID_COLUMN_DEFINITION', [
        'Invalid column definition:',
        'expect a string or a literal object,',
        `got ${JSON.stringify(column)} at position ${i}`,
      ]);
    }
  }
  return normalizedColumns;
};
class ResizeableBuffer {
  constructor(size = 100) {
    this.size = size;
    this.length = 0;
    this.buf = Buffer.allocUnsafe(size);
  }
  prepend(val) {
    if (Buffer.isBuffer(val)) {
      const length2 = this.length + val.length;
      if (length2 >= this.size) {
        this.resize();
        if (length2 >= this.size) {
          throw Error('INVALID_BUFFER_STATE');
        }
      }
      const buf = this.buf;
      this.buf = Buffer.allocUnsafe(this.size);
      val.copy(this.buf, 0);
      buf.copy(this.buf, val.length);
      this.length += val.length;
    } else {
      const length2 = this.length++;
      if (length2 === this.size) {
        this.resize();
      }
      const buf = this.clone();
      this.buf[0] = val;
      buf.copy(this.buf, 1, 0, length2);
    }
  }
  append(val) {
    const length2 = this.length++;
    if (length2 === this.size) {
      this.resize();
    }
    this.buf[length2] = val;
  }
  clone() {
    return Buffer.from(this.buf.slice(0, this.length));
  }
  resize() {
    const length2 = this.length;
    this.size = this.size * 2;
    const buf = Buffer.allocUnsafe(this.size);
    this.buf.copy(buf, 0, 0, length2);
    this.buf = buf;
  }
  toString(encoding) {
    if (encoding) {
      return this.buf.slice(0, this.length).toString(encoding);
    } else {
      return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
    }
  }
  toJSON() {
    return this.toString('utf8');
  }
  reset() {
    this.length = 0;
  }
}
const np = 12;
const cr$1 = 13;
const nl$1 = 10;
const space = 32;
const tab = 9;
const init_state = function (options) {
  return {
    bomSkipped: false,
    bufBytesStart: 0,
    castField: options.cast_function,
    commenting: false,
    // Current error encountered by a record
    error: void 0,
    enabled: options.from_line === 1,
    escaping: false,
    escapeIsQuote:
      Buffer.isBuffer(options.escape) &&
      Buffer.isBuffer(options.quote) &&
      Buffer.compare(options.escape, options.quote) === 0,
    // columns can be `false`, `true`, `Array`
    expectedRecordLength: Array.isArray(options.columns)
      ? options.columns.length
      : void 0,
    field: new ResizeableBuffer(20),
    firstLineToHeaders: options.cast_first_line_to_header,
    needMoreDataSize: Math.max(
      // Skip if the remaining buffer smaller than comment
      options.comment !== null ? options.comment.length : 0,
      ...options.delimiter.map((delimiter) => delimiter.length),
      // Skip if the remaining buffer can be escape sequence
      options.quote !== null ? options.quote.length : 0,
    ),
    previousBuf: void 0,
    quoting: false,
    stop: false,
    rawBuffer: new ResizeableBuffer(100),
    record: [],
    recordHasError: false,
    record_length: 0,
    recordDelimiterMaxLength:
      options.record_delimiter.length === 0
        ? 0
        : Math.max(...options.record_delimiter.map((v) => v.length)),
    trimChars: [
      Buffer.from(' ', options.encoding)[0],
      Buffer.from('	', options.encoding)[0],
    ],
    wasQuoting: false,
    wasRowDelimiter: false,
    timchars: [
      Buffer.from(Buffer.from([cr$1], 'utf8').toString(), options.encoding),
      Buffer.from(Buffer.from([nl$1], 'utf8').toString(), options.encoding),
      Buffer.from(Buffer.from([np], 'utf8').toString(), options.encoding),
      Buffer.from(Buffer.from([space], 'utf8').toString(), options.encoding),
      Buffer.from(Buffer.from([tab], 'utf8').toString(), options.encoding),
    ],
  };
};
const underscore = function (str) {
  return str.replace(/([A-Z])/g, function (_, match) {
    return '_' + match.toLowerCase();
  });
};
const normalize_options = function (opts) {
  const options = {};
  for (const opt in opts) {
    options[underscore(opt)] = opts[opt];
  }
  if (options.encoding === void 0 || options.encoding === true) {
    options.encoding = 'utf8';
  } else if (options.encoding === null || options.encoding === false) {
    options.encoding = null;
  } else if (
    typeof options.encoding !== 'string' &&
    options.encoding !== null
  ) {
    throw new CsvError(
      'CSV_INVALID_OPTION_ENCODING',
      [
        'Invalid option encoding:',
        'encoding must be a string or null to return a buffer,',
        `got ${JSON.stringify(options.encoding)}`,
      ],
      options,
    );
  }
  if (options.bom === void 0 || options.bom === null || options.bom === false) {
    options.bom = false;
  } else if (options.bom !== true) {
    throw new CsvError(
      'CSV_INVALID_OPTION_BOM',
      [
        'Invalid option bom:',
        'bom must be true,',
        `got ${JSON.stringify(options.bom)}`,
      ],
      options,
    );
  }
  options.cast_function = null;
  if (
    options.cast === void 0 ||
    options.cast === null ||
    options.cast === false ||
    options.cast === ''
  ) {
    options.cast = void 0;
  } else if (typeof options.cast === 'function') {
    options.cast_function = options.cast;
    options.cast = true;
  } else if (options.cast !== true) {
    throw new CsvError(
      'CSV_INVALID_OPTION_CAST',
      [
        'Invalid option cast:',
        'cast must be true or a function,',
        `got ${JSON.stringify(options.cast)}`,
      ],
      options,
    );
  }
  if (
    options.cast_date === void 0 ||
    options.cast_date === null ||
    options.cast_date === false ||
    options.cast_date === ''
  ) {
    options.cast_date = false;
  } else if (options.cast_date === true) {
    options.cast_date = function (value) {
      const date = Date.parse(value);
      return !isNaN(date) ? new Date(date) : value;
    };
  } else if (typeof options.cast_date !== 'function') {
    throw new CsvError(
      'CSV_INVALID_OPTION_CAST_DATE',
      [
        'Invalid option cast_date:',
        'cast_date must be true or a function,',
        `got ${JSON.stringify(options.cast_date)}`,
      ],
      options,
    );
  }
  options.cast_first_line_to_header = void 0;
  if (options.columns === true) {
    options.cast_first_line_to_header = void 0;
  } else if (typeof options.columns === 'function') {
    options.cast_first_line_to_header = options.columns;
    options.columns = true;
  } else if (Array.isArray(options.columns)) {
    options.columns = normalize_columns_array(options.columns);
  } else if (
    options.columns === void 0 ||
    options.columns === null ||
    options.columns === false
  ) {
    options.columns = false;
  } else {
    throw new CsvError(
      'CSV_INVALID_OPTION_COLUMNS',
      [
        'Invalid option columns:',
        'expect an array, a function or true,',
        `got ${JSON.stringify(options.columns)}`,
      ],
      options,
    );
  }
  if (
    options.group_columns_by_name === void 0 ||
    options.group_columns_by_name === null ||
    options.group_columns_by_name === false
  ) {
    options.group_columns_by_name = false;
  } else if (options.group_columns_by_name !== true) {
    throw new CsvError(
      'CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME',
      [
        'Invalid option group_columns_by_name:',
        'expect an boolean,',
        `got ${JSON.stringify(options.group_columns_by_name)}`,
      ],
      options,
    );
  } else if (options.columns === false) {
    throw new CsvError(
      'CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME',
      [
        'Invalid option group_columns_by_name:',
        'the `columns` mode must be activated.',
      ],
      options,
    );
  }
  if (
    options.comment === void 0 ||
    options.comment === null ||
    options.comment === false ||
    options.comment === ''
  ) {
    options.comment = null;
  } else {
    if (typeof options.comment === 'string') {
      options.comment = Buffer.from(options.comment, options.encoding);
    }
    if (!Buffer.isBuffer(options.comment)) {
      throw new CsvError(
        'CSV_INVALID_OPTION_COMMENT',
        [
          'Invalid option comment:',
          'comment must be a buffer or a string,',
          `got ${JSON.stringify(options.comment)}`,
        ],
        options,
      );
    }
  }
  if (
    options.comment_no_infix === void 0 ||
    options.comment_no_infix === null ||
    options.comment_no_infix === false
  ) {
    options.comment_no_infix = false;
  } else if (options.comment_no_infix !== true) {
    throw new CsvError(
      'CSV_INVALID_OPTION_COMMENT',
      [
        'Invalid option comment_no_infix:',
        'value must be a boolean,',
        `got ${JSON.stringify(options.comment_no_infix)}`,
      ],
      options,
    );
  }
  const delimiter_json = JSON.stringify(options.delimiter);
  if (!Array.isArray(options.delimiter))
    options.delimiter = [options.delimiter];
  if (options.delimiter.length === 0) {
    throw new CsvError(
      'CSV_INVALID_OPTION_DELIMITER',
      [
        'Invalid option delimiter:',
        'delimiter must be a non empty string or buffer or array of string|buffer,',
        `got ${delimiter_json}`,
      ],
      options,
    );
  }
  options.delimiter = options.delimiter.map(function (delimiter) {
    if (delimiter === void 0 || delimiter === null || delimiter === false) {
      return Buffer.from(',', options.encoding);
    }
    if (typeof delimiter === 'string') {
      delimiter = Buffer.from(delimiter, options.encoding);
    }
    if (!Buffer.isBuffer(delimiter) || delimiter.length === 0) {
      throw new CsvError(
        'CSV_INVALID_OPTION_DELIMITER',
        [
          'Invalid option delimiter:',
          'delimiter must be a non empty string or buffer or array of string|buffer,',
          `got ${delimiter_json}`,
        ],
        options,
      );
    }
    return delimiter;
  });
  if (options.escape === void 0 || options.escape === true) {
    options.escape = Buffer.from('"', options.encoding);
  } else if (typeof options.escape === 'string') {
    options.escape = Buffer.from(options.escape, options.encoding);
  } else if (options.escape === null || options.escape === false) {
    options.escape = null;
  }
  if (options.escape !== null) {
    if (!Buffer.isBuffer(options.escape)) {
      throw new Error(
        `Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`,
      );
    }
  }
  if (options.from === void 0 || options.from === null) {
    options.from = 1;
  } else {
    if (typeof options.from === 'string' && /\d+/.test(options.from)) {
      options.from = parseInt(options.from);
    }
    if (Number.isInteger(options.from)) {
      if (options.from < 0) {
        throw new Error(
          `Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`,
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`,
      );
    }
  }
  if (options.from_line === void 0 || options.from_line === null) {
    options.from_line = 1;
  } else {
    if (
      typeof options.from_line === 'string' &&
      /\d+/.test(options.from_line)
    ) {
      options.from_line = parseInt(options.from_line);
    }
    if (Number.isInteger(options.from_line)) {
      if (options.from_line <= 0) {
        throw new Error(
          `Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`,
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`,
      );
    }
  }
  if (
    options.ignore_last_delimiters === void 0 ||
    options.ignore_last_delimiters === null
  ) {
    options.ignore_last_delimiters = false;
  } else if (typeof options.ignore_last_delimiters === 'number') {
    options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
    if (options.ignore_last_delimiters === 0) {
      options.ignore_last_delimiters = false;
    }
  } else if (typeof options.ignore_last_delimiters !== 'boolean') {
    throw new CsvError(
      'CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS',
      [
        'Invalid option `ignore_last_delimiters`:',
        'the value must be a boolean value or an integer,',
        `got ${JSON.stringify(options.ignore_last_delimiters)}`,
      ],
      options,
    );
  }
  if (options.ignore_last_delimiters === true && options.columns === false) {
    throw new CsvError(
      'CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS',
      [
        'The option `ignore_last_delimiters`',
        'requires the activation of the `columns` option',
      ],
      options,
    );
  }
  if (
    options.info === void 0 ||
    options.info === null ||
    options.info === false
  ) {
    options.info = false;
  } else if (options.info !== true) {
    throw new Error(
      `Invalid Option: info must be true, got ${JSON.stringify(options.info)}`,
    );
  }
  if (
    options.max_record_size === void 0 ||
    options.max_record_size === null ||
    options.max_record_size === false
  ) {
    options.max_record_size = 0;
  } else if (
    Number.isInteger(options.max_record_size) &&
    options.max_record_size >= 0
  );
  else if (
    typeof options.max_record_size === 'string' &&
    /\d+/.test(options.max_record_size)
  ) {
    options.max_record_size = parseInt(options.max_record_size);
  } else {
    throw new Error(
      `Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`,
    );
  }
  if (
    options.objname === void 0 ||
    options.objname === null ||
    options.objname === false
  ) {
    options.objname = void 0;
  } else if (Buffer.isBuffer(options.objname)) {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty buffer`);
    }
    if (options.encoding === null);
    else {
      options.objname = options.objname.toString(options.encoding);
    }
  } else if (typeof options.objname === 'string') {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty string`);
    }
  } else if (typeof options.objname === 'number');
  else {
    throw new Error(
      `Invalid Option: objname must be a string or a buffer, got ${options.objname}`,
    );
  }
  if (options.objname !== void 0) {
    if (typeof options.objname === 'number') {
      if (options.columns !== false) {
        throw Error(
          'Invalid Option: objname index cannot be combined with columns or be defined as a field',
        );
      }
    } else {
      if (options.columns === false) {
        throw Error(
          'Invalid Option: objname field must be combined with columns or be defined as an index',
        );
      }
    }
  }
  if (options.on_record === void 0 || options.on_record === null) {
    options.on_record = void 0;
  } else if (typeof options.on_record !== 'function') {
    throw new CsvError(
      'CSV_INVALID_OPTION_ON_RECORD',
      [
        'Invalid option `on_record`:',
        'expect a function,',
        `got ${JSON.stringify(options.on_record)}`,
      ],
      options,
    );
  }
  if (
    options.on_skip !== void 0 &&
    options.on_skip !== null &&
    typeof options.on_skip !== 'function'
  ) {
    throw new Error(
      `Invalid Option: on_skip must be a function, got ${JSON.stringify(options.on_skip)}`,
    );
  }
  if (
    options.quote === null ||
    options.quote === false ||
    options.quote === ''
  ) {
    options.quote = null;
  } else {
    if (options.quote === void 0 || options.quote === true) {
      options.quote = Buffer.from('"', options.encoding);
    } else if (typeof options.quote === 'string') {
      options.quote = Buffer.from(options.quote, options.encoding);
    }
    if (!Buffer.isBuffer(options.quote)) {
      throw new Error(
        `Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`,
      );
    }
  }
  if (options.raw === void 0 || options.raw === null || options.raw === false) {
    options.raw = false;
  } else if (options.raw !== true) {
    throw new Error(
      `Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`,
    );
  }
  if (options.record_delimiter === void 0) {
    options.record_delimiter = [];
  } else if (
    typeof options.record_delimiter === 'string' ||
    Buffer.isBuffer(options.record_delimiter)
  ) {
    if (options.record_delimiter.length === 0) {
      throw new CsvError(
        'CSV_INVALID_OPTION_RECORD_DELIMITER',
        [
          'Invalid option `record_delimiter`:',
          'value must be a non empty string or buffer,',
          `got ${JSON.stringify(options.record_delimiter)}`,
        ],
        options,
      );
    }
    options.record_delimiter = [options.record_delimiter];
  } else if (!Array.isArray(options.record_delimiter)) {
    throw new CsvError(
      'CSV_INVALID_OPTION_RECORD_DELIMITER',
      [
        'Invalid option `record_delimiter`:',
        'value must be a string, a buffer or array of string|buffer,',
        `got ${JSON.stringify(options.record_delimiter)}`,
      ],
      options,
    );
  }
  options.record_delimiter = options.record_delimiter.map(function (rd, i) {
    if (typeof rd !== 'string' && !Buffer.isBuffer(rd)) {
      throw new CsvError(
        'CSV_INVALID_OPTION_RECORD_DELIMITER',
        [
          'Invalid option `record_delimiter`:',
          'value must be a string, a buffer or array of string|buffer',
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`,
        ],
        options,
      );
    } else if (rd.length === 0) {
      throw new CsvError(
        'CSV_INVALID_OPTION_RECORD_DELIMITER',
        [
          'Invalid option `record_delimiter`:',
          'value must be a non empty string or buffer',
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`,
        ],
        options,
      );
    }
    if (typeof rd === 'string') {
      rd = Buffer.from(rd, options.encoding);
    }
    return rd;
  });
  if (typeof options.relax_column_count === 'boolean');
  else if (
    options.relax_column_count === void 0 ||
    options.relax_column_count === null
  ) {
    options.relax_column_count = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`,
    );
  }
  if (typeof options.relax_column_count_less === 'boolean');
  else if (
    options.relax_column_count_less === void 0 ||
    options.relax_column_count_less === null
  ) {
    options.relax_column_count_less = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`,
    );
  }
  if (typeof options.relax_column_count_more === 'boolean');
  else if (
    options.relax_column_count_more === void 0 ||
    options.relax_column_count_more === null
  ) {
    options.relax_column_count_more = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`,
    );
  }
  if (typeof options.relax_quotes === 'boolean');
  else if (options.relax_quotes === void 0 || options.relax_quotes === null) {
    options.relax_quotes = false;
  } else {
    throw new Error(
      `Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`,
    );
  }
  if (typeof options.skip_empty_lines === 'boolean');
  else if (
    options.skip_empty_lines === void 0 ||
    options.skip_empty_lines === null
  ) {
    options.skip_empty_lines = false;
  } else {
    throw new Error(
      `Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`,
    );
  }
  if (typeof options.skip_records_with_empty_values === 'boolean');
  else if (
    options.skip_records_with_empty_values === void 0 ||
    options.skip_records_with_empty_values === null
  ) {
    options.skip_records_with_empty_values = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`,
    );
  }
  if (typeof options.skip_records_with_error === 'boolean');
  else if (
    options.skip_records_with_error === void 0 ||
    options.skip_records_with_error === null
  ) {
    options.skip_records_with_error = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`,
    );
  }
  if (
    options.rtrim === void 0 ||
    options.rtrim === null ||
    options.rtrim === false
  ) {
    options.rtrim = false;
  } else if (options.rtrim !== true) {
    throw new Error(
      `Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`,
    );
  }
  if (
    options.ltrim === void 0 ||
    options.ltrim === null ||
    options.ltrim === false
  ) {
    options.ltrim = false;
  } else if (options.ltrim !== true) {
    throw new Error(
      `Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`,
    );
  }
  if (
    options.trim === void 0 ||
    options.trim === null ||
    options.trim === false
  ) {
    options.trim = false;
  } else if (options.trim !== true) {
    throw new Error(
      `Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`,
    );
  }
  if (options.trim === true && opts.ltrim !== false) {
    options.ltrim = true;
  } else if (options.ltrim !== true) {
    options.ltrim = false;
  }
  if (options.trim === true && opts.rtrim !== false) {
    options.rtrim = true;
  } else if (options.rtrim !== true) {
    options.rtrim = false;
  }
  if (options.to === void 0 || options.to === null) {
    options.to = -1;
  } else if (options.to !== -1) {
    if (typeof options.to === 'string' && /\d+/.test(options.to)) {
      options.to = parseInt(options.to);
    }
    if (Number.isInteger(options.to)) {
      if (options.to <= 0) {
        throw new Error(
          `Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`,
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`,
      );
    }
  }
  if (options.to_line === void 0 || options.to_line === null) {
    options.to_line = -1;
  } else if (options.to_line !== -1) {
    if (typeof options.to_line === 'string' && /\d+/.test(options.to_line)) {
      options.to_line = parseInt(options.to_line);
    }
    if (Number.isInteger(options.to_line)) {
      if (options.to_line <= 0) {
        throw new Error(
          `Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`,
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`,
      );
    }
  }
  return options;
};
const isRecordEmpty = function (record) {
  return record.every(
    (field) =>
      field == null || (field.toString && field.toString().trim() === ''),
  );
};
const cr = 13;
const nl = 10;
const boms = {
  // Note, the following are equals:
  // Buffer.from("\ufeff")
  // Buffer.from([239, 187, 191])
  // Buffer.from('EFBBBF', 'hex')
  utf8: Buffer.from([239, 187, 191]),
  // Note, the following are equals:
  // Buffer.from "\ufeff", 'utf16le
  // Buffer.from([255, 254])
  utf16le: Buffer.from([255, 254]),
};
const transform = function (original_options = {}) {
  const info = {
    bytes: 0,
    comment_lines: 0,
    empty_lines: 0,
    invalid_field_length: 0,
    lines: 1,
    records: 0,
  };
  const options = normalize_options(original_options);
  return {
    info,
    original_options,
    options,
    state: init_state(options),
    __needMoreData: function (i, bufLen, end) {
      if (end) return false;
      const { encoding, escape, quote } = this.options;
      const { quoting, needMoreDataSize, recordDelimiterMaxLength } =
        this.state;
      const numOfCharLeft = bufLen - i - 1;
      const requiredLength = Math.max(
        needMoreDataSize,
        // Skip if the remaining buffer smaller than record delimiter
        // If "record_delimiter" is yet to be discovered:
        // 1. It is equals to `[]` and "recordDelimiterMaxLength" equals `0`
        // 2. We set the length to windows line ending in the current encoding
        // Note, that encoding is known from user or bom discovery at that point
        // recordDelimiterMaxLength,
        recordDelimiterMaxLength === 0
          ? Buffer.from('\r\n', encoding).length
          : recordDelimiterMaxLength,
        // Skip if remaining buffer can be an escaped quote
        quoting ? (escape === null ? 0 : escape.length) + quote.length : 0,
        // Skip if remaining buffer can be record delimiter following the closing quote
        quoting ? quote.length + recordDelimiterMaxLength : 0,
      );
      return numOfCharLeft < requiredLength;
    },
    // Central parser implementation
    parse: function (nextBuf, end, push, close) {
      const {
        bom,
        comment_no_infix,
        encoding,
        from_line,
        ltrim,
        max_record_size,
        raw,
        relax_quotes,
        rtrim,
        skip_empty_lines,
        to,
        to_line,
      } = this.options;
      let { comment, escape, quote, record_delimiter } = this.options;
      const { bomSkipped, previousBuf, rawBuffer, escapeIsQuote } = this.state;
      let buf;
      if (previousBuf === void 0) {
        if (nextBuf === void 0) {
          close();
          return;
        } else {
          buf = nextBuf;
        }
      } else if (previousBuf !== void 0 && nextBuf === void 0) {
        buf = previousBuf;
      } else {
        buf = Buffer.concat([previousBuf, nextBuf]);
      }
      if (bomSkipped === false) {
        if (bom === false) {
          this.state.bomSkipped = true;
        } else if (buf.length < 3) {
          if (end === false) {
            this.state.previousBuf = buf;
            return;
          }
        } else {
          for (const encoding2 in boms) {
            if (boms[encoding2].compare(buf, 0, boms[encoding2].length) === 0) {
              const bomLength = boms[encoding2].length;
              this.state.bufBytesStart += bomLength;
              buf = buf.slice(bomLength);
              const options2 = normalize_options({
                ...this.original_options,
                encoding: encoding2,
              });
              for (const key in options2) {
                this.options[key] = options2[key];
              }
              ({ comment, escape, quote } = this.options);
              break;
            }
          }
          this.state.bomSkipped = true;
        }
      }
      const bufLen = buf.length;
      let pos;
      for (pos = 0; pos < bufLen; pos++) {
        if (this.__needMoreData(pos, bufLen, end)) {
          break;
        }
        if (this.state.wasRowDelimiter === true) {
          this.info.lines++;
          this.state.wasRowDelimiter = false;
        }
        if (to_line !== -1 && this.info.lines > to_line) {
          this.state.stop = true;
          close();
          return;
        }
        if (this.state.quoting === false && record_delimiter.length === 0) {
          const record_delimiterCount = this.__autoDiscoverRecordDelimiter(
            buf,
            pos,
          );
          if (record_delimiterCount) {
            record_delimiter = this.options.record_delimiter;
          }
        }
        const chr = buf[pos];
        if (raw === true) {
          rawBuffer.append(chr);
        }
        if (
          (chr === cr || chr === nl) &&
          this.state.wasRowDelimiter === false
        ) {
          this.state.wasRowDelimiter = true;
        }
        if (this.state.escaping === true) {
          this.state.escaping = false;
        } else {
          if (
            escape !== null &&
            this.state.quoting === true &&
            this.__isEscape(buf, pos, chr) &&
            pos + escape.length < bufLen
          ) {
            if (escapeIsQuote) {
              if (this.__isQuote(buf, pos + escape.length)) {
                this.state.escaping = true;
                pos += escape.length - 1;
                continue;
              }
            } else {
              this.state.escaping = true;
              pos += escape.length - 1;
              continue;
            }
          }
          if (this.state.commenting === false && this.__isQuote(buf, pos)) {
            if (this.state.quoting === true) {
              const nextChr = buf[pos + quote.length];
              const isNextChrTrimable =
                rtrim && this.__isCharTrimable(buf, pos + quote.length);
              const isNextChrComment =
                comment !== null &&
                this.__compareBytes(comment, buf, pos + quote.length, nextChr);
              const isNextChrDelimiter = this.__isDelimiter(
                buf,
                pos + quote.length,
                nextChr,
              );
              const isNextChrRecordDelimiter =
                record_delimiter.length === 0
                  ? this.__autoDiscoverRecordDelimiter(buf, pos + quote.length)
                  : this.__isRecordDelimiter(nextChr, buf, pos + quote.length);
              if (
                escape !== null &&
                this.__isEscape(buf, pos, chr) &&
                this.__isQuote(buf, pos + escape.length)
              ) {
                pos += escape.length - 1;
              } else if (
                !nextChr ||
                isNextChrDelimiter ||
                isNextChrRecordDelimiter ||
                isNextChrComment ||
                isNextChrTrimable
              ) {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                pos += quote.length - 1;
                continue;
              } else if (relax_quotes === false) {
                const err = this.__error(
                  new CsvError(
                    'CSV_INVALID_CLOSING_QUOTE',
                    [
                      'Invalid Closing Quote:',
                      `got "${String.fromCharCode(nextChr)}"`,
                      `at line ${this.info.lines}`,
                      'instead of delimiter, record delimiter, trimable character',
                      '(if activated) or comment',
                    ],
                    this.options,
                    this.__infoField(),
                  ),
                );
                if (err !== void 0) return err;
              } else {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                this.state.field.prepend(quote);
                pos += quote.length - 1;
              }
            } else {
              if (this.state.field.length !== 0) {
                if (relax_quotes === false) {
                  const info2 = this.__infoField();
                  const bom2 = Object.keys(boms)
                    .map((b) =>
                      boms[b].equals(this.state.field.toString()) ? b : false,
                    )
                    .filter(Boolean)[0];
                  const err = this.__error(
                    new CsvError(
                      'INVALID_OPENING_QUOTE',
                      [
                        'Invalid Opening Quote:',
                        `a quote is found on field ${JSON.stringify(info2.column)} at line ${info2.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                        bom2 ? `(${bom2} bom)` : void 0,
                      ],
                      this.options,
                      info2,
                      {
                        field: this.state.field,
                      },
                    ),
                  );
                  if (err !== void 0) return err;
                }
              } else {
                this.state.quoting = true;
                pos += quote.length - 1;
                continue;
              }
            }
          }
          if (this.state.quoting === false) {
            const recordDelimiterLength = this.__isRecordDelimiter(
              chr,
              buf,
              pos,
            );
            if (recordDelimiterLength !== 0) {
              const skipCommentLine =
                this.state.commenting &&
                this.state.wasQuoting === false &&
                this.state.record.length === 0 &&
                this.state.field.length === 0;
              if (skipCommentLine) {
                this.info.comment_lines++;
              } else {
                if (
                  this.state.enabled === false &&
                  this.info.lines +
                    (this.state.wasRowDelimiter === true ? 1 : 0) >=
                    from_line
                ) {
                  this.state.enabled = true;
                  this.__resetField();
                  this.__resetRecord();
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                if (
                  skip_empty_lines === true &&
                  this.state.wasQuoting === false &&
                  this.state.record.length === 0 &&
                  this.state.field.length === 0
                ) {
                  this.info.empty_lines++;
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                this.info.bytes = this.state.bufBytesStart + pos;
                const errField = this.__onField();
                if (errField !== void 0) return errField;
                this.info.bytes =
                  this.state.bufBytesStart + pos + recordDelimiterLength;
                const errRecord = this.__onRecord(push);
                if (errRecord !== void 0) return errRecord;
                if (to !== -1 && this.info.records >= to) {
                  this.state.stop = true;
                  close();
                  return;
                }
              }
              this.state.commenting = false;
              pos += recordDelimiterLength - 1;
              continue;
            }
            if (this.state.commenting) {
              continue;
            }
            if (
              comment !== null &&
              (comment_no_infix === false ||
                (this.state.record.length === 0 &&
                  this.state.field.length === 0))
            ) {
              const commentCount = this.__compareBytes(comment, buf, pos, chr);
              if (commentCount !== 0) {
                this.state.commenting = true;
                continue;
              }
            }
            const delimiterLength = this.__isDelimiter(buf, pos, chr);
            if (delimiterLength !== 0) {
              this.info.bytes = this.state.bufBytesStart + pos;
              const errField = this.__onField();
              if (errField !== void 0) return errField;
              pos += delimiterLength - 1;
              continue;
            }
          }
        }
        if (this.state.commenting === false) {
          if (
            max_record_size !== 0 &&
            this.state.record_length + this.state.field.length > max_record_size
          ) {
            return this.__error(
              new CsvError(
                'CSV_MAX_RECORD_SIZE',
                [
                  'Max Record Size:',
                  'record exceed the maximum number of tolerated bytes',
                  `of ${max_record_size}`,
                  `at line ${this.info.lines}`,
                ],
                this.options,
                this.__infoField(),
              ),
            );
          }
        }
        const lappend =
          ltrim === false ||
          this.state.quoting === true ||
          this.state.field.length !== 0 ||
          !this.__isCharTrimable(buf, pos);
        const rappend = rtrim === false || this.state.wasQuoting === false;
        if (lappend === true && rappend === true) {
          this.state.field.append(chr);
        } else if (rtrim === true && !this.__isCharTrimable(buf, pos)) {
          return this.__error(
            new CsvError(
              'CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE',
              [
                'Invalid Closing Quote:',
                'found non trimable byte after quote',
                `at line ${this.info.lines}`,
              ],
              this.options,
              this.__infoField(),
            ),
          );
        } else {
          if (lappend === false) {
            pos += this.__isCharTrimable(buf, pos) - 1;
          }
          continue;
        }
      }
      if (end === true) {
        if (this.state.quoting === true) {
          const err = this.__error(
            new CsvError(
              'CSV_QUOTE_NOT_CLOSED',
              [
                'Quote Not Closed:',
                `the parsing is finished with an opening quote at line ${this.info.lines}`,
              ],
              this.options,
              this.__infoField(),
            ),
          );
          if (err !== void 0) return err;
        } else {
          if (
            this.state.wasQuoting === true ||
            this.state.record.length !== 0 ||
            this.state.field.length !== 0
          ) {
            this.info.bytes = this.state.bufBytesStart + pos;
            const errField = this.__onField();
            if (errField !== void 0) return errField;
            const errRecord = this.__onRecord(push);
            if (errRecord !== void 0) return errRecord;
          } else if (this.state.wasRowDelimiter === true) {
            this.info.empty_lines++;
          } else if (this.state.commenting === true) {
            this.info.comment_lines++;
          }
        }
      } else {
        this.state.bufBytesStart += pos;
        this.state.previousBuf = buf.slice(pos);
      }
      if (this.state.wasRowDelimiter === true) {
        this.info.lines++;
        this.state.wasRowDelimiter = false;
      }
    },
    __onRecord: function (push) {
      const {
        columns,
        group_columns_by_name,
        encoding,
        info: info2,
        from,
        relax_column_count,
        relax_column_count_less,
        relax_column_count_more,
        raw,
        skip_records_with_empty_values,
      } = this.options;
      const { enabled, record } = this.state;
      if (enabled === false) {
        return this.__resetRecord();
      }
      const recordLength = record.length;
      if (columns === true) {
        if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
          this.__resetRecord();
          return;
        }
        return this.__firstLineToColumns(record);
      }
      if (columns === false && this.info.records === 0) {
        this.state.expectedRecordLength = recordLength;
      }
      if (recordLength !== this.state.expectedRecordLength) {
        const err =
          columns === false
            ? new CsvError(
                'CSV_RECORD_INCONSISTENT_FIELDS_LENGTH',
                [
                  'Invalid Record Length:',
                  `expect ${this.state.expectedRecordLength},`,
                  `got ${recordLength} on line ${this.info.lines}`,
                ],
                this.options,
                this.__infoField(),
                {
                  record,
                },
              )
            : new CsvError(
                'CSV_RECORD_INCONSISTENT_COLUMNS',
                [
                  'Invalid Record Length:',
                  `columns length is ${columns.length},`,
                  // rename columns
                  `got ${recordLength} on line ${this.info.lines}`,
                ],
                this.options,
                this.__infoField(),
                {
                  record,
                },
              );
        if (
          relax_column_count === true ||
          (relax_column_count_less === true &&
            recordLength < this.state.expectedRecordLength) ||
          (relax_column_count_more === true &&
            recordLength > this.state.expectedRecordLength)
        ) {
          this.info.invalid_field_length++;
          this.state.error = err;
        } else {
          const finalErr = this.__error(err);
          if (finalErr) return finalErr;
        }
      }
      if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
        this.__resetRecord();
        return;
      }
      if (this.state.recordHasError === true) {
        this.__resetRecord();
        this.state.recordHasError = false;
        return;
      }
      this.info.records++;
      if (from === 1 || this.info.records >= from) {
        const { objname } = this.options;
        if (columns !== false) {
          const obj = {};
          for (let i = 0, l = record.length; i < l; i++) {
            if (columns[i] === void 0 || columns[i].disabled) continue;
            if (
              group_columns_by_name === true &&
              obj[columns[i].name] !== void 0
            ) {
              if (Array.isArray(obj[columns[i].name])) {
                obj[columns[i].name] = obj[columns[i].name].concat(record[i]);
              } else {
                obj[columns[i].name] = [obj[columns[i].name], record[i]];
              }
            } else {
              obj[columns[i].name] = record[i];
            }
          }
          if (raw === true || info2 === true) {
            const extRecord = Object.assign(
              { record: obj },
              raw === true
                ? { raw: this.state.rawBuffer.toString(encoding) }
                : {},
              info2 === true ? { info: this.__infoRecord() } : {},
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [obj[objname], extRecord],
              push,
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? obj : [obj[objname], obj],
              push,
            );
            if (err) {
              return err;
            }
          }
        } else {
          if (raw === true || info2 === true) {
            const extRecord = Object.assign(
              { record },
              raw === true
                ? { raw: this.state.rawBuffer.toString(encoding) }
                : {},
              info2 === true ? { info: this.__infoRecord() } : {},
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [record[objname], extRecord],
              push,
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? record : [record[objname], record],
              push,
            );
            if (err) {
              return err;
            }
          }
        }
      }
      this.__resetRecord();
    },
    __firstLineToColumns: function (record) {
      const { firstLineToHeaders } = this.state;
      try {
        const headers =
          firstLineToHeaders === void 0
            ? record
            : firstLineToHeaders.call(null, record);
        if (!Array.isArray(headers)) {
          return this.__error(
            new CsvError(
              'CSV_INVALID_COLUMN_MAPPING',
              [
                'Invalid Column Mapping:',
                'expect an array from column function,',
                `got ${JSON.stringify(headers)}`,
              ],
              this.options,
              this.__infoField(),
              {
                headers,
              },
            ),
          );
        }
        const normalizedHeaders = normalize_columns_array(headers);
        this.state.expectedRecordLength = normalizedHeaders.length;
        this.options.columns = normalizedHeaders;
        this.__resetRecord();
        return;
      } catch (err) {
        return err;
      }
    },
    __resetRecord: function () {
      if (this.options.raw === true) {
        this.state.rawBuffer.reset();
      }
      this.state.error = void 0;
      this.state.record = [];
      this.state.record_length = 0;
    },
    __onField: function () {
      const { cast, encoding, rtrim, max_record_size } = this.options;
      const { enabled, wasQuoting } = this.state;
      if (enabled === false) {
        return this.__resetField();
      }
      let field = this.state.field.toString(encoding);
      if (rtrim === true && wasQuoting === false) {
        field = field.trimRight();
      }
      if (cast === true) {
        const [err, f] = this.__cast(field);
        if (err !== void 0) return err;
        field = f;
      }
      this.state.record.push(field);
      if (max_record_size !== 0 && typeof field === 'string') {
        this.state.record_length += field.length;
      }
      this.__resetField();
    },
    __resetField: function () {
      this.state.field.reset();
      this.state.wasQuoting = false;
    },
    __push: function (record, push) {
      const { on_record } = this.options;
      if (on_record !== void 0) {
        const info2 = this.__infoRecord();
        try {
          record = on_record.call(null, record, info2);
        } catch (err) {
          return err;
        }
        if (record === void 0 || record === null) {
          return;
        }
      }
      push(record);
    },
    // Return a tuple with the error and the casted value
    __cast: function (field) {
      const { columns, relax_column_count } = this.options;
      const isColumns = Array.isArray(columns);
      if (
        isColumns === true &&
        relax_column_count &&
        this.options.columns.length <= this.state.record.length
      ) {
        return [void 0, void 0];
      }
      if (this.state.castField !== null) {
        try {
          const info2 = this.__infoField();
          return [void 0, this.state.castField.call(null, field, info2)];
        } catch (err) {
          return [err];
        }
      }
      if (this.__isFloat(field)) {
        return [void 0, parseFloat(field)];
      } else if (this.options.cast_date !== false) {
        const info2 = this.__infoField();
        return [void 0, this.options.cast_date.call(null, field, info2)];
      }
      return [void 0, field];
    },
    // Helper to test if a character is a space or a line delimiter
    __isCharTrimable: function (buf, pos) {
      const isTrim = (buf2, pos2) => {
        const { timchars } = this.state;
        loop1: for (let i = 0; i < timchars.length; i++) {
          const timchar = timchars[i];
          for (let j = 0; j < timchar.length; j++) {
            if (timchar[j] !== buf2[pos2 + j]) continue loop1;
          }
          return timchar.length;
        }
        return 0;
      };
      return isTrim(buf, pos);
    },
    // Keep it in case we implement the `cast_int` option
    // __isInt(value){
    //   // return Number.isInteger(parseInt(value))
    //   // return !isNaN( parseInt( obj ) );
    //   return /^(\-|\+)?[1-9][0-9]*$/.test(value)
    // }
    __isFloat: function (value) {
      return value - parseFloat(value) + 1 >= 0;
    },
    __compareBytes: function (sourceBuf, targetBuf, targetPos, firstByte) {
      if (sourceBuf[0] !== firstByte) return 0;
      const sourceLength = sourceBuf.length;
      for (let i = 1; i < sourceLength; i++) {
        if (sourceBuf[i] !== targetBuf[targetPos + i]) return 0;
      }
      return sourceLength;
    },
    __isDelimiter: function (buf, pos, chr) {
      const { delimiter, ignore_last_delimiters } = this.options;
      if (
        ignore_last_delimiters === true &&
        this.state.record.length === this.options.columns.length - 1
      ) {
        return 0;
      } else if (
        ignore_last_delimiters !== false &&
        typeof ignore_last_delimiters === 'number' &&
        this.state.record.length === ignore_last_delimiters - 1
      ) {
        return 0;
      }
      loop1: for (let i = 0; i < delimiter.length; i++) {
        const del = delimiter[i];
        if (del[0] === chr) {
          for (let j = 1; j < del.length; j++) {
            if (del[j] !== buf[pos + j]) continue loop1;
          }
          return del.length;
        }
      }
      return 0;
    },
    __isRecordDelimiter: function (chr, buf, pos) {
      const { record_delimiter } = this.options;
      const recordDelimiterLength = record_delimiter.length;
      loop1: for (let i = 0; i < recordDelimiterLength; i++) {
        const rd = record_delimiter[i];
        const rdLength = rd.length;
        if (rd[0] !== chr) {
          continue;
        }
        for (let j = 1; j < rdLength; j++) {
          if (rd[j] !== buf[pos + j]) {
            continue loop1;
          }
        }
        return rd.length;
      }
      return 0;
    },
    __isEscape: function (buf, pos, chr) {
      const { escape } = this.options;
      if (escape === null) return false;
      const l = escape.length;
      if (escape[0] === chr) {
        for (let i = 0; i < l; i++) {
          if (escape[i] !== buf[pos + i]) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    __isQuote: function (buf, pos) {
      const { quote } = this.options;
      if (quote === null) return false;
      const l = quote.length;
      for (let i = 0; i < l; i++) {
        if (quote[i] !== buf[pos + i]) {
          return false;
        }
      }
      return true;
    },
    __autoDiscoverRecordDelimiter: function (buf, pos) {
      const { encoding } = this.options;
      const rds = [
        // Important, the windows line ending must be before mac os 9
        Buffer.from('\r\n', encoding),
        Buffer.from('\n', encoding),
        Buffer.from('\r', encoding),
      ];
      loop: for (let i = 0; i < rds.length; i++) {
        const l = rds[i].length;
        for (let j = 0; j < l; j++) {
          if (rds[i][j] !== buf[pos + j]) {
            continue loop;
          }
        }
        this.options.record_delimiter.push(rds[i]);
        this.state.recordDelimiterMaxLength = rds[i].length;
        return rds[i].length;
      }
      return 0;
    },
    __error: function (msg) {
      const { encoding, raw, skip_records_with_error } = this.options;
      const err = typeof msg === 'string' ? new Error(msg) : msg;
      if (skip_records_with_error) {
        this.state.recordHasError = true;
        if (this.options.on_skip !== void 0) {
          try {
            this.options.on_skip(
              err,
              raw ? this.state.rawBuffer.toString(encoding) : void 0,
            );
          } catch (err2) {
            return err2;
          }
        }
        return void 0;
      } else {
        return err;
      }
    },
    __infoDataSet: function () {
      return {
        ...this.info,
        columns: this.options.columns,
      };
    },
    __infoRecord: function () {
      const { columns, raw, encoding } = this.options;
      return {
        ...this.__infoDataSet(),
        error: this.state.error,
        header: columns === true,
        index: this.state.record.length,
        raw: raw ? this.state.rawBuffer.toString(encoding) : void 0,
      };
    },
    __infoField: function () {
      const { columns } = this.options;
      const isColumns = Array.isArray(columns);
      return {
        ...this.__infoRecord(),
        column:
          isColumns === true
            ? columns.length > this.state.record.length
              ? columns[this.state.record.length].name
              : null
            : this.state.record.length,
        quoting: this.state.wasQuoting,
      };
    },
  };
};
const parse = function (data, opts = {}) {
  if (typeof data === 'string') {
    data = Buffer.from(data);
  }
  const records = opts && opts.objname ? {} : [];
  const parser2 = transform(opts);
  const push = (record) => {
    if (parser2.options.objname === void 0) records.push(record);
    else {
      records[record[0]] = record[1];
    }
  };
  const close = () => {};
  const error = parser2.parse(data, true, push, close);
  if (error !== void 0) throw error;
  return records;
};
var fs$1 = {};
var universalify = {};
var hasRequiredUniversalify;
function requireUniversalify() {
  if (hasRequiredUniversalify) return universalify;
  hasRequiredUniversalify = 1;
  universalify.fromCallback = function (fn) {
    return Object.defineProperty(
      function (...args) {
        if (typeof args[args.length - 1] === 'function') fn.apply(this, args);
        else {
          return new Promise((resolve, reject) => {
            args.push((err, res) => (err != null ? reject(err) : resolve(res)));
            fn.apply(this, args);
          });
        }
      },
      'name',
      { value: fn.name },
    );
  };
  universalify.fromPromise = function (fn) {
    return Object.defineProperty(
      function (...args) {
        const cb = args[args.length - 1];
        if (typeof cb !== 'function') return fn.apply(this, args);
        else {
          args.pop();
          fn.apply(this, args).then((r) => cb(null, r), cb);
        }
      },
      'name',
      { value: fn.name },
    );
  };
  return universalify;
}
var polyfills;
var hasRequiredPolyfills;
function requirePolyfills() {
  if (hasRequiredPolyfills) return polyfills;
  hasRequiredPolyfills = 1;
  var constants = require$$0$2;
  var origCwd = process.cwd;
  var cwd = null;
  var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function () {
    if (!cwd) cwd = origCwd.call(process);
    return cwd;
  };
  try {
    process.cwd();
  } catch (er) {}
  if (typeof process.chdir === 'function') {
    var chdir = process.chdir;
    process.chdir = function (d) {
      cwd = null;
      chdir.call(process, d);
    };
    if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
  }
  polyfills = patch;
  function patch(fs2) {
    if (
      constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)
    ) {
      patchLchmod(fs2);
    }
    if (!fs2.lutimes) {
      patchLutimes(fs2);
    }
    fs2.chown = chownFix(fs2.chown);
    fs2.fchown = chownFix(fs2.fchown);
    fs2.lchown = chownFix(fs2.lchown);
    fs2.chmod = chmodFix(fs2.chmod);
    fs2.fchmod = chmodFix(fs2.fchmod);
    fs2.lchmod = chmodFix(fs2.lchmod);
    fs2.chownSync = chownFixSync(fs2.chownSync);
    fs2.fchownSync = chownFixSync(fs2.fchownSync);
    fs2.lchownSync = chownFixSync(fs2.lchownSync);
    fs2.chmodSync = chmodFixSync(fs2.chmodSync);
    fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
    fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
    fs2.stat = statFix(fs2.stat);
    fs2.fstat = statFix(fs2.fstat);
    fs2.lstat = statFix(fs2.lstat);
    fs2.statSync = statFixSync(fs2.statSync);
    fs2.fstatSync = statFixSync(fs2.fstatSync);
    fs2.lstatSync = statFixSync(fs2.lstatSync);
    if (fs2.chmod && !fs2.lchmod) {
      fs2.lchmod = function (path2, mode, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchmodSync = function () {};
    }
    if (fs2.chown && !fs2.lchown) {
      fs2.lchown = function (path2, uid, gid, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchownSync = function () {};
    }
    if (platform === 'win32') {
      fs2.rename =
        typeof fs2.rename !== 'function'
          ? fs2.rename
          : (function (fs$rename) {
              function rename(from, to, cb) {
                var start = Date.now();
                var backoff = 0;
                fs$rename(from, to, function CB(er) {
                  if (
                    er &&
                    (er.code === 'EACCES' ||
                      er.code === 'EPERM' ||
                      er.code === 'EBUSY') &&
                    Date.now() - start < 6e4
                  ) {
                    setTimeout(function () {
                      fs2.stat(to, function (stater, st) {
                        if (stater && stater.code === 'ENOENT')
                          fs$rename(from, to, CB);
                        else cb(er);
                      });
                    }, backoff);
                    if (backoff < 100) backoff += 10;
                    return;
                  }
                  if (cb) cb(er);
                });
              }
              if (Object.setPrototypeOf)
                Object.setPrototypeOf(rename, fs$rename);
              return rename;
            })(fs2.rename);
    }
    fs2.read =
      typeof fs2.read !== 'function'
        ? fs2.read
        : (function (fs$read) {
            function read(fd, buffer, offset, length2, position, callback_) {
              var callback;
              if (callback_ && typeof callback_ === 'function') {
                var eagCounter = 0;
                callback = function (er, _, __) {
                  if (er && er.code === 'EAGAIN' && eagCounter < 10) {
                    eagCounter++;
                    return fs$read.call(
                      fs2,
                      fd,
                      buffer,
                      offset,
                      length2,
                      position,
                      callback,
                    );
                  }
                  callback_.apply(this, arguments);
                };
              }
              return fs$read.call(
                fs2,
                fd,
                buffer,
                offset,
                length2,
                position,
                callback,
              );
            }
            if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
            return read;
          })(fs2.read);
    fs2.readSync =
      typeof fs2.readSync !== 'function'
        ? fs2.readSync
        : /* @__PURE__ */ (function (fs$readSync) {
            return function (fd, buffer, offset, length2, position) {
              var eagCounter = 0;
              while (true) {
                try {
                  return fs$readSync.call(
                    fs2,
                    fd,
                    buffer,
                    offset,
                    length2,
                    position,
                  );
                } catch (er) {
                  if (er.code === 'EAGAIN' && eagCounter < 10) {
                    eagCounter++;
                    continue;
                  }
                  throw er;
                }
              }
            };
          })(fs2.readSync);
    function patchLchmod(fs3) {
      fs3.lchmod = function (path2, mode, callback) {
        fs3.open(
          path2,
          constants.O_WRONLY | constants.O_SYMLINK,
          mode,
          function (err, fd) {
            if (err) {
              if (callback) callback(err);
              return;
            }
            fs3.fchmod(fd, mode, function (err2) {
              fs3.close(fd, function (err22) {
                if (callback) callback(err2 || err22);
              });
            });
          },
        );
      };
      fs3.lchmodSync = function (path2, mode) {
        var fd = fs3.openSync(
          path2,
          constants.O_WRONLY | constants.O_SYMLINK,
          mode,
        );
        var threw = true;
        var ret;
        try {
          ret = fs3.fchmodSync(fd, mode);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs3.closeSync(fd);
            } catch (er) {}
          } else {
            fs3.closeSync(fd);
          }
        }
        return ret;
      };
    }
    function patchLutimes(fs3) {
      if (constants.hasOwnProperty('O_SYMLINK') && fs3.futimes) {
        fs3.lutimes = function (path2, at, mt, cb) {
          fs3.open(path2, constants.O_SYMLINK, function (er, fd) {
            if (er) {
              if (cb) cb(er);
              return;
            }
            fs3.futimes(fd, at, mt, function (er2) {
              fs3.close(fd, function (er22) {
                if (cb) cb(er2 || er22);
              });
            });
          });
        };
        fs3.lutimesSync = function (path2, at, mt) {
          var fd = fs3.openSync(path2, constants.O_SYMLINK);
          var ret;
          var threw = true;
          try {
            ret = fs3.futimesSync(fd, at, mt);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs3.closeSync(fd);
              } catch (er) {}
            } else {
              fs3.closeSync(fd);
            }
          }
          return ret;
        };
      } else if (fs3.futimes) {
        fs3.lutimes = function (_a, _b, _c, cb) {
          if (cb) process.nextTick(cb);
        };
        fs3.lutimesSync = function () {};
      }
    }
    function chmodFix(orig) {
      if (!orig) return orig;
      return function (target, mode, cb) {
        return orig.call(fs2, target, mode, function (er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chmodFixSync(orig) {
      if (!orig) return orig;
      return function (target, mode) {
        try {
          return orig.call(fs2, target, mode);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function chownFix(orig) {
      if (!orig) return orig;
      return function (target, uid, gid, cb) {
        return orig.call(fs2, target, uid, gid, function (er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chownFixSync(orig) {
      if (!orig) return orig;
      return function (target, uid, gid) {
        try {
          return orig.call(fs2, target, uid, gid);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function statFix(orig) {
      if (!orig) return orig;
      return function (target, options, cb) {
        if (typeof options === 'function') {
          cb = options;
          options = null;
        }
        function callback(er, stats) {
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          if (cb) cb.apply(this, arguments);
        }
        return options
          ? orig.call(fs2, target, options, callback)
          : orig.call(fs2, target, callback);
      };
    }
    function statFixSync(orig) {
      if (!orig) return orig;
      return function (target, options) {
        var stats = options
          ? orig.call(fs2, target, options)
          : orig.call(fs2, target);
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        return stats;
      };
    }
    function chownErOk(er) {
      if (!er) return true;
      if (er.code === 'ENOSYS') return true;
      var nonroot = !process.getuid || process.getuid() !== 0;
      if (nonroot) {
        if (er.code === 'EINVAL' || er.code === 'EPERM') return true;
      }
      return false;
    }
  }
  return polyfills;
}
var legacyStreams;
var hasRequiredLegacyStreams;
function requireLegacyStreams() {
  if (hasRequiredLegacyStreams) return legacyStreams;
  hasRequiredLegacyStreams = 1;
  var Stream = require$$0$3.Stream;
  legacyStreams = legacy;
  function legacy(fs2) {
    return {
      ReadStream,
      WriteStream,
    };
    function ReadStream(path2, options) {
      if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
      Stream.call(this);
      var self2 = this;
      this.path = path2;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = 'r';
      this.mode = 438;
      this.bufferSize = 64 * 1024;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length2 = keys.length; index < length2; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding) this.setEncoding(this.encoding);
      if (this.start !== void 0) {
        if ('number' !== typeof this.start) {
          throw TypeError('start must be a Number');
        }
        if (this.end === void 0) {
          this.end = Infinity;
        } else if ('number' !== typeof this.end) {
          throw TypeError('end must be a Number');
        }
        if (this.start > this.end) {
          throw new Error('start must be <= end');
        }
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function () {
          self2._read();
        });
        return;
      }
      fs2.open(this.path, this.flags, this.mode, function (err, fd) {
        if (err) {
          self2.emit('error', err);
          self2.readable = false;
          return;
        }
        self2.fd = fd;
        self2.emit('open', fd);
        self2._read();
      });
    }
    function WriteStream(path2, options) {
      if (!(this instanceof WriteStream))
        return new WriteStream(path2, options);
      Stream.call(this);
      this.path = path2;
      this.fd = null;
      this.writable = true;
      this.flags = 'w';
      this.encoding = 'binary';
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length2 = keys.length; index < length2; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== void 0) {
        if ('number' !== typeof this.start) {
          throw TypeError('start must be a Number');
        }
        if (this.start < 0) {
          throw new Error('start must be >= zero');
        }
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs2.open;
        this._queue.push([
          this._open,
          this.path,
          this.flags,
          this.mode,
          void 0,
        ]);
        this.flush();
      }
    }
  }
  return legacyStreams;
}
var clone_1;
var hasRequiredClone;
function requireClone() {
  if (hasRequiredClone) return clone_1;
  hasRequiredClone = 1;
  clone_1 = clone2;
  var getPrototypeOf =
    Object.getPrototypeOf ||
    function (obj) {
      return obj.__proto__;
    };
  function clone2(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Object) var copy2 = { __proto__: getPrototypeOf(obj) };
    else var copy2 = /* @__PURE__ */ Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      Object.defineProperty(
        copy2,
        key,
        Object.getOwnPropertyDescriptor(obj, key),
      );
    });
    return copy2;
  }
  return clone_1;
}
var gracefulFs;
var hasRequiredGracefulFs;
function requireGracefulFs() {
  if (hasRequiredGracefulFs) return gracefulFs;
  hasRequiredGracefulFs = 1;
  var fs2 = fs$2;
  var polyfills2 = requirePolyfills();
  var legacy = requireLegacyStreams();
  var clone2 = requireClone();
  var util = require$$4;
  var gracefulQueue;
  var previousSymbol;
  if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
    gracefulQueue = /* @__PURE__ */ Symbol.for('graceful-fs.queue');
    previousSymbol = /* @__PURE__ */ Symbol.for('graceful-fs.previous');
  } else {
    gracefulQueue = '___graceful-fs.queue';
    previousSymbol = '___graceful-fs.previous';
  }
  function noop() {}
  function publishQueue(context, queue2) {
    Object.defineProperty(context, gracefulQueue, {
      get: function () {
        return queue2;
      },
    });
  }
  var debug = noop;
  if (util.debuglog) debug = util.debuglog('gfs4');
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
    debug = function () {
      var m = util.format.apply(util, arguments);
      m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
      console.error(m);
    };
  if (!fs2[gracefulQueue]) {
    var queue = commonjsGlobal[gracefulQueue] || [];
    publishQueue(fs2, queue);
    fs2.close = (function (fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs2, fd, function (err) {
          if (!err) {
            resetQueue();
          }
          if (typeof cb === 'function') cb.apply(this, arguments);
        });
      }
      Object.defineProperty(close, previousSymbol, {
        value: fs$close,
      });
      return close;
    })(fs2.close);
    fs2.closeSync = (function (fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs2, arguments);
        resetQueue();
      }
      Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync,
      });
      return closeSync;
    })(fs2.closeSync);
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
      process.on('exit', function () {
        debug(fs2[gracefulQueue]);
        require$$5.equal(fs2[gracefulQueue].length, 0);
      });
    }
  }
  if (!commonjsGlobal[gracefulQueue]) {
    publishQueue(commonjsGlobal, fs2[gracefulQueue]);
  }
  gracefulFs = patch(clone2(fs2));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs2.__patched) {
    gracefulFs = patch(fs2);
    fs2.__patched = true;
  }
  function patch(fs3) {
    polyfills2(fs3);
    fs3.gracefulify = patch;
    fs3.createReadStream = createReadStream;
    fs3.createWriteStream = createWriteStream;
    var fs$readFile = fs3.readFile;
    fs3.readFile = readFile;
    function readFile(path2, options, cb) {
      if (typeof options === 'function') ((cb = options), (options = null));
      return go$readFile(path2, options, cb);
      function go$readFile(path3, options2, cb2, startTime) {
        return fs$readFile(path3, options2, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
            enqueue([
              go$readFile,
              [path3, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now(),
            ]);
          else {
            if (typeof cb2 === 'function') cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$writeFile = fs3.writeFile;
    fs3.writeFile = writeFile;
    function writeFile(path2, data, options, cb) {
      if (typeof options === 'function') ((cb = options), (options = null));
      return go$writeFile(path2, data, options, cb);
      function go$writeFile(path3, data2, options2, cb2, startTime) {
        return fs$writeFile(path3, data2, options2, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
            enqueue([
              go$writeFile,
              [path3, data2, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now(),
            ]);
          else {
            if (typeof cb2 === 'function') cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$appendFile = fs3.appendFile;
    if (fs$appendFile) fs3.appendFile = appendFile;
    function appendFile(path2, data, options, cb) {
      if (typeof options === 'function') ((cb = options), (options = null));
      return go$appendFile(path2, data, options, cb);
      function go$appendFile(path3, data2, options2, cb2, startTime) {
        return fs$appendFile(path3, data2, options2, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
            enqueue([
              go$appendFile,
              [path3, data2, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now(),
            ]);
          else {
            if (typeof cb2 === 'function') cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$copyFile = fs3.copyFile;
    if (fs$copyFile) fs3.copyFile = copyFile;
    function copyFile(src, dest, flags, cb) {
      if (typeof flags === 'function') {
        cb = flags;
        flags = 0;
      }
      return go$copyFile(src, dest, flags, cb);
      function go$copyFile(src2, dest2, flags2, cb2, startTime) {
        return fs$copyFile(src2, dest2, flags2, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
            enqueue([
              go$copyFile,
              [src2, dest2, flags2, cb2],
              err,
              startTime || Date.now(),
              Date.now(),
            ]);
          else {
            if (typeof cb2 === 'function') cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$readdir = fs3.readdir;
    fs3.readdir = readdir;
    var noReaddirOptionVersions = /^v[0-5]\./;
    function readdir(path2, options, cb) {
      if (typeof options === 'function') ((cb = options), (options = null));
      var go$readdir = noReaddirOptionVersions.test(process.version)
        ? function go$readdir2(path3, options2, cb2, startTime) {
            return fs$readdir(
              path3,
              fs$readdirCallback(path3, options2, cb2, startTime),
            );
          }
        : function go$readdir2(path3, options2, cb2, startTime) {
            return fs$readdir(
              path3,
              options2,
              fs$readdirCallback(path3, options2, cb2, startTime),
            );
          };
      return go$readdir(path2, options, cb);
      function fs$readdirCallback(path3, options2, cb2, startTime) {
        return function (err, files) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
            enqueue([
              go$readdir,
              [path3, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now(),
            ]);
          else {
            if (files && files.sort) files.sort();
            if (typeof cb2 === 'function') cb2.call(this, err, files);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === 'v0.8') {
      var legStreams = legacy(fs3);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }
    var fs$ReadStream = fs3.ReadStream;
    if (fs$ReadStream) {
      ReadStream.prototype = Object.create(fs$ReadStream.prototype);
      ReadStream.prototype.open = ReadStream$open;
    }
    var fs$WriteStream = fs3.WriteStream;
    if (fs$WriteStream) {
      WriteStream.prototype = Object.create(fs$WriteStream.prototype);
      WriteStream.prototype.open = WriteStream$open;
    }
    Object.defineProperty(fs3, 'ReadStream', {
      get: function () {
        return ReadStream;
      },
      set: function (val) {
        ReadStream = val;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(fs3, 'WriteStream', {
      get: function () {
        return WriteStream;
      },
      set: function (val) {
        WriteStream = val;
      },
      enumerable: true,
      configurable: true,
    });
    var FileReadStream = ReadStream;
    Object.defineProperty(fs3, 'FileReadStream', {
      get: function () {
        return FileReadStream;
      },
      set: function (val) {
        FileReadStream = val;
      },
      enumerable: true,
      configurable: true,
    });
    var FileWriteStream = WriteStream;
    Object.defineProperty(fs3, 'FileWriteStream', {
      get: function () {
        return FileWriteStream;
      },
      set: function (val) {
        FileWriteStream = val;
      },
      enumerable: true,
      configurable: true,
    });
    function ReadStream(path2, options) {
      if (this instanceof ReadStream)
        return (fs$ReadStream.apply(this, arguments), this);
      else
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }
    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function (err, fd) {
        if (err) {
          if (that.autoClose) that.destroy();
          that.emit('error', err);
        } else {
          that.fd = fd;
          that.emit('open', fd);
          that.read();
        }
      });
    }
    function WriteStream(path2, options) {
      if (this instanceof WriteStream)
        return (fs$WriteStream.apply(this, arguments), this);
      else
        return WriteStream.apply(
          Object.create(WriteStream.prototype),
          arguments,
        );
    }
    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function (err, fd) {
        if (err) {
          that.destroy();
          that.emit('error', err);
        } else {
          that.fd = fd;
          that.emit('open', fd);
        }
      });
    }
    function createReadStream(path2, options) {
      return new fs3.ReadStream(path2, options);
    }
    function createWriteStream(path2, options) {
      return new fs3.WriteStream(path2, options);
    }
    var fs$open = fs3.open;
    fs3.open = open;
    function open(path2, flags, mode, cb) {
      if (typeof mode === 'function') ((cb = mode), (mode = null));
      return go$open(path2, flags, mode, cb);
      function go$open(path3, flags2, mode2, cb2, startTime) {
        return fs$open(path3, flags2, mode2, function (err, fd) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
            enqueue([
              go$open,
              [path3, flags2, mode2, cb2],
              err,
              startTime || Date.now(),
              Date.now(),
            ]);
          else {
            if (typeof cb2 === 'function') cb2.apply(this, arguments);
          }
        });
      }
    }
    return fs3;
  }
  function enqueue(elem) {
    debug('ENQUEUE', elem[0].name, elem[1]);
    fs2[gracefulQueue].push(elem);
    retry();
  }
  var retryTimer;
  function resetQueue() {
    var now = Date.now();
    for (var i = 0; i < fs2[gracefulQueue].length; ++i) {
      if (fs2[gracefulQueue][i].length > 2) {
        fs2[gracefulQueue][i][3] = now;
        fs2[gracefulQueue][i][4] = now;
      }
    }
    retry();
  }
  function retry() {
    clearTimeout(retryTimer);
    retryTimer = void 0;
    if (fs2[gracefulQueue].length === 0) return;
    var elem = fs2[gracefulQueue].shift();
    var fn = elem[0];
    var args = elem[1];
    var err = elem[2];
    var startTime = elem[3];
    var lastTime = elem[4];
    if (startTime === void 0) {
      debug('RETRY', fn.name, args);
      fn.apply(null, args);
    } else if (Date.now() - startTime >= 6e4) {
      debug('TIMEOUT', fn.name, args);
      var cb = args.pop();
      if (typeof cb === 'function') cb.call(null, err);
    } else {
      var sinceAttempt = Date.now() - lastTime;
      var sinceStart = Math.max(lastTime - startTime, 1);
      var desiredDelay = Math.min(sinceStart * 1.2, 100);
      if (sinceAttempt >= desiredDelay) {
        debug('RETRY', fn.name, args);
        fn.apply(null, args.concat([startTime]));
      } else {
        fs2[gracefulQueue].push(elem);
      }
    }
    if (retryTimer === void 0) {
      retryTimer = setTimeout(retry, 0);
    }
  }
  return gracefulFs;
}
var hasRequiredFs;
function requireFs() {
  if (hasRequiredFs) return fs$1;
  hasRequiredFs = 1;
  (function (exports$1) {
    const u2 = requireUniversalify().fromCallback;
    const fs2 = requireGracefulFs();
    const api = [
      'access',
      'appendFile',
      'chmod',
      'chown',
      'close',
      'copyFile',
      'cp',
      'fchmod',
      'fchown',
      'fdatasync',
      'fstat',
      'fsync',
      'ftruncate',
      'futimes',
      'glob',
      'lchmod',
      'lchown',
      'lutimes',
      'link',
      'lstat',
      'mkdir',
      'mkdtemp',
      'open',
      'opendir',
      'readdir',
      'readFile',
      'readlink',
      'realpath',
      'rename',
      'rm',
      'rmdir',
      'stat',
      'statfs',
      'symlink',
      'truncate',
      'unlink',
      'utimes',
      'writeFile',
    ].filter((key) => {
      return typeof fs2[key] === 'function';
    });
    Object.assign(exports$1, fs2);
    api.forEach((method) => {
      exports$1[method] = u2(fs2[method]);
    });
    exports$1.exists = function (filename, callback) {
      if (typeof callback === 'function') {
        return fs2.exists(filename, callback);
      }
      return new Promise((resolve) => {
        return fs2.exists(filename, resolve);
      });
    };
    exports$1.read = function (
      fd,
      buffer,
      offset,
      length2,
      position,
      callback,
    ) {
      if (typeof callback === 'function') {
        return fs2.read(fd, buffer, offset, length2, position, callback);
      }
      return new Promise((resolve, reject) => {
        fs2.read(
          fd,
          buffer,
          offset,
          length2,
          position,
          (err, bytesRead, buffer2) => {
            if (err) return reject(err);
            resolve({ bytesRead, buffer: buffer2 });
          },
        );
      });
    };
    exports$1.write = function (fd, buffer, ...args) {
      if (typeof args[args.length - 1] === 'function') {
        return fs2.write(fd, buffer, ...args);
      }
      return new Promise((resolve, reject) => {
        fs2.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    exports$1.readv = function (fd, buffers, ...args) {
      if (typeof args[args.length - 1] === 'function') {
        return fs2.readv(fd, buffers, ...args);
      }
      return new Promise((resolve, reject) => {
        fs2.readv(fd, buffers, ...args, (err, bytesRead, buffers2) => {
          if (err) return reject(err);
          resolve({ bytesRead, buffers: buffers2 });
        });
      });
    };
    exports$1.writev = function (fd, buffers, ...args) {
      if (typeof args[args.length - 1] === 'function') {
        return fs2.writev(fd, buffers, ...args);
      }
      return new Promise((resolve, reject) => {
        fs2.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffers: buffers2 });
        });
      });
    };
    if (typeof fs2.realpath.native === 'function') {
      exports$1.realpath.native = u2(fs2.realpath.native);
    } else {
      process.emitWarning(
        'fs.realpath.native is not a function. Is fs being monkey-patched?',
        'Warning',
        'fs-extra-WARN0003',
      );
    }
  })(fs$1);
  return fs$1;
}
var makeDir = {};
var utils$1 = {};
var hasRequiredUtils$1;
function requireUtils$1() {
  if (hasRequiredUtils$1) return utils$1;
  hasRequiredUtils$1 = 1;
  const path$1 = path;
  utils$1.checkPath = function checkPath(pth) {
    if (process.platform === 'win32') {
      const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(
        pth.replace(path$1.parse(pth).root, ''),
      );
      if (pathHasInvalidWinCharacters) {
        const error = new Error(`Path contains invalid characters: ${pth}`);
        error.code = 'EINVAL';
        throw error;
      }
    }
  };
  return utils$1;
}
var hasRequiredMakeDir;
function requireMakeDir() {
  if (hasRequiredMakeDir) return makeDir;
  hasRequiredMakeDir = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const { checkPath } = /* @__PURE__ */ requireUtils$1();
  const getMode = (options) => {
    const defaults = { mode: 511 };
    if (typeof options === 'number') return options;
    return { ...defaults, ...options }.mode;
  };
  makeDir.makeDir = async (dir, options) => {
    checkPath(dir);
    return fs2.mkdir(dir, {
      mode: getMode(options),
      recursive: true,
    });
  };
  makeDir.makeDirSync = (dir, options) => {
    checkPath(dir);
    return fs2.mkdirSync(dir, {
      mode: getMode(options),
      recursive: true,
    });
  };
  return makeDir;
}
var mkdirs;
var hasRequiredMkdirs;
function requireMkdirs() {
  if (hasRequiredMkdirs) return mkdirs;
  hasRequiredMkdirs = 1;
  const u2 = requireUniversalify().fromPromise;
  const { makeDir: _makeDir, makeDirSync } = /* @__PURE__ */ requireMakeDir();
  const makeDir2 = u2(_makeDir);
  mkdirs = {
    mkdirs: makeDir2,
    mkdirsSync: makeDirSync,
    // alias
    mkdirp: makeDir2,
    mkdirpSync: makeDirSync,
    ensureDir: makeDir2,
    ensureDirSync: makeDirSync,
  };
  return mkdirs;
}
var pathExists_1;
var hasRequiredPathExists;
function requirePathExists() {
  if (hasRequiredPathExists) return pathExists_1;
  hasRequiredPathExists = 1;
  const u2 = requireUniversalify().fromPromise;
  const fs2 = /* @__PURE__ */ requireFs();
  function pathExists(path2) {
    return fs2
      .access(path2)
      .then(() => true)
      .catch(() => false);
  }
  pathExists_1 = {
    pathExists: u2(pathExists),
    pathExistsSync: fs2.existsSync,
  };
  return pathExists_1;
}
var utimes;
var hasRequiredUtimes;
function requireUtimes() {
  if (hasRequiredUtimes) return utimes;
  hasRequiredUtimes = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const u2 = requireUniversalify().fromPromise;
  async function utimesMillis(path2, atime, mtime) {
    const fd = await fs2.open(path2, 'r+');
    let closeErr = null;
    try {
      await fs2.futimes(fd, atime, mtime);
    } finally {
      try {
        await fs2.close(fd);
      } catch (e) {
        closeErr = e;
      }
    }
    if (closeErr) {
      throw closeErr;
    }
  }
  function utimesMillisSync(path2, atime, mtime) {
    const fd = fs2.openSync(path2, 'r+');
    fs2.futimesSync(fd, atime, mtime);
    return fs2.closeSync(fd);
  }
  utimes = {
    utimesMillis: u2(utimesMillis),
    utimesMillisSync,
  };
  return utimes;
}
var stat;
var hasRequiredStat;
function requireStat() {
  if (hasRequiredStat) return stat;
  hasRequiredStat = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const u2 = requireUniversalify().fromPromise;
  function getStats(src, dest, opts) {
    const statFunc = opts.dereference
      ? (file2) => fs2.stat(file2, { bigint: true })
      : (file2) => fs2.lstat(file2, { bigint: true });
    return Promise.all([
      statFunc(src),
      statFunc(dest).catch((err) => {
        if (err.code === 'ENOENT') return null;
        throw err;
      }),
    ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
  }
  function getStatsSync(src, dest, opts) {
    let destStat;
    const statFunc = opts.dereference
      ? (file2) => fs2.statSync(file2, { bigint: true })
      : (file2) => fs2.lstatSync(file2, { bigint: true });
    const srcStat = statFunc(src);
    try {
      destStat = statFunc(dest);
    } catch (err) {
      if (err.code === 'ENOENT') return { srcStat, destStat: null };
      throw err;
    }
    return { srcStat, destStat };
  }
  async function checkPaths(src, dest, funcName, opts) {
    const { srcStat, destStat } = await getStats(src, dest, opts);
    if (destStat) {
      if (areIdentical(srcStat, destStat)) {
        const srcBaseName = path$1.basename(src);
        const destBaseName = path$1.basename(dest);
        if (
          funcName === 'move' &&
          srcBaseName !== destBaseName &&
          srcBaseName.toLowerCase() === destBaseName.toLowerCase()
        ) {
          return { srcStat, destStat, isChangingCase: true };
        }
        throw new Error('Source and destination must not be the same.');
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        throw new Error(
          `Cannot overwrite non-directory '${dest}' with directory '${src}'.`,
        );
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        throw new Error(
          `Cannot overwrite directory '${dest}' with non-directory '${src}'.`,
        );
      }
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return { srcStat, destStat };
  }
  function checkPathsSync(src, dest, funcName, opts) {
    const { srcStat, destStat } = getStatsSync(src, dest, opts);
    if (destStat) {
      if (areIdentical(srcStat, destStat)) {
        const srcBaseName = path$1.basename(src);
        const destBaseName = path$1.basename(dest);
        if (
          funcName === 'move' &&
          srcBaseName !== destBaseName &&
          srcBaseName.toLowerCase() === destBaseName.toLowerCase()
        ) {
          return { srcStat, destStat, isChangingCase: true };
        }
        throw new Error('Source and destination must not be the same.');
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        throw new Error(
          `Cannot overwrite non-directory '${dest}' with directory '${src}'.`,
        );
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        throw new Error(
          `Cannot overwrite directory '${dest}' with non-directory '${src}'.`,
        );
      }
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return { srcStat, destStat };
  }
  async function checkParentPaths(src, srcStat, dest, funcName) {
    const srcParent = path$1.resolve(path$1.dirname(src));
    const destParent = path$1.resolve(path$1.dirname(dest));
    if (
      destParent === srcParent ||
      destParent === path$1.parse(destParent).root
    )
      return;
    let destStat;
    try {
      destStat = await fs2.stat(destParent, { bigint: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    if (areIdentical(srcStat, destStat)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return checkParentPaths(src, srcStat, destParent, funcName);
  }
  function checkParentPathsSync(src, srcStat, dest, funcName) {
    const srcParent = path$1.resolve(path$1.dirname(src));
    const destParent = path$1.resolve(path$1.dirname(dest));
    if (
      destParent === srcParent ||
      destParent === path$1.parse(destParent).root
    )
      return;
    let destStat;
    try {
      destStat = fs2.statSync(destParent, { bigint: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    if (areIdentical(srcStat, destStat)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return checkParentPathsSync(src, srcStat, destParent, funcName);
  }
  function areIdentical(srcStat, destStat) {
    return (
      destStat.ino !== void 0 &&
      destStat.dev !== void 0 &&
      destStat.ino === srcStat.ino &&
      destStat.dev === srcStat.dev
    );
  }
  function isSrcSubdir(src, dest) {
    const srcArr = path$1
      .resolve(src)
      .split(path$1.sep)
      .filter((i) => i);
    const destArr = path$1
      .resolve(dest)
      .split(path$1.sep)
      .filter((i) => i);
    return srcArr.every((cur, i) => destArr[i] === cur);
  }
  function errMsg(src, dest, funcName) {
    return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
  }
  stat = {
    // checkPaths
    checkPaths: u2(checkPaths),
    checkPathsSync,
    // checkParent
    checkParentPaths: u2(checkParentPaths),
    checkParentPathsSync,
    // Misc
    isSrcSubdir,
    areIdentical,
  };
  return stat;
}
var async;
var hasRequiredAsync;
function requireAsync() {
  if (hasRequiredAsync) return async;
  hasRequiredAsync = 1;
  async function asyncIteratorConcurrentProcess(iterator, fn) {
    const promises = [];
    for await (const item of iterator) {
      promises.push(
        fn(item).then(
          () => null,
          (err) => err ?? new Error('unknown error'),
        ),
      );
    }
    await Promise.all(
      promises.map((promise) =>
        promise.then((possibleErr) => {
          if (possibleErr !== null) throw possibleErr;
        }),
      ),
    );
  }
  async = {
    asyncIteratorConcurrentProcess,
  };
  return async;
}
var copy_1;
var hasRequiredCopy$1;
function requireCopy$1() {
  if (hasRequiredCopy$1) return copy_1;
  hasRequiredCopy$1 = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const { mkdirs: mkdirs2 } = /* @__PURE__ */ requireMkdirs();
  const { pathExists } = /* @__PURE__ */ requirePathExists();
  const { utimesMillis } = /* @__PURE__ */ requireUtimes();
  const stat2 = /* @__PURE__ */ requireStat();
  const { asyncIteratorConcurrentProcess } = /* @__PURE__ */ requireAsync();
  async function copy2(src, dest, opts = {}) {
    if (typeof opts === 'function') {
      opts = { filter: opts };
    }
    opts.clobber = 'clobber' in opts ? !!opts.clobber : true;
    opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === 'ia32') {
      process.emitWarning(
        'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269',
        'Warning',
        'fs-extra-WARN0001',
      );
    }
    const { srcStat, destStat } = await stat2.checkPaths(
      src,
      dest,
      'copy',
      opts,
    );
    await stat2.checkParentPaths(src, srcStat, dest, 'copy');
    const include = await runFilter(src, dest, opts);
    if (!include) return;
    const destParent = path$1.dirname(dest);
    const dirExists = await pathExists(destParent);
    if (!dirExists) {
      await mkdirs2(destParent);
    }
    await getStatsAndPerformCopy(destStat, src, dest, opts);
  }
  async function runFilter(src, dest, opts) {
    if (!opts.filter) return true;
    return opts.filter(src, dest);
  }
  async function getStatsAndPerformCopy(destStat, src, dest, opts) {
    const statFn = opts.dereference ? fs2.stat : fs2.lstat;
    const srcStat = await statFn(src);
    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
    if (
      srcStat.isFile() ||
      srcStat.isCharacterDevice() ||
      srcStat.isBlockDevice()
    )
      return onFile(srcStat, destStat, src, dest, opts);
    if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
    if (srcStat.isSocket())
      throw new Error(`Cannot copy a socket file: ${src}`);
    if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
    throw new Error(`Unknown file: ${src}`);
  }
  async function onFile(srcStat, destStat, src, dest, opts) {
    if (!destStat) return copyFile(srcStat, src, dest, opts);
    if (opts.overwrite) {
      await fs2.unlink(dest);
      return copyFile(srcStat, src, dest, opts);
    }
    if (opts.errorOnExist) {
      throw new Error(`'${dest}' already exists`);
    }
  }
  async function copyFile(srcStat, src, dest, opts) {
    await fs2.copyFile(src, dest);
    if (opts.preserveTimestamps) {
      if (fileIsNotWritable(srcStat.mode)) {
        await makeFileWritable(dest, srcStat.mode);
      }
      const updatedSrcStat = await fs2.stat(src);
      await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
    }
    return fs2.chmod(dest, srcStat.mode);
  }
  function fileIsNotWritable(srcMode) {
    return (srcMode & 128) === 0;
  }
  function makeFileWritable(dest, srcMode) {
    return fs2.chmod(dest, srcMode | 128);
  }
  async function onDir(srcStat, destStat, src, dest, opts) {
    if (!destStat) {
      await fs2.mkdir(dest);
    }
    await asyncIteratorConcurrentProcess(
      await fs2.opendir(src),
      async (item) => {
        const srcItem = path$1.join(src, item.name);
        const destItem = path$1.join(dest, item.name);
        const include = await runFilter(srcItem, destItem, opts);
        if (include) {
          const { destStat: destStat2 } = await stat2.checkPaths(
            srcItem,
            destItem,
            'copy',
            opts,
          );
          await getStatsAndPerformCopy(destStat2, srcItem, destItem, opts);
        }
      },
    );
    if (!destStat) {
      await fs2.chmod(dest, srcStat.mode);
    }
  }
  async function onLink(destStat, src, dest, opts) {
    let resolvedSrc = await fs2.readlink(src);
    if (opts.dereference) {
      resolvedSrc = path$1.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs2.symlink(resolvedSrc, dest);
    }
    let resolvedDest = null;
    try {
      resolvedDest = await fs2.readlink(dest);
    } catch (e) {
      if (e.code === 'EINVAL' || e.code === 'UNKNOWN')
        return fs2.symlink(resolvedSrc, dest);
      throw e;
    }
    if (opts.dereference) {
      resolvedDest = path$1.resolve(process.cwd(), resolvedDest);
    }
    if (resolvedSrc !== resolvedDest) {
      if (stat2.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(
          `Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`,
        );
      }
      if (stat2.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(
          `Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`,
        );
      }
    }
    await fs2.unlink(dest);
    return fs2.symlink(resolvedSrc, dest);
  }
  copy_1 = copy2;
  return copy_1;
}
var copySync_1;
var hasRequiredCopySync;
function requireCopySync() {
  if (hasRequiredCopySync) return copySync_1;
  hasRequiredCopySync = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const mkdirsSync = requireMkdirs().mkdirsSync;
  const utimesMillisSync = requireUtimes().utimesMillisSync;
  const stat2 = /* @__PURE__ */ requireStat();
  function copySync(src, dest, opts) {
    if (typeof opts === 'function') {
      opts = { filter: opts };
    }
    opts = opts || {};
    opts.clobber = 'clobber' in opts ? !!opts.clobber : true;
    opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === 'ia32') {
      process.emitWarning(
        'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269',
        'Warning',
        'fs-extra-WARN0002',
      );
    }
    const { srcStat, destStat } = stat2.checkPathsSync(src, dest, 'copy', opts);
    stat2.checkParentPathsSync(src, srcStat, dest, 'copy');
    if (opts.filter && !opts.filter(src, dest)) return;
    const destParent = path$1.dirname(dest);
    if (!fs2.existsSync(destParent)) mkdirsSync(destParent);
    return getStats(destStat, src, dest, opts);
  }
  function getStats(destStat, src, dest, opts) {
    const statSync = opts.dereference ? fs2.statSync : fs2.lstatSync;
    const srcStat = statSync(src);
    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
    else if (
      srcStat.isFile() ||
      srcStat.isCharacterDevice() ||
      srcStat.isBlockDevice()
    )
      return onFile(srcStat, destStat, src, dest, opts);
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
    else if (srcStat.isSocket())
      throw new Error(`Cannot copy a socket file: ${src}`);
    else if (srcStat.isFIFO())
      throw new Error(`Cannot copy a FIFO pipe: ${src}`);
    throw new Error(`Unknown file: ${src}`);
  }
  function onFile(srcStat, destStat, src, dest, opts) {
    if (!destStat) return copyFile(srcStat, src, dest, opts);
    return mayCopyFile(srcStat, src, dest, opts);
  }
  function mayCopyFile(srcStat, src, dest, opts) {
    if (opts.overwrite) {
      fs2.unlinkSync(dest);
      return copyFile(srcStat, src, dest, opts);
    } else if (opts.errorOnExist) {
      throw new Error(`'${dest}' already exists`);
    }
  }
  function copyFile(srcStat, src, dest, opts) {
    fs2.copyFileSync(src, dest);
    if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
    return setDestMode(dest, srcStat.mode);
  }
  function handleTimestamps(srcMode, src, dest) {
    if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
    return setDestTimestamps(src, dest);
  }
  function fileIsNotWritable(srcMode) {
    return (srcMode & 128) === 0;
  }
  function makeFileWritable(dest, srcMode) {
    return setDestMode(dest, srcMode | 128);
  }
  function setDestMode(dest, srcMode) {
    return fs2.chmodSync(dest, srcMode);
  }
  function setDestTimestamps(src, dest) {
    const updatedSrcStat = fs2.statSync(src);
    return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
  }
  function onDir(srcStat, destStat, src, dest, opts) {
    if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
    return copyDir(src, dest, opts);
  }
  function mkDirAndCopy(srcMode, src, dest, opts) {
    fs2.mkdirSync(dest);
    copyDir(src, dest, opts);
    return setDestMode(dest, srcMode);
  }
  function copyDir(src, dest, opts) {
    const dir = fs2.opendirSync(src);
    try {
      let dirent;
      while ((dirent = dir.readSync()) !== null) {
        copyDirItem(dirent.name, src, dest, opts);
      }
    } finally {
      dir.closeSync();
    }
  }
  function copyDirItem(item, src, dest, opts) {
    const srcItem = path$1.join(src, item);
    const destItem = path$1.join(dest, item);
    if (opts.filter && !opts.filter(srcItem, destItem)) return;
    const { destStat } = stat2.checkPathsSync(srcItem, destItem, 'copy', opts);
    return getStats(destStat, srcItem, destItem, opts);
  }
  function onLink(destStat, src, dest, opts) {
    let resolvedSrc = fs2.readlinkSync(src);
    if (opts.dereference) {
      resolvedSrc = path$1.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs2.symlinkSync(resolvedSrc, dest);
    } else {
      let resolvedDest;
      try {
        resolvedDest = fs2.readlinkSync(dest);
      } catch (err) {
        if (err.code === 'EINVAL' || err.code === 'UNKNOWN')
          return fs2.symlinkSync(resolvedSrc, dest);
        throw err;
      }
      if (opts.dereference) {
        resolvedDest = path$1.resolve(process.cwd(), resolvedDest);
      }
      if (resolvedSrc !== resolvedDest) {
        if (stat2.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(
            `Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`,
          );
        }
        if (stat2.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(
            `Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`,
          );
        }
      }
      return copyLink(resolvedSrc, dest);
    }
  }
  function copyLink(resolvedSrc, dest) {
    fs2.unlinkSync(dest);
    return fs2.symlinkSync(resolvedSrc, dest);
  }
  copySync_1 = copySync;
  return copySync_1;
}
var copy;
var hasRequiredCopy;
function requireCopy() {
  if (hasRequiredCopy) return copy;
  hasRequiredCopy = 1;
  const u2 = requireUniversalify().fromPromise;
  copy = {
    copy: u2(/* @__PURE__ */ requireCopy$1()),
    copySync: /* @__PURE__ */ requireCopySync(),
  };
  return copy;
}
var remove_1;
var hasRequiredRemove;
function requireRemove() {
  if (hasRequiredRemove) return remove_1;
  hasRequiredRemove = 1;
  const fs2 = requireGracefulFs();
  const u2 = requireUniversalify().fromCallback;
  function remove(path2, callback) {
    fs2.rm(path2, { recursive: true, force: true }, callback);
  }
  function removeSync(path2) {
    fs2.rmSync(path2, { recursive: true, force: true });
  }
  remove_1 = {
    remove: u2(remove),
    removeSync,
  };
  return remove_1;
}
var empty;
var hasRequiredEmpty;
function requireEmpty() {
  if (hasRequiredEmpty) return empty;
  hasRequiredEmpty = 1;
  const u2 = requireUniversalify().fromPromise;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const mkdir = /* @__PURE__ */ requireMkdirs();
  const remove = /* @__PURE__ */ requireRemove();
  const emptyDir = u2(async function emptyDir2(dir) {
    let items;
    try {
      items = await fs2.readdir(dir);
    } catch {
      return mkdir.mkdirs(dir);
    }
    return Promise.all(
      items.map((item) => remove.remove(path$1.join(dir, item))),
    );
  });
  function emptyDirSync(dir) {
    let items;
    try {
      items = fs2.readdirSync(dir);
    } catch {
      return mkdir.mkdirsSync(dir);
    }
    items.forEach((item) => {
      item = path$1.join(dir, item);
      remove.removeSync(item);
    });
  }
  empty = {
    emptyDirSync,
    emptydirSync: emptyDirSync,
    emptyDir,
    emptydir: emptyDir,
  };
  return empty;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const u2 = requireUniversalify().fromPromise;
  const path$1 = path;
  const fs2 = /* @__PURE__ */ requireFs();
  const mkdir = /* @__PURE__ */ requireMkdirs();
  async function createFile(file2) {
    let stats;
    try {
      stats = await fs2.stat(file2);
    } catch {}
    if (stats && stats.isFile()) return;
    const dir = path$1.dirname(file2);
    let dirStats = null;
    try {
      dirStats = await fs2.stat(dir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await mkdir.mkdirs(dir);
        await fs2.writeFile(file2, '');
        return;
      } else {
        throw err;
      }
    }
    if (dirStats.isDirectory()) {
      await fs2.writeFile(file2, '');
    } else {
      await fs2.readdir(dir);
    }
  }
  function createFileSync(file2) {
    let stats;
    try {
      stats = fs2.statSync(file2);
    } catch {}
    if (stats && stats.isFile()) return;
    const dir = path$1.dirname(file2);
    try {
      if (!fs2.statSync(dir).isDirectory()) {
        fs2.readdirSync(dir);
      }
    } catch (err) {
      if (err && err.code === 'ENOENT') mkdir.mkdirsSync(dir);
      else throw err;
    }
    fs2.writeFileSync(file2, '');
  }
  file = {
    createFile: u2(createFile),
    createFileSync,
  };
  return file;
}
var link;
var hasRequiredLink;
function requireLink() {
  if (hasRequiredLink) return link;
  hasRequiredLink = 1;
  const u2 = requireUniversalify().fromPromise;
  const path$1 = path;
  const fs2 = /* @__PURE__ */ requireFs();
  const mkdir = /* @__PURE__ */ requireMkdirs();
  const { pathExists } = /* @__PURE__ */ requirePathExists();
  const { areIdentical } = /* @__PURE__ */ requireStat();
  async function createLink(srcpath, dstpath) {
    let dstStat;
    try {
      dstStat = await fs2.lstat(dstpath);
    } catch {}
    let srcStat;
    try {
      srcStat = await fs2.lstat(srcpath);
    } catch (err) {
      err.message = err.message.replace('lstat', 'ensureLink');
      throw err;
    }
    if (dstStat && areIdentical(srcStat, dstStat)) return;
    const dir = path$1.dirname(dstpath);
    const dirExists = await pathExists(dir);
    if (!dirExists) {
      await mkdir.mkdirs(dir);
    }
    await fs2.link(srcpath, dstpath);
  }
  function createLinkSync(srcpath, dstpath) {
    let dstStat;
    try {
      dstStat = fs2.lstatSync(dstpath);
    } catch {}
    try {
      const srcStat = fs2.lstatSync(srcpath);
      if (dstStat && areIdentical(srcStat, dstStat)) return;
    } catch (err) {
      err.message = err.message.replace('lstat', 'ensureLink');
      throw err;
    }
    const dir = path$1.dirname(dstpath);
    const dirExists = fs2.existsSync(dir);
    if (dirExists) return fs2.linkSync(srcpath, dstpath);
    mkdir.mkdirsSync(dir);
    return fs2.linkSync(srcpath, dstpath);
  }
  link = {
    createLink: u2(createLink),
    createLinkSync,
  };
  return link;
}
var symlinkPaths_1;
var hasRequiredSymlinkPaths;
function requireSymlinkPaths() {
  if (hasRequiredSymlinkPaths) return symlinkPaths_1;
  hasRequiredSymlinkPaths = 1;
  const path$1 = path;
  const fs2 = /* @__PURE__ */ requireFs();
  const { pathExists } = /* @__PURE__ */ requirePathExists();
  const u2 = requireUniversalify().fromPromise;
  async function symlinkPaths(srcpath, dstpath) {
    if (path$1.isAbsolute(srcpath)) {
      try {
        await fs2.lstat(srcpath);
      } catch (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink');
        throw err;
      }
      return {
        toCwd: srcpath,
        toDst: srcpath,
      };
    }
    const dstdir = path$1.dirname(dstpath);
    const relativeToDst = path$1.join(dstdir, srcpath);
    const exists = await pathExists(relativeToDst);
    if (exists) {
      return {
        toCwd: relativeToDst,
        toDst: srcpath,
      };
    }
    try {
      await fs2.lstat(srcpath);
    } catch (err) {
      err.message = err.message.replace('lstat', 'ensureSymlink');
      throw err;
    }
    return {
      toCwd: srcpath,
      toDst: path$1.relative(dstdir, srcpath),
    };
  }
  function symlinkPathsSync(srcpath, dstpath) {
    if (path$1.isAbsolute(srcpath)) {
      const exists2 = fs2.existsSync(srcpath);
      if (!exists2) throw new Error('absolute srcpath does not exist');
      return {
        toCwd: srcpath,
        toDst: srcpath,
      };
    }
    const dstdir = path$1.dirname(dstpath);
    const relativeToDst = path$1.join(dstdir, srcpath);
    const exists = fs2.existsSync(relativeToDst);
    if (exists) {
      return {
        toCwd: relativeToDst,
        toDst: srcpath,
      };
    }
    const srcExists = fs2.existsSync(srcpath);
    if (!srcExists) throw new Error('relative srcpath does not exist');
    return {
      toCwd: srcpath,
      toDst: path$1.relative(dstdir, srcpath),
    };
  }
  symlinkPaths_1 = {
    symlinkPaths: u2(symlinkPaths),
    symlinkPathsSync,
  };
  return symlinkPaths_1;
}
var symlinkType_1;
var hasRequiredSymlinkType;
function requireSymlinkType() {
  if (hasRequiredSymlinkType) return symlinkType_1;
  hasRequiredSymlinkType = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const u2 = requireUniversalify().fromPromise;
  async function symlinkType(srcpath, type) {
    if (type) return type;
    let stats;
    try {
      stats = await fs2.lstat(srcpath);
    } catch {
      return 'file';
    }
    return stats && stats.isDirectory() ? 'dir' : 'file';
  }
  function symlinkTypeSync(srcpath, type) {
    if (type) return type;
    let stats;
    try {
      stats = fs2.lstatSync(srcpath);
    } catch {
      return 'file';
    }
    return stats && stats.isDirectory() ? 'dir' : 'file';
  }
  symlinkType_1 = {
    symlinkType: u2(symlinkType),
    symlinkTypeSync,
  };
  return symlinkType_1;
}
var symlink;
var hasRequiredSymlink;
function requireSymlink() {
  if (hasRequiredSymlink) return symlink;
  hasRequiredSymlink = 1;
  const u2 = requireUniversalify().fromPromise;
  const path$1 = path;
  const fs2 = /* @__PURE__ */ requireFs();
  const { mkdirs: mkdirs2, mkdirsSync } = /* @__PURE__ */ requireMkdirs();
  const { symlinkPaths, symlinkPathsSync } =
    /* @__PURE__ */ requireSymlinkPaths();
  const { symlinkType, symlinkTypeSync } = /* @__PURE__ */ requireSymlinkType();
  const { pathExists } = /* @__PURE__ */ requirePathExists();
  const { areIdentical } = /* @__PURE__ */ requireStat();
  async function createSymlink(srcpath, dstpath, type) {
    let stats;
    try {
      stats = await fs2.lstat(dstpath);
    } catch {}
    if (stats && stats.isSymbolicLink()) {
      const [srcStat, dstStat] = await Promise.all([
        fs2.stat(srcpath),
        fs2.stat(dstpath),
      ]);
      if (areIdentical(srcStat, dstStat)) return;
    }
    const relative = await symlinkPaths(srcpath, dstpath);
    srcpath = relative.toDst;
    const toType = await symlinkType(relative.toCwd, type);
    const dir = path$1.dirname(dstpath);
    if (!(await pathExists(dir))) {
      await mkdirs2(dir);
    }
    return fs2.symlink(srcpath, dstpath, toType);
  }
  function createSymlinkSync(srcpath, dstpath, type) {
    let stats;
    try {
      stats = fs2.lstatSync(dstpath);
    } catch {}
    if (stats && stats.isSymbolicLink()) {
      const srcStat = fs2.statSync(srcpath);
      const dstStat = fs2.statSync(dstpath);
      if (areIdentical(srcStat, dstStat)) return;
    }
    const relative = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative.toDst;
    type = symlinkTypeSync(relative.toCwd, type);
    const dir = path$1.dirname(dstpath);
    const exists = fs2.existsSync(dir);
    if (exists) return fs2.symlinkSync(srcpath, dstpath, type);
    mkdirsSync(dir);
    return fs2.symlinkSync(srcpath, dstpath, type);
  }
  symlink = {
    createSymlink: u2(createSymlink),
    createSymlinkSync,
  };
  return symlink;
}
var ensure;
var hasRequiredEnsure;
function requireEnsure() {
  if (hasRequiredEnsure) return ensure;
  hasRequiredEnsure = 1;
  const { createFile, createFileSync } = /* @__PURE__ */ requireFile();
  const { createLink, createLinkSync } = /* @__PURE__ */ requireLink();
  const { createSymlink, createSymlinkSync } = /* @__PURE__ */ requireSymlink();
  ensure = {
    // file
    createFile,
    createFileSync,
    ensureFile: createFile,
    ensureFileSync: createFileSync,
    // link
    createLink,
    createLinkSync,
    ensureLink: createLink,
    ensureLinkSync: createLinkSync,
    // symlink
    createSymlink,
    createSymlinkSync,
    ensureSymlink: createSymlink,
    ensureSymlinkSync: createSymlinkSync,
  };
  return ensure;
}
var utils;
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  function stringify2(
    obj,
    { EOL = '\n', finalEOL = true, replacer = null, spaces } = {},
  ) {
    const EOF = finalEOL ? EOL : '';
    const str = JSON.stringify(obj, replacer, spaces);
    return str.replace(/\n/g, EOL) + EOF;
  }
  function stripBom(content) {
    if (Buffer.isBuffer(content)) content = content.toString('utf8');
    return content.replace(/^\uFEFF/, '');
  }
  utils = { stringify: stringify2, stripBom };
  return utils;
}
var jsonfile$1;
var hasRequiredJsonfile$1;
function requireJsonfile$1() {
  if (hasRequiredJsonfile$1) return jsonfile$1;
  hasRequiredJsonfile$1 = 1;
  let _fs;
  try {
    _fs = requireGracefulFs();
  } catch (_) {
    _fs = fs$2;
  }
  const universalify2 = requireUniversalify();
  const { stringify: stringify2, stripBom } = requireUtils();
  async function _readFile(file2, options = {}) {
    if (typeof options === 'string') {
      options = { encoding: options };
    }
    const fs2 = options.fs || _fs;
    const shouldThrow = 'throws' in options ? options.throws : true;
    let data = await universalify2.fromCallback(fs2.readFile)(file2, options);
    data = stripBom(data);
    let obj;
    try {
      obj = JSON.parse(data, options ? options.reviver : null);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file2}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
    return obj;
  }
  const readFile = universalify2.fromPromise(_readFile);
  function readFileSync(file2, options = {}) {
    if (typeof options === 'string') {
      options = { encoding: options };
    }
    const fs2 = options.fs || _fs;
    const shouldThrow = 'throws' in options ? options.throws : true;
    try {
      let content = fs2.readFileSync(file2, options);
      content = stripBom(content);
      return JSON.parse(content, options.reviver);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file2}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
  }
  async function _writeFile(file2, obj, options = {}) {
    const fs2 = options.fs || _fs;
    const str = stringify2(obj, options);
    await universalify2.fromCallback(fs2.writeFile)(file2, str, options);
  }
  const writeFile = universalify2.fromPromise(_writeFile);
  function writeFileSync(file2, obj, options = {}) {
    const fs2 = options.fs || _fs;
    const str = stringify2(obj, options);
    return fs2.writeFileSync(file2, str, options);
  }
  jsonfile$1 = {
    readFile,
    readFileSync,
    writeFile,
    writeFileSync,
  };
  return jsonfile$1;
}
var jsonfile;
var hasRequiredJsonfile;
function requireJsonfile() {
  if (hasRequiredJsonfile) return jsonfile;
  hasRequiredJsonfile = 1;
  const jsonFile = requireJsonfile$1();
  jsonfile = {
    // jsonfile exports
    readJson: jsonFile.readFile,
    readJsonSync: jsonFile.readFileSync,
    writeJson: jsonFile.writeFile,
    writeJsonSync: jsonFile.writeFileSync,
  };
  return jsonfile;
}
var outputFile_1;
var hasRequiredOutputFile;
function requireOutputFile() {
  if (hasRequiredOutputFile) return outputFile_1;
  hasRequiredOutputFile = 1;
  const u2 = requireUniversalify().fromPromise;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const mkdir = /* @__PURE__ */ requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  async function outputFile(file2, data, encoding = 'utf-8') {
    const dir = path$1.dirname(file2);
    if (!(await pathExists(dir))) {
      await mkdir.mkdirs(dir);
    }
    return fs2.writeFile(file2, data, encoding);
  }
  function outputFileSync(file2, ...args) {
    const dir = path$1.dirname(file2);
    if (!fs2.existsSync(dir)) {
      mkdir.mkdirsSync(dir);
    }
    fs2.writeFileSync(file2, ...args);
  }
  outputFile_1 = {
    outputFile: u2(outputFile),
    outputFileSync,
  };
  return outputFile_1;
}
var outputJson_1;
var hasRequiredOutputJson;
function requireOutputJson() {
  if (hasRequiredOutputJson) return outputJson_1;
  hasRequiredOutputJson = 1;
  const { stringify: stringify2 } = requireUtils();
  const { outputFile } = /* @__PURE__ */ requireOutputFile();
  async function outputJson(file2, data, options = {}) {
    const str = stringify2(data, options);
    await outputFile(file2, str, options);
  }
  outputJson_1 = outputJson;
  return outputJson_1;
}
var outputJsonSync_1;
var hasRequiredOutputJsonSync;
function requireOutputJsonSync() {
  if (hasRequiredOutputJsonSync) return outputJsonSync_1;
  hasRequiredOutputJsonSync = 1;
  const { stringify: stringify2 } = requireUtils();
  const { outputFileSync } = /* @__PURE__ */ requireOutputFile();
  function outputJsonSync(file2, data, options) {
    const str = stringify2(data, options);
    outputFileSync(file2, str, options);
  }
  outputJsonSync_1 = outputJsonSync;
  return outputJsonSync_1;
}
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  const u2 = requireUniversalify().fromPromise;
  const jsonFile = /* @__PURE__ */ requireJsonfile();
  jsonFile.outputJson = u2(/* @__PURE__ */ requireOutputJson());
  jsonFile.outputJsonSync = /* @__PURE__ */ requireOutputJsonSync();
  jsonFile.outputJSON = jsonFile.outputJson;
  jsonFile.outputJSONSync = jsonFile.outputJsonSync;
  jsonFile.writeJSON = jsonFile.writeJson;
  jsonFile.writeJSONSync = jsonFile.writeJsonSync;
  jsonFile.readJSON = jsonFile.readJson;
  jsonFile.readJSONSync = jsonFile.readJsonSync;
  json = jsonFile;
  return json;
}
var move_1;
var hasRequiredMove$1;
function requireMove$1() {
  if (hasRequiredMove$1) return move_1;
  hasRequiredMove$1 = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const { copy: copy2 } = /* @__PURE__ */ requireCopy();
  const { remove } = /* @__PURE__ */ requireRemove();
  const { mkdirp } = /* @__PURE__ */ requireMkdirs();
  const { pathExists } = /* @__PURE__ */ requirePathExists();
  const stat2 = /* @__PURE__ */ requireStat();
  async function move2(src, dest, opts = {}) {
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat, isChangingCase = false } = await stat2.checkPaths(
      src,
      dest,
      'move',
      opts,
    );
    await stat2.checkParentPaths(src, srcStat, dest, 'move');
    const destParent = path$1.dirname(dest);
    const parsedParentPath = path$1.parse(destParent);
    if (parsedParentPath.root !== destParent) {
      await mkdirp(destParent);
    }
    return doRename(src, dest, overwrite, isChangingCase);
  }
  async function doRename(src, dest, overwrite, isChangingCase) {
    if (!isChangingCase) {
      if (overwrite) {
        await remove(dest);
      } else if (await pathExists(dest)) {
        throw new Error('dest already exists.');
      }
    }
    try {
      await fs2.rename(src, dest);
    } catch (err) {
      if (err.code !== 'EXDEV') {
        throw err;
      }
      await moveAcrossDevice(src, dest, overwrite);
    }
  }
  async function moveAcrossDevice(src, dest, overwrite) {
    const opts = {
      overwrite,
      errorOnExist: true,
      preserveTimestamps: true,
    };
    await copy2(src, dest, opts);
    return remove(src);
  }
  move_1 = move2;
  return move_1;
}
var moveSync_1;
var hasRequiredMoveSync;
function requireMoveSync() {
  if (hasRequiredMoveSync) return moveSync_1;
  hasRequiredMoveSync = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const copySync = requireCopy().copySync;
  const removeSync = requireRemove().removeSync;
  const mkdirpSync = requireMkdirs().mkdirpSync;
  const stat2 = /* @__PURE__ */ requireStat();
  function moveSync(src, dest, opts) {
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat, isChangingCase = false } = stat2.checkPathsSync(
      src,
      dest,
      'move',
      opts,
    );
    stat2.checkParentPathsSync(src, srcStat, dest, 'move');
    if (!isParentRoot(dest)) mkdirpSync(path$1.dirname(dest));
    return doRename(src, dest, overwrite, isChangingCase);
  }
  function isParentRoot(dest) {
    const parent = path$1.dirname(dest);
    const parsedPath = path$1.parse(parent);
    return parsedPath.root === parent;
  }
  function doRename(src, dest, overwrite, isChangingCase) {
    if (isChangingCase) return rename(src, dest, overwrite);
    if (overwrite) {
      removeSync(dest);
      return rename(src, dest, overwrite);
    }
    if (fs2.existsSync(dest)) throw new Error('dest already exists.');
    return rename(src, dest, overwrite);
  }
  function rename(src, dest, overwrite) {
    try {
      fs2.renameSync(src, dest);
    } catch (err) {
      if (err.code !== 'EXDEV') throw err;
      return moveAcrossDevice(src, dest, overwrite);
    }
  }
  function moveAcrossDevice(src, dest, overwrite) {
    const opts = {
      overwrite,
      errorOnExist: true,
      preserveTimestamps: true,
    };
    copySync(src, dest, opts);
    return removeSync(src);
  }
  moveSync_1 = moveSync;
  return moveSync_1;
}
var move;
var hasRequiredMove;
function requireMove() {
  if (hasRequiredMove) return move;
  hasRequiredMove = 1;
  const u2 = requireUniversalify().fromPromise;
  move = {
    move: u2(/* @__PURE__ */ requireMove$1()),
    moveSync: /* @__PURE__ */ requireMoveSync(),
  };
  return move;
}
var lib;
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib;
  hasRequiredLib = 1;
  lib = {
    // Export promiseified graceful-fs:
    .../* @__PURE__ */ requireFs(),
    // Export extra methods:
    .../* @__PURE__ */ requireCopy(),
    .../* @__PURE__ */ requireEmpty(),
    .../* @__PURE__ */ requireEnsure(),
    .../* @__PURE__ */ requireJson(),
    .../* @__PURE__ */ requireMkdirs(),
    .../* @__PURE__ */ requireMove(),
    .../* @__PURE__ */ requireOutputFile(),
    .../* @__PURE__ */ requirePathExists(),
    .../* @__PURE__ */ requireRemove(),
  };
  return lib;
}
var libExports = /* @__PURE__ */ requireLib();
const fs = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
var dist = {};
var composer = {};
var directives = {};
var identity = {};
var hasRequiredIdentity;
function requireIdentity() {
  if (hasRequiredIdentity) return identity;
  hasRequiredIdentity = 1;
  const ALIAS = /* @__PURE__ */ Symbol.for('yaml.alias');
  const DOC = /* @__PURE__ */ Symbol.for('yaml.document');
  const MAP = /* @__PURE__ */ Symbol.for('yaml.map');
  const PAIR = /* @__PURE__ */ Symbol.for('yaml.pair');
  const SCALAR = /* @__PURE__ */ Symbol.for('yaml.scalar');
  const SEQ = /* @__PURE__ */ Symbol.for('yaml.seq');
  const NODE_TYPE = /* @__PURE__ */ Symbol.for('yaml.node.type');
  const isAlias = (node) =>
    !!node && typeof node === 'object' && node[NODE_TYPE] === ALIAS;
  const isDocument = (node) =>
    !!node && typeof node === 'object' && node[NODE_TYPE] === DOC;
  const isMap = (node) =>
    !!node && typeof node === 'object' && node[NODE_TYPE] === MAP;
  const isPair = (node) =>
    !!node && typeof node === 'object' && node[NODE_TYPE] === PAIR;
  const isScalar = (node) =>
    !!node && typeof node === 'object' && node[NODE_TYPE] === SCALAR;
  const isSeq = (node) =>
    !!node && typeof node === 'object' && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === 'object')
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === 'object')
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  const hasAnchor = (node) =>
    (isScalar(node) || isCollection(node)) && !!node.anchor;
  identity.ALIAS = ALIAS;
  identity.DOC = DOC;
  identity.MAP = MAP;
  identity.NODE_TYPE = NODE_TYPE;
  identity.PAIR = PAIR;
  identity.SCALAR = SCALAR;
  identity.SEQ = SEQ;
  identity.hasAnchor = hasAnchor;
  identity.isAlias = isAlias;
  identity.isCollection = isCollection;
  identity.isDocument = isDocument;
  identity.isMap = isMap;
  identity.isNode = isNode;
  identity.isPair = isPair;
  identity.isScalar = isScalar;
  identity.isSeq = isSeq;
  return identity;
}
var visit = {};
var hasRequiredVisit;
function requireVisit() {
  if (hasRequiredVisit) return visit;
  hasRequiredVisit = 1;
  var identity2 = requireIdentity();
  const BREAK = /* @__PURE__ */ Symbol('break visit');
  const SKIP = /* @__PURE__ */ Symbol('skip children');
  const REMOVE = /* @__PURE__ */ Symbol('remove node');
  function visit$1(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity2.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE) node.contents = null;
    } else visit_(null, node, visitor_, Object.freeze([]));
  }
  visit$1.BREAK = BREAK;
  visit$1.SKIP = SKIP;
  visit$1.REMOVE = REMOVE;
  function visit_(key, node, visitor, path2) {
    const ctrl = callVisitor(key, node, visitor, path2);
    if (identity2.isNode(ctrl) || identity2.isPair(ctrl)) {
      replaceNode(key, path2, ctrl);
      return visit_(key, ctrl, visitor, path2);
    }
    if (typeof ctrl !== 'symbol') {
      if (identity2.isCollection(node)) {
        path2 = Object.freeze(path2.concat(node));
        for (let i = 0; i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path2);
          if (typeof ci === 'number') i = ci - 1;
          else if (ci === BREAK) return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity2.isPair(node)) {
        path2 = Object.freeze(path2.concat(node));
        const ck = visit_('key', node.key, visitor, path2);
        if (ck === BREAK) return BREAK;
        else if (ck === REMOVE) node.key = null;
        const cv = visit_('value', node.value, visitor, path2);
        if (cv === BREAK) return BREAK;
        else if (cv === REMOVE) node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity2.isDocument(node)) {
      const cd = await visitAsync_(
        null,
        node.contents,
        visitor_,
        Object.freeze([node]),
      );
      if (cd === REMOVE) node.contents = null;
    } else await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path2) {
    const ctrl = await callVisitor(key, node, visitor, path2);
    if (identity2.isNode(ctrl) || identity2.isPair(ctrl)) {
      replaceNode(key, path2, ctrl);
      return visitAsync_(key, ctrl, visitor, path2);
    }
    if (typeof ctrl !== 'symbol') {
      if (identity2.isCollection(node)) {
        path2 = Object.freeze(path2.concat(node));
        for (let i = 0; i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path2);
          if (typeof ci === 'number') i = ci - 1;
          else if (ci === BREAK) return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity2.isPair(node)) {
        path2 = Object.freeze(path2.concat(node));
        const ck = await visitAsync_('key', node.key, visitor, path2);
        if (ck === BREAK) return BREAK;
        else if (ck === REMOVE) node.key = null;
        const cv = await visitAsync_('value', node.value, visitor, path2);
        if (cv === BREAK) return BREAK;
        else if (cv === REMOVE) node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (
      typeof visitor === 'object' &&
      (visitor.Collection || visitor.Node || visitor.Value)
    ) {
      return Object.assign(
        {
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node,
        },
        visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value,
        },
        visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection,
        },
        visitor,
      );
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path2) {
    if (typeof visitor === 'function') return visitor(key, node, path2);
    if (identity2.isMap(node)) return visitor.Map?.(key, node, path2);
    if (identity2.isSeq(node)) return visitor.Seq?.(key, node, path2);
    if (identity2.isPair(node)) return visitor.Pair?.(key, node, path2);
    if (identity2.isScalar(node)) return visitor.Scalar?.(key, node, path2);
    if (identity2.isAlias(node)) return visitor.Alias?.(key, node, path2);
    return void 0;
  }
  function replaceNode(key, path2, node) {
    const parent = path2[path2.length - 1];
    if (identity2.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity2.isPair(parent)) {
      if (key === 'key') parent.key = node;
      else parent.value = node;
    } else if (identity2.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity2.isAlias(parent) ? 'alias' : 'scalar';
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  visit.visit = visit$1;
  visit.visitAsync = visitAsync;
  return visit;
}
var hasRequiredDirectives;
function requireDirectives() {
  if (hasRequiredDirectives) return directives;
  hasRequiredDirectives = 1;
  var identity2 = requireIdentity();
  var visit2 = requireVisit();
  const escapeChars = {
    '!': '%21',
    ',': '%2C',
    '[': '%5B',
    ']': '%5D',
    '{': '%7B',
    '}': '%7D',
  };
  const escapeTagName = (tn) =>
    tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
  class Directives {
    constructor(yaml, tags2) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags2);
    }
    clone() {
      const copy2 = new Directives(this.yaml, this.tags);
      copy2.docStart = this.docStart;
      return copy2;
    }
    /**
     * During parsing, get a Directives instance for the current document and
     * update the stream state according to the current version's spec.
     */
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case '1.1':
          this.atNextDocument = true;
          break;
        case '1.2':
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: '1.2',
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    /**
     * @param onError - May be called even if the action was successful
     * @returns `true` on success
     */
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = {
          explicit: Directives.defaultYaml.explicit,
          version: '1.1',
        };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case '%TAG': {
          if (parts.length !== 2) {
            onError(0, '%TAG directive should contain exactly two parts');
            if (parts.length < 2) return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case '%YAML': {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, '%YAML directive should contain exactly one part');
            return false;
          }
          const [version] = parts;
          if (version === '1.1' || version === '1.2') {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    /**
     * Resolves a tag, matching handles to those defined in %TAG directives.
     *
     * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
     *   `'!local'` tag, or `null` if unresolvable.
     */
    tagName(source, onError) {
      if (source === '!') return '!';
      if (source[0] !== '!') {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === '<') {
        const verbatim = source.slice(2, -1);
        if (verbatim === '!' || verbatim === '!!') {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== '>')
          onError('Verbatim tags must end with a >');
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix) onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === '!') return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    /**
     * Given a fully resolved tag, returns its printable string form,
     * taking into account current tag prefixes and defaults.
     */
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === '!' ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit
        ? [`%YAML ${this.yaml.version || '1.2'}`]
        : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity2.isNode(doc.contents)) {
        const tags2 = {};
        visit2.visit(doc.contents, (_key, node) => {
          if (identity2.isNode(node) && node.tag) tags2[node.tag] = true;
        });
        tagNames = Object.keys(tags2);
      } else tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === '!!' && prefix === 'tag:yaml.org,2002:') continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join('\n');
    }
  }
  Directives.defaultYaml = { explicit: false, version: '1.2' };
  Directives.defaultTags = { '!!': 'tag:yaml.org,2002:' };
  directives.Directives = Directives;
  return directives;
}
var Document = {};
var Alias = {};
var anchors = {};
var hasRequiredAnchors;
function requireAnchors() {
  if (hasRequiredAnchors) return anchors;
  hasRequiredAnchors = 1;
  var identity2 = requireIdentity();
  var visit2 = requireVisit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors2 = /* @__PURE__ */ new Set();
    visit2.visit(root, {
      Value(_key, node) {
        if (node.anchor) anchors2.add(node.anchor);
      },
    });
    return anchors2;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1; true; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name)) return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = /* @__PURE__ */ new Map();
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      /**
       * With circular references, the source node is only resolved after all
       * of its child nodes are. This is why anchors are set only after all of
       * the nodes have been created.
       */
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (
            typeof ref === 'object' &&
            ref.anchor &&
            (identity2.isScalar(ref.node) || identity2.isCollection(ref.node))
          ) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error(
              'Failed to resolve repeated object (this should not happen)',
            );
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects,
    };
  }
  anchors.anchorIsValid = anchorIsValid;
  anchors.anchorNames = anchorNames;
  anchors.createNodeAnchors = createNodeAnchors;
  anchors.findNewAnchor = findNewAnchor;
  return anchors;
}
var Node = {};
var applyReviver = {};
var hasRequiredApplyReviver;
function requireApplyReviver() {
  if (hasRequiredApplyReviver) return applyReviver;
  hasRequiredApplyReviver = 1;
  function applyReviver$1(reviver, obj, key, val) {
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length; i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver$1(reviver, val, String(i), v0);
          if (v1 === void 0) delete val[i];
          else if (v1 !== v0) val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver$1(reviver, val, k, v0);
          if (v1 === void 0) val.delete(k);
          else if (v1 !== v0) val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver$1(reviver, val, v0, v0);
          if (v1 === void 0) val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver$1(reviver, val, k, v0);
          if (v1 === void 0) delete val[k];
          else if (v1 !== v0) val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  applyReviver.applyReviver = applyReviver$1;
  return applyReviver;
}
var toJS = {};
var hasRequiredToJS;
function requireToJS() {
  if (hasRequiredToJS) return toJS;
  hasRequiredToJS = 1;
  var identity2 = requireIdentity();
  function toJS$1(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS$1(v, String(i), ctx));
    if (value && typeof value.toJSON === 'function') {
      if (!ctx || !identity2.hasAnchor(value)) return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: void 0 };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res2) => {
        data.res = res2;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate) ctx.onCreate(res);
      return res;
    }
    if (typeof value === 'bigint' && !ctx?.keep) return Number(value);
    return value;
  }
  toJS.toJS = toJS$1;
  return toJS;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return Node;
  hasRequiredNode = 1;
  var applyReviver2 = requireApplyReviver();
  var identity2 = requireIdentity();
  var toJS2 = requireToJS();
  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity2.NODE_TYPE, { value: type });
    }
    /** Create a copy of this node.  */
    clone() {
      const copy2 = Object.create(
        Object.getPrototypeOf(this),
        Object.getOwnPropertyDescriptors(this),
      );
      if (this.range) copy2.range = this.range.slice();
      return copy2;
    }
    /** A plain JavaScript representation of this node. */
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity2.isDocument(doc))
        throw new TypeError('A document argument is required');
      const ctx = {
        anchors: /* @__PURE__ */ new Map(),
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === 'number' ? maxAliasCount : 100,
      };
      const res = toJS2.toJS(this, '', ctx);
      if (typeof onAnchor === 'function')
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === 'function'
        ? applyReviver2.applyReviver(reviver, { '': res }, '', res)
        : res;
    }
  }
  Node.NodeBase = NodeBase;
  return Node;
}
var hasRequiredAlias;
function requireAlias() {
  if (hasRequiredAlias) return Alias;
  hasRequiredAlias = 1;
  var anchors2 = requireAnchors();
  var visit2 = requireVisit();
  var identity2 = requireIdentity();
  var Node2 = requireNode();
  var toJS2 = requireToJS();
  let Alias$1 = class Alias extends Node2.NodeBase {
    constructor(source) {
      super(identity2.ALIAS);
      this.source = source;
      Object.defineProperty(this, 'tag', {
        set() {
          throw new Error('Alias nodes cannot have tags');
        },
      });
    }
    /**
     * Resolve the value of this alias within `doc`, finding the last
     * instance of the `source` anchor before this node.
     */
    resolve(doc, ctx) {
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit2.visit(doc, {
          Node: (_key, node) => {
            if (identity2.isAlias(node) || identity2.hasAnchor(node))
              nodes.push(node);
          },
        });
        if (ctx) ctx.aliasResolveCache = nodes;
      }
      let found = void 0;
      for (const node of nodes) {
        if (node === this) break;
        if (node.anchor === this.source) found = node;
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx) return { source: this.source };
      const { anchors: anchors3, doc, maxAliasCount } = ctx;
      const source = this.resolve(doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      let data = anchors3.get(source);
      if (!data) {
        toJS2.toJS(source, null, ctx);
        data = anchors3.get(source);
      }
      if (data?.res === void 0) {
        const msg = 'This should not happen: Alias anchor was not resolved?';
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc, source, anchors3);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg =
            'Excessive alias count indicates a resource exhaustion attack';
          throw new ReferenceError(msg);
        }
      }
      return data.res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors2.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey) return `${src} `;
      }
      return src;
    }
  };
  function getAliasCount(doc, node, anchors3) {
    if (identity2.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors3 && source && anchors3.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity2.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors3);
        if (c > count) count = c;
      }
      return count;
    } else if (identity2.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors3);
      const vc = getAliasCount(doc, node.value, anchors3);
      return Math.max(kc, vc);
    }
    return 1;
  }
  Alias.Alias = Alias$1;
  return Alias;
}
var Collection = {};
var createNode$1 = {};
var Scalar = {};
var hasRequiredScalar;
function requireScalar() {
  if (hasRequiredScalar) return Scalar;
  hasRequiredScalar = 1;
  var identity2 = requireIdentity();
  var Node2 = requireNode();
  var toJS2 = requireToJS();
  const isScalarValue = (value) =>
    !value || (typeof value !== 'function' && typeof value !== 'object');
  let Scalar$1 = class Scalar extends Node2.NodeBase {
    constructor(value) {
      super(identity2.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS2.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  };
  Scalar$1.BLOCK_FOLDED = 'BLOCK_FOLDED';
  Scalar$1.BLOCK_LITERAL = 'BLOCK_LITERAL';
  Scalar$1.PLAIN = 'PLAIN';
  Scalar$1.QUOTE_DOUBLE = 'QUOTE_DOUBLE';
  Scalar$1.QUOTE_SINGLE = 'QUOTE_SINGLE';
  Scalar.Scalar = Scalar$1;
  Scalar.isScalarValue = isScalarValue;
  return Scalar;
}
var hasRequiredCreateNode;
function requireCreateNode() {
  if (hasRequiredCreateNode) return createNode$1;
  hasRequiredCreateNode = 1;
  var Alias2 = requireAlias();
  var identity2 = requireIdentity();
  var Scalar2 = requireScalar();
  const defaultTagPrefix = 'tag:yaml.org,2002:';
  function findTagObject(value, tagName, tags2) {
    if (tagName) {
      const match = tags2.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj) throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags2.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode2(value, tagName, ctx) {
    if (identity2.isDocument(value)) value = value.contents;
    if (identity2.isNode(value)) return value;
    if (identity2.isPair(value)) {
      const map2 = ctx.schema[identity2.MAP].createNode?.(
        ctx.schema,
        null,
        ctx,
      );
      map2.items.push(value);
      return map2;
    }
    if (
      value instanceof String ||
      value instanceof Number ||
      value instanceof Boolean ||
      (typeof BigInt !== 'undefined' && value instanceof BigInt)
    ) {
      value = value.valueOf();
    }
    const {
      aliasDuplicateObjects,
      onAnchor,
      onTagObj,
      schema: schema2,
      sourceObjects,
    } = ctx;
    let ref = void 0;
    if (aliasDuplicateObjects && value && typeof value === 'object') {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias2.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith('!!'))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema2.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === 'function') {
        value = value.toJSON();
      }
      if (!value || typeof value !== 'object') {
        const node2 = new Scalar2.Scalar(value);
        if (ref) ref.node = node2;
        return node2;
      }
      tagObj =
        value instanceof Map
          ? schema2[identity2.MAP]
          : Symbol.iterator in Object(value)
            ? schema2[identity2.SEQ]
            : schema2[identity2.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode
      ? tagObj.createNode(ctx.schema, value, ctx)
      : typeof tagObj?.nodeClass?.from === 'function'
        ? tagObj.nodeClass.from(ctx.schema, value, ctx)
        : new Scalar2.Scalar(value);
    if (tagName) node.tag = tagName;
    else if (!tagObj.default) node.tag = tagObj.tag;
    if (ref) ref.node = node;
    return node;
  }
  createNode$1.createNode = createNode2;
  return createNode$1;
}
var hasRequiredCollection;
function requireCollection() {
  if (hasRequiredCollection) return Collection;
  hasRequiredCollection = 1;
  var createNode2 = requireCreateNode();
  var identity2 = requireIdentity();
  var Node2 = requireNode();
  function collectionFromPath(schema2, path2, value) {
    let v = value;
    for (let i = path2.length - 1; i >= 0; --i) {
      const k = path2[i];
      if (typeof k === 'number' && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = /* @__PURE__ */ new Map([[k, v]]);
      }
    }
    return createNode2.createNode(v, void 0, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error('This should not happen, please report a bug.');
      },
      schema: schema2,
      sourceObjects: /* @__PURE__ */ new Map(),
    });
  }
  const isEmptyPath = (path2) =>
    path2 == null ||
    (typeof path2 === 'object' && !!path2[Symbol.iterator]().next().done);
  let Collection$1 = class Collection extends Node2.NodeBase {
    constructor(type, schema2) {
      super(type);
      Object.defineProperty(this, 'schema', {
        value: schema2,
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }
    /**
     * Create a copy of this collection.
     *
     * @param schema - If defined, overwrites the original's schema
     */
    clone(schema2) {
      const copy2 = Object.create(
        Object.getPrototypeOf(this),
        Object.getOwnPropertyDescriptors(this),
      );
      if (schema2) copy2.schema = schema2;
      copy2.items = copy2.items.map((it) =>
        identity2.isNode(it) || identity2.isPair(it) ? it.clone(schema2) : it,
      );
      if (this.range) copy2.range = this.range.slice();
      return copy2;
    }
    /**
     * Adds a value to the collection. For `!!map` and `!!omap` the value must
     * be a Pair instance or a `{ key, value }` object, which may not have a key
     * that already exists in the map.
     */
    addIn(path2, value) {
      if (isEmptyPath(path2)) this.add(value);
      else {
        const [key, ...rest] = path2;
        const node = this.get(key, true);
        if (identity2.isCollection(node)) node.addIn(rest, value);
        else if (node === void 0 && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(
            `Expected YAML collection at ${key}. Remaining path: ${rest}`,
          );
      }
    }
    /**
     * Removes a value from the collection.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path2) {
      const [key, ...rest] = path2;
      if (rest.length === 0) return this.delete(key);
      const node = this.get(key, true);
      if (identity2.isCollection(node)) return node.deleteIn(rest);
      else
        throw new Error(
          `Expected YAML collection at ${key}. Remaining path: ${rest}`,
        );
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path2, keepScalar) {
      const [key, ...rest] = path2;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity2.isScalar(node) ? node.value : node;
      else
        return identity2.isCollection(node)
          ? node.getIn(rest, keepScalar)
          : void 0;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity2.isPair(node)) return false;
        const n = node.value;
        return (
          n == null ||
          (allowScalar &&
            identity2.isScalar(n) &&
            n.value == null &&
            !n.commentBefore &&
            !n.comment &&
            !n.tag)
        );
      });
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     */
    hasIn(path2) {
      const [key, ...rest] = path2;
      if (rest.length === 0) return this.has(key);
      const node = this.get(key, true);
      return identity2.isCollection(node) ? node.hasIn(rest) : false;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path2, value) {
      const [key, ...rest] = path2;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity2.isCollection(node)) node.setIn(rest, value);
        else if (node === void 0 && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(
            `Expected YAML collection at ${key}. Remaining path: ${rest}`,
          );
      }
    }
  };
  Collection.Collection = Collection$1;
  Collection.collectionFromPath = collectionFromPath;
  Collection.isEmptyPath = isEmptyPath;
  return Collection;
}
var Pair = {};
var stringifyPair = {};
var stringify = {};
var stringifyComment = {};
var hasRequiredStringifyComment;
function requireStringifyComment() {
  if (hasRequiredStringifyComment) return stringifyComment;
  hasRequiredStringifyComment = 1;
  const stringifyComment$1 = (str) => str.replace(/^(?!$)(?: $)?/gm, '#');
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment)) return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  const lineComment = (str, indent, comment) =>
    str.endsWith('\n')
      ? indentComment(comment, indent)
      : comment.includes('\n')
        ? '\n' + indentComment(comment, indent)
        : (str.endsWith(' ') ? '' : ' ') + comment;
  stringifyComment.indentComment = indentComment;
  stringifyComment.lineComment = lineComment;
  stringifyComment.stringifyComment = stringifyComment$1;
  return stringifyComment;
}
var stringifyString = {};
var foldFlowLines = {};
var hasRequiredFoldFlowLines;
function requireFoldFlowLines() {
  if (hasRequiredFoldFlowLines) return foldFlowLines;
  hasRequiredFoldFlowLines = 1;
  const FOLD_FLOW = 'flow';
  const FOLD_BLOCK = 'block';
  const FOLD_QUOTED = 'quoted';
  function foldFlowLines$1(
    text,
    indent,
    mode = 'flow',
    {
      indentAtStart,
      lineWidth = 80,
      minContentWidth = 20,
      onFold,
      onOverflow,
    } = {},
  ) {
    if (!lineWidth || lineWidth < 0) return text;
    if (lineWidth < minContentWidth) minContentWidth = 0;
    const endStep = Math.max(
      1 + minContentWidth,
      1 + lineWidth - indent.length,
    );
    if (text.length <= endStep) return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === 'number') {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else end = lineWidth - indentAtStart;
    }
    let split = void 0;
    let prev = void 0;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1) end = i + endStep;
    }
    for (let ch; (ch = text[(i += 1)]); ) {
      if (mode === FOLD_QUOTED && ch === '\\') {
        escStart = i;
        switch (text[i + 1]) {
          case 'x':
            i += 3;
            break;
          case 'u':
            i += 5;
            break;
          case 'U':
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === '\n') {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = void 0;
      } else {
        if (
          ch === ' ' &&
          prev &&
          prev !== ' ' &&
          prev !== '\n' &&
          prev !== '	'
        ) {
          const next = text[i + 1];
          if (next && next !== ' ' && next !== '\n' && next !== '	') split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = void 0;
          } else if (mode === FOLD_QUOTED) {
            while (prev === ' ' || prev === '	') {
              prev = ch;
              ch = text[(i += 1)];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j]) return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = void 0;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow) onOverflow();
    if (folds.length === 0) return text;
    if (onFold) onFold();
    let res = text.slice(0, folds[0]);
    for (let i2 = 0; i2 < folds.length; ++i2) {
      const fold = folds[i2];
      const end2 = folds[i2 + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end2)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end2)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === ' ' || ch === '	') {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== '\n');
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  foldFlowLines.FOLD_BLOCK = FOLD_BLOCK;
  foldFlowLines.FOLD_FLOW = FOLD_FLOW;
  foldFlowLines.FOLD_QUOTED = FOLD_QUOTED;
  foldFlowLines.foldFlowLines = foldFlowLines$1;
  return foldFlowLines;
}
var hasRequiredStringifyString;
function requireStringifyString() {
  if (hasRequiredStringifyString) return stringifyString;
  hasRequiredStringifyString = 1;
  var Scalar2 = requireScalar();
  var foldFlowLines2 = requireFoldFlowLines();
  const getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth,
  });
  const containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0) return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit) return false;
    for (let i = 0, start = 0; i < strLen; ++i) {
      if (str[i] === '\n') {
        if (i - start > limit) return true;
        start = i + 1;
        if (strLen - start <= limit) return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json2 = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON) return json2;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
    let str = '';
    let start = 0;
    for (let i = 0, ch = json2[i]; ch; ch = json2[++i]) {
      if (ch === ' ' && json2[i + 1] === '\\' && json2[i + 2] === 'n') {
        str += json2.slice(start, i) + '\\ ';
        i += 1;
        start = i;
        ch = '\\';
      }
      if (ch === '\\')
        switch (json2[i + 1]) {
          case 'u':
            {
              str += json2.slice(start, i);
              const code = json2.substr(i + 2, 4);
              switch (code) {
                case '0000':
                  str += '\\0';
                  break;
                case '0007':
                  str += '\\a';
                  break;
                case '000b':
                  str += '\\v';
                  break;
                case '001b':
                  str += '\\e';
                  break;
                case '0085':
                  str += '\\N';
                  break;
                case '00a0':
                  str += '\\_';
                  break;
                case '2028':
                  str += '\\L';
                  break;
                case '2029':
                  str += '\\P';
                  break;
                default:
                  if (code.substr(0, 2) === '00') str += '\\x' + code.substr(2);
                  else str += json2.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case 'n':
            if (
              implicitKey ||
              json2[i + 2] === '"' ||
              json2.length < minMultiLineLength
            ) {
              i += 1;
            } else {
              str += json2.slice(start, i) + '\n\n';
              while (
                json2[i + 2] === '\\' &&
                json2[i + 3] === 'n' &&
                json2[i + 4] !== '"'
              ) {
                str += '\n';
                i += 2;
              }
              str += indent;
              if (json2[i + 2] === ' ') str += '\\';
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json2.slice(start) : json2;
    return implicitKey
      ? str
      : foldFlowLines2.foldFlowLines(
          str,
          indent,
          foldFlowLines2.FOLD_QUOTED,
          getFoldOptions(ctx, false),
        );
  }
  function singleQuotedString(value, ctx) {
    if (
      ctx.options.singleQuote === false ||
      (ctx.implicitKey && value.includes('\n')) ||
      /[ \t]\n|\n[ \t]/.test(value)
    )
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
    const res =
      "'" +
      value.replace(/'/g, "''").replace(
        /\n+/g,
        `$&
${indent}`,
      ) +
      "'";
    return ctx.implicitKey
      ? res
      : foldFlowLines2.foldFlowLines(
          res,
          indent,
          foldFlowLines2.FOLD_FLOW,
          getFoldOptions(ctx, false),
        );
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false) qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle) qs = singleQuotedString;
      else if (hasSingle && !hasDouble) qs = doubleQuotedString;
      else qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  let blockEndNewlines;
  try {
    blockEndNewlines = new RegExp('(^|(?<!\n))\n+(?!\n|$)', 'g');
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent =
      ctx.indent ||
      (ctx.forceBlockIndent || containsDocumentMarker(value) ? '  ' : '');
    const literal =
      blockQuote === 'literal'
        ? true
        : blockQuote === 'folded' || type === Scalar2.Scalar.BLOCK_FOLDED
          ? false
          : type === Scalar2.Scalar.BLOCK_LITERAL
            ? true
            : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value) return literal ? '|\n' : '>\n';
    let chomp;
    let endStart;
    for (endStart = value.length; endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== '\n' && ch !== '	' && ch !== ' ') break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf('\n');
    if (endNlPos === -1) {
      chomp = '-';
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = '+';
      if (onChompKeep) onChompKeep();
    } else {
      chomp = '';
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === '\n') end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0; startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === ' ') startWithSpace = true;
      else if (ch === '\n') startNlPos = startEnd;
      else break;
    }
    let start = value.substring(
      0,
      startNlPos < startEnd ? startNlPos + 1 : startEnd,
    );
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? '2' : '1';
    let header = (startWithSpace ? indentSize : '') + chomp;
    if (comment) {
      header += ' ' + commentString(comment.replace(/ ?[\r\n]+/g, ' '));
      if (onComment) onComment();
    }
    if (!literal) {
      const foldedValue = value
        .replace(/\n+/g, '\n$&')
        .replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2')
        .replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== 'folded' && type !== Scalar2.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines2.foldFlowLines(
        `${start}${foldedValue}${end}`,
        indent,
        foldFlowLines2.FOLD_BLOCK,
        foldOptions,
      );
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (
      (implicitKey && value.includes('\n')) ||
      (inFlow && /[[\]{},]/.test(value))
    ) {
      return quotedString(value, ctx);
    }
    if (
      /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(
        value,
      )
    ) {
      return implicitKey || inFlow || !value.includes('\n')
        ? quotedString(value, ctx)
        : blockString(item, ctx, onComment, onChompKeep);
    }
    if (
      !implicitKey &&
      !inFlow &&
      type !== Scalar2.Scalar.PLAIN &&
      value.includes('\n')
    ) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === '') {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(
      /\n+/g,
      `$&
${indent}`,
    );
    if (actualString) {
      const test = (tag) =>
        tag.default &&
        tag.tag !== 'tag:yaml.org,2002:str' &&
        tag.test?.test(str);
      const { compat, tags: tags2 } = ctx.doc.schema;
      if (tags2.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey
      ? str
      : foldFlowLines2.foldFlowLines(
          str,
          indent,
          foldFlowLines2.FOLD_FLOW,
          getFoldOptions(ctx, false),
        );
  }
  function stringifyString$1(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss =
      typeof item.value === 'string'
        ? item
        : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar2.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar2.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar2.Scalar.BLOCK_FOLDED:
        case Scalar2.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow
            ? quotedString(ss.value, ctx)
            : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar2.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar2.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar2.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = (implicitKey && defaultKeyType) || defaultStringType;
      res = _stringify(t);
      if (res === null) throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  stringifyString.stringifyString = stringifyString$1;
  return stringifyString;
}
var hasRequiredStringify;
function requireStringify() {
  if (hasRequiredStringify) return stringify;
  hasRequiredStringify = 1;
  var anchors2 = requireAnchors();
  var identity2 = requireIdentity();
  var stringifyComment2 = requireStringifyComment();
  var stringifyString2 = requireStringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign(
      {
        blockQuote: true,
        commentString: stringifyComment2.stringifyComment,
        defaultKeyType: null,
        defaultStringType: 'PLAIN',
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: 'false',
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: 'null',
        simpleKeys: false,
        singleQuote: null,
        trueStr: 'true',
        verifyAliasOrder: true,
      },
      doc.schema.toStringOptions,
      options,
    );
    let inFlow;
    switch (opt.collectionStyle) {
      case 'block':
        inFlow = false;
        break;
      case 'flow':
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: /* @__PURE__ */ new Set(),
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? ' ' : '',
      indent: '',
      indentStep:
        typeof opt.indent === 'number' ? ' '.repeat(opt.indent) : '  ',
      inFlow,
      options: opt,
    };
  }
  function getTagObject(tags2, item) {
    if (item.tag) {
      const match = tags2.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = void 0;
    let obj;
    if (identity2.isScalar(item)) {
      obj = item.value;
      let match = tags2.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0) match = testMatch;
      }
      tagObj =
        match.find((t) => t.format === item.format) ??
        match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags2.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name =
        obj?.constructor?.name ?? (obj === null ? 'null' : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives) return '';
    const props = [];
    const anchor =
      (identity2.isScalar(node) || identity2.isCollection(node)) && node.anchor;
    if (anchor && anchors2.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag) props.push(doc.directives.tagString(tag));
    return props.join(' ');
  }
  function stringify$1(item, ctx, onComment, onChompKeep) {
    if (identity2.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity2.isAlias(item)) {
      if (ctx.doc.directives) return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(
          `Cannot stringify circular structure without alias nodes`,
        );
      } else {
        if (ctx.resolvedAliases) ctx.resolvedAliases.add(item);
        else ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = void 0;
    const node = identity2.isNode(item)
      ? item
      : ctx.doc.createNode(item, { onTagObj: (o) => (tagObj = o) });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str =
      typeof tagObj.stringify === 'function'
        ? tagObj.stringify(node, ctx, onComment, onChompKeep)
        : identity2.isScalar(node)
          ? stringifyString2.stringifyString(node, ctx, onComment, onChompKeep)
          : node.toString(ctx, onComment, onChompKeep);
    if (!props) return str;
    return identity2.isScalar(node) || str[0] === '{' || str[0] === '['
      ? `${props} ${str}`
      : `${props}
${ctx.indent}${str}`;
  }
  stringify.createStringifyContext = createStringifyContext;
  stringify.stringify = stringify$1;
  return stringify;
}
var hasRequiredStringifyPair;
function requireStringifyPair() {
  if (hasRequiredStringifyPair) return stringifyPair;
  hasRequiredStringifyPair = 1;
  var identity2 = requireIdentity();
  var Scalar2 = requireScalar();
  var stringify2 = requireStringify();
  var stringifyComment2 = requireStringifyComment();
  function stringifyPair$1({ key, value }, ctx, onComment, onChompKeep) {
    const {
      allNullValues,
      doc,
      indent,
      indentStep,
      options: { commentString, indentSeq, simpleKeys },
    } = ctx;
    let keyComment = (identity2.isNode(key) && key.comment) || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error('With simple keys, key nodes cannot have comments');
      }
      if (
        identity2.isCollection(key) ||
        (!identity2.isNode(key) && typeof key === 'object')
      ) {
        const msg =
          'With simple keys, collection cannot be used as a key value';
        throw new Error(msg);
      }
    }
    let explicitKey =
      !simpleKeys &&
      (!key ||
        (keyComment && value == null && !ctx.inFlow) ||
        identity2.isCollection(key) ||
        (identity2.isScalar(key)
          ? key.type === Scalar2.Scalar.BLOCK_FOLDED ||
            key.type === Scalar2.Scalar.BLOCK_LITERAL
          : typeof key === 'object'));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep,
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify2.stringify(
      key,
      ctx,
      () => (keyCommentDone = true),
      () => (chompKeep = true),
    );
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error(
          'With simple keys, single line scalar must not span more than 1024 characters',
        );
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment) onComment();
        return str === '' ? '?' : explicitKey ? `? ${str}` : str;
      }
    } else if (
      (allNullValues && !simpleKeys) ||
      (value == null && explicitKey)
    ) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment2.lineComment(
          str,
          ctx.indent,
          commentString(keyComment),
        );
      } else if (chompKeep && onChompKeep) onChompKeep();
      return str;
    }
    if (keyCommentDone) keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment2.lineComment(
          str,
          ctx.indent,
          commentString(keyComment),
        );
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment2.lineComment(
          str,
          ctx.indent,
          commentString(keyComment),
        );
    }
    let vsb, vcb, valueComment;
    if (identity2.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === 'object') value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity2.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (
      !indentSeq &&
      indentStep.length >= 2 &&
      !ctx.inFlow &&
      !explicitKey &&
      identity2.isSeq(value) &&
      !value.flow &&
      !value.tag &&
      !value.anchor
    ) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify2.stringify(
      value,
      ctx,
      () => (valueCommentDone = true),
      () => (chompKeep = true),
    );
    let ws = ' ';
    if (keyComment || vsb || vcb) {
      ws = vsb ? '\n' : '';
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment2.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === '' && !ctx.inFlow) {
        if (ws === '\n' && valueComment) ws = '\n\n';
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity2.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf('\n');
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === '&' || vs0 === '!')) {
          let sp0 = valueStr.indexOf(' ');
          if (
            vs0 === '&' &&
            sp0 !== -1 &&
            sp0 < nl0 &&
            valueStr[sp0 + 1] === '!'
          ) {
            sp0 = valueStr.indexOf(' ', sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0) hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === '' || valueStr[0] === '\n') {
      ws = '';
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment) onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment2.lineComment(
        str,
        ctx.indent,
        commentString(valueComment),
      );
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  stringifyPair.stringifyPair = stringifyPair$1;
  return stringifyPair;
}
var addPairToJSMap = {};
var log = {};
var hasRequiredLog;
function requireLog() {
  if (hasRequiredLog) return log;
  hasRequiredLog = 1;
  var node_process = require$$0$4;
  function debug(logLevel, ...messages) {
    if (logLevel === 'debug') console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === 'debug' || logLevel === 'warn') {
      if (typeof node_process.emitWarning === 'function')
        node_process.emitWarning(warning);
      else console.warn(warning);
    }
  }
  log.debug = debug;
  log.warn = warn;
  return log;
}
var merge = {};
var hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge) return merge;
  hasRequiredMerge = 1;
  var identity2 = requireIdentity();
  var Scalar2 = requireScalar();
  const MERGE_KEY = '<<';
  const merge$1 = {
    identify: (value) =>
      value === MERGE_KEY ||
      (typeof value === 'symbol' && value.description === MERGE_KEY),
    default: 'key',
    tag: 'tag:yaml.org,2002:merge',
    test: /^<<$/,
    resolve: () =>
      Object.assign(new Scalar2.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap,
      }),
    stringify: () => MERGE_KEY,
  };
  const isMergeKey = (ctx, key) =>
    (merge$1.identify(key) ||
      (identity2.isScalar(key) &&
        (!key.type || key.type === Scalar2.Scalar.PLAIN) &&
        merge$1.identify(key.value))) &&
    ctx?.doc.schema.tags.some((tag) => tag.tag === merge$1.tag && tag.default);
  function addMergeToJSMap(ctx, map2, value) {
    value = ctx && identity2.isAlias(value) ? value.resolve(ctx.doc) : value;
    if (identity2.isSeq(value))
      for (const it of value.items) mergeValue(ctx, map2, it);
    else if (Array.isArray(value))
      for (const it of value) mergeValue(ctx, map2, it);
    else mergeValue(ctx, map2, value);
  }
  function mergeValue(ctx, map2, value) {
    const source =
      ctx && identity2.isAlias(value) ? value.resolve(ctx.doc) : value;
    if (!identity2.isMap(source))
      throw new Error('Merge sources must be maps or map aliases');
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value2] of srcMap) {
      if (map2 instanceof Map) {
        if (!map2.has(key)) map2.set(key, value2);
      } else if (map2 instanceof Set) {
        map2.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map2, key)) {
        Object.defineProperty(map2, key, {
          value: value2,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
    return map2;
  }
  merge.addMergeToJSMap = addMergeToJSMap;
  merge.isMergeKey = isMergeKey;
  merge.merge = merge$1;
  return merge;
}
var hasRequiredAddPairToJSMap;
function requireAddPairToJSMap() {
  if (hasRequiredAddPairToJSMap) return addPairToJSMap;
  hasRequiredAddPairToJSMap = 1;
  var log2 = requireLog();
  var merge2 = requireMerge();
  var stringify2 = requireStringify();
  var identity2 = requireIdentity();
  var toJS2 = requireToJS();
  function addPairToJSMap$1(ctx, map2, { key, value }) {
    if (identity2.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map2, value);
    else if (merge2.isMergeKey(ctx, key))
      merge2.addMergeToJSMap(ctx, map2, value);
    else {
      const jsKey = toJS2.toJS(key, '', ctx);
      if (map2 instanceof Map) {
        map2.set(jsKey, toJS2.toJS(value, jsKey, ctx));
      } else if (map2 instanceof Set) {
        map2.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS2.toJS(value, stringKey, ctx);
        if (stringKey in map2)
          Object.defineProperty(map2, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        else map2[stringKey] = jsValue;
      }
    }
    return map2;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null) return '';
    if (typeof jsKey !== 'object') return String(jsKey);
    if (identity2.isNode(key) && ctx?.doc) {
      const strCtx = stringify2.createStringifyContext(ctx.doc, {});
      strCtx.anchors = /* @__PURE__ */ new Set();
      for (const node of ctx.anchors.keys()) strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40) jsonStr = jsonStr.substring(0, 36) + '..."';
        log2.warn(
          ctx.doc.options.logLevel,
          `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`,
        );
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  addPairToJSMap.addPairToJSMap = addPairToJSMap$1;
  return addPairToJSMap;
}
var hasRequiredPair;
function requirePair() {
  if (hasRequiredPair) return Pair;
  hasRequiredPair = 1;
  var createNode2 = requireCreateNode();
  var stringifyPair2 = requireStringifyPair();
  var addPairToJSMap2 = requireAddPairToJSMap();
  var identity2 = requireIdentity();
  function createPair(key, value, ctx) {
    const k = createNode2.createNode(key, void 0, ctx);
    const v = createNode2.createNode(value, void 0, ctx);
    return new Pair$1(k, v);
  }
  let Pair$1 = class Pair2 {
    constructor(key, value = null) {
      Object.defineProperty(this, identity2.NODE_TYPE, {
        value: identity2.PAIR,
      });
      this.key = key;
      this.value = value;
    }
    clone(schema2) {
      let { key, value } = this;
      if (identity2.isNode(key)) key = key.clone(schema2);
      if (identity2.isNode(value)) value = value.clone(schema2);
      return new Pair2(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
      return addPairToJSMap2.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc
        ? stringifyPair2.stringifyPair(this, ctx, onComment, onChompKeep)
        : JSON.stringify(this);
    }
  };
  Pair.Pair = Pair$1;
  Pair.createPair = createPair;
  return Pair;
}
var Schema = {};
var map = {};
var YAMLMap = {};
var stringifyCollection = {};
var hasRequiredStringifyCollection;
function requireStringifyCollection() {
  if (hasRequiredStringifyCollection) return stringifyCollection;
  hasRequiredStringifyCollection = 1;
  var identity2 = requireIdentity();
  var stringify2 = requireStringify();
  var stringifyComment2 = requireStringifyComment();
  function stringifyCollection$1(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify3 = flow
      ? stringifyFlowCollection
      : stringifyBlockCollection;
    return stringify3(collection, ctx, options);
  }
  function stringifyBlockCollection(
    { comment, items },
    ctx,
    { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment },
  ) {
    const {
      indent,
      options: { commentString },
    } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      let comment2 = null;
      if (identity2.isNode(item)) {
        if (!chompKeep && item.spaceBefore) lines.push('');
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment) comment2 = item.comment;
      } else if (identity2.isPair(item)) {
        const ik = identity2.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore) lines.push('');
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str2 = stringify2.stringify(
        item,
        itemCtx,
        () => (comment2 = null),
        () => (chompKeep = true),
      );
      if (comment2)
        str2 += stringifyComment2.lineComment(
          str2,
          itemIndent,
          commentString(comment2),
        );
      if (chompKeep && comment2) chompKeep = false;
      lines.push(blockItemPrefix + str2);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1; i < lines.length; ++i) {
        const line = lines[i];
        str += line
          ? `
${indent}${line}`
          : '\n';
      }
    }
    if (comment) {
      str +=
        '\n' + stringifyComment2.indentComment(commentString(comment), indent);
      if (onComment) onComment();
    } else if (chompKeep && onChompKeep) onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const {
      indent,
      indentStep,
      flowCollectionPadding: fcPadding,
      options: { commentString },
    } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null,
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity2.isNode(item)) {
        if (item.spaceBefore) lines.push('');
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment) comment = item.comment;
      } else if (identity2.isPair(item)) {
        const ik = identity2.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore) lines.push('');
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment) reqNewline = true;
        }
        const iv = identity2.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment) comment = iv.comment;
          if (iv.commentBefore) reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment) reqNewline = true;
      let str = stringify2.stringify(item, itemCtx, () => (comment = null));
      if (i < items.length - 1) str += ',';
      if (comment)
        str += stringifyComment2.lineComment(
          str,
          itemIndent,
          commentString(comment),
        );
      if (!reqNewline && (lines.length > linesAtValue || str.includes('\n')))
        reqNewline = true;
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum2, line) => sum2 + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line
            ? `
${indentStep}${indent}${line}`
            : '\n';
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(' ')}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore(
    { indent, options: { commentString } },
    lines,
    comment,
    chompKeep,
  ) {
    if (comment && chompKeep) comment = comment.replace(/^\n+/, '');
    if (comment) {
      const ic = stringifyComment2.indentComment(
        commentString(comment),
        indent,
      );
      lines.push(ic.trimStart());
    }
  }
  stringifyCollection.stringifyCollection = stringifyCollection$1;
  return stringifyCollection;
}
var hasRequiredYAMLMap;
function requireYAMLMap() {
  if (hasRequiredYAMLMap) return YAMLMap;
  hasRequiredYAMLMap = 1;
  var stringifyCollection2 = requireStringifyCollection();
  var addPairToJSMap2 = requireAddPairToJSMap();
  var Collection2 = requireCollection();
  var identity2 = requireIdentity();
  var Pair2 = requirePair();
  var Scalar2 = requireScalar();
  function findPair(items, key) {
    const k = identity2.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity2.isPair(it)) {
        if (it.key === key || it.key === k) return it;
        if (identity2.isScalar(it.key) && it.key.value === k) return it;
      }
    }
    return void 0;
  }
  let YAMLMap$1 = class YAMLMap extends Collection2.Collection {
    static get tagName() {
      return 'tag:yaml.org,2002:map';
    }
    constructor(schema2) {
      super(identity2.MAP, schema2);
      this.items = [];
    }
    /**
     * A generic collection parsing method that can be extended
     * to other node classes that inherit from YAMLMap
     */
    static from(schema2, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map2 = new this(schema2);
      const add = (key, value) => {
        if (typeof replacer === 'function')
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key)) return;
        if (value !== void 0 || keepUndefined)
          map2.items.push(Pair2.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj) add(key, value);
      } else if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) add(key, obj[key]);
      }
      if (typeof schema2.sortMapEntries === 'function') {
        map2.items.sort(schema2.sortMapEntries);
      }
      return map2;
    }
    /**
     * Adds a value to the collection.
     *
     * @param overwrite - If not set `true`, using a key that is already in the
     *   collection will throw. Otherwise, overwrites the previous value.
     */
    add(pair, overwrite) {
      let _pair;
      if (identity2.isPair(pair)) _pair = pair;
      else if (!pair || typeof pair !== 'object' || !('key' in pair)) {
        _pair = new Pair2.Pair(pair, pair?.value);
      } else _pair = new Pair2.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite) throw new Error(`Key ${_pair.key} already set`);
        if (
          identity2.isScalar(prev.value) &&
          Scalar2.isScalarValue(_pair.value)
        )
          prev.value.value = _pair.value;
        else prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1) this.items.push(_pair);
        else this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it) return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (
        (!keepScalar && identity2.isScalar(node) ? node.value : node) ?? void 0
      );
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair2.Pair(key, value), true);
    }
    /**
     * @param ctx - Conversion context, originally set in Document#toJS()
     * @param {Class} Type - If set, forces the returned collection type
     * @returns Instance of Type, Map, or Object
     */
    toJSON(_, ctx, Type) {
      const map2 = Type
        ? new Type()
        : ctx?.mapAsMap
          ? /* @__PURE__ */ new Map()
          : {};
      if (ctx?.onCreate) ctx.onCreate(map2);
      for (const item of this.items)
        addPairToJSMap2.addPairToJSMap(ctx, map2, item);
      return map2;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity2.isPair(item))
          throw new Error(
            `Map items must all be pairs; found ${JSON.stringify(item)} instead`,
          );
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection2.stringifyCollection(this, ctx, {
        blockItemPrefix: '',
        flowChars: { start: '{', end: '}' },
        itemIndent: ctx.indent || '',
        onChompKeep,
        onComment,
      });
    }
  };
  YAMLMap.YAMLMap = YAMLMap$1;
  YAMLMap.findPair = findPair;
  return YAMLMap;
}
var hasRequiredMap;
function requireMap() {
  if (hasRequiredMap) return map;
  hasRequiredMap = 1;
  var identity2 = requireIdentity();
  var YAMLMap2 = requireYAMLMap();
  const map$1 = {
    collection: 'map',
    default: true,
    nodeClass: YAMLMap2.YAMLMap,
    tag: 'tag:yaml.org,2002:map',
    resolve(map2, onError) {
      if (!identity2.isMap(map2)) onError('Expected a mapping for this tag');
      return map2;
    },
    createNode: (schema2, obj, ctx) => YAMLMap2.YAMLMap.from(schema2, obj, ctx),
  };
  map.map = map$1;
  return map;
}
var seq = {};
var YAMLSeq = {};
var hasRequiredYAMLSeq;
function requireYAMLSeq() {
  if (hasRequiredYAMLSeq) return YAMLSeq;
  hasRequiredYAMLSeq = 1;
  var createNode2 = requireCreateNode();
  var stringifyCollection2 = requireStringifyCollection();
  var Collection2 = requireCollection();
  var identity2 = requireIdentity();
  var Scalar2 = requireScalar();
  var toJS2 = requireToJS();
  let YAMLSeq$1 = class YAMLSeq extends Collection2.Collection {
    static get tagName() {
      return 'tag:yaml.org,2002:seq';
    }
    constructor(schema2) {
      super(identity2.SEQ, schema2);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    /**
     * Removes a value from the collection.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     *
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== 'number') return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== 'number') return void 0;
      const it = this.items[idx];
      return !keepScalar && identity2.isScalar(it) ? it.value : it;
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     */
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === 'number' && idx < this.items.length;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     *
     * If `key` does not contain a representation of an integer, this will throw.
     * It may be wrapped in a `Scalar`.
     */
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== 'number')
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity2.isScalar(prev) && Scalar2.isScalarValue(value))
        prev.value = value;
      else this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq2 = [];
      if (ctx?.onCreate) ctx.onCreate(seq2);
      let i = 0;
      for (const item of this.items)
        seq2.push(toJS2.toJS(item, String(i++), ctx));
      return seq2;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);
      return stringifyCollection2.stringifyCollection(this, ctx, {
        blockItemPrefix: '- ',
        flowChars: { start: '[', end: ']' },
        itemIndent: (ctx.indent || '') + '  ',
        onChompKeep,
        onComment,
      });
    }
    static from(schema2, obj, ctx) {
      const { replacer } = ctx;
      const seq2 = new this(schema2);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === 'function') {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq2.items.push(createNode2.createNode(it, void 0, ctx));
        }
      }
      return seq2;
    }
  };
  function asItemIndex(key) {
    let idx = identity2.isScalar(key) ? key.value : key;
    if (idx && typeof idx === 'string') idx = Number(idx);
    return typeof idx === 'number' && Number.isInteger(idx) && idx >= 0
      ? idx
      : null;
  }
  YAMLSeq.YAMLSeq = YAMLSeq$1;
  return YAMLSeq;
}
var hasRequiredSeq;
function requireSeq() {
  if (hasRequiredSeq) return seq;
  hasRequiredSeq = 1;
  var identity2 = requireIdentity();
  var YAMLSeq2 = requireYAMLSeq();
  const seq$1 = {
    collection: 'seq',
    default: true,
    nodeClass: YAMLSeq2.YAMLSeq,
    tag: 'tag:yaml.org,2002:seq',
    resolve(seq2, onError) {
      if (!identity2.isSeq(seq2)) onError('Expected a sequence for this tag');
      return seq2;
    },
    createNode: (schema2, obj, ctx) => YAMLSeq2.YAMLSeq.from(schema2, obj, ctx),
  };
  seq.seq = seq$1;
  return seq;
}
var string = {};
var hasRequiredString;
function requireString() {
  if (hasRequiredString) return string;
  hasRequiredString = 1;
  var stringifyString2 = requireStringifyString();
  const string$1 = {
    identify: (value) => typeof value === 'string',
    default: true,
    tag: 'tag:yaml.org,2002:str',
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString2.stringifyString(
        item,
        ctx,
        onComment,
        onChompKeep,
      );
    },
  };
  string.string = string$1;
  return string;
}
var tags = {};
var _null = {};
var hasRequired_null;
function require_null() {
  if (hasRequired_null) return _null;
  hasRequired_null = 1;
  var Scalar2 = requireScalar();
  const nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar2.Scalar(null),
    default: true,
    tag: 'tag:yaml.org,2002:null',
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar2.Scalar(null),
    stringify: ({ source }, ctx) =>
      typeof source === 'string' && nullTag.test.test(source)
        ? source
        : ctx.options.nullStr,
  };
  _null.nullTag = nullTag;
  return _null;
}
var bool$1 = {};
var hasRequiredBool$1;
function requireBool$1() {
  if (hasRequiredBool$1) return bool$1;
  hasRequiredBool$1 = 1;
  var Scalar2 = requireScalar();
  const boolTag = {
    identify: (value) => typeof value === 'boolean',
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar2.Scalar(str[0] === 't' || str[0] === 'T'),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === 't' || source[0] === 'T';
        if (value === sv) return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    },
  };
  bool$1.boolTag = boolTag;
  return bool$1;
}
var float$1 = {};
var stringifyNumber = {};
var hasRequiredStringifyNumber;
function requireStringifyNumber() {
  if (hasRequiredStringifyNumber) return stringifyNumber;
  hasRequiredStringifyNumber = 1;
  function stringifyNumber$1({ format, minFractionDigits, tag, value }) {
    if (typeof value === 'bigint') return String(value);
    const num = typeof value === 'number' ? value : Number(value);
    if (!isFinite(num)) return isNaN(num) ? '.nan' : num < 0 ? '-.inf' : '.inf';
    let n = Object.is(value, -0) ? '-0' : JSON.stringify(value);
    if (
      !format &&
      minFractionDigits &&
      (!tag || tag === 'tag:yaml.org,2002:float') &&
      /^\d/.test(n)
    ) {
      let i = n.indexOf('.');
      if (i < 0) {
        i = n.length;
        n += '.';
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0) n += '0';
    }
    return n;
  }
  stringifyNumber.stringifyNumber = stringifyNumber$1;
  return stringifyNumber;
}
var hasRequiredFloat$1;
function requireFloat$1() {
  if (hasRequiredFloat$1) return float$1;
  hasRequiredFloat$1 = 1;
  var Scalar2 = requireScalar();
  var stringifyNumber2 = requireStringifyNumber();
  const floatNaN = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) =>
      str.slice(-3).toLowerCase() === 'nan'
        ? NaN
        : str[0] === '-'
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber2.stringifyNumber,
  };
  const floatExp = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'EXP',
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num)
        ? num.toExponential()
        : stringifyNumber2.stringifyNumber(node);
    },
  };
  const float2 = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar2.Scalar(parseFloat(str));
      const dot2 = str.indexOf('.');
      if (dot2 !== -1 && str[str.length - 1] === '0')
        node.minFractionDigits = str.length - dot2 - 1;
      return node;
    },
    stringify: stringifyNumber2.stringifyNumber,
  };
  float$1.float = float2;
  float$1.floatExp = floatExp;
  float$1.floatNaN = floatNaN;
  return float$1;
}
var int$1 = {};
var hasRequiredInt$1;
function requireInt$1() {
  if (hasRequiredInt$1) return int$1;
  hasRequiredInt$1 = 1;
  var stringifyNumber2 = requireStringifyNumber();
  const intIdentify = (value) =>
    typeof value === 'bigint' || Number.isInteger(value);
  const intResolve = (str, offset, radix, { intAsBigInt }) =>
    intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0) return prefix + value.toString(radix);
    return stringifyNumber2.stringifyNumber(node);
  }
  const intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'OCT',
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, '0o'),
  };
  const int2 = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber2.stringifyNumber,
  };
  const intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'HEX',
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, '0x'),
  };
  int$1.int = int2;
  int$1.intHex = intHex;
  int$1.intOct = intOct;
  return int$1;
}
var schema$2 = {};
var hasRequiredSchema$3;
function requireSchema$3() {
  if (hasRequiredSchema$3) return schema$2;
  hasRequiredSchema$3 = 1;
  var map2 = requireMap();
  var _null2 = require_null();
  var seq2 = requireSeq();
  var string2 = requireString();
  var bool2 = requireBool$1();
  var float2 = requireFloat$1();
  var int2 = requireInt$1();
  const schema2 = [
    map2.map,
    seq2.seq,
    string2.string,
    _null2.nullTag,
    bool2.boolTag,
    int2.intOct,
    int2.int,
    int2.intHex,
    float2.floatNaN,
    float2.floatExp,
    float2.float,
  ];
  schema$2.schema = schema2;
  return schema$2;
}
var schema$1 = {};
var hasRequiredSchema$2;
function requireSchema$2() {
  if (hasRequiredSchema$2) return schema$1;
  hasRequiredSchema$2 = 1;
  var Scalar2 = requireScalar();
  var map2 = requireMap();
  var seq2 = requireSeq();
  function intIdentify(value) {
    return typeof value === 'bigint' || Number.isInteger(value);
  }
  const stringifyJSON = ({ value }) => JSON.stringify(value);
  const jsonScalars = [
    {
      identify: (value) => typeof value === 'string',
      default: true,
      tag: 'tag:yaml.org,2002:str',
      resolve: (str) => str,
      stringify: stringifyJSON,
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar2.Scalar(null),
      default: true,
      tag: 'tag:yaml.org,2002:null',
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON,
    },
    {
      identify: (value) => typeof value === 'boolean',
      default: true,
      tag: 'tag:yaml.org,2002:bool',
      test: /^true$|^false$/,
      resolve: (str) => str === 'true',
      stringify: stringifyJSON,
    },
    {
      identify: intIdentify,
      default: true,
      tag: 'tag:yaml.org,2002:int',
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) =>
        intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) =>
        intIdentify(value) ? value.toString() : JSON.stringify(value),
    },
    {
      identify: (value) => typeof value === 'number',
      default: true,
      tag: 'tag:yaml.org,2002:float',
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON,
    },
  ];
  const jsonError = {
    default: true,
    tag: '',
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    },
  };
  const schema2 = [map2.map, seq2.seq].concat(jsonScalars, jsonError);
  schema$1.schema = schema2;
  return schema$1;
}
var binary = {};
var hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  var node_buffer = require$$0$5;
  var Scalar2 = requireScalar();
  var stringifyString2 = requireStringifyString();
  const binary$1 = {
    identify: (value) => value instanceof Uint8Array,
    // Buffer inherits from Uint8Array
    default: false,
    tag: 'tag:yaml.org,2002:binary',
    /**
     * Returns a Buffer in node and an Uint8Array in browsers
     *
     * To use the resulting buffer as an image, you'll want to do something like:
     *
     *   const blob = new Blob([buffer], { type: 'image/jpeg' })
     *   document.querySelector('#photo').src = URL.createObjectURL(blob)
     */
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === 'function') {
        return node_buffer.Buffer.from(src, 'base64');
      } else if (typeof atob === 'function') {
        const str = atob(src.replace(/[\n\r]/g, ''));
        const buffer = new Uint8Array(str.length);
        for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError(
          'This environment does not support reading binary tags; either Buffer or atob is required',
        );
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value) return '';
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === 'function') {
        str =
          buf instanceof node_buffer.Buffer
            ? buf.toString('base64')
            : node_buffer.Buffer.from(buf.buffer).toString('base64');
      } else if (typeof btoa === 'function') {
        let s = '';
        for (let i = 0; i < buf.length; ++i) s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error(
          'This environment does not support writing binary tags; either Buffer or btoa is required',
        );
      }
      type ?? (type = Scalar2.Scalar.BLOCK_LITERAL);
      if (type !== Scalar2.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(
          ctx.options.lineWidth - ctx.indent.length,
          ctx.options.minContentWidth,
        );
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar2.Scalar.BLOCK_LITERAL ? '\n' : ' ');
      }
      return stringifyString2.stringifyString(
        { comment, type, value: str },
        ctx,
        onComment,
        onChompKeep,
      );
    },
  };
  binary.binary = binary$1;
  return binary;
}
var omap = {};
var pairs = {};
var hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  var identity2 = requireIdentity();
  var Pair2 = requirePair();
  var Scalar2 = requireScalar();
  var YAMLSeq2 = requireYAMLSeq();
  function resolvePairs(seq2, onError) {
    if (identity2.isSeq(seq2)) {
      for (let i = 0; i < seq2.items.length; ++i) {
        let item = seq2.items[i];
        if (identity2.isPair(item)) continue;
        else if (identity2.isMap(item)) {
          if (item.items.length > 1)
            onError('Each pair must have its own sequence indicator');
          const pair =
            item.items[0] || new Pair2.Pair(new Scalar2.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore
              ? `${item.commentBefore}
${pair.key.commentBefore}`
              : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment
              ? `${item.comment}
${cn.comment}`
              : item.comment;
          }
          item = pair;
        }
        seq2.items[i] = identity2.isPair(item) ? item : new Pair2.Pair(item);
      }
    } else onError('Expected a sequence for this tag');
    return seq2;
  }
  function createPairs(schema2, iterable, ctx) {
    const { replacer } = ctx;
    const pairs2 = new YAMLSeq2.YAMLSeq(schema2);
    pairs2.tag = 'tag:yaml.org,2002:pairs';
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === 'function')
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(
              `Expected tuple with one key, not ${keys.length} keys`,
            );
          }
        } else {
          key = it;
        }
        pairs2.items.push(Pair2.createPair(key, value, ctx));
      }
    return pairs2;
  }
  const pairs$1 = {
    collection: 'seq',
    default: false,
    tag: 'tag:yaml.org,2002:pairs',
    resolve: resolvePairs,
    createNode: createPairs,
  };
  pairs.createPairs = createPairs;
  pairs.pairs = pairs$1;
  pairs.resolvePairs = resolvePairs;
  return pairs;
}
var hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap) return omap;
  hasRequiredOmap = 1;
  var identity2 = requireIdentity();
  var toJS2 = requireToJS();
  var YAMLMap2 = requireYAMLMap();
  var YAMLSeq2 = requireYAMLSeq();
  var pairs2 = requirePairs();
  class YAMLOMap extends YAMLSeq2.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap2.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap2.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap2.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap2.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap2.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    /**
     * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
     * but TypeScript won't allow widening the signature of a child method.
     */
    toJSON(_, ctx) {
      if (!ctx) return super.toJSON(_);
      const map2 = /* @__PURE__ */ new Map();
      if (ctx?.onCreate) ctx.onCreate(map2);
      for (const pair of this.items) {
        let key, value;
        if (identity2.isPair(pair)) {
          key = toJS2.toJS(pair.key, '', ctx);
          value = toJS2.toJS(pair.value, key, ctx);
        } else {
          key = toJS2.toJS(pair, '', ctx);
        }
        if (map2.has(key))
          throw new Error('Ordered maps must not include duplicate keys');
        map2.set(key, value);
      }
      return map2;
    }
    static from(schema2, iterable, ctx) {
      const pairs$1 = pairs2.createPairs(schema2, iterable, ctx);
      const omap2 = new this();
      omap2.items = pairs$1.items;
      return omap2;
    }
  }
  YAMLOMap.tag = 'tag:yaml.org,2002:omap';
  const omap$1 = {
    collection: 'seq',
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: 'tag:yaml.org,2002:omap',
    resolve(seq2, onError) {
      const pairs$1 = pairs2.resolvePairs(seq2, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity2.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(
              `Ordered maps must not include duplicate keys: ${key.value}`,
            );
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap(), pairs$1);
    },
    createNode: (schema2, iterable, ctx) =>
      YAMLOMap.from(schema2, iterable, ctx),
  };
  omap.YAMLOMap = YAMLOMap;
  omap.omap = omap$1;
  return omap;
}
var schema = {};
var bool = {};
var hasRequiredBool;
function requireBool() {
  if (hasRequiredBool) return bool;
  hasRequiredBool = 1;
  var Scalar2 = requireScalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source)) return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  const trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar2.Scalar(true),
    stringify: boolStringify,
  };
  const falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar2.Scalar(false),
    stringify: boolStringify,
  };
  bool.falseTag = falseTag;
  bool.trueTag = trueTag;
  return bool;
}
var float = {};
var hasRequiredFloat;
function requireFloat() {
  if (hasRequiredFloat) return float;
  hasRequiredFloat = 1;
  var Scalar2 = requireScalar();
  var stringifyNumber2 = requireStringifyNumber();
  const floatNaN = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) =>
      str.slice(-3).toLowerCase() === 'nan'
        ? NaN
        : str[0] === '-'
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber2.stringifyNumber,
  };
  const floatExp = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'EXP',
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, '')),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num)
        ? num.toExponential()
        : stringifyNumber2.stringifyNumber(node);
    },
  };
  const float$12 = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar2.Scalar(parseFloat(str.replace(/_/g, '')));
      const dot2 = str.indexOf('.');
      if (dot2 !== -1) {
        const f = str.substring(dot2 + 1).replace(/_/g, '');
        if (f[f.length - 1] === '0') node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber2.stringifyNumber,
  };
  float.float = float$12;
  float.floatExp = floatExp;
  float.floatNaN = floatNaN;
  return float;
}
var int = {};
var hasRequiredInt;
function requireInt() {
  if (hasRequiredInt) return int;
  hasRequiredInt = 1;
  var stringifyNumber2 = requireStringifyNumber();
  const intIdentify = (value) =>
    typeof value === 'bigint' || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === '-' || sign === '+') offset += 1;
    str = str.substring(offset).replace(/_/g, '');
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n2 = BigInt(str);
      return sign === '-' ? BigInt(-1) * n2 : n2;
    }
    const n = parseInt(str, radix);
    return sign === '-' ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber2.stringifyNumber(node);
  }
  const intBin = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'BIN',
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, '0b'),
  };
  const intOct = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'OCT',
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, '0'),
  };
  const int$12 = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber2.stringifyNumber,
  };
  const intHex = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'HEX',
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, '0x'),
  };
  int.int = int$12;
  int.intBin = intBin;
  int.intHex = intHex;
  int.intOct = intOct;
  return int;
}
var set$1 = {};
var hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set$1;
  hasRequiredSet = 1;
  var identity2 = requireIdentity();
  var Pair2 = requirePair();
  var YAMLMap2 = requireYAMLMap();
  class YAMLSet extends YAMLMap2.YAMLMap {
    constructor(schema2) {
      super(schema2);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity2.isPair(key)) pair = key;
      else if (
        key &&
        typeof key === 'object' &&
        'key' in key &&
        'value' in key &&
        key.value === null
      )
        pair = new Pair2.Pair(key.key, null);
      else pair = new Pair2.Pair(key, null);
      const prev = YAMLMap2.findPair(this.items, pair.key);
      if (!prev) this.items.push(pair);
    }
    /**
     * If `keepPair` is `true`, returns the Pair matching `key`.
     * Otherwise, returns the value of that Pair's key.
     */
    get(key, keepPair) {
      const pair = YAMLMap2.findPair(this.items, key);
      return !keepPair && identity2.isPair(pair)
        ? identity2.isScalar(pair.key)
          ? pair.key.value
          : pair.key
        : pair;
    }
    set(key, value) {
      if (typeof value !== 'boolean')
        throw new Error(
          `Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`,
        );
      const prev = YAMLMap2.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair2.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(
          Object.assign({}, ctx, { allNullValues: true }),
          onComment,
          onChompKeep,
        );
      else throw new Error('Set items must all have null values');
    }
    static from(schema2, iterable, ctx) {
      const { replacer } = ctx;
      const set3 = new this(schema2);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === 'function')
            value = replacer.call(iterable, value, value);
          set3.items.push(Pair2.createPair(value, null, ctx));
        }
      return set3;
    }
  }
  YAMLSet.tag = 'tag:yaml.org,2002:set';
  const set2 = {
    collection: 'map',
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: 'tag:yaml.org,2002:set',
    createNode: (schema2, iterable, ctx) =>
      YAMLSet.from(schema2, iterable, ctx),
    resolve(map2, onError) {
      if (identity2.isMap(map2)) {
        if (map2.hasAllNullValues(true))
          return Object.assign(new YAMLSet(), map2);
        else onError('Set items must all have null values');
      } else onError('Expected a mapping for this tag');
      return map2;
    },
  };
  set$1.YAMLSet = YAMLSet;
  set$1.set = set2;
  return set$1;
}
var timestamp = {};
var hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  var stringifyNumber2 = requireStringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === '-' || sign === '+' ? str.substring(1) : str;
    const num = (n) => (asBigInt ? BigInt(n) : Number(n));
    const res = parts
      .replace(/_/g, '')
      .split(':')
      .reduce((res2, p) => res2 * num(60) + num(p), num(0));
    return sign === '-' ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === 'bigint') num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber2.stringifyNumber(node);
    let sign = '';
    if (value < 0) {
      sign = '-';
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return (
      sign +
      parts
        .map((n) => String(n).padStart(2, '0'))
        .join(':')
        .replace(/000000\d*$/, '')
    );
  }
  const intTime = {
    identify: (value) => typeof value === 'bigint' || Number.isInteger(value),
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'TIME',
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) =>
      parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal,
  };
  const floatTime = {
    identify: (value) => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'TIME',
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal,
  };
  const timestamp$1 = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: 'tag:yaml.org,2002:timestamp',
    // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
    // may be omitted altogether, resulting in a date format. In such a case, the time part is
    // assumed to be 00:00:00Z (start of day, UTC).
    test: RegExp(
      '^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$',
    ),
    resolve(str) {
      const match = str.match(timestamp$1.test);
      if (!match)
        throw new Error('!!timestamp expects a date, starting with yyyy-mm-dd');
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + '00').substr(1, 3)) : 0;
      let date = Date.UTC(
        year,
        month - 1,
        day,
        hour || 0,
        minute || 0,
        second || 0,
        millisec,
      );
      const tz = match[8];
      if (tz && tz !== 'Z') {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30) d *= 60;
        date -= 6e4 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) =>
      value?.toISOString().replace(/(T00:00:00)?\.000Z$/, '') ?? '',
  };
  timestamp.floatTime = floatTime;
  timestamp.intTime = intTime;
  timestamp.timestamp = timestamp$1;
  return timestamp;
}
var hasRequiredSchema$1;
function requireSchema$1() {
  if (hasRequiredSchema$1) return schema;
  hasRequiredSchema$1 = 1;
  var map2 = requireMap();
  var _null2 = require_null();
  var seq2 = requireSeq();
  var string2 = requireString();
  var binary2 = requireBinary();
  var bool2 = requireBool();
  var float2 = requireFloat();
  var int2 = requireInt();
  var merge2 = requireMerge();
  var omap2 = requireOmap();
  var pairs2 = requirePairs();
  var set2 = requireSet();
  var timestamp2 = requireTimestamp();
  const schema$12 = [
    map2.map,
    seq2.seq,
    string2.string,
    _null2.nullTag,
    bool2.trueTag,
    bool2.falseTag,
    int2.intBin,
    int2.intOct,
    int2.int,
    int2.intHex,
    float2.floatNaN,
    float2.floatExp,
    float2.float,
    binary2.binary,
    merge2.merge,
    omap2.omap,
    pairs2.pairs,
    set2.set,
    timestamp2.intTime,
    timestamp2.floatTime,
    timestamp2.timestamp,
  ];
  schema.schema = schema$12;
  return schema;
}
var hasRequiredTags;
function requireTags() {
  if (hasRequiredTags) return tags;
  hasRequiredTags = 1;
  var map2 = requireMap();
  var _null2 = require_null();
  var seq2 = requireSeq();
  var string2 = requireString();
  var bool2 = requireBool$1();
  var float2 = requireFloat$1();
  var int2 = requireInt$1();
  var schema2 = requireSchema$3();
  var schema$12 = requireSchema$2();
  var binary2 = requireBinary();
  var merge2 = requireMerge();
  var omap2 = requireOmap();
  var pairs2 = requirePairs();
  var schema$22 = requireSchema$1();
  var set2 = requireSet();
  var timestamp2 = requireTimestamp();
  const schemas = /* @__PURE__ */ new Map([
    ['core', schema2.schema],
    ['failsafe', [map2.map, seq2.seq, string2.string]],
    ['json', schema$12.schema],
    ['yaml11', schema$22.schema],
    ['yaml-1.1', schema$22.schema],
  ]);
  const tagsByName = {
    binary: binary2.binary,
    bool: bool2.boolTag,
    float: float2.float,
    floatExp: float2.floatExp,
    floatNaN: float2.floatNaN,
    floatTime: timestamp2.floatTime,
    int: int2.int,
    intHex: int2.intHex,
    intOct: int2.intOct,
    intTime: timestamp2.intTime,
    map: map2.map,
    merge: merge2.merge,
    null: _null2.nullTag,
    omap: omap2.omap,
    pairs: pairs2.pairs,
    seq: seq2.seq,
    set: set2.set,
    timestamp: timestamp2.timestamp,
  };
  const coreKnownTags = {
    'tag:yaml.org,2002:binary': binary2.binary,
    'tag:yaml.org,2002:merge': merge2.merge,
    'tag:yaml.org,2002:omap': omap2.omap,
    'tag:yaml.org,2002:pairs': pairs2.pairs,
    'tag:yaml.org,2002:set': set2.set,
    'tag:yaml.org,2002:timestamp': timestamp2.timestamp,
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge2.merge)
        ? schemaTags.concat(merge2.merge)
        : schemaTags.slice();
    }
    let tags2 = schemaTags;
    if (!tags2) {
      if (Array.isArray(customTags)) tags2 = [];
      else {
        const keys = Array.from(schemas.keys())
          .filter((key) => key !== 'yaml11')
          .map((key) => JSON.stringify(key))
          .join(', ');
        throw new Error(
          `Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`,
        );
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags) tags2 = tags2.concat(tag);
    } else if (typeof customTags === 'function') {
      tags2 = customTags(tags2.slice());
    }
    if (addMergeTag) tags2 = tags2.concat(merge2.merge);
    return tags2.reduce((tags3, tag) => {
      const tagObj = typeof tag === 'string' ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName)
          .map((key) => JSON.stringify(key))
          .join(', ');
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags3.includes(tagObj)) tags3.push(tagObj);
      return tags3;
    }, []);
  }
  tags.coreKnownTags = coreKnownTags;
  tags.getTags = getTags;
  return tags;
}
var hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return Schema;
  hasRequiredSchema = 1;
  var identity2 = requireIdentity();
  var map2 = requireMap();
  var seq2 = requireSeq();
  var string2 = requireString();
  var tags2 = requireTags();
  const sortMapEntriesByKey = (a, b) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  let Schema$1 = class Schema2 {
    constructor({
      compat,
      customTags,
      merge: merge2,
      resolveKnownTags,
      schema: schema2,
      sortMapEntries,
      toStringDefaults,
    }) {
      this.compat = Array.isArray(compat)
        ? tags2.getTags(compat, 'compat')
        : compat
          ? tags2.getTags(null, compat)
          : null;
      this.name = (typeof schema2 === 'string' && schema2) || 'core';
      this.knownTags = resolveKnownTags ? tags2.coreKnownTags : {};
      this.tags = tags2.getTags(customTags, this.name, merge2);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity2.MAP, { value: map2.map });
      Object.defineProperty(this, identity2.SCALAR, { value: string2.string });
      Object.defineProperty(this, identity2.SEQ, { value: seq2.seq });
      this.sortMapEntries =
        typeof sortMapEntries === 'function'
          ? sortMapEntries
          : sortMapEntries === true
            ? sortMapEntriesByKey
            : null;
    }
    clone() {
      const copy2 = Object.create(
        Schema2.prototype,
        Object.getOwnPropertyDescriptors(this),
      );
      copy2.tags = this.tags.slice();
      return copy2;
    }
  };
  Schema.Schema = Schema$1;
  return Schema;
}
var stringifyDocument = {};
var hasRequiredStringifyDocument;
function requireStringifyDocument() {
  if (hasRequiredStringifyDocument) return stringifyDocument;
  hasRequiredStringifyDocument = 1;
  var identity2 = requireIdentity();
  var stringify2 = requireStringify();
  var stringifyComment2 = requireStringifyComment();
  function stringifyDocument$1(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart) hasDirectives = true;
    }
    if (hasDirectives) lines.push('---');
    const ctx = stringify2.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1) lines.unshift('');
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment2.indentComment(cs, ''));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity2.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives) lines.push('');
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment2.indentComment(cs, ''));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? void 0 : () => (chompKeep = true);
      let body = stringify2.stringify(
        doc.contents,
        ctx,
        () => (contentComment = null),
        onChompKeep,
      );
      if (contentComment)
        body += stringifyComment2.lineComment(
          body,
          '',
          commentString(contentComment),
        );
      if (
        (body[0] === '|' || body[0] === '>') &&
        lines[lines.length - 1] === '---'
      ) {
        lines[lines.length - 1] = `--- ${body}`;
      } else lines.push(body);
    } else {
      lines.push(stringify2.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes('\n')) {
          lines.push('...');
          lines.push(stringifyComment2.indentComment(cs, ''));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push('...');
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep) dc = dc.replace(/^\n+/, '');
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '')
          lines.push('');
        lines.push(stringifyComment2.indentComment(commentString(dc), ''));
      }
    }
    return lines.join('\n') + '\n';
  }
  stringifyDocument.stringifyDocument = stringifyDocument$1;
  return stringifyDocument;
}
var hasRequiredDocument;
function requireDocument() {
  if (hasRequiredDocument) return Document;
  hasRequiredDocument = 1;
  var Alias2 = requireAlias();
  var Collection2 = requireCollection();
  var identity2 = requireIdentity();
  var Pair2 = requirePair();
  var toJS2 = requireToJS();
  var Schema2 = requireSchema();
  var stringifyDocument2 = requireStringifyDocument();
  var anchors2 = requireAnchors();
  var applyReviver2 = requireApplyReviver();
  var createNode2 = requireCreateNode();
  var directives2 = requireDirectives();
  let Document$1 = class Document2 {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity2.NODE_TYPE, {
        value: identity2.DOC,
      });
      let _replacer = null;
      if (typeof replacer === 'function' || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
        replacer = void 0;
      }
      const opt = Object.assign(
        {
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: 'warn',
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: '1.2',
        },
        options,
      );
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else this.directives = new directives2.Directives({ version });
      this.setSchema(version, options);
      this.contents =
        value === void 0 ? null : this.createNode(value, _replacer, options);
    }
    /**
     * Create a deep copy of this Document and its contents.
     *
     * Custom Node values that inherit from `Object` still refer to their original instances.
     */
    clone() {
      const copy2 = Object.create(Document2.prototype, {
        [identity2.NODE_TYPE]: { value: identity2.DOC },
      });
      copy2.commentBefore = this.commentBefore;
      copy2.comment = this.comment;
      copy2.errors = this.errors.slice();
      copy2.warnings = this.warnings.slice();
      copy2.options = Object.assign({}, this.options);
      if (this.directives) copy2.directives = this.directives.clone();
      copy2.schema = this.schema.clone();
      copy2.contents = identity2.isNode(this.contents)
        ? this.contents.clone(copy2.schema)
        : this.contents;
      if (this.range) copy2.range = this.range.slice();
      return copy2;
    }
    /** Adds a value to the document. */
    add(value) {
      if (assertCollection(this.contents)) this.contents.add(value);
    }
    /** Adds a value to the document. */
    addIn(path2, value) {
      if (assertCollection(this.contents)) this.contents.addIn(path2, value);
    }
    /**
     * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
     *
     * If `node` already has an anchor, `name` is ignored.
     * Otherwise, the `node.anchor` value will be set to `name`,
     * or if an anchor with that name is already present in the document,
     * `name` will be used as a prefix for a new unique anchor.
     * If `name` is undefined, the generated anchor will use 'a' as a prefix.
     */
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors2.anchorNames(this);
        node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name)
            ? anchors2.findNewAnchor(name || 'a', prev)
            : name;
      }
      return new Alias2.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = void 0;
      if (typeof replacer === 'function') {
        value = replacer.call({ '': value }, '', value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) =>
          typeof v === 'number' || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0) replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
        replacer = void 0;
      }
      const {
        aliasDuplicateObjects,
        anchorPrefix,
        flow,
        keepUndefined,
        onTagObj,
        tag,
      } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } =
        anchors2.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || 'a',
        );
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects,
      };
      const node = createNode2.createNode(value, tag, ctx);
      if (flow && identity2.isCollection(node)) node.flow = true;
      setAnchors();
      return node;
    }
    /**
     * Convert a key and a value into a `Pair` using the current schema,
     * recursively wrapping all values as `Scalar` or `Collection` nodes.
     */
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair2.Pair(k, v);
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
      return assertCollection(this.contents)
        ? this.contents.delete(key)
        : false;
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path2) {
      if (Collection2.isEmptyPath(path2)) {
        if (this.contents == null) return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents)
        ? this.contents.deleteIn(path2)
        : false;
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    get(key, keepScalar) {
      return identity2.isCollection(this.contents)
        ? this.contents.get(key, keepScalar)
        : void 0;
    }
    /**
     * Returns item at `path`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path2, keepScalar) {
      if (Collection2.isEmptyPath(path2))
        return !keepScalar && identity2.isScalar(this.contents)
          ? this.contents.value
          : this.contents;
      return identity2.isCollection(this.contents)
        ? this.contents.getIn(path2, keepScalar)
        : void 0;
    }
    /**
     * Checks if the document includes a value with the key `key`.
     */
    has(key) {
      return identity2.isCollection(this.contents)
        ? this.contents.has(key)
        : false;
    }
    /**
     * Checks if the document includes a value at `path`.
     */
    hasIn(path2) {
      if (Collection2.isEmptyPath(path2)) return this.contents !== void 0;
      return identity2.isCollection(this.contents)
        ? this.contents.hasIn(path2)
        : false;
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection2.collectionFromPath(
          this.schema,
          [key],
          value,
        );
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path2, value) {
      if (Collection2.isEmptyPath(path2)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection2.collectionFromPath(
          this.schema,
          Array.from(path2),
          value,
        );
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path2, value);
      }
    }
    /**
     * Change the YAML version and schema used by the document.
     * A `null` version disables support for directives, explicit tags, anchors, and aliases.
     * It also requires the `schema` option to be given as a `Schema` instance value.
     *
     * Overrides all previously set schema options.
     */
    setSchema(version, options = {}) {
      if (typeof version === 'number') version = String(version);
      let opt;
      switch (version) {
        case '1.1':
          if (this.directives) this.directives.yaml.version = '1.1';
          else this.directives = new directives2.Directives({ version: '1.1' });
          opt = { resolveKnownTags: false, schema: 'yaml-1.1' };
          break;
        case '1.2':
        case 'next':
          if (this.directives) this.directives.yaml.version = version;
          else this.directives = new directives2.Directives({ version });
          opt = { resolveKnownTags: true, schema: 'core' };
          break;
        case null:
          if (this.directives) delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(
            `Expected '1.1', '1.2' or null as first argument, but found: ${sv}`,
          );
        }
      }
      if (options.schema instanceof Object) this.schema = options.schema;
      else if (opt)
        this.schema = new Schema2.Schema(Object.assign(opt, options));
      else
        throw new Error(
          `With a null YAML version, the { schema: Schema } option is required`,
        );
    }
    // json & jsonArg are only used from toJSON()
    toJS({
      json: json2,
      jsonArg,
      mapAsMap,
      maxAliasCount,
      onAnchor,
      reviver,
    } = {}) {
      const ctx = {
        anchors: /* @__PURE__ */ new Map(),
        doc: this,
        keep: !json2,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === 'number' ? maxAliasCount : 100,
      };
      const res = toJS2.toJS(this.contents, jsonArg ?? '', ctx);
      if (typeof onAnchor === 'function')
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === 'function'
        ? applyReviver2.applyReviver(reviver, { '': res }, '', res)
        : res;
    }
    /**
     * A JSON representation of the document `contents`.
     *
     * @param jsonArg Used by `JSON.stringify` to indicate the array index or
     *   property name.
     */
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    /** A YAML representation of the document. */
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error('Document with errors cannot be stringified');
      if (
        'indent' in options &&
        (!Number.isInteger(options.indent) || Number(options.indent) <= 0)
      ) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument2.stringifyDocument(this, options);
    }
  };
  function assertCollection(contents) {
    if (identity2.isCollection(contents)) return true;
    throw new Error('Expected a YAML collection as document contents');
  }
  Document.Document = Document$1;
  return Document;
}
var errors = {};
var hasRequiredErrors;
function requireErrors() {
  if (hasRequiredErrors) return errors;
  hasRequiredErrors = 1;
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }
  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super('YAMLParseError', pos, code, message);
    }
  }
  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super('YAMLWarning', pos, code, message);
    }
  }
  const prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1) return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src
      .substring(lc.lineStarts[line - 1], lc.lineStarts[line])
      .replace(/[\n\r]+$/, '');
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = '…' + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80) lineStr = lineStr.substring(0, 79) + '…';
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(
        lc.lineStarts[line - 2],
        lc.lineStarts[line - 1],
      );
      if (prev.length > 80) prev = prev.substring(0, 79) + '…\n';
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = ' '.repeat(ci) + '^'.repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  errors.YAMLError = YAMLError;
  errors.YAMLParseError = YAMLParseError;
  errors.YAMLWarning = YAMLWarning;
  errors.prettifyError = prettifyError;
  return errors;
}
var composeDoc = {};
var composeNode = {};
var composeCollection = {};
var resolveBlockMap = {};
var resolveProps = {};
var hasRequiredResolveProps;
function requireResolveProps() {
  if (hasRequiredResolveProps) return resolveProps;
  hasRequiredResolveProps = 1;
  function resolveProps$1(
    tokens,
    { flow, indicator, next, offset, onError, parentIndent, startOnNewline },
  ) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = '';
    let commentSep = '';
    let hasNewline = false;
    let reqSpace = false;
    let tab2 = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (
          token.type !== 'space' &&
          token.type !== 'newline' &&
          token.type !== 'comma'
        )
          onError(
            token.offset,
            'MISSING_CHAR',
            'Tags and anchors must be separated from the next token by white space',
          );
        reqSpace = false;
      }
      if (tab2) {
        if (atNewline && token.type !== 'comment' && token.type !== 'newline') {
          onError(tab2, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation');
        }
        tab2 = null;
      }
      switch (token.type) {
        case 'space':
          if (
            !flow &&
            (indicator !== 'doc-start' || next?.type !== 'flow-collection') &&
            token.source.includes('	')
          ) {
            tab2 = token;
          }
          hasSpace = true;
          break;
        case 'comment': {
          if (!hasSpace)
            onError(
              token,
              'MISSING_CHAR',
              'Comments must be separated from other tokens by white space characters',
            );
          const cb = token.source.substring(1) || ' ';
          if (!comment) comment = cb;
          else comment += commentSep + cb;
          commentSep = '';
          atNewline = false;
          break;
        }
        case 'newline':
          if (atNewline) {
            if (comment) comment += token.source;
            else if (!found || indicator !== 'seq-item-ind') spaceBefore = true;
          } else commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag) newlineAfterProp = token;
          hasSpace = true;
          break;
        case 'anchor':
          if (anchor)
            onError(
              token,
              'MULTIPLE_ANCHORS',
              'A node can have at most one anchor',
            );
          if (token.source.endsWith(':'))
            onError(
              token.offset + token.source.length - 1,
              'BAD_ALIAS',
              'Anchor ending in : is ambiguous',
              true,
            );
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case 'tag': {
          if (tag)
            onError(token, 'MULTIPLE_TAGS', 'A node can have at most one tag');
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(
              token,
              'BAD_PROP_ORDER',
              `Anchors and tags must be after the ${token.source} indicator`,
            );
          if (found)
            onError(
              token,
              'UNEXPECTED_TOKEN',
              `Unexpected ${token.source} in ${flow ?? 'collection'}`,
            );
          found = token;
          atNewline =
            indicator === 'seq-item-ind' || indicator === 'explicit-key-ind';
          hasSpace = false;
          break;
        case 'comma':
          if (flow) {
            if (comma)
              onError(token, 'UNEXPECTED_TOKEN', `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        // else fallthrough
        default:
          onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (
      reqSpace &&
      next &&
      next.type !== 'space' &&
      next.type !== 'newline' &&
      next.type !== 'comma' &&
      (next.type !== 'scalar' || next.source !== '')
    ) {
      onError(
        next.offset,
        'MISSING_CHAR',
        'Tags and anchors must be separated from the next token by white space',
      );
    }
    if (
      tab2 &&
      ((atNewline && tab2.indent <= parentIndent) ||
        next?.type === 'block-map' ||
        next?.type === 'block-seq')
    )
      onError(tab2, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation');
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end,
    };
  }
  resolveProps.resolveProps = resolveProps$1;
  return resolveProps;
}
var utilContainsNewline = {};
var hasRequiredUtilContainsNewline;
function requireUtilContainsNewline() {
  if (hasRequiredUtilContainsNewline) return utilContainsNewline;
  hasRequiredUtilContainsNewline = 1;
  function containsNewline(key) {
    if (!key) return null;
    switch (key.type) {
      case 'alias':
      case 'scalar':
      case 'double-quoted-scalar':
      case 'single-quoted-scalar':
        if (key.source.includes('\n')) return true;
        if (key.end) {
          for (const st of key.end) if (st.type === 'newline') return true;
        }
        return false;
      case 'flow-collection':
        for (const it of key.items) {
          for (const st of it.start) if (st.type === 'newline') return true;
          if (it.sep) {
            for (const st of it.sep) if (st.type === 'newline') return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value)) return true;
        }
        return false;
      default:
        return true;
    }
  }
  utilContainsNewline.containsNewline = containsNewline;
  return utilContainsNewline;
}
var utilFlowIndentCheck = {};
var hasRequiredUtilFlowIndentCheck;
function requireUtilFlowIndentCheck() {
  if (hasRequiredUtilFlowIndentCheck) return utilFlowIndentCheck;
  hasRequiredUtilFlowIndentCheck = 1;
  var utilContainsNewline2 = requireUtilContainsNewline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === 'flow-collection') {
      const end = fc.end[0];
      if (
        end.indent === indent &&
        (end.source === ']' || end.source === '}') &&
        utilContainsNewline2.containsNewline(fc)
      ) {
        const msg = 'Flow end indicator should be more indented than parent';
        onError(end, 'BAD_INDENT', msg, true);
      }
    }
  }
  utilFlowIndentCheck.flowIndentCheck = flowIndentCheck;
  return utilFlowIndentCheck;
}
var utilMapIncludes = {};
var hasRequiredUtilMapIncludes;
function requireUtilMapIncludes() {
  if (hasRequiredUtilMapIncludes) return utilMapIncludes;
  hasRequiredUtilMapIncludes = 1;
  var identity2 = requireIdentity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false) return false;
    const isEqual =
      typeof uniqueKeys === 'function'
        ? uniqueKeys
        : (a, b) =>
            a === b ||
            (identity2.isScalar(a) &&
              identity2.isScalar(b) &&
              a.value === b.value);
    return items.some((pair) => isEqual(pair.key, search));
  }
  utilMapIncludes.mapIncludes = mapIncludes;
  return utilMapIncludes;
}
var hasRequiredResolveBlockMap;
function requireResolveBlockMap() {
  if (hasRequiredResolveBlockMap) return resolveBlockMap;
  hasRequiredResolveBlockMap = 1;
  var Pair2 = requirePair();
  var YAMLMap2 = requireYAMLMap();
  var resolveProps2 = requireResolveProps();
  var utilContainsNewline2 = requireUtilContainsNewline();
  var utilFlowIndentCheck2 = requireUtilFlowIndentCheck();
  var utilMapIncludes2 = requireUtilMapIncludes();
  const startColMsg = 'All mapping items must start at the same column';
  function resolveBlockMap$1(
    { composeNode: composeNode2, composeEmptyNode },
    ctx,
    bm,
    onError,
    tag,
  ) {
    const NodeClass = tag?.nodeClass ?? YAMLMap2.YAMLMap;
    const map2 = new NodeClass(ctx.schema);
    if (ctx.atRoot) ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps2.resolveProps(start, {
        indicator: 'explicit-key-ind',
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true,
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === 'block-seq')
            onError(
              offset,
              'BLOCK_AS_IMPLICIT_KEY',
              'A block sequence may not be used as an implicit map key',
            );
          else if ('indent' in key && key.indent !== bm.indent)
            onError(offset, 'BAD_INDENT', startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map2.comment) map2.comment += '\n' + keyProps.comment;
            else map2.comment = keyProps.comment;
          }
          continue;
        }
        if (
          keyProps.newlineAfterProp ||
          utilContainsNewline2.containsNewline(key)
        ) {
          onError(
            key ?? start[start.length - 1],
            'MULTILINE_IMPLICIT_KEY',
            'Implicit keys need to be on a single line',
          );
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, 'BAD_INDENT', startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key
        ? composeNode2(ctx, key, keyProps, onError)
        : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck2.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes2.mapIncludes(ctx, map2.items, keyNode))
        onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
      const valueProps = resolveProps2.resolveProps(sep ?? [], {
        indicator: 'map-value-ind',
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === 'block-scalar',
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === 'block-map' && !valueProps.hasNewline)
            onError(
              offset,
              'BLOCK_AS_IMPLICIT_KEY',
              'Nested mappings are not allowed in compact mappings',
            );
          if (
            ctx.options.strict &&
            keyProps.start < valueProps.found.offset - 1024
          )
            onError(
              keyNode.range,
              'KEY_OVER_1024_CHARS',
              'The : indicator must be at most 1024 chars after the start of an implicit block mapping key',
            );
        }
        const valueNode = value
          ? composeNode2(ctx, value, valueProps, onError)
          : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck2.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair2.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
        map2.items.push(pair);
      } else {
        if (implicitKey)
          onError(
            keyNode.range,
            'MISSING_CHAR',
            'Implicit map keys need to be followed by map values',
          );
        if (valueProps.comment) {
          if (keyNode.comment) keyNode.comment += '\n' + valueProps.comment;
          else keyNode.comment = valueProps.comment;
        }
        const pair = new Pair2.Pair(keyNode);
        if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
        map2.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, 'IMPOSSIBLE', 'Map comment with trailing content');
    map2.range = [bm.offset, offset, commentEnd ?? offset];
    return map2;
  }
  resolveBlockMap.resolveBlockMap = resolveBlockMap$1;
  return resolveBlockMap;
}
var resolveBlockSeq = {};
var hasRequiredResolveBlockSeq;
function requireResolveBlockSeq() {
  if (hasRequiredResolveBlockSeq) return resolveBlockSeq;
  hasRequiredResolveBlockSeq = 1;
  var YAMLSeq2 = requireYAMLSeq();
  var resolveProps2 = requireResolveProps();
  var utilFlowIndentCheck2 = requireUtilFlowIndentCheck();
  function resolveBlockSeq$1(
    { composeNode: composeNode2, composeEmptyNode },
    ctx,
    bs,
    onError,
    tag,
  ) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq2.YAMLSeq;
    const seq2 = new NodeClass(ctx.schema);
    if (ctx.atRoot) ctx.atRoot = false;
    if (ctx.atKey) ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps2.resolveProps(start, {
        indicator: 'seq-item-ind',
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true,
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === 'block-seq')
            onError(
              props.end,
              'BAD_INDENT',
              'All sequence items must start at the same column',
            );
          else
            onError(
              offset,
              'MISSING_CHAR',
              'Sequence item without - indicator',
            );
        } else {
          commentEnd = props.end;
          if (props.comment) seq2.comment = props.comment;
          continue;
        }
      }
      const node = value
        ? composeNode2(ctx, value, props, onError)
        : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck2.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq2.items.push(node);
    }
    seq2.range = [bs.offset, offset, commentEnd ?? offset];
    return seq2;
  }
  resolveBlockSeq.resolveBlockSeq = resolveBlockSeq$1;
  return resolveBlockSeq;
}
var resolveFlowCollection = {};
var resolveEnd = {};
var hasRequiredResolveEnd;
function requireResolveEnd() {
  if (hasRequiredResolveEnd) return resolveEnd;
  hasRequiredResolveEnd = 1;
  function resolveEnd$1(end, offset, reqSpace, onError) {
    let comment = '';
    if (end) {
      let hasSpace = false;
      let sep = '';
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case 'space':
            hasSpace = true;
            break;
          case 'comment': {
            if (reqSpace && !hasSpace)
              onError(
                token,
                'MISSING_CHAR',
                'Comments must be separated from other tokens by white space characters',
              );
            const cb = source.substring(1) || ' ';
            if (!comment) comment = cb;
            else comment += sep + cb;
            sep = '';
            break;
          }
          case 'newline':
            if (comment) sep += source;
            hasSpace = true;
            break;
          default:
            onError(
              token,
              'UNEXPECTED_TOKEN',
              `Unexpected ${type} at node end`,
            );
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  resolveEnd.resolveEnd = resolveEnd$1;
  return resolveEnd;
}
var hasRequiredResolveFlowCollection;
function requireResolveFlowCollection() {
  if (hasRequiredResolveFlowCollection) return resolveFlowCollection;
  hasRequiredResolveFlowCollection = 1;
  var identity2 = requireIdentity();
  var Pair2 = requirePair();
  var YAMLMap2 = requireYAMLMap();
  var YAMLSeq2 = requireYAMLSeq();
  var resolveEnd2 = requireResolveEnd();
  var resolveProps2 = requireResolveProps();
  var utilContainsNewline2 = requireUtilContainsNewline();
  var utilMapIncludes2 = requireUtilMapIncludes();
  const blockMsg = 'Block collections are not allowed within flow collections';
  const isBlock = (token) =>
    token && (token.type === 'block-map' || token.type === 'block-seq');
  function resolveFlowCollection$1(
    { composeNode: composeNode2, composeEmptyNode },
    ctx,
    fc,
    onError,
    tag,
  ) {
    const isMap = fc.start.source === '{';
    const fcName = isMap ? 'flow map' : 'flow sequence';
    const NodeClass =
      tag?.nodeClass ?? (isMap ? YAMLMap2.YAMLMap : YAMLSeq2.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot) ctx.atRoot = false;
    if (ctx.atKey) ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0; i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps2.resolveProps(start, {
        flow: fcName,
        indicator: 'explicit-key-ind',
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false,
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(
              props.comma,
              'UNEXPECTED_TOKEN',
              `Unexpected , in ${fcName}`,
            );
          else if (i < fc.items.length - 1)
            onError(
              props.start,
              'UNEXPECTED_TOKEN',
              `Unexpected empty item in ${fcName}`,
            );
          if (props.comment) {
            if (coll.comment) coll.comment += '\n' + props.comment;
            else coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (
          !isMap &&
          ctx.options.strict &&
          utilContainsNewline2.containsNewline(key)
        )
          onError(
            key,
            // checked by containsNewline()
            'MULTILINE_IMPLICIT_KEY',
            'Implicit keys of flow sequence pairs need to be on a single line',
          );
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(
            props.start,
            'MISSING_CHAR',
            `Missing , between ${fcName} items`,
          );
        if (props.comment) {
          let prevItemComment = '';
          loop: for (const st of start) {
            switch (st.type) {
              case 'comma':
              case 'space':
                break;
              case 'comment':
                prevItemComment = st.source.substring(1);
                break loop;
              default:
                break loop;
            }
          }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity2.isPair(prev)) prev = prev.value ?? prev.key;
            if (prev.comment) prev.comment += '\n' + prevItemComment;
            else prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value
          ? composeNode2(ctx, value, props, onError)
          : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value)) onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key
          ? composeNode2(ctx, key, props, onError)
          : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key)) onError(keyNode.range, 'BLOCK_IN_FLOW', blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps2.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: 'map-value-ind',
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false,
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found) break;
                if (st.type === 'newline') {
                  onError(
                    st,
                    'MULTILINE_IMPLICIT_KEY',
                    'Implicit keys of flow sequence pairs need to be on a single line',
                  );
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(
                valueProps.found,
                'KEY_OVER_1024_CHARS',
                'The : indicator must be at most 1024 chars after the start of an implicit flow sequence key',
              );
          }
        } else if (value) {
          if ('source' in value && value.source?.[0] === ':')
            onError(
              value,
              'MISSING_CHAR',
              `Missing space after : in ${fcName}`,
            );
          else
            onError(
              valueProps.start,
              'MISSING_CHAR',
              `Missing , or : between ${fcName} items`,
            );
        }
        const valueNode = value
          ? composeNode2(ctx, value, valueProps, onError)
          : valueProps.found
            ? composeEmptyNode(
                ctx,
                valueProps.end,
                sep,
                null,
                valueProps,
                onError,
              )
            : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment) keyNode.comment += '\n' + valueProps.comment;
          else keyNode.comment = valueProps.comment;
        }
        const pair = new Pair2.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
        if (isMap) {
          const map2 = coll;
          if (utilMapIncludes2.mapIncludes(ctx, map2.items, keyNode))
            onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
          map2.items.push(pair);
        } else {
          const map2 = new YAMLMap2.YAMLMap(ctx.schema);
          map2.flow = true;
          map2.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map2.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map2);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? '}' : ']';
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd) cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot
        ? `${name} must end with a ${expectedEnd}`
        : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? 'MISSING_CHAR' : 'BAD_INDENT', msg);
      if (ce && ce.source.length !== 1) ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd2.resolveEnd(
        ee,
        cePos,
        ctx.options.strict,
        onError,
      );
      if (end.comment) {
        if (coll.comment) coll.comment += '\n' + end.comment;
        else coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  resolveFlowCollection.resolveFlowCollection = resolveFlowCollection$1;
  return resolveFlowCollection;
}
var hasRequiredComposeCollection;
function requireComposeCollection() {
  if (hasRequiredComposeCollection) return composeCollection;
  hasRequiredComposeCollection = 1;
  var identity2 = requireIdentity();
  var Scalar2 = requireScalar();
  var YAMLMap2 = requireYAMLMap();
  var YAMLSeq2 = requireYAMLSeq();
  var resolveBlockMap2 = requireResolveBlockMap();
  var resolveBlockSeq2 = requireResolveBlockSeq();
  var resolveFlowCollection2 = requireResolveFlowCollection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll =
      token.type === 'block-map'
        ? resolveBlockMap2.resolveBlockMap(CN, ctx, token, onError, tag)
        : token.type === 'block-seq'
          ? resolveBlockSeq2.resolveBlockSeq(CN, ctx, token, onError, tag)
          : resolveFlowCollection2.resolveFlowCollection(
              CN,
              ctx,
              token,
              onError,
              tag,
            );
    const Coll = coll.constructor;
    if (tagName === '!' || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName) coll.tag = tagName;
    return coll;
  }
  function composeCollection$1(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken
      ? null
      : ctx.directives.tagName(tagToken.source, (msg) =>
          onError(tagToken, 'TAG_RESOLVE_FAILED', msg),
        );
    if (token.type === 'block-seq') {
      const { anchor, newlineAfterProp: nl2 } = props;
      const lastProp =
        anchor && tagToken
          ? anchor.offset > tagToken.offset
            ? anchor
            : tagToken
          : (anchor ?? tagToken);
      if (lastProp && (!nl2 || nl2.offset < lastProp.offset)) {
        const message = 'Missing newline after block sequence props';
        onError(lastProp, 'MISSING_CHAR', message);
      }
    }
    const expType =
      token.type === 'block-map'
        ? 'map'
        : token.type === 'block-seq'
          ? 'seq'
          : token.start.source === '{'
            ? 'map'
            : 'seq';
    if (
      !tagToken ||
      !tagName ||
      tagName === '!' ||
      (tagName === YAMLMap2.YAMLMap.tagName && expType === 'map') ||
      (tagName === YAMLSeq2.YAMLSeq.tagName && expType === 'seq')
    ) {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find(
      (t) => t.tag === tagName && t.collection === expType,
    );
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(
            tagToken,
            'BAD_COLLECTION_TYPE',
            `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? 'scalar'}`,
            true,
          );
        } else {
          onError(
            tagToken,
            'TAG_RESOLVE_FAILED',
            `Unresolved tag: ${tagName}`,
            true,
          );
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res =
      tag.resolve?.(
        coll,
        (msg) => onError(tagToken, 'TAG_RESOLVE_FAILED', msg),
        ctx.options,
      ) ?? coll;
    const node = identity2.isNode(res) ? res : new Scalar2.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format) node.format = tag.format;
    return node;
  }
  composeCollection.composeCollection = composeCollection$1;
  return composeCollection;
}
var composeScalar = {};
var resolveBlockScalar = {};
var hasRequiredResolveBlockScalar;
function requireResolveBlockScalar() {
  if (hasRequiredResolveBlockScalar) return resolveBlockScalar;
  hasRequiredResolveBlockScalar = 1;
  var Scalar2 = requireScalar();
  function resolveBlockScalar$1(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return {
        value: '',
        type: null,
        comment: '',
        range: [start, start, start],
      };
    const type =
      header.mode === '>'
        ? Scalar2.Scalar.BLOCK_FOLDED
        : Scalar2.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1; i >= 0; --i) {
      const content = lines[i][1];
      if (content === '' || content === '\r') chompStart = i;
      else break;
    }
    if (chompStart === 0) {
      const value2 =
        header.chomp === '+' && lines.length > 0
          ? '\n'.repeat(Math.max(1, lines.length - 1))
          : '';
      let end2 = start + header.length;
      if (scalar.source) end2 += scalar.source.length;
      return {
        value: value2,
        type,
        comment: header.comment,
        range: [start, end2, end2],
      };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0; i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === '' || content === '\r') {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message =
            'Block scalars with more-indented leading empty lines must use an explicit indentation indicator';
          onError(offset + indent.length, 'MISSING_CHAR', message);
        }
        if (header.indent === 0) trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = 'Block scalar values in collections must be indented';
          onError(offset, 'BAD_INDENT', message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1; i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent) chompStart = i + 1;
    }
    let value = '';
    let sep = '';
    let prevMoreIndented = false;
    for (let i = 0; i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + '\n';
    for (let i = contentStart; i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === '\r';
      if (crlf) content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent
          ? 'explicit indentation indicator'
          : 'first line';
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(
          offset - content.length - (crlf ? 2 : 1),
          'BAD_INDENT',
          message,
        );
        indent = '';
      }
      if (type === Scalar2.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = '\n';
      } else if (indent.length > trimIndent || content[0] === '	') {
        if (sep === ' ') sep = '\n';
        else if (!prevMoreIndented && sep === '\n') sep = '\n\n';
        value += sep + indent.slice(trimIndent) + content;
        sep = '\n';
        prevMoreIndented = true;
      } else if (content === '') {
        if (sep === '\n') value += '\n';
        else sep = '\n';
      } else {
        value += sep + content;
        sep = ' ';
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case '-':
        break;
      case '+':
        for (let i = chompStart; i < lines.length; ++i)
          value += '\n' + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== '\n') value += '\n';
        break;
      default:
        value += '\n';
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== 'block-scalar-header') {
      onError(props[0], 'IMPOSSIBLE', 'Block scalar header not found');
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = '';
    let error = -1;
    for (let i = 1; i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === '-' || ch === '+')) chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n) indent = n;
        else if (error === -1) error = offset + i;
      }
    }
    if (error !== -1)
      onError(
        error,
        'UNEXPECTED_TOKEN',
        `Block scalar header includes extra characters: ${source}`,
      );
    let hasSpace = false;
    let comment = '';
    let length2 = source.length;
    for (let i = 1; i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case 'space':
          hasSpace = true;
        // fallthrough
        case 'newline':
          length2 += token.source.length;
          break;
        case 'comment':
          if (strict && !hasSpace) {
            const message =
              'Comments must be separated from other tokens by white space characters';
            onError(token, 'MISSING_CHAR', message);
          }
          length2 += token.source.length;
          comment = token.source.substring(1);
          break;
        case 'error':
          onError(token, 'UNEXPECTED_TOKEN', token.message);
          length2 += token.source.length;
          break;
        /* istanbul ignore next should not happen */
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, 'UNEXPECTED_TOKEN', message);
          const ts = token.source;
          if (ts && typeof ts === 'string') length2 += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length: length2 };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ['', first];
    const lines = [line0];
    for (let i = 1; i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  resolveBlockScalar.resolveBlockScalar = resolveBlockScalar$1;
  return resolveBlockScalar;
}
var resolveFlowScalar = {};
var hasRequiredResolveFlowScalar;
function requireResolveFlowScalar() {
  if (hasRequiredResolveFlowScalar) return resolveFlowScalar;
  hasRequiredResolveFlowScalar = 1;
  var Scalar2 = requireScalar();
  var resolveEnd2 = requireResolveEnd();
  function resolveFlowScalar$1(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case 'scalar':
        _type = Scalar2.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case 'single-quoted-scalar':
        _type = Scalar2.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case 'double-quoted-scalar':
        _type = Scalar2.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      /* istanbul ignore next should not happen */
      default:
        onError(
          scalar,
          'UNEXPECTED_TOKEN',
          `Expected a flow scalar value, but found: ${type}`,
        );
        return {
          value: '',
          type: null,
          comment: '',
          range: [offset, offset + source.length, offset + source.length],
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd2.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset],
    };
  }
  function plainValue(source, onError) {
    let badChar = '';
    switch (source[0]) {
      /* istanbul ignore next should not happen */
      case '	':
        badChar = 'a tab character';
        break;
      case ',':
        badChar = 'flow indicator character ,';
        break;
      case '%':
        badChar = 'directive indicator character %';
        break;
      case '|':
      case '>': {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case '@':
      case '`': {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(
        0,
        'BAD_SCALAR_START',
        `Plain value cannot start with ${badChar}`,
      );
    return foldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, 'MISSING_CHAR', "Missing closing 'quote");
    return foldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function foldLines(source) {
    let first, line;
    try {
      first = new RegExp('(.*?)(?<![ 	])[ 	]*\r?\n', 'sy');
      line = new RegExp('[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n', 'sy');
    } catch {
      first = /(.*?)[ \t]*\r?\n/sy;
      line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
    }
    let match = first.exec(source);
    if (!match) return source;
    let res = match[1];
    let sep = ' ';
    let pos = first.lastIndex;
    line.lastIndex = pos;
    while ((match = line.exec(source))) {
      if (match[1] === '') {
        if (sep === '\n') res += sep;
        else sep = '\n';
      } else {
        res += sep + match[1];
        sep = ' ';
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? '');
  }
  function doubleQuotedValue(source, onError) {
    let res = '';
    for (let i = 1; i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === '\r' && source[i + 1] === '\n') continue;
      if (ch === '\n') {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === '\\') {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc) res += cc;
        else if (next === '\n') {
          next = source[i + 1];
          while (next === ' ' || next === '	') next = source[++i + 1];
        } else if (next === '\r' && source[i + 1] === '\n') {
          next = source[++i + 1];
          while (next === ' ' || next === '	') next = source[++i + 1];
        } else if (next === 'x' || next === 'u' || next === 'U') {
          const length2 = { x: 2, u: 4, U: 8 }[next];
          res += parseCharCode(source, i + 1, length2, onError);
          i += length2;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === ' ' || ch === '	') {
        const wsStart = i;
        let next = source[i + 1];
        while (next === ' ' || next === '	') next = source[++i + 1];
        if (next !== '\n' && !(next === '\r' && source[i + 2] === '\n'))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, 'MISSING_CHAR', 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = '';
    let ch = source[offset + 1];
    while (ch === ' ' || ch === '	' || ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[offset + 2] !== '\n') break;
      if (ch === '\n') fold += '\n';
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold) fold = ' ';
    return { fold, offset };
  }
  const escapeCodes = {
    0: '\0',
    // null character
    a: '\x07',
    // bell character
    b: '\b',
    // backspace
    e: '\x1B',
    // escape character
    f: '\f',
    // form feed
    n: '\n',
    // line feed
    r: '\r',
    // carriage return
    t: '	',
    // horizontal tab
    v: '\v',
    // vertical tab
    N: '',
    // Unicode next line
    _: ' ',
    // Unicode non-breaking space
    L: '\u2028',
    // Unicode line separator
    P: '\u2029',
    // Unicode paragraph separator
    ' ': ' ',
    '"': '"',
    '/': '/',
    '\\': '\\',
    '	': '	',
  };
  function parseCharCode(source, offset, length2, onError) {
    const cc = source.substr(offset, length2);
    const ok = cc.length === length2 && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    if (isNaN(code)) {
      const raw = source.substr(offset - 2, length2 + 2);
      onError(offset - 2, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${raw}`);
      return raw;
    }
    return String.fromCodePoint(code);
  }
  resolveFlowScalar.resolveFlowScalar = resolveFlowScalar$1;
  return resolveFlowScalar;
}
var hasRequiredComposeScalar;
function requireComposeScalar() {
  if (hasRequiredComposeScalar) return composeScalar;
  hasRequiredComposeScalar = 1;
  var identity2 = requireIdentity();
  var Scalar2 = requireScalar();
  var resolveBlockScalar2 = requireResolveBlockScalar();
  var resolveFlowScalar2 = requireResolveFlowScalar();
  function composeScalar$1(ctx, token, tagToken, onError) {
    const { value, type, comment, range } =
      token.type === 'block-scalar'
        ? resolveBlockScalar2.resolveBlockScalar(ctx, token, onError)
        : resolveFlowScalar2.resolveFlowScalar(
            token,
            ctx.options.strict,
            onError,
          );
    const tagName = tagToken
      ? ctx.directives.tagName(tagToken.source, (msg) =>
          onError(tagToken, 'TAG_RESOLVE_FAILED', msg),
        )
      : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity2.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === 'scalar')
      tag = findScalarTagByTest(ctx, value, token, onError);
    else tag = ctx.schema[identity2.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(
        value,
        (msg) => onError(tagToken ?? token, 'TAG_RESOLVE_FAILED', msg),
        ctx.options,
      );
      scalar = identity2.isScalar(res) ? res : new Scalar2.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, 'TAG_RESOLVE_FAILED', msg);
      scalar = new Scalar2.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type) scalar.type = type;
    if (tagName) scalar.tag = tagName;
    if (tag.format) scalar.format = tag.format;
    if (comment) scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema2, value, tagName, tagToken, onError) {
    if (tagName === '!') return schema2[identity2.SCALAR];
    const matchWithTest = [];
    for (const tag of schema2.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test) matchWithTest.push(tag);
        else return tag;
      }
    }
    for (const tag of matchWithTest) if (tag.test?.test(value)) return tag;
    const kt = schema2.knownTags[tagName];
    if (kt && !kt.collection) {
      schema2.tags.push(
        Object.assign({}, kt, { default: false, test: void 0 }),
      );
      return kt;
    }
    onError(
      tagToken,
      'TAG_RESOLVE_FAILED',
      `Unresolved tag: ${tagName}`,
      tagName !== 'tag:yaml.org,2002:str',
    );
    return schema2[identity2.SCALAR];
  }
  function findScalarTagByTest(
    { atKey, directives: directives2, schema: schema2 },
    value,
    token,
    onError,
  ) {
    const tag =
      schema2.tags.find(
        (tag2) =>
          (tag2.default === true || (atKey && tag2.default === 'key')) &&
          tag2.test?.test(value),
      ) || schema2[identity2.SCALAR];
    if (schema2.compat) {
      const compat =
        schema2.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ??
        schema2[identity2.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives2.tagString(tag.tag);
        const cs = directives2.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, 'TAG_RESOLVE_FAILED', msg, true);
      }
    }
    return tag;
  }
  composeScalar.composeScalar = composeScalar$1;
  return composeScalar;
}
var utilEmptyScalarPosition = {};
var hasRequiredUtilEmptyScalarPosition;
function requireUtilEmptyScalarPosition() {
  if (hasRequiredUtilEmptyScalarPosition) return utilEmptyScalarPosition;
  hasRequiredUtilEmptyScalarPosition = 1;
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1; i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case 'space':
          case 'comment':
          case 'newline':
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === 'space') {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  utilEmptyScalarPosition.emptyScalarPosition = emptyScalarPosition;
  return utilEmptyScalarPosition;
}
var hasRequiredComposeNode;
function requireComposeNode() {
  if (hasRequiredComposeNode) return composeNode;
  hasRequiredComposeNode = 1;
  var Alias2 = requireAlias();
  var identity2 = requireIdentity();
  var composeCollection2 = requireComposeCollection();
  var composeScalar2 = requireComposeScalar();
  var resolveEnd2 = requireResolveEnd();
  var utilEmptyScalarPosition2 = requireUtilEmptyScalarPosition();
  const CN = { composeNode: composeNode$1, composeEmptyNode };
  function composeNode$1(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case 'alias':
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(
            token,
            'ALIAS_PROPS',
            'An alias node must not specify any properties',
          );
        break;
      case 'scalar':
      case 'single-quoted-scalar':
      case 'double-quoted-scalar':
      case 'block-scalar':
        node = composeScalar2.composeScalar(ctx, token, tag, onError);
        if (anchor) node.anchor = anchor.source.substring(1);
        break;
      case 'block-map':
      case 'block-seq':
      case 'flow-collection':
        node = composeCollection2.composeCollection(
          CN,
          ctx,
          token,
          props,
          onError,
        );
        if (anchor) node.anchor = anchor.source.substring(1);
        break;
      default: {
        const message =
          token.type === 'error'
            ? token.message
            : `Unsupported token (type: ${token.type})`;
        onError(token, 'UNEXPECTED_TOKEN', message);
        node = composeEmptyNode(
          ctx,
          token.offset,
          void 0,
          null,
          props,
          onError,
        );
        isSrcToken = false;
      }
    }
    if (anchor && node.anchor === '')
      onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
    if (
      atKey &&
      ctx.options.stringKeys &&
      (!identity2.isScalar(node) ||
        typeof node.value !== 'string' ||
        (node.tag && node.tag !== 'tag:yaml.org,2002:str'))
    ) {
      const msg = 'With stringKeys, all keys must be strings';
      onError(tag ?? token, 'NON_STRING_KEY', msg);
    }
    if (spaceBefore) node.spaceBefore = true;
    if (comment) {
      if (token.type === 'scalar' && token.source === '')
        node.comment = comment;
      else node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken) node.srcToken = token;
    return node;
  }
  function composeEmptyNode(
    ctx,
    offset,
    before,
    pos,
    { spaceBefore, comment, anchor, tag, end },
    onError,
  ) {
    const token = {
      type: 'scalar',
      offset: utilEmptyScalarPosition2.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: '',
    };
    const node = composeScalar2.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === '')
        onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
    }
    if (spaceBefore) node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias2.Alias(source.substring(1));
    if (alias.source === '')
      onError(offset, 'BAD_ALIAS', 'Alias cannot be an empty string');
    if (alias.source.endsWith(':'))
      onError(
        offset + source.length - 1,
        'BAD_ALIAS',
        'Alias ending in : is ambiguous',
        true,
      );
    const valueEnd = offset + source.length;
    const re = resolveEnd2.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment) alias.comment = re.comment;
    return alias;
  }
  composeNode.composeEmptyNode = composeEmptyNode;
  composeNode.composeNode = composeNode$1;
  return composeNode;
}
var hasRequiredComposeDoc;
function requireComposeDoc() {
  if (hasRequiredComposeDoc) return composeDoc;
  hasRequiredComposeDoc = 1;
  var Document2 = requireDocument();
  var composeNode2 = requireComposeNode();
  var resolveEnd2 = requireResolveEnd();
  var resolveProps2 = requireResolveProps();
  function composeDoc$1(
    options,
    directives2,
    { offset, start, value, end },
    onError,
  ) {
    const opts = Object.assign({ _directives: directives2 }, options);
    const doc = new Document2.Document(void 0, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema,
    };
    const props = resolveProps2.resolveProps(start, {
      indicator: 'doc-start',
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true,
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (
        value &&
        (value.type === 'block-map' || value.type === 'block-seq') &&
        !props.hasNewline
      )
        onError(
          props.end,
          'MISSING_CHAR',
          'Block collection cannot start on same line with directives-end marker',
        );
    }
    doc.contents = value
      ? composeNode2.composeNode(ctx, value, props, onError)
      : composeNode2.composeEmptyNode(
          ctx,
          props.end,
          start,
          null,
          props,
          onError,
        );
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd2.resolveEnd(end, contentEnd, false, onError);
    if (re.comment) doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  composeDoc.composeDoc = composeDoc$1;
  return composeDoc;
}
var hasRequiredComposer;
function requireComposer() {
  if (hasRequiredComposer) return composer;
  hasRequiredComposer = 1;
  var node_process = require$$0$4;
  var directives2 = requireDirectives();
  var Document2 = requireDocument();
  var errors2 = requireErrors();
  var identity2 = requireIdentity();
  var composeDoc2 = requireComposeDoc();
  var resolveEnd2 = requireResolveEnd();
  function getErrorPos(src) {
    if (typeof src === 'number') return [src, src + 1];
    if (Array.isArray(src)) return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === 'string' ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = '';
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0; i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case '#':
          comment +=
            (comment === '' ? '' : afterEmptyLine ? '\n\n' : '\n') +
            (source.substring(1) || ' ');
          atComment = true;
          afterEmptyLine = false;
          break;
        case '%':
          if (prelude[i + 1]?.[0] !== '#') i += 1;
          atComment = false;
          break;
        default:
          if (!atComment) afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }
  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors2.YAMLWarning(pos, code, message));
        else this.errors.push(new errors2.YAMLParseError(pos, code, message));
      };
      this.directives = new directives2.Directives({
        version: options.version || '1.2',
      });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment
            ? `${doc.comment}
${comment}`
            : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (
          identity2.isCollection(dc) &&
          !dc.flow &&
          dc.items.length > 0
        ) {
          let it = dc.items[0];
          if (identity2.isPair(it)) it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb
            ? `${comment}
${cb}`
            : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb
            ? `${comment}
${cb}`
            : comment;
        }
      }
      if (afterDoc) {
        Array.prototype.push.apply(doc.errors, this.errors);
        Array.prototype.push.apply(doc.warnings, this.warnings);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    /**
     * Current stream status information.
     *
     * Mostly useful at the end of input for an empty stream.
     */
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
    /**
     * Compose tokens into documents.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens) yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    /** Advance the composer by one CST token. */
    *next(token) {
      if (node_process.env.LOG_STREAM) console.dir(token, { depth: null });
      switch (token.type) {
        case 'directive':
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, 'BAD_DIRECTIVE', message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case 'document': {
          const doc = composeDoc2.composeDoc(
            this.options,
            this.directives,
            token,
            this.onError,
          );
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(
              token,
              'MISSING_CHAR',
              'Missing directives-end/doc-start indicator line',
            );
          this.decorate(doc, false);
          if (this.doc) yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case 'byte-order-mark':
        case 'space':
          break;
        case 'comment':
        case 'newline':
          this.prelude.push(token.source);
          break;
        case 'error': {
          const msg = token.source
            ? `${token.message}: ${JSON.stringify(token.source)}`
            : token.message;
          const error = new errors2.YAMLParseError(
            getErrorPos(token),
            'UNEXPECTED_TOKEN',
            msg,
          );
          if (this.atDirectives || !this.doc) this.errors.push(error);
          else this.doc.errors.push(error);
          break;
        }
        case 'doc-end': {
          if (!this.doc) {
            const msg = 'Unexpected doc-end without preceding document';
            this.errors.push(
              new errors2.YAMLParseError(
                getErrorPos(token),
                'UNEXPECTED_TOKEN',
                msg,
              ),
            );
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd2.resolveEnd(
            token.end,
            token.offset + token.source.length,
            this.doc.options.strict,
            this.onError,
          );
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc
              ? `${dc}
${end.comment}`
              : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(
            new errors2.YAMLParseError(
              getErrorPos(token),
              'UNEXPECTED_TOKEN',
              `Unsupported token ${token.type}`,
            ),
          );
      }
    }
    /**
     * Call at end of input to yield any remaining document.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign(
          { _directives: this.directives },
          this.options,
        );
        const doc = new Document2.Document(void 0, opts);
        if (this.atDirectives)
          this.onError(
            endOffset,
            'MISSING_CHAR',
            'Missing directives-end indicator line',
          );
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  composer.Composer = Composer;
  return composer;
}
var cst = {};
var cstScalar = {};
var hasRequiredCstScalar;
function requireCstScalar() {
  if (hasRequiredCstScalar) return cstScalar;
  hasRequiredCstScalar = 1;
  var resolveBlockScalar2 = requireResolveBlockScalar();
  var resolveFlowScalar2 = requireResolveFlowScalar();
  var errors2 = requireErrors();
  var stringifyString2 = requireStringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset =
          typeof pos === 'number'
            ? pos
            : Array.isArray(pos)
              ? pos[0]
              : pos.offset;
        if (onError) onError(offset, code, message);
        else
          throw new errors2.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
          return resolveFlowScalar2.resolveFlowScalar(token, strict, _onError);
        case 'block-scalar':
          return resolveBlockScalar2.resolveBlockScalar(
            { options: { strict } },
            token,
            _onError,
          );
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const {
      implicitKey = false,
      indent,
      inFlow = false,
      offset = -1,
      type = 'PLAIN',
    } = context;
    const source = stringifyString2.stringifyString(
      { type, value },
      {
        implicitKey,
        indent: indent > 0 ? ' '.repeat(indent) : '',
        inFlow,
        options: { blockQuote: true, lineWidth: -1 },
      },
    );
    const end = context.end ?? [
      { type: 'newline', offset: -1, indent, source: '\n' },
    ];
    switch (source[0]) {
      case '|':
      case '>': {
        const he = source.indexOf('\n');
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + '\n';
        const props = [
          { type: 'block-scalar-header', offset, indent, source: head },
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: 'newline', offset: -1, indent, source: '\n' });
        return { type: 'block-scalar', offset, indent, props, source: body };
      }
      case '"':
        return { type: 'double-quoted-scalar', offset, indent, source, end };
      case "'":
        return { type: 'single-quoted-scalar', offset, indent, source, end };
      default:
        return { type: 'scalar', offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let {
      afterKey = false,
      implicitKey = false,
      inFlow = false,
      type,
    } = context;
    let indent = 'indent' in token ? token.indent : null;
    if (afterKey && typeof indent === 'number') indent += 2;
    if (!type)
      switch (token.type) {
        case 'single-quoted-scalar':
          type = 'QUOTE_SINGLE';
          break;
        case 'double-quoted-scalar':
          type = 'QUOTE_DOUBLE';
          break;
        case 'block-scalar': {
          const header = token.props[0];
          if (header.type !== 'block-scalar-header')
            throw new Error('Invalid block scalar header');
          type = header.source[0] === '>' ? 'BLOCK_FOLDED' : 'BLOCK_LITERAL';
          break;
        }
        default:
          type = 'PLAIN';
      }
    const source = stringifyString2.stringifyString(
      { type, value },
      {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? ' '.repeat(indent) : '',
        inFlow,
        options: { blockQuote: true, lineWidth: -1 },
      },
    );
    switch (source[0]) {
      case '|':
      case '>':
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, 'double-quoted-scalar');
        break;
      case "'":
        setFlowScalarValue(token, source, 'single-quoted-scalar');
        break;
      default:
        setFlowScalarValue(token, source, 'scalar');
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf('\n');
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + '\n';
    if (token.type === 'block-scalar') {
      const header = token.props[0];
      if (header.type !== 'block-scalar-header')
        throw new Error('Invalid block scalar header');
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = 'indent' in token ? token.indent : -1;
      const props = [
        { type: 'block-scalar-header', offset, indent, source: head },
      ];
      if (!addEndtoBlockProps(props, 'end' in token ? token.end : void 0))
        props.push({ type: 'newline', offset: -1, indent, source: '\n' });
      for (const key of Object.keys(token))
        if (key !== 'type' && key !== 'offset') delete token[key];
      Object.assign(token, {
        type: 'block-scalar',
        indent,
        props,
        source: body,
      });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case 'space':
          case 'comment':
            props.push(st);
            break;
          case 'newline':
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case 'scalar':
      case 'double-quoted-scalar':
      case 'single-quoted-scalar':
        token.type = type;
        token.source = source;
        break;
      case 'block-scalar': {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === 'block-scalar-header')
          oa -= token.props[0].source.length;
        for (const tok of end) tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case 'block-map':
      case 'block-seq': {
        const offset = token.offset + source.length;
        const nl2 = {
          type: 'newline',
          offset,
          indent: token.indent,
          source: '\n',
        };
        delete token.items;
        Object.assign(token, { type, source, end: [nl2] });
        break;
      }
      default: {
        const indent = 'indent' in token ? token.indent : -1;
        const end =
          'end' in token && Array.isArray(token.end)
            ? token.end.filter(
                (st) =>
                  st.type === 'space' ||
                  st.type === 'comment' ||
                  st.type === 'newline',
              )
            : [];
        for (const key of Object.keys(token))
          if (key !== 'type' && key !== 'offset') delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  cstScalar.createScalarToken = createScalarToken;
  cstScalar.resolveAsScalar = resolveAsScalar;
  cstScalar.setScalarValue = setScalarValue;
  return cstScalar;
}
var cstStringify = {};
var hasRequiredCstStringify;
function requireCstStringify() {
  if (hasRequiredCstStringify) return cstStringify;
  hasRequiredCstStringify = 1;
  const stringify2 = (cst2) =>
    'type' in cst2 ? stringifyToken(cst2) : stringifyItem(cst2);
  function stringifyToken(token) {
    switch (token.type) {
      case 'block-scalar': {
        let res = '';
        for (const tok of token.props) res += stringifyToken(tok);
        return res + token.source;
      }
      case 'block-map':
      case 'block-seq': {
        let res = '';
        for (const item of token.items) res += stringifyItem(item);
        return res;
      }
      case 'flow-collection': {
        let res = token.start.source;
        for (const item of token.items) res += stringifyItem(item);
        for (const st of token.end) res += st.source;
        return res;
      }
      case 'document': {
        let res = stringifyItem(token);
        if (token.end) for (const st of token.end) res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ('end' in token && token.end)
          for (const st of token.end) res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = '';
    for (const st of start) res += st.source;
    if (key) res += stringifyToken(key);
    if (sep) for (const st of sep) res += st.source;
    if (value) res += stringifyToken(value);
    return res;
  }
  cstStringify.stringify = stringify2;
  return cstStringify;
}
var cstVisit = {};
var hasRequiredCstVisit;
function requireCstVisit() {
  if (hasRequiredCstVisit) return cstVisit;
  hasRequiredCstVisit = 1;
  const BREAK = /* @__PURE__ */ Symbol('break visit');
  const SKIP = /* @__PURE__ */ Symbol('skip children');
  const REMOVE = /* @__PURE__ */ Symbol('remove item');
  function visit2(cst2, visitor) {
    if ('type' in cst2 && cst2.type === 'document')
      cst2 = { start: cst2.start, value: cst2.value };
    _visit(Object.freeze([]), cst2, visitor);
  }
  visit2.BREAK = BREAK;
  visit2.SKIP = SKIP;
  visit2.REMOVE = REMOVE;
  visit2.itemAtPath = (cst2, path2) => {
    let item = cst2;
    for (const [field, index] of path2) {
      const tok = item?.[field];
      if (tok && 'items' in tok) {
        item = tok.items[index];
      } else return void 0;
    }
    return item;
  };
  visit2.parentCollection = (cst2, path2) => {
    const parent = visit2.itemAtPath(cst2, path2.slice(0, -1));
    const field = path2[path2.length - 1][0];
    const coll = parent?.[field];
    if (coll && 'items' in coll) return coll;
    throw new Error('Parent collection not found');
  };
  function _visit(path2, item, visitor) {
    let ctrl = visitor(item, path2);
    if (typeof ctrl === 'symbol') return ctrl;
    for (const field of ['key', 'value']) {
      const token = item[field];
      if (token && 'items' in token) {
        for (let i = 0; i < token.items.length; ++i) {
          const ci = _visit(
            Object.freeze(path2.concat([[field, i]])),
            token.items[i],
            visitor,
          );
          if (typeof ci === 'number') i = ci - 1;
          else if (ci === BREAK) return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === 'function' && field === 'key')
          ctrl = ctrl(item, path2);
      }
    }
    return typeof ctrl === 'function' ? ctrl(item, path2) : ctrl;
  }
  cstVisit.visit = visit2;
  return cstVisit;
}
var hasRequiredCst;
function requireCst() {
  if (hasRequiredCst) return cst;
  hasRequiredCst = 1;
  var cstScalar2 = requireCstScalar();
  var cstStringify2 = requireCstStringify();
  var cstVisit2 = requireCstVisit();
  const BOM = '\uFEFF';
  const DOCUMENT = '';
  const FLOW_END = '';
  const SCALAR = '';
  const isCollection = (token) => !!token && 'items' in token;
  const isScalar = (token) =>
    !!token &&
    (token.type === 'scalar' ||
      token.type === 'single-quoted-scalar' ||
      token.type === 'double-quoted-scalar' ||
      token.type === 'block-scalar');
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return '<BOM>';
      case DOCUMENT:
        return '<DOC>';
      case FLOW_END:
        return '<FLOW_END>';
      case SCALAR:
        return '<SCALAR>';
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return 'byte-order-mark';
      case DOCUMENT:
        return 'doc-mode';
      case FLOW_END:
        return 'flow-error-end';
      case SCALAR:
        return 'scalar';
      case '---':
        return 'doc-start';
      case '...':
        return 'doc-end';
      case '':
      case '\n':
      case '\r\n':
        return 'newline';
      case '-':
        return 'seq-item-ind';
      case '?':
        return 'explicit-key-ind';
      case ':':
        return 'map-value-ind';
      case '{':
        return 'flow-map-start';
      case '}':
        return 'flow-map-end';
      case '[':
        return 'flow-seq-start';
      case ']':
        return 'flow-seq-end';
      case ',':
        return 'comma';
    }
    switch (source[0]) {
      case ' ':
      case '	':
        return 'space';
      case '#':
        return 'comment';
      case '%':
        return 'directive-line';
      case '*':
        return 'alias';
      case '&':
        return 'anchor';
      case '!':
        return 'tag';
      case "'":
        return 'single-quoted-scalar';
      case '"':
        return 'double-quoted-scalar';
      case '|':
      case '>':
        return 'block-scalar-header';
    }
    return null;
  }
  cst.createScalarToken = cstScalar2.createScalarToken;
  cst.resolveAsScalar = cstScalar2.resolveAsScalar;
  cst.setScalarValue = cstScalar2.setScalarValue;
  cst.stringify = cstStringify2.stringify;
  cst.visit = cstVisit2.visit;
  cst.BOM = BOM;
  cst.DOCUMENT = DOCUMENT;
  cst.FLOW_END = FLOW_END;
  cst.SCALAR = SCALAR;
  cst.isCollection = isCollection;
  cst.isScalar = isScalar;
  cst.prettyToken = prettyToken;
  cst.tokenType = tokenType;
  return cst;
}
var lexer = {};
var hasRequiredLexer;
function requireLexer() {
  if (hasRequiredLexer) return lexer;
  hasRequiredLexer = 1;
  var cst2 = requireCst();
  function isEmpty(ch) {
    switch (ch) {
      case void 0:
      case ' ':
      case '\n':
      case '\r':
      case '	':
        return true;
      default:
        return false;
    }
  }
  const hexDigits = new Set('0123456789ABCDEFabcdef');
  const tagChars = new Set(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()",
  );
  const flowIndicatorChars = new Set(',[]{}');
  const invalidAnchorChars = new Set(' ,[]{}\n\r	');
  const isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = '';
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    /**
     * Generate YAML tokens from the `source` string. If `incomplete`,
     * a part of the last line may be left as a buffer for the next call.
     *
     * @returns A generator of lexical tokens
     */
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== 'string')
          throw TypeError('source is not a string');
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? 'stream';
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === ' ' || ch === '	') ch = this.buffer[++i];
      if (!ch || ch === '#' || ch === '\n') return true;
      if (ch === '\r') return this.buffer[i + 1] === '\n';
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === ' ') ch = this.buffer[++indent + offset];
        if (ch === '\r') {
          const next = this.buffer[indent + offset + 1];
          if (next === '\n' || (!next && !this.atEnd))
            return offset + indent + 1;
        }
        return ch === '\n' || indent >= this.indentNext || (!ch && !this.atEnd)
          ? offset + indent
          : -1;
      }
      if (ch === '-' || ch === '.') {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === '---' || dt === '...') && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== 'number' || (end !== -1 && end < this.pos)) {
        end = this.buffer.indexOf('\n', this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === '\r') end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case 'stream':
          return yield* this.parseStream();
        case 'line-start':
          return yield* this.parseLineStart();
        case 'block-start':
          return yield* this.parseBlockStart();
        case 'doc':
          return yield* this.parseDocument();
        case 'flow':
          return yield* this.parseFlowCollection();
        case 'quoted-scalar':
          return yield* this.parseQuotedScalar();
        case 'block-scalar':
          return yield* this.parseBlockScalar();
        case 'plain-scalar':
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null) return this.setNext('stream');
      if (line[0] === cst2.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === '%') {
        let dirEnd = line.length;
        let cs = line.indexOf('#');
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === ' ' || ch === '	') {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf('#', cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === ' ' || ch === '	') dirEnd -= 1;
          else break;
        }
        const n =
          (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return 'stream';
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return 'stream';
      }
      yield cst2.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd) return this.setNext('line-start');
      if (ch === '-' || ch === '.') {
        if (!this.atEnd && !this.hasChars(4)) return this.setNext('line-start');
        const s = this.peek(3);
        if ((s === '---' || s === '...') && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === '---' ? 'doc' : 'stream';
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd) return this.setNext('block-start');
      if ((ch0 === '-' || ch0 === '?' || ch0 === ':') && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return yield* this.parseBlockStart();
      }
      return 'doc';
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null) return this.setNext('doc');
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case '#':
          yield* this.pushCount(line.length - n);
        // fallthrough
        case void 0:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case '{':
        case '[':
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return 'flow';
        case '}':
        case ']':
          yield* this.pushCount(1);
          return 'doc';
        case '*':
          yield* this.pushUntil(isNotAnchorChar);
          return 'doc';
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case '|':
        case '>':
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl2, sp;
      let indent = -1;
      do {
        nl2 = yield* this.pushNewline();
        if (nl2 > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl2 + sp > 0);
      const line = this.getLine();
      if (line === null) return this.setNext('flow');
      if (
        (indent !== -1 && indent < this.indentNext && line[0] !== '#') ||
        (indent === 0 &&
          (line.startsWith('---') || line.startsWith('...')) &&
          isEmpty(line[3]))
      ) {
        const atFlowEndMarker =
          indent === this.indentNext - 1 &&
          this.flowLevel === 1 &&
          (line[0] === ']' || line[0] === '}');
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst2.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ',') {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case void 0:
          return 'flow';
        case '#':
          yield* this.pushCount(line.length - n);
          return 'flow';
        case '{':
        case '[':
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return 'flow';
        case '}':
        case ']':
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? 'flow' : 'doc';
        case '*':
          yield* this.pushUntil(isNotAnchorChar);
          return 'flow';
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ':': {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ',') {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return 'flow';
          }
        }
        // fallthrough
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === '\\') n += 1;
          if (n % 2 === 0) break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl2 = qb.indexOf('\n', this.pos);
      if (nl2 !== -1) {
        while (nl2 !== -1) {
          const cs = this.continueScalar(nl2 + 1);
          if (cs === -1) break;
          nl2 = qb.indexOf('\n', cs);
        }
        if (nl2 !== -1) {
          end = nl2 - (qb[nl2 - 1] === '\r' ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd) return this.setNext('quoted-scalar');
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? 'flow' : 'doc';
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === '+') this.blockScalarKeep = true;
        else if (ch > '0' && ch <= '9') this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== '-') break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === '#');
    }
    *parseBlockScalar() {
      let nl2 = this.pos - 1;
      let indent = 0;
      let ch;
      loop: for (let i2 = this.pos; (ch = this.buffer[i2]); ++i2) {
        switch (ch) {
          case ' ':
            indent += 1;
            break;
          case '\n':
            nl2 = i2;
            indent = 0;
            break;
          case '\r': {
            const next = this.buffer[i2 + 1];
            if (!next && !this.atEnd) return this.setNext('block-scalar');
            if (next === '\n') break;
          }
          // fallthrough
          default:
            break loop;
        }
      }
      if (!ch && !this.atEnd) return this.setNext('block-scalar');
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1) this.indentNext = indent;
        else {
          this.indentNext =
            this.blockScalarIndent +
            (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl2 + 1);
          if (cs === -1) break;
          nl2 = this.buffer.indexOf('\n', cs);
        } while (nl2 !== -1);
        if (nl2 === -1) {
          if (!this.atEnd) return this.setNext('block-scalar');
          nl2 = this.buffer.length;
        }
      }
      let i = nl2 + 1;
      ch = this.buffer[i];
      while (ch === ' ') ch = this.buffer[++i];
      if (ch === '	') {
        while (ch === '	' || ch === ' ' || ch === '\r' || ch === '\n')
          ch = this.buffer[++i];
        nl2 = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i2 = nl2 - 1;
          let ch2 = this.buffer[i2];
          if (ch2 === '\r') ch2 = this.buffer[--i2];
          const lastChar = i2;
          while (ch2 === ' ') ch2 = this.buffer[--i2];
          if (ch2 === '\n' && i2 >= this.pos && i2 + 1 + indent > lastChar)
            nl2 = i2;
          else break;
        } while (true);
      }
      yield cst2.SCALAR;
      yield* this.pushToIndex(nl2 + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while ((ch = this.buffer[++i])) {
        if (ch === ':') {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || (inFlow && flowIndicatorChars.has(next))) break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === '\r') {
            if (next === '\n') {
              i += 1;
              ch = '\n';
              next = this.buffer[i + 1];
            } else end = i;
          }
          if (next === '#' || (inFlow && flowIndicatorChars.has(next))) break;
          if (ch === '\n') {
            const cs = this.continueScalar(i + 1);
            if (cs === -1) break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch)) break;
          end = i;
        }
      }
      if (!ch && !this.atEnd) return this.setNext('plain-scalar');
      yield cst2.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? 'flow' : 'doc';
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty) yield '';
      return 0;
    }
    *pushIndicators() {
      switch (this.charAt(0)) {
        case '!':
          return (
            (yield* this.pushTag()) +
            (yield* this.pushSpaces(true)) +
            (yield* this.pushIndicators())
          );
        case '&':
          return (
            (yield* this.pushUntil(isNotAnchorChar)) +
            (yield* this.pushSpaces(true)) +
            (yield* this.pushIndicators())
          );
        case '-':
        // this is an error
        case '?':
        // this is an error outside flow collections
        case ':': {
          const inFlow = this.flowLevel > 0;
          const ch1 = this.charAt(1);
          if (isEmpty(ch1) || (inFlow && flowIndicatorChars.has(ch1))) {
            if (!inFlow) this.indentNext = this.indentValue + 1;
            else if (this.flowKey) this.flowKey = false;
            return (
              (yield* this.pushCount(1)) +
              (yield* this.pushSpaces(true)) +
              (yield* this.pushIndicators())
            );
          }
        }
      }
      return 0;
    }
    *pushTag() {
      if (this.charAt(1) === '<') {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== '>') ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === '>' ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch)) ch = this.buffer[++i];
          else if (
            ch === '%' &&
            hexDigits.has(this.buffer[i + 1]) &&
            hexDigits.has(this.buffer[i + 2])
          ) {
            ch = this.buffer[(i += 3)];
          } else break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === '\n') return yield* this.pushCount(1);
      else if (ch === '\r' && this.charAt(1) === '\n')
        return yield* this.pushCount(2);
      else return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === ' ' || (allowTabs && ch === '	'));
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch)) ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  lexer.Lexer = Lexer;
  return lexer;
}
var lineCounter = {};
var hasRequiredLineCounter;
function requireLineCounter() {
  if (hasRequiredLineCounter) return lineCounter;
  hasRequiredLineCounter = 1;
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (this.lineStarts[mid] < offset) low = mid + 1;
          else high = mid;
        }
        if (this.lineStarts[low] === offset) return { line: low + 1, col: 1 };
        if (low === 0) return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  lineCounter.LineCounter = LineCounter;
  return lineCounter;
}
var parser = {};
var hasRequiredParser;
function requireParser() {
  if (hasRequiredParser) return parser;
  hasRequiredParser = 1;
  var node_process = require$$0$4;
  var cst2 = requireCst();
  var lexer2 = requireLexer();
  function includesToken(list, type) {
    for (let i = 0; i < list.length; ++i)
      if (list[i].type === type) return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0; i < list.length; ++i) {
      switch (list[i].type) {
        case 'space':
        case 'comment':
        case 'newline':
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case 'alias':
      case 'scalar':
      case 'single-quoted-scalar':
      case 'double-quoted-scalar':
      case 'flow-collection':
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case 'document':
        return parent.start;
      case 'block-map': {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case 'block-seq':
        return parent.items[parent.items.length - 1].start;
      /* istanbul ignore next should not happen */
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0) return [];
    let i = prev.length;
    loop: while (--i >= 0) {
      switch (prev[i].type) {
        case 'doc-start':
        case 'explicit-key-ind':
        case 'map-value-ind':
        case 'seq-item-ind':
        case 'newline':
          break loop;
      }
    }
    while (prev[++i]?.type === 'space') {}
    return prev.splice(i, prev.length);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === 'flow-seq-start') {
      for (const it of fc.items) {
        if (
          it.sep &&
          !it.value &&
          !includesToken(it.start, 'explicit-key-ind') &&
          !includesToken(it.sep, 'map-value-ind')
        ) {
          if (it.key) it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end) Array.prototype.push.apply(it.value.end, it.sep);
            else it.value.end = it.sep;
          } else Array.prototype.push.apply(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }
  class Parser {
    /**
     * @param onNewLine - If defined, called separately with the start position of
     *   each new line (in `parse()`, including the start of input).
     */
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = '';
      this.type = '';
      this.lexer = new lexer2.Lexer();
      this.onNewLine = onNewLine;
    }
    /**
     * Parse `source` as a YAML stream.
     * If `incomplete`, a part of the last line may be left as a buffer for the next call.
     *
     * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
     *
     * @returns A generator of tokens representing each directive, document, and other structure.
     */
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0) this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete) yield* this.end();
    }
    /**
     * Advance the parser by the `source` of one lexical token.
     */
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log('|', cst2.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst2.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({
          type: 'error',
          offset: this.offset,
          message,
          source,
        });
        this.offset += source.length;
      } else if (type === 'scalar') {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = 'scalar';
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case 'newline':
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) this.onNewLine(this.offset + source.length);
            break;
          case 'space':
            if (this.atNewLine && source[0] === ' ')
              this.indent += source.length;
            break;
          case 'explicit-key-ind':
          case 'map-value-ind':
          case 'seq-item-ind':
            if (this.atNewLine) this.indent += source.length;
            break;
          case 'doc-mode':
          case 'flow-error-end':
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    /** Call at end of input to push out any remaining constructions */
    *end() {
      while (this.stack.length > 0) yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source,
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === 'doc-end' && top?.type !== 'doc-end') {
        while (this.stack.length > 0) yield* this.pop();
        this.stack.push({
          type: 'doc-end',
          offset: this.offset,
          source: this.source,
        });
        return;
      }
      if (!top) return yield* this.stream();
      switch (top.type) {
        case 'document':
          return yield* this.document(top);
        case 'alias':
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
          return yield* this.scalar(top);
        case 'block-scalar':
          return yield* this.blockScalar(top);
        case 'block-map':
          return yield* this.blockMap(top);
        case 'block-seq':
          return yield* this.blockSequence(top);
        case 'flow-collection':
          return yield* this.flowCollection(top);
        case 'doc-end':
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = 'Tried to pop an empty stack';
        yield { type: 'error', offset: this.offset, source: '', message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === 'block-scalar') {
          token.indent = 'indent' in top ? top.indent : 0;
        } else if (
          token.type === 'flow-collection' &&
          top.type === 'document'
        ) {
          token.indent = 0;
        }
        if (token.type === 'flow-collection') fixFlowSeqItems(token);
        switch (top.type) {
          case 'document':
            top.value = token;
            break;
          case 'block-scalar':
            top.props.push(token);
            break;
          case 'block-map': {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case 'block-seq': {
            const it = top.items[top.items.length - 1];
            if (it.value) top.items.push({ start: [], value: token });
            else it.value = token;
            break;
          }
          case 'flow-collection': {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep) it.value = token;
            else Object.assign(it, { key: token, sep: [] });
            return;
          }
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if (
          (top.type === 'document' ||
            top.type === 'block-map' ||
            top.type === 'block-seq') &&
          (token.type === 'block-map' || token.type === 'block-seq')
        ) {
          const last = token.items[token.items.length - 1];
          if (
            last &&
            !last.sep &&
            !last.value &&
            last.start.length > 0 &&
            findNonEmptyIndex(last.start) === -1 &&
            (token.indent === 0 ||
              last.start.every(
                (st) => st.type !== 'comment' || st.indent < token.indent,
              ))
          ) {
            if (top.type === 'document') top.end = last.start;
            else top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case 'directive-line':
          yield { type: 'directive', offset: this.offset, source: this.source };
          return;
        case 'byte-order-mark':
        case 'space':
        case 'comment':
        case 'newline':
          yield this.sourceToken;
          return;
        case 'doc-mode':
        case 'doc-start': {
          const doc = {
            type: 'document',
            offset: this.offset,
            start: [],
          };
          if (this.type === 'doc-start') doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: 'error',
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source,
      };
    }
    *document(doc) {
      if (doc.value) return yield* this.lineEnd(doc);
      switch (this.type) {
        case 'doc-start': {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else doc.start.push(this.sourceToken);
          return;
        }
        case 'anchor':
        case 'tag':
        case 'space':
        case 'comment':
        case 'newline':
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv) this.stack.push(bv);
      else {
        yield {
          type: 'error',
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source,
        };
      }
    }
    *scalar(scalar) {
      if (this.type === 'map-value-ind') {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else sep = [this.sourceToken];
        const map2 = {
          type: 'block-map',
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }],
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map2;
      } else yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case 'space':
        case 'comment':
        case 'newline':
          scalar.props.push(this.sourceToken);
          return;
        case 'scalar':
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl2 = this.source.indexOf('\n') + 1;
            while (nl2 !== 0) {
              this.onNewLine(this.offset + nl2);
              nl2 = this.source.indexOf('\n', nl2) + 1;
            }
          }
          yield* this.pop();
          break;
        /* istanbul ignore next should not happen */
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map2) {
      const it = map2.items[map2.items.length - 1];
      switch (this.type) {
        case 'newline':
          this.onKeyLine = false;
          if (it.value) {
            const end = 'end' in it.value ? it.value.end : void 0;
            const last = Array.isArray(end) ? end[end.length - 1] : void 0;
            if (last?.type === 'comment') end?.push(this.sourceToken);
            else map2.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case 'space':
        case 'comment':
          if (it.value) {
            map2.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map2.indent)) {
              const prev = map2.items[map2.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                Array.prototype.push.apply(end, it.start);
                end.push(this.sourceToken);
                map2.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map2.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map2.indent;
        const atNextItem =
          atMapIndent &&
          (it.sep || it.explicitKey) &&
          this.type !== 'seq-item-ind';
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl2 = [];
          for (let i = 0; i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case 'newline':
                nl2.push(i);
                break;
              case 'space':
                break;
              case 'comment':
                if (st.indent > map2.indent) nl2.length = 0;
                break;
              default:
                nl2.length = 0;
            }
          }
          if (nl2.length >= 2) start = it.sep.splice(nl2[1]);
        }
        switch (this.type) {
          case 'anchor':
          case 'tag':
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map2.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case 'explicit-key-ind':
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map2.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: 'block-map',
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }],
              });
            }
            this.onKeyLine = true;
            return;
          case 'map-value-ind':
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, 'newline')) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start2 = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [
                      { start: start2, key: null, sep: [this.sourceToken] },
                    ],
                  });
                }
              } else if (it.value) {
                map2.items.push({
                  start: [],
                  key: null,
                  sep: [this.sourceToken],
                });
              } else if (includesToken(it.sep, 'map-value-ind')) {
                this.stack.push({
                  type: 'block-map',
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }],
                });
              } else if (
                isFlowToken(it.key) &&
                !includesToken(it.sep, 'newline')
              ) {
                const start2 = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: 'block-map',
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key, sep }],
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map2.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, 'map-value-ind')) {
                this.stack.push({
                  type: 'block-map',
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }],
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case 'alias':
          case 'scalar':
          case 'single-quoted-scalar':
          case 'double-quoted-scalar': {
            const fs2 = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map2.items.push({ start, key: fs2, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs2);
            } else {
              Object.assign(it, { key: fs2, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map2);
            if (bv) {
              if (bv.type === 'block-seq') {
                if (
                  !it.explicitKey &&
                  it.sep &&
                  !includesToken(it.sep, 'newline')
                ) {
                  yield* this.pop({
                    type: 'error',
                    offset: this.offset,
                    message: 'Unexpected block-seq-ind on same line with key',
                    source: this.source,
                  });
                  return;
                }
              } else if (atMapIndent) {
                map2.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq2) {
      const it = seq2.items[seq2.items.length - 1];
      switch (this.type) {
        case 'newline':
          if (it.value) {
            const end = 'end' in it.value ? it.value.end : void 0;
            const last = Array.isArray(end) ? end[end.length - 1] : void 0;
            if (last?.type === 'comment') end?.push(this.sourceToken);
            else seq2.items.push({ start: [this.sourceToken] });
          } else it.start.push(this.sourceToken);
          return;
        case 'space':
        case 'comment':
          if (it.value) seq2.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq2.indent)) {
              const prev = seq2.items[seq2.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                Array.prototype.push.apply(end, it.start);
                end.push(this.sourceToken);
                seq2.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case 'anchor':
        case 'tag':
          if (it.value || this.indent <= seq2.indent) break;
          it.start.push(this.sourceToken);
          return;
        case 'seq-item-ind':
          if (this.indent !== seq2.indent) break;
          if (it.value || includesToken(it.start, 'seq-item-ind'))
            seq2.items.push({ start: [this.sourceToken] });
          else it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq2.indent) {
        const bv = this.startBlockValue(seq2);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === 'flow-error-end') {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === 'flow-collection');
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case 'comma':
          case 'explicit-key-ind':
            if (!it || it.sep) fc.items.push({ start: [this.sourceToken] });
            else it.start.push(this.sourceToken);
            return;
          case 'map-value-ind':
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep) it.sep.push(this.sourceToken);
            else Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case 'space':
          case 'comment':
          case 'newline':
          case 'anchor':
          case 'tag':
            if (!it || it.value) fc.items.push({ start: [this.sourceToken] });
            else if (it.sep) it.sep.push(this.sourceToken);
            else it.start.push(this.sourceToken);
            return;
          case 'alias':
          case 'scalar':
          case 'single-quoted-scalar':
          case 'double-quoted-scalar': {
            const fs2 = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs2, sep: [] });
            else if (it.sep) this.stack.push(fs2);
            else Object.assign(it, { key: fs2, sep: [] });
            return;
          }
          case 'flow-map-end':
          case 'flow-seq-end':
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv) this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (
          parent.type === 'block-map' &&
          ((this.type === 'map-value-ind' && parent.indent === fc.indent) ||
            (this.type === 'newline' &&
              !parent.items[parent.items.length - 1].sep))
        ) {
          yield* this.pop();
          yield* this.step();
        } else if (
          this.type === 'map-value-ind' &&
          parent.type !== 'flow-collection'
        ) {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map2 = {
            type: 'block-map',
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }],
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map2;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl2 = this.source.indexOf('\n') + 1;
        while (nl2 !== 0) {
          this.onNewLine(this.offset + nl2);
          nl2 = this.source.indexOf('\n', nl2) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source,
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case 'alias':
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
          return this.flowScalar(this.type);
        case 'block-scalar-header':
          return {
            type: 'block-scalar',
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: '',
          };
        case 'flow-map-start':
        case 'flow-seq-start':
          return {
            type: 'flow-collection',
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: [],
          };
        case 'seq-item-ind':
          return {
            type: 'block-seq',
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }],
          };
        case 'explicit-key-ind': {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: 'block-map',
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }],
          };
        }
        case 'map-value-ind': {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: 'block-map',
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }],
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== 'comment') return false;
      if (this.indent <= indent) return false;
      return start.every((st) => st.type === 'newline' || st.type === 'space');
    }
    *documentEnd(docEnd) {
      if (this.type !== 'doc-mode') {
        if (docEnd.end) docEnd.end.push(this.sourceToken);
        else docEnd.end = [this.sourceToken];
        if (this.type === 'newline') yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case 'comma':
        case 'doc-start':
        case 'doc-end':
        case 'flow-seq-end':
        case 'flow-map-end':
        case 'map-value-ind':
          yield* this.pop();
          yield* this.step();
          break;
        case 'newline':
          this.onKeyLine = false;
        // fallthrough
        case 'space':
        case 'comment':
        default:
          if (token.end) token.end.push(this.sourceToken);
          else token.end = [this.sourceToken];
          if (this.type === 'newline') yield* this.pop();
      }
    }
  }
  parser.Parser = Parser;
  return parser;
}
var publicApi = {};
var hasRequiredPublicApi;
function requirePublicApi() {
  if (hasRequiredPublicApi) return publicApi;
  hasRequiredPublicApi = 1;
  var composer2 = requireComposer();
  var Document2 = requireDocument();
  var errors2 = requireErrors();
  var log2 = requireLog();
  var identity2 = requireIdentity();
  var lineCounter2 = requireLineCounter();
  var parser2 = requireParser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 =
      options.lineCounter ||
      (prettyErrors && new lineCounter2.LineCounter()) ||
      null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter: lineCounter3, prettyErrors } = parseOptions(options);
    const parser$1 = new parser2.Parser(lineCounter3?.addNewLine);
    const composer$1 = new composer2.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter3)
      for (const doc of docs) {
        doc.errors.forEach(errors2.prettifyError(source, lineCounter3));
        doc.warnings.forEach(errors2.prettifyError(source, lineCounter3));
      }
    if (docs.length > 0) return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter: lineCounter3, prettyErrors } = parseOptions(options);
    const parser$1 = new parser2.Parser(lineCounter3?.addNewLine);
    const composer$1 = new composer2.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(
      parser$1.parse(source),
      true,
      source.length,
    )) {
      if (!doc) doc = _doc;
      else if (doc.options.logLevel !== 'silent') {
        doc.errors.push(
          new errors2.YAMLParseError(
            _doc.range.slice(0, 2),
            'MULTIPLE_DOCS',
            'Source contains multiple documents; please use YAML.parseAllDocuments()',
          ),
        );
        break;
      }
    }
    if (prettyErrors && lineCounter3) {
      doc.errors.forEach(errors2.prettifyError(source, lineCounter3));
      doc.warnings.forEach(errors2.prettifyError(source, lineCounter3));
    }
    return doc;
  }
  function parse2(src, reviver, options) {
    let _reviver = void 0;
    if (typeof reviver === 'function') {
      _reviver = reviver;
    } else if (options === void 0 && reviver && typeof reviver === 'object') {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc) return null;
    doc.warnings.forEach((warning) => log2.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== 'silent') throw doc.errors[0];
      else doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify2(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === 'function' || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === void 0 && replacer) {
      options = replacer;
    }
    if (typeof options === 'string') options = options.length;
    if (typeof options === 'number') {
      const indent = Math.round(options);
      options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === void 0) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined) return void 0;
    }
    if (identity2.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document2.Document(value, _replacer, options).toString(options);
  }
  publicApi.parse = parse2;
  publicApi.parseAllDocuments = parseAllDocuments;
  publicApi.parseDocument = parseDocument;
  publicApi.stringify = stringify2;
  return publicApi;
}
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist;
  hasRequiredDist = 1;
  var composer2 = requireComposer();
  var Document2 = requireDocument();
  var Schema2 = requireSchema();
  var errors2 = requireErrors();
  var Alias2 = requireAlias();
  var identity2 = requireIdentity();
  var Pair2 = requirePair();
  var Scalar2 = requireScalar();
  var YAMLMap2 = requireYAMLMap();
  var YAMLSeq2 = requireYAMLSeq();
  var cst2 = requireCst();
  var lexer2 = requireLexer();
  var lineCounter2 = requireLineCounter();
  var parser2 = requireParser();
  var publicApi2 = requirePublicApi();
  var visit2 = requireVisit();
  dist.Composer = composer2.Composer;
  dist.Document = Document2.Document;
  dist.Schema = Schema2.Schema;
  dist.YAMLError = errors2.YAMLError;
  dist.YAMLParseError = errors2.YAMLParseError;
  dist.YAMLWarning = errors2.YAMLWarning;
  dist.Alias = Alias2.Alias;
  dist.isAlias = identity2.isAlias;
  dist.isCollection = identity2.isCollection;
  dist.isDocument = identity2.isDocument;
  dist.isMap = identity2.isMap;
  dist.isNode = identity2.isNode;
  dist.isPair = identity2.isPair;
  dist.isScalar = identity2.isScalar;
  dist.isSeq = identity2.isSeq;
  dist.Pair = Pair2.Pair;
  dist.Scalar = Scalar2.Scalar;
  dist.YAMLMap = YAMLMap2.YAMLMap;
  dist.YAMLSeq = YAMLSeq2.YAMLSeq;
  dist.CST = cst2;
  dist.Lexer = lexer2.Lexer;
  dist.LineCounter = lineCounter2.LineCounter;
  dist.Parser = parser2.Parser;
  dist.parse = publicApi2.parse;
  dist.parseAllDocuments = publicApi2.parseAllDocuments;
  dist.parseDocument = publicApi2.parseDocument;
  dist.stringify = publicApi2.stringify;
  dist.visit = visit2.visit;
  dist.visitAsync = visit2.visitAsync;
  return dist;
}
requireDist();
const COUNTRY_DATASET_ORDER = Object.freeze({
  US: ['counties', 'county-subdivisions', 'zctas', 'neighborhoods'],
  CA: ['feds', 'peds', 'csds', 'fsas'],
  GB: ['districts', 'bua', 'wards'],
});
function normalizeDatasetCountryCode(countryCode) {
  return countryCode.toUpperCase() === 'UK' ? 'GB' : countryCode.toUpperCase();
}
function resolveCountryDatasetOrder(countryCode) {
  const normalizedCountryCode = normalizeDatasetCountryCode(countryCode);
  return COUNTRY_DATASET_ORDER[normalizedCountryCode] ?? [];
}
const KNOWN_DATASET_ORDERS = Object.values(COUNTRY_DATASET_ORDER);
function resolveDatasetOrder(country) {
  const orderedCatalogDatasets = resolveCountryDatasetOrder(country);
  if (orderedCatalogDatasets.length > 0) {
    return orderedCatalogDatasets;
  }
  const osmCountryConfig = findOsmCountryConfig(country);
  if (!osmCountryConfig) {
    return [];
  }
  return osmCountryConfig.availableBoundaryTypes.map(
    (entry) => entry.datasetId,
  );
}
function resolvePreferredDatasetOrderForCity(entries, fallbackCountryCode) {
  const datasetIds = new Set(entries.map((entry) => entry.datasetId));
  const matchingDatasetOrders = KNOWN_DATASET_ORDERS.filter((datasetOrder) =>
    datasetOrder.some((datasetId) => datasetIds.has(datasetId)),
  );
  if (matchingDatasetOrders.length === 1) {
    return matchingDatasetOrders[0];
  }
  if (fallbackCountryCode) {
    return resolveDatasetOrder(fallbackCountryCode);
  }
  return [];
}
function buildDatasetOrderIndex(preferredDatasetOrder) {
  return new Map(
    preferredDatasetOrder.map((datasetId, orderIndex) => [
      datasetId,
      orderIndex,
    ]),
  );
}
function sortDatasetEntriesByDatasetOrder(entries, datasetOrderIndex) {
  if (datasetOrderIndex.size === 0) {
    return entries;
  }
  return [...entries].sort((a, b) => {
    const aOrder = datasetOrderIndex.get(a.datasetId);
    const bOrder = datasetOrderIndex.get(b.datasetId);
    if (aOrder != null && bOrder != null) {
      return aOrder - bOrder;
    }
    if (aOrder != null) {
      return -1;
    }
    if (bOrder != null) {
      return 1;
    }
    return a.datasetId.localeCompare(b.datasetId);
  });
}
function validateFilePath(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Input file does not exist: ${filePath}`);
    process.exit(1);
  }
}
function loadGeoJSON(filePath) {
  validateFilePath(filePath);
  let geoJson;
  try {
    const loadedJson = filePath.endsWith('.gz')
      ? JSON.parse(zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8'))
      : fs.readJsonSync(filePath);
    geoJson = loadedJson;
  } catch (err) {
    console.error(
      `Failed to load or parse GeoJSON file: ${filePath} with error: ${err.message}`,
    );
    process.exit(1);
  }
  return geoJson;
}
async function loadGeoJSONFromNDJSON(filePath) {
  validateFilePath(filePath);
  const features = new Array();
  await loadFeatureFromNDJSON(filePath, (f) => features.push(f));
  return {
    type: 'FeatureCollection',
    features,
  };
}
async function loadFeatureFromNDJSON(filePath, onFeature) {
  const inputStream = filePath.endsWith('.gz')
    ? fs.createReadStream(filePath).pipe(zlib.createGunzip())
    : fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    onFeature(JSON.parse(line));
  }
}
function saveGeoJSON(filePath, featureCollection2, options) {
  try {
    const compressOutput = options?.compress ?? false;
    const resolvedFilePath =
      compressOutput && !filePath.endsWith('.gz') ? `${filePath}.gz` : filePath;
    console.info(`Saving GeoJSON to: ${resolvedFilePath}`);
    const saveDirectory = path.dirname(filePath);
    const temporaryFilePath = `${resolvedFilePath}.tmp`;
    fs.ensureDirSync(saveDirectory);
    if (compressOutput) {
      const serializedGeoJSON = JSON.stringify(featureCollection2, null, 2);
      fs.writeFileSync(temporaryFilePath, zlib.gzipSync(serializedGeoJSON));
    } else {
      fs.writeJsonSync(temporaryFilePath, featureCollection2, { spaces: 2 });
    }
    fs.moveSync(temporaryFilePath, resolvedFilePath, { overwrite: true });
    console.info(`Saved GeoJSON to: ${resolvedFilePath}`);
  } catch (err) {
    console.error(`Failed to save GeoJSON to: ${filePath} with error: ${err}`);
    process.exit(1);
  }
}
function loadCSV(filePath) {
  validateFilePath(filePath);
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}
function buildCSVIndex(rows, keyColumn, valueColumn) {
  const index = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = row[keyColumn];
    const value = row[valueColumn];
    if (key && value) {
      index.set(key, value);
    }
  }
  return index;
}
function updateIndexJson(indexPath, cityCode, datasetEntry, countryCode) {
  if (!fs.existsSync(indexPath)) {
    const indexDirectory = path.dirname(indexPath);
    fs.ensureDirSync(indexDirectory);
    fs.writeJsonSync(indexPath, {}, { spaces: 2 });
    console.log(`Created missing index file: ${indexPath}`);
  }
  const index = fs.readJsonSync(indexPath, { throws: false }) || {};
  if (!index[cityCode]) {
    index[cityCode] = [];
  }
  const existingEntry = index[cityCode].find(
    (entry) => entry.datasetId === datasetEntry.datasetId,
  );
  if (existingEntry) {
    Object.assign(existingEntry, datasetEntry);
    console.log(
      `Updated ${DATA_INDEX_FILE} for ${cityCode} with dataset: ${datasetEntry.displayName}`,
    );
  } else {
    index[cityCode].push(datasetEntry);
    console.log(
      `Added ${DATA_INDEX_FILE} entry for ${cityCode}: ${datasetEntry.displayName}`,
    );
  }
  const sortedCityCodes = Object.keys(index).sort((a, b) => a.localeCompare(b));
  const sortedIndex = Object.fromEntries(
    sortedCityCodes.map((sortedCityCode) => {
      const cityEntries = index[sortedCityCode] || [];
      const preferredDatasetOrderForCity = resolvePreferredDatasetOrderForCity(
        cityEntries,
        sortedCityCode === cityCode ? countryCode : void 0,
      );
      const datasetOrderIndex = buildDatasetOrderIndex(
        preferredDatasetOrderForCity,
      );
      return [
        sortedCityCode,
        sortDatasetEntriesByDatasetOrder(cityEntries, datasetOrderIndex),
      ];
    }),
  );
  fs.writeJsonSync(indexPath, sortedIndex, { spaces: 2 });
}
var earthRadius = 63710088e-1;
var factors = {
  centimeters: earthRadius * 100,
  centimetres: earthRadius * 100,
  degrees: 360 / (2 * Math.PI),
  feet: earthRadius * 3.28084,
  inches: earthRadius * 39.37,
  kilometers: earthRadius / 1e3,
  kilometres: earthRadius / 1e3,
  meters: earthRadius,
  metres: earthRadius,
  miles: earthRadius / 1609.344,
  millimeters: earthRadius * 1e3,
  millimetres: earthRadius * 1e3,
  nauticalmiles: earthRadius / 1852,
  radians: 1,
  yards: earthRadius * 1.0936,
};
function feature(geom, properties, options = {}) {
  const feat = { type: 'Feature' };
  if (options.id === 0 || options.id) {
    feat.id = options.id;
  }
  if (options.bbox) {
    feat.bbox = options.bbox;
  }
  feat.properties = properties || {};
  feat.geometry = geom;
  return feat;
}
function point(coordinates, properties, options = {}) {
  if (!coordinates) {
    throw new Error('coordinates is required');
  }
  if (!Array.isArray(coordinates)) {
    throw new Error('coordinates must be an Array');
  }
  if (coordinates.length < 2) {
    throw new Error('coordinates must be at least 2 numbers long');
  }
  if (!isNumber(coordinates[0]) || !isNumber(coordinates[1])) {
    throw new Error('coordinates must contain numbers');
  }
  const geom = {
    type: 'Point',
    coordinates,
  };
  return feature(geom, properties, options);
}
function polygon(coordinates, properties, options = {}) {
  for (const ring of coordinates) {
    if (ring.length < 4) {
      throw new Error(
        'Each LinearRing of a Polygon must have 4 or more Positions.',
      );
    }
    if (ring[ring.length - 1].length !== ring[0].length) {
      throw new Error('First and last Position are not equivalent.');
    }
    for (let j = 0; j < ring[ring.length - 1].length; j++) {
      if (ring[ring.length - 1][j] !== ring[0][j]) {
        throw new Error('First and last Position are not equivalent.');
      }
    }
  }
  const geom = {
    type: 'Polygon',
    coordinates,
  };
  return feature(geom, properties, options);
}
function lineString(coordinates, properties, options = {}) {
  if (coordinates.length < 2) {
    throw new Error('coordinates must be an array of two or more positions');
  }
  const geom = {
    type: 'LineString',
    coordinates,
  };
  return feature(geom, properties, options);
}
function featureCollection(features, options = {}) {
  const fc = { type: 'FeatureCollection' };
  if (options.id) {
    fc.id = options.id;
  }
  if (options.bbox) {
    fc.bbox = options.bbox;
  }
  fc.features = features;
  return fc;
}
function multiLineString(coordinates, properties, options = {}) {
  const geom = {
    type: 'MultiLineString',
    coordinates,
  };
  return feature(geom, properties, options);
}
function multiPolygon(coordinates, properties, options = {}) {
  const geom = {
    type: 'MultiPolygon',
    coordinates,
  };
  return feature(geom, properties, options);
}
function radiansToLength(radians, units = 'kilometers') {
  const factor = factors[units];
  if (!factor) {
    throw new Error(units + ' units is invalid');
  }
  return radians * factor;
}
function radiansToDegrees(radians) {
  const normalisedRadians = radians % (2 * Math.PI);
  return (normalisedRadians * 180) / Math.PI;
}
function degreesToRadians(degrees) {
  const normalisedDegrees = degrees % 360;
  return (normalisedDegrees * Math.PI) / 180;
}
function isNumber(num) {
  return !isNaN(num) && num !== null && !Array.isArray(num);
}
function isObject$1(input) {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}
function getCoord(coord) {
  if (!coord) {
    throw new Error('coord is required');
  }
  if (!Array.isArray(coord)) {
    if (
      coord.type === 'Feature' &&
      coord.geometry !== null &&
      coord.geometry.type === 'Point'
    ) {
      return [...coord.geometry.coordinates];
    }
    if (coord.type === 'Point') {
      return [...coord.coordinates];
    }
  }
  if (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    !Array.isArray(coord[0]) &&
    !Array.isArray(coord[1])
  ) {
    return [...coord];
  }
  throw new Error('coord must be GeoJSON Point or an Array of numbers');
}
function getCoords(coords) {
  if (Array.isArray(coords)) {
    return coords;
  }
  if (coords.type === 'Feature') {
    if (coords.geometry !== null) {
      return coords.geometry.coordinates;
    }
  } else {
    if (coords.coordinates) {
      return coords.coordinates;
    }
  }
  throw new Error(
    'coords must be GeoJSON Feature, Geometry Object or an Array',
  );
}
function getGeom(geojson) {
  if (geojson.type === 'Feature') {
    return geojson.geometry;
  }
  return geojson;
}
function getType(geojson, _name) {
  if (geojson.type === 'FeatureCollection') {
    return 'FeatureCollection';
  }
  if (geojson.type === 'GeometryCollection') {
    return 'GeometryCollection';
  }
  if (geojson.type === 'Feature' && geojson.geometry !== null) {
    return geojson.geometry.type;
  }
  return geojson.type;
}
function booleanPointOnLine(pt, line, options = {}) {
  const ptCoords = getCoord(pt);
  const lineCoords = getCoords(line);
  for (let i = 0; i < lineCoords.length - 1; i++) {
    let ignoreBoundary = false;
    if (options.ignoreEndVertices) {
      if (i === 0) {
        ignoreBoundary = 'start';
      }
      if (i === lineCoords.length - 2) {
        ignoreBoundary = 'end';
      }
      if (i === 0 && i + 1 === lineCoords.length - 1) {
        ignoreBoundary = 'both';
      }
    }
    if (
      isPointOnLineSegment$1(
        lineCoords[i],
        lineCoords[i + 1],
        ptCoords,
        ignoreBoundary,
        typeof options.epsilon === 'undefined' ? null : options.epsilon,
      )
    ) {
      return true;
    }
  }
  return false;
}
function isPointOnLineSegment$1(
  lineSegmentStart,
  lineSegmentEnd,
  pt,
  excludeBoundary,
  epsilon2,
) {
  const x = pt[0];
  const y = pt[1];
  const x1 = lineSegmentStart[0];
  const y1 = lineSegmentStart[1];
  const x2 = lineSegmentEnd[0];
  const y2 = lineSegmentEnd[1];
  const dxc = pt[0] - x1;
  const dyc = pt[1] - y1;
  const dxl = x2 - x1;
  const dyl = y2 - y1;
  const cross2 = dxc * dyl - dyc * dxl;
  if (epsilon2 !== null) {
    if (Math.abs(cross2) > epsilon2) {
      return false;
    }
  } else if (cross2 !== 0) {
    return false;
  }
  if (Math.abs(dxl) === Math.abs(dyl) && Math.abs(dxl) === 0) {
    if (excludeBoundary) {
      return false;
    }
    if (pt[0] === lineSegmentStart[0] && pt[1] === lineSegmentStart[1]) {
      return true;
    } else {
      return false;
    }
  }
  if (!excludeBoundary) {
    if (Math.abs(dxl) >= Math.abs(dyl)) {
      return dxl > 0 ? x1 <= x && x <= x2 : x2 <= x && x <= x1;
    }
    return dyl > 0 ? y1 <= y && y <= y2 : y2 <= y && y <= y1;
  } else if (excludeBoundary === 'start') {
    if (Math.abs(dxl) >= Math.abs(dyl)) {
      return dxl > 0 ? x1 < x && x <= x2 : x2 <= x && x < x1;
    }
    return dyl > 0 ? y1 < y && y <= y2 : y2 <= y && y < y1;
  } else if (excludeBoundary === 'end') {
    if (Math.abs(dxl) >= Math.abs(dyl)) {
      return dxl > 0 ? x1 <= x && x < x2 : x2 < x && x <= x1;
    }
    return dyl > 0 ? y1 <= y && y < y2 : y2 < y && y <= y1;
  } else if (excludeBoundary === 'both') {
    if (Math.abs(dxl) >= Math.abs(dyl)) {
      return dxl > 0 ? x1 < x && x < x2 : x2 < x && x < x1;
    }
    return dyl > 0 ? y1 < y && y < y2 : y2 < y && y < y1;
  }
  return false;
}
function cleanCoords(geojson, options = {}) {
  var mutate = typeof options === 'object' ? options.mutate : options;
  if (!geojson) throw new Error('geojson is required');
  var type = getType(geojson);
  var newCoords = [];
  switch (type) {
    case 'LineString':
      newCoords = cleanLine(geojson, type);
      break;
    case 'MultiLineString':
    case 'Polygon':
      getCoords(geojson).forEach(function (line) {
        newCoords.push(cleanLine(line, type));
      });
      break;
    case 'MultiPolygon':
      getCoords(geojson).forEach(function (polygons) {
        var polyPoints = [];
        polygons.forEach(function (ring) {
          polyPoints.push(cleanLine(ring, type));
        });
        newCoords.push(polyPoints);
      });
      break;
    case 'Point':
      return geojson;
    case 'MultiPoint':
      var existing = {};
      getCoords(geojson).forEach(function (coord) {
        var key = coord.join('-');
        if (!Object.prototype.hasOwnProperty.call(existing, key)) {
          newCoords.push(coord);
          existing[key] = true;
        }
      });
      break;
    default:
      throw new Error(type + ' geometry not supported');
  }
  if (geojson.coordinates) {
    if (mutate === true) {
      geojson.coordinates = newCoords;
      return geojson;
    }
    return { type, coordinates: newCoords };
  } else {
    if (mutate === true) {
      geojson.geometry.coordinates = newCoords;
      return geojson;
    }
    return feature({ type, coordinates: newCoords }, geojson.properties, {
      bbox: geojson.bbox,
      id: geojson.id,
    });
  }
}
function cleanLine(line, type) {
  const points = getCoords(line);
  if (points.length === 2 && !equals(points[0], points[1])) return points;
  const newPoints = [];
  let a = 0,
    b = 1,
    c = 2;
  newPoints.push(points[a]);
  while (c < points.length) {
    if (booleanPointOnLine(points[b], lineString([points[a], points[c]]))) {
      b = c;
    } else {
      newPoints.push(points[b]);
      a = b;
      b++;
      c = b;
    }
    c++;
  }
  newPoints.push(points[b]);
  if (type === 'Polygon' || type === 'MultiPolygon') {
    if (
      booleanPointOnLine(
        newPoints[0],
        lineString([newPoints[1], newPoints[newPoints.length - 2]]),
      )
    ) {
      newPoints.shift();
      newPoints.pop();
      newPoints.push(newPoints[0]);
    }
    if (newPoints.length < 4) {
      throw new Error('invalid polygon, fewer than 4 points');
    }
    if (!equals(newPoints[0], newPoints[newPoints.length - 1])) {
      throw new Error('invalid polygon, first and last points not equal');
    }
  }
  return newPoints;
}
function equals(pt1, pt2) {
  return pt1[0] === pt2[0] && pt1[1] === pt2[1];
}
function distance(from, to, options = {}) {
  var coordinates1 = getCoord(from);
  var coordinates2 = getCoord(to);
  var dLat = degreesToRadians(coordinates2[1] - coordinates1[1]);
  var dLon = degreesToRadians(coordinates2[0] - coordinates1[0]);
  var lat1 = degreesToRadians(coordinates1[1]);
  var lat2 = degreesToRadians(coordinates2[1]);
  var a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
  return radiansToLength(
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
    options.units,
  );
}
function coordEach(geojson, callback, excludeWrapCoord) {
  if (geojson === null) return;
  var j,
    k,
    l,
    geometry,
    stopG,
    coords,
    geometryMaybeCollection,
    wrapShrink = 0,
    coordIndex = 0,
    isGeometryCollection,
    type = geojson.type,
    isFeatureCollection2 = type === 'FeatureCollection',
    isFeature = type === 'Feature',
    stop = isFeatureCollection2 ? geojson.features.length : 1;
  for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
    geometryMaybeCollection = isFeatureCollection2
      ? // @ts-expect-error: Known type conflict
        geojson.features[featureIndex].geometry
      : isFeature
        ? // @ts-expect-error: Known type conflict
          geojson.geometry
        : geojson;
    isGeometryCollection = geometryMaybeCollection
      ? geometryMaybeCollection.type === 'GeometryCollection'
      : false;
    stopG = isGeometryCollection
      ? geometryMaybeCollection.geometries.length
      : 1;
    for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
      var multiFeatureIndex = 0;
      var geometryIndex = 0;
      geometry = isGeometryCollection
        ? geometryMaybeCollection.geometries[geomIndex]
        : geometryMaybeCollection;
      if (geometry === null) continue;
      coords = geometry.coordinates;
      var geomType = geometry.type;
      wrapShrink =
        excludeWrapCoord &&
        (geomType === 'Polygon' || geomType === 'MultiPolygon')
          ? 1
          : 0;
      switch (geomType) {
        case null:
          break;
        case 'Point':
          if (
            // @ts-expect-error: Known type conflict
            callback(
              coords,
              coordIndex,
              featureIndex,
              multiFeatureIndex,
              geometryIndex,
            ) === false
          )
            return false;
          coordIndex++;
          multiFeatureIndex++;
          break;
        case 'LineString':
        case 'MultiPoint':
          for (j = 0; j < coords.length; j++) {
            if (
              // @ts-expect-error: Known type conflict
              callback(
                coords[j],
                coordIndex,
                featureIndex,
                multiFeatureIndex,
                geometryIndex,
              ) === false
            )
              return false;
            coordIndex++;
            if (geomType === 'MultiPoint') multiFeatureIndex++;
          }
          if (geomType === 'LineString') multiFeatureIndex++;
          break;
        case 'Polygon':
        case 'MultiLineString':
          for (j = 0; j < coords.length; j++) {
            for (k = 0; k < coords[j].length - wrapShrink; k++) {
              if (
                // @ts-expect-error: Known type conflict
                callback(
                  coords[j][k],
                  coordIndex,
                  featureIndex,
                  multiFeatureIndex,
                  geometryIndex,
                ) === false
              )
                return false;
              coordIndex++;
            }
            if (geomType === 'MultiLineString') multiFeatureIndex++;
            if (geomType === 'Polygon') geometryIndex++;
          }
          if (geomType === 'Polygon') multiFeatureIndex++;
          break;
        case 'MultiPolygon':
          for (j = 0; j < coords.length; j++) {
            geometryIndex = 0;
            for (k = 0; k < coords[j].length; k++) {
              for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                if (
                  // @ts-expect-error: Known type conflict
                  callback(
                    coords[j][k][l],
                    coordIndex,
                    featureIndex,
                    multiFeatureIndex,
                    geometryIndex,
                  ) === false
                )
                  return false;
                coordIndex++;
              }
              geometryIndex++;
            }
            multiFeatureIndex++;
          }
          break;
        case 'GeometryCollection':
          for (j = 0; j < geometry.geometries.length; j++)
            if (
              // @ts-expect-error: Known type conflict
              coordEach(geometry.geometries[j], callback, excludeWrapCoord) ===
              false
            )
              return false;
          break;
        default:
          throw new Error('Unknown Geometry Type');
      }
    }
  }
}
function featureEach(geojson, callback) {
  if (geojson.type === 'Feature') {
    callback(geojson, 0);
  } else if (geojson.type === 'FeatureCollection') {
    for (var i = 0; i < geojson.features.length; i++) {
      if (callback(geojson.features[i], i) === false) break;
    }
  }
}
function featureReduce(geojson, callback, initialValue) {
  var previousValue = initialValue;
  featureEach(geojson, function (currentFeature, featureIndex) {
    if (featureIndex === 0 && initialValue === void 0)
      previousValue = currentFeature;
    else previousValue = callback(previousValue, currentFeature, featureIndex);
  });
  return previousValue;
}
function geomEach(geojson, callback) {
  var i,
    j,
    g,
    geometry,
    stopG,
    geometryMaybeCollection,
    isGeometryCollection,
    featureProperties,
    featureBBox,
    featureId2,
    featureIndex = 0,
    isFeatureCollection2 = geojson.type === 'FeatureCollection',
    isFeature = geojson.type === 'Feature',
    stop = isFeatureCollection2 ? geojson.features.length : 1;
  for (i = 0; i < stop; i++) {
    geometryMaybeCollection = isFeatureCollection2
      ? // @ts-expect-error: Known type conflict
        geojson.features[i].geometry
      : isFeature
        ? // @ts-expect-error: Known type conflict
          geojson.geometry
        : geojson;
    featureProperties = isFeatureCollection2
      ? // @ts-expect-error: Known type conflict
        geojson.features[i].properties
      : isFeature
        ? // @ts-expect-error: Known type conflict
          geojson.properties
        : {};
    featureBBox = isFeatureCollection2
      ? // @ts-expect-error: Known type conflict
        geojson.features[i].bbox
      : isFeature
        ? // @ts-expect-error: Known type conflict
          geojson.bbox
        : void 0;
    featureId2 = isFeatureCollection2
      ? // @ts-expect-error: Known type conflict
        geojson.features[i].id
      : isFeature
        ? // @ts-expect-error: Known type conflict
          geojson.id
        : void 0;
    isGeometryCollection = geometryMaybeCollection
      ? geometryMaybeCollection.type === 'GeometryCollection'
      : false;
    stopG = isGeometryCollection
      ? geometryMaybeCollection.geometries.length
      : 1;
    for (g = 0; g < stopG; g++) {
      geometry = isGeometryCollection
        ? geometryMaybeCollection.geometries[g]
        : geometryMaybeCollection;
      if (geometry === null) {
        if (
          // @ts-expect-error: Known type conflict
          callback(
            // @ts-expect-error: Known type conflict
            null,
            featureIndex,
            featureProperties,
            featureBBox,
            featureId2,
          ) === false
        )
          return false;
        continue;
      }
      switch (geometry.type) {
        case 'Point':
        case 'LineString':
        case 'MultiPoint':
        case 'Polygon':
        case 'MultiLineString':
        case 'MultiPolygon': {
          if (
            // @ts-expect-error: Known type conflict
            callback(
              geometry,
              featureIndex,
              featureProperties,
              featureBBox,
              featureId2,
            ) === false
          )
            return false;
          break;
        }
        case 'GeometryCollection': {
          for (j = 0; j < geometry.geometries.length; j++) {
            if (
              // @ts-expect-error: Known type conflict
              callback(
                geometry.geometries[j],
                featureIndex,
                featureProperties,
                featureBBox,
                featureId2,
              ) === false
            )
              return false;
          }
          break;
        }
        default:
          throw new Error('Unknown Geometry Type');
      }
    }
    featureIndex++;
  }
}
function geomReduce(geojson, callback, initialValue) {
  var previousValue = initialValue;
  geomEach(
    geojson,
    function (
      currentGeometry,
      featureIndex,
      featureProperties,
      featureBBox,
      featureId2,
    ) {
      previousValue = callback(
        // @ts-expect-error: Known type conflict
        previousValue,
        currentGeometry,
        featureIndex,
        featureProperties,
        featureBBox,
        featureId2,
      );
    },
  );
  return previousValue;
}
function flattenEach(geojson, callback) {
  geomEach(geojson, function (geometry, featureIndex, properties, bbox2, id) {
    var type = geometry === null ? null : geometry.type;
    switch (type) {
      case null:
      case 'Point':
      case 'LineString':
      case 'Polygon':
        if (
          // @ts-expect-error: Known type conflict
          callback(
            feature(geometry, properties, { bbox: bbox2, id }),
            featureIndex,
            0,
          ) === false
        )
          return false;
        return;
    }
    var geomType;
    switch (type) {
      case 'MultiPoint':
        geomType = 'Point';
        break;
      case 'MultiLineString':
        geomType = 'LineString';
        break;
      case 'MultiPolygon':
        geomType = 'Polygon';
        break;
    }
    for (
      var multiFeatureIndex = 0;
      // @ts-expect-error: Known type conflict
      multiFeatureIndex < geometry.coordinates.length;
      multiFeatureIndex++
    ) {
      var coordinate = geometry.coordinates[multiFeatureIndex];
      var geom = {
        type: geomType,
        coordinates: coordinate,
      };
      if (
        // @ts-expect-error: Known type conflict
        callback(feature(geom, properties), featureIndex, multiFeatureIndex) ===
        false
      )
        return false;
    }
  });
}
function area(geojson) {
  return geomReduce(
    geojson,
    (value, geom) => {
      return value + calculateArea(geom);
    },
    0,
  );
}
function calculateArea(geom) {
  let total = 0;
  let i;
  switch (geom.type) {
    case 'Polygon':
      return polygonArea(geom.coordinates);
    case 'MultiPolygon':
      for (i = 0; i < geom.coordinates.length; i++) {
        total += polygonArea(geom.coordinates[i]);
      }
      return total;
    case 'Point':
    case 'MultiPoint':
    case 'LineString':
    case 'MultiLineString':
      return 0;
  }
  return 0;
}
function polygonArea(coords) {
  let total = 0;
  if (coords && coords.length > 0) {
    total += Math.abs(ringArea(coords[0]));
    for (let i = 1; i < coords.length; i++) {
      total -= Math.abs(ringArea(coords[i]));
    }
  }
  return total;
}
var FACTOR = (earthRadius * earthRadius) / 2;
var PI_OVER_180 = Math.PI / 180;
function ringArea(coords) {
  const coordsLength = coords.length - 1;
  if (coordsLength <= 2) return 0;
  let total = 0;
  let i = 0;
  while (i < coordsLength) {
    const lower = coords[i];
    const middle = coords[i + 1 === coordsLength ? 0 : i + 1];
    const upper =
      coords[i + 2 >= coordsLength ? (i + 2) % coordsLength : i + 2];
    const lowerX = lower[0] * PI_OVER_180;
    const middleY = middle[1] * PI_OVER_180;
    const upperX = upper[0] * PI_OVER_180;
    total += (upperX - lowerX) * Math.sin(middleY);
    i++;
  }
  return total * FACTOR;
}
function bbox$1(geojson, options = {}) {
  if (geojson.bbox != null && true !== options.recompute) {
    return geojson.bbox;
  }
  const result = [Infinity, Infinity, -Infinity, -Infinity];
  coordEach(geojson, (coord) => {
    if (result[0] > coord[0]) {
      result[0] = coord[0];
    }
    if (result[1] > coord[1]) {
      result[1] = coord[1];
    }
    if (result[2] < coord[0]) {
      result[2] = coord[0];
    }
    if (result[3] < coord[1]) {
      result[3] = coord[1];
    }
  });
  return result;
}
function bboxPolygon(bbox2, options = {}) {
  const west = Number(bbox2[0]);
  const south = Number(bbox2[1]);
  const east = Number(bbox2[2]);
  const north = Number(bbox2[3]);
  if (bbox2.length === 6) {
    throw new Error(
      '@turf/bbox-polygon does not support BBox with 6 positions',
    );
  }
  const lowLeft = [west, south];
  const topLeft = [west, north];
  const topRight = [east, north];
  const lowRight = [east, south];
  return polygon(
    [[lowLeft, lowRight, topRight, topLeft, lowLeft]],
    options.properties,
    { bbox: bbox2, id: options.id },
  );
}
const epsilon = 11102230246251565e-32;
const splitter = 134217729;
const resulterrbound = (3 + 8 * epsilon) * epsilon;
function sum(elen, e, flen, f, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}
const ccwerrboundA = (3 + 16 * epsilon) * epsilon;
const ccwerrboundB = (2 + 12 * epsilon) * epsilon;
const ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon;
const B = vec(4);
const C1 = vec(8);
const C2 = vec(12);
const D = vec(16);
const u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u3;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  B[2] = _j - (u3 - bvirt) + (_i - bvirt);
  B[3] = u3;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound) return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  u[2] = _j - (u3 - bvirt) + (_i - bvirt);
  u[3] = u3;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  u[2] = _j - (u3 - bvirt) + (_i - bvirt);
  u[3] = u3;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  u[2] = _j - (u3 - bvirt) + (_i - bvirt);
  u[3] = u3;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum) return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}
function pointInPolygon$1(p, polygon2) {
  var i;
  var ii;
  var k = 0;
  var f;
  var u1;
  var v1;
  var u2;
  var v2;
  var currentP;
  var nextP;
  var x = p[0];
  var y = p[1];
  var numContours = polygon2.length;
  for (i = 0; i < numContours; i++) {
    ii = 0;
    var contour = polygon2[i];
    var contourLen = contour.length - 1;
    currentP = contour[0];
    if (
      currentP[0] !== contour[contourLen][0] &&
      currentP[1] !== contour[contourLen][1]
    ) {
      throw new Error('First and last coordinates in a ring must be the same');
    }
    u1 = currentP[0] - x;
    v1 = currentP[1] - y;
    for (ii; ii < contourLen; ii++) {
      nextP = contour[ii + 1];
      u2 = nextP[0] - x;
      v2 = nextP[1] - y;
      if (v1 === 0 && v2 === 0) {
        if ((u2 <= 0 && u1 >= 0) || (u1 <= 0 && u2 >= 0)) {
          return 0;
        }
      } else if ((v2 >= 0 && v1 <= 0) || (v2 <= 0 && v1 >= 0)) {
        f = orient2d(u1, u2, v1, v2, 0, 0);
        if (f === 0) {
          return 0;
        }
        if ((f > 0 && v2 > 0 && v1 <= 0) || (f < 0 && v2 <= 0 && v1 > 0)) {
          k++;
        }
      }
      currentP = nextP;
      v1 = v2;
      u1 = u2;
    }
  }
  if (k % 2 === 0) {
    return false;
  }
  return true;
}
function booleanPointInPolygon(point2, polygon2, options = {}) {
  if (!point2) {
    throw new Error('point is required');
  }
  if (!polygon2) {
    throw new Error('polygon is required');
  }
  const pt = getCoord(point2);
  const geom = getGeom(polygon2);
  const type = geom.type;
  const bbox2 = polygon2.bbox;
  let polys = geom.coordinates;
  if (bbox2 && inBBox(pt, bbox2) === false) {
    return false;
  }
  if (type === 'Polygon') {
    polys = [polys];
  }
  let result = false;
  for (var i = 0; i < polys.length; ++i) {
    const polyResult = pointInPolygon$1(pt, polys[i]);
    if (polyResult === 0) return options.ignoreBoundary ? false : true;
    else if (polyResult) result = true;
  }
  return result;
}
function inBBox(pt, bbox2) {
  return (
    bbox2[0] <= pt[0] &&
    bbox2[1] <= pt[1] &&
    bbox2[2] >= pt[0] &&
    bbox2[3] >= pt[1]
  );
}
function quickselect(arr, k, left, right, compare2) {
  quickselectStep(
    arr,
    k,
    left || 0,
    right || arr.length - 1,
    compare2 || defaultCompare$2,
  );
}
function quickselectStep(arr, k, left, right, compare2) {
  while (right > left) {
    if (right - left > 600) {
      var n = right - left + 1;
      var m = k - left + 1;
      var z = Math.log(n);
      var s = 0.5 * Math.exp((2 * z) / 3);
      var sd =
        0.5 * Math.sqrt((z * s * (n - s)) / n) * (m - n / 2 < 0 ? -1 : 1);
      var newLeft = Math.max(left, Math.floor(k - (m * s) / n + sd));
      var newRight = Math.min(right, Math.floor(k + ((n - m) * s) / n + sd));
      quickselectStep(arr, k, newLeft, newRight, compare2);
    }
    var t = arr[k];
    var i = left;
    var j = right;
    swap(arr, left, k);
    if (compare2(arr[right], t) > 0) swap(arr, left, right);
    while (i < j) {
      swap(arr, i, j);
      i++;
      j--;
      while (compare2(arr[i], t) < 0) i++;
      while (compare2(arr[j], t) > 0) j--;
    }
    if (compare2(arr[left], t) === 0) swap(arr, left, j);
    else {
      j++;
      swap(arr, j, right);
    }
    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
}
function swap(arr, i, j) {
  var tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultCompare$2(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
let RBush$1 = class RBush {
  constructor(maxEntries = 9) {
    this._maxEntries = Math.max(4, maxEntries);
    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
    this.clear();
  }
  all() {
    return this._all(this.data, []);
  }
  search(bbox2) {
    let node = this.data;
    const result = [];
    if (!intersects(bbox2, node)) return result;
    const toBBox2 = this.toBBox;
    const nodesToSearch = [];
    while (node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childBBox = node.leaf ? toBBox2(child) : child;
        if (intersects(bbox2, childBBox)) {
          if (node.leaf) result.push(child);
          else if (contains(bbox2, childBBox)) this._all(child, result);
          else nodesToSearch.push(child);
        }
      }
      node = nodesToSearch.pop();
    }
    return result;
  }
  collides(bbox2) {
    let node = this.data;
    if (!intersects(bbox2, node)) return false;
    const nodesToSearch = [];
    while (node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childBBox = node.leaf ? this.toBBox(child) : child;
        if (intersects(bbox2, childBBox)) {
          if (node.leaf || contains(bbox2, childBBox)) return true;
          nodesToSearch.push(child);
        }
      }
      node = nodesToSearch.pop();
    }
    return false;
  }
  load(data) {
    if (!(data && data.length)) return this;
    if (data.length < this._minEntries) {
      for (let i = 0; i < data.length; i++) {
        this.insert(data[i]);
      }
      return this;
    }
    let node = this._build(data.slice(), 0, data.length - 1, 0);
    if (!this.data.children.length) {
      this.data = node;
    } else if (this.data.height === node.height) {
      this._splitRoot(this.data, node);
    } else {
      if (this.data.height < node.height) {
        const tmpNode = this.data;
        this.data = node;
        node = tmpNode;
      }
      this._insert(node, this.data.height - node.height - 1, true);
    }
    return this;
  }
  insert(item) {
    if (item) this._insert(item, this.data.height - 1);
    return this;
  }
  clear() {
    this.data = createNode([]);
    return this;
  }
  remove(item, equalsFn) {
    if (!item) return this;
    let node = this.data;
    const bbox2 = this.toBBox(item);
    const path2 = [];
    const indexes = [];
    let i, parent, goingUp;
    while (node || path2.length) {
      if (!node) {
        node = path2.pop();
        parent = path2[path2.length - 1];
        i = indexes.pop();
        goingUp = true;
      }
      if (node.leaf) {
        const index = findItem(item, node.children, equalsFn);
        if (index !== -1) {
          node.children.splice(index, 1);
          path2.push(node);
          this._condense(path2);
          return this;
        }
      }
      if (!goingUp && !node.leaf && contains(node, bbox2)) {
        path2.push(node);
        indexes.push(i);
        i = 0;
        parent = node;
        node = node.children[0];
      } else if (parent) {
        i++;
        node = parent.children[i];
        goingUp = false;
      } else node = null;
    }
    return this;
  }
  toBBox(item) {
    return item;
  }
  compareMinX(a, b) {
    return a.minX - b.minX;
  }
  compareMinY(a, b) {
    return a.minY - b.minY;
  }
  toJSON() {
    return this.data;
  }
  fromJSON(data) {
    this.data = data;
    return this;
  }
  _all(node, result) {
    const nodesToSearch = [];
    while (node) {
      if (node.leaf) result.push(...node.children);
      else nodesToSearch.push(...node.children);
      node = nodesToSearch.pop();
    }
    return result;
  }
  _build(items, left, right, height) {
    const N = right - left + 1;
    let M = this._maxEntries;
    let node;
    if (N <= M) {
      node = createNode(items.slice(left, right + 1));
      calcBBox(node, this.toBBox);
      return node;
    }
    if (!height) {
      height = Math.ceil(Math.log(N) / Math.log(M));
      M = Math.ceil(N / Math.pow(M, height - 1));
    }
    node = createNode([]);
    node.leaf = false;
    node.height = height;
    const N2 = Math.ceil(N / M);
    const N1 = N2 * Math.ceil(Math.sqrt(M));
    multiSelect(items, left, right, N1, this.compareMinX);
    for (let i = left; i <= right; i += N1) {
      const right2 = Math.min(i + N1 - 1, right);
      multiSelect(items, i, right2, N2, this.compareMinY);
      for (let j = i; j <= right2; j += N2) {
        const right3 = Math.min(j + N2 - 1, right2);
        node.children.push(this._build(items, j, right3, height - 1));
      }
    }
    calcBBox(node, this.toBBox);
    return node;
  }
  _chooseSubtree(bbox2, node, level, path2) {
    while (true) {
      path2.push(node);
      if (node.leaf || path2.length - 1 === level) break;
      let minArea = Infinity;
      let minEnlargement = Infinity;
      let targetNode;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const area2 = bboxArea(child);
        const enlargement = enlargedArea(bbox2, child) - area2;
        if (enlargement < minEnlargement) {
          minEnlargement = enlargement;
          minArea = area2 < minArea ? area2 : minArea;
          targetNode = child;
        } else if (enlargement === minEnlargement) {
          if (area2 < minArea) {
            minArea = area2;
            targetNode = child;
          }
        }
      }
      node = targetNode || node.children[0];
    }
    return node;
  }
  _insert(item, level, isNode) {
    const bbox2 = isNode ? item : this.toBBox(item);
    const insertPath = [];
    const node = this._chooseSubtree(bbox2, this.data, level, insertPath);
    node.children.push(item);
    extend(node, bbox2);
    while (level >= 0) {
      if (insertPath[level].children.length > this._maxEntries) {
        this._split(insertPath, level);
        level--;
      } else break;
    }
    this._adjustParentBBoxes(bbox2, insertPath, level);
  }
  // split overflowed node into two
  _split(insertPath, level) {
    const node = insertPath[level];
    const M = node.children.length;
    const m = this._minEntries;
    this._chooseSplitAxis(node, m, M);
    const splitIndex = this._chooseSplitIndex(node, m, M);
    const newNode = createNode(
      node.children.splice(splitIndex, node.children.length - splitIndex),
    );
    newNode.height = node.height;
    newNode.leaf = node.leaf;
    calcBBox(node, this.toBBox);
    calcBBox(newNode, this.toBBox);
    if (level) insertPath[level - 1].children.push(newNode);
    else this._splitRoot(node, newNode);
  }
  _splitRoot(node, newNode) {
    this.data = createNode([node, newNode]);
    this.data.height = node.height + 1;
    this.data.leaf = false;
    calcBBox(this.data, this.toBBox);
  }
  _chooseSplitIndex(node, m, M) {
    let index;
    let minOverlap = Infinity;
    let minArea = Infinity;
    for (let i = m; i <= M - m; i++) {
      const bbox1 = distBBox(node, 0, i, this.toBBox);
      const bbox2 = distBBox(node, i, M, this.toBBox);
      const overlap = intersectionArea(bbox1, bbox2);
      const area2 = bboxArea(bbox1) + bboxArea(bbox2);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        index = i;
        minArea = area2 < minArea ? area2 : minArea;
      } else if (overlap === minOverlap) {
        if (area2 < minArea) {
          minArea = area2;
          index = i;
        }
      }
    }
    return index || M - m;
  }
  // sorts node children by the best axis for split
  _chooseSplitAxis(node, m, M) {
    const compareMinX = node.leaf ? this.compareMinX : compareNodeMinX;
    const compareMinY = node.leaf ? this.compareMinY : compareNodeMinY;
    const xMargin = this._allDistMargin(node, m, M, compareMinX);
    const yMargin = this._allDistMargin(node, m, M, compareMinY);
    if (xMargin < yMargin) node.children.sort(compareMinX);
  }
  // total margin of all possible split distributions where each node is at least m full
  _allDistMargin(node, m, M, compare2) {
    node.children.sort(compare2);
    const toBBox2 = this.toBBox;
    const leftBBox = distBBox(node, 0, m, toBBox2);
    const rightBBox = distBBox(node, M - m, M, toBBox2);
    let margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);
    for (let i = m; i < M - m; i++) {
      const child = node.children[i];
      extend(leftBBox, node.leaf ? toBBox2(child) : child);
      margin += bboxMargin(leftBBox);
    }
    for (let i = M - m - 1; i >= m; i--) {
      const child = node.children[i];
      extend(rightBBox, node.leaf ? toBBox2(child) : child);
      margin += bboxMargin(rightBBox);
    }
    return margin;
  }
  _adjustParentBBoxes(bbox2, path2, level) {
    for (let i = level; i >= 0; i--) {
      extend(path2[i], bbox2);
    }
  }
  _condense(path2) {
    for (let i = path2.length - 1, siblings; i >= 0; i--) {
      if (path2[i].children.length === 0) {
        if (i > 0) {
          siblings = path2[i - 1].children;
          siblings.splice(siblings.indexOf(path2[i]), 1);
        } else this.clear();
      } else calcBBox(path2[i], this.toBBox);
    }
  }
};
function findItem(item, items, equalsFn) {
  if (!equalsFn) return items.indexOf(item);
  for (let i = 0; i < items.length; i++) {
    if (equalsFn(item, items[i])) return i;
  }
  return -1;
}
function calcBBox(node, toBBox2) {
  distBBox(node, 0, node.children.length, toBBox2, node);
}
function distBBox(node, k, p, toBBox2, destNode) {
  if (!destNode) destNode = createNode(null);
  destNode.minX = Infinity;
  destNode.minY = Infinity;
  destNode.maxX = -Infinity;
  destNode.maxY = -Infinity;
  for (let i = k; i < p; i++) {
    const child = node.children[i];
    extend(destNode, node.leaf ? toBBox2(child) : child);
  }
  return destNode;
}
function extend(a, b) {
  a.minX = Math.min(a.minX, b.minX);
  a.minY = Math.min(a.minY, b.minY);
  a.maxX = Math.max(a.maxX, b.maxX);
  a.maxY = Math.max(a.maxY, b.maxY);
  return a;
}
function compareNodeMinX(a, b) {
  return a.minX - b.minX;
}
function compareNodeMinY(a, b) {
  return a.minY - b.minY;
}
function bboxArea(a) {
  return (a.maxX - a.minX) * (a.maxY - a.minY);
}
function bboxMargin(a) {
  return a.maxX - a.minX + (a.maxY - a.minY);
}
function enlargedArea(a, b) {
  return (
    (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
    (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY))
  );
}
function intersectionArea(a, b) {
  const minX = Math.max(a.minX, b.minX);
  const minY = Math.max(a.minY, b.minY);
  const maxX = Math.min(a.maxX, b.maxX);
  const maxY = Math.min(a.maxY, b.maxY);
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}
function contains(a, b) {
  return (
    a.minX <= b.minX && a.minY <= b.minY && b.maxX <= a.maxX && b.maxY <= a.maxY
  );
}
function intersects(a, b) {
  return (
    b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY
  );
}
function createNode(children) {
  return {
    children,
    height: 1,
    leaf: true,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}
function multiSelect(arr, left, right, n, compare2) {
  const stack = [left, right];
  while (stack.length) {
    right = stack.pop();
    left = stack.pop();
    if (right - left <= n) continue;
    const mid = left + Math.ceil((right - left) / n / 2) * n;
    quickselect(arr, mid, left, right, compare2);
    stack.push(left, mid, mid, right);
  }
}
const rbush = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.defineProperty(
    {
      __proto__: null,
      default: RBush$1,
    },
    Symbol.toStringTag,
    { value: 'Module' },
  ),
);
function toBBox(geojson) {
  var bbox2;
  if (geojson.bbox) bbox2 = geojson.bbox;
  else if (Array.isArray(geojson) && geojson.length === 4) bbox2 = geojson;
  else if (Array.isArray(geojson) && geojson.length === 6)
    bbox2 = [geojson[0], geojson[1], geojson[3], geojson[4]];
  else if (geojson.type === 'Feature') bbox2 = bbox$1(geojson);
  else if (geojson.type === 'FeatureCollection') bbox2 = bbox$1(geojson);
  else throw new Error('invalid geojson');
  return {
    minX: bbox2[0],
    minY: bbox2[1],
    maxX: bbox2[2],
    maxY: bbox2[3],
  };
}
var RBush2 = class {
  constructor(maxEntries = 9) {
    this.tree = new RBush$1(maxEntries);
    this.tree.toBBox = toBBox;
  }
  /**
   * [insert](https://github.com/mourner/rbush#data-format)
   *
   * @memberof rbush
   * @param {Feature} feature insert single GeoJSON Feature
   * @returns {RBush} GeoJSON RBush
   * @example
   * var poly = turf.polygon([[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]);
   * tree.insert(poly)
   */
  insert(feature2) {
    if (feature2.type !== 'Feature') throw new Error('invalid feature');
    feature2.bbox = feature2.bbox ? feature2.bbox : bbox$1(feature2);
    this.tree.insert(feature2);
    return this;
  }
  /**
   * [load](https://github.com/mourner/rbush#bulk-inserting-data)
   *
   * @memberof rbush
   * @param {FeatureCollection|Array<Feature>} features load entire GeoJSON FeatureCollection
   * @returns {RBush} GeoJSON RBush
   * @example
   * var polys = turf.polygons([
   *     [[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]],
   *     [[[-93, 32], [-83, 32], [-83, 39], [-93, 39], [-93, 32]]]
   * ]);
   * tree.load(polys);
   */
  load(features) {
    var load = [];
    if (Array.isArray(features)) {
      features.forEach(function (feature2) {
        if (feature2.type !== 'Feature') throw new Error('invalid features');
        feature2.bbox = feature2.bbox ? feature2.bbox : bbox$1(feature2);
        load.push(feature2);
      });
    } else {
      featureEach(features, function (feature2) {
        if (feature2.type !== 'Feature') throw new Error('invalid features');
        feature2.bbox = feature2.bbox ? feature2.bbox : bbox$1(feature2);
        load.push(feature2);
      });
    }
    this.tree.load(load);
    return this;
  }
  /**
   * [remove](https://github.com/mourner/rbush#removing-data)
   *
   * @memberof rbush
   * @param {Feature} feature remove single GeoJSON Feature
   * @param {Function} equals Pass a custom equals function to compare by value for removal.
   * @returns {RBush} GeoJSON RBush
   * @example
   * var poly = turf.polygon([[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]);
   *
   * tree.remove(poly);
   */
  remove(feature2, equals2) {
    if (feature2.type !== 'Feature') throw new Error('invalid feature');
    feature2.bbox = feature2.bbox ? feature2.bbox : bbox$1(feature2);
    this.tree.remove(feature2, equals2);
    return this;
  }
  /**
   * [clear](https://github.com/mourner/rbush#removing-data)
   *
   * @memberof rbush
   * @returns {RBush} GeoJSON Rbush
   * @example
   * tree.clear()
   */
  clear() {
    this.tree.clear();
    return this;
  }
  /**
   * [search](https://github.com/mourner/rbush#search)
   *
   * @memberof rbush
   * @param {BBox|FeatureCollection|Feature} geojson search with GeoJSON
   * @returns {FeatureCollection} all features that intersects with the given GeoJSON.
   * @example
   * var poly = turf.polygon([[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]);
   *
   * tree.search(poly);
   */
  search(geojson) {
    var features = this.tree.search(toBBox(geojson));
    return featureCollection(features);
  }
  /**
   * [collides](https://github.com/mourner/rbush#collisions)
   *
   * @memberof rbush
   * @param {BBox|FeatureCollection|Feature} geojson collides with GeoJSON
   * @returns {boolean} true if there are any items intersecting the given GeoJSON, otherwise false.
   * @example
   * var poly = turf.polygon([[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]);
   *
   * tree.collides(poly);
   */
  collides(geojson) {
    return this.tree.collides(toBBox(geojson));
  }
  /**
   * [all](https://github.com/mourner/rbush#search)
   *
   * @memberof rbush
   * @returns {FeatureCollection} all the features in RBush
   * @example
   * tree.all()
   */
  all() {
    const features = this.tree.all();
    return featureCollection(features);
  }
  /**
   * [toJSON](https://github.com/mourner/rbush#export-and-import)
   *
   * @memberof rbush
   * @returns {any} export data as JSON object
   * @example
   * var exported = tree.toJSON()
   */
  toJSON() {
    return this.tree.toJSON();
  }
  /**
   * [fromJSON](https://github.com/mourner/rbush#export-and-import)
   *
   * @memberof rbush
   * @param {any} json import previously exported data
   * @returns {RBush} GeoJSON RBush
   * @example
   * var exported = {
   *   "children": [
   *     {
   *       "type": "Feature",
   *       "geometry": {
   *         "type": "Point",
   *         "coordinates": [110, 50]
   *       },
   *       "properties": {},
   *       "bbox": [110, 50, 110, 50]
   *     }
   *   ],
   *   "height": 1,
   *   "leaf": true,
   *   "minX": 110,
   *   "minY": 50,
   *   "maxX": 110,
   *   "maxY": 50
   * }
   * tree.fromJSON(exported)
   */
  fromJSON(json2) {
    this.tree.fromJSON(json2);
    return this;
  }
};
function geojsonRbush(maxEntries) {
  return new RBush2(maxEntries);
}
function truncate(geojson, options) {
  options = options != null ? options : {};
  if (!isObject$1(options)) throw new Error('options is invalid');
  var precision2 = options.precision;
  var coordinates = options.coordinates;
  var mutate = options.mutate;
  precision2 =
    precision2 === void 0 || precision2 === null || isNaN(precision2)
      ? 6
      : precision2;
  coordinates =
    coordinates === void 0 || coordinates === null || isNaN(coordinates)
      ? 3
      : coordinates;
  if (!geojson) throw new Error('<geojson> is required');
  if (typeof precision2 !== 'number')
    throw new Error('<precision> must be a number');
  if (typeof coordinates !== 'number')
    throw new Error('<coordinates> must be a number');
  if (mutate === false || mutate === void 0)
    geojson = JSON.parse(JSON.stringify(geojson));
  var factor = Math.pow(10, precision2);
  coordEach(geojson, function (coords) {
    truncateCoords(coords, factor, coordinates);
  });
  return geojson;
}
function truncateCoords(coords, factor, coordinates) {
  if (coords.length > coordinates) coords.splice(coordinates, coords.length);
  for (var i = 0; i < coords.length; i++) {
    coords[i] = Math.round(coords[i] * factor) / factor;
  }
  return coords;
}
function lineSegment(geojson) {
  if (!geojson) {
    throw new Error('geojson is required');
  }
  const results = [];
  flattenEach(geojson, (feature2) => {
    lineSegmentFeature(feature2, results);
  });
  return featureCollection(results);
}
function lineSegmentFeature(geojson, results) {
  let coords = [];
  const geometry = geojson.geometry;
  if (geometry !== null) {
    switch (geometry.type) {
      case 'Polygon':
        coords = getCoords(geometry);
        break;
      case 'LineString':
        coords = [getCoords(geometry)];
    }
    coords.forEach((coord) => {
      const segments = createSegments(coord, geojson.properties);
      segments.forEach((segment) => {
        segment.id = results.length;
        results.push(segment);
      });
    });
  }
}
function createSegments(coords, properties) {
  const segments = [];
  coords.reduce((previousCoords, currentCoords) => {
    const segment = lineString([previousCoords, currentCoords], properties);
    segment.bbox = bbox(previousCoords, currentCoords);
    segments.push(segment);
    return currentCoords;
  });
  return segments;
}
function bbox(coords1, coords2) {
  const x1 = coords1[0];
  const y1 = coords1[1];
  const x2 = coords2[0];
  const y2 = coords2[1];
  const west = x1 < x2 ? x1 : x2;
  const south = y1 < y2 ? y1 : y2;
  const east = x1 > x2 ? x1 : x2;
  const north = y1 > y2 ? y1 : y2;
  return [west, south, east, north];
}
let TinyQueue$2 = class TinyQueue {
  constructor(data = [], compare2 = defaultCompare$1) {
    this.data = data;
    this.length = this.data.length;
    this.compare = compare2;
    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
    }
  }
  push(item) {
    this.data.push(item);
    this.length++;
    this._up(this.length - 1);
  }
  pop() {
    if (this.length === 0) return void 0;
    const top = this.data[0];
    const bottom = this.data.pop();
    this.length--;
    if (this.length > 0) {
      this.data[0] = bottom;
      this._down(0);
    }
    return top;
  }
  peek() {
    return this.data[0];
  }
  _up(pos) {
    const { data, compare: compare2 } = this;
    const item = data[pos];
    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      const current = data[parent];
      if (compare2(item, current) >= 0) break;
      data[pos] = current;
      pos = parent;
    }
    data[pos] = item;
  }
  _down(pos) {
    const { data, compare: compare2 } = this;
    const halfLength = this.length >> 1;
    const item = data[pos];
    while (pos < halfLength) {
      let left = (pos << 1) + 1;
      let best = data[left];
      const right = left + 1;
      if (right < this.length && compare2(data[right], best) < 0) {
        left = right;
        best = data[right];
      }
      if (compare2(best, item) >= 0) break;
      data[pos] = best;
      pos = left;
    }
    data[pos] = item;
  }
};
function defaultCompare$1(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function checkWhichEventIsLeft(e1, e2) {
  if (e1.p.x > e2.p.x) return 1;
  if (e1.p.x < e2.p.x) return -1;
  if (e1.p.y !== e2.p.y) return e1.p.y > e2.p.y ? 1 : -1;
  return 1;
}
function checkWhichSegmentHasRightEndpointFirst(seg1, seg2) {
  if (seg1.rightSweepEvent.p.x > seg2.rightSweepEvent.p.x) return 1;
  if (seg1.rightSweepEvent.p.x < seg2.rightSweepEvent.p.x) return -1;
  if (seg1.rightSweepEvent.p.y !== seg2.rightSweepEvent.p.y)
    return seg1.rightSweepEvent.p.y < seg2.rightSweepEvent.p.y ? 1 : -1;
  return 1;
}
class Event {
  constructor(p, featureId2, ringId2, eventId2) {
    this.p = {
      x: p[0],
      y: p[1],
    };
    this.featureId = featureId2;
    this.ringId = ringId2;
    this.eventId = eventId2;
    this.otherEvent = null;
    this.isLeftEndpoint = null;
  }
  isSamePoint(eventToCheck) {
    return this.p.x === eventToCheck.p.x && this.p.y === eventToCheck.p.y;
  }
}
function fillEventQueue(geojson, eventQueue) {
  if (geojson.type === 'FeatureCollection') {
    const features = geojson.features;
    for (let i = 0; i < features.length; i++) {
      processFeature(features[i], eventQueue);
    }
  } else {
    processFeature(geojson, eventQueue);
  }
}
let featureId = 0;
let ringId = 0;
let eventId = 0;
function processFeature(featureOrGeometry, eventQueue) {
  const geom =
    featureOrGeometry.type === 'Feature'
      ? featureOrGeometry.geometry
      : featureOrGeometry;
  let coords = geom.coordinates;
  if (geom.type === 'Polygon' || geom.type === 'MultiLineString')
    coords = [coords];
  if (geom.type === 'LineString') coords = [[coords]];
  for (let i = 0; i < coords.length; i++) {
    for (let ii = 0; ii < coords[i].length; ii++) {
      let currentP = coords[i][ii][0];
      let nextP = null;
      ringId = ringId + 1;
      for (let iii = 0; iii < coords[i][ii].length - 1; iii++) {
        nextP = coords[i][ii][iii + 1];
        const e1 = new Event(currentP, featureId, ringId, eventId);
        const e2 = new Event(nextP, featureId, ringId, eventId + 1);
        e1.otherEvent = e2;
        e2.otherEvent = e1;
        if (checkWhichEventIsLeft(e1, e2) > 0) {
          e2.isLeftEndpoint = true;
          e1.isLeftEndpoint = false;
        } else {
          e1.isLeftEndpoint = true;
          e2.isLeftEndpoint = false;
        }
        eventQueue.push(e1);
        eventQueue.push(e2);
        currentP = nextP;
        eventId = eventId + 1;
      }
    }
  }
  featureId = featureId + 1;
}
let Segment$1 = class Segment {
  constructor(event) {
    this.leftSweepEvent = event;
    this.rightSweepEvent = event.otherEvent;
  }
};
function testSegmentIntersect(seg1, seg2) {
  if (seg1 === null || seg2 === null) return false;
  if (
    seg1.leftSweepEvent.ringId === seg2.leftSweepEvent.ringId &&
    (seg1.rightSweepEvent.isSamePoint(seg2.leftSweepEvent) ||
      seg1.rightSweepEvent.isSamePoint(seg2.leftSweepEvent) ||
      seg1.rightSweepEvent.isSamePoint(seg2.rightSweepEvent) ||
      seg1.leftSweepEvent.isSamePoint(seg2.leftSweepEvent) ||
      seg1.leftSweepEvent.isSamePoint(seg2.rightSweepEvent))
  )
    return false;
  const x1 = seg1.leftSweepEvent.p.x;
  const y1 = seg1.leftSweepEvent.p.y;
  const x2 = seg1.rightSweepEvent.p.x;
  const y2 = seg1.rightSweepEvent.p.y;
  const x3 = seg2.leftSweepEvent.p.x;
  const y3 = seg2.leftSweepEvent.p.y;
  const x4 = seg2.rightSweepEvent.p.x;
  const y4 = seg2.rightSweepEvent.p.y;
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  const numeA = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const numeB = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
  if (denom === 0) {
    if (numeA === 0 && numeB === 0) return false;
    return false;
  }
  const uA = numeA / denom;
  const uB = numeB / denom;
  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    const x = x1 + uA * (x2 - x1);
    const y = y1 + uA * (y2 - y1);
    return [x, y];
  }
  return false;
}
function runCheck(eventQueue, ignoreSelfIntersections) {
  ignoreSelfIntersections = ignoreSelfIntersections
    ? ignoreSelfIntersections
    : false;
  const intersectionPoints = [];
  const outQueue = new TinyQueue$2([], checkWhichSegmentHasRightEndpointFirst);
  while (eventQueue.length) {
    const event = eventQueue.pop();
    if (event.isLeftEndpoint) {
      const segment = new Segment$1(event);
      for (let i = 0; i < outQueue.data.length; i++) {
        const otherSeg = outQueue.data[i];
        if (ignoreSelfIntersections) {
          if (otherSeg.leftSweepEvent.featureId === event.featureId) continue;
        }
        const intersection3 = testSegmentIntersect(segment, otherSeg);
        if (intersection3 !== false) intersectionPoints.push(intersection3);
      }
      outQueue.push(segment);
    } else if (event.isLeftEndpoint === false) {
      outQueue.pop();
    }
  }
  return intersectionPoints;
}
function sweeplineIntersections$1(geojson, ignoreSelfIntersections) {
  const eventQueue = new TinyQueue$2([], checkWhichEventIsLeft);
  fillEventQueue(geojson, eventQueue);
  return runCheck(eventQueue, ignoreSelfIntersections);
}
var sweeplineIntersections = sweeplineIntersections$1;
function lineIntersect(line1, line2, options = {}) {
  const { removeDuplicates = true, ignoreSelfIntersections = true } = options;
  let features = [];
  if (line1.type === 'FeatureCollection')
    features = features.concat(line1.features);
  else if (line1.type === 'Feature') features.push(line1);
  else if (
    line1.type === 'LineString' ||
    line1.type === 'Polygon' ||
    line1.type === 'MultiLineString' ||
    line1.type === 'MultiPolygon'
  ) {
    features.push(feature(line1));
  }
  if (line2.type === 'FeatureCollection')
    features = features.concat(line2.features);
  else if (line2.type === 'Feature') features.push(line2);
  else if (
    line2.type === 'LineString' ||
    line2.type === 'Polygon' ||
    line2.type === 'MultiLineString' ||
    line2.type === 'MultiPolygon'
  ) {
    features.push(feature(line2));
  }
  const intersections = sweeplineIntersections(
    featureCollection(features),
    ignoreSelfIntersections,
  );
  let results = [];
  if (removeDuplicates) {
    const unique = {};
    intersections.forEach((intersection3) => {
      const key = intersection3.join(',');
      if (!unique[key]) {
        unique[key] = true;
        results.push(intersection3);
      }
    });
  } else {
    results = intersections;
  }
  return featureCollection(results.map((r) => point(r)));
}
var __defProp$1 = Object.defineProperty;
var __defProps$1 = Object.defineProperties;
var __getOwnPropDescs$1 = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$1 = (obj, key, value) =>
  key in obj
    ? __defProp$1(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __spreadValues$1 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$1.call(b, prop)) __defNormalProp$1(a, prop, b[prop]);
  if (__getOwnPropSymbols$1)
    for (var prop of __getOwnPropSymbols$1(b)) {
      if (__propIsEnum$1.call(b, prop)) __defNormalProp$1(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps$1 = (a, b) => __defProps$1(a, __getOwnPropDescs$1(b));
function nearestPointOnLine(lines, inputPoint, options = {}) {
  if (!lines || !inputPoint) {
    throw new Error('lines and inputPoint are required arguments');
  }
  const inputPos = getCoord(inputPoint);
  let closestPt = point([Infinity, Infinity], {
    lineStringIndex: -1,
    segmentIndex: -1,
    totalDistance: -1,
    lineDistance: -1,
    segmentDistance: -1,
    pointDistance: Infinity,
    // deprecated properties START
    multiFeatureIndex: -1,
    index: -1,
    location: -1,
    dist: Infinity,
    // deprecated properties END
  });
  let totalDistance = 0;
  let lineDistance = 0;
  let currentLineStringIndex = -1;
  flattenEach(lines, function (line, _featureIndex, lineStringIndex) {
    if (currentLineStringIndex !== lineStringIndex) {
      currentLineStringIndex = lineStringIndex;
      lineDistance = 0;
    }
    const coords = getCoords(line);
    for (let i = 0; i < coords.length - 1; i++) {
      const start = point(coords[i]);
      const startPos = getCoord(start);
      const stop = point(coords[i + 1]);
      const stopPos = getCoord(stop);
      const segmentLength = distance(start, stop, options);
      let intersectPos;
      let wasEnd;
      if (stopPos[0] === inputPos[0] && stopPos[1] === inputPos[1]) {
        [intersectPos, wasEnd] = [stopPos, true];
      } else if (startPos[0] === inputPos[0] && startPos[1] === inputPos[1]) {
        [intersectPos, wasEnd] = [startPos, false];
      } else {
        [intersectPos, wasEnd] = nearestPointOnSegment(
          startPos,
          stopPos,
          inputPos,
        );
      }
      const pointDistance = distance(inputPoint, intersectPos, options);
      if (pointDistance < closestPt.properties.pointDistance) {
        const segmentDistance = distance(start, intersectPos, options);
        closestPt = point(intersectPos, {
          lineStringIndex,
          // Legacy behaviour where index progresses to next segment # if we
          // went with the end point this iteration.
          segmentIndex: wasEnd ? i + 1 : i,
          totalDistance: totalDistance + segmentDistance,
          lineDistance: lineDistance + segmentDistance,
          segmentDistance,
          pointDistance,
          // deprecated properties START
          multiFeatureIndex: -1,
          index: -1,
          location: -1,
          dist: Infinity,
          // deprecated properties END
        });
        closestPt.properties = __spreadProps$1(
          __spreadValues$1({}, closestPt.properties),
          {
            multiFeatureIndex: closestPt.properties.lineStringIndex,
            index: closestPt.properties.segmentIndex,
            location: closestPt.properties.totalDistance,
            dist: closestPt.properties.pointDistance,
            // deprecated properties END
          },
        );
      }
      totalDistance += segmentLength;
      lineDistance += segmentLength;
    }
  });
  return closestPt;
}
function dot(v1, v2) {
  const [v1x, v1y, v1z] = v1;
  const [v2x, v2y, v2z] = v2;
  return v1x * v2x + v1y * v2y + v1z * v2z;
}
function cross(v1, v2) {
  const [v1x, v1y, v1z] = v1;
  const [v2x, v2y, v2z] = v2;
  return [v1y * v2z - v1z * v2y, v1z * v2x - v1x * v2z, v1x * v2y - v1y * v2x];
}
function magnitude(v) {
  return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2));
}
function normalize$1(v) {
  const mag = magnitude(v);
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}
function lngLatToVector(a) {
  const lat = degreesToRadians(a[1]);
  const lng = degreesToRadians(a[0]);
  return [
    Math.cos(lat) * Math.cos(lng),
    Math.cos(lat) * Math.sin(lng),
    Math.sin(lat),
  ];
}
function vectorToLngLat(v) {
  const [x, y, z] = v;
  const zClamp = Math.min(Math.max(z, -1), 1);
  const lat = radiansToDegrees(Math.asin(zClamp));
  const lng = radiansToDegrees(Math.atan2(y, x));
  return [lng, lat];
}
function nearestPointOnSegment(posA, posB, posC) {
  const A = lngLatToVector(posA);
  const B2 = lngLatToVector(posB);
  const C = lngLatToVector(posC);
  const segmentAxis = cross(A, B2);
  if (segmentAxis[0] === 0 && segmentAxis[1] === 0 && segmentAxis[2] === 0) {
    if (dot(A, B2) > 0) {
      return [[...posB], true];
    } else {
      return [[...posC], false];
    }
  }
  const targetAxis = cross(segmentAxis, C);
  if (targetAxis[0] === 0 && targetAxis[1] === 0 && targetAxis[2] === 0) {
    return [[...posB], true];
  }
  const intersectionAxis = cross(targetAxis, segmentAxis);
  const I1 = normalize$1(intersectionAxis);
  const I2 = [-I1[0], -I1[1], -I1[2]];
  const I = dot(C, I1) > dot(C, I2) ? I1 : I2;
  const segmentAxisNorm = normalize$1(segmentAxis);
  const cmpAI = dot(cross(A, I), segmentAxisNorm);
  const cmpIB = dot(cross(I, B2), segmentAxisNorm);
  if (cmpAI >= 0 && cmpIB >= 0) {
    return [vectorToLngLat(I), false];
  }
  if (dot(A, C) > dot(B2, C)) {
    return [[...posA], false];
  } else {
    return [[...posB], true];
  }
}
function lineSplit(line, splitter2) {
  if (!line) throw new Error('line is required');
  if (!splitter2) throw new Error('splitter is required');
  const lineType = getType(line);
  const splitterType = getType(splitter2);
  if (lineType !== 'LineString') throw new Error('line must be LineString');
  if (splitterType === 'FeatureCollection')
    throw new Error('splitter cannot be a FeatureCollection');
  if (splitterType === 'GeometryCollection')
    throw new Error('splitter cannot be a GeometryCollection');
  var truncatedSplitter = truncate(splitter2, { precision: 7 });
  if (line.type !== 'Feature') {
    line = feature(line);
  }
  switch (splitterType) {
    case 'Point':
      return splitLineWithPoint(line, truncatedSplitter);
    case 'MultiPoint':
      return splitLineWithPoints(line, truncatedSplitter);
    case 'LineString':
    case 'MultiLineString':
    case 'Polygon':
    case 'MultiPolygon':
      return splitLineWithPoints(
        line,
        lineIntersect(line, truncatedSplitter, {
          ignoreSelfIntersections: true,
        }),
      );
  }
}
function splitLineWithPoints(line, splitter2) {
  var results = [];
  var tree = geojsonRbush();
  flattenEach(
    splitter2,
    // this cast should be unnecessary (and is wrong, it could contain MultiPoints), but is a workaround for bad flattenEach typings
    function (point2) {
      results.forEach(function (feature2, index) {
        feature2.id = index;
      });
      if (!results.length) {
        results = splitLineWithPoint(line, point2).features;
        tree.load(featureCollection(results));
      } else {
        var search = tree.search(point2);
        if (search.features.length) {
          var closestLine = findClosestFeature(point2, search);
          results = results.filter(function (feature2) {
            return feature2.id !== closestLine.id;
          });
          tree.remove(closestLine);
          featureEach(
            splitLineWithPoint(closestLine, point2),
            function (line2) {
              results.push(line2);
              tree.insert(line2);
            },
          );
        }
      }
    },
  );
  return featureCollection(results);
}
function splitLineWithPoint(line, splitter2) {
  var results = [];
  var startPoint = getCoords(line)[0];
  var endPoint = getCoords(line)[line.geometry.coordinates.length - 1];
  if (
    pointsEquals(startPoint, getCoord(splitter2)) ||
    pointsEquals(endPoint, getCoord(splitter2))
  )
    return featureCollection([line]);
  var tree = geojsonRbush();
  var segments = lineSegment(line);
  tree.load(segments);
  var search = tree.search(splitter2);
  if (!search.features.length) return featureCollection([line]);
  var closestSegment = findClosestFeature(splitter2, search);
  var initialValue = [startPoint];
  var lastCoords = featureReduce(
    segments,
    function (previous, current, index) {
      var currentCoords = getCoords(current)[1];
      var splitterCoords = getCoord(splitter2);
      if (index === closestSegment.id) {
        previous.push(splitterCoords);
        results.push(lineString(previous));
        if (pointsEquals(splitterCoords, currentCoords))
          return [splitterCoords];
        return [splitterCoords, currentCoords];
      } else {
        previous.push(currentCoords);
        return previous;
      }
    },
    initialValue,
  );
  if (lastCoords.length > 1) {
    results.push(lineString(lastCoords));
  }
  return featureCollection(results);
}
function findClosestFeature(point2, lines) {
  if (!lines.features.length) throw new Error('lines must contain features');
  if (lines.features.length === 1) return lines.features[0];
  var closestFeature;
  var closestDistance = Infinity;
  featureEach(lines, function (segment) {
    var pt = nearestPointOnLine(segment, point2);
    var dist2 = pt.properties.dist;
    if (dist2 < closestDistance) {
      closestFeature = segment;
      closestDistance = dist2;
    }
  });
  return closestFeature;
}
function pointsEquals(pt1, pt2) {
  return pt1[0] === pt2[0] && pt1[1] === pt2[1];
}
function booleanContains(feature1, feature2) {
  const geom1 = getGeom(feature1);
  const geom2 = getGeom(feature2);
  const type1 = geom1.type;
  const type2 = geom2.type;
  const coords1 = geom1.coordinates;
  const coords2 = geom2.coordinates;
  switch (type1) {
    case 'Point':
      switch (type2) {
        case 'Point':
          return compareCoords$2(coords1, coords2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'MultiPoint':
      switch (type2) {
        case 'Point':
          return isPointInMultiPoint$1(geom1, geom2);
        case 'MultiPoint':
          return isMultiPointInMultiPoint$1(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'LineString':
      switch (type2) {
        case 'Point':
          return booleanPointOnLine(geom2, geom1, { ignoreEndVertices: true });
        case 'LineString':
          return isLineOnLine$2(geom1, geom2);
        case 'MultiPoint':
          return isMultiPointOnLine$1(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'Polygon':
      switch (type2) {
        case 'Point':
          return booleanPointInPolygon(geom2, geom1, { ignoreBoundary: true });
        case 'LineString':
          return isLineInPoly$2(geom1, geom2);
        case 'Polygon':
          return isPolyInPoly$2(geom1, geom2);
        case 'MultiPoint':
          return isMultiPointInPoly$1(geom1, geom2);
        case 'MultiPolygon':
          return isMultiPolyInPoly(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'MultiPolygon':
      switch (type2) {
        case 'Polygon':
          return isPolygonInMultiPolygon(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    default:
      throw new Error('feature1 ' + type1 + ' geometry not supported');
  }
}
function isPolygonInMultiPolygon(multiPolygon2, polygon2) {
  return multiPolygon2.coordinates.some((coords) =>
    isPolyInPoly$2({ type: 'Polygon', coordinates: coords }, polygon2),
  );
}
function isMultiPolyInPoly(polygon2, multiPolygon2) {
  return multiPolygon2.coordinates.every((coords) =>
    isPolyInPoly$2(polygon2, { type: 'Polygon', coordinates: coords }),
  );
}
function isPointInMultiPoint$1(multiPoint, pt) {
  let i;
  let output = false;
  for (i = 0; i < multiPoint.coordinates.length; i++) {
    if (compareCoords$2(multiPoint.coordinates[i], pt.coordinates)) {
      output = true;
      break;
    }
  }
  return output;
}
function isMultiPointInMultiPoint$1(multiPoint1, multiPoint2) {
  for (const coord2 of multiPoint2.coordinates) {
    let matchFound = false;
    for (const coord1 of multiPoint1.coordinates) {
      if (compareCoords$2(coord2, coord1)) {
        matchFound = true;
        break;
      }
    }
    if (!matchFound) {
      return false;
    }
  }
  return true;
}
function isMultiPointOnLine$1(lineString2, multiPoint) {
  let haveFoundInteriorPoint = false;
  for (const coord of multiPoint.coordinates) {
    if (booleanPointOnLine(coord, lineString2, { ignoreEndVertices: true })) {
      haveFoundInteriorPoint = true;
    }
    if (!booleanPointOnLine(coord, lineString2)) {
      return false;
    }
  }
  if (haveFoundInteriorPoint) {
    return true;
  }
  return false;
}
function isMultiPointInPoly$1(polygon2, multiPoint) {
  for (const coord of multiPoint.coordinates) {
    if (!booleanPointInPolygon(coord, polygon2, { ignoreBoundary: true })) {
      return false;
    }
  }
  return true;
}
function isLineOnLine$2(lineString1, lineString2) {
  let haveFoundInteriorPoint = false;
  for (const coords of lineString2.coordinates) {
    if (
      booleanPointOnLine({ type: 'Point', coordinates: coords }, lineString1, {
        ignoreEndVertices: true,
      })
    ) {
      haveFoundInteriorPoint = true;
    }
    if (
      !booleanPointOnLine({ type: 'Point', coordinates: coords }, lineString1, {
        ignoreEndVertices: false,
      })
    ) {
      return false;
    }
  }
  return haveFoundInteriorPoint;
}
function splitLineIntoSegmentsOnPolygon$1(linestring, polygon2) {
  const coords = linestring.coordinates;
  const outputSegments = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const seg = lineString([coords[i], coords[i + 1]]);
    const split = lineSplit(seg, feature(polygon2));
    if (split.features.length === 0) {
      outputSegments.push(seg);
    } else {
      outputSegments.push(...split.features);
    }
  }
  return featureCollection(outputSegments);
}
function isLineInPoly$2(polygon2, linestring) {
  const polyBbox = bbox$1(polygon2);
  const lineBbox = bbox$1(linestring);
  if (!doBBoxOverlap$1(polyBbox, lineBbox)) {
    return false;
  }
  for (const coord of linestring.coordinates) {
    if (!booleanPointInPolygon(coord, polygon2)) {
      return false;
    }
  }
  let isContainedByPolygonBoundary = false;
  const lineSegments = splitLineIntoSegmentsOnPolygon$1(linestring, polygon2);
  for (const lineSegment2 of lineSegments.features) {
    const midpoint = getMidpoint$1(
      lineSegment2.geometry.coordinates[0],
      lineSegment2.geometry.coordinates[1],
    );
    if (!booleanPointInPolygon(midpoint, polygon2)) {
      return false;
    }
    if (
      !isContainedByPolygonBoundary &&
      booleanPointInPolygon(midpoint, polygon2, { ignoreBoundary: true })
    ) {
      isContainedByPolygonBoundary = true;
    }
  }
  return isContainedByPolygonBoundary;
}
function isPolyInPoly$2(feature1, feature2) {
  if (feature1.type === 'Feature' && feature1.geometry === null) {
    return false;
  }
  if (feature2.type === 'Feature' && feature2.geometry === null) {
    return false;
  }
  const poly1Bbox = bbox$1(feature1);
  const poly2Bbox = bbox$1(feature2);
  if (!doBBoxOverlap$1(poly1Bbox, poly2Bbox)) {
    return false;
  }
  const coords = getGeom(feature2).coordinates;
  for (const ring of coords) {
    for (const coord of ring) {
      if (!booleanPointInPolygon(coord, feature1)) {
        return false;
      }
    }
  }
  return true;
}
function doBBoxOverlap$1(bbox1, bbox2) {
  if (bbox1[0] > bbox2[0]) {
    return false;
  }
  if (bbox1[2] < bbox2[2]) {
    return false;
  }
  if (bbox1[1] > bbox2[1]) {
    return false;
  }
  if (bbox1[3] < bbox2[3]) {
    return false;
  }
  return true;
}
function compareCoords$2(pair1, pair2) {
  return pair1[0] === pair2[0] && pair1[1] === pair2[1];
}
function getMidpoint$1(pair1, pair2) {
  return [(pair1[0] + pair2[0]) / 2, (pair1[1] + pair2[1]) / 2];
}
function polygonToLine(poly, options = {}) {
  const geom = getGeom(poly);
  if (!options.properties && poly.type === 'Feature') {
    options.properties = poly.properties;
  }
  switch (geom.type) {
    case 'Polygon':
      return singlePolygonToLine(geom, options);
    case 'MultiPolygon':
      return multiPolygonToLine(geom, options);
    default:
      throw new Error('invalid poly');
  }
}
function singlePolygonToLine(poly, options = {}) {
  const geom = getGeom(poly);
  const coords = geom.coordinates;
  const properties = options.properties
    ? options.properties
    : poly.type === 'Feature'
      ? poly.properties
      : {};
  return coordsToLine(coords, properties);
}
function multiPolygonToLine(multiPoly, options = {}) {
  const geom = getGeom(multiPoly);
  const coords = geom.coordinates;
  const properties = options.properties
    ? options.properties
    : multiPoly.type === 'Feature'
      ? multiPoly.properties
      : {};
  const lines = [];
  coords.forEach((coord) => {
    lines.push(coordsToLine(coord, properties));
  });
  return featureCollection(lines);
}
function coordsToLine(coords, properties) {
  if (coords.length > 1) {
    return multiLineString(coords, properties);
  }
  return lineString(coords[0], properties);
}
function booleanDisjoint(
  feature1,
  feature2,
  { ignoreSelfIntersections = true } = { ignoreSelfIntersections: true },
) {
  let bool2 = true;
  flattenEach(feature1, (flatten1) => {
    flattenEach(feature2, (flatten2) => {
      if (bool2 === false) {
        return false;
      }
      bool2 = disjoint(
        flatten1.geometry,
        flatten2.geometry,
        ignoreSelfIntersections,
      );
    });
  });
  return bool2;
}
function disjoint(geom1, geom2, ignoreSelfIntersections) {
  switch (geom1.type) {
    case 'Point':
      switch (geom2.type) {
        case 'Point':
          return !compareCoords$1(geom1.coordinates, geom2.coordinates);
        case 'LineString':
          return !isPointOnLine(geom2, geom1);
        case 'Polygon':
          return !booleanPointInPolygon(geom1, geom2);
      }
      break;
    case 'LineString':
      switch (geom2.type) {
        case 'Point':
          return !isPointOnLine(geom1, geom2);
        case 'LineString':
          return !isLineOnLine$1(geom1, geom2, ignoreSelfIntersections);
        case 'Polygon':
          return !isLineInPoly$1(geom2, geom1, ignoreSelfIntersections);
      }
      break;
    case 'Polygon':
      switch (geom2.type) {
        case 'Point':
          return !booleanPointInPolygon(geom2, geom1);
        case 'LineString':
          return !isLineInPoly$1(geom1, geom2, ignoreSelfIntersections);
        case 'Polygon':
          return !isPolyInPoly$1(geom2, geom1, ignoreSelfIntersections);
      }
  }
  return false;
}
function isPointOnLine(lineString2, pt) {
  for (let i = 0; i < lineString2.coordinates.length - 1; i++) {
    if (
      isPointOnLineSegment(
        lineString2.coordinates[i],
        lineString2.coordinates[i + 1],
        pt.coordinates,
      )
    ) {
      return true;
    }
  }
  return false;
}
function isLineOnLine$1(lineString1, lineString2, ignoreSelfIntersections) {
  const doLinesIntersect = lineIntersect(lineString1, lineString2, {
    ignoreSelfIntersections,
  });
  if (doLinesIntersect.features.length > 0) {
    return true;
  }
  return false;
}
function isLineInPoly$1(polygon2, lineString2, ignoreSelfIntersections) {
  for (const coord of lineString2.coordinates) {
    if (booleanPointInPolygon(coord, polygon2)) {
      return true;
    }
  }
  const doLinesIntersect = lineIntersect(lineString2, polygonToLine(polygon2), {
    ignoreSelfIntersections,
  });
  if (doLinesIntersect.features.length > 0) {
    return true;
  }
  return false;
}
function isPolyInPoly$1(feature1, feature2, ignoreSelfIntersections) {
  for (const coord1 of feature1.coordinates[0]) {
    if (booleanPointInPolygon(coord1, feature2)) {
      return true;
    }
  }
  for (const coord2 of feature2.coordinates[0]) {
    if (booleanPointInPolygon(coord2, feature1)) {
      return true;
    }
  }
  const doLinesIntersect = lineIntersect(
    polygonToLine(feature1),
    polygonToLine(feature2),
    { ignoreSelfIntersections },
  );
  if (doLinesIntersect.features.length > 0) {
    return true;
  }
  return false;
}
function isPointOnLineSegment(lineSegmentStart, lineSegmentEnd, pt) {
  const dxc = pt[0] - lineSegmentStart[0];
  const dyc = pt[1] - lineSegmentStart[1];
  const dxl = lineSegmentEnd[0] - lineSegmentStart[0];
  const dyl = lineSegmentEnd[1] - lineSegmentStart[1];
  const cross2 = dxc * dyl - dyc * dxl;
  if (cross2 !== 0) {
    return false;
  }
  if (Math.abs(dxl) >= Math.abs(dyl)) {
    if (dxl > 0) {
      return lineSegmentStart[0] <= pt[0] && pt[0] <= lineSegmentEnd[0];
    } else {
      return lineSegmentEnd[0] <= pt[0] && pt[0] <= lineSegmentStart[0];
    }
  } else if (dyl > 0) {
    return lineSegmentStart[1] <= pt[1] && pt[1] <= lineSegmentEnd[1];
  } else {
    return lineSegmentEnd[1] <= pt[1] && pt[1] <= lineSegmentStart[1];
  }
}
function compareCoords$1(pair1, pair2) {
  return pair1[0] === pair2[0] && pair1[1] === pair2[1];
}
function booleanIntersects(
  feature1,
  feature2,
  { ignoreSelfIntersections = true } = {},
) {
  let bool2 = false;
  flattenEach(feature1, (flatten1) => {
    flattenEach(feature2, (flatten2) => {
      if (bool2 === true) {
        return true;
      }
      bool2 = !booleanDisjoint(flatten1.geometry, flatten2.geometry, {
        ignoreSelfIntersections,
      });
    });
  });
  return bool2;
}
function booleanWithin(feature1, feature2) {
  var geom1 = getGeom(feature1);
  var geom2 = getGeom(feature2);
  var type1 = geom1.type;
  var type2 = geom2.type;
  switch (type1) {
    case 'Point':
      switch (type2) {
        case 'MultiPoint':
          return isPointInMultiPoint(geom1, geom2);
        case 'LineString':
          return booleanPointOnLine(geom1, geom2, { ignoreEndVertices: true });
        case 'Polygon':
        case 'MultiPolygon':
          return booleanPointInPolygon(geom1, geom2, { ignoreBoundary: true });
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'MultiPoint':
      switch (type2) {
        case 'MultiPoint':
          return isMultiPointInMultiPoint(geom1, geom2);
        case 'LineString':
          return isMultiPointOnLine(geom1, geom2);
        case 'Polygon':
        case 'MultiPolygon':
          return isMultiPointInPoly(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'LineString':
      switch (type2) {
        case 'LineString':
          return isLineOnLine(geom1, geom2);
        case 'Polygon':
        case 'MultiPolygon':
          return isLineInPoly(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    case 'Polygon':
      switch (type2) {
        case 'Polygon':
        case 'MultiPolygon':
          return isPolyInPoly(geom1, geom2);
        default:
          throw new Error('feature2 ' + type2 + ' geometry not supported');
      }
    default:
      throw new Error('feature1 ' + type1 + ' geometry not supported');
  }
}
function isPointInMultiPoint(point2, multiPoint) {
  var i;
  var output = false;
  for (i = 0; i < multiPoint.coordinates.length; i++) {
    if (compareCoords(multiPoint.coordinates[i], point2.coordinates)) {
      output = true;
      break;
    }
  }
  return output;
}
function isMultiPointInMultiPoint(multiPoint1, multiPoint2) {
  for (var i = 0; i < multiPoint1.coordinates.length; i++) {
    var anyMatch = false;
    for (var i2 = 0; i2 < multiPoint2.coordinates.length; i2++) {
      if (
        compareCoords(multiPoint1.coordinates[i], multiPoint2.coordinates[i2])
      ) {
        anyMatch = true;
      }
    }
    if (!anyMatch) {
      return false;
    }
  }
  return true;
}
function isMultiPointOnLine(multiPoint, lineString2) {
  var foundInsidePoint = false;
  for (var i = 0; i < multiPoint.coordinates.length; i++) {
    if (!booleanPointOnLine(multiPoint.coordinates[i], lineString2)) {
      return false;
    }
    if (!foundInsidePoint) {
      foundInsidePoint = booleanPointOnLine(
        multiPoint.coordinates[i],
        lineString2,
        { ignoreEndVertices: true },
      );
    }
  }
  return foundInsidePoint;
}
function isMultiPointInPoly(multiPoint, polygon2) {
  var output = true;
  var isInside = false;
  for (var i = 0; i < multiPoint.coordinates.length; i++) {
    isInside = booleanPointInPolygon(multiPoint.coordinates[i], polygon2);
    if (!isInside) {
      output = false;
      break;
    }
    {
      isInside = booleanPointInPolygon(multiPoint.coordinates[i], polygon2, {
        ignoreBoundary: true,
      });
    }
  }
  return output && isInside;
}
function isLineOnLine(lineString1, lineString2) {
  for (var i = 0; i < lineString1.coordinates.length; i++) {
    if (!booleanPointOnLine(lineString1.coordinates[i], lineString2)) {
      return false;
    }
  }
  return true;
}
function splitLineIntoSegmentsOnPolygon(linestring, polygon2) {
  const coords = linestring.coordinates;
  const outputSegments = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const seg = lineString([coords[i], coords[i + 1]]);
    const split = lineSplit(seg, feature(polygon2));
    if (split.features.length === 0) {
      outputSegments.push(seg);
    } else {
      outputSegments.push(...split.features);
    }
  }
  return featureCollection(outputSegments);
}
function isLineInPoly(linestring, polygon2) {
  const polyBbox = bbox$1(polygon2);
  const lineBbox = bbox$1(linestring);
  if (!doBBoxOverlap(polyBbox, lineBbox)) {
    return false;
  }
  for (const coord of linestring.coordinates) {
    if (!booleanPointInPolygon(coord, polygon2)) {
      return false;
    }
  }
  let isContainedByPolygonBoundary = false;
  const lineSegments = splitLineIntoSegmentsOnPolygon(linestring, polygon2);
  for (const lineSegment2 of lineSegments.features) {
    const midpoint = getMidpoint(
      lineSegment2.geometry.coordinates[0],
      lineSegment2.geometry.coordinates[1],
    );
    if (!booleanPointInPolygon(midpoint, polygon2)) {
      return false;
    }
    if (
      !isContainedByPolygonBoundary &&
      booleanPointInPolygon(midpoint, polygon2, { ignoreBoundary: true })
    ) {
      isContainedByPolygonBoundary = true;
    }
  }
  return isContainedByPolygonBoundary;
}
function isPolyInPoly(geometry1, geometry2) {
  var poly1Bbox = bbox$1(geometry1);
  var poly2Bbox = bbox$1(geometry2);
  if (!doBBoxOverlap(poly2Bbox, poly1Bbox)) {
    return false;
  }
  for (var i = 0; i < geometry1.coordinates[0].length; i++) {
    if (!booleanPointInPolygon(geometry1.coordinates[0][i], geometry2)) {
      return false;
    }
  }
  return true;
}
function doBBoxOverlap(bbox1, bbox2) {
  if (bbox1[0] > bbox2[0]) return false;
  if (bbox1[2] < bbox2[2]) return false;
  if (bbox1[1] > bbox2[1]) return false;
  if (bbox1[3] < bbox2[3]) return false;
  return true;
}
function compareCoords(pair1, pair2) {
  return pair1[0] === pair2[0] && pair1[1] === pair2[1];
}
function getMidpoint(pair1, pair2) {
  return [(pair1[0] + pair2[0]) / 2, (pair1[1] + pair2[1]) / 2];
}
function center(geojson, options = {}) {
  const ext = bbox$1(geojson);
  const x = (ext[0] + ext[2]) / 2;
  const y = (ext[1] + ext[3]) / 2;
  return point([x, y], options.properties, options);
}
function centroid(geojson, options = {}) {
  let xSum = 0;
  let ySum = 0;
  let len = 0;
  coordEach(
    geojson,
    function (coord) {
      xSum += coord[0];
      ySum += coord[1];
      len++;
    },
    true,
  );
  return point([xSum / len, ySum / len], options.properties);
}
var concaveman$1 = { exports: {} };
const require$$0$1 = /* @__PURE__ */ getAugmentedNamespace(rbush);
let TinyQueue$1 = class TinyQueue2 {
  constructor(data = [], compare2 = defaultCompare) {
    this.data = data;
    this.length = this.data.length;
    this.compare = compare2;
    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
    }
  }
  push(item) {
    this.data.push(item);
    this.length++;
    this._up(this.length - 1);
  }
  pop() {
    if (this.length === 0) return void 0;
    const top = this.data[0];
    const bottom = this.data.pop();
    this.length--;
    if (this.length > 0) {
      this.data[0] = bottom;
      this._down(0);
    }
    return top;
  }
  peek() {
    return this.data[0];
  }
  _up(pos) {
    const { data, compare: compare2 } = this;
    const item = data[pos];
    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      const current = data[parent];
      if (compare2(item, current) >= 0) break;
      data[pos] = current;
      pos = parent;
    }
    data[pos] = item;
  }
  _down(pos) {
    const { data, compare: compare2 } = this;
    const halfLength = this.length >> 1;
    const item = data[pos];
    while (pos < halfLength) {
      let left = (pos << 1) + 1;
      let best = data[left];
      const right = left + 1;
      if (right < this.length && compare2(data[right], best) < 0) {
        left = right;
        best = data[right];
      }
      if (compare2(best, item) >= 0) break;
      data[pos] = best;
      pos = left;
    }
    data[pos] = item;
  }
};
function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
const tinyqueue = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.defineProperty(
    {
      __proto__: null,
      default: TinyQueue$1,
    },
    Symbol.toStringTag,
    { value: 'Module' },
  ),
);
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(tinyqueue);
var pointInPolygon = { exports: {} };
var flat;
var hasRequiredFlat;
function requireFlat() {
  if (hasRequiredFlat) return flat;
  hasRequiredFlat = 1;
  flat = function pointInPolygonFlat(point2, vs, start, end) {
    var x = point2[0],
      y = point2[1];
    var inside = false;
    if (start === void 0) start = 0;
    if (end === void 0) end = vs.length;
    var len = (end - start) / 2;
    for (var i = 0, j = len - 1; i < len; j = i++) {
      var xi = vs[start + i * 2 + 0],
        yi = vs[start + i * 2 + 1];
      var xj = vs[start + j * 2 + 0],
        yj = vs[start + j * 2 + 1];
      var intersect2 =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect2) inside = !inside;
    }
    return inside;
  };
  return flat;
}
var nested;
var hasRequiredNested;
function requireNested() {
  if (hasRequiredNested) return nested;
  hasRequiredNested = 1;
  nested = function pointInPolygonNested(point2, vs, start, end) {
    var x = point2[0],
      y = point2[1];
    var inside = false;
    if (start === void 0) start = 0;
    if (end === void 0) end = vs.length;
    var len = end - start;
    for (var i = 0, j = len - 1; i < len; j = i++) {
      var xi = vs[i + start][0],
        yi = vs[i + start][1];
      var xj = vs[j + start][0],
        yj = vs[j + start][1];
      var intersect2 =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect2) inside = !inside;
    }
    return inside;
  };
  return nested;
}
var hasRequiredPointInPolygon;
function requirePointInPolygon() {
  if (hasRequiredPointInPolygon) return pointInPolygon.exports;
  hasRequiredPointInPolygon = 1;
  var pointInPolygonFlat = requireFlat();
  var pointInPolygonNested = requireNested();
  pointInPolygon.exports = function pointInPolygon2(point2, vs, start, end) {
    if (vs.length > 0 && Array.isArray(vs[0])) {
      return pointInPolygonNested(point2, vs, start, end);
    } else {
      return pointInPolygonFlat(point2, vs, start, end);
    }
  };
  pointInPolygon.exports.nested = pointInPolygonNested;
  pointInPolygon.exports.flat = pointInPolygonFlat;
  return pointInPolygon.exports;
}
var orient2d_min$1 = { exports: {} };
var orient2d_min = orient2d_min$1.exports;
var hasRequiredOrient2d_min;
function requireOrient2d_min() {
  if (hasRequiredOrient2d_min) return orient2d_min$1.exports;
  hasRequiredOrient2d_min = 1;
  (function (module2, exports$1) {
    !(function (t, e) {
      e(exports$1);
    })(orient2d_min, function (t) {
      const e = 134217729,
        n = 33306690738754706e-32;
      function r(t2, e2, n2, r2, o2) {
        let f2,
          i2,
          u3,
          c2,
          s2 = e2[0],
          a2 = r2[0],
          d2 = 0,
          l2 = 0;
        a2 > s2 == a2 > -s2
          ? ((f2 = s2), (s2 = e2[++d2]))
          : ((f2 = a2), (a2 = r2[++l2]));
        let p = 0;
        if (d2 < t2 && l2 < n2)
          for (
            a2 > s2 == a2 > -s2
              ? ((u3 = f2 - ((i2 = s2 + f2) - s2)), (s2 = e2[++d2]))
              : ((u3 = f2 - ((i2 = a2 + f2) - a2)), (a2 = r2[++l2])),
              f2 = i2,
              0 !== u3 && (o2[p++] = u3);
            d2 < t2 && l2 < n2;
          )
            (a2 > s2 == a2 > -s2
              ? ((u3 = f2 - ((i2 = f2 + s2) - (c2 = i2 - f2)) + (s2 - c2)),
                (s2 = e2[++d2]))
              : ((u3 = f2 - ((i2 = f2 + a2) - (c2 = i2 - f2)) + (a2 - c2)),
                (a2 = r2[++l2])),
              (f2 = i2),
              0 !== u3 && (o2[p++] = u3));
        for (; d2 < t2; )
          ((u3 = f2 - ((i2 = f2 + s2) - (c2 = i2 - f2)) + (s2 - c2)),
            (s2 = e2[++d2]),
            (f2 = i2),
            0 !== u3 && (o2[p++] = u3));
        for (; l2 < n2; )
          ((u3 = f2 - ((i2 = f2 + a2) - (c2 = i2 - f2)) + (a2 - c2)),
            (a2 = r2[++l2]),
            (f2 = i2),
            0 !== u3 && (o2[p++] = u3));
        return ((0 === f2 && 0 !== p) || (o2[p++] = f2), p);
      }
      function o(t2) {
        return new Float64Array(t2);
      }
      const f = 33306690738754716e-32,
        i = 22204460492503146e-32,
        u2 = 11093356479670487e-47,
        c = o(4),
        s = o(8),
        a = o(12),
        d = o(16),
        l = o(4);
      ((t.orient2d = function (t2, o2, p, b, y, h) {
        const M = (o2 - h) * (p - y),
          x = (t2 - y) * (b - h),
          j = M - x;
        if (0 === M || 0 === x || M > 0 != x > 0) return j;
        const m = Math.abs(M + x);
        return Math.abs(j) >= f * m
          ? j
          : -(function (t3, o3, f2, p2, b2, y2, h2) {
              let M2, x2, j2, m2, _, v, w, A, F, O, P, g, k, q, z, B2, C, D2;
              const E = t3 - b2,
                G = f2 - b2,
                H = o3 - y2,
                I = p2 - y2;
              ((_ =
                (z =
                  (A = E - (w = (v = e * E) - (v - E))) *
                    (O = I - (F = (v = e * I) - (v - I))) -
                  ((q = E * I) - w * F - A * F - w * O)) -
                (P =
                  z -
                  (C =
                    (A = H - (w = (v = e * H) - (v - H))) *
                      (O = G - (F = (v = e * G) - (v - G))) -
                    ((B2 = H * G) - w * F - A * F - w * O)))),
                (c[0] = z - (P + _) + (_ - C)),
                (_ =
                  (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) -
                  (P = k - B2)),
                (c[1] = k - (P + _) + (_ - B2)),
                (_ = (D2 = g + P) - g),
                (c[2] = g - (D2 - _) + (P - _)),
                (c[3] = D2));
              let J = (function (t4, e2) {
                  let n2 = e2[0];
                  for (let r2 = 1; r2 < t4; r2++) n2 += e2[r2];
                  return n2;
                })(4, c),
                K = i * h2;
              if (J >= K || -J >= K) return J;
              if (
                ((M2 = t3 - (E + (_ = t3 - E)) + (_ - b2)),
                (j2 = f2 - (G + (_ = f2 - G)) + (_ - b2)),
                (x2 = o3 - (H + (_ = o3 - H)) + (_ - y2)),
                (m2 = p2 - (I + (_ = p2 - I)) + (_ - y2)),
                0 === M2 && 0 === x2 && 0 === j2 && 0 === m2)
              )
                return J;
              if (
                ((K = u2 * h2 + n * Math.abs(J)),
                (J += E * m2 + I * M2 - (H * j2 + G * x2)) >= K || -J >= K)
              )
                return J;
              ((_ =
                (z =
                  (A = M2 - (w = (v = e * M2) - (v - M2))) *
                    (O = I - (F = (v = e * I) - (v - I))) -
                  ((q = M2 * I) - w * F - A * F - w * O)) -
                (P =
                  z -
                  (C =
                    (A = x2 - (w = (v = e * x2) - (v - x2))) *
                      (O = G - (F = (v = e * G) - (v - G))) -
                    ((B2 = x2 * G) - w * F - A * F - w * O)))),
                (l[0] = z - (P + _) + (_ - C)),
                (_ =
                  (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) -
                  (P = k - B2)),
                (l[1] = k - (P + _) + (_ - B2)),
                (_ = (D2 = g + P) - g),
                (l[2] = g - (D2 - _) + (P - _)),
                (l[3] = D2));
              const L = r(4, c, 4, l, s);
              ((_ =
                (z =
                  (A = E - (w = (v = e * E) - (v - E))) *
                    (O = m2 - (F = (v = e * m2) - (v - m2))) -
                  ((q = E * m2) - w * F - A * F - w * O)) -
                (P =
                  z -
                  (C =
                    (A = H - (w = (v = e * H) - (v - H))) *
                      (O = j2 - (F = (v = e * j2) - (v - j2))) -
                    ((B2 = H * j2) - w * F - A * F - w * O)))),
                (l[0] = z - (P + _) + (_ - C)),
                (_ =
                  (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) -
                  (P = k - B2)),
                (l[1] = k - (P + _) + (_ - B2)),
                (_ = (D2 = g + P) - g),
                (l[2] = g - (D2 - _) + (P - _)),
                (l[3] = D2));
              const N = r(L, s, 4, l, a);
              ((_ =
                (z =
                  (A = M2 - (w = (v = e * M2) - (v - M2))) *
                    (O = m2 - (F = (v = e * m2) - (v - m2))) -
                  ((q = M2 * m2) - w * F - A * F - w * O)) -
                (P =
                  z -
                  (C =
                    (A = x2 - (w = (v = e * x2) - (v - x2))) *
                      (O = j2 - (F = (v = e * j2) - (v - j2))) -
                    ((B2 = x2 * j2) - w * F - A * F - w * O)))),
                (l[0] = z - (P + _) + (_ - C)),
                (_ =
                  (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) -
                  (P = k - B2)),
                (l[1] = k - (P + _) + (_ - B2)),
                (_ = (D2 = g + P) - g),
                (l[2] = g - (D2 - _) + (P - _)),
                (l[3] = D2));
              const Q = r(N, a, 4, l, d);
              return d[Q - 1];
            })(t2, o2, p, b, y, h, m);
      }),
        (t.orient2dfast = function (t2, e2, n2, r2, o2, f2) {
          return (e2 - f2) * (n2 - o2) - (t2 - o2) * (r2 - f2);
        }),
        Object.defineProperty(t, '__esModule', { value: true }));
    });
  })(orient2d_min$1, orient2d_min$1.exports);
  return orient2d_min$1.exports;
}
var hasRequiredConcaveman;
function requireConcaveman() {
  if (hasRequiredConcaveman) return concaveman$1.exports;
  hasRequiredConcaveman = 1;
  var RBush3 = require$$0$1;
  var Queue = require$$1;
  var pointInPolygon2 = requirePointInPolygon();
  var orient = requireOrient2d_min().orient2d;
  if (Queue.default) {
    Queue = Queue.default;
  }
  concaveman$1.exports = concaveman2;
  concaveman$1.exports.default = concaveman2;
  function concaveman2(points, concavity, lengthThreshold) {
    concavity = Math.max(0, concavity === void 0 ? 2 : concavity);
    lengthThreshold = lengthThreshold || 0;
    var hull = fastConvexHull(points);
    var tree = new RBush3(16);
    tree.toBBox = function (a2) {
      return {
        minX: a2[0],
        minY: a2[1],
        maxX: a2[0],
        maxY: a2[1],
      };
    };
    tree.compareMinX = function (a2, b2) {
      return a2[0] - b2[0];
    };
    tree.compareMinY = function (a2, b2) {
      return a2[1] - b2[1];
    };
    tree.load(points);
    var queue = [];
    for (var i = 0, last; i < hull.length; i++) {
      var p = hull[i];
      tree.remove(p);
      last = insertNode(p, last);
      queue.push(last);
    }
    var segTree = new RBush3(16);
    for (i = 0; i < queue.length; i++) segTree.insert(updateBBox(queue[i]));
    var sqConcavity = concavity * concavity;
    var sqLenThreshold = lengthThreshold * lengthThreshold;
    while (queue.length) {
      var node = queue.shift();
      var a = node.p;
      var b = node.next.p;
      var sqLen = getSqDist(a, b);
      if (sqLen < sqLenThreshold) continue;
      var maxSqLen = sqLen / sqConcavity;
      p = findCandidate(
        tree,
        node.prev.p,
        a,
        b,
        node.next.next.p,
        maxSqLen,
        segTree,
      );
      if (p && Math.min(getSqDist(p, a), getSqDist(p, b)) <= maxSqLen) {
        queue.push(node);
        queue.push(insertNode(p, node));
        tree.remove(p);
        segTree.remove(node);
        segTree.insert(updateBBox(node));
        segTree.insert(updateBBox(node.next));
      }
    }
    node = last;
    var concave = [];
    do {
      concave.push(node.p);
      node = node.next;
    } while (node !== last);
    concave.push(node.p);
    return concave;
  }
  function findCandidate(tree, a, b, c, d, maxDist, segTree) {
    var queue = new Queue([], compareDist);
    var node = tree.data;
    while (node) {
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        var dist2 = node.leaf
          ? sqSegDist(child, b, c)
          : sqSegBoxDist(b, c, child);
        if (dist2 > maxDist) continue;
        queue.push({
          node: child,
          dist: dist2,
        });
      }
      while (queue.length && !queue.peek().node.children) {
        var item = queue.pop();
        var p = item.node;
        var d0 = sqSegDist(p, a, b);
        var d1 = sqSegDist(p, c, d);
        if (
          item.dist < d0 &&
          item.dist < d1 &&
          noIntersections(b, p, segTree) &&
          noIntersections(c, p, segTree)
        )
          return p;
      }
      node = queue.pop();
      if (node) node = node.node;
    }
    return null;
  }
  function compareDist(a, b) {
    return a.dist - b.dist;
  }
  function sqSegBoxDist(a, b, bbox2) {
    if (inside(a, bbox2) || inside(b, bbox2)) return 0;
    var d1 = sqSegSegDist(
      a[0],
      a[1],
      b[0],
      b[1],
      bbox2.minX,
      bbox2.minY,
      bbox2.maxX,
      bbox2.minY,
    );
    if (d1 === 0) return 0;
    var d2 = sqSegSegDist(
      a[0],
      a[1],
      b[0],
      b[1],
      bbox2.minX,
      bbox2.minY,
      bbox2.minX,
      bbox2.maxY,
    );
    if (d2 === 0) return 0;
    var d3 = sqSegSegDist(
      a[0],
      a[1],
      b[0],
      b[1],
      bbox2.maxX,
      bbox2.minY,
      bbox2.maxX,
      bbox2.maxY,
    );
    if (d3 === 0) return 0;
    var d4 = sqSegSegDist(
      a[0],
      a[1],
      b[0],
      b[1],
      bbox2.minX,
      bbox2.maxY,
      bbox2.maxX,
      bbox2.maxY,
    );
    if (d4 === 0) return 0;
    return Math.min(d1, d2, d3, d4);
  }
  function inside(a, bbox2) {
    return (
      a[0] >= bbox2.minX &&
      a[0] <= bbox2.maxX &&
      a[1] >= bbox2.minY &&
      a[1] <= bbox2.maxY
    );
  }
  function noIntersections(a, b, segTree) {
    var minX = Math.min(a[0], b[0]);
    var minY = Math.min(a[1], b[1]);
    var maxX = Math.max(a[0], b[0]);
    var maxY = Math.max(a[1], b[1]);
    var edges = segTree.search({ minX, minY, maxX, maxY });
    for (var i = 0; i < edges.length; i++) {
      if (intersects2(edges[i].p, edges[i].next.p, a, b)) return false;
    }
    return true;
  }
  function cross2(p1, p2, p3) {
    return orient(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  }
  function intersects2(p1, q1, p2, q2) {
    return (
      p1 !== q2 &&
      q1 !== p2 &&
      cross2(p1, q1, p2) > 0 !== cross2(p1, q1, q2) > 0 &&
      cross2(p2, q2, p1) > 0 !== cross2(p2, q2, q1) > 0
    );
  }
  function updateBBox(node) {
    var p1 = node.p;
    var p2 = node.next.p;
    node.minX = Math.min(p1[0], p2[0]);
    node.minY = Math.min(p1[1], p2[1]);
    node.maxX = Math.max(p1[0], p2[0]);
    node.maxY = Math.max(p1[1], p2[1]);
    return node;
  }
  function fastConvexHull(points) {
    var left = points[0];
    var top = points[0];
    var right = points[0];
    var bottom = points[0];
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p[0] < left[0]) left = p;
      if (p[0] > right[0]) right = p;
      if (p[1] < top[1]) top = p;
      if (p[1] > bottom[1]) bottom = p;
    }
    var cull = [left, top, right, bottom];
    var filtered = cull.slice();
    for (i = 0; i < points.length; i++) {
      if (!pointInPolygon2(points[i], cull)) filtered.push(points[i]);
    }
    return convexHull(filtered);
  }
  function insertNode(p, prev) {
    var node = {
      p,
      prev: null,
      next: null,
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
    if (!prev) {
      node.prev = node;
      node.next = node;
    } else {
      node.next = prev.next;
      node.prev = prev;
      prev.next.prev = node;
      prev.next = node;
    }
    return node;
  }
  function getSqDist(p1, p2) {
    var dx = p1[0] - p2[0],
      dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  }
  function sqSegDist(p, p1, p2) {
    var x = p1[0],
      y = p1[1],
      dx = p2[0] - x,
      dy = p2[1] - y;
    if (dx !== 0 || dy !== 0) {
      var t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2[0];
        y = p2[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  }
  function sqSegSegDist(x0, y0, x1, y1, x2, y2, x3, y3) {
    var ux = x1 - x0;
    var uy = y1 - y0;
    var vx = x3 - x2;
    var vy = y3 - y2;
    var wx = x0 - x2;
    var wy = y0 - y2;
    var a = ux * ux + uy * uy;
    var b = ux * vx + uy * vy;
    var c = vx * vx + vy * vy;
    var d = ux * wx + uy * wy;
    var e = vx * wx + vy * wy;
    var D2 = a * c - b * b;
    var sc, sN, tc, tN;
    var sD = D2;
    var tD = D2;
    if (D2 === 0) {
      sN = 0;
      sD = 1;
      tN = e;
      tD = c;
    } else {
      sN = b * e - c * d;
      tN = a * e - b * d;
      if (sN < 0) {
        sN = 0;
        tN = e;
        tD = c;
      } else if (sN > sD) {
        sN = sD;
        tN = e + b;
        tD = c;
      }
    }
    if (tN < 0) {
      tN = 0;
      if (-d < 0) sN = 0;
      else if (-d > a) sN = sD;
      else {
        sN = -d;
        sD = a;
      }
    } else if (tN > tD) {
      tN = tD;
      if (-d + b < 0) sN = 0;
      else if (-d + b > a) sN = sD;
      else {
        sN = -d + b;
        sD = a;
      }
    }
    sc = sN === 0 ? 0 : sN / sD;
    tc = tN === 0 ? 0 : tN / tD;
    var cx = (1 - sc) * x0 + sc * x1;
    var cy = (1 - sc) * y0 + sc * y1;
    var cx2 = (1 - tc) * x2 + tc * x3;
    var cy2 = (1 - tc) * y2 + tc * y3;
    var dx = cx2 - cx;
    var dy = cy2 - cy;
    return dx * dx + dy * dy;
  }
  function compareByX(a, b) {
    return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
  }
  function convexHull(points) {
    points.sort(compareByX);
    var lower = [];
    for (var i = 0; i < points.length; i++) {
      while (
        lower.length >= 2 &&
        cross2(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0
      ) {
        lower.pop();
      }
      lower.push(points[i]);
    }
    var upper = [];
    for (var ii = points.length - 1; ii >= 0; ii--) {
      while (
        upper.length >= 2 &&
        cross2(upper[upper.length - 2], upper[upper.length - 1], points[ii]) <=
          0
      ) {
        upper.pop();
      }
      upper.push(points[ii]);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }
  return concaveman$1.exports;
}
var concavemanExports = requireConcaveman();
const concaveman = /* @__PURE__ */ getDefaultExportFromCjs(concavemanExports);
function convex(geojson, options = {}) {
  options.concavity = options.concavity || Infinity;
  const points = [];
  coordEach(geojson, (coord) => {
    points.push([coord[0], coord[1]]);
  });
  if (!points.length) {
    return null;
  }
  const convexHull = concaveman(points, options.concavity);
  if (convexHull.length > 3) {
    return polygon([convexHull]);
  }
  return null;
}
function centerOfMass(geojson, options = {}) {
  switch (getType(geojson)) {
    case 'Point':
      return point(getCoord(geojson), options.properties);
    case 'Polygon':
      var coords = [];
      coordEach(geojson, function (coord) {
        coords.push(coord);
      });
      var centre = centroid(geojson, { properties: options.properties });
      var translation = centre.geometry.coordinates;
      var sx = 0;
      var sy = 0;
      var sArea = 0;
      var i, pi, pj, xi, xj, yi, yj, a;
      var neutralizedPoints = coords.map(function (point2) {
        return [point2[0] - translation[0], point2[1] - translation[1]];
      });
      for (i = 0; i < coords.length - 1; i++) {
        pi = neutralizedPoints[i];
        xi = pi[0];
        yi = pi[1];
        pj = neutralizedPoints[i + 1];
        xj = pj[0];
        yj = pj[1];
        a = xi * yj - xj * yi;
        sArea += a;
        sx += (xi + xj) * a;
        sy += (yi + yj) * a;
      }
      if (sArea === 0) {
        return centre;
      } else {
        var area2 = sArea * 0.5;
        var areaFactor = 1 / (6 * area2);
        return point(
          [translation[0] + areaFactor * sx, translation[1] + areaFactor * sy],
          options.properties,
        );
      }
    default:
      var hull = convex(geojson);
      if (hull) return centerOfMass(hull, { properties: options.properties });
      else return centroid(geojson, { properties: options.properties });
  }
}
function clone$1(geojson) {
  if (!geojson) {
    throw new Error('geojson is required');
  }
  switch (geojson.type) {
    case 'Feature':
      return cloneFeature(geojson);
    case 'FeatureCollection':
      return cloneFeatureCollection(geojson);
    case 'Point':
    case 'LineString':
    case 'Polygon':
    case 'MultiPoint':
    case 'MultiLineString':
    case 'MultiPolygon':
    case 'GeometryCollection':
      return cloneGeometry(geojson);
    default:
      throw new Error('unknown GeoJSON type');
  }
}
function cloneFeature(geojson) {
  const cloned = { type: 'Feature' };
  Object.keys(geojson).forEach((key) => {
    switch (key) {
      case 'type':
      case 'properties':
      case 'geometry':
        return;
      default:
        cloned[key] = geojson[key];
    }
  });
  cloned.properties = cloneProperties(geojson.properties);
  if (geojson.geometry == null) {
    cloned.geometry = null;
  } else {
    cloned.geometry = cloneGeometry(geojson.geometry);
  }
  return cloned;
}
function cloneProperties(properties) {
  const cloned = {};
  if (!properties) {
    return cloned;
  }
  Object.keys(properties).forEach((key) => {
    const value = properties[key];
    if (typeof value === 'object') {
      if (value === null) {
        cloned[key] = null;
      } else if (Array.isArray(value)) {
        cloned[key] = value.map((item) => {
          return item;
        });
      } else {
        cloned[key] = cloneProperties(value);
      }
    } else {
      cloned[key] = value;
    }
  });
  return cloned;
}
function cloneFeatureCollection(geojson) {
  const cloned = { type: 'FeatureCollection' };
  Object.keys(geojson).forEach((key) => {
    switch (key) {
      case 'type':
      case 'features':
        return;
      default:
        cloned[key] = geojson[key];
    }
  });
  cloned.features = geojson.features.map((feature2) => {
    return cloneFeature(feature2);
  });
  return cloned;
}
function cloneGeometry(geometry) {
  const geom = { type: geometry.type };
  if (geometry.bbox) {
    geom.bbox = geometry.bbox;
  }
  if (geometry.type === 'GeometryCollection') {
    geom.geometries = geometry.geometries.map((g) => {
      return cloneGeometry(g);
    });
    return geom;
  }
  geom.coordinates = deepSlice(geometry.coordinates);
  return geom;
}
function deepSlice(coords) {
  const cloned = coords;
  if (typeof cloned[0] !== 'object') {
    return cloned.slice();
  }
  return cloned.map((coord) => {
    return deepSlice(coord);
  });
}
var isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,
  mathceil = Math.ceil,
  mathfloor = Math.floor,
  bignumberError = '[BigNumber Error] ',
  tooManyDigits =
    bignumberError + 'Number primitive has more than 15 significant digits: ',
  BASE = 1e14,
  LOG_BASE = 14,
  MAX_SAFE_INTEGER = 9007199254740991,
  POWS_TEN = [
    1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13,
  ],
  SQRT_BASE = 1e7,
  MAX = 1e9;
function clone(configObject) {
  var div,
    convertBase,
    parseNumeric,
    P = (BigNumber2.prototype = {
      constructor: BigNumber2,
      toString: null,
      valueOf: null,
    }),
    ONE = new BigNumber2(1),
    DECIMAL_PLACES = 20,
    ROUNDING_MODE = 4,
    TO_EXP_NEG = -7,
    TO_EXP_POS = 21,
    MIN_EXP = -1e7,
    MAX_EXP = 1e7,
    CRYPTO = false,
    MODULO_MODE = 1,
    POW_PRECISION = 0,
    FORMAT = {
      prefix: '',
      groupSize: 3,
      secondaryGroupSize: 0,
      groupSeparator: ',',
      decimalSeparator: '.',
      fractionGroupSize: 0,
      fractionGroupSeparator: ' ',
      // non-breaking space
      suffix: '',
    },
    ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz',
    alphabetHasNormalDecimalDigits = true;
  function BigNumber2(v, b) {
    var alphabet,
      c,
      caseChanged,
      e,
      i,
      isNum,
      len,
      str,
      x = this;
    if (!(x instanceof BigNumber2)) return new BigNumber2(v, b);
    if (b == null) {
      if (v && v._isBigNumber === true) {
        x.s = v.s;
        if (!v.c || v.e > MAX_EXP) {
          x.c = x.e = null;
        } else if (v.e < MIN_EXP) {
          x.c = [(x.e = 0)];
        } else {
          x.e = v.e;
          x.c = v.c.slice();
        }
        return;
      }
      if ((isNum = typeof v == 'number') && v * 0 == 0) {
        x.s = 1 / v < 0 ? ((v = -v), -1) : 1;
        if (v === ~~v) {
          for (e = 0, i = v; i >= 10; i /= 10, e++);
          if (e > MAX_EXP) {
            x.c = x.e = null;
          } else {
            x.e = e;
            x.c = [v];
          }
          return;
        }
        str = String(v);
      } else {
        if (!isNumeric.test((str = String(v))))
          return parseNumeric(x, str, isNum);
        x.s = str.charCodeAt(0) == 45 ? ((str = str.slice(1)), -1) : 1;
      }
      if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');
      if ((i = str.search(/e/i)) > 0) {
        if (e < 0) e = i;
        e += +str.slice(i + 1);
        str = str.substring(0, i);
      } else if (e < 0) {
        e = str.length;
      }
    } else {
      intCheck(b, 2, ALPHABET.length, 'Base');
      if (b == 10 && alphabetHasNormalDecimalDigits) {
        x = new BigNumber2(v);
        return round(x, DECIMAL_PLACES + x.e + 1, ROUNDING_MODE);
      }
      str = String(v);
      if ((isNum = typeof v == 'number')) {
        if (v * 0 != 0) return parseNumeric(x, str, isNum, b);
        x.s = 1 / v < 0 ? ((str = str.slice(1)), -1) : 1;
        if (BigNumber2.DEBUG && str.replace(/^0\.0*|\./, '').length > 15) {
          throw Error(tooManyDigits + v);
        }
      } else {
        x.s = str.charCodeAt(0) === 45 ? ((str = str.slice(1)), -1) : 1;
      }
      alphabet = ALPHABET.slice(0, b);
      e = i = 0;
      for (len = str.length; i < len; i++) {
        if (alphabet.indexOf((c = str.charAt(i))) < 0) {
          if (c == '.') {
            if (i > e) {
              e = len;
              continue;
            }
          } else if (!caseChanged) {
            if (
              (str == str.toUpperCase() && (str = str.toLowerCase())) ||
              (str == str.toLowerCase() && (str = str.toUpperCase()))
            ) {
              caseChanged = true;
              i = -1;
              e = 0;
              continue;
            }
          }
          return parseNumeric(x, String(v), isNum, b);
        }
      }
      isNum = false;
      str = convertBase(str, b, 10, x.s);
      if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');
      else e = str.length;
    }
    for (i = 0; str.charCodeAt(i) === 48; i++);
    for (len = str.length; str.charCodeAt(--len) === 48; );
    if ((str = str.slice(i, ++len))) {
      len -= i;
      if (
        isNum &&
        BigNumber2.DEBUG &&
        len > 15 &&
        (v > MAX_SAFE_INTEGER || v !== mathfloor(v))
      ) {
        throw Error(tooManyDigits + x.s * v);
      }
      if ((e = e - i - 1) > MAX_EXP) {
        x.c = x.e = null;
      } else if (e < MIN_EXP) {
        x.c = [(x.e = 0)];
      } else {
        x.e = e;
        x.c = [];
        i = (e + 1) % LOG_BASE;
        if (e < 0) i += LOG_BASE;
        if (i < len) {
          if (i) x.c.push(+str.slice(0, i));
          for (len -= LOG_BASE; i < len; ) {
            x.c.push(+str.slice(i, (i += LOG_BASE)));
          }
          i = LOG_BASE - (str = str.slice(i)).length;
        } else {
          i -= len;
        }
        for (; i--; str += '0');
        x.c.push(+str);
      }
    } else {
      x.c = [(x.e = 0)];
    }
  }
  BigNumber2.clone = clone;
  BigNumber2.ROUND_UP = 0;
  BigNumber2.ROUND_DOWN = 1;
  BigNumber2.ROUND_CEIL = 2;
  BigNumber2.ROUND_FLOOR = 3;
  BigNumber2.ROUND_HALF_UP = 4;
  BigNumber2.ROUND_HALF_DOWN = 5;
  BigNumber2.ROUND_HALF_EVEN = 6;
  BigNumber2.ROUND_HALF_CEIL = 7;
  BigNumber2.ROUND_HALF_FLOOR = 8;
  BigNumber2.EUCLID = 9;
  BigNumber2.config = BigNumber2.set = function (obj) {
    var p, v;
    if (obj != null) {
      if (typeof obj == 'object') {
        if (obj.hasOwnProperty((p = 'DECIMAL_PLACES'))) {
          v = obj[p];
          intCheck(v, 0, MAX, p);
          DECIMAL_PLACES = v;
        }
        if (obj.hasOwnProperty((p = 'ROUNDING_MODE'))) {
          v = obj[p];
          intCheck(v, 0, 8, p);
          ROUNDING_MODE = v;
        }
        if (obj.hasOwnProperty((p = 'EXPONENTIAL_AT'))) {
          v = obj[p];
          if (v && v.pop) {
            intCheck(v[0], -MAX, 0, p);
            intCheck(v[1], 0, MAX, p);
            TO_EXP_NEG = v[0];
            TO_EXP_POS = v[1];
          } else {
            intCheck(v, -MAX, MAX, p);
            TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
          }
        }
        if (obj.hasOwnProperty((p = 'RANGE'))) {
          v = obj[p];
          if (v && v.pop) {
            intCheck(v[0], -MAX, -1, p);
            intCheck(v[1], 1, MAX, p);
            MIN_EXP = v[0];
            MAX_EXP = v[1];
          } else {
            intCheck(v, -MAX, MAX, p);
            if (v) {
              MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
            } else {
              throw Error(bignumberError + p + ' cannot be zero: ' + v);
            }
          }
        }
        if (obj.hasOwnProperty((p = 'CRYPTO'))) {
          v = obj[p];
          if (v === !!v) {
            if (v) {
              if (
                typeof crypto != 'undefined' &&
                crypto &&
                (crypto.getRandomValues || crypto.randomBytes)
              ) {
                CRYPTO = v;
              } else {
                CRYPTO = !v;
                throw Error(bignumberError + 'crypto unavailable');
              }
            } else {
              CRYPTO = v;
            }
          } else {
            throw Error(bignumberError + p + ' not true or false: ' + v);
          }
        }
        if (obj.hasOwnProperty((p = 'MODULO_MODE'))) {
          v = obj[p];
          intCheck(v, 0, 9, p);
          MODULO_MODE = v;
        }
        if (obj.hasOwnProperty((p = 'POW_PRECISION'))) {
          v = obj[p];
          intCheck(v, 0, MAX, p);
          POW_PRECISION = v;
        }
        if (obj.hasOwnProperty((p = 'FORMAT'))) {
          v = obj[p];
          if (typeof v == 'object') FORMAT = v;
          else throw Error(bignumberError + p + ' not an object: ' + v);
        }
        if (obj.hasOwnProperty((p = 'ALPHABET'))) {
          v = obj[p];
          if (typeof v == 'string' && !/^.?$|[+\-.\s]|(.).*\1/.test(v)) {
            alphabetHasNormalDecimalDigits = v.slice(0, 10) == '0123456789';
            ALPHABET = v;
          } else {
            throw Error(bignumberError + p + ' invalid: ' + v);
          }
        }
      } else {
        throw Error(bignumberError + 'Object expected: ' + obj);
      }
    }
    return {
      DECIMAL_PLACES,
      ROUNDING_MODE,
      EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
      RANGE: [MIN_EXP, MAX_EXP],
      CRYPTO,
      MODULO_MODE,
      POW_PRECISION,
      FORMAT,
      ALPHABET,
    };
  };
  BigNumber2.isBigNumber = function (v) {
    if (!v || v._isBigNumber !== true) return false;
    if (!BigNumber2.DEBUG) return true;
    var i,
      n,
      c = v.c,
      e = v.e,
      s = v.s;
    out: if ({}.toString.call(c) == '[object Array]') {
      if (
        (s === 1 || s === -1) &&
        e >= -MAX &&
        e <= MAX &&
        e === mathfloor(e)
      ) {
        if (c[0] === 0) {
          if (e === 0 && c.length === 1) return true;
          break out;
        }
        i = (e + 1) % LOG_BASE;
        if (i < 1) i += LOG_BASE;
        if (String(c[0]).length == i) {
          for (i = 0; i < c.length; i++) {
            n = c[i];
            if (n < 0 || n >= BASE || n !== mathfloor(n)) break out;
          }
          if (n !== 0) return true;
        }
      }
    } else if (
      c === null &&
      e === null &&
      (s === null || s === 1 || s === -1)
    ) {
      return true;
    }
    throw Error(bignumberError + 'Invalid BigNumber: ' + v);
  };
  BigNumber2.maximum = BigNumber2.max = function () {
    return maxOrMin(arguments, -1);
  };
  BigNumber2.minimum = BigNumber2.min = function () {
    return maxOrMin(arguments, 1);
  };
  BigNumber2.random = (function () {
    var pow2_53 = 9007199254740992;
    var random53bitInt =
      (Math.random() * pow2_53) & 2097151
        ? function () {
            return mathfloor(Math.random() * pow2_53);
          }
        : function () {
            return (
              ((Math.random() * 1073741824) | 0) * 8388608 +
              ((Math.random() * 8388608) | 0)
            );
          };
    return function (dp) {
      var a,
        b,
        e,
        k,
        v,
        i = 0,
        c = [],
        rand = new BigNumber2(ONE);
      if (dp == null) dp = DECIMAL_PLACES;
      else intCheck(dp, 0, MAX);
      k = mathceil(dp / LOG_BASE);
      if (CRYPTO) {
        if (crypto.getRandomValues) {
          a = crypto.getRandomValues(new Uint32Array((k *= 2)));
          for (; i < k; ) {
            v = a[i] * 131072 + (a[i + 1] >>> 11);
            if (v >= 9e15) {
              b = crypto.getRandomValues(new Uint32Array(2));
              a[i] = b[0];
              a[i + 1] = b[1];
            } else {
              c.push(v % 1e14);
              i += 2;
            }
          }
          i = k / 2;
        } else if (crypto.randomBytes) {
          a = crypto.randomBytes((k *= 7));
          for (; i < k; ) {
            v =
              (a[i] & 31) * 281474976710656 +
              a[i + 1] * 1099511627776 +
              a[i + 2] * 4294967296 +
              a[i + 3] * 16777216 +
              (a[i + 4] << 16) +
              (a[i + 5] << 8) +
              a[i + 6];
            if (v >= 9e15) {
              crypto.randomBytes(7).copy(a, i);
            } else {
              c.push(v % 1e14);
              i += 7;
            }
          }
          i = k / 7;
        } else {
          CRYPTO = false;
          throw Error(bignumberError + 'crypto unavailable');
        }
      }
      if (!CRYPTO) {
        for (; i < k; ) {
          v = random53bitInt();
          if (v < 9e15) c[i++] = v % 1e14;
        }
      }
      k = c[--i];
      dp %= LOG_BASE;
      if (k && dp) {
        v = POWS_TEN[LOG_BASE - dp];
        c[i] = mathfloor(k / v) * v;
      }
      for (; c[i] === 0; c.pop(), i--);
      if (i < 0) {
        c = [(e = 0)];
      } else {
        for (e = -1; c[0] === 0; c.splice(0, 1), e -= LOG_BASE);
        for (i = 1, v = c[0]; v >= 10; v /= 10, i++);
        if (i < LOG_BASE) e -= LOG_BASE - i;
      }
      rand.e = e;
      rand.c = c;
      return rand;
    };
  })();
  BigNumber2.sum = function () {
    var i = 1,
      args = arguments,
      sum2 = new BigNumber2(args[0]);
    for (; i < args.length; ) sum2 = sum2.plus(args[i++]);
    return sum2;
  };
  convertBase = /* @__PURE__ */ (function () {
    var decimal = '0123456789';
    function toBaseOut(str, baseIn, baseOut, alphabet) {
      var j,
        arr = [0],
        arrL,
        i = 0,
        len = str.length;
      for (; i < len; ) {
        for (arrL = arr.length; arrL--; arr[arrL] *= baseIn);
        arr[0] += alphabet.indexOf(str.charAt(i++));
        for (j = 0; j < arr.length; j++) {
          if (arr[j] > baseOut - 1) {
            if (arr[j + 1] == null) arr[j + 1] = 0;
            arr[j + 1] += (arr[j] / baseOut) | 0;
            arr[j] %= baseOut;
          }
        }
      }
      return arr.reverse();
    }
    return function (str, baseIn, baseOut, sign, callerIsToString) {
      var alphabet,
        d,
        e,
        k,
        r,
        x,
        xc,
        y,
        i = str.indexOf('.'),
        dp = DECIMAL_PLACES,
        rm = ROUNDING_MODE;
      if (i >= 0) {
        k = POW_PRECISION;
        POW_PRECISION = 0;
        str = str.replace('.', '');
        y = new BigNumber2(baseIn);
        x = y.pow(str.length - i);
        POW_PRECISION = k;
        y.c = toBaseOut(
          toFixedPoint(coeffToString(x.c), x.e, '0'),
          10,
          baseOut,
          decimal,
        );
        y.e = y.c.length;
      }
      xc = toBaseOut(
        str,
        baseIn,
        baseOut,
        callerIsToString
          ? ((alphabet = ALPHABET), decimal)
          : ((alphabet = decimal), ALPHABET),
      );
      e = k = xc.length;
      for (; xc[--k] == 0; xc.pop());
      if (!xc[0]) return alphabet.charAt(0);
      if (i < 0) {
        --e;
      } else {
        x.c = xc;
        x.e = e;
        x.s = sign;
        x = div(x, y, dp, rm, baseOut);
        xc = x.c;
        r = x.r;
        e = x.e;
      }
      d = e + dp + 1;
      i = xc[d];
      k = baseOut / 2;
      r = r || d < 0 || xc[d + 1] != null;
      r =
        rm < 4
          ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
          : i > k ||
            (i == k &&
              (rm == 4 ||
                r ||
                (rm == 6 && xc[d - 1] & 1) ||
                rm == (x.s < 0 ? 8 : 7)));
      if (d < 1 || !xc[0]) {
        str = r
          ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0))
          : alphabet.charAt(0);
      } else {
        xc.length = d;
        if (r) {
          for (--baseOut; ++xc[--d] > baseOut; ) {
            xc[d] = 0;
            if (!d) {
              ++e;
              xc = [1].concat(xc);
            }
          }
        }
        for (k = xc.length; !xc[--k]; );
        for (i = 0, str = ''; i <= k; str += alphabet.charAt(xc[i++]));
        str = toFixedPoint(str, e, alphabet.charAt(0));
      }
      return str;
    };
  })();
  div = /* @__PURE__ */ (function () {
    function multiply(x, k, base) {
      var m,
        temp,
        xlo,
        xhi,
        carry = 0,
        i = x.length,
        klo = k % SQRT_BASE,
        khi = (k / SQRT_BASE) | 0;
      for (x = x.slice(); i--; ) {
        xlo = x[i] % SQRT_BASE;
        xhi = (x[i] / SQRT_BASE) | 0;
        m = khi * xlo + xhi * klo;
        temp = klo * xlo + (m % SQRT_BASE) * SQRT_BASE + carry;
        carry = ((temp / base) | 0) + ((m / SQRT_BASE) | 0) + khi * xhi;
        x[i] = temp % base;
      }
      if (carry) x = [carry].concat(x);
      return x;
    }
    function compare2(a, b, aL, bL) {
      var i, cmp;
      if (aL != bL) {
        cmp = aL > bL ? 1 : -1;
      } else {
        for (i = cmp = 0; i < aL; i++) {
          if (a[i] != b[i]) {
            cmp = a[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }
      return cmp;
    }
    function subtract(a, b, aL, base) {
      var i = 0;
      for (; aL--; ) {
        a[aL] -= i;
        i = a[aL] < b[aL] ? 1 : 0;
        a[aL] = i * base + a[aL] - b[aL];
      }
      for (; !a[0] && a.length > 1; a.splice(0, 1));
    }
    return function (x, y, dp, rm, base) {
      var cmp,
        e,
        i,
        more,
        n,
        prod,
        prodL,
        q,
        qc,
        rem,
        remL,
        rem0,
        xi,
        xL,
        yc0,
        yL,
        yz,
        s = x.s == y.s ? 1 : -1,
        xc = x.c,
        yc = y.c;
      if (!xc || !xc[0] || !yc || !yc[0]) {
        return new BigNumber2(
          // Return NaN if either NaN, or both Infinity or 0.
          !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc)
            ? NaN
            : // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
              (xc && xc[0] == 0) || !yc
              ? s * 0
              : s / 0,
        );
      }
      q = new BigNumber2(s);
      qc = q.c = [];
      e = x.e - y.e;
      s = dp + e + 1;
      if (!base) {
        base = BASE;
        e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
        s = (s / LOG_BASE) | 0;
      }
      for (i = 0; yc[i] == (xc[i] || 0); i++);
      if (yc[i] > (xc[i] || 0)) e--;
      if (s < 0) {
        qc.push(1);
        more = true;
      } else {
        xL = xc.length;
        yL = yc.length;
        i = 0;
        s += 2;
        n = mathfloor(base / (yc[0] + 1));
        if (n > 1) {
          yc = multiply(yc, n, base);
          xc = multiply(xc, n, base);
          yL = yc.length;
          xL = xc.length;
        }
        xi = yL;
        rem = xc.slice(0, yL);
        remL = rem.length;
        for (; remL < yL; rem[remL++] = 0);
        yz = yc.slice();
        yz = [0].concat(yz);
        yc0 = yc[0];
        if (yc[1] >= base / 2) yc0++;
        do {
          n = 0;
          cmp = compare2(yc, rem, yL, remL);
          if (cmp < 0) {
            rem0 = rem[0];
            if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);
            n = mathfloor(rem0 / yc0);
            if (n > 1) {
              if (n >= base) n = base - 1;
              prod = multiply(yc, n, base);
              prodL = prod.length;
              remL = rem.length;
              while (compare2(prod, rem, prodL, remL) == 1) {
                n--;
                subtract(prod, yL < prodL ? yz : yc, prodL, base);
                prodL = prod.length;
                cmp = 1;
              }
            } else {
              if (n == 0) {
                cmp = n = 1;
              }
              prod = yc.slice();
              prodL = prod.length;
            }
            if (prodL < remL) prod = [0].concat(prod);
            subtract(rem, prod, remL, base);
            remL = rem.length;
            if (cmp == -1) {
              while (compare2(yc, rem, yL, remL) < 1) {
                n++;
                subtract(rem, yL < remL ? yz : yc, remL, base);
                remL = rem.length;
              }
            }
          } else if (cmp === 0) {
            n++;
            rem = [0];
          }
          qc[i++] = n;
          if (rem[0]) {
            rem[remL++] = xc[xi] || 0;
          } else {
            rem = [xc[xi]];
            remL = 1;
          }
        } while ((xi++ < xL || rem[0] != null) && s--);
        more = rem[0] != null;
        if (!qc[0]) qc.splice(0, 1);
      }
      if (base == BASE) {
        for (i = 1, s = qc[0]; s >= 10; s /= 10, i++);
        round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);
      } else {
        q.e = e;
        q.r = +more;
      }
      return q;
    };
  })();
  function format(n, i, rm, id) {
    var c0, e, ne, len, str;
    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);
    if (!n.c) return n.toString();
    c0 = n.c[0];
    ne = n.e;
    if (i == null) {
      str = coeffToString(n.c);
      str =
        id == 1 || (id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS))
          ? toExponential(str, ne)
          : toFixedPoint(str, ne, '0');
    } else {
      n = round(new BigNumber2(n), i, rm);
      e = n.e;
      str = coeffToString(n.c);
      len = str.length;
      if (id == 1 || (id == 2 && (i <= e || e <= TO_EXP_NEG))) {
        for (; len < i; str += '0', len++);
        str = toExponential(str, e);
      } else {
        i -= ne + (id === 2 && e > ne);
        str = toFixedPoint(str, e, '0');
        if (e + 1 > len) {
          if (--i > 0) for (str += '.'; i--; str += '0');
        } else {
          i += e - len;
          if (i > 0) {
            if (e + 1 == len) str += '.';
            for (; i--; str += '0');
          }
        }
      }
    }
    return n.s < 0 && c0 ? '-' + str : str;
  }
  function maxOrMin(args, n) {
    var k,
      y,
      i = 1,
      x = new BigNumber2(args[0]);
    for (; i < args.length; i++) {
      y = new BigNumber2(args[i]);
      if (!y.s || (k = compare(x, y)) === n || (k === 0 && x.s === n)) {
        x = y;
      }
    }
    return x;
  }
  function normalise(n, c, e) {
    var i = 1,
      j = c.length;
    for (; !c[--j]; c.pop());
    for (j = c[0]; j >= 10; j /= 10, i++);
    if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {
      n.c = n.e = null;
    } else if (e < MIN_EXP) {
      n.c = [(n.e = 0)];
    } else {
      n.e = e;
      n.c = c;
    }
    return n;
  }
  parseNumeric = /* @__PURE__ */ (function () {
    var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i,
      dotAfter = /^([^.]+)\.$/,
      dotBefore = /^\.([^.]+)$/,
      isInfinityOrNaN = /^-?(Infinity|NaN)$/,
      whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;
    return function (x, str, isNum, b) {
      var base,
        s = isNum ? str : str.replace(whitespaceOrPlus, '');
      if (isInfinityOrNaN.test(s)) {
        x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
      } else {
        if (!isNum) {
          s = s.replace(basePrefix, function (m, p1, p2) {
            base = (p2 = p2.toLowerCase()) == 'x' ? 16 : p2 == 'b' ? 2 : 8;
            return !b || b == base ? p1 : m;
          });
          if (b) {
            base = b;
            s = s.replace(dotAfter, '$1').replace(dotBefore, '0.$1');
          }
          if (str != s) return new BigNumber2(s, base);
        }
        if (BigNumber2.DEBUG) {
          throw Error(
            bignumberError +
              'Not a' +
              (b ? ' base ' + b : '') +
              ' number: ' +
              str,
          );
        }
        x.s = null;
      }
      x.c = x.e = null;
    };
  })();
  function round(x, sd, rm, r) {
    var d,
      i,
      j,
      k,
      n,
      ni,
      rd,
      xc = x.c,
      pows10 = POWS_TEN;
    if (xc) {
      out: {
        for (d = 1, k = xc[0]; k >= 10; k /= 10, d++);
        i = sd - d;
        if (i < 0) {
          i += LOG_BASE;
          j = sd;
          n = xc[(ni = 0)];
          rd = mathfloor((n / pows10[d - j - 1]) % 10);
        } else {
          ni = mathceil((i + 1) / LOG_BASE);
          if (ni >= xc.length) {
            if (r) {
              for (; xc.length <= ni; xc.push(0));
              n = rd = 0;
              d = 1;
              i %= LOG_BASE;
              j = i - LOG_BASE + 1;
            } else {
              break out;
            }
          } else {
            n = k = xc[ni];
            for (d = 1; k >= 10; k /= 10, d++);
            i %= LOG_BASE;
            j = i - LOG_BASE + d;
            rd = j < 0 ? 0 : mathfloor((n / pows10[d - j - 1]) % 10);
          }
        }
        r =
          r ||
          sd < 0 || // Are there any non-zero digits after the rounding digit?
          // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
          // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
          xc[ni + 1] != null ||
          (j < 0 ? n : n % pows10[d - j - 1]);
        r =
          rm < 4
            ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
            : rd > 5 ||
              (rd == 5 &&
                (rm == 4 ||
                  r ||
                  (rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
                    ((i > 0 ? (j > 0 ? n / pows10[d - j] : 0) : xc[ni - 1]) %
                      10) &
                      1) ||
                  rm == (x.s < 0 ? 8 : 7)));
        if (sd < 1 || !xc[0]) {
          xc.length = 0;
          if (r) {
            sd -= x.e + 1;
            xc[0] = pows10[(LOG_BASE - (sd % LOG_BASE)) % LOG_BASE];
            x.e = -sd || 0;
          } else {
            xc[0] = x.e = 0;
          }
          return x;
        }
        if (i == 0) {
          xc.length = ni;
          k = 1;
          ni--;
        } else {
          xc.length = ni + 1;
          k = pows10[LOG_BASE - i];
          xc[ni] = j > 0 ? mathfloor((n / pows10[d - j]) % pows10[j]) * k : 0;
        }
        if (r) {
          for (;;) {
            if (ni == 0) {
              for (i = 1, j = xc[0]; j >= 10; j /= 10, i++);
              j = xc[0] += k;
              for (k = 1; j >= 10; j /= 10, k++);
              if (i != k) {
                x.e++;
                if (xc[0] == BASE) xc[0] = 1;
              }
              break;
            } else {
              xc[ni] += k;
              if (xc[ni] != BASE) break;
              xc[ni--] = 0;
              k = 1;
            }
          }
        }
        for (i = xc.length; xc[--i] === 0; xc.pop());
      }
      if (x.e > MAX_EXP) {
        x.c = x.e = null;
      } else if (x.e < MIN_EXP) {
        x.c = [(x.e = 0)];
      }
    }
    return x;
  }
  function valueOf(n) {
    var str,
      e = n.e;
    if (e === null) return n.toString();
    str = coeffToString(n.c);
    str =
      e <= TO_EXP_NEG || e >= TO_EXP_POS
        ? toExponential(str, e)
        : toFixedPoint(str, e, '0');
    return n.s < 0 ? '-' + str : str;
  }
  P.absoluteValue = P.abs = function () {
    var x = new BigNumber2(this);
    if (x.s < 0) x.s = 1;
    return x;
  };
  P.comparedTo = function (y, b) {
    return compare(this, new BigNumber2(y, b));
  };
  P.decimalPlaces = P.dp = function (dp, rm) {
    var c,
      n,
      v,
      x = this;
    if (dp != null) {
      intCheck(dp, 0, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);
      return round(new BigNumber2(x), dp + x.e + 1, rm);
    }
    if (!(c = x.c)) return null;
    n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;
    if ((v = c[v])) for (; v % 10 == 0; v /= 10, n--);
    if (n < 0) n = 0;
    return n;
  };
  P.dividedBy = P.div = function (y, b) {
    return div(this, new BigNumber2(y, b), DECIMAL_PLACES, ROUNDING_MODE);
  };
  P.dividedToIntegerBy = P.idiv = function (y, b) {
    return div(this, new BigNumber2(y, b), 0, 1);
  };
  P.exponentiatedBy = P.pow = function (n, m) {
    var half,
      isModExp,
      i,
      k,
      more,
      nIsBig,
      nIsNeg,
      nIsOdd,
      y,
      x = this;
    n = new BigNumber2(n);
    if (n.c && !n.isInteger()) {
      throw Error(bignumberError + 'Exponent not an integer: ' + valueOf(n));
    }
    if (m != null) m = new BigNumber2(m);
    nIsBig = n.e > 14;
    if (
      !x.c ||
      !x.c[0] ||
      (x.c[0] == 1 && !x.e && x.c.length == 1) ||
      !n.c ||
      !n.c[0]
    ) {
      y = new BigNumber2(
        Math.pow(+valueOf(x), nIsBig ? n.s * (2 - isOdd(n)) : +valueOf(n)),
      );
      return m ? y.mod(m) : y;
    }
    nIsNeg = n.s < 0;
    if (m) {
      if (m.c ? !m.c[0] : !m.s) return new BigNumber2(NaN);
      isModExp = !nIsNeg && x.isInteger() && m.isInteger();
      if (isModExp) x = x.mod(m);
    } else if (
      n.e > 9 &&
      (x.e > 0 ||
        x.e < -1 ||
        (x.e == 0
          ? x.c[0] > 1 || (nIsBig && x.c[1] >= 24e7)
          : x.c[0] < 8e13 || (nIsBig && x.c[0] <= 9999975e7)))
    ) {
      k = x.s < 0 && isOdd(n) ? -0 : 0;
      if (x.e > -1) k = 1 / k;
      return new BigNumber2(nIsNeg ? 1 / k : k);
    } else if (POW_PRECISION) {
      k = mathceil(POW_PRECISION / LOG_BASE + 2);
    }
    if (nIsBig) {
      half = new BigNumber2(0.5);
      if (nIsNeg) n.s = 1;
      nIsOdd = isOdd(n);
    } else {
      i = Math.abs(+valueOf(n));
      nIsOdd = i % 2;
    }
    y = new BigNumber2(ONE);
    for (;;) {
      if (nIsOdd) {
        y = y.times(x);
        if (!y.c) break;
        if (k) {
          if (y.c.length > k) y.c.length = k;
        } else if (isModExp) {
          y = y.mod(m);
        }
      }
      if (i) {
        i = mathfloor(i / 2);
        if (i === 0) break;
        nIsOdd = i % 2;
      } else {
        n = n.times(half);
        round(n, n.e + 1, 1);
        if (n.e > 14) {
          nIsOdd = isOdd(n);
        } else {
          i = +valueOf(n);
          if (i === 0) break;
          nIsOdd = i % 2;
        }
      }
      x = x.times(x);
      if (k) {
        if (x.c && x.c.length > k) x.c.length = k;
      } else if (isModExp) {
        x = x.mod(m);
      }
    }
    if (isModExp) return y;
    if (nIsNeg) y = ONE.div(y);
    return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
  };
  P.integerValue = function (rm) {
    var n = new BigNumber2(this);
    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);
    return round(n, n.e + 1, rm);
  };
  P.isEqualTo = P.eq = function (y, b) {
    return compare(this, new BigNumber2(y, b)) === 0;
  };
  P.isFinite = function () {
    return !!this.c;
  };
  P.isGreaterThan = P.gt = function (y, b) {
    return compare(this, new BigNumber2(y, b)) > 0;
  };
  P.isGreaterThanOrEqualTo = P.gte = function (y, b) {
    return (b = compare(this, new BigNumber2(y, b))) === 1 || b === 0;
  };
  P.isInteger = function () {
    return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
  };
  P.isLessThan = P.lt = function (y, b) {
    return compare(this, new BigNumber2(y, b)) < 0;
  };
  P.isLessThanOrEqualTo = P.lte = function (y, b) {
    return (b = compare(this, new BigNumber2(y, b))) === -1 || b === 0;
  };
  P.isNaN = function () {
    return !this.s;
  };
  P.isNegative = function () {
    return this.s < 0;
  };
  P.isPositive = function () {
    return this.s > 0;
  };
  P.isZero = function () {
    return !!this.c && this.c[0] == 0;
  };
  P.minus = function (y, b) {
    var i,
      j,
      t,
      xLTy,
      x = this,
      a = x.s;
    y = new BigNumber2(y, b);
    b = y.s;
    if (!a || !b) return new BigNumber2(NaN);
    if (a != b) {
      y.s = -b;
      return x.plus(y);
    }
    var xe = x.e / LOG_BASE,
      ye = y.e / LOG_BASE,
      xc = x.c,
      yc = y.c;
    if (!xe || !ye) {
      if (!xc || !yc)
        return xc ? ((y.s = -b), y) : new BigNumber2(yc ? x : NaN);
      if (!xc[0] || !yc[0]) {
        return yc[0]
          ? ((y.s = -b), y)
          : new BigNumber2(
              xc[0]
                ? x
                : // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
                  ROUNDING_MODE == 3
                  ? -0
                  : 0,
            );
      }
    }
    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();
    if ((a = xe - ye)) {
      if ((xLTy = a < 0)) {
        a = -a;
        t = xc;
      } else {
        ye = xe;
        t = yc;
      }
      t.reverse();
      for (b = a; b--; t.push(0));
      t.reverse();
    } else {
      j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;
      for (a = b = 0; b < j; b++) {
        if (xc[b] != yc[b]) {
          xLTy = xc[b] < yc[b];
          break;
        }
      }
    }
    if (xLTy) {
      t = xc;
      xc = yc;
      yc = t;
      y.s = -y.s;
    }
    b = (j = yc.length) - (i = xc.length);
    if (b > 0) for (; b--; xc[i++] = 0);
    b = BASE - 1;
    for (; j > a; ) {
      if (xc[--j] < yc[j]) {
        for (i = j; i && !xc[--i]; xc[i] = b);
        --xc[i];
        xc[j] += BASE;
      }
      xc[j] -= yc[j];
    }
    for (; xc[0] == 0; xc.splice(0, 1), --ye);
    if (!xc[0]) {
      y.s = ROUNDING_MODE == 3 ? -1 : 1;
      y.c = [(y.e = 0)];
      return y;
    }
    return normalise(y, xc, ye);
  };
  P.modulo = P.mod = function (y, b) {
    var q,
      s,
      x = this;
    y = new BigNumber2(y, b);
    if (!x.c || !y.s || (y.c && !y.c[0])) {
      return new BigNumber2(NaN);
    } else if (!y.c || (x.c && !x.c[0])) {
      return new BigNumber2(x);
    }
    if (MODULO_MODE == 9) {
      s = y.s;
      y.s = 1;
      q = div(x, y, 0, 3);
      y.s = s;
      q.s *= s;
    } else {
      q = div(x, y, 0, MODULO_MODE);
    }
    y = x.minus(q.times(y));
    if (!y.c[0] && MODULO_MODE == 1) y.s = x.s;
    return y;
  };
  P.multipliedBy = P.times = function (y, b) {
    var c,
      e,
      i,
      j,
      k,
      m,
      xcL,
      xlo,
      xhi,
      ycL,
      ylo,
      yhi,
      zc,
      base,
      sqrtBase,
      x = this,
      xc = x.c,
      yc = (y = new BigNumber2(y, b)).c;
    if (!xc || !yc || !xc[0] || !yc[0]) {
      if (!x.s || !y.s || (xc && !xc[0] && !yc) || (yc && !yc[0] && !xc)) {
        y.c = y.e = y.s = null;
      } else {
        y.s *= x.s;
        if (!xc || !yc) {
          y.c = y.e = null;
        } else {
          y.c = [0];
          y.e = 0;
        }
      }
      return y;
    }
    e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
    y.s *= x.s;
    xcL = xc.length;
    ycL = yc.length;
    if (xcL < ycL) {
      zc = xc;
      xc = yc;
      yc = zc;
      i = xcL;
      xcL = ycL;
      ycL = i;
    }
    for (i = xcL + ycL, zc = []; i--; zc.push(0));
    base = BASE;
    sqrtBase = SQRT_BASE;
    for (i = ycL; --i >= 0; ) {
      c = 0;
      ylo = yc[i] % sqrtBase;
      yhi = (yc[i] / sqrtBase) | 0;
      for (k = xcL, j = i + k; j > i; ) {
        xlo = xc[--k] % sqrtBase;
        xhi = (xc[k] / sqrtBase) | 0;
        m = yhi * xlo + xhi * ylo;
        xlo = ylo * xlo + (m % sqrtBase) * sqrtBase + zc[j] + c;
        c = ((xlo / base) | 0) + ((m / sqrtBase) | 0) + yhi * xhi;
        zc[j--] = xlo % base;
      }
      zc[j] = c;
    }
    if (c) {
      ++e;
    } else {
      zc.splice(0, 1);
    }
    return normalise(y, zc, e);
  };
  P.negated = function () {
    var x = new BigNumber2(this);
    x.s = -x.s || null;
    return x;
  };
  P.plus = function (y, b) {
    var t,
      x = this,
      a = x.s;
    y = new BigNumber2(y, b);
    b = y.s;
    if (!a || !b) return new BigNumber2(NaN);
    if (a != b) {
      y.s = -b;
      return x.minus(y);
    }
    var xe = x.e / LOG_BASE,
      ye = y.e / LOG_BASE,
      xc = x.c,
      yc = y.c;
    if (!xe || !ye) {
      if (!xc || !yc) return new BigNumber2(a / 0);
      if (!xc[0] || !yc[0])
        return yc[0] ? y : new BigNumber2(xc[0] ? x : a * 0);
    }
    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();
    if ((a = xe - ye)) {
      if (a > 0) {
        ye = xe;
        t = yc;
      } else {
        a = -a;
        t = xc;
      }
      t.reverse();
      for (; a--; t.push(0));
      t.reverse();
    }
    a = xc.length;
    b = yc.length;
    if (a - b < 0) {
      t = yc;
      yc = xc;
      xc = t;
      b = a;
    }
    for (a = 0; b; ) {
      a = ((xc[--b] = xc[b] + yc[b] + a) / BASE) | 0;
      xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
    }
    if (a) {
      xc = [a].concat(xc);
      ++ye;
    }
    return normalise(y, xc, ye);
  };
  P.precision = P.sd = function (sd, rm) {
    var c,
      n,
      v,
      x = this;
    if (sd != null && sd !== !!sd) {
      intCheck(sd, 1, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);
      return round(new BigNumber2(x), sd, rm);
    }
    if (!(c = x.c)) return null;
    v = c.length - 1;
    n = v * LOG_BASE + 1;
    if ((v = c[v])) {
      for (; v % 10 == 0; v /= 10, n--);
      for (v = c[0]; v >= 10; v /= 10, n++);
    }
    if (sd && x.e + 1 > n) n = x.e + 1;
    return n;
  };
  P.shiftedBy = function (k) {
    intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    return this.times('1e' + k);
  };
  P.squareRoot = P.sqrt = function () {
    var m,
      n,
      r,
      rep,
      t,
      x = this,
      c = x.c,
      s = x.s,
      e = x.e,
      dp = DECIMAL_PLACES + 4,
      half = new BigNumber2('0.5');
    if (s !== 1 || !c || !c[0]) {
      return new BigNumber2(
        !s || (s < 0 && (!c || c[0])) ? NaN : c ? x : 1 / 0,
      );
    }
    s = Math.sqrt(+valueOf(x));
    if (s == 0 || s == 1 / 0) {
      n = coeffToString(c);
      if ((n.length + e) % 2 == 0) n += '0';
      s = Math.sqrt(+n);
      e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);
      if (s == 1 / 0) {
        n = '5e' + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf('e') + 1) + e;
      }
      r = new BigNumber2(n);
    } else {
      r = new BigNumber2(s + '');
    }
    if (r.c[0]) {
      e = r.e;
      s = e + dp;
      if (s < 3) s = 0;
      for (;;) {
        t = r;
        r = half.times(t.plus(div(x, t, dp, 1)));
        if (
          coeffToString(t.c).slice(0, s) ===
          (n = coeffToString(r.c)).slice(0, s)
        ) {
          if (r.e < e) --s;
          n = n.slice(s - 3, s + 1);
          if (n == '9999' || (!rep && n == '4999')) {
            if (!rep) {
              round(t, t.e + DECIMAL_PLACES + 2, 0);
              if (t.times(t).eq(x)) {
                r = t;
                break;
              }
            }
            dp += 4;
            s += 4;
            rep = 1;
          } else {
            if (!+n || (!+n.slice(1) && n.charAt(0) == '5')) {
              round(r, r.e + DECIMAL_PLACES + 2, 1);
              m = !r.times(r).eq(x);
            }
            break;
          }
        }
      }
    }
    return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
  };
  P.toExponential = function (dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp++;
    }
    return format(this, dp, rm, 1);
  };
  P.toFixed = function (dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp = dp + this.e + 1;
    }
    return format(this, dp, rm);
  };
  P.toFormat = function (dp, rm, format2) {
    var str,
      x = this;
    if (format2 == null) {
      if (dp != null && rm && typeof rm == 'object') {
        format2 = rm;
        rm = null;
      } else if (dp && typeof dp == 'object') {
        format2 = dp;
        dp = rm = null;
      } else {
        format2 = FORMAT;
      }
    } else if (typeof format2 != 'object') {
      throw Error(bignumberError + 'Argument not an object: ' + format2);
    }
    str = x.toFixed(dp, rm);
    if (x.c) {
      var i,
        arr = str.split('.'),
        g1 = +format2.groupSize,
        g2 = +format2.secondaryGroupSize,
        groupSeparator = format2.groupSeparator || '',
        intPart = arr[0],
        fractionPart = arr[1],
        isNeg = x.s < 0,
        intDigits = isNeg ? intPart.slice(1) : intPart,
        len = intDigits.length;
      if (g2) {
        i = g1;
        g1 = g2;
        g2 = i;
        len -= i;
      }
      if (g1 > 0 && len > 0) {
        i = len % g1 || g1;
        intPart = intDigits.substr(0, i);
        for (; i < len; i += g1)
          intPart += groupSeparator + intDigits.substr(i, g1);
        if (g2 > 0) intPart += groupSeparator + intDigits.slice(i);
        if (isNeg) intPart = '-' + intPart;
      }
      str = fractionPart
        ? intPart +
          (format2.decimalSeparator || '') +
          ((g2 = +format2.fractionGroupSize)
            ? fractionPart.replace(
                new RegExp('\\d{' + g2 + '}\\B', 'g'),
                '$&' + (format2.fractionGroupSeparator || ''),
              )
            : fractionPart)
        : intPart;
    }
    return (format2.prefix || '') + str + (format2.suffix || '');
  };
  P.toFraction = function (md) {
    var d,
      d0,
      d1,
      d2,
      e,
      exp,
      n,
      n0,
      n1,
      q,
      r,
      s,
      x = this,
      xc = x.c;
    if (md != null) {
      n = new BigNumber2(md);
      if ((!n.isInteger() && (n.c || n.s !== 1)) || n.lt(ONE)) {
        throw Error(
          bignumberError +
            'Argument ' +
            (n.isInteger() ? 'out of range: ' : 'not an integer: ') +
            valueOf(n),
        );
      }
    }
    if (!xc) return new BigNumber2(x);
    d = new BigNumber2(ONE);
    n1 = d0 = new BigNumber2(ONE);
    d1 = n0 = new BigNumber2(ONE);
    s = coeffToString(xc);
    e = d.e = s.length - x.e - 1;
    d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
    md = !md || n.comparedTo(d) > 0 ? (e > 0 ? d : n1) : n;
    exp = MAX_EXP;
    MAX_EXP = 1 / 0;
    n = new BigNumber2(s);
    n0.c[0] = 0;
    for (;;) {
      q = div(n, d, 0, 1);
      d2 = d0.plus(q.times(d1));
      if (d2.comparedTo(md) == 1) break;
      d0 = d1;
      d1 = d2;
      n1 = n0.plus(q.times((d2 = n1)));
      n0 = d2;
      d = n.minus(q.times((d2 = d)));
      n = d2;
    }
    d2 = div(md.minus(d0), d1, 0, 1);
    n0 = n0.plus(d2.times(n1));
    d0 = d0.plus(d2.times(d1));
    n0.s = n1.s = x.s;
    e = e * 2;
    r =
      div(n1, d1, e, ROUNDING_MODE)
        .minus(x)
        .abs()
        .comparedTo(div(n0, d0, e, ROUNDING_MODE).minus(x).abs()) < 1
        ? [n1, d1]
        : [n0, d0];
    MAX_EXP = exp;
    return r;
  };
  P.toNumber = function () {
    return +valueOf(this);
  };
  P.toPrecision = function (sd, rm) {
    if (sd != null) intCheck(sd, 1, MAX);
    return format(this, sd, rm, 2);
  };
  P.toString = function (b) {
    var str,
      n = this,
      s = n.s,
      e = n.e;
    if (e === null) {
      if (s) {
        str = 'Infinity';
        if (s < 0) str = '-' + str;
      } else {
        str = 'NaN';
      }
    } else {
      if (b == null) {
        str =
          e <= TO_EXP_NEG || e >= TO_EXP_POS
            ? toExponential(coeffToString(n.c), e)
            : toFixedPoint(coeffToString(n.c), e, '0');
      } else if (b === 10 && alphabetHasNormalDecimalDigits) {
        n = round(new BigNumber2(n), DECIMAL_PLACES + e + 1, ROUNDING_MODE);
        str = toFixedPoint(coeffToString(n.c), n.e, '0');
      } else {
        intCheck(b, 2, ALPHABET.length, 'Base');
        str = convertBase(
          toFixedPoint(coeffToString(n.c), e, '0'),
          10,
          b,
          s,
          true,
        );
      }
      if (s < 0 && n.c[0]) str = '-' + str;
    }
    return str;
  };
  P.valueOf = P.toJSON = function () {
    return valueOf(this);
  };
  P._isBigNumber = true;
  P[Symbol.toStringTag] = 'BigNumber';
  P[/* @__PURE__ */ Symbol.for('nodejs.util.inspect.custom')] = P.valueOf;
  if (configObject != null) BigNumber2.set(configObject);
  return BigNumber2;
}
function bitFloor(n) {
  var i = n | 0;
  return n > 0 || n === i ? i : i - 1;
}
function coeffToString(a) {
  var s,
    z,
    i = 1,
    j = a.length,
    r = a[0] + '';
  for (; i < j; ) {
    s = a[i++] + '';
    z = LOG_BASE - s.length;
    for (; z--; s = '0' + s);
    r += s;
  }
  for (j = r.length; r.charCodeAt(--j) === 48; );
  return r.slice(0, j + 1 || 1);
}
function compare(x, y) {
  var a,
    b,
    xc = x.c,
    yc = y.c,
    i = x.s,
    j = y.s,
    k = x.e,
    l = y.e;
  if (!i || !j) return null;
  a = xc && !xc[0];
  b = yc && !yc[0];
  if (a || b) return a ? (b ? 0 : -j) : i;
  if (i != j) return i;
  a = i < 0;
  b = k == l;
  if (!xc || !yc) return b ? 0 : !xc ^ a ? 1 : -1;
  if (!b) return (k > l) ^ a ? 1 : -1;
  j = (k = xc.length) < (l = yc.length) ? k : l;
  for (i = 0; i < j; i++)
    if (xc[i] != yc[i]) return (xc[i] > yc[i]) ^ a ? 1 : -1;
  return k == l ? 0 : (k > l) ^ a ? 1 : -1;
}
function intCheck(n, min, max, name) {
  if (n < min || n > max || n !== mathfloor(n)) {
    throw Error(
      bignumberError +
        (name || 'Argument') +
        (typeof n == 'number'
          ? n < min || n > max
            ? ' out of range: '
            : ' not an integer: '
          : ' not a primitive number: ') +
        String(n),
    );
  }
}
function isOdd(n) {
  var k = n.c.length - 1;
  return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
}
function toExponential(str, e) {
  return (
    (str.length > 1 ? str.charAt(0) + '.' + str.slice(1) : str) +
    (e < 0 ? 'e' : 'e+') +
    e
  );
}
function toFixedPoint(str, e, z) {
  var len, zs;
  if (e < 0) {
    for (zs = z + '.'; ++e; zs += z);
    str = zs + str;
  } else {
    len = str.length;
    if (++e > len) {
      for (zs = z, e -= len; --e; zs += z);
      str += zs;
    } else if (e < len) {
      str = str.slice(0, e) + '.' + str.slice(e);
    }
  }
  return str;
}
var BigNumber = clone();
var SplayTreeNode = class {
  key;
  left = null;
  right = null;
  constructor(key) {
    this.key = key;
  }
};
var SplayTreeSetNode = class extends SplayTreeNode {
  constructor(key) {
    super(key);
  }
};
var SplayTree = class {
  size = 0;
  modificationCount = 0;
  splayCount = 0;
  splay(key) {
    const root = this.root;
    if (root == null) {
      this.compare(key, key);
      return -1;
    }
    let right = null;
    let newTreeRight = null;
    let left = null;
    let newTreeLeft = null;
    let current = root;
    const compare2 = this.compare;
    let comp;
    while (true) {
      comp = compare2(current.key, key);
      if (comp > 0) {
        let currentLeft = current.left;
        if (currentLeft == null) break;
        comp = compare2(currentLeft.key, key);
        if (comp > 0) {
          current.left = currentLeft.right;
          currentLeft.right = current;
          current = currentLeft;
          currentLeft = current.left;
          if (currentLeft == null) break;
        }
        if (right == null) {
          newTreeRight = current;
        } else {
          right.left = current;
        }
        right = current;
        current = currentLeft;
      } else if (comp < 0) {
        let currentRight = current.right;
        if (currentRight == null) break;
        comp = compare2(currentRight.key, key);
        if (comp < 0) {
          current.right = currentRight.left;
          currentRight.left = current;
          current = currentRight;
          currentRight = current.right;
          if (currentRight == null) break;
        }
        if (left == null) {
          newTreeLeft = current;
        } else {
          left.right = current;
        }
        left = current;
        current = currentRight;
      } else {
        break;
      }
    }
    if (left != null) {
      left.right = current.left;
      current.left = newTreeLeft;
    }
    if (right != null) {
      right.left = current.right;
      current.right = newTreeRight;
    }
    if (this.root !== current) {
      this.root = current;
      this.splayCount++;
    }
    return comp;
  }
  splayMin(node) {
    let current = node;
    let nextLeft = current.left;
    while (nextLeft != null) {
      const left = nextLeft;
      current.left = left.right;
      left.right = current;
      current = left;
      nextLeft = current.left;
    }
    return current;
  }
  splayMax(node) {
    let current = node;
    let nextRight = current.right;
    while (nextRight != null) {
      const right = nextRight;
      current.right = right.left;
      right.left = current;
      current = right;
      nextRight = current.right;
    }
    return current;
  }
  _delete(key) {
    if (this.root == null) return null;
    const comp = this.splay(key);
    if (comp != 0) return null;
    let root = this.root;
    const result = root;
    const left = root.left;
    this.size--;
    if (left == null) {
      this.root = root.right;
    } else {
      const right = root.right;
      root = this.splayMax(left);
      root.right = right;
      this.root = root;
    }
    this.modificationCount++;
    return result;
  }
  addNewRoot(node, comp) {
    this.size++;
    this.modificationCount++;
    const root = this.root;
    if (root == null) {
      this.root = node;
      return;
    }
    if (comp < 0) {
      node.left = root;
      node.right = root.right;
      root.right = null;
    } else {
      node.right = root;
      node.left = root.left;
      root.left = null;
    }
    this.root = node;
  }
  _first() {
    const root = this.root;
    if (root == null) return null;
    this.root = this.splayMin(root);
    return this.root;
  }
  _last() {
    const root = this.root;
    if (root == null) return null;
    this.root = this.splayMax(root);
    return this.root;
  }
  clear() {
    this.root = null;
    this.size = 0;
    this.modificationCount++;
  }
  has(key) {
    return this.validKey(key) && this.splay(key) == 0;
  }
  defaultCompare() {
    return (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  }
  wrap() {
    return {
      getRoot: () => {
        return this.root;
      },
      setRoot: (root) => {
        this.root = root;
      },
      getSize: () => {
        return this.size;
      },
      getModificationCount: () => {
        return this.modificationCount;
      },
      getSplayCount: () => {
        return this.splayCount;
      },
      setSplayCount: (count) => {
        this.splayCount = count;
      },
      splay: (key) => {
        return this.splay(key);
      },
      has: (key) => {
        return this.has(key);
      },
    };
  }
};
var SplayTreeSet = class _SplayTreeSet extends SplayTree {
  root = null;
  compare;
  validKey;
  constructor(compare2, isValidKey) {
    super();
    this.compare = compare2 ?? this.defaultCompare();
    this.validKey = isValidKey ?? ((v) => v != null && v != void 0);
  }
  delete(element) {
    if (!this.validKey(element)) return false;
    return this._delete(element) != null;
  }
  deleteAll(elements) {
    for (const element of elements) {
      this.delete(element);
    }
  }
  forEach(f) {
    const nodes = this[Symbol.iterator]();
    let result;
    while (((result = nodes.next()), !result.done)) {
      f(result.value, result.value, this);
    }
  }
  add(element) {
    const compare2 = this.splay(element);
    if (compare2 != 0) this.addNewRoot(new SplayTreeSetNode(element), compare2);
    return this;
  }
  addAndReturn(element) {
    const compare2 = this.splay(element);
    if (compare2 != 0) this.addNewRoot(new SplayTreeSetNode(element), compare2);
    return this.root.key;
  }
  addAll(elements) {
    for (const element of elements) {
      this.add(element);
    }
  }
  isEmpty() {
    return this.root == null;
  }
  isNotEmpty() {
    return this.root != null;
  }
  single() {
    if (this.size == 0) throw 'Bad state: No element';
    if (this.size > 1) throw 'Bad state: Too many element';
    return this.root.key;
  }
  first() {
    if (this.size == 0) throw 'Bad state: No element';
    return this._first().key;
  }
  last() {
    if (this.size == 0) throw 'Bad state: No element';
    return this._last().key;
  }
  lastBefore(element) {
    if (element == null) throw 'Invalid arguments(s)';
    if (this.root == null) return null;
    const comp = this.splay(element);
    if (comp < 0) return this.root.key;
    let node = this.root.left;
    if (node == null) return null;
    let nodeRight = node.right;
    while (nodeRight != null) {
      node = nodeRight;
      nodeRight = node.right;
    }
    return node.key;
  }
  firstAfter(element) {
    if (element == null) throw 'Invalid arguments(s)';
    if (this.root == null) return null;
    const comp = this.splay(element);
    if (comp > 0) return this.root.key;
    let node = this.root.right;
    if (node == null) return null;
    let nodeLeft = node.left;
    while (nodeLeft != null) {
      node = nodeLeft;
      nodeLeft = node.left;
    }
    return node.key;
  }
  retainAll(elements) {
    const retainSet = new _SplayTreeSet(this.compare, this.validKey);
    const modificationCount = this.modificationCount;
    for (const object of elements) {
      if (modificationCount != this.modificationCount) {
        throw 'Concurrent modification during iteration.';
      }
      if (this.validKey(object) && this.splay(object) == 0) {
        retainSet.add(this.root.key);
      }
    }
    if (retainSet.size != this.size) {
      this.root = retainSet.root;
      this.size = retainSet.size;
      this.modificationCount++;
    }
  }
  lookup(object) {
    if (!this.validKey(object)) return null;
    const comp = this.splay(object);
    if (comp != 0) return null;
    return this.root.key;
  }
  intersection(other) {
    const result = new _SplayTreeSet(this.compare, this.validKey);
    for (const element of this) {
      if (other.has(element)) result.add(element);
    }
    return result;
  }
  difference(other) {
    const result = new _SplayTreeSet(this.compare, this.validKey);
    for (const element of this) {
      if (!other.has(element)) result.add(element);
    }
    return result;
  }
  union(other) {
    const u2 = this.clone();
    u2.addAll(other);
    return u2;
  }
  clone() {
    const set2 = new _SplayTreeSet(this.compare, this.validKey);
    set2.size = this.size;
    set2.root = this.copyNode(this.root);
    return set2;
  }
  copyNode(node) {
    if (node == null) return null;
    function copyChildren(node2, dest) {
      let left;
      let right;
      do {
        left = node2.left;
        right = node2.right;
        if (left != null) {
          const newLeft = new SplayTreeSetNode(left.key);
          dest.left = newLeft;
          copyChildren(left, newLeft);
        }
        if (right != null) {
          const newRight = new SplayTreeSetNode(right.key);
          dest.right = newRight;
          node2 = right;
          dest = newRight;
        }
      } while (right != null);
    }
    const result = new SplayTreeSetNode(node.key);
    copyChildren(node, result);
    return result;
  }
  toSet() {
    return this.clone();
  }
  entries() {
    return new SplayTreeSetEntryIterableIterator(this.wrap());
  }
  keys() {
    return this[Symbol.iterator]();
  }
  values() {
    return this[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return new SplayTreeKeyIterableIterator(this.wrap());
  }
  [Symbol.toStringTag] = '[object Set]';
};
var SplayTreeIterableIterator = class {
  tree;
  path = new Array();
  modificationCount = null;
  splayCount;
  constructor(tree) {
    this.tree = tree;
    this.splayCount = tree.getSplayCount();
  }
  [Symbol.iterator]() {
    return this;
  }
  next() {
    if (this.moveNext()) return { done: false, value: this.current() };
    return { done: true, value: null };
  }
  current() {
    if (!this.path.length) return null;
    const node = this.path[this.path.length - 1];
    return this.getValue(node);
  }
  rebuildPath(key) {
    this.path.splice(0, this.path.length);
    this.tree.splay(key);
    this.path.push(this.tree.getRoot());
    this.splayCount = this.tree.getSplayCount();
  }
  findLeftMostDescendent(node) {
    while (node != null) {
      this.path.push(node);
      node = node.left;
    }
  }
  moveNext() {
    if (this.modificationCount != this.tree.getModificationCount()) {
      if (this.modificationCount == null) {
        this.modificationCount = this.tree.getModificationCount();
        let node2 = this.tree.getRoot();
        while (node2 != null) {
          this.path.push(node2);
          node2 = node2.left;
        }
        return this.path.length > 0;
      }
      throw 'Concurrent modification during iteration.';
    }
    if (!this.path.length) return false;
    if (this.splayCount != this.tree.getSplayCount()) {
      this.rebuildPath(this.path[this.path.length - 1].key);
    }
    let node = this.path[this.path.length - 1];
    let next = node.right;
    if (next != null) {
      while (next != null) {
        this.path.push(next);
        next = next.left;
      }
      return true;
    }
    this.path.pop();
    while (this.path.length && this.path[this.path.length - 1].right === node) {
      node = this.path.pop();
    }
    return this.path.length > 0;
  }
};
var SplayTreeKeyIterableIterator = class extends SplayTreeIterableIterator {
  getValue(node) {
    return node.key;
  }
};
var SplayTreeSetEntryIterableIterator = class extends SplayTreeIterableIterator {
  getValue(node) {
    return [node.key, node.key];
  }
};
var constant_default = (x) => {
  return () => {
    return x;
  };
};
var compare_default = (eps) => {
  const almostEqual = eps
    ? (a, b) => b.minus(a).abs().isLessThanOrEqualTo(eps)
    : constant_default(false);
  return (a, b) => {
    if (almostEqual(a, b)) return 0;
    return a.comparedTo(b);
  };
};
function orient_default(eps) {
  const almostCollinear = eps
    ? (area2, ax, ay, cx, cy) =>
        area2
          .exponentiatedBy(2)
          .isLessThanOrEqualTo(
            cx
              .minus(ax)
              .exponentiatedBy(2)
              .plus(cy.minus(ay).exponentiatedBy(2))
              .times(eps),
          )
    : constant_default(false);
  return (a, b, c) => {
    const ax = a.x,
      ay = a.y,
      cx = c.x,
      cy = c.y;
    const area2 = ay
      .minus(cy)
      .times(b.x.minus(cx))
      .minus(ax.minus(cx).times(b.y.minus(cy)));
    if (almostCollinear(area2, ax, ay, cx, cy)) return 0;
    return area2.comparedTo(0);
  };
}
var identity_default = (x) => {
  return x;
};
var snap_default = (eps) => {
  if (eps) {
    const xTree = new SplayTreeSet(compare_default(eps));
    const yTree = new SplayTreeSet(compare_default(eps));
    const snapCoord = (coord, tree) => {
      return tree.addAndReturn(coord);
    };
    const snap = (v) => {
      return {
        x: snapCoord(v.x, xTree),
        y: snapCoord(v.y, yTree),
      };
    };
    snap({ x: new BigNumber(0), y: new BigNumber(0) });
    return snap;
  }
  return identity_default;
};
var set = (eps) => {
  return {
    set: (eps2) => {
      precision = set(eps2);
    },
    reset: () => set(eps),
    compare: compare_default(eps),
    snap: snap_default(eps),
    orient: orient_default(eps),
  };
};
var precision = set();
var isInBbox = (bbox2, point2) => {
  return (
    bbox2.ll.x.isLessThanOrEqualTo(point2.x) &&
    point2.x.isLessThanOrEqualTo(bbox2.ur.x) &&
    bbox2.ll.y.isLessThanOrEqualTo(point2.y) &&
    point2.y.isLessThanOrEqualTo(bbox2.ur.y)
  );
};
var getBboxOverlap = (b1, b2) => {
  if (
    b2.ur.x.isLessThan(b1.ll.x) ||
    b1.ur.x.isLessThan(b2.ll.x) ||
    b2.ur.y.isLessThan(b1.ll.y) ||
    b1.ur.y.isLessThan(b2.ll.y)
  )
    return null;
  const lowerX = b1.ll.x.isLessThan(b2.ll.x) ? b2.ll.x : b1.ll.x;
  const upperX = b1.ur.x.isLessThan(b2.ur.x) ? b1.ur.x : b2.ur.x;
  const lowerY = b1.ll.y.isLessThan(b2.ll.y) ? b2.ll.y : b1.ll.y;
  const upperY = b1.ur.y.isLessThan(b2.ur.y) ? b1.ur.y : b2.ur.y;
  return { ll: { x: lowerX, y: lowerY }, ur: { x: upperX, y: upperY } };
};
var crossProduct = (a, b) => a.x.times(b.y).minus(a.y.times(b.x));
var dotProduct = (a, b) => a.x.times(b.x).plus(a.y.times(b.y));
var length = (v) => dotProduct(v, v).sqrt();
var sineOfAngle = (pShared, pBase, pAngle) => {
  const vBase = { x: pBase.x.minus(pShared.x), y: pBase.y.minus(pShared.y) };
  const vAngle = { x: pAngle.x.minus(pShared.x), y: pAngle.y.minus(pShared.y) };
  return crossProduct(vAngle, vBase).div(length(vAngle)).div(length(vBase));
};
var cosineOfAngle = (pShared, pBase, pAngle) => {
  const vBase = { x: pBase.x.minus(pShared.x), y: pBase.y.minus(pShared.y) };
  const vAngle = { x: pAngle.x.minus(pShared.x), y: pAngle.y.minus(pShared.y) };
  return dotProduct(vAngle, vBase).div(length(vAngle)).div(length(vBase));
};
var horizontalIntersection = (pt, v, y) => {
  if (v.y.isZero()) return null;
  return { x: pt.x.plus(v.x.div(v.y).times(y.minus(pt.y))), y };
};
var verticalIntersection = (pt, v, x) => {
  if (v.x.isZero()) return null;
  return { x, y: pt.y.plus(v.y.div(v.x).times(x.minus(pt.x))) };
};
var intersection = (pt1, v1, pt2, v2) => {
  if (v1.x.isZero()) return verticalIntersection(pt2, v2, pt1.x);
  if (v2.x.isZero()) return verticalIntersection(pt1, v1, pt2.x);
  if (v1.y.isZero()) return horizontalIntersection(pt2, v2, pt1.y);
  if (v2.y.isZero()) return horizontalIntersection(pt1, v1, pt2.y);
  const kross = crossProduct(v1, v2);
  if (kross.isZero()) return null;
  const ve = { x: pt2.x.minus(pt1.x), y: pt2.y.minus(pt1.y) };
  const d1 = crossProduct(ve, v1).div(kross);
  const d2 = crossProduct(ve, v2).div(kross);
  const x1 = pt1.x.plus(d2.times(v1.x)),
    x2 = pt2.x.plus(d1.times(v2.x));
  const y1 = pt1.y.plus(d2.times(v1.y)),
    y2 = pt2.y.plus(d1.times(v2.y));
  const x = x1.plus(x2).div(2);
  const y = y1.plus(y2).div(2);
  return { x, y };
};
var SweepEvent = class _SweepEvent {
  point;
  isLeft;
  segment;
  otherSE;
  consumedBy;
  // for ordering sweep events in the sweep event queue
  static compare(a, b) {
    const ptCmp = _SweepEvent.comparePoints(a.point, b.point);
    if (ptCmp !== 0) return ptCmp;
    if (a.point !== b.point) a.link(b);
    if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1;
    return Segment2.compare(a.segment, b.segment);
  }
  // for ordering points in sweep line order
  static comparePoints(aPt, bPt) {
    if (aPt.x.isLessThan(bPt.x)) return -1;
    if (aPt.x.isGreaterThan(bPt.x)) return 1;
    if (aPt.y.isLessThan(bPt.y)) return -1;
    if (aPt.y.isGreaterThan(bPt.y)) return 1;
    return 0;
  }
  // Warning: 'point' input will be modified and re-used (for performance)
  constructor(point2, isLeft) {
    if (point2.events === void 0) point2.events = [this];
    else point2.events.push(this);
    this.point = point2;
    this.isLeft = isLeft;
  }
  link(other) {
    if (other.point === this.point) {
      throw new Error('Tried to link already linked events');
    }
    const otherEvents = other.point.events;
    for (let i = 0, iMax = otherEvents.length; i < iMax; i++) {
      const evt = otherEvents[i];
      this.point.events.push(evt);
      evt.point = this.point;
    }
    this.checkForConsuming();
  }
  /* Do a pass over our linked events and check to see if any pair
   * of segments match, and should be consumed. */
  checkForConsuming() {
    const numEvents = this.point.events.length;
    for (let i = 0; i < numEvents; i++) {
      const evt1 = this.point.events[i];
      if (evt1.segment.consumedBy !== void 0) continue;
      for (let j = i + 1; j < numEvents; j++) {
        const evt2 = this.point.events[j];
        if (evt2.consumedBy !== void 0) continue;
        if (evt1.otherSE.point.events !== evt2.otherSE.point.events) continue;
        evt1.segment.consume(evt2.segment);
      }
    }
  }
  getAvailableLinkedEvents() {
    const events = [];
    for (let i = 0, iMax = this.point.events.length; i < iMax; i++) {
      const evt = this.point.events[i];
      if (evt !== this && !evt.segment.ringOut && evt.segment.isInResult()) {
        events.push(evt);
      }
    }
    return events;
  }
  /**
   * Returns a comparator function for sorting linked events that will
   * favor the event that will give us the smallest left-side angle.
   * All ring construction starts as low as possible heading to the right,
   * so by always turning left as sharp as possible we'll get polygons
   * without uncessary loops & holes.
   *
   * The comparator function has a compute cache such that it avoids
   * re-computing already-computed values.
   */
  getLeftmostComparator(baseEvent) {
    const cache = /* @__PURE__ */ new Map();
    const fillCache = (linkedEvent) => {
      const nextEvent = linkedEvent.otherSE;
      cache.set(linkedEvent, {
        sine: sineOfAngle(this.point, baseEvent.point, nextEvent.point),
        cosine: cosineOfAngle(this.point, baseEvent.point, nextEvent.point),
      });
    };
    return (a, b) => {
      if (!cache.has(a)) fillCache(a);
      if (!cache.has(b)) fillCache(b);
      const { sine: asine, cosine: acosine } = cache.get(a);
      const { sine: bsine, cosine: bcosine } = cache.get(b);
      if (asine.isGreaterThanOrEqualTo(0) && bsine.isGreaterThanOrEqualTo(0)) {
        if (acosine.isLessThan(bcosine)) return 1;
        if (acosine.isGreaterThan(bcosine)) return -1;
        return 0;
      }
      if (asine.isLessThan(0) && bsine.isLessThan(0)) {
        if (acosine.isLessThan(bcosine)) return -1;
        if (acosine.isGreaterThan(bcosine)) return 1;
        return 0;
      }
      if (bsine.isLessThan(asine)) return -1;
      if (bsine.isGreaterThan(asine)) return 1;
      return 0;
    };
  }
};
var RingOut = class _RingOut {
  events;
  poly;
  _isExteriorRing;
  _enclosingRing;
  /* Given the segments from the sweep line pass, compute & return a series
   * of closed rings from all the segments marked to be part of the result */
  static factory(allSegments) {
    const ringsOut = [];
    for (let i = 0, iMax = allSegments.length; i < iMax; i++) {
      const segment = allSegments[i];
      if (!segment.isInResult() || segment.ringOut) continue;
      let prevEvent = null;
      let event = segment.leftSE;
      let nextEvent = segment.rightSE;
      const events = [event];
      const startingPoint = event.point;
      const intersectionLEs = [];
      while (true) {
        prevEvent = event;
        event = nextEvent;
        events.push(event);
        if (event.point === startingPoint) break;
        while (true) {
          const availableLEs = event.getAvailableLinkedEvents();
          if (availableLEs.length === 0) {
            const firstPt = events[0].point;
            const lastPt = events[events.length - 1].point;
            throw new Error(
              `Unable to complete output ring starting at [${firstPt.x}, ${firstPt.y}]. Last matching segment found ends at [${lastPt.x}, ${lastPt.y}].`,
            );
          }
          if (availableLEs.length === 1) {
            nextEvent = availableLEs[0].otherSE;
            break;
          }
          let indexLE = null;
          for (let j = 0, jMax = intersectionLEs.length; j < jMax; j++) {
            if (intersectionLEs[j].point === event.point) {
              indexLE = j;
              break;
            }
          }
          if (indexLE !== null) {
            const intersectionLE = intersectionLEs.splice(indexLE)[0];
            const ringEvents = events.splice(intersectionLE.index);
            ringEvents.unshift(ringEvents[0].otherSE);
            ringsOut.push(new _RingOut(ringEvents.reverse()));
            continue;
          }
          intersectionLEs.push({
            index: events.length,
            point: event.point,
          });
          const comparator = event.getLeftmostComparator(prevEvent);
          nextEvent = availableLEs.sort(comparator)[0].otherSE;
          break;
        }
      }
      ringsOut.push(new _RingOut(events));
    }
    return ringsOut;
  }
  constructor(events) {
    this.events = events;
    for (let i = 0, iMax = events.length; i < iMax; i++) {
      events[i].segment.ringOut = this;
    }
    this.poly = null;
  }
  getGeom() {
    let prevPt = this.events[0].point;
    const points = [prevPt];
    for (let i = 1, iMax = this.events.length - 1; i < iMax; i++) {
      const pt2 = this.events[i].point;
      const nextPt2 = this.events[i + 1].point;
      if (precision.orient(pt2, prevPt, nextPt2) === 0) continue;
      points.push(pt2);
      prevPt = pt2;
    }
    if (points.length === 1) return null;
    const pt = points[0];
    const nextPt = points[1];
    if (precision.orient(pt, prevPt, nextPt) === 0) points.shift();
    points.push(points[0]);
    const step = this.isExteriorRing() ? 1 : -1;
    const iStart = this.isExteriorRing() ? 0 : points.length - 1;
    const iEnd = this.isExteriorRing() ? points.length : -1;
    const orderedPoints = [];
    for (let i = iStart; i != iEnd; i += step)
      orderedPoints.push([points[i].x.toNumber(), points[i].y.toNumber()]);
    return orderedPoints;
  }
  isExteriorRing() {
    if (this._isExteriorRing === void 0) {
      const enclosing = this.enclosingRing();
      this._isExteriorRing = enclosing ? !enclosing.isExteriorRing() : true;
    }
    return this._isExteriorRing;
  }
  enclosingRing() {
    if (this._enclosingRing === void 0) {
      this._enclosingRing = this._calcEnclosingRing();
    }
    return this._enclosingRing;
  }
  /* Returns the ring that encloses this one, if any */
  _calcEnclosingRing() {
    let leftMostEvt = this.events[0];
    for (let i = 1, iMax = this.events.length; i < iMax; i++) {
      const evt = this.events[i];
      if (SweepEvent.compare(leftMostEvt, evt) > 0) leftMostEvt = evt;
    }
    let prevSeg = leftMostEvt.segment.prevInResult();
    let prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
    while (true) {
      if (!prevSeg) return null;
      if (!prevPrevSeg) return prevSeg.ringOut;
      if (prevPrevSeg.ringOut !== prevSeg.ringOut) {
        if (prevPrevSeg.ringOut?.enclosingRing() !== prevSeg.ringOut) {
          return prevSeg.ringOut;
        } else return prevSeg.ringOut?.enclosingRing();
      }
      prevSeg = prevPrevSeg.prevInResult();
      prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
    }
  }
};
var PolyOut = class {
  exteriorRing;
  interiorRings;
  constructor(exteriorRing) {
    this.exteriorRing = exteriorRing;
    exteriorRing.poly = this;
    this.interiorRings = [];
  }
  addInterior(ring) {
    this.interiorRings.push(ring);
    ring.poly = this;
  }
  getGeom() {
    const geom0 = this.exteriorRing.getGeom();
    if (geom0 === null) return null;
    const geom = [geom0];
    for (let i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
      const ringGeom = this.interiorRings[i].getGeom();
      if (ringGeom === null) continue;
      geom.push(ringGeom);
    }
    return geom;
  }
};
var MultiPolyOut = class {
  rings;
  polys;
  constructor(rings) {
    this.rings = rings;
    this.polys = this._composePolys(rings);
  }
  getGeom() {
    const geom = [];
    for (let i = 0, iMax = this.polys.length; i < iMax; i++) {
      const polyGeom = this.polys[i].getGeom();
      if (polyGeom === null) continue;
      geom.push(polyGeom);
    }
    return geom;
  }
  _composePolys(rings) {
    const polys = [];
    for (let i = 0, iMax = rings.length; i < iMax; i++) {
      const ring = rings[i];
      if (ring.poly) continue;
      if (ring.isExteriorRing()) polys.push(new PolyOut(ring));
      else {
        const enclosingRing = ring.enclosingRing();
        if (!enclosingRing?.poly) polys.push(new PolyOut(enclosingRing));
        enclosingRing?.poly?.addInterior(ring);
      }
    }
    return polys;
  }
};
var SweepLine = class {
  queue;
  tree;
  segments;
  constructor(queue, comparator = Segment2.compare) {
    this.queue = queue;
    this.tree = new SplayTreeSet(comparator);
    this.segments = [];
  }
  process(event) {
    const segment = event.segment;
    const newEvents = [];
    if (event.consumedBy) {
      if (event.isLeft) this.queue.delete(event.otherSE);
      else this.tree.delete(segment);
      return newEvents;
    }
    if (event.isLeft) this.tree.add(segment);
    let prevSeg = segment;
    let nextSeg = segment;
    do {
      prevSeg = this.tree.lastBefore(prevSeg);
    } while (prevSeg != null && prevSeg.consumedBy != void 0);
    do {
      nextSeg = this.tree.firstAfter(nextSeg);
    } while (nextSeg != null && nextSeg.consumedBy != void 0);
    if (event.isLeft) {
      let prevMySplitter = null;
      if (prevSeg) {
        const prevInter = prevSeg.getIntersection(segment);
        if (prevInter !== null) {
          if (!segment.isAnEndpoint(prevInter)) prevMySplitter = prevInter;
          if (!prevSeg.isAnEndpoint(prevInter)) {
            const newEventsFromSplit = this._splitSafely(prevSeg, prevInter);
            for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
              newEvents.push(newEventsFromSplit[i]);
            }
          }
        }
      }
      let nextMySplitter = null;
      if (nextSeg) {
        const nextInter = nextSeg.getIntersection(segment);
        if (nextInter !== null) {
          if (!segment.isAnEndpoint(nextInter)) nextMySplitter = nextInter;
          if (!nextSeg.isAnEndpoint(nextInter)) {
            const newEventsFromSplit = this._splitSafely(nextSeg, nextInter);
            for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
              newEvents.push(newEventsFromSplit[i]);
            }
          }
        }
      }
      if (prevMySplitter !== null || nextMySplitter !== null) {
        let mySplitter = null;
        if (prevMySplitter === null) mySplitter = nextMySplitter;
        else if (nextMySplitter === null) mySplitter = prevMySplitter;
        else {
          const cmpSplitters = SweepEvent.comparePoints(
            prevMySplitter,
            nextMySplitter,
          );
          mySplitter = cmpSplitters <= 0 ? prevMySplitter : nextMySplitter;
        }
        this.queue.delete(segment.rightSE);
        newEvents.push(segment.rightSE);
        const newEventsFromSplit = segment.split(mySplitter);
        for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
          newEvents.push(newEventsFromSplit[i]);
        }
      }
      if (newEvents.length > 0) {
        this.tree.delete(segment);
        newEvents.push(event);
      } else {
        this.segments.push(segment);
        segment.prev = prevSeg;
      }
    } else {
      if (prevSeg && nextSeg) {
        const inter = prevSeg.getIntersection(nextSeg);
        if (inter !== null) {
          if (!prevSeg.isAnEndpoint(inter)) {
            const newEventsFromSplit = this._splitSafely(prevSeg, inter);
            for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
              newEvents.push(newEventsFromSplit[i]);
            }
          }
          if (!nextSeg.isAnEndpoint(inter)) {
            const newEventsFromSplit = this._splitSafely(nextSeg, inter);
            for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
              newEvents.push(newEventsFromSplit[i]);
            }
          }
        }
      }
      this.tree.delete(segment);
    }
    return newEvents;
  }
  /* Safely split a segment that is currently in the datastructures
   * IE - a segment other than the one that is currently being processed. */
  _splitSafely(seg, pt) {
    this.tree.delete(seg);
    const rightSE = seg.rightSE;
    this.queue.delete(rightSE);
    const newEvents = seg.split(pt);
    newEvents.push(rightSE);
    if (seg.consumedBy === void 0) this.tree.add(seg);
    return newEvents;
  }
};
var Operation = class {
  type;
  numMultiPolys;
  run(type, geom, moreGeoms) {
    operation.type = type;
    const multipolys = [new MultiPolyIn(geom, true)];
    for (let i = 0, iMax = moreGeoms.length; i < iMax; i++) {
      multipolys.push(new MultiPolyIn(moreGeoms[i], false));
    }
    operation.numMultiPolys = multipolys.length;
    if (operation.type === 'difference') {
      const subject = multipolys[0];
      let i = 1;
      while (i < multipolys.length) {
        if (getBboxOverlap(multipolys[i].bbox, subject.bbox) !== null) i++;
        else multipolys.splice(i, 1);
      }
    }
    if (operation.type === 'intersection') {
      for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
        const mpA = multipolys[i];
        for (let j = i + 1, jMax = multipolys.length; j < jMax; j++) {
          if (getBboxOverlap(mpA.bbox, multipolys[j].bbox) === null) return [];
        }
      }
    }
    const queue = new SplayTreeSet(SweepEvent.compare);
    for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
      const sweepEvents = multipolys[i].getSweepEvents();
      for (let j = 0, jMax = sweepEvents.length; j < jMax; j++) {
        queue.add(sweepEvents[j]);
      }
    }
    const sweepLine = new SweepLine(queue);
    let evt = null;
    if (queue.size != 0) {
      evt = queue.first();
      queue.delete(evt);
    }
    while (evt) {
      const newEvents = sweepLine.process(evt);
      for (let i = 0, iMax = newEvents.length; i < iMax; i++) {
        const evt2 = newEvents[i];
        if (evt2.consumedBy === void 0) queue.add(evt2);
      }
      if (queue.size != 0) {
        evt = queue.first();
        queue.delete(evt);
      } else {
        evt = null;
      }
    }
    precision.reset();
    const ringsOut = RingOut.factory(sweepLine.segments);
    const result = new MultiPolyOut(ringsOut);
    return result.getGeom();
  }
};
var operation = new Operation();
var operation_default = operation;
var segmentId = 0;
var Segment2 = class _Segment {
  id;
  leftSE;
  rightSE;
  rings;
  windings;
  ringOut;
  consumedBy;
  prev;
  _prevInResult;
  _beforeState;
  _afterState;
  _isInResult;
  /* This compare() function is for ordering segments in the sweep
   * line tree, and does so according to the following criteria:
   *
   * Consider the vertical line that lies an infinestimal step to the
   * right of the right-more of the two left endpoints of the input
   * segments. Imagine slowly moving a point up from negative infinity
   * in the increasing y direction. Which of the two segments will that
   * point intersect first? That segment comes 'before' the other one.
   *
   * If neither segment would be intersected by such a line, (if one
   * or more of the segments are vertical) then the line to be considered
   * is directly on the right-more of the two left inputs.
   */
  static compare(a, b) {
    const alx = a.leftSE.point.x;
    const blx = b.leftSE.point.x;
    const arx = a.rightSE.point.x;
    const brx = b.rightSE.point.x;
    if (brx.isLessThan(alx)) return 1;
    if (arx.isLessThan(blx)) return -1;
    const aly = a.leftSE.point.y;
    const bly = b.leftSE.point.y;
    const ary = a.rightSE.point.y;
    const bry = b.rightSE.point.y;
    if (alx.isLessThan(blx)) {
      if (bly.isLessThan(aly) && bly.isLessThan(ary)) return 1;
      if (bly.isGreaterThan(aly) && bly.isGreaterThan(ary)) return -1;
      const aCmpBLeft = a.comparePoint(b.leftSE.point);
      if (aCmpBLeft < 0) return 1;
      if (aCmpBLeft > 0) return -1;
      const bCmpARight = b.comparePoint(a.rightSE.point);
      if (bCmpARight !== 0) return bCmpARight;
      return -1;
    }
    if (alx.isGreaterThan(blx)) {
      if (aly.isLessThan(bly) && aly.isLessThan(bry)) return -1;
      if (aly.isGreaterThan(bly) && aly.isGreaterThan(bry)) return 1;
      const bCmpALeft = b.comparePoint(a.leftSE.point);
      if (bCmpALeft !== 0) return bCmpALeft;
      const aCmpBRight = a.comparePoint(b.rightSE.point);
      if (aCmpBRight < 0) return 1;
      if (aCmpBRight > 0) return -1;
      return 1;
    }
    if (aly.isLessThan(bly)) return -1;
    if (aly.isGreaterThan(bly)) return 1;
    if (arx.isLessThan(brx)) {
      const bCmpARight = b.comparePoint(a.rightSE.point);
      if (bCmpARight !== 0) return bCmpARight;
    }
    if (arx.isGreaterThan(brx)) {
      const aCmpBRight = a.comparePoint(b.rightSE.point);
      if (aCmpBRight < 0) return 1;
      if (aCmpBRight > 0) return -1;
    }
    if (!arx.eq(brx)) {
      const ay = ary.minus(aly);
      const ax = arx.minus(alx);
      const by = bry.minus(bly);
      const bx = brx.minus(blx);
      if (ay.isGreaterThan(ax) && by.isLessThan(bx)) return 1;
      if (ay.isLessThan(ax) && by.isGreaterThan(bx)) return -1;
    }
    if (arx.isGreaterThan(brx)) return 1;
    if (arx.isLessThan(brx)) return -1;
    if (ary.isLessThan(bry)) return -1;
    if (ary.isGreaterThan(bry)) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  }
  /* Warning: a reference to ringWindings input will be stored,
   *  and possibly will be later modified */
  constructor(leftSE, rightSE, rings, windings) {
    this.id = ++segmentId;
    this.leftSE = leftSE;
    leftSE.segment = this;
    leftSE.otherSE = rightSE;
    this.rightSE = rightSE;
    rightSE.segment = this;
    rightSE.otherSE = leftSE;
    this.rings = rings;
    this.windings = windings;
  }
  static fromRing(pt1, pt2, ring) {
    let leftPt, rightPt, winding;
    const cmpPts = SweepEvent.comparePoints(pt1, pt2);
    if (cmpPts < 0) {
      leftPt = pt1;
      rightPt = pt2;
      winding = 1;
    } else if (cmpPts > 0) {
      leftPt = pt2;
      rightPt = pt1;
      winding = -1;
    } else
      throw new Error(
        `Tried to create degenerate segment at [${pt1.x}, ${pt1.y}]`,
      );
    const leftSE = new SweepEvent(leftPt, true);
    const rightSE = new SweepEvent(rightPt, false);
    return new _Segment(leftSE, rightSE, [ring], [winding]);
  }
  /* When a segment is split, the rightSE is replaced with a new sweep event */
  replaceRightSE(newRightSE) {
    this.rightSE = newRightSE;
    this.rightSE.segment = this;
    this.rightSE.otherSE = this.leftSE;
    this.leftSE.otherSE = this.rightSE;
  }
  bbox() {
    const y1 = this.leftSE.point.y;
    const y2 = this.rightSE.point.y;
    return {
      ll: { x: this.leftSE.point.x, y: y1.isLessThan(y2) ? y1 : y2 },
      ur: { x: this.rightSE.point.x, y: y1.isGreaterThan(y2) ? y1 : y2 },
    };
  }
  /* A vector from the left point to the right */
  vector() {
    return {
      x: this.rightSE.point.x.minus(this.leftSE.point.x),
      y: this.rightSE.point.y.minus(this.leftSE.point.y),
    };
  }
  isAnEndpoint(pt) {
    return (
      (pt.x.eq(this.leftSE.point.x) && pt.y.eq(this.leftSE.point.y)) ||
      (pt.x.eq(this.rightSE.point.x) && pt.y.eq(this.rightSE.point.y))
    );
  }
  /* Compare this segment with a point.
   *
   * A point P is considered to be colinear to a segment if there
   * exists a distance D such that if we travel along the segment
   * from one * endpoint towards the other a distance D, we find
   * ourselves at point P.
   *
   * Return value indicates:
   *
   *   1: point lies above the segment (to the left of vertical)
   *   0: point is colinear to segment
   *  -1: point lies below the segment (to the right of vertical)
   */
  comparePoint(point2) {
    return precision.orient(this.leftSE.point, point2, this.rightSE.point);
  }
  /**
   * Given another segment, returns the first non-trivial intersection
   * between the two segments (in terms of sweep line ordering), if it exists.
   *
   * A 'non-trivial' intersection is one that will cause one or both of the
   * segments to be split(). As such, 'trivial' vs. 'non-trivial' intersection:
   *
   *   * endpoint of segA with endpoint of segB --> trivial
   *   * endpoint of segA with point along segB --> non-trivial
   *   * endpoint of segB with point along segA --> non-trivial
   *   * point along segA with point along segB --> non-trivial
   *
   * If no non-trivial intersection exists, return null
   * Else, return null.
   */
  getIntersection(other) {
    const tBbox = this.bbox();
    const oBbox = other.bbox();
    const bboxOverlap = getBboxOverlap(tBbox, oBbox);
    if (bboxOverlap === null) return null;
    const tlp = this.leftSE.point;
    const trp = this.rightSE.point;
    const olp = other.leftSE.point;
    const orp = other.rightSE.point;
    const touchesOtherLSE =
      isInBbox(tBbox, olp) && this.comparePoint(olp) === 0;
    const touchesThisLSE =
      isInBbox(oBbox, tlp) && other.comparePoint(tlp) === 0;
    const touchesOtherRSE =
      isInBbox(tBbox, orp) && this.comparePoint(orp) === 0;
    const touchesThisRSE =
      isInBbox(oBbox, trp) && other.comparePoint(trp) === 0;
    if (touchesThisLSE && touchesOtherLSE) {
      if (touchesThisRSE && !touchesOtherRSE) return trp;
      if (!touchesThisRSE && touchesOtherRSE) return orp;
      return null;
    }
    if (touchesThisLSE) {
      if (touchesOtherRSE) {
        if (tlp.x.eq(orp.x) && tlp.y.eq(orp.y)) return null;
      }
      return tlp;
    }
    if (touchesOtherLSE) {
      if (touchesThisRSE) {
        if (trp.x.eq(olp.x) && trp.y.eq(olp.y)) return null;
      }
      return olp;
    }
    if (touchesThisRSE && touchesOtherRSE) return null;
    if (touchesThisRSE) return trp;
    if (touchesOtherRSE) return orp;
    const pt = intersection(tlp, this.vector(), olp, other.vector());
    if (pt === null) return null;
    if (!isInBbox(bboxOverlap, pt)) return null;
    return precision.snap(pt);
  }
  /**
   * Split the given segment into multiple segments on the given points.
   *  * Each existing segment will retain its leftSE and a new rightSE will be
   *    generated for it.
   *  * A new segment will be generated which will adopt the original segment's
   *    rightSE, and a new leftSE will be generated for it.
   *  * If there are more than two points given to split on, new segments
   *    in the middle will be generated with new leftSE and rightSE's.
   *  * An array of the newly generated SweepEvents will be returned.
   *
   * Warning: input array of points is modified
   */
  split(point2) {
    const newEvents = [];
    const alreadyLinked = point2.events !== void 0;
    const newLeftSE = new SweepEvent(point2, true);
    const newRightSE = new SweepEvent(point2, false);
    const oldRightSE = this.rightSE;
    this.replaceRightSE(newRightSE);
    newEvents.push(newRightSE);
    newEvents.push(newLeftSE);
    const newSeg = new _Segment(
      newLeftSE,
      oldRightSE,
      this.rings.slice(),
      this.windings.slice(),
    );
    if (
      SweepEvent.comparePoints(newSeg.leftSE.point, newSeg.rightSE.point) > 0
    ) {
      newSeg.swapEvents();
    }
    if (SweepEvent.comparePoints(this.leftSE.point, this.rightSE.point) > 0) {
      this.swapEvents();
    }
    if (alreadyLinked) {
      newLeftSE.checkForConsuming();
      newRightSE.checkForConsuming();
    }
    return newEvents;
  }
  /* Swap which event is left and right */
  swapEvents() {
    const tmpEvt = this.rightSE;
    this.rightSE = this.leftSE;
    this.leftSE = tmpEvt;
    this.leftSE.isLeft = true;
    this.rightSE.isLeft = false;
    for (let i = 0, iMax = this.windings.length; i < iMax; i++) {
      this.windings[i] *= -1;
    }
  }
  /* Consume another segment. We take their rings under our wing
   * and mark them as consumed. Use for perfectly overlapping segments */
  consume(other) {
    let consumer = this;
    let consumee = other;
    while (consumer.consumedBy) consumer = consumer.consumedBy;
    while (consumee.consumedBy) consumee = consumee.consumedBy;
    const cmp = _Segment.compare(consumer, consumee);
    if (cmp === 0) return;
    if (cmp > 0) {
      const tmp = consumer;
      consumer = consumee;
      consumee = tmp;
    }
    if (consumer.prev === consumee) {
      const tmp = consumer;
      consumer = consumee;
      consumee = tmp;
    }
    for (let i = 0, iMax = consumee.rings.length; i < iMax; i++) {
      const ring = consumee.rings[i];
      const winding = consumee.windings[i];
      const index = consumer.rings.indexOf(ring);
      if (index === -1) {
        consumer.rings.push(ring);
        consumer.windings.push(winding);
      } else consumer.windings[index] += winding;
    }
    consumee.rings = null;
    consumee.windings = null;
    consumee.consumedBy = consumer;
    consumee.leftSE.consumedBy = consumer.leftSE;
    consumee.rightSE.consumedBy = consumer.rightSE;
  }
  /* The first segment previous segment chain that is in the result */
  prevInResult() {
    if (this._prevInResult !== void 0) return this._prevInResult;
    if (!this.prev) this._prevInResult = null;
    else if (this.prev.isInResult()) this._prevInResult = this.prev;
    else this._prevInResult = this.prev.prevInResult();
    return this._prevInResult;
  }
  beforeState() {
    if (this._beforeState !== void 0) return this._beforeState;
    if (!this.prev)
      this._beforeState = {
        rings: [],
        windings: [],
        multiPolys: [],
      };
    else {
      const seg = this.prev.consumedBy || this.prev;
      this._beforeState = seg.afterState();
    }
    return this._beforeState;
  }
  afterState() {
    if (this._afterState !== void 0) return this._afterState;
    const beforeState = this.beforeState();
    this._afterState = {
      rings: beforeState.rings.slice(0),
      windings: beforeState.windings.slice(0),
      multiPolys: [],
    };
    const ringsAfter = this._afterState.rings;
    const windingsAfter = this._afterState.windings;
    const mpsAfter = this._afterState.multiPolys;
    for (let i = 0, iMax = this.rings.length; i < iMax; i++) {
      const ring = this.rings[i];
      const winding = this.windings[i];
      const index = ringsAfter.indexOf(ring);
      if (index === -1) {
        ringsAfter.push(ring);
        windingsAfter.push(winding);
      } else windingsAfter[index] += winding;
    }
    const polysAfter = [];
    const polysExclude = [];
    for (let i = 0, iMax = ringsAfter.length; i < iMax; i++) {
      if (windingsAfter[i] === 0) continue;
      const ring = ringsAfter[i];
      const poly = ring.poly;
      if (polysExclude.indexOf(poly) !== -1) continue;
      if (ring.isExterior) polysAfter.push(poly);
      else {
        if (polysExclude.indexOf(poly) === -1) polysExclude.push(poly);
        const index = polysAfter.indexOf(ring.poly);
        if (index !== -1) polysAfter.splice(index, 1);
      }
    }
    for (let i = 0, iMax = polysAfter.length; i < iMax; i++) {
      const mp = polysAfter[i].multiPoly;
      if (mpsAfter.indexOf(mp) === -1) mpsAfter.push(mp);
    }
    return this._afterState;
  }
  /* Is this segment part of the final result? */
  isInResult() {
    if (this.consumedBy) return false;
    if (this._isInResult !== void 0) return this._isInResult;
    const mpsBefore = this.beforeState().multiPolys;
    const mpsAfter = this.afterState().multiPolys;
    switch (operation_default.type) {
      case 'union': {
        const noBefores = mpsBefore.length === 0;
        const noAfters = mpsAfter.length === 0;
        this._isInResult = noBefores !== noAfters;
        break;
      }
      case 'intersection': {
        let least;
        let most;
        if (mpsBefore.length < mpsAfter.length) {
          least = mpsBefore.length;
          most = mpsAfter.length;
        } else {
          least = mpsAfter.length;
          most = mpsBefore.length;
        }
        this._isInResult =
          most === operation_default.numMultiPolys && least < most;
        break;
      }
      case 'xor': {
        const diff = Math.abs(mpsBefore.length - mpsAfter.length);
        this._isInResult = diff % 2 === 1;
        break;
      }
      case 'difference': {
        const isJustSubject = (mps) => mps.length === 1 && mps[0].isSubject;
        this._isInResult = isJustSubject(mpsBefore) !== isJustSubject(mpsAfter);
        break;
      }
    }
    return this._isInResult;
  }
};
var RingIn = class {
  poly;
  isExterior;
  segments;
  bbox;
  constructor(geomRing, poly, isExterior) {
    if (!Array.isArray(geomRing) || geomRing.length === 0) {
      throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
    }
    this.poly = poly;
    this.isExterior = isExterior;
    this.segments = [];
    if (
      typeof geomRing[0][0] !== 'number' ||
      typeof geomRing[0][1] !== 'number'
    ) {
      throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
    }
    const firstPoint = precision.snap({
      x: new BigNumber(geomRing[0][0]),
      y: new BigNumber(geomRing[0][1]),
    });
    this.bbox = {
      ll: { x: firstPoint.x, y: firstPoint.y },
      ur: { x: firstPoint.x, y: firstPoint.y },
    };
    let prevPoint = firstPoint;
    for (let i = 1, iMax = geomRing.length; i < iMax; i++) {
      if (
        typeof geomRing[i][0] !== 'number' ||
        typeof geomRing[i][1] !== 'number'
      ) {
        throw new Error(
          'Input geometry is not a valid Polygon or MultiPolygon',
        );
      }
      const point2 = precision.snap({
        x: new BigNumber(geomRing[i][0]),
        y: new BigNumber(geomRing[i][1]),
      });
      if (point2.x.eq(prevPoint.x) && point2.y.eq(prevPoint.y)) continue;
      this.segments.push(Segment2.fromRing(prevPoint, point2, this));
      if (point2.x.isLessThan(this.bbox.ll.x)) this.bbox.ll.x = point2.x;
      if (point2.y.isLessThan(this.bbox.ll.y)) this.bbox.ll.y = point2.y;
      if (point2.x.isGreaterThan(this.bbox.ur.x)) this.bbox.ur.x = point2.x;
      if (point2.y.isGreaterThan(this.bbox.ur.y)) this.bbox.ur.y = point2.y;
      prevPoint = point2;
    }
    if (!firstPoint.x.eq(prevPoint.x) || !firstPoint.y.eq(prevPoint.y)) {
      this.segments.push(Segment2.fromRing(prevPoint, firstPoint, this));
    }
  }
  getSweepEvents() {
    const sweepEvents = [];
    for (let i = 0, iMax = this.segments.length; i < iMax; i++) {
      const segment = this.segments[i];
      sweepEvents.push(segment.leftSE);
      sweepEvents.push(segment.rightSE);
    }
    return sweepEvents;
  }
};
var PolyIn = class {
  multiPoly;
  exteriorRing;
  interiorRings;
  bbox;
  constructor(geomPoly, multiPoly) {
    if (!Array.isArray(geomPoly)) {
      throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
    }
    this.exteriorRing = new RingIn(geomPoly[0], this, true);
    this.bbox = {
      ll: { x: this.exteriorRing.bbox.ll.x, y: this.exteriorRing.bbox.ll.y },
      ur: { x: this.exteriorRing.bbox.ur.x, y: this.exteriorRing.bbox.ur.y },
    };
    this.interiorRings = [];
    for (let i = 1, iMax = geomPoly.length; i < iMax; i++) {
      const ring = new RingIn(geomPoly[i], this, false);
      if (ring.bbox.ll.x.isLessThan(this.bbox.ll.x))
        this.bbox.ll.x = ring.bbox.ll.x;
      if (ring.bbox.ll.y.isLessThan(this.bbox.ll.y))
        this.bbox.ll.y = ring.bbox.ll.y;
      if (ring.bbox.ur.x.isGreaterThan(this.bbox.ur.x))
        this.bbox.ur.x = ring.bbox.ur.x;
      if (ring.bbox.ur.y.isGreaterThan(this.bbox.ur.y))
        this.bbox.ur.y = ring.bbox.ur.y;
      this.interiorRings.push(ring);
    }
    this.multiPoly = multiPoly;
  }
  getSweepEvents() {
    const sweepEvents = this.exteriorRing.getSweepEvents();
    for (let i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
      const ringSweepEvents = this.interiorRings[i].getSweepEvents();
      for (let j = 0, jMax = ringSweepEvents.length; j < jMax; j++) {
        sweepEvents.push(ringSweepEvents[j]);
      }
    }
    return sweepEvents;
  }
};
var MultiPolyIn = class {
  isSubject;
  polys;
  bbox;
  constructor(geom, isSubject) {
    if (!Array.isArray(geom)) {
      throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
    }
    try {
      if (typeof geom[0][0][0] === 'number') geom = [geom];
    } catch (ex) {}
    this.polys = [];
    this.bbox = {
      ll: {
        x: new BigNumber(Number.POSITIVE_INFINITY),
        y: new BigNumber(Number.POSITIVE_INFINITY),
      },
      ur: {
        x: new BigNumber(Number.NEGATIVE_INFINITY),
        y: new BigNumber(Number.NEGATIVE_INFINITY),
      },
    };
    for (let i = 0, iMax = geom.length; i < iMax; i++) {
      const poly = new PolyIn(geom[i], this);
      if (poly.bbox.ll.x.isLessThan(this.bbox.ll.x))
        this.bbox.ll.x = poly.bbox.ll.x;
      if (poly.bbox.ll.y.isLessThan(this.bbox.ll.y))
        this.bbox.ll.y = poly.bbox.ll.y;
      if (poly.bbox.ur.x.isGreaterThan(this.bbox.ur.x))
        this.bbox.ur.x = poly.bbox.ur.x;
      if (poly.bbox.ur.y.isGreaterThan(this.bbox.ur.y))
        this.bbox.ur.y = poly.bbox.ur.y;
      this.polys.push(poly);
    }
    this.isSubject = isSubject;
  }
  getSweepEvents() {
    const sweepEvents = [];
    for (let i = 0, iMax = this.polys.length; i < iMax; i++) {
      const polySweepEvents = this.polys[i].getSweepEvents();
      for (let j = 0, jMax = polySweepEvents.length; j < jMax; j++) {
        sweepEvents.push(polySweepEvents[j]);
      }
    }
    return sweepEvents;
  }
};
var intersection2 = (geom, ...moreGeoms) =>
  operation_default.run('intersection', geom, moreGeoms);
precision.set;
function explode(geojson) {
  const points = [];
  if (geojson.type === 'FeatureCollection') {
    featureEach(geojson, function (feature2) {
      coordEach(feature2, function (coord) {
        points.push(point(coord, feature2.properties));
      });
    });
  } else if (geojson.type === 'Feature') {
    coordEach(geojson, function (coord) {
      points.push(point(coord, geojson.properties));
    });
  } else {
    coordEach(geojson, function (coord) {
      points.push(point(coord));
    });
  }
  return featureCollection(points);
}
function intersect(features, options = {}) {
  const geoms = [];
  geomEach(features, (geom) => {
    geoms.push(geom.coordinates);
  });
  if (geoms.length < 2) {
    throw new Error('Must specify at least 2 geometries');
  }
  const intersection2$1 = intersection2(geoms[0], ...geoms.slice(1));
  if (intersection2$1.length === 0) return null;
  if (intersection2$1.length === 1)
    return polygon(intersection2$1[0], options.properties);
  return multiPolygon(intersection2$1, options.properties);
}
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
function nearestPoint(targetPoint, points, options = {}) {
  if (!targetPoint) throw new Error('targetPoint is required');
  if (!points) throw new Error('points is required');
  let minDist = Infinity;
  let bestFeatureIndex = 0;
  featureEach(points, (pt, featureIndex) => {
    const distanceToPoint = distance(targetPoint, pt, options);
    if (distanceToPoint < minDist) {
      bestFeatureIndex = featureIndex;
      minDist = distanceToPoint;
    }
  });
  const nearestPoint2 = clone$1(points.features[bestFeatureIndex]);
  return __spreadProps(__spreadValues({}, nearestPoint2), {
    properties: __spreadProps(__spreadValues({}, nearestPoint2.properties), {
      featureIndex: bestFeatureIndex,
      distanceToPoint: minDist,
    }),
  });
}
function pointOnFeature(geojson) {
  const fc = normalize(geojson);
  const cent = center(fc);
  let onSurface = false;
  let i = 0;
  while (!onSurface && i < fc.features.length) {
    const geom = fc.features[i].geometry;
    let x, y, x1, y1, x2, y2;
    let onLine = false;
    if (geom.type === 'Point') {
      if (
        cent.geometry.coordinates[0] === geom.coordinates[0] &&
        cent.geometry.coordinates[1] === geom.coordinates[1]
      ) {
        onSurface = true;
      }
    } else if (geom.type === 'MultiPoint') {
      let onMultiPoint = false;
      let k = 0;
      while (!onMultiPoint && k < geom.coordinates.length) {
        if (
          cent.geometry.coordinates[0] === geom.coordinates[k][0] &&
          cent.geometry.coordinates[1] === geom.coordinates[k][1]
        ) {
          onSurface = true;
          onMultiPoint = true;
        }
        k++;
      }
    } else if (geom.type === 'LineString') {
      let k = 0;
      while (!onLine && k < geom.coordinates.length - 1) {
        x = cent.geometry.coordinates[0];
        y = cent.geometry.coordinates[1];
        x1 = geom.coordinates[k][0];
        y1 = geom.coordinates[k][1];
        x2 = geom.coordinates[k + 1][0];
        y2 = geom.coordinates[k + 1][1];
        if (pointOnSegment(x, y, x1, y1, x2, y2)) {
          onLine = true;
          onSurface = true;
        }
        k++;
      }
    } else if (geom.type === 'MultiLineString') {
      let j = 0;
      while (j < geom.coordinates.length) {
        onLine = false;
        let k = 0;
        const line = geom.coordinates[j];
        while (!onLine && k < line.length - 1) {
          x = cent.geometry.coordinates[0];
          y = cent.geometry.coordinates[1];
          x1 = line[k][0];
          y1 = line[k][1];
          x2 = line[k + 1][0];
          y2 = line[k + 1][1];
          if (pointOnSegment(x, y, x1, y1, x2, y2)) {
            onLine = true;
            onSurface = true;
          }
          k++;
        }
        j++;
      }
    } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      if (booleanPointInPolygon(cent, geom)) {
        onSurface = true;
      }
    }
    i++;
  }
  if (onSurface) {
    return cent;
  } else {
    const vertices = featureCollection([]);
    for (let f = 0; f < fc.features.length; f++) {
      vertices.features = vertices.features.concat(
        explode(fc.features[f]).features,
      );
    }
    return point(nearestPoint(cent, vertices).geometry.coordinates);
  }
}
function normalize(geojson) {
  if (geojson.type !== 'FeatureCollection') {
    if (geojson.type !== 'Feature') {
      return featureCollection([feature(geojson)]);
    }
    return featureCollection([geojson]);
  }
  return geojson;
}
function pointOnSegment(x, y, x1, y1, x2, y2) {
  const ab = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  const ap = Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  const pb = Math.sqrt((x2 - x) * (x2 - x) + (y2 - y) * (y2 - y));
  return ab === ap + pb;
}
class TinyQueue3 {
  constructor(data = [], compare2 = (a, b) => (a < b ? -1 : a > b ? 1 : 0)) {
    this.data = data;
    this.length = this.data.length;
    this.compare = compare2;
    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
    }
  }
  push(item) {
    this.data.push(item);
    this._up(this.length++);
  }
  pop() {
    if (this.length === 0) return void 0;
    const top = this.data[0];
    const bottom = this.data.pop();
    if (--this.length > 0) {
      this.data[0] = bottom;
      this._down(0);
    }
    return top;
  }
  peek() {
    return this.data[0];
  }
  _up(pos) {
    const { data, compare: compare2 } = this;
    const item = data[pos];
    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      const current = data[parent];
      if (compare2(item, current) >= 0) break;
      data[pos] = current;
      pos = parent;
    }
    data[pos] = item;
  }
  _down(pos) {
    const { data, compare: compare2 } = this;
    const halfLength = this.length >> 1;
    const item = data[pos];
    while (pos < halfLength) {
      let bestChild = (pos << 1) + 1;
      const right = bestChild + 1;
      if (right < this.length && compare2(data[right], data[bestChild]) < 0) {
        bestChild = right;
      }
      if (compare2(data[bestChild], item) >= 0) break;
      data[pos] = data[bestChild];
      pos = bestChild;
    }
    data[pos] = item;
  }
}
function polylabel(polygon2, precision2 = 1, debug = false) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon2[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.max(precision2, Math.min(width, height));
  if (cellSize === precision2) {
    const result2 = [minX, minY];
    result2.distance = 0;
    return result2;
  }
  const cellQueue = new TinyQueue3([], (a, b) => b.max - a.max);
  let bestCell = getCentroidCell(polygon2);
  const bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon2);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;
  let numProbes = 2;
  function potentiallyQueue(x, y, h2) {
    const cell = new Cell(x, y, h2, polygon2);
    numProbes++;
    if (cell.max > bestCell.d + precision2) cellQueue.push(cell);
    if (cell.d > bestCell.d) {
      bestCell = cell;
      if (debug)
        console.log(
          `found best ${Math.round(1e4 * cell.d) / 1e4} after ${numProbes} probes`,
        );
    }
  }
  let h = cellSize / 2;
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      potentiallyQueue(x + h, y + h, h);
    }
  }
  while (cellQueue.length) {
    const { max, x, y, h: ch } = cellQueue.pop();
    if (max - bestCell.d <= precision2) break;
    h = ch / 2;
    potentiallyQueue(x - h, y - h, h);
    potentiallyQueue(x + h, y - h, h);
    potentiallyQueue(x - h, y + h, h);
    potentiallyQueue(x + h, y + h, h);
  }
  if (debug) {
    console.log(`num probes: ${numProbes}
best distance: ${bestCell.d}`);
  }
  const result = [bestCell.x, bestCell.y];
  result.distance = bestCell.d;
  return result;
}
function Cell(x, y, h, polygon2) {
  this.x = x;
  this.y = y;
  this.h = h;
  this.d = pointToPolygonDist(x, y, polygon2);
  this.max = this.d + this.h * Math.SQRT2;
}
function pointToPolygonDist(x, y, polygon2) {
  let inside = false;
  let minDistSq = Infinity;
  for (const ring of polygon2) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if (
        a[1] > y !== b[1] > y &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      )
        inside = !inside;
      minDistSq = Math.min(minDistSq, getSegDistSq(x, y, a, b));
    }
  }
  return minDistSq === 0 ? 0 : (inside ? 1 : -1) * Math.sqrt(minDistSq);
}
function getCentroidCell(polygon2) {
  let area2 = 0;
  let x = 0;
  let y = 0;
  const points = polygon2[0];
  for (let i = 0, len = points.length, j = len - 1; i < len; j = i++) {
    const a = points[i];
    const b = points[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area2 += f * 3;
  }
  const centroid2 = new Cell(x / area2, y / area2, 0, polygon2);
  if (area2 === 0 || centroid2.d < 0)
    return new Cell(points[0][0], points[0][1], 0, polygon2);
  return centroid2;
}
function getSegDistSq(px, py, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}
function isPolygonFeature(feature2) {
  return (
    feature2.geometry.type === 'Polygon' ||
    feature2.geometry.type === 'MultiPolygon'
  );
}
function isFullyWithinBBox(feature2, bboxPolygon$1) {
  if (feature2.geometry.type === 'Polygon') {
    return booleanWithin(feature2, bboxPolygon$1);
  }
  try {
    for (const coords of feature2.geometry.coordinates) {
      const poly = polygon(coords);
      if (!booleanWithin(poly, bboxPolygon$1)) {
        return false;
      }
    }
  } catch (err) {
    console.warn(
      'Error validating MultiPolygon within bbox for feature:',
      feature2.id,
      ' Error:',
      err,
    );
    return booleanContains(bboxPolygon$1, bboxPolygon(bbox$1(feature2)));
  }
  return true;
}
function isFeatureCollection(geoJson) {
  return geoJson.type === 'FeatureCollection';
}
function bboxToGeometryString(bbox2) {
  return `${bbox2.west},${bbox2.south},${bbox2.east},${bbox2.north}`;
}
function expandBBox(bbox2, paddingDegrees) {
  return {
    west: bbox2.west - paddingDegrees,
    south: bbox2.south - paddingDegrees,
    east: bbox2.east + paddingDegrees,
    north: bbox2.north + paddingDegrees,
  };
}
function resolveUnitTypeProperties(
  featureProperties,
  dataConfig,
  unmappedUnitTypeCodes,
) {
  const unitTypeProperty = dataConfig.unitTypeProperty;
  const unitTypeCodeMap = dataConfig.unitTypeCodeMap;
  if (!unitTypeProperty || !unitTypeCodeMap) return null;
  const rawCode = featureProperties[unitTypeProperty];
  if (rawCode == null) return null;
  const code = String(rawCode).trim().toUpperCase();
  if (!code) return null;
  const unitType = unitTypeCodeMap[code];
  if (!unitType) {
    if (!unmappedUnitTypeCodes.has(code)) {
      unmappedUnitTypeCodes.add(code);
      console.warn(
        `Unmapped ${unitTypeProperty} code "${code}" for dataset ${dataConfig.datasetId}`,
      );
    }
    return null;
  }
  return {
    UNIT_TYPE: unitType,
    UNIT_TYPE_CODE: code,
  };
}
function getLargestPolygon(feature2) {
  let maxArea = -Infinity;
  let largestPolygon = null;
  for (const coords of feature2.geometry.coordinates) {
    const poly = {
      type: 'Polygon',
      coordinates: coords,
    };
    const area$1 = area(poly);
    if (area$1 > maxArea) {
      maxArea = area$1;
      largestPolygon = poly;
    }
  }
  if (!largestPolygon) {
    throw new Error('MultiPolygon has no valid polygons');
  }
  return largestPolygon;
}
function getLabelCandidates(feature2) {
  const candidates = [];
  const coords =
    feature2.geometry.type === 'Polygon'
      ? feature2.geometry.coordinates
      : getLargestPolygon(feature2).coordinates;
  if (!coords || coords.length === 0) {
    throw new Error('Feature has no valid coordinates');
  }
  try {
    candidates.push({
      method: 'polylabel',
      point: point(polylabel(coords, 1e-6)),
    });
  } catch (err) {
    console.warn('	Failed to compute polylabel for feature:', feature2.id, err);
  }
  try {
    candidates.push({
      method: 'pointOnFeature',
      point: pointOnFeature(feature2),
    });
  } catch (err) {
    console.warn(
      '	Failed to compute pointOnFeature for feature:',
      feature2.id,
      err,
    );
  }
  try {
    candidates.push({
      method: 'centerOfMass',
      point: centerOfMass(feature2),
    });
  } catch (err) {
    console.warn(
      '	Failed to compute centerOfMass for feature:',
      feature2.id,
      err,
    );
  }
  try {
    candidates.push({
      method: 'centroid',
      point: centroid(feature2),
    });
  } catch (err) {
    console.warn('	Failed to compute centroid for feature:', feature2.id, err);
  }
  if (candidates.length === 0) {
    throw new Error(
      'Unable to determine label point for feature: ' + feature2.id,
    );
  }
  return candidates.map(({ method, point: point2 }) => ({
    method,
    lat: point2.geometry.coordinates[1],
    lng: point2.geometry.coordinates[0],
    withinPolygon: booleanPointInPolygon(point2, feature2),
  }));
}
function filterAndClipRegionsToBoundary(shapeJSON, bbox2, dataConfig) {
  const bboxPolygon$1 = bboxPolygon([
    bbox2.west,
    bbox2.south,
    bbox2.east,
    bbox2.north,
  ]);
  const results = new Array();
  const unmappedUnitTypeCodes = /* @__PURE__ */ new Set();
  for (const feature2 of shapeJSON.features) {
    if (!isPolygonFeature(feature2)) {
      continue;
    }
    if (!booleanIntersects(bboxPolygon$1, feature2)) {
      continue;
    }
    const intersection3 = intersect(
      featureCollection([feature2, bboxPolygon$1]),
    );
    const cleanedIntersection = cleanCoords(intersection3);
    if (
      !cleanedIntersection ||
      cleanedIntersection.geometry.coordinates.length === 0
    ) {
      console.warn('No valid intersection geometry for feature:', feature2.id);
      continue;
    }
    const fullyWithinBoundary = isFullyWithinBBox(feature2, bboxPolygon$1);
    const clippedRegion = fullyWithinBoundary ? feature2 : cleanedIntersection;
    const labelCandidates = getLabelCandidates(
      fullyWithinBoundary ? feature2 : clippedRegion,
    );
    const featureProperties = feature2.properties;
    const primaryLabel =
      labelCandidates.find((c) => c.withinPolygon) || labelCandidates[0];
    let regionProperties = {
      ID: featureProperties[dataConfig.idProperty],
      NAME: featureProperties[dataConfig.nameProperty],
      DISPLAY_NAME: dataConfig.applicableNameProperties
        ?.map((key) => featureProperties[key])
        .find((v) => typeof v === 'string' && v.trim().length > 0),
      LAT: primaryLabel.lat,
      LNG: primaryLabel.lng,
      LABEL_POINTS: {
        primary: { lat: primaryLabel.lat, lng: primaryLabel.lng },
        candidates: labelCandidates,
      },
      WITHIN_BBOX: fullyWithinBoundary,
      AREA_WITHIN_BBOX: area(clippedRegion) / 1e6,
      TOTAL_AREA: area(feature2) / 1e6,
    };
    if (
      dataConfig.populationProperty &&
      featureProperties[dataConfig.populationProperty]
    ) {
      const populationValue = featureProperties[dataConfig.populationProperty];
      regionProperties = {
        ...regionProperties,
        POPULATION: parseNumber(populationValue),
      };
    }
    const unitTypeProperties = resolveUnitTypeProperties(
      featureProperties,
      dataConfig,
      unmappedUnitTypeCodes,
    );
    if (unitTypeProperties) {
      regionProperties = {
        ...regionProperties,
        ...unitTypeProperties,
      };
    }
    clippedRegion.properties = regionProperties;
    clippedRegion.id = feature2.id;
    results.push(clippedRegion);
  }
  return results;
}
function resolveFeatureId(feature2) {
  if (feature2.id !== void 0 && feature2.id !== null) {
    return feature2.id;
  }
  return 'N/A';
}
function getPolygonCoordinateCount(geometry) {
  switch (geometry.type) {
    case 'Polygon':
      return geometry.coordinates.reduce(
        (count, ring) => count + ring.length,
        0,
      );
    case 'MultiPolygon':
      return geometry.coordinates.reduce(
        (count, polygon2) =>
          count +
          polygon2.reduce((ringCount, ring) => ringCount + ring.length, 0),
        0,
      );
    default:
      return 0;
  }
}
function renderFeaturePreview(features, previewCount) {
  const cappedPreviewCount = Math.max(0, previewCount);
  const previewFeatures = features.slice(0, cappedPreviewCount);
  console.log(`Total queried features: ${features.length}`);
  console.log(`Previewing first ${previewFeatures.length} feature(s):`);
  previewFeatures.forEach((feature2, index) => {
    const featureId2 = resolveFeatureId(feature2);
    const geometryType = feature2.geometry?.type;
    if (!geometryType) {
      console.warn(
        `[preview] Feature ${resolveFeatureId(
          feature2,
        )} is missing geometry. Skipping geometry details.`,
      );
      return;
    }
    if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
      console.warn(
        `[preview] Unsupported geometry type for feature ${featureId2}: ${geometryType}. Expected Polygon or MultiPolygon.`,
      );
      return;
    }
    const geometrySize = getPolygonCoordinateCount(feature2.geometry);
    console.log(`[${index + 1}]`, {
      id: featureId2,
      properties: feature2.properties ?? {},
      geometryType,
      geometrySize,
    });
  });
}
var edgeIntersectsEdge = function edgeIntersectsEdge2(a1, a2, b1, b2) {
  var uaT =
    (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]);
  var ubT =
    (a2[0] - a1[0]) * (a1[1] - b1[1]) - (a2[1] - a1[1]) * (a1[0] - b1[0]);
  var uB =
    (b2[1] - b1[1]) * (a2[0] - a1[0]) - (b2[0] - b1[0]) * (a2[1] - a1[1]);
  if (uB !== 0) {
    var ua = uaT / uB;
    var ub = ubT / uB;
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return true;
    }
  }
  return false;
};
var coordinatesContainPoint = function coordinatesContainPoint2(
  coordinates,
  point2,
) {
  var contains2 = false;
  for (var i = -1, l = coordinates.length, j = l - 1; ++i < l; j = i) {
    if (
      ((coordinates[i][1] <= point2[1] && point2[1] < coordinates[j][1]) ||
        (coordinates[j][1] <= point2[1] && point2[1] < coordinates[i][1])) &&
      point2[0] <
        ((coordinates[j][0] - coordinates[i][0]) *
          (point2[1] - coordinates[i][1])) /
          (coordinates[j][1] - coordinates[i][1]) +
          coordinates[i][0]
    ) {
      contains2 = !contains2;
    }
  }
  return contains2;
};
var pointsEqual = function pointsEqual2(a, b) {
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};
var arrayIntersectsArray = function arrayIntersectsArray2(a, b) {
  for (var i = 0; i < a.length - 1; i++) {
    for (var j = 0; j < b.length - 1; j++) {
      if (edgeIntersectsEdge(a[i], a[i + 1], b[j], b[j + 1])) {
        return true;
      }
    }
  }
  return false;
};
var closeRing = function closeRing2(coordinates) {
  if (!pointsEqual(coordinates[0], coordinates[coordinates.length - 1])) {
    coordinates.push(coordinates[0]);
  }
  return coordinates;
};
var ringIsClockwise = function ringIsClockwise2(ringToTest) {
  var total = 0;
  var i = 0;
  var rLength = ringToTest.length;
  var pt1 = ringToTest[i];
  var pt2;
  for (i; i < rLength - 1; i++) {
    pt2 = ringToTest[i + 1];
    total += (pt2[0] - pt1[0]) * (pt2[1] + pt1[1]);
    pt1 = pt2;
  }
  return total >= 0;
};
var shallowClone = function shallowClone2(obj) {
  var target = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      target[i] = obj[i];
    }
  }
  return target;
};
var coordinatesContainCoordinates = function coordinatesContainCoordinates2(
  outer,
  inner,
) {
  var intersects2 = arrayIntersectsArray(outer, inner);
  var contains2 = coordinatesContainPoint(outer, inner[0]);
  if (!intersects2 && contains2) {
    return true;
  }
  return false;
};
var convertRingsToGeoJSON = function convertRingsToGeoJSON2(rings) {
  var outerRings = [];
  var holes = [];
  var x;
  var outerRing;
  var hole;
  for (var r = 0; r < rings.length; r++) {
    var ring = closeRing(rings[r].slice(0));
    if (ring.length < 4) {
      continue;
    }
    if (ringIsClockwise(ring)) {
      var polygon2 = [ring.slice().reverse()];
      outerRings.push(polygon2);
    } else {
      holes.push(ring.slice().reverse());
    }
  }
  var uncontainedHoles = [];
  while (holes.length) {
    hole = holes.pop();
    var contained = false;
    for (x = outerRings.length - 1; x >= 0; x--) {
      outerRing = outerRings[x][0];
      if (coordinatesContainCoordinates(outerRing, hole)) {
        outerRings[x].push(hole);
        contained = true;
        break;
      }
    }
    if (!contained) {
      uncontainedHoles.push(hole);
    }
  }
  while (uncontainedHoles.length) {
    hole = uncontainedHoles.pop();
    var intersects2 = false;
    for (x = outerRings.length - 1; x >= 0; x--) {
      outerRing = outerRings[x][0];
      if (arrayIntersectsArray(outerRing, hole)) {
        outerRings[x].push(hole);
        intersects2 = true;
        break;
      }
    }
    if (!intersects2) {
      outerRings.push([hole.reverse()]);
    }
  }
  if (outerRings.length === 1) {
    return {
      type: 'Polygon',
      coordinates: outerRings[0],
    };
  } else {
    return {
      type: 'MultiPolygon',
      coordinates: outerRings,
    };
  }
};
var getId = function getId2(attributes, idAttribute) {
  var keys = ['OBJECTID', 'FID'];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (
      key in attributes &&
      (typeof attributes[key] === 'string' ||
        typeof attributes[key] === 'number')
    ) {
      return attributes[key];
    }
  }
  throw Error('No valid id attribute found');
};
var arcgisToGeoJSON = function arcgisToGeoJSON2(arcgis, idAttribute) {
  var geojson = {};
  if (arcgis.features) {
    geojson.type = 'FeatureCollection';
    geojson.features = [];
    for (var i = 0; i < arcgis.features.length; i++) {
      geojson.features.push(arcgisToGeoJSON2(arcgis.features[i], idAttribute));
    }
  }
  if (typeof arcgis.x === 'number' && typeof arcgis.y === 'number') {
    geojson.type = 'Point';
    geojson.coordinates = [arcgis.x, arcgis.y];
    if (typeof arcgis.z === 'number') {
      geojson.coordinates.push(arcgis.z);
    }
  }
  if (arcgis.points) {
    geojson.type = 'MultiPoint';
    geojson.coordinates = arcgis.points.slice(0);
  }
  if (arcgis.paths) {
    if (arcgis.paths.length === 1) {
      geojson.type = 'LineString';
      geojson.coordinates = arcgis.paths[0].slice(0);
    } else {
      geojson.type = 'MultiLineString';
      geojson.coordinates = arcgis.paths.slice(0);
    }
  }
  if (arcgis.rings) {
    geojson = convertRingsToGeoJSON(arcgis.rings.slice(0));
  }
  if (
    typeof arcgis.xmin === 'number' &&
    typeof arcgis.ymin === 'number' &&
    typeof arcgis.xmax === 'number' &&
    typeof arcgis.ymax === 'number'
  ) {
    geojson.type = 'Polygon';
    geojson.coordinates = [
      [
        [arcgis.xmax, arcgis.ymax],
        [arcgis.xmin, arcgis.ymax],
        [arcgis.xmin, arcgis.ymin],
        [arcgis.xmax, arcgis.ymin],
        [arcgis.xmax, arcgis.ymax],
      ],
    ];
  }
  if (arcgis.geometry || arcgis.attributes) {
    geojson.type = 'Feature';
    geojson.geometry = arcgis.geometry
      ? arcgisToGeoJSON2(arcgis.geometry)
      : null;
    geojson.properties = arcgis.attributes
      ? shallowClone(arcgis.attributes)
      : null;
    if (arcgis.attributes) {
      try {
        geojson.id = getId(arcgis.attributes, idAttribute);
      } catch (err) {}
    }
  }
  if (JSON.stringify(geojson.geometry) === JSON.stringify({})) {
    geojson.geometry = null;
  }
  if (
    arcgis.spatialReference &&
    arcgis.spatialReference.wkid &&
    arcgis.spatialReference.wkid !== 4326
  ) {
    console.warn(
      'Object converted in non-standard crs - ' +
        JSON.stringify(arcgis.spatialReference),
    );
  }
  return geojson;
};
const DEFAULT_TIMEOUT_MS = 3e4;
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_RETRY_DELAY_MS = 500;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isTransientStatus(status) {
  return status === 429 || status >= 500;
}
function isAbortError(error) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}
function shouldRetryForError(error) {
  return isAbortError(error) || error instanceof TypeError;
}
function formatAttempt(attempt, maxRetries) {
  return `${attempt + 1}/${maxRetries + 1}`;
}
function isJsonContentType(contentType) {
  if (!contentType) {
    return false;
  }
  const normalizedContentType = contentType.toLowerCase();
  return (
    normalizedContentType.includes('application/json') ||
    normalizedContentType.includes('+json')
  );
}
async function fetchJsonWithRetry(url, init = {}, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const label = options.label ?? 'HTTP';
  const method = (init.method ?? 'GET').toUpperCase();
  const requestUrl = typeof url === 'string' ? url : url.toString();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const attemptText = formatAttempt(attempt, maxRetries);
        const errorMessage = `[${label}] ${method} ${requestUrl} failed with status ${response.status} ${response.statusText} (attempt ${attemptText})`;
        if (attempt < maxRetries && isTransientStatus(response.status)) {
          const retryCount = attempt + 1;
          console.warn(
            `[${label}] retry ${retryCount}/${maxRetries} for ${method} ${requestUrl} after status ${response.status}`,
          );
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }
        throw new Error(errorMessage);
      }
      const responseContentType = response.headers.get('content-type');
      if (!isJsonContentType(responseContentType)) {
        const responseText = await response.text();
        const responseSnippet = responseText.slice(0, 180).replace(/\s+/g, ' ');
        const attemptText = formatAttempt(attempt, maxRetries);
        throw new Error(
          `[${label}] ${method} ${requestUrl} returned non-JSON response (${responseContentType ?? 'unknown content-type'}) on attempt ${attemptText}. Body starts with: ${responseSnippet}`,
        );
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempt < maxRetries && shouldRetryForError(error)) {
        const retryCount = attempt + 1;
        console.warn(
          `[${label}] retry ${retryCount}/${maxRetries} for ${method} ${requestUrl} after ${isAbortError(error) ? 'timeout/abort' : 'network error'}`,
        );
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }
      const attemptText = formatAttempt(attempt, maxRetries);
      if (error instanceof Error) {
        throw new Error(
          `[${label}] ${method} ${requestUrl} failed on attempt ${attemptText}: ${error.message}`,
        );
      }
      throw new Error(
        `[${label}] ${method} ${requestUrl} failed on attempt ${attemptText}: ${String(error)}`,
      );
    }
  }
  throw new Error(
    `[${label}] ${method} ${requestUrl} failed after ${maxRetries + 1} attempts`,
  );
}
const TIGERWEB_API_BASE_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const ACS_API_URL = 'https://api.census.gov/data/2022/acs/acs5';
const ONS_API_BASE_URL =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const CA_STATCAN_BASE_URL =
  'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/';
const STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS = /* @__PURE__ */ new Set([
  '09',
  '23',
  '25',
  '33',
  '44',
  '50',
  // New England
  '34',
  '42',
  // NJ, PA
  '17',
  '18',
  '19',
  '20',
  '26',
  '27',
  '29',
  '31',
  '38',
  '39',
  '46',
  '55',
  // Midwest
]);
function isObject(value) {
  return typeof value === 'object' && value !== null;
}
function isStringMatrix(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) && row.every((column) => typeof column === 'string'),
    )
  );
}
function isArcGISErrorResponse(value) {
  return isObject(value) && isObject(value.error);
}
function isArcGISFeatureResponse(value) {
  if (!isObject(value) || !Array.isArray(value.features)) {
    return false;
  }
  if (value.features.length === 0) {
    return true;
  }
  const firstFeature = value.features[0];
  return isObject(firstFeature) && isObject(firstFeature.attributes);
}
function isRawFeatureCollection(value) {
  return (
    isObject(value) &&
    value.type === 'FeatureCollection' &&
    Array.isArray(value.features)
  );
}
function parseACSRows(rows, endpoint) {
  if (!isStringMatrix(rows) || rows.length < 1) {
    throw new Error(`[ACS] Unexpected response shape for ${endpoint}`);
  }
  return rows;
}
function isOverpassApiResponse(value) {
  return isObject(value) && Array.isArray(value.elements);
}
function isValidCountySubdivision(name, cousubfp) {
  if (cousubfp === '00000') return false;
  if (name && name.toLowerCase() === 'county subdivisions not defined') {
    return false;
  }
  return true;
}
function buildCountyUrl(queryBBox) {
  return {
    url: `${TIGERWEB_API_BASE_URL}/State_County/MapServer/1/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326',
      outFields: 'GEOID,NAME,LSADC',
      returnGeometry: 'true',
      f: 'json',
    }),
  };
}
function buildCountySubdivisionUrl(queryBBox) {
  return {
    url: `${TIGERWEB_API_BASE_URL}/Places_CouSub_ConCity_SubMCD/MapServer/1/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json',
    }),
  };
}
function buildPlacesQuery(queryBBox, layerId) {
  return {
    url: `${TIGERWEB_API_BASE_URL}/Places_CouSub_ConCity_SubMCD/MapServer/${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json',
    }),
  };
}
function buildZctaUrl(queryBBox) {
  return {
    url: `${TIGERWEB_API_BASE_URL}/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: `${queryBBox.west},${queryBBox.south},${queryBBox.east},${queryBBox.north}`,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json',
    }),
  };
}
async function fetchCouSubFeatures(bbox2) {
  const couSubGeoJson = await fetchGeoJSONFromArcGIS(
    buildCountySubdivisionUrl(bbox2),
  );
  return couSubGeoJson.features.filter(
    (f) =>
      isValidCountySubdivision(f.properties.NAME, f.properties.COUSUBFP) &&
      STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS.has(f.properties.STATE),
  );
}
async function fetchPlaceFeatures(bbox2) {
  let cdpGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox2, 5));
  let citiesGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox2, 4));
  let consolidatedCitiesGeoJson = await fetchGeoJSONFromArcGIS(
    buildPlacesQuery(bbox2, 3),
  );
  let concatenatedFeatures = [
    ...cdpGeoJson.features,
    ...citiesGeoJson.features,
    ...consolidatedCitiesGeoJson.features,
  ];
  return concatenatedFeatures.filter((f) => {
    return !STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS.has(f.properties.STATE);
  });
}
function normalizeArcGISResponse(data) {
  if (isRawFeatureCollection(data)) {
    return data;
  }
  if (isArcGISFeatureResponse(data)) {
    return arcgisToGeoJSON(data);
  }
  throw new Error('[ArcGIS] Unknown ArcGIS response format');
}
async function fetchGeoJSONFromArcGIS(request) {
  const arcgisJson = await fetchJsonWithRetry(
    request.url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: request.params.toString(),
    },
    { label: 'ArcGIS' },
  );
  if (isArcGISErrorResponse(arcgisJson)) {
    const errorMessage = arcgisJson.error?.message ?? 'Unknown ArcGIS error';
    throw new Error(
      `[ArcGIS] query failed for ${request.url}: ${errorMessage}`,
    );
  }
  const geoJson = normalizeArcGISResponse(arcgisJson);
  if (!isFeatureCollection(geoJson)) {
    throw new Error(`[ArcGIS] Expected FeatureCollection, got ${geoJson.type}`);
  }
  console.log(`Fetched ${geoJson.features.length} features from ArcGIS.`);
  return geoJson;
}
async function fetchCountyPopulations(states) {
  const populationMap = /* @__PURE__ */ new Map();
  for (const state of states) {
    const statePopMap = await fetchCountyPopulationsByState(state);
    statePopMap.forEach((v, k) => populationMap.set(k, v));
  }
  return populationMap;
}
async function fetchCountyPopulationsByState(state) {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county:*',
    in: `state:${state}`,
  }).toString();
  const rows = parseACSRows(
    await fetchJsonWithRetry(url, void 0, { label: 'ACS' }),
    url.toString(),
  );
  const [, ...data] = rows;
  const map2 = /* @__PURE__ */ new Map();
  for (const [population, state2, county] of data) {
    const geoid = `${state2}${county}`;
    map2.set(geoid, population);
  }
  return map2;
}
async function fetchCountySubdivisionPopulations(state) {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county subdivision:*',
    in: `state:${state}`,
  }).toString();
  const rows = parseACSRows(
    await fetchJsonWithRetry(url, void 0, { label: 'ACS' }),
    url.toString(),
  );
  const [, ...data] = rows;
  const map2 = /* @__PURE__ */ new Map();
  for (const [population, stateFP, countyFP, cousub] of data) {
    const geoid = `${stateFP}${countyFP}${cousub}`;
    map2.set(geoid, population);
  }
  return map2;
}
async function fetchPlacePopulations(state) {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'place:*',
    in: `state:${state}`,
  }).toString();
  const rows = parseACSRows(
    await fetchJsonWithRetry(url, void 0, { label: 'ACS' }),
    url.toString(),
  );
  const [, ...data] = rows;
  const map2 = /* @__PURE__ */ new Map();
  for (const [population, stateFP, placeFP] of data) {
    const geoid = `${stateFP}${placeFP}`;
    map2.set(geoid, population);
  }
  return map2;
}
async function fetchZctaPopulations() {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'zip code tabulation area:*',
  }).toString();
  const rows = parseACSRows(
    await fetchJsonWithRetry(url, void 0, { label: 'ACS' }),
    url.toString(),
  );
  const [, ...data] = rows;
  const map2 = /* @__PURE__ */ new Map();
  for (const [population, zcta] of data) {
    map2.set(zcta, population);
  }
  return map2;
}
function extractStateCodesFromGeoIDs(features) {
  const states = /* @__PURE__ */ new Set();
  for (const feature2 of features) {
    const geoid = feature2.properties.GEOID;
    if (typeof geoid === 'string' && geoid.length >= 2) {
      states.add(geoid.slice(0, 2));
    }
  }
  return states;
}
function buildOverpassQuery(bbox2, adminLevels, countryCode) {
  const normalizedAdminLevels = Array.from(new Set(adminLevels)).sort(
    (a, b) => a - b,
  );
  const adminLevelRegex = `^(${normalizedAdminLevels.join('|')})$`;
  const areaSelector = `area["ISO3166-1"="${countryCode}"]["boundary"="administrative"]["admin_level"="2"]->.searchCountry;`;
  const relationSelector = `relation["boundary"="administrative"]["admin_level"~"${adminLevelRegex}"](area.searchCountry)(${bbox2.south},${bbox2.west},${bbox2.north},${bbox2.east});`;
  return `
        [out:json][timeout:60];
        ${areaSelector}
        (
          ${relationSelector}
        );
        out geom;
      `;
}
async function fetchOverpassData(query) {
  console.log('Querying Overpass API...');
  const response = await fetchJsonWithRetry(
    OVERPASS_API_URL,
    {
      method: 'POST',
      body: query,
    },
    { label: 'Overpass' },
  );
  if (!isOverpassApiResponse(response)) {
    throw new Error('[Overpass] Unexpected response shape');
  }
  return response;
}
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
function buildONSArcGISQuery(baseServiceUrl, layerId, queryBBox) {
  return {
    url: `${baseServiceUrl}/${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'geojson',
    }),
  };
}
function buildCAStatCanArcGISQuery(queryBBox, layerId, outFields = '*') {
  return {
    url: `${CA_STATCAN_BASE_URL}${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields,
      returnGeometry: 'true',
      f: 'geojson',
    }),
  };
}
function getDistrictONSQuery(queryBBox) {
  return buildONSArcGISQuery(
    `${ONS_API_BASE_URL}/LAD_MAY_2025_UK_BFC_V2/FeatureServer`,
    0,
    queryBBox,
  );
}
function getBUAONSQuery(queryBBox) {
  return buildONSArcGISQuery(
    `${ONS_API_BASE_URL}/BUA_2022_GB/FeatureServer`,
    0,
    queryBBox,
  );
}
function getWardONSQuery(queryBBox) {
  return buildONSArcGISQuery(
    `${ONS_API_BASE_URL}/WD_MAY_2025_UK_BFC_V2/FeatureServer`,
    0,
    queryBBox,
  );
}
function processAndSaveBoundaries(
  geoJson,
  populationMap,
  bbox2,
  args,
  dataConfig,
  countryCode,
) {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    console.warn(
      `No features returned from source data for ${countryCode} ${dataConfig.displayName} within specified boundary box.`,
    );
    return;
  }
  console.log(
    `Fetched ${geoJson.features.length} total features from source data for ${countryCode} ${dataConfig.displayName}.`,
  );
  const filteredRegions = filterAndClipRegionsToBoundary(
    geoJson,
    bbox2,
    dataConfig,
  );
  console.log(
    `Filtered to ${filteredRegions.length} features within boundary box for ${countryCode} ${dataConfig.displayName}.`,
  );
  if (populationMap) {
    attachRegionPopulationData(filteredRegions, populationMap, 'ID');
  }
  if (!filteredRegions || filteredRegions.length === 0) {
    console.warn(
      `No features found for ${countryCode} ${dataConfig.displayName} within specified boundary box.`,
    );
    return;
  }
  console.log(
    `Filtered to ${filteredRegions.length} features within boundary box.`,
  );
  saveBoundaries(args, filteredRegions, dataConfig);
}
function saveBoundaries(args, filteredRegions, dataConfig) {
  const shouldCompress = args.compress ?? true;
  const outputRoot = path.resolve(args.outputRoot ?? 'data');
  const outputFilePath = path.resolve(
    outputRoot,
    args.cityCode,
    `${args.dataType}.geojson${shouldCompress ? '.gz' : ''}`,
  );
  const outputFeatureCollection = {
    type: 'FeatureCollection',
    features: filteredRegions,
  };
  saveGeoJSON(outputFilePath, outputFeatureCollection, {
    compress: shouldCompress,
  });
  const indexEntry = {
    datasetId: dataConfig.datasetId,
    displayName: dataConfig.displayName,
    unitSingular: dataConfig.unitSingular,
    unitPlural: dataConfig.unitPlural,
    source: dataConfig.source,
    size: filteredRegions.length,
  };
  updateIndexJson(
    path.resolve(outputRoot, DATA_INDEX_FILE),
    args.cityCode,
    indexEntry,
    args.countryCode,
  );
}
function attachRegionPopulationData(features, populationIndex, idProperty) {
  for (const feature2 of features) {
    if (feature2.properties.POPULATION != null) {
      continue;
    }
    const featureCode = feature2.properties[idProperty];
    const featurePopulation = populationIndex.has(featureCode)
      ? parseNumber(populationIndex.get(featureCode))
      : null;
    if (featurePopulation !== null) {
      feature2.properties = {
        ...feature2.properties,
        POPULATION: featurePopulation,
      };
    } else {
      console.warn(
        '  No population data found for feature:',
        feature2.properties.NAME,
        ' ID: ',
        featureCode,
      );
    }
  }
}
const CA_LAYER_IDS = {
  csds: 9,
  feds: 3,
  fsas: 14,
};
const CA_PED_BOUNDARIES = path.resolve(
  SOURCE_DATA_DIR,
  'ca_ped_boundaries.geojson.gz',
);
const PREVIEW_OUT_FIELDS = '*';
const CA_DATA_CONFIGS = {
  feds: {
    datasetId: 'feds',
    displayName: 'Federal Electoral Districts',
    unitSingular: 'Federal Electoral District',
    unitPlural: 'Federal Electoral Districts',
    source: 'CA Statistics Canada',
    idProperty: 'FEDUID',
    nameProperty: 'FEDENAME',
    applicableNameProperties: ['FEDENAME', 'FEDNAME', 'FEDFNAME'],
  },
  peds: {
    datasetId: 'peds',
    displayName: 'Provincial Electoral Districts',
    unitSingular: 'Provincial Electoral District',
    unitPlural: 'Provincial Electoral Districts',
    source: 'CA Provincial Electoral Districts',
    idProperty: 'ID',
    nameProperty: 'DISPLAY_NAME',
    applicableNameProperties: ['DISPLAY_NAME', 'NAME'],
  },
  csds: {
    datasetId: 'csds',
    displayName: 'Census Subdivisions',
    unitSingular: 'Census Subdivision',
    unitPlural: 'Census Subdivisions',
    source: 'CA Statistics Canada',
    idProperty: 'CSDUID',
    nameProperty: 'CSDNAME',
    applicableNameProperties: ['CSDNAME'],
  },
  fsas: {
    datasetId: 'fsas',
    displayName: 'Forward Sortation Areas',
    unitSingular: 'Forward Sortation Area',
    unitPlural: 'Forward Sortation Areas',
    source: 'CA Statistics Canada',
    idProperty: 'CFSAUID',
    nameProperty: 'CFSAUID',
    applicableNameProperties: ['CFSAUID', 'PRNAME'],
  },
};
const CA_BOUNDARY_DATA_HANDLERS = {
  feds: {
    dataConfig: CA_DATA_CONFIGS['feds'],
    layerId: CA_LAYER_IDS.feds,
    outFields: 'FEDUID,FEDNAME,FEDENAME,FEDFNAME,PRUID',
  },
  peds: {
    dataConfig: CA_DATA_CONFIGS['peds'],
    localFilePath: CA_PED_BOUNDARIES,
  },
  csds: {
    dataConfig: CA_DATA_CONFIGS['csds'],
    layerId: CA_LAYER_IDS.csds,
    outFields: 'CSDUID,CSDNAME,CSDTYPE,PRUID',
  },
  fsas: {
    dataConfig: CA_DATA_CONFIGS['fsas'],
    layerId: CA_LAYER_IDS.fsas,
    outFields: 'CFSAUID,PRUID,PRNAME',
  },
};
async function extractCABoundariesByLayer(bbox2, layerId, outFields) {
  const query = buildCAStatCanArcGISQuery(bbox2, layerId, outFields);
  const geoJson = await fetchGeoJSONFromArcGIS(query);
  return { geoJson };
}
async function extractCABoundaries(args, bbox2) {
  const handler = CA_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for CA: ${args.dataType}`);
  }
  const geoJson = handler.localFilePath
    ? loadGeoJSON(handler.localFilePath)
    : (
        await extractCABoundariesByLayer(
          expandBBox(bbox2, 0.01),
          handler.layerId,
          args.preview ? PREVIEW_OUT_FIELDS : handler.outFields,
        )
      ).geoJson;
  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount);
    return;
  }
  processAndSaveBoundaries(
    geoJson,
    void 0,
    bbox2,
    args,
    handler.dataConfig,
    'CA',
  );
}
const GB_DISTRICT_BOUNDARIES = 'gb_district_boundaries.geojson.gz';
const GB_DISTRICT_POPULATIONS = 'gb_district_populations.csv';
const DISTRICT_CODE_PROPERTY = 'LAD25CD';
const DISTRICT_NAME_PROPERTY = 'LAD25NM';
const DISTRICT_WELSH_NAME_PROPERTY = 'LAD25NMW';
const GB_BUA_BOUNDARIES = 'gb_bua_boundaries.geojson.gz';
const GB_BUA_POPULATIONS = 'gb_bua_populations.csv';
const BUA_CODE_PROPERTY = 'BUA22CD';
const BUA_NAME_PROPERTY = 'BUA22NM';
const BUA_WELSH_NAME_PROPERTY = 'BUA22NMW';
const BUA_GAELIC_NAME_PROPERTY = 'BUA22NMG';
const GB_WARD_BOUNDARIES = 'gb_ward_boundaries.ndjson.gz';
const GB_WARD_POPULATIONS = 'gb_ward_populations.csv';
const WARD_CODE_PROPERTY = 'WD25CD';
const WARD_NAME_PROPERTY = 'WD25NM';
const WARD_WELSH_NAME_PROPERTY = 'WD25NMW';
const GB_DATA_CONFIGS = {
  districts: {
    datasetId: 'districts',
    displayName: 'Districts',
    unitSingular: 'District',
    unitPlural: 'Districts',
    source: 'UK ONS',
    idProperty: DISTRICT_CODE_PROPERTY,
    nameProperty: DISTRICT_NAME_PROPERTY,
    applicableNameProperties: [
      DISTRICT_WELSH_NAME_PROPERTY,
      DISTRICT_NAME_PROPERTY,
    ],
    populationProperty: 'Population',
  },
  bua: {
    datasetId: 'bua',
    displayName: 'Built-Up Areas',
    unitSingular: 'Built-Up Area',
    unitPlural: 'Built-Up Areas',
    source: 'UK ONS',
    idProperty: BUA_CODE_PROPERTY,
    nameProperty: BUA_NAME_PROPERTY,
    applicableNameProperties: [
      BUA_WELSH_NAME_PROPERTY,
      BUA_GAELIC_NAME_PROPERTY,
      BUA_NAME_PROPERTY,
    ],
    populationProperty: 'Population',
  },
  wards: {
    datasetId: 'wards',
    displayName: 'Electoral Wards',
    unitSingular: 'Electoral Ward',
    unitPlural: 'Electoral Wards',
    source: 'UK ONS',
    idProperty: WARD_CODE_PROPERTY,
    nameProperty: WARD_NAME_PROPERTY,
    applicableNameProperties: [WARD_WELSH_NAME_PROPERTY, WARD_NAME_PROPERTY],
    populationProperty: 'Population',
  },
};
const GB_BOUNDARY_DATA_HANDLERS = {
  districts: {
    dataConfig: GB_DATA_CONFIGS['districts'],
    extractBoundaries: async (bbox2, useLocalData) =>
      extractDistrictBoundaries(bbox2, useLocalData),
  },
  bua: {
    dataConfig: GB_DATA_CONFIGS['bua'],
    extractBoundaries: async (bbox2, useLocalData) =>
      extractBUABoundaries(bbox2, useLocalData),
  },
  wards: {
    dataConfig: GB_DATA_CONFIGS['wards'],
    extractBoundaries: async (bbox2, useLocalData) =>
      extractWardBoundaries(bbox2, useLocalData),
  },
};
async function extractDistrictBoundaries(bbox2, useLocal = false) {
  const boundaries = useLocal
    ? loadGeoJSON(path.resolve(SOURCE_DATA_DIR, GB_DISTRICT_BOUNDARIES))
    : await fetchGeoJSONFromArcGIS(getDistrictONSQuery(bbox2));
  const populationCharacteristics = loadCSV(
    path.resolve(SOURCE_DATA_DIR, GB_DISTRICT_POPULATIONS),
  );
  const populationIndex = buildCSVIndex(
    populationCharacteristics,
    'Code',
    'Population',
  );
  return { geoJson: boundaries, populationMap: populationIndex };
}
async function extractBUABoundaries(bbox2, useLocal = false) {
  const boundaries = useLocal
    ? loadGeoJSON(path.resolve(SOURCE_DATA_DIR, GB_BUA_BOUNDARIES))
    : await fetchGeoJSONFromArcGIS(getBUAONSQuery(bbox2));
  const populationCharacteristics = loadCSV(
    path.resolve(SOURCE_DATA_DIR, GB_BUA_POPULATIONS),
  );
  const populationIndex = buildCSVIndex(
    populationCharacteristics,
    'Code',
    'Population',
  );
  return { geoJson: boundaries, populationMap: populationIndex };
}
async function extractWardBoundaries(bbox2, useLocal = false) {
  const boundaries = useLocal
    ? await loadGeoJSONFromNDJSON(
        path.resolve(SOURCE_DATA_DIR, GB_WARD_BOUNDARIES),
      )
    : await fetchGeoJSONFromArcGIS(getWardONSQuery(bbox2));
  console.log(boundaries.features[0]);
  const populationCharacteristics = loadCSV(
    path.resolve(SOURCE_DATA_DIR, GB_WARD_POPULATIONS),
  );
  const populationIndex = buildCSVIndex(
    populationCharacteristics,
    'Code',
    'Population',
  );
  return { geoJson: boundaries, populationMap: populationIndex };
}
async function extractGBBoundaries(args, bbox2) {
  const handler = GB_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for GB: ${args.dataType}`);
  }
  const { geoJson, populationMap } = await handler.extractBoundaries(
    expandBBox(bbox2, 0.01),
    args.useLocalData,
  );
  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount);
    return;
  }
  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox2,
    args,
    handler.dataConfig,
    'GB',
  );
}
var lodash_custom$1 = { exports: {} };
var lodash_custom = lodash_custom$1.exports;
var hasRequiredLodash_custom;
function requireLodash_custom() {
  if (hasRequiredLodash_custom) return lodash_custom$1.exports;
  hasRequiredLodash_custom = 1;
  (function (module2, exports$1) {
    (function () {
      var undefined$1;
      var VERSION = '4.15.0';
      var LARGE_ARRAY_SIZE = 200;
      var FUNC_ERROR_TEXT = 'Expected a function';
      var HASH_UNDEFINED = '__lodash_hash_undefined__';
      var UNORDERED_COMPARE_FLAG = 1,
        PARTIAL_COMPARE_FLAG = 2;
      var MAX_SAFE_INTEGER2 = 9007199254740991;
      var argsTag = '[object Arguments]',
        arrayTag = '[object Array]',
        boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        mapTag = '[object Map]',
        numberTag = '[object Number]',
        objectTag = '[object Object]',
        promiseTag = '[object Promise]',
        regexpTag = '[object RegExp]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        symbolTag = '[object Symbol]',
        weakMapTag = '[object WeakMap]';
      var arrayBufferTag = '[object ArrayBuffer]',
        dataViewTag = '[object DataView]',
        float32Tag = '[object Float32Array]',
        float64Tag = '[object Float64Array]',
        int8Tag = '[object Int8Array]',
        int16Tag = '[object Int16Array]',
        int32Tag = '[object Int32Array]',
        uint8Tag = '[object Uint8Array]',
        uint8ClampedTag = '[object Uint8ClampedArray]',
        uint16Tag = '[object Uint16Array]',
        uint32Tag = '[object Uint32Array]';
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
        reIsPlainProp = /^\w*$/,
        reLeadingDot = /^\./,
        rePropName =
          /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
      var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
      var reEscapeChar = /\\(\\)?/g;
      var reFlags = /\w*$/;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsUint = /^(?:0|[1-9]\d*)$/;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] =
        typedArrayTags[float64Tag] =
        typedArrayTags[int8Tag] =
        typedArrayTags[int16Tag] =
        typedArrayTags[int32Tag] =
        typedArrayTags[uint8Tag] =
        typedArrayTags[uint8ClampedTag] =
        typedArrayTags[uint16Tag] =
        typedArrayTags[uint32Tag] =
          true;
      typedArrayTags[argsTag] =
        typedArrayTags[arrayTag] =
        typedArrayTags[arrayBufferTag] =
        typedArrayTags[boolTag] =
        typedArrayTags[dataViewTag] =
        typedArrayTags[dateTag] =
        typedArrayTags[errorTag] =
        typedArrayTags[funcTag] =
        typedArrayTags[mapTag] =
        typedArrayTags[numberTag] =
        typedArrayTags[objectTag] =
        typedArrayTags[regexpTag] =
        typedArrayTags[setTag] =
        typedArrayTags[stringTag] =
        typedArrayTags[weakMapTag] =
          false;
      var cloneableTags = {};
      cloneableTags[argsTag] =
        cloneableTags[arrayTag] =
        cloneableTags[arrayBufferTag] =
        cloneableTags[dataViewTag] =
        cloneableTags[boolTag] =
        cloneableTags[dateTag] =
        cloneableTags[float32Tag] =
        cloneableTags[float64Tag] =
        cloneableTags[int8Tag] =
        cloneableTags[int16Tag] =
        cloneableTags[int32Tag] =
        cloneableTags[mapTag] =
        cloneableTags[numberTag] =
        cloneableTags[objectTag] =
        cloneableTags[regexpTag] =
        cloneableTags[setTag] =
        cloneableTags[stringTag] =
        cloneableTags[symbolTag] =
        cloneableTags[uint8Tag] =
        cloneableTags[uint8ClampedTag] =
        cloneableTags[uint16Tag] =
        cloneableTags[uint32Tag] =
          true;
      cloneableTags[errorTag] =
        cloneableTags[funcTag] =
        cloneableTags[weakMapTag] =
          false;
      var freeGlobal =
        typeof commonjsGlobal == 'object' &&
        commonjsGlobal &&
        commonjsGlobal.Object === Object &&
        commonjsGlobal;
      var freeSelf =
        typeof self == 'object' && self && self.Object === Object && self;
      var root = freeGlobal || freeSelf || Function('return this')();
      var freeExports = exports$1 && !exports$1.nodeType && exports$1;
      var freeModule =
        freeExports && true && module2 && !module2.nodeType && module2;
      var moduleExports = freeModule && freeModule.exports === freeExports;
      var freeProcess = moduleExports && freeGlobal.process;
      var nodeUtil = (function () {
        try {
          return freeProcess && freeProcess.binding('util');
        } catch (e) {}
      })();
      var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
      function addMapEntry(map2, pair) {
        map2.set(pair[0], pair[1]);
        return map2;
      }
      function addSetEntry(set2, value) {
        set2.add(value);
        return set2;
      }
      function apply(func, thisArg, args) {
        switch (args.length) {
          case 0:
            return func.call(thisArg);
          case 1:
            return func.call(thisArg, args[0]);
          case 2:
            return func.call(thisArg, args[0], args[1]);
          case 3:
            return func.call(thisArg, args[0], args[1], args[2]);
        }
        return func.apply(thisArg, args);
      }
      function arrayEach(array, iteratee2) {
        var index = -1,
          length2 = array ? array.length : 0;
        while (++index < length2) {
          if (iteratee2(array[index], index, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayPush(array, values) {
        var index = -1,
          length2 = values.length,
          offset = array.length;
        while (++index < length2) {
          array[offset + index] = values[index];
        }
        return array;
      }
      function arrayReduce(array, iteratee2, accumulator, initAccum) {
        var index = -1,
          length2 = array ? array.length : 0;
        while (++index < length2) {
          accumulator = iteratee2(accumulator, array[index], index, array);
        }
        return accumulator;
      }
      function arraySome(array, predicate) {
        var index = -1,
          length2 = array ? array.length : 0;
        while (++index < length2) {
          if (predicate(array[index], index, array)) {
            return true;
          }
        }
        return false;
      }
      function baseProperty(key) {
        return function (object) {
          return object == null ? undefined$1 : object[key];
        };
      }
      function baseTimes(n, iteratee2) {
        var index = -1,
          result = Array(n);
        while (++index < n) {
          result[index] = iteratee2(index);
        }
        return result;
      }
      function baseUnary(func) {
        return function (value) {
          return func(value);
        };
      }
      function getValue(object, key) {
        return object == null ? undefined$1 : object[key];
      }
      function isHostObject(value) {
        var result = false;
        if (value != null && typeof value.toString != 'function') {
          try {
            result = !!(value + '');
          } catch (e) {}
        }
        return result;
      }
      function mapToArray(map2) {
        var index = -1,
          result = Array(map2.size);
        map2.forEach(function (value, key) {
          result[++index] = [key, value];
        });
        return result;
      }
      function overArg(func, transform2) {
        return function (arg) {
          return func(transform2(arg));
        };
      }
      function setToArray(set2) {
        var index = -1,
          result = Array(set2.size);
        set2.forEach(function (value) {
          result[++index] = value;
        });
        return result;
      }
      var arrayProto = Array.prototype,
        funcProto = Function.prototype,
        objectProto = Object.prototype;
      var coreJsData = root['__core-js_shared__'];
      var maskSrcKey = (function () {
        var uid = /[^.]+$/.exec(
          (coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO) || '',
        );
        return uid ? 'Symbol(src)_1.' + uid : '';
      })();
      var funcToString = funcProto.toString;
      var hasOwnProperty = objectProto.hasOwnProperty;
      var objectCtorString = funcToString.call(Object);
      var objectToString = objectProto.toString;
      var reIsNative = RegExp(
        '^' +
          funcToString
            .call(hasOwnProperty)
            .replace(reRegExpChar, '\\$&')
            .replace(
              /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
              '$1.*?',
            ) +
          '$',
      );
      var Buffer2 = moduleExports ? root.Buffer : undefined$1,
        Symbol2 = root.Symbol,
        Uint8Array2 = root.Uint8Array,
        getPrototype = overArg(Object.getPrototypeOf, Object),
        objectCreate = Object.create,
        propertyIsEnumerable = objectProto.propertyIsEnumerable,
        splice = arrayProto.splice;
      var nativeGetSymbols = Object.getOwnPropertySymbols,
        nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined$1,
        nativeKeys = overArg(Object.keys, Object),
        nativeMax = Math.max;
      var DataView = getNative(root, 'DataView'),
        Map2 = getNative(root, 'Map'),
        Promise2 = getNative(root, 'Promise'),
        Set2 = getNative(root, 'Set'),
        WeakMap = getNative(root, 'WeakMap'),
        nativeCreate = getNative(Object, 'create');
      var nonEnumShadows = !propertyIsEnumerable.call(
        { valueOf: 1 },
        'valueOf',
      );
      var dataViewCtorString = toSource(DataView),
        mapCtorString = toSource(Map2),
        promiseCtorString = toSource(Promise2),
        setCtorString = toSource(Set2),
        weakMapCtorString = toSource(WeakMap);
      var symbolProto = Symbol2 ? Symbol2.prototype : undefined$1,
        symbolValueOf = symbolProto ? symbolProto.valueOf : undefined$1,
        symbolToString = symbolProto ? symbolProto.toString : undefined$1;
      function lodash() {}
      function Hash(entries) {
        var index = -1,
          length2 = entries ? entries.length : 0;
        this.clear();
        while (++index < length2) {
          var entry = entries[index];
          this.set(entry[0], entry[1]);
        }
      }
      function hashClear() {
        this.__data__ = nativeCreate ? nativeCreate(null) : {};
      }
      function hashDelete(key) {
        return this.has(key) && delete this.__data__[key];
      }
      function hashGet(key) {
        var data = this.__data__;
        if (nativeCreate) {
          var result = data[key];
          return result === HASH_UNDEFINED ? undefined$1 : result;
        }
        return hasOwnProperty.call(data, key) ? data[key] : undefined$1;
      }
      function hashHas(key) {
        var data = this.__data__;
        return nativeCreate
          ? data[key] !== undefined$1
          : hasOwnProperty.call(data, key);
      }
      function hashSet(key, value) {
        var data = this.__data__;
        data[key] =
          nativeCreate && value === undefined$1 ? HASH_UNDEFINED : value;
        return this;
      }
      Hash.prototype.clear = hashClear;
      Hash.prototype['delete'] = hashDelete;
      Hash.prototype.get = hashGet;
      Hash.prototype.has = hashHas;
      Hash.prototype.set = hashSet;
      function ListCache(entries) {
        var index = -1,
          length2 = entries ? entries.length : 0;
        this.clear();
        while (++index < length2) {
          var entry = entries[index];
          this.set(entry[0], entry[1]);
        }
      }
      function listCacheClear() {
        this.__data__ = [];
      }
      function listCacheDelete(key) {
        var data = this.__data__,
          index = assocIndexOf(data, key);
        if (index < 0) {
          return false;
        }
        var lastIndex = data.length - 1;
        if (index == lastIndex) {
          data.pop();
        } else {
          splice.call(data, index, 1);
        }
        return true;
      }
      function listCacheGet(key) {
        var data = this.__data__,
          index = assocIndexOf(data, key);
        return index < 0 ? undefined$1 : data[index][1];
      }
      function listCacheHas(key) {
        return assocIndexOf(this.__data__, key) > -1;
      }
      function listCacheSet(key, value) {
        var data = this.__data__,
          index = assocIndexOf(data, key);
        if (index < 0) {
          data.push([key, value]);
        } else {
          data[index][1] = value;
        }
        return this;
      }
      ListCache.prototype.clear = listCacheClear;
      ListCache.prototype['delete'] = listCacheDelete;
      ListCache.prototype.get = listCacheGet;
      ListCache.prototype.has = listCacheHas;
      ListCache.prototype.set = listCacheSet;
      function MapCache(entries) {
        var index = -1,
          length2 = entries ? entries.length : 0;
        this.clear();
        while (++index < length2) {
          var entry = entries[index];
          this.set(entry[0], entry[1]);
        }
      }
      function mapCacheClear() {
        this.__data__ = {
          hash: new Hash(),
          map: new (Map2 || ListCache)(),
          string: new Hash(),
        };
      }
      function mapCacheDelete(key) {
        return getMapData(this, key)['delete'](key);
      }
      function mapCacheGet(key) {
        return getMapData(this, key).get(key);
      }
      function mapCacheHas(key) {
        return getMapData(this, key).has(key);
      }
      function mapCacheSet(key, value) {
        getMapData(this, key).set(key, value);
        return this;
      }
      MapCache.prototype.clear = mapCacheClear;
      MapCache.prototype['delete'] = mapCacheDelete;
      MapCache.prototype.get = mapCacheGet;
      MapCache.prototype.has = mapCacheHas;
      MapCache.prototype.set = mapCacheSet;
      function SetCache(values) {
        var index = -1,
          length2 = values ? values.length : 0;
        this.__data__ = new MapCache();
        while (++index < length2) {
          this.add(values[index]);
        }
      }
      function setCacheAdd(value) {
        this.__data__.set(value, HASH_UNDEFINED);
        return this;
      }
      function setCacheHas(value) {
        return this.__data__.has(value);
      }
      SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
      SetCache.prototype.has = setCacheHas;
      function Stack(entries) {
        this.__data__ = new ListCache(entries);
      }
      function stackClear() {
        this.__data__ = new ListCache();
      }
      function stackDelete(key) {
        return this.__data__['delete'](key);
      }
      function stackGet(key) {
        return this.__data__.get(key);
      }
      function stackHas(key) {
        return this.__data__.has(key);
      }
      function stackSet(key, value) {
        var cache = this.__data__;
        if (cache instanceof ListCache) {
          var pairs2 = cache.__data__;
          if (!Map2 || pairs2.length < LARGE_ARRAY_SIZE - 1) {
            pairs2.push([key, value]);
            return this;
          }
          cache = this.__data__ = new MapCache(pairs2);
        }
        cache.set(key, value);
        return this;
      }
      Stack.prototype.clear = stackClear;
      Stack.prototype['delete'] = stackDelete;
      Stack.prototype.get = stackGet;
      Stack.prototype.has = stackHas;
      Stack.prototype.set = stackSet;
      function arrayLikeKeys(value, inherited) {
        var result =
          isArray(value) || isArguments(value)
            ? baseTimes(value.length, String)
            : [];
        var length2 = result.length,
          skipIndexes = !!length2;
        for (var key in value) {
          if (
            (inherited || hasOwnProperty.call(value, key)) &&
            !(skipIndexes && (key == 'length' || isIndex(key, length2)))
          ) {
            result.push(key);
          }
        }
        return result;
      }
      function assignMergeValue(object, key, value) {
        if (
          (value !== undefined$1 && !eq(object[key], value)) ||
          (typeof key == 'number' && value === undefined$1 && !(key in object))
        ) {
          object[key] = value;
        }
      }
      function assignValue(object, key, value) {
        var objValue = object[key];
        if (
          !(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
          (value === undefined$1 && !(key in object))
        ) {
          object[key] = value;
        }
      }
      function assocIndexOf(array, key) {
        var length2 = array.length;
        while (length2--) {
          if (eq(array[length2][0], key)) {
            return length2;
          }
        }
        return -1;
      }
      function baseAssign(object, source) {
        return object && copyObject(source, keys(source), object);
      }
      function baseClone(
        value,
        isDeep,
        isFull,
        customizer,
        key,
        object,
        stack,
      ) {
        var result;
        if (customizer) {
          result = object
            ? customizer(value, key, object, stack)
            : customizer(value);
        }
        if (result !== undefined$1) {
          return result;
        }
        if (!isObject2(value)) {
          return value;
        }
        var isArr = isArray(value);
        if (isArr) {
          result = initCloneArray(value);
          if (!isDeep) {
            return copyArray(value, result);
          }
        } else {
          var tag = getTag(value),
            isFunc = tag == funcTag || tag == genTag;
          if (isBuffer(value)) {
            return cloneBuffer(value, isDeep);
          }
          if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
            if (isHostObject(value)) {
              return object ? value : {};
            }
            result = initCloneObject(isFunc ? {} : value);
            if (!isDeep) {
              return copySymbols(value, baseAssign(result, value));
            }
          } else {
            if (!cloneableTags[tag]) {
              return object ? value : {};
            }
            result = initCloneByTag(value, tag, baseClone, isDeep);
          }
        }
        stack || (stack = new Stack());
        var stacked = stack.get(value);
        if (stacked) {
          return stacked;
        }
        stack.set(value, result);
        if (!isArr) {
          var props = isFull ? getAllKeys(value) : keys(value);
        }
        arrayEach(props || value, function (subValue, key2) {
          if (props) {
            key2 = subValue;
            subValue = value[key2];
          }
          assignValue(
            result,
            key2,
            baseClone(subValue, isDeep, isFull, customizer, key2, value, stack),
          );
        });
        return result;
      }
      function baseCreate(proto) {
        return isObject2(proto) ? objectCreate(proto) : {};
      }
      var baseEach = createBaseEach(baseForOwn);
      var baseFor = createBaseFor();
      function baseForOwn(object, iteratee2) {
        return object && baseFor(object, iteratee2, keys);
      }
      function baseGet(object, path2) {
        path2 = isKey(path2, object) ? [path2] : castPath(path2);
        var index = 0,
          length2 = path2.length;
        while (object != null && index < length2) {
          object = object[toKey(path2[index++])];
        }
        return index && index == length2 ? object : undefined$1;
      }
      function baseGetAllKeys(object, keysFunc, symbolsFunc) {
        var result = keysFunc(object);
        return isArray(object)
          ? result
          : arrayPush(result, symbolsFunc(object));
      }
      function baseGetTag(value) {
        return objectToString.call(value);
      }
      function baseHasIn(object, key) {
        return object != null && key in Object(object);
      }
      function baseIsEqual(value, other, customizer, bitmask, stack) {
        if (value === other) {
          return true;
        }
        if (
          value == null ||
          other == null ||
          (!isObject2(value) && !isObjectLike(other))
        ) {
          return value !== value && other !== other;
        }
        return baseIsEqualDeep(
          value,
          other,
          baseIsEqual,
          customizer,
          bitmask,
          stack,
        );
      }
      function baseIsEqualDeep(
        object,
        other,
        equalFunc,
        customizer,
        bitmask,
        stack,
      ) {
        var objIsArr = isArray(object),
          othIsArr = isArray(other),
          objTag = arrayTag,
          othTag = arrayTag;
        if (!objIsArr) {
          objTag = getTag(object);
          objTag = objTag == argsTag ? objectTag : objTag;
        }
        if (!othIsArr) {
          othTag = getTag(other);
          othTag = othTag == argsTag ? objectTag : othTag;
        }
        var objIsObj = objTag == objectTag && !isHostObject(object),
          othIsObj = othTag == objectTag && !isHostObject(other),
          isSameTag = objTag == othTag;
        if (isSameTag && !objIsObj) {
          stack || (stack = new Stack());
          return objIsArr || isTypedArray(object)
            ? equalArrays(object, other, equalFunc, customizer, bitmask, stack)
            : equalByTag(
                object,
                other,
                objTag,
                equalFunc,
                customizer,
                bitmask,
                stack,
              );
        }
        if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
          var objIsWrapped =
              objIsObj && hasOwnProperty.call(object, '__wrapped__'),
            othIsWrapped =
              othIsObj && hasOwnProperty.call(other, '__wrapped__');
          if (objIsWrapped || othIsWrapped) {
            var objUnwrapped = objIsWrapped ? object.value() : object,
              othUnwrapped = othIsWrapped ? other.value() : other;
            stack || (stack = new Stack());
            return equalFunc(
              objUnwrapped,
              othUnwrapped,
              customizer,
              bitmask,
              stack,
            );
          }
        }
        if (!isSameTag) {
          return false;
        }
        stack || (stack = new Stack());
        return equalObjects(
          object,
          other,
          equalFunc,
          customizer,
          bitmask,
          stack,
        );
      }
      function baseIsMatch(object, source, matchData, customizer) {
        var index = matchData.length,
          length2 = index;
        if (object == null) {
          return !length2;
        }
        object = Object(object);
        while (index--) {
          var data = matchData[index];
          if (data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
            return false;
          }
        }
        while (++index < length2) {
          data = matchData[index];
          var key = data[0],
            objValue = object[key],
            srcValue = data[1];
          if (data[2]) {
            if (objValue === undefined$1 && !(key in object)) {
              return false;
            }
          } else {
            var stack = new Stack();
            var result;
            if (
              !(result === undefined$1
                ? baseIsEqual(
                    srcValue,
                    objValue,
                    customizer,
                    UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG,
                    stack,
                  )
                : result)
            ) {
              return false;
            }
          }
        }
        return true;
      }
      function baseIsNative(value) {
        if (!isObject2(value) || isMasked(value)) {
          return false;
        }
        var pattern =
          isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
        return pattern.test(toSource(value));
      }
      function baseIsTypedArray(value) {
        return (
          isObjectLike(value) &&
          isLength(value.length) &&
          !!typedArrayTags[objectToString.call(value)]
        );
      }
      function baseIteratee(value) {
        if (typeof value == 'function') {
          return value;
        }
        if (value == null) {
          return identity2;
        }
        if (typeof value == 'object') {
          return isArray(value)
            ? baseMatchesProperty(value[0], value[1])
            : baseMatches(value);
        }
        return property(value);
      }
      function baseKeys(object) {
        if (!isPrototype(object)) {
          return nativeKeys(object);
        }
        var result = [];
        for (var key in Object(object)) {
          if (hasOwnProperty.call(object, key) && key != 'constructor') {
            result.push(key);
          }
        }
        return result;
      }
      function baseKeysIn(object) {
        if (!isObject2(object)) {
          return nativeKeysIn(object);
        }
        var isProto = isPrototype(object),
          result = [];
        for (var key in object) {
          if (
            !(
              key == 'constructor' &&
              (isProto || !hasOwnProperty.call(object, key))
            )
          ) {
            result.push(key);
          }
        }
        return result;
      }
      function baseMatches(source) {
        var matchData = getMatchData(source);
        if (matchData.length == 1 && matchData[0][2]) {
          return matchesStrictComparable(matchData[0][0], matchData[0][1]);
        }
        return function (object) {
          return object === source || baseIsMatch(object, source, matchData);
        };
      }
      function baseMatchesProperty(path2, srcValue) {
        if (isKey(path2) && isStrictComparable(srcValue)) {
          return matchesStrictComparable(toKey(path2), srcValue);
        }
        return function (object) {
          var objValue = get(object, path2);
          return objValue === undefined$1 && objValue === srcValue
            ? hasIn(object, path2)
            : baseIsEqual(
                srcValue,
                objValue,
                undefined$1,
                UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG,
              );
        };
      }
      function baseMerge(object, source, srcIndex, customizer, stack) {
        if (object === source) {
          return;
        }
        if (!(isArray(source) || isTypedArray(source))) {
          var props = baseKeysIn(source);
        }
        arrayEach(props || source, function (srcValue, key) {
          if (props) {
            key = srcValue;
            srcValue = source[key];
          }
          if (isObject2(srcValue)) {
            stack || (stack = new Stack());
            baseMergeDeep(
              object,
              source,
              key,
              srcIndex,
              baseMerge,
              customizer,
              stack,
            );
          } else {
            var newValue = customizer
              ? customizer(
                  object[key],
                  srcValue,
                  key + '',
                  object,
                  source,
                  stack,
                )
              : undefined$1;
            if (newValue === undefined$1) {
              newValue = srcValue;
            }
            assignMergeValue(object, key, newValue);
          }
        });
      }
      function baseMergeDeep(
        object,
        source,
        key,
        srcIndex,
        mergeFunc,
        customizer,
        stack,
      ) {
        var objValue = object[key],
          srcValue = source[key],
          stacked = stack.get(srcValue);
        if (stacked) {
          assignMergeValue(object, key, stacked);
          return;
        }
        var newValue = customizer
          ? customizer(objValue, srcValue, key + '', object, source, stack)
          : undefined$1;
        var isCommon = newValue === undefined$1;
        if (isCommon) {
          newValue = srcValue;
          if (isArray(srcValue) || isTypedArray(srcValue)) {
            if (isArray(objValue)) {
              newValue = objValue;
            } else if (isArrayLikeObject(objValue)) {
              newValue = copyArray(objValue);
            } else {
              isCommon = false;
              newValue = baseClone(srcValue, true);
            }
          } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
            if (isArguments(objValue)) {
              newValue = toPlainObject(objValue);
            } else if (
              !isObject2(objValue) ||
              (srcIndex && isFunction(objValue))
            ) {
              isCommon = false;
              newValue = baseClone(srcValue, true);
            } else {
              newValue = objValue;
            }
          } else {
            isCommon = false;
          }
        }
        if (isCommon) {
          stack.set(srcValue, newValue);
          mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
          stack['delete'](srcValue);
        }
        assignMergeValue(object, key, newValue);
      }
      function basePropertyDeep(path2) {
        return function (object) {
          return baseGet(object, path2);
        };
      }
      function baseRest(func, start) {
        start = nativeMax(start === undefined$1 ? func.length - 1 : start, 0);
        return function () {
          var args = arguments,
            index = -1,
            length2 = nativeMax(args.length - start, 0),
            array = Array(length2);
          while (++index < length2) {
            array[index] = args[start + index];
          }
          index = -1;
          var otherArgs = Array(start + 1);
          while (++index < start) {
            otherArgs[index] = args[index];
          }
          otherArgs[start] = array;
          return apply(func, this, otherArgs);
        };
      }
      function baseToString(value) {
        if (typeof value == 'string') {
          return value;
        }
        if (isSymbol(value)) {
          return symbolToString ? symbolToString.call(value) : '';
        }
        var result = value + '';
        return result == '0' && 1 / value == -Infinity ? '-0' : result;
      }
      function castPath(value) {
        return isArray(value) ? value : stringToPath(value);
      }
      function cloneBuffer(buffer, isDeep) {
        if (isDeep) {
          return buffer.slice();
        }
        var result = new buffer.constructor(buffer.length);
        buffer.copy(result);
        return result;
      }
      function cloneArrayBuffer(arrayBuffer) {
        var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
        new Uint8Array2(result).set(new Uint8Array2(arrayBuffer));
        return result;
      }
      function cloneDataView(dataView, isDeep) {
        var buffer = isDeep
          ? cloneArrayBuffer(dataView.buffer)
          : dataView.buffer;
        return new dataView.constructor(
          buffer,
          dataView.byteOffset,
          dataView.byteLength,
        );
      }
      function cloneMap(map2, isDeep, cloneFunc) {
        var array = isDeep
          ? cloneFunc(mapToArray(map2), true)
          : mapToArray(map2);
        return arrayReduce(array, addMapEntry, new map2.constructor());
      }
      function cloneRegExp(regexp) {
        var result = new regexp.constructor(
          regexp.source,
          reFlags.exec(regexp),
        );
        result.lastIndex = regexp.lastIndex;
        return result;
      }
      function cloneSet(set2, isDeep, cloneFunc) {
        var array = isDeep
          ? cloneFunc(setToArray(set2), true)
          : setToArray(set2);
        return arrayReduce(array, addSetEntry, new set2.constructor());
      }
      function cloneSymbol(symbol) {
        return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
      }
      function cloneTypedArray(typedArray, isDeep) {
        var buffer = isDeep
          ? cloneArrayBuffer(typedArray.buffer)
          : typedArray.buffer;
        return new typedArray.constructor(
          buffer,
          typedArray.byteOffset,
          typedArray.length,
        );
      }
      function copyArray(source, array) {
        var index = -1,
          length2 = source.length;
        array || (array = Array(length2));
        while (++index < length2) {
          array[index] = source[index];
        }
        return array;
      }
      function copyObject(source, props, object, customizer) {
        object || (object = {});
        var index = -1,
          length2 = props.length;
        while (++index < length2) {
          var key = props[index];
          var newValue = undefined$1;
          assignValue(
            object,
            key,
            newValue === undefined$1 ? source[key] : newValue,
          );
        }
        return object;
      }
      function copySymbols(source, object) {
        return copyObject(source, getSymbols(source), object);
      }
      function createAssigner(assigner) {
        return baseRest(function (object, sources) {
          var index = -1,
            length2 = sources.length,
            customizer = length2 > 1 ? sources[length2 - 1] : undefined$1,
            guard = length2 > 2 ? sources[2] : undefined$1;
          customizer =
            assigner.length > 3 && typeof customizer == 'function'
              ? (length2--, customizer)
              : undefined$1;
          if (guard && isIterateeCall(sources[0], sources[1], guard)) {
            customizer = length2 < 3 ? undefined$1 : customizer;
            length2 = 1;
          }
          object = Object(object);
          while (++index < length2) {
            var source = sources[index];
            if (source) {
              assigner(object, source, index, customizer);
            }
          }
          return object;
        });
      }
      function createBaseEach(eachFunc, fromRight) {
        return function (collection, iteratee2) {
          if (collection == null) {
            return collection;
          }
          if (!isArrayLike(collection)) {
            return eachFunc(collection, iteratee2);
          }
          var length2 = collection.length,
            index = -1,
            iterable = Object(collection);
          while (++index < length2) {
            if (iteratee2(iterable[index], index, iterable) === false) {
              break;
            }
          }
          return collection;
        };
      }
      function createBaseFor(fromRight) {
        return function (object, iteratee2, keysFunc) {
          var index = -1,
            iterable = Object(object),
            props = keysFunc(object),
            length2 = props.length;
          while (length2--) {
            var key = props[++index];
            if (iteratee2(iterable[key], key, iterable) === false) {
              break;
            }
          }
          return object;
        };
      }
      function equalArrays(
        array,
        other,
        equalFunc,
        customizer,
        bitmask,
        stack,
      ) {
        var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
          arrLength = array.length,
          othLength = other.length;
        if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
          return false;
        }
        var stacked = stack.get(array);
        if (stacked && stack.get(other)) {
          return stacked == other;
        }
        var index = -1,
          result = true,
          seen =
            bitmask & UNORDERED_COMPARE_FLAG ? new SetCache() : undefined$1;
        stack.set(array, other);
        stack.set(other, array);
        while (++index < arrLength) {
          var arrValue = array[index],
            othValue = other[index];
          if (customizer) {
            var compared = isPartial
              ? customizer(othValue, arrValue, index, other, array, stack)
              : customizer(arrValue, othValue, index, array, other, stack);
          }
          if (compared !== undefined$1) {
            if (compared) {
              continue;
            }
            result = false;
            break;
          }
          if (seen) {
            if (
              !arraySome(other, function (othValue2, othIndex) {
                if (
                  !seen.has(othIndex) &&
                  (arrValue === othValue2 ||
                    equalFunc(arrValue, othValue2, customizer, bitmask, stack))
                ) {
                  return seen.add(othIndex);
                }
              })
            ) {
              result = false;
              break;
            }
          } else if (
            !(
              arrValue === othValue ||
              equalFunc(arrValue, othValue, customizer, bitmask, stack)
            )
          ) {
            result = false;
            break;
          }
        }
        stack['delete'](array);
        stack['delete'](other);
        return result;
      }
      function equalByTag(
        object,
        other,
        tag,
        equalFunc,
        customizer,
        bitmask,
        stack,
      ) {
        switch (tag) {
          case dataViewTag:
            if (
              object.byteLength != other.byteLength ||
              object.byteOffset != other.byteOffset
            ) {
              return false;
            }
            object = object.buffer;
            other = other.buffer;
          case arrayBufferTag:
            if (
              object.byteLength != other.byteLength ||
              !equalFunc(new Uint8Array2(object), new Uint8Array2(other))
            ) {
              return false;
            }
            return true;
          case boolTag:
          case dateTag:
          case numberTag:
            return eq(+object, +other);
          case errorTag:
            return object.name == other.name && object.message == other.message;
          case regexpTag:
          case stringTag:
            return object == other + '';
          case mapTag:
            var convert = mapToArray;
          case setTag:
            var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
            convert || (convert = setToArray);
            if (object.size != other.size && !isPartial) {
              return false;
            }
            var stacked = stack.get(object);
            if (stacked) {
              return stacked == other;
            }
            bitmask |= UNORDERED_COMPARE_FLAG;
            stack.set(object, other);
            var result = equalArrays(
              convert(object),
              convert(other),
              equalFunc,
              customizer,
              bitmask,
              stack,
            );
            stack['delete'](object);
            return result;
          case symbolTag:
            if (symbolValueOf) {
              return symbolValueOf.call(object) == symbolValueOf.call(other);
            }
        }
        return false;
      }
      function equalObjects(
        object,
        other,
        equalFunc,
        customizer,
        bitmask,
        stack,
      ) {
        var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
          objProps = keys(object),
          objLength = objProps.length,
          othProps = keys(other),
          othLength = othProps.length;
        if (objLength != othLength && !isPartial) {
          return false;
        }
        var index = objLength;
        while (index--) {
          var key = objProps[index];
          if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
            return false;
          }
        }
        var stacked = stack.get(object);
        if (stacked && stack.get(other)) {
          return stacked == other;
        }
        var result = true;
        stack.set(object, other);
        stack.set(other, object);
        var skipCtor = isPartial;
        while (++index < objLength) {
          key = objProps[index];
          var objValue = object[key],
            othValue = other[key];
          if (customizer) {
            var compared = isPartial
              ? customizer(othValue, objValue, key, other, object, stack)
              : customizer(objValue, othValue, key, object, other, stack);
          }
          if (
            !(compared === undefined$1
              ? objValue === othValue ||
                equalFunc(objValue, othValue, customizer, bitmask, stack)
              : compared)
          ) {
            result = false;
            break;
          }
          skipCtor || (skipCtor = key == 'constructor');
        }
        if (result && !skipCtor) {
          var objCtor = object.constructor,
            othCtor = other.constructor;
          if (
            objCtor != othCtor &&
            'constructor' in object &&
            'constructor' in other &&
            !(
              typeof objCtor == 'function' &&
              objCtor instanceof objCtor &&
              typeof othCtor == 'function' &&
              othCtor instanceof othCtor
            )
          ) {
            result = false;
          }
        }
        stack['delete'](object);
        stack['delete'](other);
        return result;
      }
      function getAllKeys(object) {
        return baseGetAllKeys(object, keys, getSymbols);
      }
      function getIteratee() {
        var result = lodash.iteratee || iteratee;
        result = result === iteratee ? baseIteratee : result;
        return arguments.length ? result(arguments[0], arguments[1]) : result;
      }
      function getMapData(map2, key) {
        var data = map2.__data__;
        return isKeyable(key)
          ? data[typeof key == 'string' ? 'string' : 'hash']
          : data.map;
      }
      function getMatchData(object) {
        var result = keys(object),
          length2 = result.length;
        while (length2--) {
          var key = result[length2],
            value = object[key];
          result[length2] = [key, value, isStrictComparable(value)];
        }
        return result;
      }
      function getNative(object, key) {
        var value = getValue(object, key);
        return baseIsNative(value) ? value : undefined$1;
      }
      var getSymbols = nativeGetSymbols
        ? overArg(nativeGetSymbols, Object)
        : stubArray;
      var getTag = baseGetTag;
      if (
        (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
        (Map2 && getTag(new Map2()) != mapTag) ||
        (Promise2 && getTag(Promise2.resolve()) != promiseTag) ||
        (Set2 && getTag(new Set2()) != setTag) ||
        (WeakMap && getTag(new WeakMap()) != weakMapTag)
      ) {
        getTag = function (value) {
          var result = objectToString.call(value),
            Ctor = result == objectTag ? value.constructor : undefined$1,
            ctorString = Ctor ? toSource(Ctor) : undefined$1;
          if (ctorString) {
            switch (ctorString) {
              case dataViewCtorString:
                return dataViewTag;
              case mapCtorString:
                return mapTag;
              case promiseCtorString:
                return promiseTag;
              case setCtorString:
                return setTag;
              case weakMapCtorString:
                return weakMapTag;
            }
          }
          return result;
        };
      }
      function hasPath(object, path2, hasFunc) {
        path2 = isKey(path2, object) ? [path2] : castPath(path2);
        var result,
          index = -1,
          length2 = path2.length;
        while (++index < length2) {
          var key = toKey(path2[index]);
          if (!(result = object != null && hasFunc(object, key))) {
            break;
          }
          object = object[key];
        }
        if (result) {
          return result;
        }
        var length2 = object ? object.length : 0;
        return (
          !!length2 &&
          isLength(length2) &&
          isIndex(key, length2) &&
          (isArray(object) || isArguments(object))
        );
      }
      function initCloneArray(array) {
        var length2 = array.length,
          result = array.constructor(length2);
        if (
          length2 &&
          typeof array[0] == 'string' &&
          hasOwnProperty.call(array, 'index')
        ) {
          result.index = array.index;
          result.input = array.input;
        }
        return result;
      }
      function initCloneObject(object) {
        return typeof object.constructor == 'function' && !isPrototype(object)
          ? baseCreate(getPrototype(object))
          : {};
      }
      function initCloneByTag(object, tag, cloneFunc, isDeep) {
        var Ctor = object.constructor;
        switch (tag) {
          case arrayBufferTag:
            return cloneArrayBuffer(object);
          case boolTag:
          case dateTag:
            return new Ctor(+object);
          case dataViewTag:
            return cloneDataView(object, isDeep);
          case float32Tag:
          case float64Tag:
          case int8Tag:
          case int16Tag:
          case int32Tag:
          case uint8Tag:
          case uint8ClampedTag:
          case uint16Tag:
          case uint32Tag:
            return cloneTypedArray(object, isDeep);
          case mapTag:
            return cloneMap(object, isDeep, cloneFunc);
          case numberTag:
          case stringTag:
            return new Ctor(object);
          case regexpTag:
            return cloneRegExp(object);
          case setTag:
            return cloneSet(object, isDeep, cloneFunc);
          case symbolTag:
            return cloneSymbol(object);
        }
      }
      function isIndex(value, length2) {
        length2 = length2 == null ? MAX_SAFE_INTEGER2 : length2;
        return (
          !!length2 &&
          (typeof value == 'number' || reIsUint.test(value)) &&
          value > -1 &&
          value % 1 == 0 &&
          value < length2
        );
      }
      function isIterateeCall(value, index, object) {
        if (!isObject2(object)) {
          return false;
        }
        var type = typeof index;
        if (
          type == 'number'
            ? isArrayLike(object) && isIndex(index, object.length)
            : type == 'string' && index in object
        ) {
          return eq(object[index], value);
        }
        return false;
      }
      function isKey(value, object) {
        if (isArray(value)) {
          return false;
        }
        var type = typeof value;
        if (
          type == 'number' ||
          type == 'symbol' ||
          type == 'boolean' ||
          value == null ||
          isSymbol(value)
        ) {
          return true;
        }
        return (
          reIsPlainProp.test(value) ||
          !reIsDeepProp.test(value) ||
          (object != null && value in Object(object))
        );
      }
      function isKeyable(value) {
        var type = typeof value;
        return type == 'string' ||
          type == 'number' ||
          type == 'symbol' ||
          type == 'boolean'
          ? value !== '__proto__'
          : value === null;
      }
      function isMasked(func) {
        return !!maskSrcKey && maskSrcKey in func;
      }
      function isPrototype(value) {
        var Ctor = value && value.constructor,
          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;
        return value === proto;
      }
      function isStrictComparable(value) {
        return value === value && !isObject2(value);
      }
      function matchesStrictComparable(key, srcValue) {
        return function (object) {
          if (object == null) {
            return false;
          }
          return (
            object[key] === srcValue &&
            (srcValue !== undefined$1 || key in Object(object))
          );
        };
      }
      function nativeKeysIn(object) {
        var result = [];
        if (object != null) {
          for (var key in Object(object)) {
            result.push(key);
          }
        }
        return result;
      }
      var stringToPath = memoize(function (string2) {
        string2 = toString(string2);
        var result = [];
        if (reLeadingDot.test(string2)) {
          result.push('');
        }
        string2.replace(rePropName, function (match, number, quote, string3) {
          result.push(
            quote ? string3.replace(reEscapeChar, '$1') : number || match,
          );
        });
        return result;
      });
      function toKey(value) {
        if (typeof value == 'string' || isSymbol(value)) {
          return value;
        }
        var result = value + '';
        return result == '0' && 1 / value == -Infinity ? '-0' : result;
      }
      function toSource(func) {
        if (func != null) {
          try {
            return funcToString.call(func);
          } catch (e) {}
          try {
            return func + '';
          } catch (e) {}
        }
        return '';
      }
      function compact(array) {
        var index = -1,
          length2 = array ? array.length : 0,
          resIndex = 0,
          result = [];
        while (++index < length2) {
          var value = array[index];
          if (value) {
            result[resIndex++] = value;
          }
        }
        return result;
      }
      function forEach(collection, iteratee2) {
        var func = isArray(collection) ? arrayEach : baseEach;
        return func(collection, getIteratee(iteratee2, 3));
      }
      function memoize(func, resolver) {
        if (
          typeof func != 'function' ||
          (resolver && typeof resolver != 'function')
        ) {
          throw new TypeError(FUNC_ERROR_TEXT);
        }
        var memoized = function () {
          var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;
          if (cache.has(key)) {
            return cache.get(key);
          }
          var result = func.apply(this, args);
          memoized.cache = cache.set(key, result);
          return result;
        };
        memoized.cache = new (memoize.Cache || MapCache)();
        return memoized;
      }
      memoize.Cache = MapCache;
      function clone2(value) {
        return baseClone(value, false, true);
      }
      function eq(value, other) {
        return value === other || (value !== value && other !== other);
      }
      function isArguments(value) {
        return (
          isArrayLikeObject(value) &&
          hasOwnProperty.call(value, 'callee') &&
          (!propertyIsEnumerable.call(value, 'callee') ||
            objectToString.call(value) == argsTag)
        );
      }
      var isArray = Array.isArray;
      function isArrayLike(value) {
        return value != null && isLength(value.length) && !isFunction(value);
      }
      function isArrayLikeObject(value) {
        return isObjectLike(value) && isArrayLike(value);
      }
      var isBuffer = nativeIsBuffer || stubFalse;
      function isEmpty(value) {
        if (
          isArrayLike(value) &&
          (isArray(value) ||
            typeof value == 'string' ||
            typeof value.splice == 'function' ||
            isBuffer(value) ||
            isArguments(value))
        ) {
          return !value.length;
        }
        var tag = getTag(value);
        if (tag == mapTag || tag == setTag) {
          return !value.size;
        }
        if (nonEnumShadows || isPrototype(value)) {
          return !nativeKeys(value).length;
        }
        for (var key in value) {
          if (hasOwnProperty.call(value, key)) {
            return false;
          }
        }
        return true;
      }
      function isFunction(value) {
        var tag = isObject2(value) ? objectToString.call(value) : '';
        return tag == funcTag || tag == genTag;
      }
      function isLength(value) {
        return (
          typeof value == 'number' &&
          value > -1 &&
          value % 1 == 0 &&
          value <= MAX_SAFE_INTEGER2
        );
      }
      function isObject2(value) {
        var type = typeof value;
        return !!value && (type == 'object' || type == 'function');
      }
      function isObjectLike(value) {
        return !!value && typeof value == 'object';
      }
      function isPlainObject(value) {
        if (
          !isObjectLike(value) ||
          objectToString.call(value) != objectTag ||
          isHostObject(value)
        ) {
          return false;
        }
        var proto = getPrototype(value);
        if (proto === null) {
          return true;
        }
        var Ctor =
          hasOwnProperty.call(proto, 'constructor') && proto.constructor;
        return (
          typeof Ctor == 'function' &&
          Ctor instanceof Ctor &&
          funcToString.call(Ctor) == objectCtorString
        );
      }
      function isSymbol(value) {
        return (
          typeof value == 'symbol' ||
          (isObjectLike(value) && objectToString.call(value) == symbolTag)
        );
      }
      var isTypedArray = nodeIsTypedArray
        ? baseUnary(nodeIsTypedArray)
        : baseIsTypedArray;
      function toPlainObject(value) {
        return copyObject(value, keysIn(value));
      }
      function toString(value) {
        return value == null ? '' : baseToString(value);
      }
      function get(object, path2, defaultValue) {
        var result = object == null ? undefined$1 : baseGet(object, path2);
        return result === undefined$1 ? defaultValue : result;
      }
      function hasIn(object, path2) {
        return object != null && hasPath(object, path2, baseHasIn);
      }
      function keys(object) {
        return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
      }
      function keysIn(object) {
        return isArrayLike(object)
          ? arrayLikeKeys(object, true)
          : baseKeysIn(object);
      }
      var merge2 = createAssigner(function (object, source, srcIndex) {
        baseMerge(object, source, srcIndex);
      });
      function identity2(value) {
        return value;
      }
      function iteratee(func) {
        return baseIteratee(
          typeof func == 'function' ? func : baseClone(func, true),
        );
      }
      function property(path2) {
        return isKey(path2)
          ? baseProperty(toKey(path2))
          : basePropertyDeep(path2);
      }
      function stubArray() {
        return [];
      }
      function stubFalse() {
        return false;
      }
      lodash.compact = compact;
      lodash.iteratee = iteratee;
      lodash.keys = keys;
      lodash.keysIn = keysIn;
      lodash.memoize = memoize;
      lodash.merge = merge2;
      lodash.property = property;
      lodash.toPlainObject = toPlainObject;
      lodash.clone = clone2;
      lodash.eq = eq;
      lodash.forEach = forEach;
      lodash.get = get;
      lodash.hasIn = hasIn;
      lodash.identity = identity2;
      lodash.isArguments = isArguments;
      lodash.isArray = isArray;
      lodash.isArrayLike = isArrayLike;
      lodash.isArrayLikeObject = isArrayLikeObject;
      lodash.isBuffer = isBuffer;
      lodash.isEmpty = isEmpty;
      lodash.isFunction = isFunction;
      lodash.isLength = isLength;
      lodash.isObject = isObject2;
      lodash.isObjectLike = isObjectLike;
      lodash.isPlainObject = isPlainObject;
      lodash.isSymbol = isSymbol;
      lodash.isTypedArray = isTypedArray;
      lodash.stubArray = stubArray;
      lodash.stubFalse = stubFalse;
      lodash.toString = toString;
      lodash.each = forEach;
      lodash.VERSION = VERSION;
      if (freeModule) {
        (freeModule.exports = lodash)._ = lodash;
        freeExports._ = lodash;
      }
    }).call(lodash_custom);
  })(lodash_custom$1, lodash_custom$1.exports);
  return lodash_custom$1.exports;
}
var geojsonRewind;
var hasRequiredGeojsonRewind;
function requireGeojsonRewind() {
  if (hasRequiredGeojsonRewind) return geojsonRewind;
  hasRequiredGeojsonRewind = 1;
  geojsonRewind = rewind;
  function rewind(gj, outer) {
    var type = gj && gj.type,
      i;
    if (type === 'FeatureCollection') {
      for (i = 0; i < gj.features.length; i++) rewind(gj.features[i], outer);
    } else if (type === 'GeometryCollection') {
      for (i = 0; i < gj.geometries.length; i++)
        rewind(gj.geometries[i], outer);
    } else if (type === 'Feature') {
      rewind(gj.geometry, outer);
    } else if (type === 'Polygon') {
      rewindRings(gj.coordinates, outer);
    } else if (type === 'MultiPolygon') {
      for (i = 0; i < gj.coordinates.length; i++)
        rewindRings(gj.coordinates[i], outer);
    }
    return gj;
  }
  function rewindRings(rings, outer) {
    if (rings.length === 0) return;
    rewindRing(rings[0], outer);
    for (var i = 1; i < rings.length; i++) {
      rewindRing(rings[i], !outer);
    }
  }
  function rewindRing(ring, dir) {
    var area2 = 0,
      err = 0;
    for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      var k = (ring[i][0] - ring[j][0]) * (ring[j][1] + ring[i][1]);
      var m = area2 + k;
      err += Math.abs(area2) >= Math.abs(k) ? area2 - m + k : k - m + area2;
      area2 = m;
    }
    if (area2 + err >= 0 !== !!dir) ring.reverse();
  }
  return geojsonRewind;
}
const require$$0 = [
  {
    key: 'building',
    polygon: 'all',
  },
  {
    key: 'highway',
    polygon: 'whitelist',
    values: ['services', 'rest_area', 'escape', 'elevator'],
  },
  {
    key: 'natural',
    polygon: 'blacklist',
    values: ['coastline', 'cliff', 'ridge', 'arete', 'tree_row'],
  },
  {
    key: 'landuse',
    polygon: 'all',
  },
  {
    key: 'waterway',
    polygon: 'whitelist',
    values: ['riverbank', 'dock', 'boatyard', 'dam'],
  },
  {
    key: 'amenity',
    polygon: 'all',
  },
  {
    key: 'leisure',
    polygon: 'all',
  },
  {
    key: 'barrier',
    polygon: 'whitelist',
    values: ['city_wall', 'ditch', 'hedge', 'retaining_wall', 'wall', 'spikes'],
  },
  {
    key: 'railway',
    polygon: 'whitelist',
    values: ['station', 'turntable', 'roundhouse', 'platform'],
  },
  {
    key: 'area',
    polygon: 'all',
  },
  {
    key: 'boundary',
    polygon: 'all',
  },
  {
    key: 'man_made',
    polygon: 'blacklist',
    values: ['cutline', 'embankment', 'pipeline'],
  },
  {
    key: 'power',
    polygon: 'whitelist',
    values: ['plant', 'substation', 'generator', 'transformer'],
  },
  {
    key: 'place',
    polygon: 'all',
  },
  {
    key: 'shop',
    polygon: 'all',
  },
  {
    key: 'aeroway',
    polygon: 'blacklist',
    values: ['taxiway'],
  },
  {
    key: 'tourism',
    polygon: 'all',
  },
  {
    key: 'historic',
    polygon: 'all',
  },
  {
    key: 'public_transport',
    polygon: 'all',
  },
  {
    key: 'office',
    polygon: 'all',
  },
  {
    key: 'building:part',
    polygon: 'all',
  },
  {
    key: 'military',
    polygon: 'all',
  },
  {
    key: 'ruins',
    polygon: 'all',
  },
  {
    key: 'area:highway',
    polygon: 'all',
  },
  {
    key: 'craft',
    polygon: 'all',
  },
  {
    key: 'golf',
    polygon: 'all',
  },
  {
    key: 'indoor',
    polygon: 'all',
  },
];
var osmPolygonFeatures;
var hasRequiredOsmPolygonFeatures;
function requireOsmPolygonFeatures() {
  if (hasRequiredOsmPolygonFeatures) return osmPolygonFeatures;
  hasRequiredOsmPolygonFeatures = 1;
  osmPolygonFeatures = require$$0;
  return osmPolygonFeatures;
}
var osmtogeojson_1;
var hasRequiredOsmtogeojson;
function requireOsmtogeojson() {
  if (hasRequiredOsmtogeojson) return osmtogeojson_1;
  hasRequiredOsmtogeojson = 1;
  var _ = requireLodash_custom();
  var rewind = requireGeojsonRewind();
  var polygonFeatures = {};
  requireOsmPolygonFeatures().forEach(function (tags2) {
    if (tags2.polygon === 'all') polygonFeatures[tags2.key] = true;
    else {
      var list =
          tags2.polygon === 'whitelist' ? 'included_values' : 'excluded_values',
        tagValuesObj = {};
      tags2.values.forEach(function (value) {
        tagValuesObj[value] = true;
      });
      polygonFeatures[tags2.key] = {};
      polygonFeatures[tags2.key][list] = tagValuesObj;
    }
  });
  function default_deduplicator(objectA, objectB) {
    if (
      (objectA.version || objectB.version) &&
      objectA.version !== objectB.version
    ) {
      return (+objectA.version || 0) > (+objectB.version || 0)
        ? objectA
        : objectB;
    }
    return _.merge(objectA, objectB);
  }
  var osmtogeojson2 = {};
  osmtogeojson2 = function (data, options, featureCallback) {
    options = _.merge(
      {
        verbose: false,
        flatProperties: true,
        uninterestingTags: {
          source: true,
          source_ref: true,
          'source:ref': true,
          history: true,
          attribution: true,
          created_by: true,
          'tiger:county': true,
          'tiger:tlid': true,
          'tiger:upload_uuid': true,
        },
        polygonFeatures,
        deduplicator: default_deduplicator,
      },
      options,
    );
    var result;
    if (
      (typeof XMLDocument !== 'undefined' && data instanceof XMLDocument) ||
      (typeof XMLDocument === 'undefined' && data.childNodes)
    )
      result = _osmXML2geoJSON(data);
    else result = _overpassJSON2geoJSON(data);
    return result;
    function _overpassJSON2geoJSON(json2) {
      var nodes = new Array();
      var ways = new Array();
      var rels = new Array();
      function centerGeometry(object) {
        var pseudoNode = _.clone(object);
        pseudoNode.lat = object.center.lat;
        pseudoNode.lon = object.center.lon;
        pseudoNode.__is_center_placeholder = true;
        nodes.push(pseudoNode);
      }
      function boundsGeometry(object) {
        var pseudoWay = _.clone(object);
        pseudoWay.nodes = [];
        function addPseudoNode(lat, lon, i2) {
          var pseudoNode = {
            type: 'node',
            id: '_' + pseudoWay.type + '/' + pseudoWay.id + 'bounds' + i2,
            lat,
            lon,
          };
          pseudoWay.nodes.push(pseudoNode.id);
          nodes.push(pseudoNode);
        }
        addPseudoNode(pseudoWay.bounds.minlat, pseudoWay.bounds.minlon, 1);
        addPseudoNode(pseudoWay.bounds.maxlat, pseudoWay.bounds.minlon, 2);
        addPseudoNode(pseudoWay.bounds.maxlat, pseudoWay.bounds.maxlon, 3);
        addPseudoNode(pseudoWay.bounds.minlat, pseudoWay.bounds.maxlon, 4);
        pseudoWay.nodes.push(pseudoWay.nodes[0]);
        pseudoWay.__is_bounds_placeholder = true;
        ways.push(pseudoWay);
      }
      function fullGeometryWay(way2) {
        function addFullGeometryNode(lat, lon, id) {
          var geometryNode = {
            type: 'node',
            id,
            lat,
            lon,
          };
          nodes.push(geometryNode);
        }
        if (!_.isArray(way2.nodes)) {
          way2.nodes = way2.geometry.map(function (nd) {
            if (nd !== null) return '_anonymous@' + nd.lat + '/' + nd.lon;
            else return '_anonymous@unknown_location';
          });
        }
        way2.geometry.forEach(function (nd, i2) {
          if (nd) {
            addFullGeometryNode(nd.lat, nd.lon, way2.nodes[i2]);
          }
        });
      }
      function fullGeometryRelation(rel2) {
        function addFullGeometryNode(lat, lon, id) {
          var geometryNode = {
            type: 'node',
            id,
            lat,
            lon,
          };
          nodes.push(geometryNode);
        }
        function addFullGeometryWay(geometry, id) {
          if (
            ways.some(function (way2) {
              return way2.type == 'way' && way2.id == id;
            })
          )
            return;
          var geometryWay = {
            type: 'way',
            id,
            nodes: [],
          };
          function addFullGeometryWayPseudoNode(lat, lon) {
            var geometryPseudoNode = {
              type: 'node',
              id: '_anonymous@' + lat + '/' + lon,
              lat,
              lon,
            };
            geometryWay.nodes.push(geometryPseudoNode.id);
            nodes.push(geometryPseudoNode);
          }
          geometry.forEach(function (nd) {
            if (nd) {
              addFullGeometryWayPseudoNode(nd.lat, nd.lon);
            } else {
              geometryWay.nodes.push(void 0);
            }
          });
          ways.push(geometryWay);
        }
        rel2.members.forEach(function (member, i2) {
          if (member.type == 'node') {
            if (member.lat) {
              addFullGeometryNode(member.lat, member.lon, member.ref);
            }
          } else if (member.type == 'way') {
            if (member.geometry) {
              member.ref = '_fullGeom' + member.ref;
              addFullGeometryWay(member.geometry, member.ref);
            }
          }
        });
      }
      for (var i = 0; i < json2.elements.length; i++) {
        switch (json2.elements[i].type) {
          case 'node':
            var node = json2.elements[i];
            nodes.push(node);
            break;
          case 'way':
            var way = _.clone(json2.elements[i]);
            way.nodes = _.clone(way.nodes);
            ways.push(way);
            if (way.center) centerGeometry(way);
            if (way.geometry) fullGeometryWay(way);
            else if (way.bounds) boundsGeometry(way);
            break;
          case 'relation':
            var rel = _.clone(json2.elements[i]);
            rel.members = _.clone(rel.members);
            rels.push(rel);
            var has_full_geometry =
              rel.members &&
              rel.members.some(function (member) {
                return (
                  (member.type == 'node' && member.lat) ||
                  (member.type == 'way' &&
                    member.geometry &&
                    member.geometry.length > 0)
                );
              });
            if (rel.center) centerGeometry(rel);
            if (has_full_geometry) fullGeometryRelation(rel);
            else if (rel.bounds) boundsGeometry(rel);
            break;
        }
      }
      return _convert2geoJSON(nodes, ways, rels);
    }
    function _osmXML2geoJSON(xml) {
      var nodes = new Array();
      var ways = new Array();
      var rels = new Array();
      function copy_attribute(x, o, attr) {
        if (x.hasAttribute(attr)) o[attr] = x.getAttribute(attr);
      }
      function centerGeometry(object, centroid3) {
        var pseudoNode = _.clone(object);
        copy_attribute(centroid3, pseudoNode, 'lat');
        copy_attribute(centroid3, pseudoNode, 'lon');
        pseudoNode.__is_center_placeholder = true;
        nodes.push(pseudoNode);
      }
      function boundsGeometry(object, bounds2) {
        var pseudoWay = _.clone(object);
        pseudoWay.nodes = [];
        function addPseudoNode(lat, lon, i) {
          var pseudoNode = {
            type: 'node',
            id: '_' + pseudoWay.type + '/' + pseudoWay.id + 'bounds' + i,
            lat,
            lon,
          };
          pseudoWay.nodes.push(pseudoNode.id);
          nodes.push(pseudoNode);
        }
        addPseudoNode(
          bounds2.getAttribute('minlat'),
          bounds2.getAttribute('minlon'),
          1,
        );
        addPseudoNode(
          bounds2.getAttribute('maxlat'),
          bounds2.getAttribute('minlon'),
          2,
        );
        addPseudoNode(
          bounds2.getAttribute('maxlat'),
          bounds2.getAttribute('maxlon'),
          3,
        );
        addPseudoNode(
          bounds2.getAttribute('minlat'),
          bounds2.getAttribute('maxlon'),
          4,
        );
        pseudoWay.nodes.push(pseudoWay.nodes[0]);
        pseudoWay.__is_bounds_placeholder = true;
        ways.push(pseudoWay);
      }
      function fullGeometryWay(way, nds) {
        function addFullGeometryNode(lat, lon, id) {
          var geometryNode = {
            type: 'node',
            id,
            lat,
            lon,
          };
          nodes.push(geometryNode);
          return geometryNode.id;
        }
        if (!_.isArray(way.nodes)) {
          way.nodes = [];
          _.each(nds, function (nd, i) {
            way.nodes.push(
              '_anonymous@' +
                nd.getAttribute('lat') +
                '/' +
                nd.getAttribute('lon'),
            );
          });
        }
        _.each(nds, function (nd, i) {
          if (nd.getAttribute('lat')) {
            addFullGeometryNode(
              nd.getAttribute('lat'),
              nd.getAttribute('lon'),
              way.nodes[i],
            );
          }
        });
      }
      function fullGeometryRelation(rel, members) {
        function addFullGeometryNode(lat, lon, id) {
          var geometryNode = {
            type: 'node',
            id,
            lat,
            lon,
          };
          nodes.push(geometryNode);
        }
        function addFullGeometryWay(nds, id) {
          if (
            ways.some(function (way) {
              return way.type == 'way' && way.id == id;
            })
          )
            return;
          var geometryWay = {
            type: 'way',
            id,
            nodes: [],
          };
          function addFullGeometryWayPseudoNode(lat, lon) {
            var geometryPseudoNode = {
              type: 'node',
              id: '_anonymous@' + lat + '/' + lon,
              lat,
              lon,
            };
            geometryWay.nodes.push(geometryPseudoNode.id);
            nodes.push(geometryPseudoNode);
          }
          _.each(nds, function (nd) {
            if (nd.getAttribute('lat')) {
              addFullGeometryWayPseudoNode(
                nd.getAttribute('lat'),
                nd.getAttribute('lon'),
              );
            } else {
              geometryWay.nodes.push(void 0);
            }
          });
          ways.push(geometryWay);
        }
        _.each(members, function (member, i) {
          if (rel.members[i].type == 'node') {
            if (member.getAttribute('lat')) {
              addFullGeometryNode(
                member.getAttribute('lat'),
                member.getAttribute('lon'),
                rel.members[i].ref,
              );
            }
          } else if (rel.members[i].type == 'way') {
            if (member.getElementsByTagName('nd').length > 0) {
              rel.members[i].ref = '_fullGeom' + rel.members[i].ref;
              addFullGeometryWay(
                member.getElementsByTagName('nd'),
                rel.members[i].ref,
              );
            }
          }
        });
      }
      _.each(xml.getElementsByTagName('node'), function (node, i) {
        var tags2 = {};
        _.each(node.getElementsByTagName('tag'), function (tag) {
          tags2[tag.getAttribute('k')] = tag.getAttribute('v');
        });
        var nodeObject = {
          type: 'node',
        };
        copy_attribute(node, nodeObject, 'id');
        copy_attribute(node, nodeObject, 'lat');
        copy_attribute(node, nodeObject, 'lon');
        copy_attribute(node, nodeObject, 'version');
        copy_attribute(node, nodeObject, 'timestamp');
        copy_attribute(node, nodeObject, 'changeset');
        copy_attribute(node, nodeObject, 'uid');
        copy_attribute(node, nodeObject, 'user');
        if (!_.isEmpty(tags2)) nodeObject.tags = tags2;
        nodes.push(nodeObject);
      });
      var centroid2, bounds;
      _.each(xml.getElementsByTagName('way'), function (way, i) {
        var tags2 = {};
        var wnodes = [];
        _.each(way.getElementsByTagName('tag'), function (tag) {
          tags2[tag.getAttribute('k')] = tag.getAttribute('v');
        });
        var has_full_geometry = false;
        _.each(way.getElementsByTagName('nd'), function (nd, i2) {
          var id;
          if ((id = nd.getAttribute('ref'))) wnodes[i2] = id;
          if (!has_full_geometry && nd.getAttribute('lat'))
            has_full_geometry = true;
        });
        var wayObject = {
          type: 'way',
        };
        copy_attribute(way, wayObject, 'id');
        copy_attribute(way, wayObject, 'version');
        copy_attribute(way, wayObject, 'timestamp');
        copy_attribute(way, wayObject, 'changeset');
        copy_attribute(way, wayObject, 'uid');
        copy_attribute(way, wayObject, 'user');
        if (wnodes.length > 0) wayObject.nodes = wnodes;
        if (!_.isEmpty(tags2)) wayObject.tags = tags2;
        if ((centroid2 = way.getElementsByTagName('center')[0]))
          centerGeometry(wayObject, centroid2);
        if (has_full_geometry)
          fullGeometryWay(wayObject, way.getElementsByTagName('nd'));
        else if ((bounds = way.getElementsByTagName('bounds')[0]))
          boundsGeometry(wayObject, bounds);
        ways.push(wayObject);
      });
      _.each(xml.getElementsByTagName('relation'), function (relation, i) {
        var tags2 = {};
        var members = [];
        _.each(relation.getElementsByTagName('tag'), function (tag) {
          tags2[tag.getAttribute('k')] = tag.getAttribute('v');
        });
        var has_full_geometry = false;
        _.each(relation.getElementsByTagName('member'), function (member, i2) {
          members[i2] = {};
          copy_attribute(member, members[i2], 'ref');
          copy_attribute(member, members[i2], 'role');
          copy_attribute(member, members[i2], 'type');
          if (
            (!has_full_geometry &&
              members[i2].type == 'node' &&
              member.getAttribute('lat')) ||
            (members[i2].type == 'way' &&
              member.getElementsByTagName('nd').length > 0)
          )
            has_full_geometry = true;
        });
        var relObject = {
          type: 'relation',
        };
        copy_attribute(relation, relObject, 'id');
        copy_attribute(relation, relObject, 'version');
        copy_attribute(relation, relObject, 'timestamp');
        copy_attribute(relation, relObject, 'changeset');
        copy_attribute(relation, relObject, 'uid');
        copy_attribute(relation, relObject, 'user');
        if (members.length > 0) relObject.members = members;
        if (!_.isEmpty(tags2)) relObject.tags = tags2;
        if ((centroid2 = relation.getElementsByTagName('center')[0]))
          centerGeometry(relObject, centroid2);
        if (has_full_geometry)
          fullGeometryRelation(
            relObject,
            relation.getElementsByTagName('member'),
          );
        else if ((bounds = relation.getElementsByTagName('bounds')[0]))
          boundsGeometry(relObject, bounds);
        rels.push(relObject);
      });
      return _convert2geoJSON(nodes, ways, rels);
    }
    function _convert2geoJSON(nodes, ways, rels) {
      function has_interesting_tags(t, ignore_tags) {
        if (typeof ignore_tags !== 'object') ignore_tags = {};
        if (typeof options.uninterestingTags === 'function')
          return !options.uninterestingTags(t, ignore_tags);
        for (var k in t)
          if (
            !(options.uninterestingTags[k] === true) &&
            !(ignore_tags[k] === true || ignore_tags[k] === t[k])
          )
            return true;
        return false;
      }
      function build_meta_information(object) {
        var res = {
          timestamp: object.timestamp,
          version: object.version,
          changeset: object.changeset,
          user: object.user,
          uid: object.uid,
        };
        for (var k in res) if (res[k] === void 0) delete res[k];
        return res;
      }
      var nodeids = new Object();
      var poinids = new Object();
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (nodeids[node.id] !== void 0) {
          node = options.deduplicator(node, nodeids[node.id]);
        }
        nodeids[node.id] = node;
        if (typeof node.tags != 'undefined' && has_interesting_tags(node.tags))
          poinids[node.id] = true;
      }
      for (var i = 0; i < rels.length; i++) {
        if (_.isArray(rels[i].members)) {
          for (var j = 0; j < rels[i].members.length; j++) {
            if (rels[i].members[j].type == 'node')
              poinids[rels[i].members[j].ref] = true;
          }
        }
      }
      var wayids = new Object();
      var waynids = new Object();
      for (var i = 0; i < ways.length; i++) {
        var way = ways[i];
        if (wayids[way.id]) {
          way = options.deduplicator(way, wayids[way.id]);
        }
        wayids[way.id] = way;
        if (_.isArray(way.nodes)) {
          for (var j = 0; j < way.nodes.length; j++) {
            if (typeof way.nodes[j] === 'object') continue;
            waynids[way.nodes[j]] = true;
            way.nodes[j] = nodeids[way.nodes[j]];
          }
        }
      }
      var pois = new Array();
      for (var id in nodeids) {
        var node = nodeids[id];
        if (!waynids[id] || poinids[id]) pois.push(node);
      }
      var relids = new Array();
      for (var i = 0; i < rels.length; i++) {
        var rel = rels[i];
        if (relids[rel.id]) {
          rel = options.deduplicator(rel, relids[rel.id]);
        }
        relids[rel.id] = rel;
      }
      var relsmap = { node: {}, way: {}, relation: {} };
      for (var id in relids) {
        var rel = relids[id];
        if (!_.isArray(rel.members)) {
          if (options.verbose)
            console.warn(
              'Relation',
              rel.type + '/' + rel.id,
              'ignored because it has no members',
            );
          continue;
        }
        for (var j = 0; j < rel.members.length; j++) {
          var m_type = rel.members[j].type;
          var m_ref = rel.members[j].ref;
          if (typeof m_ref !== 'number') {
            m_ref = m_ref.replace('_fullGeom', '');
          }
          if (!relsmap[m_type]) {
            if (options.verbose)
              console.warn(
                'Relation',
                rel.type + '/' + rel.id,
                'member',
                m_type + '/' + m_ref,
                'ignored because it has an invalid type',
              );
            continue;
          }
          if (typeof relsmap[m_type][m_ref] === 'undefined')
            relsmap[m_type][m_ref] = [];
          relsmap[m_type][m_ref].push({
            role: rel.members[j].role,
            rel: rel.id,
            reltags: rel.tags,
          });
        }
      }
      var geojson;
      var geojsonnodes = [];
      for (i = 0; i < pois.length; i++) {
        if (
          typeof pois[i].lon == 'undefined' ||
          typeof pois[i].lat == 'undefined'
        ) {
          if (options.verbose)
            console.warn(
              'POI',
              pois[i].type + '/' + pois[i].id,
              'ignored because it lacks coordinates',
            );
          continue;
        }
        var feature2 = {
          type: 'Feature',
          id: pois[i].type + '/' + pois[i].id,
          properties: {
            type: pois[i].type,
            id: pois[i].id,
            tags: pois[i].tags || {},
            relations: relsmap['node'][pois[i].id] || [],
            meta: build_meta_information(pois[i]),
          },
          geometry: {
            type: 'Point',
            coordinates: [+pois[i].lon, +pois[i].lat],
          },
        };
        if (pois[i].__is_center_placeholder)
          feature2.properties['geometry'] = 'center';
        if (!featureCallback) geojsonnodes.push(feature2);
        else featureCallback(feature2);
      }
      var geojsonlines = [];
      var geojsonpolygons = [];
      for (var i = 0; i < rels.length; i++) {
        if (relids[rels[i].id] !== rels[i]) {
          continue;
        }
        if (
          typeof rels[i].tags != 'undefined' &&
          (rels[i].tags['type'] == 'route' ||
            rels[i].tags['type'] == 'waterway')
        ) {
          let construct_multilinestring = function (rel2) {
            var is_tainted = false;
            var members;
            members = rel2.members.filter(function (m) {
              return m.type === 'way';
            });
            members = members.map(function (m) {
              var way2 = wayids[m.ref];
              if (way2 === void 0 || way2.nodes === void 0) {
                if (options.verbose)
                  console.warn(
                    'Route ' + rel2.type + '/' + rel2.id,
                    'tainted by a missing or incomplete  way',
                    m.type + '/' + m.ref,
                  );
                is_tainted = true;
                return;
              }
              return {
                // TODO: this is slow! :(
                id: m.ref,
                role: m.role,
                way: way2,
                nodes: way2.nodes.filter(function (n) {
                  if (n !== void 0) return true;
                  is_tainted = true;
                  if (options.verbose)
                    console.warn(
                      'Route',
                      rel2.type + '/' + rel2.id,
                      'tainted by a way',
                      m.type + '/' + m.ref,
                      'with a missing node',
                    );
                  return false;
                }),
              };
            });
            members = _.compact(members);
            var linestrings;
            linestrings = join(members);
            var coords2 = [];
            coords2 = _.compact(
              linestrings.map(function (linestring) {
                return _.compact(
                  linestring.map(function (node2) {
                    return [+node2.lon, +node2.lat];
                  }),
                );
              }),
            );
            if (coords2.length == 0) {
              if (options.verbose)
                console.warn(
                  'Route',
                  rel2.type + '/' + rel2.id,
                  'contains no coordinates',
                );
              return false;
            }
            var feature3 = {
              type: 'Feature',
              id: rel2.type + '/' + rel2.id,
              properties: {
                type: rel2.type,
                id: rel2.id,
                tags: rel2.tags || {},
                relations: relsmap[rel2.type][rel2.id] || [],
                meta: build_meta_information(rel2),
              },
              geometry: {
                type: coords2.length === 1 ? 'LineString' : 'MultiLineString',
                coordinates: coords2.length === 1 ? coords2[0] : coords2,
              },
            };
            if (is_tainted) {
              if (options.verbose)
                console.warn('Route', rel2.type + '/' + rel2.id, 'is tainted');
              feature3.properties['tainted'] = true;
            }
            return feature3;
          };
          if (!_.isArray(rels[i].members)) {
            if (options.verbose)
              console.warn(
                'Route',
                rels[i].type + '/' + rels[i].id,
                'ignored because it has no members',
              );
            continue;
          }
          rels[i].members.forEach(function (m) {
            if (wayids[m.ref] && !has_interesting_tags(wayids[m.ref].tags))
              wayids[m.ref].is_skippablerelationmember = true;
          });
          feature2 = construct_multilinestring(rels[i]);
          if (feature2 === false) {
            if (options.verbose)
              console.warn(
                'Route relation',
                rels[i].type + '/' + rels[i].id,
                'ignored because it has invalid geometry',
              );
            continue;
          }
          if (!featureCallback) geojsonpolygons.push(feature2);
          else featureCallback(rewind(feature2));
        }
        if (
          typeof rels[i].tags != 'undefined' &&
          (rels[i].tags['type'] == 'multipolygon' ||
            rels[i].tags['type'] == 'boundary')
        ) {
          let construct_multipolygon = function (tag_object, rel2) {
            var is_tainted = false;
            var mp_geometry = simple_mp ? 'way' : 'relation',
              mp_id =
                typeof tag_object.id === 'number'
                  ? tag_object.id
                  : +tag_object.id.replace('_fullGeom', '');
            var members;
            members = rel2.members.filter(function (m) {
              return m.type === 'way';
            });
            members = members.map(function (m) {
              var way2 = wayids[m.ref];
              if (way2 === void 0 || way2.nodes === void 0) {
                if (options.verbose)
                  console.warn(
                    'Multipolygon',
                    mp_geometry + '/' + mp_id,
                    'tainted by a missing or incomplete way',
                    m.type + '/' + m.ref,
                  );
                is_tainted = true;
                return;
              }
              return {
                // TODO: this is slow! :(
                id: m.ref,
                role: m.role || 'outer',
                way: way2,
                nodes: way2.nodes.filter(function (n) {
                  if (n !== void 0) return true;
                  is_tainted = true;
                  if (options.verbose)
                    console.warn(
                      'Multipolygon',
                      mp_geometry + '/' + mp_id,
                      'tainted by a way',
                      m.type + '/' + m.ref,
                      'with a missing node',
                    );
                  return false;
                }),
              };
            });
            members = _.compact(members);
            var outers, inners;
            outers = join(
              members.filter(function (m) {
                return m.role === 'outer';
              }),
            );
            inners = join(
              members.filter(function (m) {
                return m.role === 'inner';
              }),
            );
            var mp;
            function findOuter(inner) {
              var polygonIntersectsPolygon = function (outer2, inner2) {
                for (var i2 = 0; i2 < inner2.length; i2++)
                  if (pointInPolygon2(inner2[i2], outer2)) return true;
                return false;
              };
              var mapCoordinates = function (from) {
                return from.map(function (n) {
                  return [+n.lat, +n.lon];
                });
              };
              var pointInPolygon2 = function (point2, polygon2) {
                var x = point2[0],
                  y = point2[1],
                  inside = false;
                for (
                  var i2 = 0, j3 = polygon2.length - 1;
                  i2 < polygon2.length;
                  j3 = i2++
                ) {
                  var xi = polygon2[i2][0],
                    yi = polygon2[i2][1];
                  var xj = polygon2[j3][0],
                    yj = polygon2[j3][1];
                  var intersect2 =
                    yi > y != yj > y &&
                    x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
                  if (intersect2) inside = !inside;
                }
                return inside;
              };
              var o2, outer;
              inner = mapCoordinates(inner);
              for (o2 = 0; o2 < outers.length; o2++) {
                outer = mapCoordinates(outers[o2]);
                if (polygonIntersectsPolygon(outer, inner)) return o2;
              }
            }
            mp = outers.map(function (o2) {
              return [o2];
            });
            for (var j2 = 0; j2 < inners.length; j2++) {
              var o = findOuter(inners[j2]);
              if (o !== void 0) mp[o].push(inners[j2]);
              else if (options.verbose)
                console.warn(
                  'Multipolygon',
                  mp_geometry + '/' + mp_id,
                  'contains an inner ring with no containing outer',
                );
            }
            var mp_coords = [];
            mp_coords = _.compact(
              mp.map(function (cluster) {
                var cl = _.compact(
                  cluster.map(function (ring) {
                    if (ring.length < 4) {
                      if (options.verbose)
                        console.warn(
                          'Multipolygon',
                          mp_geometry + '/' + mp_id,
                          'contains a ring with less than four nodes',
                        );
                      return;
                    }
                    return _.compact(
                      ring.map(function (node2) {
                        return [+node2.lon, +node2.lat];
                      }),
                    );
                  }),
                );
                if (cl.length == 0) {
                  if (options.verbose)
                    console.warn(
                      'Multipolygon',
                      mp_geometry + '/' + mp_id,
                      'contains an empty ring cluster',
                    );
                  return;
                }
                return cl;
              }),
            );
            if (mp_coords.length == 0) {
              if (options.verbose)
                console.warn(
                  'Multipolygon',
                  mp_geometry + '/' + mp_id,
                  'contains no coordinates',
                );
              return false;
            }
            var mp_type = 'MultiPolygon';
            if (mp_coords.length === 1) {
              mp_type = 'Polygon';
              mp_coords = mp_coords[0];
            }
            var feature3 = {
              type: 'Feature',
              id: tag_object.type + '/' + mp_id,
              properties: {
                type: tag_object.type,
                id: mp_id,
                tags: tag_object.tags || {},
                relations: relsmap[tag_object.type][tag_object.id] || [],
                meta: build_meta_information(tag_object),
              },
              geometry: {
                type: mp_type,
                coordinates: mp_coords,
              },
            };
            if (is_tainted) {
              if (options.verbose)
                console.warn(
                  'Multipolygon',
                  mp_geometry + '/' + mp_id,
                  'is tainted',
                );
              feature3.properties['tainted'] = true;
            }
            return feature3;
          };
          if (!_.isArray(rels[i].members)) {
            if (options.verbose)
              console.warn(
                'Multipolygon',
                rels[i].type + '/' + rels[i].id,
                'ignored because it has no members',
              );
            continue;
          }
          var outer_count = 0;
          for (var j = 0; j < rels[i].members.length; j++)
            if (rels[i].members[j].role == 'outer') outer_count++;
            else if (options.verbose && rels[i].members[j].role != 'inner')
              console.warn(
                'Multipolygon',
                rels[i].type + '/' + rels[i].id,
                'member',
                rels[i].members[j].type + '/' + rels[i].members[j].ref,
                'ignored because it has an invalid role: "' +
                  rels[i].members[j].role +
                  '"',
              );
          rels[i].members.forEach(function (m) {
            if (wayids[m.ref]) {
              if (
                m.role === 'outer' &&
                !has_interesting_tags(wayids[m.ref].tags, rels[i].tags)
              )
                wayids[m.ref].is_skippablerelationmember = true;
              if (
                m.role === 'inner' &&
                !has_interesting_tags(wayids[m.ref].tags)
              )
                wayids[m.ref].is_skippablerelationmember = true;
            }
          });
          if (outer_count == 0) {
            if (options.verbose)
              console.warn(
                'Multipolygon relation',
                rels[i].type + '/' + rels[i].id,
                'ignored because it has no outer ways',
              );
            continue;
          }
          var simple_mp = false;
          if (
            outer_count == 1 &&
            !has_interesting_tags(rels[i].tags, { type: true })
          )
            simple_mp = true;
          var feature2 = null;
          if (!simple_mp) {
            feature2 = construct_multipolygon(rels[i], rels[i]);
          } else {
            var outer_way = rels[i].members.filter(function (m) {
              return m.role === 'outer';
            })[0];
            outer_way = wayids[outer_way.ref];
            if (outer_way === void 0) {
              if (options.verbose)
                console.warn(
                  'Multipolygon relation',
                  rels[i].type + '/' + rels[i].id,
                  'ignored because outer way',
                  outer_way.type + '/' + outer_way.ref,
                  'is missing',
                );
              continue;
            }
            outer_way.is_skippablerelationmember = true;
            feature2 = construct_multipolygon(outer_way, rels[i]);
          }
          if (feature2 === false) {
            if (options.verbose)
              console.warn(
                'Multipolygon relation',
                rels[i].type + '/' + rels[i].id,
                'ignored because it has invalid geometry',
              );
            continue;
          }
          if (!featureCallback) geojsonpolygons.push(feature2);
          else featureCallback(rewind(feature2));
        }
      }
      for (var i = 0; i < ways.length; i++) {
        if (wayids[ways[i].id] !== ways[i]) {
          continue;
        }
        if (!_.isArray(ways[i].nodes)) {
          if (options.verbose)
            console.warn(
              'Way',
              ways[i].type + '/' + ways[i].id,
              'ignored because it has no nodes',
            );
          continue;
        }
        if (ways[i].is_skippablerelationmember) continue;
        if (typeof ways[i].id !== 'number') {
          ways[i].id = +ways[i].id.replace('_fullGeom', '');
        }
        ways[i].tainted = false;
        ways[i].hidden = false;
        var coords = new Array();
        for (j = 0; j < ways[i].nodes.length; j++) {
          if (typeof ways[i].nodes[j] == 'object')
            coords.push([+ways[i].nodes[j].lon, +ways[i].nodes[j].lat]);
          else {
            if (options.verbose)
              console.warn(
                'Way',
                ways[i].type + '/' + ways[i].id,
                'is tainted by an invalid node',
              );
            ways[i].tainted = true;
          }
        }
        if (coords.length <= 1) {
          if (options.verbose)
            console.warn(
              'Way',
              ways[i].type + '/' + ways[i].id,
              'ignored because it contains too few nodes',
            );
          continue;
        }
        var way_type = 'LineString';
        if (
          typeof ways[i].nodes[0] != 'undefined' &&
          typeof ways[i].nodes[ways[i].nodes.length - 1] != 'undefined' && // way has its start/end nodes loaded
          ways[i].nodes[0].id === ways[i].nodes[ways[i].nodes.length - 1].id && // ... and forms a closed ring
          ((typeof ways[i].tags != 'undefined' && // ... and has tags
            _isPolygonFeature(ways[i].tags)) || // or is a placeholder for a bounds geometry
            ways[i].__is_bounds_placeholder)
        ) {
          way_type = 'Polygon';
          coords = [coords];
        }
        var feature2 = {
          type: 'Feature',
          id: ways[i].type + '/' + ways[i].id,
          properties: {
            type: ways[i].type,
            id: ways[i].id,
            tags: ways[i].tags || {},
            relations: relsmap['way'][ways[i].id] || [],
            meta: build_meta_information(ways[i]),
          },
          geometry: {
            type: way_type,
            coordinates: coords,
          },
        };
        if (ways[i].tainted) {
          if (options.verbose)
            console.warn('Way', ways[i].type + '/' + ways[i].id, 'is tainted');
          feature2.properties['tainted'] = true;
        }
        if (ways[i].__is_bounds_placeholder)
          feature2.properties['geometry'] = 'bounds';
        if (!featureCallback) {
          if (way_type == 'LineString') geojsonlines.push(feature2);
          else geojsonpolygons.push(feature2);
        } else {
          featureCallback(rewind(feature2));
        }
      }
      if (featureCallback) return true;
      geojson = {
        type: 'FeatureCollection',
        features: [],
      };
      geojson.features = geojson.features.concat(geojsonpolygons);
      geojson.features = geojson.features.concat(geojsonlines);
      geojson.features = geojson.features.concat(geojsonnodes);
      if (options.flatProperties) {
        geojson.features.forEach(function (f) {
          f.properties = _.merge(f.properties.meta, f.properties.tags, {
            id: f.properties.type + '/' + f.properties.id,
          });
        });
      }
      geojson = rewind(geojson);
      return geojson;
    }
    function _isPolygonFeature(tags2) {
      var polygonFeatures2 = options.polygonFeatures;
      if (typeof polygonFeatures2 === 'function')
        return polygonFeatures2(tags2);
      if (tags2['area'] === 'no') return false;
      for (var key in tags2) {
        var val = tags2[key];
        var pfk = polygonFeatures2[key];
        if (typeof pfk === 'undefined') continue;
        if (val === 'no') continue;
        if (pfk === true) return true;
        if (pfk.included_values && pfk.included_values[val] === true)
          return true;
        if (pfk.excluded_values && pfk.excluded_values[val] !== true)
          return true;
      }
      return false;
    }
  };
  function join(ways) {
    var _first = function (arr) {
      return arr[0];
    };
    var _last = function (arr) {
      return arr[arr.length - 1];
    };
    var _fitTogether = function (n1, n2) {
      return n1 !== void 0 && n2 !== void 0 && n1.id === n2.id;
    };
    var joined = [],
      current,
      first,
      last,
      i,
      how,
      what;
    while (ways.length) {
      current = ways.pop().nodes.slice();
      joined.push(current);
      while (ways.length && !_fitTogether(_first(current), _last(current))) {
        first = _first(current);
        last = _last(current);
        for (i = 0; i < ways.length; i++) {
          what = ways[i].nodes;
          if (_fitTogether(last, _first(what))) {
            how = current.push;
            what = what.slice(1);
            break;
          } else if (_fitTogether(last, _last(what))) {
            how = current.push;
            what = what.slice(0, -1).reverse();
            break;
          } else if (_fitTogether(first, _last(what))) {
            how = current.unshift;
            what = what.slice(0, -1);
            break;
          } else if (_fitTogether(first, _first(what))) {
            how = current.unshift;
            what = what.slice(1).reverse();
            break;
          } else {
            what = how = null;
          }
        }
        if (!what) break;
        ways.splice(i, 1);
        how.apply(current, what);
      }
    }
    return joined;
  }
  osmtogeojson2.toGeojson = osmtogeojson2;
  osmtogeojson_1 = osmtogeojson2;
  return osmtogeojson_1;
}
var osmtogeojsonExports = requireOsmtogeojson();
const osmtogeojson =
  /* @__PURE__ */ getDefaultExportFromCjs(osmtogeojsonExports);
const COUNTY_LSADC_UNIT_TYPE_MAP = {
  '00': 'County Equivalent',
  '03': 'City and Borough',
  '04': 'Borough',
  '05': 'Census Area',
  '06': 'County',
  '07': 'District',
  10: 'Island',
  12: 'Municipality',
  13: 'Municipio',
  15: 'Parish',
  25: 'City',
  PL: 'Planning Region',
};
const COUNTY_SUBDIVISION_LSADC_UNIT_TYPE_MAP = {
  '00': 'Subdivision',
  20: 'Barrio',
  21: 'Borough',
  22: 'Census County Division',
  23: 'Census Subarea',
  24: 'Subdistrict',
  25: 'City',
  26: 'County',
  27: 'District',
  28: 'District',
  29: 'Precinct',
  30: 'Precinct',
  31: 'Gore',
  32: 'Grant',
  36: 'Location',
  37: 'Municipality',
  39: 'Plantation',
  41: 'Barrio-Pueblo',
  42: 'Purchase',
  43: 'Town',
  44: 'Township',
  45: 'Township',
  46: 'Unorganized Territory',
  47: 'Village',
  49: 'Charter Township',
  53: 'City and Borough',
  55: 'Comunidad',
  57: 'Census Designated Place',
  62: 'Zona Urbana',
  86: 'Reservation',
  CG: 'Consolidated Government',
  CN: 'Corporation',
  MG: 'Metropolitan Government',
  MT: 'Metro Government',
  UC: 'Urban County',
  UG: 'Unified Government',
};
const US_DATA_CONFIGS = {
  counties: {
    datasetId: 'counties',
    displayName: 'Counties',
    unitSingular: 'County',
    unitPlural: 'Counties',
    source: 'US Census Bureau',
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['NAME'],
    unitTypeProperty: 'LSADC',
    unitTypeCodeMap: COUNTY_LSADC_UNIT_TYPE_MAP,
  },
  'county-subdivisions': {
    datasetId: 'county-subdivisions',
    displayName: 'County Subdivisions',
    unitSingular: 'County Subdivision',
    unitPlural: 'County Subdivisions',
    source: 'US Census Bureau',
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['BASENAME', 'NAME'],
    unitTypeProperty: 'LSADC',
    unitTypeCodeMap: COUNTY_SUBDIVISION_LSADC_UNIT_TYPE_MAP,
  },
  zctas: {
    datasetId: 'zctas',
    displayName: 'ZIP Code Tabulation Areas',
    unitSingular: 'ZCTA',
    unitPlural: 'ZCTAs',
    source: 'US Census Bureau',
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['BASENAME', 'NAME'],
  },
  neighborhoods: {
    datasetId: 'neighborhoods',
    displayName: 'Neighborhoods',
    unitSingular: 'Neighborhood',
    unitPlural: 'Neighborhoods',
    source: 'OSM',
    idProperty: 'id',
    nameProperty: 'name',
    applicableNameProperties: ['name'],
    populationProperty: 'population',
  },
};
const US_BOUNDARY_DATA_HANDLERS = {
  counties: {
    dataConfig: US_DATA_CONFIGS['counties'],
    extractBoundaries: async (bbox2) => extractCountyBoundaries(bbox2),
  },
  'county-subdivisions': {
    dataConfig: US_DATA_CONFIGS['county-subdivisions'],
    extractBoundaries: async (bbox2) =>
      extractCountySubdivisionBoundaries(bbox2),
  },
  zctas: {
    dataConfig: US_DATA_CONFIGS['zctas'],
    extractBoundaries: async (bbox2) => extractZctaBoundaries(bbox2),
  },
  neighborhoods: {
    dataConfig: US_DATA_CONFIGS['neighborhoods'],
    extractBoundaries: async (bbox2) => extractNeighborhoodBoundaries(bbox2),
  },
};
const US_NEIGHBORHOOD_ADMIN_LEVELS = [10];
async function extractCountyBoundaries(bbox2) {
  const geoJson = await fetchGeoJSONFromArcGIS(buildCountyUrl(bbox2));
  const populationMap = await fetchCountyPopulations(
    extractStateCodesFromGeoIDs(geoJson.features),
  );
  return { geoJson, populationMap };
}
async function extractCountySubdivisionBoundaries(bbox2) {
  const cousubFeatures = await fetchCouSubFeatures(bbox2);
  const couSubStates = new Set(cousubFeatures.map((f) => f.properties.STATE));
  const populationMap = /* @__PURE__ */ new Map();
  for (const state of couSubStates) {
    const populations = await fetchCountySubdivisionPopulations(state);
    populations.forEach((population, geoId) => {
      populationMap.set(geoId, population);
    });
  }
  const placeFeatures = await fetchPlaceFeatures(bbox2);
  const placeStates = new Set(placeFeatures.map((f) => f.properties.STATE));
  for (const state of placeStates) {
    const populations = await fetchPlacePopulations(state);
    populations.forEach((population, geoId) => {
      populationMap.set(geoId, population);
    });
  }
  const combinedGeoJson = {
    type: 'FeatureCollection',
    features: [...cousubFeatures, ...placeFeatures],
  };
  return {
    geoJson: combinedGeoJson,
    populationMap,
  };
}
async function extractZctaBoundaries(bbox2) {
  const geoJson = await fetchGeoJSONFromArcGIS(buildZctaUrl(bbox2));
  const populationMap = await fetchZctaPopulations();
  return { geoJson, populationMap };
}
async function extractNeighborhoodBoundaries(bbox2) {
  const query = buildOverpassQuery(bbox2, US_NEIGHBORHOOD_ADMIN_LEVELS, 'US');
  const overpassJson = await fetchOverpassData(query);
  const geoJson = osmtogeojson(overpassJson);
  return { geoJson };
}
async function extractUSBoundaries(args, bbox2) {
  const handler = US_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for US: ${args.dataType}`);
  }
  const { geoJson, populationMap } = await handler.extractBoundaries(
    expandBBox(bbox2, 0.01),
  );
  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount);
    return;
  }
  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox2,
    args,
    handler.dataConfig,
    'US',
  );
}
async function runCountryExtractor(args) {
  const bbox2 = {
    west: args.west,
    south: args.south,
    east: args.east,
    north: args.north,
  };
  switch (args.countryCode) {
    case 'US':
      await extractUSBoundaries(args, bbox2);
      return;
    case 'GB':
      await extractGBBoundaries(args, bbox2);
      return;
    case 'CA':
      await extractCABoundaries(args, bbox2);
      return;
    default:
      throw new Error(`Unsupported countryCode: ${args.countryCode}`);
  }
}
function buildExtractorArgs(request, datasetId) {
  return {
    cityCode: request.cityCode,
    countryCode: request.countryCode,
    dataType: datasetId,
    west: request.bbox.west,
    south: request.bbox.south,
    east: request.bbox.east,
    north: request.bbox.north,
    compress: request.compress,
    outputRoot: request.out,
  };
}
async function runFetch(request) {
  const successes = [];
  const failures = [];
  for (const datasetId of request.datasets) {
    try {
      console.log(
        `[Fetch] Generating ${datasetId} for ${request.cityCode} (${request.countryCode})...`,
      );
      await runCountryExtractor(buildExtractorArgs(request, datasetId));
      successes.push(datasetId);
      console.log(`[Fetch] Completed ${datasetId}.`);
    } catch (error) {
      failures.push({ datasetId, error });
      console.error(`[Fetch] Failed ${datasetId}:`, error);
    }
  }
  return { successes, failures };
}
const FETCH_ELIGIBLE_DATASETS = {
  US: ['counties', 'county-subdivisions', 'zctas', 'neighborhoods'],
  GB: ['districts', 'bua', 'wards'],
  CA: ['feds', 'csds', 'fsas'],
};
function validateFetchRequest(args) {
  const isAvailableCountry = FETCH_ELIGIBLE_DATASETS[args.countryCode];
  if (!isAvailableCountry) {
    throw new Error(`Unsupported countryCode: ${args.countryCode}`);
  }
  if (args.datasets.length === 0) {
    throw new Error('At least one dataset must be specified');
  }
  const disallowedDatasets = args.datasets.filter(
    (datasetId) => !isAvailableCountry.includes(datasetId),
  );
  if (disallowedDatasets.length > 0) {
    throw new Error(
      `Unsupported datasets for ${args.countryCode}: ${disallowedDatasets.join(', ')}. Allowed: ${isAvailableCountry.join(', ')}`,
    );
  }
}
async function main() {
  const request = parseFetchArgs();
  validateFetchRequest(request);
  const result = await runFetch(request);
  console.log(
    `[Fetch] Completed for ${request.cityCode}. Success: ${result.successes.length}, Failed: ${result.failures.length}`,
  );
  if (result.failures.length === request.datasets.length) {
    process.exitCode = 1;
  }
}
void main().catch((error) => {
  console.error('[Fetch] Fatal error:', error);
  process.exit(1);
});
