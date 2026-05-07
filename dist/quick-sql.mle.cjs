if (typeof Buffer === 'undefined') {
    globalThis.Buffer = {
        from: function(arr) {
            if (typeof arr === 'string') return { toString: () => arr };
            return { toString: () => {
                try { return String.fromCharCode.apply(null, arr); } catch(e) { return ''; }
            }};
        }
    };
}
function O(x) {
  if (x == null) return x;
  const e = x.toUpperCase();
  return e.endsWith("IES") ? x.substring(0, x.length - 3) + "y" : e.endsWith("ES") || e.endsWith("S") ? x.substring(0, x.length - 1) : x;
}
function qe(x) {
  if (x == null) return null;
  const n = "$#_ ";
  let t = !1;
  if (!x.startsWith('"')) {
    if (x.length > 0 && x[0] >= "0" && x[0] <= "9")
      t = !0;
    else
      for (const r of x)
        if (!(r >= "a" && r <= "z" || r >= "A" && r <= "Z" || r >= "0" && r <= "9") && !n.includes(r)) {
          t = !0;
          break;
        }
  }
  return (x.startsWith("_") || x.startsWith("$") || x.startsWith("#")) && (t = !0), t ? '"' + x + '"' : x;
}
function fe(x) {
  if (x == null) return null;
  if (x.charAt(0) === '"') return x;
  const e = qe(x);
  return e == null ? null : e.charAt(0) === '"' ? e : e.replace(/ /g, "_");
}
function z(x, e, n) {
  const t = n ?? "";
  let r = !1, o = x, d = e, c = t;
  o.charAt(0) === '"' && (r = !0, o = o.slice(1, -1)), d.charAt(0) === '"' && (r = !0, d = d.slice(1, -1)), c.charAt(0) === '"' && (r = !0, c = c.slice(1, -1));
  const u = o + d + c;
  return r ? '"' + u + '"' : u.toLowerCase();
}
function ie(x) {
  return x.length < 2 ? null : parseInt(x.substring(0, 2));
}
function be(x, e) {
  const n = new Set(e), t = [];
  let r = "";
  for (const o of x)
    n.has(o) ? (r.length > 0 && (t.push(r), r = ""), t.push(o)) : r += o;
  return r.length > 0 && t.push(r), t;
}
const Ye = -10, ye = -11;
class Y {
  constructor(e, n, t, r, o, d = 0) {
    this.type = r, this.value = e, this.begin = n, this.end = t, this.line = o, this.col = d, this.lowerValue = e.toLowerCase();
  }
  toString() {
    return `{type:${this.type},value:${this.value}}`;
  }
  /**
   * Returns the token value, converting backtick-quoted identifiers to Oracle
   * alt-quote syntax `q'[...]'`.
   * NOTE: the backtick conversion path currently returns `this.value` unchanged
   * (pre-existing behaviour — the converted string is built but not returned).
   */
  getValue() {
    return this.value.length < 2 ? this.value : this.value;
  }
  /** True when the token is a standard SQL string literal: 'text' or N'text'. */
  isStandardLiteral() {
    if (this.value.length < 2) return !1;
    const e = this.value.charAt(0);
    if (e !== "'" && e !== "n" && e !== "N") return !1;
    let n = this.value;
    if (e === "n" || e === "N") {
      if (n.length < 3) return !1;
      n = n.substring(1);
    }
    return n.charAt(0) === "'" && n.charAt(n.length - 1) === "'";
  }
  /** True when the token is an Oracle alt-quote literal: q'[...]', nq'[...]', etc. */
  isAltLiteral() {
    if (this.value.length < 5) return !1;
    const e = this.value.charAt(0);
    if (e !== "q" && e !== "Q" && e !== "n" && e !== "N") return !1;
    let n = this.value;
    if (e === "q" || e === "Q")
      n = n.substring(1);
    else if ((e === "n" || e === "N") && (this.value.charAt(1) === "q" || this.value.charAt(1) === "Q")) {
      if (n.length < 6) return !1;
      n = n.substring(2);
    } else
      return !1;
    if (n.charAt(0) === "'" && n.charAt(n.length - 1) === "'")
      n = n.substring(1, n.length - 1);
    else
      return !1;
    return Qe(n.charAt(0)) === n.charAt(n.length - 1);
  }
}
function Qe(x) {
  return x === "<" ? ">" : x === "[" ? "]" : x === "{" ? "}" : x === "(" ? ")" : x;
}
function Ze(x, e, n, t) {
  const r = x.indexOf("e"), o = x.indexOf("f"), d = x.indexOf("d");
  if (r < 0 && o < 0 && d < 0) return !1;
  let c = n;
  const u = be(x, "efd");
  for (const h of u) {
    c += h.length;
    const l = h.charAt(0) >= "0" && h.charAt(0) <= "9" ? "constant.numeric" : "identifier";
    e.push(new Y(h, c - h.length, c, l, t));
  }
  return !0;
}
function Xe(x, e, n) {
  const t = [], r = `(){}[]^-|!*+.><='",;:%@?/\\#~` + n, o = ` 
\r	`, d = be(x, r + o);
  let c = 0, u = 0, h = 0;
  for (let l = 0; l < d.length; l++) {
    const m = d[l], p = t.length > 0 ? t[t.length - 1] : null;
    if (m === `
` ? (u++, h = 0) : h = l > 0 && d[l - 1] !== `
` ? h + d[l - 1].length : 0, c += m.length, p?.type === "comment" && (p.value.lastIndexOf("*/") !== p.value.length - 2 || p.value === "/*/")) {
      p.value = m === "*" || m === "/" ? p.value + m : "/* ... ", p.end = c, p.type === "comment" && p.value.lastIndexOf("*/") === p.value.length - 2 && p.value !== "/*/" && (p.value = x.substring(p.begin, p.end));
      continue;
    }
    if (p !== null && (p.type === "line-comment" || p.type === "dbtools-command")) {
      if (m !== `
`) {
        p.value += m;
        continue;
      }
      p.end = p.begin + p.value.length;
    }
    if (p?.type === "quoted-string" && !(p.isStandardLiteral() || p.isAltLiteral())) {
      p.value += m, p.end = p.begin + p.value.length;
      continue;
    }
    if (p?.type === "dquoted-string" && !(p.value.endsWith('"') && p.value.length > 1)) {
      if (m !== '"') continue;
      p.end = c, p.value = x.substring(p.begin, p.end);
      continue;
    }
    if (p?.type === "bquoted-string" && !(p.value.endsWith("`") && p.value.length > 1)) {
      if (m !== "`") continue;
      p.end = c, p.value = x.substring(p.begin, p.end);
      continue;
    }
    if (m === "*" && p?.value === "/") {
      p.value += m, p.end = p.begin + p.value.length, p.type = "comment";
      continue;
    }
    if (m === "-" && p?.value === "-") {
      p.value += m, p.type = "line-comment";
      continue;
    }
    if (p?.type === "identifier" && p.end === ye && p.value.startsWith("@")) {
      if (m !== `
` && m !== "\r") {
        p.value += m;
        continue;
      }
      p.end = c - 1, t.push(new Y(m, c - 1, c, "ws", u, h));
      continue;
    }
    if (e && m === "'") {
      const b = p !== null && p.value.length <= 2 ? p.value.toLowerCase() : "";
      b === "q" || b === "n" || b === "u" || b === "nq" ? (p.value += m, p.type = "quoted-string") : t.push(new Y(m, c - 1, Ye, "quoted-string", u, h));
      continue;
    }
    if (e && m === '"') {
      t.push(new Y(m, c - 1, ye, "dquoted-string", u, h));
      continue;
    }
    if (m === "`" && r.includes("`")) {
      t.push(new Y(m, c - 1, ye, "bquoted-string", u, h));
      continue;
    }
    if (m.length === 1 && r.includes(m)) {
      t.push(new Y(m, c - 1, c, "operation", u, h));
      continue;
    }
    if (m.length === 1 && o.includes(m)) {
      t.push(new Y(m, c - 1, c, "ws", u, h));
      continue;
    }
    if (m.charAt(0) >= "0" && m.charAt(0) <= "9") {
      if (!Ze(m, t, c - m.length, u)) {
        const b = m.charAt(m.length - 1).toUpperCase();
        "KMGTPE".includes(b) ? (t.push(new Y(m.slice(0, -1), c - m.length, c - 1, "constant.numeric", u, h)), t.push(new Y(m.slice(-1), c - 1, c, "constant.numeric", u, h))) : t.push(new Y(m, c - m.length, c, "constant.numeric", u, h));
      }
      continue;
    }
    t.push(new Y(m, c - m.length, c, "identifier", u, h));
  }
  return t.length > 0 && (t[t.length - 1].end = x.length), t;
}
function le(x, e, n, t) {
  const r = [], o = Xe(x, n, t);
  let d = null;
  for (const c of o) {
    if (c.type === "quoted-string") {
      if (d?.type === "quoted-string") {
        d.value += c.value, d.end = c.end;
        continue;
      }
      if (d?.type === "identifier" && d.value.toUpperCase() === "N" && d.end === c.begin) {
        d.begin = c.begin, d.end = c.end, d.type = c.type, d.value = c.value;
        continue;
      }
    }
    if (c.value.startsWith("@") && (c.end = c.begin + c.value.length), c.value === "#" && d?.type === "identifier") {
      d.end += 1, d.value += "#";
      continue;
    }
    if ((c.type === "identifier" || c.type === "constant.numeric") && d !== null && d.value.endsWith("#") && d.type === "identifier") {
      d.end += c.value.length, d.value += c.value;
      continue;
    }
    c.value.startsWith("$$") && (c.value = "$$VAR"), (e || c.type !== "ws" && c.type !== "comment" && c.type !== "line-comment") && r.push(c), d = c;
  }
  return r;
}
const ea = {
  ACCESS: "N",
  ADD: "N",
  ALL: "Y",
  ALTER: "Y",
  AND: "Y",
  ANY: "Y",
  AS: "Y",
  ASC: "Y",
  AUDIT: "N",
  BETWEEN: "Y",
  BY: "Y",
  CHAR: "Y",
  CHECK: "Y",
  CLUSTER: "Y",
  COLUMN: "N",
  COMMENT: "N",
  COMPRESS: "Y",
  CONNECT: "Y",
  CREATE: "Y",
  CURRENT: "N",
  DATE: "Y",
  DECIMAL: "Y",
  DEFAULT: "Y",
  DELETE: "Y",
  DESC: "Y",
  DISTINCT: "Y",
  DROP: "Y",
  ELSE: "Y",
  EXCEPT: "Y",
  EXCLUSIVE: "Y",
  EXISTS: "Y",
  FILE: "N",
  FLOAT: "Y",
  FOR: "Y",
  FROM: "Y",
  GRANT: "Y",
  GROUP: "Y",
  HAVING: "Y",
  IDENTIFIED: "Y",
  IMMEDIATE: "N",
  IN: "Y",
  INCREMENT: "N",
  INDEX: "Y",
  INITIAL: "N",
  INSERT: "Y",
  INTEGER: "Y",
  INTERSECT: "Y",
  INTO: "Y",
  IS: "Y",
  LEVEL: "N",
  LIKE: "Y",
  LOCK: "Y",
  LONG: "Y",
  MAXEXTENTS: "N",
  MINUS: "Y",
  MLSLABEL: "N",
  MODE: "Y",
  MODIFY: "N",
  NOAUDIT: "N",
  NOCOMPRESS: "Y",
  NOT: "Y",
  NOWAIT: "Y",
  NULL: "Y",
  NUMBER: "Y",
  OF: "Y",
  OFFLINE: "N",
  ON: "Y",
  ONLINE: "N",
  OPTION: "Y",
  OR: "Y",
  ORDER: "Y",
  PCTFREE: "Y",
  PRIOR: "Y",
  PUBLIC: "Y",
  RAW: "Y",
  RENAME: "Y",
  RESOURCE: "Y",
  REVOKE: "Y",
  ROW: "N",
  ROWID: "N",
  ROWNUM: "N",
  ROWS: "N",
  SELECT: "Y",
  SESSION: "N",
  SET: "Y",
  SHARE: "Y",
  SIZE: "Y",
  SMALLINT: "Y",
  START: "Y",
  SUCCESSFUL: "N",
  SYNONYM: "Y",
  SYSDATE: "N",
  TABLE: "Y",
  THEN: "Y",
  TO: "Y",
  TRIGGER: "Y",
  UID: "N",
  UNION: "Y",
  UNIQUE: "Y",
  UPDATE: "Y",
  USER: "N",
  VALIDATE: "N",
  VALUES: "Y",
  VARCHAR: "Y",
  VARCHAR2: "Y",
  VIEW: "Y",
  WHENEVER: "N",
  WHERE: "Y",
  WITH: "Y"
};
function _e(x) {
  return ea[x.toUpperCase()] !== void 0 ? "the_" + x : x;
}
const aa = "timestamp with local time zone", na = "timestamp with time zone", ia = "timestamp", R = {
  pk: "_pk",
  fk: "_fk",
  unq: "_unq",
  uk: "_uk",
  ck: "_ck",
  bet: "_bet",
  bi: "_bi",
  bu: "_bu",
  seq: "_seq",
  idx: "_i",
  immutable_prefix: "trg_",
  immutable_suffix: "_insertonly"
}, i = "    ", ta = ["string", "varchar2", "varchar", "vc", "char"], He = ["yn", "boolean", "bool"], ra = ["vect", "vector"], Se = ["geometry", "sdo_geometry"];
let ue = [
  "integer",
  "number",
  "num",
  "int",
  "blob",
  "clob",
  "json",
  "file",
  "date",
  "d",
  "tstz",
  "tswtz",
  "tswltz",
  "ts"
];
ue = ue.concat(ta).concat(He).concat(ra).concat(Se);
const xe = {
  file: [
    { suffix: "_filename", type: (x) => `varchar2(255${x.semantics()})` },
    { suffix: "_mimetype", type: (x) => `varchar2(255${x.semantics()})` },
    { suffix: "_charset", type: (x) => `varchar2(255${x.semantics()})` },
    { suffix: "_lastupd", type: (x) => String(x.getOptionValue("Date Data Type") ?? "").toLowerCase() }
  ]
};
function oa(x, e, n) {
  return x[e].value.endsWith("k") ? n < 32 ? n * 1024 : n * 1024 - 1 : n;
}
function sa(x, e, n, t, r, o) {
  return !!(x.endsWith("_id") && n < 0 && t < 0 || e[1] && e[1].value === "id" || x === "quantity" || x.endsWith("_number") || x.endsWith("id") && n < 0 && r + 1 === o);
}
function la(x, e, n) {
  return !!(0 <= n || x === "hiredate" || x.endsWith("_date") || x.startsWith("date_of_") || x.startsWith("created") || x.startsWith("updated") || 1 < e.length && e[1].value === "d");
}
class ve {
  constructor(e, n, t, r) {
    this.one2many2oneUnsupoorted = void 0, this.line = e, this.parent = t, this.children = [], t !== null && t.children.push(this), this.fks = null, this._ctx = r, this.comment = null;
    function o(u) {
      let h = u;
      return h = h.replace(/ timestamp with local time zone/gi, " tswltz"), h = h.replace(/ timestamp with time zone/gi, " tswtz"), h = h.replace(/ timestamp/gi, " ts"), h;
    }
    this.content = o(n), this.annotations = null;
    const d = this.content.indexOf("{");
    if (d > 0 && (this.content.charAt(d - 1) === " " || this.content.charAt(d - 1) === "	")) {
      const u = this.content.indexOf("}", d);
      u > d && (this.annotations = this.content.substring(d + 1, u).trim(), this.content = this.content.substring(0, d) + this.content.substring(u + 1));
    }
    this.src = le(this.content, !1, !0, "`");
    const c = this.getOptionValue("colprefix");
    c !== null && (this.colprefix = c), this.parsedName = null, this._maxChildNameLen = -1;
  }
  findChild(e) {
    for (let n = 0; n < this.children.length; n++)
      if (this.children[n].parseName() === e) return this.children[n];
    return null;
  }
  descendants() {
    const e = [this];
    for (let n = 0; n < this.children.length; n++)
      e.push(...this.children[n].descendants());
    return e;
  }
  maxChildNameLen() {
    if (this._maxChildNameLen >= 0) return this._maxChildNameLen;
    let e = 2;
    if (this.hasRowKey() && (e = 7), this.hasRowVersion() && (e = Math.max(e, 11)), this.hasAuditCols())
      for (const t of ["createdcol", "createdbycol", "updatedcol", "updatedbycol"]) {
        const r = String(this._ctx.getOptionValue(t) ?? "").length;
        e < r && (e = r);
      }
    if (this._ctx.optionEQvalue("tenantid", !0) && this.findChild("tenant_id") === null && !this.isOption("notenantid") && (e = Math.max(e, 9)), this.fks !== null)
      for (const t in this.fks) {
        let r = t.length;
        const o = this._ctx.find(t);
        o !== null && o.isMany2One() && (r += 3), e < r && (e = r);
      }
    for (let t = 0; t < this.children.length; t++) {
      const r = this.children[t];
      if (0 < r.children.length) continue;
      let o = r.parseName().length;
      for (const d in xe)
        if (0 < r.indexOf(d)) {
          let c = 0;
          for (const u of xe[d])
            u.suffix.length > c && (c = u.suffix.length);
          o += c;
          break;
        }
      e < o && (e = o);
    }
    const n = this._ctx.additionalColumns();
    for (const t in n) {
      const r = t.length;
      e < r && (e = r);
    }
    return this._maxChildNameLen = e, e;
  }
  getAnnotationValue(e) {
    if (this.annotations === null) return null;
    const n = new RegExp(e + `:?\\s+['"]([^'"]*)['"]`, "i"), t = this.annotations.match(n);
    return t ? t[1] : null;
  }
  getAnnotationPairs() {
    if (this.annotations === null) return [];
    const e = [], n = /(\w+)(?:\s+['"]([^'"]*)['"'])?/g;
    let t;
    for (; (t = n.exec(this.annotations)) !== null; )
      e.push({ label: t[1], value: t[2] !== void 0 ? t[2] : null });
    return e;
  }
  hasAuditCols() {
    return this._ctx.optionEQvalue("Audit Columns", "yes") || this.isOption("auditcols") || this.isOption("audit", "col") || this.isOption("audit", "cols") || this.isOption("audit", "columns");
  }
  hasRowVersion() {
    return this._ctx.optionEQvalue("Row Version Number", "yes") || this.isOption("rowversion");
  }
  hasRowKey() {
    return this._ctx.optionEQvalue("rowkey", !0) || this.isOption("rowkey");
  }
  regularColumns() {
    return this.children.filter((e) => e.children.length === 0 && e.refId() === null);
  }
  apexUser() {
    return this._ctx.optionEQvalue("apex", "yes") ? "coalesce(sys_context('APEX$SESSION','APP_USER'),user)" : "user";
  }
  auditSysDateFn() {
    return String(this._ctx.getOptionValue("auditdate") || this._ctx.getOptionValue("Date Data Type") || "").toLowerCase().indexOf("timestamp") >= 0 ? "systimestamp" : "sysdate";
  }
  indexOf(e, n) {
    const t = e.toLowerCase();
    for (let r = 0; r < this.src.length; r++) {
      const o = this.src[r].lowerValue;
      if (n && o.indexOf(t) === 0) return r;
      if (t === o) return r;
    }
    return -1;
  }
  occursBeforeOption(e, n) {
    const t = this.indexOf(e, n);
    return t <= 0 ? !1 : (this._slashPos === void 0 && (this._slashPos = this.indexOf("/")), this._slashPos < 0 || t < this._slashPos);
  }
  isOption(e, n) {
    for (let t = 2; t < this.src.length; t++)
      if (e === this.src[t].lowerValue && (n == null || t < this.src.length - 1 && n === this.src[t + 1].lowerValue))
        return this.src[t - 1].value === "/";
    return !1;
  }
  getOptionValue(e) {
    if (this.src.length < 3) return null;
    const n = this.indexOf(e);
    if (n < 2 || this.src[n - 1].value !== "/") return null;
    let t = "";
    for (let r = n + 1; r < this.src.length && this.src[r].value !== "/" && this.src[r].value !== "["; r++)
      t += this.src[r].value;
    return t;
  }
  sugarcoatName(e, n) {
    let t = "";
    this.children.length === 0 && this.parent !== void 0 && this.parent !== null && this.parent.colprefix !== void 0 && (t = this.parent.colprefix + "_");
    let r = "";
    const o = "_";
    for (let l = e; l < n; l++) {
      const m = this.src[l].value, p = '"' + m + '"';
      if (this.src[l].type !== "constant.numeric" && m !== fe(p)) {
        r = this.content.substring(this.src[e].begin, this.src[n - 1].end);
        const b = 0 < String(this._ctx.getOptionValue("prefix") ?? "").length, A = fe(r) ?? r, v = b ? A : _e(A);
        return this.parsedName = t + v, this.parsedName;
      }
    }
    for (let l = e; l < n; l++)
      e < l && (r += o), r += this.src[l].value;
    const d = r.charAt(0);
    d >= "0" && d <= "9" && (r = "x" + r);
    const c = 0 < String(this._ctx.getOptionValue("prefix") ?? "").length, u = fe(r) ?? r, h = c ? u : _e(u);
    return this.parsedName = t + h, this.parsedName;
  }
  parseName() {
    if (this.parsedName !== null) return this.parsedName;
    let e = 0, n = this.src[0].value;
    (n === ">" || n === "<") && (n = this.src[1].value, e = 1);
    const t = n.indexOf('"'), r = n.indexOf('"', t + 1);
    if (0 <= t && t < r)
      return n.substring(t, r + 1);
    if (this.src[0].value === "view") return this.src[1].value;
    if (1 < this.src.length && this.src[1].value === "=") return this.src[0].value;
    let o = this.src.length, d = this.indexOf("/");
    0 < d && (o = d), d = this.indexOf("["), 0 < d && d < o && (o = d), d = this.indexOf("="), 0 < d && d < o && (o = d);
    for (let c = 0; c < ue.length; c++) {
      let u = this.indexOf(ue[c]);
      if (u < 0 && (u = this.indexOf(ue[c], !0)), 0 < u && u < o)
        return o = u, this.sugarcoatName(e, o);
    }
    for (let c = e; c < o; c++) {
      const u = this.src[c].lowerValue;
      if (u.charAt(0) === "v" && u.charAt(1) === "c") {
        if (u.charAt(2) === "(") return this.sugarcoatName(e, c);
        if (u.charAt(2) >= "0" && u.charAt(2) <= "9") return this.sugarcoatName(e, c);
      }
    }
    return this.sugarcoatName(e, o);
  }
  _inferTypeFull() {
    const e = this.src, n = e[0].value;
    let t = n.endsWith("_name") || n.startsWith("name") || n.startsWith("email") ? this._ctx.getOptionValue("namelen") || 255 : 4e3;
    const r = this.indexOf("vc", !0);
    if (0 < r) {
      let B = e[r].value.substring(2);
      B === "" && this.indexOf("(") === r + 1 && (B = e[r + 2].value), t = oa(e, r, B !== "" ? parseInt(B) : t);
    }
    let o = "varchar";
    const d = this.indexOf("date");
    this._slashPos === void 0 && (this._slashPos = this.indexOf("/"));
    const c = this._slashPos;
    sa(n, e, r, d, c, this.indexOf("pk")) && (o = "number"), this.occursBeforeOption("int", !0) && (o = "integer"), 0 < r && (o = "varchar");
    let u;
    const h = this.vectorType("vector") || this.vectorType("vect");
    h !== null && (o = "vector", u = h.substring(6));
    const l = this.parent, m = z(l.parseName(), "_", this.parseName());
    let p = !1;
    const b = n.endsWith("_yn") || n.startsWith("is_"), A = He.some((B) => 0 < this.indexOf(B));
    (b || A) && (o = "varchar", t = 1, p = !0);
    const v = this._ctx.getOptionValue("db");
    p && (this._ctx.getOptionValue("boolean") === "native" || this._ctx.getOptionValue("boolean") !== "yn" && v && v.length > 0 && 23 <= (ie(v) ?? 0)) && (p = !1, o = "boolean");
    const C = o === "boolean";
    this.indexOf("phone_number") === 0 && (o = "number");
    let w;
    const N = this.indexOf("num", !0);
    if (0 < N) {
      o = "number";
      const B = this.indexOf(")");
      0 < B && (w = this.content.substring(e[N + 1].begin, e[B].end).toLowerCase());
    }
    if (la(n, e, d)) {
      const B = String(this._ctx.getOptionValue("Date Data Type") ?? "").toLowerCase();
      B === ia ? o = "timestamp" : B === na ? o = "tswtz" : B === aa ? o = "tswltz" : o = "date";
    }
    r < 0 && (this.occursBeforeOption("clob") && (o = "clob"), (this.occursBeforeOption("blob") || this.occursBeforeOption("file")) && (o = "blob"), this.occursBeforeOption("json") && (o = "json"));
    for (const B in Se) if (this.occursBeforeOption(Se[B])) {
      o = "geometry";
      break;
    }
    this.isOption("domain") && v && v.length > 0 && 23 <= (ie(v) ?? 0) && (o = this.getOptionValue("domain") ?? o), this.occursBeforeOption("tswltz") && c !== 0 ? o = "tswltz" : this.occursBeforeOption("tswtz") || this.occursBeforeOption("tstz") ? o = "tswtz" : this.occursBeforeOption("ts") && (o = "timestamp");
    const L = { base: o, colName: n, varcharLen: t, needsBoolCheck: p, isNativeBoolean: C, parent_child: m };
    return w !== void 0 && (L.numericSpec = w), u !== void 0 && (L.vectorSpec = u), L;
  }
  inferType() {
    if (this.children !== null && 0 < this.children.length) return "table";
    const e = this.src;
    if (e[0].value === "view" || 1 < e.length && e[1].value === "=") return "view";
    if (e[0].value === "dv") return "dv";
    if (this.parent === null) return "table";
    const n = this._inferTypeFull();
    if (this.isOption("fk") || 0 < this.indexOf("reference", !0)) {
      let t = "number";
      n.base === "integer" && (t = "integer");
      const r = this.refId(), o = this._ctx.find(r);
      return o !== null && o.getExplicitPkName() !== null && (t = o.getPkType()), t;
    }
    return n.base;
  }
  getPlsqlType() {
    const e = this.inferType();
    return e === "varchar" ? "varchar2" : e;
  }
  vectorType(e) {
    const n = this.indexOf(e, !0), t = this.src;
    if (0 < n) {
      let r = t[n].value.substring(e.length);
      r === "" && this.indexOf("(") === n + 1 && (r = t[n + 2].value);
      let o = "*";
      if (r !== "") {
        let d = 1;
        r.endsWith("k") && (d = 1024), r = r.substring(0, r.length - 1), o = parseInt(r) * d;
      }
      return `vector(${o},*,*)`;
    }
    return null;
  }
  genConstraint(e) {
    let n = "";
    if (this.isOption("check")) {
      let t = "";
      this.parent !== null && (t = z(this.parent.parseName(), "_"));
      const r = z(t, this.parseName());
      let o = i;
      this.parent !== null && (o = " ".repeat(this.parent.maxChildNameLen()));
      const d = this.getGeneralConstraint();
      if (d !== null)
        return this.children !== null && 0 < this.children.length ? (n += i + "constraint " + z(this._ctx.objPrefix(), r, R.ck), n += "  check " + d + `,
`) : (n += " constraint " + z(this._ctx.objPrefix(), r, R.ck) + `
`, n += i + i + o + "check " + d), n;
      const c = this.getValues("check");
      n += " constraint " + z(this._ctx.objPrefix(), r, R.ck) + `
`, n += i + i + o + "check (" + this.parseName() + " in (" + c + "))";
    }
    return n;
  }
  isMany2One() {
    return this.src[0].value === ">";
  }
  getExplicitPkName() {
    if (this.isOption("pk"))
      return this.inferType() === "table" ? this.getOptionValue("pk") : this.parseName();
    for (let e = 0; e < this.children.length; e++)
      if (this.children[e].isOption("pk")) return this.children[e].parseName();
    return null;
  }
  trimmedContent() {
    let e = this.content.trim();
    const n = e.indexOf("["), t = e.indexOf("]");
    this.comment === null && 0 < n && (this.comment = e.substr(n + 1, t - n - 1)), 0 < n && (e = e.substr(0, n) + e.substr(t + 2));
    const r = e.indexOf("--");
    return this.comment === null && 0 < r && (this.comment = e.substr(r + 2)), 0 < r && (e = e.substr(0, r)), e.trim();
  }
  refId() {
    let e = this.trimmedContent();
    e = e.replace(/\/cascade/g, "");
    let n = e.indexOf(" id ");
    if (n < 0 && n === e.length - 3 && (n = e.indexOf(" id")), n < 0 && (n = e.indexOf(" id"), n !== e.length - 3 && (n = -1)), n < 0 && (n = e.indexOf("_id "), n !== e.length - 4 && (n = -1)), n < 0 && (n = e.indexOf("_id"), n !== e.length - 3 && (n = -1)), n < 0 && (n = e.indexOf("Id "), n !== e.length - 3 && (n = -1)), 0 < n) {
      let t = e.substr(0, n) + "s";
      if (this._ctx.find(t) !== null || (t = e.substr(0, n), this._ctx.find(t) !== null)) return t;
    }
    return n = e.indexOf("/fk"), 0 < n ? (e = e.substr(n + 3).trim(), n = e.indexOf("/"), 0 < n && (e = e.substring(0, n).trim()), n = e.indexOf("["), 0 < n && (e = e.substring(0, n).trim()), e.replace(" ", "_")) : (n = e.indexOf("/reference"), 0 < n ? (e = e.substr(n + 10).trim(), e.indexOf("s") === 0 && (e = e.substring(1).trim()), n = e.indexOf("/"), 0 < n && (e = e.substring(0, n).trim()), n = e.indexOf("["), 0 < n && (e = e.substring(0, n).trim()), e.replace(" ", "_")) : null);
  }
  getGeneralConstraint() {
    const e = this.indexOf("check");
    if (0 < e && this.src[e - 1].value === "/" && (this.src[e + 1].value === "(" || this.src[e + 1].lowerValue === "not")) {
      let n = e + 2;
      for (; n < this.src.length && this.src[n].value !== "/" && this.src[n].value !== "["; )
        n++;
      let t = this.content.substring(this.src[e + 1].begin, this.src[n - 1].end);
      return t.charAt(0) !== "(" && (t = "(" + t + ")"), t;
    }
    return null;
  }
  listValues(e) {
    const n = [], t = this.indexOf(e);
    let r = " ";
    for (let c = t + 1; c < this.src.length && this.src[c].value !== "/" && this.src[c].value !== "["; c++)
      if (this.src[c].value === ",") {
        r = ",";
        break;
      } else if (this.src[c].lowerValue === "and") {
        r = this.src[c].value;
        break;
      }
    if (r === " ") {
      for (let c = t + 1; c < this.src.length && this.src[c].value !== "/" && this.src[c].value !== "["; c++) {
        let u = this.src[c].value;
        this.src[c].type === "identifier" && u !== "null" && (u = "'" + u + "'"), u.charAt(0) === "`" && (u = u.substring(1, u.length - 1)), n.push(u);
      }
      return n;
    }
    let o = null, d = null;
    for (let c = t + 1; c < this.src.length && this.src[c].value !== "/" && this.src[c].value !== "["; c++) {
      let u = this.src[c].value;
      const h = this.content.substring(this.src[c - 1].end, this.src[c].begin);
      if (u === r) {
        d === "identifier" && o !== "null" && (o = "'" + o + "'"), n.push(o), o = null, d = null;
        continue;
      }
      u === "(" || u === ")" || (u.charAt(0) === "`" ? u = u.substring(1, u.length - 1) : this.src[c].type === "identifier" && (d = "identifier"), o = o === null ? u : o + h + u);
    }
    return d === "identifier" && (o = "'" + o + "'"), n.push(o), n;
  }
  getValues(e) {
    let n = "";
    const t = this.listValues(e);
    for (let r = 0; r < t.length; r++)
      0 < r && (n += ","), n += t[r];
    return n;
  }
  getDefaultValue() {
    if (!this.isOption("default")) return null;
    let e = "";
    for (let n = this.indexOf("default") + 1; n < this.src.length; n++) {
      const t = this.src[n].getValue();
      if (t === "/" || t === "-" || t === "[") break;
      e += t;
    }
    return e;
  }
  getBetweenClause() {
    if (!this.isOption("between")) return null;
    const e = this.indexOf("between");
    return this.src[e + 1].getValue() + " and " + this.src[e + 3].getValue();
  }
  parseValues() {
    if (this.isOption("check")) return this.listValues("check");
    if (this.isOption("values")) return this.listValues("values");
    if (this.isOption("between")) {
      const e = this.listValues("between"), n = [];
      for (let t = parseInt(String(e[0])); t <= parseInt(String(e[1])); t++)
        n.push(t);
      return n;
    }
    return null;
  }
  apparentDepth() {
    const e = this.content.split(/ |\t/);
    let n = 0;
    for (let t = 0; t < e.length; t++) {
      const r = e[t];
      if (r === "	") {
        n += i.length;
        continue;
      }
      if (r === "") {
        n++;
        continue;
      }
      return n;
    }
    throw new Error("No alphanumerics in the node content");
  }
  depth() {
    return this.parent === null ? 0 : this.parent.depth() + 1;
  }
  isLeaf() {
    return this.children.every((e) => e.children.length === 0);
  }
  getGenIdColName() {
    if (this.inferType() !== "table" || this.getExplicitPkName() !== null) return null;
    if (this._ctx.optionEQvalue("Auto Primary Key", "yes")) {
      let e = "";
      return this.colprefix !== void 0 && (e = this.colprefix + "_"), this._ctx.optionEQvalue("prefixPKwithTname", "yes") && (e = (O(this.parseName()) ?? this.parseName()) + "_"), e + "id";
    }
    return null;
  }
  getPkName() {
    const e = this.getGenIdColName();
    return e === null ? this.getExplicitPkName() : e;
  }
  getPkType() {
    if (this.getGenIdColName() === null) {
      const n = this.getExplicitPkName();
      return this.findChild(n).inferType();
    }
    return "integer";
  }
  lateInitFks() {
    if (this.fks === null && (this.fks = {}), !this.isMany2One()) {
      this.parent !== null && this.inferType() === "table" && ((this.parent.getPkName() ?? "").indexOf(",") < 0 ? this.fks[(O(this.parent.parseName()) ?? this.parent.parseName()) + "_id"] = this.parent.parseName() : this.fks[O(this.parent.getPkName() ?? "") ?? this.parent.parseName()] = this.parent.parseName());
      for (let e = 0; e < this.children.length; e++) {
        const n = this.children[e].refId();
        n !== null && (this.fks[this.children[e].parseName()] = n);
      }
    }
  }
  cardinality() {
    if (this.isOption("insert")) {
      const n = this.indexOf("insert");
      let t = parseInt(this.src[n + 1].value);
      const r = this._ctx.getOptionValue("datalimit");
      return r < t && (t = r), t;
    }
    return 0;
  }
  isArray() {
    return !this.isMany2One() && this.parent !== null;
  }
  hasNonArrayChildId(e) {
    if (!e.endsWith("_id")) return !1;
    const n = e.slice(0, -3);
    return this.children.some((t) => t.children.length > 0 && t.parseName() === n && !t.isArray());
  }
  getTransColumns() {
    const e = [];
    for (let n = 0; n < this.children.length; n++) {
      const t = this.children[n];
      (t.isOption("trans") || t.isOption("translation") || t.isOption("translations")) && e.push(t);
    }
    return e;
  }
  getBaseType() {
    let e = this.inferType(), n = e.indexOf(" not null");
    return n > 0 && (e = e.substring(0, n)), n = e.indexOf(`
`), n > 0 && (e = e.substring(0, n)), e;
  }
}
function Pe(x) {
  const e = x.input;
  let n = [];
  const t = [], r = le(e + `
`, !0, !0, "`");
  x.data = null;
  let o = null, d = "";
  e: for (let c = 0; c < r.length; c++) {
    const u = r[c];
    if (u.value === `
` && o === null) {
      d = d.replace(/\r/g, "");
      const h = (d.match(/\{/g) ?? []).length, l = (d.match(/\}/g) ?? []).length;
      if (h > l)
        continue;
      if (d.replace(/\r/g, "").replace(/ /g, "") === "") {
        d = "";
        continue;
      }
      let p = new ve(u.line - 1, d, null, x), b = !1;
      for (let A = 0; A < n.length; A++) {
        const v = n[A];
        if (p.apparentDepth() <= v.apparentDepth())
          if (0 < A) {
            const C = n[A - 1];
            p = new ve(u.line - 1, d, C, x), n[A] = p, n = n.slice(0, A + 1), b = !0;
            break;
          } else
            n[0] = p, n = n.slice(0, 1), t.push(p), b = !0;
      }
      if (!b) {
        if (0 < n.length) {
          const A = n[n.length - 1];
          p = new ve(u.line - 1, d, A, x);
        }
        n.push(p), p.apparentDepth() === 0 && t.push(p);
      }
      if (p.isMany2One()) {
        const A = p.parent;
        A.fks === null && (A.fks = {});
        let v = p.refId();
        v === null && (v = p.parseName()), A.fks[p.parseName() + "_id"] = v;
      }
      d = "";
      continue;
    }
    if (o === null && u.value === "#") {
      o = "";
      continue;
    }
    if (o !== null) {
      if (o += u.value, u.value !== `
` && u.value !== "}") continue;
      const h = le(o, !1, !0, "");
      if (h.length % 4 === 3 && h[1].value === ":") {
        x.setOptions(o), o = null, d = "";
        continue;
      }
      let l = null, m = null;
      for (const p in h) {
        const b = h[p];
        if (l === null && b.value === "flattened") {
          l = "";
          continue;
        }
        if (l !== null) {
          if (l += b.value, l === "=" || l.charAt(l.length - 1) !== "}") continue;
          const A = l.substring(1);
          try {
            x.data = JSON.parse(A), o = null, d = "";
            continue e;
          } catch {
          }
        }
        if (m === null && b.value === "settings") {
          m = "";
          continue;
        }
        if (m !== null) {
          m += b.value;
          try {
            x.setOptions(m), o = null, d = "";
            continue e;
          } catch {
          }
        }
      }
    }
    if (u.type !== "comment") {
      if (u.type === "line-comment") {
        0 < d.trim().length && (d += u.value);
        continue;
      }
      d += u.value;
    }
  }
  return t;
}
const ca = [
  "Sales",
  "Finance",
  "Delivery",
  "Manufacturing",
  "Engineer",
  "Consultant",
  "Architect",
  "Manager",
  "Analyst",
  "Specialist",
  "Evangelist",
  "Salesman"
], Be = [
  "\u300C\u8CA9\u58F2\u300D",
  "\u300C\u8CA1\u52D9\u300D",
  "\u300C\u914D\u9001\u300D",
  "\u300C\u88FD\u9020\u300D",
  "\u300C\u30A8\u30F3\u30B8\u30CB\u30A2\u300D",
  "\u300C\u30B3\u30F3\u30B5\u30EB\u30BF\u30F3\u30C8\u300D",
  "\u300C\u30A2\u30FC\u30AD\u30C6\u30AF\u30C8\u300D",
  "\u300C\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u300D",
  "\u300C\u30A2\u30CA\u30EA\u30B9\u30C8\u300D",
  "\u300C\u30B9\u30DA\u30B7\u30E3\u30EA\u30B9\u30C8\u300D",
  "\u300C\u30A8\u30D0\u30F3\u30B8\u30A7\u30EA\u30B9\u30C8\u300D"
], Ee = [
  "\uC601\uC5C5",
  "\uAE08\uC735",
  "\uBC30\uC1A1",
  "\uC81C\uC870",
  "\uC5D4\uC9C0\uB2C8\uC5B4",
  "\uCEE8\uC124\uD134\uD2B8",
  "\uAC74\uCD95\uAC00",
  "\uAD00\uB9AC\uC790",
  "\uBD84\uC11D\uAC00",
  "\uC804\uBB38\uAC00",
  "\uC804\uB3C4\uC790",
  "\uD310\uB9E4\uC6D0"
];
function Ne(x, e) {
  if (typeof e != "string") return e;
  const n = x.substring(0, 2).toLowerCase();
  if (n === "en") return e;
  const t = e.startsWith("'") ? e.slice(1, -1) : e, r = ca.indexOf(t);
  return r < 0 ? e : n === "jp" && r < Be.length ? "'" + Be[r] + "'" : n === "kr" && r < Ee.length ? "'" + Ee[r] + "'" : e;
}
function fa(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x.default : x;
}
var me = { exports: {} }, Le;
function ua() {
  return Le || (Le = 1, (function(x, e) {
    (function() {
      var n = 9007199254740992, t = -n, r = "0123456789", o = "abcdefghijklmnopqrstuvwxyz", d = o.toUpperCase(), c = r + "abcdef";
      function u(a) {
        this.name = "UnsupportedError", this.message = a || "This feature is not supported on this platform";
      }
      u.prototype = new Error(), u.prototype.constructor = u;
      var h = Array.prototype.slice;
      function l(a) {
        if (!(this instanceof l))
          return a || (a = null), a === null ? new l() : new l(a);
        if (typeof a == "function")
          return this.random = a, this;
        arguments.length && (this.seed = 0);
        for (var s = 0; s < arguments.length; s++) {
          var f = 0;
          if (Object.prototype.toString.call(arguments[s]) === "[object String]")
            for (var g = 0; g < arguments[s].length; g++) {
              for (var y = 0, k = 0; k < arguments[s].length; k++)
                y = arguments[s].charCodeAt(k) + (y << 6) + (y << 16) - y;
              f += y;
            }
          else
            f = arguments[s];
          this.seed += (arguments.length - s) * f;
        }
        return this.mt = this.mersenne_twister(this.seed), this.bimd5 = this.blueimp_md5(), this.random = function() {
          return this.mt.random(this.seed);
        }, this;
      }
      l.prototype.VERSION = "1.1.13";
      function m(a, s) {
        if (a = a || {}, s)
          for (var f in s)
            typeof a[f] > "u" && (a[f] = s[f]);
        return a;
      }
      function p(a) {
        return Array.apply(null, Array(a)).map(function(s, f) {
          return f;
        });
      }
      function b(a, s) {
        if (a)
          throw new RangeError(s);
      }
      var A = function() {
        throw new Error("No Base64 encoder available.");
      };
      (function() {
        typeof btoa == "function" ? A = btoa : typeof Buffer == "function" && (A = function(s) {
          return new Buffer(s).toString("base64");
        });
      })(), l.prototype.bool = function(a) {
        return a = m(a, { likelihood: 50 }), b(
          a.likelihood < 0 || a.likelihood > 100,
          "Chance: Likelihood accepts values from 0 to 100."
        ), this.random() * 100 < a.likelihood;
      }, l.prototype.falsy = function(a) {
        a = m(a, { pool: [!1, null, 0, NaN, "", void 0] });
        var s = a.pool, f = this.integer({ min: 0, max: s.length - 1 }), g = s[f];
        return g;
      }, l.prototype.animal = function(a) {
        if (a = m(a), typeof a.type < "u")
          return b(
            !this.get("animals")[a.type.toLowerCase()],
            "Please pick from desert, ocean, grassland, forest, zoo, pets, farm."
          ), this.pick(this.get("animals")[a.type.toLowerCase()]);
        var s = ["desert", "forest", "ocean", "zoo", "farm", "pet", "grassland"];
        return this.pick(this.get("animals")[this.pick(s)]);
      }, l.prototype.character = function(a) {
        a = m(a);
        var s = "!@#$%^&*()[]", f, g;
        return a.casing === "lower" ? f = o : a.casing === "upper" ? f = d : f = o + d, a.pool ? g = a.pool : (g = "", a.alpha && (g += f), a.numeric && (g += r), a.symbols && (g += s), g || (g = f + r + s)), g.charAt(this.natural({ max: g.length - 1 }));
      }, l.prototype.floating = function(a) {
        a = m(a, { fixed: 4 }), b(
          a.fixed && a.precision,
          "Chance: Cannot specify both fixed and precision."
        );
        var s, f = Math.pow(10, a.fixed), g = n / f, y = -g;
        b(
          a.min && a.fixed && a.min < y,
          "Chance: Min specified is out of range with fixed. Min should be, at least, " + y
        ), b(
          a.max && a.fixed && a.max > g,
          "Chance: Max specified is out of range with fixed. Max should be, at most, " + g
        ), a = m(a, { min: y, max: g }), s = this.integer({ min: a.min * f, max: a.max * f });
        var k = (s / f).toFixed(a.fixed);
        return parseFloat(k);
      }, l.prototype.integer = function(a) {
        return a = m(a, { min: t, max: n }), b(a.min > a.max, "Chance: Min cannot be greater than Max."), Math.floor(this.random() * (a.max - a.min + 1) + a.min);
      }, l.prototype.natural = function(a) {
        if (a = m(a, { min: 0, max: n }), typeof a.numerals == "number" && (b(a.numerals < 1, "Chance: Numerals cannot be less than one."), a.min = Math.pow(10, a.numerals - 1), a.max = Math.pow(10, a.numerals) - 1), b(a.min < 0, "Chance: Min cannot be less than zero."), a.exclude) {
          b(!Array.isArray(a.exclude), "Chance: exclude must be an array.");
          for (var s in a.exclude)
            b(!Number.isInteger(a.exclude[s]), "Chance: exclude must be numbers.");
          var f = a.min + this.natural({ max: a.max - a.min - a.exclude.length }), g = a.exclude.sort((k, I) => k - I);
          for (var y in g) {
            if (f < g[y])
              break;
            f++;
          }
          return f;
        }
        return this.integer(a);
      }, l.prototype.prime = function(a) {
        a = m(a, { min: 0, max: 1e4 }), b(a.min < 0, "Chance: Min cannot be less than zero."), b(a.min > a.max, "Chance: Min cannot be greater than Max.");
        var s = B.primes[B.primes.length - 1];
        if (a.max > s)
          for (var f = s + 2; f <= a.max; ++f)
            this.is_prime(f) && B.primes.push(f);
        var g = B.primes.filter(function(y) {
          return y >= a.min && y <= a.max;
        });
        return this.pick(g);
      }, l.prototype.is_prime = function(a) {
        if (a % 1 || a < 2)
          return !1;
        if (a % 2 === 0)
          return a === 2;
        if (a % 3 === 0)
          return a === 3;
        for (var s = Math.sqrt(a), f = 5; f <= s; f += 6)
          if (a % f === 0 || a % (f + 2) === 0)
            return !1;
        return !0;
      }, l.prototype.hex = function(a) {
        a = m(a, { min: 0, max: n, casing: "lower" }), b(a.min < 0, "Chance: Min cannot be less than zero.");
        var s = this.natural({ min: a.min, max: a.max });
        return a.casing === "upper" ? s.toString(16).toUpperCase() : s.toString(16);
      }, l.prototype.letter = function(a) {
        a = m(a, { casing: "lower" });
        var s = "abcdefghijklmnopqrstuvwxyz", f = this.character({ pool: s });
        return a.casing === "upper" && (f = f.toUpperCase()), f;
      }, l.prototype.string = function(a) {
        a = m(a, { min: 5, max: 20 }), a.length !== 0 && !a.length && (a.length = this.natural({ min: a.min, max: a.max })), b(a.length < 0, "Chance: Length cannot be less than zero.");
        var s = a.length, f = this.n(this.character, s, a);
        return f.join("");
      };
      function v(a) {
        this.c = a;
      }
      v.prototype = {
        substitute: function() {
          return this.c;
        }
      };
      function C(a) {
        this.c = a;
      }
      C.prototype = {
        substitute: function() {
          if (!/[{}\\]/.test(this.c))
            throw new Error('Invalid escape sequence: "\\' + this.c + '".');
          return this.c;
        }
      };
      function w(a) {
        this.c = a;
      }
      w.prototype = {
        replacers: {
          "#": function(a) {
            return a.character({ pool: r });
          },
          A: function(a) {
            return a.character({ pool: d });
          },
          a: function(a) {
            return a.character({ pool: o });
          }
        },
        substitute: function(a) {
          var s = this.replacers[this.c];
          if (!s)
            throw new Error('Invalid replacement character: "' + this.c + '".');
          return s(a);
        }
      };
      function N(a) {
        for (var s = [], f = "identity", g = 0; g < a.length; g++) {
          var y = a[g];
          switch (f) {
            case "escape":
              s.push(new C(y)), f = "identity";
              break;
            case "identity":
              y === "{" ? f = "replace" : y === "\\" ? f = "escape" : s.push(new v(y));
              break;
            case "replace":
              y === "}" ? f = "identity" : s.push(new w(y));
              break;
          }
        }
        return s;
      }
      l.prototype.template = function(a) {
        if (!a)
          throw new Error("Template string is required");
        var s = this;
        return N(a).map(function(f) {
          return f.substitute(s);
        }).join("");
      }, l.prototype.buffer = function(a) {
        if (typeof Buffer > "u")
          throw new u("Sorry, the buffer() function is not supported on your platform");
        a = m(a, { length: this.natural({ min: 5, max: 20 }) }), b(a.length < 0, "Chance: Length cannot be less than zero.");
        var s = a.length, f = this.n(this.character, s, a);
        return Buffer.from(f);
      }, l.prototype.capitalize = function(a) {
        return a.charAt(0).toUpperCase() + a.substr(1);
      }, l.prototype.mixin = function(a) {
        for (var s in a)
          this[s] = a[s];
        return this;
      }, l.prototype.unique = function(a, s, f) {
        b(
          typeof a != "function",
          "Chance: The first argument must be a function."
        );
        var g = function(T, H) {
          return T.indexOf(H) !== -1;
        };
        f && (g = f.comparator || g);
        for (var y = [], k = 0, I, _ = s * 50, S = h.call(arguments, 2); y.length < s; ) {
          var M = JSON.parse(JSON.stringify(S));
          if (I = a.apply(this, M), g(y, I) || (y.push(I), k = 0), ++k > _)
            throw new RangeError("Chance: num is likely too large for sample set");
        }
        return y;
      }, l.prototype.n = function(a, s) {
        b(
          typeof a != "function",
          "Chance: The first argument must be a function."
        ), typeof s > "u" && (s = 1);
        var f = s, g = [], y = h.call(arguments, 2);
        for (f = Math.max(0, f), null; f--; null)
          g.push(a.apply(this, y));
        return g;
      }, l.prototype.pad = function(a, s, f) {
        return f = f || "0", a = a + "", a.length >= s ? a : new Array(s - a.length + 1).join(f) + a;
      }, l.prototype.pick = function(a, s) {
        if (a.length === 0)
          throw new RangeError("Chance: Cannot pick() from an empty array");
        return !s || s === 1 ? a[this.natural({ max: a.length - 1 })] : this.shuffle(a).slice(0, s);
      }, l.prototype.pickone = function(a) {
        if (a.length === 0)
          throw new RangeError("Chance: Cannot pickone() from an empty array");
        return a[this.natural({ max: a.length - 1 })];
      }, l.prototype.pickset = function(a, s) {
        if (s === 0)
          return [];
        if (a.length === 0)
          throw new RangeError("Chance: Cannot pickset() from an empty array");
        if (s < 0)
          throw new RangeError("Chance: Count must be a positive number");
        if (!s || s === 1)
          return [this.pickone(a)];
        var f = a.slice(0), g = f.length;
        return this.n(function() {
          var y = this.natural({ max: --g }), k = f[y];
          return f[y] = f[g], k;
        }, Math.min(g, s));
      }, l.prototype.shuffle = function(a) {
        for (var s = [], f = 0, g = Number(a.length), y = p(g), k = g - 1, I, _ = 0; _ < g; _++)
          I = this.natural({ max: k }), f = y[I], s[_] = a[f], y[I] = y[k], k -= 1;
        return s;
      }, l.prototype.weighted = function(a, s, f) {
        if (a.length !== s.length)
          throw new RangeError("Chance: Length of array and weights must match");
        for (var g = 0, y, k = 0; k < s.length; ++k) {
          if (y = s[k], isNaN(y))
            throw new RangeError("Chance: All weights must be numbers");
          y > 0 && (g += y);
        }
        if (g === 0)
          throw new RangeError("Chance: No valid entries in array weights");
        var I = this.random() * g, _ = 0, S = -1, M;
        for (k = 0; k < s.length; ++k) {
          if (y = s[k], _ += y, y > 0) {
            if (I <= _) {
              M = k;
              break;
            }
            S = k;
          }
          k === s.length - 1 && (M = S);
        }
        var T = a[M];
        return f = typeof f > "u" ? !1 : f, f && (a.splice(M, 1), s.splice(M, 1)), T;
      }, l.prototype.paragraph = function(a) {
        a = m(a);
        var s = a.sentences || this.natural({ min: 3, max: 7 }), f = this.n(this.sentence, s), g = a.linebreak === !0 ? `
` : " ";
        return f.join(g);
      }, l.prototype.sentence = function(a) {
        a = m(a);
        var s = a.words || this.natural({ min: 12, max: 18 }), f = a.punctuation, g, y = this.n(this.word, s);
        return g = y.join(" "), g = this.capitalize(g), f !== !1 && !/^[.?;!:]$/.test(f) && (f = "."), f && (g += f), g;
      }, l.prototype.syllable = function(a) {
        a = m(a);
        for (var s = a.length || this.natural({ min: 2, max: 3 }), f = "bcdfghjklmnprstvwz", g = "aeiou", y = f + g, k = "", I, _ = 0; _ < s; _++)
          _ === 0 ? I = this.character({ pool: y }) : f.indexOf(I) === -1 ? I = this.character({ pool: f }) : I = this.character({ pool: g }), k += I;
        return a.capitalize && (k = this.capitalize(k)), k;
      }, l.prototype.word = function(a) {
        a = m(a), b(
          a.syllables && a.length,
          "Chance: Cannot specify both syllables AND length."
        );
        var s = a.syllables || this.natural({ min: 1, max: 3 }), f = "";
        if (a.length) {
          do
            f += this.syllable();
          while (f.length < a.length);
          f = f.substring(0, a.length);
        } else
          for (var g = 0; g < s; g++)
            f += this.syllable();
        return a.capitalize && (f = this.capitalize(f)), f;
      }, l.prototype.emoji = function(a) {
        a = m(a, { category: "all", length: 1 }), b(
          a.length < 1 || BigInt(a.length) > BigInt(n),
          "Chance: length must be between 1 and " + String(n)
        );
        var s = this.get("emojis");
        a.category === "all" && (a.category = this.pickone(Object.keys(s)));
        var f = s[a.category];
        return b(
          f === void 0,
          "Chance: Unrecognised emoji category: [" + a.category + "]."
        ), this.pickset(f, a.length).map(function(g) {
          return String.fromCodePoint(g);
        }).join("");
      }, l.prototype.age = function(a) {
        a = m(a);
        var s;
        switch (a.type) {
          case "child":
            s = { min: 0, max: 12 };
            break;
          case "teen":
            s = { min: 13, max: 19 };
            break;
          case "adult":
            s = { min: 18, max: 65 };
            break;
          case "senior":
            s = { min: 65, max: 100 };
            break;
          case "all":
            s = { min: 0, max: 100 };
            break;
          default:
            s = { min: 18, max: 65 };
            break;
        }
        return this.natural(s);
      }, l.prototype.birthday = function(a) {
        var s = this.age(a), f = /* @__PURE__ */ new Date(), g = f.getFullYear();
        if (a && a.type) {
          var y = /* @__PURE__ */ new Date(), k = /* @__PURE__ */ new Date();
          y.setFullYear(g - s - 1), k.setFullYear(g - s), a = m(a, {
            min: y,
            max: k
          });
        } else if (a && (a.minAge !== void 0 || a.maxAge !== void 0)) {
          b(a.minAge < 0, "Chance: MinAge cannot be less than zero."), b(a.minAge > a.maxAge, "Chance: MinAge cannot be greater than MaxAge.");
          var I = a.minAge !== void 0 ? a.minAge : 0, _ = a.maxAge !== void 0 ? a.maxAge : 100, S = new Date(g - _ - 1, f.getMonth(), f.getDate()), M = new Date(g - I, f.getMonth(), f.getDate());
          S.setDate(S.getDate() + 1), M.setDate(M.getDate() + 1), M.setMilliseconds(M.getMilliseconds() - 1), a = m(a, {
            min: S,
            max: M
          });
        } else
          a = m(a, {
            year: g - s
          });
        return this.date(a);
      }, l.prototype.cpf = function(a) {
        a = m(a, {
          formatted: !0
        });
        var s = this.n(this.natural, 9, { max: 9 }), f = s[8] * 2 + s[7] * 3 + s[6] * 4 + s[5] * 5 + s[4] * 6 + s[3] * 7 + s[2] * 8 + s[1] * 9 + s[0] * 10;
        f = 11 - f % 11, f >= 10 && (f = 0);
        var g = f * 2 + s[8] * 3 + s[7] * 4 + s[6] * 5 + s[5] * 6 + s[4] * 7 + s[3] * 8 + s[2] * 9 + s[1] * 10 + s[0] * 11;
        g = 11 - g % 11, g >= 10 && (g = 0);
        var y = "" + s[0] + s[1] + s[2] + "." + s[3] + s[4] + s[5] + "." + s[6] + s[7] + s[8] + "-" + f + g;
        return a.formatted ? y : y.replace(/\D/g, "");
      }, l.prototype.cnpj = function(a) {
        a = m(a, {
          formatted: !0
        });
        var s = this.n(this.natural, 12, { max: 12 }), f = s[11] * 2 + s[10] * 3 + s[9] * 4 + s[8] * 5 + s[7] * 6 + s[6] * 7 + s[5] * 8 + s[4] * 9 + s[3] * 2 + s[2] * 3 + s[1] * 4 + s[0] * 5;
        f = 11 - f % 11, f < 2 && (f = 0);
        var g = f * 2 + s[11] * 3 + s[10] * 4 + s[9] * 5 + s[8] * 6 + s[7] * 7 + s[6] * 8 + s[5] * 9 + s[4] * 2 + s[3] * 3 + s[2] * 4 + s[1] * 5 + s[0] * 6;
        g = 11 - g % 11, g < 2 && (g = 0);
        var y = "" + s[0] + s[1] + "." + s[2] + s[3] + s[4] + "." + s[5] + s[6] + s[7] + "/" + s[8] + s[9] + s[10] + s[11] + "-" + f + g;
        return a.formatted ? y : y.replace(/\D/g, "");
      }, l.prototype.first = function(a) {
        return a = m(a, { gender: this.gender(), nationality: "en" }), this.pick(this.get("firstNames")[a.gender.toLowerCase()][a.nationality.toLowerCase()]);
      }, l.prototype.profession = function(a) {
        return a = m(a), a.rank ? this.pick(["Apprentice ", "Junior ", "Senior ", "Lead "]) + this.pick(this.get("profession")) : this.pick(this.get("profession"));
      }, l.prototype.company = function() {
        return this.pick(this.get("company"));
      }, l.prototype.gender = function(a) {
        return a = m(a, { extraGenders: [] }), this.pick(["Male", "Female"].concat(a.extraGenders));
      }, l.prototype.last = function(a) {
        if (a = m(a, { nationality: "*" }), a.nationality === "*") {
          var s = [], f = this.get("lastNames");
          return Object.keys(f).forEach(function(g) {
            s = s.concat(f[g]);
          }), this.pick(s);
        } else
          return this.pick(this.get("lastNames")[a.nationality.toLowerCase()]);
      }, l.prototype.israelId = function() {
        for (var a = this.string({ pool: "0123456789", length: 8 }), s = 0, f = 0; f < a.length; f++) {
          var g = a[f] * (f / 2 === parseInt(f / 2) ? 1 : 2);
          g = this.pad(g, 2).toString(), g = parseInt(g[0]) + parseInt(g[1]), s = s + g;
        }
        return a = a + (10 - parseInt(s.toString().slice(-1))).toString().slice(-1), a;
      }, l.prototype.mrz = function(a) {
        var s = function(y) {
          var k = "<ABCDEFGHIJKLMNOPQRSTUVWXYXZ".split(""), I = [7, 3, 1], _ = 0;
          return typeof y != "string" && (y = y.toString()), y.split("").forEach(function(S, M) {
            var T = k.indexOf(S);
            T !== -1 ? S = T === 0 ? 0 : T + 9 : S = parseInt(S, 10), S *= I[M % I.length], _ += S;
          }), _ % 10;
        }, f = function(y) {
          var k = function(_) {
            return new Array(_ + 1).join("<");
          }, I = [
            "P<",
            y.issuer,
            y.last.toUpperCase(),
            "<<",
            y.first.toUpperCase(),
            k(39 - (y.last.length + y.first.length + 2)),
            y.passportNumber,
            s(y.passportNumber),
            y.nationality,
            y.dob,
            s(y.dob),
            y.gender,
            y.expiry,
            s(y.expiry),
            k(14),
            s(k(14))
          ].join("");
          return I + s(I.substr(44, 10) + I.substr(57, 7) + I.substr(65, 7));
        }, g = this;
        return a = m(a, {
          first: this.first(),
          last: this.last(),
          passportNumber: this.integer({ min: 1e8, max: 999999999 }),
          dob: (function() {
            var y = g.birthday({ type: "adult" });
            return [
              y.getFullYear().toString().substr(2),
              g.pad(y.getMonth() + 1, 2),
              g.pad(y.getDate(), 2)
            ].join("");
          })(),
          expiry: (function() {
            var y = /* @__PURE__ */ new Date();
            return [
              (y.getFullYear() + 5).toString().substr(2),
              g.pad(y.getMonth() + 1, 2),
              g.pad(y.getDate(), 2)
            ].join("");
          })(),
          gender: this.gender() === "Female" ? "F" : "M",
          issuer: "GBR",
          nationality: "GBR"
        }), f(a);
      }, l.prototype.name = function(a) {
        a = m(a);
        var s = this.first(a), f = this.last(a), g;
        return a.middle ? g = s + " " + this.first(a) + " " + f : a.middle_initial ? g = s + " " + this.character({ alpha: !0, casing: "upper" }) + ". " + f : g = s + " " + f, a.prefix && (g = this.prefix(a) + " " + g), a.suffix && (g = g + " " + this.suffix(a)), g;
      }, l.prototype.name_prefixes = function(a) {
        a = a || "all", a = a.toLowerCase();
        var s = [
          { name: "Doctor", abbreviation: "Dr." }
        ];
        return (a === "male" || a === "all") && s.push({ name: "Mister", abbreviation: "Mr." }), (a === "female" || a === "all") && (s.push({ name: "Miss", abbreviation: "Miss" }), s.push({ name: "Misses", abbreviation: "Mrs." })), s;
      }, l.prototype.prefix = function(a) {
        return this.name_prefix(a);
      }, l.prototype.name_prefix = function(a) {
        return a = m(a, { gender: "all" }), a.full ? this.pick(this.name_prefixes(a.gender)).name : this.pick(this.name_prefixes(a.gender)).abbreviation;
      }, l.prototype.HIDN = function() {
        var a = "0123456789", s = "ABCDEFGHIJKLMNOPQRSTUVWXYXZ", f = "";
        return f += this.string({ pool: a, length: 6 }), f += this.string({ pool: s, length: 2 }), f;
      }, l.prototype.ssn = function(a) {
        a = m(a, { ssnFour: !1, dashes: !0 });
        var s = "1234567890", f, g = a.dashes ? "-" : "";
        return a.ssnFour ? f = this.string({ pool: s, length: 4 }) : f = this.string({ pool: s, length: 3 }) + g + this.string({ pool: s, length: 2 }) + g + this.string({ pool: s, length: 4 }), f;
      }, l.prototype.aadhar = function(a) {
        a = m(a, { onlyLastFour: !1, separatedByWhiteSpace: !0 });
        var s = "1234567890", f, g = a.separatedByWhiteSpace ? " " : "";
        return a.onlyLastFour ? f = this.string({ pool: s, length: 4 }) : f = this.string({ pool: s, length: 4 }) + g + this.string({ pool: s, length: 4 }) + g + this.string({ pool: s, length: 4 }), f;
      }, l.prototype.name_suffixes = function() {
        var a = [
          { name: "Doctor of Osteopathic Medicine", abbreviation: "D.O." },
          { name: "Doctor of Philosophy", abbreviation: "Ph.D." },
          { name: "Esquire", abbreviation: "Esq." },
          { name: "Junior", abbreviation: "Jr." },
          { name: "Juris Doctor", abbreviation: "J.D." },
          { name: "Master of Arts", abbreviation: "M.A." },
          { name: "Master of Business Administration", abbreviation: "M.B.A." },
          { name: "Master of Science", abbreviation: "M.S." },
          { name: "Medical Doctor", abbreviation: "M.D." },
          { name: "Senior", abbreviation: "Sr." },
          { name: "The Third", abbreviation: "III" },
          { name: "The Fourth", abbreviation: "IV" },
          { name: "Bachelor of Engineering", abbreviation: "B.E" },
          { name: "Bachelor of Technology", abbreviation: "B.TECH" }
        ];
        return a;
      }, l.prototype.suffix = function(a) {
        return this.name_suffix(a);
      }, l.prototype.name_suffix = function(a) {
        return a = m(a), a.full ? this.pick(this.name_suffixes()).name : this.pick(this.name_suffixes()).abbreviation;
      }, l.prototype.nationalities = function() {
        return this.get("nationalities");
      }, l.prototype.nationality = function() {
        var a = this.pick(this.nationalities());
        return a.name;
      }, l.prototype.zodiac = function() {
        const a = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        return this.pickone(a);
      }, l.prototype.android_id = function() {
        return "APA91" + this.string({ pool: "0123456789abcefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_", length: 178 });
      }, l.prototype.apple_token = function() {
        return this.string({ pool: "abcdef1234567890", length: 64 });
      }, l.prototype.wp8_anid2 = function() {
        return A(this.hash({ length: 32 }));
      }, l.prototype.wp7_anid = function() {
        return "A=" + this.guid().replace(/-/g, "").toUpperCase() + "&E=" + this.hash({ length: 3 }) + "&W=" + this.integer({ min: 0, max: 9 });
      }, l.prototype.bb_pin = function() {
        return this.hash({ length: 8 });
      }, l.prototype.avatar = function(a) {
        var s = null, f = "//www.gravatar.com/avatar/", g = {
          http: "http",
          https: "https"
        }, y = {
          bmp: "bmp",
          gif: "gif",
          jpg: "jpg",
          png: "png"
        }, k = {
          404: "404",
          // Return 404 if not found
          mm: "mm",
          // Mystery man
          identicon: "identicon",
          // Geometric pattern based on hash
          monsterid: "monsterid",
          // A generated monster icon
          wavatar: "wavatar",
          // A generated face
          retro: "retro",
          // 8-bit icon
          blank: "blank"
          // A transparent png
        }, I = {
          g: "g",
          pg: "pg",
          r: "r",
          x: "x"
        }, _ = {
          protocol: null,
          email: null,
          fileExtension: null,
          size: null,
          fallback: null,
          rating: null
        };
        if (!a)
          _.email = this.email(), a = {};
        else if (typeof a == "string")
          _.email = a, a = {};
        else {
          if (typeof a != "object")
            return null;
          if (a.constructor === "Array")
            return null;
        }
        return _ = m(a, _), _.email || (_.email = this.email()), _.protocol = g[_.protocol] ? _.protocol + ":" : "", _.size = parseInt(_.size, 0) ? _.size : "", _.rating = I[_.rating] ? _.rating : "", _.fallback = k[_.fallback] ? _.fallback : "", _.fileExtension = y[_.fileExtension] ? _.fileExtension : "", s = _.protocol + f + this.bimd5.md5(_.email) + (_.fileExtension ? "." + _.fileExtension : "") + (_.size || _.rating || _.fallback ? "?" : "") + (_.size ? "&s=" + _.size.toString() : "") + (_.rating ? "&r=" + _.rating : "") + (_.fallback ? "&d=" + _.fallback : ""), s;
      }, l.prototype.color = function(a) {
        function s(J, de) {
          return [J, J, J].join(de || "");
        }
        function f(J) {
          var de = J ? "rgba" : "rgb", ge = J ? "," + this.floating({ min: W, max: X }) : "", Ce = y ? s(this.natural({ min: k, max: I }), ",") : this.natural({ min: M, max: T }) + "," + this.natural({ min: H, max: D }) + "," + this.natural({ max: 255 });
          return de + "(" + Ce + ge + ")";
        }
        function g(J, de, ge) {
          var Ce = ge ? "#" : "", re = "";
          return y ? (re = s(this.pad(this.hex({ min: k, max: I }), 2)), a.format === "shorthex" && (re = s(this.hex({ min: 0, max: 15 })))) : a.format === "shorthex" ? re = this.pad(this.hex({ min: Math.floor(_ / 16), max: Math.floor(S / 16) }), 1) + this.pad(this.hex({ min: Math.floor(M / 16), max: Math.floor(T / 16) }), 1) + this.pad(this.hex({ min: Math.floor(H / 16), max: Math.floor(D / 16) }), 1) : _ !== void 0 || S !== void 0 || M !== void 0 || T !== void 0 || H !== void 0 || D !== void 0 ? re = this.pad(this.hex({ min: _, max: S }), 2) + this.pad(this.hex({ min: M, max: T }), 2) + this.pad(this.hex({ min: H, max: D }), 2) : re = this.pad(this.hex({ min: k, max: I }), 2) + this.pad(this.hex({ min: k, max: I }), 2) + this.pad(this.hex({ min: k, max: I }), 2), Ce + re;
        }
        a = m(a, {
          format: this.pick(["hex", "shorthex", "rgb", "rgba", "0x", "name"]),
          grayscale: !1,
          casing: "lower",
          min: 0,
          max: 255,
          min_red: void 0,
          max_red: void 0,
          min_green: void 0,
          max_green: void 0,
          min_blue: void 0,
          max_blue: void 0,
          min_alpha: 0,
          max_alpha: 1
        });
        var y = a.grayscale, k = a.min, I = a.max, _ = a.min_red, S = a.max_red, M = a.min_green, T = a.max_green, H = a.min_blue, D = a.max_blue, W = a.min_alpha, X = a.max_alpha;
        a.min_red === void 0 && (_ = k), a.max_red === void 0 && (S = I), a.min_green === void 0 && (M = k), a.max_green === void 0 && (T = I), a.min_blue === void 0 && (H = k), a.max_blue === void 0 && (D = I), a.min_alpha === void 0 && (W = 0), a.max_alpha === void 0 && (X = 1), y && k === 0 && I === 255 && _ !== void 0 && S !== void 0 && (k = (_ + M + H) / 3, I = (S + T + D) / 3);
        var j;
        if (a.format === "hex")
          j = g.call(this, 2, 6, !0);
        else if (a.format === "shorthex")
          j = g.call(this, 1, 3, !0);
        else if (a.format === "rgb")
          j = f.call(this, !1);
        else if (a.format === "rgba")
          j = f.call(this, !0);
        else if (a.format === "0x")
          j = "0x" + g.call(this, 2, 6);
        else {
          if (a.format === "name")
            return this.pick(this.get("colorNames"));
          throw new RangeError('Invalid format provided. Please provide one of "hex", "shorthex", "rgb", "rgba", "0x" or "name".');
        }
        return a.casing === "upper" && (j = j.toUpperCase()), j;
      }, l.prototype.domain = function(a) {
        return a = m(a), this.word() + "." + (a.tld || this.tld());
      }, l.prototype.email = function(a) {
        return a = m(a), this.word({ length: a.length }) + "@" + (a.domain || this.domain());
      }, l.prototype.fbid = function() {
        return "10000" + this.string({ pool: "1234567890", length: 11 });
      }, l.prototype.google_analytics = function() {
        var a = this.pad(this.natural({ max: 999999 }), 6), s = this.pad(this.natural({ max: 99 }), 2);
        return "UA-" + a + "-" + s;
      }, l.prototype.hashtag = function() {
        return "#" + this.word();
      }, l.prototype.ip = function() {
        return this.natural({ min: 1, max: 254 }) + "." + this.natural({ max: 255 }) + "." + this.natural({ max: 255 }) + "." + this.natural({ min: 1, max: 254 });
      }, l.prototype.ipv6 = function() {
        var a = this.n(this.hash, 8, { length: 4 });
        return a.join(":");
      }, l.prototype.klout = function() {
        return this.natural({ min: 1, max: 99 });
      }, l.prototype.mac = function(a) {
        return a = m(a, { delimiter: ":" }), this.pad(this.natural({ max: 255 }).toString(16), 2) + a.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + a.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + a.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + a.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + a.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2);
      }, l.prototype.semver = function(a) {
        a = m(a, { include_prerelease: !0 });
        var s = this.pickone(["^", "~", "<", ">", "<=", ">=", "="]);
        a.range && (s = a.range);
        var f = "";
        return a.include_prerelease && (f = this.weighted(["", "-dev", "-beta", "-alpha"], [50, 10, 5, 1])), s + this.rpg("3d10").join(".") + f;
      }, l.prototype.tlds = function() {
        return ["com", "org", "edu", "gov", "co.uk", "net", "io", "ac", "ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm", "bn", "bo", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "eh", "er", "es", "et", "eu", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "su", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz", "ua", "ug", "uk", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf", "ws", "ye", "yt", "za", "zm", "zw"];
      }, l.prototype.tld = function() {
        return this.pick(this.tlds());
      }, l.prototype.twitter = function() {
        return "@" + this.word();
      }, l.prototype.url = function(a) {
        a = m(a, { protocol: "http", domain: this.domain(a), domain_prefix: "", path: this.word(), extensions: [] });
        var s = a.extensions.length > 0 ? "." + this.pick(a.extensions) : "", f = a.domain_prefix ? a.domain_prefix + "." + a.domain : a.domain;
        return a.protocol + "://" + f + "/" + a.path + s;
      }, l.prototype.port = function() {
        return this.integer({ min: 0, max: 65535 });
      }, l.prototype.locale = function(a) {
        return a = m(a), a.region ? this.pick(this.get("locale_regions")) : this.pick(this.get("locale_languages"));
      }, l.prototype.locales = function(a) {
        return a = m(a), a.region ? this.get("locale_regions") : this.get("locale_languages");
      }, l.prototype.loremPicsum = function(a) {
        a = m(a, { width: 500, height: 500, greyscale: !1, blurred: !1 });
        var s = a.greyscale ? "g/" : "", f = a.blurred ? "/?blur" : "/?random";
        return "https://picsum.photos/" + s + a.width + "/" + a.height + f;
      }, l.prototype.address = function(a) {
        return a = m(a), this.natural({ min: 5, max: 2e3 }) + " " + this.street(a);
      }, l.prototype.altitude = function(a) {
        return a = m(a, { fixed: 5, min: 0, max: 8848 }), this.floating({
          min: a.min,
          max: a.max,
          fixed: a.fixed
        });
      }, l.prototype.areacode = function(a) {
        a = m(a, { parens: !0 });
        var s = a.exampleNumber ? "555" : this.natural({ min: 2, max: 9 }).toString() + this.natural({ min: 0, max: 8 }).toString() + this.natural({ min: 0, max: 9 }).toString();
        return a.parens ? "(" + s + ")" : s;
      }, l.prototype.city = function() {
        return this.capitalize(this.word({ syllables: 3 }));
      }, l.prototype.coordinates = function(a) {
        return this.latitude(a) + ", " + this.longitude(a);
      }, l.prototype.countries = function() {
        return this.get("countries");
      }, l.prototype.country = function(a) {
        a = m(a);
        var s = this.pick(this.countries());
        return a.raw ? s : a.full ? s.name : s.abbreviation;
      }, l.prototype.depth = function(a) {
        return a = m(a, { fixed: 5, min: -10994, max: 0 }), this.floating({
          min: a.min,
          max: a.max,
          fixed: a.fixed
        });
      }, l.prototype.geohash = function(a) {
        return a = m(a, { length: 7 }), this.string({ length: a.length, pool: "0123456789bcdefghjkmnpqrstuvwxyz" });
      }, l.prototype.geojson = function(a) {
        return this.latitude(a) + ", " + this.longitude(a) + ", " + this.altitude(a);
      }, l.prototype.latitude = function(a) {
        var [s, f, g] = ["ddm", "dms", "dd"];
        a = m(
          a,
          a && a.format && [s, f].includes(a.format.toLowerCase()) ? { min: 0, max: 89, fixed: 4 } : { fixed: 5, min: -90, max: 90, format: g }
        );
        var y = a.format.toLowerCase();
        switch ((y === s || y === f) && (b(a.min < 0 || a.min > 89, "Chance: Min specified is out of range. Should be between 0 - 89"), b(a.max < 0 || a.max > 89, "Chance: Max specified is out of range. Should be between 0 - 89"), b(a.fixed > 4, "Chance: Fixed specified should be below or equal to 4")), y) {
          case s:
            return this.integer({ min: a.min, max: a.max }) + "\xB0" + this.floating({ min: 0, max: 59, fixed: a.fixed });
          case f:
            return this.integer({ min: a.min, max: a.max }) + "\xB0" + this.integer({ min: 0, max: 59 }) + "\u2019" + this.floating({ min: 0, max: 59, fixed: a.fixed }) + "\u201D";
          case g:
          default:
            return this.floating({ min: a.min, max: a.max, fixed: a.fixed });
        }
      }, l.prototype.longitude = function(a) {
        var [s, f, g] = ["ddm", "dms", "dd"];
        a = m(
          a,
          a && a.format && [s, f].includes(a.format.toLowerCase()) ? { min: 0, max: 179, fixed: 4 } : { fixed: 5, min: -180, max: 180, format: g }
        );
        var y = a.format.toLowerCase();
        switch ((y === s || y === f) && (b(a.min < 0 || a.min > 179, "Chance: Min specified is out of range. Should be between 0 - 179"), b(a.max < 0 || a.max > 179, "Chance: Max specified is out of range. Should be between 0 - 179"), b(a.fixed > 4, "Chance: Fixed specified should be below or equal to 4")), y) {
          case s:
            return this.integer({ min: a.min, max: a.max }) + "\xB0" + this.floating({ min: 0, max: 59.9999, fixed: a.fixed });
          case f:
            return this.integer({ min: a.min, max: a.max }) + "\xB0" + this.integer({ min: 0, max: 59 }) + "\u2019" + this.floating({ min: 0, max: 59.9999, fixed: a.fixed }) + "\u201D";
          case g:
          default:
            return this.floating({ min: a.min, max: a.max, fixed: a.fixed });
        }
      }, l.prototype.phone = function(a) {
        var s = this, f, g = function(H) {
          var D = [];
          return H.sections.forEach(function(W) {
            D.push(s.string({ pool: "0123456789", length: W }));
          }), H.area + D.join(" ");
        };
        a = m(a, {
          formatted: !0,
          country: "us",
          mobile: !1,
          exampleNumber: !1
        }), a.formatted || (a.parens = !1);
        var y;
        switch (a.country) {
          case "fr":
            a.mobile ? (f = this.pick(["06", "07"]) + s.string({ pool: "0123456789", length: 8 }), y = a.formatted ? f.match(/../g).join(" ") : f) : (f = this.pick([
              // Valid zone and département codes.
              "01" + this.pick(["30", "34", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "53", "55", "56", "58", "60", "64", "69", "70", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83"]) + s.string({ pool: "0123456789", length: 6 }),
              "02" + this.pick(["14", "18", "22", "23", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "40", "41", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "56", "57", "61", "62", "69", "72", "76", "77", "78", "85", "90", "96", "97", "98", "99"]) + s.string({ pool: "0123456789", length: 6 }),
              "03" + this.pick(["10", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "39", "44", "45", "51", "52", "54", "55", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "90"]) + s.string({ pool: "0123456789", length: 6 }),
              "04" + this.pick(["11", "13", "15", "20", "22", "26", "27", "30", "32", "34", "37", "42", "43", "44", "50", "56", "57", "63", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "88", "89", "90", "91", "92", "93", "94", "95", "97", "98"]) + s.string({ pool: "0123456789", length: 6 }),
              "05" + this.pick(["08", "16", "17", "19", "24", "31", "32", "33", "34", "35", "40", "45", "46", "47", "49", "53", "55", "56", "57", "58", "59", "61", "62", "63", "64", "65", "67", "79", "81", "82", "86", "87", "90", "94"]) + s.string({ pool: "0123456789", length: 6 }),
              "09" + s.string({ pool: "0123456789", length: 8 })
            ]), y = a.formatted ? f.match(/../g).join(" ") : f);
            break;
          case "uk":
            a.mobile ? (f = this.pick([
              { area: "07" + this.pick(["4", "5", "7", "8", "9"]), sections: [2, 6] },
              { area: "07624 ", sections: [6] }
            ]), y = a.formatted ? g(f) : g(f).replace(" ", "")) : (f = this.pick([
              //valid area codes of major cities/counties followed by random numbers in required format.
              { area: "01" + this.character({ pool: "234569" }) + "1 ", sections: [3, 4] },
              { area: "020 " + this.character({ pool: "378" }), sections: [3, 4] },
              { area: "023 " + this.character({ pool: "89" }), sections: [3, 4] },
              { area: "024 7", sections: [3, 4] },
              { area: "028 " + this.pick(["25", "28", "37", "71", "82", "90", "92", "95"]), sections: [2, 4] },
              { area: "012" + this.pick(["04", "08", "54", "76", "97", "98"]) + " ", sections: [6] },
              { area: "013" + this.pick(["63", "64", "84", "86"]) + " ", sections: [6] },
              { area: "014" + this.pick(["04", "20", "60", "61", "80", "88"]) + " ", sections: [6] },
              { area: "015" + this.pick(["24", "27", "62", "66"]) + " ", sections: [6] },
              { area: "016" + this.pick(["06", "29", "35", "47", "59", "95"]) + " ", sections: [6] },
              { area: "017" + this.pick(["26", "44", "50", "68"]) + " ", sections: [6] },
              { area: "018" + this.pick(["27", "37", "84", "97"]) + " ", sections: [6] },
              { area: "019" + this.pick(["00", "05", "35", "46", "49", "63", "95"]) + " ", sections: [6] }
            ]), y = a.formatted ? g(f) : g(f).replace(" ", "", "g"));
            break;
          case "za":
            a.mobile ? (f = this.pick([
              "060" + this.pick(["3", "4", "5", "6", "7", "8", "9"]) + s.string({ pool: "0123456789", length: 6 }),
              "061" + this.pick(["0", "1", "2", "3", "4", "5", "8"]) + s.string({ pool: "0123456789", length: 6 }),
              "06" + s.string({ pool: "0123456789", length: 7 }),
              "071" + this.pick(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) + s.string({ pool: "0123456789", length: 6 }),
              "07" + this.pick(["2", "3", "4", "6", "7", "8", "9"]) + s.string({ pool: "0123456789", length: 7 }),
              "08" + this.pick(["0", "1", "2", "3", "4", "5"]) + s.string({ pool: "0123456789", length: 7 })
            ]), y = a.formatted || f) : (f = this.pick([
              "01" + this.pick(["0", "1", "2", "3", "4", "5", "6", "7", "8"]) + s.string({ pool: "0123456789", length: 7 }),
              "02" + this.pick(["1", "2", "3", "4", "7", "8"]) + s.string({ pool: "0123456789", length: 7 }),
              "03" + this.pick(["1", "2", "3", "5", "6", "9"]) + s.string({ pool: "0123456789", length: 7 }),
              "04" + this.pick(["1", "2", "3", "4", "5", "6", "7", "8", "9"]) + s.string({ pool: "0123456789", length: 7 }),
              "05" + this.pick(["1", "3", "4", "6", "7", "8"]) + s.string({ pool: "0123456789", length: 7 })
            ]), y = a.formatted || f);
            break;
          case "us":
            var k = this.areacode(a).toString(), I = this.natural({ min: 2, max: 9 }).toString() + this.natural({ min: 0, max: 9 }).toString() + this.natural({ min: 0, max: 9 }).toString(), _ = this.natural({ min: 1e3, max: 9999 }).toString();
            y = a.formatted ? k + " " + I + "-" + _ : k + I + _;
            break;
          case "br":
            var S = this.pick(["11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28", "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48", "49", "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68", "69", "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87", "88", "89", "91", "92", "93", "94", "95", "96", "97", "98", "99"]), M;
            a.mobile ? M = "9" + s.string({ pool: "0123456789", length: 4 }) : M = this.natural({ min: 2e3, max: 5999 }).toString();
            var T = s.string({ pool: "0123456789", length: 4 });
            y = a.formatted ? "(" + S + ") " + M + "-" + T : S + M + T;
            break;
        }
        return y;
      }, l.prototype.postal = function() {
        var a = this.character({ pool: "XVTSRPNKLMHJGECBA" }), s = a + this.natural({ max: 9 }) + this.character({ alpha: !0, casing: "upper" }), f = this.natural({ max: 9 }) + this.character({ alpha: !0, casing: "upper" }) + this.natural({ max: 9 });
        return s + " " + f;
      }, l.prototype.postcode = function() {
        var a = this.pick(this.get("postcodeAreas")).code, s = this.natural({ max: 9 }), f = this.bool() ? this.character({ alpha: !0, casing: "upper" }) : "", g = a + s + f, y = this.natural({ max: 9 }), k = this.character({ alpha: !0, casing: "upper" }) + this.character({ alpha: !0, casing: "upper" }), I = y + k;
        return g + " " + I;
      }, l.prototype.counties = function(a) {
        return a = m(a, { country: "uk" }), this.get("counties")[a.country.toLowerCase()];
      }, l.prototype.county = function(a) {
        return this.pick(this.counties(a)).name;
      }, l.prototype.provinces = function(a) {
        return a = m(a, { country: "ca" }), this.get("provinces")[a.country.toLowerCase()];
      }, l.prototype.province = function(a) {
        return a && a.full ? this.pick(this.provinces(a)).name : this.pick(this.provinces(a)).abbreviation;
      }, l.prototype.state = function(a) {
        return a && a.full ? this.pick(this.states(a)).name : this.pick(this.states(a)).abbreviation;
      }, l.prototype.states = function(a) {
        a = m(a, { country: "us", us_states_and_dc: !0 });
        var s;
        switch (a.country.toLowerCase()) {
          case "us":
            var f = this.get("us_states_and_dc"), g = this.get("territories"), y = this.get("armed_forces");
            s = [], a.us_states_and_dc && (s = s.concat(f)), a.territories && (s = s.concat(g)), a.armed_forces && (s = s.concat(y));
            break;
          case "it":
          case "mx":
            s = this.get("country_regions")[a.country.toLowerCase()];
            break;
          case "uk":
            s = this.get("counties")[a.country.toLowerCase()];
            break;
        }
        return s;
      }, l.prototype.street = function(a) {
        a = m(a, { country: "us", syllables: 2 });
        var s;
        switch (a.country.toLowerCase()) {
          case "us":
            s = this.word({ syllables: a.syllables }), s = this.capitalize(s), s += " ", s += a.short_suffix ? this.street_suffix(a).abbreviation : this.street_suffix(a).name;
            break;
          case "it":
            s = this.word({ syllables: a.syllables }), s = this.capitalize(s), s = (a.short_suffix ? this.street_suffix(a).abbreviation : this.street_suffix(a).name) + " " + s;
            break;
        }
        return s;
      }, l.prototype.street_suffix = function(a) {
        return a = m(a, { country: "us" }), this.pick(this.street_suffixes(a));
      }, l.prototype.street_suffixes = function(a) {
        return a = m(a, { country: "us" }), this.get("street_suffixes")[a.country.toLowerCase()];
      }, l.prototype.zip = function(a) {
        var s = this.n(this.natural, 5, { max: 9 });
        return a && a.plusfour === !0 && (s.push("-"), s = s.concat(this.n(this.natural, 4, { max: 9 }))), s.join("");
      }, l.prototype.ampm = function() {
        return this.bool() ? "am" : "pm";
      }, l.prototype.date = function(a) {
        var s, f;
        if (a && (a.min || a.max)) {
          a = m(a, {
            american: !0,
            string: !1
          });
          var g = typeof a.min < "u" ? a.min.getTime() : 1, y = typeof a.max < "u" ? a.max.getTime() : 864e13;
          f = new Date(this.integer({ min: g, max: y }));
        } else {
          var k = this.month({ raw: !0 }), I = k.days;
          a && a.month && (I = this.get("months")[(a.month % 12 + 12) % 12].days), a = m(a, {
            year: parseInt(this.year(), 10),
            // Necessary to subtract 1 because Date() 0-indexes month but not day or year
            // for some reason.
            month: k.numeric - 1,
            day: this.natural({ min: 1, max: I }),
            hour: this.hour({ twentyfour: !0 }),
            minute: this.minute(),
            second: this.second(),
            millisecond: this.millisecond(),
            american: !0,
            string: !1
          }), f = new Date(a.year, a.month, a.day, a.hour, a.minute, a.second, a.millisecond);
        }
        return a.american ? s = f.getMonth() + 1 + "/" + f.getDate() + "/" + f.getFullYear() : s = f.getDate() + "/" + (f.getMonth() + 1) + "/" + f.getFullYear(), a.string ? s : f;
      }, l.prototype.hammertime = function(a) {
        return this.date(a).getTime();
      }, l.prototype.hour = function(a) {
        return a = m(a, {
          min: a && a.twentyfour ? 0 : 1,
          max: a && a.twentyfour ? 23 : 12
        }), b(a.min < 0, "Chance: Min cannot be less than 0."), b(a.twentyfour && a.max > 23, "Chance: Max cannot be greater than 23 for twentyfour option."), b(!a.twentyfour && a.max > 12, "Chance: Max cannot be greater than 12."), b(a.min > a.max, "Chance: Min cannot be greater than Max."), this.natural({ min: a.min, max: a.max });
      }, l.prototype.millisecond = function() {
        return this.natural({ max: 999 });
      }, l.prototype.minute = l.prototype.second = function(a) {
        return a = m(a, { min: 0, max: 59 }), b(a.min < 0, "Chance: Min cannot be less than 0."), b(a.max > 59, "Chance: Max cannot be greater than 59."), b(a.min > a.max, "Chance: Min cannot be greater than Max."), this.natural({ min: a.min, max: a.max });
      }, l.prototype.month = function(a) {
        a = m(a, { min: 1, max: 12 }), b(a.min < 1, "Chance: Min cannot be less than 1."), b(a.max > 12, "Chance: Max cannot be greater than 12."), b(a.min > a.max, "Chance: Min cannot be greater than Max.");
        var s = this.pick(this.months().slice(a.min - 1, a.max));
        return a.raw ? s : s.name;
      }, l.prototype.months = function() {
        return this.get("months");
      }, l.prototype.second = function() {
        return this.natural({ max: 59 });
      }, l.prototype.timestamp = function() {
        return this.natural({ min: 1, max: parseInt((/* @__PURE__ */ new Date()).getTime() / 1e3, 10) });
      }, l.prototype.weekday = function(a) {
        a = m(a, { weekday_only: !1 });
        var s = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        return a.weekday_only || (s.push("Saturday"), s.push("Sunday")), this.pickone(s);
      }, l.prototype.year = function(a) {
        return a = m(a, { min: (/* @__PURE__ */ new Date()).getFullYear() }), a.max = typeof a.max < "u" ? a.max : a.min + 100, this.natural(a).toString();
      }, l.prototype.cc = function(a) {
        a = m(a);
        var s, f, g;
        return s = a.type ? this.cc_type({ name: a.type, raw: !0 }) : this.cc_type({ raw: !0 }), f = s.prefix.split(""), g = s.length - s.prefix.length - 1, f = f.concat(this.n(this.integer, g, { min: 0, max: 9 })), f.push(this.luhn_calculate(f.join(""))), f.join("");
      }, l.prototype.cc_types = function() {
        return this.get("cc_types");
      }, l.prototype.cc_type = function(a) {
        a = m(a);
        var s = this.cc_types(), f = null;
        if (a.name) {
          for (var g = 0; g < s.length; g++)
            if (s[g].name === a.name || s[g].short_name === a.name) {
              f = s[g];
              break;
            }
          if (f === null)
            throw new RangeError("Chance: Credit card type '" + a.name + "' is not supported");
        } else
          f = this.pick(s);
        return a.raw ? f : f.name;
      }, l.prototype.currency_types = function() {
        return this.get("currency_types");
      }, l.prototype.currency = function() {
        return this.pick(this.currency_types());
      }, l.prototype.timezones = function() {
        return this.get("timezones");
      }, l.prototype.timezone = function() {
        return this.pick(this.timezones());
      }, l.prototype.currency_pair = function(a) {
        var s = this.unique(this.currency, 2, {
          comparator: function(f, g) {
            return f.reduce(function(y, k) {
              return y || k.code === g.code;
            }, !1);
          }
        });
        return a ? s[0].code + "/" + s[1].code : s;
      }, l.prototype.dollar = function(a) {
        a = m(a, { max: 1e4, min: 0 });
        var s = this.floating({ min: a.min, max: a.max, fixed: 2 }).toString(), f = s.split(".")[1];
        return f === void 0 ? s += ".00" : f.length < 2 && (s = s + "0"), s < 0 ? "-$" + s.replace("-", "") : "$" + s;
      }, l.prototype.euro = function(a) {
        return Number(this.dollar(a).replace("$", "")).toLocaleString() + "\u20AC";
      }, l.prototype.exp = function(a) {
        a = m(a);
        var s = {};
        return s.year = this.exp_year(), s.year === (/* @__PURE__ */ new Date()).getFullYear().toString() ? s.month = this.exp_month({ future: !0 }) : s.month = this.exp_month(), a.raw ? s : s.month + "/" + s.year;
      }, l.prototype.exp_month = function(a) {
        a = m(a);
        var s, f, g = (/* @__PURE__ */ new Date()).getMonth() + 1;
        if (a.future && g !== 12)
          do
            s = this.month({ raw: !0 }).numeric, f = parseInt(s, 10);
          while (f <= g);
        else
          s = this.month({ raw: !0 }).numeric;
        return s;
      }, l.prototype.exp_year = function() {
        var a = (/* @__PURE__ */ new Date()).getMonth() + 1, s = (/* @__PURE__ */ new Date()).getFullYear();
        return this.year({ min: a === 12 ? s + 1 : s, max: s + 10 });
      }, l.prototype.vat = function(a) {
        switch (a = m(a, { country: "it" }), a.country.toLowerCase()) {
          case "it":
            return this.it_vat();
        }
      }, l.prototype.iban = function() {
        var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", s = a + "0123456789", f = this.string({ length: 2, pool: a }) + this.pad(this.integer({ min: 0, max: 99 }), 2) + this.string({ length: 4, pool: s }) + this.pad(this.natural(), this.natural({ min: 6, max: 26 }));
        return f;
      }, l.prototype.it_vat = function() {
        var a = this.natural({ min: 1, max: 18e5 });
        return a = this.pad(a, 7) + this.pad(this.pick(this.provinces({ country: "it" })).code, 3), a + this.luhn_calculate(a);
      }, l.prototype.cf = function(a) {
        a = a || {};
        var s = a.gender ? a.gender : this.gender(), f = a.first ? a.first : this.first({ gender: s, nationality: "it" }), g = a.last ? a.last : this.last({ nationality: "it" }), y = a.birthday ? a.birthday : this.birthday(), k = a.city ? a.city : this.pickone(["A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "Z"]) + this.pad(this.natural({ max: 999 }), 3), I = [], _ = function(T, H) {
          var D, W = [];
          return T.length < 3 ? W = T.split("").concat("XXX".split("")).splice(0, 3) : (D = T.toUpperCase().split("").map(function(X) {
            return "BCDFGHJKLMNPRSTVWZ".indexOf(X) !== -1 ? X : void 0;
          }).join(""), D.length > 3 && (H ? D = D.substr(0, 3) : D = D[0] + D.substr(2, 2)), D.length < 3 && (W = D, D = T.toUpperCase().split("").map(function(X) {
            return "AEIOU".indexOf(X) !== -1 ? X : void 0;
          }).join("").substr(0, 3 - W.length)), W = W + D), W;
        }, S = function(T, H, D) {
          var W = ["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"];
          return T.getFullYear().toString().substr(2) + W[T.getMonth()] + D.pad(T.getDate() + (H.toLowerCase() === "female" ? 40 : 0), 2);
        }, M = function(T) {
          for (var H = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", D = "ABCDEFGHIJABCDEFGHIJKLMNOPQRSTUVWXYZ", W = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", X = "BAKPLCQDREVOSFTGUHMINJWZYX", j = 0, J = 0; J < 15; J++)
            J % 2 !== 0 ? j += W.indexOf(D[H.indexOf(T[J])]) : j += X.indexOf(D[H.indexOf(T[J])]);
          return W[j % 26];
        };
        return I = I.concat(_(g, !0), _(f), S(y, s, this), k.toUpperCase().split("")).join(""), I += M(I.toUpperCase()), I.toUpperCase();
      }, l.prototype.pl_pesel = function() {
        for (var a = this.natural({ min: 1, max: 9999999999 }), s = this.pad(a, 10).split(""), f = 0; f < s.length; f++)
          s[f] = parseInt(s[f]);
        var g = (1 * s[0] + 3 * s[1] + 7 * s[2] + 9 * s[3] + 1 * s[4] + 3 * s[5] + 7 * s[6] + 9 * s[7] + 1 * s[8] + 3 * s[9]) % 10;
        return g !== 0 && (g = 10 - g), s.join("") + g;
      }, l.prototype.pl_nip = function() {
        for (var a = this.natural({ min: 1, max: 999999999 }), s = this.pad(a, 9).split(""), f = 0; f < s.length; f++)
          s[f] = parseInt(s[f]);
        var g = (6 * s[0] + 5 * s[1] + 7 * s[2] + 2 * s[3] + 3 * s[4] + 4 * s[5] + 5 * s[6] + 6 * s[7] + 7 * s[8]) % 11;
        return g === 10 ? this.pl_nip() : s.join("") + g;
      }, l.prototype.pl_regon = function() {
        for (var a = this.natural({ min: 1, max: 99999999 }), s = this.pad(a, 8).split(""), f = 0; f < s.length; f++)
          s[f] = parseInt(s[f]);
        var g = (8 * s[0] + 9 * s[1] + 2 * s[2] + 3 * s[3] + 4 * s[4] + 5 * s[5] + 6 * s[6] + 7 * s[7]) % 11;
        return g === 10 && (g = 0), s.join("") + g;
      }, l.prototype.music_genre = function(a = "general") {
        if (!(a.toLowerCase() in B.music_genres))
          throw new Error(`Unsupported genre: ${a}`);
        const s = B.music_genres[a.toLowerCase()], f = this.integer({ min: 0, max: s.length - 1 });
        return s[f];
      }, l.prototype.note = function(a) {
        a = m(a, { notes: "flatKey" });
        var s = {
          naturals: ["C", "D", "E", "F", "G", "A", "B"],
          flats: ["D\u266D", "E\u266D", "G\u266D", "A\u266D", "B\u266D"],
          sharps: ["C\u266F", "D\u266F", "F\u266F", "G\u266F", "A\u266F"]
        };
        return s.all = s.naturals.concat(s.flats.concat(s.sharps)), s.flatKey = s.naturals.concat(s.flats), s.sharpKey = s.naturals.concat(s.sharps), this.pickone(s[a.notes]);
      }, l.prototype.midi_note = function(a) {
        var s = 0, f = 127;
        return a = m(a, { min: s, max: f }), this.integer({ min: a.min, max: a.max });
      }, l.prototype.chord_quality = function(a) {
        a = m(a, { jazz: !0 });
        var s = ["maj", "min", "aug", "dim"];
        return a.jazz && (s = [
          "maj7",
          "min7",
          "7",
          "sus",
          "dim",
          "\xF8"
        ]), this.pickone(s);
      }, l.prototype.chord = function(a) {
        return a = m(a), this.note(a) + this.chord_quality(a);
      }, l.prototype.tempo = function(a) {
        var s = 40, f = 320;
        return a = m(a, { min: s, max: f }), this.integer({ min: a.min, max: a.max });
      }, l.prototype.coin = function() {
        return this.bool() ? "heads" : "tails";
      };
      function L(a) {
        return function() {
          return this.natural(a);
        };
      }
      l.prototype.d4 = L({ min: 1, max: 4 }), l.prototype.d6 = L({ min: 1, max: 6 }), l.prototype.d8 = L({ min: 1, max: 8 }), l.prototype.d10 = L({ min: 1, max: 10 }), l.prototype.d12 = L({ min: 1, max: 12 }), l.prototype.d20 = L({ min: 1, max: 20 }), l.prototype.d30 = L({ min: 1, max: 30 }), l.prototype.d100 = L({ min: 1, max: 100 }), l.prototype.rpg = function(a, s) {
        if (s = m(s), a) {
          var f = a.toLowerCase().split("d"), g = [];
          if (f.length !== 2 || !parseInt(f[0], 10) || !parseInt(f[1], 10))
            throw new Error("Chance: Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
          for (var y = f[0]; y > 0; y--)
            g[y - 1] = this.natural({ min: 1, max: f[1] });
          return typeof s.sum < "u" && s.sum ? g.reduce(function(k, I) {
            return k + I;
          }) : g;
        } else
          throw new RangeError("Chance: A type of die roll must be included");
      }, l.prototype.guid = function(a) {
        a = m(a, { version: 5 });
        var s = "abcdef1234567890", f = "ab89", g = this.string({ pool: s, length: 8 }) + "-" + this.string({ pool: s, length: 4 }) + "-" + // The Version
        a.version + this.string({ pool: s, length: 3 }) + "-" + // The Variant
        this.string({ pool: f, length: 1 }) + this.string({ pool: s, length: 3 }) + "-" + this.string({ pool: s, length: 12 });
        return g;
      }, l.prototype.hash = function(a) {
        a = m(a, { length: 40, casing: "lower" });
        var s = a.casing === "upper" ? c.toUpperCase() : c;
        return this.string({ pool: s, length: a.length });
      }, l.prototype.luhn_check = function(a) {
        var s = a.toString(), f = +s.substring(s.length - 1);
        return f === this.luhn_calculate(+s.substring(0, s.length - 1));
      }, l.prototype.luhn_calculate = function(a) {
        for (var s = a.toString().split("").reverse(), f = 0, g, y = 0, k = s.length; k > y; ++y)
          g = +s[y], y % 2 === 0 && (g *= 2, g > 9 && (g -= 9)), f += g;
        return f * 9 % 10;
      }, l.prototype.md5 = function(a) {
        var s = { str: "", key: null, raw: !1 };
        if (!a)
          s.str = this.string(), a = {};
        else if (typeof a == "string")
          s.str = a, a = {};
        else {
          if (typeof a != "object")
            return null;
          if (a.constructor === "Array")
            return null;
        }
        if (s = m(a, s), !s.str)
          throw new Error("A parameter is required to return an md5 hash.");
        return this.bimd5.md5(s.str, s.key, s.raw);
      }, l.prototype.file = function(a) {
        var s = a || {}, f = "fileExtension", g = Object.keys(this.get("fileExtension")), y, k;
        if (y = this.word({ length: s.length }), s.extension)
          return k = s.extension, y + "." + k;
        if (s.extensions) {
          if (Array.isArray(s.extensions))
            return k = this.pickone(s.extensions), y + "." + k;
          if (s.extensions.constructor === Object) {
            var I = s.extensions, _ = Object.keys(I);
            return k = this.pickone(I[this.pickone(_)]), y + "." + k;
          }
          throw new Error("Chance: Extensions must be an Array or Object");
        }
        if (s.fileType) {
          var S = s.fileType;
          if (g.indexOf(S) !== -1)
            return k = this.pickone(this.get(f)[S]), y + "." + k;
          throw new RangeError("Chance: Expect file type value to be 'raster', 'vector', '3d' or 'document'");
        }
        return k = this.pickone(this.get(f)[this.pickone(g)]), y + "." + k;
      }, l.prototype.fileWithContent = function(a) {
        var s = a || {}, f = "fileName" in s ? s.fileName : this.file().split(".")[0];
        if (f += "." + ("fileExtension" in s ? s.fileExtension : this.file().split(".")[1]), typeof s.fileSize != "number")
          throw new Error("File size must be an integer");
        var g = {
          fileData: this.buffer({ length: s.fileSize }),
          fileName: f
        };
        return g;
      };
      var B = {
        firstNames: {
          male: {
            en: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew", "George", "Donald", "Anthony", "Paul", "Mark", "Edward", "Steven", "Kenneth", "Andrew", "Brian", "Joshua", "Kevin", "Ronald", "Timothy", "Jason", "Jeffrey", "Frank", "Gary", "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Jonathan", "Scott", "Raymond", "Justin", "Brandon", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Henry", "Walter", "Dennis", "Jerry", "Alexander", "Peter", "Tyler", "Douglas", "Harold", "Aaron", "Jose", "Adam", "Arthur", "Zachary", "Carl", "Nathan", "Albert", "Kyle", "Lawrence", "Joe", "Willie", "Gerald", "Roger", "Keith", "Jeremy", "Terry", "Harry", "Ralph", "Sean", "Jesse", "Roy", "Louis", "Billy", "Austin", "Bruce", "Eugene", "Christian", "Bryan", "Wayne", "Russell", "Howard", "Fred", "Ethan", "Jordan", "Philip", "Alan", "Juan", "Randy", "Vincent", "Bobby", "Dylan", "Johnny", "Phillip", "Victor", "Clarence", "Ernest", "Martin", "Craig", "Stanley", "Shawn", "Travis", "Bradley", "Leonard", "Earl", "Gabriel", "Jimmy", "Francis", "Todd", "Noah", "Danny", "Dale", "Cody", "Carlos", "Allen", "Frederick", "Logan", "Curtis", "Alex", "Joel", "Luis", "Norman", "Marvin", "Glenn", "Tony", "Nathaniel", "Rodney", "Melvin", "Alfred", "Steve", "Cameron", "Chad", "Edwin", "Caleb", "Evan", "Antonio", "Lee", "Herbert", "Jeffery", "Isaac", "Derek", "Ricky", "Marcus", "Theodore", "Elijah", "Luke", "Jesus", "Eddie", "Troy", "Mike", "Dustin", "Ray", "Adrian", "Bernard", "Leroy", "Angel", "Randall", "Wesley", "Ian", "Jared", "Mason", "Hunter", "Calvin", "Oscar", "Clifford", "Jay", "Shane", "Ronnie", "Barry", "Lucas", "Corey", "Manuel", "Leo", "Tommy", "Warren", "Jackson", "Isaiah", "Connor", "Don", "Dean", "Jon", "Julian", "Miguel", "Bill", "Lloyd", "Charlie", "Mitchell", "Leon", "Jerome", "Darrell", "Jeremiah", "Alvin", "Brett", "Seth", "Floyd", "Jim", "Blake", "Micheal", "Gordon", "Trevor", "Lewis", "Erik", "Edgar", "Vernon", "Devin", "Gavin", "Jayden", "Chris", "Clyde", "Tom", "Derrick", "Mario", "Brent", "Marc", "Herman", "Chase", "Dominic", "Ricardo", "Franklin", "Maurice", "Max", "Aiden", "Owen", "Lester", "Gilbert", "Elmer", "Gene", "Francisco", "Glen", "Cory", "Garrett", "Clayton", "Sam", "Jorge", "Chester", "Alejandro", "Jeff", "Harvey", "Milton", "Cole", "Ivan", "Andre", "Duane", "Landon"],
            // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0163
            it: ["Adolfo", "Alberto", "Aldo", "Alessandro", "Alessio", "Alfredo", "Alvaro", "Andrea", "Angelo", "Angiolo", "Antonino", "Antonio", "Attilio", "Benito", "Bernardo", "Bruno", "Carlo", "Cesare", "Christian", "Claudio", "Corrado", "Cosimo", "Cristian", "Cristiano", "Daniele", "Dario", "David", "Davide", "Diego", "Dino", "Domenico", "Duccio", "Edoardo", "Elia", "Elio", "Emanuele", "Emiliano", "Emilio", "Enrico", "Enzo", "Ettore", "Fabio", "Fabrizio", "Federico", "Ferdinando", "Fernando", "Filippo", "Francesco", "Franco", "Gabriele", "Giacomo", "Giampaolo", "Giampiero", "Giancarlo", "Gianfranco", "Gianluca", "Gianmarco", "Gianni", "Gino", "Giorgio", "Giovanni", "Giuliano", "Giulio", "Giuseppe", "Graziano", "Gregorio", "Guido", "Iacopo", "Jacopo", "Lapo", "Leonardo", "Lorenzo", "Luca", "Luciano", "Luigi", "Manuel", "Marcello", "Marco", "Marino", "Mario", "Massimiliano", "Massimo", "Matteo", "Mattia", "Maurizio", "Mauro", "Michele", "Mirko", "Mohamed", "Nello", "Neri", "Niccol\xF2", "Nicola", "Osvaldo", "Otello", "Paolo", "Pier Luigi", "Piero", "Pietro", "Raffaele", "Remo", "Renato", "Renzo", "Riccardo", "Roberto", "Rolando", "Romano", "Salvatore", "Samuele", "Sandro", "Sergio", "Silvano", "Simone", "Stefano", "Thomas", "Tommaso", "Ubaldo", "Ugo", "Umberto", "Valerio", "Valter", "Vasco", "Vincenzo", "Vittorio"],
            // Data taken from http://www.svbkindernamen.nl/int/nl/kindernamen/index.html
            nl: ["Aaron", "Abel", "Adam", "Adriaan", "Albert", "Alexander", "Ali", "Arjen", "Arno", "Bart", "Bas", "Bastiaan", "Benjamin", "Bob", "Boris", "Bram", "Brent", "Cas", "Casper", "Chris", "Christiaan", "Cornelis", "Daan", "Daley", "Damian", "Dani", "Daniel", "Dani\xEBl", "David", "Dean", "Dirk", "Dylan", "Egbert", "Elijah", "Erik", "Erwin", "Evert", "Ezra", "Fabian", "Fedde", "Finn", "Florian", "Floris", "Frank", "Frans", "Frederik", "Freek", "Geert", "Gerard", "Gerben", "Gerrit", "Gijs", "Guus", "Hans", "Hendrik", "Henk", "Herman", "Hidde", "Hugo", "Jaap", "Jan Jaap", "Jan-Willem", "Jack", "Jacob", "Jan", "Jason", "Jasper", "Jayden", "Jelle", "Jelte", "Jens", "Jeroen", "Jesse", "Jim", "Job", "Joep", "Johannes", "John", "Jonathan", "Joris", "Joshua", "Jo\xEBl", "Julian", "Kees", "Kevin", "Koen", "Lars", "Laurens", "Leendert", "Lennard", "Lodewijk", "Luc", "Luca", "Lucas", "Lukas", "Luuk", "Maarten", "Marcus", "Martijn", "Martin", "Matthijs", "Maurits", "Max", "Mees", "Melle", "Mick", "Mika", "Milan", "Mohamed", "Mohammed", "Morris", "Muhammed", "Nathan", "Nick", "Nico", "Niek", "Niels", "Noah", "Noud", "Olivier", "Oscar", "Owen", "Paul", "Pepijn", "Peter", "Pieter", "Pim", "Quinten", "Reinier", "Rens", "Robin", "Ruben", "Sam", "Samuel", "Sander", "Sebastiaan", "Sem", "Sep", "Sepp", "Siem", "Simon", "Stan", "Stef", "Steven", "Stijn", "Sven", "Teun", "Thijmen", "Thijs", "Thomas", "Tijn", "Tim", "Timo", "Tobias", "Tom", "Victor", "Vince", "Willem", "Wim", "Wouter", "Yusuf"],
            // Data taken from https://fr.wikipedia.org/wiki/Liste_de_pr%C3%A9noms_fran%C3%A7ais_et_de_la_francophonie
            fr: ["Aaron", "Abdon", "Abel", "Ab\xE9lard", "Abelin", "Abondance", "Abraham", "Absalon", "Acace", "Achaire", "Achille", "Adalard", "Adalbald", "Adalb\xE9ron", "Adalbert", "Adalric", "Adam", "Adegrin", "Adel", "Adelin", "Andelin", "Adelphe", "Adam", "Ad\xE9odat", "Adh\xE9mar", "Adjutor", "Adolphe", "Adonis", "Adon", "Adrien", "Agapet", "Agathange", "Agathon", "Agilbert", "Ag\xE9nor", "Agnan", "Aignan", "Agrippin", "Aimable", "Aim\xE9", "Alain", "Alban", "Albin", "Aubin", "Alb\xE9ric", "Albert", "Albertet", "Alcibiade", "Alcide", "Alc\xE9e", "Alcime", "Aldonce", "Aldric", "Ald\xE9ric", "Aleaume", "Alexandre", "Alexis", "Alix", "Alliaume", "Aleaume", "Almine", "Almire", "Alo\xEFs", "Alph\xE9e", "Alphonse", "Alpinien", "Alver\xE8de", "Amalric", "Amaury", "Amandin", "Amant", "Ambroise", "Am\xE9d\xE9e", "Am\xE9lien", "Amiel", "Amour", "Ana\xEBl", "Anastase", "Anatole", "Ancelin", "And\xE9ol", "Andoche", "Andr\xE9", "Andoche", "Ange", "Angelin", "Angilbe", "Anglebert", "Angoustan", "Anicet", "Anne", "Annibal", "Ansbert", "Anselme", "Anthelme", "Antheaume", "Anthime", "Antide", "Antoine", "Antonius", "Antonin", "Apollinaire", "Apollon", "Aquilin", "Arcade", "Archambaud", "Archambeau", "Archange", "Archibald", "Arian", "Ariel", "Ariste", "Aristide", "Armand", "Armel", "Armin", "Arnould", "Arnaud", "Arolde", "Ars\xE8ne", "Arsino\xE9", "Arthaud", "Arth\xE8me", "Arthur", "Ascelin", "Athanase", "Aubry", "Audebert", "Audouin", "Audran", "Audric", "Auguste", "Augustin", "Aur\xE8le", "Aur\xE9lien", "Aurian", "Auxence", "Axel", "Aymard", "Aymeric", "Aymon", "Aymond", "Balthazar", "Baptiste", "Barnab\xE9", "Barth\xE9lemy", "Bartim\xE9e", "Basile", "Bastien", "Baudouin", "B\xE9nigne", "Benjamin", "Beno\xEEt", "B\xE9renger", "B\xE9rard", "Bernard", "Bertrand", "Blaise", "Bon", "Boniface", "Bouchard", "Brice", "Brieuc", "Bruno", "Brunon", "Calixte", "Calliste", "Cam\xE9lien", "Camille", "Camillien", "Candide", "Caribert", "Carloman", "Cassandre", "Cassien", "C\xE9dric", "C\xE9leste", "C\xE9lestin", "C\xE9lien", "C\xE9saire", "C\xE9sar", "Charles", "Charlemagne", "Childebert", "Chilp\xE9ric", "Chr\xE9tien", "Christian", "Christodule", "Christophe", "Chrysostome", "Clarence", "Claude", "Claudien", "Cl\xE9andre", "Cl\xE9ment", "Clotaire", "C\xF4me", "Constance", "Constant", "Constantin", "Corentin", "Cyprien", "Cyriaque", "Cyrille", "Cyril", "Damien", "Daniel", "David", "Delphin", "Denis", "D\xE9sir\xE9", "Didier", "Dieudonn\xE9", "Dimitri", "Dominique", "Dorian", "Doroth\xE9e", "Edgard", "Edmond", "\xC9douard", "\xC9leuth\xE8re", "\xC9lie", "\xC9lis\xE9e", "\xC9meric", "\xC9mile", "\xC9milien", "Emmanuel", "Enguerrand", "\xC9piphane", "\xC9ric", "Esprit", "Ernest", "\xC9tienne", "Eubert", "Eudes", "Eudoxe", "Eug\xE8ne", "Eus\xE8be", "Eustache", "\xC9variste", "\xC9vrard", "Fabien", "Fabrice", "Falba", "F\xE9licit\xE9", "F\xE9lix", "Ferdinand", "Fiacre", "Fid\xE8le", "Firmin", "Flavien", "Flodoard", "Florent", "Florentin", "Florestan", "Florian", "Fortun\xE9", "Foulques", "Francisque", "Fran\xE7ois", "Fran\xE7ais", "Franciscus", "Francs", "Fr\xE9d\xE9ric", "Fulbert", "Fulcran", "Fulgence", "Gabin", "Gabriel", "Ga\xEBl", "Garnier", "Gaston", "Gaspard", "Gatien", "Gaud", "Gautier", "G\xE9d\xE9on", "Geoffroy", "Georges", "G\xE9raud", "G\xE9rard", "Gerbert", "Germain", "Gervais", "Ghislain", "Gilbert", "Gilles", "Girart", "Gislebert", "Gondebaud", "Gonthier", "Gontran", "Gonzague", "Gr\xE9goire", "Gu\xE9rin", "Gui", "Guillaume", "Gustave", "Guy", "Guyot", "Hardouin", "Hector", "H\xE9delin", "H\xE9lier", "Henri", "Herbert", "Herluin", "Herv\xE9", "Hilaire", "Hildebert", "Hincmar", "Hippolyte", "Honor\xE9", "Hubert", "Hugues", "Innocent", "Isabeau", "Isidore", "Jacques", "Japhet", "Jason", "Jean", "Jeannel", "Jeannot", "J\xE9r\xE9mie", "J\xE9r\xF4me", "Joachim", "Joanny", "Job", "Jocelyn", "Jo\xEBl", "Johan", "Jonas", "Jonathan", "Joseph", "Josse", "Josselin", "Jourdain", "Jude", "Judica\xEBl", "Jules", "Julien", "Juste", "Justin", "Lambert", "Landry", "Laurent", "Lazare", "L\xE9andre", "L\xE9on", "L\xE9onard", "L\xE9opold", "Leu", "Loup", "Leufroy", "Lib\xE8re", "Li\xE9tald", "Lionel", "Lo\xEFc", "Longin", "Lorrain", "Lorraine", "Lothaire", "Louis", "Loup", "Luc", "Lucas", "Lucien", "Ludolphe", "Ludovic", "Macaire", "Malo", "Mamert", "Manass\xE9", "Marc", "Marceau", "Marcel", "Marcelin", "Marius", "Marseille", "Martial", "Martin", "Mathurin", "Matthias", "Mathias", "Matthieu", "Maugis", "Maurice", "Mauricet", "Maxence", "Maxime", "Maximilien", "Mayeul", "M\xE9d\xE9ric", "Melchior", "Mence", "Merlin", "M\xE9rov\xE9e", "Micha\xEBl", "Michel", "Mo\xEFse", "Morgan", "Nathan", "Nathana\xEBl", "Narcisse", "N\xE9h\xE9mie", "Nestor", "Nestor", "Nic\xE9phore", "Nicolas", "No\xE9", "No\xEBl", "Norbert", "Normand", "Normands", "Octave", "Odilon", "Odon", "Oger", "Olivier", "Oury", "Pac\xF4me", "Pal\xE9mon", "Parfait", "Pascal", "Paterne", "Patrice", "Paul", "P\xE9pin", "Perceval", "Phil\xE9mon", "Philibert", "Philippe", "Philoth\xE9e", "Pie", "Pierre", "Pierrick", "Prosper", "Quentin", "Raoul", "Rapha\xEBl", "Raymond", "R\xE9gis", "R\xE9jean", "R\xE9mi", "Renaud", "Ren\xE9", "Reybaud", "Richard", "Robert", "Roch", "Rodolphe", "Rodrigue", "Roger", "Roland", "Romain", "Romuald", "Rom\xE9o", "Rome", "Ronan", "Roselin", "Salomon", "Samuel", "Savin", "Savinien", "Scholastique", "S\xE9bastien", "S\xE9raphin", "Serge", "S\xE9verin", "Sidoine", "Sigebert", "Sigismond", "Silv\xE8re", "Simon", "Sim\xE9on", "Sixte", "Stanislas", "St\xE9phane", "Stephan", "Sylvain", "Sylvestre", "Tancr\xE8de", "Tanguy", "Taurin", "Th\xE9odore", "Th\xE9odose", "Th\xE9ophile", "Th\xE9ophraste", "Thibault", "Thibert", "Thierry", "Thomas", "Timol\xE9on", "Timoth\xE9e", "Titien", "Tonnin", "Toussaint", "Trajan", "Tristan", "Turold", "Tim", "Ulysse", "Urbain", "Valentin", "Val\xE8re", "Val\xE9ry", "Venance", "Venant", "Venceslas", "Vianney", "Victor", "Victorien", "Victorin", "Vigile", "Vincent", "Vital", "Vitalien", "Vivien", "Waleran", "Wandrille", "Xavier", "X\xE9nophon", "Yves", "Zacharie", "Zach\xE9", "Z\xE9phirin"]
          },
          female: {
            en: ["Mary", "Emma", "Elizabeth", "Minnie", "Margaret", "Ida", "Alice", "Bertha", "Sarah", "Annie", "Clara", "Ella", "Florence", "Cora", "Martha", "Laura", "Nellie", "Grace", "Carrie", "Maude", "Mabel", "Bessie", "Jennie", "Gertrude", "Julia", "Hattie", "Edith", "Mattie", "Rose", "Catherine", "Lillian", "Ada", "Lillie", "Helen", "Jessie", "Louise", "Ethel", "Lula", "Myrtle", "Eva", "Frances", "Lena", "Lucy", "Edna", "Maggie", "Pearl", "Daisy", "Fannie", "Josephine", "Dora", "Rosa", "Katherine", "Agnes", "Marie", "Nora", "May", "Mamie", "Blanche", "Stella", "Ellen", "Nancy", "Effie", "Sallie", "Nettie", "Della", "Lizzie", "Flora", "Susie", "Maud", "Mae", "Etta", "Harriet", "Sadie", "Caroline", "Katie", "Lydia", "Elsie", "Kate", "Susan", "Mollie", "Alma", "Addie", "Georgia", "Eliza", "Lulu", "Nannie", "Lottie", "Amanda", "Belle", "Charlotte", "Rebecca", "Ruth", "Viola", "Olive", "Amelia", "Hannah", "Jane", "Virginia", "Emily", "Matilda", "Irene", "Kathryn", "Esther", "Willie", "Henrietta", "Ollie", "Amy", "Rachel", "Sara", "Estella", "Theresa", "Augusta", "Ora", "Pauline", "Josie", "Lola", "Sophia", "Leona", "Anne", "Mildred", "Ann", "Beulah", "Callie", "Lou", "Delia", "Eleanor", "Barbara", "Iva", "Louisa", "Maria", "Mayme", "Evelyn", "Estelle", "Nina", "Betty", "Marion", "Bettie", "Dorothy", "Luella", "Inez", "Lela", "Rosie", "Allie", "Millie", "Janie", "Cornelia", "Victoria", "Ruby", "Winifred", "Alta", "Celia", "Christine", "Beatrice", "Birdie", "Harriett", "Mable", "Myra", "Sophie", "Tillie", "Isabel", "Sylvia", "Carolyn", "Isabelle", "Leila", "Sally", "Ina", "Essie", "Bertie", "Nell", "Alberta", "Katharine", "Lora", "Rena", "Mina", "Rhoda", "Mathilda", "Abbie", "Eula", "Dollie", "Hettie", "Eunice", "Fanny", "Ola", "Lenora", "Adelaide", "Christina", "Lelia", "Nelle", "Sue", "Johanna", "Lilly", "Lucinda", "Minerva", "Lettie", "Roxie", "Cynthia", "Helena", "Hilda", "Hulda", "Bernice", "Genevieve", "Jean", "Cordelia", "Marian", "Francis", "Jeanette", "Adeline", "Gussie", "Leah", "Lois", "Lura", "Mittie", "Hallie", "Isabella", "Olga", "Phoebe", "Teresa", "Hester", "Lida", "Lina", "Winnie", "Claudia", "Marguerite", "Vera", "Cecelia", "Bess", "Emilie", "Rosetta", "Verna", "Myrtie", "Cecilia", "Elva", "Olivia", "Ophelia", "Georgie", "Elnora", "Violet", "Adele", "Lily", "Linnie", "Loretta", "Madge", "Polly", "Virgie", "Eugenia", "Lucile", "Lucille", "Mabelle", "Rosalie"],
            // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0162
            it: ["Ada", "Adriana", "Alessandra", "Alessia", "Alice", "Angela", "Anna", "Anna Maria", "Annalisa", "Annita", "Annunziata", "Antonella", "Arianna", "Asia", "Assunta", "Aurora", "Barbara", "Beatrice", "Benedetta", "Bianca", "Bruna", "Camilla", "Carla", "Carlotta", "Carmela", "Carolina", "Caterina", "Catia", "Cecilia", "Chiara", "Cinzia", "Clara", "Claudia", "Costanza", "Cristina", "Daniela", "Debora", "Diletta", "Dina", "Donatella", "Elena", "Eleonora", "Elisa", "Elisabetta", "Emanuela", "Emma", "Eva", "Federica", "Fernanda", "Fiorella", "Fiorenza", "Flora", "Franca", "Francesca", "Gabriella", "Gaia", "Gemma", "Giada", "Gianna", "Gina", "Ginevra", "Giorgia", "Giovanna", "Giulia", "Giuliana", "Giuseppa", "Giuseppina", "Grazia", "Graziella", "Greta", "Ida", "Ilaria", "Ines", "Iolanda", "Irene", "Irma", "Isabella", "Jessica", "Laura", "Lea", "Letizia", "Licia", "Lidia", "Liliana", "Lina", "Linda", "Lisa", "Livia", "Loretta", "Luana", "Lucia", "Luciana", "Lucrezia", "Luisa", "Manuela", "Mara", "Marcella", "Margherita", "Maria", "Maria Cristina", "Maria Grazia", "Maria Luisa", "Maria Pia", "Maria Teresa", "Marina", "Marisa", "Marta", "Martina", "Marzia", "Matilde", "Melissa", "Michela", "Milena", "Mirella", "Monica", "Natalina", "Nella", "Nicoletta", "Noemi", "Olga", "Paola", "Patrizia", "Piera", "Pierina", "Raffaella", "Rebecca", "Renata", "Rina", "Rita", "Roberta", "Rosa", "Rosanna", "Rossana", "Rossella", "Sabrina", "Sandra", "Sara", "Serena", "Silvana", "Silvia", "Simona", "Simonetta", "Sofia", "Sonia", "Stefania", "Susanna", "Teresa", "Tina", "Tiziana", "Tosca", "Valentina", "Valeria", "Vanda", "Vanessa", "Vanna", "Vera", "Veronica", "Vilma", "Viola", "Virginia", "Vittoria"],
            // Data taken from http://www.svbkindernamen.nl/int/nl/kindernamen/index.html
            nl: ["Ada", "Arianne", "Afke", "Amanda", "Amber", "Amy", "Aniek", "Anita", "Anja", "Anna", "Anne", "Annelies", "Annemarie", "Annette", "Anouk", "Astrid", "Aukje", "Barbara", "Bianca", "Carla", "Carlijn", "Carolien", "Chantal", "Charlotte", "Claudia", "Dani\xEBlle", "Debora", "Diane", "Dora", "Eline", "Elise", "Ella", "Ellen", "Emma", "Esmee", "Evelien", "Esther", "Erica", "Eva", "Femke", "Fleur", "Floor", "Froukje", "Gea", "Gerda", "Hanna", "Hanneke", "Heleen", "Hilde", "Ilona", "Ina", "Inge", "Ingrid", "Iris", "Isabel", "Isabelle", "Janneke", "Jasmijn", "Jeanine", "Jennifer", "Jessica", "Johanna", "Joke", "Julia", "Julie", "Karen", "Karin", "Katja", "Kim", "Lara", "Laura", "Lena", "Lianne", "Lieke", "Lilian", "Linda", "Lisa", "Lisanne", "Lotte", "Louise", "Maaike", "Manon", "Marga", "Maria", "Marissa", "Marit", "Marjolein", "Martine", "Marleen", "Melissa", "Merel", "Miranda", "Michelle", "Mirjam", "Mirthe", "Naomi", "Natalie", "Nienke", "Nina", "Noortje", "Olivia", "Patricia", "Paula", "Paulien", "Ramona", "Ria", "Rianne", "Roos", "Rosanne", "Ruth", "Sabrina", "Sandra", "Sanne", "Sara", "Saskia", "Silvia", "Sofia", "Sophie", "Sonja", "Suzanne", "Tamara", "Tess", "Tessa", "Tineke", "Valerie", "Vanessa", "Veerle", "Vera", "Victoria", "Wendy", "Willeke", "Yvonne", "Zo\xEB"],
            // Data taken from https://fr.wikipedia.org/wiki/Liste_de_pr%C3%A9noms_fran%C3%A7ais_et_de_la_francophonie
            fr: ["Abdon", "Abel", "Abiga\xEBlle", "Abiga\xEFl", "Acacius", "Acanthe", "Adalbert", "Adalsinde", "Adegrine", "Ad\xE9la\xEFde", "Ad\xE8le", "Ad\xE9lie", "Adeline", "Adeltrude", "Adolphe", "Adonis", "Adrast\xE9e", "Adrehilde", "Adrienne", "Agathe", "Agilbert", "Agla\xE9", "Aignan", "Agnefl\xE8te", "Agn\xE8s", "Agrippine", "Aim\xE9", "Alaine", "Ala\xEFs", "Albane", "Alb\xE9rade", "Alberte", "Alcide", "Alcine", "Alcyone", "Aldegonde", "Aleth", "Alexandrine", "Alexine", "Alice", "Ali\xE9nor", "Aliette", "Aline", "Alix", "Aliz\xE9", "Alo\xEFse", "Aloyse", "Alphonsine", "Alth\xE9e", "Amaliane", "Amalth\xE9e", "Amande", "Amandine", "Amant", "Amarande", "Amaranthe", "Amaryllis", "Ambre", "Ambroisie", "Am\xE9lie", "Am\xE9thyste", "Aminte", "Ana\xEBl", "Ana\xEFs", "Anastasie", "Anatole", "Ancelin", "Andr\xE9e", "An\xE9mone", "Angadr\xEAme", "Ang\xE8le", "Angeline", "Ang\xE9lique", "Angilbert", "Anicet", "Annabelle", "Anne", "Annette", "Annick", "Annie", "Annonciade", "Ansbert", "Anstrudie", "Anthelme", "Antigone", "Antoinette", "Antonine", "Aph\xE9lie", "Apolline", "Apollonie", "Aquiline", "Arabelle", "Arcadie", "Archange", "Argine", "Ariane", "Aricie", "Ariel", "Arielle", "Arlette", "Armance", "Armande", "Armandine", "Armelle", "Armide", "Armelle", "Armin", "Arnaud", "Ars\xE8ne", "Arsino\xE9", "Art\xE9mis", "Arthur", "Ascelin", "Ascension", "Assomption", "Astart\xE9", "Ast\xE9rie", "Astr\xE9e", "Astrid", "Athalie", "Athanasie", "Athina", "Aube", "Albert", "Aude", "Audrey", "Augustine", "Aure", "Aur\xE9lie", "Aur\xE9lien", "Aur\xE8le", "Aurore", "Auxence", "Aveline", "Abiga\xEBlle", "Avoye", "Axelle", "Aymard", "Azal\xE9e", "Ad\xE8le", "Adeline", "Barbe", "Basilisse", "Bathilde", "B\xE9atrice", "B\xE9atrix", "B\xE9n\xE9dicte", "B\xE9reng\xE8re", "Bernadette", "Berthe", "Bertille", "Beuve", "Blanche", "Blanc", "Blandine", "Brigitte", "Brune", "Brunehilde", "Callista", "Camille", "Capucine", "Carine", "Caroline", "Cassandre", "Catherine", "C\xE9cile", "C\xE9leste", "C\xE9lestine", "C\xE9line", "Chantal", "Charl\xE8ne", "Charline", "Charlotte", "Chlo\xE9", "Christelle", "Christiane", "Christine", "Claire", "Clara", "Claude", "Claudine", "Clarisse", "Cl\xE9mence", "Cl\xE9mentine", "Cl\xE9o", "Clio", "Clotilde", "Coline", "Conception", "Constance", "Coralie", "Coraline", "Corentine", "Corinne", "Cyrielle", "Daniel", "Daniel", "Daphn\xE9", "D\xE9bora", "Delphine", "Denise", "Diane", "Dieudonn\xE9", "Dominique", "Doriane", "Doroth\xE9e", "Douce", "\xC9dith", "Edm\xE9e", "\xC9l\xE9onore", "\xC9liane", "\xC9lia", "\xC9liette", "\xC9lisabeth", "\xC9lise", "Ella", "\xC9lodie", "\xC9lo\xEFse", "Elsa", "\xC9meline", "\xC9m\xE9rance", "\xC9m\xE9rentienne", "\xC9m\xE9rencie", "\xC9milie", "Emma", "Emmanuelle", "Emmelie", "Ernestine", "Esther", "Estelle", "Eudoxie", "Eug\xE9nie", "Eulalie", "Euphrasie", "Eus\xE9bie", "\xC9vang\xE9line", "Eva", "\xC8ve", "\xC9velyne", "Fanny", "Fantine", "Faustine", "F\xE9licie", "Fernande", "Flavie", "Fleur", "Flore", "Florence", "Florie", "Fortun\xE9", "France", "Francia", "Fran\xE7oise", "Francine", "Gabrielle", "Ga\xEBlle", "Garance", "Genevi\xE8ve", "Georgette", "Gerberge", "Germaine", "Gertrude", "Gis\xE8le", "Gueni\xE8vre", "Guilhemine", "Guillemette", "Gustave", "Gwenael", "H\xE9l\xE8ne", "H\xE9lo\xEFse", "Henriette", "Hermine", "Hermione", "Hippolyte", "Honorine", "Hortense", "Huguette", "Ines", "Ir\xE8ne", "Irina", "Iris", "Isabeau", "Isabelle", "Iseult", "Isolde", "Ism\xE9rie", "Jacinthe", "Jacqueline", "Jade", "Janine", "Jeanne", "Jocelyne", "Jo\xEBlle", "Jos\xE9phine", "Judith", "Julia", "Julie", "Jules", "Juliette", "Justine", "Katy", "Kathy", "Katie", "Laura", "Laure", "Laureline", "Laurence", "Laurene", "Lauriane", "Laurianne", "Laurine", "L\xE9a", "L\xE9na", "L\xE9onie", "L\xE9on", "L\xE9ontine", "Lorraine", "Lucie", "Lucienne", "Lucille", "Ludivine", "Lydie", "Lydie", "Megane", "Madeleine", "Magali", "Maguelone", "Mallaury", "Manon", "Marceline", "Margot", "Marguerite", "Marianne", "Marie", "Myriam", "Marie", "Marine", "Marion", "Marl\xE8ne", "Marthe", "Martine", "Mathilde", "Maud", "Maureen", "Mauricette", "Maxime", "M\xE9lanie", "Melissa", "M\xE9lissandre", "M\xE9lisande", "M\xE9lodie", "Michel", "Micheline", "Mireille", "Miriam", "Mo\xEFse", "Monique", "Morgane", "Muriel", "Myl\xE8ne", "Nad\xE8ge", "Nadine", "Nathalie", "Nicole", "Nicolette", "Nine", "No\xEBl", "No\xE9mie", "Oc\xE9ane", "Odette", "Odile", "Olive", "Olivia", "Olympe", "Ombline", "Ombeline", "Oph\xE9lie", "Oriande", "Oriane", "Ozanne", "Pascale", "Pascaline", "Paule", "Paulette", "Pauline", "Priscille", "Prisca", "Prisque", "P\xE9cine", "P\xE9lagie", "P\xE9n\xE9lope", "Perrine", "P\xE9tronille", "Philippine", "Philom\xE8ne", "Philoth\xE9e", "Primerose", "Prudence", "Pulch\xE9rie", "Quentine", "Qui\xE9ta", "Quintia", "Quintilla", "Rachel", "Rapha\xEBlle", "Raymonde", "Rebecca", "R\xE9gine", "R\xE9jeanne", "Ren\xE9", "Rita", "Rita", "Rolande", "Romane", "Rosalie", "Rose", "Roseline", "Sabine", "Salom\xE9", "Sandra", "Sandrine", "Sarah", "S\xE9gol\xE8ne", "S\xE9verine", "Sibylle", "Simone", "Sixt", "Solange", "Soline", "Sol\xE8ne", "Sophie", "St\xE9phanie", "Suzanne", "Sylvain", "Sylvie", "Tatiana", "Tha\xEFs", "Th\xE9odora", "Th\xE9r\xE8se", "Tiphaine", "Ursule", "Valentine", "Val\xE9rie", "V\xE9ronique", "Victoire", "Victorine", "Vinciane", "Violette", "Virginie", "Viviane", "Xavi\xE8re", "Yolande", "Ysaline", "Yvette", "Yvonne", "Z\xE9lie", "Zita", "Zo\xE9"]
          }
        },
        lastNames: {
          en: ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez", "James", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons", "Foster", "Gonzales", "Bryant", "Alexander", "Russell", "Griffin", "Diaz", "Hayes", "Myers", "Ford", "Hamilton", "Graham", "Sullivan", "Wallace", "Woods", "Cole", "West", "Jordan", "Owens", "Reynolds", "Fisher", "Ellis", "Harrison", "Gibson", "McDonald", "Cruz", "Marshall", "Ortiz", "Gomez", "Murray", "Freeman", "Wells", "Webb", "Simpson", "Stevens", "Tucker", "Porter", "Hunter", "Hicks", "Crawford", "Henry", "Boyd", "Mason", "Morales", "Kennedy", "Warren", "Dixon", "Ramos", "Reyes", "Burns", "Gordon", "Shaw", "Holmes", "Rice", "Robertson", "Hunt", "Black", "Daniels", "Palmer", "Mills", "Nichols", "Grant", "Knight", "Ferguson", "Rose", "Stone", "Hawkins", "Dunn", "Perkins", "Hudson", "Spencer", "Gardner", "Stephens", "Payne", "Pierce", "Berry", "Matthews", "Arnold", "Wagner", "Willis", "Ray", "Watkins", "Olson", "Carroll", "Duncan", "Snyder", "Hart", "Cunningham", "Bradley", "Lane", "Andrews", "Ruiz", "Harper", "Fox", "Riley", "Armstrong", "Carpenter", "Weaver", "Greene", "Lawrence", "Elliott", "Chavez", "Sims", "Austin", "Peters", "Kelley", "Franklin", "Lawson", "Fields", "Gutierrez", "Ryan", "Schmidt", "Carr", "Vasquez", "Castillo", "Wheeler", "Chapman", "Oliver", "Montgomery", "Richards", "Williamson", "Johnston", "Banks", "Meyer", "Bishop", "McCoy", "Howell", "Alvarez", "Morrison", "Hansen", "Fernandez", "Garza", "Harvey", "Little", "Burton", "Stanley", "Nguyen", "George", "Jacobs", "Reid", "Kim", "Fuller", "Lynch", "Dean", "Gilbert", "Garrett", "Romero", "Welch", "Larson", "Frazier", "Burke", "Hanson", "Day", "Mendoza", "Moreno", "Bowman", "Medina", "Fowler", "Brewer", "Hoffman", "Carlson", "Silva", "Pearson", "Holland", "Douglas", "Fleming", "Jensen", "Vargas", "Byrd", "Davidson", "Hopkins", "May", "Terry", "Herrera", "Wade", "Soto", "Walters", "Curtis", "Neal", "Caldwell", "Lowe", "Jennings", "Barnett", "Graves", "Jimenez", "Horton", "Shelton", "Barrett", "Obrien", "Castro", "Sutton", "Gregory", "McKinney", "Lucas", "Miles", "Craig", "Rodriquez", "Chambers", "Holt", "Lambert", "Fletcher", "Watts", "Bates", "Hale", "Rhodes", "Pena", "Beck", "Newman", "Haynes", "McDaniel", "Mendez", "Bush", "Vaughn", "Parks", "Dawson", "Santiago", "Norris", "Hardy", "Love", "Steele", "Curry", "Powers", "Schultz", "Barker", "Guzman", "Page", "Munoz", "Ball", "Keller", "Chandler", "Weber", "Leonard", "Walsh", "Lyons", "Ramsey", "Wolfe", "Schneider", "Mullins", "Benson", "Sharp", "Bowen", "Daniel", "Barber", "Cummings", "Hines", "Baldwin", "Griffith", "Valdez", "Hubbard", "Salazar", "Reeves", "Warner", "Stevenson", "Burgess", "Santos", "Tate", "Cross", "Garner", "Mann", "Mack", "Moss", "Thornton", "Dennis", "McGee", "Farmer", "Delgado", "Aguilar", "Vega", "Glover", "Manning", "Cohen", "Harmon", "Rodgers", "Robbins", "Newton", "Todd", "Blair", "Higgins", "Ingram", "Reese", "Cannon", "Strickland", "Townsend", "Potter", "Goodwin", "Walton", "Rowe", "Hampton", "Ortega", "Patton", "Swanson", "Joseph", "Francis", "Goodman", "Maldonado", "Yates", "Becker", "Erickson", "Hodges", "Rios", "Conner", "Adkins", "Webster", "Norman", "Malone", "Hammond", "Flowers", "Cobb", "Moody", "Quinn", "Blake", "Maxwell", "Pope", "Floyd", "Osborne", "Paul", "McCarthy", "Guerrero", "Lindsey", "Estrada", "Sandoval", "Gibbs", "Tyler", "Gross", "Fitzgerald", "Stokes", "Doyle", "Sherman", "Saunders", "Wise", "Colon", "Gill", "Alvarado", "Greer", "Padilla", "Simon", "Waters", "Nunez", "Ballard", "Schwartz", "McBride", "Houston", "Christensen", "Klein", "Pratt", "Briggs", "Parsons", "McLaughlin", "Zimmerman", "French", "Buchanan", "Moran", "Copeland", "Roy", "Pittman", "Brady", "McCormick", "Holloway", "Brock", "Poole", "Frank", "Logan", "Owen", "Bass", "Marsh", "Drake", "Wong", "Jefferson", "Park", "Morton", "Abbott", "Sparks", "Patrick", "Norton", "Huff", "Clayton", "Massey", "Lloyd", "Figueroa", "Carson", "Bowers", "Roberson", "Barton", "Tran", "Lamb", "Harrington", "Casey", "Boone", "Cortez", "Clarke", "Mathis", "Singleton", "Wilkins", "Cain", "Bryan", "Underwood", "Hogan", "McKenzie", "Collier", "Luna", "Phelps", "McGuire", "Allison", "Bridges", "Wilkerson", "Nash", "Summers", "Atkins"],
          // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0164 (first 1000)
          it: ["Acciai", "Aglietti", "Agostini", "Agresti", "Ahmed", "Aiazzi", "Albanese", "Alberti", "Alessi", "Alfani", "Alinari", "Alterini", "Amato", "Ammannati", "Ancillotti", "Andrei", "Andreini", "Andreoni", "Angeli", "Anichini", "Antonelli", "Antonini", "Arena", "Ariani", "Arnetoli", "Arrighi", "Baccani", "Baccetti", "Bacci", "Bacherini", "Badii", "Baggiani", "Baglioni", "Bagni", "Bagnoli", "Baldassini", "Baldi", "Baldini", "Ballerini", "Balli", "Ballini", "Balloni", "Bambi", "Banchi", "Bandinelli", "Bandini", "Bani", "Barbetti", "Barbieri", "Barchielli", "Bardazzi", "Bardelli", "Bardi", "Barducci", "Bargellini", "Bargiacchi", "Barni", "Baroncelli", "Baroncini", "Barone", "Baroni", "Baronti", "Bartalesi", "Bartoletti", "Bartoli", "Bartolini", "Bartoloni", "Bartolozzi", "Basagni", "Basile", "Bassi", "Batacchi", "Battaglia", "Battaglini", "Bausi", "Becagli", "Becattini", "Becchi", "Becucci", "Bellandi", "Bellesi", "Belli", "Bellini", "Bellucci", "Bencini", "Benedetti", "Benelli", "Beni", "Benini", "Bensi", "Benucci", "Benvenuti", "Berlincioni", "Bernacchioni", "Bernardi", "Bernardini", "Berni", "Bernini", "Bertelli", "Berti", "Bertini", "Bessi", "Betti", "Bettini", "Biagi", "Biagini", "Biagioni", "Biagiotti", "Biancalani", "Bianchi", "Bianchini", "Bianco", "Biffoli", "Bigazzi", "Bigi", "Biliotti", "Billi", "Binazzi", "Bindi", "Bini", "Biondi", "Bizzarri", "Bocci", "Bogani", "Bolognesi", "Bonaiuti", "Bonanni", "Bonciani", "Boncinelli", "Bondi", "Bonechi", "Bongini", "Boni", "Bonini", "Borchi", "Boretti", "Borghi", "Borghini", "Borgioli", "Borri", "Borselli", "Boschi", "Bottai", "Bracci", "Braccini", "Brandi", "Braschi", "Bravi", "Brazzini", "Breschi", "Brilli", "Brizzi", "Brogelli", "Brogi", "Brogioni", "Brunelli", "Brunetti", "Bruni", "Bruno", "Brunori", "Bruschi", "Bucci", "Bucciarelli", "Buccioni", "Bucelli", "Bulli", "Burberi", "Burchi", "Burgassi", "Burroni", "Bussotti", "Buti", "Caciolli", "Caiani", "Calabrese", "Calamai", "Calamandrei", "Caldini", "Calo'", "Calonaci", "Calosi", "Calvelli", "Cambi", "Camiciottoli", "Cammelli", "Cammilli", "Campolmi", "Cantini", "Capanni", "Capecchi", "Caponi", "Cappelletti", "Cappelli", "Cappellini", "Cappugi", "Capretti", "Caputo", "Carbone", "Carboni", "Cardini", "Carlesi", "Carletti", "Carli", "Caroti", "Carotti", "Carrai", "Carraresi", "Carta", "Caruso", "Casalini", "Casati", "Caselli", "Casini", "Castagnoli", "Castellani", "Castelli", "Castellucci", "Catalano", "Catarzi", "Catelani", "Cavaciocchi", "Cavallaro", "Cavallini", "Cavicchi", "Cavini", "Ceccarelli", "Ceccatelli", "Ceccherelli", "Ceccherini", "Cecchi", "Cecchini", "Cecconi", "Cei", "Cellai", "Celli", "Cellini", "Cencetti", "Ceni", "Cenni", "Cerbai", "Cesari", "Ceseri", "Checcacci", "Checchi", "Checcucci", "Cheli", "Chellini", "Chen", "Cheng", "Cherici", "Cherubini", "Chiaramonti", "Chiarantini", "Chiarelli", "Chiari", "Chiarini", "Chiarugi", "Chiavacci", "Chiesi", "Chimenti", "Chini", "Chirici", "Chiti", "Ciabatti", "Ciampi", "Cianchi", "Cianfanelli", "Cianferoni", "Ciani", "Ciapetti", "Ciappi", "Ciardi", "Ciatti", "Cicali", "Ciccone", "Cinelli", "Cini", "Ciobanu", "Ciolli", "Cioni", "Cipriani", "Cirillo", "Cirri", "Ciucchi", "Ciuffi", "Ciulli", "Ciullini", "Clemente", "Cocchi", "Cognome", "Coli", "Collini", "Colombo", "Colzi", "Comparini", "Conforti", "Consigli", "Conte", "Conti", "Contini", "Coppini", "Coppola", "Corsi", "Corsini", "Corti", "Cortini", "Cosi", "Costa", "Costantini", "Costantino", "Cozzi", "Cresci", "Crescioli", "Cresti", "Crini", "Curradi", "D'Agostino", "D'Alessandro", "D'Amico", "D'Angelo", "Daddi", "Dainelli", "Dallai", "Danti", "Davitti", "De Angelis", "De Luca", "De Marco", "De Rosa", "De Santis", "De Simone", "De Vita", "Degl'Innocenti", "Degli Innocenti", "Dei", "Del Lungo", "Del Re", "Di Marco", "Di Stefano", "Dini", "Diop", "Dobre", "Dolfi", "Donati", "Dondoli", "Dong", "Donnini", "Ducci", "Dumitru", "Ermini", "Esposito", "Evangelisti", "Fabbri", "Fabbrini", "Fabbrizzi", "Fabbroni", "Fabbrucci", "Fabiani", "Facchini", "Faggi", "Fagioli", "Failli", "Faini", "Falciani", "Falcini", "Falcone", "Fallani", "Falorni", "Falsini", "Falugiani", "Fancelli", "Fanelli", "Fanetti", "Fanfani", "Fani", "Fantappie'", "Fantechi", "Fanti", "Fantini", "Fantoni", "Farina", "Fattori", "Favilli", "Fedi", "Fei", "Ferrante", "Ferrara", "Ferrari", "Ferraro", "Ferretti", "Ferri", "Ferrini", "Ferroni", "Fiaschi", "Fibbi", "Fiesoli", "Filippi", "Filippini", "Fini", "Fioravanti", "Fiore", "Fiorentini", "Fiorini", "Fissi", "Focardi", "Foggi", "Fontana", "Fontanelli", "Fontani", "Forconi", "Formigli", "Forte", "Forti", "Fortini", "Fossati", "Fossi", "Francalanci", "Franceschi", "Franceschini", "Franchi", "Franchini", "Franci", "Francini", "Francioni", "Franco", "Frassineti", "Frati", "Fratini", "Frilli", "Frizzi", "Frosali", "Frosini", "Frullini", "Fusco", "Fusi", "Gabbrielli", "Gabellini", "Gagliardi", "Galanti", "Galardi", "Galeotti", "Galletti", "Galli", "Gallo", "Gallori", "Gambacciani", "Gargani", "Garofalo", "Garuglieri", "Gashi", "Gasperini", "Gatti", "Gelli", "Gensini", "Gentile", "Gentili", "Geri", "Gerini", "Gheri", "Ghini", "Giachetti", "Giachi", "Giacomelli", "Gianassi", "Giani", "Giannelli", "Giannetti", "Gianni", "Giannini", "Giannoni", "Giannotti", "Giannozzi", "Gigli", "Giordano", "Giorgetti", "Giorgi", "Giovacchini", "Giovannelli", "Giovannetti", "Giovannini", "Giovannoni", "Giuliani", "Giunti", "Giuntini", "Giusti", "Gonnelli", "Goretti", "Gori", "Gradi", "Gramigni", "Grassi", "Grasso", "Graziani", "Grazzini", "Greco", "Grifoni", "Grillo", "Grimaldi", "Grossi", "Gualtieri", "Guarducci", "Guarino", "Guarnieri", "Guasti", "Guerra", "Guerri", "Guerrini", "Guidi", "Guidotti", "He", "Hoxha", "Hu", "Huang", "Iandelli", "Ignesti", "Innocenti", "Jin", "La Rosa", "Lai", "Landi", "Landini", "Lanini", "Lapi", "Lapini", "Lari", "Lascialfari", "Lastrucci", "Latini", "Lazzeri", "Lazzerini", "Lelli", "Lenzi", "Leonardi", "Leoncini", "Leone", "Leoni", "Lepri", "Li", "Liao", "Lin", "Linari", "Lippi", "Lisi", "Livi", "Lombardi", "Lombardini", "Lombardo", "Longo", "Lopez", "Lorenzi", "Lorenzini", "Lorini", "Lotti", "Lu", "Lucchesi", "Lucherini", "Lunghi", "Lupi", "Madiai", "Maestrini", "Maffei", "Maggi", "Maggini", "Magherini", "Magini", "Magnani", "Magnelli", "Magni", "Magnolfi", "Magrini", "Malavolti", "Malevolti", "Manca", "Mancini", "Manetti", "Manfredi", "Mangani", "Mannelli", "Manni", "Mannini", "Mannucci", "Manuelli", "Manzini", "Marcelli", "Marchese", "Marchetti", "Marchi", "Marchiani", "Marchionni", "Marconi", "Marcucci", "Margheri", "Mari", "Mariani", "Marilli", "Marinai", "Marinari", "Marinelli", "Marini", "Marino", "Mariotti", "Marsili", "Martelli", "Martinelli", "Martini", "Martino", "Marzi", "Masi", "Masini", "Masoni", "Massai", "Materassi", "Mattei", "Matteini", "Matteucci", "Matteuzzi", "Mattioli", "Mattolini", "Matucci", "Mauro", "Mazzanti", "Mazzei", "Mazzetti", "Mazzi", "Mazzini", "Mazzocchi", "Mazzoli", "Mazzoni", "Mazzuoli", "Meacci", "Mecocci", "Meini", "Melani", "Mele", "Meli", "Mengoni", "Menichetti", "Meoni", "Merlini", "Messeri", "Messina", "Meucci", "Miccinesi", "Miceli", "Micheli", "Michelini", "Michelozzi", "Migliori", "Migliorini", "Milani", "Miniati", "Misuri", "Monaco", "Montagnani", "Montagni", "Montanari", "Montelatici", "Monti", "Montigiani", "Montini", "Morandi", "Morandini", "Morelli", "Moretti", "Morganti", "Mori", "Morini", "Moroni", "Morozzi", "Mugnai", "Mugnaini", "Mustafa", "Naldi", "Naldini", "Nannelli", "Nanni", "Nannini", "Nannucci", "Nardi", "Nardini", "Nardoni", "Natali", "Ndiaye", "Nencetti", "Nencini", "Nencioni", "Neri", "Nesi", "Nesti", "Niccolai", "Niccoli", "Niccolini", "Nigi", "Nistri", "Nocentini", "Noferini", "Novelli", "Nucci", "Nuti", "Nutini", "Oliva", "Olivieri", "Olmi", "Orlandi", "Orlandini", "Orlando", "Orsini", "Ortolani", "Ottanelli", "Pacciani", "Pace", "Paci", "Pacini", "Pagani", "Pagano", "Paggetti", "Pagliai", "Pagni", "Pagnini", "Paladini", "Palagi", "Palchetti", "Palloni", "Palmieri", "Palumbo", "Pampaloni", "Pancani", "Pandolfi", "Pandolfini", "Panerai", "Panichi", "Paoletti", "Paoli", "Paolini", "Papi", "Papini", "Papucci", "Parenti", "Parigi", "Parisi", "Parri", "Parrini", "Pasquini", "Passeri", "Pecchioli", "Pecorini", "Pellegrini", "Pepi", "Perini", "Perrone", "Peruzzi", "Pesci", "Pestelli", "Petri", "Petrini", "Petrucci", "Pettini", "Pezzati", "Pezzatini", "Piani", "Piazza", "Piazzesi", "Piazzini", "Piccardi", "Picchi", "Piccini", "Piccioli", "Pieraccini", "Pieraccioni", "Pieralli", "Pierattini", "Pieri", "Pierini", "Pieroni", "Pietrini", "Pini", "Pinna", "Pinto", "Pinzani", "Pinzauti", "Piras", "Pisani", "Pistolesi", "Poggesi", "Poggi", "Poggiali", "Poggiolini", "Poli", "Pollastri", "Porciani", "Pozzi", "Pratellesi", "Pratesi", "Prosperi", "Pruneti", "Pucci", "Puccini", "Puccioni", "Pugi", "Pugliese", "Puliti", "Querci", "Quercioli", "Raddi", "Radu", "Raffaelli", "Ragazzini", "Ranfagni", "Ranieri", "Rastrelli", "Raugei", "Raveggi", "Renai", "Renzi", "Rettori", "Ricci", "Ricciardi", "Ridi", "Ridolfi", "Rigacci", "Righi", "Righini", "Rinaldi", "Risaliti", "Ristori", "Rizzo", "Rocchi", "Rocchini", "Rogai", "Romagnoli", "Romanelli", "Romani", "Romano", "Romei", "Romeo", "Romiti", "Romoli", "Romolini", "Rontini", "Rosati", "Roselli", "Rosi", "Rossetti", "Rossi", "Rossini", "Rovai", "Ruggeri", "Ruggiero", "Russo", "Sabatini", "Saccardi", "Sacchetti", "Sacchi", "Sacco", "Salerno", "Salimbeni", "Salucci", "Salvadori", "Salvestrini", "Salvi", "Salvini", "Sanesi", "Sani", "Sanna", "Santi", "Santini", "Santoni", "Santoro", "Santucci", "Sardi", "Sarri", "Sarti", "Sassi", "Sbolci", "Scali", "Scarpelli", "Scarselli", "Scopetani", "Secci", "Selvi", "Senatori", "Senesi", "Serafini", "Sereni", "Serra", "Sestini", "Sguanci", "Sieni", "Signorini", "Silvestri", "Simoncini", "Simonetti", "Simoni", "Singh", "Sodi", "Soldi", "Somigli", "Sorbi", "Sorelli", "Sorrentino", "Sottili", "Spina", "Spinelli", "Staccioli", "Staderini", "Stefanelli", "Stefani", "Stefanini", "Stella", "Susini", "Tacchi", "Tacconi", "Taddei", "Tagliaferri", "Tamburini", "Tanganelli", "Tani", "Tanini", "Tapinassi", "Tarchi", "Tarchiani", "Targioni", "Tassi", "Tassini", "Tempesti", "Terzani", "Tesi", "Testa", "Testi", "Tilli", "Tinti", "Tirinnanzi", "Toccafondi", "Tofanari", "Tofani", "Tognaccini", "Tonelli", "Tonini", "Torelli", "Torrini", "Tosi", "Toti", "Tozzi", "Trambusti", "Trapani", "Tucci", "Turchi", "Ugolini", "Ulivi", "Valente", "Valenti", "Valentini", "Vangelisti", "Vanni", "Vannini", "Vannoni", "Vannozzi", "Vannucchi", "Vannucci", "Ventura", "Venturi", "Venturini", "Vestri", "Vettori", "Vichi", "Viciani", "Vieri", "Vigiani", "Vignoli", "Vignolini", "Vignozzi", "Villani", "Vinci", "Visani", "Vitale", "Vitali", "Viti", "Viviani", "Vivoli", "Volpe", "Volpi", "Wang", "Wu", "Xu", "Yang", "Ye", "Zagli", "Zani", "Zanieri", "Zanobini", "Zecchi", "Zetti", "Zhang", "Zheng", "Zhou", "Zhu", "Zingoni", "Zini", "Zoppi"],
          // http://www.voornamelijk.nl/meest-voorkomende-achternamen-in-nederland-en-amsterdam/
          nl: ["Albers", "Alblas", "Appelman", "Baars", "Baas", "Bakker", "Blank", "Bleeker", "Blok", "Blom", "Boer", "Boers", "Boldewijn", "Boon", "Boot", "Bos", "Bosch", "Bosma", "Bosman", "Bouma", "Bouman", "Bouwman", "Brands", "Brouwer", "Burger", "Buijs", "Buitenhuis", "Ceder", "Cohen", "Dekker", "Dekkers", "Dijkman", "Dijkstra", "Driessen", "Drost", "Engel", "Evers", "Faber", "Franke", "Gerritsen", "Goedhart", "Goossens", "Groen", "Groenenberg", "Groot", "Haan", "Hart", "Heemskerk", "Hendriks", "Hermans", "Hoekstra", "Hofman", "Hopman", "Huisman", "Jacobs", "Jansen", "Janssen", "Jonker", "Jaspers", "Keijzer", "Klaassen", "Klein", "Koek", "Koenders", "Kok", "Kool", "Koopman", "Koopmans", "Koning", "Koster", "Kramer", "Kroon", "Kuijpers", "Kuiper", "Kuipers", "Kurt", "Koster", "Kwakman", "Los", "Lubbers", "Maas", "Markus", "Martens", "Meijer", "Mol", "Molenaar", "Mulder", "Nieuwenhuis", "Peeters", "Peters", "Pengel", "Pieters", "Pool", "Post", "Postma", "Prins", "Pronk", "Reijnders", "Rietveld", "Roest", "Roos", "Sanders", "Schaap", "Scheffer", "Schenk", "Schilder", "Schipper", "Schmidt", "Scholten", "Schouten", "Schut", "Schutte", "Schuurman", "Simons", "Smeets", "Smit", "Smits", "Snel", "Swinkels", "Tas", "Terpstra", "Timmermans", "Tol", "Tromp", "Troost", "Valk", "Veenstra", "Veldkamp", "Verbeek", "Verheul", "Verhoeven", "Vermeer", "Vermeulen", "Verweij", "Vink", "Visser", "Voorn", "Vos", "Wagenaar", "Wiersema", "Willems", "Willemsen", "Witteveen", "Wolff", "Wolters", "Zijlstra", "Zwart", "de Beer", "de Boer", "de Bruijn", "de Bruin", "de Graaf", "de Groot", "de Haan", "de Haas", "de Jager", "de Jong", "de Jonge", "de Koning", "de Lange", "de Leeuw", "de Ridder", "de Rooij", "de Ruiter", "de Vos", "de Vries", "de Waal", "de Wit", "de Zwart", "van Beek", "van Boven", "van Dam", "van Dijk", "van Dongen", "van Doorn", "van Egmond", "van Eijk", "van Es", "van Gelder", "van Gelderen", "van Houten", "van Hulst", "van Kempen", "van Kesteren", "van Leeuwen", "van Loon", "van Mill", "van Noord", "van Ommen", "van Ommeren", "van Oosten", "van Oostveen", "van Rijn", "van Schaik", "van Veen", "van Vliet", "van Wijk", "van Wijngaarden", "van den Poel", "van de Pol", "van den Ploeg", "van de Ven", "van den Berg", "van den Bosch", "van den Brink", "van den Broek", "van den Heuvel", "van der Heijden", "van der Horst", "van der Hulst", "van der Kroon", "van der Laan", "van der Linden", "van der Meer", "van der Meij", "van der Meulen", "van der Molen", "van der Sluis", "van der Spek", "van der Veen", "van der Velde", "van der Velden", "van der Vliet", "van der Wal"],
          // https://surnames.behindthename.com/top/lists/england-wales/1991
          uk: ["Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Johnson", "Roberts", "Robinson", "Thompson", "Wright", "Walker", "White", "Edwards", "Hughes", "Green", "Hall", "Lewis", "Harris", "Clarke", "Patel", "Jackson", "Wood", "Turner", "Martin", "Cooper", "Hill", "Ward", "Morris", "Moore", "Clark", "Lee", "King", "Baker", "Harrison", "Morgan", "Allen", "James", "Scott", "Phillips", "Watson", "Davis", "Parker", "Price", "Bennett", "Young", "Griffiths", "Mitchell", "Kelly", "Cook", "Carter", "Richardson", "Bailey", "Collins", "Bell", "Shaw", "Murphy", "Miller", "Cox", "Richards", "Khan", "Marshall", "Anderson", "Simpson", "Ellis", "Adams", "Singh", "Begum", "Wilkinson", "Foster", "Chapman", "Powell", "Webb", "Rogers", "Gray", "Mason", "Ali", "Hunt", "Hussain", "Campbell", "Matthews", "Owen", "Palmer", "Holmes", "Mills", "Barnes", "Knight", "Lloyd", "Butler", "Russell", "Barker", "Fisher", "Stevens", "Jenkins", "Murray", "Dixon", "Harvey", "Graham", "Pearson", "Ahmed", "Fletcher", "Walsh", "Kaur", "Gibson", "Howard", "Andrews", "Stewart", "Elliott", "Reynolds", "Saunders", "Payne", "Fox", "Ford", "Pearce", "Day", "Brooks", "West", "Lawrence", "Cole", "Atkinson", "Bradley", "Spencer", "Gill", "Dawson", "Ball", "Burton", "O'brien", "Watts", "Rose", "Booth", "Perry", "Ryan", "Grant", "Wells", "Armstrong", "Francis", "Rees", "Hayes", "Hart", "Hudson", "Newman", "Barrett", "Webster", "Hunter", "Gregory", "Carr", "Lowe", "Page", "Marsh", "Riley", "Dunn", "Woods", "Parsons", "Berry", "Stone", "Reid", "Holland", "Hawkins", "Harding", "Porter", "Robertson", "Newton", "Oliver", "Reed", "Kennedy", "Williamson", "Bird", "Gardner", "Shah", "Dean", "Lane", "Cooke", "Bates", "Henderson", "Parry", "Burgess", "Bishop", "Walton", "Burns", "Nicholson", "Shepherd", "Ross", "Cross", "Long", "Freeman", "Warren", "Nicholls", "Hamilton", "Byrne", "Sutton", "Mcdonald", "Yates", "Hodgson", "Robson", "Curtis", "Hopkins", "O'connor", "Harper", "Coleman", "Watkins", "Moss", "Mccarthy", "Chambers", "O'neill", "Griffin", "Sharp", "Hardy", "Wheeler", "Potter", "Osborne", "Johnston", "Gordon", "Doyle", "Wallace", "George", "Jordan", "Hutchinson", "Rowe", "Burke", "May", "Pritchard", "Gilbert", "Willis", "Higgins", "Read", "Miles", "Stevenson", "Stephenson", "Hammond", "Arnold", "Buckley", "Walters", "Hewitt", "Barber", "Nelson", "Slater", "Austin", "Sullivan", "Whitehead", "Mann", "Frost", "Lambert", "Stephens", "Blake", "Akhtar", "Lynch", "Goodwin", "Barton", "Woodward", "Thomson", "Cunningham", "Quinn", "Barnett", "Baxter", "Bibi", "Clayton", "Nash", "Greenwood", "Jennings", "Holt", "Kemp", "Poole", "Gallagher", "Bond", "Stokes", "Tucker", "Davidson", "Fowler", "Heath", "Norman", "Middleton", "Lawson", "Banks", "French", "Stanley", "Jarvis", "Gibbs", "Ferguson", "Hayward", "Carroll", "Douglas", "Dickinson", "Todd", "Barlow", "Peters", "Lucas", "Knowles", "Hartley", "Miah", "Simmons", "Morton", "Alexander", "Field", "Morrison", "Norris", "Townsend", "Preston", "Hancock", "Thornton", "Baldwin", "Burrows", "Briggs", "Parkinson", "Reeves", "Macdonald", "Lamb", "Black", "Abbott", "Sanders", "Thorpe", "Holden", "Tomlinson", "Perkins", "Ashton", "Rhodes", "Fuller", "Howe", "Bryant", "Vaughan", "Dale", "Davey", "Weston", "Bartlett", "Whittaker", "Davison", "Kent", "Skinner", "Birch", "Morley", "Daniels", "Glover", "Howell", "Cartwright", "Pugh", "Humphreys", "Goddard", "Brennan", "Wall", "Kirby", "Bowen", "Savage", "Bull", "Wong", "Dobson", "Smart", "Wilkins", "Kirk", "Fraser", "Duffy", "Hicks", "Patterson", "Bradshaw", "Little", "Archer", "Warner", "Waters", "O'sullivan", "Farrell", "Brookes", "Atkins", "Kay", "Dodd", "Bentley", "Flynn", "John", "Schofield", "Short", "Haynes", "Wade", "Butcher", "Henry", "Sanderson", "Crawford", "Sheppard", "Bolton", "Coates", "Giles", "Gould", "Houghton", "Gibbons", "Pratt", "Manning", "Law", "Hooper", "Noble", "Dyer", "Rahman", "Clements", "Moran", "Sykes", "Chan", "Doherty", "Connolly", "Joyce", "Franklin", "Hobbs", "Coles", "Herbert", "Steele", "Kerr", "Leach", "Winter", "Owens", "Duncan", "Naylor", "Fleming", "Horton", "Finch", "Fitzgerald", "Randall", "Carpenter", "Marsden", "Browne", "Garner", "Pickering", "Hale", "Dennis", "Vincent", "Chadwick", "Chandler", "Sharpe", "Nolan", "Lyons", "Hurst", "Collier", "Peacock", "Howarth", "Faulkner", "Rice", "Pollard", "Welch", "Norton", "Gough", "Sinclair", "Blackburn", "Bryan", "Conway", "Power", "Cameron", "Daly", "Allan", "Hanson", "Gardiner", "Boyle", "Myers", "Turnbull", "Wallis", "Mahmood", "Sims", "Swift", "Iqbal", "Pope", "Brady", "Chamberlain", "Rowley", "Tyler", "Farmer", "Metcalfe", "Hilton", "Godfrey", "Holloway", "Parkin", "Bray", "Talbot", "Donnelly", "Nixon", "Charlton", "Benson", "Whitehouse", "Barry", "Hope", "Lord", "North", "Storey", "Connor", "Potts", "Bevan", "Hargreaves", "Mclean", "Mistry", "Bruce", "Howells", "Hyde", "Parkes", "Wyatt", "Fry", "Lees", "O'donnell", "Craig", "Forster", "Mckenzie", "Humphries", "Mellor", "Carey", "Ingram", "Summers", "Leonard"],
          // https://surnames.behindthename.com/top/lists/germany/2017
          de: ["M\xFCller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Sch\xE4fer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schr\xF6der", "Neumann", "Schwarz", "Zimmermann", "Braun", "Kr\xFCger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner", "Schmitz", "Krause", "Meier", "Lehmann", "Schmid", "Schulze", "Maier", "K\xF6hler", "Herrmann", "K\xF6nig", "Walter", "Mayer", "Huber", "Kaiser", "Fuchs", "Peters", "Lang", "Scholz", "M\xF6ller", "Wei\xDF", "Jung", "Hahn", "Schubert", "Vogel", "Friedrich", "Keller", "G\xFCnther", "Frank", "Berger", "Winkler", "Roth", "Beck", "Lorenz", "Baumann", "Franke", "Albrecht", "Schuster", "Simon", "Ludwig", "B\xF6hm", "Winter", "Kraus", "Martin", "Schumacher", "Kr\xE4mer", "Vogt", "Stein", "J\xE4ger", "Otto", "Sommer", "Gro\xDF", "Seidel", "Heinrich", "Brandt", "Haas", "Schreiber", "Graf", "Schulte", "Dietrich", "Ziegler", "Kuhn", "K\xFChn", "Pohl", "Engel", "Horn", "Busch", "Bergmann", "Thomas", "Voigt", "Sauer", "Arnold", "Wolff", "Pfeiffer"],
          // http://www.japantimes.co.jp/life/2009/10/11/lifestyle/japans-top-100-most-common-family-names/
          jp: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada", "Sasaki", "Yamaguchi", "Saito", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Yamazaki", "Mori", "Abe", "Ikeda", "Hashimoto", "Yamashita", "Ishikawa", "Nakajima", "Maeda", "Fujita", "Ogawa", "Goto", "Okada", "Hasegawa", "Murakami", "Kondo", "Ishii", "Saito", "Sakamoto", "Endo", "Aoki", "Fujii", "Nishimura", "Fukuda", "Ota", "Miura", "Fujiwara", "Okamoto", "Matsuda", "Nakagawa", "Nakano", "Harada", "Ono", "Tamura", "Takeuchi", "Kaneko", "Wada", "Nakayama", "Ishida", "Ueda", "Morita", "Hara", "Shibata", "Sakai", "Kudo", "Yokoyama", "Miyazaki", "Miyamoto", "Uchida", "Takagi", "Ando", "Taniguchi", "Ohno", "Maruyama", "Imai", "Takada", "Fujimoto", "Takeda", "Murata", "Ueno", "Sugiyama", "Masuda", "Sugawara", "Hirano", "Kojima", "Otsuka", "Chiba", "Kubo", "Matsui", "Iwasaki", "Sakurai", "Kinoshita", "Noguchi", "Matsuo", "Nomura", "Kikuchi", "Sano", "Onishi", "Sugimoto", "Arai"],
          // http://www.lowchensaustralia.com/names/popular-spanish-names.htm
          es: ["Garcia", "Fernandez", "Lopez", "Martinez", "Gonzalez", "Rodriguez", "Sanchez", "Perez", "Martin", "Gomez", "Ruiz", "Diaz", "Hernandez", "Alvarez", "Jimenez", "Moreno", "Munoz", "Alonso", "Romero", "Navarro", "Gutierrez", "Torres", "Dominguez", "Gil", "Vazquez", "Blanco", "Serrano", "Ramos", "Castro", "Suarez", "Sanz", "Rubio", "Ortega", "Molina", "Delgado", "Ortiz", "Morales", "Ramirez", "Marin", "Iglesias", "Santos", "Castillo", "Garrido", "Calvo", "Pena", "Cruz", "Cano", "Nunez", "Prieto", "Diez", "Lozano", "Vidal", "Pascual", "Ferrer", "Medina", "Vega", "Leon", "Herrero", "Vicente", "Mendez", "Guerrero", "Fuentes", "Campos", "Nieto", "Cortes", "Caballero", "Ibanez", "Lorenzo", "Pastor", "Gimenez", "Saez", "Soler", "Marquez", "Carrasco", "Herrera", "Montero", "Arias", "Crespo", "Flores", "Andres", "Aguilar", "Hidalgo", "Cabrera", "Mora", "Duran", "Velasco", "Rey", "Pardo", "Roman", "Vila", "Bravo", "Merino", "Moya", "Soto", "Izquierdo", "Reyes", "Redondo", "Marcos", "Carmona", "Menendez"],
          // Data taken from https://fr.wikipedia.org/wiki/Liste_des_noms_de_famille_les_plus_courants_en_France
          fr: ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lef\xE8vre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard", "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau", "Vincent", "M\xFCller", "Lef\xE8vre", "Faure", "Andr\xE9", "Mercier", "Blanc", "Gu\xE9rin", "Boyer", "Garnier", "Chevalier", "Fran\xE7ois", "Legrand", "Gauthier", "Garcia", "Perrin", "Robin", "Cl\xE9ment", "Morin", "Nicolas", "Henry", "Roussel", "Matthieu", "Gautier", "Masson", "Marchand", "Duval", "Denis", "Dumont", "Marie", "Lemaire", "No\xEBl", "Meyer", "Dufour", "Meunier", "Brun", "Blanchard", "Giraud", "Joly", "Rivi\xE8re", "Lucas", "Brunet", "Gaillard", "Barbier", "Arnaud", "Mart\xEDnez", "G\xE9rard", "Roche", "Renard", "Schmitt", "Roy", "Leroux", "Colin", "Vidal", "Caron", "Picard", "Roger", "Fabre", "Aubert", "Lemoine", "Renaud", "Dumas", "Lacroix", "Olivier", "Philippe", "Bourgeois", "Pierre", "Beno\xEEt", "Rey", "Leclerc", "Payet", "Rolland", "Leclercq", "Guillaume", "Lecomte", "L\xF3pez", "Jean", "Dupuy", "Guillot", "Hubert", "Berger", "Carpentier", "S\xE1nchez", "Dupuis", "Moulin", "Louis", "Deschamps", "Huet", "Vasseur", "Perez", "Boucher", "Fleury", "Royer", "Klein", "Jacquet", "Adam", "Paris", "Poirier", "Marty", "Aubry", "Guyot", "Carr\xE9", "Charles", "Renault", "Charpentier", "M\xE9nard", "Maillard", "Baron", "Bertin", "Bailly", "Herv\xE9", "Schneider", "Fern\xE1ndez", "Le GallGall", "Collet", "L\xE9ger", "Bouvier", "Julien", "Pr\xE9vost", "Millet", "Perrot", "Daniel", "Le RouxRoux", "Cousin", "Germain", "Breton", "Besson", "Langlois", "R\xE9mi", "Le GoffGoff", "Pelletier", "L\xE9v\xEAque", "Perrier", "Leblanc", "Barr\xE9", "Lebrun", "Marchal", "Weber", "Mallet", "Hamon", "Boulanger", "Jacob", "Monnier", "Michaud", "Rodr\xEDguez", "Guichard", "Gillet", "\xC9tienne", "Grondin", "Poulain", "Tessier", "Chevallier", "Collin", "Chauvin", "Da SilvaSilva", "Bouchet", "Gay", "Lema\xEEtre", "B\xE9nard", "Mar\xE9chal", "Humbert", "Reynaud", "Antoine", "Hoarau", "Perret", "Barth\xE9lemy", "Cordier", "Pichon", "Lejeune", "Gilbert", "Lamy", "Delaunay", "Pasquier", "Carlier", "LaporteLaporte"]
        },
        // Data taken from http://geoportal.statistics.gov.uk/datasets/ons-postcode-directory-latest-centroids
        postcodeAreas: [{ code: "AB" }, { code: "AL" }, { code: "B" }, { code: "BA" }, { code: "BB" }, { code: "BD" }, { code: "BH" }, { code: "BL" }, { code: "BN" }, { code: "BR" }, { code: "BS" }, { code: "BT" }, { code: "CA" }, { code: "CB" }, { code: "CF" }, { code: "CH" }, { code: "CM" }, { code: "CO" }, { code: "CR" }, { code: "CT" }, { code: "CV" }, { code: "CW" }, { code: "DA" }, { code: "DD" }, { code: "DE" }, { code: "DG" }, { code: "DH" }, { code: "DL" }, { code: "DN" }, { code: "DT" }, { code: "DY" }, { code: "E" }, { code: "EC" }, { code: "EH" }, { code: "EN" }, { code: "EX" }, { code: "FK" }, { code: "FY" }, { code: "G" }, { code: "GL" }, { code: "GU" }, { code: "GY" }, { code: "HA" }, { code: "HD" }, { code: "HG" }, { code: "HP" }, { code: "HR" }, { code: "HS" }, { code: "HU" }, { code: "HX" }, { code: "IG" }, { code: "IM" }, { code: "IP" }, { code: "IV" }, { code: "JE" }, { code: "KA" }, { code: "KT" }, { code: "KW" }, { code: "KY" }, { code: "L" }, { code: "LA" }, { code: "LD" }, { code: "LE" }, { code: "LL" }, { code: "LN" }, { code: "LS" }, { code: "LU" }, { code: "M" }, { code: "ME" }, { code: "MK" }, { code: "ML" }, { code: "N" }, { code: "NE" }, { code: "NG" }, { code: "NN" }, { code: "NP" }, { code: "NR" }, { code: "NW" }, { code: "OL" }, { code: "OX" }, { code: "PA" }, { code: "PE" }, { code: "PH" }, { code: "PL" }, { code: "PO" }, { code: "PR" }, { code: "RG" }, { code: "RH" }, { code: "RM" }, { code: "S" }, { code: "SA" }, { code: "SE" }, { code: "SG" }, { code: "SK" }, { code: "SL" }, { code: "SM" }, { code: "SN" }, { code: "SO" }, { code: "SP" }, { code: "SR" }, { code: "SS" }, { code: "ST" }, { code: "SW" }, { code: "SY" }, { code: "TA" }, { code: "TD" }, { code: "TF" }, { code: "TN" }, { code: "TQ" }, { code: "TR" }, { code: "TS" }, { code: "TW" }, { code: "UB" }, { code: "W" }, { code: "WA" }, { code: "WC" }, { code: "WD" }, { code: "WF" }, { code: "WN" }, { code: "WR" }, { code: "WS" }, { code: "WV" }, { code: "YO" }, { code: "ZE" }],
        // Data taken from https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
        countries: [{ name: "Afghanistan", abbreviation: "AF" }, { name: "\xC5land Islands", abbreviation: "AX" }, { name: "Albania", abbreviation: "AL" }, { name: "Algeria", abbreviation: "DZ" }, { name: "American Samoa", abbreviation: "AS" }, { name: "Andorra", abbreviation: "AD" }, { name: "Angola", abbreviation: "AO" }, { name: "Anguilla", abbreviation: "AI" }, { name: "Antarctica", abbreviation: "AQ" }, { name: "Antigua and Barbuda", abbreviation: "AG" }, { name: "Argentina", abbreviation: "AR" }, { name: "Armenia", abbreviation: "AM" }, { name: "Aruba", abbreviation: "AW" }, { name: "Australia", abbreviation: "AU" }, { name: "Austria", abbreviation: "AT" }, { name: "Azerbaijan", abbreviation: "AZ" }, { name: "Bahamas", abbreviation: "BS" }, { name: "Bahrain", abbreviation: "BH" }, { name: "Bangladesh", abbreviation: "BD" }, { name: "Barbados", abbreviation: "BB" }, { name: "Belarus", abbreviation: "BY" }, { name: "Belgium", abbreviation: "BE" }, { name: "Belize", abbreviation: "BZ" }, { name: "Benin", abbreviation: "BJ" }, { name: "Bermuda", abbreviation: "BM" }, { name: "Bhutan", abbreviation: "BT" }, { name: "Plurinational State of Bolivia", abbreviation: "BO" }, { name: "Bonaire, Sint Eustatius and Saba", abbreviation: "BQ" }, { name: "Bosnia and Herzegovina", abbreviation: "BA" }, { name: "Botswana", abbreviation: "BW" }, { name: "Bouvet Island", abbreviation: "BV" }, { name: "Brazil", abbreviation: "BR" }, { name: "British Indian Ocean Territory", abbreviation: "IO" }, { name: "Brunei Darussalam", abbreviation: "BN" }, { name: "Bulgaria", abbreviation: "BG" }, { name: "Burkina Faso", abbreviation: "BF" }, { name: "Burundi", abbreviation: "BI" }, { name: "Cabo Verde", abbreviation: "CV" }, { name: "Cambodia", abbreviation: "KH" }, { name: "Cameroon", abbreviation: "CM" }, { name: "Canada", abbreviation: "CA" }, { name: "Cayman Islands", abbreviation: "KY" }, { name: "Central African Republic", abbreviation: "CF" }, { name: "Chad", abbreviation: "TD" }, { name: "Chile", abbreviation: "CL" }, { name: "China", abbreviation: "CN" }, { name: "Christmas Island", abbreviation: "CX" }, { name: "Cocos (Keeling) Islands", abbreviation: "CC" }, { name: "Colombia", abbreviation: "CO" }, { name: "Comoros", abbreviation: "KM" }, { name: "Congo", abbreviation: "CG" }, { name: "Democratic Republic of the Congo", abbreviation: "CD" }, { name: "Cook Islands", abbreviation: "CK" }, { name: "Costa Rica", abbreviation: "CR" }, { name: "C\xF4te d'Ivoire", abbreviation: "CI" }, { name: "Croatia", abbreviation: "HR" }, { name: "Cuba", abbreviation: "CU" }, { name: "Cura\xE7ao", abbreviation: "CW" }, { name: "Cyprus", abbreviation: "CY" }, { name: "Czechia", abbreviation: "CZ" }, { name: "Denmark", abbreviation: "DK" }, { name: "Djibouti", abbreviation: "DJ" }, { name: "Dominica", abbreviation: "DM" }, { name: "Dominican Republic", abbreviation: "DO" }, { name: "Ecuador", abbreviation: "EC" }, { name: "Egypt", abbreviation: "EG" }, { name: "El Salvador", abbreviation: "SV" }, { name: "Equatorial Guinea", abbreviation: "GQ" }, { name: "Eritrea", abbreviation: "ER" }, { name: "Estonia", abbreviation: "EE" }, { name: "Eswatini", abbreviation: "SZ" }, { name: "Ethiopia", abbreviation: "ET" }, { name: "Falkland Islands (Malvinas)", abbreviation: "FK" }, { name: "Faroe Islands", abbreviation: "FO" }, { name: "Fiji", abbreviation: "FJ" }, { name: "Finland", abbreviation: "FI" }, { name: "France", abbreviation: "FR" }, { name: "French Guiana", abbreviation: "GF" }, { name: "French Polynesia", abbreviation: "PF" }, { name: "French Southern Territories", abbreviation: "TF" }, { name: "Gabon", abbreviation: "GA" }, { name: "Gambia", abbreviation: "GM" }, { name: "Georgia", abbreviation: "GE" }, { name: "Germany", abbreviation: "DE" }, { name: "Ghana", abbreviation: "GH" }, { name: "Gibraltar", abbreviation: "GI" }, { name: "Greece", abbreviation: "GR" }, { name: "Greenland", abbreviation: "GL" }, { name: "Grenada", abbreviation: "GD" }, { name: "Guadeloupe", abbreviation: "GP" }, { name: "Guam", abbreviation: "GU" }, { name: "Guatemala", abbreviation: "GT" }, { name: "Guernsey", abbreviation: "GG" }, { name: "Guinea", abbreviation: "GN" }, { name: "Guinea-Bissau", abbreviation: "GW" }, { name: "Guyana", abbreviation: "GY" }, { name: "Haiti", abbreviation: "HT" }, { name: "Heard Island and McDonald Islands", abbreviation: "HM" }, { name: "Holy See", abbreviation: "VA" }, { name: "Honduras", abbreviation: "HN" }, { name: "Hong Kong", abbreviation: "HK" }, { name: "Hungary", abbreviation: "HU" }, { name: "Iceland", abbreviation: "IS" }, { name: "India", abbreviation: "IN" }, { name: "Indonesia", abbreviation: "ID" }, { name: "Islamic Republic of Iran", abbreviation: "IR" }, { name: "Iraq", abbreviation: "IQ" }, { name: "Ireland", abbreviation: "IE" }, { name: "Isle of Man", abbreviation: "IM" }, { name: "Israel", abbreviation: "IL" }, { name: "Italy", abbreviation: "IT" }, { name: "Jamaica", abbreviation: "JM" }, { name: "Japan", abbreviation: "JP" }, { name: "Jersey", abbreviation: "JE" }, { name: "Jordan", abbreviation: "JO" }, { name: "Kazakhstan", abbreviation: "KZ" }, { name: "Kenya", abbreviation: "KE" }, { name: "Kiribati", abbreviation: "KI" }, { name: "Democratic People's Republic of Korea", abbreviation: "KP" }, { name: "Republic of Korea", abbreviation: "KR" }, { name: "Kuwait", abbreviation: "KW" }, { name: "Kyrgyzstan", abbreviation: "KG" }, { name: "Lao People's Democratic Republic", abbreviation: "LA" }, { name: "Latvia", abbreviation: "LV" }, { name: "Lebanon", abbreviation: "LB" }, { name: "Lesotho", abbreviation: "LS" }, { name: "Liberia", abbreviation: "LR" }, { name: "Libya", abbreviation: "LY" }, { name: "Liechtenstein", abbreviation: "LI" }, { name: "Lithuania", abbreviation: "LT" }, { name: "Luxembourg", abbreviation: "LU" }, { name: "Macao", abbreviation: "MO" }, { name: "Madagascar", abbreviation: "MG" }, { name: "Malawi", abbreviation: "MW" }, { name: "Malaysia", abbreviation: "MY" }, { name: "Maldives", abbreviation: "MV" }, { name: "Mali", abbreviation: "ML" }, { name: "Malta", abbreviation: "MT" }, { name: "Marshall Islands", abbreviation: "MH" }, { name: "Martinique", abbreviation: "MQ" }, { name: "Mauritania", abbreviation: "MR" }, { name: "Mauritius", abbreviation: "MU" }, { name: "Mayotte", abbreviation: "YT" }, { name: "Mexico", abbreviation: "MX" }, { name: "Federated States of Micronesia", abbreviation: "FM" }, { name: "Republic of Moldova", abbreviation: "MD" }, { name: "Monaco", abbreviation: "MC" }, { name: "Mongolia", abbreviation: "MN" }, { name: "Montenegro", abbreviation: "ME" }, { name: "Montserrat", abbreviation: "MS" }, { name: "Morocco", abbreviation: "MA" }, { name: "Mozambique", abbreviation: "MZ" }, { name: "Myanmar", abbreviation: "MM" }, { name: "Namibia", abbreviation: "NA" }, { name: "Nauru", abbreviation: "NR" }, { name: "Nepal", abbreviation: "NP" }, { name: "Kingdom of the Netherlands", abbreviation: "NL" }, { name: "New Caledonia", abbreviation: "NC" }, { name: "New Zealand", abbreviation: "NZ" }, { name: "Nicaragua", abbreviation: "NI" }, { name: "Niger", abbreviation: "NE" }, { name: "Nigeria", abbreviation: "NG" }, { name: "Niue", abbreviation: "NU" }, { name: "Norfolk Island", abbreviation: "NF" }, { name: "North Macedonia", abbreviation: "MK" }, { name: "Northern Mariana Islands", abbreviation: "MP" }, { name: "Norway", abbreviation: "NO" }, { name: "Oman", abbreviation: "OM" }, { name: "Pakistan", abbreviation: "PK" }, { name: "Palau", abbreviation: "PW" }, { name: "State of Palestine", abbreviation: "PS" }, { name: "Panama", abbreviation: "PA" }, { name: "Papua New Guinea", abbreviation: "PG" }, { name: "Paraguay", abbreviation: "PY" }, { name: "Peru", abbreviation: "PE" }, { name: "Philippines", abbreviation: "PH" }, { name: "Pitcairn", abbreviation: "PN" }, { name: "Poland", abbreviation: "PL" }, { name: "Portugal", abbreviation: "PT" }, { name: "Puerto Rico", abbreviation: "PR" }, { name: "Qatar", abbreviation: "QA" }, { name: "R\xE9union", abbreviation: "RE" }, { name: "Romania", abbreviation: "RO" }, { name: "Russian Federation", abbreviation: "RU" }, { name: "Rwanda", abbreviation: "RW" }, { name: "Saint Barth\xE9lemy", abbreviation: "BL" }, { name: "Saint Helena, Ascension and Tristan da Cunha", abbreviation: "SH" }, { name: "Saint Kitts and Nevis", abbreviation: "KN" }, { name: "Saint Lucia", abbreviation: "LC" }, { name: "Saint Martin (French part)", abbreviation: "MF" }, { name: "Saint Pierre and Miquelon", abbreviation: "PM" }, { name: "Saint Vincent and the Grenadines", abbreviation: "VC" }, { name: "Samoa", abbreviation: "WS" }, { name: "San Marino", abbreviation: "SM" }, { name: "Sao Tome and Principe", abbreviation: "ST" }, { name: "Saudi Arabia", abbreviation: "SA" }, { name: "Senegal", abbreviation: "SN" }, { name: "Serbia", abbreviation: "RS" }, { name: "Seychelles", abbreviation: "SC" }, { name: "Sierra Leone", abbreviation: "SL" }, { name: "Singapore", abbreviation: "SG" }, { name: "Sint Maarten (Dutch part)", abbreviation: "SX" }, { name: "Slovakia", abbreviation: "SK" }, { name: "Slovenia", abbreviation: "SI" }, { name: "Solomon Islands", abbreviation: "SB" }, { name: "Somalia", abbreviation: "SO" }, { name: "South Africa", abbreviation: "ZA" }, { name: "South Georgia and the South Sandwich Islands", abbreviation: "GS" }, { name: "South Sudan", abbreviation: "SS" }, { name: "Spain", abbreviation: "ES" }, { name: "Sri Lanka", abbreviation: "LK" }, { name: "Sudan", abbreviation: "SD" }, { name: "Suriname", abbreviation: "SR" }, { name: "Svalbard and Jan Mayen", abbreviation: "SJ" }, { name: "Sweden", abbreviation: "SE" }, { name: "Switzerland", abbreviation: "CH" }, { name: "Syrian Arab Republic", abbreviation: "SY" }, { name: "Taiwan, Province of China", abbreviation: "TW" }, { name: "Tajikistan", abbreviation: "TJ" }, { name: "United Republic of Tanzania", abbreviation: "TZ" }, { name: "Thailand", abbreviation: "TH" }, { name: "Timor-Leste", abbreviation: "TL" }, { name: "Togo", abbreviation: "TG" }, { name: "Tokelau", abbreviation: "TK" }, { name: "Tonga", abbreviation: "TO" }, { name: "Trinidad and Tobago", abbreviation: "TT" }, { name: "Tunisia", abbreviation: "TN" }, { name: "T\xFCrkiye", abbreviation: "TR" }, { name: "Turkmenistan", abbreviation: "TM" }, { name: "Turks and Caicos Islands", abbreviation: "TC" }, { name: "Tuvalu", abbreviation: "TV" }, { name: "Uganda", abbreviation: "UG" }, { name: "Ukraine", abbreviation: "UA" }, { name: "United Arab Emirates", abbreviation: "AE" }, { name: "United Kingdom of Great Britain and Northern Ireland", abbreviation: "GB" }, { name: "United States Minor Outlying Islands", abbreviation: "UM" }, { name: "United States of America", abbreviation: "US" }, { name: "Uruguay", abbreviation: "UY" }, { name: "Uzbekistan", abbreviation: "UZ" }, { name: "Vanuatu", abbreviation: "VU" }, { name: "Bolivarian Republic of Venezuela", abbreviation: "VE" }, { name: "Viet Nam", abbreviation: "VN" }, { name: "Virgin Islands (British)", abbreviation: "VG" }, { name: "Virgin Islands (U.S.)", abbreviation: "VI" }, { name: "Wallis and Futuna", abbreviation: "WF" }, { name: "Western Sahara", abbreviation: "EH" }, { name: "Yemen", abbreviation: "YE" }, { name: "Zambia", abbreviation: "ZM" }, { name: "Zimbabwe", abbreviation: "ZW" }],
        counties: {
          // Data taken from http://www.downloadexcelfiles.com/gb_en/download-excel-file-list-counties-uk
          uk: [
            { name: "Bath and North East Somerset" },
            { name: "Aberdeenshire" },
            { name: "Anglesey" },
            { name: "Angus" },
            { name: "Bedford" },
            { name: "Blackburn with Darwen" },
            { name: "Blackpool" },
            { name: "Bournemouth" },
            { name: "Bracknell Forest" },
            { name: "Brighton & Hove" },
            { name: "Bristol" },
            { name: "Buckinghamshire" },
            { name: "Cambridgeshire" },
            { name: "Carmarthenshire" },
            { name: "Central Bedfordshire" },
            { name: "Ceredigion" },
            { name: "Cheshire East" },
            { name: "Cheshire West and Chester" },
            { name: "Clackmannanshire" },
            { name: "Conwy" },
            { name: "Cornwall" },
            { name: "County Antrim" },
            { name: "County Armagh" },
            { name: "County Down" },
            { name: "County Durham" },
            { name: "County Fermanagh" },
            { name: "County Londonderry" },
            { name: "County Tyrone" },
            { name: "Cumbria" },
            { name: "Darlington" },
            { name: "Denbighshire" },
            { name: "Derby" },
            { name: "Derbyshire" },
            { name: "Devon" },
            { name: "Dorset" },
            { name: "Dumfries and Galloway" },
            { name: "Dundee" },
            { name: "East Lothian" },
            { name: "East Riding of Yorkshire" },
            { name: "East Sussex" },
            { name: "Edinburgh?" },
            { name: "Essex" },
            { name: "Falkirk" },
            { name: "Fife" },
            { name: "Flintshire" },
            { name: "Gloucestershire" },
            { name: "Greater London" },
            { name: "Greater Manchester" },
            { name: "Gwent" },
            { name: "Gwynedd" },
            { name: "Halton" },
            { name: "Hampshire" },
            { name: "Hartlepool" },
            { name: "Herefordshire" },
            { name: "Hertfordshire" },
            { name: "Highlands" },
            { name: "Hull" },
            { name: "Isle of Wight" },
            { name: "Isles of Scilly" },
            { name: "Kent" },
            { name: "Lancashire" },
            { name: "Leicester" },
            { name: "Leicestershire" },
            { name: "Lincolnshire" },
            { name: "Lothian" },
            { name: "Luton" },
            { name: "Medway" },
            { name: "Merseyside" },
            { name: "Mid Glamorgan" },
            { name: "Middlesbrough" },
            { name: "Milton Keynes" },
            { name: "Monmouthshire" },
            { name: "Moray" },
            { name: "Norfolk" },
            { name: "North East Lincolnshire" },
            { name: "North Lincolnshire" },
            { name: "North Somerset" },
            { name: "North Yorkshire" },
            { name: "Northamptonshire" },
            { name: "Northumberland" },
            { name: "Nottingham" },
            { name: "Nottinghamshire" },
            { name: "Oxfordshire" },
            { name: "Pembrokeshire" },
            { name: "Perth and Kinross" },
            { name: "Peterborough" },
            { name: "Plymouth" },
            { name: "Poole" },
            { name: "Portsmouth" },
            { name: "Powys" },
            { name: "Reading" },
            { name: "Redcar and Cleveland" },
            { name: "Rutland" },
            { name: "Scottish Borders" },
            { name: "Shropshire" },
            { name: "Slough" },
            { name: "Somerset" },
            { name: "South Glamorgan" },
            { name: "South Gloucestershire" },
            { name: "South Yorkshire" },
            { name: "Southampton" },
            { name: "Southend-on-Sea" },
            { name: "Staffordshire" },
            { name: "Stirlingshire" },
            { name: "Stockton-on-Tees" },
            { name: "Stoke-on-Trent" },
            { name: "Strathclyde" },
            { name: "Suffolk" },
            { name: "Surrey" },
            { name: "Swindon" },
            { name: "Telford and Wrekin" },
            { name: "Thurrock" },
            { name: "Torbay" },
            { name: "Tyne and Wear" },
            { name: "Warrington" },
            { name: "Warwickshire" },
            { name: "West Berkshire" },
            { name: "West Glamorgan" },
            { name: "West Lothian" },
            { name: "West Midlands" },
            { name: "West Sussex" },
            { name: "West Yorkshire" },
            { name: "Western Isles" },
            { name: "Wiltshire" },
            { name: "Windsor and Maidenhead" },
            { name: "Wokingham" },
            { name: "Worcestershire" },
            { name: "Wrexham" },
            { name: "York" }
          ]
        },
        provinces: {
          ca: [
            { name: "Alberta", abbreviation: "AB" },
            { name: "British Columbia", abbreviation: "BC" },
            { name: "Manitoba", abbreviation: "MB" },
            { name: "New Brunswick", abbreviation: "NB" },
            { name: "Newfoundland and Labrador", abbreviation: "NL" },
            { name: "Nova Scotia", abbreviation: "NS" },
            { name: "Ontario", abbreviation: "ON" },
            { name: "Prince Edward Island", abbreviation: "PE" },
            { name: "Quebec", abbreviation: "QC" },
            { name: "Saskatchewan", abbreviation: "SK" },
            // The case could be made that the following are not actually provinces
            // since they are technically considered "territories" however they all
            // look the same on an envelope!
            { name: "Northwest Territories", abbreviation: "NT" },
            { name: "Nunavut", abbreviation: "NU" },
            { name: "Yukon", abbreviation: "YT" }
          ],
          it: [
            { name: "Agrigento", abbreviation: "AG", code: 84 },
            { name: "Alessandria", abbreviation: "AL", code: 6 },
            { name: "Ancona", abbreviation: "AN", code: 42 },
            { name: "Aosta", abbreviation: "AO", code: 7 },
            { name: "L'Aquila", abbreviation: "AQ", code: 66 },
            { name: "Arezzo", abbreviation: "AR", code: 51 },
            { name: "Ascoli-Piceno", abbreviation: "AP", code: 44 },
            { name: "Asti", abbreviation: "AT", code: 5 },
            { name: "Avellino", abbreviation: "AV", code: 64 },
            { name: "Bari", abbreviation: "BA", code: 72 },
            { name: "Barletta-Andria-Trani", abbreviation: "BT", code: 72 },
            { name: "Belluno", abbreviation: "BL", code: 25 },
            { name: "Benevento", abbreviation: "BN", code: 62 },
            { name: "Bergamo", abbreviation: "BG", code: 16 },
            { name: "Biella", abbreviation: "BI", code: 96 },
            { name: "Bologna", abbreviation: "BO", code: 37 },
            { name: "Bolzano", abbreviation: "BZ", code: 21 },
            { name: "Brescia", abbreviation: "BS", code: 17 },
            { name: "Brindisi", abbreviation: "BR", code: 74 },
            { name: "Cagliari", abbreviation: "CA", code: 92 },
            { name: "Caltanissetta", abbreviation: "CL", code: 85 },
            { name: "Campobasso", abbreviation: "CB", code: 70 },
            { name: "Carbonia Iglesias", abbreviation: "CI", code: 70 },
            { name: "Caserta", abbreviation: "CE", code: 61 },
            { name: "Catania", abbreviation: "CT", code: 87 },
            { name: "Catanzaro", abbreviation: "CZ", code: 79 },
            { name: "Chieti", abbreviation: "CH", code: 69 },
            { name: "Como", abbreviation: "CO", code: 13 },
            { name: "Cosenza", abbreviation: "CS", code: 78 },
            { name: "Cremona", abbreviation: "CR", code: 19 },
            { name: "Crotone", abbreviation: "KR", code: 101 },
            { name: "Cuneo", abbreviation: "CN", code: 4 },
            { name: "Enna", abbreviation: "EN", code: 86 },
            { name: "Fermo", abbreviation: "FM", code: 86 },
            { name: "Ferrara", abbreviation: "FE", code: 38 },
            { name: "Firenze", abbreviation: "FI", code: 48 },
            { name: "Foggia", abbreviation: "FG", code: 71 },
            { name: "Forli-Cesena", abbreviation: "FC", code: 71 },
            { name: "Frosinone", abbreviation: "FR", code: 60 },
            { name: "Genova", abbreviation: "GE", code: 10 },
            { name: "Gorizia", abbreviation: "GO", code: 31 },
            { name: "Grosseto", abbreviation: "GR", code: 53 },
            { name: "Imperia", abbreviation: "IM", code: 8 },
            { name: "Isernia", abbreviation: "IS", code: 94 },
            { name: "La-Spezia", abbreviation: "SP", code: 66 },
            { name: "Latina", abbreviation: "LT", code: 59 },
            { name: "Lecce", abbreviation: "LE", code: 75 },
            { name: "Lecco", abbreviation: "LC", code: 97 },
            { name: "Livorno", abbreviation: "LI", code: 49 },
            { name: "Lodi", abbreviation: "LO", code: 98 },
            { name: "Lucca", abbreviation: "LU", code: 46 },
            { name: "Macerata", abbreviation: "MC", code: 43 },
            { name: "Mantova", abbreviation: "MN", code: 20 },
            { name: "Massa-Carrara", abbreviation: "MS", code: 45 },
            { name: "Matera", abbreviation: "MT", code: 77 },
            { name: "Medio Campidano", abbreviation: "VS", code: 77 },
            { name: "Messina", abbreviation: "ME", code: 83 },
            { name: "Milano", abbreviation: "MI", code: 15 },
            { name: "Modena", abbreviation: "MO", code: 36 },
            { name: "Monza-Brianza", abbreviation: "MB", code: 36 },
            { name: "Napoli", abbreviation: "NA", code: 63 },
            { name: "Novara", abbreviation: "NO", code: 3 },
            { name: "Nuoro", abbreviation: "NU", code: 91 },
            { name: "Ogliastra", abbreviation: "OG", code: 91 },
            { name: "Olbia Tempio", abbreviation: "OT", code: 91 },
            { name: "Oristano", abbreviation: "OR", code: 95 },
            { name: "Padova", abbreviation: "PD", code: 28 },
            { name: "Palermo", abbreviation: "PA", code: 82 },
            { name: "Parma", abbreviation: "PR", code: 34 },
            { name: "Pavia", abbreviation: "PV", code: 18 },
            { name: "Perugia", abbreviation: "PG", code: 54 },
            { name: "Pesaro-Urbino", abbreviation: "PU", code: 41 },
            { name: "Pescara", abbreviation: "PE", code: 68 },
            { name: "Piacenza", abbreviation: "PC", code: 33 },
            { name: "Pisa", abbreviation: "PI", code: 50 },
            { name: "Pistoia", abbreviation: "PT", code: 47 },
            { name: "Pordenone", abbreviation: "PN", code: 93 },
            { name: "Potenza", abbreviation: "PZ", code: 76 },
            { name: "Prato", abbreviation: "PO", code: 100 },
            { name: "Ragusa", abbreviation: "RG", code: 88 },
            { name: "Ravenna", abbreviation: "RA", code: 39 },
            { name: "Reggio-Calabria", abbreviation: "RC", code: 35 },
            { name: "Reggio-Emilia", abbreviation: "RE", code: 35 },
            { name: "Rieti", abbreviation: "RI", code: 57 },
            { name: "Rimini", abbreviation: "RN", code: 99 },
            { name: "Roma", abbreviation: "Roma", code: 58 },
            { name: "Rovigo", abbreviation: "RO", code: 29 },
            { name: "Salerno", abbreviation: "SA", code: 65 },
            { name: "Sassari", abbreviation: "SS", code: 90 },
            { name: "Savona", abbreviation: "SV", code: 9 },
            { name: "Siena", abbreviation: "SI", code: 52 },
            { name: "Siracusa", abbreviation: "SR", code: 89 },
            { name: "Sondrio", abbreviation: "SO", code: 14 },
            { name: "Taranto", abbreviation: "TA", code: 73 },
            { name: "Teramo", abbreviation: "TE", code: 67 },
            { name: "Terni", abbreviation: "TR", code: 55 },
            { name: "Torino", abbreviation: "TO", code: 1 },
            { name: "Trapani", abbreviation: "TP", code: 81 },
            { name: "Trento", abbreviation: "TN", code: 22 },
            { name: "Treviso", abbreviation: "TV", code: 26 },
            { name: "Trieste", abbreviation: "TS", code: 32 },
            { name: "Udine", abbreviation: "UD", code: 30 },
            { name: "Varese", abbreviation: "VA", code: 12 },
            { name: "Venezia", abbreviation: "VE", code: 27 },
            { name: "Verbania", abbreviation: "VB", code: 27 },
            { name: "Vercelli", abbreviation: "VC", code: 2 },
            { name: "Verona", abbreviation: "VR", code: 23 },
            { name: "Vibo-Valentia", abbreviation: "VV", code: 102 },
            { name: "Vicenza", abbreviation: "VI", code: 24 },
            { name: "Viterbo", abbreviation: "VT", code: 56 }
          ]
        },
        // from: https://github.com/samsargent/Useful-Autocomplete-Data/blob/master/data/nationalities.json
        nationalities: [
          { name: "Afghan" },
          { name: "Albanian" },
          { name: "Algerian" },
          { name: "American" },
          { name: "Andorran" },
          { name: "Angolan" },
          { name: "Antiguans" },
          { name: "Argentinean" },
          { name: "Armenian" },
          { name: "Australian" },
          { name: "Austrian" },
          { name: "Azerbaijani" },
          { name: "Bahami" },
          { name: "Bahraini" },
          { name: "Bangladeshi" },
          { name: "Barbadian" },
          { name: "Barbudans" },
          { name: "Batswana" },
          { name: "Belarusian" },
          { name: "Belgian" },
          { name: "Belizean" },
          { name: "Beninese" },
          { name: "Bhutanese" },
          { name: "Bolivian" },
          { name: "Bosnian" },
          { name: "Brazilian" },
          { name: "British" },
          { name: "Bruneian" },
          { name: "Bulgarian" },
          { name: "Burkinabe" },
          { name: "Burmese" },
          { name: "Burundian" },
          { name: "Cambodian" },
          { name: "Cameroonian" },
          { name: "Canadian" },
          { name: "Cape Verdean" },
          { name: "Central African" },
          { name: "Chadian" },
          { name: "Chilean" },
          { name: "Chinese" },
          { name: "Colombian" },
          { name: "Comoran" },
          { name: "Congolese" },
          { name: "Costa Rican" },
          { name: "Croatian" },
          { name: "Cuban" },
          { name: "Cypriot" },
          { name: "Czech" },
          { name: "Danish" },
          { name: "Djibouti" },
          { name: "Dominican" },
          { name: "Dutch" },
          { name: "East Timorese" },
          { name: "Ecuadorean" },
          { name: "Egyptian" },
          { name: "Emirian" },
          { name: "Equatorial Guinean" },
          { name: "Eritrean" },
          { name: "Estonian" },
          { name: "Ethiopian" },
          { name: "Fijian" },
          { name: "Filipino" },
          { name: "Finnish" },
          { name: "French" },
          { name: "Gabonese" },
          { name: "Gambian" },
          { name: "Georgian" },
          { name: "German" },
          { name: "Ghanaian" },
          { name: "Greek" },
          { name: "Grenadian" },
          { name: "Guatemalan" },
          { name: "Guinea-Bissauan" },
          { name: "Guinean" },
          { name: "Guyanese" },
          { name: "Haitian" },
          { name: "Herzegovinian" },
          { name: "Honduran" },
          { name: "Hungarian" },
          { name: "I-Kiribati" },
          { name: "Icelander" },
          { name: "Indian" },
          { name: "Indonesian" },
          { name: "Iranian" },
          { name: "Iraqi" },
          { name: "Irish" },
          { name: "Israeli" },
          { name: "Italian" },
          { name: "Ivorian" },
          { name: "Jamaican" },
          { name: "Japanese" },
          { name: "Jordanian" },
          { name: "Kazakhstani" },
          { name: "Kenyan" },
          { name: "Kittian and Nevisian" },
          { name: "Kuwaiti" },
          { name: "Kyrgyz" },
          { name: "Laotian" },
          { name: "Latvian" },
          { name: "Lebanese" },
          { name: "Liberian" },
          { name: "Libyan" },
          { name: "Liechtensteiner" },
          { name: "Lithuanian" },
          { name: "Luxembourger" },
          { name: "Macedonian" },
          { name: "Malagasy" },
          { name: "Malawian" },
          { name: "Malaysian" },
          { name: "Maldivan" },
          { name: "Malian" },
          { name: "Maltese" },
          { name: "Marshallese" },
          { name: "Mauritanian" },
          { name: "Mauritian" },
          { name: "Mexican" },
          { name: "Micronesian" },
          { name: "Moldovan" },
          { name: "Monacan" },
          { name: "Mongolian" },
          { name: "Moroccan" },
          { name: "Mosotho" },
          { name: "Motswana" },
          { name: "Mozambican" },
          { name: "Namibian" },
          { name: "Nauruan" },
          { name: "Nepalese" },
          { name: "New Zealander" },
          { name: "Nicaraguan" },
          { name: "Nigerian" },
          { name: "Nigerien" },
          { name: "North Korean" },
          { name: "Northern Irish" },
          { name: "Norwegian" },
          { name: "Omani" },
          { name: "Pakistani" },
          { name: "Palauan" },
          { name: "Panamanian" },
          { name: "Papua New Guinean" },
          { name: "Paraguayan" },
          { name: "Peruvian" },
          { name: "Polish" },
          { name: "Portuguese" },
          { name: "Qatari" },
          { name: "Romani" },
          { name: "Russian" },
          { name: "Rwandan" },
          { name: "Saint Lucian" },
          { name: "Salvadoran" },
          { name: "Samoan" },
          { name: "San Marinese" },
          { name: "Sao Tomean" },
          { name: "Saudi" },
          { name: "Scottish" },
          { name: "Senegalese" },
          { name: "Serbian" },
          { name: "Seychellois" },
          { name: "Sierra Leonean" },
          { name: "Singaporean" },
          { name: "Slovakian" },
          { name: "Slovenian" },
          { name: "Solomon Islander" },
          { name: "Somali" },
          { name: "South African" },
          { name: "South Korean" },
          { name: "Spanish" },
          { name: "Sri Lankan" },
          { name: "Sudanese" },
          { name: "Surinamer" },
          { name: "Swazi" },
          { name: "Swedish" },
          { name: "Swiss" },
          { name: "Syrian" },
          { name: "Taiwanese" },
          { name: "Tajik" },
          { name: "Tanzanian" },
          { name: "Thai" },
          { name: "Togolese" },
          { name: "Tongan" },
          { name: "Trinidadian or Tobagonian" },
          { name: "Tunisian" },
          { name: "Turkish" },
          { name: "Tuvaluan" },
          { name: "Ugandan" },
          { name: "Ukrainian" },
          { name: "Uruguaya" },
          { name: "Uzbekistani" },
          { name: "Venezuela" },
          { name: "Vietnamese" },
          { name: "Wels" },
          { name: "Yemenit" },
          { name: "Zambia" },
          { name: "Zimbabwe" }
        ],
        // http://www.loc.gov/standards/iso639-2/php/code_list.php (ISO-639-1 codes)
        locale_languages: [
          "aa",
          "ab",
          "ae",
          "af",
          "ak",
          "am",
          "an",
          "ar",
          "as",
          "av",
          "ay",
          "az",
          "ba",
          "be",
          "bg",
          "bh",
          "bi",
          "bm",
          "bn",
          "bo",
          "br",
          "bs",
          "ca",
          "ce",
          "ch",
          "co",
          "cr",
          "cs",
          "cu",
          "cv",
          "cy",
          "da",
          "de",
          "dv",
          "dz",
          "ee",
          "el",
          "en",
          "eo",
          "es",
          "et",
          "eu",
          "fa",
          "ff",
          "fi",
          "fj",
          "fo",
          "fr",
          "fy",
          "ga",
          "gd",
          "gl",
          "gn",
          "gu",
          "gv",
          "ha",
          "he",
          "hi",
          "ho",
          "hr",
          "ht",
          "hu",
          "hy",
          "hz",
          "ia",
          "id",
          "ie",
          "ig",
          "ii",
          "ik",
          "io",
          "is",
          "it",
          "iu",
          "ja",
          "jv",
          "ka",
          "kg",
          "ki",
          "kj",
          "kk",
          "kl",
          "km",
          "kn",
          "ko",
          "kr",
          "ks",
          "ku",
          "kv",
          "kw",
          "ky",
          "la",
          "lb",
          "lg",
          "li",
          "ln",
          "lo",
          "lt",
          "lu",
          "lv",
          "mg",
          "mh",
          "mi",
          "mk",
          "ml",
          "mn",
          "mr",
          "ms",
          "mt",
          "my",
          "na",
          "nb",
          "nd",
          "ne",
          "ng",
          "nl",
          "nn",
          "no",
          "nr",
          "nv",
          "ny",
          "oc",
          "oj",
          "om",
          "or",
          "os",
          "pa",
          "pi",
          "pl",
          "ps",
          "pt",
          "qu",
          "rm",
          "rn",
          "ro",
          "ru",
          "rw",
          "sa",
          "sc",
          "sd",
          "se",
          "sg",
          "si",
          "sk",
          "sl",
          "sm",
          "sn",
          "so",
          "sq",
          "sr",
          "ss",
          "st",
          "su",
          "sv",
          "sw",
          "ta",
          "te",
          "tg",
          "th",
          "ti",
          "tk",
          "tl",
          "tn",
          "to",
          "tr",
          "ts",
          "tt",
          "tw",
          "ty",
          "ug",
          "uk",
          "ur",
          "uz",
          "ve",
          "vi",
          "vo",
          "wa",
          "wo",
          "xh",
          "yi",
          "yo",
          "za",
          "zh",
          "zu"
        ],
        // From http://data.okfn.org/data/core/language-codes#resource-language-codes-full (IETF language tags)
        locale_regions: [
          "agq-CM",
          "asa-TZ",
          "ast-ES",
          "bas-CM",
          "bem-ZM",
          "bez-TZ",
          "brx-IN",
          "cgg-UG",
          "chr-US",
          "dav-KE",
          "dje-NE",
          "dsb-DE",
          "dua-CM",
          "dyo-SN",
          "ebu-KE",
          "ewo-CM",
          "fil-PH",
          "fur-IT",
          "gsw-CH",
          "gsw-FR",
          "gsw-LI",
          "guz-KE",
          "haw-US",
          "hsb-DE",
          "jgo-CM",
          "jmc-TZ",
          "kab-DZ",
          "kam-KE",
          "kde-TZ",
          "kea-CV",
          "khq-ML",
          "kkj-CM",
          "kln-KE",
          "kok-IN",
          "ksb-TZ",
          "ksf-CM",
          "ksh-DE",
          "lag-TZ",
          "lkt-US",
          "luo-KE",
          "luy-KE",
          "mas-KE",
          "mas-TZ",
          "mer-KE",
          "mfe-MU",
          "mgh-MZ",
          "mgo-CM",
          "mua-CM",
          "naq-NA",
          "nmg-CM",
          "nnh-CM",
          "nus-SD",
          "nyn-UG",
          "rof-TZ",
          "rwk-TZ",
          "sah-RU",
          "saq-KE",
          "sbp-TZ",
          "seh-MZ",
          "ses-ML",
          "shi-Latn",
          "shi-Latn-MA",
          "shi-Tfng",
          "shi-Tfng-MA",
          "smn-FI",
          "teo-KE",
          "teo-UG",
          "twq-NE",
          "tzm-Latn",
          "tzm-Latn-MA",
          "vai-Latn",
          "vai-Latn-LR",
          "vai-Vaii",
          "vai-Vaii-LR",
          "vun-TZ",
          "wae-CH",
          "xog-UG",
          "yav-CM",
          "zgh-MA",
          "af-NA",
          "af-ZA",
          "ak-GH",
          "am-ET",
          "ar-001",
          "ar-AE",
          "ar-BH",
          "ar-DJ",
          "ar-DZ",
          "ar-EG",
          "ar-EH",
          "ar-ER",
          "ar-IL",
          "ar-IQ",
          "ar-JO",
          "ar-KM",
          "ar-KW",
          "ar-LB",
          "ar-LY",
          "ar-MA",
          "ar-MR",
          "ar-OM",
          "ar-PS",
          "ar-QA",
          "ar-SA",
          "ar-SD",
          "ar-SO",
          "ar-SS",
          "ar-SY",
          "ar-TD",
          "ar-TN",
          "ar-YE",
          "as-IN",
          "az-Cyrl",
          "az-Cyrl-AZ",
          "az-Latn",
          "az-Latn-AZ",
          "be-BY",
          "bg-BG",
          "bm-Latn",
          "bm-Latn-ML",
          "bn-BD",
          "bn-IN",
          "bo-CN",
          "bo-IN",
          "br-FR",
          "bs-Cyrl",
          "bs-Cyrl-BA",
          "bs-Latn",
          "bs-Latn-BA",
          "ca-AD",
          "ca-ES",
          "ca-ES-VALENCIA",
          "ca-FR",
          "ca-IT",
          "cs-CZ",
          "cy-GB",
          "da-DK",
          "da-GL",
          "de-AT",
          "de-BE",
          "de-CH",
          "de-DE",
          "de-LI",
          "de-LU",
          "dz-BT",
          "ee-GH",
          "ee-TG",
          "el-CY",
          "el-GR",
          "en-001",
          "en-150",
          "en-AG",
          "en-AI",
          "en-AS",
          "en-AU",
          "en-BB",
          "en-BE",
          "en-BM",
          "en-BS",
          "en-BW",
          "en-BZ",
          "en-CA",
          "en-CC",
          "en-CK",
          "en-CM",
          "en-CX",
          "en-DG",
          "en-DM",
          "en-ER",
          "en-FJ",
          "en-FK",
          "en-FM",
          "en-GB",
          "en-GD",
          "en-GG",
          "en-GH",
          "en-GI",
          "en-GM",
          "en-GU",
          "en-GY",
          "en-HK",
          "en-IE",
          "en-IM",
          "en-IN",
          "en-IO",
          "en-JE",
          "en-JM",
          "en-KE",
          "en-KI",
          "en-KN",
          "en-KY",
          "en-LC",
          "en-LR",
          "en-LS",
          "en-MG",
          "en-MH",
          "en-MO",
          "en-MP",
          "en-MS",
          "en-MT",
          "en-MU",
          "en-MW",
          "en-MY",
          "en-NA",
          "en-NF",
          "en-NG",
          "en-NR",
          "en-NU",
          "en-NZ",
          "en-PG",
          "en-PH",
          "en-PK",
          "en-PN",
          "en-PR",
          "en-PW",
          "en-RW",
          "en-SB",
          "en-SC",
          "en-SD",
          "en-SG",
          "en-SH",
          "en-SL",
          "en-SS",
          "en-SX",
          "en-SZ",
          "en-TC",
          "en-TK",
          "en-TO",
          "en-TT",
          "en-TV",
          "en-TZ",
          "en-UG",
          "en-UM",
          "en-US",
          "en-US-POSIX",
          "en-VC",
          "en-VG",
          "en-VI",
          "en-VU",
          "en-WS",
          "en-ZA",
          "en-ZM",
          "en-ZW",
          "eo-001",
          "es-419",
          "es-AR",
          "es-BO",
          "es-CL",
          "es-CO",
          "es-CR",
          "es-CU",
          "es-DO",
          "es-EA",
          "es-EC",
          "es-ES",
          "es-GQ",
          "es-GT",
          "es-HN",
          "es-IC",
          "es-MX",
          "es-NI",
          "es-PA",
          "es-PE",
          "es-PH",
          "es-PR",
          "es-PY",
          "es-SV",
          "es-US",
          "es-UY",
          "es-VE",
          "et-EE",
          "eu-ES",
          "fa-AF",
          "fa-IR",
          "ff-CM",
          "ff-GN",
          "ff-MR",
          "ff-SN",
          "fi-FI",
          "fo-FO",
          "fr-BE",
          "fr-BF",
          "fr-BI",
          "fr-BJ",
          "fr-BL",
          "fr-CA",
          "fr-CD",
          "fr-CF",
          "fr-CG",
          "fr-CH",
          "fr-CI",
          "fr-CM",
          "fr-DJ",
          "fr-DZ",
          "fr-FR",
          "fr-GA",
          "fr-GF",
          "fr-GN",
          "fr-GP",
          "fr-GQ",
          "fr-HT",
          "fr-KM",
          "fr-LU",
          "fr-MA",
          "fr-MC",
          "fr-MF",
          "fr-MG",
          "fr-ML",
          "fr-MQ",
          "fr-MR",
          "fr-MU",
          "fr-NC",
          "fr-NE",
          "fr-PF",
          "fr-PM",
          "fr-RE",
          "fr-RW",
          "fr-SC",
          "fr-SN",
          "fr-SY",
          "fr-TD",
          "fr-TG",
          "fr-TN",
          "fr-VU",
          "fr-WF",
          "fr-YT",
          "fy-NL",
          "ga-IE",
          "gd-GB",
          "gl-ES",
          "gu-IN",
          "gv-IM",
          "ha-Latn",
          "ha-Latn-GH",
          "ha-Latn-NE",
          "ha-Latn-NG",
          "he-IL",
          "hi-IN",
          "hr-BA",
          "hr-HR",
          "hu-HU",
          "hy-AM",
          "id-ID",
          "ig-NG",
          "ii-CN",
          "is-IS",
          "it-CH",
          "it-IT",
          "it-SM",
          "ja-JP",
          "ka-GE",
          "ki-KE",
          "kk-Cyrl",
          "kk-Cyrl-KZ",
          "kl-GL",
          "km-KH",
          "kn-IN",
          "ko-KP",
          "ko-KR",
          "ks-Arab",
          "ks-Arab-IN",
          "kw-GB",
          "ky-Cyrl",
          "ky-Cyrl-KG",
          "lb-LU",
          "lg-UG",
          "ln-AO",
          "ln-CD",
          "ln-CF",
          "ln-CG",
          "lo-LA",
          "lt-LT",
          "lu-CD",
          "lv-LV",
          "mg-MG",
          "mk-MK",
          "ml-IN",
          "mn-Cyrl",
          "mn-Cyrl-MN",
          "mr-IN",
          "ms-Latn",
          "ms-Latn-BN",
          "ms-Latn-MY",
          "ms-Latn-SG",
          "mt-MT",
          "my-MM",
          "nb-NO",
          "nb-SJ",
          "nd-ZW",
          "ne-IN",
          "ne-NP",
          "nl-AW",
          "nl-BE",
          "nl-BQ",
          "nl-CW",
          "nl-NL",
          "nl-SR",
          "nl-SX",
          "nn-NO",
          "om-ET",
          "om-KE",
          "or-IN",
          "os-GE",
          "os-RU",
          "pa-Arab",
          "pa-Arab-PK",
          "pa-Guru",
          "pa-Guru-IN",
          "pl-PL",
          "ps-AF",
          "pt-AO",
          "pt-BR",
          "pt-CV",
          "pt-GW",
          "pt-MO",
          "pt-MZ",
          "pt-PT",
          "pt-ST",
          "pt-TL",
          "qu-BO",
          "qu-EC",
          "qu-PE",
          "rm-CH",
          "rn-BI",
          "ro-MD",
          "ro-RO",
          "ru-BY",
          "ru-KG",
          "ru-KZ",
          "ru-MD",
          "ru-RU",
          "ru-UA",
          "rw-RW",
          "se-FI",
          "se-NO",
          "se-SE",
          "sg-CF",
          "si-LK",
          "sk-SK",
          "sl-SI",
          "sn-ZW",
          "so-DJ",
          "so-ET",
          "so-KE",
          "so-SO",
          "sq-AL",
          "sq-MK",
          "sq-XK",
          "sr-Cyrl",
          "sr-Cyrl-BA",
          "sr-Cyrl-ME",
          "sr-Cyrl-RS",
          "sr-Cyrl-XK",
          "sr-Latn",
          "sr-Latn-BA",
          "sr-Latn-ME",
          "sr-Latn-RS",
          "sr-Latn-XK",
          "sv-AX",
          "sv-FI",
          "sv-SE",
          "sw-CD",
          "sw-KE",
          "sw-TZ",
          "sw-UG",
          "ta-IN",
          "ta-LK",
          "ta-MY",
          "ta-SG",
          "te-IN",
          "th-TH",
          "ti-ER",
          "ti-ET",
          "to-TO",
          "tr-CY",
          "tr-TR",
          "ug-Arab",
          "ug-Arab-CN",
          "uk-UA",
          "ur-IN",
          "ur-PK",
          "uz-Arab",
          "uz-Arab-AF",
          "uz-Cyrl",
          "uz-Cyrl-UZ",
          "uz-Latn",
          "uz-Latn-UZ",
          "vi-VN",
          "yi-001",
          "yo-BJ",
          "yo-NG",
          "zh-Hans",
          "zh-Hans-CN",
          "zh-Hans-HK",
          "zh-Hans-MO",
          "zh-Hans-SG",
          "zh-Hant",
          "zh-Hant-HK",
          "zh-Hant-MO",
          "zh-Hant-TW",
          "zu-ZA"
        ],
        us_states_and_dc: [
          { name: "Alabama", abbreviation: "AL" },
          { name: "Alaska", abbreviation: "AK" },
          { name: "Arizona", abbreviation: "AZ" },
          { name: "Arkansas", abbreviation: "AR" },
          { name: "California", abbreviation: "CA" },
          { name: "Colorado", abbreviation: "CO" },
          { name: "Connecticut", abbreviation: "CT" },
          { name: "Delaware", abbreviation: "DE" },
          { name: "District of Columbia", abbreviation: "DC" },
          { name: "Florida", abbreviation: "FL" },
          { name: "Georgia", abbreviation: "GA" },
          { name: "Hawaii", abbreviation: "HI" },
          { name: "Idaho", abbreviation: "ID" },
          { name: "Illinois", abbreviation: "IL" },
          { name: "Indiana", abbreviation: "IN" },
          { name: "Iowa", abbreviation: "IA" },
          { name: "Kansas", abbreviation: "KS" },
          { name: "Kentucky", abbreviation: "KY" },
          { name: "Louisiana", abbreviation: "LA" },
          { name: "Maine", abbreviation: "ME" },
          { name: "Maryland", abbreviation: "MD" },
          { name: "Massachusetts", abbreviation: "MA" },
          { name: "Michigan", abbreviation: "MI" },
          { name: "Minnesota", abbreviation: "MN" },
          { name: "Mississippi", abbreviation: "MS" },
          { name: "Missouri", abbreviation: "MO" },
          { name: "Montana", abbreviation: "MT" },
          { name: "Nebraska", abbreviation: "NE" },
          { name: "Nevada", abbreviation: "NV" },
          { name: "New Hampshire", abbreviation: "NH" },
          { name: "New Jersey", abbreviation: "NJ" },
          { name: "New Mexico", abbreviation: "NM" },
          { name: "New York", abbreviation: "NY" },
          { name: "North Carolina", abbreviation: "NC" },
          { name: "North Dakota", abbreviation: "ND" },
          { name: "Ohio", abbreviation: "OH" },
          { name: "Oklahoma", abbreviation: "OK" },
          { name: "Oregon", abbreviation: "OR" },
          { name: "Pennsylvania", abbreviation: "PA" },
          { name: "Rhode Island", abbreviation: "RI" },
          { name: "South Carolina", abbreviation: "SC" },
          { name: "South Dakota", abbreviation: "SD" },
          { name: "Tennessee", abbreviation: "TN" },
          { name: "Texas", abbreviation: "TX" },
          { name: "Utah", abbreviation: "UT" },
          { name: "Vermont", abbreviation: "VT" },
          { name: "Virginia", abbreviation: "VA" },
          { name: "Washington", abbreviation: "WA" },
          { name: "West Virginia", abbreviation: "WV" },
          { name: "Wisconsin", abbreviation: "WI" },
          { name: "Wyoming", abbreviation: "WY" }
        ],
        territories: [
          { name: "American Samoa", abbreviation: "AS" },
          { name: "Federated States of Micronesia", abbreviation: "FM" },
          { name: "Guam", abbreviation: "GU" },
          { name: "Marshall Islands", abbreviation: "MH" },
          { name: "Northern Mariana Islands", abbreviation: "MP" },
          { name: "Puerto Rico", abbreviation: "PR" },
          { name: "Virgin Islands, U.S.", abbreviation: "VI" }
        ],
        armed_forces: [
          { name: "Armed Forces Europe", abbreviation: "AE" },
          { name: "Armed Forces Pacific", abbreviation: "AP" },
          { name: "Armed Forces the Americas", abbreviation: "AA" }
        ],
        country_regions: {
          it: [
            { name: "Valle d'Aosta", abbreviation: "VDA" },
            { name: "Piemonte", abbreviation: "PIE" },
            { name: "Lombardia", abbreviation: "LOM" },
            { name: "Veneto", abbreviation: "VEN" },
            { name: "Trentino Alto Adige", abbreviation: "TAA" },
            { name: "Friuli Venezia Giulia", abbreviation: "FVG" },
            { name: "Liguria", abbreviation: "LIG" },
            { name: "Emilia Romagna", abbreviation: "EMR" },
            { name: "Toscana", abbreviation: "TOS" },
            { name: "Umbria", abbreviation: "UMB" },
            { name: "Marche", abbreviation: "MAR" },
            { name: "Abruzzo", abbreviation: "ABR" },
            { name: "Lazio", abbreviation: "LAZ" },
            { name: "Campania", abbreviation: "CAM" },
            { name: "Puglia", abbreviation: "PUG" },
            { name: "Basilicata", abbreviation: "BAS" },
            { name: "Molise", abbreviation: "MOL" },
            { name: "Calabria", abbreviation: "CAL" },
            { name: "Sicilia", abbreviation: "SIC" },
            { name: "Sardegna", abbreviation: "SAR" }
          ],
          mx: [
            { name: "Aguascalientes", abbreviation: "AGU" },
            { name: "Baja California", abbreviation: "BCN" },
            { name: "Baja California Sur", abbreviation: "BCS" },
            { name: "Campeche", abbreviation: "CAM" },
            { name: "Chiapas", abbreviation: "CHP" },
            { name: "Chihuahua", abbreviation: "CHH" },
            { name: "Ciudad de M\xE9xico", abbreviation: "DIF" },
            { name: "Coahuila", abbreviation: "COA" },
            { name: "Colima", abbreviation: "COL" },
            { name: "Durango", abbreviation: "DUR" },
            { name: "Guanajuato", abbreviation: "GUA" },
            { name: "Guerrero", abbreviation: "GRO" },
            { name: "Hidalgo", abbreviation: "HID" },
            { name: "Jalisco", abbreviation: "JAL" },
            { name: "M\xE9xico", abbreviation: "MEX" },
            { name: "Michoac\xE1n", abbreviation: "MIC" },
            { name: "Morelos", abbreviation: "MOR" },
            { name: "Nayarit", abbreviation: "NAY" },
            { name: "Nuevo Le\xF3n", abbreviation: "NLE" },
            { name: "Oaxaca", abbreviation: "OAX" },
            { name: "Puebla", abbreviation: "PUE" },
            { name: "Quer\xE9taro", abbreviation: "QUE" },
            { name: "Quintana Roo", abbreviation: "ROO" },
            { name: "San Luis Potos\xED", abbreviation: "SLP" },
            { name: "Sinaloa", abbreviation: "SIN" },
            { name: "Sonora", abbreviation: "SON" },
            { name: "Tabasco", abbreviation: "TAB" },
            { name: "Tamaulipas", abbreviation: "TAM" },
            { name: "Tlaxcala", abbreviation: "TLA" },
            { name: "Veracruz", abbreviation: "VER" },
            { name: "Yucat\xE1n", abbreviation: "YUC" },
            { name: "Zacatecas", abbreviation: "ZAC" }
          ]
        },
        street_suffixes: {
          us: [
            { name: "Avenue", abbreviation: "Ave" },
            { name: "Boulevard", abbreviation: "Blvd" },
            { name: "Center", abbreviation: "Ctr" },
            { name: "Circle", abbreviation: "Cir" },
            { name: "Court", abbreviation: "Ct" },
            { name: "Drive", abbreviation: "Dr" },
            { name: "Extension", abbreviation: "Ext" },
            { name: "Glen", abbreviation: "Gln" },
            { name: "Grove", abbreviation: "Grv" },
            { name: "Heights", abbreviation: "Hts" },
            { name: "Highway", abbreviation: "Hwy" },
            { name: "Junction", abbreviation: "Jct" },
            { name: "Key", abbreviation: "Key" },
            { name: "Lane", abbreviation: "Ln" },
            { name: "Loop", abbreviation: "Loop" },
            { name: "Manor", abbreviation: "Mnr" },
            { name: "Mill", abbreviation: "Mill" },
            { name: "Park", abbreviation: "Park" },
            { name: "Parkway", abbreviation: "Pkwy" },
            { name: "Pass", abbreviation: "Pass" },
            { name: "Path", abbreviation: "Path" },
            { name: "Pike", abbreviation: "Pike" },
            { name: "Place", abbreviation: "Pl" },
            { name: "Plaza", abbreviation: "Plz" },
            { name: "Point", abbreviation: "Pt" },
            { name: "Ridge", abbreviation: "Rdg" },
            { name: "River", abbreviation: "Riv" },
            { name: "Road", abbreviation: "Rd" },
            { name: "Square", abbreviation: "Sq" },
            { name: "Street", abbreviation: "St" },
            { name: "Terrace", abbreviation: "Ter" },
            { name: "Trail", abbreviation: "Trl" },
            { name: "Turnpike", abbreviation: "Tpke" },
            { name: "View", abbreviation: "Vw" },
            { name: "Way", abbreviation: "Way" }
          ],
          it: [
            { name: "Accesso", abbreviation: "Acc." },
            { name: "Alzaia", abbreviation: "Alz." },
            { name: "Arco", abbreviation: "Arco" },
            { name: "Archivolto", abbreviation: "Acv." },
            { name: "Arena", abbreviation: "Arena" },
            { name: "Argine", abbreviation: "Argine" },
            { name: "Bacino", abbreviation: "Bacino" },
            { name: "Banchi", abbreviation: "Banchi" },
            { name: "Banchina", abbreviation: "Ban." },
            { name: "Bastioni", abbreviation: "Bas." },
            { name: "Belvedere", abbreviation: "Belv." },
            { name: "Borgata", abbreviation: "B.ta" },
            { name: "Borgo", abbreviation: "B.go" },
            { name: "Calata", abbreviation: "Cal." },
            { name: "Calle", abbreviation: "Calle" },
            { name: "Campiello", abbreviation: "Cam." },
            { name: "Campo", abbreviation: "Cam." },
            { name: "Canale", abbreviation: "Can." },
            { name: "Carraia", abbreviation: "Carr." },
            { name: "Cascina", abbreviation: "Cascina" },
            { name: "Case sparse", abbreviation: "c.s." },
            { name: "Cavalcavia", abbreviation: "Cv." },
            { name: "Circonvallazione", abbreviation: "Cv." },
            { name: "Complanare", abbreviation: "C.re" },
            { name: "Contrada", abbreviation: "C.da" },
            { name: "Corso", abbreviation: "C.so" },
            { name: "Corte", abbreviation: "C.te" },
            { name: "Cortile", abbreviation: "C.le" },
            { name: "Diramazione", abbreviation: "Dir." },
            { name: "Fondaco", abbreviation: "F.co" },
            { name: "Fondamenta", abbreviation: "F.ta" },
            { name: "Fondo", abbreviation: "F.do" },
            { name: "Frazione", abbreviation: "Fr." },
            { name: "Isola", abbreviation: "Is." },
            { name: "Largo", abbreviation: "L.go" },
            { name: "Litoranea", abbreviation: "Lit." },
            { name: "Lungolago", abbreviation: "L.go lago" },
            { name: "Lungo Po", abbreviation: "l.go Po" },
            { name: "Molo", abbreviation: "Molo" },
            { name: "Mura", abbreviation: "Mura" },
            { name: "Passaggio privato", abbreviation: "pass. priv." },
            { name: "Passeggiata", abbreviation: "Pass." },
            { name: "Piazza", abbreviation: "P.zza" },
            { name: "Piazzale", abbreviation: "P.le" },
            { name: "Ponte", abbreviation: "P.te" },
            { name: "Portico", abbreviation: "P.co" },
            { name: "Rampa", abbreviation: "Rampa" },
            { name: "Regione", abbreviation: "Reg." },
            { name: "Rione", abbreviation: "R.ne" },
            { name: "Rio", abbreviation: "Rio" },
            { name: "Ripa", abbreviation: "Ripa" },
            { name: "Riva", abbreviation: "Riva" },
            { name: "Rond\xF2", abbreviation: "Rond\xF2" },
            { name: "Rotonda", abbreviation: "Rot." },
            { name: "Sagrato", abbreviation: "Sagr." },
            { name: "Salita", abbreviation: "Sal." },
            { name: "Scalinata", abbreviation: "Scal." },
            { name: "Scalone", abbreviation: "Scal." },
            { name: "Slargo", abbreviation: "Sl." },
            { name: "Sottoportico", abbreviation: "Sott." },
            { name: "Strada", abbreviation: "Str." },
            { name: "Stradale", abbreviation: "Str.le" },
            { name: "Strettoia", abbreviation: "Strett." },
            { name: "Traversa", abbreviation: "Trav." },
            { name: "Via", abbreviation: "V." },
            { name: "Viale", abbreviation: "V.le" },
            { name: "Vicinale", abbreviation: "Vic.le" },
            { name: "Vicolo", abbreviation: "Vic." }
          ],
          uk: [
            { name: "Avenue", abbreviation: "Ave" },
            { name: "Close", abbreviation: "Cl" },
            { name: "Court", abbreviation: "Ct" },
            { name: "Crescent", abbreviation: "Cr" },
            { name: "Drive", abbreviation: "Dr" },
            { name: "Garden", abbreviation: "Gdn" },
            { name: "Gardens", abbreviation: "Gdns" },
            { name: "Green", abbreviation: "Gn" },
            { name: "Grove", abbreviation: "Gr" },
            { name: "Lane", abbreviation: "Ln" },
            { name: "Mount", abbreviation: "Mt" },
            { name: "Place", abbreviation: "Pl" },
            { name: "Park", abbreviation: "Pk" },
            { name: "Ridge", abbreviation: "Rdg" },
            { name: "Road", abbreviation: "Rd" },
            { name: "Square", abbreviation: "Sq" },
            { name: "Street", abbreviation: "St" },
            { name: "Terrace", abbreviation: "Ter" },
            { name: "Valley", abbreviation: "Val" }
          ]
        },
        months: [
          { name: "January", short_name: "Jan", numeric: "01", days: 31 },
          // Not messing with leap years...
          { name: "February", short_name: "Feb", numeric: "02", days: 28 },
          { name: "March", short_name: "Mar", numeric: "03", days: 31 },
          { name: "April", short_name: "Apr", numeric: "04", days: 30 },
          { name: "May", short_name: "May", numeric: "05", days: 31 },
          { name: "June", short_name: "Jun", numeric: "06", days: 30 },
          { name: "July", short_name: "Jul", numeric: "07", days: 31 },
          { name: "August", short_name: "Aug", numeric: "08", days: 31 },
          { name: "September", short_name: "Sep", numeric: "09", days: 30 },
          { name: "October", short_name: "Oct", numeric: "10", days: 31 },
          { name: "November", short_name: "Nov", numeric: "11", days: 30 },
          { name: "December", short_name: "Dec", numeric: "12", days: 31 }
        ],
        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        cc_types: [
          { name: "American Express", short_name: "amex", prefix: "34", length: 15 },
          { name: "Bankcard", short_name: "bankcard", prefix: "5610", length: 16 },
          { name: "China UnionPay", short_name: "chinaunion", prefix: "62", length: 16 },
          { name: "Diners Club Carte Blanche", short_name: "dccarte", prefix: "300", length: 14 },
          { name: "Diners Club enRoute", short_name: "dcenroute", prefix: "2014", length: 15 },
          { name: "Diners Club International", short_name: "dcintl", prefix: "36", length: 14 },
          { name: "Diners Club United States & Canada", short_name: "dcusc", prefix: "54", length: 16 },
          { name: "Discover Card", short_name: "discover", prefix: "6011", length: 16 },
          { name: "InstaPayment", short_name: "instapay", prefix: "637", length: 16 },
          { name: "JCB", short_name: "jcb", prefix: "3528", length: 16 },
          { name: "Laser", short_name: "laser", prefix: "6304", length: 16 },
          { name: "Maestro", short_name: "maestro", prefix: "5018", length: 16 },
          { name: "Mastercard", short_name: "mc", prefix: "51", length: 16 },
          { name: "Solo", short_name: "solo", prefix: "6334", length: 16 },
          { name: "Switch", short_name: "switch", prefix: "4903", length: 16 },
          { name: "Visa", short_name: "visa", prefix: "4", length: 16 },
          { name: "Visa Electron", short_name: "electron", prefix: "4026", length: 16 }
        ],
        //return all world currency by ISO 4217
        currency_types: [
          { code: "AED", name: "United Arab Emirates Dirham" },
          { code: "AFN", name: "Afghanistan Afghani" },
          { code: "ALL", name: "Albania Lek" },
          { code: "AMD", name: "Armenia Dram" },
          { code: "ANG", name: "Netherlands Antilles Guilder" },
          { code: "AOA", name: "Angola Kwanza" },
          { code: "ARS", name: "Argentina Peso" },
          { code: "AUD", name: "Australia Dollar" },
          { code: "AWG", name: "Aruba Guilder" },
          { code: "AZN", name: "Azerbaijan New Manat" },
          { code: "BAM", name: "Bosnia and Herzegovina Convertible Marka" },
          { code: "BBD", name: "Barbados Dollar" },
          { code: "BDT", name: "Bangladesh Taka" },
          { code: "BGN", name: "Bulgaria Lev" },
          { code: "BHD", name: "Bahrain Dinar" },
          { code: "BIF", name: "Burundi Franc" },
          { code: "BMD", name: "Bermuda Dollar" },
          { code: "BND", name: "Brunei Darussalam Dollar" },
          { code: "BOB", name: "Bolivia Boliviano" },
          { code: "BRL", name: "Brazil Real" },
          { code: "BSD", name: "Bahamas Dollar" },
          { code: "BTN", name: "Bhutan Ngultrum" },
          { code: "BWP", name: "Botswana Pula" },
          { code: "BYR", name: "Belarus Ruble" },
          { code: "BZD", name: "Belize Dollar" },
          { code: "CAD", name: "Canada Dollar" },
          { code: "CDF", name: "Congo/Kinshasa Franc" },
          { code: "CHF", name: "Switzerland Franc" },
          { code: "CLP", name: "Chile Peso" },
          { code: "CNY", name: "China Yuan Renminbi" },
          { code: "COP", name: "Colombia Peso" },
          { code: "CRC", name: "Costa Rica Colon" },
          { code: "CUC", name: "Cuba Convertible Peso" },
          { code: "CUP", name: "Cuba Peso" },
          { code: "CVE", name: "Cape Verde Escudo" },
          { code: "CZK", name: "Czech Republic Koruna" },
          { code: "DJF", name: "Djibouti Franc" },
          { code: "DKK", name: "Denmark Krone" },
          { code: "DOP", name: "Dominican Republic Peso" },
          { code: "DZD", name: "Algeria Dinar" },
          { code: "EGP", name: "Egypt Pound" },
          { code: "ERN", name: "Eritrea Nakfa" },
          { code: "ETB", name: "Ethiopia Birr" },
          { code: "EUR", name: "Euro Member Countries" },
          { code: "FJD", name: "Fiji Dollar" },
          { code: "FKP", name: "Falkland Islands (Malvinas) Pound" },
          { code: "GBP", name: "United Kingdom Pound" },
          { code: "GEL", name: "Georgia Lari" },
          { code: "GGP", name: "Guernsey Pound" },
          { code: "GHS", name: "Ghana Cedi" },
          { code: "GIP", name: "Gibraltar Pound" },
          { code: "GMD", name: "Gambia Dalasi" },
          { code: "GNF", name: "Guinea Franc" },
          { code: "GTQ", name: "Guatemala Quetzal" },
          { code: "GYD", name: "Guyana Dollar" },
          { code: "HKD", name: "Hong Kong Dollar" },
          { code: "HNL", name: "Honduras Lempira" },
          { code: "HRK", name: "Croatia Kuna" },
          { code: "HTG", name: "Haiti Gourde" },
          { code: "HUF", name: "Hungary Forint" },
          { code: "IDR", name: "Indonesia Rupiah" },
          { code: "ILS", name: "Israel Shekel" },
          { code: "IMP", name: "Isle of Man Pound" },
          { code: "INR", name: "India Rupee" },
          { code: "IQD", name: "Iraq Dinar" },
          { code: "IRR", name: "Iran Rial" },
          { code: "ISK", name: "Iceland Krona" },
          { code: "JEP", name: "Jersey Pound" },
          { code: "JMD", name: "Jamaica Dollar" },
          { code: "JOD", name: "Jordan Dinar" },
          { code: "JPY", name: "Japan Yen" },
          { code: "KES", name: "Kenya Shilling" },
          { code: "KGS", name: "Kyrgyzstan Som" },
          { code: "KHR", name: "Cambodia Riel" },
          { code: "KMF", name: "Comoros Franc" },
          { code: "KPW", name: "Korea (North) Won" },
          { code: "KRW", name: "Korea (South) Won" },
          { code: "KWD", name: "Kuwait Dinar" },
          { code: "KYD", name: "Cayman Islands Dollar" },
          { code: "KZT", name: "Kazakhstan Tenge" },
          { code: "LAK", name: "Laos Kip" },
          { code: "LBP", name: "Lebanon Pound" },
          { code: "LKR", name: "Sri Lanka Rupee" },
          { code: "LRD", name: "Liberia Dollar" },
          { code: "LSL", name: "Lesotho Loti" },
          { code: "LTL", name: "Lithuania Litas" },
          { code: "LYD", name: "Libya Dinar" },
          { code: "MAD", name: "Morocco Dirham" },
          { code: "MDL", name: "Moldova Leu" },
          { code: "MGA", name: "Madagascar Ariary" },
          { code: "MKD", name: "Macedonia Denar" },
          { code: "MMK", name: "Myanmar (Burma) Kyat" },
          { code: "MNT", name: "Mongolia Tughrik" },
          { code: "MOP", name: "Macau Pataca" },
          { code: "MRO", name: "Mauritania Ouguiya" },
          { code: "MUR", name: "Mauritius Rupee" },
          { code: "MVR", name: "Maldives (Maldive Islands) Rufiyaa" },
          { code: "MWK", name: "Malawi Kwacha" },
          { code: "MXN", name: "Mexico Peso" },
          { code: "MYR", name: "Malaysia Ringgit" },
          { code: "MZN", name: "Mozambique Metical" },
          { code: "NAD", name: "Namibia Dollar" },
          { code: "NGN", name: "Nigeria Naira" },
          { code: "NIO", name: "Nicaragua Cordoba" },
          { code: "NOK", name: "Norway Krone" },
          { code: "NPR", name: "Nepal Rupee" },
          { code: "NZD", name: "New Zealand Dollar" },
          { code: "OMR", name: "Oman Rial" },
          { code: "PAB", name: "Panama Balboa" },
          { code: "PEN", name: "Peru Nuevo Sol" },
          { code: "PGK", name: "Papua New Guinea Kina" },
          { code: "PHP", name: "Philippines Peso" },
          { code: "PKR", name: "Pakistan Rupee" },
          { code: "PLN", name: "Poland Zloty" },
          { code: "PYG", name: "Paraguay Guarani" },
          { code: "QAR", name: "Qatar Riyal" },
          { code: "RON", name: "Romania New Leu" },
          { code: "RSD", name: "Serbia Dinar" },
          { code: "RUB", name: "Russia Ruble" },
          { code: "RWF", name: "Rwanda Franc" },
          { code: "SAR", name: "Saudi Arabia Riyal" },
          { code: "SBD", name: "Solomon Islands Dollar" },
          { code: "SCR", name: "Seychelles Rupee" },
          { code: "SDG", name: "Sudan Pound" },
          { code: "SEK", name: "Sweden Krona" },
          { code: "SGD", name: "Singapore Dollar" },
          { code: "SHP", name: "Saint Helena Pound" },
          { code: "SLL", name: "Sierra Leone Leone" },
          { code: "SOS", name: "Somalia Shilling" },
          { code: "SPL", name: "Seborga Luigino" },
          { code: "SRD", name: "Suriname Dollar" },
          { code: "STD", name: "S\xE3o Tom\xE9 and Pr\xEDncipe Dobra" },
          { code: "SVC", name: "El Salvador Colon" },
          { code: "SYP", name: "Syria Pound" },
          { code: "SZL", name: "Swaziland Lilangeni" },
          { code: "THB", name: "Thailand Baht" },
          { code: "TJS", name: "Tajikistan Somoni" },
          { code: "TMT", name: "Turkmenistan Manat" },
          { code: "TND", name: "Tunisia Dinar" },
          { code: "TOP", name: "Tonga Pa'anga" },
          { code: "TRY", name: "Turkey Lira" },
          { code: "TTD", name: "Trinidad and Tobago Dollar" },
          { code: "TVD", name: "Tuvalu Dollar" },
          { code: "TWD", name: "Taiwan New Dollar" },
          { code: "TZS", name: "Tanzania Shilling" },
          { code: "UAH", name: "Ukraine Hryvnia" },
          { code: "UGX", name: "Uganda Shilling" },
          { code: "USD", name: "United States Dollar" },
          { code: "UYU", name: "Uruguay Peso" },
          { code: "UZS", name: "Uzbekistan Som" },
          { code: "VEF", name: "Venezuela Bolivar" },
          { code: "VND", name: "Viet Nam Dong" },
          { code: "VUV", name: "Vanuatu Vatu" },
          { code: "WST", name: "Samoa Tala" },
          { code: "XAF", name: "Communaut\xE9 Financi\xE8re Africaine (BEAC) CFA Franc BEAC" },
          { code: "XCD", name: "East Caribbean Dollar" },
          { code: "XDR", name: "International Monetary Fund (IMF) Special Drawing Rights" },
          { code: "XOF", name: "Communaut\xE9 Financi\xE8re Africaine (BCEAO) Franc" },
          { code: "XPF", name: "Comptoirs Fran\xE7ais du Pacifique (CFP) Franc" },
          { code: "YER", name: "Yemen Rial" },
          { code: "ZAR", name: "South Africa Rand" },
          { code: "ZMW", name: "Zambia Kwacha" },
          { code: "ZWD", name: "Zimbabwe Dollar" }
        ],
        // return the names of all valide colors
        colorNames: [
          "AliceBlue",
          "Black",
          "Navy",
          "DarkBlue",
          "MediumBlue",
          "Blue",
          "DarkGreen",
          "Green",
          "Teal",
          "DarkCyan",
          "DeepSkyBlue",
          "DarkTurquoise",
          "MediumSpringGreen",
          "Lime",
          "SpringGreen",
          "Aqua",
          "Cyan",
          "MidnightBlue",
          "DodgerBlue",
          "LightSeaGreen",
          "ForestGreen",
          "SeaGreen",
          "DarkSlateGray",
          "LimeGreen",
          "MediumSeaGreen",
          "Turquoise",
          "RoyalBlue",
          "SteelBlue",
          "DarkSlateBlue",
          "MediumTurquoise",
          "Indigo",
          "DarkOliveGreen",
          "CadetBlue",
          "CornflowerBlue",
          "RebeccaPurple",
          "MediumAquaMarine",
          "DimGray",
          "SlateBlue",
          "OliveDrab",
          "SlateGray",
          "LightSlateGray",
          "MediumSlateBlue",
          "LawnGreen",
          "Chartreuse",
          "Aquamarine",
          "Maroon",
          "Purple",
          "Olive",
          "Gray",
          "SkyBlue",
          "LightSkyBlue",
          "BlueViolet",
          "DarkRed",
          "DarkMagenta",
          "SaddleBrown",
          "Ivory",
          "White",
          "DarkSeaGreen",
          "LightGreen",
          "MediumPurple",
          "DarkViolet",
          "PaleGreen",
          "DarkOrchid",
          "YellowGreen",
          "Sienna",
          "Brown",
          "DarkGray",
          "LightBlue",
          "GreenYellow",
          "PaleTurquoise",
          "LightSteelBlue",
          "PowderBlue",
          "FireBrick",
          "DarkGoldenRod",
          "MediumOrchid",
          "RosyBrown",
          "DarkKhaki",
          "Silver",
          "MediumVioletRed",
          "IndianRed",
          "Peru",
          "Chocolate",
          "Tan",
          "LightGray",
          "Thistle",
          "Orchid",
          "GoldenRod",
          "PaleVioletRed",
          "Crimson",
          "Gainsboro",
          "Plum",
          "BurlyWood",
          "LightCyan",
          "Lavender",
          "DarkSalmon",
          "Violet",
          "PaleGoldenRod",
          "LightCoral",
          "Khaki",
          "AliceBlue",
          "HoneyDew",
          "Azure",
          "SandyBrown",
          "Wheat",
          "Beige",
          "WhiteSmoke",
          "MintCream",
          "GhostWhite",
          "Salmon",
          "AntiqueWhite",
          "Linen",
          "LightGoldenRodYellow",
          "OldLace",
          "Red",
          "Fuchsia",
          "Magenta",
          "DeepPink",
          "OrangeRed",
          "Tomato",
          "HotPink",
          "Coral",
          "DarkOrange",
          "LightSalmon",
          "Orange",
          "LightPink",
          "Pink",
          "Gold",
          "PeachPuff",
          "NavajoWhite",
          "Moccasin",
          "Bisque",
          "MistyRose",
          "BlanchedAlmond",
          "PapayaWhip",
          "LavenderBlush",
          "SeaShell",
          "Cornsilk",
          "LemonChiffon",
          "FloralWhite",
          "Snow",
          "Yellow",
          "LightYellow"
        ],
        // Data taken from https://www.sec.gov/rules/other/4-460list.htm
        company: [
          "3Com Corp",
          "3M Company",
          "A.G. Edwards Inc.",
          "Abbott Laboratories",
          "Abercrombie & Fitch Co.",
          "ABM Industries Incorporated",
          "Ace Hardware Corporation",
          "ACT Manufacturing Inc.",
          "Acterna Corp.",
          "Adams Resources & Energy, Inc.",
          "ADC Telecommunications, Inc.",
          "Adelphia Communications Corporation",
          "Administaff, Inc.",
          "Adobe Systems Incorporated",
          "Adolph Coors Company",
          "Advance Auto Parts, Inc.",
          "Advanced Micro Devices, Inc.",
          "AdvancePCS, Inc.",
          "Advantica Restaurant Group, Inc.",
          "The AES Corporation",
          "Aetna Inc.",
          "Affiliated Computer Services, Inc.",
          "AFLAC Incorporated",
          "AGCO Corporation",
          "Agilent Technologies, Inc.",
          "Agway Inc.",
          "Apartment Investment and Management Company",
          "Air Products and Chemicals, Inc.",
          "Airborne, Inc.",
          "Airgas, Inc.",
          "AK Steel Holding Corporation",
          "Alaska Air Group, Inc.",
          "Alberto-Culver Company",
          "Albertson's, Inc.",
          "Alcoa Inc.",
          "Alleghany Corporation",
          "Allegheny Energy, Inc.",
          "Allegheny Technologies Incorporated",
          "Allergan, Inc.",
          "ALLETE, Inc.",
          "Alliant Energy Corporation",
          "Allied Waste Industries, Inc.",
          "Allmerica Financial Corporation",
          "The Allstate Corporation",
          "ALLTEL Corporation",
          "The Alpine Group, Inc.",
          "Amazon.com, Inc.",
          "AMC Entertainment Inc.",
          "American Power Conversion Corporation",
          "Amerada Hess Corporation",
          "AMERCO",
          "Ameren Corporation",
          "America West Holdings Corporation",
          "American Axle & Manufacturing Holdings, Inc.",
          "American Eagle Outfitters, Inc.",
          "American Electric Power Company, Inc.",
          "American Express Company",
          "American Financial Group, Inc.",
          "American Greetings Corporation",
          "American International Group, Inc.",
          "American Standard Companies Inc.",
          "American Water Works Company, Inc.",
          "AmerisourceBergen Corporation",
          "Ames Department Stores, Inc.",
          "Amgen Inc.",
          "Amkor Technology, Inc.",
          "AMR Corporation",
          "AmSouth Bancorp.",
          "Amtran, Inc.",
          "Anadarko Petroleum Corporation",
          "Analog Devices, Inc.",
          "Anheuser-Busch Companies, Inc.",
          "Anixter International Inc.",
          "AnnTaylor Inc.",
          "Anthem, Inc.",
          "AOL Time Warner Inc.",
          "Aon Corporation",
          "Apache Corporation",
          "Apple Computer, Inc.",
          "Applera Corporation",
          "Applied Industrial Technologies, Inc.",
          "Applied Materials, Inc.",
          "Aquila, Inc.",
          "ARAMARK Corporation",
          "Arch Coal, Inc.",
          "Archer Daniels Midland Company",
          "Arkansas Best Corporation",
          "Armstrong Holdings, Inc.",
          "Arrow Electronics, Inc.",
          "ArvinMeritor, Inc.",
          "Ashland Inc.",
          "Astoria Financial Corporation",
          "AT&T Corp.",
          "Atmel Corporation",
          "Atmos Energy Corporation",
          "Audiovox Corporation",
          "Autoliv, Inc.",
          "Automatic Data Processing, Inc.",
          "AutoNation, Inc.",
          "AutoZone, Inc.",
          "Avaya Inc.",
          "Avery Dennison Corporation",
          "Avista Corporation",
          "Avnet, Inc.",
          "Avon Products, Inc.",
          "Baker Hughes Incorporated",
          "Ball Corporation",
          "Bank of America Corporation",
          "The Bank of New York Company, Inc.",
          "Bank One Corporation",
          "Banknorth Group, Inc.",
          "Banta Corporation",
          "Barnes & Noble, Inc.",
          "Bausch & Lomb Incorporated",
          "Baxter International Inc.",
          "BB&T Corporation",
          "The Bear Stearns Companies Inc.",
          "Beazer Homes USA, Inc.",
          "Beckman Coulter, Inc.",
          "Becton, Dickinson and Company",
          "Bed Bath & Beyond Inc.",
          "Belk, Inc.",
          "Bell Microproducts Inc.",
          "BellSouth Corporation",
          "Belo Corp.",
          "Bemis Company, Inc.",
          "Benchmark Electronics, Inc.",
          "Berkshire Hathaway Inc.",
          "Best Buy Co., Inc.",
          "Bethlehem Steel Corporation",
          "Beverly Enterprises, Inc.",
          "Big Lots, Inc.",
          "BJ Services Company",
          "BJ's Wholesale Club, Inc.",
          "The Black & Decker Corporation",
          "Black Hills Corporation",
          "BMC Software, Inc.",
          "The Boeing Company",
          "Boise Cascade Corporation",
          "Borders Group, Inc.",
          "BorgWarner Inc.",
          "Boston Scientific Corporation",
          "Bowater Incorporated",
          "Briggs & Stratton Corporation",
          "Brightpoint, Inc.",
          "Brinker International, Inc.",
          "Bristol-Myers Squibb Company",
          "Broadwing, Inc.",
          "Brown Shoe Company, Inc.",
          "Brown-Forman Corporation",
          "Brunswick Corporation",
          "Budget Group, Inc.",
          "Burlington Coat Factory Warehouse Corporation",
          "Burlington Industries, Inc.",
          "Burlington Northern Santa Fe Corporation",
          "Burlington Resources Inc.",
          "C. H. Robinson Worldwide Inc.",
          "Cablevision Systems Corp",
          "Cabot Corp",
          "Cadence Design Systems, Inc.",
          "Calpine Corp.",
          "Campbell Soup Co.",
          "Capital One Financial Corp.",
          "Cardinal Health Inc.",
          "Caremark Rx Inc.",
          "Carlisle Cos. Inc.",
          "Carpenter Technology Corp.",
          "Casey's General Stores Inc.",
          "Caterpillar Inc.",
          "CBRL Group Inc.",
          "CDI Corp.",
          "CDW Computer Centers Inc.",
          "CellStar Corp.",
          "Cendant Corp",
          "Cenex Harvest States Cooperatives",
          "Centex Corp.",
          "CenturyTel Inc.",
          "Ceridian Corp.",
          "CH2M Hill Cos. Ltd.",
          "Champion Enterprises Inc.",
          "Charles Schwab Corp.",
          "Charming Shoppes Inc.",
          "Charter Communications Inc.",
          "Charter One Financial Inc.",
          "ChevronTexaco Corp.",
          "Chiquita Brands International Inc.",
          "Chubb Corp",
          "Ciena Corp.",
          "Cigna Corp",
          "Cincinnati Financial Corp.",
          "Cinergy Corp.",
          "Cintas Corp.",
          "Circuit City Stores Inc.",
          "Cisco Systems Inc.",
          "Citigroup, Inc",
          "Citizens Communications Co.",
          "CKE Restaurants Inc.",
          "Clear Channel Communications Inc.",
          "The Clorox Co.",
          "CMGI Inc.",
          "CMS Energy Corp.",
          "CNF Inc.",
          "Coca-Cola Co.",
          "Coca-Cola Enterprises Inc.",
          "Colgate-Palmolive Co.",
          "Collins & Aikman Corp.",
          "Comcast Corp.",
          "Comdisco Inc.",
          "Comerica Inc.",
          "Comfort Systems USA Inc.",
          "Commercial Metals Co.",
          "Community Health Systems Inc.",
          "Compass Bancshares Inc",
          "Computer Associates International Inc.",
          "Computer Sciences Corp.",
          "Compuware Corp.",
          "Comverse Technology Inc.",
          "ConAgra Foods Inc.",
          "Concord EFS Inc.",
          "Conectiv, Inc",
          "Conoco Inc",
          "Conseco Inc.",
          "Consolidated Freightways Corp.",
          "Consolidated Edison Inc.",
          "Constellation Brands Inc.",
          "Constellation Emergy Group Inc.",
          "Continental Airlines Inc.",
          "Convergys Corp.",
          "Cooper Cameron Corp.",
          "Cooper Industries Ltd.",
          "Cooper Tire & Rubber Co.",
          "Corn Products International Inc.",
          "Corning Inc.",
          "Costco Wholesale Corp.",
          "Countrywide Credit Industries Inc.",
          "Coventry Health Care Inc.",
          "Cox Communications Inc.",
          "Crane Co.",
          "Crompton Corp.",
          "Crown Cork & Seal Co. Inc.",
          "CSK Auto Corp.",
          "CSX Corp.",
          "Cummins Inc.",
          "CVS Corp.",
          "Cytec Industries Inc.",
          "D&K Healthcare Resources, Inc.",
          "D.R. Horton Inc.",
          "Dana Corporation",
          "Danaher Corporation",
          "Darden Restaurants Inc.",
          "DaVita Inc.",
          "Dean Foods Company",
          "Deere & Company",
          "Del Monte Foods Co",
          "Dell Computer Corporation",
          "Delphi Corp.",
          "Delta Air Lines Inc.",
          "Deluxe Corporation",
          "Devon Energy Corporation",
          "Di Giorgio Corporation",
          "Dial Corporation",
          "Diebold Incorporated",
          "Dillard's Inc.",
          "DIMON Incorporated",
          "Dole Food Company, Inc.",
          "Dollar General Corporation",
          "Dollar Tree Stores, Inc.",
          "Dominion Resources, Inc.",
          "Domino's Pizza LLC",
          "Dover Corporation, Inc.",
          "Dow Chemical Company",
          "Dow Jones & Company, Inc.",
          "DPL Inc.",
          "DQE Inc.",
          "Dreyer's Grand Ice Cream, Inc.",
          "DST Systems, Inc.",
          "DTE Energy Co.",
          "E.I. Du Pont de Nemours and Company",
          "Duke Energy Corp",
          "Dun & Bradstreet Inc.",
          "DURA Automotive Systems Inc.",
          "DynCorp",
          "Dynegy Inc.",
          "E*Trade Group, Inc.",
          "E.W. Scripps Company",
          "Earthlink, Inc.",
          "Eastman Chemical Company",
          "Eastman Kodak Company",
          "Eaton Corporation",
          "Echostar Communications Corporation",
          "Ecolab Inc.",
          "Edison International",
          "EGL Inc.",
          "El Paso Corporation",
          "Electronic Arts Inc.",
          "Electronic Data Systems Corp.",
          "Eli Lilly and Company",
          "EMC Corporation",
          "Emcor Group Inc.",
          "Emerson Electric Co.",
          "Encompass Services Corporation",
          "Energizer Holdings Inc.",
          "Energy East Corporation",
          "Engelhard Corporation",
          "Enron Corp.",
          "Entergy Corporation",
          "Enterprise Products Partners L.P.",
          "EOG Resources, Inc.",
          "Equifax Inc.",
          "Equitable Resources Inc.",
          "Equity Office Properties Trust",
          "Equity Residential Properties Trust",
          "Estee Lauder Companies Inc.",
          "Exelon Corporation",
          "Exide Technologies",
          "Expeditors International of Washington Inc.",
          "Express Scripts Inc.",
          "ExxonMobil Corporation",
          "Fairchild Semiconductor International Inc.",
          "Family Dollar Stores Inc.",
          "Farmland Industries Inc.",
          "Federal Mogul Corp.",
          "Federated Department Stores Inc.",
          "Federal Express Corp.",
          "Felcor Lodging Trust Inc.",
          "Ferro Corp.",
          "Fidelity National Financial Inc.",
          "Fifth Third Bancorp",
          "First American Financial Corp.",
          "First Data Corp.",
          "First National of Nebraska Inc.",
          "First Tennessee National Corp.",
          "FirstEnergy Corp.",
          "Fiserv Inc.",
          "Fisher Scientific International Inc.",
          "FleetBoston Financial Co.",
          "Fleetwood Enterprises Inc.",
          "Fleming Companies Inc.",
          "Flowers Foods Inc.",
          "Flowserv Corp",
          "Fluor Corp",
          "FMC Corp",
          "Foamex International Inc",
          "Foot Locker Inc",
          "Footstar Inc.",
          "Ford Motor Co",
          "Forest Laboratories Inc.",
          "Fortune Brands Inc.",
          "Foster Wheeler Ltd.",
          "FPL Group Inc.",
          "Franklin Resources Inc.",
          "Freeport McMoran Copper & Gold Inc.",
          "Frontier Oil Corp",
          "Furniture Brands International Inc.",
          "Gannett Co., Inc.",
          "Gap Inc.",
          "Gateway Inc.",
          "GATX Corporation",
          "Gemstar-TV Guide International Inc.",
          "GenCorp Inc.",
          "General Cable Corporation",
          "General Dynamics Corporation",
          "General Electric Company",
          "General Mills Inc",
          "General Motors Corporation",
          "Genesis Health Ventures Inc.",
          "Gentek Inc.",
          "Gentiva Health Services Inc.",
          "Genuine Parts Company",
          "Genuity Inc.",
          "Genzyme Corporation",
          "Georgia Gulf Corporation",
          "Georgia-Pacific Corporation",
          "Gillette Company",
          "Gold Kist Inc.",
          "Golden State Bancorp Inc.",
          "Golden West Financial Corporation",
          "Goldman Sachs Group Inc.",
          "Goodrich Corporation",
          "The Goodyear Tire & Rubber Company",
          "Granite Construction Incorporated",
          "Graybar Electric Company Inc.",
          "Great Lakes Chemical Corporation",
          "Great Plains Energy Inc.",
          "GreenPoint Financial Corp.",
          "Greif Bros. Corporation",
          "Grey Global Group Inc.",
          "Group 1 Automotive Inc.",
          "Guidant Corporation",
          "H&R Block Inc.",
          "H.B. Fuller Company",
          "H.J. Heinz Company",
          "Halliburton Co.",
          "Harley-Davidson Inc.",
          "Harman International Industries Inc.",
          "Harrah's Entertainment Inc.",
          "Harris Corp.",
          "Harsco Corp.",
          "Hartford Financial Services Group Inc.",
          "Hasbro Inc.",
          "Hawaiian Electric Industries Inc.",
          "HCA Inc.",
          "Health Management Associates Inc.",
          "Health Net Inc.",
          "Healthsouth Corp",
          "Henry Schein Inc.",
          "Hercules Inc.",
          "Herman Miller Inc.",
          "Hershey Foods Corp.",
          "Hewlett-Packard Company",
          "Hibernia Corp.",
          "Hillenbrand Industries Inc.",
          "Hilton Hotels Corp.",
          "Hollywood Entertainment Corp.",
          "Home Depot Inc.",
          "Hon Industries Inc.",
          "Honeywell International Inc.",
          "Hormel Foods Corp.",
          "Host Marriott Corp.",
          "Household International Corp.",
          "Hovnanian Enterprises Inc.",
          "Hub Group Inc.",
          "Hubbell Inc.",
          "Hughes Supply Inc.",
          "Humana Inc.",
          "Huntington Bancshares Inc.",
          "Idacorp Inc.",
          "IDT Corporation",
          "IKON Office Solutions Inc.",
          "Illinois Tool Works Inc.",
          "IMC Global Inc.",
          "Imperial Sugar Company",
          "IMS Health Inc.",
          "Ingles Market Inc",
          "Ingram Micro Inc.",
          "Insight Enterprises Inc.",
          "Integrated Electrical Services Inc.",
          "Intel Corporation",
          "International Paper Co.",
          "Interpublic Group of Companies Inc.",
          "Interstate Bakeries Corporation",
          "International Business Machines Corp.",
          "International Flavors & Fragrances Inc.",
          "International Multifoods Corporation",
          "Intuit Inc.",
          "IT Group Inc.",
          "ITT Industries Inc.",
          "Ivax Corp.",
          "J.B. Hunt Transport Services Inc.",
          "J.C. Penny Co.",
          "J.P. Morgan Chase & Co.",
          "Jabil Circuit Inc.",
          "Jack In The Box Inc.",
          "Jacobs Engineering Group Inc.",
          "JDS Uniphase Corp.",
          "Jefferson-Pilot Co.",
          "John Hancock Financial Services Inc.",
          "Johnson & Johnson",
          "Johnson Controls Inc.",
          "Jones Apparel Group Inc.",
          "KB Home",
          "Kellogg Company",
          "Kellwood Company",
          "Kelly Services Inc.",
          "Kemet Corp.",
          "Kennametal Inc.",
          "Kerr-McGee Corporation",
          "KeyCorp",
          "KeySpan Corp.",
          "Kimball International Inc.",
          "Kimberly-Clark Corporation",
          "Kindred Healthcare Inc.",
          "KLA-Tencor Corporation",
          "K-Mart Corp.",
          "Knight-Ridder Inc.",
          "Kohl's Corp.",
          "KPMG Consulting Inc.",
          "Kroger Co.",
          "L-3 Communications Holdings Inc.",
          "Laboratory Corporation of America Holdings",
          "Lam Research Corporation",
          "LandAmerica Financial Group Inc.",
          "Lands' End Inc.",
          "Landstar System Inc.",
          "La-Z-Boy Inc.",
          "Lear Corporation",
          "Legg Mason Inc.",
          "Leggett & Platt Inc.",
          "Lehman Brothers Holdings Inc.",
          "Lennar Corporation",
          "Lennox International Inc.",
          "Level 3 Communications Inc.",
          "Levi Strauss & Co.",
          "Lexmark International Inc.",
          "Limited Inc.",
          "Lincoln National Corporation",
          "Linens 'n Things Inc.",
          "Lithia Motors Inc.",
          "Liz Claiborne Inc.",
          "Lockheed Martin Corporation",
          "Loews Corporation",
          "Longs Drug Stores Corporation",
          "Louisiana-Pacific Corporation",
          "Lowe's Companies Inc.",
          "LSI Logic Corporation",
          "The LTV Corporation",
          "The Lubrizol Corporation",
          "Lucent Technologies Inc.",
          "Lyondell Chemical Company",
          "M & T Bank Corporation",
          "Magellan Health Services Inc.",
          "Mail-Well Inc.",
          "Mandalay Resort Group",
          "Manor Care Inc.",
          "Manpower Inc.",
          "Marathon Oil Corporation",
          "Mariner Health Care Inc.",
          "Markel Corporation",
          "Marriott International Inc.",
          "Marsh & McLennan Companies Inc.",
          "Marsh Supermarkets Inc.",
          "Marshall & Ilsley Corporation",
          "Martin Marietta Materials Inc.",
          "Masco Corporation",
          "Massey Energy Company",
          "MasTec Inc.",
          "Mattel Inc.",
          "Maxim Integrated Products Inc.",
          "Maxtor Corporation",
          "Maxxam Inc.",
          "The May Department Stores Company",
          "Maytag Corporation",
          "MBNA Corporation",
          "McCormick & Company Incorporated",
          "McDonald's Corporation",
          "The McGraw-Hill Companies Inc.",
          "McKesson Corporation",
          "McLeodUSA Incorporated",
          "M.D.C. Holdings Inc.",
          "MDU Resources Group Inc.",
          "MeadWestvaco Corporation",
          "Medtronic Inc.",
          "Mellon Financial Corporation",
          "The Men's Wearhouse Inc.",
          "Merck & Co., Inc.",
          "Mercury General Corporation",
          "Merrill Lynch & Co. Inc.",
          "Metaldyne Corporation",
          "Metals USA Inc.",
          "MetLife Inc.",
          "Metris Companies Inc",
          "MGIC Investment Corporation",
          "MGM Mirage",
          "Michaels Stores Inc.",
          "Micron Technology Inc.",
          "Microsoft Corporation",
          "Milacron Inc.",
          "Millennium Chemicals Inc.",
          "Mirant Corporation",
          "Mohawk Industries Inc.",
          "Molex Incorporated",
          "The MONY Group Inc.",
          "Morgan Stanley Dean Witter & Co.",
          "Motorola Inc.",
          "MPS Group Inc.",
          "Murphy Oil Corporation",
          "Nabors Industries Inc",
          "Nacco Industries Inc",
          "Nash Finch Company",
          "National City Corp.",
          "National Commerce Financial Corporation",
          "National Fuel Gas Company",
          "National Oilwell Inc",
          "National Rural Utilities Cooperative Finance Corporation",
          "National Semiconductor Corporation",
          "National Service Industries Inc",
          "Navistar International Corporation",
          "NCR Corporation",
          "The Neiman Marcus Group Inc.",
          "New Jersey Resources Corporation",
          "New York Times Company",
          "Newell Rubbermaid Inc",
          "Newmont Mining Corporation",
          "Nextel Communications Inc",
          "Nicor Inc",
          "Nike Inc",
          "NiSource Inc",
          "Noble Energy Inc",
          "Nordstrom Inc",
          "Norfolk Southern Corporation",
          "Nortek Inc",
          "North Fork Bancorporation Inc",
          "Northeast Utilities System",
          "Northern Trust Corporation",
          "Northrop Grumman Corporation",
          "NorthWestern Corporation",
          "Novellus Systems Inc",
          "NSTAR",
          "NTL Incorporated",
          "Nucor Corp",
          "Nvidia Corp",
          "NVR Inc",
          "Northwest Airlines Corp",
          "Occidental Petroleum Corp",
          "Ocean Energy Inc",
          "Office Depot Inc.",
          "OfficeMax Inc",
          "OGE Energy Corp",
          "Oglethorpe Power Corp.",
          "Ohio Casualty Corp.",
          "Old Republic International Corp.",
          "Olin Corp.",
          "OM Group Inc",
          "Omnicare Inc",
          "Omnicom Group",
          "On Semiconductor Corp",
          "ONEOK Inc",
          "Oracle Corp",
          "Oshkosh Truck Corp",
          "Outback Steakhouse Inc.",
          "Owens & Minor Inc.",
          "Owens Corning",
          "Owens-Illinois Inc",
          "Oxford Health Plans Inc",
          "Paccar Inc",
          "PacifiCare Health Systems Inc",
          "Packaging Corp. of America",
          "Pactiv Corp",
          "Pall Corp",
          "Pantry Inc",
          "Park Place Entertainment Corp",
          "Parker Hannifin Corp.",
          "Pathmark Stores Inc.",
          "Paychex Inc",
          "Payless Shoesource Inc",
          "Penn Traffic Co.",
          "Pennzoil-Quaker State Company",
          "Pentair Inc",
          "Peoples Energy Corp.",
          "PeopleSoft Inc",
          "Pep Boys Manny, Moe & Jack",
          "Potomac Electric Power Co.",
          "Pepsi Bottling Group Inc.",
          "PepsiAmericas Inc.",
          "PepsiCo Inc.",
          "Performance Food Group Co.",
          "Perini Corp",
          "PerkinElmer Inc",
          "Perot Systems Corp",
          "Petco Animal Supplies Inc.",
          "Peter Kiewit Sons', Inc.",
          "PETsMART Inc",
          "Pfizer Inc",
          "Pacific Gas & Electric Corp.",
          "Pharmacia Corp",
          "Phar Mor Inc.",
          "Phelps Dodge Corp.",
          "Philip Morris Companies Inc.",
          "Phillips Petroleum Co",
          "Phillips Van Heusen Corp.",
          "Phoenix Companies Inc",
          "Pier 1 Imports Inc.",
          "Pilgrim's Pride Corporation",
          "Pinnacle West Capital Corp",
          "Pioneer-Standard Electronics Inc.",
          "Pitney Bowes Inc.",
          "Pittston Brinks Group",
          "Plains All American Pipeline LP",
          "PNC Financial Services Group Inc.",
          "PNM Resources Inc",
          "Polaris Industries Inc.",
          "Polo Ralph Lauren Corp",
          "PolyOne Corp",
          "Popular Inc",
          "Potlatch Corp",
          "PPG Industries Inc",
          "PPL Corp",
          "Praxair Inc",
          "Precision Castparts Corp",
          "Premcor Inc.",
          "Pride International Inc",
          "Primedia Inc",
          "Principal Financial Group Inc.",
          "Procter & Gamble Co.",
          "Pro-Fac Cooperative Inc.",
          "Progress Energy Inc",
          "Progressive Corporation",
          "Protective Life Corp",
          "Provident Financial Group",
          "Providian Financial Corp.",
          "Prudential Financial Inc.",
          "PSS World Medical Inc",
          "Public Service Enterprise Group Inc.",
          "Publix Super Markets Inc.",
          "Puget Energy Inc.",
          "Pulte Homes Inc",
          "Qualcomm Inc",
          "Quanta Services Inc.",
          "Quantum Corp",
          "Quest Diagnostics Inc.",
          "Questar Corp",
          "Quintiles Transnational",
          "Qwest Communications Intl Inc",
          "R.J. Reynolds Tobacco Company",
          "R.R. Donnelley & Sons Company",
          "Radio Shack Corporation",
          "Raymond James Financial Inc.",
          "Raytheon Company",
          "Reader's Digest Association Inc.",
          "Reebok International Ltd.",
          "Regions Financial Corp.",
          "Regis Corporation",
          "Reliance Steel & Aluminum Co.",
          "Reliant Energy Inc.",
          "Rent A Center Inc",
          "Republic Services Inc",
          "Revlon Inc",
          "RGS Energy Group Inc",
          "Rite Aid Corp",
          "Riverwood Holding Inc.",
          "RoadwayCorp",
          "Robert Half International Inc.",
          "Rock-Tenn Co",
          "Rockwell Automation Inc",
          "Rockwell Collins Inc",
          "Rohm & Haas Co.",
          "Ross Stores Inc",
          "RPM Inc.",
          "Ruddick Corp",
          "Ryder System Inc",
          "Ryerson Tull Inc",
          "Ryland Group Inc.",
          "Sabre Holdings Corp",
          "Safeco Corp",
          "Safeguard Scientifics Inc.",
          "Safeway Inc",
          "Saks Inc",
          "Sanmina-SCI Inc",
          "Sara Lee Corp",
          "SBC Communications Inc",
          "Scana Corp.",
          "Schering-Plough Corp",
          "Scholastic Corp",
          "SCI Systems Onc.",
          "Science Applications Intl. Inc.",
          "Scientific-Atlanta Inc",
          "Scotts Company",
          "Seaboard Corp",
          "Sealed Air Corp",
          "Sears Roebuck & Co",
          "Sempra Energy",
          "Sequa Corp",
          "Service Corp. International",
          "ServiceMaster Co",
          "Shaw Group Inc",
          "Sherwin-Williams Company",
          "Shopko Stores Inc",
          "Siebel Systems Inc",
          "Sierra Health Services Inc",
          "Sierra Pacific Resources",
          "Silgan Holdings Inc.",
          "Silicon Graphics Inc",
          "Simon Property Group Inc",
          "SLM Corporation",
          "Smith International Inc",
          "Smithfield Foods Inc",
          "Smurfit-Stone Container Corp",
          "Snap-On Inc",
          "Solectron Corp",
          "Solutia Inc",
          "Sonic Automotive Inc.",
          "Sonoco Products Co.",
          "Southern Company",
          "Southern Union Company",
          "SouthTrust Corp.",
          "Southwest Airlines Co",
          "Southwest Gas Corp",
          "Sovereign Bancorp Inc.",
          "Spartan Stores Inc",
          "Spherion Corp",
          "Sports Authority Inc",
          "Sprint Corp.",
          "SPX Corp",
          "St. Jude Medical Inc",
          "St. Paul Cos.",
          "Staff Leasing Inc.",
          "StanCorp Financial Group Inc",
          "Standard Pacific Corp.",
          "Stanley Works",
          "Staples Inc",
          "Starbucks Corp",
          "Starwood Hotels & Resorts Worldwide Inc",
          "State Street Corp.",
          "Stater Bros. Holdings Inc.",
          "Steelcase Inc",
          "Stein Mart Inc",
          "Stewart & Stevenson Services Inc",
          "Stewart Information Services Corp",
          "Stilwell Financial Inc",
          "Storage Technology Corporation",
          "Stryker Corp",
          "Sun Healthcare Group Inc.",
          "Sun Microsystems Inc.",
          "SunGard Data Systems Inc.",
          "Sunoco Inc.",
          "SunTrust Banks Inc",
          "Supervalu Inc",
          "Swift Transportation, Co., Inc",
          "Symbol Technologies Inc",
          "Synovus Financial Corp.",
          "Sysco Corp",
          "Systemax Inc.",
          "Target Corp.",
          "Tech Data Corporation",
          "TECO Energy Inc",
          "Tecumseh Products Company",
          "Tektronix Inc",
          "Teleflex Incorporated",
          "Telephone & Data Systems Inc",
          "Tellabs Inc.",
          "Temple-Inland Inc",
          "Tenet Healthcare Corporation",
          "Tenneco Automotive Inc.",
          "Teradyne Inc",
          "Terex Corp",
          "Tesoro Petroleum Corp.",
          "Texas Industries Inc.",
          "Texas Instruments Incorporated",
          "Textron Inc",
          "Thermo Electron Corporation",
          "Thomas & Betts Corporation",
          "Tiffany & Co",
          "Timken Company",
          "TJX Companies Inc",
          "TMP Worldwide Inc",
          "Toll Brothers Inc",
          "Torchmark Corporation",
          "Toro Company",
          "Tower Automotive Inc.",
          "Toys 'R' Us Inc",
          "Trans World Entertainment Corp.",
          "TransMontaigne Inc",
          "Transocean Inc",
          "TravelCenters of America Inc.",
          "Triad Hospitals Inc",
          "Tribune Company",
          "Trigon Healthcare Inc.",
          "Trinity Industries Inc",
          "Trump Hotels & Casino Resorts Inc.",
          "TruServ Corporation",
          "TRW Inc",
          "TXU Corp",
          "Tyson Foods Inc",
          "U.S. Bancorp",
          "U.S. Industries Inc.",
          "UAL Corporation",
          "UGI Corporation",
          "Unified Western Grocers Inc",
          "Union Pacific Corporation",
          "Union Planters Corp",
          "Unisource Energy Corp",
          "Unisys Corporation",
          "United Auto Group Inc",
          "United Defense Industries Inc.",
          "United Parcel Service Inc",
          "United Rentals Inc",
          "United Stationers Inc",
          "United Technologies Corporation",
          "UnitedHealth Group Incorporated",
          "Unitrin Inc",
          "Universal Corporation",
          "Universal Forest Products Inc",
          "Universal Health Services Inc",
          "Unocal Corporation",
          "Unova Inc",
          "UnumProvident Corporation",
          "URS Corporation",
          "US Airways Group Inc",
          "US Oncology Inc",
          "USA Interactive",
          "USFreighways Corporation",
          "USG Corporation",
          "UST Inc",
          "Valero Energy Corporation",
          "Valspar Corporation",
          "Value City Department Stores Inc",
          "Varco International Inc",
          "Vectren Corporation",
          "Veritas Software Corporation",
          "Verizon Communications Inc",
          "VF Corporation",
          "Viacom Inc",
          "Viad Corp",
          "Viasystems Group Inc",
          "Vishay Intertechnology Inc",
          "Visteon Corporation",
          "Volt Information Sciences Inc",
          "Vulcan Materials Company",
          "W.R. Berkley Corporation",
          "W.R. Grace & Co",
          "W.W. Grainger Inc",
          "Wachovia Corporation",
          "Wakenhut Corporation",
          "Walgreen Co",
          "Wallace Computer Services Inc",
          "Wal-Mart Stores Inc",
          "Walt Disney Co",
          "Walter Industries Inc",
          "Washington Mutual Inc",
          "Washington Post Co.",
          "Waste Management Inc",
          "Watsco Inc",
          "Weatherford International Inc",
          "Weis Markets Inc.",
          "Wellpoint Health Networks Inc",
          "Wells Fargo & Company",
          "Wendy's International Inc",
          "Werner Enterprises Inc",
          "WESCO International Inc",
          "Western Digital Inc",
          "Western Gas Resources Inc",
          "WestPoint Stevens Inc",
          "Weyerhauser Company",
          "WGL Holdings Inc",
          "Whirlpool Corporation",
          "Whole Foods Market Inc",
          "Willamette Industries Inc.",
          "Williams Companies Inc",
          "Williams Sonoma Inc",
          "Winn Dixie Stores Inc",
          "Wisconsin Energy Corporation",
          "Wm Wrigley Jr Company",
          "World Fuel Services Corporation",
          "WorldCom Inc",
          "Worthington Industries Inc",
          "WPS Resources Corporation",
          "Wyeth",
          "Wyndham International Inc",
          "Xcel Energy Inc",
          "Xerox Corp",
          "Xilinx Inc",
          "XO Communications Inc",
          "Yellow Corporation",
          "York International Corp",
          "Yum Brands Inc.",
          "Zale Corporation",
          "Zions Bancorporation"
        ],
        fileExtension: {
          raster: ["bmp", "gif", "gpl", "ico", "jpeg", "psd", "png", "psp", "raw", "tiff"],
          vector: ["3dv", "amf", "awg", "ai", "cgm", "cdr", "cmx", "dxf", "e2d", "egt", "eps", "fs", "odg", "svg", "xar"],
          "3d": ["3dmf", "3dm", "3mf", "3ds", "an8", "aoi", "blend", "cal3d", "cob", "ctm", "iob", "jas", "max", "mb", "mdx", "obj", "x", "x3d"],
          document: ["doc", "docx", "dot", "html", "xml", "odt", "odm", "ott", "csv", "rtf", "tex", "xhtml", "xps"]
        },
        // Data taken from https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
        timezones: [
          {
            name: "Dateline Standard Time",
            abbr: "DST",
            offset: -12,
            isdst: !1,
            text: "(UTC-12:00) International Date Line West",
            utc: [
              "Etc/GMT+12"
            ]
          },
          {
            name: "UTC-11",
            abbr: "U",
            offset: -11,
            isdst: !1,
            text: "(UTC-11:00) Coordinated Universal Time-11",
            utc: [
              "Etc/GMT+11",
              "Pacific/Midway",
              "Pacific/Niue",
              "Pacific/Pago_Pago"
            ]
          },
          {
            name: "Hawaiian Standard Time",
            abbr: "HST",
            offset: -10,
            isdst: !1,
            text: "(UTC-10:00) Hawaii",
            utc: [
              "Etc/GMT+10",
              "Pacific/Honolulu",
              "Pacific/Johnston",
              "Pacific/Rarotonga",
              "Pacific/Tahiti"
            ]
          },
          {
            name: "Alaskan Standard Time",
            abbr: "AKDT",
            offset: -8,
            isdst: !0,
            text: "(UTC-09:00) Alaska",
            utc: [
              "America/Anchorage",
              "America/Juneau",
              "America/Nome",
              "America/Sitka",
              "America/Yakutat"
            ]
          },
          {
            name: "Pacific Standard Time (Mexico)",
            abbr: "PDT",
            offset: -7,
            isdst: !0,
            text: "(UTC-08:00) Baja California",
            utc: [
              "America/Santa_Isabel"
            ]
          },
          {
            name: "Pacific Daylight Time",
            abbr: "PDT",
            offset: -7,
            isdst: !0,
            text: "(UTC-07:00) Pacific Time (US & Canada)",
            utc: [
              "America/Dawson",
              "America/Los_Angeles",
              "America/Tijuana",
              "America/Vancouver",
              "America/Whitehorse"
            ]
          },
          {
            name: "Pacific Standard Time",
            abbr: "PST",
            offset: -8,
            isdst: !1,
            text: "(UTC-08:00) Pacific Time (US & Canada)",
            utc: [
              "America/Dawson",
              "America/Los_Angeles",
              "America/Tijuana",
              "America/Vancouver",
              "America/Whitehorse",
              "PST8PDT"
            ]
          },
          {
            name: "US Mountain Standard Time",
            abbr: "UMST",
            offset: -7,
            isdst: !1,
            text: "(UTC-07:00) Arizona",
            utc: [
              "America/Creston",
              "America/Dawson_Creek",
              "America/Hermosillo",
              "America/Phoenix",
              "Etc/GMT+7"
            ]
          },
          {
            name: "Mountain Standard Time (Mexico)",
            abbr: "MDT",
            offset: -6,
            isdst: !0,
            text: "(UTC-07:00) Chihuahua, La Paz, Mazatlan",
            utc: [
              "America/Chihuahua",
              "America/Mazatlan"
            ]
          },
          {
            name: "Mountain Standard Time",
            abbr: "MDT",
            offset: -6,
            isdst: !0,
            text: "(UTC-07:00) Mountain Time (US & Canada)",
            utc: [
              "America/Boise",
              "America/Cambridge_Bay",
              "America/Denver",
              "America/Edmonton",
              "America/Inuvik",
              "America/Ojinaga",
              "America/Yellowknife",
              "MST7MDT"
            ]
          },
          {
            name: "Central America Standard Time",
            abbr: "CAST",
            offset: -6,
            isdst: !1,
            text: "(UTC-06:00) Central America",
            utc: [
              "America/Belize",
              "America/Costa_Rica",
              "America/El_Salvador",
              "America/Guatemala",
              "America/Managua",
              "America/Tegucigalpa",
              "Etc/GMT+6",
              "Pacific/Galapagos"
            ]
          },
          {
            name: "Central Standard Time",
            abbr: "CDT",
            offset: -5,
            isdst: !0,
            text: "(UTC-06:00) Central Time (US & Canada)",
            utc: [
              "America/Chicago",
              "America/Indiana/Knox",
              "America/Indiana/Tell_City",
              "America/Matamoros",
              "America/Menominee",
              "America/North_Dakota/Beulah",
              "America/North_Dakota/Center",
              "America/North_Dakota/New_Salem",
              "America/Rainy_River",
              "America/Rankin_Inlet",
              "America/Resolute",
              "America/Winnipeg",
              "CST6CDT"
            ]
          },
          {
            name: "Central Standard Time (Mexico)",
            abbr: "CDT",
            offset: -5,
            isdst: !0,
            text: "(UTC-06:00) Guadalajara, Mexico City, Monterrey",
            utc: [
              "America/Bahia_Banderas",
              "America/Cancun",
              "America/Merida",
              "America/Mexico_City",
              "America/Monterrey"
            ]
          },
          {
            name: "Canada Central Standard Time",
            abbr: "CCST",
            offset: -6,
            isdst: !1,
            text: "(UTC-06:00) Saskatchewan",
            utc: [
              "America/Regina",
              "America/Swift_Current"
            ]
          },
          {
            name: "SA Pacific Standard Time",
            abbr: "SPST",
            offset: -5,
            isdst: !1,
            text: "(UTC-05:00) Bogota, Lima, Quito",
            utc: [
              "America/Bogota",
              "America/Cayman",
              "America/Coral_Harbour",
              "America/Eirunepe",
              "America/Guayaquil",
              "America/Jamaica",
              "America/Lima",
              "America/Panama",
              "America/Rio_Branco",
              "Etc/GMT+5"
            ]
          },
          {
            name: "Eastern Standard Time",
            abbr: "EDT",
            offset: -4,
            isdst: !0,
            text: "(UTC-05:00) Eastern Time (US & Canada)",
            utc: [
              "America/Detroit",
              "America/Havana",
              "America/Indiana/Petersburg",
              "America/Indiana/Vincennes",
              "America/Indiana/Winamac",
              "America/Iqaluit",
              "America/Kentucky/Monticello",
              "America/Louisville",
              "America/Montreal",
              "America/Nassau",
              "America/New_York",
              "America/Nipigon",
              "America/Pangnirtung",
              "America/Port-au-Prince",
              "America/Thunder_Bay",
              "America/Toronto",
              "EST5EDT"
            ]
          },
          {
            name: "US Eastern Standard Time",
            abbr: "UEDT",
            offset: -4,
            isdst: !0,
            text: "(UTC-05:00) Indiana (East)",
            utc: [
              "America/Indiana/Marengo",
              "America/Indiana/Vevay",
              "America/Indianapolis"
            ]
          },
          {
            name: "Venezuela Standard Time",
            abbr: "VST",
            offset: -4.5,
            isdst: !1,
            text: "(UTC-04:30) Caracas",
            utc: [
              "America/Caracas"
            ]
          },
          {
            name: "Paraguay Standard Time",
            abbr: "PYT",
            offset: -4,
            isdst: !1,
            text: "(UTC-04:00) Asuncion",
            utc: [
              "America/Asuncion"
            ]
          },
          {
            name: "Atlantic Standard Time",
            abbr: "ADT",
            offset: -3,
            isdst: !0,
            text: "(UTC-04:00) Atlantic Time (Canada)",
            utc: [
              "America/Glace_Bay",
              "America/Goose_Bay",
              "America/Halifax",
              "America/Moncton",
              "America/Thule",
              "Atlantic/Bermuda"
            ]
          },
          {
            name: "Central Brazilian Standard Time",
            abbr: "CBST",
            offset: -4,
            isdst: !1,
            text: "(UTC-04:00) Cuiaba",
            utc: [
              "America/Campo_Grande",
              "America/Cuiaba"
            ]
          },
          {
            name: "SA Western Standard Time",
            abbr: "SWST",
            offset: -4,
            isdst: !1,
            text: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan",
            utc: [
              "America/Anguilla",
              "America/Antigua",
              "America/Aruba",
              "America/Barbados",
              "America/Blanc-Sablon",
              "America/Boa_Vista",
              "America/Curacao",
              "America/Dominica",
              "America/Grand_Turk",
              "America/Grenada",
              "America/Guadeloupe",
              "America/Guyana",
              "America/Kralendijk",
              "America/La_Paz",
              "America/Lower_Princes",
              "America/Manaus",
              "America/Marigot",
              "America/Martinique",
              "America/Montserrat",
              "America/Port_of_Spain",
              "America/Porto_Velho",
              "America/Puerto_Rico",
              "America/Santo_Domingo",
              "America/St_Barthelemy",
              "America/St_Kitts",
              "America/St_Lucia",
              "America/St_Thomas",
              "America/St_Vincent",
              "America/Tortola",
              "Etc/GMT+4"
            ]
          },
          {
            name: "Pacific SA Standard Time",
            abbr: "PSST",
            offset: -4,
            isdst: !1,
            text: "(UTC-04:00) Santiago",
            utc: [
              "America/Santiago",
              "Antarctica/Palmer"
            ]
          },
          {
            name: "Newfoundland Standard Time",
            abbr: "NDT",
            offset: -2.5,
            isdst: !0,
            text: "(UTC-03:30) Newfoundland",
            utc: [
              "America/St_Johns"
            ]
          },
          {
            name: "E. South America Standard Time",
            abbr: "ESAST",
            offset: -3,
            isdst: !1,
            text: "(UTC-03:00) Brasilia",
            utc: [
              "America/Sao_Paulo"
            ]
          },
          {
            name: "Argentina Standard Time",
            abbr: "AST",
            offset: -3,
            isdst: !1,
            text: "(UTC-03:00) Buenos Aires",
            utc: [
              "America/Argentina/La_Rioja",
              "America/Argentina/Rio_Gallegos",
              "America/Argentina/Salta",
              "America/Argentina/San_Juan",
              "America/Argentina/San_Luis",
              "America/Argentina/Tucuman",
              "America/Argentina/Ushuaia",
              "America/Buenos_Aires",
              "America/Catamarca",
              "America/Cordoba",
              "America/Jujuy",
              "America/Mendoza"
            ]
          },
          {
            name: "SA Eastern Standard Time",
            abbr: "SEST",
            offset: -3,
            isdst: !1,
            text: "(UTC-03:00) Cayenne, Fortaleza",
            utc: [
              "America/Araguaina",
              "America/Belem",
              "America/Cayenne",
              "America/Fortaleza",
              "America/Maceio",
              "America/Paramaribo",
              "America/Recife",
              "America/Santarem",
              "Antarctica/Rothera",
              "Atlantic/Stanley",
              "Etc/GMT+3"
            ]
          },
          {
            name: "Greenland Standard Time",
            abbr: "GDT",
            offset: -3,
            isdst: !0,
            text: "(UTC-03:00) Greenland",
            utc: [
              "America/Godthab"
            ]
          },
          {
            name: "Montevideo Standard Time",
            abbr: "MST",
            offset: -3,
            isdst: !1,
            text: "(UTC-03:00) Montevideo",
            utc: [
              "America/Montevideo"
            ]
          },
          {
            name: "Bahia Standard Time",
            abbr: "BST",
            offset: -3,
            isdst: !1,
            text: "(UTC-03:00) Salvador",
            utc: [
              "America/Bahia"
            ]
          },
          {
            name: "UTC-02",
            abbr: "U",
            offset: -2,
            isdst: !1,
            text: "(UTC-02:00) Coordinated Universal Time-02",
            utc: [
              "America/Noronha",
              "Atlantic/South_Georgia",
              "Etc/GMT+2"
            ]
          },
          {
            name: "Mid-Atlantic Standard Time",
            abbr: "MDT",
            offset: -1,
            isdst: !0,
            text: "(UTC-02:00) Mid-Atlantic - Old",
            utc: []
          },
          {
            name: "Azores Standard Time",
            abbr: "ADT",
            offset: 0,
            isdst: !0,
            text: "(UTC-01:00) Azores",
            utc: [
              "America/Scoresbysund",
              "Atlantic/Azores"
            ]
          },
          {
            name: "Cape Verde Standard Time",
            abbr: "CVST",
            offset: -1,
            isdst: !1,
            text: "(UTC-01:00) Cape Verde Is.",
            utc: [
              "Atlantic/Cape_Verde",
              "Etc/GMT+1"
            ]
          },
          {
            name: "Morocco Standard Time",
            abbr: "MDT",
            offset: 1,
            isdst: !0,
            text: "(UTC) Casablanca",
            utc: [
              "Africa/Casablanca",
              "Africa/El_Aaiun"
            ]
          },
          {
            name: "UTC",
            abbr: "UTC",
            offset: 0,
            isdst: !1,
            text: "(UTC) Coordinated Universal Time",
            utc: [
              "America/Danmarkshavn",
              "Etc/GMT"
            ]
          },
          {
            name: "GMT Standard Time",
            abbr: "GMT",
            offset: 0,
            isdst: !1,
            text: "(UTC) Edinburgh, London",
            utc: [
              "Europe/Isle_of_Man",
              "Europe/Guernsey",
              "Europe/Jersey",
              "Europe/London"
            ]
          },
          {
            name: "British Summer Time",
            abbr: "BST",
            offset: 1,
            isdst: !0,
            text: "(UTC+01:00) Edinburgh, London",
            utc: [
              "Europe/Isle_of_Man",
              "Europe/Guernsey",
              "Europe/Jersey",
              "Europe/London"
            ]
          },
          {
            name: "GMT Standard Time",
            abbr: "GDT",
            offset: 1,
            isdst: !0,
            text: "(UTC) Dublin, Lisbon",
            utc: [
              "Atlantic/Canary",
              "Atlantic/Faeroe",
              "Atlantic/Madeira",
              "Europe/Dublin",
              "Europe/Lisbon"
            ]
          },
          {
            name: "Greenwich Standard Time",
            abbr: "GST",
            offset: 0,
            isdst: !1,
            text: "(UTC) Monrovia, Reykjavik",
            utc: [
              "Africa/Abidjan",
              "Africa/Accra",
              "Africa/Bamako",
              "Africa/Banjul",
              "Africa/Bissau",
              "Africa/Conakry",
              "Africa/Dakar",
              "Africa/Freetown",
              "Africa/Lome",
              "Africa/Monrovia",
              "Africa/Nouakchott",
              "Africa/Ouagadougou",
              "Africa/Sao_Tome",
              "Atlantic/Reykjavik",
              "Atlantic/St_Helena"
            ]
          },
          {
            name: "W. Europe Standard Time",
            abbr: "WEDT",
            offset: 2,
            isdst: !0,
            text: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna",
            utc: [
              "Arctic/Longyearbyen",
              "Europe/Amsterdam",
              "Europe/Andorra",
              "Europe/Berlin",
              "Europe/Busingen",
              "Europe/Gibraltar",
              "Europe/Luxembourg",
              "Europe/Malta",
              "Europe/Monaco",
              "Europe/Oslo",
              "Europe/Rome",
              "Europe/San_Marino",
              "Europe/Stockholm",
              "Europe/Vaduz",
              "Europe/Vatican",
              "Europe/Vienna",
              "Europe/Zurich"
            ]
          },
          {
            name: "Central Europe Standard Time",
            abbr: "CEDT",
            offset: 2,
            isdst: !0,
            text: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague",
            utc: [
              "Europe/Belgrade",
              "Europe/Bratislava",
              "Europe/Budapest",
              "Europe/Ljubljana",
              "Europe/Podgorica",
              "Europe/Prague",
              "Europe/Tirane"
            ]
          },
          {
            name: "Romance Standard Time",
            abbr: "RDT",
            offset: 2,
            isdst: !0,
            text: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris",
            utc: [
              "Africa/Ceuta",
              "Europe/Brussels",
              "Europe/Copenhagen",
              "Europe/Madrid",
              "Europe/Paris"
            ]
          },
          {
            name: "Central European Standard Time",
            abbr: "CEDT",
            offset: 2,
            isdst: !0,
            text: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb",
            utc: [
              "Europe/Sarajevo",
              "Europe/Skopje",
              "Europe/Warsaw",
              "Europe/Zagreb"
            ]
          },
          {
            name: "W. Central Africa Standard Time",
            abbr: "WCAST",
            offset: 1,
            isdst: !1,
            text: "(UTC+01:00) West Central Africa",
            utc: [
              "Africa/Algiers",
              "Africa/Bangui",
              "Africa/Brazzaville",
              "Africa/Douala",
              "Africa/Kinshasa",
              "Africa/Lagos",
              "Africa/Libreville",
              "Africa/Luanda",
              "Africa/Malabo",
              "Africa/Ndjamena",
              "Africa/Niamey",
              "Africa/Porto-Novo",
              "Africa/Tunis",
              "Etc/GMT-1"
            ]
          },
          {
            name: "Namibia Standard Time",
            abbr: "NST",
            offset: 1,
            isdst: !1,
            text: "(UTC+01:00) Windhoek",
            utc: [
              "Africa/Windhoek"
            ]
          },
          {
            name: "GTB Standard Time",
            abbr: "GDT",
            offset: 3,
            isdst: !0,
            text: "(UTC+02:00) Athens, Bucharest",
            utc: [
              "Asia/Nicosia",
              "Europe/Athens",
              "Europe/Bucharest",
              "Europe/Chisinau"
            ]
          },
          {
            name: "Middle East Standard Time",
            abbr: "MEDT",
            offset: 3,
            isdst: !0,
            text: "(UTC+02:00) Beirut",
            utc: [
              "Asia/Beirut"
            ]
          },
          {
            name: "Egypt Standard Time",
            abbr: "EST",
            offset: 2,
            isdst: !1,
            text: "(UTC+02:00) Cairo",
            utc: [
              "Africa/Cairo"
            ]
          },
          {
            name: "Syria Standard Time",
            abbr: "SDT",
            offset: 3,
            isdst: !0,
            text: "(UTC+02:00) Damascus",
            utc: [
              "Asia/Damascus"
            ]
          },
          {
            name: "E. Europe Standard Time",
            abbr: "EEDT",
            offset: 3,
            isdst: !0,
            text: "(UTC+02:00) E. Europe",
            utc: [
              "Asia/Nicosia",
              "Europe/Athens",
              "Europe/Bucharest",
              "Europe/Chisinau",
              "Europe/Helsinki",
              "Europe/Kiev",
              "Europe/Mariehamn",
              "Europe/Nicosia",
              "Europe/Riga",
              "Europe/Sofia",
              "Europe/Tallinn",
              "Europe/Uzhgorod",
              "Europe/Vilnius",
              "Europe/Zaporozhye"
            ]
          },
          {
            name: "South Africa Standard Time",
            abbr: "SAST",
            offset: 2,
            isdst: !1,
            text: "(UTC+02:00) Harare, Pretoria",
            utc: [
              "Africa/Blantyre",
              "Africa/Bujumbura",
              "Africa/Gaborone",
              "Africa/Harare",
              "Africa/Johannesburg",
              "Africa/Kigali",
              "Africa/Lubumbashi",
              "Africa/Lusaka",
              "Africa/Maputo",
              "Africa/Maseru",
              "Africa/Mbabane",
              "Etc/GMT-2"
            ]
          },
          {
            name: "FLE Standard Time",
            abbr: "FDT",
            offset: 3,
            isdst: !0,
            text: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius",
            utc: [
              "Europe/Helsinki",
              "Europe/Kiev",
              "Europe/Mariehamn",
              "Europe/Riga",
              "Europe/Sofia",
              "Europe/Tallinn",
              "Europe/Uzhgorod",
              "Europe/Vilnius",
              "Europe/Zaporozhye"
            ]
          },
          {
            name: "Turkey Standard Time",
            abbr: "TDT",
            offset: 3,
            isdst: !1,
            text: "(UTC+03:00) Istanbul",
            utc: [
              "Europe/Istanbul"
            ]
          },
          {
            name: "Israel Standard Time",
            abbr: "JDT",
            offset: 3,
            isdst: !0,
            text: "(UTC+02:00) Jerusalem",
            utc: [
              "Asia/Jerusalem"
            ]
          },
          {
            name: "Libya Standard Time",
            abbr: "LST",
            offset: 2,
            isdst: !1,
            text: "(UTC+02:00) Tripoli",
            utc: [
              "Africa/Tripoli"
            ]
          },
          {
            name: "Jordan Standard Time",
            abbr: "JST",
            offset: 3,
            isdst: !1,
            text: "(UTC+03:00) Amman",
            utc: [
              "Asia/Amman"
            ]
          },
          {
            name: "Arabic Standard Time",
            abbr: "AST",
            offset: 3,
            isdst: !1,
            text: "(UTC+03:00) Baghdad",
            utc: [
              "Asia/Baghdad"
            ]
          },
          {
            name: "Kaliningrad Standard Time",
            abbr: "KST",
            offset: 3,
            isdst: !1,
            text: "(UTC+02:00) Kaliningrad",
            utc: [
              "Europe/Kaliningrad"
            ]
          },
          {
            name: "Arab Standard Time",
            abbr: "AST",
            offset: 3,
            isdst: !1,
            text: "(UTC+03:00) Kuwait, Riyadh",
            utc: [
              "Asia/Aden",
              "Asia/Bahrain",
              "Asia/Kuwait",
              "Asia/Qatar",
              "Asia/Riyadh"
            ]
          },
          {
            name: "E. Africa Standard Time",
            abbr: "EAST",
            offset: 3,
            isdst: !1,
            text: "(UTC+03:00) Nairobi",
            utc: [
              "Africa/Addis_Ababa",
              "Africa/Asmera",
              "Africa/Dar_es_Salaam",
              "Africa/Djibouti",
              "Africa/Juba",
              "Africa/Kampala",
              "Africa/Khartoum",
              "Africa/Mogadishu",
              "Africa/Nairobi",
              "Antarctica/Syowa",
              "Etc/GMT-3",
              "Indian/Antananarivo",
              "Indian/Comoro",
              "Indian/Mayotte"
            ]
          },
          {
            name: "Moscow Standard Time",
            abbr: "MSK",
            offset: 3,
            isdst: !1,
            text: "(UTC+03:00) Moscow, St. Petersburg, Volgograd, Minsk",
            utc: [
              "Europe/Kirov",
              "Europe/Moscow",
              "Europe/Simferopol",
              "Europe/Volgograd",
              "Europe/Minsk"
            ]
          },
          {
            name: "Samara Time",
            abbr: "SAMT",
            offset: 4,
            isdst: !1,
            text: "(UTC+04:00) Samara, Ulyanovsk, Saratov",
            utc: [
              "Europe/Astrakhan",
              "Europe/Samara",
              "Europe/Ulyanovsk"
            ]
          },
          {
            name: "Iran Standard Time",
            abbr: "IDT",
            offset: 4.5,
            isdst: !0,
            text: "(UTC+03:30) Tehran",
            utc: [
              "Asia/Tehran"
            ]
          },
          {
            name: "Arabian Standard Time",
            abbr: "AST",
            offset: 4,
            isdst: !1,
            text: "(UTC+04:00) Abu Dhabi, Muscat",
            utc: [
              "Asia/Dubai",
              "Asia/Muscat",
              "Etc/GMT-4"
            ]
          },
          {
            name: "Azerbaijan Standard Time",
            abbr: "ADT",
            offset: 5,
            isdst: !0,
            text: "(UTC+04:00) Baku",
            utc: [
              "Asia/Baku"
            ]
          },
          {
            name: "Mauritius Standard Time",
            abbr: "MST",
            offset: 4,
            isdst: !1,
            text: "(UTC+04:00) Port Louis",
            utc: [
              "Indian/Mahe",
              "Indian/Mauritius",
              "Indian/Reunion"
            ]
          },
          {
            name: "Georgian Standard Time",
            abbr: "GET",
            offset: 4,
            isdst: !1,
            text: "(UTC+04:00) Tbilisi",
            utc: [
              "Asia/Tbilisi"
            ]
          },
          {
            name: "Caucasus Standard Time",
            abbr: "CST",
            offset: 4,
            isdst: !1,
            text: "(UTC+04:00) Yerevan",
            utc: [
              "Asia/Yerevan"
            ]
          },
          {
            name: "Afghanistan Standard Time",
            abbr: "AST",
            offset: 4.5,
            isdst: !1,
            text: "(UTC+04:30) Kabul",
            utc: [
              "Asia/Kabul"
            ]
          },
          {
            name: "West Asia Standard Time",
            abbr: "WAST",
            offset: 5,
            isdst: !1,
            text: "(UTC+05:00) Ashgabat, Tashkent",
            utc: [
              "Antarctica/Mawson",
              "Asia/Aqtau",
              "Asia/Aqtobe",
              "Asia/Ashgabat",
              "Asia/Dushanbe",
              "Asia/Oral",
              "Asia/Samarkand",
              "Asia/Tashkent",
              "Etc/GMT-5",
              "Indian/Kerguelen",
              "Indian/Maldives"
            ]
          },
          {
            name: "Yekaterinburg Time",
            abbr: "YEKT",
            offset: 5,
            isdst: !1,
            text: "(UTC+05:00) Yekaterinburg",
            utc: [
              "Asia/Yekaterinburg"
            ]
          },
          {
            name: "Pakistan Standard Time",
            abbr: "PKT",
            offset: 5,
            isdst: !1,
            text: "(UTC+05:00) Islamabad, Karachi",
            utc: [
              "Asia/Karachi"
            ]
          },
          {
            name: "India Standard Time",
            abbr: "IST",
            offset: 5.5,
            isdst: !1,
            text: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
            utc: [
              "Asia/Kolkata"
            ]
          },
          {
            name: "Sri Lanka Standard Time",
            abbr: "SLST",
            offset: 5.5,
            isdst: !1,
            text: "(UTC+05:30) Sri Jayawardenepura",
            utc: [
              "Asia/Colombo"
            ]
          },
          {
            name: "Nepal Standard Time",
            abbr: "NST",
            offset: 5.75,
            isdst: !1,
            text: "(UTC+05:45) Kathmandu",
            utc: [
              "Asia/Kathmandu"
            ]
          },
          {
            name: "Central Asia Standard Time",
            abbr: "CAST",
            offset: 6,
            isdst: !1,
            text: "(UTC+06:00) Nur-Sultan (Astana)",
            utc: [
              "Antarctica/Vostok",
              "Asia/Almaty",
              "Asia/Bishkek",
              "Asia/Qyzylorda",
              "Asia/Urumqi",
              "Etc/GMT-6",
              "Indian/Chagos"
            ]
          },
          {
            name: "Bangladesh Standard Time",
            abbr: "BST",
            offset: 6,
            isdst: !1,
            text: "(UTC+06:00) Dhaka",
            utc: [
              "Asia/Dhaka",
              "Asia/Thimphu"
            ]
          },
          {
            name: "Myanmar Standard Time",
            abbr: "MST",
            offset: 6.5,
            isdst: !1,
            text: "(UTC+06:30) Yangon (Rangoon)",
            utc: [
              "Asia/Rangoon",
              "Indian/Cocos"
            ]
          },
          {
            name: "SE Asia Standard Time",
            abbr: "SAST",
            offset: 7,
            isdst: !1,
            text: "(UTC+07:00) Bangkok, Hanoi, Jakarta",
            utc: [
              "Antarctica/Davis",
              "Asia/Bangkok",
              "Asia/Hovd",
              "Asia/Jakarta",
              "Asia/Phnom_Penh",
              "Asia/Pontianak",
              "Asia/Saigon",
              "Asia/Vientiane",
              "Etc/GMT-7",
              "Indian/Christmas"
            ]
          },
          {
            name: "N. Central Asia Standard Time",
            abbr: "NCAST",
            offset: 7,
            isdst: !1,
            text: "(UTC+07:00) Novosibirsk",
            utc: [
              "Asia/Novokuznetsk",
              "Asia/Novosibirsk",
              "Asia/Omsk"
            ]
          },
          {
            name: "China Standard Time",
            abbr: "CST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi",
            utc: [
              "Asia/Hong_Kong",
              "Asia/Macau",
              "Asia/Shanghai"
            ]
          },
          {
            name: "North Asia Standard Time",
            abbr: "NAST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Krasnoyarsk",
            utc: [
              "Asia/Krasnoyarsk"
            ]
          },
          {
            name: "Singapore Standard Time",
            abbr: "MPST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Kuala Lumpur, Singapore",
            utc: [
              "Asia/Brunei",
              "Asia/Kuala_Lumpur",
              "Asia/Kuching",
              "Asia/Makassar",
              "Asia/Manila",
              "Asia/Singapore",
              "Etc/GMT-8"
            ]
          },
          {
            name: "W. Australia Standard Time",
            abbr: "WAST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Perth",
            utc: [
              "Antarctica/Casey",
              "Australia/Perth"
            ]
          },
          {
            name: "Taipei Standard Time",
            abbr: "TST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Taipei",
            utc: [
              "Asia/Taipei"
            ]
          },
          {
            name: "Ulaanbaatar Standard Time",
            abbr: "UST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Ulaanbaatar",
            utc: [
              "Asia/Choibalsan",
              "Asia/Ulaanbaatar"
            ]
          },
          {
            name: "North Asia East Standard Time",
            abbr: "NAEST",
            offset: 8,
            isdst: !1,
            text: "(UTC+08:00) Irkutsk",
            utc: [
              "Asia/Irkutsk"
            ]
          },
          {
            name: "Japan Standard Time",
            abbr: "JST",
            offset: 9,
            isdst: !1,
            text: "(UTC+09:00) Osaka, Sapporo, Tokyo",
            utc: [
              "Asia/Dili",
              "Asia/Jayapura",
              "Asia/Tokyo",
              "Etc/GMT-9",
              "Pacific/Palau"
            ]
          },
          {
            name: "Korea Standard Time",
            abbr: "KST",
            offset: 9,
            isdst: !1,
            text: "(UTC+09:00) Seoul",
            utc: [
              "Asia/Pyongyang",
              "Asia/Seoul"
            ]
          },
          {
            name: "Cen. Australia Standard Time",
            abbr: "CAST",
            offset: 9.5,
            isdst: !1,
            text: "(UTC+09:30) Adelaide",
            utc: [
              "Australia/Adelaide",
              "Australia/Broken_Hill"
            ]
          },
          {
            name: "AUS Central Standard Time",
            abbr: "ACST",
            offset: 9.5,
            isdst: !1,
            text: "(UTC+09:30) Darwin",
            utc: [
              "Australia/Darwin"
            ]
          },
          {
            name: "E. Australia Standard Time",
            abbr: "EAST",
            offset: 10,
            isdst: !1,
            text: "(UTC+10:00) Brisbane",
            utc: [
              "Australia/Brisbane",
              "Australia/Lindeman"
            ]
          },
          {
            name: "AUS Eastern Standard Time",
            abbr: "AEST",
            offset: 10,
            isdst: !1,
            text: "(UTC+10:00) Canberra, Melbourne, Sydney",
            utc: [
              "Australia/Melbourne",
              "Australia/Sydney"
            ]
          },
          {
            name: "West Pacific Standard Time",
            abbr: "WPST",
            offset: 10,
            isdst: !1,
            text: "(UTC+10:00) Guam, Port Moresby",
            utc: [
              "Antarctica/DumontDUrville",
              "Etc/GMT-10",
              "Pacific/Guam",
              "Pacific/Port_Moresby",
              "Pacific/Saipan",
              "Pacific/Truk"
            ]
          },
          {
            name: "Tasmania Standard Time",
            abbr: "TST",
            offset: 10,
            isdst: !1,
            text: "(UTC+10:00) Hobart",
            utc: [
              "Australia/Currie",
              "Australia/Hobart"
            ]
          },
          {
            name: "Yakutsk Standard Time",
            abbr: "YST",
            offset: 9,
            isdst: !1,
            text: "(UTC+09:00) Yakutsk",
            utc: [
              "Asia/Chita",
              "Asia/Khandyga",
              "Asia/Yakutsk"
            ]
          },
          {
            name: "Central Pacific Standard Time",
            abbr: "CPST",
            offset: 11,
            isdst: !1,
            text: "(UTC+11:00) Solomon Is., New Caledonia",
            utc: [
              "Antarctica/Macquarie",
              "Etc/GMT-11",
              "Pacific/Efate",
              "Pacific/Guadalcanal",
              "Pacific/Kosrae",
              "Pacific/Noumea",
              "Pacific/Ponape"
            ]
          },
          {
            name: "Vladivostok Standard Time",
            abbr: "VST",
            offset: 11,
            isdst: !1,
            text: "(UTC+11:00) Vladivostok",
            utc: [
              "Asia/Sakhalin",
              "Asia/Ust-Nera",
              "Asia/Vladivostok"
            ]
          },
          {
            name: "New Zealand Standard Time",
            abbr: "NZST",
            offset: 12,
            isdst: !1,
            text: "(UTC+12:00) Auckland, Wellington",
            utc: [
              "Antarctica/McMurdo",
              "Pacific/Auckland"
            ]
          },
          {
            name: "UTC+12",
            abbr: "U",
            offset: 12,
            isdst: !1,
            text: "(UTC+12:00) Coordinated Universal Time+12",
            utc: [
              "Etc/GMT-12",
              "Pacific/Funafuti",
              "Pacific/Kwajalein",
              "Pacific/Majuro",
              "Pacific/Nauru",
              "Pacific/Tarawa",
              "Pacific/Wake",
              "Pacific/Wallis"
            ]
          },
          {
            name: "Fiji Standard Time",
            abbr: "FST",
            offset: 12,
            isdst: !1,
            text: "(UTC+12:00) Fiji",
            utc: [
              "Pacific/Fiji"
            ]
          },
          {
            name: "Magadan Standard Time",
            abbr: "MST",
            offset: 12,
            isdst: !1,
            text: "(UTC+12:00) Magadan",
            utc: [
              "Asia/Anadyr",
              "Asia/Kamchatka",
              "Asia/Magadan",
              "Asia/Srednekolymsk"
            ]
          },
          {
            name: "Kamchatka Standard Time",
            abbr: "KDT",
            offset: 13,
            isdst: !0,
            text: "(UTC+12:00) Petropavlovsk-Kamchatsky - Old",
            utc: [
              "Asia/Kamchatka"
            ]
          },
          {
            name: "Tonga Standard Time",
            abbr: "TST",
            offset: 13,
            isdst: !1,
            text: "(UTC+13:00) Nuku'alofa",
            utc: [
              "Etc/GMT-13",
              "Pacific/Enderbury",
              "Pacific/Fakaofo",
              "Pacific/Tongatapu"
            ]
          },
          {
            name: "Samoa Standard Time",
            abbr: "SST",
            offset: 13,
            isdst: !1,
            text: "(UTC+13:00) Samoa",
            utc: [
              "Pacific/Apia"
            ]
          }
        ],
        //List source: http://answers.google.com/answers/threadview/id/589312.html
        profession: [
          "Airline Pilot",
          "Academic Team",
          "Accountant",
          "Account Executive",
          "Actor",
          "Actuary",
          "Acquisition Analyst",
          "Administrative Asst.",
          "Administrative Analyst",
          "Administrator",
          "Advertising Director",
          "Aerospace Engineer",
          "Agent",
          "Agricultural Inspector",
          "Agricultural Scientist",
          "Air Traffic Controller",
          "Animal Trainer",
          "Anthropologist",
          "Appraiser",
          "Architect",
          "Art Director",
          "Artist",
          "Astronomer",
          "Athletic Coach",
          "Auditor",
          "Author",
          "Baker",
          "Banker",
          "Bankruptcy Attorney",
          "Benefits Manager",
          "Biologist",
          "Bio-feedback Specialist",
          "Biomedical Engineer",
          "Biotechnical Researcher",
          "Broadcaster",
          "Broker",
          "Building Manager",
          "Building Contractor",
          "Building Inspector",
          "Business Analyst",
          "Business Planner",
          "Business Manager",
          "Buyer",
          "Call Center Manager",
          "Career Counselor",
          "Cash Manager",
          "Ceramic Engineer",
          "Chief Executive Officer",
          "Chief Operation Officer",
          "Chef",
          "Chemical Engineer",
          "Chemist",
          "Child Care Manager",
          "Chief Medical Officer",
          "Chiropractor",
          "Cinematographer",
          "City Housing Manager",
          "City Manager",
          "Civil Engineer",
          "Claims Manager",
          "Clinical Research Assistant",
          "Collections Manager",
          "Compliance Manager",
          "Comptroller",
          "Computer Manager",
          "Commercial Artist",
          "Communications Affairs Director",
          "Communications Director",
          "Communications Engineer",
          "Compensation Analyst",
          "Computer Programmer",
          "Computer Ops. Manager",
          "Computer Engineer",
          "Computer Operator",
          "Computer Graphics Specialist",
          "Construction Engineer",
          "Construction Manager",
          "Consultant",
          "Consumer Relations Manager",
          "Contract Administrator",
          "Copyright Attorney",
          "Copywriter",
          "Corporate Planner",
          "Corrections Officer",
          "Cosmetologist",
          "Credit Analyst",
          "Cruise Director",
          "Chief Information Officer",
          "Chief Technology Officer",
          "Customer Service Manager",
          "Cryptologist",
          "Dancer",
          "Data Security Manager",
          "Database Manager",
          "Day Care Instructor",
          "Dentist",
          "Designer",
          "Design Engineer",
          "Desktop Publisher",
          "Developer",
          "Development Officer",
          "Diamond Merchant",
          "Dietitian",
          "Direct Marketer",
          "Director",
          "Distribution Manager",
          "Diversity Manager",
          "Economist",
          "EEO Compliance Manager",
          "Editor",
          "Education Adminator",
          "Electrical Engineer",
          "Electro Optical Engineer",
          "Electronics Engineer",
          "Embassy Management",
          "Employment Agent",
          "Engineer Technician",
          "Entrepreneur",
          "Environmental Analyst",
          "Environmental Attorney",
          "Environmental Engineer",
          "Environmental Specialist",
          "Escrow Officer",
          "Estimator",
          "Executive Assistant",
          "Executive Director",
          "Executive Recruiter",
          "Facilities Manager",
          "Family Counselor",
          "Fashion Events Manager",
          "Fashion Merchandiser",
          "Fast Food Manager",
          "Film Producer",
          "Film Production Assistant",
          "Financial Analyst",
          "Financial Planner",
          "Financier",
          "Fine Artist",
          "Wildlife Specialist",
          "Fitness Consultant",
          "Flight Attendant",
          "Flight Engineer",
          "Floral Designer",
          "Food & Beverage Director",
          "Food Service Manager",
          "Forestry Technician",
          "Franchise Management",
          "Franchise Sales",
          "Fraud Investigator",
          "Freelance Writer",
          "Fund Raiser",
          "General Manager",
          "Geologist",
          "General Counsel",
          "Geriatric Specialist",
          "Gerontologist",
          "Glamour Photographer",
          "Golf Club Manager",
          "Gourmet Chef",
          "Graphic Designer",
          "Grounds Keeper",
          "Hazardous Waste Manager",
          "Health Care Manager",
          "Health Therapist",
          "Health Service Administrator",
          "Hearing Officer",
          "Home Economist",
          "Horticulturist",
          "Hospital Administrator",
          "Hotel Manager",
          "Human Resources Manager",
          "Importer",
          "Industrial Designer",
          "Industrial Engineer",
          "Information Director",
          "Inside Sales",
          "Insurance Adjuster",
          "Interior Decorator",
          "Internal Controls Director",
          "International Acct.",
          "International Courier",
          "International Lawyer",
          "Interpreter",
          "Investigator",
          "Investment Banker",
          "Investment Manager",
          "IT Architect",
          "IT Project Manager",
          "IT Systems Analyst",
          "Jeweler",
          "Joint Venture Manager",
          "Journalist",
          "Labor Negotiator",
          "Labor Organizer",
          "Labor Relations Manager",
          "Lab Services Director",
          "Lab Technician",
          "Land Developer",
          "Landscape Architect",
          "Law Enforcement Officer",
          "Lawyer",
          "Lead Software Engineer",
          "Lead Software Test Engineer",
          "Leasing Manager",
          "Legal Secretary",
          "Library Manager",
          "Litigation Attorney",
          "Loan Officer",
          "Lobbyist",
          "Logistics Manager",
          "Maintenance Manager",
          "Management Consultant",
          "Managed Care Director",
          "Managing Partner",
          "Manufacturing Director",
          "Manpower Planner",
          "Marine Biologist",
          "Market Res. Analyst",
          "Marketing Director",
          "Materials Manager",
          "Mathematician",
          "Membership Chairman",
          "Mechanic",
          "Mechanical Engineer",
          "Media Buyer",
          "Medical Investor",
          "Medical Secretary",
          "Medical Technician",
          "Mental Health Counselor",
          "Merchandiser",
          "Metallurgical Engineering",
          "Meteorologist",
          "Microbiologist",
          "MIS Manager",
          "Motion Picture Director",
          "Multimedia Director",
          "Musician",
          "Network Administrator",
          "Network Specialist",
          "Network Operator",
          "New Product Manager",
          "Novelist",
          "Nuclear Engineer",
          "Nuclear Specialist",
          "Nutritionist",
          "Nursing Administrator",
          "Occupational Therapist",
          "Oceanographer",
          "Office Manager",
          "Operations Manager",
          "Operations Research Director",
          "Optical Technician",
          "Optometrist",
          "Organizational Development Manager",
          "Outplacement Specialist",
          "Paralegal",
          "Park Ranger",
          "Patent Attorney",
          "Payroll Specialist",
          "Personnel Specialist",
          "Petroleum Engineer",
          "Pharmacist",
          "Photographer",
          "Physical Therapist",
          "Physician",
          "Physician Assistant",
          "Physicist",
          "Planning Director",
          "Podiatrist",
          "Political Analyst",
          "Political Scientist",
          "Politician",
          "Portfolio Manager",
          "Preschool Management",
          "Preschool Teacher",
          "Principal",
          "Private Banker",
          "Private Investigator",
          "Probation Officer",
          "Process Engineer",
          "Producer",
          "Product Manager",
          "Product Engineer",
          "Production Engineer",
          "Production Planner",
          "Professional Athlete",
          "Professional Coach",
          "Professor",
          "Project Engineer",
          "Project Manager",
          "Program Manager",
          "Property Manager",
          "Public Administrator",
          "Public Safety Director",
          "PR Specialist",
          "Publisher",
          "Purchasing Agent",
          "Publishing Director",
          "Quality Assurance Specialist",
          "Quality Control Engineer",
          "Quality Control Inspector",
          "Radiology Manager",
          "Railroad Engineer",
          "Real Estate Broker",
          "Recreational Director",
          "Recruiter",
          "Redevelopment Specialist",
          "Regulatory Affairs Manager",
          "Registered Nurse",
          "Rehabilitation Counselor",
          "Relocation Manager",
          "Reporter",
          "Research Specialist",
          "Restaurant Manager",
          "Retail Store Manager",
          "Risk Analyst",
          "Safety Engineer",
          "Sales Engineer",
          "Sales Trainer",
          "Sales Promotion Manager",
          "Sales Representative",
          "Sales Manager",
          "Service Manager",
          "Sanitation Engineer",
          "Scientific Programmer",
          "Scientific Writer",
          "Securities Analyst",
          "Security Consultant",
          "Security Director",
          "Seminar Presenter",
          "Ship's Officer",
          "Singer",
          "Social Director",
          "Social Program Planner",
          "Social Research",
          "Social Scientist",
          "Social Worker",
          "Sociologist",
          "Software Developer",
          "Software Engineer",
          "Software Test Engineer",
          "Soil Scientist",
          "Special Events Manager",
          "Special Education Teacher",
          "Special Projects Director",
          "Speech Pathologist",
          "Speech Writer",
          "Sports Event Manager",
          "Statistician",
          "Store Manager",
          "Strategic Alliance Director",
          "Strategic Planning Director",
          "Stress Reduction Specialist",
          "Stockbroker",
          "Surveyor",
          "Structural Engineer",
          "Superintendent",
          "Supply Chain Director",
          "System Engineer",
          "Systems Analyst",
          "Systems Programmer",
          "System Administrator",
          "Tax Specialist",
          "Teacher",
          "Technical Support Specialist",
          "Technical Illustrator",
          "Technical Writer",
          "Technology Director",
          "Telecom Analyst",
          "Telemarketer",
          "Theatrical Director",
          "Title Examiner",
          "Tour Escort",
          "Tour Guide Director",
          "Traffic Manager",
          "Trainer Translator",
          "Transportation Manager",
          "Travel Agent",
          "Treasurer",
          "TV Programmer",
          "Underwriter",
          "Union Representative",
          "University Administrator",
          "University Dean",
          "Urban Planner",
          "Veterinarian",
          "Vendor Relations Director",
          "Viticulturist",
          "Warehouse Manager"
        ],
        animals: {
          //list of ocean animals comes from https://owlcation.com/stem/list-of-ocean-animals
          ocean: ["Acantharea", "Anemone", "Angelfish King", "Ahi Tuna", "Albacore", "American Oyster", "Anchovy", "Armored Snail", "Arctic Char", "Atlantic Bluefin Tuna", "Atlantic Cod", "Atlantic Goliath Grouper", "Atlantic Trumpetfish", "Atlantic Wolffish", "Baleen Whale", "Banded Butterflyfish", "Banded Coral Shrimp", "Banded Sea Krait", "Barnacle", "Barndoor Skate", "Barracuda", "Basking Shark", "Bass", "Beluga Whale", "Bluebanded Goby", "Bluehead Wrasse", "Bluefish", "Bluestreak Cleaner-Wrasse", "Blue Marlin", "Blue Shark", "Blue Spiny Lobster", "Blue Tang", "Blue Whale", "Broadclub Cuttlefish", "Bull Shark", "Chambered Nautilus", "Chilean Basket Star", "Chilean Jack Mackerel", "Chinook Salmon", "Christmas Tree Worm", "Clam", "Clown Anemonefish", "Clown Triggerfish", "Cod", "Coelacanth", "Cockscomb Cup Coral", "Common Fangtooth", "Conch", "Cookiecutter Shark", "Copepod", "Coral", "Corydoras", "Cownose Ray", "Crab", "Crown-of-Thorns Starfish", "Cushion Star", "Cuttlefish", "California Sea Otters", "Dolphin", "Dolphinfish", "Dory", "Devil Fish", "Dugong", "Dumbo Octopus", "Dungeness Crab", "Eccentric Sand Dollar", "Edible Sea Cucumber", "Eel", "Elephant Seal", "Elkhorn Coral", "Emperor Shrimp", "Estuarine Crocodile", "Fathead Sculpin", "Fiddler Crab", "Fin Whale", "Flameback", "Flamingo Tongue Snail", "Flashlight Fish", "Flatback Turtle", "Flatfish", "Flying Fish", "Flounder", "Fluke", "French Angelfish", "Frilled Shark", "Fugu (also called Pufferfish)", "Gar", "Geoduck", "Giant Barrel Sponge", "Giant Caribbean Sea Anemone", "Giant Clam", "Giant Isopod", "Giant Kingfish", "Giant Oarfish", "Giant Pacific Octopus", "Giant Pyrosome", "Giant Sea Star", "Giant Squid", "Glowing Sucker Octopus", "Giant Tube Worm", "Goblin Shark", "Goosefish", "Great White Shark", "Greenland Shark", "Grey Atlantic Seal", "Grouper", "Grunion", "Guineafowl Puffer", "Haddock", "Hake", "Halibut", "Hammerhead Shark", "Hapuka", "Harbor Porpoise", "Harbor Seal", "Hatchetfish", "Hawaiian Monk Seal", "Hawksbill Turtle", "Hector's Dolphin", "Hermit Crab", "Herring", "Hoki", "Horn Shark", "Horseshoe Crab", "Humpback Anglerfish", "Humpback Whale", "Icefish", "Imperator Angelfish", "Irukandji Jellyfish", "Isopod", "Ivory Bush Coral", "Japanese Spider Crab", "Jellyfish", "John Dory", "Juan Fernandez Fur Seal", "Killer Whale", "Kiwa Hirsuta", "Krill", "Lagoon Triggerfish", "Lamprey", "Leafy Seadragon", "Leopard Seal", "Limpet", "Ling", "Lionfish", "Lions Mane Jellyfish", "Lobe Coral", "Lobster", "Loggerhead Turtle", "Longnose Sawshark", "Longsnout Seahorse", "Lophelia Coral", "Marrus Orthocanna", "Manatee", "Manta Ray", "Marlin", "Megamouth Shark", "Mexican Lookdown", "Mimic Octopus", "Moon Jelly", "Mollusk", "Monkfish", "Moray Eel", "Mullet", "Mussel", "Megaladon", "Napoleon Wrasse", "Nassau Grouper", "Narwhal", "Nautilus", "Needlefish", "Northern Seahorse", "North Atlantic Right Whale", "Northern Red Snapper", "Norway Lobster", "Nudibranch", "Nurse Shark", "Oarfish", "Ocean Sunfish", "Oceanic Whitetip Shark", "Octopus", "Olive Sea Snake", "Orange Roughy", "Ostracod", "Otter", "Oyster", "Pacific Angelshark", "Pacific Blackdragon", "Pacific Halibut", "Pacific Sardine", "Pacific Sea Nettle Jellyfish", "Pacific White Sided Dolphin", "Pantropical Spotted Dolphin", "Patagonian Toothfish", "Peacock Mantis Shrimp", "Pelagic Thresher Shark", "Penguin", "Peruvian Anchoveta", "Pilchard", "Pink Salmon", "Pinniped", "Plankton", "Porpoise", "Polar Bear", "Portuguese Man o' War", "Pycnogonid Sea Spider", "Quahog", "Queen Angelfish", "Queen Conch", "Queen Parrotfish", "Queensland Grouper", "Ragfish", "Ratfish", "Rattail Fish", "Ray", "Red Drum", "Red King Crab", "Ringed Seal", "Risso's Dolphin", "Ross Seals", "Sablefish", "Salmon", "Sand Dollar", "Sandbar Shark", "Sawfish", "Sarcastic Fringehead", "Scalloped Hammerhead Shark", "Seahorse", "Sea Cucumber", "Sea Lion", "Sea Urchin", "Seal", "Shark", "Shortfin Mako Shark", "Shovelnose Guitarfish", "Shrimp", "Silverside Fish", "Skipjack Tuna", "Slender Snipe Eel", "Smalltooth Sawfish", "Smelts", "Sockeye Salmon", "Southern Stingray", "Sponge", "Spotted Porcupinefish", "Spotted Dolphin", "Spotted Eagle Ray", "Spotted Moray", "Squid", "Squidworm", "Starfish", "Stickleback", "Stonefish", "Stoplight Loosejaw", "Sturgeon", "Swordfish", "Tan Bristlemouth", "Tasseled Wobbegong", "Terrible Claw Lobster", "Threespot Damselfish", "Tiger Prawn", "Tiger Shark", "Tilefish", "Toadfish", "Tropical Two-Wing Flyfish", "Tuna", "Umbrella Squid", "Velvet Crab", "Venus Flytrap Sea Anemone", "Vigtorniella Worm", "Viperfish", "Vampire Squid", "Vaquita", "Wahoo", "Walrus", "West Indian Manatee", "Whale", "Whale Shark", "Whiptail Gulper", "White-Beaked Dolphin", "White-Ring Garden Eel", "White Shrimp", "Wobbegong", "Wrasse", "Wreckfish", "Xiphosura", "Yellowtail Damselfish", "Yelloweye Rockfish", "Yellow Cup Black Coral", "Yellow Tube Sponge", "Yellowfin Tuna", "Zebrashark", "Zooplankton"],
          //list of desert, grassland, and forest animals comes from http://www.skyenimals.com/
          desert: ["Aardwolf", "Addax", "African Wild Ass", "Ant", "Antelope", "Armadillo", "Baboon", "Badger", "Bat", "Bearded Dragon", "Beetle", "Bird", "Black-footed Cat", "Boa", "Brown Bear", "Bustard", "Butterfly", "Camel", "Caracal", "Caracara", "Caterpillar", "Centipede", "Cheetah", "Chipmunk", "Chuckwalla", "Climbing Mouse", "Coati", "Cobra", "Cotton Rat", "Cougar", "Courser", "Crane Fly", "Crow", "Dassie Rat", "Dove", "Dunnart", "Eagle", "Echidna", "Elephant", "Emu", "Falcon", "Fly", "Fox", "Frogmouth", "Gecko", "Geoffroy's Cat", "Gerbil", "Grasshopper", "Guanaco", "Gundi", "Hamster", "Hawk", "Hedgehog", "Hyena", "Hyrax", "Jackal", "Kangaroo", "Kangaroo Rat", "Kestrel", "Kowari", "Kultarr", "Leopard", "Lion", "Macaw", "Meerkat", "Mouse", "Oryx", "Ostrich", "Owl", "Pronghorn", "Python", "Rabbit", "Raccoon", "Rattlesnake", "Rhinoceros", "Sand Cat", "Spectacled Bear", "Spiny Mouse", "Starling", "Stick Bug", "Tarantula", "Tit", "Toad", "Tortoise", "Tyrant Flycatcher", "Viper", "Vulture", "Waxwing", "Xerus", "Zebra"],
          grassland: ["Aardvark", "Aardwolf", "Accentor", "African Buffalo", "African Wild Dog", "Alpaca", "Anaconda", "Ant", "Anteater", "Antelope", "Armadillo", "Baboon", "Badger", "Bandicoot", "Barbet", "Bat", "Bee", "Bee-eater", "Beetle", "Bird", "Bison", "Black-footed Cat", "Black-footed Ferret", "Bluebird", "Boa", "Bowerbird", "Brown Bear", "Bush Dog", "Bushshrike", "Bustard", "Butterfly", "Buzzard", "Caracal", "Caracara", "Cardinal", "Caterpillar", "Cheetah", "Chipmunk", "Civet", "Climbing Mouse", "Clouded Leopard", "Coati", "Cobra", "Cockatoo", "Cockroach", "Common Genet", "Cotton Rat", "Cougar", "Courser", "Coyote", "Crane", "Crane Fly", "Cricket", "Crow", "Culpeo", "Death Adder", "Deer", "Deer Mouse", "Dingo", "Dinosaur", "Dove", "Drongo", "Duck", "Duiker", "Dunnart", "Eagle", "Echidna", "Elephant", "Elk", "Emu", "Falcon", "Finch", "Flea", "Fly", "Flying Frog", "Fox", "Frog", "Frogmouth", "Garter Snake", "Gazelle", "Gecko", "Geoffroy's Cat", "Gerbil", "Giant Tortoise", "Giraffe", "Grasshopper", "Grison", "Groundhog", "Grouse", "Guanaco", "Guinea Pig", "Hamster", "Harrier", "Hartebeest", "Hawk", "Hedgehog", "Helmetshrike", "Hippopotamus", "Hornbill", "Hyena", "Hyrax", "Impala", "Jackal", "Jaguar", "Jaguarundi", "Kangaroo", "Kangaroo Rat", "Kestrel", "Kultarr", "Ladybug", "Leopard", "Lion", "Macaw", "Meerkat", "Mouse", "Newt", "Oryx", "Ostrich", "Owl", "Pangolin", "Pheasant", "Prairie Dog", "Pronghorn", "Przewalski's Horse", "Python", "Quoll", "Rabbit", "Raven", "Rhinoceros", "Shelduck", "Sloth Bear", "Spectacled Bear", "Squirrel", "Starling", "Stick Bug", "Tamandua", "Tasmanian Devil", "Thornbill", "Thrush", "Toad", "Tortoise"],
          forest: ["Agouti", "Anaconda", "Anoa", "Ant", "Anteater", "Antelope", "Armadillo", "Asian Black Bear", "Aye-aye", "Babirusa", "Baboon", "Badger", "Bandicoot", "Banteng", "Barbet", "Basilisk", "Bat", "Bearded Dragon", "Bee", "Bee-eater", "Beetle", "Bettong", "Binturong", "Bird-of-paradise", "Bongo", "Bowerbird", "Bulbul", "Bush Dog", "Bushbaby", "Bushshrike", "Butterfly", "Buzzard", "Caecilian", "Cardinal", "Cassowary", "Caterpillar", "Centipede", "Chameleon", "Chimpanzee", "Cicada", "Civet", "Clouded Leopard", "Coati", "Cobra", "Cockatoo", "Cockroach", "Colugo", "Cotinga", "Cotton Rat", "Cougar", "Crane Fly", "Cricket", "Crocodile", "Crow", "Cuckoo", "Cuscus", "Death Adder", "Deer", "Dhole", "Dingo", "Dinosaur", "Drongo", "Duck", "Duiker", "Eagle", "Echidna", "Elephant", "Finch", "Flat-headed Cat", "Flea", "Flowerpecker", "Fly", "Flying Frog", "Fossa", "Frog", "Frogmouth", "Gaur", "Gecko", "Gorilla", "Grison", "Hawaiian Honeycreeper", "Hawk", "Hedgehog", "Helmetshrike", "Hornbill", "Hyrax", "Iguana", "Jackal", "Jaguar", "Jaguarundi", "Kestrel", "Ladybug", "Lemur", "Leopard", "Lion", "Macaw", "Mandrill", "Margay", "Monkey", "Mouse", "Mouse Deer", "Newt", "Okapi", "Old World Flycatcher", "Orangutan", "Owl", "Pangolin", "Peafowl", "Pheasant", "Possum", "Python", "Quokka", "Rabbit", "Raccoon", "Red Panda", "Red River Hog", "Rhinoceros", "Sloth Bear", "Spectacled Bear", "Squirrel", "Starling", "Stick Bug", "Sun Bear", "Tamandua", "Tamarin", "Tapir", "Tarantula", "Thrush", "Tiger", "Tit", "Toad", "Tortoise", "Toucan", "Trogon", "Trumpeter", "Turaco", "Turtle", "Tyrant Flycatcher", "Viper", "Vulture", "Wallaby", "Warbler", "Wasp", "Waxwing", "Weaver", "Weaver-finch", "Whistler", "White-eye", "Whydah", "Woodswallow", "Worm", "Wren", "Xenops", "Yellowjacket", "Accentor", "African Buffalo", "American Black Bear", "Anole", "Bird", "Bison", "Boa", "Brown Bear", "Chipmunk", "Common Genet", "Copperhead", "Coyote", "Deer Mouse", "Dormouse", "Elk", "Emu", "Fisher", "Fox", "Garter Snake", "Giant Panda", "Giant Tortoise", "Groundhog", "Grouse", "Guanaco", "Himalayan Tahr", "Kangaroo", "Koala", "Numbat", "Quoll", "Raccoon dog", "Tasmanian Devil", "Thornbill", "Turkey", "Vole", "Weasel", "Wildcat", "Wolf", "Wombat", "Woodchuck", "Woodpecker"],
          //list of farm animals comes from https://www.buzzle.com/articles/farm-animals-list.html
          farm: ["Alpaca", "Buffalo", "Banteng", "Cow", "Cat", "Chicken", "Carp", "Camel", "Donkey", "Dog", "Duck", "Emu", "Goat", "Gayal", "Guinea", "Goose", "Horse", "Honey", "Llama", "Pig", "Pigeon", "Rhea", "Rabbit", "Sheep", "Silkworm", "Turkey", "Yak", "Zebu"],
          //list of pet animals comes from https://www.dogbreedinfo.com/pets/pet.htm
          pet: ["Bearded Dragon", "Birds", "Burro", "Cats", "Chameleons", "Chickens", "Chinchillas", "Chinese Water Dragon", "Cows", "Dogs", "Donkey", "Ducks", "Ferrets", "Fish", "Geckos", "Geese", "Gerbils", "Goats", "Guinea Fowl", "Guinea Pigs", "Hamsters", "Hedgehogs", "Horses", "Iguanas", "Llamas", "Lizards", "Mice", "Mule", "Peafowl", "Pigs and Hogs", "Pigeons", "Ponies", "Pot Bellied Pig", "Rabbits", "Rats", "Sheep", "Skinks", "Snakes", "Stick Insects", "Sugar Gliders", "Tarantula", "Turkeys", "Turtles"],
          //list of zoo animals comes from https://bronxzoo.com/animals
          zoo: ["Aardvark", "African Wild Dog", "Aldabra Tortoise", "American Alligator", "American Bison", "Amur Tiger", "Anaconda", "Andean Condor", "Asian Elephant", "Baby Doll Sheep", "Bald Eagle", "Barred Owl", "Blue Iguana", "Boer Goat", "California Sea Lion", "Caribbean Flamingo", "Chinchilla", "Collared Lemur", "Coquerel's Sifaka", "Cuban Amazon Parrot", "Ebony Langur", "Fennec Fox", "Fossa", "Gelada", "Giant Anteater", "Giraffe", "Gorilla", "Grizzly Bear", "Henkel's Leaf-tailed Gecko", "Indian Gharial", "Indian Rhinoceros", "King Cobra", "King Vulture", "Komodo Dragon", "Linne's Two-toed Sloth", "Lion", "Little Penguin", "Madagascar Tree Boa", "Magellanic Penguin", "Malayan Tapir", "Malayan Tiger", "Matschies Tree Kangaroo", "Mini Donkey", "Monarch Butterfly", "Nile crocodile", "North American Porcupine", "Nubian Ibex", "Okapi", "Poison Dart Frog", "Polar Bear", "Pygmy Marmoset", "Radiated Tortoise", "Red Panda", "Red Ruffed Lemur", "Ring-tailed Lemur", "Ring-tailed Mongoose", "Rock Hyrax", "Small Clawed Asian Otter", "Snow Leopard", "Snowy Owl", "Southern White-faced Owl", "Southern White Rhinocerous", "Squirrel Monkey", "Tufted Puffin", "White Cheeked Gibbon", "White-throated Bee Eater", "Zebra"]
        },
        primes: [
          // 1230 first primes, i.e. all primes up to the first one greater than 10000, inclusive.
          2,
          3,
          5,
          7,
          11,
          13,
          17,
          19,
          23,
          29,
          31,
          37,
          41,
          43,
          47,
          53,
          59,
          61,
          67,
          71,
          73,
          79,
          83,
          89,
          97,
          101,
          103,
          107,
          109,
          113,
          127,
          131,
          137,
          139,
          149,
          151,
          157,
          163,
          167,
          173,
          179,
          181,
          191,
          193,
          197,
          199,
          211,
          223,
          227,
          229,
          233,
          239,
          241,
          251,
          257,
          263,
          269,
          271,
          277,
          281,
          283,
          293,
          307,
          311,
          313,
          317,
          331,
          337,
          347,
          349,
          353,
          359,
          367,
          373,
          379,
          383,
          389,
          397,
          401,
          409,
          419,
          421,
          431,
          433,
          439,
          443,
          449,
          457,
          461,
          463,
          467,
          479,
          487,
          491,
          499,
          503,
          509,
          521,
          523,
          541,
          547,
          557,
          563,
          569,
          571,
          577,
          587,
          593,
          599,
          601,
          607,
          613,
          617,
          619,
          631,
          641,
          643,
          647,
          653,
          659,
          661,
          673,
          677,
          683,
          691,
          701,
          709,
          719,
          727,
          733,
          739,
          743,
          751,
          757,
          761,
          769,
          773,
          787,
          797,
          809,
          811,
          821,
          823,
          827,
          829,
          839,
          853,
          857,
          859,
          863,
          877,
          881,
          883,
          887,
          907,
          911,
          919,
          929,
          937,
          941,
          947,
          953,
          967,
          971,
          977,
          983,
          991,
          997,
          1009,
          1013,
          1019,
          1021,
          1031,
          1033,
          1039,
          1049,
          1051,
          1061,
          1063,
          1069,
          1087,
          1091,
          1093,
          1097,
          1103,
          1109,
          1117,
          1123,
          1129,
          1151,
          1153,
          1163,
          1171,
          1181,
          1187,
          1193,
          1201,
          1213,
          1217,
          1223,
          1229,
          1231,
          1237,
          1249,
          1259,
          1277,
          1279,
          1283,
          1289,
          1291,
          1297,
          1301,
          1303,
          1307,
          1319,
          1321,
          1327,
          1361,
          1367,
          1373,
          1381,
          1399,
          1409,
          1423,
          1427,
          1429,
          1433,
          1439,
          1447,
          1451,
          1453,
          1459,
          1471,
          1481,
          1483,
          1487,
          1489,
          1493,
          1499,
          1511,
          1523,
          1531,
          1543,
          1549,
          1553,
          1559,
          1567,
          1571,
          1579,
          1583,
          1597,
          1601,
          1607,
          1609,
          1613,
          1619,
          1621,
          1627,
          1637,
          1657,
          1663,
          1667,
          1669,
          1693,
          1697,
          1699,
          1709,
          1721,
          1723,
          1733,
          1741,
          1747,
          1753,
          1759,
          1777,
          1783,
          1787,
          1789,
          1801,
          1811,
          1823,
          1831,
          1847,
          1861,
          1867,
          1871,
          1873,
          1877,
          1879,
          1889,
          1901,
          1907,
          1913,
          1931,
          1933,
          1949,
          1951,
          1973,
          1979,
          1987,
          1993,
          1997,
          1999,
          2003,
          2011,
          2017,
          2027,
          2029,
          2039,
          2053,
          2063,
          2069,
          2081,
          2083,
          2087,
          2089,
          2099,
          2111,
          2113,
          2129,
          2131,
          2137,
          2141,
          2143,
          2153,
          2161,
          2179,
          2203,
          2207,
          2213,
          2221,
          2237,
          2239,
          2243,
          2251,
          2267,
          2269,
          2273,
          2281,
          2287,
          2293,
          2297,
          2309,
          2311,
          2333,
          2339,
          2341,
          2347,
          2351,
          2357,
          2371,
          2377,
          2381,
          2383,
          2389,
          2393,
          2399,
          2411,
          2417,
          2423,
          2437,
          2441,
          2447,
          2459,
          2467,
          2473,
          2477,
          2503,
          2521,
          2531,
          2539,
          2543,
          2549,
          2551,
          2557,
          2579,
          2591,
          2593,
          2609,
          2617,
          2621,
          2633,
          2647,
          2657,
          2659,
          2663,
          2671,
          2677,
          2683,
          2687,
          2689,
          2693,
          2699,
          2707,
          2711,
          2713,
          2719,
          2729,
          2731,
          2741,
          2749,
          2753,
          2767,
          2777,
          2789,
          2791,
          2797,
          2801,
          2803,
          2819,
          2833,
          2837,
          2843,
          2851,
          2857,
          2861,
          2879,
          2887,
          2897,
          2903,
          2909,
          2917,
          2927,
          2939,
          2953,
          2957,
          2963,
          2969,
          2971,
          2999,
          3001,
          3011,
          3019,
          3023,
          3037,
          3041,
          3049,
          3061,
          3067,
          3079,
          3083,
          3089,
          3109,
          3119,
          3121,
          3137,
          3163,
          3167,
          3169,
          3181,
          3187,
          3191,
          3203,
          3209,
          3217,
          3221,
          3229,
          3251,
          3253,
          3257,
          3259,
          3271,
          3299,
          3301,
          3307,
          3313,
          3319,
          3323,
          3329,
          3331,
          3343,
          3347,
          3359,
          3361,
          3371,
          3373,
          3389,
          3391,
          3407,
          3413,
          3433,
          3449,
          3457,
          3461,
          3463,
          3467,
          3469,
          3491,
          3499,
          3511,
          3517,
          3527,
          3529,
          3533,
          3539,
          3541,
          3547,
          3557,
          3559,
          3571,
          3581,
          3583,
          3593,
          3607,
          3613,
          3617,
          3623,
          3631,
          3637,
          3643,
          3659,
          3671,
          3673,
          3677,
          3691,
          3697,
          3701,
          3709,
          3719,
          3727,
          3733,
          3739,
          3761,
          3767,
          3769,
          3779,
          3793,
          3797,
          3803,
          3821,
          3823,
          3833,
          3847,
          3851,
          3853,
          3863,
          3877,
          3881,
          3889,
          3907,
          3911,
          3917,
          3919,
          3923,
          3929,
          3931,
          3943,
          3947,
          3967,
          3989,
          4001,
          4003,
          4007,
          4013,
          4019,
          4021,
          4027,
          4049,
          4051,
          4057,
          4073,
          4079,
          4091,
          4093,
          4099,
          4111,
          4127,
          4129,
          4133,
          4139,
          4153,
          4157,
          4159,
          4177,
          4201,
          4211,
          4217,
          4219,
          4229,
          4231,
          4241,
          4243,
          4253,
          4259,
          4261,
          4271,
          4273,
          4283,
          4289,
          4297,
          4327,
          4337,
          4339,
          4349,
          4357,
          4363,
          4373,
          4391,
          4397,
          4409,
          4421,
          4423,
          4441,
          4447,
          4451,
          4457,
          4463,
          4481,
          4483,
          4493,
          4507,
          4513,
          4517,
          4519,
          4523,
          4547,
          4549,
          4561,
          4567,
          4583,
          4591,
          4597,
          4603,
          4621,
          4637,
          4639,
          4643,
          4649,
          4651,
          4657,
          4663,
          4673,
          4679,
          4691,
          4703,
          4721,
          4723,
          4729,
          4733,
          4751,
          4759,
          4783,
          4787,
          4789,
          4793,
          4799,
          4801,
          4813,
          4817,
          4831,
          4861,
          4871,
          4877,
          4889,
          4903,
          4909,
          4919,
          4931,
          4933,
          4937,
          4943,
          4951,
          4957,
          4967,
          4969,
          4973,
          4987,
          4993,
          4999,
          5003,
          5009,
          5011,
          5021,
          5023,
          5039,
          5051,
          5059,
          5077,
          5081,
          5087,
          5099,
          5101,
          5107,
          5113,
          5119,
          5147,
          5153,
          5167,
          5171,
          5179,
          5189,
          5197,
          5209,
          5227,
          5231,
          5233,
          5237,
          5261,
          5273,
          5279,
          5281,
          5297,
          5303,
          5309,
          5323,
          5333,
          5347,
          5351,
          5381,
          5387,
          5393,
          5399,
          5407,
          5413,
          5417,
          5419,
          5431,
          5437,
          5441,
          5443,
          5449,
          5471,
          5477,
          5479,
          5483,
          5501,
          5503,
          5507,
          5519,
          5521,
          5527,
          5531,
          5557,
          5563,
          5569,
          5573,
          5581,
          5591,
          5623,
          5639,
          5641,
          5647,
          5651,
          5653,
          5657,
          5659,
          5669,
          5683,
          5689,
          5693,
          5701,
          5711,
          5717,
          5737,
          5741,
          5743,
          5749,
          5779,
          5783,
          5791,
          5801,
          5807,
          5813,
          5821,
          5827,
          5839,
          5843,
          5849,
          5851,
          5857,
          5861,
          5867,
          5869,
          5879,
          5881,
          5897,
          5903,
          5923,
          5927,
          5939,
          5953,
          5981,
          5987,
          6007,
          6011,
          6029,
          6037,
          6043,
          6047,
          6053,
          6067,
          6073,
          6079,
          6089,
          6091,
          6101,
          6113,
          6121,
          6131,
          6133,
          6143,
          6151,
          6163,
          6173,
          6197,
          6199,
          6203,
          6211,
          6217,
          6221,
          6229,
          6247,
          6257,
          6263,
          6269,
          6271,
          6277,
          6287,
          6299,
          6301,
          6311,
          6317,
          6323,
          6329,
          6337,
          6343,
          6353,
          6359,
          6361,
          6367,
          6373,
          6379,
          6389,
          6397,
          6421,
          6427,
          6449,
          6451,
          6469,
          6473,
          6481,
          6491,
          6521,
          6529,
          6547,
          6551,
          6553,
          6563,
          6569,
          6571,
          6577,
          6581,
          6599,
          6607,
          6619,
          6637,
          6653,
          6659,
          6661,
          6673,
          6679,
          6689,
          6691,
          6701,
          6703,
          6709,
          6719,
          6733,
          6737,
          6761,
          6763,
          6779,
          6781,
          6791,
          6793,
          6803,
          6823,
          6827,
          6829,
          6833,
          6841,
          6857,
          6863,
          6869,
          6871,
          6883,
          6899,
          6907,
          6911,
          6917,
          6947,
          6949,
          6959,
          6961,
          6967,
          6971,
          6977,
          6983,
          6991,
          6997,
          7001,
          7013,
          7019,
          7027,
          7039,
          7043,
          7057,
          7069,
          7079,
          7103,
          7109,
          7121,
          7127,
          7129,
          7151,
          7159,
          7177,
          7187,
          7193,
          7207,
          7211,
          7213,
          7219,
          7229,
          7237,
          7243,
          7247,
          7253,
          7283,
          7297,
          7307,
          7309,
          7321,
          7331,
          7333,
          7349,
          7351,
          7369,
          7393,
          7411,
          7417,
          7433,
          7451,
          7457,
          7459,
          7477,
          7481,
          7487,
          7489,
          7499,
          7507,
          7517,
          7523,
          7529,
          7537,
          7541,
          7547,
          7549,
          7559,
          7561,
          7573,
          7577,
          7583,
          7589,
          7591,
          7603,
          7607,
          7621,
          7639,
          7643,
          7649,
          7669,
          7673,
          7681,
          7687,
          7691,
          7699,
          7703,
          7717,
          7723,
          7727,
          7741,
          7753,
          7757,
          7759,
          7789,
          7793,
          7817,
          7823,
          7829,
          7841,
          7853,
          7867,
          7873,
          7877,
          7879,
          7883,
          7901,
          7907,
          7919,
          7927,
          7933,
          7937,
          7949,
          7951,
          7963,
          7993,
          8009,
          8011,
          8017,
          8039,
          8053,
          8059,
          8069,
          8081,
          8087,
          8089,
          8093,
          8101,
          8111,
          8117,
          8123,
          8147,
          8161,
          8167,
          8171,
          8179,
          8191,
          8209,
          8219,
          8221,
          8231,
          8233,
          8237,
          8243,
          8263,
          8269,
          8273,
          8287,
          8291,
          8293,
          8297,
          8311,
          8317,
          8329,
          8353,
          8363,
          8369,
          8377,
          8387,
          8389,
          8419,
          8423,
          8429,
          8431,
          8443,
          8447,
          8461,
          8467,
          8501,
          8513,
          8521,
          8527,
          8537,
          8539,
          8543,
          8563,
          8573,
          8581,
          8597,
          8599,
          8609,
          8623,
          8627,
          8629,
          8641,
          8647,
          8663,
          8669,
          8677,
          8681,
          8689,
          8693,
          8699,
          8707,
          8713,
          8719,
          8731,
          8737,
          8741,
          8747,
          8753,
          8761,
          8779,
          8783,
          8803,
          8807,
          8819,
          8821,
          8831,
          8837,
          8839,
          8849,
          8861,
          8863,
          8867,
          8887,
          8893,
          8923,
          8929,
          8933,
          8941,
          8951,
          8963,
          8969,
          8971,
          8999,
          9001,
          9007,
          9011,
          9013,
          9029,
          9041,
          9043,
          9049,
          9059,
          9067,
          9091,
          9103,
          9109,
          9127,
          9133,
          9137,
          9151,
          9157,
          9161,
          9173,
          9181,
          9187,
          9199,
          9203,
          9209,
          9221,
          9227,
          9239,
          9241,
          9257,
          9277,
          9281,
          9283,
          9293,
          9311,
          9319,
          9323,
          9337,
          9341,
          9343,
          9349,
          9371,
          9377,
          9391,
          9397,
          9403,
          9413,
          9419,
          9421,
          9431,
          9433,
          9437,
          9439,
          9461,
          9463,
          9467,
          9473,
          9479,
          9491,
          9497,
          9511,
          9521,
          9533,
          9539,
          9547,
          9551,
          9587,
          9601,
          9613,
          9619,
          9623,
          9629,
          9631,
          9643,
          9649,
          9661,
          9677,
          9679,
          9689,
          9697,
          9719,
          9721,
          9733,
          9739,
          9743,
          9749,
          9767,
          9769,
          9781,
          9787,
          9791,
          9803,
          9811,
          9817,
          9829,
          9833,
          9839,
          9851,
          9857,
          9859,
          9871,
          9883,
          9887,
          9901,
          9907,
          9923,
          9929,
          9931,
          9941,
          9949,
          9967,
          9973,
          10007
        ],
        emotions: [
          "love",
          "joy",
          "surprise",
          "anger",
          "sadness",
          "fear"
        ],
        music_genres: {
          general: [
            "Rock",
            "Pop",
            "Hip-Hop",
            "Jazz",
            "Classical",
            "Electronic",
            "Country",
            "R&B",
            "Reggae",
            "Blues",
            "Metal",
            "Folk",
            "Alternative",
            "Punk",
            "Disco",
            "Funk",
            "Techno",
            "Indie",
            "Gospel",
            "Dance",
            "Children's",
            "World"
          ],
          alternative: [
            "Art Punk",
            "Alternative Rock",
            "Britpunk",
            "College Rock",
            "Crossover Thrash",
            "Crust Punk",
            "Emo / Emocore",
            "Experimental Rock",
            "Folk Punk",
            "Goth / Gothic Rock",
            "Grunge",
            "Hardcore Punk",
            "Hard Rock",
            "Indie Rock",
            "Lo-fi",
            "Musique Concr\xE8te",
            "New Wave",
            "Progressive Rock",
            "Punk",
            "Shoegaze",
            "Steampunk"
          ],
          blues: [
            "Acoustic Blues",
            "African Blues",
            "Blues Rock",
            "Blues Shouter",
            "British Blues",
            "Canadian Blues",
            "Chicago Blues",
            "Classic Blues",
            "Classic Female Blues",
            "Contemporary Blues",
            "Country Blues",
            "Dark Blues",
            "Delta Blues",
            "Detroit Blues",
            "Doom Blues",
            "Electric Blues",
            "Folk Blues",
            "Gospel Blues",
            "Harmonica Blues",
            "Hill Country Blues",
            "Hokum Blues",
            "Jazz Blues",
            "Jump Blues",
            "Kansas City Blues",
            "Louisiana Blues",
            "Memphis Blues",
            "Modern Blues",
            "New Orlean Blues",
            "NY Blues",
            "Piano Blues",
            "Piedmont Blues",
            "Punk Blues",
            "Ragtime Blues",
            "Rhythm Blues",
            "Soul Blues",
            "St.Louis Blues",
            "Soul Blues",
            "Swamp Blues",
            "Texas Blues",
            "Urban Blues",
            "Vandeville",
            "West Coast Blues"
          ],
          "children's": [
            "Lullabies",
            "Sing - Along",
            "Stories"
          ],
          classical: [
            "Avant-Garde",
            "Ballet",
            "Baroque",
            "Cantata",
            "Chamber Music",
            "String Quartet",
            "Chant",
            "Choral",
            "Classical Crossover",
            "Concerto",
            "Concerto Grosso",
            "Contemporary Classical",
            "Early Music",
            "Expressionist",
            "High Classical",
            "Impressionist",
            "Mass Requiem",
            "Medieval",
            "Minimalism",
            "Modern Composition",
            "Modern Classical",
            "Opera",
            "Oratorio",
            "Orchestral",
            "Organum",
            "Renaissance",
            "Romantic (early period)",
            "Romantic (later period)",
            "Sonata",
            "Symphonic",
            "Symphony",
            "Twelve-tone",
            "Wedding Music"
          ],
          country: [
            "Alternative Country",
            "Americana",
            "Australian Country",
            "Bakersfield Sound",
            "Bluegrass",
            "Blues Country",
            "Cajun Fiddle Tunes",
            "Christian Country",
            "Classic Country",
            "Close Harmony",
            "Contemporary Bluegrass",
            "Contemporary Country",
            "Country Gospel",
            "Country Pop",
            "Country Rap",
            "Country Rock",
            "Country Soul",
            "Cowboy / Western",
            "Cowpunk",
            "Dansband",
            "Honky Tonk",
            "Franco-Country",
            "Gulf and Western",
            "Hellbilly Music",
            "Honky Tonk",
            "Instrumental Country",
            "Lubbock Sound",
            "Nashville Sound",
            "Neotraditional Country",
            "Outlaw Country",
            "Progressive",
            "Psychobilly / Punkabilly",
            "Red Dirt",
            "Sertanejo",
            "Texas County",
            "Traditional Bluegrass",
            "Traditional Country",
            "Truck-Driving Country",
            "Urban Cowboy",
            "Western Swing"
          ],
          dance: [
            "Club / Club Dance",
            "Breakcore",
            "Breakbeat / Breakstep",
            "Chillstep",
            "Deep House",
            "Dubstep",
            "Dancehall",
            "Electro House",
            "Electroswing",
            "Exercise",
            "Future Garage",
            "Garage",
            "Glitch Hop",
            "Glitch Pop",
            "Grime",
            "Hardcore",
            "Hard Dance",
            "Hi-NRG / Eurodance",
            "Horrorcore",
            "House",
            "Jackin House",
            "Jungle / Drum n bass",
            "Liquid Dub",
            "Regstep",
            "Speedcore",
            "Techno",
            "Trance",
            "Trap"
          ],
          electronic: [
            "2-Step",
            "8bit",
            "Ambient",
            "Asian Underground",
            "Bassline",
            "Chillwave",
            "Chiptune",
            "Crunk",
            "Downtempo",
            "Drum & Bass",
            "Hard Step",
            "Electro",
            "Electro-swing",
            "Electroacoustic",
            "Electronica",
            "Electronic Rock",
            "Eurodance",
            "Hardstyle",
            "Hi-Nrg",
            "IDM/Experimental",
            "Industrial",
            "Trip Hop",
            "Vaporwave",
            "UK Garage",
            "House",
            "Dubstep",
            "Deep House",
            "EDM",
            "Future Bass",
            "Psychedelic trance"
          ],
          jazz: [
            "Acid Jazz",
            "Afro-Cuban Jazz",
            "Avant-Garde Jazz",
            "Bebop",
            "Big Band",
            "Blue Note",
            "British Dance Band (Jazz)",
            "Cape Jazz",
            "Chamber Jazz",
            "Contemporary Jazz",
            "Continental Jazz",
            "Cool Jazz",
            "Crossover Jazz",
            "Dark Jazz",
            "Dixieland",
            "Early Jazz",
            "Electro Swing (Jazz)",
            "Ethio-jazz",
            "Ethno-Jazz",
            "European Free Jazz",
            "Free Funk (Avant-Garde / Funk Jazz)",
            "Free Jazz",
            "Fusion",
            "Gypsy Jazz",
            "Hard Bop",
            "Indo Jazz",
            "Jazz Blues",
            "Jazz-Funk (see Free Funk)",
            "Jazz-Fusion",
            "Jazz Rap",
            "Jazz Rock",
            "Kansas City Jazz",
            "Latin Jazz",
            "M-Base Jazz",
            "Mainstream Jazz",
            "Modal Jazz",
            "Neo-Bop",
            "Neo-Swing",
            "Nu Jazz",
            "Orchestral Jazz",
            "Post-Bop",
            "Punk Jazz",
            "Ragtime",
            "Ska Jazz",
            "Skiffle (also Folk)",
            "Smooth Jazz",
            "Soul Jazz",
            "Swing Jazz",
            "Straight-Ahead Jazz",
            "Trad Jazz",
            "Third Stream",
            "Jazz-Funk",
            "Free Jazz",
            "West Coast Jazz"
          ],
          metal: [
            "Heavy Metal",
            "Speed Metal",
            "Thrash Metal",
            "Power Metal",
            "Death Metal",
            "Black Metal",
            "Pagan Metal",
            "Viking Metal",
            "Folk Metal",
            "Symphonic Metal",
            "Gothic Metal",
            "Glam Metal",
            "Hair Metal",
            "Doom Metal",
            "Groove Metal",
            "Industrial Metal",
            "Modern Metal",
            "Neoclassical Metal",
            "New Wave Of British Heavy Metal",
            "Post Metal",
            "Progressive Metal",
            "Avantgarde Metal",
            "Sludge",
            "Djent",
            "Drone",
            "Kawaii Metal",
            "Pirate Metal",
            "Nu Metal",
            "Neue Deutsche H\xE4rte",
            "Math Metal",
            "Crossover",
            "Grindcore",
            "Hardcore",
            "Metalcore",
            "Deathcore",
            "Post Hardcore",
            "Mathcore"
          ],
          folk: [
            "American Folk Revival",
            "Anti - Folk",
            "British Folk Revival",
            "Contemporary Folk",
            "Filk Music",
            "Freak Folk",
            "Indie Folk",
            "Industrial Folk",
            "Neofolk",
            "Progressive Folk",
            "Psychedelic Folk",
            "Sung Poetry",
            "Techno - Folk",
            "Folk Rock",
            "Old-time Music",
            "Bluegrass",
            "Appalachian",
            "Roots Revival",
            "Celtic",
            "Indie Folk"
          ],
          pop: [
            "Adult Contemporary",
            "Arab Pop",
            "Baroque",
            "Britpop",
            "Bubblegum Pop",
            "Chamber Pop",
            "Chanson",
            "Christian Pop",
            "Classical Crossover",
            "Europop",
            "Austropop",
            "Balkan Pop",
            "French Pop",
            "Korean Pop",
            "Japanese Pop",
            "Chinese Pop",
            "Latin Pop",
            "La\xEFk\xF3",
            "Nederpop",
            "Russian Pop",
            "Dance Pop",
            "Dream Pop",
            "Electro Pop",
            "Iranian Pop",
            "Jangle Pop",
            "Latin Ballad",
            "Levenslied",
            "Louisiana Swamp Pop",
            "Mexican Pop",
            "Motorpop",
            "New Romanticism",
            "Orchestral Pop",
            "Pop Rap",
            "Popera",
            "Pop / Rock",
            "Pop Punk",
            "Power Pop",
            "Psychedelic Pop",
            "Russian Pop",
            "Schlager",
            "Soft Rock",
            "Sophisti - Pop",
            "Space Age Pop",
            "Sunshine Pop",
            "Surf Pop",
            "Synthpop",
            "Teen Pop",
            "Traditional Pop Music",
            "Turkish Pop",
            "Vispop",
            "Wonky Pop"
          ],
          "r&b": [
            "(Carolina) Beach Music",
            "Contemporary R & B",
            "Disco",
            "Doo Wop",
            "Funk",
            "Modern Soul",
            "Motown",
            "Neo - Soul",
            "Northern Soul",
            "Psychedelic Soul",
            "Quiet Storm",
            "Soul",
            "Soul Blues",
            "Southern Soul"
          ],
          reggae: [
            "2 - Tone",
            "Dub",
            "Roots Reggae",
            "Reggae Fusion",
            "Reggae en Espa\xF1ol",
            "Spanish Reggae",
            "Reggae 110",
            "Reggae Bultr\xF3n",
            "Romantic Flow",
            "Lovers Rock",
            "Raggamuffin",
            "Ragga",
            "Dancehall",
            "Ska"
          ],
          rock: [
            "Acid Rock",
            "Adult - Oriented Rock",
            "Afro Punk",
            "Adult Alternative",
            "Alternative Rock",
            "American Traditional Rock",
            "Anatolian Rock",
            "Arena Rock",
            "Art Rock",
            "Blues - Rock",
            "British Invasion",
            "Cock Rock",
            "Death Metal / Black Metal",
            "Doom Metal",
            "Glam Rock",
            "Gothic Metal",
            "Grind Core",
            "Hair Metal",
            "Hard Rock",
            "Math Metal",
            "Math Rock",
            "Metal",
            "Metal Core",
            "Noise Rock",
            "Jam Bands",
            "Post Punk",
            "Post Rock",
            "Prog - Rock / Art Rock",
            "Progressive Metal",
            "Psychedelic",
            "Rock & Roll",
            "Rockabilly",
            "Roots Rock",
            "Singer / Songwriter",
            "Southern Rock",
            "Spazzcore",
            "Stoner Metal",
            "Surf",
            "Technical Death Metal",
            "Tex - Mex",
            "Thrash Metal",
            "Time Lord Rock(Trock)",
            "Trip - hop",
            "Yacht Rock",
            "School House Rock"
          ],
          "hip-hop": [
            "Alternative Rap",
            "Avant - Garde",
            "Bounce",
            "Chap Hop",
            "Christian Hip Hop",
            "Conscious Hip Hop",
            "Country - Rap",
            "Grunk",
            "Crunkcore",
            "Cumbia Rap",
            "Dirty South",
            "East Coast",
            "Brick City Club",
            "Hardcore Hip Hop",
            "Mafioso Rap",
            "New Jersey Hip Hop",
            "Freestyle Rap",
            "G - Funk",
            "Gangsta Rap",
            "Golden Age",
            "Grime",
            "Hardcore Rap",
            "Hip - Hop",
            "Hip Pop",
            "Horrorcore",
            "Hyphy",
            "Industrial Hip Hop",
            "Instrumental Hip Hop",
            "Jazz Rap",
            "Latin Rap",
            "Low Bap",
            "Lyrical Hip Hop",
            "Merenrap",
            "Midwest Hip Hop",
            "Chicago Hip Hop",
            "Detroit Hip Hop",
            "Horrorcore",
            "St.Louis Hip Hop",
            "Twin Cities Hip Hop",
            "Motswako",
            "Nerdcore",
            "New Jack Swing",
            "New School Hip Hop",
            "Old School Rap",
            "Rap",
            "Trap",
            "Turntablism",
            "Underground Rap",
            "West Coast Rap",
            "East Coast Rap",
            "Trap",
            "UK Grime",
            "Hyphy",
            "Emo-rap",
            "Cloud rap",
            "G-funk",
            "Boom Bap",
            "Mumble",
            "Drill",
            "UK Drill",
            "Soundcloud Rap",
            "Lo-fi"
          ],
          punk: [
            "Afro-punk",
            "Anarcho punk",
            "Art punk",
            "Christian punk",
            "Crust punk",
            "Deathrock",
            "Egg punk",
            "Garage punk",
            "Glam punk",
            "Hardcore punk",
            "Horror punk",
            "Incelcore/e-punk",
            "Oi!",
            "Peace punk",
            "Punk pathetique",
            "Queercore",
            "Riot Grrrl",
            "Skate punk",
            "Street punk",
            "Taqwacore",
            "Trallpunk"
          ],
          disco: [
            "Nu-disco",
            "Disco-funk",
            "Hi-NRG",
            "Italo Disco",
            "Eurodisco",
            "Boogie",
            "Space Disco",
            "Post-disco",
            "Electro Disco",
            "Disco House",
            "Disco Pop",
            "Soulful House"
          ],
          funk: [
            "Funk Rock",
            "P-Funk (Parliament-Funkadelic)",
            "Psychedelic Funk",
            "Funk Metal",
            "Electro-Funk",
            "Go-go",
            "Boogie-Funk",
            "Jazz-Funk",
            "Soul-Funk",
            "Funky Disco",
            "Nu-Funk",
            "Afrobeat",
            "Latin Funk",
            "G-Funk",
            "Acid Jazz",
            "Funktronica",
            "Folk-Funk",
            "Space Funk",
            "Ambient Funk",
            "Hard Funk",
            "Fusion Funk"
          ],
          techno: [
            "Acid Techno",
            "Ambient Techno",
            "Detroit Techno",
            "Dub Techno",
            "Minimal Techno",
            "Industrial Techno",
            "Hard Techno",
            "Trance",
            "Progressive Techno",
            "Tech House",
            "Electronica",
            "Breakbeat Techno",
            "Electro Techno",
            "Melodic Techno",
            "Experimental Techno",
            "Dark Techno",
            "Ebm",
            "Hypnotic Techno",
            "Psychedelic Techno",
            "Rave Techno",
            "Techno-Pop"
          ],
          indie: [
            "Indie Rock",
            "Indie Pop",
            "Indie Folk",
            "Indie Electronic",
            "Indie Punk",
            "Indie Hip-Hop",
            "Dream Pop",
            "Shoegaze",
            "Lo-fi",
            "Chillwave",
            "Freak Folk",
            "Noise Pop",
            "Math Rock",
            "Post-Punk",
            "Garage Rock",
            "Experimental Indie",
            "Surf Rock",
            "Alternative Country",
            "Indie Soul",
            "Art Rock",
            "Indie R&B",
            "Indietronica",
            "Emo",
            "Post-Rock",
            "Indie Pop-Rock",
            "Indie Synthpop",
            "Noise Rock",
            "Psych Folk",
            "Indie Blues"
          ],
          gospel: [
            "Traditional Gospel",
            "Contemporary Gospel",
            "Southern Gospel",
            "Black Gospel",
            "Urban Contemporary Gospel",
            "Gospel Blues",
            "Bluegrass Gospel",
            "Country Gospel",
            "Praise and Worship",
            "Christian Hip-Hop",
            "Gospel Jazz",
            "Reggae Gospel",
            "African Gospel",
            "Latin Gospel",
            "R&B Gospel",
            "Gospel Choir",
            "Acappella Gospel",
            "Instrumental Gospel",
            "Gospel Rap"
          ],
          world: [
            "African",
            "Arabic",
            "Asian",
            "Caribbean",
            "Celtic",
            "European",
            "Latin American",
            "Middle Eastern",
            "Native American",
            "Polynesian",
            "Reggae",
            "Ska",
            "Salsa",
            "Flamenco",
            "Bossa Nova",
            "Tango",
            "Fado",
            "Klezmer",
            "Balkan",
            "Afrobeat",
            "Mongolian Throat Singing",
            "Indian Classical",
            "Gamelan",
            "Sufi Music",
            "Zydeco",
            "Kora Music",
            "Andean Music",
            "Irish Traditional",
            "Gypsy Jazz",
            "Bollywood",
            "Bhangra",
            "Jawaiian",
            "Hawaiian Slack Key Guitar",
            "Calypso",
            "Cuban Son",
            "Taiko Drumming",
            "African Highlife",
            "Merengue",
            "Tuvan Throat Singing"
          ]
        },
        // Data sourced from https://unicode.org/emoji/charts/full-emoji-list.html
        emojis: {
          smileys_and_emotion: [
            "0x1f600",
            "0x1f603",
            "0x1f604",
            "0x1f601",
            "0x1f606",
            "0x1f605",
            "0x1f923",
            "0x1f602",
            "0x1f642",
            "0x1f643",
            "0x1fae0",
            "0x1f609",
            "0x1f60a",
            "0x1f607",
            "0x1f970",
            "0x1f60d",
            "0x1f929",
            "0x1f618",
            "0x1f617",
            "0x263a",
            "0x1f61a",
            "0x1f619",
            "0x1f972",
            "0x1f60b",
            "0x1f61b",
            "0x1f61c",
            "0x1f92a",
            "0x1f61d",
            "0x1f911",
            "0x1f917",
            "0x1f92d",
            "0x1fae2",
            "0x1fae3",
            "0x1f92b",
            "0x1f914",
            "0x1fae1",
            "0x1f910",
            "0x1f928",
            "0x1f610",
            "0x1f611",
            "0x1f636",
            "0x1fae5",
            "0x1f636",
            "0x200d",
            "0x1f32b",
            "0xfe0f",
            "0x1f60f",
            "0x1f612",
            "0x1f644",
            "0x1f62c",
            "0x1f62e",
            "0x200d",
            "0x1f4a8",
            "0x1f925",
            "0x1fae8",
            "0x1f642",
            "0x200d",
            "0x2194",
            "0xfe0f",
            "0x1f642",
            "0x200d",
            "0x2195",
            "0xfe0f",
            "0x1f60c",
            "0x1f614",
            "0x1f62a",
            "0x1f924",
            "0x1f634",
            "0x1f637",
            "0x1f912",
            "0x1f915",
            "0x1f922",
            "0x1f92e",
            "0x1f927",
            "0x1f975",
            "0x1f976",
            "0x1f974",
            "0x1f635",
            "0x1f635",
            "0x200d",
            "0x1f4ab",
            "0x1f92f",
            "0x1f920",
            "0x1f973",
            "0x1f978",
            "0x1f60e",
            "0x1f913",
            "0x1f9d0",
            "0x1f615",
            "0x1fae4",
            "0x1f61f",
            "0x1f641",
            "0x2639",
            "0x1f62e",
            "0x1f62f",
            "0x1f632",
            "0x1f633",
            "0x1f97a",
            "0x1f979",
            "0x1f626",
            "0x1f627",
            "0x1f628",
            "0x1f630",
            "0x1f625",
            "0x1f622",
            "0x1f62d",
            "0x1f631",
            "0x1f616",
            "0x1f623",
            "0x1f61e",
            "0x1f613",
            "0x1f629",
            "0x1f62b",
            "0x1f971",
            "0x1f624",
            "0x1f621",
            "0x1f620",
            "0x1f92c",
            "0x1f608",
            "0x1f47f",
            "0x1f480",
            "0x2620",
            "0x1f4a9",
            "0x1f921",
            "0x1f479",
            "0x1f47a",
            "0x1f47b",
            "0x1f47d",
            "0x1f47e",
            "0x1f916",
            "0x1f63a",
            "0x1f638",
            "0x1f639",
            "0x1f63b",
            "0x1f63c",
            "0x1f63d",
            "0x1f640",
            "0x1f63f",
            "0x1f63e",
            "0x1f648",
            "0x1f649",
            "0x1f64a",
            "0x1f48c",
            "0x1f498",
            "0x1f49d",
            "0x1f496",
            "0x1f497",
            "0x1f493",
            "0x1f49e",
            "0x1f495",
            "0x1f49f",
            "0x2763",
            "0x1f494",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f525",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1fa79",
            "0x2764",
            "0x1fa77",
            "0x1f9e1",
            "0x1f49b",
            "0x1f49a",
            "0x1f499",
            "0x1fa75",
            "0x1f49c",
            "0x1f90e",
            "0x1f5a4",
            "0x1fa76",
            "0x1f90d",
            "0x1f48b",
            "0x1f4af",
            "0x1f4a2",
            "0x1f4a5",
            "0x1f4ab",
            "0x1f4a6",
            "0x1f4a8",
            "0x1f573",
            "0x1f4ac",
            "0x1f441",
            "0xfe0f",
            "0x200d",
            "0x1f5e8",
            "0xfe0f",
            "0x1f5e8",
            "0x1f5ef",
            "0x1f4ad",
            "0x1f4a4"
          ],
          people_and_body: [
            "0x1f44b",
            "0x1f91a",
            "0x1f590",
            "0x270b",
            "0x1f596",
            "0x1faf1",
            "0x1faf2",
            "0x1faf3",
            "0x1faf4",
            "0x1faf7",
            "0x1faf8",
            "0x1f44c",
            "0x1f90c",
            "0x1f90f",
            "0x270c",
            "0x1f91e",
            "0x1faf0",
            "0x1f91f",
            "0x1f918",
            "0x1f919",
            "0x1f448",
            "0x1f449",
            "0x1f446",
            "0x1f595",
            "0x1f447",
            "0x261d",
            "0x1faf5",
            "0x1f44d",
            "0x1f44e",
            "0x270a",
            "0x1f44a",
            "0x1f91b",
            "0x1f91c",
            "0x1f44f",
            "0x1f64c",
            "0x1faf6",
            "0x1f450",
            "0x1f932",
            "0x1f91d",
            "0x1f64f",
            "0x270d",
            "0x1f485",
            "0x1f933",
            "0x1f4aa",
            "0x1f9be",
            "0x1f9bf",
            "0x1f9b5",
            "0x1f9b6",
            "0x1f442",
            "0x1f9bb",
            "0x1f443",
            "0x1f9e0",
            "0x1fac0",
            "0x1fac1",
            "0x1f9b7",
            "0x1f9b4",
            "0x1f440",
            "0x1f441",
            "0x1f445",
            "0x1f444",
            "0x1fae6",
            "0x1f476",
            "0x1f9d2",
            "0x1f466",
            "0x1f467",
            "0x1f9d1",
            "0x1f471",
            "0x1f468",
            "0x1f9d4",
            "0x1f9d4",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9d4",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x1f9b0",
            "0x1f468",
            "0x200d",
            "0x1f9b1",
            "0x1f468",
            "0x200d",
            "0x1f9b3",
            "0x1f468",
            "0x200d",
            "0x1f9b2",
            "0x1f469",
            "0x1f469",
            "0x200d",
            "0x1f9b0",
            "0x1f9d1",
            "0x200d",
            "0x1f9b0",
            "0x1f469",
            "0x200d",
            "0x1f9b1",
            "0x1f9d1",
            "0x200d",
            "0x1f9b1",
            "0x1f469",
            "0x200d",
            "0x1f9b3",
            "0x1f9d1",
            "0x200d",
            "0x1f9b3",
            "0x1f469",
            "0x200d",
            "0x1f9b2",
            "0x1f9d1",
            "0x200d",
            "0x1f9b2",
            "0x1f471",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f471",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9d3",
            "0x1f474",
            "0x1f475",
            "0x1f64d",
            "0x1f64d",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f64d",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f64e",
            "0x1f64e",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f64e",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f645",
            "0x1f645",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f645",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f646",
            "0x1f646",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f646",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f481",
            "0x1f481",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f481",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f64b",
            "0x1f64b",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f64b",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9cf",
            "0x1f9cf",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9cf",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f647",
            "0x1f647",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f647",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f926",
            "0x1f926",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f926",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f937",
            "0x1f937",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f937",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x2695",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x2695",
            "0xfe0f",
            "0x1f469",
            "0x200d",
            "0x2695",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x1f393",
            "0x1f468",
            "0x200d",
            "0x1f393",
            "0x1f469",
            "0x200d",
            "0x1f393",
            "0x1f9d1",
            "0x200d",
            "0x1f3eb",
            "0x1f468",
            "0x200d",
            "0x1f3eb",
            "0x1f469",
            "0x200d",
            "0x1f3eb",
            "0x1f9d1",
            "0x200d",
            "0x2696",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x2696",
            "0xfe0f",
            "0x1f469",
            "0x200d",
            "0x2696",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x1f33e",
            "0x1f468",
            "0x200d",
            "0x1f33e",
            "0x1f469",
            "0x200d",
            "0x1f33e",
            "0x1f9d1",
            "0x200d",
            "0x1f373",
            "0x1f468",
            "0x200d",
            "0x1f373",
            "0x1f469",
            "0x200d",
            "0x1f373",
            "0x1f9d1",
            "0x200d",
            "0x1f527",
            "0x1f468",
            "0x200d",
            "0x1f527",
            "0x1f469",
            "0x200d",
            "0x1f527",
            "0x1f9d1",
            "0x200d",
            "0x1f3ed",
            "0x1f468",
            "0x200d",
            "0x1f3ed",
            "0x1f469",
            "0x200d",
            "0x1f3ed",
            "0x1f9d1",
            "0x200d",
            "0x1f4bc",
            "0x1f468",
            "0x200d",
            "0x1f4bc",
            "0x1f469",
            "0x200d",
            "0x1f4bc",
            "0x1f9d1",
            "0x200d",
            "0x1f52c",
            "0x1f468",
            "0x200d",
            "0x1f52c",
            "0x1f469",
            "0x200d",
            "0x1f52c",
            "0x1f9d1",
            "0x200d",
            "0x1f4bb",
            "0x1f468",
            "0x200d",
            "0x1f4bb",
            "0x1f469",
            "0x200d",
            "0x1f4bb",
            "0x1f9d1",
            "0x200d",
            "0x1f3a4",
            "0x1f468",
            "0x200d",
            "0x1f3a4",
            "0x1f469",
            "0x200d",
            "0x1f3a4",
            "0x1f9d1",
            "0x200d",
            "0x1f3a8",
            "0x1f468",
            "0x200d",
            "0x1f3a8",
            "0x1f469",
            "0x200d",
            "0x1f3a8",
            "0x1f9d1",
            "0x200d",
            "0x2708",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x2708",
            "0xfe0f",
            "0x1f469",
            "0x200d",
            "0x2708",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x1f680",
            "0x1f468",
            "0x200d",
            "0x1f680",
            "0x1f469",
            "0x200d",
            "0x1f680",
            "0x1f9d1",
            "0x200d",
            "0x1f692",
            "0x1f468",
            "0x200d",
            "0x1f692",
            "0x1f469",
            "0x200d",
            "0x1f692",
            "0x1f46e",
            "0x1f46e",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f46e",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f575",
            "0x1f575",
            "0xfe0f",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f575",
            "0xfe0f",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f482",
            "0x1f482",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f482",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f977",
            "0x1f477",
            "0x1f477",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f477",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1fac5",
            "0x1f934",
            "0x1f478",
            "0x1f473",
            "0x1f473",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f473",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f472",
            "0x1f9d5",
            "0x1f935",
            "0x1f935",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f935",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f470",
            "0x1f470",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f470",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f930",
            "0x1fac3",
            "0x1fac4",
            "0x1f931",
            "0x1f469",
            "0x200d",
            "0x1f37c",
            "0x1f468",
            "0x200d",
            "0x1f37c",
            "0x1f9d1",
            "0x200d",
            "0x1f37c",
            "0x1f47c",
            "0x1f385",
            "0x1f936",
            "0x1f9d1",
            "0x200d",
            "0x1f384",
            "0x1f9b8",
            "0x1f9b8",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9b8",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9b9",
            "0x1f9b9",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9b9",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9d9",
            "0x1f9d9",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9d9",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9da",
            "0x1f9da",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9da",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9db",
            "0x1f9db",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9db",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9dc",
            "0x1f9dc",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9dc",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9dd",
            "0x1f9dd",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9dd",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9de",
            "0x1f9de",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9de",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9df",
            "0x1f9df",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9df",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9cc",
            "0x1f486",
            "0x1f486",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f486",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f487",
            "0x1f487",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f487",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f6b6",
            "0x1f6b6",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f6b6",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f6b6",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f6b6",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f6b6",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f9cd",
            "0x1f9cd",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9cd",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9ce",
            "0x1f9ce",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9ce",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9ce",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f9ce",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f9ce",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x1f9af",
            "0x1f9d1",
            "0x200d",
            "0x1f9af",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x1f9af",
            "0x1f468",
            "0x200d",
            "0x1f9af",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f469",
            "0x200d",
            "0x1f9af",
            "0x1f469",
            "0x200d",
            "0x1f9af",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x1f9bc",
            "0x1f9d1",
            "0x200d",
            "0x1f9bc",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x1f9bc",
            "0x1f468",
            "0x200d",
            "0x1f9bc",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f469",
            "0x200d",
            "0x1f9bc",
            "0x1f469",
            "0x200d",
            "0x1f9bc",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f9d1",
            "0x200d",
            "0x1f9bd",
            "0x1f9d1",
            "0x200d",
            "0x1f9bd",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f468",
            "0x200d",
            "0x1f9bd",
            "0x1f468",
            "0x200d",
            "0x1f9bd",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f469",
            "0x200d",
            "0x1f9bd",
            "0x1f469",
            "0x200d",
            "0x1f9bd",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f3c3",
            "0x1f3c3",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f3c3",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f3c3",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f3c3",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f3c3",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x200d",
            "0x27a1",
            "0xfe0f",
            "0x1f483",
            "0x1f57a",
            "0x1f574",
            "0x1f46f",
            "0x1f46f",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f46f",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9d6",
            "0x1f9d6",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9d6",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9d7",
            "0x1f9d7",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9d7",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f93a",
            "0x1f3c7",
            "0x26f7",
            "0x1f3c2",
            "0x1f3cc",
            "0x1f3cc",
            "0xfe0f",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f3cc",
            "0xfe0f",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f3c4",
            "0x1f3c4",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f3c4",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f6a3",
            "0x1f6a3",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f6a3",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f3ca",
            "0x1f3ca",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f3ca",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x26f9",
            "0x26f9",
            "0xfe0f",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x26f9",
            "0xfe0f",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f3cb",
            "0x1f3cb",
            "0xfe0f",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f3cb",
            "0xfe0f",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f6b4",
            "0x1f6b4",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f6b4",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f6b5",
            "0x1f6b5",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f6b5",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f938",
            "0x1f938",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f938",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f93c",
            "0x1f93c",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f93c",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f93d",
            "0x1f93d",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f93d",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f93e",
            "0x1f93e",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f93e",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f939",
            "0x1f939",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f939",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f9d8",
            "0x1f9d8",
            "0x200d",
            "0x2642",
            "0xfe0f",
            "0x1f9d8",
            "0x200d",
            "0x2640",
            "0xfe0f",
            "0x1f6c0",
            "0x1f6cc",
            "0x1f9d1",
            "0x200d",
            "0x1f91d",
            "0x200d",
            "0x1f9d1",
            "0x1f46d",
            "0x1f46b",
            "0x1f46c",
            "0x1f48f",
            "0x1f469",
            "0x200d",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f48b",
            "0x200d",
            "0x1f468",
            "0x1f468",
            "0x200d",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f48b",
            "0x200d",
            "0x1f468",
            "0x1f469",
            "0x200d",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f48b",
            "0x200d",
            "0x1f469",
            "0x1f491",
            "0x1f469",
            "0x200d",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f468",
            "0x1f468",
            "0x200d",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f468",
            "0x1f469",
            "0x200d",
            "0x2764",
            "0xfe0f",
            "0x200d",
            "0x1f469",
            "0x1f468",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x1f468",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f466",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f467",
            "0x1f468",
            "0x200d",
            "0x1f468",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f468",
            "0x200d",
            "0x1f467",
            "0x1f468",
            "0x200d",
            "0x1f468",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f468",
            "0x200d",
            "0x1f466",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f468",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f467",
            "0x1f469",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f466",
            "0x1f469",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x1f469",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f466",
            "0x1f469",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f466",
            "0x200d",
            "0x1f466",
            "0x1f469",
            "0x200d",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f467",
            "0x1f468",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f466",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f467",
            "0x1f468",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f466",
            "0x1f468",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f467",
            "0x1f469",
            "0x200d",
            "0x1f466",
            "0x1f469",
            "0x200d",
            "0x1f466",
            "0x200d",
            "0x1f466",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f466",
            "0x1f469",
            "0x200d",
            "0x1f467",
            "0x200d",
            "0x1f467",
            "0x1f5e3",
            "0x1f464",
            "0x1f465",
            "0x1fac2",
            "0x1f46a",
            "0x1f9d1",
            "0x200d",
            "0x1f9d1",
            "0x200d",
            "0x1f9d2",
            "0x1f9d1",
            "0x200d",
            "0x1f9d1",
            "0x200d",
            "0x1f9d2",
            "0x200d",
            "0x1f9d2",
            "0x1f9d1",
            "0x200d",
            "0x1f9d2",
            "0x1f9d1",
            "0x200d",
            "0x1f9d2",
            "0x200d",
            "0x1f9d2",
            "0x1f463"
          ],
          animals_and_nature: [
            "0x1f435",
            "0x1f412",
            "0x1f98d",
            "0x1f9a7",
            "0x1f436",
            "0x1f415",
            "0x1f9ae",
            "0x1f415",
            "0x200d",
            "0x1f9ba",
            "0x1f429",
            "0x1f43a",
            "0x1f98a",
            "0x1f99d",
            "0x1f431",
            "0x1f408",
            "0x1f408",
            "0x200d",
            "0x2b1b",
            "0x1f981",
            "0x1f42f",
            "0x1f405",
            "0x1f406",
            "0x1f434",
            "0x1face",
            "0x1facf",
            "0x1f40e",
            "0x1f984",
            "0x1f993",
            "0x1f98c",
            "0x1f9ac",
            "0x1f42e",
            "0x1f402",
            "0x1f403",
            "0x1f404",
            "0x1f437",
            "0x1f416",
            "0x1f417",
            "0x1f43d",
            "0x1f40f",
            "0x1f411",
            "0x1f410",
            "0x1f42a",
            "0x1f42b",
            "0x1f999",
            "0x1f992",
            "0x1f418",
            "0x1f9a3",
            "0x1f98f",
            "0x1f99b",
            "0x1f42d",
            "0x1f401",
            "0x1f400",
            "0x1f439",
            "0x1f430",
            "0x1f407",
            "0x1f43f",
            "0x1f9ab",
            "0x1f994",
            "0x1f987",
            "0x1f43b",
            "0x1f43b",
            "0x200d",
            "0x2744",
            "0xfe0f",
            "0x1f428",
            "0x1f43c",
            "0x1f9a5",
            "0x1f9a6",
            "0x1f9a8",
            "0x1f998",
            "0x1f9a1",
            "0x1f43e",
            "0x1f983",
            "0x1f414",
            "0x1f413",
            "0x1f423",
            "0x1f424",
            "0x1f425",
            "0x1f426",
            "0x1f427",
            "0x1f54a",
            "0x1f985",
            "0x1f986",
            "0x1f9a2",
            "0x1f989",
            "0x1f9a4",
            "0x1fab6",
            "0x1f9a9",
            "0x1f99a",
            "0x1f99c",
            "0x1fabd",
            "0x1f426",
            "0x200d",
            "0x2b1b",
            "0x1fabf",
            "0x1f426",
            "0x200d",
            "0x1f525",
            "0x1f438",
            "0x1f40a",
            "0x1f422",
            "0x1f98e",
            "0x1f40d",
            "0x1f432",
            "0x1f409",
            "0x1f995",
            "0x1f996",
            "0x1f433",
            "0x1f40b",
            "0x1f42c",
            "0x1f9ad",
            "0x1f41f",
            "0x1f420",
            "0x1f421",
            "0x1f988",
            "0x1f419",
            "0x1f41a",
            "0x1fab8",
            "0x1fabc",
            "0x1f40c",
            "0x1f98b",
            "0x1f41b",
            "0x1f41c",
            "0x1f41d",
            "0x1fab2",
            "0x1f41e",
            "0x1f997",
            "0x1fab3",
            "0x1f577",
            "0x1f578",
            "0x1f982",
            "0x1f99f",
            "0x1fab0",
            "0x1fab1",
            "0x1f9a0",
            "0x1f490",
            "0x1f338",
            "0x1f4ae",
            "0x1fab7",
            "0x1f3f5",
            "0x1f339",
            "0x1f940",
            "0x1f33a",
            "0x1f33b",
            "0x1f33c",
            "0x1f337",
            "0x1fabb",
            "0x1f331",
            "0x1fab4",
            "0x1f332",
            "0x1f333",
            "0x1f334",
            "0x1f335",
            "0x1f33e",
            "0x1f33f",
            "0x2618",
            "0x1f340",
            "0x1f341",
            "0x1f342",
            "0x1f343",
            "0x1fab9",
            "0x1faba",
            "0x1f344"
          ],
          food_and_drink: [
            "0x1f347",
            "0x1f348",
            "0x1f349",
            "0x1f34a",
            "0x1f34b",
            "0x1f34b",
            "0x200d",
            "0x1f7e9",
            "0x1f34c",
            "0x1f34d",
            "0x1f96d",
            "0x1f34e",
            "0x1f34f",
            "0x1f350",
            "0x1f351",
            "0x1f352",
            "0x1f353",
            "0x1fad0",
            "0x1f95d",
            "0x1f345",
            "0x1fad2",
            "0x1f965",
            "0x1f951",
            "0x1f346",
            "0x1f954",
            "0x1f955",
            "0x1f33d",
            "0x1f336",
            "0x1fad1",
            "0x1f952",
            "0x1f96c",
            "0x1f966",
            "0x1f9c4",
            "0x1f9c5",
            "0x1f95c",
            "0x1fad8",
            "0x1f330",
            "0x1fada",
            "0x1fadb",
            "0x1f344",
            "0x200d",
            "0x1f7eb",
            "0x1f35e",
            "0x1f950",
            "0x1f956",
            "0x1fad3",
            "0x1f968",
            "0x1f96f",
            "0x1f95e",
            "0x1f9c7",
            "0x1f9c0",
            "0x1f356",
            "0x1f357",
            "0x1f969",
            "0x1f953",
            "0x1f354",
            "0x1f35f",
            "0x1f355",
            "0x1f32d",
            "0x1f96a",
            "0x1f32e",
            "0x1f32f",
            "0x1fad4",
            "0x1f959",
            "0x1f9c6",
            "0x1f95a",
            "0x1f373",
            "0x1f958",
            "0x1f372",
            "0x1fad5",
            "0x1f963",
            "0x1f957",
            "0x1f37f",
            "0x1f9c8",
            "0x1f9c2",
            "0x1f96b",
            "0x1f371",
            "0x1f358",
            "0x1f359",
            "0x1f35a",
            "0x1f35b",
            "0x1f35c",
            "0x1f35d",
            "0x1f360",
            "0x1f362",
            "0x1f363",
            "0x1f364",
            "0x1f365",
            "0x1f96e",
            "0x1f361",
            "0x1f95f",
            "0x1f960",
            "0x1f961",
            "0x1f980",
            "0x1f99e",
            "0x1f990",
            "0x1f991",
            "0x1f9aa",
            "0x1f366",
            "0x1f367",
            "0x1f368",
            "0x1f369",
            "0x1f36a",
            "0x1f382",
            "0x1f370",
            "0x1f9c1",
            "0x1f967",
            "0x1f36b",
            "0x1f36c",
            "0x1f36d",
            "0x1f36e",
            "0x1f36f",
            "0x1f37c",
            "0x1f95b",
            "0x2615",
            "0x1fad6",
            "0x1f375",
            "0x1f376",
            "0x1f37e",
            "0x1f377",
            "0x1f378",
            "0x1f379",
            "0x1f37a",
            "0x1f37b",
            "0x1f942",
            "0x1f943",
            "0x1fad7",
            "0x1f964",
            "0x1f9cb",
            "0x1f9c3",
            "0x1f9c9",
            "0x1f9ca",
            "0x1f962",
            "0x1f37d",
            "0x1f374",
            "0x1f944",
            "0x1f52a",
            "0x1fad9",
            "0x1f3fa"
          ],
          travel_and_places: [
            "0x1f30d",
            "0x1f30e",
            "0x1f30f",
            "0x1f310",
            "0x1f5fa",
            "0x1f5fe",
            "0x1f9ed",
            "0x1f3d4",
            "0x26f0",
            "0x1f30b",
            "0x1f5fb",
            "0x1f3d5",
            "0x1f3d6",
            "0x1f3dc",
            "0x1f3dd",
            "0x1f3de",
            "0x1f3df",
            "0x1f3db",
            "0x1f3d7",
            "0x1f9f1",
            "0x1faa8",
            "0x1fab5",
            "0x1f6d6",
            "0x1f3d8",
            "0x1f3da",
            "0x1f3e0",
            "0x1f3e1",
            "0x1f3e2",
            "0x1f3e3",
            "0x1f3e4",
            "0x1f3e5",
            "0x1f3e6",
            "0x1f3e8",
            "0x1f3e9",
            "0x1f3ea",
            "0x1f3eb",
            "0x1f3ec",
            "0x1f3ed",
            "0x1f3ef",
            "0x1f3f0",
            "0x1f492",
            "0x1f5fc",
            "0x1f5fd",
            "0x26ea",
            "0x1f54c",
            "0x1f6d5",
            "0x1f54d",
            "0x26e9",
            "0x1f54b",
            "0x26f2",
            "0x26fa",
            "0x1f301",
            "0x1f303",
            "0x1f3d9",
            "0x1f304",
            "0x1f305",
            "0x1f306",
            "0x1f307",
            "0x1f309",
            "0x2668",
            "0x1f3a0",
            "0x1f6dd",
            "0x1f3a1",
            "0x1f3a2",
            "0x1f488",
            "0x1f3aa",
            "0x1f682",
            "0x1f683",
            "0x1f684",
            "0x1f685",
            "0x1f686",
            "0x1f687",
            "0x1f688",
            "0x1f689",
            "0x1f68a",
            "0x1f69d",
            "0x1f69e",
            "0x1f68b",
            "0x1f68c",
            "0x1f68d",
            "0x1f68e",
            "0x1f690",
            "0x1f691",
            "0x1f692",
            "0x1f693",
            "0x1f694",
            "0x1f695",
            "0x1f696",
            "0x1f697",
            "0x1f698",
            "0x1f699",
            "0x1f6fb",
            "0x1f69a",
            "0x1f69b",
            "0x1f69c",
            "0x1f3ce",
            "0x1f3cd",
            "0x1f6f5",
            "0x1f9bd",
            "0x1f9bc",
            "0x1f6fa",
            "0x1f6b2",
            "0x1f6f4",
            "0x1f6f9",
            "0x1f6fc",
            "0x1f68f",
            "0x1f6e3",
            "0x1f6e4",
            "0x1f6e2",
            "0x26fd",
            "0x1f6de",
            "0x1f6a8",
            "0x1f6a5",
            "0x1f6a6",
            "0x1f6d1",
            "0x1f6a7",
            "0x2693",
            "0x1f6df",
            "0x26f5",
            "0x1f6f6",
            "0x1f6a4",
            "0x1f6f3",
            "0x26f4",
            "0x1f6e5",
            "0x1f6a2",
            "0x2708",
            "0x1f6e9",
            "0x1f6eb",
            "0x1f6ec",
            "0x1fa82",
            "0x1f4ba",
            "0x1f681",
            "0x1f69f",
            "0x1f6a0",
            "0x1f6a1",
            "0x1f6f0",
            "0x1f680",
            "0x1f6f8",
            "0x1f6ce",
            "0x1f9f3",
            "0x231b",
            "0x23f3",
            "0x231a",
            "0x23f0",
            "0x23f1",
            "0x23f2",
            "0x1f570",
            "0x1f55b",
            "0x1f567",
            "0x1f550",
            "0x1f55c",
            "0x1f551",
            "0x1f55d",
            "0x1f552",
            "0x1f55e",
            "0x1f553",
            "0x1f55f",
            "0x1f554",
            "0x1f560",
            "0x1f555",
            "0x1f561",
            "0x1f556",
            "0x1f562",
            "0x1f557",
            "0x1f563",
            "0x1f558",
            "0x1f564",
            "0x1f559",
            "0x1f565",
            "0x1f55a",
            "0x1f566",
            "0x1f311",
            "0x1f312",
            "0x1f313",
            "0x1f314",
            "0x1f315",
            "0x1f316",
            "0x1f317",
            "0x1f318",
            "0x1f319",
            "0x1f31a",
            "0x1f31b",
            "0x1f31c",
            "0x1f321",
            "0x2600",
            "0x1f31d",
            "0x1f31e",
            "0x1fa90",
            "0x2b50",
            "0x1f31f",
            "0x1f320",
            "0x1f30c",
            "0x2601",
            "0x26c5",
            "0x26c8",
            "0x1f324",
            "0x1f325",
            "0x1f326",
            "0x1f327",
            "0x1f328",
            "0x1f329",
            "0x1f32a",
            "0x1f32b",
            "0x1f32c",
            "0x1f300",
            "0x1f308",
            "0x1f302",
            "0x2602",
            "0x2614",
            "0x26f1",
            "0x26a1",
            "0x2744",
            "0x2603",
            "0x26c4",
            "0x2604",
            "0x1f525",
            "0x1f4a7",
            "0x1f30a"
          ],
          activities: [
            "0x1f383",
            "0x1f384",
            "0x1f386",
            "0x1f387",
            "0x1f9e8",
            "0x2728",
            "0x1f388",
            "0x1f389",
            "0x1f38a",
            "0x1f38b",
            "0x1f38d",
            "0x1f38e",
            "0x1f38f",
            "0x1f390",
            "0x1f391",
            "0x1f9e7",
            "0x1f380",
            "0x1f381",
            "0x1f397",
            "0x1f39f",
            "0x1f3ab",
            "0x1f396",
            "0x1f3c6",
            "0x1f3c5",
            "0x1f947",
            "0x1f948",
            "0x1f949",
            "0x26bd",
            "0x26be",
            "0x1f94e",
            "0x1f3c0",
            "0x1f3d0",
            "0x1f3c8",
            "0x1f3c9",
            "0x1f3be",
            "0x1f94f",
            "0x1f3b3",
            "0x1f3cf",
            "0x1f3d1",
            "0x1f3d2",
            "0x1f94d",
            "0x1f3d3",
            "0x1f3f8",
            "0x1f94a",
            "0x1f94b",
            "0x1f945",
            "0x26f3",
            "0x26f8",
            "0x1f3a3",
            "0x1f93f",
            "0x1f3bd",
            "0x1f3bf",
            "0x1f6f7",
            "0x1f94c",
            "0x1f3af",
            "0x1fa80",
            "0x1fa81",
            "0x1f52b",
            "0x1f3b1",
            "0x1f52e",
            "0x1fa84",
            "0x1f3ae",
            "0x1f579",
            "0x1f3b0",
            "0x1f3b2",
            "0x1f9e9",
            "0x1f9f8",
            "0x1fa85",
            "0x1faa9",
            "0x1fa86",
            "0x2660",
            "0x2665",
            "0x2666",
            "0x2663",
            "0x265f",
            "0x1f0cf",
            "0x1f004",
            "0x1f3b4",
            "0x1f3ad",
            "0x1f5bc",
            "0x1f3a8",
            "0x1f9f5",
            "0x1faa1",
            "0x1f9f6",
            "0x1faa2"
          ],
          objects: [
            "0x1f453",
            "0x1f576",
            "0x1f97d",
            "0x1f97c",
            "0x1f9ba",
            "0x1f454",
            "0x1f455",
            "0x1f456",
            "0x1f9e3",
            "0x1f9e4",
            "0x1f9e5",
            "0x1f9e6",
            "0x1f457",
            "0x1f458",
            "0x1f97b",
            "0x1fa71",
            "0x1fa72",
            "0x1fa73",
            "0x1f459",
            "0x1f45a",
            "0x1faad",
            "0x1f45b",
            "0x1f45c",
            "0x1f45d",
            "0x1f6cd",
            "0x1f392",
            "0x1fa74",
            "0x1f45e",
            "0x1f45f",
            "0x1f97e",
            "0x1f97f",
            "0x1f460",
            "0x1f461",
            "0x1fa70",
            "0x1f462",
            "0x1faae",
            "0x1f451",
            "0x1f452",
            "0x1f3a9",
            "0x1f393",
            "0x1f9e2",
            "0x1fa96",
            "0x26d1",
            "0x1f4ff",
            "0x1f484",
            "0x1f48d",
            "0x1f48e",
            "0x1f507",
            "0x1f508",
            "0x1f509",
            "0x1f50a",
            "0x1f4e2",
            "0x1f4e3",
            "0x1f4ef",
            "0x1f514",
            "0x1f515",
            "0x1f3bc",
            "0x1f3b5",
            "0x1f3b6",
            "0x1f399",
            "0x1f39a",
            "0x1f39b",
            "0x1f3a4",
            "0x1f3a7",
            "0x1f4fb",
            "0x1f3b7",
            "0x1fa97",
            "0x1f3b8",
            "0x1f3b9",
            "0x1f3ba",
            "0x1f3bb",
            "0x1fa95",
            "0x1f941",
            "0x1fa98",
            "0x1fa87",
            "0x1fa88",
            "0x1f4f1",
            "0x1f4f2",
            "0x260e",
            "0x1f4de",
            "0x1f4df",
            "0x1f4e0",
            "0x1f50b",
            "0x1faab",
            "0x1f50c",
            "0x1f4bb",
            "0x1f5a5",
            "0x1f5a8",
            "0x2328",
            "0x1f5b1",
            "0x1f5b2",
            "0x1f4bd",
            "0x1f4be",
            "0x1f4bf",
            "0x1f4c0",
            "0x1f9ee",
            "0x1f3a5",
            "0x1f39e",
            "0x1f4fd",
            "0x1f3ac",
            "0x1f4fa",
            "0x1f4f7",
            "0x1f4f8",
            "0x1f4f9",
            "0x1f4fc",
            "0x1f50d",
            "0x1f50e",
            "0x1f56f",
            "0x1f4a1",
            "0x1f526",
            "0x1f3ee",
            "0x1fa94",
            "0x1f4d4",
            "0x1f4d5",
            "0x1f4d6",
            "0x1f4d7",
            "0x1f4d8",
            "0x1f4d9",
            "0x1f4da",
            "0x1f4d3",
            "0x1f4d2",
            "0x1f4c3",
            "0x1f4dc",
            "0x1f4c4",
            "0x1f4f0",
            "0x1f5de",
            "0x1f4d1",
            "0x1f516",
            "0x1f3f7",
            "0x1f4b0",
            "0x1fa99",
            "0x1f4b4",
            "0x1f4b5",
            "0x1f4b6",
            "0x1f4b7",
            "0x1f4b8",
            "0x1f4b3",
            "0x1f9fe",
            "0x1f4b9",
            "0x2709",
            "0x1f4e7",
            "0x1f4e8",
            "0x1f4e9",
            "0x1f4e4",
            "0x1f4e5",
            "0x1f4e6",
            "0x1f4eb",
            "0x1f4ea",
            "0x1f4ec",
            "0x1f4ed",
            "0x1f4ee",
            "0x1f5f3",
            "0x270f",
            "0x2712",
            "0x1f58b",
            "0x1f58a",
            "0x1f58c",
            "0x1f58d",
            "0x1f4dd",
            "0x1f4bc",
            "0x1f4c1",
            "0x1f4c2",
            "0x1f5c2",
            "0x1f4c5",
            "0x1f4c6",
            "0x1f5d2",
            "0x1f5d3",
            "0x1f4c7",
            "0x1f4c8",
            "0x1f4c9",
            "0x1f4ca",
            "0x1f4cb",
            "0x1f4cc",
            "0x1f4cd",
            "0x1f4ce",
            "0x1f587",
            "0x1f4cf",
            "0x1f4d0",
            "0x2702",
            "0x1f5c3",
            "0x1f5c4",
            "0x1f5d1",
            "0x1f512",
            "0x1f513",
            "0x1f50f",
            "0x1f510",
            "0x1f511",
            "0x1f5dd",
            "0x1f528",
            "0x1fa93",
            "0x26cf",
            "0x2692",
            "0x1f6e0",
            "0x1f5e1",
            "0x2694",
            "0x1f4a3",
            "0x1fa83",
            "0x1f3f9",
            "0x1f6e1",
            "0x1fa9a",
            "0x1f527",
            "0x1fa9b",
            "0x1f529",
            "0x2699",
            "0x1f5dc",
            "0x2696",
            "0x1f9af",
            "0x1f517",
            "0x26d3",
            "0xfe0f",
            "0x200d",
            "0x1f4a5",
            "0x26d3",
            "0x1fa9d",
            "0x1f9f0",
            "0x1f9f2",
            "0x1fa9c",
            "0x2697",
            "0x1f9ea",
            "0x1f9eb",
            "0x1f9ec",
            "0x1f52c",
            "0x1f52d",
            "0x1f4e1",
            "0x1f489",
            "0x1fa78",
            "0x1f48a",
            "0x1fa79",
            "0x1fa7c",
            "0x1fa7a",
            "0x1fa7b",
            "0x1f6aa",
            "0x1f6d7",
            "0x1fa9e",
            "0x1fa9f",
            "0x1f6cf",
            "0x1f6cb",
            "0x1fa91",
            "0x1f6bd",
            "0x1faa0",
            "0x1f6bf",
            "0x1f6c1",
            "0x1faa4",
            "0x1fa92",
            "0x1f9f4",
            "0x1f9f7",
            "0x1f9f9",
            "0x1f9fa",
            "0x1f9fb",
            "0x1faa3",
            "0x1f9fc",
            "0x1fae7",
            "0x1faa5",
            "0x1f9fd",
            "0x1f9ef",
            "0x1f6d2",
            "0x1f6ac",
            "0x26b0",
            "0x1faa6",
            "0x26b1",
            "0x1f9ff",
            "0x1faac",
            "0x1f5ff",
            "0x1faa7",
            "0x1faaa"
          ],
          symbols: [
            "0x1f3e7",
            "0x1f6ae",
            "0x1f6b0",
            "0x267f",
            "0x1f6b9",
            "0x1f6ba",
            "0x1f6bb",
            "0x1f6bc",
            "0x1f6be",
            "0x1f6c2",
            "0x1f6c3",
            "0x1f6c4",
            "0x1f6c5",
            "0x26a0",
            "0x1f6b8",
            "0x26d4",
            "0x1f6ab",
            "0x1f6b3",
            "0x1f6ad",
            "0x1f6af",
            "0x1f6b1",
            "0x1f6b7",
            "0x1f4f5",
            "0x1f51e",
            "0x2622",
            "0x2623",
            "0x2b06",
            "0x2197",
            "0x27a1",
            "0x2198",
            "0x2b07",
            "0x2199",
            "0x2b05",
            "0x2196",
            "0x2195",
            "0x2194",
            "0x21a9",
            "0x21aa",
            "0x2934",
            "0x2935",
            "0x1f503",
            "0x1f504",
            "0x1f519",
            "0x1f51a",
            "0x1f51b",
            "0x1f51c",
            "0x1f51d",
            "0x1f6d0",
            "0x269b",
            "0x1f549",
            "0x2721",
            "0x2638",
            "0x262f",
            "0x271d",
            "0x2626",
            "0x262a",
            "0x262e",
            "0x1f54e",
            "0x1f52f",
            "0x1faaf",
            "0x2648",
            "0x2649",
            "0x264a",
            "0x264b",
            "0x264c",
            "0x264d",
            "0x264e",
            "0x264f",
            "0x2650",
            "0x2651",
            "0x2652",
            "0x2653",
            "0x26ce",
            "0x1f500",
            "0x1f501",
            "0x1f502",
            "0x25b6",
            "0x23e9",
            "0x23ed",
            "0x23ef",
            "0x25c0",
            "0x23ea",
            "0x23ee",
            "0x1f53c",
            "0x23eb",
            "0x1f53d",
            "0x23ec",
            "0x23f8",
            "0x23f9",
            "0x23fa",
            "0x23cf",
            "0x1f3a6",
            "0x1f505",
            "0x1f506",
            "0x1f4f6",
            "0x1f6dc",
            "0x1f4f3",
            "0x1f4f4",
            "0x2640",
            "0x2642",
            "0x26a7",
            "0x2716",
            "0x2795",
            "0x2796",
            "0x2797",
            "0x1f7f0",
            "0x267e",
            "0x203c",
            "0x2049",
            "0x2753",
            "0x2754",
            "0x2755",
            "0x2757",
            "0x3030",
            "0x1f4b1",
            "0x1f4b2",
            "0x2695",
            "0x267b",
            "0x269c",
            "0x1f531",
            "0x1f4db",
            "0x1f530",
            "0x2b55",
            "0x2705",
            "0x2611",
            "0x2714",
            "0x274c",
            "0x274e",
            "0x27b0",
            "0x27bf",
            "0x303d",
            "0x2733",
            "0x2734",
            "0x2747",
            "0x00a9",
            "0x00ae",
            "0x2122",
            "0x0023",
            "0xfe0f",
            "0x20e3",
            "0x002a",
            "0xfe0f",
            "0x20e3",
            "0x0030",
            "0xfe0f",
            "0x20e3",
            "0x0031",
            "0xfe0f",
            "0x20e3",
            "0x0032",
            "0xfe0f",
            "0x20e3",
            "0x0033",
            "0xfe0f",
            "0x20e3",
            "0x0034",
            "0xfe0f",
            "0x20e3",
            "0x0035",
            "0xfe0f",
            "0x20e3",
            "0x0036",
            "0xfe0f",
            "0x20e3",
            "0x0037",
            "0xfe0f",
            "0x20e3",
            "0x0038",
            "0xfe0f",
            "0x20e3",
            "0x0039",
            "0xfe0f",
            "0x20e3",
            "0x1f51f",
            "0x1f520",
            "0x1f521",
            "0x1f522",
            "0x1f523",
            "0x1f524",
            "0x1f170",
            "0x1f18e",
            "0x1f171",
            "0x1f191",
            "0x1f192",
            "0x1f193",
            "0x2139",
            "0x1f194",
            "0x24c2",
            "0x1f195",
            "0x1f196",
            "0x1f17e",
            "0x1f197",
            "0x1f17f",
            "0x1f198",
            "0x1f199",
            "0x1f19a",
            "0x1f201",
            "0x1f202",
            "0x1f237",
            "0x1f236",
            "0x1f22f",
            "0x1f250",
            "0x1f239",
            "0x1f21a",
            "0x1f232",
            "0x1f251",
            "0x1f238",
            "0x1f234",
            "0x1f233",
            "0x3297",
            "0x3299",
            "0x1f23a",
            "0x1f235",
            "0x1f534",
            "0x1f7e0",
            "0x1f7e1",
            "0x1f7e2",
            "0x1f535",
            "0x1f7e3",
            "0x1f7e4",
            "0x26ab",
            "0x26aa",
            "0x1f7e5",
            "0x1f7e7",
            "0x1f7e8",
            "0x1f7e9",
            "0x1f7e6",
            "0x1f7ea",
            "0x1f7eb",
            "0x2b1b",
            "0x2b1c",
            "0x25fc",
            "0x25fb",
            "0x25fe",
            "0x25fd",
            "0x25aa",
            "0x25ab",
            "0x1f536",
            "0x1f537",
            "0x1f538",
            "0x1f539",
            "0x1f53a",
            "0x1f53b",
            "0x1f4a0",
            "0x1f518",
            "0x1f533",
            "0x1f532"
          ],
          flags: [
            "0x1f3c1",
            "0x1f6a9",
            "0x1f38c",
            "0x1f3f4",
            "0x1f3f3",
            "0x1f3f3",
            "0xfe0f",
            "0x200d",
            "0x1f308",
            "0x1f3f3",
            "0xfe0f",
            "0x200d",
            "0x26a7",
            "0xfe0f",
            "0x1f3f4",
            "0x200d",
            "0x2620",
            "0xfe0f",
            "0x1f1e6",
            "0x1f1e8",
            "0x1f1e6",
            "0x1f1e9",
            "0x1f1e6",
            "0x1f1ea",
            "0x1f1e6",
            "0x1f1eb",
            "0x1f1e6",
            "0x1f1ec",
            "0x1f1e6",
            "0x1f1ee",
            "0x1f1e6",
            "0x1f1f1",
            "0x1f1e6",
            "0x1f1f2",
            "0x1f1e6",
            "0x1f1f4",
            "0x1f1e6",
            "0x1f1f6",
            "0x1f1e6",
            "0x1f1f7",
            "0x1f1e6",
            "0x1f1f8",
            "0x1f1e6",
            "0x1f1f9",
            "0x1f1e6",
            "0x1f1fa",
            "0x1f1e6",
            "0x1f1fc",
            "0x1f1e6",
            "0x1f1fd",
            "0x1f1e6",
            "0x1f1ff",
            "0x1f1e7",
            "0x1f1e6",
            "0x1f1e7",
            "0x1f1e7",
            "0x1f1e7",
            "0x1f1e9",
            "0x1f1e7",
            "0x1f1ea",
            "0x1f1e7",
            "0x1f1eb",
            "0x1f1e7",
            "0x1f1ec",
            "0x1f1e7",
            "0x1f1ed",
            "0x1f1e7",
            "0x1f1ee",
            "0x1f1e7",
            "0x1f1ef",
            "0x1f1e7",
            "0x1f1f1",
            "0x1f1e7",
            "0x1f1f2",
            "0x1f1e7",
            "0x1f1f3",
            "0x1f1e7",
            "0x1f1f4",
            "0x1f1e7",
            "0x1f1f6",
            "0x1f1e7",
            "0x1f1f7",
            "0x1f1e7",
            "0x1f1f8",
            "0x1f1e7",
            "0x1f1f9",
            "0x1f1e7",
            "0x1f1fb",
            "0x1f1e7",
            "0x1f1fc",
            "0x1f1e7",
            "0x1f1fe",
            "0x1f1e7",
            "0x1f1ff",
            "0x1f1e8",
            "0x1f1e6",
            "0x1f1e8",
            "0x1f1e8",
            "0x1f1e8",
            "0x1f1e9",
            "0x1f1e8",
            "0x1f1eb",
            "0x1f1e8",
            "0x1f1ec",
            "0x1f1e8",
            "0x1f1ed",
            "0x1f1e8",
            "0x1f1ee",
            "0x1f1e8",
            "0x1f1f0",
            "0x1f1e8",
            "0x1f1f1",
            "0x1f1e8",
            "0x1f1f2",
            "0x1f1e8",
            "0x1f1f3",
            "0x1f1e8",
            "0x1f1f4",
            "0x1f1e8",
            "0x1f1f5",
            "0x1f1e8",
            "0x1f1f7",
            "0x1f1e8",
            "0x1f1fa",
            "0x1f1e8",
            "0x1f1fb",
            "0x1f1e8",
            "0x1f1fc",
            "0x1f1e8",
            "0x1f1fd",
            "0x1f1e8",
            "0x1f1fe",
            "0x1f1e8",
            "0x1f1ff",
            "0x1f1e9",
            "0x1f1ea",
            "0x1f1e9",
            "0x1f1ec",
            "0x1f1e9",
            "0x1f1ef",
            "0x1f1e9",
            "0x1f1f0",
            "0x1f1e9",
            "0x1f1f2",
            "0x1f1e9",
            "0x1f1f4",
            "0x1f1e9",
            "0x1f1ff",
            "0x1f1ea",
            "0x1f1e6",
            "0x1f1ea",
            "0x1f1e8",
            "0x1f1ea",
            "0x1f1ea",
            "0x1f1ea",
            "0x1f1ec",
            "0x1f1ea",
            "0x1f1ed",
            "0x1f1ea",
            "0x1f1f7",
            "0x1f1ea",
            "0x1f1f8",
            "0x1f1ea",
            "0x1f1f9",
            "0x1f1ea",
            "0x1f1fa",
            "0x1f1eb",
            "0x1f1ee",
            "0x1f1eb",
            "0x1f1ef",
            "0x1f1eb",
            "0x1f1f0",
            "0x1f1eb",
            "0x1f1f2",
            "0x1f1eb",
            "0x1f1f4",
            "0x1f1eb",
            "0x1f1f7",
            "0x1f1ec",
            "0x1f1e6",
            "0x1f1ec",
            "0x1f1e7",
            "0x1f1ec",
            "0x1f1e9",
            "0x1f1ec",
            "0x1f1ea",
            "0x1f1ec",
            "0x1f1eb",
            "0x1f1ec",
            "0x1f1ec",
            "0x1f1ec",
            "0x1f1ed",
            "0x1f1ec",
            "0x1f1ee",
            "0x1f1ec",
            "0x1f1f1",
            "0x1f1ec",
            "0x1f1f2",
            "0x1f1ec",
            "0x1f1f3",
            "0x1f1ec",
            "0x1f1f5",
            "0x1f1ec",
            "0x1f1f6",
            "0x1f1ec",
            "0x1f1f7",
            "0x1f1ec",
            "0x1f1f8",
            "0x1f1ec",
            "0x1f1f9",
            "0x1f1ec",
            "0x1f1fa",
            "0x1f1ec",
            "0x1f1fc",
            "0x1f1ec",
            "0x1f1fe",
            "0x1f1ed",
            "0x1f1f0",
            "0x1f1ed",
            "0x1f1f2",
            "0x1f1ed",
            "0x1f1f3",
            "0x1f1ed",
            "0x1f1f7",
            "0x1f1ed",
            "0x1f1f9",
            "0x1f1ed",
            "0x1f1fa",
            "0x1f1ee",
            "0x1f1e8",
            "0x1f1ee",
            "0x1f1e9",
            "0x1f1ee",
            "0x1f1ea",
            "0x1f1ee",
            "0x1f1f1",
            "0x1f1ee",
            "0x1f1f2",
            "0x1f1ee",
            "0x1f1f3",
            "0x1f1ee",
            "0x1f1f4",
            "0x1f1ee",
            "0x1f1f6",
            "0x1f1ee",
            "0x1f1f7",
            "0x1f1ee",
            "0x1f1f8",
            "0x1f1ee",
            "0x1f1f9",
            "0x1f1ef",
            "0x1f1ea",
            "0x1f1ef",
            "0x1f1f2",
            "0x1f1ef",
            "0x1f1f4",
            "0x1f1ef",
            "0x1f1f5",
            "0x1f1f0",
            "0x1f1ea",
            "0x1f1f0",
            "0x1f1ec",
            "0x1f1f0",
            "0x1f1ed",
            "0x1f1f0",
            "0x1f1ee",
            "0x1f1f0",
            "0x1f1f2",
            "0x1f1f0",
            "0x1f1f3",
            "0x1f1f0",
            "0x1f1f5",
            "0x1f1f0",
            "0x1f1f7",
            "0x1f1f0",
            "0x1f1fc",
            "0x1f1f0",
            "0x1f1fe",
            "0x1f1f0",
            "0x1f1ff",
            "0x1f1f1",
            "0x1f1e6",
            "0x1f1f1",
            "0x1f1e7",
            "0x1f1f1",
            "0x1f1e8",
            "0x1f1f1",
            "0x1f1ee",
            "0x1f1f1",
            "0x1f1f0",
            "0x1f1f1",
            "0x1f1f7",
            "0x1f1f1",
            "0x1f1f8",
            "0x1f1f1",
            "0x1f1f9",
            "0x1f1f1",
            "0x1f1fa",
            "0x1f1f1",
            "0x1f1fb",
            "0x1f1f1",
            "0x1f1fe",
            "0x1f1f2",
            "0x1f1e6",
            "0x1f1f2",
            "0x1f1e8",
            "0x1f1f2",
            "0x1f1e9",
            "0x1f1f2",
            "0x1f1ea",
            "0x1f1f2",
            "0x1f1eb",
            "0x1f1f2",
            "0x1f1ec",
            "0x1f1f2",
            "0x1f1ed",
            "0x1f1f2",
            "0x1f1f0",
            "0x1f1f2",
            "0x1f1f1",
            "0x1f1f2",
            "0x1f1f2",
            "0x1f1f2",
            "0x1f1f3",
            "0x1f1f2",
            "0x1f1f4",
            "0x1f1f2",
            "0x1f1f5",
            "0x1f1f2",
            "0x1f1f6",
            "0x1f1f2",
            "0x1f1f7",
            "0x1f1f2",
            "0x1f1f8",
            "0x1f1f2",
            "0x1f1f9",
            "0x1f1f2",
            "0x1f1fa",
            "0x1f1f2",
            "0x1f1fb",
            "0x1f1f2",
            "0x1f1fc",
            "0x1f1f2",
            "0x1f1fd",
            "0x1f1f2",
            "0x1f1fe",
            "0x1f1f2",
            "0x1f1ff",
            "0x1f1f3",
            "0x1f1e6",
            "0x1f1f3",
            "0x1f1e8",
            "0x1f1f3",
            "0x1f1ea",
            "0x1f1f3",
            "0x1f1eb",
            "0x1f1f3",
            "0x1f1ec",
            "0x1f1f3",
            "0x1f1ee",
            "0x1f1f3",
            "0x1f1f1",
            "0x1f1f3",
            "0x1f1f4",
            "0x1f1f3",
            "0x1f1f5",
            "0x1f1f3",
            "0x1f1f7",
            "0x1f1f3",
            "0x1f1fa",
            "0x1f1f3",
            "0x1f1ff",
            "0x1f1f4",
            "0x1f1f2",
            "0x1f1f5",
            "0x1f1e6",
            "0x1f1f5",
            "0x1f1ea",
            "0x1f1f5",
            "0x1f1eb",
            "0x1f1f5",
            "0x1f1ec",
            "0x1f1f5",
            "0x1f1ed",
            "0x1f1f5",
            "0x1f1f0",
            "0x1f1f5",
            "0x1f1f1",
            "0x1f1f5",
            "0x1f1f2",
            "0x1f1f5",
            "0x1f1f3",
            "0x1f1f5",
            "0x1f1f7",
            "0x1f1f5",
            "0x1f1f8",
            "0x1f1f5",
            "0x1f1f9",
            "0x1f1f5",
            "0x1f1fc",
            "0x1f1f5",
            "0x1f1fe",
            "0x1f1f6",
            "0x1f1e6",
            "0x1f1f7",
            "0x1f1ea",
            "0x1f1f7",
            "0x1f1f4",
            "0x1f1f7",
            "0x1f1f8",
            "0x1f1f7",
            "0x1f1fa",
            "0x1f1f7",
            "0x1f1fc",
            "0x1f1f8",
            "0x1f1e6",
            "0x1f1f8",
            "0x1f1e7",
            "0x1f1f8",
            "0x1f1e8",
            "0x1f1f8",
            "0x1f1e9",
            "0x1f1f8",
            "0x1f1ea",
            "0x1f1f8",
            "0x1f1ec",
            "0x1f1f8",
            "0x1f1ed",
            "0x1f1f8",
            "0x1f1ee",
            "0x1f1f8",
            "0x1f1ef",
            "0x1f1f8",
            "0x1f1f0",
            "0x1f1f8",
            "0x1f1f1",
            "0x1f1f8",
            "0x1f1f2",
            "0x1f1f8",
            "0x1f1f3",
            "0x1f1f8",
            "0x1f1f4",
            "0x1f1f8",
            "0x1f1f7",
            "0x1f1f8",
            "0x1f1f8",
            "0x1f1f8",
            "0x1f1f9",
            "0x1f1f8",
            "0x1f1fb",
            "0x1f1f8",
            "0x1f1fd",
            "0x1f1f8",
            "0x1f1fe",
            "0x1f1f8",
            "0x1f1ff",
            "0x1f1f9",
            "0x1f1e6",
            "0x1f1f9",
            "0x1f1e8",
            "0x1f1f9",
            "0x1f1e9",
            "0x1f1f9",
            "0x1f1eb",
            "0x1f1f9",
            "0x1f1ec",
            "0x1f1f9",
            "0x1f1ed",
            "0x1f1f9",
            "0x1f1ef",
            "0x1f1f9",
            "0x1f1f0",
            "0x1f1f9",
            "0x1f1f1",
            "0x1f1f9",
            "0x1f1f2",
            "0x1f1f9",
            "0x1f1f3",
            "0x1f1f9",
            "0x1f1f4",
            "0x1f1f9",
            "0x1f1f7",
            "0x1f1f9",
            "0x1f1f9",
            "0x1f1f9",
            "0x1f1fb",
            "0x1f1f9",
            "0x1f1fc",
            "0x1f1f9",
            "0x1f1ff",
            "0x1f1fa",
            "0x1f1e6",
            "0x1f1fa",
            "0x1f1ec",
            "0x1f1fa",
            "0x1f1f2",
            "0x1f1fa",
            "0x1f1f3",
            "0x1f1fa",
            "0x1f1f8",
            "0x1f1fa",
            "0x1f1fe",
            "0x1f1fa",
            "0x1f1ff",
            "0x1f1fb",
            "0x1f1e6",
            "0x1f1fb",
            "0x1f1e8",
            "0x1f1fb",
            "0x1f1ea",
            "0x1f1fb",
            "0x1f1ec",
            "0x1f1fb",
            "0x1f1ee",
            "0x1f1fb",
            "0x1f1f3",
            "0x1f1fb",
            "0x1f1fa",
            "0x1f1fc",
            "0x1f1eb",
            "0x1f1fc",
            "0x1f1f8",
            "0x1f1fd",
            "0x1f1f0",
            "0x1f1fe",
            "0x1f1ea",
            "0x1f1fe",
            "0x1f1f9",
            "0x1f1ff",
            "0x1f1e6",
            "0x1f1ff",
            "0x1f1f2",
            "0x1f1ff",
            "0x1f1fc",
            "0x1f3f4",
            "0xe0067",
            "0xe0062",
            "0xe0065",
            "0xe006e",
            "0xe0067",
            "0xe007f",
            "0x1f3f4",
            "0xe0067",
            "0xe0062",
            "0xe0073",
            "0xe0063",
            "0xe0074",
            "0xe007f",
            "0x1f3f4",
            "0xe0067",
            "0xe0062",
            "0xe0077",
            "0xe006c",
            "0xe0073",
            "0xe007f"
          ]
        }
      }, G = Object.prototype.hasOwnProperty, F = Object.keys || function(a) {
        var s = [];
        for (var f in a)
          G.call(a, f) && s.push(f);
        return s;
      };
      function E(a, s) {
        for (var f = F(a), g, y = 0, k = f.length; y < k; y++)
          g = f[y], s[g] = a[g] || s[g];
      }
      function V(a, s) {
        for (var f = 0, g = a.length; f < g; f++)
          s[f] = a[f];
      }
      function Z(a, s) {
        var f = Array.isArray(a), g = s || (f ? new Array(a.length) : {});
        return f ? V(a, g) : E(a, g), g;
      }
      l.prototype.get = function(a) {
        return Z(B[a]);
      }, l.prototype.mac_address = function(a) {
        a = m(a), a.separator || (a.separator = a.networkVersion ? "." : ":");
        var s = "ABCDEF1234567890", f = "";
        return a.networkVersion ? f = this.n(this.string, 3, { pool: s, length: 4 }).join(a.separator) : f = this.n(this.string, 6, { pool: s, length: 2 }).join(a.separator), f;
      }, l.prototype.normal = function(a) {
        if (a = m(a, { mean: 0, dev: 1, pool: [] }), b(
          a.pool.constructor !== Array,
          "Chance: The pool option must be a valid array."
        ), b(
          typeof a.mean != "number",
          "Chance: Mean (mean) must be a number"
        ), b(
          typeof a.dev != "number",
          "Chance: Standard deviation (dev) must be a number"
        ), a.pool.length > 0)
          return this.normal_pool(a);
        var s, f, g, y, k = a.mean, I = a.dev;
        do
          f = this.random() * 2 - 1, g = this.random() * 2 - 1, s = f * f + g * g;
        while (s >= 1);
        return y = f * Math.sqrt(-2 * Math.log(s) / s), I * y + k;
      }, l.prototype.normal_pool = function(a) {
        var s = 0;
        do {
          var f = Math.round(this.normal({ mean: a.mean, dev: a.dev }));
          if (f < a.pool.length && f >= 0)
            return a.pool[f];
          s++;
        } while (s < 100);
        throw new RangeError("Chance: Your pool is too small for the given mean and standard deviation. Please adjust.");
      }, l.prototype.radio = function(a) {
        a = m(a, { side: "?" });
        var s = "";
        switch (a.side.toLowerCase()) {
          case "east":
          case "e":
            s = "W";
            break;
          case "west":
          case "w":
            s = "K";
            break;
          default:
            s = this.character({ pool: "KW" });
            break;
        }
        return s + this.character({ alpha: !0, casing: "upper" }) + this.character({ alpha: !0, casing: "upper" }) + this.character({ alpha: !0, casing: "upper" });
      }, l.prototype.set = function(a, s) {
        typeof a == "string" ? B[a] = s : B = Z(a, B);
      }, l.prototype.tv = function(a) {
        return this.radio(a);
      }, l.prototype.cnpj = function() {
        var a = this.n(this.natural, 8, { max: 9 }), s = 2 + a[7] * 6 + a[6] * 7 + a[5] * 8 + a[4] * 9 + a[3] * 2 + a[2] * 3 + a[1] * 4 + a[0] * 5;
        s = 11 - s % 11, s >= 10 && (s = 0);
        var f = s * 2 + 3 + a[7] * 7 + a[6] * 8 + a[5] * 9 + a[4] * 2 + a[3] * 3 + a[2] * 4 + a[1] * 5 + a[0] * 6;
        return f = 11 - f % 11, f >= 10 && (f = 0), "" + a[0] + a[1] + "." + a[2] + a[3] + a[4] + "." + a[5] + a[6] + a[7] + "/0001-" + s + f;
      }, l.prototype.emotion = function() {
        return this.pick(this.get("emotions"));
      }, l.prototype.mersenne_twister = function(a) {
        return new K(a);
      }, l.prototype.blueimp_md5 = function() {
        return new $();
      };
      var K = function(a) {
        a === void 0 && (a = Math.floor(Math.random() * Math.pow(10, 13))), this.N = 624, this.M = 397, this.MATRIX_A = 2567483615, this.UPPER_MASK = 2147483648, this.LOWER_MASK = 2147483647, this.mt = new Array(this.N), this.mti = this.N + 1, this.init_genrand(a);
      };
      K.prototype.init_genrand = function(a) {
        for (this.mt[0] = a >>> 0, this.mti = 1; this.mti < this.N; this.mti++)
          a = this.mt[this.mti - 1] ^ this.mt[this.mti - 1] >>> 30, this.mt[this.mti] = (((a & 4294901760) >>> 16) * 1812433253 << 16) + (a & 65535) * 1812433253 + this.mti, this.mt[this.mti] >>>= 0;
      }, K.prototype.init_by_array = function(a, s) {
        var f = 1, g = 0, y, k;
        for (this.init_genrand(19650218), y = this.N > s ? this.N : s; y; y--)
          k = this.mt[f - 1] ^ this.mt[f - 1] >>> 30, this.mt[f] = (this.mt[f] ^ (((k & 4294901760) >>> 16) * 1664525 << 16) + (k & 65535) * 1664525) + a[g] + g, this.mt[f] >>>= 0, f++, g++, f >= this.N && (this.mt[0] = this.mt[this.N - 1], f = 1), g >= s && (g = 0);
        for (y = this.N - 1; y; y--)
          k = this.mt[f - 1] ^ this.mt[f - 1] >>> 30, this.mt[f] = (this.mt[f] ^ (((k & 4294901760) >>> 16) * 1566083941 << 16) + (k & 65535) * 1566083941) - f, this.mt[f] >>>= 0, f++, f >= this.N && (this.mt[0] = this.mt[this.N - 1], f = 1);
        this.mt[0] = 2147483648;
      }, K.prototype.genrand_int32 = function() {
        var a, s = new Array(0, this.MATRIX_A);
        if (this.mti >= this.N) {
          var f;
          for (this.mti === this.N + 1 && this.init_genrand(5489), f = 0; f < this.N - this.M; f++)
            a = this.mt[f] & this.UPPER_MASK | this.mt[f + 1] & this.LOWER_MASK, this.mt[f] = this.mt[f + this.M] ^ a >>> 1 ^ s[a & 1];
          for (; f < this.N - 1; f++)
            a = this.mt[f] & this.UPPER_MASK | this.mt[f + 1] & this.LOWER_MASK, this.mt[f] = this.mt[f + (this.M - this.N)] ^ a >>> 1 ^ s[a & 1];
          a = this.mt[this.N - 1] & this.UPPER_MASK | this.mt[0] & this.LOWER_MASK, this.mt[this.N - 1] = this.mt[this.M - 1] ^ a >>> 1 ^ s[a & 1], this.mti = 0;
        }
        return a = this.mt[this.mti++], a ^= a >>> 11, a ^= a << 7 & 2636928640, a ^= a << 15 & 4022730752, a ^= a >>> 18, a >>> 0;
      }, K.prototype.genrand_int31 = function() {
        return this.genrand_int32() >>> 1;
      }, K.prototype.genrand_real1 = function() {
        return this.genrand_int32() * (1 / 4294967295);
      }, K.prototype.random = function() {
        return this.genrand_int32() * (1 / 4294967296);
      }, K.prototype.genrand_real3 = function() {
        return (this.genrand_int32() + 0.5) * (1 / 4294967296);
      }, K.prototype.genrand_res53 = function() {
        var a = this.genrand_int32() >>> 5, s = this.genrand_int32() >>> 6;
        return (a * 67108864 + s) * (1 / 9007199254740992);
      };
      var $ = function() {
      };
      $.prototype.VERSION = "1.0.1", $.prototype.safe_add = function(s, f) {
        var g = (s & 65535) + (f & 65535), y = (s >> 16) + (f >> 16) + (g >> 16);
        return y << 16 | g & 65535;
      }, $.prototype.bit_roll = function(a, s) {
        return a << s | a >>> 32 - s;
      }, $.prototype.md5_cmn = function(a, s, f, g, y, k) {
        return this.safe_add(this.bit_roll(this.safe_add(this.safe_add(s, a), this.safe_add(g, k)), y), f);
      }, $.prototype.md5_ff = function(a, s, f, g, y, k, I) {
        return this.md5_cmn(s & f | ~s & g, a, s, y, k, I);
      }, $.prototype.md5_gg = function(a, s, f, g, y, k, I) {
        return this.md5_cmn(s & g | f & ~g, a, s, y, k, I);
      }, $.prototype.md5_hh = function(a, s, f, g, y, k, I) {
        return this.md5_cmn(s ^ f ^ g, a, s, y, k, I);
      }, $.prototype.md5_ii = function(a, s, f, g, y, k, I) {
        return this.md5_cmn(f ^ (s | ~g), a, s, y, k, I);
      }, $.prototype.binl_md5 = function(a, s) {
        a[s >> 5] |= 128 << s % 32, a[(s + 64 >>> 9 << 4) + 14] = s;
        var f, g, y, k, I, _ = 1732584193, S = -271733879, M = -1732584194, T = 271733878;
        for (f = 0; f < a.length; f += 16)
          g = _, y = S, k = M, I = T, _ = this.md5_ff(_, S, M, T, a[f], 7, -680876936), T = this.md5_ff(T, _, S, M, a[f + 1], 12, -389564586), M = this.md5_ff(M, T, _, S, a[f + 2], 17, 606105819), S = this.md5_ff(S, M, T, _, a[f + 3], 22, -1044525330), _ = this.md5_ff(_, S, M, T, a[f + 4], 7, -176418897), T = this.md5_ff(T, _, S, M, a[f + 5], 12, 1200080426), M = this.md5_ff(M, T, _, S, a[f + 6], 17, -1473231341), S = this.md5_ff(S, M, T, _, a[f + 7], 22, -45705983), _ = this.md5_ff(_, S, M, T, a[f + 8], 7, 1770035416), T = this.md5_ff(T, _, S, M, a[f + 9], 12, -1958414417), M = this.md5_ff(M, T, _, S, a[f + 10], 17, -42063), S = this.md5_ff(S, M, T, _, a[f + 11], 22, -1990404162), _ = this.md5_ff(_, S, M, T, a[f + 12], 7, 1804603682), T = this.md5_ff(T, _, S, M, a[f + 13], 12, -40341101), M = this.md5_ff(M, T, _, S, a[f + 14], 17, -1502002290), S = this.md5_ff(S, M, T, _, a[f + 15], 22, 1236535329), _ = this.md5_gg(_, S, M, T, a[f + 1], 5, -165796510), T = this.md5_gg(T, _, S, M, a[f + 6], 9, -1069501632), M = this.md5_gg(M, T, _, S, a[f + 11], 14, 643717713), S = this.md5_gg(S, M, T, _, a[f], 20, -373897302), _ = this.md5_gg(_, S, M, T, a[f + 5], 5, -701558691), T = this.md5_gg(T, _, S, M, a[f + 10], 9, 38016083), M = this.md5_gg(M, T, _, S, a[f + 15], 14, -660478335), S = this.md5_gg(S, M, T, _, a[f + 4], 20, -405537848), _ = this.md5_gg(_, S, M, T, a[f + 9], 5, 568446438), T = this.md5_gg(T, _, S, M, a[f + 14], 9, -1019803690), M = this.md5_gg(M, T, _, S, a[f + 3], 14, -187363961), S = this.md5_gg(S, M, T, _, a[f + 8], 20, 1163531501), _ = this.md5_gg(_, S, M, T, a[f + 13], 5, -1444681467), T = this.md5_gg(T, _, S, M, a[f + 2], 9, -51403784), M = this.md5_gg(M, T, _, S, a[f + 7], 14, 1735328473), S = this.md5_gg(S, M, T, _, a[f + 12], 20, -1926607734), _ = this.md5_hh(_, S, M, T, a[f + 5], 4, -378558), T = this.md5_hh(T, _, S, M, a[f + 8], 11, -2022574463), M = this.md5_hh(M, T, _, S, a[f + 11], 16, 1839030562), S = this.md5_hh(S, M, T, _, a[f + 14], 23, -35309556), _ = this.md5_hh(_, S, M, T, a[f + 1], 4, -1530992060), T = this.md5_hh(T, _, S, M, a[f + 4], 11, 1272893353), M = this.md5_hh(M, T, _, S, a[f + 7], 16, -155497632), S = this.md5_hh(S, M, T, _, a[f + 10], 23, -1094730640), _ = this.md5_hh(_, S, M, T, a[f + 13], 4, 681279174), T = this.md5_hh(T, _, S, M, a[f], 11, -358537222), M = this.md5_hh(M, T, _, S, a[f + 3], 16, -722521979), S = this.md5_hh(S, M, T, _, a[f + 6], 23, 76029189), _ = this.md5_hh(_, S, M, T, a[f + 9], 4, -640364487), T = this.md5_hh(T, _, S, M, a[f + 12], 11, -421815835), M = this.md5_hh(M, T, _, S, a[f + 15], 16, 530742520), S = this.md5_hh(S, M, T, _, a[f + 2], 23, -995338651), _ = this.md5_ii(_, S, M, T, a[f], 6, -198630844), T = this.md5_ii(T, _, S, M, a[f + 7], 10, 1126891415), M = this.md5_ii(M, T, _, S, a[f + 14], 15, -1416354905), S = this.md5_ii(S, M, T, _, a[f + 5], 21, -57434055), _ = this.md5_ii(_, S, M, T, a[f + 12], 6, 1700485571), T = this.md5_ii(T, _, S, M, a[f + 3], 10, -1894986606), M = this.md5_ii(M, T, _, S, a[f + 10], 15, -1051523), S = this.md5_ii(S, M, T, _, a[f + 1], 21, -2054922799), _ = this.md5_ii(_, S, M, T, a[f + 8], 6, 1873313359), T = this.md5_ii(T, _, S, M, a[f + 15], 10, -30611744), M = this.md5_ii(M, T, _, S, a[f + 6], 15, -1560198380), S = this.md5_ii(S, M, T, _, a[f + 13], 21, 1309151649), _ = this.md5_ii(_, S, M, T, a[f + 4], 6, -145523070), T = this.md5_ii(T, _, S, M, a[f + 11], 10, -1120210379), M = this.md5_ii(M, T, _, S, a[f + 2], 15, 718787259), S = this.md5_ii(S, M, T, _, a[f + 9], 21, -343485551), _ = this.safe_add(_, g), S = this.safe_add(S, y), M = this.safe_add(M, k), T = this.safe_add(T, I);
        return [_, S, M, T];
      }, $.prototype.binl2rstr = function(a) {
        var s, f = "";
        for (s = 0; s < a.length * 32; s += 8)
          f += String.fromCharCode(a[s >> 5] >>> s % 32 & 255);
        return f;
      }, $.prototype.rstr2binl = function(a) {
        var s, f = [];
        for (f[(a.length >> 2) - 1] = void 0, s = 0; s < f.length; s += 1)
          f[s] = 0;
        for (s = 0; s < a.length * 8; s += 8)
          f[s >> 5] |= (a.charCodeAt(s / 8) & 255) << s % 32;
        return f;
      }, $.prototype.rstr_md5 = function(a) {
        return this.binl2rstr(this.binl_md5(this.rstr2binl(a), a.length * 8));
      }, $.prototype.rstr_hmac_md5 = function(a, s) {
        var f, g = this.rstr2binl(a), y = [], k = [], I;
        for (y[15] = k[15] = void 0, g.length > 16 && (g = this.binl_md5(g, a.length * 8)), f = 0; f < 16; f += 1)
          y[f] = g[f] ^ 909522486, k[f] = g[f] ^ 1549556828;
        return I = this.binl_md5(y.concat(this.rstr2binl(s)), 512 + s.length * 8), this.binl2rstr(this.binl_md5(k.concat(I), 640));
      }, $.prototype.rstr2hex = function(a) {
        var s = "0123456789abcdef", f = "", g, y;
        for (y = 0; y < a.length; y += 1)
          g = a.charCodeAt(y), f += s.charAt(g >>> 4 & 15) + s.charAt(g & 15);
        return f;
      }, $.prototype.str2rstr_utf8 = function(a) {
        return unescape(encodeURIComponent(a));
      }, $.prototype.raw_md5 = function(a) {
        return this.rstr_md5(this.str2rstr_utf8(a));
      }, $.prototype.hex_md5 = function(a) {
        return this.rstr2hex(this.raw_md5(a));
      }, $.prototype.raw_hmac_md5 = function(a, s) {
        return this.rstr_hmac_md5(this.str2rstr_utf8(a), this.str2rstr_utf8(s));
      }, $.prototype.hex_hmac_md5 = function(a, s) {
        return this.rstr2hex(this.raw_hmac_md5(a, s));
      }, $.prototype.md5 = function(a, s, f) {
        return s ? f ? this.raw_hmac_md5(s, a) : this.hex_hmac_md5(s, a) : f ? this.raw_md5(a) : this.hex_md5(a);
      }, x.exports && (e = x.exports = l), e.Chance = l, typeof importScripts < "u" && (chance = new l(), self.Chance = l), typeof window == "object" && typeof window.document == "object" && (window.Chance = l, window.chance = new l());
    })();
  })(me, me.exports)), me.exports;
}
var da = ua();
const ma = /* @__PURE__ */ fa(da);
function $e(x, e, n, t) {
  const r = new ma(Ie++), o = n.toUpperCase(), d = x.toUpperCase(), c = e.toUpperCase();
  if (t != null && 0 < t.length) {
    const h = t.length;
    let l = t[Math.floor(ce() * (h - 0)) + 0];
    return !o.startsWith("INTEGER") && !o.startsWith("NUMBER") && !o.startsWith("DATE") && (!l.toLowerCase || l.toLowerCase() !== "null") && (!l.charAt || l.charAt(0) !== "q" && l.charAt(1) !== "'") && (l.charAt && l.charAt(0) === "'" && (l = l.substring(1, l.length - 1)), l = l.split("'").join("''"), l = "'" + l + "'"), l;
  }
  if (c === "NAME" && 0 <= d.indexOf("DEPARTMENT")) {
    const u = ["Sales", "Finance", "Delivery", "Manufacturing"];
    return "'" + u[Math.floor(ce() * u.length)] + "'";
  }
  if (r[c.toLowerCase()] !== void 0 && c.indexOf("NAME") < 0)
    return "'" + r[c.toLowerCase()]() + "'";
  if (c === "FIRST_NAME")
    return "'" + r.first() + "'";
  if (c === "LAST_NAME")
    return "'" + r.last() + "'";
  if (0 <= c.indexOf("NAME"))
    return "'" + r.name() + "'";
  if (0 < c.indexOf("ADDRESS"))
    return "'" + r.address() + "'";
  if (c === "LOCATION")
    return "'" + r.city() + "'";
  if (c === "DESCRIPTION") {
    let u = r.paragraph({ sentences: 2 });
    const h = le(n, !1, !0, "");
    let l = 400, m = -1;
    for (let p = 0; p < h.length; p++) {
      const b = h[p].value;
      if (b === "(") {
        m = p + 1;
        continue;
      }
      if (0 < m && b === ")") {
        l = parseInt(h[m].value);
        break;
      }
    }
    return l < u.length && (u = u.substring(0, l)), "'" + u + "'";
  }
  if (c === "JOB") {
    const u = ["Engineer", "Consultant", "Architect", "Manager", "Analyst", "Specialist", "Evangelist", "Salesman"];
    return "'" + u[Math.floor(ce() * u.length)] + "'";
  }
  return o.startsWith("INTEGER") || o.startsWith("NUMBER") ? Math.floor(ce() * 100) : o.startsWith("DATE") || o.startsWith("TIMESTAMP") ? "sysdate-" + Math.floor(ce() * 100) : o === "BLOB" || o === "LONG" ? "null" : "'N/A'";
}
let Ie = 1;
function ha() {
  Ie = 1;
}
function ce() {
  const x = Math.sin(Ie++) * 1e4;
  return x - Math.floor(x);
}
function De(x) {
  return x.lastIndexOf(`,
`) === x.length - 2 && (x = x.substring(0, x.length - 2) + `
`), x;
}
function ze(x, e, n, t) {
  let r = [];
  if (x == null || typeof x != "object") return null;
  const o = x[n];
  o != null && e === t && r.push(o);
  for (const d in x) {
    const c = x[d], u = ze(c, d, n, t);
    u !== null && (r = r.concat(u));
  }
  return r;
}
class pa {
  constructor(e) {
    this._ddl = e;
  }
  // ── Shared helpers ────────────────────────────────────────────────────────
  /**
   * Resolve the dialect column type for a FK column by inspecting the
   * referenced table's explicit PK. Returns null for auto-generated PKs
   * so the caller can fall back to the FK column's own convention type.
   */
  _fkColType(e) {
    const n = e.getExplicitPkName();
    if (n == null || n.includes(",")) return null;
    const t = e.findChild(n);
    return t != null ? this.colType(t._inferTypeFull()) : e.getPkType();
  }
  // ── Shared: ERD generation ────────────────────────────────────────────────
  generateERD() {
    const e = this._ddl.descendants(), n = { items: [], links: [] };
    for (const r of e) {
      if (r.inferType() !== "table") continue;
      const o = {
        name: this._ddl.objPrefix("no schema") + r.parseName(),
        schema: this._ddl.getOptionValue("schema") || null,
        columns: []
      };
      n.items.push(o);
      const d = r.getGenIdColName();
      if (d != null && !r.isOption("pk"))
        o.columns.push({ name: d, datatype: "number" });
      else {
        const h = r.getExplicitPkName();
        if (h != null && !h.includes(",")) {
          const l = r.findChild(h);
          o.columns.push({ name: h, datatype: l ? this.colType(l._inferTypeFull()) : "number" });
        }
      }
      r.lateInitFks();
      for (const h in r.fks ?? {}) {
        const l = r.fks[h];
        if (h.includes(",")) {
          const v = this._ddl.find(l);
          for (const C of be(h, ", ")) {
            if (C === ",") continue;
            const w = v?.findChild(C);
            o.columns.push({ name: C, datatype: w ? this.colType(w._inferTypeFull()) : "number" });
          }
          continue;
        }
        const m = r.findChild(h);
        let p = m ? m.inferType() : "number", b = h;
        const A = this._ddl.find(l);
        A != null ? p = this._fkColType(A) ?? p : this._ddl.find(h)?.isMany2One?.() && !h.endsWith("_id") && (b = (O(h) ?? h) + "_id"), o.columns.push({ name: b, datatype: p });
      }
      const c = r.getExplicitPkName();
      for (const h of r.children)
        if (h.inferType() !== "table" && h.refId() == null && h.parseName() !== c && (o.columns.push({ name: h.parseName(), datatype: this.colType(h._inferTypeFull()) }), h.indexOf("file") > 0)) {
          const l = h.parseName(), m = { base: "varchar", varcharLen: 255, colName: l, needsBoolCheck: !1, isNativeBoolean: !1, parent_child: "" }, p = { base: "date", colName: l, needsBoolCheck: !1, isNativeBoolean: !1, parent_child: "" };
          o.columns.push({ name: l + "_filename", datatype: this.colType(m) }), o.columns.push({ name: l + "_mimetype", datatype: this.colType(m) }), o.columns.push({ name: l + "_charset", datatype: this.colType(m) }), o.columns.push({ name: l + "_lastupd", datatype: this.colType(p) });
        }
      const u = r.trimmedContent().toUpperCase();
      if (this._ddl.optionEQvalue("rowkey", !0) || u.includes("/ROWKEY")) {
        const h = { base: "varchar", varcharLen: 30, colName: "row_key", needsBoolCheck: !1, isNativeBoolean: !1, parent_child: "" };
        o.columns.push({ name: "row_key", datatype: this.colType(h) });
      }
      if ((this._ddl.optionEQvalue("rowVersion", "yes") || u.includes("/ROWVERSION")) && o.columns.push({ name: "row_version", datatype: "integer" }), this._ddl.optionEQvalue("Audit Columns", "yes") || u.includes("/AUDITCOLS")) {
        let h = this._ddl.getOptionValue("auditdate") || "";
        h || (h = this._ddl.getOptionValue("Date Data Type") ?? "date");
        const l = { base: h.toLowerCase(), colName: "", needsBoolCheck: !1, isNativeBoolean: !1, parent_child: "" }, m = { base: "varchar", varcharLen: 255, colName: "", needsBoolCheck: !1, isNativeBoolean: !1, parent_child: "" };
        o.columns.push({ name: this._ddl.getOptionValue("createdcol"), datatype: this.colType(l) }), o.columns.push({ name: this._ddl.getOptionValue("createdbycol"), datatype: this.colType(m) }), o.columns.push({ name: this._ddl.getOptionValue("updatedcol"), datatype: this.colType(l) }), o.columns.push({ name: this._ddl.getOptionValue("updatedbycol"), datatype: this.colType(m) });
      }
      if (this._ddl.optionEQvalue("tenantid", !0) && !r.isOption("notenantid") && r.findChild("tenant_id") === null) {
        const h = { base: "number", colName: "tenant_id", needsBoolCheck: !1, isNativeBoolean: !1, parent_child: "" };
        o.columns.push({ name: "tenant_id", datatype: this.colType(h) });
      }
    }
    for (const r of e)
      if (r.inferType() === "table") {
        this.generateDDL(r);
        for (const o in r.fks ?? {}) {
          const d = r.fks[o], c = this._ddl.find(d);
          if (c == null) continue;
          const u = c.getExplicitPkName() ?? "id", h = r.findChild(o), l = h == null || h.isOption("nn") || h.isOption("notnull"), m = {
            source: this._ddl.objPrefix("no schema") + d,
            source_id: u,
            target: this._ddl.objPrefix("no schema") + r.parseName(),
            target_id: o
          };
          l && (m.mandatory = l), n.links.push(m);
        }
      }
    if (this._ddl.optionEQvalue("tenantid", !0)) {
      const r = String(this._ddl.getOptionValue("tenantref") || "tenants"), o = this._ddl.find(r);
      if (o != null) {
        const d = o.getExplicitPkName() ?? "id", c = this._ddl.objPrefix("no schema") + r;
        for (const u of e)
          u.inferType() === "table" && (u.isOption("notenantid") || u.findChild("tenant_id") === null && n.links.push({
            source: c,
            source_id: d,
            target: this._ddl.objPrefix("no schema") + u.parseName(),
            target_id: "tenant_id",
            mandatory: !0
          }));
      }
    }
    const t = {};
    for (const r of e) {
      if (r.inferType() !== "table") continue;
      const o = r.getAnnotationValue("TGROUP");
      o != null && (t[o] || (t[o] = []), t[o].push(this._ddl.objPrefix("no schema") + r.parseName()));
    }
    return Object.keys(t).length > 0 && (n.groups = t), n;
  }
  // ── Shared: INSERT data generation ────────────────────────────────────────
  /**
   * Dialect hook: SQL to reset an IDENTITY/sequence column after bulk inserts.
   * Return empty string if the dialect needs no reset statement.
   */
  identityRestartSql(e, n, t) {
    return "";
  }
  _isContainedIn(e, n) {
    for (const t of n)
      if (t.parseName() === e.parseName()) return !0;
    return !1;
  }
  _orderedTableNodes(e) {
    const n = [e];
    for (const t of e.descendants().slice(1))
      t.children.length !== 0 && (t.isMany2One() ? this._isContainedIn(t, n) || n.unshift(t) : this._isContainedIn(t, n) || n.push(t));
    return n;
  }
  generateData(e, n) {
    if (ha(), this._ddl.optionEQvalue("inserts", !1)) return "";
    const t = this.inserts4tbl(e, n), r = this._orderedTableNodes(e);
    let o = "";
    for (const d of r) {
      const c = this._ddl.objPrefix() + d.parseName(), u = t[c];
      u != null && (o += u);
    }
    return o;
  }
  inserts4tbl(e, n) {
    let t = {};
    if (this._ddl.optionEQvalue("inserts", !1)) return {};
    const r = this._ddl.objPrefix() + e.parseName();
    let o = "";
    for (let c = 0; c < e.cardinality(); c++) {
      let u = null;
      if (n != null) {
        const h = n[r];
        h != null && Array.isArray(h) && (u = h[c]);
      }
      o += this._buildInsertStatement(e, c, u, r);
    }
    o !== "" && (o += `
commit;

`);
    const d = e.getGenIdColName();
    d != null && 1 < e.cardinality() && !this._ddl.optionEQvalue("pk", "guid") && (o += this.identityRestartSql(r, d, e.cardinality() + 1)), t[r] = o;
    for (const c of e.children)
      c.children.length > 0 && (t = { ...t, ...this.inserts4tbl(c, n) });
    return t;
  }
  _buildInsertStatement(e, n, t, r) {
    let o = "insert into " + r + ` (
`;
    const d = e.getGenIdColName();
    let c = null, u = null;
    d != null ? (c = d, o += i + c + `,
`) : (c = e.getExplicitPkName(), c != null && (o += i + c + `,
`));
    for (let h in e.fks ?? {}) {
      let l = e.fks[h], m = "", p = this._ddl.find(l);
      p == null && (p = this._ddl.find(h), p?.isMany2One?.() && !h.endsWith("_id") && (l = h, h = O(h) ?? h, m = "_id")), o += i + h + m + `,
`;
    }
    for (const h of e.regularColumns())
      d != null && h.parseName() === "id" || h.isOption("pk") || (o += i + h.parseName() + `,
`);
    if (o = De(o), o += `) values (
`, d != null)
      u = n + 1, o += i + u + `,
`;
    else if (c != null) {
      const h = c, l = ze(this._ddl.data, null, h, e.parseName());
      let m = -1;
      t != null && (m = t[h]), l != null && l[n] != null && (m = l[n]), m !== -1 && typeof m == "string" && (m = "'" + m + "'"), u = m !== -1 ? m : n + 1, o += i + u + `,
`;
    }
    for (const h in e.fks ?? {}) {
      const l = e.fks[h], { type: m, values: p } = this._resolveFkSampleValues(e, h, l, t, u, r), b = String(this._ddl.getOptionValue("Data Language") ?? "EN");
      o += i + String(Ne(b, $e(r, (O(l) ?? l) + "_id", m, p))) + `,
`;
    }
    for (const h of e.regularColumns()) {
      if (d != null && h.parseName() === "id" || h.parseName() === e.getExplicitPkName()) continue;
      let l = h.parseValues();
      const m = h.parseName();
      if (t != null) {
        const A = t[m];
        A != null && (l = [A]);
      }
      const p = String(this._ddl.getOptionValue("Data Language") ?? "EN"), b = $e(r, m, this.colType(h._inferTypeFull()), l);
      o += i + String(Ne(p, b)) + `,
`;
    }
    return o = De(o), o += `);
`, o;
  }
  _resolveFkSampleValues(e, n, t, r, o, d) {
    const c = this._ddl.find(t);
    let u = [], h = "INTEGER";
    for (let l = 1; l <= (c?.cardinality() ?? 0); l++) u.push(l);
    if (r != null) {
      const l = r, m = l[n];
      if (m != null)
        typeof m == "string" && (h = "STRING"), u = [m];
      else {
        const p = d + "_" + t, b = this._ddl.data?.[p];
        if (b != null)
          for (const A in b) {
            const v = b[A];
            if (v[d + "_id"] === o) {
              const C = v[n];
              C != null && (typeof C == "string" && (h = "STRING"), u = [C]);
              break;
            }
          }
        else {
          const A = c?.getPkName() ?? null, v = A != null ? l[A] : void 0;
          v != null && (typeof v == "string" && (h = "STRING"), u = [v]);
        }
      }
    }
    return { type: h, values: u };
  }
}
const xa = "generated by default on null as identity";
function se(x, e, n) {
  switch (x.base) {
    case "varchar":
      return `varchar2(${x.varcharLen ?? 4e3}${e})`;
    case "number":
      return x.numericSpec ? `number${x.numericSpec}` : "number";
    case "integer":
      return "integer";
    case "date":
      return "date";
    case "timestamp":
      return "timestamp";
    case "tswtz":
      return "timestamp with time zone";
    case "tswltz":
      return "timestamp with local time zone";
    case "clob":
      return "clob";
    case "blob":
      return "blob";
    case "boolean":
      return "boolean";
    case "geometry":
      return "sdo_geometry";
    case "json":
      return n ? "json" : `clob check (${x.colName} is json)`;
    case "vector":
      return `vector${x.vectorSpec ?? "(*,*,*)"}`;
    default:
      return x.base;
  }
}
function Q(x) {
  const e = x.getOptionValue("db");
  return e != null && e.length > 0 && 23 <= (ie(e) ?? 0);
}
function Ve(x, e, n) {
  return e.optionEQvalue("pk", "identityDataType") ? xa : e.optionEQvalue("pk", "seq") ? ("default on null " + x + n.seq + ".NEXTVAL ").toLowerCase() : e.optionEQvalue("pk", "guid") ? "default on null to_number(sys_guid(), 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') " : "not null";
}
function ba(x) {
  return x.lastIndexOf(`,
`) === x.length - 2 && (x = x.substring(0, x.length - 2) + `
`), x;
}
class ga {
  constructor(e, n) {
    this.ctx = e, this.naming = n;
  }
  generateView(e) {
    if (e.inferType() !== "view" && e.inferType() !== "dv") return "";
    if (this.ctx.optionEQvalue("Duality View", "yes") || e.inferType() === "dv")
      try {
        return this.generateDualityView(e);
      } catch (u) {
        if (u.message === e.one2many2oneUnsupoorted) return "";
        throw u;
      }
    const n = this.ctx.objPrefix() + e.parseName(), t = e.src, r = this._buildViewSetup(e, t);
    if (r === null) return "";
    let o = "create or replace view " + n;
    e.annotations !== null && (o += `
annotations (` + e.annotations + ")"), o += ` as
`, o += `select
`, o += this._buildViewColList(e, t, r.aliasMap, r.tblCache, r.colCnts, r.tblTransCols, r.maxLen), o = ba(o);
    const { sortedTables: d, joinConditions: c } = this._sortViewTables(e, t, r.tblCache);
    return o += `from
`, o += this._buildViewFromClause(e, d, r.aliasMap, c, r.tblTransCols, r.tblCache), o = o.toLowerCase(), o.endsWith(`
`) && (o = o.trimEnd()), o.endsWith(`
`) || (o += `
`), o += `/
`, o.toLowerCase();
  }
  _buildViewSetup(e, n) {
    const t = {}, r = {};
    for (let u = 2; u < n.length; u++)
      t[n[u].value] = _e(n[u].value), r[n[u].value] = this.ctx.find(n[u].value);
    let o = 0;
    for (let u = 2; u < n.length; u++) {
      const h = r[n[u].value];
      if (h === null) return null;
      const l = t[n[u].value];
      let m = (l + ".id").length;
      o < m && (o = m);
      for (const p of h.children)
        m = (l + "." + p.parseName()).length, o < m && (o = m);
    }
    const d = {};
    for (let u = 2; u < n.length; u++) {
      const h = r[n[u].value];
      if (h !== null)
        for (const l of h.children)
          d[l.parseName()] = (d[l.parseName()] ?? 0) + 1;
    }
    for (let u = 2; u < n.length; u++) {
      const h = (O(n[u].value) ?? n[u].value) + "_id";
      d[h] = (d[h] ?? 0) + 1;
    }
    const c = {};
    for (let u = 2; u < n.length; u++) {
      const h = r[n[u].value];
      if (h !== null) {
        const l = h.getTransColumns();
        if (l.length > 0) {
          const m = {};
          for (const p of l) m[p.parseName()] = !0;
          c[n[u].value] = m;
        }
      }
    }
    return { aliasMap: t, tblCache: r, maxLen: o, colCnts: d, tblTransCols: c };
  }
  _buildViewColList(e, n, t, r, o, d, c) {
    let u = "";
    for (let h = 2; h < n.length; h++) {
      const l = r[n[h].value];
      if (l === null) continue;
      const m = n[h].value, p = t[m], b = d[m] ?? {}, A = " ".repeat(c - (p.length + 1 + 2));
      u += i + p + ".id" + i + A + (O(m) ?? m) + `_id,
`;
      for (const v of l.children)
        if (v.children.length === 0) {
          const C = v.parseName();
          let w = "";
          if (1 < (o[C] ?? 0) && (w = (O(m) ?? m) + "_"), b[C]) {
            const L = `coalesce(${"t_" + m}.trans_${C}, ${p}.${C})`;
            u += i + L + i + w + C + `,
`;
          } else {
            const N = " ".repeat(c - (p.length + 1 + C.length));
            u += i + p + "." + C + i + N + w + C + `,
`;
          }
        }
      if (l.hasRowVersion()) {
        const v = i + " ".repeat(l.maxChildNameLen() - 11);
        u += i + p + ".row_version" + v + (O(m) ?? m) + `_row_version,
`;
      }
      if (l.hasRowKey()) {
        const v = i + " ".repeat(l.maxChildNameLen() - 7);
        u += i + p + ".ROW_KEY" + v + (O(m) ?? m) + `_ROW_KEY,
`;
      }
      if (l.hasAuditCols())
        for (const v of ["createdcol", "createdbycol", "updatedcol", "updatedbycol"]) {
          const C = String(this.ctx.getOptionValue(v) ?? ""), w = i + " ".repeat(l.maxChildNameLen() - C.length);
          u += i + p + "." + C + w + (O(m) ?? m) + "_" + C + `,
`;
        }
    }
    return u;
  }
  _sortViewTables(e, n, t) {
    const r = {};
    for (let h = 2; h < n.length; h++) r[n[h].value] = !0;
    const o = {};
    for (let h = 2; h < n.length; h++) {
      const l = n[h].value, m = t[l];
      if (m !== null)
        for (const p in m.fks) {
          const b = m.fks[p];
          r[b] && b !== l && (o[l] || (o[l] = []), o[l].push({ fkCol: p, parentTable: b }));
        }
    }
    const d = {}, c = [];
    for (let h = 2; h < n.length; h++) {
      const l = n[h].value;
      o[l] || (c.push(l), d[l] = !0);
    }
    let u = [];
    for (let h = 2; h < n.length; h++)
      o[n[h].value] && u.push(n[h].value);
    for (; u.length > 0; ) {
      let h = !1;
      const l = [];
      for (const m of u)
        o[m].every((b) => d[b.parentTable]) ? (c.push(m), d[m] = !0, h = !0) : l.push(m);
      if (u = l, !h) {
        for (const m of u)
          c.push(m), d[m] = !0;
        break;
      }
    }
    return { sortedTables: c, joinConditions: o };
  }
  _buildViewFromClause(e, n, t, r, o, d) {
    let c = "";
    const u = this.ctx.getOptionValue("transcontext");
    for (let h = 0; h < n.length; h++) {
      const l = n[h], m = t[l];
      let p = m;
      if (this.ctx.objPrefix() && (p = this.ctx.objPrefix() + l + " " + m), h === 0)
        c += i + p + `
`;
      else if (r[l]) {
        const b = r[l];
        c += i + "left join " + p + `
`;
        for (let A = 0; A < b.length; A++) {
          const v = t[b[A].parentTable], C = A === 0 ? "on " : "and ";
          c += i + i + C + m + "." + b[A].fkCol + " = " + v + `.id
`;
        }
      } else
        c += i + "cross join " + p + `
`;
      if (o[l]) {
        const b = d[l], A = this.ctx.objPrefix() + l + "_trans", v = "t_" + l, C = (O(l) ?? l) + "_id", w = b.getGenIdColName() ?? b.getExplicitPkName() ?? "id";
        c += i + "left join " + A + " " + v + `
`, c += i + i + "on " + v + "." + C + " = " + m + "." + w + `
`, c += i + i + "and " + v + ".language_code = " + u + `
`;
      }
    }
    return c;
  }
  generateDualityView(e) {
    const n = e.src;
    if (n.length < 3)
      return `/* duality view requires at least a view name and one table */
`;
    const t = this.ctx.objPrefix() + n[0].value, r = n[2].value, o = this.ctx.find(r);
    if (o === null)
      return "/* duality view: table " + r + ` not found */
`;
    o.lateInitFks();
    const d = "@insert @update @delete";
    let c = "create or replace json relational duality view " + t + ` as
`;
    c += this.ctx.objPrefix() + o.parseName() + " " + d + `
`, c += `{
`;
    const u = o.getGenIdColName() ?? o.getExplicitPkName() ?? "id";
    let h = 3;
    for (const m of o.children) {
      if (m.children.length > 0 || m.refId() !== null) continue;
      const p = m.parseName().length;
      p > h && (h = p);
    }
    for (let m = 3; m < n.length; m++) {
      const p = n[m].value.length;
      p > h && (h = p);
    }
    c += i + "_id" + " ".repeat(h - 3) + " : " + u + `,
`;
    const l = {};
    if (o.fks !== null) for (const m in o.fks) l[m] = !0;
    for (const m of o.regularColumns()) {
      const p = m.parseName();
      p === u || l[p] || (c += i + p + " ".repeat(h - p.length) + " : " + p + `,
`);
    }
    for (let m = 3; m < n.length; m++) {
      const p = n[m].value, b = this.ctx.find(p);
      if (b === null) continue;
      b.lateInitFks();
      let A = !1;
      if (b.fks !== null) {
        for (const B in b.fks)
          if (b.fks[B] === o.parseName()) {
            A = !0;
            break;
          }
      }
      const v = b.getGenIdColName() ?? b.getExplicitPkName() ?? "id";
      let C = 3;
      for (const B of b.children) {
        if (B.children.length > 0 || B.refId() !== null) continue;
        const G = B.parseName().length;
        G > C && (C = G);
      }
      const w = {};
      if (b.fks !== null) for (const B in b.fks) w[B] = !0;
      const N = A ? `[{
` : `{
`, L = A ? "}]" : "}";
      c += i + p + " ".repeat(h - p.length) + " : " + this.ctx.objPrefix() + b.parseName() + " " + d + `
`, c += i + N, c += i + i + "_id" + " ".repeat(C - 3) + " : " + v + `,
`;
      for (const B of b.regularColumns()) {
        const G = B.parseName();
        G === v || w[G] || (c += i + i + G + " ".repeat(C - G.length) + " : " + G + `,
`);
      }
      c = c.replace(/,\n$/, `
`), c += i + L + `,
`;
    }
    return c = c.replace(/,\n$/, `
`), c += `};

`, c.toLowerCase();
  }
  generateTransTable(e) {
    if (e.inferType() !== "table") return "";
    const n = e.getTransColumns();
    if (n.length === 0) return "";
    const t = this.ctx.objPrefix() + e.parseName(), r = t + "_trans", o = this.ctx.semantics(), d = Q(this.ctx);
    let c = 13;
    const u = (O(e.parseName()) ?? e.parseName()) + "_id";
    u.length > c && (c = u.length);
    for (const p of n) {
      const b = "trans_" + p.parseName();
      b.length > c && (c = b.length);
    }
    2 > c && (c = 2);
    let h = "create table " + r + ` (
`, l = i + " ".repeat(c - 2);
    h += i + "id" + l + "number " + Ve(r, this.ctx, this.naming) + `
`, h += i + i + " ".repeat(c) + "constraint " + r + "_id" + this.naming.pk + ` primary key,
`, l = i + " ".repeat(c - u.length), h += i + u + l + `number not null,
`, l = i + " ".repeat(c - 13), h += i + "language_code" + l + `varchar2(5${o}) not null,
`;
    for (const p of n) {
      const b = "trans_" + p.parseName();
      l = i + " ".repeat(c - b.length);
      const A = se(p._inferTypeFull(), o, d);
      h += i + b + l + A + `,
`;
    }
    h += i + "constraint " + r + this.naming.uk + " unique (" + u + `, language_code)
`, h += `);

`;
    let m = e.parseName();
    return m.length > 2 && (m = m.substring(0, 2)), h += "alter table " + r + " add constraint " + r + "_" + m + "_id" + this.naming.fk + `
`, h += i + "foreign key (" + u + ") references " + t + `;

`, h += "alter table " + r + " add constraint " + r + "_lang" + this.naming.fk + `
`, h += i + "foreign key (language_code) references " + this.ctx.objPrefix() + `language (code);

`, h += "create index " + r + this.naming.idx + "1 on " + r + " (" + u + `);
`, h += "create index " + r + this.naming.idx + "2 on " + r + ` (language_code);

`, h;
  }
  generateResolvedView(e) {
    if (e.inferType() !== "table") return "";
    const n = e.getTransColumns();
    if (n.length === 0) return "";
    const t = this.ctx.objPrefix() + e.parseName(), r = t + "_trans", o = t + "_resolved", d = (O(e.parseName()) ?? e.parseName()) + "_id", c = this.ctx.getOptionValue("transcontext");
    let u = "create or replace view " + o + ` as
select `;
    const h = [], l = e.getPkName();
    l !== null && h.push("k." + l), e.lateInitFks();
    for (const p in e.fks ?? {}) {
      if (0 < p.indexOf(",")) continue;
      const b = this.ctx.find(e.fks[p]);
      let A = "";
      b !== null && b.isMany2One && b.isMany2One() && !p.endsWith("_id") && (A = "_id"), h.push("k." + p + A);
    }
    const m = {};
    for (const p of n) m[p.parseName()] = !0;
    for (const p of e.regularColumns()) {
      const b = p.parseName();
      l !== null && b === "id" || b !== e.getExplicitPkName() && (m[b] ? h.push("coalesce(t.trans_" + b + ", k." + b + ") as " + b) : h.push("k." + b));
    }
    u += h[0] + `,
`;
    for (let p = 1; p < h.length; p++)
      u += i + i + " " + h[p], p < h.length - 1 && (u += ","), u += `
`;
    return u += "from " + t + ` k
`, u += "left join " + r + ` t
`, u += i + "on t." + d + " = k." + (l ?? e.getExplicitPkName()) + `
`, u += i + "and t.language_code = " + c + `;

`, u;
  }
}
function Re(x) {
  return x.isOption("lower") ? "lower" : x.isOption("upper") ? "upper" : "";
}
function Ca(x) {
  const e = x.getExplicitPkName();
  if (e == null || e.includes(",")) return null;
  const n = x.findChild(e);
  return n != null ? n.getPlsqlType() : x.getPkType();
}
class oe {
  constructor(e, n) {
    this.ctx = e, this.naming = n;
  }
  // ── ORDS ──────────────────────────────────────────────────────────────────
  restEnable(e) {
    if (e.inferType() !== "table" || !e.isOption("rest")) return "";
    const n = e.parseName(), t = n.indexOf('"') === 0;
    let r = this.ctx.objPrefix() + n;
    return t ? r = this.ctx.objPrefix() + n.substring(1, n.length - 1) : r = (this.ctx.objPrefix() + n).toUpperCase(), `begin
` + i + "ords.enable_object(p_enabled=>TRUE, p_object=>'" + r + `');
end;
/
`;
  }
  // ── Triggers ──────────────────────────────────────────────────────────────
  generateTrigger(e) {
    return e.inferType() !== "table" || e.isOption("soda") ? "" : this._generateBITrigger(e) + this._generateBUTrigger(e);
  }
  _generateBITrigger(e) {
    const n = this.ctx.optionEQvalue("editionable", "yes") ? " editionable" : "", t = (this.ctx.objPrefix() + e.parseName()).toLowerCase();
    let r = `create or replace${n} trigger ${t}${this.naming.bi}
`;
    r += `    before insert
`, r += "    on " + t + `
`, r += `    for each row
`, e.hasRowKey() && (r += `declare
    function compress_int (n in integer ) return varchar2
    as
        ret       varchar2(30);
        quotient  integer;
        remainder integer;
        digit     char(1);
    begin
        ret := null; quotient := n;
        <<compress_loop>>
        while quotient > 0
        loop
            remainder := mod(quotient, 10 + 26);
            quotient := floor(quotient  / (10 + 26));
            if remainder < 26 then
                digit := chr(ascii('A') + remainder);
            else
                digit := chr(ascii('0') + remainder - 26);
            end if;
            ret := digit || ret;
        end loop compress_loop;
        if length(ret) < 5 then ret := lpad(ret, 4, 'A'); end if ;
        return upper(ret);
    end compress_int;
`), r += `begin
`;
    let o = !1;
    const d = e.apexUser();
    e.hasRowKey() && (r += `    :new.row_key := compress_int(row_key_seq.nextval);
`, o = !0);
    for (const u of e.children) {
      const h = Re(u);
      h !== "" && (r += "    :new." + u.parseName().toLowerCase() + " := " + h + "(:new." + u.parseName().toLowerCase() + `);
`, o = !0);
    }
    if (e.hasRowVersion() && (r += `    :new.row_version := 1;
`, o = !0), e.hasAuditCols()) {
      const u = e.auditSysDateFn();
      r += "    :new." + this.ctx.getOptionValue("createdcol") + " := " + u + `;
`, r += "    :new." + this.ctx.getOptionValue("createdbycol") + " := " + d + `;
`, r += "    :new." + this.ctx.getOptionValue("updatedcol") + " := " + u + `;
`, r += "    :new." + this.ctx.getOptionValue("updatedbycol") + " := " + d + `;
`, o = !0;
    }
    const c = this.ctx.additionalColumns();
    for (const u in c) {
      const h = c[u];
      r += "    if :new." + u + ` is null then
`, h.startsWith("INT") ? r += "        " + u + ` := 0;
` : r += "        " + u + ` := 'N/A';
`, r += `    end if;
`, o = !0;
    }
    return o ? (r += "end " + t + this.naming.bi + `;
/

`, r) : "";
  }
  _generateBUTrigger(e) {
    if (e.isOption("immutable")) return "";
    let n = !1;
    for (const h of e.children)
      if (h.isOption("lower") || h.isOption("upper")) {
        n = !0;
        break;
      }
    const t = e.hasRowVersion(), r = e.hasAuditCols();
    if (!n && !t && !r) return "";
    const o = this.ctx.optionEQvalue("editionable", "yes") ? " editionable" : "", d = (this.ctx.objPrefix() + e.parseName()).toLowerCase();
    let c = `create or replace${o} trigger ${d}${this.naming.bu}
`;
    c += `    before update
    on ` + d + `
    for each row
begin
`;
    const u = e.apexUser();
    for (const h of e.children) {
      const l = Re(h);
      l !== "" && (c += "    :new." + h.parseName().toLowerCase() + " := " + l + "(:new." + h.parseName().toLowerCase() + `);
`);
    }
    if (t && (c += `    :new.row_version := nvl(:old.row_version, 0) + 1;
`), r) {
      const h = e.auditSysDateFn();
      c += "    :new." + this.ctx.getOptionValue("updatedcol") + " := " + h + `;
`, c += "    :new." + this.ctx.getOptionValue("updatedbycol") + " := " + u + `;
`;
    }
    return c += "end " + d + this.naming.bu + `;
/

`, c;
  }
  generateImmutableTrigger(e) {
    if (e.inferType() !== "table" || !e.isOption("immutable")) return "";
    const n = this.ctx.getOptionValue("db");
    if (n && n.length > 0 && 23 <= (ie(n) ?? 0)) return "";
    const t = this.ctx.objPrefix() + e.parseName();
    let r = "create or replace trigger " + this.naming.immutable_prefix + t.toLowerCase() + this.naming.immutable_suffix + `
`;
    return r += `    before update or delete
    on ` + t.toLowerCase() + `
declare
`, r += `    co_immutable_err  constant pls_integer      := -20055;
`, r += "    co_immutable_msg  constant varchar2(200 char) := '" + t.toLowerCase() + ` is immutable';
`, r += `begin
    raise_application_error(co_immutable_err, co_immutable_msg);
end;
/

`, r;
  }
  // ── Table API (TAPI) ──────────────────────────────────────────────────────
  /** True when tenant_id is injected synthetically (global tenantid:yes, not via FK hierarchy). */
  _hasSyntheticTenantId(e) {
    return this.ctx.optionEQvalue("tenantid", !0) && !e.isOption("notenantid") && e.findChild("tenant_id") === null && !Object.prototype.hasOwnProperty.call(e.fks ?? {}, "tenant_id");
  }
  procDecl(e, n) {
    const t = n !== "get" ? " default null" : "", r = n !== "get" ? " in" : "out";
    let o = i + "procedure " + n + `_row (
`;
    const d = e.getPkName(), c = e.getGenIdColName() !== null ? null : e.findChild(e.getExplicitPkName()), u = c ? c.getPlsqlType() : e.getPkType();
    o += i + i + "p_" + d + "        in  " + u + t, this._hasSyntheticTenantId(e) && (o += `,
` + i + i + "p_tenant_id   " + r + "  integer" + t);
    for (const h in e.fks ?? {}) {
      const l = e.fks[h];
      let m = "integer";
      const p = this.ctx.find(l);
      p !== null && (m = Ca(p) ?? m), o += `,
` + i + i + "P_" + h + "   " + r + "  " + m + t;
    }
    for (const h of e.regularColumns())
      o += `,
` + i + i + "P_" + h.parseName() + "   " + r + "  " + h.getPlsqlType() + t;
    return o += `
    )`, o;
  }
  _getRowBody(e) {
    const n = e.getPkName(), t = this.ctx.objPrefix() + e.parseName(), r = this._hasSyntheticTenantId(e);
    let o = i + `is 
` + i + `begin 
`;
    const d = [], c = [];
    r && (d.push("tenant_id"), c.push("p_tenant_id"));
    for (const u in e.fks ?? {})
      d.push(u), c.push("p_" + u);
    for (const u of e.regularColumns()) {
      const h = u.parseName().toLowerCase();
      d.push(h), c.push("p_" + h);
    }
    if (d.length > 0) {
      const u = i + i + "       ";
      o += i + i + "select " + d.join(`,
` + u) + `
`, o += i + i + "  into " + c.join(`,
` + u) + `
`, o += i + i + "  from " + t + `
`, o += i + i + " where " + n + " = p_" + n, r && (o += `
` + i + i + "   and tenant_id = p_tenant_id"), o += `;
`;
    }
    return o += i + `exception
` + i + i + `when no_data_found then
` + i + i + i + `null;
`, o += i + `end get_row;
 
`, o;
  }
  _insertRowBody(e) {
    const n = e.getPkName(), t = this.ctx.objPrefix() + e.parseName(), r = this._hasSyntheticTenantId(e);
    let o = i + `is 
` + i + `begin 
`;
    o += i + i + "insert into " + t + ` ( 
` + i + i + i + n, r && (o += `,
` + i + i + i + "tenant_id");
    for (const d in e.fks ?? {}) o += `,
` + i + i + i + d;
    for (const d of e.regularColumns()) o += `,
` + i + i + i + d.parseName().toLowerCase();
    o += `
` + i + i + `) values ( 
` + i + i + i + "p_" + n, r && (o += `,
` + i + i + i + "p_tenant_id");
    for (const d in e.fks ?? {}) o += `,
` + i + i + i + "p_" + d;
    for (const d of e.regularColumns()) o += `,
` + i + i + i + "p_" + d.parseName();
    return o += `
` + i + i + ");", o += `
` + i + `end insert_row;
 
 
`, o;
  }
  _updateRowBody(e) {
    const n = e.getPkName(), t = this.ctx.objPrefix() + e.parseName(), r = this._hasSyntheticTenantId(e);
    let o = i + `is 
` + i + `begin 
`;
    o += i + i + "update  " + t + ` set 
` + i + i + i + n + " = p_" + n;
    for (const d in e.fks ?? {}) o += `,
` + i + i + i + d + " = P_" + d;
    for (const d of e.regularColumns())
      o += `,
` + i + i + i + d.parseName().toLowerCase() + " = P_" + d.parseName().toLowerCase();
    return o += `
` + i + i + "where " + n + " = p_" + n, r && (o += `
` + i + i + "  and tenant_id = p_tenant_id"), o += ";", o += `
` + i + `end update_row;
 
 
`, o;
  }
  // ── Layered TAPI ─────────────────────────────────────────────────────────
  _hasAuditLog(e) {
    return e.isOption("auditlog");
  }
  _hasVersionCol(e) {
    return e.hasRowVersion() || e.children.some(
      (n) => n.children.length === 0 && n.parseName().toLowerCase() === "row_version"
    );
  }
  _hasUniqueCol(e) {
    return e.children.some((n) => n.isOption("unique"));
  }
  // Non-PK, non-version regular columns used as SVC scalar parameters.
  _svcCols(e) {
    return e.children.filter(
      (n) => n.children.length === 0 && n.refId() === null && n.parseName().toLowerCase() !== "row_version"
    );
  }
  _generateDalSpec(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_dal", r = e.children.filter((d) => d.isOption("unique"));
    let o = `create or replace package ${t} as

`;
    o += `${i}subtype t_id is ${n}.id%type;

`, o += `${i}function get_by_id  (p_id in t_id) return ${n}%rowtype;
`, o += `${i}function lock_by_id (p_id in t_id) return ${n}%rowtype;

`;
    for (const d of r) {
      const c = d.parseName().toLowerCase();
      o += `${i}function get_by_${c} (p_${c} in ${n}.${c}%type) return ${n}%rowtype;

`;
    }
    return o += `${i}type t_cursor is ref cursor return ${n}%rowtype;
`, o += `${i}function get_all return t_cursor;

`, o += `${i}procedure insert_row (p_row in out nocopy ${n}%rowtype);

`, o += `${i}procedure update_row (p_row in out nocopy ${n}%rowtype);

`, o += `${i}procedure delete_row (p_id in t_id);

`, o += `${i}c_err_stale_data constant pls_integer := -20001;
`, o += `${i}c_err_not_found  constant pls_integer := -20002;
`, o += `${i}c_err_locked     constant pls_integer := -20003;

`, o += `end ${t};
/
`, o;
  }
  _generateDalBody(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_dal", r = (e.getPkName() ?? "id").toLowerCase(), o = this._hasVersionCol(e), d = e.hasAuditCols(), c = this._svcCols(e), u = Object.keys(e.fks ?? {}), h = e.children.filter((v) => v.isOption("unique"));
    let l = `create or replace package body ${t} as

`;
    l += `${i}resource_busy exception;
`, l += `${i}pragma exception_init(resource_busy, -54);

`, l += `${i}function get_by_id (p_id in t_id) return ${n}%rowtype is
`, l += `${i}${i}l_row ${n}%rowtype;
`, l += `${i}begin
`, l += `${i}${i}select * into l_row from ${n} where ${r} = p_id;
`, l += `${i}${i}return l_row;
`, l += `${i}end get_by_id;

`, l += `${i}function lock_by_id (p_id in t_id) return ${n}%rowtype is
`, l += `${i}${i}l_row ${n}%rowtype;
`, l += `${i}begin
`, l += `${i}${i}select * into l_row
`, l += `${i}${i}from   ${n}
`, l += `${i}${i}where  ${r} = p_id
`, l += `${i}${i}for update nowait;
`, l += `${i}${i}return l_row;
`, l += `${i}exception
`, l += `${i}${i}when no_data_found then
`, l += `${i}${i}${i}raise_application_error(c_err_not_found, '${n}: record not found (id=' || p_id || ')');
`, l += `${i}${i}when resource_busy then
`, l += `${i}${i}${i}raise_application_error(c_err_locked, '${n}: record locked by another session');
`, l += `${i}end lock_by_id;

`;
    for (const v of h) {
      const C = v.parseName().toLowerCase();
      l += `${i}function get_by_${C} (p_${C} in ${n}.${C}%type) return ${n}%rowtype is
`, l += `${i}${i}l_row ${n}%rowtype;
`, l += `${i}begin
`, l += `${i}${i}select * into l_row from ${n} where ${C} = p_${C};
`, l += `${i}${i}return l_row;
`, l += `${i}end get_by_${C};

`;
    }
    l += `${i}function get_all return t_cursor is
`, l += `${i}${i}l_cur t_cursor;
`, l += `${i}begin
`, l += `${i}${i}open l_cur for select * from ${n};
`, l += `${i}${i}return l_cur;
`, l += `${i}end get_all;

`;
    const m = this._hasSyntheticTenantId(e), p = [
      ...m ? ["tenant_id"] : [],
      ...u.map((v) => v.toLowerCase()),
      ...c.map((v) => v.parseName().toLowerCase())
    ], b = [
      ...m ? ["p_row.tenant_id"] : [],
      ...u.map((v) => `p_row.${v.toLowerCase()}`),
      ...c.map((v) => `p_row.${v.parseName().toLowerCase()}`)
    ];
    if (l += `${i}procedure insert_row (p_row in out nocopy ${n}%rowtype) is
`, l += `${i}begin
`, l += `${i}${i}insert into ${n} (
`, l += `${i}${i}${i}` + p.join(`,
${i}${i}${i}`) + `
`, l += `${i}${i}) values (
`, l += `${i}${i}${i}` + b.join(`,
${i}${i}${i}`) + `
`, l += `${i}${i})`, o) {
      const v = String(this.ctx.getOptionValue("createdcol") ?? "created"), C = String(this.ctx.getOptionValue("createdbycol") ?? "created_by"), w = [`${r}`, "row_version"], N = [`p_row.${r}`, "p_row.row_version"];
      d && (w.push(v, C), N.push(`p_row.${v}`, `p_row.${C}`)), l += `
${i}${i}returning ${w.join(", ")}
`, l += `${i}${i}     into ${N.join(", ")}`;
    } else
      l += `
${i}${i}returning ${r}
`, l += `${i}${i}     into p_row.${r}`;
    l += `;
`, l += `${i}end insert_row;

`;
    const A = [
      ...u.map((v) => `${v.toLowerCase()} = p_row.${v.toLowerCase()}`),
      ...c.map((v) => `${v.parseName().toLowerCase()} = p_row.${v.parseName().toLowerCase()}`)
    ];
    return l += `${i}procedure update_row (p_row in out nocopy ${n}%rowtype) is
`, l += `${i}${i}l_id t_id;
`, l += `${i}begin
`, l += `${i}${i}l_id := p_row.${r};
`, l += `${i}${i}update ${n} set
`, l += `${i}${i}${i}` + A.join(`,
${i}${i}${i}`) + `
`, l += `${i}${i}where ${r} = l_id`, o && (l += `
${i}${i}  and row_version = p_row.row_version`), l += `;
`, o && (l += `${i}${i}if sql%rowcount = 0 then
`, l += `${i}${i}${i}declare l_dummy pls_integer;
`, l += `${i}${i}${i}begin
`, l += `${i}${i}${i}${i}select 1 into l_dummy from ${n} where ${r} = l_id;
`, l += `${i}${i}${i}${i}raise_application_error(c_err_stale_data, 'row modified by another session. reload and retry.');
`, l += `${i}${i}${i}exception
`, l += `${i}${i}${i}${i}when no_data_found then
`, l += `${i}${i}${i}${i}${i}raise_application_error(c_err_not_found, 'record ' || l_id || ' does not exist.');
`, l += `${i}${i}${i}end;
`, l += `${i}${i}end if;
`), l += `${i}end update_row;

`, l += `${i}procedure delete_row (p_id in t_id) is
`, l += `${i}begin
`, l += `${i}${i}delete from ${n} where ${r} = p_id;
`, l += `${i}end delete_row;

`, l += `end ${t};
/
`, l;
  }
  _generateHksSpec(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_dal", r = n + "_hks";
    let o = `create or replace package ${r} as

`;
    return o += `${i}procedure validate (
`, o += `${i}${i}p_operation in varchar2,
`, o += `${i}${i}p_row       in out nocopy ${n}%rowtype
`, o += `${i});

`, o += `${i}procedure before_insert (p_row in out nocopy ${n}%rowtype);
`, o += `${i}procedure before_update (p_row in out nocopy ${n}%rowtype);
`, o += `${i}procedure before_delete (p_id in ${t}.t_id);

`, o += `${i}procedure after_insert (p_row in ${n}%rowtype);
`, o += `${i}procedure after_update (p_row in ${n}%rowtype);
`, o += `${i}procedure after_delete (p_id in ${t}.t_id);

`, o += `end ${r};
/
`, o;
  }
  _generateHksBody(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_dal", r = n + "_hks";
    let o = `create or replace package body ${r} as
`;
    return o += `-- warning: this file is generated once and must not be overwritten

`, o += `${i}procedure validate (
`, o += `${i}${i}p_operation in varchar2,
`, o += `${i}${i}p_row       in out nocopy ${n}%rowtype
`, o += `${i}) is begin null; end validate;

`, o += `${i}procedure before_insert (p_row in out nocopy ${n}%rowtype) is begin null; end;
`, o += `${i}procedure before_update (p_row in out nocopy ${n}%rowtype) is begin null; end;
`, o += `${i}procedure before_delete (p_id in ${t}.t_id) is begin null; end;

`, o += `${i}procedure after_insert  (p_row in ${n}%rowtype) is begin null; end;
`, o += `${i}procedure after_update  (p_row in ${n}%rowtype) is begin null; end;
`, o += `${i}procedure after_delete  (p_id in ${t}.t_id)     is begin null; end;

`, o += `end ${r};
/
`, o;
  }
  /**
   * Ordered list of t_rec / APX parameter descriptors: FK cols → tenant_id → regular cols.
   * Single source of truth for SVC t_rec fields and APX parameter lists.
   */
  _svcParamCols(e) {
    const n = [];
    for (const t of Object.keys(e.fks ?? {}))
      n.push({ name: t.toLowerCase(), nullable: !0 });
    this._hasSyntheticTenantId(e) && n.push({ name: "tenant_id", nullable: !1 });
    for (const t of this._svcCols(e))
      n.push({ name: t.parseName().toLowerCase(), nullable: !t.isOption("nn") });
    return n;
  }
  _generateSvcSpec(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_svc", r = (e.getPkName() ?? "id").toLowerCase(), o = this._hasVersionCol(e), d = this._svcParamCols(e);
    let c = `create or replace package ${t} as

`;
    return c += `${i}type t_rec is record (
`, c += d.map(({ name: u }) => `${i}${i}${u.padEnd(20)}${n}.${u}%type`).join(`,
`) + `
`, c += `${i});

`, c += `${i}function get (p_id in ${n}.${r}%type) return ${n}%rowtype;

`, c += `${i}procedure create_rec (
`, c += `${i}${i}p_rec in  t_rec,
`, c += `${i}${i}x_id  out ${n}.${r}%type
`, c += `${i});

`, c += `${i}procedure update_rec (
`, c += `${i}${i}p_id  in ${n}.${r}%type,
`, c += `${i}${i}p_rec in t_rec`, o && (c += `,
${i}${i}p_row_version in ${n}.row_version%type`), c += `
${i});

`, c += `${i}procedure delete_rec (p_id in ${n}.${r}%type);

`, c += `end ${t};
/
`, c;
  }
  _generateSvcBody(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_dal", r = n + "_hks", o = n + "_svc", d = n + "_aud", c = (e.getPkName() ?? "id").toLowerCase(), u = this._hasVersionCol(e), h = this._hasUniqueCol(e), l = this._hasAuditLog(e), m = this._svcParamCols(e);
    let p = `create or replace package body ${o} as

`;
    p += `${i}function get (p_id in ${n}.${c}%type) return ${n}%rowtype is
`, p += `${i}begin
`, p += `${i}${i}return ${t}.get_by_id(p_id => p_id);
`, p += `${i}end get;

`, p += `${i}procedure p_do_create (
`, p += `${i}${i}p_rec in  t_rec,
`, p += `${i}${i}l_row in out nocopy ${n}%rowtype
`, p += `${i}) is
`, p += `${i}begin
`;
    for (const { name: b } of m)
      p += `${i}${i}l_row.${b} := p_rec.${b};
`;
    p += `${i}${i}${r}.validate(p_operation => 'insert', p_row => l_row);
`, p += `${i}${i}${r}.before_insert(p_row => l_row);
`, p += `${i}${i}${t}.insert_row(p_row => l_row);
`, p += `${i}${i}${r}.after_insert(p_row => l_row);
`, l && (p += `${i}${i}${d}.log_insert(p_row => l_row);
`), p += `${i}end p_do_create;

`, p += `${i}procedure create_rec (
`, p += `${i}${i}p_rec in  t_rec,
`, p += `${i}${i}x_id  out ${n}.${c}%type
`, p += `${i}) is
`, p += `${i}${i}l_row ${n}%rowtype;
`, p += `${i}begin
`, p += `${i}${i}p_do_create(p_rec => p_rec, l_row => l_row);
`, p += `${i}${i}x_id := l_row.${c};
`, h && (p += `${i}exception
`, p += `${i}${i}when dup_val_on_index then
`, p += `${i}${i}${i}raise_application_error(-20010, 'duplicate value on unique constraint.');
`), p += `${i}end create_rec;

`, p += `${i}procedure update_rec (
`, p += `${i}${i}p_id  in ${n}.${c}%type,
`, p += `${i}${i}p_rec in t_rec`, u && (p += `,
${i}${i}p_row_version in ${n}.row_version%type`), p += `
${i}) is
`, p += `${i}${i}l_row ${n}%rowtype;
`, l && (p += `${i}${i}l_old_row ${n}%rowtype;
`), p += `${i}begin
`, p += `${i}${i}l_row := ${t}.get_by_id(p_id => p_id);
`, l && (p += `${i}${i}l_old_row := l_row;
`);
    for (const { name: b } of m)
      p += `${i}${i}l_row.${b} := p_rec.${b};
`;
    return u && (p += `${i}${i}l_row.row_version := p_row_version;
`), p += `${i}${i}${r}.validate(p_operation => 'update', p_row => l_row);
`, p += `${i}${i}${r}.before_update(p_row => l_row);
`, p += `${i}${i}${t}.update_row(p_row => l_row);
`, p += `${i}${i}${r}.after_update(p_row => l_row);
`, l && (p += `${i}${i}${d}.log_update(p_old_row => l_old_row, p_new_row => l_row);
`), p += `${i}end update_rec;

`, p += `${i}procedure delete_rec (p_id in ${n}.${c}%type) is
`, l && (p += `${i}${i}l_old_row ${n}%rowtype;
`), p += `${i}begin
`, l && (p += `${i}${i}l_old_row := ${t}.get_by_id(p_id => p_id);
`), p += `${i}${i}${r}.before_delete(p_id => p_id);
`, p += `${i}${i}${t}.delete_row(p_id => p_id);
`, p += `${i}${i}${r}.after_delete(p_id => p_id);
`, l && (p += `${i}${i}${d}.log_delete(p_old_row => l_old_row);
`), p += `${i}end delete_rec;

`, p += `end ${o};
/
`, p;
  }
  _generateApxSpec(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_apx", r = (e.getPkName() ?? "id").toLowerCase(), o = this._hasVersionCol(e), d = e.hasAuditCols(), c = this._svcParamCols(e), u = String(this.ctx.getOptionValue("createdcol") ?? "created"), h = String(this.ctx.getOptionValue("createdbycol") ?? "created_by"), l = String(this.ctx.getOptionValue("updatedcol") ?? "updated"), m = String(this.ctx.getOptionValue("updatedbycol") ?? "updated_by");
    let p = `create or replace package ${t} as

`;
    p += `${i}procedure get (
`, p += `${i}${i}p_id          in  ${n}.${r}%type`;
    for (const { name: v } of c)
      p += `,
${i}${i}p_${v.padEnd(13)} out ${n}.${v}%type`;
    o && (p += `,
${i}${i}p_row_version  out ${n}.row_version%type`), d && (p += `,
${i}${i}p_${u.padEnd(13)} out ${n}.${u}%type`, p += `,
${i}${i}p_${h.padEnd(13)} out ${n}.${h}%type`, p += `,
${i}${i}p_${l.padEnd(13)} out ${n}.${l}%type`, p += `,
${i}${i}p_${m.padEnd(13)} out ${n}.${m}%type`), p += `
${i});

`, p += `${i}procedure ins (
`;
    const b = [];
    for (const { name: v, nullable: C } of c)
      b.push(`${i}${i}p_${v.padEnd(13)} in  ${n}.${v}%type${C ? " default null" : ""}`);
    b.push(`${i}${i}p_id           out ${n}.${r}%type`), p += b.join(`,
`) + `
${i});

`, p += `${i}procedure upd (
`;
    const A = [];
    A.push(`${i}${i}p_id           in  ${n}.${r}%type`);
    for (const { name: v, nullable: C } of c)
      A.push(`${i}${i}p_${v.padEnd(13)} in  ${n}.${v}%type${C ? " default null" : ""}`);
    return o && A.push(`${i}${i}p_row_version  in  ${n}.row_version%type`), p += A.join(`,
`) + `
${i});

`, p += `${i}procedure del (p_id in ${n}.${r}%type);

`, p += `end ${t};
/
`, p;
  }
  _generateApxBody(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_svc", r = n + "_apx", o = (e.getPkName() ?? "id").toLowerCase(), d = this._hasVersionCol(e), c = e.hasAuditCols(), u = this._svcParamCols(e), h = String(this.ctx.getOptionValue("createdcol") ?? "created"), l = String(this.ctx.getOptionValue("createdbycol") ?? "created_by"), m = String(this.ctx.getOptionValue("updatedcol") ?? "updated"), p = String(this.ctx.getOptionValue("updatedbycol") ?? "updated_by");
    let b = `create or replace package body ${r} as

`;
    b += `${i}procedure get (
`, b += `${i}${i}p_id          in  ${n}.${o}%type`;
    for (const { name: C } of u)
      b += `,
${i}${i}p_${C.padEnd(13)} out ${n}.${C}%type`;
    d && (b += `,
${i}${i}p_row_version  out ${n}.row_version%type`), c && (b += `,
${i}${i}p_${h.padEnd(13)} out ${n}.${h}%type`, b += `,
${i}${i}p_${l.padEnd(13)} out ${n}.${l}%type`, b += `,
${i}${i}p_${m.padEnd(13)} out ${n}.${m}%type`, b += `,
${i}${i}p_${p.padEnd(13)} out ${n}.${p}%type`), b += `
${i}) is
`, b += `${i}${i}l_row ${n}%rowtype;
`, b += `${i}begin
`, b += `${i}${i}if p_id is null then return; end if;  -- INSERT mode: leave OUT params null
`, b += `${i}${i}l_row := ${t}.get(p_id => p_id);
`;
    for (const { name: C } of u)
      b += `${i}${i}p_${C} := l_row.${C};
`;
    d && (b += `${i}${i}p_row_version := l_row.row_version;
`), c && (b += `${i}${i}p_${h} := l_row.${h};
`, b += `${i}${i}p_${l} := l_row.${l};
`, b += `${i}${i}p_${m} := l_row.${m};
`, b += `${i}${i}p_${p} := l_row.${p};
`), b += `${i}end get;

`, b += `${i}procedure ins (
`;
    const A = [];
    for (const { name: C, nullable: w } of u)
      A.push(`${i}${i}p_${C.padEnd(13)} in  ${n}.${C}%type${w ? " default null" : ""}`);
    A.push(`${i}${i}p_id           out ${n}.${o}%type`), b += A.join(`,
`) + `
${i}) is
`, b += `${i}${i}l_rec ${t}.t_rec;
`, b += `${i}begin
`;
    for (const { name: C } of u)
      b += `${i}${i}l_rec.${C} := p_${C};
`;
    b += `${i}${i}${t}.create_rec(p_rec => l_rec, x_id => p_id);
`, b += `${i}end ins;

`, b += `${i}procedure upd (
`;
    const v = [];
    v.push(`${i}${i}p_id           in  ${n}.${o}%type`);
    for (const { name: C, nullable: w } of u)
      v.push(`${i}${i}p_${C.padEnd(13)} in  ${n}.${C}%type${w ? " default null" : ""}`);
    d && v.push(`${i}${i}p_row_version  in  ${n}.row_version%type`), b += v.join(`,
`) + `
${i}) is
`, b += `${i}${i}l_rec ${t}.t_rec;
`, b += `${i}begin
`;
    for (const { name: C } of u)
      b += `${i}${i}l_rec.${C} := p_${C};
`;
    return b += `${i}${i}${t}.update_rec(
`, b += `${i}${i}${i}p_id  => p_id,
`, b += `${i}${i}${i}p_rec => l_rec`, d && (b += `,
${i}${i}${i}p_row_version => p_row_version`), b += `
${i}${i});
`, b += `${i}end upd;

`, b += `${i}procedure del (p_id in ${n}.${o}%type) is
`, b += `${i}begin
`, b += `${i}${i}${t}.delete_rec(p_id => p_id);
`, b += `${i}end del;

`, b += `end ${r};
/
`, b;
  }
  _generateAuditSpec(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_aud";
    let r = `create or replace package ${t} as

`;
    return r += `${i}g_enabled boolean := true;

`, r += `${i}procedure log_insert (p_row     in ${n}%rowtype);
`, r += `${i}procedure log_update (p_old_row in ${n}%rowtype, p_new_row in ${n}%rowtype);
`, r += `${i}procedure log_delete (p_old_row in ${n}%rowtype);

`, r += `end ${t};
/
`, r;
  }
  _generateAuditBody(e) {
    const n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), t = n + "_dal", r = n + "_aud", o = (e.getPkName() ?? "id").toLowerCase(), d = String(e.getOptionValue("auditlog") || "").trim() || "app_audit_log", c = (this.ctx.objPrefix() + d).toLowerCase(), u = c + "_svc", h = this._hasVersionCol(e), l = Object.keys(e.fks ?? {}).map((w) => w.toLowerCase()), m = this._svcCols(e).map((w) => w.parseName().toLowerCase()), b = (this.ctx.find(d)?.children ?? []).some((w) => w.parseName().toLowerCase() === "old_values"), A = this._hasSyntheticTenantId(e), v = [o, ...A ? ["tenant_id"] : [], ...l, ...m];
    h && v.push("row_version");
    let C = `create or replace package body ${r} as

`;
    if (b) {
      const w = v.map((N) => `${i}${i}${i}'${N}' value p_row.${N}`);
      C += `${i}function f_to_json (p_row in ${n}%rowtype) return clob is
`, C += `${i}${i}l_result clob;
`, C += `${i}begin
`, C += `${i}${i}select json_object(
`, C += w.join(`,
`) + `
`, C += `${i}${i}${i}returning clob
`, C += `${i}${i}) into l_result from dual;
`, C += `${i}${i}return l_result;
`, C += `${i}end f_to_json;

`;
    }
    return C += `${i}procedure p_log (
`, C += `${i}${i}p_operation  in varchar2,
`, C += `${i}${i}p_id         in ${t}.t_id`, b ? (C += `,
${i}${i}p_old_values in clob default null,
`, C += `${i}${i}p_new_values in clob default null
`) : C += `
`, C += `${i}) is
`, C += `${i}${i}pragma autonomous_transaction;
`, C += `${i}${i}l_rec ${u}.t_rec;
`, C += `${i}${i}l_id ${c}.id%type;
`, C += `${i}begin
`, C += `${i}${i}if not g_enabled then return; end if;
`, C += `${i}${i}l_rec.entity    := '${n}';
`, C += `${i}${i}l_rec.entity_id := p_id;
`, C += `${i}${i}l_rec.operation := p_operation;
`, b && (C += `${i}${i}l_rec.old_values := p_old_values;
`, C += `${i}${i}l_rec.new_values := p_new_values;
`), C += `${i}${i}${u}.create_rec(p_rec => l_rec, x_id => l_id);
`, C += `${i}${i}-- l_id holds the generated audit record id.
`, C += `${i}${i}-- use it here if needed, e.g. to notify, correlate, or route downstream:
`, C += `${i}${i}-- your_pkg.on_audit(p_audit_id => l_id, p_entity => '${n}', p_operation => p_operation);
`, C += `${i}${i}commit;
`, C += `${i}end p_log;

`, C += `${i}procedure log_insert (p_row in ${n}%rowtype) is
`, C += `${i}begin
`, b ? C += `${i}${i}p_log(p_operation => 'INSERT', p_id => p_row.${o}, p_new_values => f_to_json(p_row));
` : C += `${i}${i}p_log(p_operation => 'INSERT', p_id => p_row.${o});
`, C += `${i}end log_insert;

`, C += `${i}procedure log_update (p_old_row in ${n}%rowtype, p_new_row in ${n}%rowtype) is
`, C += `${i}begin
`, b ? C += `${i}${i}p_log(p_operation => 'UPDATE', p_id => p_new_row.${o}, p_old_values => f_to_json(p_old_row), p_new_values => f_to_json(p_new_row));
` : C += `${i}${i}p_log(p_operation => 'UPDATE', p_id => p_new_row.${o});
`, C += `${i}end log_update;

`, C += `${i}procedure log_delete (p_old_row in ${n}%rowtype) is
`, C += `${i}begin
`, b ? C += `${i}${i}p_log(p_operation => 'DELETE', p_id => p_old_row.${o}, p_old_values => f_to_json(p_old_row));
` : C += `${i}${i}p_log(p_operation => 'DELETE', p_id => p_old_row.${o});
`, C += `${i}end log_delete;

`, C += `end ${r};
/
`, C;
  }
  generateLayeredTAPI(e) {
    if (e.inferType() !== "table" || e.children.length === 0) return "";
    const n = this._hasAuditLog(e), t = String(this.ctx.getOptionValue("ifc") ?? "apex").toLowerCase();
    let r = this._generateDalSpec(e) + `
` + this._generateDalBody(e) + `
` + this._generateHksSpec(e) + `
` + this._generateHksBody(e) + `
` + this._generateSvcSpec(e) + `
`;
    return n && (r += this._generateAuditSpec(e) + `
`), r += this._generateSvcBody(e), n && (r += `
` + this._generateAuditBody(e)), (t === "apex" || t === "") && (r += `
` + this._generateApxSpec(e) + `
` + this._generateApxBody(e)), r;
  }
  generateTAPI(e) {
    if (e.children.length === 0) return "";
    const n = this.ctx.objPrefix() + e.parseName(), t = e.getPkName(), r = this._hasSyntheticTenantId(e), o = r ? `,
        p_tenant_id           in integer` : "", d = t + " = p_" + t + (r ? " and tenant_id = p_tenant_id" : "");
    let c = ("create or replace package " + n.toLowerCase() + `_API
is

`).toLowerCase();
    return c += this.procDecl(e, "get") + `;

`, c += this.procDecl(e, "insert") + `;

`, c += this.procDecl(e, "update") + `;

`, c += `    procedure delete_row (
        p_` + t + "              in integer" + o + `
    );
end ` + n.toLowerCase() + `_api;
/

`, c += ("create or replace package body " + n.toLowerCase() + `_API
is

`).toLowerCase(), c += this.procDecl(e, "get") + `
` + this._getRowBody(e), c += this.procDecl(e, "insert") + `
` + this._insertRowBody(e), c += this.procDecl(e, "update") + `
` + this._updateRowBody(e), c += `    procedure delete_row (
        p_` + t + "              in integer" + o + `
    )
    is
    begin
        delete from ` + n.toLowerCase() + " where " + d + `;
    end delete_row;
end ` + n.toLowerCase() + `_api;
/
`, c.toLowerCase();
  }
}
const ya = " not null";
function va(x) {
  return x.lastIndexOf(`,
`) === x.length - 2 && (x = x.substring(0, x.length - 2) + `
`), x;
}
class ke extends pa {
  constructor(e, n) {
    super(e), this._naming = n ?? R, this._view = new ga(e, this._naming), this._plsql = new oe(e, this._naming);
  }
  /** Map a SemanticType to an Oracle DDL column type string. */
  colType(e) {
    return this._toOracleType(e);
  }
  _pkTypeModifier(e, n) {
    return Ve(e, this._ddl, n ?? this._naming);
  }
  _globalOnDelete() {
    const e = this._ddl.getOptionValue("ondelete") ?? "";
    return e === "cascade" ? " on delete cascade" : e === "set null" ? " on delete set null" : e === "restrict" ? " on delete restrict" : "";
  }
  /** Constraint-line prefix — aligns 'constraint' keyword under the type column. */
  _cpad(e) {
    return i + i + " ".repeat(e.parent.maxChildNameLen());
  }
  _fkColType(e) {
    const n = e.getExplicitPkName();
    if (n === null || n.includes(",")) return null;
    const t = e.findChild(n);
    return t !== null ? this._toOracleType(t._inferTypeFull()) : e.getPkType();
  }
  _toOracleType(e) {
    return se(e, this._ddl.semantics(), Q(this._ddl));
  }
  _buildColumnConstraints(e, n, t) {
    if (e.isOption("unique") || e.isOption("uk")) {
      const o = e.parent !== null && e.parent.isOption("notenantid");
      (!this._ddl.optionEQvalue("tenantid", !0) || o) && (n += `
`, n += this._cpad(e) + "constraint " + z(this._ddl.objPrefix(), t.parent_child, this._naming.unq) + " unique");
    }
    let r = "'";
    if ((n.startsWith("integer") || n.startsWith("number") || n.startsWith("date")) && (r = ""), e.isOption("default")) {
      const o = e.getDefaultValue() ?? "", d = ["sysdate", "current_date", "current_timestamp", "systimestamp", "localtimestamp"];
      if (t.isNativeBoolean) {
        const c = o.toUpperCase() === "Y" || o.toLowerCase() === "true" ? "true" : "false";
        n += " default on null " + c;
      } else d.includes(o.toLowerCase()) ? n += " default on null " + o : n += " default on null " + r + o + r;
    }
    if ((e.isOption("nn") || e.indexOf("not") + 1 === e.indexOf("null")) && e.indexOf("pk") < 0 && (n += " not null"), (e.isOption("hidden") || e.isOption("invincible")) && (n += " invisible"), t.isNativeBoolean || (n += e.genConstraint(r)), t.needsBoolCheck && (n += `
` + this._cpad(e) + "constraint " + z(this._ddl.objPrefix(), t.parent_child) + ` check (${e.parseName()} in ('Y','N'))`), e.isOption("between")) {
      const o = e.getBetweenClause() ?? "";
      n += " constraint " + z(t.parent_child, this._naming.bet) + `
`, n += "           check (" + e.parseName() + " between " + o + ")";
    }
    if (e.isOption("pk")) {
      const o = n.startsWith("number") ? " " + this._pkTypeModifier(this._ddl.objPrefix() + e.parent.parseName()) : " not null";
      n += o + `
`, n += this._cpad(e) + "constraint " + z(this._ddl.objPrefix(), t.parent_child, this._naming.pk) + " primary key";
    }
    return e.annotations !== null && (0 <= n.indexOf(`
`) ? n += `
` + this._cpad(e) + "annotations (" + e.annotations + ")" : n += " annotations (" + e.annotations + ")"), n;
  }
  _genSequence(e, n) {
    return this._ddl.optionEQvalue("pk", "SEQ") && this._ddl.optionEQvalue("genpk", !0) ? "create sequence  " + n + `_seq;

` : "";
  }
  _genTableHeader(e, n, t, r) {
    let o = "create " + t + "table " + n + ` (
`;
    const d = i + " ".repeat(e.maxChildNameLen() - 2);
    if (r !== null && !e.isOption("pk")) {
      o += i + r + d + "number " + this._pkTypeModifier(n) + `
`;
      const c = z(this._ddl.objPrefix("no schema") + e.parseName(), "_", r);
      o += i + i + " ".repeat(e.maxChildNameLen()) + "constraint " + z(c, this._naming.pk) + ` primary key,
`;
    } else {
      const c = e.getExplicitPkName();
      if (c !== null && c.indexOf(",") < 0) {
        const u = i + " ".repeat(e.maxChildNameLen() - c.length);
        let h = "number";
        const l = e.findChild(c);
        l !== null && (h = this.parseType(l)), o += i + c + u + h + `,
`;
      }
    }
    return o;
  }
  _genFkColumns(e, n) {
    let t = "";
    for (let r in e.fks) {
      let o = e.fks[r];
      if (0 < r.indexOf(",")) {
        const A = this._ddl.find(o), v = be(r, ", ");
        for (let C = 0; C < v.length; C++) {
          const w = v[C];
          if (w === ",") continue;
          const N = A?.findChild(w), L = i + " ".repeat(e.maxChildNameLen() - w.length);
          t += i + w + L + (N ? this._toOracleType(N._inferTypeFull()) : "number") + `,
`;
        }
        continue;
      }
      let d = "number";
      const c = e.findChild(r);
      c !== null && (d = c.inferType());
      let u = this._ddl.find(o), h = "";
      u !== null ? d = this._fkColType(u) ?? d : (u = this._ddl.find(r), u?.isMany2One?.() && !r.endsWith("_id") && (o = r, r = O(r) ?? r, h = "_id"));
      const l = i + " ".repeat(e.maxChildNameLen() - r.length);
      t += i + r + h + l + d;
      const m = this._ddl.find(o) !== null ? this._ddl.objPrefix() : "", p = r + h;
      if (this._ddl.optionEQvalue("tenantid", !0) && !e.isOption("notenantid") && u !== null && !u.isOption("notenantid") && p !== "tenant_id") {
        t += `,
`;
        const A = m + o, v = A + "_tid_id_uix", C = A + "_tid_id_uq", w = `create unique index ${v}
    on ${A} (tenant_id, id);
`, N = `alter table ${A}
    add constraint ${C}
    unique (tenant_id, id) using index ${v};
`;
        this._ddl.postponedAltersSet.has(w) || (this._ddl.postponedAlters.push(w), this._ddl.postponedAltersSet.add(w), this._ddl.postponedAlters.push(N), this._ddl.postponedAltersSet.add(N));
        let L = "";
        e.isOption("cascade") ? L = " on delete cascade" : e.isOption("setnull") && (L = " on delete set null");
        for (const F in e.children) {
          const E = e.children[F];
          if (p === E.parseName()) {
            E.isOption("cascade") ? L = " on delete cascade" : E.isOption("setnull") && (L = " on delete set null");
            break;
          }
        }
        L || (L = this._globalOnDelete());
        const B = n + "_" + p + this._naming.fk, G = "alter table " + n + " add constraint " + B + `
    foreign key (tenant_id, ` + p + `)
    references ` + m + o + " (tenant_id, id)" + L + `;
`;
        this._ddl.postponedAltersSet.has(G) || (this._ddl.postponedAlters.push(G), this._ddl.postponedAltersSet.add(G));
      } else if (u !== null && (u.line < e.line || u.isMany2One())) {
        t += i + i + " ".repeat(e.maxChildNameLen()) + "constraint " + n + "_" + r + this._naming.fk + `
`;
        let A = "";
        e.isOption("cascade") ? A = " on delete cascade" : e.isOption("setnull") && (A = " on delete set null");
        let v = "";
        for (const C in e.children) {
          const w = e.children[C];
          if (r === w.parseName()) {
            (w.isOption("nn") || w.isOption("notnull")) && (v = ya), w.isOption("cascade") ? A = " on delete cascade" : w.isOption("setnull") && (A = " on delete set null");
            break;
          }
        }
        A || (A = this._globalOnDelete()), t += i + i + " ".repeat(e.maxChildNameLen()) + "references " + m + o + A + v + `,
`;
      } else {
        t += `,
`;
        let A = "";
        e.isOption("cascade") ? A = " on delete cascade" : e.isOption("setnull") && (A = " on delete set null");
        for (const C in e.children) {
          const w = e.children[C];
          if (r === w.parseName()) {
            w.isOption("cascade") ? A = " on delete cascade" : w.isOption("setnull") && (A = " on delete set null");
            break;
          }
        }
        A || (A = this._globalOnDelete());
        const v = "alter table " + n + " add constraint " + n + "_" + r + "_fk foreign key (" + r + ") references " + m + o + A + `;
`;
        this._ddl.postponedAltersSet.has(v) || (this._ddl.postponedAlters.push(v), this._ddl.postponedAltersSet.add(v));
      }
    }
    return t;
  }
  _genTenantIdColumn(e) {
    if (!this._ddl.optionEQvalue("tenantid", !0) || e.isOption("notenantid") || e.findChild("tenant_id") !== null) return "";
    const n = i + " ".repeat(e.maxChildNameLen() - 9), t = e.isOption("insert") ? "" : " not null";
    return i + "tenant_id" + n + "number" + t + `,
`;
  }
  _genTenantIdFk(e, n) {
    if (!this._ddl.optionEQvalue("tenantid", !0) || e.isOption("notenantid") || e.findChild("tenant_id") !== null) return;
    const t = String(this._ddl.getOptionValue("tenantref") || "tenants");
    if (this._ddl.find(t) === null) return;
    const r = this._ddl.objPrefix() + t, o = n + "_tenant_id" + this._naming.fk, d = `alter table ${n} add constraint ${o}
    foreign key (tenant_id) references ${r} (id);
`;
    this._ddl.postponedAltersSet.has(d) || (this._ddl.postponedAlters.push(d), this._ddl.postponedAltersSet.add(d));
  }
  _genRowKeyColumn(e, n) {
    if (!e.hasRowKey()) return "";
    const t = i + " ".repeat(e.maxChildNameLen() - 7);
    let r = i + "row_key" + t + `varchar2(30${this._ddl.semantics()})
`;
    return r += i + i + " ".repeat(e.maxChildNameLen()) + "constraint " + n + "_row_key" + this._naming.unq + ` unique not null,
`, r;
  }
  _genRegularColumns(e, n, t) {
    let r = "";
    for (let o = 0; o < e.children.length; o++) {
      const d = e.children[o];
      if (!(t !== null && d.parseName() === "id") && !(0 < d.children.length) && d.refId() === null) {
        if (d.parseName() === e.getExplicitPkName()) continue;
        r += i + this.generateTable(d) + `,
`;
        for (const c in xe)
          if (0 < d.indexOf(c)) {
            const u = d.parseName().toUpperCase();
            for (const h of xe[c]) {
              const l = u + h.suffix.toUpperCase(), m = i + " ".repeat(e.maxChildNameLen() - l.length);
              r += i + l.toLowerCase() + m + h.type(this._ddl) + `,
`;
            }
            break;
          }
      }
    }
    return r;
  }
  _genRowVersionColumn(e) {
    if (!e.hasRowVersion()) return "";
    const n = i + " ".repeat(e.maxChildNameLen() - 11);
    return i + "row_version" + n + `integer not null,
`;
  }
  _genAuditColumns(e) {
    if (!e.hasAuditCols()) return "";
    let n = String(this._ddl.getOptionValue("auditdate") || this._ddl.getOptionValue("Date Data Type") || "").toLowerCase(), t = "";
    const r = String(this._ddl.getOptionValue("createdcol") ?? "");
    t += i + r + i + " ".repeat(e.maxChildNameLen() - r.length) + n + ` not null,
`;
    const o = String(this._ddl.getOptionValue("createdbycol") ?? "");
    t += i + o + i + " ".repeat(e.maxChildNameLen() - o.length) + `varchar2(255${this._ddl.semantics()}) not null,
`;
    const d = String(this._ddl.getOptionValue("updatedcol") ?? "");
    t += i + d + i + " ".repeat(e.maxChildNameLen() - d.length) + n + ` not null,
`;
    const c = String(this._ddl.getOptionValue("updatedbycol") ?? "");
    return t += i + c + i + " ".repeat(e.maxChildNameLen() - c.length) + `varchar2(255${this._ddl.semantics()}) not null,
`, t;
  }
  _genAdditionalColumns(e) {
    let n = "";
    const t = this._ddl.additionalColumns();
    for (const r in t) {
      const o = t[r], d = i + " ".repeat(e.maxChildNameLen() - r.length);
      n += i + r.toUpperCase() + d + o + ` not null,
`;
    }
    return n;
  }
  _genTableFooter(e, n, t, r) {
    const o = e.annotations !== null ? `
annotations (` + e.annotations + ")" : "";
    let d = "";
    (this._ddl.optionEQvalue("compress", "yes") || e.isOption("compress")) && (d = r ? " row store compress advanced" : " compress");
    let c = t !== "" ? `
no drop until 0 days idle
no delete until 16 days after insert` : "";
    c !== "" && d !== "" && (d = `
` + d.trimStart());
    let u = ")" + c + d + o + `;

`;
    if (e.isOption("audit") && !e.isOption("auditcols") && !e.isOption("audit", "col") && !e.isOption("audit", "cols") && !e.isOption("audit", "columns") && (u += "audit all on " + n + `;

`), e.isOption("flashback") || e.isOption("fda")) {
      const h = String(e.getOptionValue("flashback") || e.getOptionValue("fda") || "").trim();
      u += "alter table " + n + " flashback archive" + (0 < h.length ? " " + h : "") + `;

`;
    }
    return u;
  }
  _genMultiColFkAlters(e, n) {
    let t = "";
    for (const r in e.fks)
      if (0 < r.indexOf(",")) {
        const o = e.fks[r];
        t += "alter table " + n + " add constraint " + o + "_" + n + "_fk foreign key (" + r + ") references " + o + `;

`;
      }
    return t;
  }
  _genIndexes(e, n, t) {
    let r = "", o = 1;
    const d = this._ddl.optionEQvalue("tenantid", !0), c = e.isOption("notenantid");
    for (const l in e.fks)
      if (!e.isMany2One()) {
        const m = l ?? O(e.fks[l]) + "_id";
        o === 1 && (r += `-- table index
`);
        const p = this._ddl.find(e.fks[l]), b = p !== null && p.isOption("notenantid"), v = !d || c || m === "tenant_id" || b ? m : `tenant_id, ${m}`;
        r += "create index " + n + this._naming.idx + o++ + " on " + n + " (" + v + `);

`;
      }
    const u = e.getOptionValue("pk");
    u && (r += "alter table " + n + " add constraint " + n + this._naming.pk + " primary key (" + u + `);

`);
    const h = e.getOptionValue("unique") ?? e.getOptionValue("uk");
    if (h !== null) {
      const l = d && !c ? `tenant_id, ${h}` : h;
      r += "alter table " + n + " add constraint " + n + this._naming.uk + " unique (" + l + `);

`;
    }
    if (d && !c)
      for (let l = 0; l < e.children.length; l++) {
        const m = e.children[l];
        if (m.isOption("unique") || m.isOption("uk")) {
          const p = m.parseName(), b = n + "_tid_" + p + "_uix";
          r += `create unique index ${b}
    on ${n} (tenant_id, ${p});

`;
        }
      }
    for (let l = 0; l < e.children.length; l++) {
      const m = e.children[l];
      if (m.isOption("idx") || m.isOption("index")) {
        o === 1 && (r += `-- table index
`);
        const p = d && !c ? `tenant_id, ${m.parseName()}` : m.parseName();
        r += "create index " + n + this._naming.idx + o++ + " on " + n + " (" + p + `);
`;
      }
    }
    if (t)
      for (let l = 0; l < e.children.length; l++) {
        const m = e.children[l];
        m.children.length === 0 && m.inferType() === "vector" && (r += "create vector index " + n + "_vi" + o++ + " on " + n + " (" + m.parseName() + `)
`, r += `    organization neighbor partitions
`, r += `    with distance cosine;

`);
      }
    for (let l = 0; l < e.children.length; l++) {
      const m = e.children[l];
      m.children.length === 0 && m.inferType() === "geometry" && (r += "create index " + n + "_si" + o++ + " on " + n + " (" + m.parseName() + `)
`, r += `    indextype is mdsys.spatial_index_v2;

`);
    }
    return r;
  }
  _genComments(e, n) {
    let t = "";
    const r = e.getAnnotationValue("DESCRIPTION") || e.comment;
    r !== null && (t += "comment on table " + n + " is '" + r + `';
`);
    for (let o = 0; o < e.children.length; o++) {
      const d = e.children[o], c = d.getAnnotationValue("DESCRIPTION") || d.comment;
      c !== null && d.children.length === 0 && (t += "comment on column " + n + "." + d.parseName() + " is '" + c + `';
`);
    }
    return t;
  }
  parseType(e) {
    if (e.children !== null && 0 < e.children.length) return "table";
    const n = e.inferType();
    if (n === "view" || n === "dv") return n;
    if (e.parent === null) return "table";
    const t = e._inferTypeFull();
    return this._buildColumnConstraints(e, this._toOracleType(t), t);
  }
  generateTable(e) {
    if (e.children.length === 0 && 0 < e.apparentDepth()) {
      let u = i;
      return e.parent !== void 0 && e.parent !== null && (u += " ".repeat(e.parent.maxChildNameLen() - e.parseName().length)), e.parseName() + u + this.parseType(e);
    }
    e.lateInitFks();
    const n = this._ddl.objPrefix() + e.parseName();
    if (e.isOption("soda")) {
      let u = "create table " + n + ` (
`;
      return u += i + "id              varchar2(255" + this._ddl.semantics() + `) not null
`, u += i + "                constraint " + n + `_id_pk primary key,
`, u += i + `created_on      timestamp default sys_extract_utc(systimestamp) not null,
`, u += i + `last_modified   timestamp default sys_extract_utc(systimestamp) not null,
`, u += i + "version         varchar2(255" + this._ddl.semantics() + `) not null,
`, u += i + `json_document   json
`, u += `);

`, u;
    }
    const t = this._ddl.getOptionValue("db"), r = t !== null && t.length > 0 && 23 <= (ie(t) ?? 0);
    let o = "";
    e.isOption("immutable") && r && (o = "immutable ");
    const d = e.getGenIdColName();
    let c = this._genSequence(e, n);
    return c += this._genTableHeader(e, n, o, d), c += this._genTenantIdColumn(e), c += this._genFkColumns(e, n), c += this._genRowKeyColumn(e, n), c += this._genRegularColumns(e, n, d), c += this._genRowVersionColumn(e), c += this._genAuditColumns(e), c += this._genAdditionalColumns(e), c += e.genConstraint(), c = va(c), c += this._genTableFooter(e, n, o, r), c += this._genMultiColFkAlters(e, n), c += this._genIndexes(e, n, r), this._genTenantIdFk(e, n), c += this._genComments(e, n), c += `
`, c;
  }
  generateDDL(e) {
    if (e.inferType() === "view" || e.inferType() === "dv") return "";
    const n = this._orderedTableNodes(e);
    let t = "";
    for (let r = 0; r < n.length; r++) t += this.generateTable(n[r]);
    return t;
  }
  generateDrop(e) {
    const n = this._ddl.objPrefix() + e.parseName(), t = this._ddl.getOptionValue("db"), r = t && t.length > 0 && 23 <= (ie(t) ?? 0) ? "if exists " : "";
    let o = "";
    return e.inferType() === "view" && (o = "drop view " + r + n + `;
`), e.inferType() === "table" && (o = "drop table " + r + n + ` cascade constraints;
`, this._ddl.optionEQvalue("api", "layered") && e.trimmedContent().toLowerCase().includes("/api") ? (o += "drop package " + r + n + `_dal;
`, o += "drop package " + r + n + `_hks;
`, o += "drop package " + r + n + `_svc;
`, e.isOption("auditlog") && (o += "drop package " + r + n + `_aud;
`), o += "drop package " + r + n + `_apx;
`) : this._ddl.optionEQvalue("api", "yes") && (o += "drop package " + r + n + `_api;
`), this._ddl.optionEQvalue("pk", "SEQ") && (o += "drop sequence " + r + n + this._naming.seq + `;
`)), o.toLowerCase();
  }
  identityRestartSql(e, n, t) {
    return "alter table " + e + `
modify ` + n + " generated always  as identity restart start with " + t + `;

`;
  }
  // ── View / trans-table delegates ──────────────────────────────────────────
  generateView(e) {
    return this._view.generateView(e);
  }
  generateDualityView(e) {
    return this._view.generateDualityView(e);
  }
  generateTransTable(e) {
    return this._view.generateTransTable(e);
  }
  generateResolvedView(e) {
    return this._view.generateResolvedView(e);
  }
  // ── PL/SQL / ORDS / triggers delegates ───────────────────────────────────────
  restEnable(e) {
    return this._plsql.restEnable(e);
  }
  generateTrigger(e) {
    return this._plsql.generateTrigger(e);
  }
  generateImmutableTrigger(e) {
    return this._plsql.generateImmutableTrigger(e);
  }
  generateTAPI(e) {
    return this._plsql.generateTAPI(e);
  }
  generateLayeredTAPI(e) {
    return this._plsql.generateLayeredTAPI(e);
  }
  generateFullDDL() {
    const e = this._ddl.forest, n = this._ddl.descendants();
    let t = "";
    if (this._ddl.optionEQvalue("Include Drops", "yes"))
      for (const l of n) {
        const m = this.generateDrop(l);
        m && (t += m);
      }
    if (this._ddl.optionEQvalue("rowkey", !0))
      t += `create sequence  row_key_seq;

`;
    else
      for (const l of e)
        if (l.trimmedContent().toUpperCase().includes("/ROWKEY")) {
          t += `create sequence  row_key_seq;

`;
          break;
        }
    t += `-- create tables

`;
    for (const l of e)
      t += this.generateDDL(l) + `
`;
    for (const l of this._ddl.postponedAlters)
      t += l + `
`;
    if (n.some((l) => l.getTransColumns().length > 0)) {
      const l = this._ddl.semantics(), m = this._ddl.objPrefix();
      t += `-- translation support

`, t += `create table ${m}language (
`, t += `    code           varchar2(5${l}) not null
`, t += `                   constraint ${m}language_code_pk primary key,
`, t += `    locale         varchar2(28${l}) not null
`, t += `                   constraint ${m}language_locale_unq unique,
`, t += `    name           varchar2(1024${l}),
`, t += `    native_name    varchar2(1024${l})
`, t += `);

`, t += `create index ${m}language_i1 on ${m}language (locale);

`;
      for (const p of n) {
        const b = this.generateTransTable(p);
        b && (t += b);
      }
    }
    let o = 0;
    for (const l of n) {
      const m = this.generateTrigger(l);
      m && (o++ === 0 && (t += `-- triggers
`), t += m + `
`);
    }
    for (const l of n) {
      const m = this.generateImmutableTrigger(l);
      m && (o++ === 0 && (t += `-- immutable triggers
`), t += m);
    }
    for (const l of n) {
      const m = this.restEnable(l);
      m && (t += m + `
`);
    }
    o = 0;
    const d = this._ddl.optionEQvalue("api", "layered");
    for (const l of n) {
      const m = l.trimmedContent().toLowerCase().includes("/api");
      if (d) {
        if (!m) continue;
        const p = this.generateLayeredTAPI(l);
        p && (o++ === 0 && (t += `-- APIs
`), t += p + `
`);
      } else {
        if (this._ddl.optionEQvalue("api", !1) && !m) continue;
        const p = this.generateTAPI(l);
        p && (o++ === 0 && (t += `-- APIs
`), t += p + `
`);
      }
    }
    o = 0;
    for (const l of e) {
      const m = this.generateView(l);
      m && (o++ === 0 && (t += `-- create views
`), t += m + `
`);
    }
    for (const l of n) {
      const m = this.generateResolvedView(l);
      m && (o++ === 0 && (t += `-- create views
`), t += m);
    }
    const c = {};
    for (const l of n) {
      if (l.inferType() !== "table") continue;
      const m = l.getAnnotationValue("TGROUP");
      m != null && (c[m] || (c[m] = []), c[m].push(this._ddl.objPrefix() + l.parseName()));
    }
    const u = Object.keys(c);
    if (u.length > 0) {
      t += `-- table groups
`;
      for (const l of u) {
        t += `insert into user_annotations_groups$ (group_name) values ('${l}');
`;
        for (const m of c[l])
          t += `insert into user_annotations_group_members$ (group_name, object_name) values ('${l}', '${m.toUpperCase()}');
`;
      }
      t += `
`;
    }
    const h = this._ddl.getOptionValue("db");
    if (this._ddl.optionEQvalue("aienrichment", !0) && h != null && h.length >= 2 && (ie(h) ?? 0) >= 26) {
      const l = [], m = {}, p = this._ddl.objPrefix();
      for (const b of e) {
        const A = b.inferType(), v = b.getAnnotationPairs(), C = (p + b.parseName()).toUpperCase();
        if (A === "table") {
          for (const w of v) {
            if (w.label.toUpperCase() === "TGROUP") {
              w.value != null && (m[w.value] || (m[w.value] = []), m[w.value].push(C));
              continue;
            }
            w.value != null && l.push(`    metadata_annotations.set('${w.label}', '${w.value}', '${C}');`);
          }
          for (const w of b.children) {
            if (w.children.length > 0) continue;
            const N = w.getAnnotationPairs(), L = C + "." + w.parseName().toUpperCase();
            for (const B of N)
              B.value != null && l.push(`    metadata_annotations.set('${B.label}', '${B.value}', '${L}', 'TABLE COLUMN');`);
          }
        } else if (A === "view")
          for (const w of v)
            w.value != null && l.push(`    metadata_annotations.set('${w.label}', '${w.value}', '${C}', 'VIEW');`);
      }
      for (const b of Object.keys(m)) {
        l.push(`    metadata_annotations.create_group('${b}');`);
        for (const A of m[b])
          l.push(`    metadata_annotations.add_to_group('${b}', '${A}', 'TABLE');`);
      }
      l.length > 0 && (t += `-- AI enrichment
begin
` + l.join(`
`) + `
end;
/

`);
    }
    o = 0;
    for (const l of e) {
      const m = this.generateData(l, this._ddl.data);
      m && (o++ === 0 && (t += `-- load data

`), t += m + `
`);
    }
    return t;
  }
}
const Aa = {
  drop_package: 1,
  drop_view: 2,
  drop_fk: 3,
  transient_drop_fk: 3,
  drop_table: 4,
  drop_index: 5,
  drop_sequence: 6,
  create_table: 7,
  add_sequence: 8,
  add_column: 9,
  rename_hint: 9,
  modify_column: 10,
  set_unused: 11,
  drop_unused_columns: 12,
  add_fk: 13,
  transient_add_fk: 13,
  add_index: 14,
  create_trigger: 14,
  drop_trigger: 5,
  create_package: 15,
  // overridden to 17 for bodies in _step()
  create_view: 16
};
function P(x, e, n, t, r = !1) {
  const o = { kind: x, table: e, sql: n, requiresManualIntervention: r };
  return t !== void 0 && (o.column = t), o;
}
function ee(x, e, n, t, r = !1) {
  const o = { level: x, table: e, message: n, requiresManualIntervention: r };
  return t !== void 0 && (o.column = t), o;
}
class _a {
  compute(e, n) {
    const t = [], r = [], o = this._tableMap(e), d = this._tableMap(n), c = this._viewMap(e), u = this._viewMap(n), h = [];
    for (const [A, v] of o)
      d.has(A) || h.push(v);
    for (const A of this._reverseTopoSort(h, e))
      t.push(...this._dropTable(A, e)), r.push(ee("DESTRUCTIVE", A.parseName(), `table dropped: ${A.parseName()}`));
    const l = [];
    for (const [A, v] of d)
      o.has(A) || l.push(v);
    for (const A of this._topoSort(l, n))
      t.push(...this._createTable(A, n));
    for (const [A, v] of d) {
      const C = o.get(A);
      if (C == null) continue;
      const { stmts: w, warns: N } = this._diffTable(C, v, e, n);
      t.push(...w), r.push(...N);
    }
    t.push(...this._diffViews(c, u, n));
    const m = this._order(t), p = this._buildPreamble(m, r), b = m.map((A) => A.sql.endsWith(`
`) ? A.sql : A.sql + `
`).join(`
`);
    return {
      sql: p + b,
      statements: m,
      warnings: r,
      summary: this._summary(m, r, o, d)
    };
  }
  // ── Map builders ──────────────────────────────────────────────────────────
  _tableMap(e) {
    const n = /* @__PURE__ */ new Map();
    for (const t of e.forest)
      t.inferType() === "table" && n.set(t.parseName(), t);
    return n;
  }
  _viewMap(e) {
    const n = /* @__PURE__ */ new Map();
    for (const t of e.forest)
      (t.inferType() === "view" || t.inferType() === "dv") && n.set(t.parseName(), t);
    return n;
  }
  // ── Topological sort ──────────────────────────────────────────────────────
  _topoSort(e, n) {
    const t = new Set(e.map((c) => c.parseName())), r = /* @__PURE__ */ new Set(), o = [], d = (c) => {
      const u = c.parseName();
      if (!r.has(u)) {
        if (r.add(u), c.fks)
          for (const h in c.fks) {
            const l = c.fks[h];
            if (t.has(l)) {
              const m = n.find(l);
              m != null && d(m);
            }
          }
        o.push(c);
      }
    };
    for (const c of e) d(c);
    return o;
  }
  _reverseTopoSort(e, n) {
    return [...this._topoSort(e, n)].reverse();
  }
  // ── Drop table ────────────────────────────────────────────────────────────
  _dropTable(e, n) {
    const t = [], r = e.parseName(), o = n.objPrefix() + r, c = Q(n) ? "if exists " : "", u = e.trimmedContent().toLowerCase().includes("/api");
    if (n.optionEQvalue("api", "layered") && u)
      for (const h of this._layeredPkgNames(e, n))
        t.push(P("drop_package", r, `drop package ${c}${h};
`));
    else (n.optionEQvalue("api", "yes") || u) && t.push(P("drop_package", r, `drop package ${c}${o}_api;
`));
    return n.optionEQvalue("pk", "SEQ") && t.push(P(
      "drop_sequence",
      r,
      `drop sequence ${c}${o}${R.seq};
`
    )), t.push(P(
      "drop_table",
      r,
      `drop table ${c}${o} cascade constraints;
`
    )), t;
  }
  // ── Create table ──────────────────────────────────────────────────────────
  _createTable(e, n) {
    const t = [], r = e.parseName(), o = n.objPrefix() + r, d = new ke(n);
    n.optionEQvalue("pk", "SEQ") && t.push(P(
      "add_sequence",
      r,
      `create sequence  ${o}${R.seq};
`
    )), e.lateInitFks();
    const c = n.postponedAlters.length;
    let u = d.generateTable(e);
    const h = n.postponedAlters.slice(c);
    for (const m of h) u += m + `
`;
    t.push(P("create_table", r, u));
    const l = e.trimmedContent().toLowerCase().includes("/api");
    if (n.optionEQvalue("api", "layered") && l) {
      const m = new oe(n, R);
      t.push(...this._splitPkgBlocks(m.generateLayeredTAPI(e), r));
    } else if ((n.optionEQvalue("api", "yes") || l) && !n.optionEQvalue("api", "layered")) {
      const m = new oe(n, R);
      t.push(...this._splitPkgBlocks(m.generateTAPI(e), r));
    }
    return t;
  }
  // ── Diff table ────────────────────────────────────────────────────────────
  _diffTable(e, n, t, r) {
    const o = [], d = [], c = n.parseName(), u = r.objPrefix() + c;
    e.lateInitFks(), n.lateInitFks();
    const h = this._colMap(e), l = this._colMap(n), m = [];
    for (const [E, V] of h)
      l.has(E) || m.push(V);
    const p = [];
    for (const [E, V] of l)
      h.has(E) || p.push(V);
    const b = this._detectRenames(m, p), A = new Set([...b.keys()].map((E) => E.parseName())), v = new Set([...b.values()].map((E) => E.parseName()));
    for (const [E, V] of b)
      o.push(P(
        "rename_hint",
        c,
        `-- alter table ${u} rename column ${E.parseName()} to ${V.parseName()};
`,
        E.parseName()
      )), d.push(ee(
        "INFO",
        c,
        `suspected rename: ${E.parseName()} \u2192 ${V.parseName()} (verify before applying)`,
        E.parseName()
      ));
    for (const E of m)
      A.has(E.parseName()) || (o.push(...this._dropColumn(u, c, E)), d.push(ee("DESTRUCTIVE", c, `column dropped: ${E.parseName()}`, E.parseName())));
    for (const E of p) {
      if (v.has(E.parseName())) continue;
      const { stmts: V, warns: Z } = this._addColumn(u, c, E, r);
      o.push(...V), d.push(...Z);
    }
    for (const [E, V] of l) {
      const Z = h.get(E);
      if (Z == null) continue;
      const { stmts: K, warns: $ } = this._modifyColumn(u, c, Z, V, t, r);
      o.push(...K), d.push(...$);
    }
    const C = e.hasRowVersion(), w = n.hasRowVersion();
    !C && w && (o.push(P(
      "add_column",
      c,
      `-- \u26A0 MANUAL INTERVENTION REQUIRED
-- Initialize row_version for existing rows, then add NOT NULL:
-- alter table ${u} add (row_version integer);
-- update ${u} set row_version = 0;
-- commit;
-- alter table ${u} modify (row_version not null);
`,
      "row_version",
      !0
    )), d.push(ee(
      "INFO",
      c,
      "rowversion added \u2014 requires manual column initialization",
      "row_version",
      !0
    ))), C && !w && (o.push(P(
      "set_unused",
      c,
      `alter table ${u} set unused column row_version;
`,
      "row_version"
    )), o.push(P(
      "drop_unused_columns",
      c,
      `-- [MAINTENANCE] safe to defer to a maintenance window
alter table ${u} drop unused columns;
`,
      "row_version"
    )), d.push(ee("DESTRUCTIVE", c, "row_version column dropped", "row_version")));
    const { stmts: N, warns: L } = this._diffPk(e, n, t, r, h, l);
    o.push(...N), d.push(...L), o.push(...this._diffFKs(e, n, t, r)), o.push(...this._diffIndexes(e, n, t, r)), o.push(...this._diffTriggers(e, n, t, r));
    const B = m.some((E) => !A.has(E.parseName())) || p.some((E) => !v.has(E.parseName())) || o.some((E) => E.kind === "modify_column"), { stmts: G, warns: F } = this._diffPackages(e, n, t, r, B);
    return o.push(...G), d.push(...F), { stmts: o, warns: d };
  }
  // ── PK descriptor ────────────────────────────────────────────────────────
  _pkDesc(e, n) {
    const t = e.parseName(), r = n.objPrefix() + t, o = e.getExplicitPkName();
    if (o != null) {
      const c = o.includes(",") ? o.split(",").map((h) => h.trim()) : [o], u = c.length === 1 ? `${r}_${c[0]}_pk` : `${r}_pk`;
      return { type: "business", columns: c, constraintName: u };
    }
    const d = e.getGenIdColName();
    return d != null ? { type: "surrogate", columns: [d], constraintName: `${r}_pk` } : { type: "none", columns: [], constraintName: "" };
  }
  // ── Diff PK ───────────────────────────────────────────────────────────────
  _diffPk(e, n, t, r, o, d) {
    const c = [], u = [], h = n.parseName(), l = t.objPrefix() + h, m = r.objPrefix() + h, p = this._pkDesc(e, t), b = this._pkDesc(n, r);
    if (p.type === b.type && p.columns.join(",") === b.columns.join(","))
      return { stmts: c, warns: u };
    const A = p.type === "none" ? "none" : `${p.type}(${p.columns.join(", ")})`, v = b.type === "none" ? "none" : `${b.type}(${b.columns.join(", ")})`;
    u.push(ee(
      "DESTRUCTIVE",
      h,
      `Primary key change on "${h}": ${A} \u2192 ${v}. All FKs referencing this table must be dropped and re-created. Data migration required.`,
      void 0,
      !0
    ));
    for (const C of b.columns) {
      const w = o.get(C), N = d.get(C);
      N == null || this._isNotNull(N) || (w == null ? c.push(P(
        "modify_column",
        h,
        `-- \u26A0 MANUAL INTERVENTION REQUIRED
-- Populate ${C} for existing rows, then add NOT NULL:
-- update ${m} set ${C} = ??? where ${C} is null;
-- commit;
-- alter table ${m} modify (${C} not null);
`,
        C,
        !0
      )) : this._isNotNull(w) || c.push(P(
        "modify_column",
        h,
        `-- \u26A0 MANUAL INTERVENTION REQUIRED
-- Ensure all rows have a non-null ${C} value, then:
-- alter table ${m} modify (${C} not null);
`,
        C,
        !0
      )));
    }
    if (p.constraintName && c.push(P(
      "modify_column",
      h,
      `-- \u26A0 MANUAL INTERVENTION REQUIRED
-- Drop the old primary key constraint before continuing:
-- alter table ${l} drop constraint ${p.constraintName};
`,
      void 0,
      !0
    )), p.type === "surrogate") {
      const C = p.columns[0];
      d.has(C) || (c.push(P(
        "set_unused",
        h,
        `alter table ${l} set unused column ${C};
`,
        C
      )), c.push(P(
        "drop_unused_columns",
        h,
        `-- [MAINTENANCE] safe to defer to a maintenance window
alter table ${l} drop unused columns;
`,
        C
      ))), t.optionEQvalue("pk", "SEQ") && c.push(P(
        "drop_sequence",
        h,
        `drop sequence ${l}${R.seq};
`
      ));
    }
    if (b.columns.length > 0) {
      const C = b.columns.join(", ");
      c.push(P(
        "add_fk",
        h,
        `-- \u26A0 MANUAL INTERVENTION REQUIRED
-- After all PK columns are NOT NULL, add the primary key:
-- alter table ${m} add constraint ${b.constraintName} primary key (${C});
`,
        void 0,
        !0
      ));
    }
    return { stmts: c, warns: u };
  }
  // ── Diff triggers ─────────────────────────────────────────────────────────
  _diffTriggers(e, n, t, r) {
    const o = [], d = n.parseName(), c = (t.objPrefix() + d).toLowerCase(), u = (A) => JSON.stringify({
      lower: A.children.filter((v) => v.isOption("lower")).map((v) => v.parseName()),
      upper: A.children.filter((v) => v.isOption("upper") && !v.isOption("lower")).map((v) => v.parseName()),
      rv: A.hasRowVersion(),
      audit: A.hasAuditCols(),
      rowkey: A.hasRowKey()
    });
    if (u(e) === u(n)) return o;
    const h = (A) => A.children.some((v) => v.isOption("lower") || v.isOption("upper")), l = h(e) || e.hasRowVersion() || e.hasAuditCols() || e.hasRowKey(), m = h(e) || e.hasRowVersion() || e.hasAuditCols(), p = h(n) || n.hasRowVersion() || n.hasAuditCols() || n.hasRowKey(), b = h(n) || n.hasRowVersion() || n.hasAuditCols();
    if (l && o.push(P("drop_trigger", d, `drop trigger ${c}${R.bi};
`)), m && o.push(P("drop_trigger", d, `drop trigger ${c}${R.bu};
`)), p || b) {
      const v = new oe(r, R).generateTrigger(n);
      v && o.push(P("create_trigger", d, v));
    }
    return o;
  }
  // ── Column helpers ────────────────────────────────────────────────────────
  _colMap(e) {
    const n = /* @__PURE__ */ new Map();
    for (const t of e.regularColumns())
      n.set(t.parseName(), t);
    return n;
  }
  _isNotNull(e) {
    return e.isOption("nn") || e.indexOf("not") >= 0 && e.indexOf("not") + 1 === e.indexOf("null");
  }
  // ── Rename detection ──────────────────────────────────────────────────────
  _detectRenames(e, n) {
    const t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), d = (c) => {
      const u = c._inferTypeFull();
      return `${u.base}:${u.varcharLen ?? ""}:${u.numericSpec ?? ""}:${u.vectorSpec ?? ""}`;
    };
    for (const c of e) {
      const u = d(c);
      r.has(u) || r.set(u, []), r.get(u).push(c);
    }
    for (const c of n) {
      const u = d(c);
      o.has(u) || o.set(u, []), o.get(u).push(c);
    }
    for (const [c, u] of r) {
      const h = o.get(c);
      h != null && u.length === 1 && h.length === 1 && t.set(u[0], h[0]);
    }
    return t;
  }
  // ── Add column ────────────────────────────────────────────────────────────
  _addColumn(e, n, t, r) {
    const o = [], d = [], c = Q(r), u = t._inferTypeFull(), h = se(u, r.semantics(), c), l = t.parseName(), m = this._isNotNull(t);
    let p = "";
    if (t.isOption("default")) {
      const A = t.getDefaultValue() ?? "", v = ["sysdate", "current_date", "current_timestamp", "systimestamp", "localtimestamp"], w = h.startsWith("integer") || h.startsWith("number") || h.startsWith("date") || h.startsWith("timestamp") || v.includes(A.toLowerCase()) ? "" : "'";
      p += v.includes(A.toLowerCase()) ? ` default on null ${A}` : ` default on null ${w}${A}${w}`;
    }
    (t.isOption("hidden") || t.isOption("invincible")) && (p += " invisible");
    const b = `${l} ${h}${p}`;
    if (m) {
      const A = t.isOption("default") ? t.getDefaultValue() ?? "???" : "???", v = ["sysdate", "current_date", "current_timestamp", "systimestamp", "localtimestamp"], C = h.startsWith("integer") || h.startsWith("number") || h.startsWith("date") || h.startsWith("timestamp") || v.includes(A.toLowerCase()), w = !t.isOption("default") || C ? "" : "'", N = v.includes(A.toLowerCase()) ? A : `${w}${A}${w}`, L = t.isOption("default");
      o.push(P(
        "add_column",
        n,
        `alter table ${e} add (${b});
`,
        l
      )), o.push(P(
        "add_column",
        n,
        `-- \u26A0 MANUAL INTERVENTION REQUIRED
` + (L ? `-- Populate existing rows with the default value before step 3.
` : `-- Populate existing rows before step 3. Replace ??? with the correct expression.
`) + `-- update ${e} set ${l} = ${N} where ${l} is null;
-- commit;
`,
        l,
        !0
      )), o.push(P(
        "modify_column",
        n,
        `alter table ${e} modify (${l} not null);
`,
        l
      )), d.push(ee(
        "DESTRUCTIVE",
        n,
        `added NOT NULL column ${l} \u2014 requires manual data population`,
        l,
        !0
      ));
    } else
      o.push(P(
        "add_column",
        n,
        `alter table ${e} add (${b});
`,
        l
      ));
    if (t.isOption("check") || t.isOption("values")) {
      const A = t.isOption("check") ? t.getValues("check") : t.getValues("values"), v = z(r.objPrefix(), `${n}_${l}`, R.ck);
      o.push(P(
        "add_column",
        n,
        `alter table ${e} add constraint ${v} check (${l} in (${A}));
`,
        l
      ));
    } else if (t.isOption("between")) {
      const A = t.getBetweenClause() ?? "", v = z(`${n}_${l}`, R.bet);
      o.push(P(
        "add_column",
        n,
        `alter table ${e} add constraint ${v} check (${l} between ${A});
`,
        l
      ));
    }
    if (t.isOption("unique") || t.isOption("uk")) {
      const A = `${e}_${l}${R.unq}`, v = `create unique index ${A} on ${e} (${l});
`;
      o.push(P(
        "add_index",
        n,
        c ? `create unique index if not exists ${A} on ${e} (${l});
` : this._wrapIndex(v)
      ));
    } else if (t.isOption("idx") || t.isOption("index")) {
      const A = `${e}_${l}${R.idx}`, v = `create index ${A} on ${e} (${l});
`;
      o.push(P(
        "add_index",
        n,
        c ? `create index if not exists ${A} on ${e} (${l});
` : this._wrapIndex(v)
      ));
    }
    return { stmts: o, warns: d };
  }
  // ── Drop column ───────────────────────────────────────────────────────────
  _dropColumn(e, n, t) {
    const r = t.parseName();
    return [
      P(
        "set_unused",
        n,
        `alter table ${e} set unused column ${r};
`,
        r
      ),
      P(
        "drop_unused_columns",
        n,
        `-- [MAINTENANCE] safe to defer to a maintenance window
alter table ${e} drop unused columns;
`,
        r
      )
    ];
  }
  // ── Modify column ─────────────────────────────────────────────────────────
  _modifyColumn(e, n, t, r, o, d) {
    const c = [], u = [], h = t._inferTypeFull(), l = r._inferTypeFull(), m = Q(d), p = se(h, o.semantics(), Q(o)), b = se(l, d.semantics(), m), A = this._isNotNull(t), v = this._isNotNull(r), C = r.parseName(), w = p !== b, N = A !== v;
    if (w || N)
      if (h.base !== l.base) {
        const s = v ? " not null" : A ? " null" : "";
        c.push(P(
          "modify_column",
          n,
          `alter table ${e} modify (${C} ${b}${s});
`,
          C
        )), u.push(ee(
          "LOSSY",
          n,
          `base type changed on ${C}: ${h.base} \u2192 ${l.base}`,
          C
        ));
      } else {
        const s = [];
        w && s.push(b), N && s.push(v ? "not null" : "null");
        const f = s.join(" ");
        if (!A && v)
          c.push(P(
            "modify_column",
            n,
            `-- \u26A0 MANUAL INTERVENTION REQUIRED
-- Ensure all rows have a non-null value before executing.
-- alter table ${e} modify (${C} ${f});
`,
            C,
            !0
          )), u.push(ee(
            "DESTRUCTIVE",
            n,
            `adding NOT NULL on ${C} \u2014 requires manual verification`,
            C,
            !0
          ));
        else if (c.push(P(
          "modify_column",
          n,
          `alter table ${e} modify (${C} ${f});
`,
          C
        )), w && h.base === "varchar") {
          const y = h.varcharLen ?? 4e3, k = l.varcharLen ?? 4e3;
          k < y && u.push(ee(
            "LOSSY",
            n,
            `varchar size reduced on ${C}: ${y} \u2192 ${k}`,
            C
          ));
        }
      }
    const L = t.getDefaultValue(), B = r.getDefaultValue();
    if (L !== B)
      if (r.isOption("default")) {
        const s = B ?? "", f = ["sysdate", "current_date", "current_timestamp", "systimestamp", "localtimestamp"], y = b.startsWith("integer") || b.startsWith("number") || b.startsWith("date") || b.startsWith("timestamp") || f.includes(s.toLowerCase()) ? "" : "'", k = f.includes(s.toLowerCase()) ? `default on null ${s}` : `default on null ${y}${s}${y}`;
        c.push(P(
          "modify_column",
          n,
          `alter table ${e} modify (${C} ${k});
`,
          C
        ));
      } else
        c.push(P(
          "modify_column",
          n,
          `alter table ${e} modify (${C} default null);
`,
          C
        ));
    const G = t.isOption("hidden") || t.isOption("invincible"), F = r.isOption("hidden") || r.isOption("invincible");
    G !== F && c.push(P(
      "modify_column",
      n,
      `alter table ${e} modify (${C} ${F ? "invisible" : "visible"});
`,
      C
    ));
    const E = t.isOption("check") || t.isOption("values"), V = r.isOption("check") || r.isOption("values"), Z = t.isOption("between"), K = r.isOption("between"), $ = E ? JSON.stringify(t.parseValues()) : Z ? t.getBetweenClause() : null, a = V ? JSON.stringify(r.parseValues()) : K ? r.getBetweenClause() : null;
    if ($ !== a) {
      if ($ !== null) {
        const s = Z ? z(`${n}_${C}`, R.bet) : z(o.objPrefix(), `${n}_${C}`, R.ck);
        c.push(P(
          "modify_column",
          n,
          `alter table ${e} drop constraint ${s};
`,
          C
        ));
      }
      if (V) {
        const s = V && r.isOption("check") ? r.getValues("check") : r.getValues("values"), f = z(d.objPrefix(), `${n}_${C}`, R.ck);
        c.push(P(
          "modify_column",
          n,
          `alter table ${e} add constraint ${f} check (${C} in (${s}));
`,
          C
        ));
      } else if (K) {
        const s = r.getBetweenClause() ?? "", f = z(`${n}_${C}`, R.bet);
        c.push(P(
          "modify_column",
          n,
          `alter table ${e} add constraint ${f} check (${C} between ${s});
`,
          C
        ));
      }
    }
    return { stmts: c, warns: u };
  }
  // ── Diff FKs ──────────────────────────────────────────────────────────────
  _diffFKs(e, n, t, r) {
    const o = [], d = n.parseName(), c = t.objPrefix() + d, u = r.objPrefix() + d, h = Q(r), l = e.fks ?? {}, m = n.fks ?? {};
    for (const p in l)
      p in m || (o.push(P(
        "drop_fk",
        d,
        `alter table ${c} drop constraint ${c}_${p}_fk;
`
      )), o.push(P(
        "set_unused",
        d,
        `alter table ${c} set unused column ${p};
`,
        p
      )), o.push(P(
        "drop_unused_columns",
        d,
        `-- [MAINTENANCE] safe to defer to a maintenance window
alter table ${c} drop unused columns;
`,
        p
      )));
    for (const p in m) {
      if (p in l) continue;
      const b = m[p], A = r.find(b) != null ? r.objPrefix() : "", v = `${u}_${p}_fk`, C = this._fkColType(b, r) ?? "number", w = `alter table ${u} add constraint ${v}
    foreign key (${p})
    references ${A}${b};
`;
      o.push(P(
        "add_column",
        d,
        `alter table ${u} add (${p} ${C});
`,
        p
      )), o.push(P(
        "add_fk",
        d,
        h ? w : this._wrapConstraint(w)
      ));
    }
    return o;
  }
  _fkColType(e, n) {
    const t = n.find(e);
    if (t == null) return null;
    const r = t.getExplicitPkName();
    if (r == null || r.includes(",")) return null;
    const o = t.findChild(r);
    return o != null ? se(o._inferTypeFull(), n.semantics(), Q(n)) : t.getPkType() || null;
  }
  // ── Diff indexes ──────────────────────────────────────────────────────────
  _diffIndexes(e, n, t, r) {
    const o = [], d = n.parseName(), c = r.objPrefix() + d, u = t.objPrefix() + d, h = Q(r), l = this._colMap(e), m = this._colMap(n);
    for (const [v, C] of m) {
      const w = l.get(v);
      if (w == null) continue;
      const N = w.isOption("idx") || w.isOption("index"), L = C.isOption("idx") || C.isOption("index"), B = w.isOption("unique") || w.isOption("uk"), G = C.isOption("unique") || C.isOption("uk");
      if (!N && L) {
        const F = `${c}_${v}_i`, E = `create index ${F} on ${c} (${v});
`;
        o.push(P(
          "add_index",
          d,
          h ? `create index if not exists ${F} on ${c} (${v});
` : this._wrapIndex(E)
        ));
      }
      if (N && !L) {
        const F = `${u}_${v}_i`;
        o.push(P("drop_index", d, `drop index ${F};
`));
      }
      if (!B && G) {
        const F = `${c}_${v}_unq`, E = `create unique index ${F} on ${c} (${v});
`;
        o.push(P(
          "add_index",
          d,
          h ? `create unique index if not exists ${F} on ${c} (${v});
` : this._wrapIndex(E)
        ));
      }
      if (B && !G) {
        const F = `${u}_${v}_unq`;
        o.push(P("drop_index", d, `drop index ${F};
`));
      }
    }
    const p = (v) => {
      const C = v.isOption("unique") ? v.getOptionValue("unique") : v.isOption("uk") ? v.getOptionValue("uk") : null;
      return !C || typeof C != "string" ? null : C.split(",").map((w) => w.trim()).join(",");
    }, b = p(e), A = p(n);
    if (b !== A && (b != null && o.push(P(
      "drop_index",
      d,
      `alter table ${u} drop constraint ${u}${R.uk};
`
    )), A != null)) {
      const v = A.split(",").join(", "), C = `${c}${R.uk}`, w = `alter table ${c} add constraint ${C} unique (${v});
`;
      o.push(P(
        "add_index",
        d,
        h ? w : this._wrapConstraint(w)
      ));
    }
    return o;
  }
  // ── Diff views ────────────────────────────────────────────────────────────
  _diffViews(e, n, t) {
    const r = [], d = Q(t) ? "if exists " : "";
    for (const [u] of e)
      if (!n.has(u)) {
        const h = t.objPrefix() + u;
        r.push(P("drop_view", u, `drop view ${d}${h};
`));
      }
    const c = [];
    for (const [u, h] of n) {
      const l = e.get(u);
      (l == null || l.trimmedContent() !== h.trimmedContent()) && c.push(h);
    }
    for (const u of this._topoSortViews(c, n)) {
      const l = new ke(t).generateView(u);
      l && r.push(P("create_view", u.parseName(), l));
    }
    return r;
  }
  _topoSortViews(e, n) {
    const t = new Set(e.map((c) => c.parseName())), r = /* @__PURE__ */ new Set(), o = [], d = (c) => {
      const u = c.parseName();
      if (r.has(u)) return;
      r.add(u);
      const h = c.trimmedContent().toLowerCase();
      for (const l of n.values()) {
        const m = l.parseName();
        m !== u && t.has(m) && h.includes(m) && d(l);
      }
      o.push(c);
    };
    for (const c of e) d(c);
    return o;
  }
  // ── Diff packages ─────────────────────────────────────────────────────────
  _diffPackages(e, n, t, r, o) {
    const d = [], c = [], u = n.parseName(), l = Q(r) ? "if exists " : "", m = this._apiKind(e, t), p = this._apiKind(n, r);
    for (const C of this._droppedPkgs(e, n, t, r, m, p))
      d.push(P("drop_package", u, `drop package ${l}${C};
`));
    const b = e.isOption("auditlog") !== n.isOption("auditlog"), A = (e.isOption("apex") || e.isOption("apx")) !== (n.isOption("apex") || n.isOption("apx")), v = o || m !== p || b || A;
    if (p === "layered" && v) {
      const C = new oe(r, R);
      d.push(...this._splitPkgBlocks(C.generateLayeredTAPI(n), u));
    } else if (p === "simple" && v) {
      const C = new oe(r, R);
      d.push(...this._splitPkgBlocks(C.generateTAPI(n), u));
    }
    return { stmts: d, warns: c };
  }
  _apiKind(e, n) {
    const t = e.trimmedContent().toLowerCase().includes("/api");
    return n.optionEQvalue("api", "layered") && t ? "layered" : (n.optionEQvalue("api", "yes") || t) && !n.optionEQvalue("api", "layered") ? "simple" : "none";
  }
  _layeredPkgNames(e, n) {
    const t = n.objPrefix() + e.parseName(), r = [`${t}_dal`, `${t}_hks`, `${t}_svc`, `${t}_apx`];
    return e.isOption("auditlog") && r.unshift(`${t}_aud`), r;
  }
  _droppedPkgs(e, n, t, r, o, d) {
    const c = [], u = t.objPrefix() + e.parseName();
    return o === "layered" && (d === "simple" || d === "none") ? (c.push(`${u}_dal`, `${u}_hks`, `${u}_svc`, `${u}_apx`), e.isOption("auditlog") && c.push(`${u}_aud`)) : o === "simple" && (d === "layered" || d === "none") ? c.push(`${u}_api`) : o === "layered" && d === "layered" && e.isOption("auditlog") && !n.isOption("auditlog") && c.push(`${u}_aud`), c;
  }
  // ── Package block splitting ───────────────────────────────────────────────
  _splitPkgBlocks(e, n) {
    const t = [], r = e.split(/\n\/\s*(?:\n|$)/);
    for (let o of r)
      o = o.trim(), o && t.push(P("create_package", n, o + `
/
`));
    return t;
  }
  // ── Idempotency wrappers ──────────────────────────────────────────────────
  _wrapIndex(e) {
    return `begin
    execute immediate '${e.trim().replace(/;\s*$/, "").replace(/\n/g, " ").replace(/\s+/g, " ").replace(/'/g, "''")}';
exception
    when others then
        if sqlcode = -955 then null;
        else raise;
        end if;
end;
/
`;
  }
  _wrapConstraint(e) {
    return `begin
    execute immediate '${e.trim().replace(/;\s*$/, "").replace(/\n/g, " ").replace(/\s+/g, " ").replace(/'/g, "''")}';
exception
    when others then
        if sqlcode = -2261 then null;
        else raise;
        end if;
end;
/
`;
  }
  // ── Statement ordering ────────────────────────────────────────────────────
  _order(e) {
    return [...e].sort((n, t) => this._step(n) - this._step(t));
  }
  _step(e) {
    return e.kind === "create_package" ? e.sql.toLowerCase().includes("package body ") ? 17 : 15 : Aa[e.kind] ?? 99;
  }
  // ── Summary ───────────────────────────────────────────────────────────────
  _summary(e, n, t, r) {
    let o = 0, d = 0, c = 0;
    for (const [h] of r) t.has(h) || o++;
    for (const [h] of t) r.has(h) || d++;
    const u = /* @__PURE__ */ new Set();
    for (const h of e)
      h.kind !== "create_table" && h.kind !== "drop_table" && h.kind !== "create_package" && h.kind !== "drop_package" && h.kind !== "create_view" && h.kind !== "drop_view" && h.kind !== "add_sequence" && h.kind !== "drop_sequence" && t.has(h.table) && r.has(h.table) && u.add(h.table);
    return c = u.size, {
      tablesAdded: o,
      tablesDropped: d,
      tablesModified: c,
      statementsTotal: e.length,
      statementsRequiringIntervention: e.filter((h) => h.requiresManualIntervention).length,
      warningsTotal: n.length
    };
  }
  // ── Preamble ──────────────────────────────────────────────────────────────
  _buildPreamble(e, n) {
    const t = e.filter((u) => u.requiresManualIntervention), r = n.filter((u) => u.level === "INFO"), o = e.filter((u) => u.kind === "drop_table").map((u) => u.table), d = n.filter((u) => u.message.startsWith("column dropped"));
    let c = "";
    if (c += `-- ============================================================
`, c += `-- QuickSQL Migration Script
`, c += `-- Generated : ${(/* @__PURE__ */ new Date()).toISOString()}
`, c += `-- ============================================================
`, t.length > 0) {
      c += `--
`, c += `-- \u26A0 MANUAL STEPS REQUIRED (statementsRequiringIntervention = ${t.length})
`, c += `--
`;
      for (const u of t) {
        c += `--   [${u.table}${u.column ? "." + u.column : ""}]
`;
        const h = u.sql.split(`
`).filter((l) => l.startsWith("-- "));
        for (const l of h) c += `--   ${l.replace(/^--\s*/, "")}
`;
        c += `--
`;
      }
    }
    if (r.length > 0) {
      c += `--
`, c += `-- \u26A0 POSSIBLE RENAMES \u2014 verify before applying
`, c += `--
`;
      for (const u of r)
        c += `--   [${u.table}] ${u.message}
`;
      c += `--
`;
    }
    return (o.length > 0 || d.length > 0) && (c += `--
`, c += `-- \u26A0 DESTRUCTIVE OPERATIONS
`, o.length > 0 && (c += `--   Tables dropped  : ${o.length}
`), d.length > 0 && (c += `--   Columns dropped : ${d.length}
`), c += `--   Apply during a maintenance window.
`, c += `--
`), c += `-- ============================================================
`, c += `
`, c;
  }
}
const Me = {
  oracle: (x) => new ke(x)
}, Te = {
  oracle: (x) => new _a()
};
function Ja(x, e) {
  Me[x.toLowerCase()] = e;
}
function Ge(x) {
  const e = String(x.getOptionValue("dialect") ?? "oracle").toLowerCase(), n = Me[e];
  if (n == null) {
    const t = Object.keys(Me).join(", ");
    throw new Error(`Unknown SQL dialect: "${e}". Registered dialects: ${t}`);
  }
  return n(x);
}
function ja(x, e) {
  Te[x.toLowerCase()] = e;
}
function Sa(x) {
  const e = String(x.getOptionValue("dialect") ?? "oracle").toLowerCase(), n = Te[e];
  if (n == null) {
    const t = Object.keys(Te).join(", ");
    throw new Error(`Unknown SQL dialect for diff: "${e}". Registered dialects: ${t}`);
  }
  return n(x);
}
function he(x) {
  let e = "";
  for (let n = 0; n < x; n++)
    e += "   ";
  return e;
}
function ka(x, e) {
  for (const n in x)
    if (JSON.stringify(x[n]) === JSON.stringify(e))
      return !0;
  return !1;
}
function Ae(x) {
  const e = ["_id", "Id"];
  if (x.id != null)
    return { key: "id", value: x.id };
  for (let n = 0; n < e.length; n++) {
    const t = e[n];
    for (const r in x)
      if (r.endsWith(t))
        return { key: r, value: x[r] };
  }
  return null;
}
function Ma(x) {
  if (x == null || typeof x != "object") return !1;
  for (const e in x)
    if (!(x[e] != null && typeof x[e] == "object"))
      return !0;
  return !1;
}
function Ta(x) {
  let e = null;
  e: for (const n in x)
    if (n === "0")
      for (const t in x[n]) {
        e = t;
        break e;
      }
    else {
      e = n;
      break e;
    }
  return e == null || e.toLowerCase() === "id" ? null : e.toLowerCase().endsWith("_id") ? e.substring(0, e.length - 3) : e.endsWith("Id") ? e.substring(0, e.length - 2) : null;
}
function wa(x, e, n) {
  let t = !1, r = !1;
  for (const o in x)
    for (let d = 0; d < o; d++)
      if (x[o][e] === x[d][e] && x[o][n] !== x[d][n] ? t = !0 : x[o][e] !== x[d][e] && x[o][n] === x[d][n] && (r = !0), t && r) return !0;
  return !1;
}
function te(x) {
  if (x == null || typeof x != "object") return "";
  let e = "(";
  for (const n in x) {
    if (n === "0")
      return te(x[n]);
    x[n] != null && typeof x[n] == "object" || (e += n + ",");
  }
  return e.lastIndexOf(",") === e.length - 1 && (e = e.substring(0, e.length - 1)), e + ")";
}
function Oe(x, e) {
  let n = x, t = e;
  const r = n.indexOf("(");
  0 < r && (n = n.substring(0, r));
  const o = t.indexOf("(");
  return 0 < o && (t = t.substring(0, o)), n + "_" + t + "(" + n + "_id," + t + "_id)";
}
class Ia {
  constructor() {
    this.tableContent = {}, this.notNormalized = [], this.tableSignatures = [], this.child2parent = {}, this.objCounts = {}, this.idSeq = 1;
  }
  output(e, n, t, r) {
    if (r !== !1 && this.notNormalized.includes(e)) {
      const c = Oe(this.parent(e) ?? "", e), u = this.tableContent[c];
      if (u != null) {
        const h = `
` + he(t) + this.tableName(c) + " /insert " + u.length;
        if (wa(u, this.refIdName(this.parent(e) ?? ""), this.refIdName(e)))
          return h + this.output(e, n, t + 1, !1);
      }
    }
    const o = this.notNormalized.includes(e) ? ">" : "";
    let d = `
` + he(t) + o + this.tableName(e);
    if (typeof n == "number" && (d += " num", e.endsWith("_id") || e.endsWith("Id")))
      return d += " /pk", d;
    if (e === "id")
      return `
` + he(t) + "id vc32 /pk";
    e: if (n != null && typeof n == "object") {
      if (Array.isArray(n))
        for (const u in n) {
          if (1 <= u)
            break;
          const h = n[u];
          d = this.output(e, h, t, r);
          break e;
        }
      else
        e !== "" && (this.tableContent[e] == null, d += "  /insert " + this.tableContent[e].length);
      let c = "";
      this.tableSignatures.includes(e) || (d = "", t--);
      for (const u in n) {
        const h = n[u];
        if (u != null) {
          const m = O(e) ?? "", p = u.toLowerCase();
          if (e != null && m + "_id" === p && 0 < t && (c = u), m + "_id" === p || !isNaN(u) && !Array.isArray(n))
            continue;
        }
        const l = this.output(u + te(h), h, t + 1);
        d += l;
      }
      c !== "" && (d += `
` + he(t) + c);
    }
    return d;
  }
  flatten(e, n, t) {
    const r = {};
    for (const c in n) {
      const u = n[c];
      if (u != null && typeof u == "object") {
        let h = e, l = t;
        if (isNaN(c)) {
          h = c + te(u);
          const m = Ae(r);
          m != null && (l = m);
        }
        this.flatten(h, u, l);
      } else
        r[c] = u;
    }
    !this.notNormalized.includes(e) && t != null && Object.keys(r).length && (r[t.key] = t.value);
    const o = 0 < Object.keys(r).length;
    let d = this.tableContent[e];
    if (o) {
      if (d == null && (d = []), ka(d, r) || d.push(r), this.notNormalized.includes(e)) {
        const c = this.parent(e);
        if (c != null) {
          const u = Oe(c, e);
          let h = this.tableContent[u];
          h == null && (h = []);
          const l = {};
          l[this.refIdName(c)] = t?.value;
          let m = Ae(r);
          m == null && (r.id = this.idSeq++, m = Ae(r)), l[this.refIdName(e)] = m.value, h.push(l), this.tableContent[u] = h;
        }
      }
      this.tableContent[e] = d;
    } else d == null && (this.tableContent[e] = []);
  }
  duplicatesAndParents(e, n) {
    const t = '"' + e + '":' + JSON.stringify(n);
    let r = this.objCounts[t] ?? 0, o = !1;
    for (const c in n) {
      const u = n[c];
      if (u != null && typeof u == "object") {
        let h = e;
        if (isNaN(c))
          h = c + te(u);
        else if (!Array.isArray(n))
          continue;
        h !== e && (this.child2parent[h] = e), this.duplicatesAndParents(h, u), o = !0;
      }
    }
    Ma(n) && !this.tableSignatures.includes(e) && this.tableSignatures.push(e), o || (this.objCounts[t] = r + 1), 1 < this.objCounts[t] && !this.notNormalized.includes(e) && this.notNormalized.push(e);
  }
  parent(e) {
    const n = this.child2parent[e];
    return n != null && !this.tableSignatures.includes(n) ? this.parent(n) : n ?? null;
  }
  tableName(e) {
    const n = e.indexOf("(");
    if (n < 0) return e;
    const t = e.substring(0, n);
    let r = 0, o = -1;
    for (const d in this.tableSignatures) {
      const c = this.tableSignatures[d];
      c.substring(0, c.indexOf("(")) === t && r++, c === e && (o = r);
    }
    return r < 2 ? t : t + o;
  }
  refIdName(e) {
    return (O(this.tableName(e)) ?? this.tableName(e)) + "_id";
  }
}
function Pa(x, e) {
  const n = JSON.parse(x), t = Ta(n);
  t != null && (e = t), e == null && (e = "root_tbl");
  const r = new Ia();
  r.duplicatesAndParents(e + te(n), n), r.flatten(e + te(n), n);
  let o = r.output(e + te(n), n, 0);
  o += `

#settings = { genpk: false, drop: true, pk: identityDataType, semantics: char }`, o += `

#flattened = 
`;
  const d = {};
  for (const u in r.tableContent)
    d[r.tableName(u)] = r.tableContent[u];
  return o += JSON.stringify(d, null, 3), o += `
`, o += `

-- Generated by json2qsql.js ` + "2.0.0" + " " + (/* @__PURE__ */ new Date()).toLocaleString() + `

`, o += `#document = 
`, o += JSON.stringify(n, null, 3), o += `
`, o;
}
class ne {
  constructor(e, n, t, r) {
    this.from = n, this.to = t ?? new U(n.line, n.depth + 1), this.message = e, this.severity = r ?? "error";
  }
}
class U {
  // 0-based
  constructor(e, n) {
    this.line = e, this.depth = n;
  }
}
const Ba = [
  "api",
  "audit",
  "auditcols",
  "check",
  "colprefix",
  "compress",
  "compressed",
  "flashback",
  "fda",
  "immutable",
  "insert",
  "rest",
  "rowkey",
  "rowversion",
  "soda",
  "unique",
  "uk",
  "pk",
  "cascade",
  "setnull"
], Ea = [
  "idx",
  "index",
  "indexed",
  "unique",
  "uk",
  "check",
  "constant",
  "default",
  "domain",
  "hidden",
  "invincible",
  "values",
  "upper",
  "lower",
  "nn",
  "not",
  "between",
  "references",
  "reference",
  "cascade",
  "setnull",
  "fk",
  "pk",
  "trans",
  "translation",
  "translations"
], ae = {
  duplicateId: "Explicit ID column conflicts with genpk",
  invalidDatatype: "Invalid Datatype",
  undefinedObject: "Undefined Object: ",
  misalignedAttribute: "Misaligned Table or Column; apparent indent = ",
  tableDirectiveTypo: "Unknown Table directive",
  columnDirectiveTypo: "Unknown Column directive"
};
function Na(x) {
  const e = x;
  let n = [], t = [];
  for (let o = 0; o < x.forest.length; o++)
    x.forest[o].inferType() === "table" && (t = t.concat(x.forest[o].descendants()));
  n = n.concat(Ra(t));
  const r = e.descendants();
  for (let o = 0; o < r.length; o++) {
    const d = r[o];
    if (e.optionEQvalue("genpk", !0) && r[o].parseName() === "id") {
      const h = d.content.toLowerCase().indexOf("id");
      n.push(new ne(ae.duplicateId, new U(d.line, h), new U(d.line, h + 2)));
      continue;
    }
    const c = d.src[2];
    if (2 < d.src.length && c.value === "-") {
      const h = c.begin;
      n.push(new ne(ae.invalidDatatype, new U(d.line, h), new U(d.line, h + 2)));
      continue;
    }
    const u = d.src[1];
    if (1 < d.src.length && u.value === "vc0") {
      const h = u.begin;
      n.push(new ne(ae.invalidDatatype, new U(d.line, h)));
      continue;
    }
    n = n.concat($a(e, d)), n = n.concat(Da(e, d)), n = n.concat(La(e, d));
  }
  return n;
}
function La(x, e) {
  const n = e.inferType() === "table", t = [], r = e.src;
  let o = !1;
  for (let d = 1; d < r.length; d++) {
    if (r[d].value === "/") {
      o = !0;
      continue;
    }
    o && (o = !1, n && Ba.indexOf(r[d].value.toLowerCase()) < 0 && t.push(new ne(
      ae.tableDirectiveTypo,
      new U(e.line, r[d].begin),
      new U(e.line, r[d].begin + r[d].value.length)
    )), !n && Ea.indexOf(r[d].value.toLowerCase()) < 0 && t.push(new ne(
      ae.columnDirectiveTypo,
      new U(e.line, r[d].begin),
      new U(e.line, r[d].begin + r[d].value.length)
    )));
  }
  return t;
}
function $a(x, e) {
  const n = [];
  if (e.inferType() === "view") {
    const t = e.src;
    for (let r = 2; r < t.length; r++)
      x.find(t[r].value) == null && n.push(new ne(
        ae.undefinedObject + t[r].value,
        new U(e.line, t[r].begin),
        new U(e.line, t[r].begin + t[r].value.length)
      ));
  }
  return n;
}
function Da(x, e) {
  const n = [];
  if (e.isOption("fk") || 0 < e.indexOf("reference", !0)) {
    let t = e.indexOf("fk");
    if (t < 0 && (t = e.indexOf("reference")), t++, e.src.length - 1 < t || e.src[t].value === "/")
      return n;
    x.find(e.src[t].value) == null && n.push(new ne(
      ae.undefinedObject + e.src[t].value,
      new U(e.line, e.src[t].begin),
      new U(e.line, e.src[t].begin + e.src[t].value.length)
    ));
  }
  return n;
}
function Ra(x) {
  const e = [], n = Ga(x);
  for (let t = 1; t < x.length; t++) {
    const r = x[t], o = We(r);
    n !== null && o % n !== 0 && e.push(new ne(
      ae.misalignedAttribute + n,
      new U(r.line, o)
    ));
  }
  return e;
}
function Ga(x) {
  const e = [];
  for (let r = 0; r < x.length; r++)
    e[r] = We(x[r]);
  const n = {};
  for (let r = 0; r < e.length; r++) {
    const o = Oa(e, r);
    if (o != null) {
      const d = e[r] - e[o];
      n[d] = (n[d] ?? 0) + 1;
    }
  }
  let t = null;
  for (const r in n) {
    const o = parseInt(r);
    (t === null || n[t] <= n[o]) && (t = o);
  }
  return t;
}
function We(x) {
  return x.src[0].begin;
}
function Oa(x, e) {
  for (let n = e; 0 <= n; n--)
    if (x[n] < x[e])
      return n;
  return null;
}
const Fa = Na, Ha = { findErrors: Fa, messages: ae }, Ue = "identityDataType", we = "guid", Ke = "Timestamp with time zone", Je = "Timestamp with local time zone";
function Fe(x) {
  if (x == null) return null;
  const e = typeof x == "string" ? x.toLowerCase() : x;
  return e === "yes" || e === "y" || e === "true" || e === !0 ? !0 : e === "no" || e === "n" || e === "false" || e === !1 ? !1 : e === Ue.toLowerCase() ? "identity" : e === we.toLowerCase() ? "guid" : e === Ke.toLowerCase() ? "tswtz" : e === Je.toLowerCase() ? "tswltz" : typeof e == "string" ? e : String(e);
}
const pe = {
  apex: { label: "APEX", value: "no", check: ["yes", "no"] },
  auditcols: { label: "Audit Columns", value: "no", check: ["yes", "no"] },
  createdcol: { label: "Created Column Name", value: "created" },
  createdbycol: { label: "Created By Column Name", value: "created_by" },
  updatedcol: { label: "Updated Column Name", value: "updated" },
  updatedbycol: { label: "Updated By Column Name", value: "updated_by" },
  auditdate: { label: "Audit Column Date Type", value: "" },
  aienrichment: { label: "AI Enrichment", value: "no", check: ["yes", "no"] },
  boolean: { label: "Boolean Datatype", value: "not set", check: ["yn", "native"] },
  genpk: { label: "Auto Primary Key", value: "yes", check: ["yes", "no"] },
  semantics: { label: "Character Strings", value: "CHAR", check: ["BYTE", "CHAR", "Default"] },
  language: { label: "Data Language", value: "EN", check: ["EN", "JP", "KO"] },
  datalimit: { label: "Data Limit Rows", value: 1e4 },
  date: { label: "Date Data Type", value: "DATE", check: ["DATE", "TIMESTAMP", Ke, Je] },
  db: { label: "Database Version", value: "not set" },
  dv: { label: "Duality View", value: "no", check: ["yes", "no"] },
  drop: { label: "Include Drops", value: "no", check: ["yes", "no"] },
  editionable: { label: "Editinable", value: "no", check: ["yes", "no"] },
  inserts: { label: "Generate Inserts", value: !0, check: ["yes", "no"] },
  namelen: { label: "Name Character Length", value: 255 },
  overridesettings: { label: "Ignore toDDL() second parameter", value: "no", check: ["yes", "no"] },
  prefix: { label: "Object Prefix", value: "" },
  pk: { label: "Primary Key Maintenance", value: we, check: [Ue, we, "SEQ", "NONE"] },
  prefixpkwithtname: { label: "Prefix primary keys with table name", value: "no", check: ["yes", "no"] },
  rowkey: { label: "Alphanumeric Row Identifier", value: "no", check: ["yes", "no"] },
  rowversion: { label: "Row Version Number", value: "no", check: ["yes", "no"] },
  schema: { label: "Schema", value: "" },
  api: { label: "Table API", value: "no", check: ["yes", "no"] },
  compress: { label: "Table Compression", value: "no", check: ["yes", "no"] },
  transcontext: { label: "Translation Context", value: "sys_context('APP_CTX','LANG')" },
  dialect: { label: "SQL Dialect", value: "oracle" },
  longvc: { label: "Longer Varchars", value: "no", check: ["yes", "no"] },
  ondelete: { label: "On Delete", value: "", check: ["cascade", "restrict", "set null"] },
  tenantid: { label: "Tenant ID", value: "no", check: ["yes", "no"] },
  tenantref: { label: "Tenant Reference Table", value: "" },
  verbose: { label: "Verbose Output", value: "no", check: ["yes", "no"] }
};
class q {
  constructor(e, n) {
    this._ddl = null, this._erd = null, this._errors = null, this.postponedAlters = [], this.postponedAltersSet = /* @__PURE__ */ new Set(), this._labelToKey = {}, this.name2node = null, this.options = JSON.parse(JSON.stringify(pe)), this.input = e;
    for (const r in this.options) {
      const o = this.options[r].label;
      o != null && (this._labelToKey[o.toLowerCase()] = r);
    }
    let t = "";
    e.toLowerCase().includes("overridesettings") && Pe(this), n !== void 0 && this.optionEQvalue("overrideSettings", !1) && (t = "# settings = " + String(n) + `

`), this.input = t + e, this.forest = Pe(this);
  }
  // ── Option access ─────────────────────────────────────────────────────────
  getOptionValue(e) {
    const n = e.toLowerCase();
    let t = this.options[n];
    if (!(n in this.options)) {
      const r = this._labelToKey[n];
      r != null && (t = this.options[r]);
    }
    return t?.value ?? null;
  }
  optionEQvalue(e, n) {
    return Fe(this.getOptionValue(e)) == Fe(n);
  }
  setOptionValue(e, n) {
    const t = e.toLowerCase();
    if (!(t in this.options)) {
      for (const d in this.options)
        if (this.options[d].label === e) {
          this.options[d].value = n ?? "";
          return;
        }
    }
    const r = n ?? "";
    let o = this.options[t];
    o == null ? (o = { label: t, value: r }, this.options[t] = o) : o.value = r;
  }
  nonDefaultOptions() {
    const e = {};
    for (const n in this.options)
      pe[n] && !this.optionEQvalue(n, pe[n].value) && (e[n] = this.options[n].value);
    return e;
  }
  unknownOptions() {
    const e = [];
    for (const n in this.options)
      pe[n] == null && e.push(n);
    return e;
  }
  setOptions(e) {
    e = e.trim(), e.startsWith("#") && (e = e.substring(1).trim());
    const n = e.indexOf("=");
    let t = e.substring(n + 1).trim();
    t.includes("{") || (t = "{" + e + "}");
    let r = "";
    const o = le(t, !0, !0, "");
    for (const c of o)
      c.type === "identifier" && c.value !== "true" && c.value !== "false" && c.value !== "null" || c.type === "constant.numeric" && !/^\d+(\.\d+)?$/.test(c.value) ? r += '"' + c.value + '"' : r += c.value;
    const d = JSON.parse(r);
    for (const c in d)
      this.setOptionValue(c.toLowerCase(), d[c]);
  }
  // ── Semantic helpers ──────────────────────────────────────────────────────
  semantics() {
    return this.optionEQvalue("semantics", "CHAR") ? " char" : this.optionEQvalue("semantics", "BYTE") ? " byte" : "";
  }
  objPrefix(e) {
    let n = this.getOptionValue("schema") ?? "";
    n = n !== "" && e == null ? n + "." : "";
    const t = this.getOptionValue("prefix") ?? "", r = t !== "" && !t.endsWith("_") ? "_" : "";
    return (n + t + r).toLowerCase();
  }
  // ── Node lookup ───────────────────────────────────────────────────────────
  find(e) {
    if (this.name2node != null)
      return this.name2node[fe(e)] ?? null;
    this.name2node = {};
    for (const n of this.forest)
      for (const t of n.descendants())
        this.name2node[t.parseName()] = t;
    return this.name2node[fe(e)] ?? null;
  }
  descendants() {
    const e = [];
    for (const n of this.forest)
      e.push(...n.descendants());
    return e;
  }
  additionalColumns() {
    const e = {}, n = this.getOptionValue("Auxiliary Columns");
    if (n == null) return e;
    for (const t of n.split(",")) {
      const r = t.trim(), o = r.indexOf(" ");
      o > 0 ? e[r.substring(0, o)] = r.substring(o + 1).toUpperCase() : e[r] = "VARCHAR2(4000)";
    }
    return e;
  }
  // ── Output generators ─────────────────────────────────────────────────────
  getERD() {
    return this._erd != null ? this._erd : (this._erd = Ge(this).generateERD(), this._erd);
  }
  getDDL() {
    return this._ddl != null ? this._ddl : (this._ddl = Ge(this).generateFullDDL() + this._makeFooter(), this._ddl);
  }
  _makeFooter() {
    const e = (t) => t.replace(/\/\*/g, "--<--").replace(/\*\//g, "-->--").replace(/\/*\s*Non-default options:/g, "");
    let n = `-- Generated by Radicle QuickSQL ${this.version()} ${(/* @__PURE__ */ new Date()).toLocaleString()}

`;
    n += `/*
`, n += e(this.input), n += `
`;
    for (const t of this.unknownOptions())
      n += "*** Unknown setting: " + t + `
`;
    return n += `
*/`, n;
  }
  getErrors() {
    return this._errors != null ? this._errors : (this._errors = Ha.findErrors(this), this._errors);
  }
  version() {
    return je();
  }
}
function za(x, e) {
  return Pa(x, e);
}
function Va(x, e) {
  return new q(x, e).getERD();
}
function Wa(x, e) {
  return new q(x, e).getDDL();
}
function Ua(x, e) {
  return new q(x, e).getErrors();
}
function Ka(x, e, n) {
  const t = new q(e, n), r = new q(x, n);
  return Sa(t).compute(r, t);
}
function je() {
  return "2.0.0";
}
q.toDDL = Wa;
q.toERD = Va;
q.toErrors = Ua;
q.toDiff = Ka;
q.fromJSON = za;
q.version = je;
q.lexer = le;
export {
  pa as BaseGenerator,
  Sa as createDiffGenerator,
  q as default,
  za as fromJSON,
  je as qsql_version,
  q as quicksql,
  ja as registerDiffGenerator,
  Ja as registerGenerator,
  Wa as toDDL,
  Ka as toDiff,
  Va as toERD,
  Ua as toErrors
};
