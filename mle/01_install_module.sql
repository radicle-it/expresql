-- Auto-generato da scripts/generate-mle-sql.mjs — non modificare manualmente
-- Sorgente: dist/expresql.mle.cjs  (446970 byte, 224 chunk da 2000 char)
PROMPT >>> Caricamento expresql_module (224 chunk)...

-- Disabilita sostituzione variabili (&/&&) per non interferire con il codice JavaScript
SET DEFINE OFF

DECLARE
  l_src CLOB;
BEGIN
  DBMS_LOB.CREATETEMPORARY(l_src, TRUE);
  DBMS_LOB.APPEND(l_src, TO_CLOB('if (typeof Buffer === ''undefined'') {
    globalThis.Buffer = {
        from: function(arr) {
            if (typeof arr === ''string'') return { toString: () => arr };
            return { toString: () => {
                try { return String.fromCharCode.apply(null, arr); } catch(e) { return ''''; }
            }};
        }
    };
}
//#region \0rolldown/runtime.js
var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, i = Object.getPrototypeOf, a = Object.prototype.hasOwnProperty, o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (e, i, o, s) => {
	if (i && typeof i == "object" || typeof i == "function") for (var c = r(i), l = 0, u = c.length, d; l < u; l++) d = c[l], !a.call(e, d) && d !== o && t(e, d, {
		get: ((e) => i[e]).bind(null, d),
		enumerable: !(s = n(i, d)) || s.enumerable
	});
	return e;
}, c = (n, r, a) => (a = n == null ? {} : e(i(n)), s(r || !n || !n.__esModule ? t(a, "default", {
	value: n,
	enumerable: !0
}) : a, n));
//#endregion
//#region src/utils/naming.ts
function l(e) {
	if (e == null) return e;
	let t = e.toUpperCase();
	return t.endsWith("IES") ? e.substring(0, e.length - 3) + "y" : t.endsWith("ES") || t.endsWith("S") ? e.substring(0, e.length - 1) : e;
}
function u(e) {
	if (e == null) return null;
	let t = !1;
	if (!e.startsWith("\"")) {
		if (e.length > 0 && e[0] >= "0" && e[0] <= "9") t = !0;
		else for (let n of e) if (!(n >= "a" && n <= "z" || n >= "A" && n <= "Z" || n >= "0" && n <= "9") && !"$#_ ".includes(n)) {
			t = !0;
			break;
		}
	}
	return (e.startsWith("_") || e.startsWith("$") || e.startsWith("#")) && (t = !0), t ? "\"" + e + "\"" : e;
}
function d(e) {
	if (e == null) return null;
	if (e.charAt(0) === "\"") return e;
	let t = u(e);
	return t == null ? null : t.charAt(0) === "\"" ? t : t.replace(/ /g, "_");
}
function f(e, t, n) {
	let r = n ?? "", i = !1, a = e, o = t, s = r;
	a.charAt(0) === "\"" && (i = !0, a = a'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.slice(1, -1)), o.charAt(0) === "\"" && (i = !0, o = o.slice(1, -1)), s.charAt(0) === "\"" && (i = !0, s = s.slice(1, -1));
	let c = a + o + s;
	return i ? "\"" + c + "\"" : c.toLowerCase();
}
function p(e) {
	return e.length < 2 ? null : parseInt(e.substring(0, 2));
}
//#endregion
//#region src/utils/split-str.ts
function m(e, t) {
	let n = new Set(t), r = [], i = "";
	for (let t of e) n.has(t) ? (i.length > 0 && (r.push(i), i = ""), r.push(t)) : i += t;
	return i.length > 0 && r.push(i), r;
}
//#endregion
//#region src/compiler/lexer.ts
var h = -10, g = -11, _ = class {
	constructor(e, t, n, r, i, a = 0) {
		this.type = r, this.value = e, this.begin = t, this.end = n, this.line = i, this.col = a, this.lowerValue = e.toLowerCase();
	}
	toString() {
		return `{type:${this.type},value:${this.value}}`;
	}
	getValue() {
		return this.value.length, this.value;
	}
	isStandardLiteral() {
		if (this.value.length < 2) return !1;
		let e = this.value.charAt(0);
		if (e !== "''" && e !== "n" && e !== "N") return !1;
		let t = this.value;
		if (e === "n" || e === "N") {
			if (t.length < 3) return !1;
			t = t.substring(1);
		}
		return t.charAt(0) === "''" && t.charAt(t.length - 1) === "''";
	}
	isAltLiteral() {
		if (this.value.length < 5) return !1;
		let e = this.value.charAt(0);
		if (e !== "q" && e !== "Q" && e !== "n" && e !== "N") return !1;
		let t = this.value;
		if (e === "q" || e === "Q") t = t.substring(1);
		else if ((e === "n" || e === "N") && (this.value.charAt(1) === "q" || this.value.charAt(1) === "Q")) {
			if (t.length < 6) return !1;
			t = t.substring(2);
		} else return !1;
		if (t.charAt(0) === "''" && t.charAt(t.length - 1) === "''") t = t.substring(1, t.length - 1);
		else return !1;
		return v(t.charAt(0)) === t.charAt(t.length - 1);
	}
};
function v(e) {
	return e === "<" ? ">" : e === "[" ? "]" : e === "{" ? "}" : e === "(" ? ")" : e;
}
function y(e, t, n, r) {
	let i = e.indexOf("e"), a = e.indexOf("f"), o = e.indexOf("d");
	if (i < 0 && a < 0 && '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('o < 0) return !1;
	let s = n, c = m(e, "efd");
	for (let e of c) {
		s += e.length;
		let n = e.charAt(0) >= "0" && e.charAt(0) <= "9" ? "constant.numeric" : "identifier";
		t.push(new _(e, s - e.length, s, n, r));
	}
	return !0;
}
function b(e, t, n) {
	let r = [], i = "(){}[]^-|!*+.><=''\",;:%@?/\\#~" + n, a = " \n\r	", o = m(e, i + a), s = 0, c = 0, l = 0;
	for (let n = 0; n < o.length; n++) {
		let u = o[n], d = r.length > 0 ? r[r.length - 1] : null;
		if (u === "\n" ? (c++, l = 0) : l = n > 0 && o[n - 1] !== "\n" ? l + o[n - 1].length : 0, s += u.length, d?.type === "comment" && (d.value.lastIndexOf("*/") !== d.value.length - 2 || d.value === "/*/")) {
			d.value = u === "*" || u === "/" ? d.value + u : "/* ... ", d.end = s, d.type === "comment" && d.value.lastIndexOf("*/") === d.value.length - 2 && d.value !== "/*/" && (d.value = e.substring(d.begin, d.end));
			continue;
		}
		if (d !== null && (d.type === "line-comment" || d.type === "dbtools-command")) {
			if (u !== "\n") {
				d.value += u;
				continue;
			}
			d.end = d.begin + d.value.length;
		}
		if (d?.type === "quoted-string" && !(d.isStandardLiteral() || d.isAltLiteral())) {
			d.value += u, d.end = d.begin + d.value.length;
			continue;
		}
		if (d?.type === "dquoted-string" && !(d.value.endsWith("\"") && d.value.length > 1)) {
			if (u !== "\"") continue;
			d.end = s, d.value = e.substring(d.begin, d.end);
			continue;
		}
		if (d?.type === "bquoted-string" && !(d.value.endsWith("`") && d.value.length > 1)) {
			if (u !== "`") continue;
			d.end = s, d.value = e.substring(d.begin, d.end);
			continue;
		}
		if (u === "*" && d?.value === "/") {
			d.value += u, d.end = d.begin + d.value.length, d.type = "comment";
			continue;
		}
		if (u === "-" && d?.value === "-") {
			d.value += u, d.type = "line-comment";
			continue;
		}
		if (d?.type === "identifier" && d.end === g && d.value.startsWith("@")) {
			if (u !== "\n" && u !== "\r") {
				d.value += u;
				continue;
			}
			d.end = s - 1, r.pus'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('h(new _(u, s - 1, s, "ws", c, l));
			continue;
		}
		if (t && u === "''") {
			let e = d !== null && d.value.length <= 2 ? d.value.toLowerCase() : "";
			e === "q" || e === "n" || e === "u" || e === "nq" ? (d.value += u, d.type = "quoted-string") : r.push(new _(u, s - 1, h, "quoted-string", c, l));
			continue;
		}
		if (t && u === "\"") {
			r.push(new _(u, s - 1, g, "dquoted-string", c, l));
			continue;
		}
		if (u === "`" && i.includes("`")) {
			r.push(new _(u, s - 1, g, "bquoted-string", c, l));
			continue;
		}
		if (u.length === 1 && i.includes(u)) {
			r.push(new _(u, s - 1, s, "operation", c, l));
			continue;
		}
		if (u.length === 1 && a.includes(u)) {
			r.push(new _(u, s - 1, s, "ws", c, l));
			continue;
		}
		if (u.charAt(0) >= "0" && u.charAt(0) <= "9") {
			if (!y(u, r, s - u.length, c)) {
				let e = u.charAt(u.length - 1).toUpperCase();
				"KMGTPE".includes(e) ? (r.push(new _(u.slice(0, -1), s - u.length, s - 1, "constant.numeric", c, l)), r.push(new _(u.slice(-1), s - 1, s, "constant.numeric", c, l))) : r.push(new _(u, s - u.length, s, "constant.numeric", c, l));
			}
			continue;
		}
		r.push(new _(u, s - u.length, s, "identifier", c, l));
	}
	return r.length > 0 && (r[r.length - 1].end = e.length), r;
}
function x(e, t, n, r) {
	let i = [], a = b(e, n, r), o = null;
	for (let e of a) {
		if (e.type === "quoted-string") {
			if (o?.type === "quoted-string") {
				o.value += e.value, o.end = e.end;
				continue;
			}
			if (o?.type === "identifier" && o.value.toUpperCase() === "N" && o.end === e.begin) {
				o.begin = e.begin, o.end = e.end, o.type = e.type, o.value = e.value;
				continue;
			}
		}
		if (e.value.startsWith("@") && (e.end = e.begin + e.value.length), e.value === "#" && o?.type === "identifier") {
			o.end += 1, o.value += "#";
			continue;
		}
		if ((e.type === "identifier" || e.type === "constant.numeric") && o !== null && o.value.endsWith("#") && o.type === "identifier") {
			o.end += e.value.length, o.value += e.value;
			c'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ontinue;
		}
		e.value.startsWith("$$") && (e.value = "$$VAR"), (t || e.type !== "ws" && e.type !== "comment" && e.type !== "line-comment") && i.push(e), o = e;
	}
	return i;
}
//#endregion
//#region src/oracle/reserved_words.ts
var S = {
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
function C(e) {
	return S[e.toUpperCase()] === void 0 ? e : "the_" + e;
}
//#endregion
//#region src/compiler/node.ts
var w = "timestamp with local time zone", T = "timestamp with time zone", E = "timestamp", D = {
	pk: "_pk",
	fk: "_fk",
	unq: "_unq",
	uk: "_uk",
	ck: "_ck",
	bet: "_bet",
	'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('bi: "_bi",
	bu: "_bu",
	seq: "_seq",
	idx: "_i",
	immutable_prefix: "trg_",
	immutable_suffix: "_insertonly"
}, O = "    ", ee = [
	"string",
	"varchar2",
	"varchar",
	"vc",
	"char"
], te = [
	"yn",
	"boolean",
	"bool"
], ne = ["vect", "vector"], k = ["geometry", "sdo_geometry"], A = [
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
A = A.concat(ee).concat(te).concat(ne).concat(k);
var j = { file: [
	{
		suffix: "_filename",
		type: (e) => `varchar2(255${e.semantics()})`
	},
	{
		suffix: "_mimetype",
		type: (e) => `varchar2(255${e.semantics()})`
	},
	{
		suffix: "_charset",
		type: (e) => `varchar2(255${e.semantics()})`
	},
	{
		suffix: "_lastupd",
		type: (e) => String(e.getOptionValue("Date Data Type") ?? "").toLowerCase()
	}
] };
function re(e, t, n) {
	return e[t].value.endsWith("k") ? n < 32 ? n * 1024 : n * 1024 - 1 : n;
}
function ie(e, t, n, r, i, a) {
	return !!(e.endsWith("_id") && n < 0 && r < 0 || t[1] && t[1].value === "id" || e === "quantity" || e.endsWith("_number") || e.endsWith("id") && n < 0 && i + 1 === a);
}
function ae(e, t, n) {
	return !!(0 <= n || e === "hiredate" || e.endsWith("_date") || e.startsWith("date_of_") || e.startsWith("created") || e.startsWith("updated") || 1 < t.length && t[1].value === "d");
}
var M = class {
	constructor(e, t, n, r) {
		this.one2many2oneUnsupoorted = void 0, this.line = e, this.parent = n, this.children = [], n !== null && n.children.push(this), this.fks = null, this._ctx = r, this.comment = null;
		function i(e) {
			let t = e;
			return t = t.replace(/ timestamp with local time zone/gi, " tswltz"), t = t.replace(/ timestamp with time zone/gi, " tswtz"), t = t.replace(/ timestamp/gi, " ts"), t;
		}
		this.content = i(t), this.annotations = null;
		let a = this.content.indexOf("{");
		if (a > 0 && (this.content.charAt(a - 1) === " " || this.content.charAt(a - 1) === "	")) {
			let e = this.content.indexOf("}", a);
			e > a && (th'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('is.annotations = this.content.substring(a + 1, e).trim(), this.content = this.content.substring(0, a) + this.content.substring(e + 1));
		}
		this.src = x(this.content, !1, !0, "`");
		let o = this.getOptionValue("colprefix");
		o !== null && (this.colprefix = o), this.parsedName = null, this._maxChildNameLen = -1;
	}
	findChild(e) {
		for (let t = 0; t < this.children.length; t++) if (this.children[t].parseName() === e) return this.children[t];
		return null;
	}
	descendants() {
		let e = [this];
		for (let t = 0; t < this.children.length; t++) e.push(...this.children[t].descendants());
		return e;
	}
	maxChildNameLen() {
		if (this._maxChildNameLen >= 0) return this._maxChildNameLen;
		let e = 2;
		if (this.hasRowKey() && (e = 7), this.hasRowVersion() && (e = Math.max(e, 11)), this.hasAuditCols()) for (let t of [
			"createdcol",
			"createdbycol",
			"updatedcol",
			"updatedbycol"
		]) {
			let n = String(this._ctx.getOptionValue(t) ?? "").length;
			e < n && (e = n);
		}
		if (this._ctx.optionEQvalue("tenantid", !0) && this.findChild("tenant_id") === null && !this.isOption("notenantid") && (e = Math.max(e, 9)), this.fks !== null) for (let t in this.fks) {
			let n = t.length, r = this._ctx.find(t);
			r !== null && r.isMany2One() && (n += 3), e < n && (e = n);
		}
		for (let t = 0; t < this.children.length; t++) {
			let n = this.children[t];
			if (0 < n.children.length) continue;
			let r = n.parseName().length;
			for (let e in j) if (0 < n.indexOf(e)) {
				let t = 0;
				for (let n of j[e]) n.suffix.length > t && (t = n.suffix.length);
				r += t;
				break;
			}
			e < r && (e = r);
		}
		let t = this._ctx.additionalColumns();
		for (let n in t) {
			let t = n.length;
			e < t && (e = t);
		}
		return this._maxChildNameLen = e, e;
	}
	getAnnotationValue(e) {
		if (this.annotations === null) return null;
		let t = RegExp(e + ":?\\s+[''\"]([^''\"]*)[''\"]", "i"), n = this.annotations.match(t);
		return n ? n[1] : null;
	}
	getAnnotationPairs() {
		if (this.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('annotations === null) return [];
		let e = [], t = /(\w+)(?:\s+[''"]([^''"]*)[''"''])?/g, n;
		for (; (n = t.exec(this.annotations)) !== null;) e.push({
			label: n[1],
			value: n[2] === void 0 ? null : n[2]
		});
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
		return this._ctx.optionEQvalue("apex", "yes") ? "coalesce(sys_context(''APEX$SESSION'',''APP_USER''),user)" : "user";
	}
	auditSysDateFn() {
		return String(this._ctx.getOptionValue("auditdate") || this._ctx.getOptionValue("Date Data Type") || "").toLowerCase().indexOf("timestamp") >= 0 ? "systimestamp" : "sysdate";
	}
	indexOf(e, t) {
		let n = e.toLowerCase();
		for (let e = 0; e < this.src.length; e++) {
			let r = this.src[e].lowerValue;
			if (t && r.indexOf(n) === 0 || n === r) return e;
		}
		return -1;
	}
	occursBeforeOption(e, t) {
		let n = this.indexOf(e, t);
		return n <= 0 ? !1 : (this._slashPos === void 0 && (this._slashPos = this.indexOf("/")), this._slashPos < 0 || n < this._slashPos);
	}
	isOption(e, t) {
		for (let n = 2; n < this.src.length; n++) if (e === this.src[n].lowerValue && (t == null || n < this.src.length - 1 && t === this.src[n + 1].lowerValue)) return this.src[n - 1].value === "/";
		return !1;
	}
	getOptionValue(e) {
		if (this.src.length < 3) return null;
		let t = this.indexOf(e);
		if (t < 2 || this.src[t - 1].value !== "/") return null;
		let n = "";
		for (let e = t + 1; e < this.src.length && this.src[e].value !== "/" && this.src[e].value !== "["; e++) n += this.src[e'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('].value;
		return n;
	}
	sugarcoatName(e, t) {
		let n = "";
		this.children.length === 0 && this.parent !== void 0 && this.parent !== null && this.parent.colprefix !== void 0 && (n = this.parent.colprefix + "_");
		let r = "";
		for (let i = e; i < t; i++) {
			let a = this.src[i].value, o = "\"" + a + "\"";
			if (this.src[i].type !== "constant.numeric" && a !== d(o)) {
				r = this.content.substring(this.src[e].begin, this.src[t - 1].end);
				let i = 0 < String(this._ctx.getOptionValue("prefix") ?? "").length, a = d(r) ?? r, o = i ? a : C(a);
				return this.parsedName = n + o, this.parsedName;
			}
		}
		for (let n = e; n < t; n++) e < n && (r += "_"), r += this.src[n].value;
		let i = r.charAt(0);
		i >= "0" && i <= "9" && (r = "x" + r);
		let a = 0 < String(this._ctx.getOptionValue("prefix") ?? "").length, o = d(r) ?? r, s = a ? o : C(o);
		return this.parsedName = n + s, this.parsedName;
	}
	parseName() {
		if (this.parsedName !== null) return this.parsedName;
		let e = 0, t = this.src[0].value;
		(t === ">" || t === "<") && (t = this.src[1].value, e = 1);
		let n = t.indexOf("\""), r = t.indexOf("\"", n + 1);
		if (0 <= n && n < r) return t.substring(n, r + 1);
		if (this.src[0].value === "view") return this.src[1].value;
		if (1 < this.src.length && this.src[1].value === "=") return this.src[0].value;
		let i = this.src.length, a = this.indexOf("/");
		0 < a && (i = a), a = this.indexOf("["), 0 < a && a < i && (i = a), a = this.indexOf("="), 0 < a && a < i && (i = a);
		for (let t = 0; t < A.length; t++) {
			let n = this.indexOf(A[t]);
			if (n < 0 && (n = this.indexOf(A[t], !0)), 0 < n && n < i) return i = n, this.sugarcoatName(e, i);
		}
		for (let t = e; t < i; t++) {
			let n = this.src[t].lowerValue;
			if (n.charAt(0) === "v" && n.charAt(1) === "c" && (n.charAt(2) === "(" || n.charAt(2) >= "0" && n.charAt(2) <= "9")) return this.sugarcoatName(e, t);
		}
		return this.sugarcoatName(e, i);
	}
	_inferTypeFull() {
		let e = this.src, t = e[0].value, n ='));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' t.endsWith("_name") || t.startsWith("name") || t.startsWith("email") ? this._ctx.getOptionValue("namelen") || 255 : 4e3, r = this.indexOf("vc", !0);
		if (0 < r) {
			let t = e[r].value.substring(2);
			t === "" && this.indexOf("(") === r + 1 && (t = e[r + 2].value), n = re(e, r, t === "" ? n : parseInt(t));
		}
		let i = "varchar", a = this.indexOf("date");
		this._slashPos === void 0 && (this._slashPos = this.indexOf("/"));
		let o = this._slashPos;
		ie(t, e, r, a, o, this.indexOf("pk")) && (i = "number"), this.occursBeforeOption("int", !0) && (i = "integer"), 0 < r && (i = "varchar");
		let s, c = this.vectorType("vector") || this.vectorType("vect");
		c !== null && (i = "vector", s = c.substring(6));
		let l = this.parent, u = f(l.parseName(), "_", this.parseName()), d = !1, m = t.endsWith("_yn") || t.startsWith("is_"), h = te.some((e) => 0 < this.indexOf(e));
		(m || h) && (i = "varchar", n = 1, d = !0);
		let g = this._ctx.getOptionValue("db");
		d && (this._ctx.getOptionValue("boolean") === "native" || this._ctx.getOptionValue("boolean") !== "yn" && g && g.length > 0 && 23 <= (p(g) ?? 0)) && (d = !1, i = "boolean");
		let _ = i === "boolean";
		this.indexOf("phone_number") === 0 && (i = "number");
		let v, y = this.indexOf("num", !0);
		if (0 < y) {
			i = "number";
			let t = this.indexOf(")");
			0 < t && (v = this.content.substring(e[y + 1].begin, e[t].end).toLowerCase());
		}
		if (ae(t, e, a)) {
			let e = String(this._ctx.getOptionValue("Date Data Type") ?? "").toLowerCase();
			i = e === E ? "timestamp" : e === T ? "tswtz" : e === w ? "tswltz" : "date";
		}
		r < 0 && (this.occursBeforeOption("clob") && (i = "clob"), (this.occursBeforeOption("blob") || this.occursBeforeOption("file")) && (i = "blob"), this.occursBeforeOption("json") && (i = "json"));
		for (let e in k) if (this.occursBeforeOption(k[e])) {
			i = "geometry";
			break;
		}
		this.isOption("domain") && g && g.length > 0 && 23 <= (p(g) ?? 0) && (i = this.getOptionValue("domain") ?? i), t'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('his.occursBeforeOption("tswltz") && o !== 0 ? i = "tswltz" : this.occursBeforeOption("tswtz") || this.occursBeforeOption("tstz") ? i = "tswtz" : this.occursBeforeOption("ts") && (i = "timestamp");
		let b = {
			base: i,
			colName: t,
			varcharLen: n,
			needsBoolCheck: d,
			isNativeBoolean: _,
			parent_child: u
		};
		return v !== void 0 && (b.numericSpec = v), s !== void 0 && (b.vectorSpec = s), b;
	}
	inferType() {
		if (this.children !== null && 0 < this.children.length) return "table";
		let e = this.src;
		if (e[0].value === "view" || 1 < e.length && e[1].value === "=") return "view";
		if (e[0].value === "dv") return "dv";
		if (this.parent === null) return "table";
		let t = this._inferTypeFull();
		if (this.isOption("fk") || 0 < this.indexOf("reference", !0)) {
			let e = "number";
			t.base === "integer" && (e = "integer");
			let n = this.refId(), r = this._ctx.find(n);
			return r !== null && r.getExplicitPkName() !== null && (e = r.getPkType()), e;
		}
		return t.base;
	}
	getPlsqlType() {
		let e = this.inferType();
		return e === "varchar" ? "varchar2" : e;
	}
	vectorType(e) {
		let t = this.indexOf(e, !0), n = this.src;
		if (0 < t) {
			let r = n[t].value.substring(e.length);
			r === "" && this.indexOf("(") === t + 1 && (r = n[t + 2].value);
			let i = "*";
			if (r !== "") {
				let e = 1;
				r.endsWith("k") && (e = 1024), r = r.substring(0, r.length - 1), i = parseInt(r) * e;
			}
			return `vector(${i},*,*)`;
		}
		return null;
	}
	genConstraint(e) {
		let t = "";
		if (this.isOption("check")) {
			let e = "";
			this.parent !== null && (e = f(this.parent.parseName(), "_"));
			let n = f(e, this.parseName()), r = O;
			this.parent !== null && (r = " ".repeat(this.parent.maxChildNameLen()));
			let i = this.getGeneralConstraint();
			if (i !== null) return this.children !== null && 0 < this.children.length ? (t += "    constraint " + f(this._ctx.objPrefix(), n, D.ck), t += "  check " + i + ",\n") : (t += " constraint " + f(this._ctx.objPrefi'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('x(), n, D.ck) + "\n", t += "        " + r + "check " + i), t;
			let a = this.getValues("check");
			t += " constraint " + f(this._ctx.objPrefix(), n, D.ck) + "\n", t += "        " + r + "check (" + this.parseName() + " in (" + a + "))";
		}
		return t;
	}
	isMany2One() {
		return this.src[0].value === ">";
	}
	getExplicitPkName() {
		if (this.isOption("pk")) return this.inferType() === "table" ? this.getOptionValue("pk") : this.parseName();
		for (let e = 0; e < this.children.length; e++) if (this.children[e].isOption("pk")) return this.children[e].parseName();
		return null;
	}
	trimmedContent() {
		let e = this.content.trim(), t = e.indexOf("["), n = e.indexOf("]");
		this.comment === null && 0 < t && (this.comment = e.substr(t + 1, n - t - 1)), 0 < t && (e = e.substr(0, t) + e.substr(n + 2));
		let r = e.indexOf("--");
		return this.comment === null && 0 < r && (this.comment = e.substr(r + 2)), 0 < r && (e = e.substr(0, r)), e.trim();
	}
	refId() {
		let e = this.trimmedContent();
		e = e.replace(/\/cascade/g, "");
		let t = e.indexOf(" id ");
		if (t < 0 && t === e.length - 3 && (t = e.indexOf(" id")), t < 0 && (t = e.indexOf(" id"), t !== e.length - 3 && (t = -1)), t < 0 && (t = e.indexOf("_id "), t !== e.length - 4 && (t = -1)), t < 0 && (t = e.indexOf("_id"), t !== e.length - 3 && (t = -1)), t < 0 && (t = e.indexOf("Id "), t !== e.length - 3 && (t = -1)), 0 < t) {
			let n = e.substr(0, t) + "s";
			if (this._ctx.find(n) !== null || (n = e.substr(0, t), this._ctx.find(n) !== null)) return n;
		}
		return t = e.indexOf("/fk"), 0 < t ? (e = e.substr(t + 3).trim(), t = e.indexOf("/"), 0 < t && (e = e.substring(0, t).trim()), t = e.indexOf("["), 0 < t && (e = e.substring(0, t).trim()), e.replace(" ", "_")) : (t = e.indexOf("/reference"), 0 < t ? (e = e.substr(t + 10).trim(), e.indexOf("s") === 0 && (e = e.substring(1).trim()), t = e.indexOf("/"), 0 < t && (e = e.substring(0, t).trim()), t = e.indexOf("["), 0 < t && (e = e.substring(0, t).trim()), e.replace(" ", '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('"_")) : null);
	}
	getGeneralConstraint() {
		let e = this.indexOf("check");
		if (0 < e && this.src[e - 1].value === "/" && (this.src[e + 1].value === "(" || this.src[e + 1].lowerValue === "not")) {
			let t = e + 2;
			for (; t < this.src.length && this.src[t].value !== "/" && this.src[t].value !== "[";) t++;
			let n = this.content.substring(this.src[e + 1].begin, this.src[t - 1].end);
			return n.charAt(0) !== "(" && (n = "(" + n + ")"), n;
		}
		return null;
	}
	listValues(e) {
		let t = [], n = this.indexOf(e), r = " ";
		for (let e = n + 1; e < this.src.length && this.src[e].value !== "/" && this.src[e].value !== "["; e++) if (this.src[e].value === ",") {
			r = ",";
			break;
		} else if (this.src[e].lowerValue === "and") {
			r = this.src[e].value;
			break;
		}
		if (r === " ") {
			for (let e = n + 1; e < this.src.length && this.src[e].value !== "/" && this.src[e].value !== "["; e++) {
				let n = this.src[e].value;
				this.src[e].type === "identifier" && n !== "null" && (n = "''" + n + "''"), n.charAt(0) === "`" && (n = n.substring(1, n.length - 1)), t.push(n);
			}
			return t;
		}
		let i = null, a = null;
		for (let e = n + 1; e < this.src.length && this.src[e].value !== "/" && this.src[e].value !== "["; e++) {
			let n = this.src[e].value, o = this.content.substring(this.src[e - 1].end, this.src[e].begin);
			if (n === r) {
				a === "identifier" && i !== "null" && (i = "''" + i + "''"), t.push(i), i = null, a = null;
				continue;
			}
			n === "(" || n === ")" || (n.charAt(0) === "`" ? n = n.substring(1, n.length - 1) : this.src[e].type === "identifier" && (a = "identifier"), i = i === null ? n : i + o + n);
		}
		return a === "identifier" && (i = "''" + i + "''"), t.push(i), t;
	}
	getValues(e) {
		let t = "", n = this.listValues(e);
		for (let e = 0; e < n.length; e++) 0 < e && (t += ","), t += n[e];
		return t;
	}
	getDefaultValue() {
		if (!this.isOption("default")) return null;
		let e = "";
		for (let t = this.indexOf("default") + 1; t < thi'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('s.src.length; t++) {
			let n = this.src[t].getValue();
			if (n === "/" || n === "-" || n === "[") break;
			e += n;
		}
		return e;
	}
	getBetweenClause() {
		if (!this.isOption("between")) return null;
		let e = this.indexOf("between");
		return this.src[e + 1].getValue() + " and " + this.src[e + 3].getValue();
	}
	parseValues() {
		if (this.isOption("check")) return this.listValues("check");
		if (this.isOption("values")) return this.listValues("values");
		if (this.isOption("between")) {
			let e = this.listValues("between"), t = [];
			for (let n = parseInt(String(e[0])); n <= parseInt(String(e[1])); n++) t.push(n);
			return t;
		}
		return null;
	}
	apparentDepth() {
		let e = this.content.split(/ |\t/), t = 0;
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			if (r === "	") {
				t += 4;
				continue;
			}
			if (r === "") {
				t++;
				continue;
			}
			return t;
		}
		throw Error("No alphanumerics in the node content");
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
			return this.colprefix !== void 0 && (e = this.colprefix + "_"), this._ctx.optionEQvalue("prefixPKwithTname", "yes") && (e = (l(this.parseName()) ?? this.parseName()) + "_"), e + "id";
		}
		return null;
	}
	getPkName() {
		let e = this.getGenIdColName();
		return e === null ? this.getExplicitPkName() : e;
	}
	getPkType() {
		if (this.getGenIdColName() === null) {
			let e = this.getExplicitPkName();
			return this.findChild(e).inferType();
		}
		return "integer";
	}
	lateInitFks() {
		if (this.fks === null && (this.fks = {}), !this.isMany2One()) {
			this.parent !== null && this.inferType() === "table" && ((this.parent.getPkName() ?? "").indexOf(",") < 0 ? this.fks[(l(this.parent.parseName()) ?? '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('this.parent.parseName()) + "_id"] = this.parent.parseName() : this.fks[l(this.parent.getPkName() ?? "") ?? this.parent.parseName()] = this.parent.parseName());
			for (let e = 0; e < this.children.length; e++) {
				let t = this.children[e].refId();
				t !== null && (this.fks[this.children[e].parseName()] = t);
			}
		}
	}
	cardinality() {
		if (this.isOption("insert")) {
			let e = this.indexOf("insert"), t = parseInt(this.src[e + 1].value), n = this._ctx.getOptionValue("datalimit");
			return n < t && (t = n), t;
		}
		return 0;
	}
	isArray() {
		return !this.isMany2One() && this.parent !== null;
	}
	hasNonArrayChildId(e) {
		if (!e.endsWith("_id")) return !1;
		let t = e.slice(0, -3);
		return this.children.some((e) => e.children.length > 0 && e.parseName() === t && !e.isArray());
	}
	getTransColumns() {
		let e = [];
		for (let t = 0; t < this.children.length; t++) {
			let n = this.children[t];
			(n.isOption("trans") || n.isOption("translation") || n.isOption("translations")) && e.push(n);
		}
		return e;
	}
	getBaseType() {
		let e = this.inferType(), t = e.indexOf(" not null");
		return t > 0 && (e = e.substring(0, t)), t = e.indexOf("\n"), t > 0 && (e = e.substring(0, t)), e;
	}
};
//#endregion
//#region src/compiler/parser.ts
function oe(e) {
	let t = e.input, n = [], r = [], i = x(t + "\n", !0, !0, "`");
	e.data = null;
	let a = null, o = "";
	OUTER: for (let t = 0; t < i.length; t++) {
		let s = i[t];
		if (s.value === "\n" && a === null) {
			if (o = o.replace(/\r/g, ""), (o.match(/\{/g) ?? []).length > (o.match(/\}/g) ?? []).length) continue;
			if (o.replace(/\r/g, "").replace(/ /g, "") === "") {
				o = "";
				continue;
			}
			let t = new M(s.line - 1, o, null, e), i = !1;
			for (let a = 0; a < n.length; a++) {
				let c = n[a];
				if (t.apparentDepth() <= c.apparentDepth()) if (0 < a) {
					let r = n[a - 1];
					t = new M(s.line - 1, o, r, e), n[a] = t, n = n.slice(0, a + 1), i = !0;
					break;
				} else n[0] = t, n = n.slice(0, 1), r.push('));
  DBMS_LOB.APPEND(l_src, TO_CLOB('t), i = !0;
			}
			if (!i) {
				if (0 < n.length) {
					let r = n[n.length - 1];
					t = new M(s.line - 1, o, r, e);
				}
				n.push(t), t.apparentDepth() === 0 && r.push(t);
			}
			if (t.isMany2One()) {
				let e = t.parent;
				e.fks === null && (e.fks = {});
				let n = t.refId();
				n === null && (n = t.parseName()), e.fks[t.parseName() + "_id"] = n;
			}
			o = "";
			continue;
		}
		if (a === null && s.value === "#") {
			a = "";
			continue;
		}
		if (a !== null) {
			if (a += s.value, s.value !== "\n" && s.value !== "}") continue;
			let t = x(a, !1, !0, "");
			if (t.length % 4 == 3 && t[1].value === ":") {
				e.setOptions(a), a = null, o = "";
				continue;
			}
			let n = null, r = null;
			for (let i in t) {
				let s = t[i];
				if (n === null && s.value === "flattened") {
					n = "";
					continue;
				}
				if (n !== null) {
					if (n += s.value, n === "=" || n.charAt(n.length - 1) !== "}") continue;
					let t = n.substring(1);
					try {
						e.data = JSON.parse(t), a = null, o = "";
						continue OUTER;
					} catch {}
				}
				if (r === null && s.value === "settings") {
					r = "";
					continue;
				}
				if (r !== null) {
					r += s.value;
					try {
						e.setOptions(r), a = null, o = "";
						continue OUTER;
					} catch {}
				}
			}
		}
		if (s.type !== "comment") {
			if (s.type === "line-comment") {
				0 < o.trim().length && (o += s.value);
				continue;
			}
			o += s.value;
		}
	}
	return r;
}
//#endregion
//#region src/utils/translate.ts
var se = [
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
], ce = [
	"「販売」",
	"「財務」",
	"「配送」",
	"「製造」",
	"「エンジニア」",
	"「コンサルタント」",
	"「アーキテクト」",
	"「マネージャー」",
	"「アナリスト」",
	"「スペシャリスト」",
	"「エバンジェリスト」"
], le = [
	"영업",
	"금융",
	"배송",
	"제조",
	"엔지니어",
	"컨설턴트",
	"건축가",
	"관리자",
	"분석가",
	"전문가",
	"전도자",
	"판매원"
];
function ue(e, t) {
	if (typeof t != "string") return t;
	let n = e.substr'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ing(0, 2).toLowerCase();
	if (n === "en") return t;
	let r = t.startsWith("''") ? t.slice(1, -1) : t, i = se.indexOf(r);
	return i < 0 ? t : n === "jp" && i < ce.length ? "''" + ce[i] + "''" : n === "kr" && i < le.length ? "''" + le[i] + "''" : t;
}
//#endregion
//#region src/utils/sample.ts
var de = /* @__PURE__ */ c((/* @__PURE__ */ o(((e, t) => {
	(function() {
		var n = 9007199254740992, r = -n, i = "0123456789", a = "abcdefghijklmnopqrstuvwxyz", o = a.toUpperCase(), s = i + "abcdef";
		function c(e) {
			this.name = "UnsupportedError", this.message = e || "This feature is not supported on this platform";
		}
		c.prototype = /* @__PURE__ */ Error(), c.prototype.constructor = c;
		var l = Array.prototype.slice;
		function u(e) {
			if (!(this instanceof u)) return e ||= null, e === null ? new u() : new u(e);
			if (typeof e == "function") return this.random = e, this;
			arguments.length && (this.seed = 0);
			for (var t = 0; t < arguments.length; t++) {
				var n = 0;
				if (Object.prototype.toString.call(arguments[t]) === "[object String]") for (var r = 0; r < arguments[t].length; r++) {
					for (var i = 0, a = 0; a < arguments[t].length; a++) i = arguments[t].charCodeAt(a) + (i << 6) + (i << 16) - i;
					n += i;
				}
				else n = arguments[t];
				this.seed += (arguments.length - t) * n;
			}
			return this.mt = this.mersenne_twister(this.seed), this.bimd5 = this.blueimp_md5(), this.random = function() {
				return this.mt.random(this.seed);
			}, this;
		}
		u.prototype.VERSION = "1.1.13";
		function d(e, t) {
			if (e ||= {}, t) for (var n in t) e[n] === void 0 && (e[n] = t[n]);
			return e;
		}
		function f(e) {
			return Array.apply(null, Array(e)).map(function(e, t) {
				return t;
			});
		}
		function p(e, t) {
			if (e) throw RangeError(t);
		}
		var m = function() {
			throw Error("No Base64 encoder available.");
		};
		(function() {
			typeof btoa == "function" ? m = btoa : typeof Buffer == "function" && (m = function(e) {
				return new Buffer(e'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(').toString("base64");
			});
		})(), u.prototype.bool = function(e) {
			return e = d(e, { likelihood: 50 }), p(e.likelihood < 0 || e.likelihood > 100, "Chance: Likelihood accepts values from 0 to 100."), this.random() * 100 < e.likelihood;
		}, u.prototype.falsy = function(e) {
			e = d(e, { pool: [
				!1,
				null,
				0,
				NaN,
				"",
				void 0
			] });
			var t = e.pool;
			return t[this.integer({
				min: 0,
				max: t.length - 1
			})];
		}, u.prototype.animal = function(e) {
			return e = d(e), e.type === void 0 ? this.pick(this.get("animals")[this.pick([
				"desert",
				"forest",
				"ocean",
				"zoo",
				"farm",
				"pet",
				"grassland"
			])]) : (p(!this.get("animals")[e.type.toLowerCase()], "Please pick from desert, ocean, grassland, forest, zoo, pets, farm."), this.pick(this.get("animals")[e.type.toLowerCase()]));
		}, u.prototype.character = function(e) {
			e = d(e);
			var t = "!@#$%^&*()[]", n = e.casing === "lower" ? a : e.casing === "upper" ? o : a + o, r;
			return e.pool ? r = e.pool : (r = "", e.alpha && (r += n), e.numeric && (r += i), e.symbols && (r += t), r ||= n + i + t), r.charAt(this.natural({ max: r.length - 1 }));
		}, u.prototype.floating = function(e) {
			e = d(e, { fixed: 4 }), p(e.fixed && e.precision, "Chance: Cannot specify both fixed and precision.");
			var t, r = 10 ** e.fixed, i = n / r, a = -i;
			p(e.min && e.fixed && e.min < a, "Chance: Min specified is out of range with fixed. Min should be, at least, " + a), p(e.max && e.fixed && e.max > i, "Chance: Max specified is out of range with fixed. Max should be, at most, " + i), e = d(e, {
				min: a,
				max: i
			}), t = this.integer({
				min: e.min * r,
				max: e.max * r
			});
			var o = (t / r).toFixed(e.fixed);
			return parseFloat(o);
		}, u.prototype.integer = function(e) {
			return e = d(e, {
				min: r,
				max: n
			}), p(e.min > e.max, "Chance: Min cannot be greater than Max."), Math.floor(this.random() * (e.max - e.min + 1) + e.min);
		}, u.prototype.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('natural = function(e) {
			if (e = d(e, {
				min: 0,
				max: n
			}), typeof e.numerals == "number" && (p(e.numerals < 1, "Chance: Numerals cannot be less than one."), e.min = 10 ** (e.numerals - 1), e.max = 10 ** e.numerals - 1), p(e.min < 0, "Chance: Min cannot be less than zero."), e.exclude) {
				for (var t in p(!Array.isArray(e.exclude), "Chance: exclude must be an array."), e.exclude) p(!Number.isInteger(e.exclude[t]), "Chance: exclude must be numbers.");
				var r = e.min + this.natural({ max: e.max - e.min - e.exclude.length }), i = e.exclude.sort((e, t) => e - t);
				for (var a in i) {
					if (r < i[a]) break;
					r++;
				}
				return r;
			}
			return this.integer(e);
		}, u.prototype.prime = function(e) {
			e = d(e, {
				min: 0,
				max: 1e4
			}), p(e.min < 0, "Chance: Min cannot be less than zero."), p(e.min > e.max, "Chance: Min cannot be greater than Max.");
			var t = b.primes[b.primes.length - 1];
			if (e.max > t) for (var n = t + 2; n <= e.max; ++n) this.is_prime(n) && b.primes.push(n);
			var r = b.primes.filter(function(t) {
				return t >= e.min && t <= e.max;
			});
			return this.pick(r);
		}, u.prototype.is_prime = function(e) {
			if (e % 1 || e < 2) return !1;
			if (e % 2 == 0) return e === 2;
			if (e % 3 == 0) return e === 3;
			for (var t = Math.sqrt(e), n = 5; n <= t; n += 6) if (e % n === 0 || e % (n + 2) === 0) return !1;
			return !0;
		}, u.prototype.hex = function(e) {
			e = d(e, {
				min: 0,
				max: n,
				casing: "lower"
			}), p(e.min < 0, "Chance: Min cannot be less than zero.");
			var t = this.natural({
				min: e.min,
				max: e.max
			});
			return e.casing === "upper" ? t.toString(16).toUpperCase() : t.toString(16);
		}, u.prototype.letter = function(e) {
			e = d(e, { casing: "lower" });
			var t = this.character({ pool: "abcdefghijklmnopqrstuvwxyz" });
			return e.casing === "upper" && (t = t.toUpperCase()), t;
		}, u.prototype.string = function(e) {
			e = d(e, {
				min: 5,
				max: 20
			}), e.length !=='));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' 0 && !e.length && (e.length = this.natural({
				min: e.min,
				max: e.max
			})), p(e.length < 0, "Chance: Length cannot be less than zero.");
			var t = e.length;
			return this.n(this.character, t, e).join("");
		};
		function h(e) {
			this.c = e;
		}
		h.prototype = { substitute: function() {
			return this.c;
		} };
		function g(e) {
			this.c = e;
		}
		g.prototype = { substitute: function() {
			if (!/[{}\\]/.test(this.c)) throw Error("Invalid escape sequence: \"\\" + this.c + "\".");
			return this.c;
		} };
		function _(e) {
			this.c = e;
		}
		_.prototype = {
			replacers: {
				"#": function(e) {
					return e.character({ pool: i });
				},
				A: function(e) {
					return e.character({ pool: o });
				},
				a: function(e) {
					return e.character({ pool: a });
				}
			},
			substitute: function(e) {
				var t = this.replacers[this.c];
				if (!t) throw Error("Invalid replacement character: \"" + this.c + "\".");
				return t(e);
			}
		};
		function v(e) {
			for (var t = [], n = "identity", r = 0; r < e.length; r++) {
				var i = e[r];
				switch (n) {
					case "escape":
						t.push(new g(i)), n = "identity";
						break;
					case "identity":
						i === "{" ? n = "replace" : i === "\\" ? n = "escape" : t.push(new h(i));
						break;
					case "replace":
						i === "}" ? n = "identity" : t.push(new _(i));
						break;
				}
			}
			return t;
		}
		u.prototype.template = function(e) {
			if (!e) throw Error("Template string is required");
			var t = this;
			return v(e).map(function(e) {
				return e.substitute(t);
			}).join("");
		}, u.prototype.buffer = function(e) {
			if (typeof Buffer > "u") throw new c("Sorry, the buffer() function is not supported on your platform");
			e = d(e, { length: this.natural({
				min: 5,
				max: 20
			}) }), p(e.length < 0, "Chance: Length cannot be less than zero.");
			var t = e.length, n = this.n(this.character, t, e);
			return Buffer.from(n);
		}, u.prototype.capitalize = function(e) {
			return e.char'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('At(0).toUpperCase() + e.substr(1);
		}, u.prototype.mixin = function(e) {
			for (var t in e) this[t] = e[t];
			return this;
		}, u.prototype.unique = function(e, t, n) {
			p(typeof e != "function", "Chance: The first argument must be a function.");
			var r = function(e, t) {
				return e.indexOf(t) !== -1;
			};
			n && (r = n.comparator || r);
			for (var i = [], a = 0, o, s = t * 50, c = l.call(arguments, 2); i.length < t;) {
				var u = JSON.parse(JSON.stringify(c));
				if (o = e.apply(this, u), r(i, o) || (i.push(o), a = 0), ++a > s) throw RangeError("Chance: num is likely too large for sample set");
			}
			return i;
		}, u.prototype.n = function(e, t) {
			p(typeof e != "function", "Chance: The first argument must be a function."), t === void 0 && (t = 1);
			var n = t, r = [], i = l.call(arguments, 2);
			for (n = Math.max(0, n); n--;) r.push(e.apply(this, i));
			return r;
		}, u.prototype.pad = function(e, t, n) {
			return n ||= "0", e += "", e.length >= t ? e : Array(t - e.length + 1).join(n) + e;
		}, u.prototype.pick = function(e, t) {
			if (e.length === 0) throw RangeError("Chance: Cannot pick() from an empty array");
			return !t || t === 1 ? e[this.natural({ max: e.length - 1 })] : this.shuffle(e).slice(0, t);
		}, u.prototype.pickone = function(e) {
			if (e.length === 0) throw RangeError("Chance: Cannot pickone() from an empty array");
			return e[this.natural({ max: e.length - 1 })];
		}, u.prototype.pickset = function(e, t) {
			if (t === 0) return [];
			if (e.length === 0) throw RangeError("Chance: Cannot pickset() from an empty array");
			if (t < 0) throw RangeError("Chance: Count must be a positive number");
			if (!t || t === 1) return [this.pickone(e)];
			var n = e.slice(0), r = n.length;
			return this.n(function() {
				var e = this.natural({ max: --r }), t = n[e];
				return n[e] = n[r], t;
			}, Math.min(r, t));
		}, u.prototype.shuffle = function(e) {
			for (var t = [], n = 0, r = Number(e.length), i = f(r), a = r - 1, o, s = '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('0; s < r; s++) o = this.natural({ max: a }), n = i[o], t[s] = e[n], i[o] = i[a], --a;
			return t;
		}, u.prototype.weighted = function(e, t, n) {
			if (e.length !== t.length) throw RangeError("Chance: Length of array and weights must match");
			for (var r = 0, i, a = 0; a < t.length; ++a) {
				if (i = t[a], isNaN(i)) throw RangeError("Chance: All weights must be numbers");
				i > 0 && (r += i);
			}
			if (r === 0) throw RangeError("Chance: No valid entries in array weights");
			var o = this.random() * r, s = 0, c = -1, l;
			for (a = 0; a < t.length; ++a) {
				if (i = t[a], s += i, i > 0) {
					if (o <= s) {
						l = a;
						break;
					}
					c = a;
				}
				a === t.length - 1 && (l = c);
			}
			var u = e[l];
			return n = n !== void 0 && n, n && (e.splice(l, 1), t.splice(l, 1)), u;
		}, u.prototype.paragraph = function(e) {
			e = d(e);
			var t = e.sentences || this.natural({
				min: 3,
				max: 7
			}), n = this.n(this.sentence, t), r = e.linebreak === !0 ? "\n" : " ";
			return n.join(r);
		}, u.prototype.sentence = function(e) {
			e = d(e);
			var t = e.words || this.natural({
				min: 12,
				max: 18
			}), n = e.punctuation, r = this.n(this.word, t).join(" ");
			return r = this.capitalize(r), n !== !1 && !/^[.?;!:]$/.test(n) && (n = "."), n && (r += n), r;
		}, u.prototype.syllable = function(e) {
			e = d(e);
			for (var t = e.length || this.natural({
				min: 2,
				max: 3
			}), n = "bcdfghjklmnprstvwz", r = "aeiou", i = n + r, a = "", o, s = 0; s < t; s++) o = s === 0 ? this.character({ pool: i }) : n.indexOf(o) === -1 ? this.character({ pool: n }) : this.character({ pool: r }), a += o;
			return e.capitalize && (a = this.capitalize(a)), a;
		}, u.prototype.word = function(e) {
			e = d(e), p(e.syllables && e.length, "Chance: Cannot specify both syllables AND length.");
			var t = e.syllables || this.natural({
				min: 1,
				max: 3
			}), n = "";
			if (e.length) {
				do
					n += this.syllable();
				while (n.length < e.length);
				n '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('= n.substring(0, e.length);
			} else for (var r = 0; r < t; r++) n += this.syllable();
			return e.capitalize && (n = this.capitalize(n)), n;
		}, u.prototype.emoji = function(e) {
			e = d(e, {
				category: "all",
				length: 1
			}), p(e.length < 1 || BigInt(e.length) > BigInt(n), "Chance: length must be between 1 and " + String(n));
			var t = this.get("emojis");
			e.category === "all" && (e.category = this.pickone(Object.keys(t)));
			var r = t[e.category];
			return p(r === void 0, "Chance: Unrecognised emoji category: [" + e.category + "]."), this.pickset(r, e.length).map(function(e) {
				return String.fromCodePoint(e);
			}).join("");
		}, u.prototype.age = function(e) {
			e = d(e);
			var t;
			switch (e.type) {
				case "child":
					t = {
						min: 0,
						max: 12
					};
					break;
				case "teen":
					t = {
						min: 13,
						max: 19
					};
					break;
				case "adult":
					t = {
						min: 18,
						max: 65
					};
					break;
				case "senior":
					t = {
						min: 65,
						max: 100
					};
					break;
				case "all":
					t = {
						min: 0,
						max: 100
					};
					break;
				default:
					t = {
						min: 18,
						max: 65
					};
					break;
			}
			return this.natural(t);
		}, u.prototype.birthday = function(e) {
			var t = this.age(e), n = /* @__PURE__ */ new Date(), r = n.getFullYear();
			if (e && e.type) {
				var i = /* @__PURE__ */ new Date(), a = /* @__PURE__ */ new Date();
				i.setFullYear(r - t - 1), a.setFullYear(r - t), e = d(e, {
					min: i,
					max: a
				});
			} else if (e && (e.minAge !== void 0 || e.maxAge !== void 0)) {
				p(e.minAge < 0, "Chance: MinAge cannot be less than zero."), p(e.minAge > e.maxAge, "Chance: MinAge cannot be greater than MaxAge.");
				var o = e.minAge === void 0 ? 0 : e.minAge, s = e.maxAge === void 0 ? 100 : e.maxAge, c = new Date(r - s - 1, n.getMonth(), n.getDate()), l = new Date(r - o, n.getMonth(), n.getDate());
				c.setDate(c.getDate() + 1), l.setDate(l.getDate() + 1), l.setMil'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('liseconds(l.getMilliseconds() - 1), e = d(e, {
					min: c,
					max: l
				});
			} else e = d(e, { year: r - t });
			return this.date(e);
		}, u.prototype.cpf = function(e) {
			e = d(e, { formatted: !0 });
			var t = this.n(this.natural, 9, { max: 9 }), n = t[8] * 2 + t[7] * 3 + t[6] * 4 + t[5] * 5 + t[4] * 6 + t[3] * 7 + t[2] * 8 + t[1] * 9 + t[0] * 10;
			n = 11 - n % 11, n >= 10 && (n = 0);
			var r = n * 2 + t[8] * 3 + t[7] * 4 + t[6] * 5 + t[5] * 6 + t[4] * 7 + t[3] * 8 + t[2] * 9 + t[1] * 10 + t[0] * 11;
			r = 11 - r % 11, r >= 10 && (r = 0);
			var i = "" + t[0] + t[1] + t[2] + "." + t[3] + t[4] + t[5] + "." + t[6] + t[7] + t[8] + "-" + n + r;
			return e.formatted ? i : i.replace(/\D/g, "");
		}, u.prototype.cnpj = function(e) {
			e = d(e, { formatted: !0 });
			var t = this.n(this.natural, 12, { max: 12 }), n = t[11] * 2 + t[10] * 3 + t[9] * 4 + t[8] * 5 + t[7] * 6 + t[6] * 7 + t[5] * 8 + t[4] * 9 + t[3] * 2 + t[2] * 3 + t[1] * 4 + t[0] * 5;
			n = 11 - n % 11, n < 2 && (n = 0);
			var r = n * 2 + t[11] * 3 + t[10] * 4 + t[9] * 5 + t[8] * 6 + t[7] * 7 + t[6] * 8 + t[5] * 9 + t[4] * 2 + t[3] * 3 + t[2] * 4 + t[1] * 5 + t[0] * 6;
			r = 11 - r % 11, r < 2 && (r = 0);
			var i = "" + t[0] + t[1] + "." + t[2] + t[3] + t[4] + "." + t[5] + t[6] + t[7] + "/" + t[8] + t[9] + t[10] + t[11] + "-" + n + r;
			return e.formatted ? i : i.replace(/\D/g, "");
		}, u.prototype.first = function(e) {
			return e = d(e, {
				gender: this.gender(),
				nationality: "en"
			}), this.pick(this.get("firstNames")[e.gender.toLowerCase()][e.nationality.toLowerCase()]);
		}, u.prototype.profession = function(e) {
			return e = d(e), e.rank ? this.pick([
				"Apprentice ",
				"Junior ",
				"Senior ",
				"Lead "
			]) + this.pick(this.get("profession")) : this.pick(this.get("profession"));
		}, u.prototype.company = function() {
			return this.pick(this.get("company"));
		}, u.prototype.gender = function(e) {
			return e = d(e, { extraGenders: [] }), this.pick(["Male", "Femal'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('e"].concat(e.extraGenders));
		}, u.prototype.last = function(e) {
			if (e = d(e, { nationality: "*" }), e.nationality === "*") {
				var t = [], n = this.get("lastNames");
				return Object.keys(n).forEach(function(e) {
					t = t.concat(n[e]);
				}), this.pick(t);
			} else return this.pick(this.get("lastNames")[e.nationality.toLowerCase()]);
		}, u.prototype.israelId = function() {
			for (var e = this.string({
				pool: "0123456789",
				length: 8
			}), t = 0, n = 0; n < e.length; n++) {
				var r = e[n] * (n / 2 === parseInt(n / 2) ? 1 : 2);
				r = this.pad(r, 2).toString(), r = parseInt(r[0]) + parseInt(r[1]), t += r;
			}
			return e += (10 - parseInt(t.toString().slice(-1))).toString().slice(-1), e;
		}, u.prototype.mrz = function(e) {
			var t = function(e) {
				var t = "<ABCDEFGHIJKLMNOPQRSTUVWXYXZ".split(""), n = [
					7,
					3,
					1
				], r = 0;
				return typeof e != "string" && (e = e.toString()), e.split("").forEach(function(e, i) {
					var a = t.indexOf(e);
					e = a === -1 ? parseInt(e, 10) : a === 0 ? 0 : a + 9, e *= n[i % n.length], r += e;
				}), r % 10;
			}, n = function(e) {
				var n = function(e) {
					return Array(e + 1).join("<");
				}, r = [
					"P<",
					e.issuer,
					e.last.toUpperCase(),
					"<<",
					e.first.toUpperCase(),
					n(39 - (e.last.length + e.first.length + 2)),
					e.passportNumber,
					t(e.passportNumber),
					e.nationality,
					e.dob,
					t(e.dob),
					e.gender,
					e.expiry,
					t(e.expiry),
					n(14),
					t(n(14))
				].join("");
				return r + t(r.substr(44, 10) + r.substr(57, 7) + r.substr(65, 7));
			}, r = this;
			return e = d(e, {
				first: this.first(),
				last: this.last(),
				passportNumber: this.integer({
					min: 1e8,
					max: 999999999
				}),
				dob: function() {
					var e = r.birthday({ type: "adult" });
					return [
						e.getFullYear().toString().substr(2),
						r.pad(e.getMonth() + 1, 2),
						r.pad(e.getDate(), 2)
					].join("");
				}(),
				expiry: function('));
  DBMS_LOB.APPEND(l_src, TO_CLOB(') {
					var e = /* @__PURE__ */ new Date();
					return [
						(e.getFullYear() + 5).toString().substr(2),
						r.pad(e.getMonth() + 1, 2),
						r.pad(e.getDate(), 2)
					].join("");
				}(),
				gender: this.gender() === "Female" ? "F" : "M",
				issuer: "GBR",
				nationality: "GBR"
			}), n(e);
		}, u.prototype.name = function(e) {
			e = d(e);
			var t = this.first(e), n = this.last(e), r = e.middle ? t + " " + this.first(e) + " " + n : e.middle_initial ? t + " " + this.character({
				alpha: !0,
				casing: "upper"
			}) + ". " + n : t + " " + n;
			return e.prefix && (r = this.prefix(e) + " " + r), e.suffix && (r = r + " " + this.suffix(e)), r;
		}, u.prototype.name_prefixes = function(e) {
			e ||= "all", e = e.toLowerCase();
			var t = [{
				name: "Doctor",
				abbreviation: "Dr."
			}];
			return (e === "male" || e === "all") && t.push({
				name: "Mister",
				abbreviation: "Mr."
			}), (e === "female" || e === "all") && (t.push({
				name: "Miss",
				abbreviation: "Miss"
			}), t.push({
				name: "Misses",
				abbreviation: "Mrs."
			})), t;
		}, u.prototype.prefix = function(e) {
			return this.name_prefix(e);
		}, u.prototype.name_prefix = function(e) {
			return e = d(e, { gender: "all" }), e.full ? this.pick(this.name_prefixes(e.gender)).name : this.pick(this.name_prefixes(e.gender)).abbreviation;
		}, u.prototype.HIDN = function() {
			var e = "0123456789", t = "ABCDEFGHIJKLMNOPQRSTUVWXYXZ", n = "";
			return n += this.string({
				pool: e,
				length: 6
			}), n += this.string({
				pool: t,
				length: 2
			}), n;
		}, u.prototype.ssn = function(e) {
			e = d(e, {
				ssnFour: !1,
				dashes: !0
			});
			var t = "1234567890", n, r = e.dashes ? "-" : "";
			return n = e.ssnFour ? this.string({
				pool: t,
				length: 4
			}) : this.string({
				pool: t,
				length: 3
			}) + r + this.string({
				pool: t,
				length: 2
			}) + r + this.string({
				pool: t,
				length: 4
			}), n;
		}, u.prototype.aadhar = function(e) {
			e = d(e, {
				on'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('lyLastFour: !1,
				separatedByWhiteSpace: !0
			});
			var t = "1234567890", n, r = e.separatedByWhiteSpace ? " " : "";
			return n = e.onlyLastFour ? this.string({
				pool: t,
				length: 4
			}) : this.string({
				pool: t,
				length: 4
			}) + r + this.string({
				pool: t,
				length: 4
			}) + r + this.string({
				pool: t,
				length: 4
			}), n;
		}, u.prototype.name_suffixes = function() {
			return [
				{
					name: "Doctor of Osteopathic Medicine",
					abbreviation: "D.O."
				},
				{
					name: "Doctor of Philosophy",
					abbreviation: "Ph.D."
				},
				{
					name: "Esquire",
					abbreviation: "Esq."
				},
				{
					name: "Junior",
					abbreviation: "Jr."
				},
				{
					name: "Juris Doctor",
					abbreviation: "J.D."
				},
				{
					name: "Master of Arts",
					abbreviation: "M.A."
				},
				{
					name: "Master of Business Administration",
					abbreviation: "M.B.A."
				},
				{
					name: "Master of Science",
					abbreviation: "M.S."
				},
				{
					name: "Medical Doctor",
					abbreviation: "M.D."
				},
				{
					name: "Senior",
					abbreviation: "Sr."
				},
				{
					name: "The Third",
					abbreviation: "III"
				},
				{
					name: "The Fourth",
					abbreviation: "IV"
				},
				{
					name: "Bachelor of Engineering",
					abbreviation: "B.E"
				},
				{
					name: "Bachelor of Technology",
					abbreviation: "B.TECH"
				}
			];
		}, u.prototype.suffix = function(e) {
			return this.name_suffix(e);
		}, u.prototype.name_suffix = function(e) {
			return e = d(e), e.full ? this.pick(this.name_suffixes()).name : this.pick(this.name_suffixes()).abbreviation;
		}, u.prototype.nationalities = function() {
			return this.get("nationalities");
		}, u.prototype.nationality = function() {
			return this.pick(this.nationalities()).name;
		}, u.prototype.zodiac = function() {
			return this.pickone([
				"Aries",
				"Taurus",
				"Gemini",
				"Cancer",
				"Leo",
				"Virgo",
				"Libra",
				"Scorpio",
				"Sagittarius",
				"C'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('apricorn",
				"Aquarius",
				"Pisces"
			]);
		}, u.prototype.android_id = function() {
			return "APA91" + this.string({
				pool: "0123456789abcefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_",
				length: 178
			});
		}, u.prototype.apple_token = function() {
			return this.string({
				pool: "abcdef1234567890",
				length: 64
			});
		}, u.prototype.wp8_anid2 = function() {
			return m(this.hash({ length: 32 }));
		}, u.prototype.wp7_anid = function() {
			return "A=" + this.guid().replace(/-/g, "").toUpperCase() + "&E=" + this.hash({ length: 3 }) + "&W=" + this.integer({
				min: 0,
				max: 9
			});
		}, u.prototype.bb_pin = function() {
			return this.hash({ length: 8 });
		}, u.prototype.avatar = function(e) {
			var t = null, n = "//www.gravatar.com/avatar/", r = {
				http: "http",
				https: "https"
			}, i = {
				bmp: "bmp",
				gif: "gif",
				jpg: "jpg",
				png: "png"
			}, a = {
				404: "404",
				mm: "mm",
				identicon: "identicon",
				monsterid: "monsterid",
				wavatar: "wavatar",
				retro: "retro",
				blank: "blank"
			}, o = {
				g: "g",
				pg: "pg",
				r: "r",
				x: "x"
			}, s = {
				protocol: null,
				email: null,
				fileExtension: null,
				size: null,
				fallback: null,
				rating: null
			};
			if (!e) s.email = this.email(), e = {};
			else if (typeof e == "string") s.email = e, e = {};
			else if (typeof e != "object") return null;
			else if (e.constructor === "Array") return null;
			return s = d(e, s), s.email ||= this.email(), s.protocol = r[s.protocol] ? s.protocol + ":" : "", s.size = parseInt(s.size, 0) ? s.size : "", s.rating = o[s.rating] ? s.rating : "", s.fallback = a[s.fallback] ? s.fallback : "", s.fileExtension = i[s.fileExtension] ? s.fileExtension : "", t = s.protocol + n + this.bimd5.md5(s.email) + (s.fileExtension ? "." + s.fileExtension : "") + (s.size || s.rating || s.fallback ? "?" : "") + (s.size ? "&s=" + s.size.toString() : "") + (s.rating ? "&r=" + s.rating : "") + (s.fallback ? "&d=" + s.fallb'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ack : ""), t;
		}, u.prototype.color = function(e) {
			function t(e, t) {
				return [
					e,
					e,
					e
				].join(t || "");
			}
			function n(e) {
				var n = e ? "rgba" : "rgb", r = e ? "," + this.floating({
					min: m,
					max: h
				}) : "", s = i ? t(this.natural({
					min: a,
					max: o
				}), ",") : this.natural({
					min: l,
					max: u
				}) + "," + this.natural({
					min: f,
					max: p
				}) + "," + this.natural({ max: 255 });
				return n + "(" + s + r + ")";
			}
			function r(n, r, d) {
				var m = d ? "#" : "", h = "";
				return i ? (h = t(this.pad(this.hex({
					min: a,
					max: o
				}), 2)), e.format === "shorthex" && (h = t(this.hex({
					min: 0,
					max: 15
				})))) : h = e.format === "shorthex" ? this.pad(this.hex({
					min: Math.floor(s / 16),
					max: Math.floor(c / 16)
				}), 1) + this.pad(this.hex({
					min: Math.floor(l / 16),
					max: Math.floor(u / 16)
				}), 1) + this.pad(this.hex({
					min: Math.floor(f / 16),
					max: Math.floor(p / 16)
				}), 1) : s !== void 0 || c !== void 0 || l !== void 0 || u !== void 0 || f !== void 0 || p !== void 0 ? this.pad(this.hex({
					min: s,
					max: c
				}), 2) + this.pad(this.hex({
					min: l,
					max: u
				}), 2) + this.pad(this.hex({
					min: f,
					max: p
				}), 2) : this.pad(this.hex({
					min: a,
					max: o
				}), 2) + this.pad(this.hex({
					min: a,
					max: o
				}), 2) + this.pad(this.hex({
					min: a,
					max: o
				}), 2), m + h;
			}
			e = d(e, {
				format: this.pick([
					"hex",
					"shorthex",
					"rgb",
					"rgba",
					"0x",
					"name"
				]),
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
			var i = e.grayscale, a = e.min, o = e.max, s = e.min_red, c = e.max_red, l = e.min_green, u = e.max_green, f = e.min_blue, p = e.max_blue, m = e.min_alpha'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(', h = e.max_alpha;
			e.min_red === void 0 && (s = a), e.max_red === void 0 && (c = o), e.min_green === void 0 && (l = a), e.max_green === void 0 && (u = o), e.min_blue === void 0 && (f = a), e.max_blue === void 0 && (p = o), e.min_alpha === void 0 && (m = 0), e.max_alpha === void 0 && (h = 1), i && a === 0 && o === 255 && s !== void 0 && c !== void 0 && (a = (s + l + f) / 3, o = (c + u + p) / 3);
			var g;
			if (e.format === "hex") g = r.call(this, 2, 6, !0);
			else if (e.format === "shorthex") g = r.call(this, 1, 3, !0);
			else if (e.format === "rgb") g = n.call(this, !1);
			else if (e.format === "rgba") g = n.call(this, !0);
			else if (e.format === "0x") g = "0x" + r.call(this, 2, 6);
			else if (e.format === "name") return this.pick(this.get("colorNames"));
			else throw RangeError("Invalid format provided. Please provide one of \"hex\", \"shorthex\", \"rgb\", \"rgba\", \"0x\" or \"name\".");
			return e.casing === "upper" && (g = g.toUpperCase()), g;
		}, u.prototype.domain = function(e) {
			return e = d(e), this.word() + "." + (e.tld || this.tld());
		}, u.prototype.email = function(e) {
			return e = d(e), this.word({ length: e.length }) + "@" + (e.domain || this.domain());
		}, u.prototype.fbid = function() {
			return "10000" + this.string({
				pool: "1234567890",
				length: 11
			});
		}, u.prototype.google_analytics = function() {
			var e = this.pad(this.natural({ max: 999999 }), 6), t = this.pad(this.natural({ max: 99 }), 2);
			return "UA-" + e + "-" + t;
		}, u.prototype.hashtag = function() {
			return "#" + this.word();
		}, u.prototype.ip = function() {
			return this.natural({
				min: 1,
				max: 254
			}) + "." + this.natural({ max: 255 }) + "." + this.natural({ max: 255 }) + "." + this.natural({
				min: 1,
				max: 254
			});
		}, u.prototype.ipv6 = function() {
			return this.n(this.hash, 8, { length: 4 }).join(":");
		}, u.prototype.klout = function() {
			return this.natural({
				min: 1,
				max: 99
			});
		}, u.prototype.mac = fu'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('nction(e) {
			return e = d(e, { delimiter: ":" }), this.pad(this.natural({ max: 255 }).toString(16), 2) + e.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + e.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + e.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + e.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2) + e.delimiter + this.pad(this.natural({ max: 255 }).toString(16), 2);
		}, u.prototype.semver = function(e) {
			e = d(e, { include_prerelease: !0 });
			var t = this.pickone([
				"^",
				"~",
				"<",
				">",
				"<=",
				">=",
				"="
			]);
			e.range && (t = e.range);
			var n = "";
			return e.include_prerelease && (n = this.weighted([
				"",
				"-dev",
				"-beta",
				"-alpha"
			], [
				50,
				10,
				5,
				1
			])), t + this.rpg("3d10").join(".") + n;
		}, u.prototype.tlds = function() {
			return /* @__PURE__ */ "com,org,edu,gov,co.uk,net,io,ac,ad,ae,af,ag,ai,al,am,ao,aq,ar,as,at,au,aw,ax,az,ba,bb,bd,be,bf,bg,bh,bi,bj,bm,bn,bo,br,bs,bt,bv,bw,by,bz,ca,cc,cd,cf,cg,ch,ci,ck,cl,cm,cn,co,cr,cu,cv,cw,cx,cy,cz,de,dj,dk,dm,do,dz,ec,ee,eg,eh,er,es,et,eu,fi,fj,fk,fm,fo,fr,ga,gb,gd,ge,gf,gg,gh,gi,gl,gm,gn,gp,gq,gr,gs,gt,gu,gw,gy,hk,hm,hn,hr,ht,hu,id,ie,il,im,in,io,iq,ir,is,it,je,jm,jo,jp,ke,kg,kh,ki,km,kn,kp,kr,kw,ky,kz,la,lb,lc,li,lk,lr,ls,lt,lu,lv,ly,ma,mc,md,me,mg,mh,mk,ml,mm,mn,mo,mp,mq,mr,ms,mt,mu,mv,mw,mx,my,mz,na,nc,ne,nf,ng,ni,nl,no,np,nr,nu,nz,om,pa,pe,pf,pg,ph,pk,pl,pm,pn,pr,ps,pt,pw,py,qa,re,ro,rs,ru,rw,sa,sb,sc,sd,se,sg,sh,si,sj,sk,sl,sm,sn,so,sr,ss,st,su,sv,sx,sy,sz,tc,td,tf,tg,th,tj,tk,tl,tm,tn,to,tr,tt,tv,tw,tz,ua,ug,uk,us,uy,uz,va,vc,ve,vg,vi,vn,vu,wf,ws,ye,yt,za,zm,zw".split(",");
		}, u.prototype.tld = function() {
			return this.pick(this.tlds());
		}, u.prototype.twitter = function() {
			return "@" + this.word();
		}, u.prototype.url = function(e) {
			e = d(e, {
				protocol: "http",
				domain: this.domain(e),
				domain_prefix: "",
				path: this.word(),
				ex'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('tensions: []
			});
			var t = e.extensions.length > 0 ? "." + this.pick(e.extensions) : "", n = e.domain_prefix ? e.domain_prefix + "." + e.domain : e.domain;
			return e.protocol + "://" + n + "/" + e.path + t;
		}, u.prototype.port = function() {
			return this.integer({
				min: 0,
				max: 65535
			});
		}, u.prototype.locale = function(e) {
			return e = d(e), e.region ? this.pick(this.get("locale_regions")) : this.pick(this.get("locale_languages"));
		}, u.prototype.locales = function(e) {
			return e = d(e), e.region ? this.get("locale_regions") : this.get("locale_languages");
		}, u.prototype.loremPicsum = function(e) {
			e = d(e, {
				width: 500,
				height: 500,
				greyscale: !1,
				blurred: !1
			});
			var t = e.greyscale ? "g/" : "", n = e.blurred ? "/?blur" : "/?random";
			return "https://picsum.photos/" + t + e.width + "/" + e.height + n;
		}, u.prototype.address = function(e) {
			return e = d(e), this.natural({
				min: 5,
				max: 2e3
			}) + " " + this.street(e);
		}, u.prototype.altitude = function(e) {
			return e = d(e, {
				fixed: 5,
				min: 0,
				max: 8848
			}), this.floating({
				min: e.min,
				max: e.max,
				fixed: e.fixed
			});
		}, u.prototype.areacode = function(e) {
			e = d(e, { parens: !0 });
			var t = e.exampleNumber ? "555" : this.natural({
				min: 2,
				max: 9
			}).toString() + this.natural({
				min: 0,
				max: 8
			}).toString() + this.natural({
				min: 0,
				max: 9
			}).toString();
			return e.parens ? "(" + t + ")" : t;
		}, u.prototype.city = function() {
			return this.capitalize(this.word({ syllables: 3 }));
		}, u.prototype.coordinates = function(e) {
			return this.latitude(e) + ", " + this.longitude(e);
		}, u.prototype.countries = function() {
			return this.get("countries");
		}, u.prototype.country = function(e) {
			e = d(e);
			var t = this.pick(this.countries());
			return e.raw ? t : e.full ? t.name : t.abbreviation;
		}, u.prototype.depth = function(e) {
			return e = d(e, {
				fixed: 5,
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('	min: -10994,
				max: 0
			}), this.floating({
				min: e.min,
				max: e.max,
				fixed: e.fixed
			});
		}, u.prototype.geohash = function(e) {
			return e = d(e, { length: 7 }), this.string({
				length: e.length,
				pool: "0123456789bcdefghjkmnpqrstuvwxyz"
			});
		}, u.prototype.geojson = function(e) {
			return this.latitude(e) + ", " + this.longitude(e) + ", " + this.altitude(e);
		}, u.prototype.latitude = function(e) {
			var [t, n, r] = [
				"ddm",
				"dms",
				"dd"
			];
			e = d(e, e && e.format && [t, n].includes(e.format.toLowerCase()) ? {
				min: 0,
				max: 89,
				fixed: 4
			} : {
				fixed: 5,
				min: -90,
				max: 90,
				format: r
			});
			var i = e.format.toLowerCase();
			switch ((i === t || i === n) && (p(e.min < 0 || e.min > 89, "Chance: Min specified is out of range. Should be between 0 - 89"), p(e.max < 0 || e.max > 89, "Chance: Max specified is out of range. Should be between 0 - 89"), p(e.fixed > 4, "Chance: Fixed specified should be below or equal to 4")), i) {
				case t: return this.integer({
					min: e.min,
					max: e.max
				}) + "°" + this.floating({
					min: 0,
					max: 59,
					fixed: e.fixed
				});
				case n: return this.integer({
					min: e.min,
					max: e.max
				}) + "°" + this.integer({
					min: 0,
					max: 59
				}) + "’" + this.floating({
					min: 0,
					max: 59,
					fixed: e.fixed
				}) + "”";
				case r:
				default: return this.floating({
					min: e.min,
					max: e.max,
					fixed: e.fixed
				});
			}
		}, u.prototype.longitude = function(e) {
			var [t, n, r] = [
				"ddm",
				"dms",
				"dd"
			];
			e = d(e, e && e.format && [t, n].includes(e.format.toLowerCase()) ? {
				min: 0,
				max: 179,
				fixed: 4
			} : {
				fixed: 5,
				min: -180,
				max: 180,
				format: r
			});
			var i = e.format.toLowerCase();
			switch ((i === t || i === n) && (p(e.min < 0 || e.min > 179, "Chance: Min specified is out of range. Should be between 0 - 179"), p(e.max < 0 || e.max > 179, "Chance: Max specifie'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('d is out of range. Should be between 0 - 179"), p(e.fixed > 4, "Chance: Fixed specified should be below or equal to 4")), i) {
				case t: return this.integer({
					min: e.min,
					max: e.max
				}) + "°" + this.floating({
					min: 0,
					max: 59.9999,
					fixed: e.fixed
				});
				case n: return this.integer({
					min: e.min,
					max: e.max
				}) + "°" + this.integer({
					min: 0,
					max: 59
				}) + "’" + this.floating({
					min: 0,
					max: 59.9999,
					fixed: e.fixed
				}) + "”";
				case r:
				default: return this.floating({
					min: e.min,
					max: e.max,
					fixed: e.fixed
				});
			}
		}, u.prototype.phone = function(e) {
			var t = this, n, r = function(e) {
				var n = [];
				return e.sections.forEach(function(e) {
					n.push(t.string({
						pool: "0123456789",
						length: e
					}));
				}), e.area + n.join(" ");
			};
			e = d(e, {
				formatted: !0,
				country: "us",
				mobile: !1,
				exampleNumber: !1
			}), e.formatted || (e.parens = !1);
			var i;
			switch (e.country) {
				case "fr":
					e.mobile ? (n = this.pick(["06", "07"]) + t.string({
						pool: "0123456789",
						length: 8
					}), i = e.formatted ? n.match(/../g).join(" ") : n) : (n = this.pick([
						"01" + this.pick(/* @__PURE__ */ "30.34.39.40.41.42.43.44.45.46.47.48.49.53.55.56.58.60.64.69.70.72.73.74.75.76.77.78.79.80.81.82.83".split(".")) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"02" + this.pick(/* @__PURE__ */ "14.18.22.23.28.29.30.31.32.33.34.35.36.37.38.40.41.43.44.45.46.47.48.49.50.51.52.53.54.56.57.61.62.69.72.76.77.78.85.90.96.97.98.99".split(".")) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"03" + this.pick(/* @__PURE__ */ "10.20.21.22.23.24.25.26.27.28.29.39.44.45.51.52.54.55.57.58.59.60.61.62.63.64.65.66.67.68.69.70.71.72.73.80.81.82.83.84.85.86.87.88.89.90".split(".")) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"04" + this.pick(/* @__PURE__ */ "11.13.15.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('20.22.26.27.30.32.34.37.42.43.44.50.56.57.63.66.67.68.69.70.71.72.73.74.75.76.77.78.79.80.81.82.83.84.85.86.88.89.90.91.92.93.94.95.97.98".split(".")) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"05" + this.pick(/* @__PURE__ */ "08.16.17.19.24.31.32.33.34.35.40.45.46.47.49.53.55.56.57.58.59.61.62.63.64.65.67.79.81.82.86.87.90.94".split(".")) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"09" + t.string({
							pool: "0123456789",
							length: 8
						})
					]), i = e.formatted ? n.match(/../g).join(" ") : n);
					break;
				case "uk":
					e.mobile ? (n = this.pick([{
						area: "07" + this.pick([
							"4",
							"5",
							"7",
							"8",
							"9"
						]),
						sections: [2, 6]
					}, {
						area: "07624 ",
						sections: [6]
					}]), i = e.formatted ? r(n) : r(n).replace(" ", "")) : (n = this.pick([
						{
							area: "01" + this.character({ pool: "234569" }) + "1 ",
							sections: [3, 4]
						},
						{
							area: "020 " + this.character({ pool: "378" }),
							sections: [3, 4]
						},
						{
							area: "023 " + this.character({ pool: "89" }),
							sections: [3, 4]
						},
						{
							area: "024 7",
							sections: [3, 4]
						},
						{
							area: "028 " + this.pick([
								"25",
								"28",
								"37",
								"71",
								"82",
								"90",
								"92",
								"95"
							]),
							sections: [2, 4]
						},
						{
							area: "012" + this.pick([
								"04",
								"08",
								"54",
								"76",
								"97",
								"98"
							]) + " ",
							sections: [6]
						},
						{
							area: "013" + this.pick([
								"63",
								"64",
								"84",
								"86"
							]) + " ",
							sections: [6]
						},
						{
							area: "014" + this.pick([
								"04",
								"20",
								"60",
								"61",
								"80",
								"88"
							]) + " ",
							sections: [6]
						},
						{
							area: "015" + this.pick([
								"24",
								"27",
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('					"62",
								"66"
							]) + " ",
							sections: [6]
						},
						{
							area: "016" + this.pick([
								"06",
								"29",
								"35",
								"47",
								"59",
								"95"
							]) + " ",
							sections: [6]
						},
						{
							area: "017" + this.pick([
								"26",
								"44",
								"50",
								"68"
							]) + " ",
							sections: [6]
						},
						{
							area: "018" + this.pick([
								"27",
								"37",
								"84",
								"97"
							]) + " ",
							sections: [6]
						},
						{
							area: "019" + this.pick([
								"00",
								"05",
								"35",
								"46",
								"49",
								"63",
								"95"
							]) + " ",
							sections: [6]
						}
					]), i = e.formatted ? r(n) : r(n).replace(" ", "", "g"));
					break;
				case "za":
					e.mobile ? (n = this.pick([
						"060" + this.pick([
							"3",
							"4",
							"5",
							"6",
							"7",
							"8",
							"9"
						]) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"061" + this.pick([
							"0",
							"1",
							"2",
							"3",
							"4",
							"5",
							"8"
						]) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"06" + t.string({
							pool: "0123456789",
							length: 7
						}),
						"071" + this.pick([
							"0",
							"1",
							"2",
							"3",
							"4",
							"5",
							"6",
							"7",
							"8",
							"9"
						]) + t.string({
							pool: "0123456789",
							length: 6
						}),
						"07" + this.pick([
							"2",
							"3",
							"4",
							"6",
							"7",
							"8",
							"9"
						]) + t.string({
							pool: "0123456789",
							length: 7
						}),
						"08" + this.pick([
							"0",
							"1",
							"2",
							"3",
							"4",
							"5"
						]) + t.string({
							pool: "0123456789",
							length: 7
						})
					]), i = e.formatted || n) : (n = this.pick([
						"01" + this.pick([
							"0",
							"1",
							"2",
							"3",
							"4",
						'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('	"5",
							"6",
							"7",
							"8"
						]) + t.string({
							pool: "0123456789",
							length: 7
						}),
						"02" + this.pick([
							"1",
							"2",
							"3",
							"4",
							"7",
							"8"
						]) + t.string({
							pool: "0123456789",
							length: 7
						}),
						"03" + this.pick([
							"1",
							"2",
							"3",
							"5",
							"6",
							"9"
						]) + t.string({
							pool: "0123456789",
							length: 7
						}),
						"04" + this.pick([
							"1",
							"2",
							"3",
							"4",
							"5",
							"6",
							"7",
							"8",
							"9"
						]) + t.string({
							pool: "0123456789",
							length: 7
						}),
						"05" + this.pick([
							"1",
							"3",
							"4",
							"6",
							"7",
							"8"
						]) + t.string({
							pool: "0123456789",
							length: 7
						})
					]), i = e.formatted || n);
					break;
				case "us":
					var a = this.areacode(e).toString(), o = this.natural({
						min: 2,
						max: 9
					}).toString() + this.natural({
						min: 0,
						max: 9
					}).toString() + this.natural({
						min: 0,
						max: 9
					}).toString(), s = this.natural({
						min: 1e3,
						max: 9999
					}).toString();
					i = e.formatted ? a + " " + o + "-" + s : a + o + s;
					break;
				case "br":
					var c = this.pick(/* @__PURE__ */ "11.12.13.14.15.16.17.18.19.21.22.24.27.28.31.32.33.34.35.37.38.41.42.43.44.45.46.47.48.49.51.53.54.55.61.62.63.64.65.66.67.68.69.71.73.74.75.77.79.81.82.83.84.85.86.87.88.89.91.92.93.94.95.96.97.98.99".split(".")), l = e.mobile ? "9" + t.string({
						pool: "0123456789",
						length: 4
					}) : this.natural({
						min: 2e3,
						max: 5999
					}).toString(), u = t.string({
						pool: "0123456789",
						length: 4
					});
					i = e.formatted ? "(" + c + ") " + l + "-" + u : c + l + u;
					break;
			}
			return i;
		}, u.prototype.postal = function() {
			var e = this.character({ pool: "XVTSRPNKLMHJGECBA" }) + this.natural({ max: 9 }) + this.character({
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		alpha: !0,
				casing: "upper"
			}), t = this.natural({ max: 9 }) + this.character({
				alpha: !0,
				casing: "upper"
			}) + this.natural({ max: 9 });
			return e + " " + t;
		}, u.prototype.postcode = function() {
			var e = this.pick(this.get("postcodeAreas")).code, t = this.natural({ max: 9 }), n = this.bool() ? this.character({
				alpha: !0,
				casing: "upper"
			}) : "", r = e + t + n, i = this.natural({ max: 9 }) + (this.character({
				alpha: !0,
				casing: "upper"
			}) + this.character({
				alpha: !0,
				casing: "upper"
			}));
			return r + " " + i;
		}, u.prototype.counties = function(e) {
			return e = d(e, { country: "uk" }), this.get("counties")[e.country.toLowerCase()];
		}, u.prototype.county = function(e) {
			return this.pick(this.counties(e)).name;
		}, u.prototype.provinces = function(e) {
			return e = d(e, { country: "ca" }), this.get("provinces")[e.country.toLowerCase()];
		}, u.prototype.province = function(e) {
			return e && e.full ? this.pick(this.provinces(e)).name : this.pick(this.provinces(e)).abbreviation;
		}, u.prototype.state = function(e) {
			return e && e.full ? this.pick(this.states(e)).name : this.pick(this.states(e)).abbreviation;
		}, u.prototype.states = function(e) {
			e = d(e, {
				country: "us",
				us_states_and_dc: !0
			});
			var t;
			switch (e.country.toLowerCase()) {
				case "us":
					var n = this.get("us_states_and_dc"), r = this.get("territories"), i = this.get("armed_forces");
					t = [], e.us_states_and_dc && (t = t.concat(n)), e.territories && (t = t.concat(r)), e.armed_forces && (t = t.concat(i));
					break;
				case "it":
				case "mx":
					t = this.get("country_regions")[e.country.toLowerCase()];
					break;
				case "uk":
					t = this.get("counties")[e.country.toLowerCase()];
					break;
			}
			return t;
		}, u.prototype.street = function(e) {
			e = d(e, {
				country: "us",
				syllables: 2
			});
			var t;
			switch (e.country.toLowerCase()) {
				case "us":
					t = this.word({ syll'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ables: e.syllables }), t = this.capitalize(t), t += " ", t += e.short_suffix ? this.street_suffix(e).abbreviation : this.street_suffix(e).name;
					break;
				case "it":
					t = this.word({ syllables: e.syllables }), t = this.capitalize(t), t = (e.short_suffix ? this.street_suffix(e).abbreviation : this.street_suffix(e).name) + " " + t;
					break;
			}
			return t;
		}, u.prototype.street_suffix = function(e) {
			return e = d(e, { country: "us" }), this.pick(this.street_suffixes(e));
		}, u.prototype.street_suffixes = function(e) {
			return e = d(e, { country: "us" }), this.get("street_suffixes")[e.country.toLowerCase()];
		}, u.prototype.zip = function(e) {
			var t = this.n(this.natural, 5, { max: 9 });
			return e && e.plusfour === !0 && (t.push("-"), t = t.concat(this.n(this.natural, 4, { max: 9 }))), t.join("");
		}, u.prototype.ampm = function() {
			return this.bool() ? "am" : "pm";
		}, u.prototype.date = function(e) {
			var t, n;
			if (e && (e.min || e.max)) {
				e = d(e, {
					american: !0,
					string: !1
				});
				var r = e.min === void 0 ? 1 : e.min.getTime(), i = e.max === void 0 ? 864e13 : e.max.getTime();
				n = new Date(this.integer({
					min: r,
					max: i
				}));
			} else {
				var a = this.month({ raw: !0 }), o = a.days;
				e && e.month && (o = this.get("months")[(e.month % 12 + 12) % 12].days), e = d(e, {
					year: parseInt(this.year(), 10),
					month: a.numeric - 1,
					day: this.natural({
						min: 1,
						max: o
					}),
					hour: this.hour({ twentyfour: !0 }),
					minute: this.minute(),
					second: this.second(),
					millisecond: this.millisecond(),
					american: !0,
					string: !1
				}), n = new Date(e.year, e.month, e.day, e.hour, e.minute, e.second, e.millisecond);
			}
			return t = e.american ? n.getMonth() + 1 + "/" + n.getDate() + "/" + n.getFullYear() : n.getDate() + "/" + (n.getMonth() + 1) + "/" + n.getFullYear(), e.string ? t : n;
		}, u.prototype.hammertime = function(e) {
			return this.date(e).getTi'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('me();
		}, u.prototype.hour = function(e) {
			return e = d(e, {
				min: e && e.twentyfour ? 0 : 1,
				max: e && e.twentyfour ? 23 : 12
			}), p(e.min < 0, "Chance: Min cannot be less than 0."), p(e.twentyfour && e.max > 23, "Chance: Max cannot be greater than 23 for twentyfour option."), p(!e.twentyfour && e.max > 12, "Chance: Max cannot be greater than 12."), p(e.min > e.max, "Chance: Min cannot be greater than Max."), this.natural({
				min: e.min,
				max: e.max
			});
		}, u.prototype.millisecond = function() {
			return this.natural({ max: 999 });
		}, u.prototype.minute = u.prototype.second = function(e) {
			return e = d(e, {
				min: 0,
				max: 59
			}), p(e.min < 0, "Chance: Min cannot be less than 0."), p(e.max > 59, "Chance: Max cannot be greater than 59."), p(e.min > e.max, "Chance: Min cannot be greater than Max."), this.natural({
				min: e.min,
				max: e.max
			});
		}, u.prototype.month = function(e) {
			e = d(e, {
				min: 1,
				max: 12
			}), p(e.min < 1, "Chance: Min cannot be less than 1."), p(e.max > 12, "Chance: Max cannot be greater than 12."), p(e.min > e.max, "Chance: Min cannot be greater than Max.");
			var t = this.pick(this.months().slice(e.min - 1, e.max));
			return e.raw ? t : t.name;
		}, u.prototype.months = function() {
			return this.get("months");
		}, u.prototype.second = function() {
			return this.natural({ max: 59 });
		}, u.prototype.timestamp = function() {
			return this.natural({
				min: 1,
				max: parseInt((/* @__PURE__ */ new Date()).getTime() / 1e3, 10)
			});
		}, u.prototype.weekday = function(e) {
			e = d(e, { weekday_only: !1 });
			var t = [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday"
			];
			return e.weekday_only || (t.push("Saturday"), t.push("Sunday")), this.pickone(t);
		}, u.prototype.year = function(e) {
			return e = d(e, { min: (/* @__PURE__ */ new Date()).getFullYear() }), e.max = e.max === void 0 ? e.min + 100 : e.max, this.natural(e).toString();
		}, u.prototype'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.cc = function(e) {
			e = d(e);
			var t = e.type ? this.cc_type({
				name: e.type,
				raw: !0
			}) : this.cc_type({ raw: !0 }), n = t.prefix.split(""), r = t.length - t.prefix.length - 1;
			return n = n.concat(this.n(this.integer, r, {
				min: 0,
				max: 9
			})), n.push(this.luhn_calculate(n.join(""))), n.join("");
		}, u.prototype.cc_types = function() {
			return this.get("cc_types");
		}, u.prototype.cc_type = function(e) {
			e = d(e);
			var t = this.cc_types(), n = null;
			if (e.name) {
				for (var r = 0; r < t.length; r++) if (t[r].name === e.name || t[r].short_name === e.name) {
					n = t[r];
					break;
				}
				if (n === null) throw RangeError("Chance: Credit card type ''" + e.name + "'' is not supported");
			} else n = this.pick(t);
			return e.raw ? n : n.name;
		}, u.prototype.currency_types = function() {
			return this.get("currency_types");
		}, u.prototype.currency = function() {
			return this.pick(this.currency_types());
		}, u.prototype.timezones = function() {
			return this.get("timezones");
		}, u.prototype.timezone = function() {
			return this.pick(this.timezones());
		}, u.prototype.currency_pair = function(e) {
			var t = this.unique(this.currency, 2, { comparator: function(e, t) {
				return e.reduce(function(e, n) {
					return e || n.code === t.code;
				}, !1);
			} });
			return e ? t[0].code + "/" + t[1].code : t;
		}, u.prototype.dollar = function(e) {
			e = d(e, {
				max: 1e4,
				min: 0
			});
			var t = this.floating({
				min: e.min,
				max: e.max,
				fixed: 2
			}).toString(), n = t.split(".")[1];
			return n === void 0 ? t += ".00" : n.length < 2 && (t += "0"), t < 0 ? "-$" + t.replace("-", "") : "$" + t;
		}, u.prototype.euro = function(e) {
			return Number(this.dollar(e).replace("$", "")).toLocaleString() + "€";
		}, u.prototype.exp = function(e) {
			e = d(e);
			var t = {};
			return t.year = this.exp_year(), t.year === (/* @__PURE__ */ new Date()).getFullYear().toString() ? t.month = this.exp_month({ fu'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ture: !0 }) : t.month = this.exp_month(), e.raw ? t : t.month + "/" + t.year;
		}, u.prototype.exp_month = function(e) {
			e = d(e);
			var t, n, r = (/* @__PURE__ */ new Date()).getMonth() + 1;
			if (e.future && r !== 12) do
				t = this.month({ raw: !0 }).numeric, n = parseInt(t, 10);
			while (n <= r);
			else t = this.month({ raw: !0 }).numeric;
			return t;
		}, u.prototype.exp_year = function() {
			var e = (/* @__PURE__ */ new Date()).getMonth() + 1, t = (/* @__PURE__ */ new Date()).getFullYear();
			return this.year({
				min: e === 12 ? t + 1 : t,
				max: t + 10
			});
		}, u.prototype.vat = function(e) {
			switch (e = d(e, { country: "it" }), e.country.toLowerCase()) {
				case "it": return this.it_vat();
			}
		}, u.prototype.iban = function() {
			var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", t = e + "0123456789";
			return this.string({
				length: 2,
				pool: e
			}) + this.pad(this.integer({
				min: 0,
				max: 99
			}), 2) + this.string({
				length: 4,
				pool: t
			}) + this.pad(this.natural(), this.natural({
				min: 6,
				max: 26
			}));
		}, u.prototype.it_vat = function() {
			var e = this.natural({
				min: 1,
				max: 18e5
			});
			return e = this.pad(e, 7) + this.pad(this.pick(this.provinces({ country: "it" })).code, 3), e + this.luhn_calculate(e);
		}, u.prototype.cf = function(e) {
			e ||= {};
			var t = e.gender ? e.gender : this.gender(), n = e.first ? e.first : this.first({
				gender: t,
				nationality: "it"
			}), r = e.last ? e.last : this.last({ nationality: "it" }), i = e.birthday ? e.birthday : this.birthday(), a = e.city ? e.city : this.pickone([
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"L",
				"M",
				"Z"
			]) + this.pad(this.natural({ max: 999 }), 3), o = [], s = function(e, t) {
				var n, r = [];
				return e.length < 3 ? r = e.split("").concat("XXX".split("")).splice(0, 3) : (n = e.toUpperCase().split("").map(function(e) {
					return "BCDFGHJKLMNPRSTVWZ".indexOf(e) === -1 ? '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('void 0 : e;
				}).join(""), n.length > 3 && (n = t ? n.substr(0, 3) : n[0] + n.substr(2, 2)), n.length < 3 && (r = n, n = e.toUpperCase().split("").map(function(e) {
					return "AEIOU".indexOf(e) === -1 ? void 0 : e;
				}).join("").substr(0, 3 - r.length)), r += n), r;
			};
			return o = o.concat(s(r, !0), s(n), function(e, t, n) {
				return e.getFullYear().toString().substr(2) + [
					"A",
					"B",
					"C",
					"D",
					"E",
					"H",
					"L",
					"M",
					"P",
					"R",
					"S",
					"T"
				][e.getMonth()] + n.pad(e.getDate() + (t.toLowerCase() === "female" ? 40 : 0), 2);
			}(i, t, this), a.toUpperCase().split("")).join(""), o += function(e) {
				for (var t = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", n = "ABCDEFGHIJABCDEFGHIJKLMNOPQRSTUVWXYZ", r = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", i = "BAKPLCQDREVOSFTGUHMINJWZYX", a = 0, o = 0; o < 15; o++) o % 2 == 0 ? a += i.indexOf(n[t.indexOf(e[o])]) : a += r.indexOf(n[t.indexOf(e[o])]);
				return r[a % 26];
			}(o.toUpperCase(), this), o.toUpperCase();
		}, u.prototype.pl_pesel = function() {
			for (var e = this.natural({
				min: 1,
				max: 9999999999
			}), t = this.pad(e, 10).split(""), n = 0; n < t.length; n++) t[n] = parseInt(t[n]);
			var r = (1 * t[0] + 3 * t[1] + 7 * t[2] + 9 * t[3] + 1 * t[4] + 3 * t[5] + 7 * t[6] + 9 * t[7] + 1 * t[8] + 3 * t[9]) % 10;
			return r !== 0 && (r = 10 - r), t.join("") + r;
		}, u.prototype.pl_nip = function() {
			for (var e = this.natural({
				min: 1,
				max: 999999999
			}), t = this.pad(e, 9).split(""), n = 0; n < t.length; n++) t[n] = parseInt(t[n]);
			var r = (6 * t[0] + 5 * t[1] + 7 * t[2] + 2 * t[3] + 3 * t[4] + 4 * t[5] + 5 * t[6] + 6 * t[7] + 7 * t[8]) % 11;
			return r === 10 ? this.pl_nip() : t.join("") + r;
		}, u.prototype.pl_regon = function() {
			for (var e = this.natural({
				min: 1,
				max: 99999999
			}), t = this.pad(e, 8).split(""), n = 0; n < t.length; n++) t[n] = parseInt(t[n]);
			var r = (8 * t[0] + 9 * t[1] + 2 * t[2] + 3 * t[3] + 4 * t[4] + '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('5 * t[5] + 6 * t[6] + 7 * t[7]) % 11;
			return r === 10 && (r = 0), t.join("") + r;
		}, u.prototype.music_genre = function(e = "general") {
			if (!(e.toLowerCase() in b.music_genres)) throw Error(`Unsupported genre: ${e}`);
			let t = b.music_genres[e.toLowerCase()];
			return t[this.integer({
				min: 0,
				max: t.length - 1
			})];
		}, u.prototype.note = function(e) {
			e = d(e, { notes: "flatKey" });
			var t = {
				naturals: [
					"C",
					"D",
					"E",
					"F",
					"G",
					"A",
					"B"
				],
				flats: [
					"D♭",
					"E♭",
					"G♭",
					"A♭",
					"B♭"
				],
				sharps: [
					"C♯",
					"D♯",
					"F♯",
					"G♯",
					"A♯"
				]
			};
			return t.all = t.naturals.concat(t.flats.concat(t.sharps)), t.flatKey = t.naturals.concat(t.flats), t.sharpKey = t.naturals.concat(t.sharps), this.pickone(t[e.notes]);
		}, u.prototype.midi_note = function(e) {
			return e = d(e, {
				min: 0,
				max: 127
			}), this.integer({
				min: e.min,
				max: e.max
			});
		}, u.prototype.chord_quality = function(e) {
			e = d(e, { jazz: !0 });
			var t = [
				"maj",
				"min",
				"aug",
				"dim"
			];
			return e.jazz && (t = [
				"maj7",
				"min7",
				"7",
				"sus",
				"dim",
				"ø"
			]), this.pickone(t);
		}, u.prototype.chord = function(e) {
			return e = d(e), this.note(e) + this.chord_quality(e);
		}, u.prototype.tempo = function(e) {
			return e = d(e, {
				min: 40,
				max: 320
			}), this.integer({
				min: e.min,
				max: e.max
			});
		}, u.prototype.coin = function() {
			return this.bool() ? "heads" : "tails";
		};
		function y(e) {
			return function() {
				return this.natural(e);
			};
		}
		u.prototype.d4 = y({
			min: 1,
			max: 4
		}), u.prototype.d6 = y({
			min: 1,
			max: 6
		}), u.prototype.d8 = y({
			min: 1,
			max: 8
		}), u.prototype.d10 = y({
			min: 1,
			max: 10
		}), u.prototype.d12 = y({
			min: 1,
			max: 12
		}), u.prototype.d20 = y({
			min: 1,
			max: 20
		}), u.prototype.d30 = y({
			min: 1,
			max: 30
		}), u.pro'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('totype.d100 = y({
			min: 1,
			max: 100
		}), u.prototype.rpg = function(e, t) {
			if (t = d(t), e) {
				var n = e.toLowerCase().split("d"), r = [];
				if (n.length !== 2 || !parseInt(n[0], 10) || !parseInt(n[1], 10)) throw Error("Chance: Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
				for (var i = n[0]; i > 0; i--) r[i - 1] = this.natural({
					min: 1,
					max: n[1]
				});
				return t.sum !== void 0 && t.sum ? r.reduce(function(e, t) {
					return e + t;
				}) : r;
			} else throw RangeError("Chance: A type of die roll must be included");
		}, u.prototype.guid = function(e) {
			e = d(e, { version: 5 });
			var t = "abcdef1234567890";
			return this.string({
				pool: t,
				length: 8
			}) + "-" + this.string({
				pool: t,
				length: 4
			}) + "-" + e.version + this.string({
				pool: t,
				length: 3
			}) + "-" + this.string({
				pool: "ab89",
				length: 1
			}) + this.string({
				pool: t,
				length: 3
			}) + "-" + this.string({
				pool: t,
				length: 12
			});
		}, u.prototype.hash = function(e) {
			e = d(e, {
				length: 40,
				casing: "lower"
			});
			var t = e.casing === "upper" ? s.toUpperCase() : s;
			return this.string({
				pool: t,
				length: e.length
			});
		}, u.prototype.luhn_check = function(e) {
			var t = e.toString();
			return +t.substring(t.length - 1) === this.luhn_calculate(+t.substring(0, t.length - 1));
		}, u.prototype.luhn_calculate = function(e) {
			for (var t = e.toString().split("").reverse(), n = 0, r, i = 0, a = t.length; a > i; ++i) r = +t[i], i % 2 == 0 && (r *= 2, r > 9 && (r -= 9)), n += r;
			return n * 9 % 10;
		}, u.prototype.md5 = function(e) {
			var t = {
				str: "",
				key: null,
				raw: !1
			};
			if (!e) t.str = this.string(), e = {};
			else if (typeof e == "string") t.str = e, e = {};
			else if (typeof e != "object") return null;
			else if (e.constructor === "Array") return null;
			if (t = d(e, t), !t'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.str) throw Error("A parameter is required to return an md5 hash.");
			return this.bimd5.md5(t.str, t.key, t.raw);
		}, u.prototype.file = function(e) {
			var t = e || {}, n = "fileExtension", r = Object.keys(this.get("fileExtension")), i = this.word({ length: t.length }), a;
			if (t.extension) return a = t.extension, i + "." + a;
			if (t.extensions) {
				if (Array.isArray(t.extensions)) return a = this.pickone(t.extensions), i + "." + a;
				if (t.extensions.constructor === Object) {
					var o = t.extensions, s = Object.keys(o);
					return a = this.pickone(o[this.pickone(s)]), i + "." + a;
				}
				throw Error("Chance: Extensions must be an Array or Object");
			}
			if (t.fileType) {
				var c = t.fileType;
				if (r.indexOf(c) !== -1) return a = this.pickone(this.get(n)[c]), i + "." + a;
				throw RangeError("Chance: Expect file type value to be ''raster'', ''vector'', ''3d'' or ''document''");
			}
			return a = this.pickone(this.get(n)[this.pickone(r)]), i + "." + a;
		}, u.prototype.fileWithContent = function(e) {
			var t = e || {}, n = "fileName" in t ? t.fileName : this.file().split(".")[0];
			if (n += "." + ("fileExtension" in t ? t.fileExtension : this.file().split(".")[1]), typeof t.fileSize != "number") throw Error("File size must be an integer");
			return {
				fileData: this.buffer({ length: t.fileSize }),
				fileName: n
			};
		};
		var b = {
			firstNames: {
				male: {
					en: /* @__PURE__ */ "James.John.Robert.Michael.William.David.Richard.Joseph.Charles.Thomas.Christopher.Daniel.Matthew.George.Donald.Anthony.Paul.Mark.Edward.Steven.Kenneth.Andrew.Brian.Joshua.Kevin.Ronald.Timothy.Jason.Jeffrey.Frank.Gary.Ryan.Nicholas.Eric.Stephen.Jacob.Larry.Jonathan.Scott.Raymond.Justin.Brandon.Gregory.Samuel.Benjamin.Patrick.Jack.Henry.Walter.Dennis.Jerry.Alexander.Peter.Tyler.Douglas.Harold.Aaron.Jose.Adam.Arthur.Zachary.Carl.Nathan.Albert.Kyle.Lawrence.Joe.Willie.Gerald.Roger.Keith.Jeremy.Terry.Harry.Ralph.Sean.Jesse.Roy.Louis.Billy.Austin.Bruce.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Eugene.Christian.Bryan.Wayne.Russell.Howard.Fred.Ethan.Jordan.Philip.Alan.Juan.Randy.Vincent.Bobby.Dylan.Johnny.Phillip.Victor.Clarence.Ernest.Martin.Craig.Stanley.Shawn.Travis.Bradley.Leonard.Earl.Gabriel.Jimmy.Francis.Todd.Noah.Danny.Dale.Cody.Carlos.Allen.Frederick.Logan.Curtis.Alex.Joel.Luis.Norman.Marvin.Glenn.Tony.Nathaniel.Rodney.Melvin.Alfred.Steve.Cameron.Chad.Edwin.Caleb.Evan.Antonio.Lee.Herbert.Jeffery.Isaac.Derek.Ricky.Marcus.Theodore.Elijah.Luke.Jesus.Eddie.Troy.Mike.Dustin.Ray.Adrian.Bernard.Leroy.Angel.Randall.Wesley.Ian.Jared.Mason.Hunter.Calvin.Oscar.Clifford.Jay.Shane.Ronnie.Barry.Lucas.Corey.Manuel.Leo.Tommy.Warren.Jackson.Isaiah.Connor.Don.Dean.Jon.Julian.Miguel.Bill.Lloyd.Charlie.Mitchell.Leon.Jerome.Darrell.Jeremiah.Alvin.Brett.Seth.Floyd.Jim.Blake.Micheal.Gordon.Trevor.Lewis.Erik.Edgar.Vernon.Devin.Gavin.Jayden.Chris.Clyde.Tom.Derrick.Mario.Brent.Marc.Herman.Chase.Dominic.Ricardo.Franklin.Maurice.Max.Aiden.Owen.Lester.Gilbert.Elmer.Gene.Francisco.Glen.Cory.Garrett.Clayton.Sam.Jorge.Chester.Alejandro.Jeff.Harvey.Milton.Cole.Ivan.Andre.Duane.Landon".split("."),
					it: /* @__PURE__ */ "Adolfo.Alberto.Aldo.Alessandro.Alessio.Alfredo.Alvaro.Andrea.Angelo.Angiolo.Antonino.Antonio.Attilio.Benito.Bernardo.Bruno.Carlo.Cesare.Christian.Claudio.Corrado.Cosimo.Cristian.Cristiano.Daniele.Dario.David.Davide.Diego.Dino.Domenico.Duccio.Edoardo.Elia.Elio.Emanuele.Emiliano.Emilio.Enrico.Enzo.Ettore.Fabio.Fabrizio.Federico.Ferdinando.Fernando.Filippo.Francesco.Franco.Gabriele.Giacomo.Giampaolo.Giampiero.Giancarlo.Gianfranco.Gianluca.Gianmarco.Gianni.Gino.Giorgio.Giovanni.Giuliano.Giulio.Giuseppe.Graziano.Gregorio.Guido.Iacopo.Jacopo.Lapo.Leonardo.Lorenzo.Luca.Luciano.Luigi.Manuel.Marcello.Marco.Marino.Mario.Massimiliano.Massimo.Matteo.Mattia.Maurizio.Mauro.Michele.Mirko.Mohamed.Nello.Neri.Niccolò.Nicola.Osvaldo.Otello.Paolo.Pier Luigi.Piero.Pietro.Raffaele.Remo.Renato.Renzo.Riccardo.Roberto.Rolando.Romano.Salvatore.Samuele.Sandro.Sergio.Silvano.Simone.Stefano.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Thomas.Tommaso.Ubaldo.Ugo.Umberto.Valerio.Valter.Vasco.Vincenzo.Vittorio".split("."),
					nl: /* @__PURE__ */ "Aaron.Abel.Adam.Adriaan.Albert.Alexander.Ali.Arjen.Arno.Bart.Bas.Bastiaan.Benjamin.Bob.Boris.Bram.Brent.Cas.Casper.Chris.Christiaan.Cornelis.Daan.Daley.Damian.Dani.Daniel.Daniël.David.Dean.Dirk.Dylan.Egbert.Elijah.Erik.Erwin.Evert.Ezra.Fabian.Fedde.Finn.Florian.Floris.Frank.Frans.Frederik.Freek.Geert.Gerard.Gerben.Gerrit.Gijs.Guus.Hans.Hendrik.Henk.Herman.Hidde.Hugo.Jaap.Jan Jaap.Jan-Willem.Jack.Jacob.Jan.Jason.Jasper.Jayden.Jelle.Jelte.Jens.Jeroen.Jesse.Jim.Job.Joep.Johannes.John.Jonathan.Joris.Joshua.Joël.Julian.Kees.Kevin.Koen.Lars.Laurens.Leendert.Lennard.Lodewijk.Luc.Luca.Lucas.Lukas.Luuk.Maarten.Marcus.Martijn.Martin.Matthijs.Maurits.Max.Mees.Melle.Mick.Mika.Milan.Mohamed.Mohammed.Morris.Muhammed.Nathan.Nick.Nico.Niek.Niels.Noah.Noud.Olivier.Oscar.Owen.Paul.Pepijn.Peter.Pieter.Pim.Quinten.Reinier.Rens.Robin.Ruben.Sam.Samuel.Sander.Sebastiaan.Sem.Sep.Sepp.Siem.Simon.Stan.Stef.Steven.Stijn.Sven.Teun.Thijmen.Thijs.Thomas.Tijn.Tim.Timo.Tobias.Tom.Victor.Vince.Willem.Wim.Wouter.Yusuf".split("."),
					fr: /* @__PURE__ */ "Aaron.Abdon.Abel.Abélard.Abelin.Abondance.Abraham.Absalon.Acace.Achaire.Achille.Adalard.Adalbald.Adalbéron.Adalbert.Adalric.Adam.Adegrin.Adel.Adelin.Andelin.Adelphe.Adam.Adéodat.Adhémar.Adjutor.Adolphe.Adonis.Adon.Adrien.Agapet.Agathange.Agathon.Agilbert.Agénor.Agnan.Aignan.Agrippin.Aimable.Aimé.Alain.Alban.Albin.Aubin.Albéric.Albert.Albertet.Alcibiade.Alcide.Alcée.Alcime.Aldonce.Aldric.Aldéric.Aleaume.Alexandre.Alexis.Alix.Alliaume.Aleaume.Almine.Almire.Aloïs.Alphée.Alphonse.Alpinien.Alverède.Amalric.Amaury.Amandin.Amant.Ambroise.Amédée.Amélien.Amiel.Amour.Anaël.Anastase.Anatole.Ancelin.Andéol.Andoche.André.Andoche.Ange.Angelin.Angilbe.Anglebert.Angoustan.Anicet.Anne.Annibal.Ansbert.Anselme.Anthelme.Antheaume.Anthime.Antide.Antoine.Antonius.Antonin.Apollinaire.Apollon.Aquilin.Arcade.Archambaud.Archambeau.Archange.Archibald.Arian.Ariel.A'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('riste.Aristide.Armand.Armel.Armin.Arnould.Arnaud.Arolde.Arsène.Arsinoé.Arthaud.Arthème.Arthur.Ascelin.Athanase.Aubry.Audebert.Audouin.Audran.Audric.Auguste.Augustin.Aurèle.Aurélien.Aurian.Auxence.Axel.Aymard.Aymeric.Aymon.Aymond.Balthazar.Baptiste.Barnabé.Barthélemy.Bartimée.Basile.Bastien.Baudouin.Bénigne.Benjamin.Benoît.Bérenger.Bérard.Bernard.Bertrand.Blaise.Bon.Boniface.Bouchard.Brice.Brieuc.Bruno.Brunon.Calixte.Calliste.Camélien.Camille.Camillien.Candide.Caribert.Carloman.Cassandre.Cassien.Cédric.Céleste.Célestin.Célien.Césaire.César.Charles.Charlemagne.Childebert.Chilpéric.Chrétien.Christian.Christodule.Christophe.Chrysostome.Clarence.Claude.Claudien.Cléandre.Clément.Clotaire.Côme.Constance.Constant.Constantin.Corentin.Cyprien.Cyriaque.Cyrille.Cyril.Damien.Daniel.David.Delphin.Denis.Désiré.Didier.Dieudonné.Dimitri.Dominique.Dorian.Dorothée.Edgard.Edmond.Édouard.Éleuthère.Élie.Élisée.Émeric.Émile.Émilien.Emmanuel.Enguerrand.Épiphane.Éric.Esprit.Ernest.Étienne.Eubert.Eudes.Eudoxe.Eugène.Eusèbe.Eustache.Évariste.Évrard.Fabien.Fabrice.Falba.Félicité.Félix.Ferdinand.Fiacre.Fidèle.Firmin.Flavien.Flodoard.Florent.Florentin.Florestan.Florian.Fortuné.Foulques.Francisque.François.Français.Franciscus.Francs.Frédéric.Fulbert.Fulcran.Fulgence.Gabin.Gabriel.Gaël.Garnier.Gaston.Gaspard.Gatien.Gaud.Gautier.Gédéon.Geoffroy.Georges.Géraud.Gérard.Gerbert.Germain.Gervais.Ghislain.Gilbert.Gilles.Girart.Gislebert.Gondebaud.Gonthier.Gontran.Gonzague.Grégoire.Guérin.Gui.Guillaume.Gustave.Guy.Guyot.Hardouin.Hector.Hédelin.Hélier.Henri.Herbert.Herluin.Hervé.Hilaire.Hildebert.Hincmar.Hippolyte.Honoré.Hubert.Hugues.Innocent.Isabeau.Isidore.Jacques.Japhet.Jason.Jean.Jeannel.Jeannot.Jérémie.Jérôme.Joachim.Joanny.Job.Jocelyn.Joël.Johan.Jonas.Jonathan.Joseph.Josse.Josselin.Jourdain.Jude.Judicaël.Jules.Julien.Juste.Justin.Lambert.Landry.Laurent.Lazare.Léandre.Léon.Léonard.Léopold.Leu.Loup.Leufroy.Libère.Liétald.Lionel.Loïc.Longin.Lorrain.Lorraine.Lothaire.Louis.Loup.Luc.Lucas.Lucien.Ludolphe.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Ludovic.Macaire.Malo.Mamert.Manassé.Marc.Marceau.Marcel.Marcelin.Marius.Marseille.Martial.Martin.Mathurin.Matthias.Mathias.Matthieu.Maugis.Maurice.Mauricet.Maxence.Maxime.Maximilien.Mayeul.Médéric.Melchior.Mence.Merlin.Mérovée.Michaël.Michel.Moïse.Morgan.Nathan.Nathanaël.Narcisse.Néhémie.Nestor.Nestor.Nicéphore.Nicolas.Noé.Noël.Norbert.Normand.Normands.Octave.Odilon.Odon.Oger.Olivier.Oury.Pacôme.Palémon.Parfait.Pascal.Paterne.Patrice.Paul.Pépin.Perceval.Philémon.Philibert.Philippe.Philothée.Pie.Pierre.Pierrick.Prosper.Quentin.Raoul.Raphaël.Raymond.Régis.Réjean.Rémi.Renaud.René.Reybaud.Richard.Robert.Roch.Rodolphe.Rodrigue.Roger.Roland.Romain.Romuald.Roméo.Rome.Ronan.Roselin.Salomon.Samuel.Savin.Savinien.Scholastique.Sébastien.Séraphin.Serge.Séverin.Sidoine.Sigebert.Sigismond.Silvère.Simon.Siméon.Sixte.Stanislas.Stéphane.Stephan.Sylvain.Sylvestre.Tancrède.Tanguy.Taurin.Théodore.Théodose.Théophile.Théophraste.Thibault.Thibert.Thierry.Thomas.Timoléon.Timothée.Titien.Tonnin.Toussaint.Trajan.Tristan.Turold.Tim.Ulysse.Urbain.Valentin.Valère.Valéry.Venance.Venant.Venceslas.Vianney.Victor.Victorien.Victorin.Vigile.Vincent.Vital.Vitalien.Vivien.Waleran.Wandrille.Xavier.Xénophon.Yves.Zacharie.Zaché.Zéphirin".split(".")
				},
				female: {
					en: /* @__PURE__ */ "Mary.Emma.Elizabeth.Minnie.Margaret.Ida.Alice.Bertha.Sarah.Annie.Clara.Ella.Florence.Cora.Martha.Laura.Nellie.Grace.Carrie.Maude.Mabel.Bessie.Jennie.Gertrude.Julia.Hattie.Edith.Mattie.Rose.Catherine.Lillian.Ada.Lillie.Helen.Jessie.Louise.Ethel.Lula.Myrtle.Eva.Frances.Lena.Lucy.Edna.Maggie.Pearl.Daisy.Fannie.Josephine.Dora.Rosa.Katherine.Agnes.Marie.Nora.May.Mamie.Blanche.Stella.Ellen.Nancy.Effie.Sallie.Nettie.Della.Lizzie.Flora.Susie.Maud.Mae.Etta.Harriet.Sadie.Caroline.Katie.Lydia.Elsie.Kate.Susan.Mollie.Alma.Addie.Georgia.Eliza.Lulu.Nannie.Lottie.Amanda.Belle.Charlotte.Rebecca.Ruth.Viola.Olive.Amelia.Hannah.Jane.Virginia.Emily.Matilda.Irene.Kathryn.Esther.Willie.Henrietta.Ollie.Amy.Rachel.Sara.Estella.Theresa.Aug'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('usta.Ora.Pauline.Josie.Lola.Sophia.Leona.Anne.Mildred.Ann.Beulah.Callie.Lou.Delia.Eleanor.Barbara.Iva.Louisa.Maria.Mayme.Evelyn.Estelle.Nina.Betty.Marion.Bettie.Dorothy.Luella.Inez.Lela.Rosie.Allie.Millie.Janie.Cornelia.Victoria.Ruby.Winifred.Alta.Celia.Christine.Beatrice.Birdie.Harriett.Mable.Myra.Sophie.Tillie.Isabel.Sylvia.Carolyn.Isabelle.Leila.Sally.Ina.Essie.Bertie.Nell.Alberta.Katharine.Lora.Rena.Mina.Rhoda.Mathilda.Abbie.Eula.Dollie.Hettie.Eunice.Fanny.Ola.Lenora.Adelaide.Christina.Lelia.Nelle.Sue.Johanna.Lilly.Lucinda.Minerva.Lettie.Roxie.Cynthia.Helena.Hilda.Hulda.Bernice.Genevieve.Jean.Cordelia.Marian.Francis.Jeanette.Adeline.Gussie.Leah.Lois.Lura.Mittie.Hallie.Isabella.Olga.Phoebe.Teresa.Hester.Lida.Lina.Winnie.Claudia.Marguerite.Vera.Cecelia.Bess.Emilie.Rosetta.Verna.Myrtie.Cecilia.Elva.Olivia.Ophelia.Georgie.Elnora.Violet.Adele.Lily.Linnie.Loretta.Madge.Polly.Virgie.Eugenia.Lucile.Lucille.Mabelle.Rosalie".split("."),
					it: /* @__PURE__ */ "Ada.Adriana.Alessandra.Alessia.Alice.Angela.Anna.Anna Maria.Annalisa.Annita.Annunziata.Antonella.Arianna.Asia.Assunta.Aurora.Barbara.Beatrice.Benedetta.Bianca.Bruna.Camilla.Carla.Carlotta.Carmela.Carolina.Caterina.Catia.Cecilia.Chiara.Cinzia.Clara.Claudia.Costanza.Cristina.Daniela.Debora.Diletta.Dina.Donatella.Elena.Eleonora.Elisa.Elisabetta.Emanuela.Emma.Eva.Federica.Fernanda.Fiorella.Fiorenza.Flora.Franca.Francesca.Gabriella.Gaia.Gemma.Giada.Gianna.Gina.Ginevra.Giorgia.Giovanna.Giulia.Giuliana.Giuseppa.Giuseppina.Grazia.Graziella.Greta.Ida.Ilaria.Ines.Iolanda.Irene.Irma.Isabella.Jessica.Laura.Lea.Letizia.Licia.Lidia.Liliana.Lina.Linda.Lisa.Livia.Loretta.Luana.Lucia.Luciana.Lucrezia.Luisa.Manuela.Mara.Marcella.Margherita.Maria.Maria Cristina.Maria Grazia.Maria Luisa.Maria Pia.Maria Teresa.Marina.Marisa.Marta.Martina.Marzia.Matilde.Melissa.Michela.Milena.Mirella.Monica.Natalina.Nella.Nicoletta.Noemi.Olga.Paola.Patrizia.Piera.Pierina.Raffaella.Rebecca.Renata.Rina.Rita.Roberta.Rosa.Rosanna.Rossana.Rossella.Sabrina.S'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('andra.Sara.Serena.Silvana.Silvia.Simona.Simonetta.Sofia.Sonia.Stefania.Susanna.Teresa.Tina.Tiziana.Tosca.Valentina.Valeria.Vanda.Vanessa.Vanna.Vera.Veronica.Vilma.Viola.Virginia.Vittoria".split("."),
					nl: /* @__PURE__ */ "Ada.Arianne.Afke.Amanda.Amber.Amy.Aniek.Anita.Anja.Anna.Anne.Annelies.Annemarie.Annette.Anouk.Astrid.Aukje.Barbara.Bianca.Carla.Carlijn.Carolien.Chantal.Charlotte.Claudia.Daniëlle.Debora.Diane.Dora.Eline.Elise.Ella.Ellen.Emma.Esmee.Evelien.Esther.Erica.Eva.Femke.Fleur.Floor.Froukje.Gea.Gerda.Hanna.Hanneke.Heleen.Hilde.Ilona.Ina.Inge.Ingrid.Iris.Isabel.Isabelle.Janneke.Jasmijn.Jeanine.Jennifer.Jessica.Johanna.Joke.Julia.Julie.Karen.Karin.Katja.Kim.Lara.Laura.Lena.Lianne.Lieke.Lilian.Linda.Lisa.Lisanne.Lotte.Louise.Maaike.Manon.Marga.Maria.Marissa.Marit.Marjolein.Martine.Marleen.Melissa.Merel.Miranda.Michelle.Mirjam.Mirthe.Naomi.Natalie.Nienke.Nina.Noortje.Olivia.Patricia.Paula.Paulien.Ramona.Ria.Rianne.Roos.Rosanne.Ruth.Sabrina.Sandra.Sanne.Sara.Saskia.Silvia.Sofia.Sophie.Sonja.Suzanne.Tamara.Tess.Tessa.Tineke.Valerie.Vanessa.Veerle.Vera.Victoria.Wendy.Willeke.Yvonne.Zoë".split("."),
					fr: /* @__PURE__ */ "Abdon.Abel.Abigaëlle.Abigaïl.Acacius.Acanthe.Adalbert.Adalsinde.Adegrine.Adélaïde.Adèle.Adélie.Adeline.Adeltrude.Adolphe.Adonis.Adrastée.Adrehilde.Adrienne.Agathe.Agilbert.Aglaé.Aignan.Agneflète.Agnès.Agrippine.Aimé.Alaine.Alaïs.Albane.Albérade.Alberte.Alcide.Alcine.Alcyone.Aldegonde.Aleth.Alexandrine.Alexine.Alice.Aliénor.Aliette.Aline.Alix.Alizé.Aloïse.Aloyse.Alphonsine.Althée.Amaliane.Amalthée.Amande.Amandine.Amant.Amarande.Amaranthe.Amaryllis.Ambre.Ambroisie.Amélie.Améthyste.Aminte.Anaël.Anaïs.Anastasie.Anatole.Ancelin.Andrée.Anémone.Angadrême.Angèle.Angeline.Angélique.Angilbert.Anicet.Annabelle.Anne.Annette.Annick.Annie.Annonciade.Ansbert.Anstrudie.Anthelme.Antigone.Antoinette.Antonine.Aphélie.Apolline.Apollonie.Aquiline.Arabelle.Arcadie.Archange.Argine.Ariane.Aricie.Ariel.Arielle.Arlette.Armance.Armande.Armandine.Armelle.Armide.Armell'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('e.Armin.Arnaud.Arsène.Arsinoé.Artémis.Arthur.Ascelin.Ascension.Assomption.Astarté.Astérie.Astrée.Astrid.Athalie.Athanasie.Athina.Aube.Albert.Aude.Audrey.Augustine.Aure.Aurélie.Aurélien.Aurèle.Aurore.Auxence.Aveline.Abigaëlle.Avoye.Axelle.Aymard.Azalée.Adèle.Adeline.Barbe.Basilisse.Bathilde.Béatrice.Béatrix.Bénédicte.Bérengère.Bernadette.Berthe.Bertille.Beuve.Blanche.Blanc.Blandine.Brigitte.Brune.Brunehilde.Callista.Camille.Capucine.Carine.Caroline.Cassandre.Catherine.Cécile.Céleste.Célestine.Céline.Chantal.Charlène.Charline.Charlotte.Chloé.Christelle.Christiane.Christine.Claire.Clara.Claude.Claudine.Clarisse.Clémence.Clémentine.Cléo.Clio.Clotilde.Coline.Conception.Constance.Coralie.Coraline.Corentine.Corinne.Cyrielle.Daniel.Daniel.Daphné.Débora.Delphine.Denise.Diane.Dieudonné.Dominique.Doriane.Dorothée.Douce.Édith.Edmée.Éléonore.Éliane.Élia.Éliette.Élisabeth.Élise.Ella.Élodie.Éloïse.Elsa.Émeline.Émérance.Émérentienne.Émérencie.Émilie.Emma.Emmanuelle.Emmelie.Ernestine.Esther.Estelle.Eudoxie.Eugénie.Eulalie.Euphrasie.Eusébie.Évangéline.Eva.Ève.Évelyne.Fanny.Fantine.Faustine.Félicie.Fernande.Flavie.Fleur.Flore.Florence.Florie.Fortuné.France.Francia.Françoise.Francine.Gabrielle.Gaëlle.Garance.Geneviève.Georgette.Gerberge.Germaine.Gertrude.Gisèle.Guenièvre.Guilhemine.Guillemette.Gustave.Gwenael.Hélène.Héloïse.Henriette.Hermine.Hermione.Hippolyte.Honorine.Hortense.Huguette.Ines.Irène.Irina.Iris.Isabeau.Isabelle.Iseult.Isolde.Ismérie.Jacinthe.Jacqueline.Jade.Janine.Jeanne.Jocelyne.Joëlle.Joséphine.Judith.Julia.Julie.Jules.Juliette.Justine.Katy.Kathy.Katie.Laura.Laure.Laureline.Laurence.Laurene.Lauriane.Laurianne.Laurine.Léa.Léna.Léonie.Léon.Léontine.Lorraine.Lucie.Lucienne.Lucille.Ludivine.Lydie.Lydie.Megane.Madeleine.Magali.Maguelone.Mallaury.Manon.Marceline.Margot.Marguerite.Marianne.Marie.Myriam.Marie.Marine.Marion.Marlène.Marthe.Martine.Mathilde.Maud.Maureen.Mauricette.Maxime.Mélanie.Melissa.Mélissandre.Mélisande.Mélodie.Michel.Micheline.Mireille.Miriam.Moïse.Monique.M'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('organe.Muriel.Mylène.Nadège.Nadine.Nathalie.Nicole.Nicolette.Nine.Noël.Noémie.Océane.Odette.Odile.Olive.Olivia.Olympe.Ombline.Ombeline.Ophélie.Oriande.Oriane.Ozanne.Pascale.Pascaline.Paule.Paulette.Pauline.Priscille.Prisca.Prisque.Pécine.Pélagie.Pénélope.Perrine.Pétronille.Philippine.Philomène.Philothée.Primerose.Prudence.Pulchérie.Quentine.Quiéta.Quintia.Quintilla.Rachel.Raphaëlle.Raymonde.Rebecca.Régine.Réjeanne.René.Rita.Rita.Rolande.Romane.Rosalie.Rose.Roseline.Sabine.Salomé.Sandra.Sandrine.Sarah.Ségolène.Séverine.Sibylle.Simone.Sixt.Solange.Soline.Solène.Sophie.Stéphanie.Suzanne.Sylvain.Sylvie.Tatiana.Thaïs.Théodora.Thérèse.Tiphaine.Ursule.Valentine.Valérie.Véronique.Victoire.Victorine.Vinciane.Violette.Virginie.Viviane.Xavière.Yolande.Ysaline.Yvette.Yvonne.Zélie.Zita.Zoé".split(".")
				}
			},
			lastNames: {
				en: /* @__PURE__ */ "Smith.Johnson.Williams.Jones.Brown.Davis.Miller.Wilson.Moore.Taylor.Anderson.Thomas.Jackson.White.Harris.Martin.Thompson.Garcia.Martinez.Robinson.Clark.Rodriguez.Lewis.Lee.Walker.Hall.Allen.Young.Hernandez.King.Wright.Lopez.Hill.Scott.Green.Adams.Baker.Gonzalez.Nelson.Carter.Mitchell.Perez.Roberts.Turner.Phillips.Campbell.Parker.Evans.Edwards.Collins.Stewart.Sanchez.Morris.Rogers.Reed.Cook.Morgan.Bell.Murphy.Bailey.Rivera.Cooper.Richardson.Cox.Howard.Ward.Torres.Peterson.Gray.Ramirez.James.Watson.Brooks.Kelly.Sanders.Price.Bennett.Wood.Barnes.Ross.Henderson.Coleman.Jenkins.Perry.Powell.Long.Patterson.Hughes.Flores.Washington.Butler.Simmons.Foster.Gonzales.Bryant.Alexander.Russell.Griffin.Diaz.Hayes.Myers.Ford.Hamilton.Graham.Sullivan.Wallace.Woods.Cole.West.Jordan.Owens.Reynolds.Fisher.Ellis.Harrison.Gibson.McDonald.Cruz.Marshall.Ortiz.Gomez.Murray.Freeman.Wells.Webb.Simpson.Stevens.Tucker.Porter.Hunter.Hicks.Crawford.Henry.Boyd.Mason.Morales.Kennedy.Warren.Dixon.Ramos.Reyes.Burns.Gordon.Shaw.Holmes.Rice.Robertson.Hunt.Black.Daniels.Palmer.Mills.Nichols.Grant.Knight.Ferguson.Rose.Stone.Hawkins.Dunn.Perkins.Hudson.Spencer.Gardner.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Stephens.Payne.Pierce.Berry.Matthews.Arnold.Wagner.Willis.Ray.Watkins.Olson.Carroll.Duncan.Snyder.Hart.Cunningham.Bradley.Lane.Andrews.Ruiz.Harper.Fox.Riley.Armstrong.Carpenter.Weaver.Greene.Lawrence.Elliott.Chavez.Sims.Austin.Peters.Kelley.Franklin.Lawson.Fields.Gutierrez.Ryan.Schmidt.Carr.Vasquez.Castillo.Wheeler.Chapman.Oliver.Montgomery.Richards.Williamson.Johnston.Banks.Meyer.Bishop.McCoy.Howell.Alvarez.Morrison.Hansen.Fernandez.Garza.Harvey.Little.Burton.Stanley.Nguyen.George.Jacobs.Reid.Kim.Fuller.Lynch.Dean.Gilbert.Garrett.Romero.Welch.Larson.Frazier.Burke.Hanson.Day.Mendoza.Moreno.Bowman.Medina.Fowler.Brewer.Hoffman.Carlson.Silva.Pearson.Holland.Douglas.Fleming.Jensen.Vargas.Byrd.Davidson.Hopkins.May.Terry.Herrera.Wade.Soto.Walters.Curtis.Neal.Caldwell.Lowe.Jennings.Barnett.Graves.Jimenez.Horton.Shelton.Barrett.Obrien.Castro.Sutton.Gregory.McKinney.Lucas.Miles.Craig.Rodriquez.Chambers.Holt.Lambert.Fletcher.Watts.Bates.Hale.Rhodes.Pena.Beck.Newman.Haynes.McDaniel.Mendez.Bush.Vaughn.Parks.Dawson.Santiago.Norris.Hardy.Love.Steele.Curry.Powers.Schultz.Barker.Guzman.Page.Munoz.Ball.Keller.Chandler.Weber.Leonard.Walsh.Lyons.Ramsey.Wolfe.Schneider.Mullins.Benson.Sharp.Bowen.Daniel.Barber.Cummings.Hines.Baldwin.Griffith.Valdez.Hubbard.Salazar.Reeves.Warner.Stevenson.Burgess.Santos.Tate.Cross.Garner.Mann.Mack.Moss.Thornton.Dennis.McGee.Farmer.Delgado.Aguilar.Vega.Glover.Manning.Cohen.Harmon.Rodgers.Robbins.Newton.Todd.Blair.Higgins.Ingram.Reese.Cannon.Strickland.Townsend.Potter.Goodwin.Walton.Rowe.Hampton.Ortega.Patton.Swanson.Joseph.Francis.Goodman.Maldonado.Yates.Becker.Erickson.Hodges.Rios.Conner.Adkins.Webster.Norman.Malone.Hammond.Flowers.Cobb.Moody.Quinn.Blake.Maxwell.Pope.Floyd.Osborne.Paul.McCarthy.Guerrero.Lindsey.Estrada.Sandoval.Gibbs.Tyler.Gross.Fitzgerald.Stokes.Doyle.Sherman.Saunders.Wise.Colon.Gill.Alvarado.Greer.Padilla.Simon.Waters.Nunez.Ballard.Schwartz.McBride.Houston.Christensen.Klein.Pratt.Briggs.Parsons.McLaughlin.Zimmerman.French.Buchanan.Mora'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('n.Copeland.Roy.Pittman.Brady.McCormick.Holloway.Brock.Poole.Frank.Logan.Owen.Bass.Marsh.Drake.Wong.Jefferson.Park.Morton.Abbott.Sparks.Patrick.Norton.Huff.Clayton.Massey.Lloyd.Figueroa.Carson.Bowers.Roberson.Barton.Tran.Lamb.Harrington.Casey.Boone.Cortez.Clarke.Mathis.Singleton.Wilkins.Cain.Bryan.Underwood.Hogan.McKenzie.Collier.Luna.Phelps.McGuire.Allison.Bridges.Wilkerson.Nash.Summers.Atkins".split("."),
				it: /* @__PURE__ */ "Acciai.Aglietti.Agostini.Agresti.Ahmed.Aiazzi.Albanese.Alberti.Alessi.Alfani.Alinari.Alterini.Amato.Ammannati.Ancillotti.Andrei.Andreini.Andreoni.Angeli.Anichini.Antonelli.Antonini.Arena.Ariani.Arnetoli.Arrighi.Baccani.Baccetti.Bacci.Bacherini.Badii.Baggiani.Baglioni.Bagni.Bagnoli.Baldassini.Baldi.Baldini.Ballerini.Balli.Ballini.Balloni.Bambi.Banchi.Bandinelli.Bandini.Bani.Barbetti.Barbieri.Barchielli.Bardazzi.Bardelli.Bardi.Barducci.Bargellini.Bargiacchi.Barni.Baroncelli.Baroncini.Barone.Baroni.Baronti.Bartalesi.Bartoletti.Bartoli.Bartolini.Bartoloni.Bartolozzi.Basagni.Basile.Bassi.Batacchi.Battaglia.Battaglini.Bausi.Becagli.Becattini.Becchi.Becucci.Bellandi.Bellesi.Belli.Bellini.Bellucci.Bencini.Benedetti.Benelli.Beni.Benini.Bensi.Benucci.Benvenuti.Berlincioni.Bernacchioni.Bernardi.Bernardini.Berni.Bernini.Bertelli.Berti.Bertini.Bessi.Betti.Bettini.Biagi.Biagini.Biagioni.Biagiotti.Biancalani.Bianchi.Bianchini.Bianco.Biffoli.Bigazzi.Bigi.Biliotti.Billi.Binazzi.Bindi.Bini.Biondi.Bizzarri.Bocci.Bogani.Bolognesi.Bonaiuti.Bonanni.Bonciani.Boncinelli.Bondi.Bonechi.Bongini.Boni.Bonini.Borchi.Boretti.Borghi.Borghini.Borgioli.Borri.Borselli.Boschi.Bottai.Bracci.Braccini.Brandi.Braschi.Bravi.Brazzini.Breschi.Brilli.Brizzi.Brogelli.Brogi.Brogioni.Brunelli.Brunetti.Bruni.Bruno.Brunori.Bruschi.Bucci.Bucciarelli.Buccioni.Bucelli.Bulli.Burberi.Burchi.Burgassi.Burroni.Bussotti.Buti.Caciolli.Caiani.Calabrese.Calamai.Calamandrei.Caldini.Calo''.Calonaci.Calosi.Calvelli.Cambi.Camiciottoli.Cammelli.Cammilli.Campolmi.Cantini.Capanni.Capecchi.Caponi.Cappellett'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('i.Cappelli.Cappellini.Cappugi.Capretti.Caputo.Carbone.Carboni.Cardini.Carlesi.Carletti.Carli.Caroti.Carotti.Carrai.Carraresi.Carta.Caruso.Casalini.Casati.Caselli.Casini.Castagnoli.Castellani.Castelli.Castellucci.Catalano.Catarzi.Catelani.Cavaciocchi.Cavallaro.Cavallini.Cavicchi.Cavini.Ceccarelli.Ceccatelli.Ceccherelli.Ceccherini.Cecchi.Cecchini.Cecconi.Cei.Cellai.Celli.Cellini.Cencetti.Ceni.Cenni.Cerbai.Cesari.Ceseri.Checcacci.Checchi.Checcucci.Cheli.Chellini.Chen.Cheng.Cherici.Cherubini.Chiaramonti.Chiarantini.Chiarelli.Chiari.Chiarini.Chiarugi.Chiavacci.Chiesi.Chimenti.Chini.Chirici.Chiti.Ciabatti.Ciampi.Cianchi.Cianfanelli.Cianferoni.Ciani.Ciapetti.Ciappi.Ciardi.Ciatti.Cicali.Ciccone.Cinelli.Cini.Ciobanu.Ciolli.Cioni.Cipriani.Cirillo.Cirri.Ciucchi.Ciuffi.Ciulli.Ciullini.Clemente.Cocchi.Cognome.Coli.Collini.Colombo.Colzi.Comparini.Conforti.Consigli.Conte.Conti.Contini.Coppini.Coppola.Corsi.Corsini.Corti.Cortini.Cosi.Costa.Costantini.Costantino.Cozzi.Cresci.Crescioli.Cresti.Crini.Curradi.D''Agostino.D''Alessandro.D''Amico.D''Angelo.Daddi.Dainelli.Dallai.Danti.Davitti.De Angelis.De Luca.De Marco.De Rosa.De Santis.De Simone.De Vita.Degl''Innocenti.Degli Innocenti.Dei.Del Lungo.Del Re.Di Marco.Di Stefano.Dini.Diop.Dobre.Dolfi.Donati.Dondoli.Dong.Donnini.Ducci.Dumitru.Ermini.Esposito.Evangelisti.Fabbri.Fabbrini.Fabbrizzi.Fabbroni.Fabbrucci.Fabiani.Facchini.Faggi.Fagioli.Failli.Faini.Falciani.Falcini.Falcone.Fallani.Falorni.Falsini.Falugiani.Fancelli.Fanelli.Fanetti.Fanfani.Fani.Fantappie''.Fantechi.Fanti.Fantini.Fantoni.Farina.Fattori.Favilli.Fedi.Fei.Ferrante.Ferrara.Ferrari.Ferraro.Ferretti.Ferri.Ferrini.Ferroni.Fiaschi.Fibbi.Fiesoli.Filippi.Filippini.Fini.Fioravanti.Fiore.Fiorentini.Fiorini.Fissi.Focardi.Foggi.Fontana.Fontanelli.Fontani.Forconi.Formigli.Forte.Forti.Fortini.Fossati.Fossi.Francalanci.Franceschi.Franceschini.Franchi.Franchini.Franci.Francini.Francioni.Franco.Frassineti.Frati.Fratini.Frilli.Frizzi.Frosali.Frosini.Frullini.Fusco.Fusi.Gabbrielli.Gabellini'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.Gagliardi.Galanti.Galardi.Galeotti.Galletti.Galli.Gallo.Gallori.Gambacciani.Gargani.Garofalo.Garuglieri.Gashi.Gasperini.Gatti.Gelli.Gensini.Gentile.Gentili.Geri.Gerini.Gheri.Ghini.Giachetti.Giachi.Giacomelli.Gianassi.Giani.Giannelli.Giannetti.Gianni.Giannini.Giannoni.Giannotti.Giannozzi.Gigli.Giordano.Giorgetti.Giorgi.Giovacchini.Giovannelli.Giovannetti.Giovannini.Giovannoni.Giuliani.Giunti.Giuntini.Giusti.Gonnelli.Goretti.Gori.Gradi.Gramigni.Grassi.Grasso.Graziani.Grazzini.Greco.Grifoni.Grillo.Grimaldi.Grossi.Gualtieri.Guarducci.Guarino.Guarnieri.Guasti.Guerra.Guerri.Guerrini.Guidi.Guidotti.He.Hoxha.Hu.Huang.Iandelli.Ignesti.Innocenti.Jin.La Rosa.Lai.Landi.Landini.Lanini.Lapi.Lapini.Lari.Lascialfari.Lastrucci.Latini.Lazzeri.Lazzerini.Lelli.Lenzi.Leonardi.Leoncini.Leone.Leoni.Lepri.Li.Liao.Lin.Linari.Lippi.Lisi.Livi.Lombardi.Lombardini.Lombardo.Longo.Lopez.Lorenzi.Lorenzini.Lorini.Lotti.Lu.Lucchesi.Lucherini.Lunghi.Lupi.Madiai.Maestrini.Maffei.Maggi.Maggini.Magherini.Magini.Magnani.Magnelli.Magni.Magnolfi.Magrini.Malavolti.Malevolti.Manca.Mancini.Manetti.Manfredi.Mangani.Mannelli.Manni.Mannini.Mannucci.Manuelli.Manzini.Marcelli.Marchese.Marchetti.Marchi.Marchiani.Marchionni.Marconi.Marcucci.Margheri.Mari.Mariani.Marilli.Marinai.Marinari.Marinelli.Marini.Marino.Mariotti.Marsili.Martelli.Martinelli.Martini.Martino.Marzi.Masi.Masini.Masoni.Massai.Materassi.Mattei.Matteini.Matteucci.Matteuzzi.Mattioli.Mattolini.Matucci.Mauro.Mazzanti.Mazzei.Mazzetti.Mazzi.Mazzini.Mazzocchi.Mazzoli.Mazzoni.Mazzuoli.Meacci.Mecocci.Meini.Melani.Mele.Meli.Mengoni.Menichetti.Meoni.Merlini.Messeri.Messina.Meucci.Miccinesi.Miceli.Micheli.Michelini.Michelozzi.Migliori.Migliorini.Milani.Miniati.Misuri.Monaco.Montagnani.Montagni.Montanari.Montelatici.Monti.Montigiani.Montini.Morandi.Morandini.Morelli.Moretti.Morganti.Mori.Morini.Moroni.Morozzi.Mugnai.Mugnaini.Mustafa.Naldi.Naldini.Nannelli.Nanni.Nannini.Nannucci.Nardi.Nardini.Nardoni.Natali.Ndiaye.Nencetti.Nencini.Nencioni.Neri.Nesi.Nesti.Niccol'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ai.Niccoli.Niccolini.Nigi.Nistri.Nocentini.Noferini.Novelli.Nucci.Nuti.Nutini.Oliva.Olivieri.Olmi.Orlandi.Orlandini.Orlando.Orsini.Ortolani.Ottanelli.Pacciani.Pace.Paci.Pacini.Pagani.Pagano.Paggetti.Pagliai.Pagni.Pagnini.Paladini.Palagi.Palchetti.Palloni.Palmieri.Palumbo.Pampaloni.Pancani.Pandolfi.Pandolfini.Panerai.Panichi.Paoletti.Paoli.Paolini.Papi.Papini.Papucci.Parenti.Parigi.Parisi.Parri.Parrini.Pasquini.Passeri.Pecchioli.Pecorini.Pellegrini.Pepi.Perini.Perrone.Peruzzi.Pesci.Pestelli.Petri.Petrini.Petrucci.Pettini.Pezzati.Pezzatini.Piani.Piazza.Piazzesi.Piazzini.Piccardi.Picchi.Piccini.Piccioli.Pieraccini.Pieraccioni.Pieralli.Pierattini.Pieri.Pierini.Pieroni.Pietrini.Pini.Pinna.Pinto.Pinzani.Pinzauti.Piras.Pisani.Pistolesi.Poggesi.Poggi.Poggiali.Poggiolini.Poli.Pollastri.Porciani.Pozzi.Pratellesi.Pratesi.Prosperi.Pruneti.Pucci.Puccini.Puccioni.Pugi.Pugliese.Puliti.Querci.Quercioli.Raddi.Radu.Raffaelli.Ragazzini.Ranfagni.Ranieri.Rastrelli.Raugei.Raveggi.Renai.Renzi.Rettori.Ricci.Ricciardi.Ridi.Ridolfi.Rigacci.Righi.Righini.Rinaldi.Risaliti.Ristori.Rizzo.Rocchi.Rocchini.Rogai.Romagnoli.Romanelli.Romani.Romano.Romei.Romeo.Romiti.Romoli.Romolini.Rontini.Rosati.Roselli.Rosi.Rossetti.Rossi.Rossini.Rovai.Ruggeri.Ruggiero.Russo.Sabatini.Saccardi.Sacchetti.Sacchi.Sacco.Salerno.Salimbeni.Salucci.Salvadori.Salvestrini.Salvi.Salvini.Sanesi.Sani.Sanna.Santi.Santini.Santoni.Santoro.Santucci.Sardi.Sarri.Sarti.Sassi.Sbolci.Scali.Scarpelli.Scarselli.Scopetani.Secci.Selvi.Senatori.Senesi.Serafini.Sereni.Serra.Sestini.Sguanci.Sieni.Signorini.Silvestri.Simoncini.Simonetti.Simoni.Singh.Sodi.Soldi.Somigli.Sorbi.Sorelli.Sorrentino.Sottili.Spina.Spinelli.Staccioli.Staderini.Stefanelli.Stefani.Stefanini.Stella.Susini.Tacchi.Tacconi.Taddei.Tagliaferri.Tamburini.Tanganelli.Tani.Tanini.Tapinassi.Tarchi.Tarchiani.Targioni.Tassi.Tassini.Tempesti.Terzani.Tesi.Testa.Testi.Tilli.Tinti.Tirinnanzi.Toccafondi.Tofanari.Tofani.Tognaccini.Tonelli.Tonini.Torelli.Torrini.Tosi.Toti.Tozzi.Trambusti.Tra'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('pani.Tucci.Turchi.Ugolini.Ulivi.Valente.Valenti.Valentini.Vangelisti.Vanni.Vannini.Vannoni.Vannozzi.Vannucchi.Vannucci.Ventura.Venturi.Venturini.Vestri.Vettori.Vichi.Viciani.Vieri.Vigiani.Vignoli.Vignolini.Vignozzi.Villani.Vinci.Visani.Vitale.Vitali.Viti.Viviani.Vivoli.Volpe.Volpi.Wang.Wu.Xu.Yang.Ye.Zagli.Zani.Zanieri.Zanobini.Zecchi.Zetti.Zhang.Zheng.Zhou.Zhu.Zingoni.Zini.Zoppi".split("."),
				nl: /* @__PURE__ */ "Albers.Alblas.Appelman.Baars.Baas.Bakker.Blank.Bleeker.Blok.Blom.Boer.Boers.Boldewijn.Boon.Boot.Bos.Bosch.Bosma.Bosman.Bouma.Bouman.Bouwman.Brands.Brouwer.Burger.Buijs.Buitenhuis.Ceder.Cohen.Dekker.Dekkers.Dijkman.Dijkstra.Driessen.Drost.Engel.Evers.Faber.Franke.Gerritsen.Goedhart.Goossens.Groen.Groenenberg.Groot.Haan.Hart.Heemskerk.Hendriks.Hermans.Hoekstra.Hofman.Hopman.Huisman.Jacobs.Jansen.Janssen.Jonker.Jaspers.Keijzer.Klaassen.Klein.Koek.Koenders.Kok.Kool.Koopman.Koopmans.Koning.Koster.Kramer.Kroon.Kuijpers.Kuiper.Kuipers.Kurt.Koster.Kwakman.Los.Lubbers.Maas.Markus.Martens.Meijer.Mol.Molenaar.Mulder.Nieuwenhuis.Peeters.Peters.Pengel.Pieters.Pool.Post.Postma.Prins.Pronk.Reijnders.Rietveld.Roest.Roos.Sanders.Schaap.Scheffer.Schenk.Schilder.Schipper.Schmidt.Scholten.Schouten.Schut.Schutte.Schuurman.Simons.Smeets.Smit.Smits.Snel.Swinkels.Tas.Terpstra.Timmermans.Tol.Tromp.Troost.Valk.Veenstra.Veldkamp.Verbeek.Verheul.Verhoeven.Vermeer.Vermeulen.Verweij.Vink.Visser.Voorn.Vos.Wagenaar.Wiersema.Willems.Willemsen.Witteveen.Wolff.Wolters.Zijlstra.Zwart.de Beer.de Boer.de Bruijn.de Bruin.de Graaf.de Groot.de Haan.de Haas.de Jager.de Jong.de Jonge.de Koning.de Lange.de Leeuw.de Ridder.de Rooij.de Ruiter.de Vos.de Vries.de Waal.de Wit.de Zwart.van Beek.van Boven.van Dam.van Dijk.van Dongen.van Doorn.van Egmond.van Eijk.van Es.van Gelder.van Gelderen.van Houten.van Hulst.van Kempen.van Kesteren.van Leeuwen.van Loon.van Mill.van Noord.van Ommen.van Ommeren.van Oosten.van Oostveen.van Rijn.van Schaik.van Veen.van Vliet.van Wijk.van Wijngaarden.van den Poel.van de '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Pol.van den Ploeg.van de Ven.van den Berg.van den Bosch.van den Brink.van den Broek.van den Heuvel.van der Heijden.van der Horst.van der Hulst.van der Kroon.van der Laan.van der Linden.van der Meer.van der Meij.van der Meulen.van der Molen.van der Sluis.van der Spek.van der Veen.van der Velde.van der Velden.van der Vliet.van der Wal".split("."),
				uk: /* @__PURE__ */ "Smith.Jones.Williams.Taylor.Brown.Davies.Evans.Wilson.Thomas.Johnson.Roberts.Robinson.Thompson.Wright.Walker.White.Edwards.Hughes.Green.Hall.Lewis.Harris.Clarke.Patel.Jackson.Wood.Turner.Martin.Cooper.Hill.Ward.Morris.Moore.Clark.Lee.King.Baker.Harrison.Morgan.Allen.James.Scott.Phillips.Watson.Davis.Parker.Price.Bennett.Young.Griffiths.Mitchell.Kelly.Cook.Carter.Richardson.Bailey.Collins.Bell.Shaw.Murphy.Miller.Cox.Richards.Khan.Marshall.Anderson.Simpson.Ellis.Adams.Singh.Begum.Wilkinson.Foster.Chapman.Powell.Webb.Rogers.Gray.Mason.Ali.Hunt.Hussain.Campbell.Matthews.Owen.Palmer.Holmes.Mills.Barnes.Knight.Lloyd.Butler.Russell.Barker.Fisher.Stevens.Jenkins.Murray.Dixon.Harvey.Graham.Pearson.Ahmed.Fletcher.Walsh.Kaur.Gibson.Howard.Andrews.Stewart.Elliott.Reynolds.Saunders.Payne.Fox.Ford.Pearce.Day.Brooks.West.Lawrence.Cole.Atkinson.Bradley.Spencer.Gill.Dawson.Ball.Burton.O''brien.Watts.Rose.Booth.Perry.Ryan.Grant.Wells.Armstrong.Francis.Rees.Hayes.Hart.Hudson.Newman.Barrett.Webster.Hunter.Gregory.Carr.Lowe.Page.Marsh.Riley.Dunn.Woods.Parsons.Berry.Stone.Reid.Holland.Hawkins.Harding.Porter.Robertson.Newton.Oliver.Reed.Kennedy.Williamson.Bird.Gardner.Shah.Dean.Lane.Cooke.Bates.Henderson.Parry.Burgess.Bishop.Walton.Burns.Nicholson.Shepherd.Ross.Cross.Long.Freeman.Warren.Nicholls.Hamilton.Byrne.Sutton.Mcdonald.Yates.Hodgson.Robson.Curtis.Hopkins.O''connor.Harper.Coleman.Watkins.Moss.Mccarthy.Chambers.O''neill.Griffin.Sharp.Hardy.Wheeler.Potter.Osborne.Johnston.Gordon.Doyle.Wallace.George.Jordan.Hutchinson.Rowe.Burke.May.Pritchard.Gilbert.Willis.Higgins.Read.Miles.Stevenson.Stephenson.Hammond.Arnold.Buckley.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Walters.Hewitt.Barber.Nelson.Slater.Austin.Sullivan.Whitehead.Mann.Frost.Lambert.Stephens.Blake.Akhtar.Lynch.Goodwin.Barton.Woodward.Thomson.Cunningham.Quinn.Barnett.Baxter.Bibi.Clayton.Nash.Greenwood.Jennings.Holt.Kemp.Poole.Gallagher.Bond.Stokes.Tucker.Davidson.Fowler.Heath.Norman.Middleton.Lawson.Banks.French.Stanley.Jarvis.Gibbs.Ferguson.Hayward.Carroll.Douglas.Dickinson.Todd.Barlow.Peters.Lucas.Knowles.Hartley.Miah.Simmons.Morton.Alexander.Field.Morrison.Norris.Townsend.Preston.Hancock.Thornton.Baldwin.Burrows.Briggs.Parkinson.Reeves.Macdonald.Lamb.Black.Abbott.Sanders.Thorpe.Holden.Tomlinson.Perkins.Ashton.Rhodes.Fuller.Howe.Bryant.Vaughan.Dale.Davey.Weston.Bartlett.Whittaker.Davison.Kent.Skinner.Birch.Morley.Daniels.Glover.Howell.Cartwright.Pugh.Humphreys.Goddard.Brennan.Wall.Kirby.Bowen.Savage.Bull.Wong.Dobson.Smart.Wilkins.Kirk.Fraser.Duffy.Hicks.Patterson.Bradshaw.Little.Archer.Warner.Waters.O''sullivan.Farrell.Brookes.Atkins.Kay.Dodd.Bentley.Flynn.John.Schofield.Short.Haynes.Wade.Butcher.Henry.Sanderson.Crawford.Sheppard.Bolton.Coates.Giles.Gould.Houghton.Gibbons.Pratt.Manning.Law.Hooper.Noble.Dyer.Rahman.Clements.Moran.Sykes.Chan.Doherty.Connolly.Joyce.Franklin.Hobbs.Coles.Herbert.Steele.Kerr.Leach.Winter.Owens.Duncan.Naylor.Fleming.Horton.Finch.Fitzgerald.Randall.Carpenter.Marsden.Browne.Garner.Pickering.Hale.Dennis.Vincent.Chadwick.Chandler.Sharpe.Nolan.Lyons.Hurst.Collier.Peacock.Howarth.Faulkner.Rice.Pollard.Welch.Norton.Gough.Sinclair.Blackburn.Bryan.Conway.Power.Cameron.Daly.Allan.Hanson.Gardiner.Boyle.Myers.Turnbull.Wallis.Mahmood.Sims.Swift.Iqbal.Pope.Brady.Chamberlain.Rowley.Tyler.Farmer.Metcalfe.Hilton.Godfrey.Holloway.Parkin.Bray.Talbot.Donnelly.Nixon.Charlton.Benson.Whitehouse.Barry.Hope.Lord.North.Storey.Connor.Potts.Bevan.Hargreaves.Mclean.Mistry.Bruce.Howells.Hyde.Parkes.Wyatt.Fry.Lees.O''donnell.Craig.Forster.Mckenzie.Humphries.Mellor.Carey.Ingram.Summers.Leonard".split("."),
				de: /* @__PURE__ */ "Müller.Schmidt.Schneider.Fischer.Weber'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.Meyer.Wagner.Becker.Schulz.Hoffmann.Schäfer.Koch.Bauer.Richter.Klein.Wolf.Schröder.Neumann.Schwarz.Zimmermann.Braun.Krüger.Hofmann.Hartmann.Lange.Schmitt.Werner.Schmitz.Krause.Meier.Lehmann.Schmid.Schulze.Maier.Köhler.Herrmann.König.Walter.Mayer.Huber.Kaiser.Fuchs.Peters.Lang.Scholz.Möller.Weiß.Jung.Hahn.Schubert.Vogel.Friedrich.Keller.Günther.Frank.Berger.Winkler.Roth.Beck.Lorenz.Baumann.Franke.Albrecht.Schuster.Simon.Ludwig.Böhm.Winter.Kraus.Martin.Schumacher.Krämer.Vogt.Stein.Jäger.Otto.Sommer.Groß.Seidel.Heinrich.Brandt.Haas.Schreiber.Graf.Schulte.Dietrich.Ziegler.Kuhn.Kühn.Pohl.Engel.Horn.Busch.Bergmann.Thomas.Voigt.Sauer.Arnold.Wolff.Pfeiffer".split("."),
				jp: /* @__PURE__ */ "Sato.Suzuki.Takahashi.Tanaka.Watanabe.Ito.Yamamoto.Nakamura.Kobayashi.Kato.Yoshida.Yamada.Sasaki.Yamaguchi.Saito.Matsumoto.Inoue.Kimura.Hayashi.Shimizu.Yamazaki.Mori.Abe.Ikeda.Hashimoto.Yamashita.Ishikawa.Nakajima.Maeda.Fujita.Ogawa.Goto.Okada.Hasegawa.Murakami.Kondo.Ishii.Saito.Sakamoto.Endo.Aoki.Fujii.Nishimura.Fukuda.Ota.Miura.Fujiwara.Okamoto.Matsuda.Nakagawa.Nakano.Harada.Ono.Tamura.Takeuchi.Kaneko.Wada.Nakayama.Ishida.Ueda.Morita.Hara.Shibata.Sakai.Kudo.Yokoyama.Miyazaki.Miyamoto.Uchida.Takagi.Ando.Taniguchi.Ohno.Maruyama.Imai.Takada.Fujimoto.Takeda.Murata.Ueno.Sugiyama.Masuda.Sugawara.Hirano.Kojima.Otsuka.Chiba.Kubo.Matsui.Iwasaki.Sakurai.Kinoshita.Noguchi.Matsuo.Nomura.Kikuchi.Sano.Onishi.Sugimoto.Arai".split("."),
				es: /* @__PURE__ */ "Garcia.Fernandez.Lopez.Martinez.Gonzalez.Rodriguez.Sanchez.Perez.Martin.Gomez.Ruiz.Diaz.Hernandez.Alvarez.Jimenez.Moreno.Munoz.Alonso.Romero.Navarro.Gutierrez.Torres.Dominguez.Gil.Vazquez.Blanco.Serrano.Ramos.Castro.Suarez.Sanz.Rubio.Ortega.Molina.Delgado.Ortiz.Morales.Ramirez.Marin.Iglesias.Santos.Castillo.Garrido.Calvo.Pena.Cruz.Cano.Nunez.Prieto.Diez.Lozano.Vidal.Pascual.Ferrer.Medina.Vega.Leon.Herrero.Vicente.Mendez.Guerrero.Fuentes.Campos.Nieto.Cortes.Caballero.Ibanez.Lorenzo.Pastor.Gimenez.Saez.Soler.Marquez.Carrasco.Herrera.Montero.A'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('rias.Crespo.Flores.Andres.Aguilar.Hidalgo.Cabrera.Mora.Duran.Velasco.Rey.Pardo.Roman.Vila.Bravo.Merino.Moya.Soto.Izquierdo.Reyes.Redondo.Marcos.Carmona.Menendez".split("."),
				fr: /* @__PURE__ */ "Martin.Bernard.Thomas.Petit.Robert.Richard.Durand.Dubois.Moreau.Laurent.Simon.Michel.Lefèvre.Leroy.Roux.David.Bertrand.Morel.Fournier.Girard.Bonnet.Dupont.Lambert.Fontaine.Rousseau.Vincent.Müller.Lefèvre.Faure.André.Mercier.Blanc.Guérin.Boyer.Garnier.Chevalier.François.Legrand.Gauthier.Garcia.Perrin.Robin.Clément.Morin.Nicolas.Henry.Roussel.Matthieu.Gautier.Masson.Marchand.Duval.Denis.Dumont.Marie.Lemaire.Noël.Meyer.Dufour.Meunier.Brun.Blanchard.Giraud.Joly.Rivière.Lucas.Brunet.Gaillard.Barbier.Arnaud.Martínez.Gérard.Roche.Renard.Schmitt.Roy.Leroux.Colin.Vidal.Caron.Picard.Roger.Fabre.Aubert.Lemoine.Renaud.Dumas.Lacroix.Olivier.Philippe.Bourgeois.Pierre.Benoît.Rey.Leclerc.Payet.Rolland.Leclercq.Guillaume.Lecomte.López.Jean.Dupuy.Guillot.Hubert.Berger.Carpentier.Sánchez.Dupuis.Moulin.Louis.Deschamps.Huet.Vasseur.Perez.Boucher.Fleury.Royer.Klein.Jacquet.Adam.Paris.Poirier.Marty.Aubry.Guyot.Carré.Charles.Renault.Charpentier.Ménard.Maillard.Baron.Bertin.Bailly.Hervé.Schneider.Fernández.Le GallGall.Collet.Léger.Bouvier.Julien.Prévost.Millet.Perrot.Daniel.Le RouxRoux.Cousin.Germain.Breton.Besson.Langlois.Rémi.Le GoffGoff.Pelletier.Lévêque.Perrier.Leblanc.Barré.Lebrun.Marchal.Weber.Mallet.Hamon.Boulanger.Jacob.Monnier.Michaud.Rodríguez.Guichard.Gillet.Étienne.Grondin.Poulain.Tessier.Chevallier.Collin.Chauvin.Da SilvaSilva.Bouchet.Gay.Lemaître.Bénard.Maréchal.Humbert.Reynaud.Antoine.Hoarau.Perret.Barthélemy.Cordier.Pichon.Lejeune.Gilbert.Lamy.Delaunay.Pasquier.Carlier.LaporteLaporte".split(".")
			},
			postcodeAreas: [
				{ code: "AB" },
				{ code: "AL" },
				{ code: "B" },
				{ code: "BA" },
				{ code: "BB" },
				{ code: "BD" },
				{ code: "BH" },
				{ code: "BL" },
				{ code: "BN" },
				{ code: "BR" },
				{ code: "BS" },
				{ code: "BT" },
				{ code: "CA" },
				'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('{ code: "CB" },
				{ code: "CF" },
				{ code: "CH" },
				{ code: "CM" },
				{ code: "CO" },
				{ code: "CR" },
				{ code: "CT" },
				{ code: "CV" },
				{ code: "CW" },
				{ code: "DA" },
				{ code: "DD" },
				{ code: "DE" },
				{ code: "DG" },
				{ code: "DH" },
				{ code: "DL" },
				{ code: "DN" },
				{ code: "DT" },
				{ code: "DY" },
				{ code: "E" },
				{ code: "EC" },
				{ code: "EH" },
				{ code: "EN" },
				{ code: "EX" },
				{ code: "FK" },
				{ code: "FY" },
				{ code: "G" },
				{ code: "GL" },
				{ code: "GU" },
				{ code: "GY" },
				{ code: "HA" },
				{ code: "HD" },
				{ code: "HG" },
				{ code: "HP" },
				{ code: "HR" },
				{ code: "HS" },
				{ code: "HU" },
				{ code: "HX" },
				{ code: "IG" },
				{ code: "IM" },
				{ code: "IP" },
				{ code: "IV" },
				{ code: "JE" },
				{ code: "KA" },
				{ code: "KT" },
				{ code: "KW" },
				{ code: "KY" },
				{ code: "L" },
				{ code: "LA" },
				{ code: "LD" },
				{ code: "LE" },
				{ code: "LL" },
				{ code: "LN" },
				{ code: "LS" },
				{ code: "LU" },
				{ code: "M" },
				{ code: "ME" },
				{ code: "MK" },
				{ code: "ML" },
				{ code: "N" },
				{ code: "NE" },
				{ code: "NG" },
				{ code: "NN" },
				{ code: "NP" },
				{ code: "NR" },
				{ code: "NW" },
				{ code: "OL" },
				{ code: "OX" },
				{ code: "PA" },
				{ code: "PE" },
				{ code: "PH" },
				{ code: "PL" },
				{ code: "PO" },
				{ code: "PR" },
				{ code: "RG" },
				{ code: "RH" },
				{ code: "RM" },
				{ code: "S" },
				{ code: "SA" },
				{ code: "SE" },
				{ code: "SG" },
				{ code: "SK" },
				{ code: "SL" },
				{ code: "SM" },
				{ code: "SN" },
				{ code: "SO" },
				{ code: "SP" },
				{ code: "SR" },
				{ code: "SS" },
				{ code: "ST" },
				{ code: "SW" },
				{ code: "SY" },
				{ code: "TA" },
				{ code: "TD" },
				{ code: "TF" },
				{ code: "TN" },
				{ code: "TQ" },
				{ code: "TR" },
				{ code: "TS" },
				{ code: "TW" },
				{ code: "UB" },
				{ code'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(': "W" },
				{ code: "WA" },
				{ code: "WC" },
				{ code: "WD" },
				{ code: "WF" },
				{ code: "WN" },
				{ code: "WR" },
				{ code: "WS" },
				{ code: "WV" },
				{ code: "YO" },
				{ code: "ZE" }
			],
			countries: [
				{
					name: "Afghanistan",
					abbreviation: "AF"
				},
				{
					name: "Åland Islands",
					abbreviation: "AX"
				},
				{
					name: "Albania",
					abbreviation: "AL"
				},
				{
					name: "Algeria",
					abbreviation: "DZ"
				},
				{
					name: "American Samoa",
					abbreviation: "AS"
				},
				{
					name: "Andorra",
					abbreviation: "AD"
				},
				{
					name: "Angola",
					abbreviation: "AO"
				},
				{
					name: "Anguilla",
					abbreviation: "AI"
				},
				{
					name: "Antarctica",
					abbreviation: "AQ"
				},
				{
					name: "Antigua and Barbuda",
					abbreviation: "AG"
				},
				{
					name: "Argentina",
					abbreviation: "AR"
				},
				{
					name: "Armenia",
					abbreviation: "AM"
				},
				{
					name: "Aruba",
					abbreviation: "AW"
				},
				{
					name: "Australia",
					abbreviation: "AU"
				},
				{
					name: "Austria",
					abbreviation: "AT"
				},
				{
					name: "Azerbaijan",
					abbreviation: "AZ"
				},
				{
					name: "Bahamas",
					abbreviation: "BS"
				},
				{
					name: "Bahrain",
					abbreviation: "BH"
				},
				{
					name: "Bangladesh",
					abbreviation: "BD"
				},
				{
					name: "Barbados",
					abbreviation: "BB"
				},
				{
					name: "Belarus",
					abbreviation: "BY"
				},
				{
					name: "Belgium",
					abbreviation: "BE"
				},
				{
					name: "Belize",
					abbreviation: "BZ"
				},
				{
					name: "Benin",
					abbreviation: "BJ"
				},
				{
					name: "Bermuda",
					abbreviation: "BM"
				},
				{
					name: "Bhutan",
					abbreviation: "BT"
				},
				{
					name: "Plurinational State of Bolivia",
					abbreviation: "BO"
				},
				{
					name: "Bonaire, Sint Eustatius and Saba",
					abbreviation: "BQ"
				},
				{
					name: "Bosnia and Herz'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('egovina",
					abbreviation: "BA"
				},
				{
					name: "Botswana",
					abbreviation: "BW"
				},
				{
					name: "Bouvet Island",
					abbreviation: "BV"
				},
				{
					name: "Brazil",
					abbreviation: "BR"
				},
				{
					name: "British Indian Ocean Territory",
					abbreviation: "IO"
				},
				{
					name: "Brunei Darussalam",
					abbreviation: "BN"
				},
				{
					name: "Bulgaria",
					abbreviation: "BG"
				},
				{
					name: "Burkina Faso",
					abbreviation: "BF"
				},
				{
					name: "Burundi",
					abbreviation: "BI"
				},
				{
					name: "Cabo Verde",
					abbreviation: "CV"
				},
				{
					name: "Cambodia",
					abbreviation: "KH"
				},
				{
					name: "Cameroon",
					abbreviation: "CM"
				},
				{
					name: "Canada",
					abbreviation: "CA"
				},
				{
					name: "Cayman Islands",
					abbreviation: "KY"
				},
				{
					name: "Central African Republic",
					abbreviation: "CF"
				},
				{
					name: "Chad",
					abbreviation: "TD"
				},
				{
					name: "Chile",
					abbreviation: "CL"
				},
				{
					name: "China",
					abbreviation: "CN"
				},
				{
					name: "Christmas Island",
					abbreviation: "CX"
				},
				{
					name: "Cocos (Keeling) Islands",
					abbreviation: "CC"
				},
				{
					name: "Colombia",
					abbreviation: "CO"
				},
				{
					name: "Comoros",
					abbreviation: "KM"
				},
				{
					name: "Congo",
					abbreviation: "CG"
				},
				{
					name: "Democratic Republic of the Congo",
					abbreviation: "CD"
				},
				{
					name: "Cook Islands",
					abbreviation: "CK"
				},
				{
					name: "Costa Rica",
					abbreviation: "CR"
				},
				{
					name: "Côte d''Ivoire",
					abbreviation: "CI"
				},
				{
					name: "Croatia",
					abbreviation: "HR"
				},
				{
					name: "Cuba",
					abbreviation: "CU"
				},
				{
					name: "Curaçao",
					abbreviation: "CW"
				},
				{
					name: "Cyprus",
					abbreviation: "CY"
				},
				{
					name: "Czechia",
					abbreviation: "CZ"
				},
				'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('{
					name: "Denmark",
					abbreviation: "DK"
				},
				{
					name: "Djibouti",
					abbreviation: "DJ"
				},
				{
					name: "Dominica",
					abbreviation: "DM"
				},
				{
					name: "Dominican Republic",
					abbreviation: "DO"
				},
				{
					name: "Ecuador",
					abbreviation: "EC"
				},
				{
					name: "Egypt",
					abbreviation: "EG"
				},
				{
					name: "El Salvador",
					abbreviation: "SV"
				},
				{
					name: "Equatorial Guinea",
					abbreviation: "GQ"
				},
				{
					name: "Eritrea",
					abbreviation: "ER"
				},
				{
					name: "Estonia",
					abbreviation: "EE"
				},
				{
					name: "Eswatini",
					abbreviation: "SZ"
				},
				{
					name: "Ethiopia",
					abbreviation: "ET"
				},
				{
					name: "Falkland Islands (Malvinas)",
					abbreviation: "FK"
				},
				{
					name: "Faroe Islands",
					abbreviation: "FO"
				},
				{
					name: "Fiji",
					abbreviation: "FJ"
				},
				{
					name: "Finland",
					abbreviation: "FI"
				},
				{
					name: "France",
					abbreviation: "FR"
				},
				{
					name: "French Guiana",
					abbreviation: "GF"
				},
				{
					name: "French Polynesia",
					abbreviation: "PF"
				},
				{
					name: "French Southern Territories",
					abbreviation: "TF"
				},
				{
					name: "Gabon",
					abbreviation: "GA"
				},
				{
					name: "Gambia",
					abbreviation: "GM"
				},
				{
					name: "Georgia",
					abbreviation: "GE"
				},
				{
					name: "Germany",
					abbreviation: "DE"
				},
				{
					name: "Ghana",
					abbreviation: "GH"
				},
				{
					name: "Gibraltar",
					abbreviation: "GI"
				},
				{
					name: "Greece",
					abbreviation: "GR"
				},
				{
					name: "Greenland",
					abbreviation: "GL"
				},
				{
					name: "Grenada",
					abbreviation: "GD"
				},
				{
					name: "Guadeloupe",
					abbreviation: "GP"
				},
				{
					name: "Guam",
					abbreviation: "GU"
				},
				{
					name: "Guatemala",
					abbreviation: "GT"
				},
				{
					name: "Guernsey",
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		abbreviation: "GG"
				},
				{
					name: "Guinea",
					abbreviation: "GN"
				},
				{
					name: "Guinea-Bissau",
					abbreviation: "GW"
				},
				{
					name: "Guyana",
					abbreviation: "GY"
				},
				{
					name: "Haiti",
					abbreviation: "HT"
				},
				{
					name: "Heard Island and McDonald Islands",
					abbreviation: "HM"
				},
				{
					name: "Holy See",
					abbreviation: "VA"
				},
				{
					name: "Honduras",
					abbreviation: "HN"
				},
				{
					name: "Hong Kong",
					abbreviation: "HK"
				},
				{
					name: "Hungary",
					abbreviation: "HU"
				},
				{
					name: "Iceland",
					abbreviation: "IS"
				},
				{
					name: "India",
					abbreviation: "IN"
				},
				{
					name: "Indonesia",
					abbreviation: "ID"
				},
				{
					name: "Islamic Republic of Iran",
					abbreviation: "IR"
				},
				{
					name: "Iraq",
					abbreviation: "IQ"
				},
				{
					name: "Ireland",
					abbreviation: "IE"
				},
				{
					name: "Isle of Man",
					abbreviation: "IM"
				},
				{
					name: "Israel",
					abbreviation: "IL"
				},
				{
					name: "Italy",
					abbreviation: "IT"
				},
				{
					name: "Jamaica",
					abbreviation: "JM"
				},
				{
					name: "Japan",
					abbreviation: "JP"
				},
				{
					name: "Jersey",
					abbreviation: "JE"
				},
				{
					name: "Jordan",
					abbreviation: "JO"
				},
				{
					name: "Kazakhstan",
					abbreviation: "KZ"
				},
				{
					name: "Kenya",
					abbreviation: "KE"
				},
				{
					name: "Kiribati",
					abbreviation: "KI"
				},
				{
					name: "Democratic People''s Republic of Korea",
					abbreviation: "KP"
				},
				{
					name: "Republic of Korea",
					abbreviation: "KR"
				},
				{
					name: "Kuwait",
					abbreviation: "KW"
				},
				{
					name: "Kyrgyzstan",
					abbreviation: "KG"
				},
				{
					name: "Lao People''s Democratic Republic",
					abbreviation: "LA"
				},
				{
					name: "Latvia",
					abbreviation: "LV"
				},
				{
					name: "Lebanon",
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			abbreviation: "LB"
				},
				{
					name: "Lesotho",
					abbreviation: "LS"
				},
				{
					name: "Liberia",
					abbreviation: "LR"
				},
				{
					name: "Libya",
					abbreviation: "LY"
				},
				{
					name: "Liechtenstein",
					abbreviation: "LI"
				},
				{
					name: "Lithuania",
					abbreviation: "LT"
				},
				{
					name: "Luxembourg",
					abbreviation: "LU"
				},
				{
					name: "Macao",
					abbreviation: "MO"
				},
				{
					name: "Madagascar",
					abbreviation: "MG"
				},
				{
					name: "Malawi",
					abbreviation: "MW"
				},
				{
					name: "Malaysia",
					abbreviation: "MY"
				},
				{
					name: "Maldives",
					abbreviation: "MV"
				},
				{
					name: "Mali",
					abbreviation: "ML"
				},
				{
					name: "Malta",
					abbreviation: "MT"
				},
				{
					name: "Marshall Islands",
					abbreviation: "MH"
				},
				{
					name: "Martinique",
					abbreviation: "MQ"
				},
				{
					name: "Mauritania",
					abbreviation: "MR"
				},
				{
					name: "Mauritius",
					abbreviation: "MU"
				},
				{
					name: "Mayotte",
					abbreviation: "YT"
				},
				{
					name: "Mexico",
					abbreviation: "MX"
				},
				{
					name: "Federated States of Micronesia",
					abbreviation: "FM"
				},
				{
					name: "Republic of Moldova",
					abbreviation: "MD"
				},
				{
					name: "Monaco",
					abbreviation: "MC"
				},
				{
					name: "Mongolia",
					abbreviation: "MN"
				},
				{
					name: "Montenegro",
					abbreviation: "ME"
				},
				{
					name: "Montserrat",
					abbreviation: "MS"
				},
				{
					name: "Morocco",
					abbreviation: "MA"
				},
				{
					name: "Mozambique",
					abbreviation: "MZ"
				},
				{
					name: "Myanmar",
					abbreviation: "MM"
				},
				{
					name: "Namibia",
					abbreviation: "NA"
				},
				{
					name: "Nauru",
					abbreviation: "NR"
				},
				{
					name: "Nepal",
					abbreviation: "NP"
				},
				{
					name: "Kingdom of the Netherlands",
					abbreviation: "NL"
				},
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		{
					name: "New Caledonia",
					abbreviation: "NC"
				},
				{
					name: "New Zealand",
					abbreviation: "NZ"
				},
				{
					name: "Nicaragua",
					abbreviation: "NI"
				},
				{
					name: "Niger",
					abbreviation: "NE"
				},
				{
					name: "Nigeria",
					abbreviation: "NG"
				},
				{
					name: "Niue",
					abbreviation: "NU"
				},
				{
					name: "Norfolk Island",
					abbreviation: "NF"
				},
				{
					name: "North Macedonia",
					abbreviation: "MK"
				},
				{
					name: "Northern Mariana Islands",
					abbreviation: "MP"
				},
				{
					name: "Norway",
					abbreviation: "NO"
				},
				{
					name: "Oman",
					abbreviation: "OM"
				},
				{
					name: "Pakistan",
					abbreviation: "PK"
				},
				{
					name: "Palau",
					abbreviation: "PW"
				},
				{
					name: "State of Palestine",
					abbreviation: "PS"
				},
				{
					name: "Panama",
					abbreviation: "PA"
				},
				{
					name: "Papua New Guinea",
					abbreviation: "PG"
				},
				{
					name: "Paraguay",
					abbreviation: "PY"
				},
				{
					name: "Peru",
					abbreviation: "PE"
				},
				{
					name: "Philippines",
					abbreviation: "PH"
				},
				{
					name: "Pitcairn",
					abbreviation: "PN"
				},
				{
					name: "Poland",
					abbreviation: "PL"
				},
				{
					name: "Portugal",
					abbreviation: "PT"
				},
				{
					name: "Puerto Rico",
					abbreviation: "PR"
				},
				{
					name: "Qatar",
					abbreviation: "QA"
				},
				{
					name: "Réunion",
					abbreviation: "RE"
				},
				{
					name: "Romania",
					abbreviation: "RO"
				},
				{
					name: "Russian Federation",
					abbreviation: "RU"
				},
				{
					name: "Rwanda",
					abbreviation: "RW"
				},
				{
					name: "Saint Barthélemy",
					abbreviation: "BL"
				},
				{
					name: "Saint Helena, Ascension and Tristan da Cunha",
					abbreviation: "SH"
				},
				{
					name: "Saint Kitts and Nevis",
					abbreviation: "KN"
				},
				{
					name: "Saint Lucia",
					abbrevia'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('tion: "LC"
				},
				{
					name: "Saint Martin (French part)",
					abbreviation: "MF"
				},
				{
					name: "Saint Pierre and Miquelon",
					abbreviation: "PM"
				},
				{
					name: "Saint Vincent and the Grenadines",
					abbreviation: "VC"
				},
				{
					name: "Samoa",
					abbreviation: "WS"
				},
				{
					name: "San Marino",
					abbreviation: "SM"
				},
				{
					name: "Sao Tome and Principe",
					abbreviation: "ST"
				},
				{
					name: "Saudi Arabia",
					abbreviation: "SA"
				},
				{
					name: "Senegal",
					abbreviation: "SN"
				},
				{
					name: "Serbia",
					abbreviation: "RS"
				},
				{
					name: "Seychelles",
					abbreviation: "SC"
				},
				{
					name: "Sierra Leone",
					abbreviation: "SL"
				},
				{
					name: "Singapore",
					abbreviation: "SG"
				},
				{
					name: "Sint Maarten (Dutch part)",
					abbreviation: "SX"
				},
				{
					name: "Slovakia",
					abbreviation: "SK"
				},
				{
					name: "Slovenia",
					abbreviation: "SI"
				},
				{
					name: "Solomon Islands",
					abbreviation: "SB"
				},
				{
					name: "Somalia",
					abbreviation: "SO"
				},
				{
					name: "South Africa",
					abbreviation: "ZA"
				},
				{
					name: "South Georgia and the South Sandwich Islands",
					abbreviation: "GS"
				},
				{
					name: "South Sudan",
					abbreviation: "SS"
				},
				{
					name: "Spain",
					abbreviation: "ES"
				},
				{
					name: "Sri Lanka",
					abbreviation: "LK"
				},
				{
					name: "Sudan",
					abbreviation: "SD"
				},
				{
					name: "Suriname",
					abbreviation: "SR"
				},
				{
					name: "Svalbard and Jan Mayen",
					abbreviation: "SJ"
				},
				{
					name: "Sweden",
					abbreviation: "SE"
				},
				{
					name: "Switzerland",
					abbreviation: "CH"
				},
				{
					name: "Syrian Arab Republic",
					abbreviation: "SY"
				},
				{
					name: "Taiwan, Province of China",
					abbreviation: "TW"
				},
				{
					name: "Tajikistan",
					abbreviation: "TJ"
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('	},
				{
					name: "United Republic of Tanzania",
					abbreviation: "TZ"
				},
				{
					name: "Thailand",
					abbreviation: "TH"
				},
				{
					name: "Timor-Leste",
					abbreviation: "TL"
				},
				{
					name: "Togo",
					abbreviation: "TG"
				},
				{
					name: "Tokelau",
					abbreviation: "TK"
				},
				{
					name: "Tonga",
					abbreviation: "TO"
				},
				{
					name: "Trinidad and Tobago",
					abbreviation: "TT"
				},
				{
					name: "Tunisia",
					abbreviation: "TN"
				},
				{
					name: "Türkiye",
					abbreviation: "TR"
				},
				{
					name: "Turkmenistan",
					abbreviation: "TM"
				},
				{
					name: "Turks and Caicos Islands",
					abbreviation: "TC"
				},
				{
					name: "Tuvalu",
					abbreviation: "TV"
				},
				{
					name: "Uganda",
					abbreviation: "UG"
				},
				{
					name: "Ukraine",
					abbreviation: "UA"
				},
				{
					name: "United Arab Emirates",
					abbreviation: "AE"
				},
				{
					name: "United Kingdom of Great Britain and Northern Ireland",
					abbreviation: "GB"
				},
				{
					name: "United States Minor Outlying Islands",
					abbreviation: "UM"
				},
				{
					name: "United States of America",
					abbreviation: "US"
				},
				{
					name: "Uruguay",
					abbreviation: "UY"
				},
				{
					name: "Uzbekistan",
					abbreviation: "UZ"
				},
				{
					name: "Vanuatu",
					abbreviation: "VU"
				},
				{
					name: "Bolivarian Republic of Venezuela",
					abbreviation: "VE"
				},
				{
					name: "Viet Nam",
					abbreviation: "VN"
				},
				{
					name: "Virgin Islands (British)",
					abbreviation: "VG"
				},
				{
					name: "Virgin Islands (U.S.)",
					abbreviation: "VI"
				},
				{
					name: "Wallis and Futuna",
					abbreviation: "WF"
				},
				{
					name: "Western Sahara",
					abbreviation: "EH"
				},
				{
					name: "Yemen",
					abbreviation: "YE"
				},
				{
					name: "Zambia",
					abbreviation: "ZM"
				},
				{
					name: "Zimbabwe",
					abbreviation: "ZW"
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		}
			],
			counties: { uk: [
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
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		{ name: "Merseyside" },
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
			] },
			provinces: {
				ca: [
					{
						name: "Alberta",
						abbreviation: "AB"
					},
					{
						name: "British Columbia",
						abbr'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('eviation: "BC"
					},
					{
						name: "Manitoba",
						abbreviation: "MB"
					},
					{
						name: "New Brunswick",
						abbreviation: "NB"
					},
					{
						name: "Newfoundland and Labrador",
						abbreviation: "NL"
					},
					{
						name: "Nova Scotia",
						abbreviation: "NS"
					},
					{
						name: "Ontario",
						abbreviation: "ON"
					},
					{
						name: "Prince Edward Island",
						abbreviation: "PE"
					},
					{
						name: "Quebec",
						abbreviation: "QC"
					},
					{
						name: "Saskatchewan",
						abbreviation: "SK"
					},
					{
						name: "Northwest Territories",
						abbreviation: "NT"
					},
					{
						name: "Nunavut",
						abbreviation: "NU"
					},
					{
						name: "Yukon",
						abbreviation: "YT"
					}
				],
				it: [
					{
						name: "Agrigento",
						abbreviation: "AG",
						code: 84
					},
					{
						name: "Alessandria",
						abbreviation: "AL",
						code: 6
					},
					{
						name: "Ancona",
						abbreviation: "AN",
						code: 42
					},
					{
						name: "Aosta",
						abbreviation: "AO",
						code: 7
					},
					{
						name: "L''Aquila",
						abbreviation: "AQ",
						code: 66
					},
					{
						name: "Arezzo",
						abbreviation: "AR",
						code: 51
					},
					{
						name: "Ascoli-Piceno",
						abbreviation: "AP",
						code: 44
					},
					{
						name: "Asti",
						abbreviation: "AT",
						code: 5
					},
					{
						name: "Avellino",
						abbreviation: "AV",
						code: 64
					},
					{
						name: "Bari",
						abbreviation: "BA",
						code: 72
					},
					{
						name: "Barletta-Andria-Trani",
						abbreviation: "BT",
						code: 72
					},
					{
						name: "Belluno",
						abbreviation: "BL",
						code: 25
					},
					{
						name: "Benevento",
						abbreviation: "BN",
						code: 62
					},
					{
						name: "Bergamo",
						abbreviation: "BG",
						code: 16
					},
					{
						name: "Biella",
						abbreviation: "BI",
						code: 96
					},
					{
	'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('					name: "Bologna",
						abbreviation: "BO",
						code: 37
					},
					{
						name: "Bolzano",
						abbreviation: "BZ",
						code: 21
					},
					{
						name: "Brescia",
						abbreviation: "BS",
						code: 17
					},
					{
						name: "Brindisi",
						abbreviation: "BR",
						code: 74
					},
					{
						name: "Cagliari",
						abbreviation: "CA",
						code: 92
					},
					{
						name: "Caltanissetta",
						abbreviation: "CL",
						code: 85
					},
					{
						name: "Campobasso",
						abbreviation: "CB",
						code: 70
					},
					{
						name: "Carbonia Iglesias",
						abbreviation: "CI",
						code: 70
					},
					{
						name: "Caserta",
						abbreviation: "CE",
						code: 61
					},
					{
						name: "Catania",
						abbreviation: "CT",
						code: 87
					},
					{
						name: "Catanzaro",
						abbreviation: "CZ",
						code: 79
					},
					{
						name: "Chieti",
						abbreviation: "CH",
						code: 69
					},
					{
						name: "Como",
						abbreviation: "CO",
						code: 13
					},
					{
						name: "Cosenza",
						abbreviation: "CS",
						code: 78
					},
					{
						name: "Cremona",
						abbreviation: "CR",
						code: 19
					},
					{
						name: "Crotone",
						abbreviation: "KR",
						code: 101
					},
					{
						name: "Cuneo",
						abbreviation: "CN",
						code: 4
					},
					{
						name: "Enna",
						abbreviation: "EN",
						code: 86
					},
					{
						name: "Fermo",
						abbreviation: "FM",
						code: 86
					},
					{
						name: "Ferrara",
						abbreviation: "FE",
						code: 38
					},
					{
						name: "Firenze",
						abbreviation: "FI",
						code: 48
					},
					{
						name: "Foggia",
						abbreviation: "FG",
						code: 71
					},
					{
						name: "Forli-Cesena",
						abbreviation: "FC",
						code: 71
					},
					{
						name: "Frosinone",
						abbreviation: "FR",
						code: 60
					},
					{
						name: "Genova",
						abbreviation: "GE",
						code: 10
					},
					{
						nam'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('e: "Gorizia",
						abbreviation: "GO",
						code: 31
					},
					{
						name: "Grosseto",
						abbreviation: "GR",
						code: 53
					},
					{
						name: "Imperia",
						abbreviation: "IM",
						code: 8
					},
					{
						name: "Isernia",
						abbreviation: "IS",
						code: 94
					},
					{
						name: "La-Spezia",
						abbreviation: "SP",
						code: 66
					},
					{
						name: "Latina",
						abbreviation: "LT",
						code: 59
					},
					{
						name: "Lecce",
						abbreviation: "LE",
						code: 75
					},
					{
						name: "Lecco",
						abbreviation: "LC",
						code: 97
					},
					{
						name: "Livorno",
						abbreviation: "LI",
						code: 49
					},
					{
						name: "Lodi",
						abbreviation: "LO",
						code: 98
					},
					{
						name: "Lucca",
						abbreviation: "LU",
						code: 46
					},
					{
						name: "Macerata",
						abbreviation: "MC",
						code: 43
					},
					{
						name: "Mantova",
						abbreviation: "MN",
						code: 20
					},
					{
						name: "Massa-Carrara",
						abbreviation: "MS",
						code: 45
					},
					{
						name: "Matera",
						abbreviation: "MT",
						code: 77
					},
					{
						name: "Medio Campidano",
						abbreviation: "VS",
						code: 77
					},
					{
						name: "Messina",
						abbreviation: "ME",
						code: 83
					},
					{
						name: "Milano",
						abbreviation: "MI",
						code: 15
					},
					{
						name: "Modena",
						abbreviation: "MO",
						code: 36
					},
					{
						name: "Monza-Brianza",
						abbreviation: "MB",
						code: 36
					},
					{
						name: "Napoli",
						abbreviation: "NA",
						code: 63
					},
					{
						name: "Novara",
						abbreviation: "NO",
						code: 3
					},
					{
						name: "Nuoro",
						abbreviation: "NU",
						code: 91
					},
					{
						name: "Ogliastra",
						abbreviation: "OG",
						code: 91
					},
					{
						name: "Olbia Tempio",
						abbreviation: "OT",
						code: 91
					},
					{
						name: "Oristano"'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(',
						abbreviation: "OR",
						code: 95
					},
					{
						name: "Padova",
						abbreviation: "PD",
						code: 28
					},
					{
						name: "Palermo",
						abbreviation: "PA",
						code: 82
					},
					{
						name: "Parma",
						abbreviation: "PR",
						code: 34
					},
					{
						name: "Pavia",
						abbreviation: "PV",
						code: 18
					},
					{
						name: "Perugia",
						abbreviation: "PG",
						code: 54
					},
					{
						name: "Pesaro-Urbino",
						abbreviation: "PU",
						code: 41
					},
					{
						name: "Pescara",
						abbreviation: "PE",
						code: 68
					},
					{
						name: "Piacenza",
						abbreviation: "PC",
						code: 33
					},
					{
						name: "Pisa",
						abbreviation: "PI",
						code: 50
					},
					{
						name: "Pistoia",
						abbreviation: "PT",
						code: 47
					},
					{
						name: "Pordenone",
						abbreviation: "PN",
						code: 93
					},
					{
						name: "Potenza",
						abbreviation: "PZ",
						code: 76
					},
					{
						name: "Prato",
						abbreviation: "PO",
						code: 100
					},
					{
						name: "Ragusa",
						abbreviation: "RG",
						code: 88
					},
					{
						name: "Ravenna",
						abbreviation: "RA",
						code: 39
					},
					{
						name: "Reggio-Calabria",
						abbreviation: "RC",
						code: 35
					},
					{
						name: "Reggio-Emilia",
						abbreviation: "RE",
						code: 35
					},
					{
						name: "Rieti",
						abbreviation: "RI",
						code: 57
					},
					{
						name: "Rimini",
						abbreviation: "RN",
						code: 99
					},
					{
						name: "Roma",
						abbreviation: "Roma",
						code: 58
					},
					{
						name: "Rovigo",
						abbreviation: "RO",
						code: 29
					},
					{
						name: "Salerno",
						abbreviation: "SA",
						code: 65
					},
					{
						name: "Sassari",
						abbreviation: "SS",
						code: 90
					},
					{
						name: "Savona",
						abbreviation: "SV",
						code: 9
					},
					{
						name: "Siena",
						abbreviation:'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' "SI",
						code: 52
					},
					{
						name: "Siracusa",
						abbreviation: "SR",
						code: 89
					},
					{
						name: "Sondrio",
						abbreviation: "SO",
						code: 14
					},
					{
						name: "Taranto",
						abbreviation: "TA",
						code: 73
					},
					{
						name: "Teramo",
						abbreviation: "TE",
						code: 67
					},
					{
						name: "Terni",
						abbreviation: "TR",
						code: 55
					},
					{
						name: "Torino",
						abbreviation: "TO",
						code: 1
					},
					{
						name: "Trapani",
						abbreviation: "TP",
						code: 81
					},
					{
						name: "Trento",
						abbreviation: "TN",
						code: 22
					},
					{
						name: "Treviso",
						abbreviation: "TV",
						code: 26
					},
					{
						name: "Trieste",
						abbreviation: "TS",
						code: 32
					},
					{
						name: "Udine",
						abbreviation: "UD",
						code: 30
					},
					{
						name: "Varese",
						abbreviation: "VA",
						code: 12
					},
					{
						name: "Venezia",
						abbreviation: "VE",
						code: 27
					},
					{
						name: "Verbania",
						abbreviation: "VB",
						code: 27
					},
					{
						name: "Vercelli",
						abbreviation: "VC",
						code: 2
					},
					{
						name: "Verona",
						abbreviation: "VR",
						code: 23
					},
					{
						name: "Vibo-Valentia",
						abbreviation: "VV",
						code: 102
					},
					{
						name: "Vicenza",
						abbreviation: "VI",
						code: 24
					},
					{
						name: "Viterbo",
						abbreviation: "VT",
						code: 56
					}
				]
			},
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
				{ name: "Ba'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('rbudans" },
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
				{ name: "Kaz'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('akhstani" },
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
				{ '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('name: "Sri Lankan" },
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
			locale_languages: /* @__PURE__ */ "aa.ab.ae.af.ak.am.an.ar.as.av.ay.az.ba.be.bg.bh.bi.bm.bn.bo.br.bs.ca.ce.ch.co.cr.cs.cu.cv.cy.da.de.dv.dz.ee.el.en.eo.es.et.eu.fa.ff.fi.fj.fo.fr.fy.ga.gd.gl.gn.gu.gv.ha.he.hi.ho.hr.ht.hu.hy.hz.ia.id.ie.ig.ii.ik.io.is.it.iu.ja.jv.ka.kg.ki.kj.kk.kl.km.kn.ko.kr.ks.ku.kv.kw.ky.la.lb.lg.li.ln.lo.lt.lu.lv.mg.mh.mi.mk.ml.mn.mr.ms.mt.my.na.nb.nd.ne.ng.nl.nn.no.nr.nv.ny.oc.oj.om.or.os.pa.pi.pl.ps.pt.qu.rm.rn.ro.ru.rw.sa.sc.sd.se.sg.si.sk.sl.sm.sn.so.sq.sr.ss.st.su.sv.sw.ta.te.tg.th.ti.tk.tl.tn.to.tr.ts.tt.tw.ty.ug.uk.ur.uz.ve.vi.vo.wa.wo.xh.yi.yo.za.zh.zu".split("."),
			locale_regions: /* @__PURE__ */ "agq-CM.asa-TZ.ast-ES.bas-CM.bem-ZM.bez-TZ.brx-IN.cgg-UG.chr-US.dav-KE.dje-NE.dsb-DE.dua-CM.dyo-SN.ebu-KE.ewo-CM.fil-PH.fur-IT.gsw-CH.gsw-FR.gsw-LI.guz-KE.haw-US.hsb-DE.jgo-CM.jmc-TZ.kab-DZ.kam-KE.kde-TZ.kea-CV.khq-ML.kkj-CM.kln-KE.kok-IN.ksb-TZ.ksf-CM.ksh-DE.lag-TZ.lkt-US.luo-KE.luy-KE.mas-KE.mas-TZ.mer-KE.mfe-MU.mgh-MZ.mgo-CM.mua-CM.naq-NA.nmg-CM.nnh-CM.nus-SD.nyn-UG.rof-TZ.rwk-TZ.sah-RU.saq-KE.sbp-TZ.seh-MZ.ses-ML.shi-Latn.shi-Latn-MA.shi-Tfng.shi-Tfng-MA.smn-FI.teo-KE.teo-UG.twq-NE.tzm-Latn.tzm-Latn-MA.vai-Latn.vai-Latn-LR.vai-Vaii.vai-Vaii-LR.vun-TZ.wae-CH.xog-UG.yav-CM.zgh-MA.af-NA.af-ZA.ak-GH.am-ET.ar-001.ar-AE.ar-BH.ar-DJ.ar-DZ.ar-EG.ar-EH.ar-'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ER.ar-IL.ar-IQ.ar-JO.ar-KM.ar-KW.ar-LB.ar-LY.ar-MA.ar-MR.ar-OM.ar-PS.ar-QA.ar-SA.ar-SD.ar-SO.ar-SS.ar-SY.ar-TD.ar-TN.ar-YE.as-IN.az-Cyrl.az-Cyrl-AZ.az-Latn.az-Latn-AZ.be-BY.bg-BG.bm-Latn.bm-Latn-ML.bn-BD.bn-IN.bo-CN.bo-IN.br-FR.bs-Cyrl.bs-Cyrl-BA.bs-Latn.bs-Latn-BA.ca-AD.ca-ES.ca-ES-VALENCIA.ca-FR.ca-IT.cs-CZ.cy-GB.da-DK.da-GL.de-AT.de-BE.de-CH.de-DE.de-LI.de-LU.dz-BT.ee-GH.ee-TG.el-CY.el-GR.en-001.en-150.en-AG.en-AI.en-AS.en-AU.en-BB.en-BE.en-BM.en-BS.en-BW.en-BZ.en-CA.en-CC.en-CK.en-CM.en-CX.en-DG.en-DM.en-ER.en-FJ.en-FK.en-FM.en-GB.en-GD.en-GG.en-GH.en-GI.en-GM.en-GU.en-GY.en-HK.en-IE.en-IM.en-IN.en-IO.en-JE.en-JM.en-KE.en-KI.en-KN.en-KY.en-LC.en-LR.en-LS.en-MG.en-MH.en-MO.en-MP.en-MS.en-MT.en-MU.en-MW.en-MY.en-NA.en-NF.en-NG.en-NR.en-NU.en-NZ.en-PG.en-PH.en-PK.en-PN.en-PR.en-PW.en-RW.en-SB.en-SC.en-SD.en-SG.en-SH.en-SL.en-SS.en-SX.en-SZ.en-TC.en-TK.en-TO.en-TT.en-TV.en-TZ.en-UG.en-UM.en-US.en-US-POSIX.en-VC.en-VG.en-VI.en-VU.en-WS.en-ZA.en-ZM.en-ZW.eo-001.es-419.es-AR.es-BO.es-CL.es-CO.es-CR.es-CU.es-DO.es-EA.es-EC.es-ES.es-GQ.es-GT.es-HN.es-IC.es-MX.es-NI.es-PA.es-PE.es-PH.es-PR.es-PY.es-SV.es-US.es-UY.es-VE.et-EE.eu-ES.fa-AF.fa-IR.ff-CM.ff-GN.ff-MR.ff-SN.fi-FI.fo-FO.fr-BE.fr-BF.fr-BI.fr-BJ.fr-BL.fr-CA.fr-CD.fr-CF.fr-CG.fr-CH.fr-CI.fr-CM.fr-DJ.fr-DZ.fr-FR.fr-GA.fr-GF.fr-GN.fr-GP.fr-GQ.fr-HT.fr-KM.fr-LU.fr-MA.fr-MC.fr-MF.fr-MG.fr-ML.fr-MQ.fr-MR.fr-MU.fr-NC.fr-NE.fr-PF.fr-PM.fr-RE.fr-RW.fr-SC.fr-SN.fr-SY.fr-TD.fr-TG.fr-TN.fr-VU.fr-WF.fr-YT.fy-NL.ga-IE.gd-GB.gl-ES.gu-IN.gv-IM.ha-Latn.ha-Latn-GH.ha-Latn-NE.ha-Latn-NG.he-IL.hi-IN.hr-BA.hr-HR.hu-HU.hy-AM.id-ID.ig-NG.ii-CN.is-IS.it-CH.it-IT.it-SM.ja-JP.ka-GE.ki-KE.kk-Cyrl.kk-Cyrl-KZ.kl-GL.km-KH.kn-IN.ko-KP.ko-KR.ks-Arab.ks-Arab-IN.kw-GB.ky-Cyrl.ky-Cyrl-KG.lb-LU.lg-UG.ln-AO.ln-CD.ln-CF.ln-CG.lo-LA.lt-LT.lu-CD.lv-LV.mg-MG.mk-MK.ml-IN.mn-Cyrl.mn-Cyrl-MN.mr-IN.ms-Latn.ms-Latn-BN.ms-Latn-MY.ms-Latn-SG.mt-MT.my-MM.nb-NO.nb-SJ.nd-ZW.ne-IN.ne-NP.nl-AW.nl-BE.nl-BQ.nl-CW.nl-NL.nl-SR.nl-SX.nn-NO.om-ET.om-KE.or-IN.os-GE.os-RU.pa-'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Arab.pa-Arab-PK.pa-Guru.pa-Guru-IN.pl-PL.ps-AF.pt-AO.pt-BR.pt-CV.pt-GW.pt-MO.pt-MZ.pt-PT.pt-ST.pt-TL.qu-BO.qu-EC.qu-PE.rm-CH.rn-BI.ro-MD.ro-RO.ru-BY.ru-KG.ru-KZ.ru-MD.ru-RU.ru-UA.rw-RW.se-FI.se-NO.se-SE.sg-CF.si-LK.sk-SK.sl-SI.sn-ZW.so-DJ.so-ET.so-KE.so-SO.sq-AL.sq-MK.sq-XK.sr-Cyrl.sr-Cyrl-BA.sr-Cyrl-ME.sr-Cyrl-RS.sr-Cyrl-XK.sr-Latn.sr-Latn-BA.sr-Latn-ME.sr-Latn-RS.sr-Latn-XK.sv-AX.sv-FI.sv-SE.sw-CD.sw-KE.sw-TZ.sw-UG.ta-IN.ta-LK.ta-MY.ta-SG.te-IN.th-TH.ti-ER.ti-ET.to-TO.tr-CY.tr-TR.ug-Arab.ug-Arab-CN.uk-UA.ur-IN.ur-PK.uz-Arab.uz-Arab-AF.uz-Cyrl.uz-Cyrl-UZ.uz-Latn.uz-Latn-UZ.vi-VN.yi-001.yo-BJ.yo-NG.zh-Hans.zh-Hans-CN.zh-Hans-HK.zh-Hans-MO.zh-Hans-SG.zh-Hant.zh-Hant-HK.zh-Hant-MO.zh-Hant-TW.zu-ZA".split("."),
			us_states_and_dc: [
				{
					name: "Alabama",
					abbreviation: "AL"
				},
				{
					name: "Alaska",
					abbreviation: "AK"
				},
				{
					name: "Arizona",
					abbreviation: "AZ"
				},
				{
					name: "Arkansas",
					abbreviation: "AR"
				},
				{
					name: "California",
					abbreviation: "CA"
				},
				{
					name: "Colorado",
					abbreviation: "CO"
				},
				{
					name: "Connecticut",
					abbreviation: "CT"
				},
				{
					name: "Delaware",
					abbreviation: "DE"
				},
				{
					name: "District of Columbia",
					abbreviation: "DC"
				},
				{
					name: "Florida",
					abbreviation: "FL"
				},
				{
					name: "Georgia",
					abbreviation: "GA"
				},
				{
					name: "Hawaii",
					abbreviation: "HI"
				},
				{
					name: "Idaho",
					abbreviation: "ID"
				},
				{
					name: "Illinois",
					abbreviation: "IL"
				},
				{
					name: "Indiana",
					abbreviation: "IN"
				},
				{
					name: "Iowa",
					abbreviation: "IA"
				},
				{
					name: "Kansas",
					abbreviation: "KS"
				},
				{
					name: "Kentucky",
					abbreviation: "KY"
				},
				{
					name: "Louisiana",
					abbreviation: "LA"
				},
				{
					name: "Maine",
					abbreviation: "ME"
				},
				{
					name: "Maryland",
					abbreviation: "MD"
				},
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		{
					name: "Massachusetts",
					abbreviation: "MA"
				},
				{
					name: "Michigan",
					abbreviation: "MI"
				},
				{
					name: "Minnesota",
					abbreviation: "MN"
				},
				{
					name: "Mississippi",
					abbreviation: "MS"
				},
				{
					name: "Missouri",
					abbreviation: "MO"
				},
				{
					name: "Montana",
					abbreviation: "MT"
				},
				{
					name: "Nebraska",
					abbreviation: "NE"
				},
				{
					name: "Nevada",
					abbreviation: "NV"
				},
				{
					name: "New Hampshire",
					abbreviation: "NH"
				},
				{
					name: "New Jersey",
					abbreviation: "NJ"
				},
				{
					name: "New Mexico",
					abbreviation: "NM"
				},
				{
					name: "New York",
					abbreviation: "NY"
				},
				{
					name: "North Carolina",
					abbreviation: "NC"
				},
				{
					name: "North Dakota",
					abbreviation: "ND"
				},
				{
					name: "Ohio",
					abbreviation: "OH"
				},
				{
					name: "Oklahoma",
					abbreviation: "OK"
				},
				{
					name: "Oregon",
					abbreviation: "OR"
				},
				{
					name: "Pennsylvania",
					abbreviation: "PA"
				},
				{
					name: "Rhode Island",
					abbreviation: "RI"
				},
				{
					name: "South Carolina",
					abbreviation: "SC"
				},
				{
					name: "South Dakota",
					abbreviation: "SD"
				},
				{
					name: "Tennessee",
					abbreviation: "TN"
				},
				{
					name: "Texas",
					abbreviation: "TX"
				},
				{
					name: "Utah",
					abbreviation: "UT"
				},
				{
					name: "Vermont",
					abbreviation: "VT"
				},
				{
					name: "Virginia",
					abbreviation: "VA"
				},
				{
					name: "Washington",
					abbreviation: "WA"
				},
				{
					name: "West Virginia",
					abbreviation: "WV"
				},
				{
					name: "Wisconsin",
					abbreviation: "WI"
				},
				{
					name: "Wyoming",
					abbreviation: "WY"
				}
			],
			territories: [
				{
					name: "American Samoa",
					abbreviation: "AS"
				},
				{
					name: "Federated States of Micronesia",
					abbreviation: "FM"
	'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			},
				{
					name: "Guam",
					abbreviation: "GU"
				},
				{
					name: "Marshall Islands",
					abbreviation: "MH"
				},
				{
					name: "Northern Mariana Islands",
					abbreviation: "MP"
				},
				{
					name: "Puerto Rico",
					abbreviation: "PR"
				},
				{
					name: "Virgin Islands, U.S.",
					abbreviation: "VI"
				}
			],
			armed_forces: [
				{
					name: "Armed Forces Europe",
					abbreviation: "AE"
				},
				{
					name: "Armed Forces Pacific",
					abbreviation: "AP"
				},
				{
					name: "Armed Forces the Americas",
					abbreviation: "AA"
				}
			],
			country_regions: {
				it: [
					{
						name: "Valle d''Aosta",
						abbreviation: "VDA"
					},
					{
						name: "Piemonte",
						abbreviation: "PIE"
					},
					{
						name: "Lombardia",
						abbreviation: "LOM"
					},
					{
						name: "Veneto",
						abbreviation: "VEN"
					},
					{
						name: "Trentino Alto Adige",
						abbreviation: "TAA"
					},
					{
						name: "Friuli Venezia Giulia",
						abbreviation: "FVG"
					},
					{
						name: "Liguria",
						abbreviation: "LIG"
					},
					{
						name: "Emilia Romagna",
						abbreviation: "EMR"
					},
					{
						name: "Toscana",
						abbreviation: "TOS"
					},
					{
						name: "Umbria",
						abbreviation: "UMB"
					},
					{
						name: "Marche",
						abbreviation: "MAR"
					},
					{
						name: "Abruzzo",
						abbreviation: "ABR"
					},
					{
						name: "Lazio",
						abbreviation: "LAZ"
					},
					{
						name: "Campania",
						abbreviation: "CAM"
					},
					{
						name: "Puglia",
						abbreviation: "PUG"
					},
					{
						name: "Basilicata",
						abbreviation: "BAS"
					},
					{
						name: "Molise",
						abbreviation: "MOL"
					},
					{
						name: "Calabria",
						abbreviation: "CAL"
					},
					{
						name: "Sicilia",
						abbreviation: "SIC"
					},
					{
						name: "Sardegna",
						abbreviation: "SAR"
					}
				],
				mx: [
					{
						name: "Aguascalientes",
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			abbreviation: "AGU"
					},
					{
						name: "Baja California",
						abbreviation: "BCN"
					},
					{
						name: "Baja California Sur",
						abbreviation: "BCS"
					},
					{
						name: "Campeche",
						abbreviation: "CAM"
					},
					{
						name: "Chiapas",
						abbreviation: "CHP"
					},
					{
						name: "Chihuahua",
						abbreviation: "CHH"
					},
					{
						name: "Ciudad de México",
						abbreviation: "DIF"
					},
					{
						name: "Coahuila",
						abbreviation: "COA"
					},
					{
						name: "Colima",
						abbreviation: "COL"
					},
					{
						name: "Durango",
						abbreviation: "DUR"
					},
					{
						name: "Guanajuato",
						abbreviation: "GUA"
					},
					{
						name: "Guerrero",
						abbreviation: "GRO"
					},
					{
						name: "Hidalgo",
						abbreviation: "HID"
					},
					{
						name: "Jalisco",
						abbreviation: "JAL"
					},
					{
						name: "México",
						abbreviation: "MEX"
					},
					{
						name: "Michoacán",
						abbreviation: "MIC"
					},
					{
						name: "Morelos",
						abbreviation: "MOR"
					},
					{
						name: "Nayarit",
						abbreviation: "NAY"
					},
					{
						name: "Nuevo León",
						abbreviation: "NLE"
					},
					{
						name: "Oaxaca",
						abbreviation: "OAX"
					},
					{
						name: "Puebla",
						abbreviation: "PUE"
					},
					{
						name: "Querétaro",
						abbreviation: "QUE"
					},
					{
						name: "Quintana Roo",
						abbreviation: "ROO"
					},
					{
						name: "San Luis Potosí",
						abbreviation: "SLP"
					},
					{
						name: "Sinaloa",
						abbreviation: "SIN"
					},
					{
						name: "Sonora",
						abbreviation: "SON"
					},
					{
						name: "Tabasco",
						abbreviation: "TAB"
					},
					{
						name: "Tamaulipas",
						abbreviation: "TAM"
					},
					{
						name: "Tlaxcala",
						abbreviation: "TLA"
					},
					{
						name: "Veracruz",
						abbreviation: "VER"
					},
					{
						name: "Yucatán",
						abbreviation: "YUC"
'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('					},
					{
						name: "Zacatecas",
						abbreviation: "ZAC"
					}
				]
			},
			street_suffixes: {
				us: [
					{
						name: "Avenue",
						abbreviation: "Ave"
					},
					{
						name: "Boulevard",
						abbreviation: "Blvd"
					},
					{
						name: "Center",
						abbreviation: "Ctr"
					},
					{
						name: "Circle",
						abbreviation: "Cir"
					},
					{
						name: "Court",
						abbreviation: "Ct"
					},
					{
						name: "Drive",
						abbreviation: "Dr"
					},
					{
						name: "Extension",
						abbreviation: "Ext"
					},
					{
						name: "Glen",
						abbreviation: "Gln"
					},
					{
						name: "Grove",
						abbreviation: "Grv"
					},
					{
						name: "Heights",
						abbreviation: "Hts"
					},
					{
						name: "Highway",
						abbreviation: "Hwy"
					},
					{
						name: "Junction",
						abbreviation: "Jct"
					},
					{
						name: "Key",
						abbreviation: "Key"
					},
					{
						name: "Lane",
						abbreviation: "Ln"
					},
					{
						name: "Loop",
						abbreviation: "Loop"
					},
					{
						name: "Manor",
						abbreviation: "Mnr"
					},
					{
						name: "Mill",
						abbreviation: "Mill"
					},
					{
						name: "Park",
						abbreviation: "Park"
					},
					{
						name: "Parkway",
						abbreviation: "Pkwy"
					},
					{
						name: "Pass",
						abbreviation: "Pass"
					},
					{
						name: "Path",
						abbreviation: "Path"
					},
					{
						name: "Pike",
						abbreviation: "Pike"
					},
					{
						name: "Place",
						abbreviation: "Pl"
					},
					{
						name: "Plaza",
						abbreviation: "Plz"
					},
					{
						name: "Point",
						abbreviation: "Pt"
					},
					{
						name: "Ridge",
						abbreviation: "Rdg"
					},
					{
						name: "River",
						abbreviation: "Riv"
					},
					{
						name: "Road",
						abbreviation: "Rd"
					},
					{
						name: "Square",
						abbreviation: "Sq"
					},
					{
						name: "Street",
						abbreviation: "St"
					},
					{
					'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('	name: "Terrace",
						abbreviation: "Ter"
					},
					{
						name: "Trail",
						abbreviation: "Trl"
					},
					{
						name: "Turnpike",
						abbreviation: "Tpke"
					},
					{
						name: "View",
						abbreviation: "Vw"
					},
					{
						name: "Way",
						abbreviation: "Way"
					}
				],
				it: [
					{
						name: "Accesso",
						abbreviation: "Acc."
					},
					{
						name: "Alzaia",
						abbreviation: "Alz."
					},
					{
						name: "Arco",
						abbreviation: "Arco"
					},
					{
						name: "Archivolto",
						abbreviation: "Acv."
					},
					{
						name: "Arena",
						abbreviation: "Arena"
					},
					{
						name: "Argine",
						abbreviation: "Argine"
					},
					{
						name: "Bacino",
						abbreviation: "Bacino"
					},
					{
						name: "Banchi",
						abbreviation: "Banchi"
					},
					{
						name: "Banchina",
						abbreviation: "Ban."
					},
					{
						name: "Bastioni",
						abbreviation: "Bas."
					},
					{
						name: "Belvedere",
						abbreviation: "Belv."
					},
					{
						name: "Borgata",
						abbreviation: "B.ta"
					},
					{
						name: "Borgo",
						abbreviation: "B.go"
					},
					{
						name: "Calata",
						abbreviation: "Cal."
					},
					{
						name: "Calle",
						abbreviation: "Calle"
					},
					{
						name: "Campiello",
						abbreviation: "Cam."
					},
					{
						name: "Campo",
						abbreviation: "Cam."
					},
					{
						name: "Canale",
						abbreviation: "Can."
					},
					{
						name: "Carraia",
						abbreviation: "Carr."
					},
					{
						name: "Cascina",
						abbreviation: "Cascina"
					},
					{
						name: "Case sparse",
						abbreviation: "c.s."
					},
					{
						name: "Cavalcavia",
						abbreviation: "Cv."
					},
					{
						name: "Circonvallazione",
						abbreviation: "Cv."
					},
					{
						name: "Complanare",
						abbreviation: "C.re"
					},
					{
						name: "Contrada",
						abbreviation: "C.da"
					},
					{
						name: "Corso",
						ab'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('breviation: "C.so"
					},
					{
						name: "Corte",
						abbreviation: "C.te"
					},
					{
						name: "Cortile",
						abbreviation: "C.le"
					},
					{
						name: "Diramazione",
						abbreviation: "Dir."
					},
					{
						name: "Fondaco",
						abbreviation: "F.co"
					},
					{
						name: "Fondamenta",
						abbreviation: "F.ta"
					},
					{
						name: "Fondo",
						abbreviation: "F.do"
					},
					{
						name: "Frazione",
						abbreviation: "Fr."
					},
					{
						name: "Isola",
						abbreviation: "Is."
					},
					{
						name: "Largo",
						abbreviation: "L.go"
					},
					{
						name: "Litoranea",
						abbreviation: "Lit."
					},
					{
						name: "Lungolago",
						abbreviation: "L.go lago"
					},
					{
						name: "Lungo Po",
						abbreviation: "l.go Po"
					},
					{
						name: "Molo",
						abbreviation: "Molo"
					},
					{
						name: "Mura",
						abbreviation: "Mura"
					},
					{
						name: "Passaggio privato",
						abbreviation: "pass. priv."
					},
					{
						name: "Passeggiata",
						abbreviation: "Pass."
					},
					{
						name: "Piazza",
						abbreviation: "P.zza"
					},
					{
						name: "Piazzale",
						abbreviation: "P.le"
					},
					{
						name: "Ponte",
						abbreviation: "P.te"
					},
					{
						name: "Portico",
						abbreviation: "P.co"
					},
					{
						name: "Rampa",
						abbreviation: "Rampa"
					},
					{
						name: "Regione",
						abbreviation: "Reg."
					},
					{
						name: "Rione",
						abbreviation: "R.ne"
					},
					{
						name: "Rio",
						abbreviation: "Rio"
					},
					{
						name: "Ripa",
						abbreviation: "Ripa"
					},
					{
						name: "Riva",
						abbreviation: "Riva"
					},
					{
						name: "Rondò",
						abbreviation: "Rondò"
					},
					{
						name: "Rotonda",
						abbreviation: "Rot."
					},
					{
						name: "Sagrato",
						abbreviation: "Sagr."
					},
					{
						name: "Salita",
						abbreviation: "Sal."
					},
					{
					'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('	name: "Scalinata",
						abbreviation: "Scal."
					},
					{
						name: "Scalone",
						abbreviation: "Scal."
					},
					{
						name: "Slargo",
						abbreviation: "Sl."
					},
					{
						name: "Sottoportico",
						abbreviation: "Sott."
					},
					{
						name: "Strada",
						abbreviation: "Str."
					},
					{
						name: "Stradale",
						abbreviation: "Str.le"
					},
					{
						name: "Strettoia",
						abbreviation: "Strett."
					},
					{
						name: "Traversa",
						abbreviation: "Trav."
					},
					{
						name: "Via",
						abbreviation: "V."
					},
					{
						name: "Viale",
						abbreviation: "V.le"
					},
					{
						name: "Vicinale",
						abbreviation: "Vic.le"
					},
					{
						name: "Vicolo",
						abbreviation: "Vic."
					}
				],
				uk: [
					{
						name: "Avenue",
						abbreviation: "Ave"
					},
					{
						name: "Close",
						abbreviation: "Cl"
					},
					{
						name: "Court",
						abbreviation: "Ct"
					},
					{
						name: "Crescent",
						abbreviation: "Cr"
					},
					{
						name: "Drive",
						abbreviation: "Dr"
					},
					{
						name: "Garden",
						abbreviation: "Gdn"
					},
					{
						name: "Gardens",
						abbreviation: "Gdns"
					},
					{
						name: "Green",
						abbreviation: "Gn"
					},
					{
						name: "Grove",
						abbreviation: "Gr"
					},
					{
						name: "Lane",
						abbreviation: "Ln"
					},
					{
						name: "Mount",
						abbreviation: "Mt"
					},
					{
						name: "Place",
						abbreviation: "Pl"
					},
					{
						name: "Park",
						abbreviation: "Pk"
					},
					{
						name: "Ridge",
						abbreviation: "Rdg"
					},
					{
						name: "Road",
						abbreviation: "Rd"
					},
					{
						name: "Square",
						abbreviation: "Sq"
					},
					{
						name: "Street",
						abbreviation: "St"
					},
					{
						name: "Terrace",
						abbreviation: "Ter"
					},
					{
						name: "Valley",
						abbreviation: "Val"
					}
				]
			},
			months: [
				{
'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('					name: "January",
					short_name: "Jan",
					numeric: "01",
					days: 31
				},
				{
					name: "February",
					short_name: "Feb",
					numeric: "02",
					days: 28
				},
				{
					name: "March",
					short_name: "Mar",
					numeric: "03",
					days: 31
				},
				{
					name: "April",
					short_name: "Apr",
					numeric: "04",
					days: 30
				},
				{
					name: "May",
					short_name: "May",
					numeric: "05",
					days: 31
				},
				{
					name: "June",
					short_name: "Jun",
					numeric: "06",
					days: 30
				},
				{
					name: "July",
					short_name: "Jul",
					numeric: "07",
					days: 31
				},
				{
					name: "August",
					short_name: "Aug",
					numeric: "08",
					days: 31
				},
				{
					name: "September",
					short_name: "Sep",
					numeric: "09",
					days: 30
				},
				{
					name: "October",
					short_name: "Oct",
					numeric: "10",
					days: 31
				},
				{
					name: "November",
					short_name: "Nov",
					numeric: "11",
					days: 30
				},
				{
					name: "December",
					short_name: "Dec",
					numeric: "12",
					days: 31
				}
			],
			cc_types: [
				{
					name: "American Express",
					short_name: "amex",
					prefix: "34",
					length: 15
				},
				{
					name: "Bankcard",
					short_name: "bankcard",
					prefix: "5610",
					length: 16
				},
				{
					name: "China UnionPay",
					short_name: "chinaunion",
					prefix: "62",
					length: 16
				},
				{
					name: "Diners Club Carte Blanche",
					short_name: "dccarte",
					prefix: "300",
					length: 14
				},
				{
					name: "Diners Club enRoute",
					short_name: "dcenroute",
					prefix: "2014",
					length: 15
				},
				{
					name: "Diners Club International",
					short_name: "dcintl",
					prefix: "36",
					length: 14
				},
				{
					name: "Diners Club United States & Canada",
					short_name: "dcusc",
					prefix: "54",
					length: 16
				},
				{
					name: "Discover Card",
					short_name: "discover",
					prefix: "6011",
					length: '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('16
				},
				{
					name: "InstaPayment",
					short_name: "instapay",
					prefix: "637",
					length: 16
				},
				{
					name: "JCB",
					short_name: "jcb",
					prefix: "3528",
					length: 16
				},
				{
					name: "Laser",
					short_name: "laser",
					prefix: "6304",
					length: 16
				},
				{
					name: "Maestro",
					short_name: "maestro",
					prefix: "5018",
					length: 16
				},
				{
					name: "Mastercard",
					short_name: "mc",
					prefix: "51",
					length: 16
				},
				{
					name: "Solo",
					short_name: "solo",
					prefix: "6334",
					length: 16
				},
				{
					name: "Switch",
					short_name: "switch",
					prefix: "4903",
					length: 16
				},
				{
					name: "Visa",
					short_name: "visa",
					prefix: "4",
					length: 16
				},
				{
					name: "Visa Electron",
					short_name: "electron",
					prefix: "4026",
					length: 16
				}
			],
			currency_types: [
				{
					code: "AED",
					name: "United Arab Emirates Dirham"
				},
				{
					code: "AFN",
					name: "Afghanistan Afghani"
				},
				{
					code: "ALL",
					name: "Albania Lek"
				},
				{
					code: "AMD",
					name: "Armenia Dram"
				},
				{
					code: "ANG",
					name: "Netherlands Antilles Guilder"
				},
				{
					code: "AOA",
					name: "Angola Kwanza"
				},
				{
					code: "ARS",
					name: "Argentina Peso"
				},
				{
					code: "AUD",
					name: "Australia Dollar"
				},
				{
					code: "AWG",
					name: "Aruba Guilder"
				},
				{
					code: "AZN",
					name: "Azerbaijan New Manat"
				},
				{
					code: "BAM",
					name: "Bosnia and Herzegovina Convertible Marka"
				},
				{
					code: "BBD",
					name: "Barbados Dollar"
				},
				{
					code: "BDT",
					name: "Bangladesh Taka"
				},
				{
					code: "BGN",
					name: "Bulgaria Lev"
				},
				{
					code: "BHD",
					name: "Bahrain Dinar"
				},
				{
					code: "BIF",
					name: "Burundi Franc"
				},
				{
					code: "BMD",
					name: "Bermuda Dollar"
				},
				{
					code: "BND",
	'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('				name: "Brunei Darussalam Dollar"
				},
				{
					code: "BOB",
					name: "Bolivia Boliviano"
				},
				{
					code: "BRL",
					name: "Brazil Real"
				},
				{
					code: "BSD",
					name: "Bahamas Dollar"
				},
				{
					code: "BTN",
					name: "Bhutan Ngultrum"
				},
				{
					code: "BWP",
					name: "Botswana Pula"
				},
				{
					code: "BYR",
					name: "Belarus Ruble"
				},
				{
					code: "BZD",
					name: "Belize Dollar"
				},
				{
					code: "CAD",
					name: "Canada Dollar"
				},
				{
					code: "CDF",
					name: "Congo/Kinshasa Franc"
				},
				{
					code: "CHF",
					name: "Switzerland Franc"
				},
				{
					code: "CLP",
					name: "Chile Peso"
				},
				{
					code: "CNY",
					name: "China Yuan Renminbi"
				},
				{
					code: "COP",
					name: "Colombia Peso"
				},
				{
					code: "CRC",
					name: "Costa Rica Colon"
				},
				{
					code: "CUC",
					name: "Cuba Convertible Peso"
				},
				{
					code: "CUP",
					name: "Cuba Peso"
				},
				{
					code: "CVE",
					name: "Cape Verde Escudo"
				},
				{
					code: "CZK",
					name: "Czech Republic Koruna"
				},
				{
					code: "DJF",
					name: "Djibouti Franc"
				},
				{
					code: "DKK",
					name: "Denmark Krone"
				},
				{
					code: "DOP",
					name: "Dominican Republic Peso"
				},
				{
					code: "DZD",
					name: "Algeria Dinar"
				},
				{
					code: "EGP",
					name: "Egypt Pound"
				},
				{
					code: "ERN",
					name: "Eritrea Nakfa"
				},
				{
					code: "ETB",
					name: "Ethiopia Birr"
				},
				{
					code: "EUR",
					name: "Euro Member Countries"
				},
				{
					code: "FJD",
					name: "Fiji Dollar"
				},
				{
					code: "FKP",
					name: "Falkland Islands (Malvinas) Pound"
				},
				{
					code: "GBP",
					name: "United Kingdom Pound"
				},
				{
					code: "GEL",
					name: "Georgia Lari"
				},
				{
					code: "GGP",
					name: "Guernsey Pound"
				},
				{
					code: "GHS",
					name: "Ghana Cedi"
				},
				{
					code: "GIP",'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('
					name: "Gibraltar Pound"
				},
				{
					code: "GMD",
					name: "Gambia Dalasi"
				},
				{
					code: "GNF",
					name: "Guinea Franc"
				},
				{
					code: "GTQ",
					name: "Guatemala Quetzal"
				},
				{
					code: "GYD",
					name: "Guyana Dollar"
				},
				{
					code: "HKD",
					name: "Hong Kong Dollar"
				},
				{
					code: "HNL",
					name: "Honduras Lempira"
				},
				{
					code: "HRK",
					name: "Croatia Kuna"
				},
				{
					code: "HTG",
					name: "Haiti Gourde"
				},
				{
					code: "HUF",
					name: "Hungary Forint"
				},
				{
					code: "IDR",
					name: "Indonesia Rupiah"
				},
				{
					code: "ILS",
					name: "Israel Shekel"
				},
				{
					code: "IMP",
					name: "Isle of Man Pound"
				},
				{
					code: "INR",
					name: "India Rupee"
				},
				{
					code: "IQD",
					name: "Iraq Dinar"
				},
				{
					code: "IRR",
					name: "Iran Rial"
				},
				{
					code: "ISK",
					name: "Iceland Krona"
				},
				{
					code: "JEP",
					name: "Jersey Pound"
				},
				{
					code: "JMD",
					name: "Jamaica Dollar"
				},
				{
					code: "JOD",
					name: "Jordan Dinar"
				},
				{
					code: "JPY",
					name: "Japan Yen"
				},
				{
					code: "KES",
					name: "Kenya Shilling"
				},
				{
					code: "KGS",
					name: "Kyrgyzstan Som"
				},
				{
					code: "KHR",
					name: "Cambodia Riel"
				},
				{
					code: "KMF",
					name: "Comoros Franc"
				},
				{
					code: "KPW",
					name: "Korea (North) Won"
				},
				{
					code: "KRW",
					name: "Korea (South) Won"
				},
				{
					code: "KWD",
					name: "Kuwait Dinar"
				},
				{
					code: "KYD",
					name: "Cayman Islands Dollar"
				},
				{
					code: "KZT",
					name: "Kazakhstan Tenge"
				},
				{
					code: "LAK",
					name: "Laos Kip"
				},
				{
					code: "LBP",
					name: "Lebanon Pound"
				},
				{
					code: "LKR",
					name: "Sri Lanka Rupee"
				},
				{
					code: "LRD",
					name: "Liberia Dollar"
				},
				{
					code: "LSL",
					n'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ame: "Lesotho Loti"
				},
				{
					code: "LTL",
					name: "Lithuania Litas"
				},
				{
					code: "LYD",
					name: "Libya Dinar"
				},
				{
					code: "MAD",
					name: "Morocco Dirham"
				},
				{
					code: "MDL",
					name: "Moldova Leu"
				},
				{
					code: "MGA",
					name: "Madagascar Ariary"
				},
				{
					code: "MKD",
					name: "Macedonia Denar"
				},
				{
					code: "MMK",
					name: "Myanmar (Burma) Kyat"
				},
				{
					code: "MNT",
					name: "Mongolia Tughrik"
				},
				{
					code: "MOP",
					name: "Macau Pataca"
				},
				{
					code: "MRO",
					name: "Mauritania Ouguiya"
				},
				{
					code: "MUR",
					name: "Mauritius Rupee"
				},
				{
					code: "MVR",
					name: "Maldives (Maldive Islands) Rufiyaa"
				},
				{
					code: "MWK",
					name: "Malawi Kwacha"
				},
				{
					code: "MXN",
					name: "Mexico Peso"
				},
				{
					code: "MYR",
					name: "Malaysia Ringgit"
				},
				{
					code: "MZN",
					name: "Mozambique Metical"
				},
				{
					code: "NAD",
					name: "Namibia Dollar"
				},
				{
					code: "NGN",
					name: "Nigeria Naira"
				},
				{
					code: "NIO",
					name: "Nicaragua Cordoba"
				},
				{
					code: "NOK",
					name: "Norway Krone"
				},
				{
					code: "NPR",
					name: "Nepal Rupee"
				},
				{
					code: "NZD",
					name: "New Zealand Dollar"
				},
				{
					code: "OMR",
					name: "Oman Rial"
				},
				{
					code: "PAB",
					name: "Panama Balboa"
				},
				{
					code: "PEN",
					name: "Peru Nuevo Sol"
				},
				{
					code: "PGK",
					name: "Papua New Guinea Kina"
				},
				{
					code: "PHP",
					name: "Philippines Peso"
				},
				{
					code: "PKR",
					name: "Pakistan Rupee"
				},
				{
					code: "PLN",
					name: "Poland Zloty"
				},
				{
					code: "PYG",
					name: "Paraguay Guarani"
				},
				{
					code: "QAR",
					name: "Qatar Riyal"
				},
				{
					code: "RON",
					name: "Romania New Leu"
				},
				{
					code: "RSD",
					name: "Serbia Dinar"
	'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			},
				{
					code: "RUB",
					name: "Russia Ruble"
				},
				{
					code: "RWF",
					name: "Rwanda Franc"
				},
				{
					code: "SAR",
					name: "Saudi Arabia Riyal"
				},
				{
					code: "SBD",
					name: "Solomon Islands Dollar"
				},
				{
					code: "SCR",
					name: "Seychelles Rupee"
				},
				{
					code: "SDG",
					name: "Sudan Pound"
				},
				{
					code: "SEK",
					name: "Sweden Krona"
				},
				{
					code: "SGD",
					name: "Singapore Dollar"
				},
				{
					code: "SHP",
					name: "Saint Helena Pound"
				},
				{
					code: "SLL",
					name: "Sierra Leone Leone"
				},
				{
					code: "SOS",
					name: "Somalia Shilling"
				},
				{
					code: "SPL",
					name: "Seborga Luigino"
				},
				{
					code: "SRD",
					name: "Suriname Dollar"
				},
				{
					code: "STD",
					name: "São Tomé and Príncipe Dobra"
				},
				{
					code: "SVC",
					name: "El Salvador Colon"
				},
				{
					code: "SYP",
					name: "Syria Pound"
				},
				{
					code: "SZL",
					name: "Swaziland Lilangeni"
				},
				{
					code: "THB",
					name: "Thailand Baht"
				},
				{
					code: "TJS",
					name: "Tajikistan Somoni"
				},
				{
					code: "TMT",
					name: "Turkmenistan Manat"
				},
				{
					code: "TND",
					name: "Tunisia Dinar"
				},
				{
					code: "TOP",
					name: "Tonga Pa''anga"
				},
				{
					code: "TRY",
					name: "Turkey Lira"
				},
				{
					code: "TTD",
					name: "Trinidad and Tobago Dollar"
				},
				{
					code: "TVD",
					name: "Tuvalu Dollar"
				},
				{
					code: "TWD",
					name: "Taiwan New Dollar"
				},
				{
					code: "TZS",
					name: "Tanzania Shilling"
				},
				{
					code: "UAH",
					name: "Ukraine Hryvnia"
				},
				{
					code: "UGX",
					name: "Uganda Shilling"
				},
				{
					code: "USD",
					name: "United States Dollar"
				},
				{
					code: "UYU",
					name: "Uruguay Peso"
				},
				{
					code: "UZS",
					name: "Uzbekistan Som"
				},
				{
					code: "VEF",
					name: "Venezuel'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('a Bolivar"
				},
				{
					code: "VND",
					name: "Viet Nam Dong"
				},
				{
					code: "VUV",
					name: "Vanuatu Vatu"
				},
				{
					code: "WST",
					name: "Samoa Tala"
				},
				{
					code: "XAF",
					name: "Communauté Financière Africaine (BEAC) CFA Franc BEAC"
				},
				{
					code: "XCD",
					name: "East Caribbean Dollar"
				},
				{
					code: "XDR",
					name: "International Monetary Fund (IMF) Special Drawing Rights"
				},
				{
					code: "XOF",
					name: "Communauté Financière Africaine (BCEAO) Franc"
				},
				{
					code: "XPF",
					name: "Comptoirs Français du Pacifique (CFP) Franc"
				},
				{
					code: "YER",
					name: "Yemen Rial"
				},
				{
					code: "ZAR",
					name: "South Africa Rand"
				},
				{
					code: "ZMW",
					name: "Zambia Kwacha"
				},
				{
					code: "ZWD",
					name: "Zimbabwe Dollar"
				}
			],
			colorNames: /* @__PURE__ */ "AliceBlue.Black.Navy.DarkBlue.MediumBlue.Blue.DarkGreen.Green.Teal.DarkCyan.DeepSkyBlue.DarkTurquoise.MediumSpringGreen.Lime.SpringGreen.Aqua.Cyan.MidnightBlue.DodgerBlue.LightSeaGreen.ForestGreen.SeaGreen.DarkSlateGray.LimeGreen.MediumSeaGreen.Turquoise.RoyalBlue.SteelBlue.DarkSlateBlue.MediumTurquoise.Indigo.DarkOliveGreen.CadetBlue.CornflowerBlue.RebeccaPurple.MediumAquaMarine.DimGray.SlateBlue.OliveDrab.SlateGray.LightSlateGray.MediumSlateBlue.LawnGreen.Chartreuse.Aquamarine.Maroon.Purple.Olive.Gray.SkyBlue.LightSkyBlue.BlueViolet.DarkRed.DarkMagenta.SaddleBrown.Ivory.White.DarkSeaGreen.LightGreen.MediumPurple.DarkViolet.PaleGreen.DarkOrchid.YellowGreen.Sienna.Brown.DarkGray.LightBlue.GreenYellow.PaleTurquoise.LightSteelBlue.PowderBlue.FireBrick.DarkGoldenRod.MediumOrchid.RosyBrown.DarkKhaki.Silver.MediumVioletRed.IndianRed.Peru.Chocolate.Tan.LightGray.Thistle.Orchid.GoldenRod.PaleVioletRed.Crimson.Gainsboro.Plum.BurlyWood.LightCyan.Lavender.DarkSalmon.Violet.PaleGoldenRod.LightCoral.Khaki.AliceBlue.HoneyDew.Azure.SandyBrown.Wheat.Beige.WhiteSmoke.MintCream.GhostWhite.Salmon.A'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ntiqueWhite.Linen.LightGoldenRodYellow.OldLace.Red.Fuchsia.Magenta.DeepPink.OrangeRed.Tomato.HotPink.Coral.DarkOrange.LightSalmon.Orange.LightPink.Pink.Gold.PeachPuff.NavajoWhite.Moccasin.Bisque.MistyRose.BlanchedAlmond.PapayaWhip.LavenderBlush.SeaShell.Cornsilk.LemonChiffon.FloralWhite.Snow.Yellow.LightYellow".split("."),
			company: /* @__PURE__ */ "3Com Corp(3M Company(A.G. Edwards Inc.(Abbott Laboratories(Abercrombie & Fitch Co.(ABM Industries Incorporated(Ace Hardware Corporation(ACT Manufacturing Inc.(Acterna Corp.(Adams Resources & Energy, Inc.(ADC Telecommunications, Inc.(Adelphia Communications Corporation(Administaff, Inc.(Adobe Systems Incorporated(Adolph Coors Company(Advance Auto Parts, Inc.(Advanced Micro Devices, Inc.(AdvancePCS, Inc.(Advantica Restaurant Group, Inc.(The AES Corporation(Aetna Inc.(Affiliated Computer Services, Inc.(AFLAC Incorporated(AGCO Corporation(Agilent Technologies, Inc.(Agway Inc.(Apartment Investment and Management Company(Air Products and Chemicals, Inc.(Airborne, Inc.(Airgas, Inc.(AK Steel Holding Corporation(Alaska Air Group, Inc.(Alberto-Culver Company(Albertson''s, Inc.(Alcoa Inc.(Alleghany Corporation(Allegheny Energy, Inc.(Allegheny Technologies Incorporated(Allergan, Inc.(ALLETE, Inc.(Alliant Energy Corporation(Allied Waste Industries, Inc.(Allmerica Financial Corporation(The Allstate Corporation(ALLTEL Corporation(The Alpine Group, Inc.(Amazon.com, Inc.(AMC Entertainment Inc.(American Power Conversion Corporation(Amerada Hess Corporation(AMERCO(Ameren Corporation(America West Holdings Corporation(American Axle & Manufacturing Holdings, Inc.(American Eagle Outfitters, Inc.(American Electric Power Company, Inc.(American Express Company(American Financial Group, Inc.(American Greetings Corporation(American International Group, Inc.(American Standard Companies Inc.(American Water Works Company, Inc.(AmerisourceBergen Corporation(Ames Department Stores, Inc.(Amgen Inc.(Amkor Technology, Inc.(AMR Corporation(AmSouth Bancorp'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.(Amtran, Inc.(Anadarko Petroleum Corporation(Analog Devices, Inc.(Anheuser-Busch Companies, Inc.(Anixter International Inc.(AnnTaylor Inc.(Anthem, Inc.(AOL Time Warner Inc.(Aon Corporation(Apache Corporation(Apple Computer, Inc.(Applera Corporation(Applied Industrial Technologies, Inc.(Applied Materials, Inc.(Aquila, Inc.(ARAMARK Corporation(Arch Coal, Inc.(Archer Daniels Midland Company(Arkansas Best Corporation(Armstrong Holdings, Inc.(Arrow Electronics, Inc.(ArvinMeritor, Inc.(Ashland Inc.(Astoria Financial Corporation(AT&T Corp.(Atmel Corporation(Atmos Energy Corporation(Audiovox Corporation(Autoliv, Inc.(Automatic Data Processing, Inc.(AutoNation, Inc.(AutoZone, Inc.(Avaya Inc.(Avery Dennison Corporation(Avista Corporation(Avnet, Inc.(Avon Products, Inc.(Baker Hughes Incorporated(Ball Corporation(Bank of America Corporation(The Bank of New York Company, Inc.(Bank One Corporation(Banknorth Group, Inc.(Banta Corporation(Barnes & Noble, Inc.(Bausch & Lomb Incorporated(Baxter International Inc.(BB&T Corporation(The Bear Stearns Companies Inc.(Beazer Homes USA, Inc.(Beckman Coulter, Inc.(Becton, Dickinson and Company(Bed Bath & Beyond Inc.(Belk, Inc.(Bell Microproducts Inc.(BellSouth Corporation(Belo Corp.(Bemis Company, Inc.(Benchmark Electronics, Inc.(Berkshire Hathaway Inc.(Best Buy Co., Inc.(Bethlehem Steel Corporation(Beverly Enterprises, Inc.(Big Lots, Inc.(BJ Services Company(BJ''s Wholesale Club, Inc.(The Black & Decker Corporation(Black Hills Corporation(BMC Software, Inc.(The Boeing Company(Boise Cascade Corporation(Borders Group, Inc.(BorgWarner Inc.(Boston Scientific Corporation(Bowater Incorporated(Briggs & Stratton Corporation(Brightpoint, Inc.(Brinker International, Inc.(Bristol-Myers Squibb Company(Broadwing, Inc.(Brown Shoe Company, Inc.(Brown-Forman Corporation(Brunswick Corporation(Budget Group, Inc.(Burlington Coat Factory Warehouse Corporation(Burlington Industries, Inc.(Burlington Northern Santa Fe Corporation(Burlington Resources Inc.(C. H. R'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('obinson Worldwide Inc.(Cablevision Systems Corp(Cabot Corp(Cadence Design Systems, Inc.(Calpine Corp.(Campbell Soup Co.(Capital One Financial Corp.(Cardinal Health Inc.(Caremark Rx Inc.(Carlisle Cos. Inc.(Carpenter Technology Corp.(Casey''s General Stores Inc.(Caterpillar Inc.(CBRL Group Inc.(CDI Corp.(CDW Computer Centers Inc.(CellStar Corp.(Cendant Corp(Cenex Harvest States Cooperatives(Centex Corp.(CenturyTel Inc.(Ceridian Corp.(CH2M Hill Cos. Ltd.(Champion Enterprises Inc.(Charles Schwab Corp.(Charming Shoppes Inc.(Charter Communications Inc.(Charter One Financial Inc.(ChevronTexaco Corp.(Chiquita Brands International Inc.(Chubb Corp(Ciena Corp.(Cigna Corp(Cincinnati Financial Corp.(Cinergy Corp.(Cintas Corp.(Circuit City Stores Inc.(Cisco Systems Inc.(Citigroup, Inc(Citizens Communications Co.(CKE Restaurants Inc.(Clear Channel Communications Inc.(The Clorox Co.(CMGI Inc.(CMS Energy Corp.(CNF Inc.(Coca-Cola Co.(Coca-Cola Enterprises Inc.(Colgate-Palmolive Co.(Collins & Aikman Corp.(Comcast Corp.(Comdisco Inc.(Comerica Inc.(Comfort Systems USA Inc.(Commercial Metals Co.(Community Health Systems Inc.(Compass Bancshares Inc(Computer Associates International Inc.(Computer Sciences Corp.(Compuware Corp.(Comverse Technology Inc.(ConAgra Foods Inc.(Concord EFS Inc.(Conectiv, Inc(Conoco Inc(Conseco Inc.(Consolidated Freightways Corp.(Consolidated Edison Inc.(Constellation Brands Inc.(Constellation Emergy Group Inc.(Continental Airlines Inc.(Convergys Corp.(Cooper Cameron Corp.(Cooper Industries Ltd.(Cooper Tire & Rubber Co.(Corn Products International Inc.(Corning Inc.(Costco Wholesale Corp.(Countrywide Credit Industries Inc.(Coventry Health Care Inc.(Cox Communications Inc.(Crane Co.(Crompton Corp.(Crown Cork & Seal Co. Inc.(CSK Auto Corp.(CSX Corp.(Cummins Inc.(CVS Corp.(Cytec Industries Inc.(D&K Healthcare Resources, Inc.(D.R. Horton Inc.(Dana Corporation(Danaher Corporation(Darden Restaurants Inc.(DaVita Inc.(Dean Foods Company(Deere & Company(Del Monte Foods Co(De'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ll Computer Corporation(Delphi Corp.(Delta Air Lines Inc.(Deluxe Corporation(Devon Energy Corporation(Di Giorgio Corporation(Dial Corporation(Diebold Incorporated(Dillard''s Inc.(DIMON Incorporated(Dole Food Company, Inc.(Dollar General Corporation(Dollar Tree Stores, Inc.(Dominion Resources, Inc.(Domino''s Pizza LLC(Dover Corporation, Inc.(Dow Chemical Company(Dow Jones & Company, Inc.(DPL Inc.(DQE Inc.(Dreyer''s Grand Ice Cream, Inc.(DST Systems, Inc.(DTE Energy Co.(E.I. Du Pont de Nemours and Company(Duke Energy Corp(Dun & Bradstreet Inc.(DURA Automotive Systems Inc.(DynCorp(Dynegy Inc.(E*Trade Group, Inc.(E.W. Scripps Company(Earthlink, Inc.(Eastman Chemical Company(Eastman Kodak Company(Eaton Corporation(Echostar Communications Corporation(Ecolab Inc.(Edison International(EGL Inc.(El Paso Corporation(Electronic Arts Inc.(Electronic Data Systems Corp.(Eli Lilly and Company(EMC Corporation(Emcor Group Inc.(Emerson Electric Co.(Encompass Services Corporation(Energizer Holdings Inc.(Energy East Corporation(Engelhard Corporation(Enron Corp.(Entergy Corporation(Enterprise Products Partners L.P.(EOG Resources, Inc.(Equifax Inc.(Equitable Resources Inc.(Equity Office Properties Trust(Equity Residential Properties Trust(Estee Lauder Companies Inc.(Exelon Corporation(Exide Technologies(Expeditors International of Washington Inc.(Express Scripts Inc.(ExxonMobil Corporation(Fairchild Semiconductor International Inc.(Family Dollar Stores Inc.(Farmland Industries Inc.(Federal Mogul Corp.(Federated Department Stores Inc.(Federal Express Corp.(Felcor Lodging Trust Inc.(Ferro Corp.(Fidelity National Financial Inc.(Fifth Third Bancorp(First American Financial Corp.(First Data Corp.(First National of Nebraska Inc.(First Tennessee National Corp.(FirstEnergy Corp.(Fiserv Inc.(Fisher Scientific International Inc.(FleetBoston Financial Co.(Fleetwood Enterprises Inc.(Fleming Companies Inc.(Flowers Foods Inc.(Flowserv Corp(Fluor Corp(FMC Corp(Foamex International Inc(Foot Locker Inc(Fo'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('otstar Inc.(Ford Motor Co(Forest Laboratories Inc.(Fortune Brands Inc.(Foster Wheeler Ltd.(FPL Group Inc.(Franklin Resources Inc.(Freeport McMoran Copper & Gold Inc.(Frontier Oil Corp(Furniture Brands International Inc.(Gannett Co., Inc.(Gap Inc.(Gateway Inc.(GATX Corporation(Gemstar-TV Guide International Inc.(GenCorp Inc.(General Cable Corporation(General Dynamics Corporation(General Electric Company(General Mills Inc(General Motors Corporation(Genesis Health Ventures Inc.(Gentek Inc.(Gentiva Health Services Inc.(Genuine Parts Company(Genuity Inc.(Genzyme Corporation(Georgia Gulf Corporation(Georgia-Pacific Corporation(Gillette Company(Gold Kist Inc.(Golden State Bancorp Inc.(Golden West Financial Corporation(Goldman Sachs Group Inc.(Goodrich Corporation(The Goodyear Tire & Rubber Company(Granite Construction Incorporated(Graybar Electric Company Inc.(Great Lakes Chemical Corporation(Great Plains Energy Inc.(GreenPoint Financial Corp.(Greif Bros. Corporation(Grey Global Group Inc.(Group 1 Automotive Inc.(Guidant Corporation(H&R Block Inc.(H.B. Fuller Company(H.J. Heinz Company(Halliburton Co.(Harley-Davidson Inc.(Harman International Industries Inc.(Harrah''s Entertainment Inc.(Harris Corp.(Harsco Corp.(Hartford Financial Services Group Inc.(Hasbro Inc.(Hawaiian Electric Industries Inc.(HCA Inc.(Health Management Associates Inc.(Health Net Inc.(Healthsouth Corp(Henry Schein Inc.(Hercules Inc.(Herman Miller Inc.(Hershey Foods Corp.(Hewlett-Packard Company(Hibernia Corp.(Hillenbrand Industries Inc.(Hilton Hotels Corp.(Hollywood Entertainment Corp.(Home Depot Inc.(Hon Industries Inc.(Honeywell International Inc.(Hormel Foods Corp.(Host Marriott Corp.(Household International Corp.(Hovnanian Enterprises Inc.(Hub Group Inc.(Hubbell Inc.(Hughes Supply Inc.(Humana Inc.(Huntington Bancshares Inc.(Idacorp Inc.(IDT Corporation(IKON Office Solutions Inc.(Illinois Tool Works Inc.(IMC Global Inc.(Imperial Sugar Company(IMS Health Inc.(Ingles Market Inc(Ingram Micro Inc.(Insight'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' Enterprises Inc.(Integrated Electrical Services Inc.(Intel Corporation(International Paper Co.(Interpublic Group of Companies Inc.(Interstate Bakeries Corporation(International Business Machines Corp.(International Flavors & Fragrances Inc.(International Multifoods Corporation(Intuit Inc.(IT Group Inc.(ITT Industries Inc.(Ivax Corp.(J.B. Hunt Transport Services Inc.(J.C. Penny Co.(J.P. Morgan Chase & Co.(Jabil Circuit Inc.(Jack In The Box Inc.(Jacobs Engineering Group Inc.(JDS Uniphase Corp.(Jefferson-Pilot Co.(John Hancock Financial Services Inc.(Johnson & Johnson(Johnson Controls Inc.(Jones Apparel Group Inc.(KB Home(Kellogg Company(Kellwood Company(Kelly Services Inc.(Kemet Corp.(Kennametal Inc.(Kerr-McGee Corporation(KeyCorp(KeySpan Corp.(Kimball International Inc.(Kimberly-Clark Corporation(Kindred Healthcare Inc.(KLA-Tencor Corporation(K-Mart Corp.(Knight-Ridder Inc.(Kohl''s Corp.(KPMG Consulting Inc.(Kroger Co.(L-3 Communications Holdings Inc.(Laboratory Corporation of America Holdings(Lam Research Corporation(LandAmerica Financial Group Inc.(Lands'' End Inc.(Landstar System Inc.(La-Z-Boy Inc.(Lear Corporation(Legg Mason Inc.(Leggett & Platt Inc.(Lehman Brothers Holdings Inc.(Lennar Corporation(Lennox International Inc.(Level 3 Communications Inc.(Levi Strauss & Co.(Lexmark International Inc.(Limited Inc.(Lincoln National Corporation(Linens ''n Things Inc.(Lithia Motors Inc.(Liz Claiborne Inc.(Lockheed Martin Corporation(Loews Corporation(Longs Drug Stores Corporation(Louisiana-Pacific Corporation(Lowe''s Companies Inc.(LSI Logic Corporation(The LTV Corporation(The Lubrizol Corporation(Lucent Technologies Inc.(Lyondell Chemical Company(M & T Bank Corporation(Magellan Health Services Inc.(Mail-Well Inc.(Mandalay Resort Group(Manor Care Inc.(Manpower Inc.(Marathon Oil Corporation(Mariner Health Care Inc.(Markel Corporation(Marriott International Inc.(Marsh & McLennan Companies Inc.(Marsh Supermarkets Inc.(Marshall & Ilsley Corporation(Martin Marietta Materials'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' Inc.(Masco Corporation(Massey Energy Company(MasTec Inc.(Mattel Inc.(Maxim Integrated Products Inc.(Maxtor Corporation(Maxxam Inc.(The May Department Stores Company(Maytag Corporation(MBNA Corporation(McCormick & Company Incorporated(McDonald''s Corporation(The McGraw-Hill Companies Inc.(McKesson Corporation(McLeodUSA Incorporated(M.D.C. Holdings Inc.(MDU Resources Group Inc.(MeadWestvaco Corporation(Medtronic Inc.(Mellon Financial Corporation(The Men''s Wearhouse Inc.(Merck & Co., Inc.(Mercury General Corporation(Merrill Lynch & Co. Inc.(Metaldyne Corporation(Metals USA Inc.(MetLife Inc.(Metris Companies Inc(MGIC Investment Corporation(MGM Mirage(Michaels Stores Inc.(Micron Technology Inc.(Microsoft Corporation(Milacron Inc.(Millennium Chemicals Inc.(Mirant Corporation(Mohawk Industries Inc.(Molex Incorporated(The MONY Group Inc.(Morgan Stanley Dean Witter & Co.(Motorola Inc.(MPS Group Inc.(Murphy Oil Corporation(Nabors Industries Inc(Nacco Industries Inc(Nash Finch Company(National City Corp.(National Commerce Financial Corporation(National Fuel Gas Company(National Oilwell Inc(National Rural Utilities Cooperative Finance Corporation(National Semiconductor Corporation(National Service Industries Inc(Navistar International Corporation(NCR Corporation(The Neiman Marcus Group Inc.(New Jersey Resources Corporation(New York Times Company(Newell Rubbermaid Inc(Newmont Mining Corporation(Nextel Communications Inc(Nicor Inc(Nike Inc(NiSource Inc(Noble Energy Inc(Nordstrom Inc(Norfolk Southern Corporation(Nortek Inc(North Fork Bancorporation Inc(Northeast Utilities System(Northern Trust Corporation(Northrop Grumman Corporation(NorthWestern Corporation(Novellus Systems Inc(NSTAR(NTL Incorporated(Nucor Corp(Nvidia Corp(NVR Inc(Northwest Airlines Corp(Occidental Petroleum Corp(Ocean Energy Inc(Office Depot Inc.(OfficeMax Inc(OGE Energy Corp(Oglethorpe Power Corp.(Ohio Casualty Corp.(Old Republic International Corp.(Olin Corp.(OM Group Inc(Omnicare Inc(Omnicom Group(On Semico'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('nductor Corp(ONEOK Inc(Oracle Corp(Oshkosh Truck Corp(Outback Steakhouse Inc.(Owens & Minor Inc.(Owens Corning(Owens-Illinois Inc(Oxford Health Plans Inc(Paccar Inc(PacifiCare Health Systems Inc(Packaging Corp. of America(Pactiv Corp(Pall Corp(Pantry Inc(Park Place Entertainment Corp(Parker Hannifin Corp.(Pathmark Stores Inc.(Paychex Inc(Payless Shoesource Inc(Penn Traffic Co.(Pennzoil-Quaker State Company(Pentair Inc(Peoples Energy Corp.(PeopleSoft Inc(Pep Boys Manny, Moe & Jack(Potomac Electric Power Co.(Pepsi Bottling Group Inc.(PepsiAmericas Inc.(PepsiCo Inc.(Performance Food Group Co.(Perini Corp(PerkinElmer Inc(Perot Systems Corp(Petco Animal Supplies Inc.(Peter Kiewit Sons'', Inc.(PETsMART Inc(Pfizer Inc(Pacific Gas & Electric Corp.(Pharmacia Corp(Phar Mor Inc.(Phelps Dodge Corp.(Philip Morris Companies Inc.(Phillips Petroleum Co(Phillips Van Heusen Corp.(Phoenix Companies Inc(Pier 1 Imports Inc.(Pilgrim''s Pride Corporation(Pinnacle West Capital Corp(Pioneer-Standard Electronics Inc.(Pitney Bowes Inc.(Pittston Brinks Group(Plains All American Pipeline LP(PNC Financial Services Group Inc.(PNM Resources Inc(Polaris Industries Inc.(Polo Ralph Lauren Corp(PolyOne Corp(Popular Inc(Potlatch Corp(PPG Industries Inc(PPL Corp(Praxair Inc(Precision Castparts Corp(Premcor Inc.(Pride International Inc(Primedia Inc(Principal Financial Group Inc.(Procter & Gamble Co.(Pro-Fac Cooperative Inc.(Progress Energy Inc(Progressive Corporation(Protective Life Corp(Provident Financial Group(Providian Financial Corp.(Prudential Financial Inc.(PSS World Medical Inc(Public Service Enterprise Group Inc.(Publix Super Markets Inc.(Puget Energy Inc.(Pulte Homes Inc(Qualcomm Inc(Quanta Services Inc.(Quantum Corp(Quest Diagnostics Inc.(Questar Corp(Quintiles Transnational(Qwest Communications Intl Inc(R.J. Reynolds Tobacco Company(R.R. Donnelley & Sons Company(Radio Shack Corporation(Raymond James Financial Inc.(Raytheon Company(Reader''s Digest Association Inc.(Reebok International Ltd.(Re'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('gions Financial Corp.(Regis Corporation(Reliance Steel & Aluminum Co.(Reliant Energy Inc.(Rent A Center Inc(Republic Services Inc(Revlon Inc(RGS Energy Group Inc(Rite Aid Corp(Riverwood Holding Inc.(RoadwayCorp(Robert Half International Inc.(Rock-Tenn Co(Rockwell Automation Inc(Rockwell Collins Inc(Rohm & Haas Co.(Ross Stores Inc(RPM Inc.(Ruddick Corp(Ryder System Inc(Ryerson Tull Inc(Ryland Group Inc.(Sabre Holdings Corp(Safeco Corp(Safeguard Scientifics Inc.(Safeway Inc(Saks Inc(Sanmina-SCI Inc(Sara Lee Corp(SBC Communications Inc(Scana Corp.(Schering-Plough Corp(Scholastic Corp(SCI Systems Onc.(Science Applications Intl. Inc.(Scientific-Atlanta Inc(Scotts Company(Seaboard Corp(Sealed Air Corp(Sears Roebuck & Co(Sempra Energy(Sequa Corp(Service Corp. International(ServiceMaster Co(Shaw Group Inc(Sherwin-Williams Company(Shopko Stores Inc(Siebel Systems Inc(Sierra Health Services Inc(Sierra Pacific Resources(Silgan Holdings Inc.(Silicon Graphics Inc(Simon Property Group Inc(SLM Corporation(Smith International Inc(Smithfield Foods Inc(Smurfit-Stone Container Corp(Snap-On Inc(Solectron Corp(Solutia Inc(Sonic Automotive Inc.(Sonoco Products Co.(Southern Company(Southern Union Company(SouthTrust Corp.(Southwest Airlines Co(Southwest Gas Corp(Sovereign Bancorp Inc.(Spartan Stores Inc(Spherion Corp(Sports Authority Inc(Sprint Corp.(SPX Corp(St. Jude Medical Inc(St. Paul Cos.(Staff Leasing Inc.(StanCorp Financial Group Inc(Standard Pacific Corp.(Stanley Works(Staples Inc(Starbucks Corp(Starwood Hotels & Resorts Worldwide Inc(State Street Corp.(Stater Bros. Holdings Inc.(Steelcase Inc(Stein Mart Inc(Stewart & Stevenson Services Inc(Stewart Information Services Corp(Stilwell Financial Inc(Storage Technology Corporation(Stryker Corp(Sun Healthcare Group Inc.(Sun Microsystems Inc.(SunGard Data Systems Inc.(Sunoco Inc.(SunTrust Banks Inc(Supervalu Inc(Swift Transportation, Co., Inc(Symbol Technologies Inc(Synovus Financial Corp.(Sysco Corp(Systemax Inc.(Target Corp.(Tech Data '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Corporation(TECO Energy Inc(Tecumseh Products Company(Tektronix Inc(Teleflex Incorporated(Telephone & Data Systems Inc(Tellabs Inc.(Temple-Inland Inc(Tenet Healthcare Corporation(Tenneco Automotive Inc.(Teradyne Inc(Terex Corp(Tesoro Petroleum Corp.(Texas Industries Inc.(Texas Instruments Incorporated(Textron Inc(Thermo Electron Corporation(Thomas & Betts Corporation(Tiffany & Co(Timken Company(TJX Companies Inc(TMP Worldwide Inc(Toll Brothers Inc(Torchmark Corporation(Toro Company(Tower Automotive Inc.(Toys ''R'' Us Inc(Trans World Entertainment Corp.(TransMontaigne Inc(Transocean Inc(TravelCenters of America Inc.(Triad Hospitals Inc(Tribune Company(Trigon Healthcare Inc.(Trinity Industries Inc(Trump Hotels & Casino Resorts Inc.(TruServ Corporation(TRW Inc(TXU Corp(Tyson Foods Inc(U.S. Bancorp(U.S. Industries Inc.(UAL Corporation(UGI Corporation(Unified Western Grocers Inc(Union Pacific Corporation(Union Planters Corp(Unisource Energy Corp(Unisys Corporation(United Auto Group Inc(United Defense Industries Inc.(United Parcel Service Inc(United Rentals Inc(United Stationers Inc(United Technologies Corporation(UnitedHealth Group Incorporated(Unitrin Inc(Universal Corporation(Universal Forest Products Inc(Universal Health Services Inc(Unocal Corporation(Unova Inc(UnumProvident Corporation(URS Corporation(US Airways Group Inc(US Oncology Inc(USA Interactive(USFreighways Corporation(USG Corporation(UST Inc(Valero Energy Corporation(Valspar Corporation(Value City Department Stores Inc(Varco International Inc(Vectren Corporation(Veritas Software Corporation(Verizon Communications Inc(VF Corporation(Viacom Inc(Viad Corp(Viasystems Group Inc(Vishay Intertechnology Inc(Visteon Corporation(Volt Information Sciences Inc(Vulcan Materials Company(W.R. Berkley Corporation(W.R. Grace & Co(W.W. Grainger Inc(Wachovia Corporation(Wakenhut Corporation(Walgreen Co(Wallace Computer Services Inc(Wal-Mart Stores Inc(Walt Disney Co(Walter Industries Inc(Washington Mutual Inc(Washington Post'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' Co.(Waste Management Inc(Watsco Inc(Weatherford International Inc(Weis Markets Inc.(Wellpoint Health Networks Inc(Wells Fargo & Company(Wendy''s International Inc(Werner Enterprises Inc(WESCO International Inc(Western Digital Inc(Western Gas Resources Inc(WestPoint Stevens Inc(Weyerhauser Company(WGL Holdings Inc(Whirlpool Corporation(Whole Foods Market Inc(Willamette Industries Inc.(Williams Companies Inc(Williams Sonoma Inc(Winn Dixie Stores Inc(Wisconsin Energy Corporation(Wm Wrigley Jr Company(World Fuel Services Corporation(WorldCom Inc(Worthington Industries Inc(WPS Resources Corporation(Wyeth(Wyndham International Inc(Xcel Energy Inc(Xerox Corp(Xilinx Inc(XO Communications Inc(Yellow Corporation(York International Corp(Yum Brands Inc.(Zale Corporation(Zions Bancorporation".split("("),
			fileExtension: {
				raster: [
					"bmp",
					"gif",
					"gpl",
					"ico",
					"jpeg",
					"psd",
					"png",
					"psp",
					"raw",
					"tiff"
				],
				vector: [
					"3dv",
					"amf",
					"awg",
					"ai",
					"cgm",
					"cdr",
					"cmx",
					"dxf",
					"e2d",
					"egt",
					"eps",
					"fs",
					"odg",
					"svg",
					"xar"
				],
				"3d": [
					"3dmf",
					"3dm",
					"3mf",
					"3ds",
					"an8",
					"aoi",
					"blend",
					"cal3d",
					"cob",
					"ctm",
					"iob",
					"jas",
					"max",
					"mb",
					"mdx",
					"obj",
					"x",
					"x3d"
				],
				document: [
					"doc",
					"docx",
					"dot",
					"html",
					"xml",
					"odt",
					"odm",
					"ott",
					"csv",
					"rtf",
					"tex",
					"xhtml",
					"xps"
				]
			},
			timezones: [
				{
					name: "Dateline Standard Time",
					abbr: "DST",
					offset: -12,
					isdst: !1,
					text: "(UTC-12:00) International Date Line West",
					utc: ["Etc/GMT+12"]
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
				'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		"Pacific/Pago_Pago"
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
					utc: ["America/Santa_Isabel"]
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
					utc: ["America/Chihuahua", "America/Mazatlan"]
				},
				{
					name: "Mountain Standard Time",
					abbr: "MDT",
					offset: -6,
					isdst: !0,
					text:'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' "(UTC-07:00) Mountain Time (US & Canada)",
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
					utc: ["America/Regina", "America/Swift_Current"]
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
						"Ameri'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ca/Guayaquil",
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
					utc: ["America/Caracas"]
				},
				{
					name: "Paraguay Standard Time",
					abbr: "PYT",
					offset: -4,
					isdst: !1,
					text: "(UTC-04:00) Asuncion",
					utc: ["America/Asuncion"]
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
					utc: ["America/Campo_Grande", "America/Cuiaba"]
				},
				{
					name: "SA Western Standard Time",
					abbr: "SWST",
					offset: -4,
					isdst: !1,
'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('					text: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan",
					utc: /* @__PURE__ */ "America/Anguilla.America/Antigua.America/Aruba.America/Barbados.America/Blanc-Sablon.America/Boa_Vista.America/Curacao.America/Dominica.America/Grand_Turk.America/Grenada.America/Guadeloupe.America/Guyana.America/Kralendijk.America/La_Paz.America/Lower_Princes.America/Manaus.America/Marigot.America/Martinique.America/Montserrat.America/Port_of_Spain.America/Porto_Velho.America/Puerto_Rico.America/Santo_Domingo.America/St_Barthelemy.America/St_Kitts.America/St_Lucia.America/St_Thomas.America/St_Vincent.America/Tortola.Etc/GMT+4".split(".")
				},
				{
					name: "Pacific SA Standard Time",
					abbr: "PSST",
					offset: -4,
					isdst: !1,
					text: "(UTC-04:00) Santiago",
					utc: ["America/Santiago", "Antarctica/Palmer"]
				},
				{
					name: "Newfoundland Standard Time",
					abbr: "NDT",
					offset: -2.5,
					isdst: !0,
					text: "(UTC-03:30) Newfoundland",
					utc: ["America/St_Johns"]
				},
				{
					name: "E. South America Standard Time",
					abbr: "ESAST",
					offset: -3,
					isdst: !1,
					text: "(UTC-03:00) Brasilia",
					utc: ["America/Sao_Paulo"]
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
						"America/M'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('aceio",
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
					utc: ["America/Godthab"]
				},
				{
					name: "Montevideo Standard Time",
					abbr: "MST",
					offset: -3,
					isdst: !1,
					text: "(UTC-03:00) Montevideo",
					utc: ["America/Montevideo"]
				},
				{
					name: "Bahia Standard Time",
					abbr: "BST",
					offset: -3,
					isdst: !1,
					text: "(UTC-03:00) Salvador",
					utc: ["America/Bahia"]
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
					utc: ["America/Scoresbysund", "Atlantic/Azores"]
				},
				{
					name: "Cape Verde Standard Time",
					abbr: "CVST",
					offset: -1,
					isdst: !1,
					text: "(UTC-01:00) Cape Verde Is.",
					utc: ["Atlantic/Cape_Verde", "Etc/GMT+1"]
				},
				{
					name: "Morocco Standard Time",
					abbr: "MDT",
					offset: 1,
					isdst: !0,
					text: "(UTC) Casablanca",
					utc: ["Africa/Casablanca", "Africa/El_Aaiun"]
				},
				{
					name: "UTC",
					abbr: "UTC",
					offset: 0,
					isdst: !1,
					text: "(UTC) Coordinated Universal Time",
					utc: ["America/Danmarkshavn", "Etc/GMT"]
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
						"'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Europe/Jersey",
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
						"Europe/Ljublja'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('na",
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
					utc: ["Africa/Windhoek"]
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
					utc: ["Asia/Beirut"]
				},
				{
					name: "Egypt Standard Time",
					abbr: "EST",
					offset: 2,
					isdst: !1,
					text: "(UTC+02:00) Cairo",
					utc: ["Africa/Cairo"]
				},
				{
					name: "Syria Standard Time",
					abbr: "SDT",
					offset: 3,
					isdst: !'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('0,
					text: "(UTC+02:00) Damascus",
					utc: ["Asia/Damascus"]
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
					utc: ["Europe/Istanbul"]
				},
				{
					name: "Israel Standard Time",
					abbr: "JDT",
					offset: 3,
					isdst: !0,
					text: "(UTC+02:00) Jerusalem",
					utc: ["Asia/Jerusalem"]
				},
				{
					name: "Libya Standard Time",
					abbr: "LST",
					offset: 2,
					isdst: !1,
					text: "(UTC+02:00) Tripoli",
					utc: ["Africa/Tripoli"]
				},
				{
					name: "Jordan Standard Time",
					abbr: "JST",
					offset: 3,
					isdst: !1,
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		text: "(UTC+03:00) Amman",
					utc: ["Asia/Amman"]
				},
				{
					name: "Arabic Standard Time",
					abbr: "AST",
					offset: 3,
					isdst: !1,
					text: "(UTC+03:00) Baghdad",
					utc: ["Asia/Baghdad"]
				},
				{
					name: "Kaliningrad Standard Time",
					abbr: "KST",
					offset: 3,
					isdst: !1,
					text: "(UTC+02:00) Kaliningrad",
					utc: ["Europe/Kaliningrad"]
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
					utc: ["Asia/Tehran"]
				},
				{
					name: "Arabian Standard Time",
					abbr: "AST",
					offset: 4,
					isdst: !1,
					text: "(UTC+04:00) Abu Dhabi, Muscat",
					utc: [
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			"Asia/Dubai",
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
					utc: ["Asia/Baku"]
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
					utc: ["Asia/Tbilisi"]
				},
				{
					name: "Caucasus Standard Time",
					abbr: "CST",
					offset: 4,
					isdst: !1,
					text: "(UTC+04:00) Yerevan",
					utc: ["Asia/Yerevan"]
				},
				{
					name: "Afghanistan Standard Time",
					abbr: "AST",
					offset: 4.5,
					isdst: !1,
					text: "(UTC+04:30) Kabul",
					utc: ["Asia/Kabul"]
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
					utc: ["Asia/Yekaterinburg"]
				},
				{
					name: "Pakistan Standard Time",
					abbr: "PKT",
					offset: 5,
					isdst: !1,
					text: "(UTC+05:00) Islamabad, Karachi",
					utc: ["Asia/Karachi"]
				},
				{
					name: "India Standard Time",
					abbr: "IST",
					offset: 5.5,
					isdst: !1,
					text: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
					utc: ["Asia/Kolkata"]
				},
				{
					name: "Sri Lanka Standard Time",
					abbr: "SLST",
					offset: 5.5,
					isdst: !1,
					text: "(UTC+05:'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('30) Sri Jayawardenepura",
					utc: ["Asia/Colombo"]
				},
				{
					name: "Nepal Standard Time",
					abbr: "NST",
					offset: 5.75,
					isdst: !1,
					text: "(UTC+05:45) Kathmandu",
					utc: ["Asia/Kathmandu"]
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
					utc: ["Asia/Dhaka", "Asia/Thimphu"]
				},
				{
					name: "Myanmar Standard Time",
					abbr: "MST",
					offset: 6.5,
					isdst: !1,
					text: "(UTC+06:30) Yangon (Rangoon)",
					utc: ["Asia/Rangoon", "Indian/Cocos"]
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
					utc: ["Asia/Krasnoyarsk"]
				},
				{
					name: "Singapore Standard'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' Time",
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
					utc: ["Antarctica/Casey", "Australia/Perth"]
				},
				{
					name: "Taipei Standard Time",
					abbr: "TST",
					offset: 8,
					isdst: !1,
					text: "(UTC+08:00) Taipei",
					utc: ["Asia/Taipei"]
				},
				{
					name: "Ulaanbaatar Standard Time",
					abbr: "UST",
					offset: 8,
					isdst: !1,
					text: "(UTC+08:00) Ulaanbaatar",
					utc: ["Asia/Choibalsan", "Asia/Ulaanbaatar"]
				},
				{
					name: "North Asia East Standard Time",
					abbr: "NAEST",
					offset: 8,
					isdst: !1,
					text: "(UTC+08:00) Irkutsk",
					utc: ["Asia/Irkutsk"]
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
					utc: ["Asia/Pyongyang", "Asia/Seoul"]
				},
				{
					name: "Cen. Australia Standard Time",
					abbr: "CAST",
					offset: 9.5,
					isdst: !1,
					text: "(UTC+09:30) Adelaide",
					utc: ["Australia/Adelaide", "Australia/Broken_Hill"]
				},
				{
					name: "AUS Central Standard Time",
					abbr: "ACST",
					offset: 9.5,
					isdst: !1,
					text: "(UTC+09:30) Darwin",
					utc: ["Australia/Darwin"]
				},
				{
					name: "E. Australia Standard Time",
					abbr: "EAST",
					offset: 10,
					isdst: !1,
					text: "(UTC+10:00) Brisbane",
					utc: ["Australia/Brisbane", "Australia/Lindeman"]
				'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('},
				{
					name: "AUS Eastern Standard Time",
					abbr: "AEST",
					offset: 10,
					isdst: !1,
					text: "(UTC+10:00) Canberra, Melbourne, Sydney",
					utc: ["Australia/Melbourne", "Australia/Sydney"]
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
					utc: ["Australia/Currie", "Australia/Hobart"]
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
					utc: ["Antarctica/McMurdo", "Pacific/Auckland"]
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
						'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('"Pacific/Tarawa",
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
					utc: ["Pacific/Fiji"]
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
					utc: ["Asia/Kamchatka"]
				},
				{
					name: "Tonga Standard Time",
					abbr: "TST",
					offset: 13,
					isdst: !1,
					text: "(UTC+13:00) Nuku''alofa",
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
					utc: ["Pacific/Apia"]
				}
			],
			profession: /* @__PURE__ */ "Airline Pilot,Academic Team,Accountant,Account Executive,Actor,Actuary,Acquisition Analyst,Administrative Asst.,Administrative Analyst,Administrator,Advertising Director,Aerospace Engineer,Agent,Agricultural Inspector,Agricultural Scientist,Air Traffic Controller,Animal Trainer,Anthropologist,Appraiser,Architect,Art Director,Artist,Astronomer,Athletic Coach,Auditor,Author,Baker,Banker,Bankruptcy Attorney,Benefits Manager,Biologist,Bio-feedback Specialist,Biomedical Engineer,Biotechnical Researcher,Broadcaster,Broker,Building Manager,Building Contractor,Building Inspector,Business Analyst,Business Planner,Business Manager,Buyer,Call Center Manager,Career Counselor,Cash Manager,Ceramic Engineer,Chief Executive Officer,Chief Operation Officer,Chef,Chemical Engineer,Chemist,Child Care Manager,Chief Medical Officer,Chiropractor,Cinematographer,City Housing Manager,City Manager,C'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ivil Engineer,Claims Manager,Clinical Research Assistant,Collections Manager,Compliance Manager,Comptroller,Computer Manager,Commercial Artist,Communications Affairs Director,Communications Director,Communications Engineer,Compensation Analyst,Computer Programmer,Computer Ops. Manager,Computer Engineer,Computer Operator,Computer Graphics Specialist,Construction Engineer,Construction Manager,Consultant,Consumer Relations Manager,Contract Administrator,Copyright Attorney,Copywriter,Corporate Planner,Corrections Officer,Cosmetologist,Credit Analyst,Cruise Director,Chief Information Officer,Chief Technology Officer,Customer Service Manager,Cryptologist,Dancer,Data Security Manager,Database Manager,Day Care Instructor,Dentist,Designer,Design Engineer,Desktop Publisher,Developer,Development Officer,Diamond Merchant,Dietitian,Direct Marketer,Director,Distribution Manager,Diversity Manager,Economist,EEO Compliance Manager,Editor,Education Adminator,Electrical Engineer,Electro Optical Engineer,Electronics Engineer,Embassy Management,Employment Agent,Engineer Technician,Entrepreneur,Environmental Analyst,Environmental Attorney,Environmental Engineer,Environmental Specialist,Escrow Officer,Estimator,Executive Assistant,Executive Director,Executive Recruiter,Facilities Manager,Family Counselor,Fashion Events Manager,Fashion Merchandiser,Fast Food Manager,Film Producer,Film Production Assistant,Financial Analyst,Financial Planner,Financier,Fine Artist,Wildlife Specialist,Fitness Consultant,Flight Attendant,Flight Engineer,Floral Designer,Food & Beverage Director,Food Service Manager,Forestry Technician,Franchise Management,Franchise Sales,Fraud Investigator,Freelance Writer,Fund Raiser,General Manager,Geologist,General Counsel,Geriatric Specialist,Gerontologist,Glamour Photographer,Golf Club Manager,Gourmet Chef,Graphic Designer,Grounds Keeper,Hazardous Waste Manager,Health Care Manager,Health Therapist,Health Service Administrator,Hearing Officer,Home Economist,Horticulturist,H'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ospital Administrator,Hotel Manager,Human Resources Manager,Importer,Industrial Designer,Industrial Engineer,Information Director,Inside Sales,Insurance Adjuster,Interior Decorator,Internal Controls Director,International Acct.,International Courier,International Lawyer,Interpreter,Investigator,Investment Banker,Investment Manager,IT Architect,IT Project Manager,IT Systems Analyst,Jeweler,Joint Venture Manager,Journalist,Labor Negotiator,Labor Organizer,Labor Relations Manager,Lab Services Director,Lab Technician,Land Developer,Landscape Architect,Law Enforcement Officer,Lawyer,Lead Software Engineer,Lead Software Test Engineer,Leasing Manager,Legal Secretary,Library Manager,Litigation Attorney,Loan Officer,Lobbyist,Logistics Manager,Maintenance Manager,Management Consultant,Managed Care Director,Managing Partner,Manufacturing Director,Manpower Planner,Marine Biologist,Market Res. Analyst,Marketing Director,Materials Manager,Mathematician,Membership Chairman,Mechanic,Mechanical Engineer,Media Buyer,Medical Investor,Medical Secretary,Medical Technician,Mental Health Counselor,Merchandiser,Metallurgical Engineering,Meteorologist,Microbiologist,MIS Manager,Motion Picture Director,Multimedia Director,Musician,Network Administrator,Network Specialist,Network Operator,New Product Manager,Novelist,Nuclear Engineer,Nuclear Specialist,Nutritionist,Nursing Administrator,Occupational Therapist,Oceanographer,Office Manager,Operations Manager,Operations Research Director,Optical Technician,Optometrist,Organizational Development Manager,Outplacement Specialist,Paralegal,Park Ranger,Patent Attorney,Payroll Specialist,Personnel Specialist,Petroleum Engineer,Pharmacist,Photographer,Physical Therapist,Physician,Physician Assistant,Physicist,Planning Director,Podiatrist,Political Analyst,Political Scientist,Politician,Portfolio Manager,Preschool Management,Preschool Teacher,Principal,Private Banker,Private Investigator,Probation Officer,Process Engineer,Producer,Product Manager,Produc'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('t Engineer,Production Engineer,Production Planner,Professional Athlete,Professional Coach,Professor,Project Engineer,Project Manager,Program Manager,Property Manager,Public Administrator,Public Safety Director,PR Specialist,Publisher,Purchasing Agent,Publishing Director,Quality Assurance Specialist,Quality Control Engineer,Quality Control Inspector,Radiology Manager,Railroad Engineer,Real Estate Broker,Recreational Director,Recruiter,Redevelopment Specialist,Regulatory Affairs Manager,Registered Nurse,Rehabilitation Counselor,Relocation Manager,Reporter,Research Specialist,Restaurant Manager,Retail Store Manager,Risk Analyst,Safety Engineer,Sales Engineer,Sales Trainer,Sales Promotion Manager,Sales Representative,Sales Manager,Service Manager,Sanitation Engineer,Scientific Programmer,Scientific Writer,Securities Analyst,Security Consultant,Security Director,Seminar Presenter,Ship''s Officer,Singer,Social Director,Social Program Planner,Social Research,Social Scientist,Social Worker,Sociologist,Software Developer,Software Engineer,Software Test Engineer,Soil Scientist,Special Events Manager,Special Education Teacher,Special Projects Director,Speech Pathologist,Speech Writer,Sports Event Manager,Statistician,Store Manager,Strategic Alliance Director,Strategic Planning Director,Stress Reduction Specialist,Stockbroker,Surveyor,Structural Engineer,Superintendent,Supply Chain Director,System Engineer,Systems Analyst,Systems Programmer,System Administrator,Tax Specialist,Teacher,Technical Support Specialist,Technical Illustrator,Technical Writer,Technology Director,Telecom Analyst,Telemarketer,Theatrical Director,Title Examiner,Tour Escort,Tour Guide Director,Traffic Manager,Trainer Translator,Transportation Manager,Travel Agent,Treasurer,TV Programmer,Underwriter,Union Representative,University Administrator,University Dean,Urban Planner,Veterinarian,Vendor Relations Director,Viticulturist,Warehouse Manager".split(","),
			animals: {
				ocean: /* @__PURE__ */ "Acantharea'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.Anemone.Angelfish King.Ahi Tuna.Albacore.American Oyster.Anchovy.Armored Snail.Arctic Char.Atlantic Bluefin Tuna.Atlantic Cod.Atlantic Goliath Grouper.Atlantic Trumpetfish.Atlantic Wolffish.Baleen Whale.Banded Butterflyfish.Banded Coral Shrimp.Banded Sea Krait.Barnacle.Barndoor Skate.Barracuda.Basking Shark.Bass.Beluga Whale.Bluebanded Goby.Bluehead Wrasse.Bluefish.Bluestreak Cleaner-Wrasse.Blue Marlin.Blue Shark.Blue Spiny Lobster.Blue Tang.Blue Whale.Broadclub Cuttlefish.Bull Shark.Chambered Nautilus.Chilean Basket Star.Chilean Jack Mackerel.Chinook Salmon.Christmas Tree Worm.Clam.Clown Anemonefish.Clown Triggerfish.Cod.Coelacanth.Cockscomb Cup Coral.Common Fangtooth.Conch.Cookiecutter Shark.Copepod.Coral.Corydoras.Cownose Ray.Crab.Crown-of-Thorns Starfish.Cushion Star.Cuttlefish.California Sea Otters.Dolphin.Dolphinfish.Dory.Devil Fish.Dugong.Dumbo Octopus.Dungeness Crab.Eccentric Sand Dollar.Edible Sea Cucumber.Eel.Elephant Seal.Elkhorn Coral.Emperor Shrimp.Estuarine Crocodile.Fathead Sculpin.Fiddler Crab.Fin Whale.Flameback.Flamingo Tongue Snail.Flashlight Fish.Flatback Turtle.Flatfish.Flying Fish.Flounder.Fluke.French Angelfish.Frilled Shark.Fugu (also called Pufferfish).Gar.Geoduck.Giant Barrel Sponge.Giant Caribbean Sea Anemone.Giant Clam.Giant Isopod.Giant Kingfish.Giant Oarfish.Giant Pacific Octopus.Giant Pyrosome.Giant Sea Star.Giant Squid.Glowing Sucker Octopus.Giant Tube Worm.Goblin Shark.Goosefish.Great White Shark.Greenland Shark.Grey Atlantic Seal.Grouper.Grunion.Guineafowl Puffer.Haddock.Hake.Halibut.Hammerhead Shark.Hapuka.Harbor Porpoise.Harbor Seal.Hatchetfish.Hawaiian Monk Seal.Hawksbill Turtle.Hector''s Dolphin.Hermit Crab.Herring.Hoki.Horn Shark.Horseshoe Crab.Humpback Anglerfish.Humpback Whale.Icefish.Imperator Angelfish.Irukandji Jellyfish.Isopod.Ivory Bush Coral.Japanese Spider Crab.Jellyfish.John Dory.Juan Fernandez Fur Seal.Killer Whale.Kiwa Hirsuta.Krill.Lagoon Triggerfish.Lamprey.Leafy Seadragon.Leopard Seal.Limpet.Ling.Lionfish.Lions '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Mane Jellyfish.Lobe Coral.Lobster.Loggerhead Turtle.Longnose Sawshark.Longsnout Seahorse.Lophelia Coral.Marrus Orthocanna.Manatee.Manta Ray.Marlin.Megamouth Shark.Mexican Lookdown.Mimic Octopus.Moon Jelly.Mollusk.Monkfish.Moray Eel.Mullet.Mussel.Megaladon.Napoleon Wrasse.Nassau Grouper.Narwhal.Nautilus.Needlefish.Northern Seahorse.North Atlantic Right Whale.Northern Red Snapper.Norway Lobster.Nudibranch.Nurse Shark.Oarfish.Ocean Sunfish.Oceanic Whitetip Shark.Octopus.Olive Sea Snake.Orange Roughy.Ostracod.Otter.Oyster.Pacific Angelshark.Pacific Blackdragon.Pacific Halibut.Pacific Sardine.Pacific Sea Nettle Jellyfish.Pacific White Sided Dolphin.Pantropical Spotted Dolphin.Patagonian Toothfish.Peacock Mantis Shrimp.Pelagic Thresher Shark.Penguin.Peruvian Anchoveta.Pilchard.Pink Salmon.Pinniped.Plankton.Porpoise.Polar Bear.Portuguese Man o'' War.Pycnogonid Sea Spider.Quahog.Queen Angelfish.Queen Conch.Queen Parrotfish.Queensland Grouper.Ragfish.Ratfish.Rattail Fish.Ray.Red Drum.Red King Crab.Ringed Seal.Risso''s Dolphin.Ross Seals.Sablefish.Salmon.Sand Dollar.Sandbar Shark.Sawfish.Sarcastic Fringehead.Scalloped Hammerhead Shark.Seahorse.Sea Cucumber.Sea Lion.Sea Urchin.Seal.Shark.Shortfin Mako Shark.Shovelnose Guitarfish.Shrimp.Silverside Fish.Skipjack Tuna.Slender Snipe Eel.Smalltooth Sawfish.Smelts.Sockeye Salmon.Southern Stingray.Sponge.Spotted Porcupinefish.Spotted Dolphin.Spotted Eagle Ray.Spotted Moray.Squid.Squidworm.Starfish.Stickleback.Stonefish.Stoplight Loosejaw.Sturgeon.Swordfish.Tan Bristlemouth.Tasseled Wobbegong.Terrible Claw Lobster.Threespot Damselfish.Tiger Prawn.Tiger Shark.Tilefish.Toadfish.Tropical Two-Wing Flyfish.Tuna.Umbrella Squid.Velvet Crab.Venus Flytrap Sea Anemone.Vigtorniella Worm.Viperfish.Vampire Squid.Vaquita.Wahoo.Walrus.West Indian Manatee.Whale.Whale Shark.Whiptail Gulper.White-Beaked Dolphin.White-Ring Garden Eel.White Shrimp.Wobbegong.Wrasse.Wreckfish.Xiphosura.Yellowtail Damselfish.Yelloweye Rockfish.Yellow Cup Black Coral.Yellow '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Tube Sponge.Yellowfin Tuna.Zebrashark.Zooplankton".split("."),
				desert: /* @__PURE__ */ "Aardwolf.Addax.African Wild Ass.Ant.Antelope.Armadillo.Baboon.Badger.Bat.Bearded Dragon.Beetle.Bird.Black-footed Cat.Boa.Brown Bear.Bustard.Butterfly.Camel.Caracal.Caracara.Caterpillar.Centipede.Cheetah.Chipmunk.Chuckwalla.Climbing Mouse.Coati.Cobra.Cotton Rat.Cougar.Courser.Crane Fly.Crow.Dassie Rat.Dove.Dunnart.Eagle.Echidna.Elephant.Emu.Falcon.Fly.Fox.Frogmouth.Gecko.Geoffroy''s Cat.Gerbil.Grasshopper.Guanaco.Gundi.Hamster.Hawk.Hedgehog.Hyena.Hyrax.Jackal.Kangaroo.Kangaroo Rat.Kestrel.Kowari.Kultarr.Leopard.Lion.Macaw.Meerkat.Mouse.Oryx.Ostrich.Owl.Pronghorn.Python.Rabbit.Raccoon.Rattlesnake.Rhinoceros.Sand Cat.Spectacled Bear.Spiny Mouse.Starling.Stick Bug.Tarantula.Tit.Toad.Tortoise.Tyrant Flycatcher.Viper.Vulture.Waxwing.Xerus.Zebra".split("."),
				grassland: /* @__PURE__ */ "Aardvark.Aardwolf.Accentor.African Buffalo.African Wild Dog.Alpaca.Anaconda.Ant.Anteater.Antelope.Armadillo.Baboon.Badger.Bandicoot.Barbet.Bat.Bee.Bee-eater.Beetle.Bird.Bison.Black-footed Cat.Black-footed Ferret.Bluebird.Boa.Bowerbird.Brown Bear.Bush Dog.Bushshrike.Bustard.Butterfly.Buzzard.Caracal.Caracara.Cardinal.Caterpillar.Cheetah.Chipmunk.Civet.Climbing Mouse.Clouded Leopard.Coati.Cobra.Cockatoo.Cockroach.Common Genet.Cotton Rat.Cougar.Courser.Coyote.Crane.Crane Fly.Cricket.Crow.Culpeo.Death Adder.Deer.Deer Mouse.Dingo.Dinosaur.Dove.Drongo.Duck.Duiker.Dunnart.Eagle.Echidna.Elephant.Elk.Emu.Falcon.Finch.Flea.Fly.Flying Frog.Fox.Frog.Frogmouth.Garter Snake.Gazelle.Gecko.Geoffroy''s Cat.Gerbil.Giant Tortoise.Giraffe.Grasshopper.Grison.Groundhog.Grouse.Guanaco.Guinea Pig.Hamster.Harrier.Hartebeest.Hawk.Hedgehog.Helmetshrike.Hippopotamus.Hornbill.Hyena.Hyrax.Impala.Jackal.Jaguar.Jaguarundi.Kangaroo.Kangaroo Rat.Kestrel.Kultarr.Ladybug.Leopard.Lion.Macaw.Meerkat.Mouse.Newt.Oryx.Ostrich.Owl.Pangolin.Pheasant.Prairie Dog.Pronghorn.Przewalski''s Horse.Python.Quoll.Rabbit.Raven.Rhinoceros.Shelduck.Slo'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('th Bear.Spectacled Bear.Squirrel.Starling.Stick Bug.Tamandua.Tasmanian Devil.Thornbill.Thrush.Toad.Tortoise".split("."),
				forest: /* @__PURE__ */ "Agouti.Anaconda.Anoa.Ant.Anteater.Antelope.Armadillo.Asian Black Bear.Aye-aye.Babirusa.Baboon.Badger.Bandicoot.Banteng.Barbet.Basilisk.Bat.Bearded Dragon.Bee.Bee-eater.Beetle.Bettong.Binturong.Bird-of-paradise.Bongo.Bowerbird.Bulbul.Bush Dog.Bushbaby.Bushshrike.Butterfly.Buzzard.Caecilian.Cardinal.Cassowary.Caterpillar.Centipede.Chameleon.Chimpanzee.Cicada.Civet.Clouded Leopard.Coati.Cobra.Cockatoo.Cockroach.Colugo.Cotinga.Cotton Rat.Cougar.Crane Fly.Cricket.Crocodile.Crow.Cuckoo.Cuscus.Death Adder.Deer.Dhole.Dingo.Dinosaur.Drongo.Duck.Duiker.Eagle.Echidna.Elephant.Finch.Flat-headed Cat.Flea.Flowerpecker.Fly.Flying Frog.Fossa.Frog.Frogmouth.Gaur.Gecko.Gorilla.Grison.Hawaiian Honeycreeper.Hawk.Hedgehog.Helmetshrike.Hornbill.Hyrax.Iguana.Jackal.Jaguar.Jaguarundi.Kestrel.Ladybug.Lemur.Leopard.Lion.Macaw.Mandrill.Margay.Monkey.Mouse.Mouse Deer.Newt.Okapi.Old World Flycatcher.Orangutan.Owl.Pangolin.Peafowl.Pheasant.Possum.Python.Quokka.Rabbit.Raccoon.Red Panda.Red River Hog.Rhinoceros.Sloth Bear.Spectacled Bear.Squirrel.Starling.Stick Bug.Sun Bear.Tamandua.Tamarin.Tapir.Tarantula.Thrush.Tiger.Tit.Toad.Tortoise.Toucan.Trogon.Trumpeter.Turaco.Turtle.Tyrant Flycatcher.Viper.Vulture.Wallaby.Warbler.Wasp.Waxwing.Weaver.Weaver-finch.Whistler.White-eye.Whydah.Woodswallow.Worm.Wren.Xenops.Yellowjacket.Accentor.African Buffalo.American Black Bear.Anole.Bird.Bison.Boa.Brown Bear.Chipmunk.Common Genet.Copperhead.Coyote.Deer Mouse.Dormouse.Elk.Emu.Fisher.Fox.Garter Snake.Giant Panda.Giant Tortoise.Groundhog.Grouse.Guanaco.Himalayan Tahr.Kangaroo.Koala.Numbat.Quoll.Raccoon dog.Tasmanian Devil.Thornbill.Turkey.Vole.Weasel.Wildcat.Wolf.Wombat.Woodchuck.Woodpecker".split("."),
				farm: /* @__PURE__ */ "Alpaca.Buffalo.Banteng.Cow.Cat.Chicken.Carp.Camel.Donkey.Dog.Duck.Emu.Goat.Gayal.Guinea.Goose.Horse.Honey.Llama.Pig.Pigeon.Rhea.Rabbit.She'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ep.Silkworm.Turkey.Yak.Zebu".split("."),
				pet: /* @__PURE__ */ "Bearded Dragon.Birds.Burro.Cats.Chameleons.Chickens.Chinchillas.Chinese Water Dragon.Cows.Dogs.Donkey.Ducks.Ferrets.Fish.Geckos.Geese.Gerbils.Goats.Guinea Fowl.Guinea Pigs.Hamsters.Hedgehogs.Horses.Iguanas.Llamas.Lizards.Mice.Mule.Peafowl.Pigs and Hogs.Pigeons.Ponies.Pot Bellied Pig.Rabbits.Rats.Sheep.Skinks.Snakes.Stick Insects.Sugar Gliders.Tarantula.Turkeys.Turtles".split("."),
				zoo: /* @__PURE__ */ "Aardvark.African Wild Dog.Aldabra Tortoise.American Alligator.American Bison.Amur Tiger.Anaconda.Andean Condor.Asian Elephant.Baby Doll Sheep.Bald Eagle.Barred Owl.Blue Iguana.Boer Goat.California Sea Lion.Caribbean Flamingo.Chinchilla.Collared Lemur.Coquerel''s Sifaka.Cuban Amazon Parrot.Ebony Langur.Fennec Fox.Fossa.Gelada.Giant Anteater.Giraffe.Gorilla.Grizzly Bear.Henkel''s Leaf-tailed Gecko.Indian Gharial.Indian Rhinoceros.King Cobra.King Vulture.Komodo Dragon.Linne''s Two-toed Sloth.Lion.Little Penguin.Madagascar Tree Boa.Magellanic Penguin.Malayan Tapir.Malayan Tiger.Matschies Tree Kangaroo.Mini Donkey.Monarch Butterfly.Nile crocodile.North American Porcupine.Nubian Ibex.Okapi.Poison Dart Frog.Polar Bear.Pygmy Marmoset.Radiated Tortoise.Red Panda.Red Ruffed Lemur.Ring-tailed Lemur.Ring-tailed Mongoose.Rock Hyrax.Small Clawed Asian Otter.Snow Leopard.Snowy Owl.Southern White-faced Owl.Southern White Rhinocerous.Squirrel Monkey.Tufted Puffin.White Cheeked Gibbon.White-throated Bee Eater.Zebra".split(".")
			},
			primes: [
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
				'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('269,
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
				17'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('21,
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
				33'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('23,
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
				49'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('93,
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
				67'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('33,
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
				85'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('73,
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
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			"Techno",
					"Indie",
					"Gospel",
					"Dance",
					"Children''s",
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
					"Musique Concrète",
					"New Wave",
					"Progressive Rock",
					"Punk",
					"Shoegaze",
					"Steampunk"
				],
				blues: /* @__PURE__ */ "Acoustic Blues,African Blues,Blues Rock,Blues Shouter,British Blues,Canadian Blues,Chicago Blues,Classic Blues,Classic Female Blues,Contemporary Blues,Country Blues,Dark Blues,Delta Blues,Detroit Blues,Doom Blues,Electric Blues,Folk Blues,Gospel Blues,Harmonica Blues,Hill Country Blues,Hokum Blues,Jazz Blues,Jump Blues,Kansas City Blues,Louisiana Blues,Memphis Blues,Modern Blues,New Orlean Blues,NY Blues,Piano Blues,Piedmont Blues,Punk Blues,Ragtime Blues,Rhythm Blues,Soul Blues,St.Louis Blues,Soul Blues,Swamp Blues,Texas Blues,Urban Blues,Vandeville,West Coast Blues".split(","),
				"children''s": [
					"Lullabies",
					"Sing - Along",
					"Stories"
				],
				classical: /* @__PURE__ */ "Avant-Garde.Ballet.Baroque.Cantata.Chamber Music.String Quartet.Chant.Choral.Classical Crossover.Concerto.Concerto Grosso.Contemporary Classical.Early Music.Expressionist.High Classical.Impressionist.Mass Requiem.Medieval.Minimalism.Modern Composition.Modern Classical.Opera.Oratorio.Orchestral.Organum.Renaissance.Romantic (early period).Romantic (later period).Sonata.Symphonic.Symphony.Twelve-tone.Wedding Music".split("."),
				country: /* @__PURE__ */ "Alternative Country.Americana.Australian Country.Bakersfield Sound.Bluegrass.Blues Country.Cajun Fiddle Tunes.Christian Country.Classic Country.Close Harmony.Contemporary Bluegrass.Contemporary Country.Country Gospel.Country Pop.Country Rap.Country Rock.Country Soul.Cowbo'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('y / Western.Cowpunk.Dansband.Honky Tonk.Franco-Country.Gulf and Western.Hellbilly Music.Honky Tonk.Instrumental Country.Lubbock Sound.Nashville Sound.Neotraditional Country.Outlaw Country.Progressive.Psychobilly / Punkabilly.Red Dirt.Sertanejo.Texas County.Traditional Bluegrass.Traditional Country.Truck-Driving Country.Urban Cowboy.Western Swing".split("."),
				dance: /* @__PURE__ */ "Club / Club Dance.Breakcore.Breakbeat / Breakstep.Chillstep.Deep House.Dubstep.Dancehall.Electro House.Electroswing.Exercise.Future Garage.Garage.Glitch Hop.Glitch Pop.Grime.Hardcore.Hard Dance.Hi-NRG / Eurodance.Horrorcore.House.Jackin House.Jungle / Drum n bass.Liquid Dub.Regstep.Speedcore.Techno.Trance.Trap".split("."),
				electronic: /* @__PURE__ */ "2-Step.8bit.Ambient.Asian Underground.Bassline.Chillwave.Chiptune.Crunk.Downtempo.Drum & Bass.Hard Step.Electro.Electro-swing.Electroacoustic.Electronica.Electronic Rock.Eurodance.Hardstyle.Hi-Nrg.IDM/Experimental.Industrial.Trip Hop.Vaporwave.UK Garage.House.Dubstep.Deep House.EDM.Future Bass.Psychedelic trance".split("."),
				jazz: /* @__PURE__ */ "Acid Jazz.Afro-Cuban Jazz.Avant-Garde Jazz.Bebop.Big Band.Blue Note.British Dance Band (Jazz).Cape Jazz.Chamber Jazz.Contemporary Jazz.Continental Jazz.Cool Jazz.Crossover Jazz.Dark Jazz.Dixieland.Early Jazz.Electro Swing (Jazz).Ethio-jazz.Ethno-Jazz.European Free Jazz.Free Funk (Avant-Garde / Funk Jazz).Free Jazz.Fusion.Gypsy Jazz.Hard Bop.Indo Jazz.Jazz Blues.Jazz-Funk (see Free Funk).Jazz-Fusion.Jazz Rap.Jazz Rock.Kansas City Jazz.Latin Jazz.M-Base Jazz.Mainstream Jazz.Modal Jazz.Neo-Bop.Neo-Swing.Nu Jazz.Orchestral Jazz.Post-Bop.Punk Jazz.Ragtime.Ska Jazz.Skiffle (also Folk).Smooth Jazz.Soul Jazz.Swing Jazz.Straight-Ahead Jazz.Trad Jazz.Third Stream.Jazz-Funk.Free Jazz.West Coast Jazz".split("."),
				metal: /* @__PURE__ */ "Heavy Metal.Speed Metal.Thrash Metal.Power Metal.Death Metal.Black Metal.Pagan Metal.Viking Metal.Folk Metal.Symphonic Metal.Gothic Metal.Glam Metal.Hair Metal.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('Doom Metal.Groove Metal.Industrial Metal.Modern Metal.Neoclassical Metal.New Wave Of British Heavy Metal.Post Metal.Progressive Metal.Avantgarde Metal.Sludge.Djent.Drone.Kawaii Metal.Pirate Metal.Nu Metal.Neue Deutsche Härte.Math Metal.Crossover.Grindcore.Hardcore.Metalcore.Deathcore.Post Hardcore.Mathcore".split("."),
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
				pop: /* @__PURE__ */ "Adult Contemporary.Arab Pop.Baroque.Britpop.Bubblegum Pop.Chamber Pop.Chanson.Christian Pop.Classical Crossover.Europop.Austropop.Balkan Pop.French Pop.Korean Pop.Japanese Pop.Chinese Pop.Latin Pop.Laïkó.Nederpop.Russian Pop.Dance Pop.Dream Pop.Electro Pop.Iranian Pop.Jangle Pop.Latin Ballad.Levenslied.Louisiana Swamp Pop.Mexican Pop.Motorpop.New Romanticism.Orchestral Pop.Pop Rap.Popera.Pop / Rock.Pop Punk.Power Pop.Psychedelic Pop.Russian Pop.Schlager.Soft Rock.Sophisti - Pop.Space Age Pop.Sunshine Pop.Surf Pop.Synthpop.Teen Pop.Traditional Pop Music.Turkish Pop.Vispop.Wonky Pop".split("."),
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
					"Reggae en Español",
					"Spanish Reggae",
					"Reggae 110",
					"Reggae Bultrón",
					"Romantic Flow",
					"Lovers Rock",
					"Raggamuffin",
					"Ragga",
					"Dancehall",
					"Ska"
				],
				rock: /* @__PURE_'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('_ */ "Acid Rock.Adult - Oriented Rock.Afro Punk.Adult Alternative.Alternative Rock.American Traditional Rock.Anatolian Rock.Arena Rock.Art Rock.Blues - Rock.British Invasion.Cock Rock.Death Metal / Black Metal.Doom Metal.Glam Rock.Gothic Metal.Grind Core.Hair Metal.Hard Rock.Math Metal.Math Rock.Metal.Metal Core.Noise Rock.Jam Bands.Post Punk.Post Rock.Prog - Rock / Art Rock.Progressive Metal.Psychedelic.Rock & Roll.Rockabilly.Roots Rock.Singer / Songwriter.Southern Rock.Spazzcore.Stoner Metal.Surf.Technical Death Metal.Tex - Mex.Thrash Metal.Time Lord Rock(Trock).Trip - hop.Yacht Rock.School House Rock".split("."),
				"hip-hop": /* @__PURE__ */ "Alternative Rap,Avant - Garde,Bounce,Chap Hop,Christian Hip Hop,Conscious Hip Hop,Country - Rap,Grunk,Crunkcore,Cumbia Rap,Dirty South,East Coast,Brick City Club,Hardcore Hip Hop,Mafioso Rap,New Jersey Hip Hop,Freestyle Rap,G - Funk,Gangsta Rap,Golden Age,Grime,Hardcore Rap,Hip - Hop,Hip Pop,Horrorcore,Hyphy,Industrial Hip Hop,Instrumental Hip Hop,Jazz Rap,Latin Rap,Low Bap,Lyrical Hip Hop,Merenrap,Midwest Hip Hop,Chicago Hip Hop,Detroit Hip Hop,Horrorcore,St.Louis Hip Hop,Twin Cities Hip Hop,Motswako,Nerdcore,New Jack Swing,New School Hip Hop,Old School Rap,Rap,Trap,Turntablism,Underground Rap,West Coast Rap,East Coast Rap,Trap,UK Grime,Hyphy,Emo-rap,Cloud rap,G-funk,Boom Bap,Mumble,Drill,UK Drill,Soundcloud Rap,Lo-fi".split(","),
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
	'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('				"Disco House",
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
				indie: /* @__PURE__ */ "Indie Rock.Indie Pop.Indie Folk.Indie Electronic.Indie Punk.Indie Hip-Hop.Dream Pop.Shoegaze.Lo-fi.Chillwave.Freak Folk.Noise Pop.Math Rock.Post-Punk.Garage Rock.Experimental Indie.Surf Rock.Alternative Country.Indie Soul.Art Rock.Indie R&B.Indietronica.Emo.Post-Rock.Indie Pop-Rock.Indie Synthpop.Noise Rock.Psych Folk.Indie Blues".split("."),
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
				world: /* @__PURE__ */ "African.Arabic.Asian.Caribbean.Celtic.European.Latin American.Middle Eastern.Native American.Polynesian.Reggae.Ska.Salsa.Flamenco.Bossa Nova.Tango.Fado.K'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('lezmer.Balkan.Afrobeat.Mongolian Throat Singing.Indian Classical.Gamelan.Sufi Music.Zydeco.Kora Music.Andean Music.Irish Traditional.Gypsy Jazz.Bollywood.Bhangra.Jawaiian.Hawaiian Slack Key Guitar.Calypso.Cuban Son.Taiko Drumming.African Highlife.Merengue.Tuvan Throat Singing".split(".")
			},
			emojis: {
				smileys_and_emotion: /* @__PURE__ */ "0x1f600.0x1f603.0x1f604.0x1f601.0x1f606.0x1f605.0x1f923.0x1f602.0x1f642.0x1f643.0x1fae0.0x1f609.0x1f60a.0x1f607.0x1f970.0x1f60d.0x1f929.0x1f618.0x1f617.0x263a.0x1f61a.0x1f619.0x1f972.0x1f60b.0x1f61b.0x1f61c.0x1f92a.0x1f61d.0x1f911.0x1f917.0x1f92d.0x1fae2.0x1fae3.0x1f92b.0x1f914.0x1fae1.0x1f910.0x1f928.0x1f610.0x1f611.0x1f636.0x1fae5.0x1f636.0x200d.0x1f32b.0xfe0f.0x1f60f.0x1f612.0x1f644.0x1f62c.0x1f62e.0x200d.0x1f4a8.0x1f925.0x1fae8.0x1f642.0x200d.0x2194.0xfe0f.0x1f642.0x200d.0x2195.0xfe0f.0x1f60c.0x1f614.0x1f62a.0x1f924.0x1f634.0x1f637.0x1f912.0x1f915.0x1f922.0x1f92e.0x1f927.0x1f975.0x1f976.0x1f974.0x1f635.0x1f635.0x200d.0x1f4ab.0x1f92f.0x1f920.0x1f973.0x1f978.0x1f60e.0x1f913.0x1f9d0.0x1f615.0x1fae4.0x1f61f.0x1f641.0x2639.0x1f62e.0x1f62f.0x1f632.0x1f633.0x1f97a.0x1f979.0x1f626.0x1f627.0x1f628.0x1f630.0x1f625.0x1f622.0x1f62d.0x1f631.0x1f616.0x1f623.0x1f61e.0x1f613.0x1f629.0x1f62b.0x1f971.0x1f624.0x1f621.0x1f620.0x1f92c.0x1f608.0x1f47f.0x1f480.0x2620.0x1f4a9.0x1f921.0x1f479.0x1f47a.0x1f47b.0x1f47d.0x1f47e.0x1f916.0x1f63a.0x1f638.0x1f639.0x1f63b.0x1f63c.0x1f63d.0x1f640.0x1f63f.0x1f63e.0x1f648.0x1f649.0x1f64a.0x1f48c.0x1f498.0x1f49d.0x1f496.0x1f497.0x1f493.0x1f49e.0x1f495.0x1f49f.0x2763.0x1f494.0x2764.0xfe0f.0x200d.0x1f525.0x2764.0xfe0f.0x200d.0x1fa79.0x2764.0x1fa77.0x1f9e1.0x1f49b.0x1f49a.0x1f499.0x1fa75.0x1f49c.0x1f90e.0x1f5a4.0x1fa76.0x1f90d.0x1f48b.0x1f4af.0x1f4a2.0x1f4a5.0x1f4ab.0x1f4a6.0x1f4a8.0x1f573.0x1f4ac.0x1f441.0xfe0f.0x200d.0x1f5e8.0xfe0f.0x1f5e8.0x1f5ef.0x1f4ad.0x1f4a4".split("."),
				people_and_body: /* @__PURE__ */ "0x1f44b.0x1f91a.0x1f590.0x270b.0x1f596.0x1faf1.0x1faf2.0x1faf3.0x1faf4.0x1faf7.0x1faf8.0x1f44c.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('0x1f90c.0x1f90f.0x270c.0x1f91e.0x1faf0.0x1f91f.0x1f918.0x1f919.0x1f448.0x1f449.0x1f446.0x1f595.0x1f447.0x261d.0x1faf5.0x1f44d.0x1f44e.0x270a.0x1f44a.0x1f91b.0x1f91c.0x1f44f.0x1f64c.0x1faf6.0x1f450.0x1f932.0x1f91d.0x1f64f.0x270d.0x1f485.0x1f933.0x1f4aa.0x1f9be.0x1f9bf.0x1f9b5.0x1f9b6.0x1f442.0x1f9bb.0x1f443.0x1f9e0.0x1fac0.0x1fac1.0x1f9b7.0x1f9b4.0x1f440.0x1f441.0x1f445.0x1f444.0x1fae6.0x1f476.0x1f9d2.0x1f466.0x1f467.0x1f9d1.0x1f471.0x1f468.0x1f9d4.0x1f9d4.0x200d.0x2642.0xfe0f.0x1f9d4.0x200d.0x2640.0xfe0f.0x1f468.0x200d.0x1f9b0.0x1f468.0x200d.0x1f9b1.0x1f468.0x200d.0x1f9b3.0x1f468.0x200d.0x1f9b2.0x1f469.0x1f469.0x200d.0x1f9b0.0x1f9d1.0x200d.0x1f9b0.0x1f469.0x200d.0x1f9b1.0x1f9d1.0x200d.0x1f9b1.0x1f469.0x200d.0x1f9b3.0x1f9d1.0x200d.0x1f9b3.0x1f469.0x200d.0x1f9b2.0x1f9d1.0x200d.0x1f9b2.0x1f471.0x200d.0x2640.0xfe0f.0x1f471.0x200d.0x2642.0xfe0f.0x1f9d3.0x1f474.0x1f475.0x1f64d.0x1f64d.0x200d.0x2642.0xfe0f.0x1f64d.0x200d.0x2640.0xfe0f.0x1f64e.0x1f64e.0x200d.0x2642.0xfe0f.0x1f64e.0x200d.0x2640.0xfe0f.0x1f645.0x1f645.0x200d.0x2642.0xfe0f.0x1f645.0x200d.0x2640.0xfe0f.0x1f646.0x1f646.0x200d.0x2642.0xfe0f.0x1f646.0x200d.0x2640.0xfe0f.0x1f481.0x1f481.0x200d.0x2642.0xfe0f.0x1f481.0x200d.0x2640.0xfe0f.0x1f64b.0x1f64b.0x200d.0x2642.0xfe0f.0x1f64b.0x200d.0x2640.0xfe0f.0x1f9cf.0x1f9cf.0x200d.0x2642.0xfe0f.0x1f9cf.0x200d.0x2640.0xfe0f.0x1f647.0x1f647.0x200d.0x2642.0xfe0f.0x1f647.0x200d.0x2640.0xfe0f.0x1f926.0x1f926.0x200d.0x2642.0xfe0f.0x1f926.0x200d.0x2640.0xfe0f.0x1f937.0x1f937.0x200d.0x2642.0xfe0f.0x1f937.0x200d.0x2640.0xfe0f.0x1f9d1.0x200d.0x2695.0xfe0f.0x1f468.0x200d.0x2695.0xfe0f.0x1f469.0x200d.0x2695.0xfe0f.0x1f9d1.0x200d.0x1f393.0x1f468.0x200d.0x1f393.0x1f469.0x200d.0x1f393.0x1f9d1.0x200d.0x1f3eb.0x1f468.0x200d.0x1f3eb.0x1f469.0x200d.0x1f3eb.0x1f9d1.0x200d.0x2696.0xfe0f.0x1f468.0x200d.0x2696.0xfe0f.0x1f469.0x200d.0x2696.0xfe0f.0x1f9d1.0x200d.0x1f33e.0x1f468.0x200d.0x1f33e.0x1f469.0x200d.0x1f33e.0x1f9d1.0x200d.0x1f373.0x1f468.0x200d.0x1f373.0x1f469.0x200d.0x1f373.0x1f9d1.0x200d'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.0x1f527.0x1f468.0x200d.0x1f527.0x1f469.0x200d.0x1f527.0x1f9d1.0x200d.0x1f3ed.0x1f468.0x200d.0x1f3ed.0x1f469.0x200d.0x1f3ed.0x1f9d1.0x200d.0x1f4bc.0x1f468.0x200d.0x1f4bc.0x1f469.0x200d.0x1f4bc.0x1f9d1.0x200d.0x1f52c.0x1f468.0x200d.0x1f52c.0x1f469.0x200d.0x1f52c.0x1f9d1.0x200d.0x1f4bb.0x1f468.0x200d.0x1f4bb.0x1f469.0x200d.0x1f4bb.0x1f9d1.0x200d.0x1f3a4.0x1f468.0x200d.0x1f3a4.0x1f469.0x200d.0x1f3a4.0x1f9d1.0x200d.0x1f3a8.0x1f468.0x200d.0x1f3a8.0x1f469.0x200d.0x1f3a8.0x1f9d1.0x200d.0x2708.0xfe0f.0x1f468.0x200d.0x2708.0xfe0f.0x1f469.0x200d.0x2708.0xfe0f.0x1f9d1.0x200d.0x1f680.0x1f468.0x200d.0x1f680.0x1f469.0x200d.0x1f680.0x1f9d1.0x200d.0x1f692.0x1f468.0x200d.0x1f692.0x1f469.0x200d.0x1f692.0x1f46e.0x1f46e.0x200d.0x2642.0xfe0f.0x1f46e.0x200d.0x2640.0xfe0f.0x1f575.0x1f575.0xfe0f.0x200d.0x2642.0xfe0f.0x1f575.0xfe0f.0x200d.0x2640.0xfe0f.0x1f482.0x1f482.0x200d.0x2642.0xfe0f.0x1f482.0x200d.0x2640.0xfe0f.0x1f977.0x1f477.0x1f477.0x200d.0x2642.0xfe0f.0x1f477.0x200d.0x2640.0xfe0f.0x1fac5.0x1f934.0x1f478.0x1f473.0x1f473.0x200d.0x2642.0xfe0f.0x1f473.0x200d.0x2640.0xfe0f.0x1f472.0x1f9d5.0x1f935.0x1f935.0x200d.0x2642.0xfe0f.0x1f935.0x200d.0x2640.0xfe0f.0x1f470.0x1f470.0x200d.0x2642.0xfe0f.0x1f470.0x200d.0x2640.0xfe0f.0x1f930.0x1fac3.0x1fac4.0x1f931.0x1f469.0x200d.0x1f37c.0x1f468.0x200d.0x1f37c.0x1f9d1.0x200d.0x1f37c.0x1f47c.0x1f385.0x1f936.0x1f9d1.0x200d.0x1f384.0x1f9b8.0x1f9b8.0x200d.0x2642.0xfe0f.0x1f9b8.0x200d.0x2640.0xfe0f.0x1f9b9.0x1f9b9.0x200d.0x2642.0xfe0f.0x1f9b9.0x200d.0x2640.0xfe0f.0x1f9d9.0x1f9d9.0x200d.0x2642.0xfe0f.0x1f9d9.0x200d.0x2640.0xfe0f.0x1f9da.0x1f9da.0x200d.0x2642.0xfe0f.0x1f9da.0x200d.0x2640.0xfe0f.0x1f9db.0x1f9db.0x200d.0x2642.0xfe0f.0x1f9db.0x200d.0x2640.0xfe0f.0x1f9dc.0x1f9dc.0x200d.0x2642.0xfe0f.0x1f9dc.0x200d.0x2640.0xfe0f.0x1f9dd.0x1f9dd.0x200d.0x2642.0xfe0f.0x1f9dd.0x200d.0x2640.0xfe0f.0x1f9de.0x1f9de.0x200d.0x2642.0xfe0f.0x1f9de.0x200d.0x2640.0xfe0f.0x1f9df.0x1f9df.0x200d.0x2642.0xfe0f.0x1f9df.0x200d.0x2640.0xfe0f.0x1f9cc.0x1f486.0x1f486.0x200d.0x2642.0x'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('fe0f.0x1f486.0x200d.0x2640.0xfe0f.0x1f487.0x1f487.0x200d.0x2642.0xfe0f.0x1f487.0x200d.0x2640.0xfe0f.0x1f6b6.0x1f6b6.0x200d.0x2642.0xfe0f.0x1f6b6.0x200d.0x2640.0xfe0f.0x1f6b6.0x200d.0x27a1.0xfe0f.0x1f6b6.0x200d.0x2640.0xfe0f.0x200d.0x27a1.0xfe0f.0x1f6b6.0x200d.0x2642.0xfe0f.0x200d.0x27a1.0xfe0f.0x1f9cd.0x1f9cd.0x200d.0x2642.0xfe0f.0x1f9cd.0x200d.0x2640.0xfe0f.0x1f9ce.0x1f9ce.0x200d.0x2642.0xfe0f.0x1f9ce.0x200d.0x2640.0xfe0f.0x1f9ce.0x200d.0x27a1.0xfe0f.0x1f9ce.0x200d.0x2640.0xfe0f.0x200d.0x27a1.0xfe0f.0x1f9ce.0x200d.0x2642.0xfe0f.0x200d.0x27a1.0xfe0f.0x1f9d1.0x200d.0x1f9af.0x1f9d1.0x200d.0x1f9af.0x200d.0x27a1.0xfe0f.0x1f468.0x200d.0x1f9af.0x1f468.0x200d.0x1f9af.0x200d.0x27a1.0xfe0f.0x1f469.0x200d.0x1f9af.0x1f469.0x200d.0x1f9af.0x200d.0x27a1.0xfe0f.0x1f9d1.0x200d.0x1f9bc.0x1f9d1.0x200d.0x1f9bc.0x200d.0x27a1.0xfe0f.0x1f468.0x200d.0x1f9bc.0x1f468.0x200d.0x1f9bc.0x200d.0x27a1.0xfe0f.0x1f469.0x200d.0x1f9bc.0x1f469.0x200d.0x1f9bc.0x200d.0x27a1.0xfe0f.0x1f9d1.0x200d.0x1f9bd.0x1f9d1.0x200d.0x1f9bd.0x200d.0x27a1.0xfe0f.0x1f468.0x200d.0x1f9bd.0x1f468.0x200d.0x1f9bd.0x200d.0x27a1.0xfe0f.0x1f469.0x200d.0x1f9bd.0x1f469.0x200d.0x1f9bd.0x200d.0x27a1.0xfe0f.0x1f3c3.0x1f3c3.0x200d.0x2642.0xfe0f.0x1f3c3.0x200d.0x2640.0xfe0f.0x1f3c3.0x200d.0x27a1.0xfe0f.0x1f3c3.0x200d.0x2640.0xfe0f.0x200d.0x27a1.0xfe0f.0x1f3c3.0x200d.0x2642.0xfe0f.0x200d.0x27a1.0xfe0f.0x1f483.0x1f57a.0x1f574.0x1f46f.0x1f46f.0x200d.0x2642.0xfe0f.0x1f46f.0x200d.0x2640.0xfe0f.0x1f9d6.0x1f9d6.0x200d.0x2642.0xfe0f.0x1f9d6.0x200d.0x2640.0xfe0f.0x1f9d7.0x1f9d7.0x200d.0x2642.0xfe0f.0x1f9d7.0x200d.0x2640.0xfe0f.0x1f93a.0x1f3c7.0x26f7.0x1f3c2.0x1f3cc.0x1f3cc.0xfe0f.0x200d.0x2642.0xfe0f.0x1f3cc.0xfe0f.0x200d.0x2640.0xfe0f.0x1f3c4.0x1f3c4.0x200d.0x2642.0xfe0f.0x1f3c4.0x200d.0x2640.0xfe0f.0x1f6a3.0x1f6a3.0x200d.0x2642.0xfe0f.0x1f6a3.0x200d.0x2640.0xfe0f.0x1f3ca.0x1f3ca.0x200d.0x2642.0xfe0f.0x1f3ca.0x200d.0x2640.0xfe0f.0x26f9.0x26f9.0xfe0f.0x200d.0x2642.0xfe0f.0x26f9.0xfe0f.0x200d.0x2640.0xfe0f.0x1f3cb.0x1f3cb.0xfe0f.0x200d.0x2642.0'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('xfe0f.0x1f3cb.0xfe0f.0x200d.0x2640.0xfe0f.0x1f6b4.0x1f6b4.0x200d.0x2642.0xfe0f.0x1f6b4.0x200d.0x2640.0xfe0f.0x1f6b5.0x1f6b5.0x200d.0x2642.0xfe0f.0x1f6b5.0x200d.0x2640.0xfe0f.0x1f938.0x1f938.0x200d.0x2642.0xfe0f.0x1f938.0x200d.0x2640.0xfe0f.0x1f93c.0x1f93c.0x200d.0x2642.0xfe0f.0x1f93c.0x200d.0x2640.0xfe0f.0x1f93d.0x1f93d.0x200d.0x2642.0xfe0f.0x1f93d.0x200d.0x2640.0xfe0f.0x1f93e.0x1f93e.0x200d.0x2642.0xfe0f.0x1f93e.0x200d.0x2640.0xfe0f.0x1f939.0x1f939.0x200d.0x2642.0xfe0f.0x1f939.0x200d.0x2640.0xfe0f.0x1f9d8.0x1f9d8.0x200d.0x2642.0xfe0f.0x1f9d8.0x200d.0x2640.0xfe0f.0x1f6c0.0x1f6cc.0x1f9d1.0x200d.0x1f91d.0x200d.0x1f9d1.0x1f46d.0x1f46b.0x1f46c.0x1f48f.0x1f469.0x200d.0x2764.0xfe0f.0x200d.0x1f48b.0x200d.0x1f468.0x1f468.0x200d.0x2764.0xfe0f.0x200d.0x1f48b.0x200d.0x1f468.0x1f469.0x200d.0x2764.0xfe0f.0x200d.0x1f48b.0x200d.0x1f469.0x1f491.0x1f469.0x200d.0x2764.0xfe0f.0x200d.0x1f468.0x1f468.0x200d.0x2764.0xfe0f.0x200d.0x1f468.0x1f469.0x200d.0x2764.0xfe0f.0x200d.0x1f469.0x1f468.0x200d.0x1f469.0x200d.0x1f466.0x1f468.0x200d.0x1f469.0x200d.0x1f467.0x1f468.0x200d.0x1f469.0x200d.0x1f467.0x200d.0x1f466.0x1f468.0x200d.0x1f469.0x200d.0x1f466.0x200d.0x1f466.0x1f468.0x200d.0x1f469.0x200d.0x1f467.0x200d.0x1f467.0x1f468.0x200d.0x1f468.0x200d.0x1f466.0x1f468.0x200d.0x1f468.0x200d.0x1f467.0x1f468.0x200d.0x1f468.0x200d.0x1f467.0x200d.0x1f466.0x1f468.0x200d.0x1f468.0x200d.0x1f466.0x200d.0x1f466.0x1f468.0x200d.0x1f468.0x200d.0x1f467.0x200d.0x1f467.0x1f469.0x200d.0x1f469.0x200d.0x1f466.0x1f469.0x200d.0x1f469.0x200d.0x1f467.0x1f469.0x200d.0x1f469.0x200d.0x1f467.0x200d.0x1f466.0x1f469.0x200d.0x1f469.0x200d.0x1f466.0x200d.0x1f466.0x1f469.0x200d.0x1f469.0x200d.0x1f467.0x200d.0x1f467.0x1f468.0x200d.0x1f466.0x1f468.0x200d.0x1f466.0x200d.0x1f466.0x1f468.0x200d.0x1f467.0x1f468.0x200d.0x1f467.0x200d.0x1f466.0x1f468.0x200d.0x1f467.0x200d.0x1f467.0x1f469.0x200d.0x1f466.0x1f469.0x200d.0x1f466.0x200d.0x1f466.0x1f469.0x200d.0x1f467.0x1f469.0x200d.0x1f467.0x200d.0x1f466.0x1f469.0x200d.0x1f467.0x200d.0x1f467.0x'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('1f5e3.0x1f464.0x1f465.0x1fac2.0x1f46a.0x1f9d1.0x200d.0x1f9d1.0x200d.0x1f9d2.0x1f9d1.0x200d.0x1f9d1.0x200d.0x1f9d2.0x200d.0x1f9d2.0x1f9d1.0x200d.0x1f9d2.0x1f9d1.0x200d.0x1f9d2.0x200d.0x1f9d2.0x1f463".split("."),
				animals_and_nature: /* @__PURE__ */ "0x1f435.0x1f412.0x1f98d.0x1f9a7.0x1f436.0x1f415.0x1f9ae.0x1f415.0x200d.0x1f9ba.0x1f429.0x1f43a.0x1f98a.0x1f99d.0x1f431.0x1f408.0x1f408.0x200d.0x2b1b.0x1f981.0x1f42f.0x1f405.0x1f406.0x1f434.0x1face.0x1facf.0x1f40e.0x1f984.0x1f993.0x1f98c.0x1f9ac.0x1f42e.0x1f402.0x1f403.0x1f404.0x1f437.0x1f416.0x1f417.0x1f43d.0x1f40f.0x1f411.0x1f410.0x1f42a.0x1f42b.0x1f999.0x1f992.0x1f418.0x1f9a3.0x1f98f.0x1f99b.0x1f42d.0x1f401.0x1f400.0x1f439.0x1f430.0x1f407.0x1f43f.0x1f9ab.0x1f994.0x1f987.0x1f43b.0x1f43b.0x200d.0x2744.0xfe0f.0x1f428.0x1f43c.0x1f9a5.0x1f9a6.0x1f9a8.0x1f998.0x1f9a1.0x1f43e.0x1f983.0x1f414.0x1f413.0x1f423.0x1f424.0x1f425.0x1f426.0x1f427.0x1f54a.0x1f985.0x1f986.0x1f9a2.0x1f989.0x1f9a4.0x1fab6.0x1f9a9.0x1f99a.0x1f99c.0x1fabd.0x1f426.0x200d.0x2b1b.0x1fabf.0x1f426.0x200d.0x1f525.0x1f438.0x1f40a.0x1f422.0x1f98e.0x1f40d.0x1f432.0x1f409.0x1f995.0x1f996.0x1f433.0x1f40b.0x1f42c.0x1f9ad.0x1f41f.0x1f420.0x1f421.0x1f988.0x1f419.0x1f41a.0x1fab8.0x1fabc.0x1f40c.0x1f98b.0x1f41b.0x1f41c.0x1f41d.0x1fab2.0x1f41e.0x1f997.0x1fab3.0x1f577.0x1f578.0x1f982.0x1f99f.0x1fab0.0x1fab1.0x1f9a0.0x1f490.0x1f338.0x1f4ae.0x1fab7.0x1f3f5.0x1f339.0x1f940.0x1f33a.0x1f33b.0x1f33c.0x1f337.0x1fabb.0x1f331.0x1fab4.0x1f332.0x1f333.0x1f334.0x1f335.0x1f33e.0x1f33f.0x2618.0x1f340.0x1f341.0x1f342.0x1f343.0x1fab9.0x1faba.0x1f344".split("."),
				food_and_drink: /* @__PURE__ */ "0x1f347.0x1f348.0x1f349.0x1f34a.0x1f34b.0x1f34b.0x200d.0x1f7e9.0x1f34c.0x1f34d.0x1f96d.0x1f34e.0x1f34f.0x1f350.0x1f351.0x1f352.0x1f353.0x1fad0.0x1f95d.0x1f345.0x1fad2.0x1f965.0x1f951.0x1f346.0x1f954.0x1f955.0x1f33d.0x1f336.0x1fad1.0x1f952.0x1f96c.0x1f966.0x1f9c4.0x1f9c5.0x1f95c.0x1fad8.0x1f330.0x1fada.0x1fadb.0x1f344.0x200d.0x1f7eb.0x1f35e.0x1f950.0x1f956.0x1fad3.0x1f968.0x1f96f.0x1f95e.0x1f9c'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('7.0x1f9c0.0x1f356.0x1f357.0x1f969.0x1f953.0x1f354.0x1f35f.0x1f355.0x1f32d.0x1f96a.0x1f32e.0x1f32f.0x1fad4.0x1f959.0x1f9c6.0x1f95a.0x1f373.0x1f958.0x1f372.0x1fad5.0x1f963.0x1f957.0x1f37f.0x1f9c8.0x1f9c2.0x1f96b.0x1f371.0x1f358.0x1f359.0x1f35a.0x1f35b.0x1f35c.0x1f35d.0x1f360.0x1f362.0x1f363.0x1f364.0x1f365.0x1f96e.0x1f361.0x1f95f.0x1f960.0x1f961.0x1f980.0x1f99e.0x1f990.0x1f991.0x1f9aa.0x1f366.0x1f367.0x1f368.0x1f369.0x1f36a.0x1f382.0x1f370.0x1f9c1.0x1f967.0x1f36b.0x1f36c.0x1f36d.0x1f36e.0x1f36f.0x1f37c.0x1f95b.0x2615.0x1fad6.0x1f375.0x1f376.0x1f37e.0x1f377.0x1f378.0x1f379.0x1f37a.0x1f37b.0x1f942.0x1f943.0x1fad7.0x1f964.0x1f9cb.0x1f9c3.0x1f9c9.0x1f9ca.0x1f962.0x1f37d.0x1f374.0x1f944.0x1f52a.0x1fad9.0x1f3fa".split("."),
				travel_and_places: /* @__PURE__ */ "0x1f30d.0x1f30e.0x1f30f.0x1f310.0x1f5fa.0x1f5fe.0x1f9ed.0x1f3d4.0x26f0.0x1f30b.0x1f5fb.0x1f3d5.0x1f3d6.0x1f3dc.0x1f3dd.0x1f3de.0x1f3df.0x1f3db.0x1f3d7.0x1f9f1.0x1faa8.0x1fab5.0x1f6d6.0x1f3d8.0x1f3da.0x1f3e0.0x1f3e1.0x1f3e2.0x1f3e3.0x1f3e4.0x1f3e5.0x1f3e6.0x1f3e8.0x1f3e9.0x1f3ea.0x1f3eb.0x1f3ec.0x1f3ed.0x1f3ef.0x1f3f0.0x1f492.0x1f5fc.0x1f5fd.0x26ea.0x1f54c.0x1f6d5.0x1f54d.0x26e9.0x1f54b.0x26f2.0x26fa.0x1f301.0x1f303.0x1f3d9.0x1f304.0x1f305.0x1f306.0x1f307.0x1f309.0x2668.0x1f3a0.0x1f6dd.0x1f3a1.0x1f3a2.0x1f488.0x1f3aa.0x1f682.0x1f683.0x1f684.0x1f685.0x1f686.0x1f687.0x1f688.0x1f689.0x1f68a.0x1f69d.0x1f69e.0x1f68b.0x1f68c.0x1f68d.0x1f68e.0x1f690.0x1f691.0x1f692.0x1f693.0x1f694.0x1f695.0x1f696.0x1f697.0x1f698.0x1f699.0x1f6fb.0x1f69a.0x1f69b.0x1f69c.0x1f3ce.0x1f3cd.0x1f6f5.0x1f9bd.0x1f9bc.0x1f6fa.0x1f6b2.0x1f6f4.0x1f6f9.0x1f6fc.0x1f68f.0x1f6e3.0x1f6e4.0x1f6e2.0x26fd.0x1f6de.0x1f6a8.0x1f6a5.0x1f6a6.0x1f6d1.0x1f6a7.0x2693.0x1f6df.0x26f5.0x1f6f6.0x1f6a4.0x1f6f3.0x26f4.0x1f6e5.0x1f6a2.0x2708.0x1f6e9.0x1f6eb.0x1f6ec.0x1fa82.0x1f4ba.0x1f681.0x1f69f.0x1f6a0.0x1f6a1.0x1f6f0.0x1f680.0x1f6f8.0x1f6ce.0x1f9f3.0x231b.0x23f3.0x231a.0x23f0.0x23f1.0x23f2.0x1f570.0x1f55b.0x1f567.0x1f550.0x1f55c.0x1f551.0x1f55d.0x1f552.0x1f55e.0x1f553.0x1'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('f55f.0x1f554.0x1f560.0x1f555.0x1f561.0x1f556.0x1f562.0x1f557.0x1f563.0x1f558.0x1f564.0x1f559.0x1f565.0x1f55a.0x1f566.0x1f311.0x1f312.0x1f313.0x1f314.0x1f315.0x1f316.0x1f317.0x1f318.0x1f319.0x1f31a.0x1f31b.0x1f31c.0x1f321.0x2600.0x1f31d.0x1f31e.0x1fa90.0x2b50.0x1f31f.0x1f320.0x1f30c.0x2601.0x26c5.0x26c8.0x1f324.0x1f325.0x1f326.0x1f327.0x1f328.0x1f329.0x1f32a.0x1f32b.0x1f32c.0x1f300.0x1f308.0x1f302.0x2602.0x2614.0x26f1.0x26a1.0x2744.0x2603.0x26c4.0x2604.0x1f525.0x1f4a7.0x1f30a".split("."),
				activities: /* @__PURE__ */ "0x1f383.0x1f384.0x1f386.0x1f387.0x1f9e8.0x2728.0x1f388.0x1f389.0x1f38a.0x1f38b.0x1f38d.0x1f38e.0x1f38f.0x1f390.0x1f391.0x1f9e7.0x1f380.0x1f381.0x1f397.0x1f39f.0x1f3ab.0x1f396.0x1f3c6.0x1f3c5.0x1f947.0x1f948.0x1f949.0x26bd.0x26be.0x1f94e.0x1f3c0.0x1f3d0.0x1f3c8.0x1f3c9.0x1f3be.0x1f94f.0x1f3b3.0x1f3cf.0x1f3d1.0x1f3d2.0x1f94d.0x1f3d3.0x1f3f8.0x1f94a.0x1f94b.0x1f945.0x26f3.0x26f8.0x1f3a3.0x1f93f.0x1f3bd.0x1f3bf.0x1f6f7.0x1f94c.0x1f3af.0x1fa80.0x1fa81.0x1f52b.0x1f3b1.0x1f52e.0x1fa84.0x1f3ae.0x1f579.0x1f3b0.0x1f3b2.0x1f9e9.0x1f9f8.0x1fa85.0x1faa9.0x1fa86.0x2660.0x2665.0x2666.0x2663.0x265f.0x1f0cf.0x1f004.0x1f3b4.0x1f3ad.0x1f5bc.0x1f3a8.0x1f9f5.0x1faa1.0x1f9f6.0x1faa2".split("."),
				objects: /* @__PURE__ */ "0x1f453.0x1f576.0x1f97d.0x1f97c.0x1f9ba.0x1f454.0x1f455.0x1f456.0x1f9e3.0x1f9e4.0x1f9e5.0x1f9e6.0x1f457.0x1f458.0x1f97b.0x1fa71.0x1fa72.0x1fa73.0x1f459.0x1f45a.0x1faad.0x1f45b.0x1f45c.0x1f45d.0x1f6cd.0x1f392.0x1fa74.0x1f45e.0x1f45f.0x1f97e.0x1f97f.0x1f460.0x1f461.0x1fa70.0x1f462.0x1faae.0x1f451.0x1f452.0x1f3a9.0x1f393.0x1f9e2.0x1fa96.0x26d1.0x1f4ff.0x1f484.0x1f48d.0x1f48e.0x1f507.0x1f508.0x1f509.0x1f50a.0x1f4e2.0x1f4e3.0x1f4ef.0x1f514.0x1f515.0x1f3bc.0x1f3b5.0x1f3b6.0x1f399.0x1f39a.0x1f39b.0x1f3a4.0x1f3a7.0x1f4fb.0x1f3b7.0x1fa97.0x1f3b8.0x1f3b9.0x1f3ba.0x1f3bb.0x1fa95.0x1f941.0x1fa98.0x1fa87.0x1fa88.0x1f4f1.0x1f4f2.0x260e.0x1f4de.0x1f4df.0x1f4e0.0x1f50b.0x1faab.0x1f50c.0x1f4bb.0x1f5a5.0x1f5a8.0x2328.0x1f5b1.0x1f5b2.0x1f4bd.0x1f4be.0x1f4bf.0x1f4c0.0x1f'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('9ee.0x1f3a5.0x1f39e.0x1f4fd.0x1f3ac.0x1f4fa.0x1f4f7.0x1f4f8.0x1f4f9.0x1f4fc.0x1f50d.0x1f50e.0x1f56f.0x1f4a1.0x1f526.0x1f3ee.0x1fa94.0x1f4d4.0x1f4d5.0x1f4d6.0x1f4d7.0x1f4d8.0x1f4d9.0x1f4da.0x1f4d3.0x1f4d2.0x1f4c3.0x1f4dc.0x1f4c4.0x1f4f0.0x1f5de.0x1f4d1.0x1f516.0x1f3f7.0x1f4b0.0x1fa99.0x1f4b4.0x1f4b5.0x1f4b6.0x1f4b7.0x1f4b8.0x1f4b3.0x1f9fe.0x1f4b9.0x2709.0x1f4e7.0x1f4e8.0x1f4e9.0x1f4e4.0x1f4e5.0x1f4e6.0x1f4eb.0x1f4ea.0x1f4ec.0x1f4ed.0x1f4ee.0x1f5f3.0x270f.0x2712.0x1f58b.0x1f58a.0x1f58c.0x1f58d.0x1f4dd.0x1f4bc.0x1f4c1.0x1f4c2.0x1f5c2.0x1f4c5.0x1f4c6.0x1f5d2.0x1f5d3.0x1f4c7.0x1f4c8.0x1f4c9.0x1f4ca.0x1f4cb.0x1f4cc.0x1f4cd.0x1f4ce.0x1f587.0x1f4cf.0x1f4d0.0x2702.0x1f5c3.0x1f5c4.0x1f5d1.0x1f512.0x1f513.0x1f50f.0x1f510.0x1f511.0x1f5dd.0x1f528.0x1fa93.0x26cf.0x2692.0x1f6e0.0x1f5e1.0x2694.0x1f4a3.0x1fa83.0x1f3f9.0x1f6e1.0x1fa9a.0x1f527.0x1fa9b.0x1f529.0x2699.0x1f5dc.0x2696.0x1f9af.0x1f517.0x26d3.0xfe0f.0x200d.0x1f4a5.0x26d3.0x1fa9d.0x1f9f0.0x1f9f2.0x1fa9c.0x2697.0x1f9ea.0x1f9eb.0x1f9ec.0x1f52c.0x1f52d.0x1f4e1.0x1f489.0x1fa78.0x1f48a.0x1fa79.0x1fa7c.0x1fa7a.0x1fa7b.0x1f6aa.0x1f6d7.0x1fa9e.0x1fa9f.0x1f6cf.0x1f6cb.0x1fa91.0x1f6bd.0x1faa0.0x1f6bf.0x1f6c1.0x1faa4.0x1fa92.0x1f9f4.0x1f9f7.0x1f9f9.0x1f9fa.0x1f9fb.0x1faa3.0x1f9fc.0x1fae7.0x1faa5.0x1f9fd.0x1f9ef.0x1f6d2.0x1f6ac.0x26b0.0x1faa6.0x26b1.0x1f9ff.0x1faac.0x1f5ff.0x1faa7.0x1faaa".split("."),
				symbols: /* @__PURE__ */ "0x1f3e7.0x1f6ae.0x1f6b0.0x267f.0x1f6b9.0x1f6ba.0x1f6bb.0x1f6bc.0x1f6be.0x1f6c2.0x1f6c3.0x1f6c4.0x1f6c5.0x26a0.0x1f6b8.0x26d4.0x1f6ab.0x1f6b3.0x1f6ad.0x1f6af.0x1f6b1.0x1f6b7.0x1f4f5.0x1f51e.0x2622.0x2623.0x2b06.0x2197.0x27a1.0x2198.0x2b07.0x2199.0x2b05.0x2196.0x2195.0x2194.0x21a9.0x21aa.0x2934.0x2935.0x1f503.0x1f504.0x1f519.0x1f51a.0x1f51b.0x1f51c.0x1f51d.0x1f6d0.0x269b.0x1f549.0x2721.0x2638.0x262f.0x271d.0x2626.0x262a.0x262e.0x1f54e.0x1f52f.0x1faaf.0x2648.0x2649.0x264a.0x264b.0x264c.0x264d.0x264e.0x264f.0x2650.0x2651.0x2652.0x2653.0x26ce.0x1f500.0x1f501.0x1f502.0x25b6.0x23e9.0x23ed.0x23ef.0x25c0.0x23ea.0x23ee.'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('0x1f53c.0x23eb.0x1f53d.0x23ec.0x23f8.0x23f9.0x23fa.0x23cf.0x1f3a6.0x1f505.0x1f506.0x1f4f6.0x1f6dc.0x1f4f3.0x1f4f4.0x2640.0x2642.0x26a7.0x2716.0x2795.0x2796.0x2797.0x1f7f0.0x267e.0x203c.0x2049.0x2753.0x2754.0x2755.0x2757.0x3030.0x1f4b1.0x1f4b2.0x2695.0x267b.0x269c.0x1f531.0x1f4db.0x1f530.0x2b55.0x2705.0x2611.0x2714.0x274c.0x274e.0x27b0.0x27bf.0x303d.0x2733.0x2734.0x2747.0x00a9.0x00ae.0x2122.0x0023.0xfe0f.0x20e3.0x002a.0xfe0f.0x20e3.0x0030.0xfe0f.0x20e3.0x0031.0xfe0f.0x20e3.0x0032.0xfe0f.0x20e3.0x0033.0xfe0f.0x20e3.0x0034.0xfe0f.0x20e3.0x0035.0xfe0f.0x20e3.0x0036.0xfe0f.0x20e3.0x0037.0xfe0f.0x20e3.0x0038.0xfe0f.0x20e3.0x0039.0xfe0f.0x20e3.0x1f51f.0x1f520.0x1f521.0x1f522.0x1f523.0x1f524.0x1f170.0x1f18e.0x1f171.0x1f191.0x1f192.0x1f193.0x2139.0x1f194.0x24c2.0x1f195.0x1f196.0x1f17e.0x1f197.0x1f17f.0x1f198.0x1f199.0x1f19a.0x1f201.0x1f202.0x1f237.0x1f236.0x1f22f.0x1f250.0x1f239.0x1f21a.0x1f232.0x1f251.0x1f238.0x1f234.0x1f233.0x3297.0x3299.0x1f23a.0x1f235.0x1f534.0x1f7e0.0x1f7e1.0x1f7e2.0x1f535.0x1f7e3.0x1f7e4.0x26ab.0x26aa.0x1f7e5.0x1f7e7.0x1f7e8.0x1f7e9.0x1f7e6.0x1f7ea.0x1f7eb.0x2b1b.0x2b1c.0x25fc.0x25fb.0x25fe.0x25fd.0x25aa.0x25ab.0x1f536.0x1f537.0x1f538.0x1f539.0x1f53a.0x1f53b.0x1f4a0.0x1f518.0x1f533.0x1f532".split("."),
				flags: /* @__PURE__ */ "0x1f3c1.0x1f6a9.0x1f38c.0x1f3f4.0x1f3f3.0x1f3f3.0xfe0f.0x200d.0x1f308.0x1f3f3.0xfe0f.0x200d.0x26a7.0xfe0f.0x1f3f4.0x200d.0x2620.0xfe0f.0x1f1e6.0x1f1e8.0x1f1e6.0x1f1e9.0x1f1e6.0x1f1ea.0x1f1e6.0x1f1eb.0x1f1e6.0x1f1ec.0x1f1e6.0x1f1ee.0x1f1e6.0x1f1f1.0x1f1e6.0x1f1f2.0x1f1e6.0x1f1f4.0x1f1e6.0x1f1f6.0x1f1e6.0x1f1f7.0x1f1e6.0x1f1f8.0x1f1e6.0x1f1f9.0x1f1e6.0x1f1fa.0x1f1e6.0x1f1fc.0x1f1e6.0x1f1fd.0x1f1e6.0x1f1ff.0x1f1e7.0x1f1e6.0x1f1e7.0x1f1e7.0x1f1e7.0x1f1e9.0x1f1e7.0x1f1ea.0x1f1e7.0x1f1eb.0x1f1e7.0x1f1ec.0x1f1e7.0x1f1ed.0x1f1e7.0x1f1ee.0x1f1e7.0x1f1ef.0x1f1e7.0x1f1f1.0x1f1e7.0x1f1f2.0x1f1e7.0x1f1f3.0x1f1e7.0x1f1f4.0x1f1e7.0x1f1f6.0x1f1e7.0x1f1f7.0x1f1e7.0x1f1f8.0x1f1e7.0x1f1f9.0x1f1e7.0x1f1fb.0x1f1e7.0x1f1fc.0x1f1e7.0x1f1fe.0x1f1e7.0'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('x1f1ff.0x1f1e8.0x1f1e6.0x1f1e8.0x1f1e8.0x1f1e8.0x1f1e9.0x1f1e8.0x1f1eb.0x1f1e8.0x1f1ec.0x1f1e8.0x1f1ed.0x1f1e8.0x1f1ee.0x1f1e8.0x1f1f0.0x1f1e8.0x1f1f1.0x1f1e8.0x1f1f2.0x1f1e8.0x1f1f3.0x1f1e8.0x1f1f4.0x1f1e8.0x1f1f5.0x1f1e8.0x1f1f7.0x1f1e8.0x1f1fa.0x1f1e8.0x1f1fb.0x1f1e8.0x1f1fc.0x1f1e8.0x1f1fd.0x1f1e8.0x1f1fe.0x1f1e8.0x1f1ff.0x1f1e9.0x1f1ea.0x1f1e9.0x1f1ec.0x1f1e9.0x1f1ef.0x1f1e9.0x1f1f0.0x1f1e9.0x1f1f2.0x1f1e9.0x1f1f4.0x1f1e9.0x1f1ff.0x1f1ea.0x1f1e6.0x1f1ea.0x1f1e8.0x1f1ea.0x1f1ea.0x1f1ea.0x1f1ec.0x1f1ea.0x1f1ed.0x1f1ea.0x1f1f7.0x1f1ea.0x1f1f8.0x1f1ea.0x1f1f9.0x1f1ea.0x1f1fa.0x1f1eb.0x1f1ee.0x1f1eb.0x1f1ef.0x1f1eb.0x1f1f0.0x1f1eb.0x1f1f2.0x1f1eb.0x1f1f4.0x1f1eb.0x1f1f7.0x1f1ec.0x1f1e6.0x1f1ec.0x1f1e7.0x1f1ec.0x1f1e9.0x1f1ec.0x1f1ea.0x1f1ec.0x1f1eb.0x1f1ec.0x1f1ec.0x1f1ec.0x1f1ed.0x1f1ec.0x1f1ee.0x1f1ec.0x1f1f1.0x1f1ec.0x1f1f2.0x1f1ec.0x1f1f3.0x1f1ec.0x1f1f5.0x1f1ec.0x1f1f6.0x1f1ec.0x1f1f7.0x1f1ec.0x1f1f8.0x1f1ec.0x1f1f9.0x1f1ec.0x1f1fa.0x1f1ec.0x1f1fc.0x1f1ec.0x1f1fe.0x1f1ed.0x1f1f0.0x1f1ed.0x1f1f2.0x1f1ed.0x1f1f3.0x1f1ed.0x1f1f7.0x1f1ed.0x1f1f9.0x1f1ed.0x1f1fa.0x1f1ee.0x1f1e8.0x1f1ee.0x1f1e9.0x1f1ee.0x1f1ea.0x1f1ee.0x1f1f1.0x1f1ee.0x1f1f2.0x1f1ee.0x1f1f3.0x1f1ee.0x1f1f4.0x1f1ee.0x1f1f6.0x1f1ee.0x1f1f7.0x1f1ee.0x1f1f8.0x1f1ee.0x1f1f9.0x1f1ef.0x1f1ea.0x1f1ef.0x1f1f2.0x1f1ef.0x1f1f4.0x1f1ef.0x1f1f5.0x1f1f0.0x1f1ea.0x1f1f0.0x1f1ec.0x1f1f0.0x1f1ed.0x1f1f0.0x1f1ee.0x1f1f0.0x1f1f2.0x1f1f0.0x1f1f3.0x1f1f0.0x1f1f5.0x1f1f0.0x1f1f7.0x1f1f0.0x1f1fc.0x1f1f0.0x1f1fe.0x1f1f0.0x1f1ff.0x1f1f1.0x1f1e6.0x1f1f1.0x1f1e7.0x1f1f1.0x1f1e8.0x1f1f1.0x1f1ee.0x1f1f1.0x1f1f0.0x1f1f1.0x1f1f7.0x1f1f1.0x1f1f8.0x1f1f1.0x1f1f9.0x1f1f1.0x1f1fa.0x1f1f1.0x1f1fb.0x1f1f1.0x1f1fe.0x1f1f2.0x1f1e6.0x1f1f2.0x1f1e8.0x1f1f2.0x1f1e9.0x1f1f2.0x1f1ea.0x1f1f2.0x1f1eb.0x1f1f2.0x1f1ec.0x1f1f2.0x1f1ed.0x1f1f2.0x1f1f0.0x1f1f2.0x1f1f1.0x1f1f2.0x1f1f2.0x1f1f2.0x1f1f3.0x1f1f2.0x1f1f4.0x1f1f2.0x1f1f5.0x1f1f2.0x1f1f6.0x1f1f2.0x1f1f7.0x1f1f2.0x1f1f8.0x1f1f2.0x1f1f9.0x1f1f2.0x1f1fa.0x1f1f2.0x1f1fb.0x1f1f2.0x1f1fc.0x1f1f2.0'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('x1f1fd.0x1f1f2.0x1f1fe.0x1f1f2.0x1f1ff.0x1f1f3.0x1f1e6.0x1f1f3.0x1f1e8.0x1f1f3.0x1f1ea.0x1f1f3.0x1f1eb.0x1f1f3.0x1f1ec.0x1f1f3.0x1f1ee.0x1f1f3.0x1f1f1.0x1f1f3.0x1f1f4.0x1f1f3.0x1f1f5.0x1f1f3.0x1f1f7.0x1f1f3.0x1f1fa.0x1f1f3.0x1f1ff.0x1f1f4.0x1f1f2.0x1f1f5.0x1f1e6.0x1f1f5.0x1f1ea.0x1f1f5.0x1f1eb.0x1f1f5.0x1f1ec.0x1f1f5.0x1f1ed.0x1f1f5.0x1f1f0.0x1f1f5.0x1f1f1.0x1f1f5.0x1f1f2.0x1f1f5.0x1f1f3.0x1f1f5.0x1f1f7.0x1f1f5.0x1f1f8.0x1f1f5.0x1f1f9.0x1f1f5.0x1f1fc.0x1f1f5.0x1f1fe.0x1f1f6.0x1f1e6.0x1f1f7.0x1f1ea.0x1f1f7.0x1f1f4.0x1f1f7.0x1f1f8.0x1f1f7.0x1f1fa.0x1f1f7.0x1f1fc.0x1f1f8.0x1f1e6.0x1f1f8.0x1f1e7.0x1f1f8.0x1f1e8.0x1f1f8.0x1f1e9.0x1f1f8.0x1f1ea.0x1f1f8.0x1f1ec.0x1f1f8.0x1f1ed.0x1f1f8.0x1f1ee.0x1f1f8.0x1f1ef.0x1f1f8.0x1f1f0.0x1f1f8.0x1f1f1.0x1f1f8.0x1f1f2.0x1f1f8.0x1f1f3.0x1f1f8.0x1f1f4.0x1f1f8.0x1f1f7.0x1f1f8.0x1f1f8.0x1f1f8.0x1f1f9.0x1f1f8.0x1f1fb.0x1f1f8.0x1f1fd.0x1f1f8.0x1f1fe.0x1f1f8.0x1f1ff.0x1f1f9.0x1f1e6.0x1f1f9.0x1f1e8.0x1f1f9.0x1f1e9.0x1f1f9.0x1f1eb.0x1f1f9.0x1f1ec.0x1f1f9.0x1f1ed.0x1f1f9.0x1f1ef.0x1f1f9.0x1f1f0.0x1f1f9.0x1f1f1.0x1f1f9.0x1f1f2.0x1f1f9.0x1f1f3.0x1f1f9.0x1f1f4.0x1f1f9.0x1f1f7.0x1f1f9.0x1f1f9.0x1f1f9.0x1f1fb.0x1f1f9.0x1f1fc.0x1f1f9.0x1f1ff.0x1f1fa.0x1f1e6.0x1f1fa.0x1f1ec.0x1f1fa.0x1f1f2.0x1f1fa.0x1f1f3.0x1f1fa.0x1f1f8.0x1f1fa.0x1f1fe.0x1f1fa.0x1f1ff.0x1f1fb.0x1f1e6.0x1f1fb.0x1f1e8.0x1f1fb.0x1f1ea.0x1f1fb.0x1f1ec.0x1f1fb.0x1f1ee.0x1f1fb.0x1f1f3.0x1f1fb.0x1f1fa.0x1f1fc.0x1f1eb.0x1f1fc.0x1f1f8.0x1f1fd.0x1f1f0.0x1f1fe.0x1f1ea.0x1f1fe.0x1f1f9.0x1f1ff.0x1f1e6.0x1f1ff.0x1f1f2.0x1f1ff.0x1f1fc.0x1f3f4.0xe0067.0xe0062.0xe0065.0xe006e.0xe0067.0xe007f.0x1f3f4.0xe0067.0xe0062.0xe0073.0xe0063.0xe0074.0xe007f.0x1f3f4.0xe0067.0xe0062.0xe0077.0xe006c.0xe0073.0xe007f".split(".")
			}
		}, x = Object.prototype.hasOwnProperty, S = Object.keys || function(e) {
			var t = [];
			for (var n in e) x.call(e, n) && t.push(n);
			return t;
		};
		function C(e, t) {
			for (var n = S(e), r, i = 0, a = n.length; i < a; i++) r = n[i], t[r] = e[r] || t[r];
		}
		function w(e, t) '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('{
			for (var n = 0, r = e.length; n < r; n++) t[n] = e[n];
		}
		function T(e, t) {
			var n = Array.isArray(e), r = t || (n ? Array(e.length) : {});
			return n ? w(e, r) : C(e, r), r;
		}
		u.prototype.get = function(e) {
			return T(b[e]);
		}, u.prototype.mac_address = function(e) {
			e = d(e), e.separator ||= e.networkVersion ? "." : ":";
			var t = "ABCDEF1234567890", n = "";
			return n = e.networkVersion ? this.n(this.string, 3, {
				pool: t,
				length: 4
			}).join(e.separator) : this.n(this.string, 6, {
				pool: t,
				length: 2
			}).join(e.separator), n;
		}, u.prototype.normal = function(e) {
			if (e = d(e, {
				mean: 0,
				dev: 1,
				pool: []
			}), p(e.pool.constructor !== Array, "Chance: The pool option must be a valid array."), p(typeof e.mean != "number", "Chance: Mean (mean) must be a number"), p(typeof e.dev != "number", "Chance: Standard deviation (dev) must be a number"), e.pool.length > 0) return this.normal_pool(e);
			var t, n, r, i, a = e.mean, o = e.dev;
			do
				n = this.random() * 2 - 1, r = this.random() * 2 - 1, t = n * n + r * r;
			while (t >= 1);
			return i = n * Math.sqrt(-2 * Math.log(t) / t), o * i + a;
		}, u.prototype.normal_pool = function(e) {
			var t = 0;
			do {
				var n = Math.round(this.normal({
					mean: e.mean,
					dev: e.dev
				}));
				if (n < e.pool.length && n >= 0) return e.pool[n];
				t++;
			} while (t < 100);
			throw RangeError("Chance: Your pool is too small for the given mean and standard deviation. Please adjust.");
		}, u.prototype.radio = function(e) {
			e = d(e, { side: "?" });
			var t = "";
			switch (e.side.toLowerCase()) {
				case "east":
				case "e":
					t = "W";
					break;
				case "west":
				case "w":
					t = "K";
					break;
				default:
					t = this.character({ pool: "KW" });
					break;
			}
			return t + this.character({
				alpha: !0,
				casing: "upper"
			}) + this.character({
				alpha: !0,
				casing: "upper"
			}) + this.character({
				alpha: !0,
				casing: "upp'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('er"
			});
		}, u.prototype.set = function(e, t) {
			typeof e == "string" ? b[e] = t : b = T(e, b);
		}, u.prototype.tv = function(e) {
			return this.radio(e);
		}, u.prototype.cnpj = function() {
			var e = this.n(this.natural, 8, { max: 9 }), t = 2 + e[7] * 6 + e[6] * 7 + e[5] * 8 + e[4] * 9 + e[3] * 2 + e[2] * 3 + e[1] * 4 + e[0] * 5;
			t = 11 - t % 11, t >= 10 && (t = 0);
			var n = t * 2 + 3 + e[7] * 7 + e[6] * 8 + e[5] * 9 + e[4] * 2 + e[3] * 3 + e[2] * 4 + e[1] * 5 + e[0] * 6;
			return n = 11 - n % 11, n >= 10 && (n = 0), "" + e[0] + e[1] + "." + e[2] + e[3] + e[4] + "." + e[5] + e[6] + e[7] + "/0001-" + t + n;
		}, u.prototype.emotion = function() {
			return this.pick(this.get("emotions"));
		}, u.prototype.mersenne_twister = function(e) {
			return new E(e);
		}, u.prototype.blueimp_md5 = function() {
			return new D();
		};
		var E = function(e) {
			e === void 0 && (e = Math.floor(Math.random() * 10 ** 13)), this.N = 624, this.M = 397, this.MATRIX_A = 2567483615, this.UPPER_MASK = 2147483648, this.LOWER_MASK = 2147483647, this.mt = Array(this.N), this.mti = this.N + 1, this.init_genrand(e);
		};
		E.prototype.init_genrand = function(e) {
			for (this.mt[0] = e >>> 0, this.mti = 1; this.mti < this.N; this.mti++) e = this.mt[this.mti - 1] ^ this.mt[this.mti - 1] >>> 30, this.mt[this.mti] = (((e & 4294901760) >>> 16) * 1812433253 << 16) + (e & 65535) * 1812433253 + this.mti, this.mt[this.mti] >>>= 0;
		}, E.prototype.init_by_array = function(e, t) {
			var n = 1, r = 0, i, a;
			for (this.init_genrand(19650218), i = this.N > t ? this.N : t; i; i--) a = this.mt[n - 1] ^ this.mt[n - 1] >>> 30, this.mt[n] = (this.mt[n] ^ (((a & 4294901760) >>> 16) * 1664525 << 16) + (a & 65535) * 1664525) + e[r] + r, this.mt[n] >>>= 0, n++, r++, n >= this.N && (this.mt[0] = this.mt[this.N - 1], n = 1), r >= t && (r = 0);
			for (i = this.N - 1; i; i--) a = this.mt[n - 1] ^ this.mt[n - 1] >>> 30, this.mt[n] = (this.mt[n] ^ (((a & 4294901760) >>> 16) * 1566083941 << 16) + (a'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' & 65535) * 1566083941) - n, this.mt[n] >>>= 0, n++, n >= this.N && (this.mt[0] = this.mt[this.N - 1], n = 1);
			this.mt[0] = 2147483648;
		}, E.prototype.genrand_int32 = function() {
			var e, t = [0, this.MATRIX_A];
			if (this.mti >= this.N) {
				var n;
				for (this.mti === this.N + 1 && this.init_genrand(5489), n = 0; n < this.N - this.M; n++) e = this.mt[n] & this.UPPER_MASK | this.mt[n + 1] & this.LOWER_MASK, this.mt[n] = this.mt[n + this.M] ^ e >>> 1 ^ t[e & 1];
				for (; n < this.N - 1; n++) e = this.mt[n] & this.UPPER_MASK | this.mt[n + 1] & this.LOWER_MASK, this.mt[n] = this.mt[n + (this.M - this.N)] ^ e >>> 1 ^ t[e & 1];
				e = this.mt[this.N - 1] & this.UPPER_MASK | this.mt[0] & this.LOWER_MASK, this.mt[this.N - 1] = this.mt[this.M - 1] ^ e >>> 1 ^ t[e & 1], this.mti = 0;
			}
			return e = this.mt[this.mti++], e ^= e >>> 11, e ^= e << 7 & 2636928640, e ^= e << 15 & 4022730752, e ^= e >>> 18, e >>> 0;
		}, E.prototype.genrand_int31 = function() {
			return this.genrand_int32() >>> 1;
		}, E.prototype.genrand_real1 = function() {
			return this.genrand_int32() * (1 / 4294967295);
		}, E.prototype.random = function() {
			return this.genrand_int32() * (1 / 4294967296);
		}, E.prototype.genrand_real3 = function() {
			return (this.genrand_int32() + .5) * (1 / 4294967296);
		}, E.prototype.genrand_res53 = function() {
			var e = this.genrand_int32() >>> 5, t = this.genrand_int32() >>> 6;
			return (e * 67108864 + t) * (1 / 9007199254740992);
		};
		var D = function() {};
		D.prototype.VERSION = "1.0.1", D.prototype.safe_add = function(e, t) {
			var n = (e & 65535) + (t & 65535);
			return (e >> 16) + (t >> 16) + (n >> 16) << 16 | n & 65535;
		}, D.prototype.bit_roll = function(e, t) {
			return e << t | e >>> 32 - t;
		}, D.prototype.md5_cmn = function(e, t, n, r, i, a) {
			return this.safe_add(this.bit_roll(this.safe_add(this.safe_add(t, e), this.safe_add(r, a)), i), n);
		}, D.prototype.md5_ff = function(e, t, n, r, i, a, o) {
			return this.md5_cmn'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('(t & n | ~t & r, e, t, i, a, o);
		}, D.prototype.md5_gg = function(e, t, n, r, i, a, o) {
			return this.md5_cmn(t & r | n & ~r, e, t, i, a, o);
		}, D.prototype.md5_hh = function(e, t, n, r, i, a, o) {
			return this.md5_cmn(t ^ n ^ r, e, t, i, a, o);
		}, D.prototype.md5_ii = function(e, t, n, r, i, a, o) {
			return this.md5_cmn(n ^ (t | ~r), e, t, i, a, o);
		}, D.prototype.binl_md5 = function(e, t) {
			e[t >> 5] |= 128 << t % 32, e[(t + 64 >>> 9 << 4) + 14] = t;
			var n, r, i, a, o, s = 1732584193, c = -271733879, l = -1732584194, u = 271733878;
			for (n = 0; n < e.length; n += 16) r = s, i = c, a = l, o = u, s = this.md5_ff(s, c, l, u, e[n], 7, -680876936), u = this.md5_ff(u, s, c, l, e[n + 1], 12, -389564586), l = this.md5_ff(l, u, s, c, e[n + 2], 17, 606105819), c = this.md5_ff(c, l, u, s, e[n + 3], 22, -1044525330), s = this.md5_ff(s, c, l, u, e[n + 4], 7, -176418897), u = this.md5_ff(u, s, c, l, e[n + 5], 12, 1200080426), l = this.md5_ff(l, u, s, c, e[n + 6], 17, -1473231341), c = this.md5_ff(c, l, u, s, e[n + 7], 22, -45705983), s = this.md5_ff(s, c, l, u, e[n + 8], 7, 1770035416), u = this.md5_ff(u, s, c, l, e[n + 9], 12, -1958414417), l = this.md5_ff(l, u, s, c, e[n + 10], 17, -42063), c = this.md5_ff(c, l, u, s, e[n + 11], 22, -1990404162), s = this.md5_ff(s, c, l, u, e[n + 12], 7, 1804603682), u = this.md5_ff(u, s, c, l, e[n + 13], 12, -40341101), l = this.md5_ff(l, u, s, c, e[n + 14], 17, -1502002290), c = this.md5_ff(c, l, u, s, e[n + 15], 22, 1236535329), s = this.md5_gg(s, c, l, u, e[n + 1], 5, -165796510), u = this.md5_gg(u, s, c, l, e[n + 6], 9, -1069501632), l = this.md5_gg(l, u, s, c, e[n + 11], 14, 643717713), c = this.md5_gg(c, l, u, s, e[n], 20, -373897302), s = this.md5_gg(s, c, l, u, e[n + 5], 5, -701558691), u = this.md5_gg(u, s, c, l, e[n + 10], 9, 38016083), l = this.md5_gg(l, u, s, c, e[n + 15], 14, -660478335), c = this.md5_gg(c, l, u, s, e[n + 4], 20, -405537848), s = this.md5_gg(s, c, l, u, e[n + 9], 5, 568446438), u = this.md5'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('_gg(u, s, c, l, e[n + 14], 9, -1019803690), l = this.md5_gg(l, u, s, c, e[n + 3], 14, -187363961), c = this.md5_gg(c, l, u, s, e[n + 8], 20, 1163531501), s = this.md5_gg(s, c, l, u, e[n + 13], 5, -1444681467), u = this.md5_gg(u, s, c, l, e[n + 2], 9, -51403784), l = this.md5_gg(l, u, s, c, e[n + 7], 14, 1735328473), c = this.md5_gg(c, l, u, s, e[n + 12], 20, -1926607734), s = this.md5_hh(s, c, l, u, e[n + 5], 4, -378558), u = this.md5_hh(u, s, c, l, e[n + 8], 11, -2022574463), l = this.md5_hh(l, u, s, c, e[n + 11], 16, 1839030562), c = this.md5_hh(c, l, u, s, e[n + 14], 23, -35309556), s = this.md5_hh(s, c, l, u, e[n + 1], 4, -1530992060), u = this.md5_hh(u, s, c, l, e[n + 4], 11, 1272893353), l = this.md5_hh(l, u, s, c, e[n + 7], 16, -155497632), c = this.md5_hh(c, l, u, s, e[n + 10], 23, -1094730640), s = this.md5_hh(s, c, l, u, e[n + 13], 4, 681279174), u = this.md5_hh(u, s, c, l, e[n], 11, -358537222), l = this.md5_hh(l, u, s, c, e[n + 3], 16, -722521979), c = this.md5_hh(c, l, u, s, e[n + 6], 23, 76029189), s = this.md5_hh(s, c, l, u, e[n + 9], 4, -640364487), u = this.md5_hh(u, s, c, l, e[n + 12], 11, -421815835), l = this.md5_hh(l, u, s, c, e[n + 15], 16, 530742520), c = this.md5_hh(c, l, u, s, e[n + 2], 23, -995338651), s = this.md5_ii(s, c, l, u, e[n], 6, -198630844), u = this.md5_ii(u, s, c, l, e[n + 7], 10, 1126891415), l = this.md5_ii(l, u, s, c, e[n + 14], 15, -1416354905), c = this.md5_ii(c, l, u, s, e[n + 5], 21, -57434055), s = this.md5_ii(s, c, l, u, e[n + 12], 6, 1700485571), u = this.md5_ii(u, s, c, l, e[n + 3], 10, -1894986606), l = this.md5_ii(l, u, s, c, e[n + 10], 15, -1051523), c = this.md5_ii(c, l, u, s, e[n + 1], 21, -2054922799), s = this.md5_ii(s, c, l, u, e[n + 8], 6, 1873313359), u = this.md5_ii(u, s, c, l, e[n + 15], 10, -30611744), l = this.md5_ii(l, u, s, c, e[n + 6], 15, -1560198380), c = this.md5_ii(c, l, u, s, e[n + 13], 21, 1309151649), s = this.md5_ii(s, c, l, u, e[n + 4], 6, -145523070), u = this.md5_ii(u, s, c, l, e[n + 11], 1'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('0, -1120210379), l = this.md5_ii(l, u, s, c, e[n + 2], 15, 718787259), c = this.md5_ii(c, l, u, s, e[n + 9], 21, -343485551), s = this.safe_add(s, r), c = this.safe_add(c, i), l = this.safe_add(l, a), u = this.safe_add(u, o);
			return [
				s,
				c,
				l,
				u
			];
		}, D.prototype.binl2rstr = function(e) {
			var t, n = "";
			for (t = 0; t < e.length * 32; t += 8) n += String.fromCharCode(e[t >> 5] >>> t % 32 & 255);
			return n;
		}, D.prototype.rstr2binl = function(e) {
			var t, n = [];
			for (n[(e.length >> 2) - 1] = void 0, t = 0; t < n.length; t += 1) n[t] = 0;
			for (t = 0; t < e.length * 8; t += 8) n[t >> 5] |= (e.charCodeAt(t / 8) & 255) << t % 32;
			return n;
		}, D.prototype.rstr_md5 = function(e) {
			return this.binl2rstr(this.binl_md5(this.rstr2binl(e), e.length * 8));
		}, D.prototype.rstr_hmac_md5 = function(e, t) {
			var n, r = this.rstr2binl(e), i = [], a = [], o;
			for (i[15] = a[15] = void 0, r.length > 16 && (r = this.binl_md5(r, e.length * 8)), n = 0; n < 16; n += 1) i[n] = r[n] ^ 909522486, a[n] = r[n] ^ 1549556828;
			return o = this.binl_md5(i.concat(this.rstr2binl(t)), 512 + t.length * 8), this.binl2rstr(this.binl_md5(a.concat(o), 640));
		}, D.prototype.rstr2hex = function(e) {
			var t = "0123456789abcdef", n = "", r, i;
			for (i = 0; i < e.length; i += 1) r = e.charCodeAt(i), n += t.charAt(r >>> 4 & 15) + t.charAt(r & 15);
			return n;
		}, D.prototype.str2rstr_utf8 = function(e) {
			return unescape(encodeURIComponent(e));
		}, D.prototype.raw_md5 = function(e) {
			return this.rstr_md5(this.str2rstr_utf8(e));
		}, D.prototype.hex_md5 = function(e) {
			return this.rstr2hex(this.raw_md5(e));
		}, D.prototype.raw_hmac_md5 = function(e, t) {
			return this.rstr_hmac_md5(this.str2rstr_utf8(e), this.str2rstr_utf8(t));
		}, D.prototype.hex_hmac_md5 = function(e, t) {
			return this.rstr2hex(this.raw_hmac_md5(e, t));
		}, D.prototype.md5 = function(e, t, n) {
			return t ? n ? this.raw_hmac_md5(t, e) : this.hex_hmac_md5(t, e) : n'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' ? this.raw_md5(e) : this.hex_md5(e);
		}, e !== void 0 && (t !== void 0 && t.exports && (e = t.exports = u), e.Chance = u), typeof define == "function" && define.amd && define([], function() {
			return u;
		}), typeof importScripts < "u" && (chance = new u(), self.Chance = u), typeof window == "object" && typeof window.document == "object" && (window.Chance = u, window.chance = new u());
	})();
})))(), 1);
function fe(e, t, n, r) {
	let i = new de.default(N++), a = n.toUpperCase(), o = e.toUpperCase(), s = t.toUpperCase();
	if (r != null && 0 < r.length) {
		let e = r.length, t = r[Math.floor(P() * (e - 0)) + 0];
		return !a.startsWith("INTEGER") && !a.startsWith("NUMBER") && !a.startsWith("DATE") && (!t.toLowerCase || t.toLowerCase() !== "null") && (!t.charAt || t.charAt(0) !== "q" && t.charAt(1) !== "''") && (t.charAt && t.charAt(0) === "''" && (t = t.substring(1, t.length - 1)), t = t.split("''").join("''''"), t = "''" + t + "''"), t;
	}
	if (s === "NAME" && 0 <= o.indexOf("DEPARTMENT")) {
		let e = [
			"Sales",
			"Finance",
			"Delivery",
			"Manufacturing"
		];
		return "''" + e[Math.floor(P() * e.length)] + "''";
	}
	if (i[s.toLowerCase()] !== void 0 && s.indexOf("NAME") < 0) return "''" + i[s.toLowerCase()]() + "''";
	if (s === "FIRST_NAME") return "''" + i.first() + "''";
	if (s === "LAST_NAME") return "''" + i.last() + "''";
	if (0 <= s.indexOf("NAME")) return "''" + i.name() + "''";
	if (0 < s.indexOf("ADDRESS")) return "''" + i.address() + "''";
	if (s === "LOCATION") return "''" + i.city() + "''";
	if (s === "DESCRIPTION") {
		let e = i.paragraph({ sentences: 2 }), t = x(n, !1, !0, ""), r = 400, a = -1;
		for (let e = 0; e < t.length; e++) {
			let n = t[e].value;
			if (n === "(") {
				a = e + 1;
				continue;
			}
			if (0 < a && n === ")") {
				r = parseInt(t[a].value);
				break;
			}
		}
		return r < e.length && (e = e.substring(0, r)), "''" + e + "''";
	}
	if (s === "JOB") {
		let e = [
			"Engineer",
			"Consultant",
			"Architect",
			"Mana'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ger",
			"Analyst",
			"Specialist",
			"Evangelist",
			"Salesman"
		];
		return "''" + e[Math.floor(P() * e.length)] + "''";
	}
	return a.startsWith("INTEGER") || a.startsWith("NUMBER") ? Math.floor(P() * 100) : a.startsWith("DATE") || a.startsWith("TIMESTAMP") ? "sysdate-" + Math.floor(P() * 100) : a === "BLOB" || a === "LONG" ? "null" : "''N/A''";
}
var N = 1;
function pe() {
	N = 1;
}
function P() {
	let e = Math.sin(N++) * 1e4;
	return e - Math.floor(e);
}
//#endregion
//#region src/compiler/base-generator.ts
function me(e) {
	return e.lastIndexOf(",\n") === e.length - 2 && (e = e.substring(0, e.length - 2) + "\n"), e;
}
function he(e, t, n, r) {
	let i = [];
	if (typeof e != "object" || !e) return null;
	let a = e[n];
	a != null && t === r && i.push(a);
	for (let t in e) {
		let a = e[t], o = he(a, t, n, r);
		o !== null && (i = i.concat(o));
	}
	return i;
}
var ge = class {
	constructor(e) {
		this._ddl = e;
	}
	_fkColType(e) {
		let t = e.getExplicitPkName();
		if (t == null || t.includes(",")) return null;
		let n = e.findChild(t);
		return n == null ? e.getPkType() : this.colType(n._inferTypeFull());
	}
	generateERD() {
		let e = this._ddl.descendants(), t = {
			items: [],
			links: []
		};
		for (let n of e) {
			if (n.inferType() !== "table") continue;
			let e = {
				name: this._ddl.objPrefix("no schema") + n.parseName(),
				schema: this._ddl.getOptionValue("schema") || null,
				columns: []
			};
			t.items.push(e);
			let r = n.getGenIdColName();
			if (r != null && !n.isOption("pk")) e.columns.push({
				name: r,
				datatype: "number"
			});
			else {
				let t = n.getExplicitPkName();
				if (t != null && !t.includes(",")) {
					let r = n.findChild(t);
					e.columns.push({
						name: t,
						datatype: r ? this.colType(r._inferTypeFull()) : "number"
					});
				}
			}
			n.lateInitFks();
			for (let t in n.fks ?? {}) {
				let r = n.fks[t];
				if (t.includes(",")) {
					let n = this._ddl.find(r);
					for (let r of m(t, ", ")) {
						if '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('(r === ",") continue;
						let t = n?.findChild(r);
						e.columns.push({
							name: r,
							datatype: t ? this.colType(t._inferTypeFull()) : "number"
						});
					}
					continue;
				}
				let i = n.findChild(t), a = i ? i.inferType() : "number", o = t, s = this._ddl.find(r);
				s == null ? this._ddl.find(t)?.isMany2One?.() && !t.endsWith("_id") && (o = (l(t) ?? t) + "_id") : a = this._fkColType(s) ?? a, e.columns.push({
					name: o,
					datatype: a
				});
			}
			let i = n.getExplicitPkName();
			for (let t of n.children) if (t.inferType() !== "table" && t.refId() == null && t.parseName() !== i && (e.columns.push({
				name: t.parseName(),
				datatype: this.colType(t._inferTypeFull())
			}), t.indexOf("file") > 0)) {
				let n = t.parseName(), r = {
					base: "varchar",
					varcharLen: 255,
					colName: n,
					needsBoolCheck: !1,
					isNativeBoolean: !1,
					parent_child: ""
				}, i = {
					base: "date",
					colName: n,
					needsBoolCheck: !1,
					isNativeBoolean: !1,
					parent_child: ""
				};
				e.columns.push({
					name: n + "_filename",
					datatype: this.colType(r)
				}), e.columns.push({
					name: n + "_mimetype",
					datatype: this.colType(r)
				}), e.columns.push({
					name: n + "_charset",
					datatype: this.colType(r)
				}), e.columns.push({
					name: n + "_lastupd",
					datatype: this.colType(i)
				});
			}
			let a = n.trimmedContent().toUpperCase();
			if ((this._ddl.optionEQvalue("rowkey", !0) || a.includes("/ROWKEY")) && e.columns.push({
				name: "row_key",
				datatype: this.colType({
					base: "varchar",
					varcharLen: 30,
					colName: "row_key",
					needsBoolCheck: !1,
					isNativeBoolean: !1,
					parent_child: ""
				})
			}), (this._ddl.optionEQvalue("rowVersion", "yes") || a.includes("/ROWVERSION")) && e.columns.push({
				name: "row_version",
				datatype: "integer"
			}), this._ddl.optionEQvalue("Audit Columns", "yes") || a.includes("/AUDITCOLS")) {
				let t = this._ddl.getOptionValue("auditda'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('te") || "";
				t ||= this._ddl.getOptionValue("Date Data Type") ?? "date";
				let n = {
					base: t.toLowerCase(),
					colName: "",
					needsBoolCheck: !1,
					isNativeBoolean: !1,
					parent_child: ""
				}, r = {
					base: "varchar",
					varcharLen: 255,
					colName: "",
					needsBoolCheck: !1,
					isNativeBoolean: !1,
					parent_child: ""
				};
				e.columns.push({
					name: this._ddl.getOptionValue("createdcol"),
					datatype: this.colType(n)
				}), e.columns.push({
					name: this._ddl.getOptionValue("createdbycol"),
					datatype: this.colType(r)
				}), e.columns.push({
					name: this._ddl.getOptionValue("updatedcol"),
					datatype: this.colType(n)
				}), e.columns.push({
					name: this._ddl.getOptionValue("updatedbycol"),
					datatype: this.colType(r)
				});
			}
			this._ddl.optionEQvalue("tenantid", !0) && !n.isOption("notenantid") && n.findChild("tenant_id") === null && e.columns.push({
				name: "tenant_id",
				datatype: this.colType({
					base: "number",
					colName: "tenant_id",
					needsBoolCheck: !1,
					isNativeBoolean: !1,
					parent_child: ""
				})
			});
		}
		for (let n of e) if (n.inferType() === "table") {
			this.generateDDL(n);
			for (let e in n.fks ?? {}) {
				let r = n.fks[e], i = this._ddl.find(r);
				if (i == null) continue;
				let a = i.getExplicitPkName() ?? "id", o = n.findChild(e), s = o == null || o.isOption("nn") || o.isOption("notnull"), c = {
					source: this._ddl.objPrefix("no schema") + r,
					source_id: a,
					target: this._ddl.objPrefix("no schema") + n.parseName(),
					target_id: e
				};
				s && (c.mandatory = s), t.links.push(c);
			}
		}
		if (this._ddl.optionEQvalue("tenantid", !0)) {
			let n = String(this._ddl.getOptionValue("tenantref") || "tenants"), r = this._ddl.find(n);
			if (r != null) {
				let i = r.getExplicitPkName() ?? "id", a = this._ddl.objPrefix("no schema") + n;
				for (let n of e) n.inferType() === "table" && (n.isOption("notenantid") || n.findChild("tenant_id") '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('=== null && t.links.push({
					source: a,
					source_id: i,
					target: this._ddl.objPrefix("no schema") + n.parseName(),
					target_id: "tenant_id",
					mandatory: !0
				}));
			}
		}
		let n = {};
		for (let t of e) {
			if (t.inferType() !== "table") continue;
			let e = t.getAnnotationValue("TGROUP");
			e != null && (n[e] || (n[e] = []), n[e].push(this._ddl.objPrefix("no schema") + t.parseName()));
		}
		return Object.keys(n).length > 0 && (t.groups = n), t;
	}
	identityRestartSql(e, t, n) {
		return "";
	}
	_isContainedIn(e, t) {
		for (let n of t) if (n.parseName() === e.parseName()) return !0;
		return !1;
	}
	_orderedTableNodes(e) {
		let t = [e];
		for (let n of e.descendants().slice(1)) n.children.length !== 0 && (n.isMany2One() ? this._isContainedIn(n, t) || t.unshift(n) : this._isContainedIn(n, t) || t.push(n));
		return t;
	}
	generateData(e, t) {
		if (pe(), this._ddl.optionEQvalue("inserts", !1)) return "";
		let n = this.inserts4tbl(e, t), r = this._orderedTableNodes(e), i = "";
		for (let e of r) {
			let t = n[this._ddl.objPrefix() + e.parseName()];
			t != null && (i += t);
		}
		return i;
	}
	inserts4tbl(e, t) {
		let n = {};
		if (this._ddl.optionEQvalue("inserts", !1)) return {};
		let r = this._ddl.objPrefix() + e.parseName(), i = "";
		for (let n = 0; n < e.cardinality(); n++) {
			let a = null;
			if (t != null) {
				let e = t[r];
				e != null && Array.isArray(e) && (a = e[n]);
			}
			i += this._buildInsertStatement(e, n, a, r);
		}
		i !== "" && (i += "\ncommit;\n\n");
		let a = e.getGenIdColName();
		a != null && 1 < e.cardinality() && !this._ddl.optionEQvalue("pk", "guid") && (i += this.identityRestartSql(r, a, e.cardinality() + 1)), n[r] = i;
		for (let r of e.children) r.children.length > 0 && (n = {
			...n,
			...this.inserts4tbl(r, t)
		});
		return n;
	}
	_buildInsertStatement(e, t, n, r) {
		let i = "insert into " + r + " (\n", a = e.getGenIdColName(), o = null, s = null;
		a == null ? (o = e.getExplicitPkName(), o != nul'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('l && (i += O + o + ",\n")) : (o = a, i += O + o + ",\n");
		for (let t in e.fks ?? {}) {
			let n = e.fks[t], r = "", a = this._ddl.find(n);
			a ?? (a = this._ddl.find(t), a?.isMany2One?.() && !t.endsWith("_id") && (n = t, t = l(t) ?? t, r = "_id")), i += O + t + r + ",\n";
		}
		for (let t of e.regularColumns()) a != null && t.parseName() === "id" || t.isOption("pk") || (i += O + t.parseName() + ",\n");
		if (i = me(i), i += ") values (\n", a != null) s = t + 1, i += O + s + ",\n";
		else if (o != null) {
			let r = o, a = he(this._ddl.data, null, r, e.parseName()), c = -1;
			n != null && (c = n[r]), a != null && a[t] != null && (c = a[t]), c !== -1 && typeof c == "string" && (c = "''" + c + "''"), s = c === -1 ? t + 1 : c, i += O + s + ",\n";
		}
		for (let t in e.fks ?? {}) {
			let a = e.fks[t], { type: o, values: c } = this._resolveFkSampleValues(e, t, a, n, s, r), u = String(this._ddl.getOptionValue("Data Language") ?? "EN");
			i += O + String(ue(u, fe(r, (l(a) ?? a) + "_id", o, c))) + ",\n";
		}
		for (let t of e.regularColumns()) {
			if (a != null && t.parseName() === "id" || t.parseName() === e.getExplicitPkName()) continue;
			let o = t.parseValues(), s = t.parseName();
			if (n != null) {
				let e = n[s];
				e != null && (o = [e]);
			}
			let c = String(this._ddl.getOptionValue("Data Language") ?? "EN"), l = fe(r, s, this.colType(t._inferTypeFull()), o);
			i += O + String(ue(c, l)) + ",\n";
		}
		return i = me(i), i += ");\n", i;
	}
	_resolveFkSampleValues(e, t, n, r, i, a) {
		let o = this._ddl.find(n), s = [], c = "INTEGER";
		for (let e = 1; e <= (o?.cardinality() ?? 0); e++) s.push(e);
		if (r != null) {
			let e = r, l = e[t];
			if (l != null) typeof l == "string" && (c = "STRING"), s = [l];
			else {
				let r = a + "_" + n, l = this._ddl.data?.[r];
				if (l != null) for (let e in l) {
					let n = l[e];
					if (n[a + "_id"] === i) {
						let e = n[t];
						e != null && (typeof e == "string" && (c = "STRING"), s = [e]);
						break;
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		}
				}
				else {
					let t = o?.getPkName() ?? null, n = t == null ? void 0 : e[t];
					n != null && (typeof n == "string" && (c = "STRING"), s = [n]);
				}
			}
		}
		return {
			type: c,
			values: s
		};
	}
}, _e = "generated by default on null as identity";
function F(e, t, n) {
	switch (e.base) {
		case "varchar": return `varchar2(${e.varcharLen ?? 4e3}${t})`;
		case "number": return e.numericSpec ? `number${e.numericSpec}` : "number";
		case "integer": return "integer";
		case "date": return "date";
		case "timestamp": return "timestamp";
		case "tswtz": return "timestamp with time zone";
		case "tswltz": return "timestamp with local time zone";
		case "clob": return "clob";
		case "blob": return "blob";
		case "boolean": return "boolean";
		case "geometry": return "sdo_geometry";
		case "json": return n ? "json" : `clob check (${e.colName} is json)`;
		case "vector": return `vector${e.vectorSpec ?? "(*,*,*)"}`;
		default: return e.base;
	}
}
function I(e) {
	let t = e.getOptionValue("db");
	return t != null && t.length > 0 && 23 <= (p(t) ?? 0);
}
function ve(e, t, n) {
	return t.optionEQvalue("pk", "identityDataType") ? _e : t.optionEQvalue("pk", "seq") ? ("default on null " + e + n.seq + ".NEXTVAL ").toLowerCase() : t.optionEQvalue("pk", "guid") ? "default on null to_number(sys_guid(), ''XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'') " : "not null";
}
//#endregion
//#region src/oracle/view.ts
function ye(e) {
	return e.lastIndexOf(",\n") === e.length - 2 && (e = e.substring(0, e.length - 2) + "\n"), e;
}
var be = class {
	constructor(e, t) {
		this.ctx = e, this.naming = t;
	}
	generateView(e) {
		if (e.inferType() !== "view" && e.inferType() !== "dv") return "";
		if (this.ctx.optionEQvalue("Duality View", "yes") || e.inferType() === "dv") try {
			return this.generateDualityView(e);
		} catch (t) {
			if (t.message === e.one2many2oneUnsupoorted) return "";
			throw t;
		}
		let t = this.ctx.objPrefix() + e.parseName(), n = e.src, r = this._buildViewSetup(e, n)'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(';
		if (r === null) return "";
		let i = "create or replace view " + t;
		e.annotations !== null && (i += "\nannotations (" + e.annotations + ")"), i += " as\n", i += "select\n", i += this._buildViewColList(e, n, r.aliasMap, r.tblCache, r.colCnts, r.tblTransCols, r.maxLen), i = ye(i);
		let { sortedTables: a, joinConditions: o } = this._sortViewTables(e, n, r.tblCache);
		if (i += "from\n", i += this._buildViewFromClause(e, a, r.aliasMap, o, r.tblTransCols, r.tblCache), this.ctx.optionEQvalue("tenantid", !0) && a.length > 0) {
			let e = r.tblCache[a[0]];
			if (e !== null && !e.children.some((e) => e.parseName().toLowerCase() === "tenant_id")) {
				let e = r.aliasMap[a[0]], t = (this.ctx.objPrefix() + "tenant_ctx").toLowerCase();
				i += "where " + e + ".tenant_id = " + t + ".get_id\n";
			}
		}
		return i = i.toLowerCase(), i.endsWith("\n") && (i = i.trimEnd()), i.endsWith("\n") || (i += "\n"), this.ctx.optionEQvalue("readonlyviews", !0) && (i += "\nwith read only"), i += "\n/\n", i.toLowerCase();
	}
	_buildViewSetup(e, t) {
		let n = {}, r = {};
		for (let e = 2; e < t.length; e++) n[t[e].value] = C(t[e].value), r[t[e].value] = this.ctx.find(t[e].value);
		let i = 0;
		for (let e = 2; e < t.length; e++) {
			let a = r[t[e].value];
			if (a === null) return null;
			let o = n[t[e].value], s = (o + ".id").length;
			i < s && (i = s);
			for (let e of a.children) s = (o + "." + e.parseName()).length, i < s && (i = s);
		}
		let a = {};
		for (let e = 2; e < t.length; e++) {
			let n = r[t[e].value];
			if (n !== null) for (let e of n.children) a[e.parseName()] = (a[e.parseName()] ?? 0) + 1;
		}
		for (let e = 2; e < t.length; e++) {
			let n = (l(t[e].value) ?? t[e].value) + "_id";
			a[n] = (a[n] ?? 0) + 1;
		}
		let o = {};
		for (let e = 2; e < t.length; e++) {
			let n = r[t[e].value];
			if (n !== null) {
				let r = n.getTransColumns();
				if (r.length > 0) {
					let n = {};
					for (let e of r) n[e.parseName()] = !0;
					o[t[e].value] = n;
				}
			}
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('}
		return {
			aliasMap: n,
			tblCache: r,
			maxLen: i,
			colCnts: a,
			tblTransCols: o
		};
	}
	_buildViewColList(e, t, n, r, i, a, o) {
		let s = "";
		for (let e = 2; e < t.length; e++) {
			let c = r[t[e].value];
			if (c === null) continue;
			let u = t[e].value, d = n[u], f = a[u] ?? {}, p = " ".repeat(o - (d.length + 1 + 2));
			s += O + d + ".id" + O + p + (l(u) ?? u) + "_id,\n";
			for (let e of c.children) if (e.children.length === 0) {
				let t = e.parseName(), n = "";
				if (1 < (i[t] ?? 0) && (n = (l(u) ?? u) + "_"), f[t]) {
					let e = `coalesce(${"t_" + u}.trans_${t}, ${d}.${t})`;
					s += O + e + O + n + t + ",\n";
				} else {
					let e = " ".repeat(o - (d.length + 1 + t.length));
					s += O + d + "." + t + O + e + n + t + ",\n";
				}
			}
			if (c.hasRowVersion()) {
				let e = O + " ".repeat(c.maxChildNameLen() - 11);
				s += O + d + ".row_version" + e + (l(u) ?? u) + "_row_version,\n";
			}
			if (c.hasRowKey()) {
				let e = O + " ".repeat(c.maxChildNameLen() - 7);
				s += O + d + ".ROW_KEY" + e + (l(u) ?? u) + "_ROW_KEY,\n";
			}
			if (c.hasAuditCols()) for (let e of [
				"createdcol",
				"createdbycol",
				"updatedcol",
				"updatedbycol"
			]) {
				let t = String(this.ctx.getOptionValue(e) ?? ""), n = O + " ".repeat(c.maxChildNameLen() - t.length);
				s += O + d + "." + t + n + (l(u) ?? u) + "_" + t + ",\n";
			}
		}
		return s;
	}
	_sortViewTables(e, t, n) {
		let r = {};
		for (let e = 2; e < t.length; e++) r[t[e].value] = !0;
		let i = {};
		for (let e = 2; e < t.length; e++) {
			let a = t[e].value, o = n[a];
			if (o !== null) for (let e in o.fks) {
				let t = o.fks[e];
				r[t] && t !== a && (i[a] || (i[a] = []), i[a].push({
					fkCol: e,
					parentTable: t
				}));
			}
		}
		let a = {}, o = [];
		for (let e = 2; e < t.length; e++) {
			let n = t[e].value;
			i[n] || (o.push(n), a[n] = !0);
		}
		let s = [];
		for (let e = 2; e < t.length; e++) i[t[e].value] && s.push(t[e].value);
		for (; s.length > 0;) {
			let'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' e = !1, t = [];
			for (let n of s) i[n].every((e) => a[e.parentTable]) ? (o.push(n), a[n] = !0, e = !0) : t.push(n);
			if (s = t, !e) {
				for (let e of s) o.push(e), a[e] = !0;
				break;
			}
		}
		return {
			sortedTables: o,
			joinConditions: i
		};
	}
	_buildViewFromClause(e, t, n, r, i, a) {
		let o = "", s = this.ctx.getOptionValue("transcontext");
		for (let e = 0; e < t.length; e++) {
			let c = t[e], u = n[c], d = u;
			if (this.ctx.objPrefix() && (d = this.ctx.objPrefix() + c + " " + u), e === 0) o += O + d + "\n";
			else if (r[c]) {
				let e = r[c];
				o += O + "left join " + d + "\n";
				for (let t = 0; t < e.length; t++) {
					let r = n[e[t].parentTable], i = t === 0 ? "on " : "and ";
					o += O + O + i + u + "." + e[t].fkCol + " = " + r + ".id\n";
				}
			} else o += O + "cross join " + d + "\n";
			if (i[c]) {
				let e = a[c], t = this.ctx.objPrefix() + c + "_trans", n = "t_" + c, r = (l(c) ?? c) + "_id", i = e.getGenIdColName() ?? e.getExplicitPkName() ?? "id";
				o += O + "left join " + t + " " + n + "\n", o += O + O + "on " + n + "." + r + " = " + u + "." + i + "\n", o += O + O + "and " + n + ".language_code = " + s + "\n";
			}
		}
		return o;
	}
	generateDualityView(e) {
		let t = e.src;
		if (t.length < 3) return "/* duality view requires at least a view name and one table */\n";
		let n = this.ctx.objPrefix() + t[0].value, r = t[2].value, i = this.ctx.find(r);
		if (i === null) return "/* duality view: table " + r + " not found */\n";
		i.lateInitFks();
		let a = "create or replace json relational duality view " + n + " as\n";
		a += this.ctx.objPrefix() + i.parseName() + " @insert @update @delete\n", a += "{\n";
		let o = i.getGenIdColName() ?? i.getExplicitPkName() ?? "id", s = 3;
		for (let e of i.children) {
			if (e.children.length > 0 || e.refId() !== null) continue;
			let t = e.parseName().length;
			t > s && (s = t);
		}
		for (let e = 3; e < t.length; e++) {
			let n = t[e].value.length;
			n > s && (s = n);
		}
		a += '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('O + "_id" + " ".repeat(s - 3) + " : " + o + ",\n";
		let c = {};
		if (i.fks !== null) for (let e in i.fks) c[e] = !0;
		for (let e of i.regularColumns()) {
			let t = e.parseName();
			t === o || c[t] || (a += O + t + " ".repeat(s - t.length) + " : " + t + ",\n");
		}
		for (let e = 3; e < t.length; e++) {
			let n = t[e].value, r = this.ctx.find(n);
			if (r === null) continue;
			r.lateInitFks();
			let o = !1;
			if (r.fks !== null) {
				for (let e in r.fks) if (r.fks[e] === i.parseName()) {
					o = !0;
					break;
				}
			}
			let c = r.getGenIdColName() ?? r.getExplicitPkName() ?? "id", l = 3;
			for (let e of r.children) {
				if (e.children.length > 0 || e.refId() !== null) continue;
				let t = e.parseName().length;
				t > l && (l = t);
			}
			let u = {};
			if (r.fks !== null) for (let e in r.fks) u[e] = !0;
			let d = o ? "[{\n" : "{\n", f = o ? "}]" : "}";
			a += O + n + " ".repeat(s - n.length) + " : " + this.ctx.objPrefix() + r.parseName() + " @insert @update @delete\n", a += O + d, a += O + O + "_id" + " ".repeat(l - 3) + " : " + c + ",\n";
			for (let e of r.regularColumns()) {
				let t = e.parseName();
				t === c || u[t] || (a += O + O + t + " ".repeat(l - t.length) + " : " + t + ",\n");
			}
			a = a.replace(/,\n$/, "\n"), a += O + f + ",\n";
		}
		return a = a.replace(/,\n$/, "\n"), a += "};\n\n", a.toLowerCase();
	}
	generateTransTable(e) {
		if (e.inferType() !== "table") return "";
		let t = e.getTransColumns();
		if (t.length === 0) return "";
		let n = this.ctx.objPrefix() + e.parseName(), r = n + "_trans", i = this.ctx.semantics(), a = I(this.ctx), o = 13, s = (l(e.parseName()) ?? e.parseName()) + "_id";
		s.length > o && (o = s.length);
		for (let e of t) {
			let t = "trans_" + e.parseName();
			t.length > o && (o = t.length);
		}
		2 > o && (o = 2);
		let c = "create table " + r + " (\n", u = O + " ".repeat(o - 2);
		c += O + "id" + u + "number " + ve(r, this.ctx, this.naming) + "\n", c += O + O + " ".repeat(o) + "constraint " + r'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' + "_id" + this.naming.pk + " primary key,\n", u = O + " ".repeat(o - s.length), c += O + s + u + "number not null,\n", u = O + " ".repeat(o - 13), c += O + "language_code" + u + `varchar2(5${i}) not null,\n`;
		for (let e of t) {
			let t = "trans_" + e.parseName();
			u = O + " ".repeat(o - t.length);
			let n = F(e._inferTypeFull(), i, a);
			c += O + t + u + n + ",\n";
		}
		c += O + "constraint " + r + this.naming.uk + " unique (" + s + ", language_code)\n", c += ");\n\n";
		let d = e.parseName();
		return d.length > 2 && (d = d.substring(0, 2)), c += "alter table " + r + " add constraint " + r + "_" + d + "_id" + this.naming.fk + "\n", c += O + "foreign key (" + s + ") references " + n + ";\n\n", c += "alter table " + r + " add constraint " + r + "_lang" + this.naming.fk + "\n", c += O + "foreign key (language_code) references " + this.ctx.objPrefix() + "language (code);\n\n", c += "create index " + r + this.naming.idx + "1 on " + r + " (" + s + ");\n", c += "create index " + r + this.naming.idx + "2 on " + r + " (language_code);\n\n", c;
	}
	generateResolvedView(e) {
		if (e.inferType() !== "table") return "";
		let t = e.getTransColumns();
		if (t.length === 0) return "";
		let n = this.ctx.objPrefix() + e.parseName(), r = n + "_trans", i = n + "_resolved", a = (l(e.parseName()) ?? e.parseName()) + "_id", o = this.ctx.getOptionValue("transcontext"), s = "create or replace view " + i + " as\nselect ", c = [], u = e.getPkName();
		u !== null && c.push("k." + u), e.lateInitFks();
		for (let t in e.fks ?? {}) {
			if (0 < t.indexOf(",")) continue;
			let n = this.ctx.find(e.fks[t]), r = "";
			n !== null && n.isMany2One && n.isMany2One() && !t.endsWith("_id") && (r = "_id"), c.push("k." + t + r);
		}
		let d = {};
		for (let e of t) d[e.parseName()] = !0;
		for (let t of e.regularColumns()) {
			let n = t.parseName();
			u !== null && n === "id" || n !== e.getExplicitPkName() && (d[n] ? c.push("coalesce(t.trans_" + n + ", k." + n + ") as " + n) : c.push("k." + n'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('));
		}
		s += c[0] + ",\n";
		for (let e = 1; e < c.length; e++) s += O + O + " " + c[e], e < c.length - 1 && (s += ","), s += "\n";
		return s += "from " + n + " k\n", s += "left join " + r + " t\n", s += O + "on t." + a + " = k." + (u ?? e.getExplicitPkName()) + "\n", s += O + "and t.language_code = " + o + ";\n\n", s;
	}
};
//#endregion
//#region src/oracle/plsql.ts
function xe(e) {
	return e.isOption("lower") ? "lower" : e.isOption("upper") ? "upper" : "";
}
function Se(e) {
	let t = e.getExplicitPkName();
	if (t == null || t.includes(",")) return null;
	let n = e.findChild(t);
	return n == null ? e.getPkType() : n.getPlsqlType();
}
var L = class {
	constructor(e, t) {
		this.ctx = e, this.naming = t;
	}
	restEnable(e) {
		if (e.inferType() !== "table" || !e.isOption("rest")) return "";
		let t = e.parseName(), n = t.indexOf("\"") === 0, r = this.ctx.objPrefix() + t;
		return r = n ? this.ctx.objPrefix() + t.substring(1, t.length - 1) : (this.ctx.objPrefix() + t).toUpperCase(), "begin\n" + O + "ords.enable_object(p_enabled=>TRUE, p_object=>''" + r + "'');\nend;\n/\n";
	}
	generateTrigger(e) {
		return e.inferType() !== "table" || e.isOption("soda") ? "" : this._generateBITrigger(e) + this._generateBUTrigger(e);
	}
	_generateBITrigger(e) {
		let t = this.ctx.optionEQvalue("editionable", "yes") ? " editionable" : "", n = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), r = `create or replace${t} trigger ${n}${this.naming.bi}\n`;
		r += "    before insert\n", r += "    on " + n + "\n", r += "    for each row\n", e.hasRowKey() && (r += "declare\n    function compress_int (n in integer ) return varchar2\n    as\n        ret       varchar2(30);\n        quotient  integer;\n        remainder integer;\n        digit     char(1);\n    begin\n        ret := null; quotient := n;\n        <<compress_loop>>\n        while quotient > 0\n        loop\n            remainder := mod(quotient, 10 + 26);\n            quotient := floor(quotient  / (10 + 26));\n            if r'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('emainder < 26 then\n                digit := chr(ascii(''A'') + remainder);\n            else\n                digit := chr(ascii(''0'') + remainder - 26);\n            end if;\n            ret := digit || ret;\n        end loop compress_loop;\n        if length(ret) < 5 then ret := lpad(ret, 4, ''A''); end if ;\n        return upper(ret);\n    end compress_int;\n"), r += "begin\n";
		let i = !1, a = e.apexUser();
		e.hasRowKey() && (r += "    :new.row_key := compress_int(row_key_seq.nextval);\n", i = !0);
		for (let t of e.children) {
			let e = xe(t);
			e !== "" && (r += "    :new." + t.parseName().toLowerCase() + " := " + e + "(:new." + t.parseName().toLowerCase() + ");\n", i = !0);
		}
		if (e.hasRowVersion() && (r += "    :new.row_version := 1;\n", i = !0), e.hasAuditCols()) {
			let t = e.auditSysDateFn();
			r += "    :new." + this.ctx.getOptionValue("createdcol") + " := " + t + ";\n", r += "    :new." + this.ctx.getOptionValue("createdbycol") + " := " + a + ";\n", r += "    :new." + this.ctx.getOptionValue("updatedcol") + " := " + t + ";\n", r += "    :new." + this.ctx.getOptionValue("updatedbycol") + " := " + a + ";\n", i = !0;
		}
		let o = this.ctx.additionalColumns();
		for (let e in o) {
			let t = o[e];
			r += "    if :new." + e + " is null then\n", t.startsWith("INT") ? r += "        " + e + " := 0;\n" : r += "        " + e + " := ''N/A'';\n", r += "    end if;\n", i = !0;
		}
		return i ? (r += "end " + n + this.naming.bi + ";\n/\n\n", r) : "";
	}
	_generateBUTrigger(e) {
		if (e.isOption("immutable")) return "";
		let t = !1;
		for (let n of e.children) if (n.isOption("lower") || n.isOption("upper")) {
			t = !0;
			break;
		}
		let n = e.hasRowVersion(), r = e.hasAuditCols();
		if (!t && !n && !r) return "";
		let i = this.ctx.optionEQvalue("editionable", "yes") ? " editionable" : "", a = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), o = `create or replace${i} trigger ${a}${this.naming.bu}\n`;
		o += "    before update\n    on " + a + "\n'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('    for each row\nbegin\n";
		let s = e.apexUser();
		for (let t of e.children) {
			let e = xe(t);
			e !== "" && (o += "    :new." + t.parseName().toLowerCase() + " := " + e + "(:new." + t.parseName().toLowerCase() + ");\n");
		}
		if (n && (o += "    :new.row_version := nvl(:old.row_version, 0) + 1;\n"), r) {
			let t = e.auditSysDateFn();
			o += "    :new." + this.ctx.getOptionValue("updatedcol") + " := " + t + ";\n", o += "    :new." + this.ctx.getOptionValue("updatedbycol") + " := " + s + ";\n";
		}
		return o += "end " + a + this.naming.bu + ";\n/\n\n", o;
	}
	generateImmutableTrigger(e) {
		if (e.inferType() !== "table" || !e.isOption("immutable")) return "";
		let t = this.ctx.getOptionValue("db");
		if (t && t.length > 0 && 23 <= (p(t) ?? 0)) return "";
		let n = this.ctx.objPrefix() + e.parseName(), r = "create or replace trigger " + this.naming.immutable_prefix + n.toLowerCase() + this.naming.immutable_suffix + "\n";
		return r += "    before update or delete\n    on " + n.toLowerCase() + "\ndeclare\n", r += "    co_immutable_err  constant pls_integer      := -20055;\n", r += "    co_immutable_msg  constant varchar2(200 char) := ''" + n.toLowerCase() + " is immutable'';\n", r += "begin\n    raise_application_error(co_immutable_err, co_immutable_msg);\nend;\n/\n\n", r;
	}
	_hasSyntheticTenantId(e) {
		return this.ctx.optionEQvalue("tenantid", !0) && !e.isOption("notenantid") && e.findChild("tenant_id") === null && !Object.prototype.hasOwnProperty.call(e.fks ?? {}, "tenant_id");
	}
	procDecl(e, t) {
		let n = t === "get" ? "" : " default null", r = t === "get" ? "out" : " in", i = O + "procedure " + t + "_row (\n", a = e.getPkName(), o = e.getGenIdColName() === null ? e.findChild(e.getExplicitPkName()) : null, s = o ? o.getPlsqlType() : e.getPkType();
		i += O + O + "p_" + a + "        in  " + s + n, this._hasSyntheticTenantId(e) && (i += ",\n" + O + O + "p_tenant_id   " + r + "  integer" + n);
		for (let t in e.fks ?? {}) {
			let a = e.fks[t], o = "inte'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ger", s = this.ctx.find(a);
			s !== null && (o = Se(s) ?? o), i += ",\n" + O + O + "P_" + t + "   " + r + "  " + o + n;
		}
		for (let t of e.regularColumns()) i += ",\n" + O + O + "P_" + t.parseName() + "   " + r + "  " + t.getPlsqlType() + n;
		return i += "\n    )", i;
	}
	_getRowBody(e) {
		let t = e.getPkName(), n = this.ctx.objPrefix() + e.parseName(), r = this._hasSyntheticTenantId(e), i = O + "is \n" + O + "begin \n", a = [], o = [];
		r && (a.push("tenant_id"), o.push("p_tenant_id"));
		for (let t in e.fks ?? {}) a.push(t), o.push("p_" + t);
		for (let t of e.regularColumns()) {
			let e = t.parseName().toLowerCase();
			a.push(e), o.push("p_" + e);
		}
		if (a.length > 0) {
			let e = O + O + "       ";
			i += O + O + "select " + a.join(",\n" + e) + "\n", i += O + O + "  into " + o.join(",\n" + e) + "\n", i += O + O + "  from " + n + "\n", i += O + O + " where " + t + " = p_" + t, r && (i += "\n" + O + O + "   and tenant_id = p_tenant_id"), i += ";\n";
		}
		return i += O + "exception\n" + O + O + "when no_data_found then\n" + O + O + O + "null;\n", i += O + "end get_row;\n \n", i;
	}
	_insertRowBody(e) {
		let t = e.getPkName(), n = this.ctx.objPrefix() + e.parseName(), r = this._hasSyntheticTenantId(e), i = O + "is \n" + O + "begin \n";
		i += O + O + "insert into " + n + " ( \n" + O + O + O + t, r && (i += ",\n" + O + O + O + "tenant_id");
		for (let t in e.fks ?? {}) i += ",\n" + O + O + O + t;
		for (let t of e.regularColumns()) i += ",\n" + O + O + O + t.parseName().toLowerCase();
		i += "\n" + O + O + ") values ( \n" + O + O + O + "p_" + t, r && (i += ",\n" + O + O + O + "p_tenant_id");
		for (let t in e.fks ?? {}) i += ",\n" + O + O + O + "p_" + t;
		for (let t of e.regularColumns()) i += ",\n" + O + O + O + "p_" + t.parseName();
		return i += "\n" + O + O + ");", i += "\n" + O + "end insert_row;\n \n \n", i;
	}
	_updateRowBody(e) {
		let t = e.getPkName(), n = this.ctx.objPrefix() + e.parseName(), r = this._hasSyntheticTenantId(e), i = O + "is \'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('n" + O + "begin \n";
		i += O + O + "update  " + n + " set \n" + O + O + O + t + " = p_" + t;
		for (let t in e.fks ?? {}) i += ",\n" + O + O + O + t + " = P_" + t;
		for (let t of e.regularColumns()) i += ",\n" + O + O + O + t.parseName().toLowerCase() + " = P_" + t.parseName().toLowerCase();
		return i += "\n" + O + O + "where " + t + " = p_" + t, r && (i += "\n" + O + O + "  and tenant_id = p_tenant_id"), i += ";", i += "\n" + O + "end update_row;\n \n \n", i;
	}
	_hasAuditLog(e) {
		return e.isOption("auditlog");
	}
	_hasVersionCol(e) {
		return e.hasRowVersion() || e.children.some((e) => e.children.length === 0 && e.parseName().toLowerCase() === "row_version");
	}
	_hasUniqueCol(e) {
		return e.children.some((e) => e.isOption("unique"));
	}
	_isAuditLogTarget(e) {
		let t = e.parseName().toLowerCase();
		return this.ctx.descendants().some((e) => {
			let n = String(e.getOptionValue("auditlog") || "").trim().toLowerCase();
			return n !== "" && n === t;
		});
	}
	_svcCols(e) {
		return e.children.filter((e) => e.children.length === 0 && e.refId() === null && e.parseName().toLowerCase() !== "row_version");
	}
	_generateDalSpec(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_dal", r = e.children.filter((e) => e.isOption("unique"));
		this._hasSyntheticTenantId(e);
		let i = this._isAuditLogTarget(e), a = `create or replace package ${n} as\n\n`;
		a += `${O}subtype t_id is ${t}.id%type;\n\n`, a += `${O}function get_by_id  (p_id in t_id) return ${t}%rowtype;\n`, a += `${O}function lock_by_id (p_id in t_id) return ${t}%rowtype;\n\n`;
		for (let e of r) {
			let n = e.parseName().toLowerCase();
			a += `${O}function get_by_${n} (p_${n} in ${t}.${n}%type) return ${t}%rowtype;\n\n`;
		}
		return a += `${O}type t_cursor is ref cursor return ${t}%rowtype;\n`, a += `${O}function get_all return t_cursor;\n\n`, a += `${O}procedure insert_row (p_row in out nocopy ${t}%rowtype);\n\n`, i || (a += `${O}procedure update_row (p_row in out nocopy ${t}'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('%rowtype);\n\n`, a += `${O}procedure delete_row (p_id in t_id);\n\n`), a += `${O}c_err_stale_data constant pls_integer := -20001;\n`, a += `${O}c_err_not_found  constant pls_integer := -20002;\n`, a += `${O}c_err_locked     constant pls_integer := -20003;\n\n`, a += `end ${n};\n/\n`, a;
	}
	_generateDalBody(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_dal", r = (e.getPkName() ?? "id").toLowerCase(), i = this._hasVersionCol(e), a = e.hasAuditCols(), o = this._svcCols(e), s = Object.keys(e.fks ?? {}), c = e.children.filter((e) => e.isOption("unique")), l = this._isAuditLogTarget(e), u = this._hasSyntheticTenantId(e), d = `create or replace package body ${n} as\n\n`;
		d += `${O}resource_busy exception;\n`, d += `${O}pragma exception_init(resource_busy, -54);\n\n`;
		let f = this.ctx.objPrefix() + "tenant_ctx";
		d += `${O}function get_by_id (p_id in t_id) return ${t}%rowtype is\n`, d += `${O}${O}l_row ${t}%rowtype;\n`, d += `${O}begin\n`, u ? d += `${O}${O}select * into l_row from ${t} where ${r} = p_id and tenant_id = ${f}.get_id;\n` : d += `${O}${O}select * into l_row from ${t} where ${r} = p_id;\n`, d += `${O}${O}return l_row;\n`, d += `${O}exception\n`, d += `${O}${O}when no_data_found then\n`, d += `${O}${O}${O}raise_application_error(c_err_not_found, ''${t}: record not found (id='' || p_id || '')'');\n`, d += `${O}end get_by_id;\n\n`, d += `${O}function lock_by_id (p_id in t_id) return ${t}%rowtype is\n`, d += `${O}${O}l_row ${t}%rowtype;\n`, d += `${O}begin\n`, d += `${O}${O}select * into l_row\n`, d += `${O}${O}from   ${t}\n`, u ? (d += `${O}${O}where  ${r} = p_id\n`, d += `${O}${O}  and  tenant_id = ${f}.get_id\n`) : d += `${O}${O}where  ${r} = p_id\n`, d += `${O}${O}for update nowait;\n`, d += `${O}${O}return l_row;\n`, d += `${O}exception\n`, d += `${O}${O}when no_data_found then\n`, d += `${O}${O}${O}raise_application_error(c_err_not_found, ''${t}: record not found (id='' || p_id || '')'');\n`, d += `${O}${O}when resource_'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('busy then\n`, d += `${O}${O}${O}raise_application_error(c_err_locked, ''${t}: record locked by another session'');\n`, d += `${O}end lock_by_id;\n\n`;
		for (let e of c) {
			let n = e.parseName().toLowerCase(), r = u ? ` and tenant_id = ${f}.get_id` : "";
			d += `${O}function get_by_${n} (p_${n} in ${t}.${n}%type) return ${t}%rowtype is\n`, d += `${O}${O}l_row ${t}%rowtype;\n`, d += `${O}begin\n`, d += `${O}${O}select * into l_row from ${t} where ${n} = p_${n}${r};\n`, d += `${O}${O}return l_row;\n`, d += `${O}end get_by_${n};\n\n`;
		}
		d += `${O}function get_all return t_cursor is\n`, d += `${O}${O}l_cur t_cursor;\n`, d += `${O}begin\n`, u ? d += `${O}${O}open l_cur for select * from ${t} where tenant_id = ${f}.get_id;\n` : d += `${O}${O}open l_cur for select * from ${t};\n`, d += `${O}${O}return l_cur;\n`, d += `${O}end get_all;\n\n`;
		let p = [
			...u ? ["tenant_id"] : [],
			...s.map((e) => e.toLowerCase()),
			...o.map((e) => e.parseName().toLowerCase())
		], m = [
			...u ? ["p_row.tenant_id"] : [],
			...s.map((e) => `p_row.${e.toLowerCase()}`),
			...o.map((e) => `p_row.${e.parseName().toLowerCase()}`)
		];
		if (d += `${O}procedure insert_row (p_row in out nocopy ${t}%rowtype) is\n`, d += `${O}begin\n`, u && (d += `${O}${O}p_row.tenant_id := ${f}.get_id;\n`), d += `${O}${O}insert into ${t} (\n`, d += `${O}${O}${O}` + p.join(`,\n${O}${O}${O}`) + "\n", d += `${O}${O}) values (\n`, d += `${O}${O}${O}` + m.join(`,\n${O}${O}${O}`) + "\n", d += `${O}${O})`, i) {
			let e = String(this.ctx.getOptionValue("createdcol") ?? "created"), t = String(this.ctx.getOptionValue("createdbycol") ?? "created_by"), n = [`${r}`, "row_version"], i = [`p_row.${r}`, "p_row.row_version"];
			a && (n.push(e, t), i.push(`p_row.${e}`, `p_row.${t}`)), d += `\n${O}${O}returning ${n.join(", ")}\n`, d += `${O}${O}     into ${i.join(", ")}`;
		} else d += `\n${O}${O}returning ${r}\n`, d += `${O}${O}     into p_row.${r}`;
		d += ";\n", d += `${O}end insert_row;\n\n`;
		let h = [...s.map'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('((e) => `${e.toLowerCase()} = p_row.${e.toLowerCase()}`), ...o.map((e) => `${e.parseName().toLowerCase()} = p_row.${e.parseName().toLowerCase()}`)];
		if (!l) {
			if (d += `${O}procedure update_row (p_row in out nocopy ${t}%rowtype) is\n`, d += `${O}${O}l_id t_id;\n`, d += `${O}begin\n`, d += `${O}${O}l_id := p_row.${r};\n`, d += `${O}${O}update ${t} set\n`, d += `${O}${O}${O}` + h.join(`,\n${O}${O}${O}`) + "\n", d += `${O}${O}where ${r} = l_id`, u && (d += `\n${O}${O}  and tenant_id = ${f}.get_id`), i && (d += `\n${O}${O}  and row_version = p_row.row_version`), i) {
				let e = String(this.ctx.getOptionValue("updatedcol") ?? "updated"), t = String(this.ctx.getOptionValue("updatedbycol") ?? "updated_by"), n = ["row_version"], r = ["p_row.row_version"];
				a && (n.push(e, t), r.push(`p_row.${e}`, `p_row.${t}`)), d += `\n${O}${O}returning ${n.join(", ")}\n`, d += `${O}${O}     into ${r.join(", ")}`;
			}
			d += ";\n", i && (d += `${O}${O}if sql%rowcount = 0 then\n`, d += `${O}${O}${O}declare l_dummy pls_integer;\n`, d += `${O}${O}${O}begin\n`, u ? d += `${O}${O}${O}${O}select 1 into l_dummy from ${t} where ${r} = l_id and tenant_id = ${f}.get_id;\n` : d += `${O}${O}${O}${O}select 1 into l_dummy from ${t} where ${r} = l_id;\n`, d += `${O}${O}${O}${O}raise_application_error(c_err_stale_data, ''row modified by another session. reload and retry.'');\n`, d += `${O}${O}${O}exception\n`, d += `${O}${O}${O}${O}when no_data_found then\n`, d += `${O}${O}${O}${O}${O}raise_application_error(c_err_not_found, ''record '' || l_id || '' does not exist.'');\n`, d += `${O}${O}${O}end;\n`, d += `${O}${O}end if;\n`), d += `${O}end update_row;\n\n`, d += `${O}procedure delete_row (p_id in t_id) is\n`, d += `${O}begin\n`, u ? d += `${O}${O}delete from ${t} where ${r} = p_id and tenant_id = ${f}.get_id;\n` : d += `${O}${O}delete from ${t} where ${r} = p_id;\n`, d += `${O}end delete_row;\n\n`;
		}
		return d += `end ${n};\n/\n`, d;
	}
	_generateHksSpec(e) {
		let t = (this.ctx.objPrefix()'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' + e.parseName()).toLowerCase(), n = t + "_dal", r = t + "_hks", i = `create or replace package ${r} as\n\n`;
		return i += `${O}procedure validate (\n`, i += `${O}${O}p_operation in varchar2,\n`, i += `${O}${O}p_row       in out nocopy ${t}%rowtype\n`, i += `${O});\n\n`, i += `${O}procedure before_insert (p_row in out nocopy ${t}%rowtype);\n`, i += `${O}procedure before_update (p_row in out nocopy ${t}%rowtype);\n`, i += `${O}procedure before_delete (p_id in ${n}.t_id);\n\n`, i += `${O}procedure after_insert (p_row in ${t}%rowtype);\n`, i += `${O}procedure after_update (p_row in ${t}%rowtype);\n`, i += `${O}procedure after_delete (p_id in ${n}.t_id);\n\n`, i += `end ${r};\n/\n`, i;
	}
	_generateHksBody(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_dal", r = t + "_hks", i = `create or replace package body ${r} as\n`;
		return i += "-- warning: this file is generated once and must not be overwritten\n\n", i += `${O}procedure validate (\n`, i += `${O}${O}p_operation in varchar2,\n`, i += `${O}${O}p_row       in out nocopy ${t}%rowtype\n`, i += `${O}) is begin null; end validate;\n\n`, i += `${O}procedure before_insert (p_row in out nocopy ${t}%rowtype) is begin null; end;\n`, i += `${O}procedure before_update (p_row in out nocopy ${t}%rowtype) is begin null; end;\n`, i += `${O}procedure before_delete (p_id in ${n}.t_id) is begin null; end;\n\n`, i += `${O}procedure after_insert  (p_row in ${t}%rowtype) is begin null; end;\n`, i += `${O}procedure after_update  (p_row in ${t}%rowtype) is begin null; end;\n`, i += `${O}procedure after_delete  (p_id in ${n}.t_id)     is begin null; end;\n\n`, i += `end ${r};\n/\n`, i;
	}
	_svcParamCols(e) {
		let t = [];
		for (let n of Object.keys(e.fks ?? {})) t.push({
			name: n.toLowerCase(),
			nullable: !0
		});
		for (let n of this._svcCols(e)) t.push({
			name: n.parseName().toLowerCase(),
			nullable: !n.isOption("nn")
		});
		return t;
	}
	_generateSvcSpec(e) {
		let t = (this.ctx.objPrefix() + e'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.parseName()).toLowerCase(), n = t + "_svc", r = (e.getPkName() ?? "id").toLowerCase(), i = this._hasVersionCol(e);
		this._hasSyntheticTenantId(e);
		let a = this._svcParamCols(e), o = `create or replace package ${n} as\n\n`, s = Math.max(20, ...a.map(({ name: e }) => e.length + 1));
		return o += `${O}type t_rec is record (\n`, o += a.map(({ name: e }) => `${O}${O}${e.padEnd(s)}${t}.${e}%type`).join(",\n") + "\n", o += `${O});\n\n`, o += `${O}function get (p_id in ${t}.${r}%type) return ${t}%rowtype;\n\n`, o += `${O}procedure create_rec (\n`, o += `${O}${O}p_rec in  t_rec,\n`, o += `${O}${O}x_id  out ${t}.${r}%type\n`, o += `${O});\n\n`, o += `${O}procedure update_rec (\n`, o += `${O}${O}p_id  in ${t}.${r}%type,\n`, o += `${O}${O}p_rec in t_rec`, i && (o += `,\n${O}${O}p_row_version in out ${t}.row_version%type`), o += `\n${O});\n\n`, o += `${O}procedure delete_rec (p_id in ${t}.${r}%type);\n\n`, o += `end ${n};\n/\n`, o;
	}
	_generateSvcBody(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_dal", r = t + "_hks", i = t + "_svc", a = t + "_aud", o = (e.getPkName() ?? "id").toLowerCase(), s = this._hasVersionCol(e), c = this._hasUniqueCol(e), l = this._hasAuditLog(e);
		this._hasSyntheticTenantId(e);
		let u = this._svcParamCols(e), d = `create or replace package body ${i} as\n\n`;
		d += `${O}function get (p_id in ${t}.${o}%type) return ${t}%rowtype is\n`, d += `${O}begin\n`, d += `${O}${O}return ${n}.get_by_id(p_id => p_id);\n`, d += `${O}end get;\n\n`, d += `${O}procedure p_do_create (\n`, d += `${O}${O}p_rec in  t_rec,\n`, d += `${O}${O}l_row in out nocopy ${t}%rowtype\n`, d += `${O}) is\n`, d += `${O}begin\n`;
		for (let { name: e } of u) d += `${O}${O}l_row.${e} := p_rec.${e};\n`;
		d += `${O}${O}${r}.validate(p_operation => ''insert'', p_row => l_row);\n`, d += `${O}${O}${r}.before_insert(p_row => l_row);\n`, d += `${O}${O}${n}.insert_row(p_row => l_row);\n`, d += `${O}${O}${r}.after_insert(p_row => l_row);\n`, l && (d += `${O}${O'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('}${a}.log_insert(p_row => l_row);\n`), d += `${O}end p_do_create;\n\n`, d += `${O}procedure create_rec (\n`, d += `${O}${O}p_rec in  t_rec,\n`, d += `${O}${O}x_id  out ${t}.${o}%type\n`, d += `${O}) is\n`, d += `${O}${O}l_row ${t}%rowtype;\n`, d += `${O}begin\n`, d += `${O}${O}p_do_create(p_rec => p_rec, l_row => l_row);\n`, d += `${O}${O}x_id := l_row.${o};\n`, c && (d += `${O}exception\n`, d += `${O}${O}when dup_val_on_index then\n`, d += `${O}${O}${O}raise_application_error(-20010, ''duplicate value on unique constraint.'');\n`), d += `${O}end create_rec;\n\n`, d += `${O}procedure update_rec (\n`, d += `${O}${O}p_id  in ${t}.${o}%type,\n`, d += `${O}${O}p_rec in t_rec`, s && (d += `,\n${O}${O}p_row_version in out ${t}.row_version%type`), d += `\n${O}) is\n`, d += `${O}${O}l_row ${t}%rowtype;\n`, l && (d += `${O}${O}l_old_row ${t}%rowtype;\n`), d += `${O}begin\n`, d += `${O}${O}l_row := ${n}.get_by_id(p_id => p_id);\n`, l && (d += `${O}${O}l_old_row := l_row;\n`);
		for (let { name: e } of u) d += `${O}${O}l_row.${e} := p_rec.${e};\n`;
		return s && (d += `${O}${O}l_row.row_version := p_row_version;\n`), d += `${O}${O}${r}.validate(p_operation => ''update'', p_row => l_row);\n`, d += `${O}${O}${r}.before_update(p_row => l_row);\n`, d += `${O}${O}${n}.update_row(p_row => l_row);\n`, d += `${O}${O}${r}.after_update(p_row => l_row);\n`, l && (d += `${O}${O}${a}.log_update(p_old_row => l_old_row, p_new_row => l_row);\n`), s && (d += `${O}${O}p_row_version := l_row.row_version;\n`), d += `${O}end update_rec;\n\n`, d += `${O}procedure delete_rec (p_id in ${t}.${o}%type) is\n`, l && (d += `${O}${O}l_old_row ${t}%rowtype;\n`), d += `${O}begin\n`, l && (d += `${O}${O}l_old_row := ${n}.get_by_id(p_id => p_id);\n`), d += `${O}${O}${r}.before_delete(p_id => p_id);\n`, d += `${O}${O}${n}.delete_row(p_id => p_id);\n`, d += `${O}${O}${r}.after_delete(p_id => p_id);\n`, l && (d += `${O}${O}${a}.log_delete(p_old_row => l_old_row);\n`), d += `${O}end delete_rec;\n\n`, d += `end ${i'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('};\n/\n`, d;
	}
	_generateApxSpec(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_apx", r = (e.getPkName() ?? "id").toLowerCase(), i = this._hasVersionCol(e), a = e.hasAuditCols();
		this._hasSyntheticTenantId(e);
		let o = this._svcParamCols(e), s = String(this.ctx.getOptionValue("createdcol") ?? "created"), c = String(this.ctx.getOptionValue("createdbycol") ?? "created_by"), l = String(this.ctx.getOptionValue("updatedcol") ?? "updated"), u = String(this.ctx.getOptionValue("updatedbycol") ?? "updated_by"), d = a ? [
			s,
			c,
			l,
			u
		] : [], f = Math.max(13, ...o.map(({ name: e }) => e.length + 1), ...d.map((e) => e.length + 1)), p = `create or replace package ${n} as\n\n`;
		p += `${O}procedure get (\n`, p += `${O}${O}p_id          in  ${t}.${r}%type`;
		for (let { name: e } of o) p += `,\n${O}${O}p_${e.padEnd(f)} out ${t}.${e}%type`;
		i && (p += `,\n${O}${O}p_row_version  out ${t}.row_version%type`), a && (p += `,\n${O}${O}p_${s.padEnd(f)} out ${t}.${s}%type`, p += `,\n${O}${O}p_${c.padEnd(f)} out ${t}.${c}%type`, p += `,\n${O}${O}p_${l.padEnd(f)} out ${t}.${l}%type`, p += `,\n${O}${O}p_${u.padEnd(f)} out ${t}.${u}%type`), p += `\n${O});\n\n`, p += `${O}procedure ins (\n`;
		let m = [];
		for (let { name: e, nullable: n } of o) m.push(`${O}${O}p_${e.padEnd(f)} in  ${t}.${e}%type${n ? " default null" : ""}`);
		m.push(`${O}${O}p_id           out ${t}.${r}%type`), p += m.join(",\n") + `\n${O});\n\n`, p += `${O}procedure upd (\n`;
		let h = [];
		h.push(`${O}${O}p_id           in  ${t}.${r}%type`);
		for (let { name: e, nullable: n } of o) h.push(`${O}${O}p_${e.padEnd(f)} in  ${t}.${e}%type${n ? " default null" : ""}`);
		return i && h.push(`${O}${O}p_row_version  in out ${t}.row_version%type`), p += h.join(",\n") + `\n${O});\n\n`, p += `${O}procedure del (p_id in ${t}.${r}%type);\n\n`, p += `end ${n};\n/\n`, p;
	}
	_generateApxBody(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_svc", r = t + "_a'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('px", i = (e.getPkName() ?? "id").toLowerCase(), a = this._hasVersionCol(e), o = e.hasAuditCols();
		this._hasSyntheticTenantId(e);
		let s = this._svcParamCols(e), c = String(this.ctx.getOptionValue("createdcol") ?? "created"), l = String(this.ctx.getOptionValue("createdbycol") ?? "created_by"), u = String(this.ctx.getOptionValue("updatedcol") ?? "updated"), d = String(this.ctx.getOptionValue("updatedbycol") ?? "updated_by"), f = o ? [
			c,
			l,
			u,
			d
		] : [], p = Math.max(13, ...s.map(({ name: e }) => e.length + 1), ...f.map((e) => e.length + 1)), m = `create or replace package body ${r} as\n\n`;
		m += `${O}procedure get (\n`, m += `${O}${O}p_id          in  ${t}.${i}%type`;
		for (let { name: e } of s) m += `,\n${O}${O}p_${e.padEnd(p)} out ${t}.${e}%type`;
		a && (m += `,\n${O}${O}p_row_version  out ${t}.row_version%type`), o && (m += `,\n${O}${O}p_${c.padEnd(p)} out ${t}.${c}%type`, m += `,\n${O}${O}p_${l.padEnd(p)} out ${t}.${l}%type`, m += `,\n${O}${O}p_${u.padEnd(p)} out ${t}.${u}%type`, m += `,\n${O}${O}p_${d.padEnd(p)} out ${t}.${d}%type`), m += `\n${O}) is\n`, m += `${O}${O}l_row ${t}%rowtype;\n`, m += `${O}begin\n`, m += `${O}${O}if p_id is null then return; end if;  -- INSERT mode: leave OUT params null\n`, m += `${O}${O}l_row := ${n}.get(p_id => p_id);\n`;
		for (let { name: e } of s) m += `${O}${O}p_${e} := l_row.${e};\n`;
		a && (m += `${O}${O}p_row_version := l_row.row_version;\n`), o && (m += `${O}${O}p_${c} := l_row.${c};\n`, m += `${O}${O}p_${l} := l_row.${l};\n`, m += `${O}${O}p_${u} := l_row.${u};\n`, m += `${O}${O}p_${d} := l_row.${d};\n`), m += `${O}end get;\n\n`, m += `${O}procedure ins (\n`;
		let h = [];
		for (let { name: e, nullable: n } of s) h.push(`${O}${O}p_${e.padEnd(p)} in  ${t}.${e}%type${n ? " default null" : ""}`);
		h.push(`${O}${O}p_id           out ${t}.${i}%type`), m += h.join(",\n") + `\n${O}) is\n`, m += `${O}${O}l_rec ${n}.t_rec;\n`, m += `${O}begin\n`;
		for (let { name: e } of s) m += `${O}${O}l_rec.${e} := p_${e'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('};\n`;
		m += `${O}${O}${n}.create_rec(p_rec => l_rec, x_id => p_id);\n`, m += `${O}end ins;\n\n`, m += `${O}procedure upd (\n`;
		let g = [];
		g.push(`${O}${O}p_id           in  ${t}.${i}%type`);
		for (let { name: e, nullable: n } of s) g.push(`${O}${O}p_${e.padEnd(p)} in  ${t}.${e}%type${n ? " default null" : ""}`);
		a && g.push(`${O}${O}p_row_version  in out ${t}.row_version%type`), m += g.join(",\n") + `\n${O}) is\n`, m += `${O}${O}l_rec ${n}.t_rec;\n`, m += `${O}begin\n`;
		for (let { name: e } of s) m += `${O}${O}l_rec.${e} := p_${e};\n`;
		return m += `${O}${O}${n}.update_rec(\n`, m += `${O}${O}${O}p_id  => p_id,\n`, m += `${O}${O}${O}p_rec => l_rec`, a && (m += `,\n${O}${O}${O}p_row_version => p_row_version`), m += `\n${O}${O});\n`, m += `${O}end upd;\n\n`, m += `${O}procedure del (p_id in ${t}.${i}%type) is\n`, m += `${O}begin\n`, m += `${O}${O}${n}.delete_rec(p_id => p_id);\n`, m += `${O}end del;\n\n`, m += `end ${r};\n/\n`, m;
	}
	_generateAuditSpec(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_aud", r = `create or replace package ${n} as\n\n`;
		return r += `${O}procedure set_enabled (p_enabled in boolean);\n\n`, r += `${O}procedure log_insert (p_row     in ${t}%rowtype);\n`, r += `${O}procedure log_update (p_old_row in ${t}%rowtype, p_new_row in ${t}%rowtype);\n`, r += `${O}procedure log_delete (p_old_row in ${t}%rowtype);\n\n`, r += `end ${n};\n/\n`, r;
	}
	_generateAuditBody(e) {
		let t = (this.ctx.objPrefix() + e.parseName()).toLowerCase(), n = t + "_dal", r = t + "_aud", i = (e.getPkName() ?? "id").toLowerCase(), a = String(e.getOptionValue("auditlog") || "").trim() || "app_audit_log", o = (this.ctx.objPrefix() + a).toLowerCase(), s = o + "_svc", c = this._hasVersionCol(e), l = Object.keys(e.fks ?? {}).map((e) => e.toLowerCase()), u = this._svcCols(e).map((e) => e.parseName().toLowerCase()), d = (this.ctx.find(a)?.children ?? []).some((e) => e.parseName().toLowerCase() === "old_values"), f = [
			i,
			...this._h'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('asSyntheticTenantId(e) ? ["tenant_id"] : [],
			...l,
			...u
		];
		c && f.push("row_version");
		let p = `create or replace package body ${r} as\n\n`;
		if (p += `${O}g_enabled boolean := true;\n\n`, p += `${O}procedure set_enabled (p_enabled in boolean) is\n`, p += `${O}begin\n`, p += `${O}${O}g_enabled := p_enabled;\n`, p += `${O}end set_enabled;\n\n`, d) {
			let e = f.map((e) => `${O}${O}${O}''${e}'' value p_row.${e}`);
			p += `${O}function f_to_json (p_row in ${t}%rowtype) return clob is\n`, p += `${O}${O}l_result clob;\n`, p += `${O}begin\n`, p += `${O}${O}select json_object(\n`, p += e.join(",\n") + "\n", p += `${O}${O}${O}returning clob\n`, p += `${O}${O}) into l_result from dual;\n`, p += `${O}${O}return l_result;\n`, p += `${O}end f_to_json;\n\n`;
		}
		return p += `${O}procedure p_log (\n`, p += `${O}${O}p_operation  in varchar2,\n`, p += `${O}${O}p_id         in ${n}.t_id`, d ? (p += `,\n${O}${O}p_old_values in clob default null,\n`, p += `${O}${O}p_new_values in clob default null\n`) : p += "\n", p += `${O}) is\n`, p += `${O}${O}pragma autonomous_transaction;\n`, p += `${O}${O}l_rec ${s}.t_rec;\n`, p += `${O}${O}l_id ${o}.id%type;\n`, p += `${O}begin\n`, p += `${O}${O}if not g_enabled then return; end if;\n`, p += `${O}${O}l_rec.entity    := ''${t}'';\n`, p += `${O}${O}l_rec.entity_id := p_id;\n`, p += `${O}${O}l_rec.operation := p_operation;\n`, d && (p += `${O}${O}l_rec.old_values := p_old_values;\n`, p += `${O}${O}l_rec.new_values := p_new_values;\n`), p += `${O}${O}${s}.create_rec(p_rec => l_rec, x_id => l_id);\n`, p += `${O}${O}-- l_id holds the generated audit record id.\n`, p += `${O}${O}-- use it here if needed, e.g. to notify, correlate, or route downstream:\n`, p += `${O}${O}-- your_pkg.on_audit(p_audit_id => l_id, p_entity => ''${t}'', p_operation => p_operation);\n`, p += `${O}${O}commit;\n`, p += `${O}end p_log;\n\n`, p += `${O}procedure log_insert (p_row in ${t}%rowtype) is\n`, p += `${O}begin\n`, d ? p += `${O}${O}p_log(p_operation => '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('''INSERT'', p_id => p_row.${i}, p_new_values => f_to_json(p_row));\n` : p += `${O}${O}p_log(p_operation => ''INSERT'', p_id => p_row.${i});\n`, p += `${O}end log_insert;\n\n`, p += `${O}procedure log_update (p_old_row in ${t}%rowtype, p_new_row in ${t}%rowtype) is\n`, p += `${O}begin\n`, d ? p += `${O}${O}p_log(p_operation => ''UPDATE'', p_id => p_new_row.${i}, p_old_values => f_to_json(p_old_row), p_new_values => f_to_json(p_new_row));\n` : p += `${O}${O}p_log(p_operation => ''UPDATE'', p_id => p_new_row.${i});\n`, p += `${O}end log_update;\n\n`, p += `${O}procedure log_delete (p_old_row in ${t}%rowtype) is\n`, p += `${O}begin\n`, d ? p += `${O}${O}p_log(p_operation => ''DELETE'', p_id => p_old_row.${i}, p_old_values => f_to_json(p_old_row));\n` : p += `${O}${O}p_log(p_operation => ''DELETE'', p_id => p_old_row.${i});\n`, p += `${O}end log_delete;\n\n`, p += `end ${r};\n/\n`, p;
	}
	generateLayeredTAPI(e) {
		if (e.inferType() !== "table" || e.children.length === 0) return "";
		let t = this._hasAuditLog(e), n = String(this.ctx.getOptionValue("ifc") ?? "apex").toLowerCase(), r = this._generateDalSpec(e) + "\n" + this._generateDalBody(e) + "\n" + this._generateHksSpec(e) + "\n" + this._generateHksBody(e) + "\n" + this._generateSvcSpec(e) + "\n";
		return t && (r += this._generateAuditSpec(e) + "\n"), r += this._generateSvcBody(e), t && (r += "\n" + this._generateAuditBody(e)), (n === "apex" || n === "") && (r += "\n" + this._generateApxSpec(e) + "\n" + this._generateApxBody(e)), r;
	}
	generateTAPI(e) {
		if (e.children.length === 0) return "";
		let t = this.ctx.objPrefix() + e.parseName(), n = e.getPkName(), r = this._hasSyntheticTenantId(e), i = r ? ",\n        p_tenant_id           in integer" : "", a = n + " = p_" + n + (r ? " and tenant_id = p_tenant_id" : ""), o = ("create or replace package " + t.toLowerCase() + "_API\nis\n\n").toLowerCase();
		return o += this.procDecl(e, "get") + ";\n\n", o += this.procDecl(e, "insert") + ";\n\n", o += this.procDecl(e, "up'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('date") + ";\n\n", o += "    procedure delete_row (\n        p_" + n + "              in integer" + i + "\n    );\nend " + t.toLowerCase() + "_api;\n/\n\n", o += ("create or replace package body " + t.toLowerCase() + "_API\nis\n\n").toLowerCase(), o += this.procDecl(e, "get") + "\n" + this._getRowBody(e), o += this.procDecl(e, "insert") + "\n" + this._insertRowBody(e), o += this.procDecl(e, "update") + "\n" + this._updateRowBody(e), o += "    procedure delete_row (\n        p_" + n + "              in integer" + i + "\n    )\n    is\n    begin\n        delete from " + t.toLowerCase() + " where " + a + ";\n    end delete_row;\nend " + t.toLowerCase() + "_api;\n/\n", o.toLowerCase();
	}
	generateTenantCtxSpec(e) {
		let t = (e + "tenant_ctx").toLowerCase(), n = "-- Shared tenant-isolation context provider (read-only side)\n";
		return n += `create or replace package ${t} as\n\n`, n += `${O}-- Returns the tenant ID bound to the current session (null when not set).\n`, n += `${O}-- Safe to grant broadly: a SYS_CONTEXT read carries no privilege restriction.\n`, n += `${O}function get_id return integer;\n\n`, n += `end ${t};\n/\n`, n;
	}
	generateTenantCtxBody(e) {
		let t = (e + "tenant_ctx").toLowerCase(), n = `create or replace package body ${t} as\n\n`;
		return n += `${O}function get_id return integer is\n`, n += `${O}begin\n`, n += `${O}${O}return to_number(sys_context(''${t}'', ''tenant_id''));\n`, n += `${O}end get_id;\n\n`, n += `end ${t};\n/\n`, n;
	}
	generateTenantBootstrapSpec(e) {
		let t = (e + "tenant_ctx").toLowerCase(), n = (e + "tenant_bootstrap").toLowerCase(), r = "-- Tenant-isolation bootstrap provider (mutating side: set_id/clear_id)\n";
		return r += `-- Run once as DBA: create or replace context ${t} using ${n};\n`, r += `-- Grant EXECUTE on ${n} ONLY to a trusted bootstrap principal (logon trigger\n`, r += "-- owner or auth handler) — never to the general application/APEX runtime role.\n", r += `create or replace package ${n} as\n\n`, r += `${O}--'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' Binds the tenant ID at session start (logon trigger or REST auth handler).\n`, r += `${O}procedure set_id(p_tenant_id in integer);\n\n`, r += `${O}-- Clears the tenant ID bound to the current session (connection-pool checkout\n`, r += `${O}-- boundaries, logoff, or test teardown).\n`, r += `${O}procedure clear_id;\n\n`, r += `end ${n};\n/\n`, r;
	}
	generateTenantBootstrapBody(e) {
		let t = (e + "tenant_ctx").toLowerCase(), n = (e + "tenant_bootstrap").toLowerCase(), r = `create or replace package body ${n} as\n\n`;
		return r += `${O}procedure set_id(p_tenant_id in integer) is\n`, r += `${O}begin\n`, r += `${O}${O}dbms_session.set_context(''${t}'', ''tenant_id'', to_char(p_tenant_id));\n`, r += `${O}end set_id;\n\n`, r += `${O}procedure clear_id is\n`, r += `${O}begin\n`, r += `${O}${O}dbms_session.clear_context(''${t}'');\n`, r += `${O}end clear_id;\n\n`, r += `end ${n};\n/\n`, r;
	}
}, Ce = " not null";
function we(e) {
	return e.lastIndexOf(",\n") === e.length - 2 && (e = e.substring(0, e.length - 2) + "\n"), e;
}
var R = class extends ge {
	constructor(e, t) {
		super(e), this._naming = t ?? D, this._view = new be(e, this._naming), this._plsql = new L(e, this._naming);
	}
	colType(e) {
		return this._toOracleType(e);
	}
	_pkTypeModifier(e, t) {
		return ve(e, this._ddl, t ?? this._naming);
	}
	_globalOnDelete() {
		let e = this._ddl.getOptionValue("ondelete") ?? "";
		return e === "cascade" ? " on delete cascade" : e === "set null" ? " on delete set null" : e === "restrict" ? " on delete restrict" : "";
	}
	_cpad(e) {
		return O + O + " ".repeat(e.parent.maxChildNameLen());
	}
	_fkColType(e) {
		let t = e.getExplicitPkName();
		if (t === null || t.includes(",")) return null;
		let n = e.findChild(t);
		return n === null ? e.getPkType() : this._toOracleType(n._inferTypeFull());
	}
	_toOracleType(e) {
		return F(e, this._ddl.semantics(), I(this._ddl));
	}
	_buildColumnConstraints(e, t, n) {
		if (e.isOption("unique") || e.isOption("uk")) {
			let r = e.parent !'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('== null && e.parent.isOption("notenantid");
			(!this._ddl.optionEQvalue("tenantid", !0) || r) && (t += "\n", t += this._cpad(e) + "constraint " + f(this._ddl.objPrefix(), n.parent_child, this._naming.unq) + " unique");
		}
		let r = "''";
		if ((t.startsWith("integer") || t.startsWith("number") || t.startsWith("date")) && (r = ""), e.isOption("default")) {
			let i = e.getDefaultValue() ?? "", a = [
				"sysdate",
				"current_date",
				"current_timestamp",
				"systimestamp",
				"localtimestamp"
			];
			if (n.isNativeBoolean) {
				let e = i.toUpperCase() === "Y" || i.toLowerCase() === "true" ? "true" : "false";
				t += " default on null " + e;
			} else a.includes(i.toLowerCase()) ? t += " default on null " + i : t += " default on null " + r + i + r;
		}
		if ((e.isOption("nn") || e.indexOf("not") + 1 === e.indexOf("null")) && e.indexOf("pk") < 0 && (t += " not null"), (e.isOption("hidden") || e.isOption("invincible")) && (t += " invisible"), n.isNativeBoolean || (t += e.genConstraint(r)), n.needsBoolCheck && (t += "\n" + this._cpad(e) + "constraint " + f(this._ddl.objPrefix(), n.parent_child) + ` check (${e.parseName()} in (''Y'',''N''))`), e.isOption("between")) {
			let r = e.getBetweenClause() ?? "";
			t += " constraint " + f(n.parent_child, this._naming.bet) + "\n", t += "           check (" + e.parseName() + " between " + r + ")";
		}
		if (e.isOption("pk")) {
			let r = t.startsWith("number") ? " " + this._pkTypeModifier(this._ddl.objPrefix() + e.parent.parseName()) : " not null";
			t += r + "\n", t += this._cpad(e) + "constraint " + f(this._ddl.objPrefix(), n.parent_child, this._naming.pk) + " primary key";
		}
		return e.annotations !== null && (0 <= t.indexOf("\n") ? t += "\n" + this._cpad(e) + "annotations (" + e.annotations + ")" : t += " annotations (" + e.annotations + ")"), t;
	}
	_genSequence(e, t) {
		return this._ddl.optionEQvalue("pk", "SEQ") && this._ddl.optionEQvalue("genpk", !0) ? "create sequence  " + t + "_seq;\n\n" : "";
	}
	_genTab'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('leHeader(e, t, n, r) {
		let i = "create " + n + "table " + t + " (\n", a = O + " ".repeat(e.maxChildNameLen() - 2);
		if (r !== null && !e.isOption("pk")) {
			i += O + r + a + "number " + this._pkTypeModifier(t) + "\n";
			let n = f(this._ddl.objPrefix("no schema") + e.parseName(), "_", r);
			i += O + O + " ".repeat(e.maxChildNameLen()) + "constraint " + f(n, this._naming.pk) + " primary key,\n";
		} else {
			let t = e.getExplicitPkName();
			if (t !== null && t.indexOf(",") < 0) {
				let n = O + " ".repeat(e.maxChildNameLen() - t.length), r = "number", a = e.findChild(t);
				a !== null && (r = this.parseType(a)), i += O + t + n + r + ",\n";
			}
		}
		return i;
	}
	_genFkColumns(e, t) {
		let n = "";
		for (let r in e.fks) {
			let i = e.fks[r];
			if (0 < r.indexOf(",")) {
				let t = this._ddl.find(i), a = m(r, ", ");
				for (let r = 0; r < a.length; r++) {
					let i = a[r];
					if (i === ",") continue;
					let o = t?.findChild(i), s = O + " ".repeat(e.maxChildNameLen() - i.length);
					n += O + i + s + (o ? this._toOracleType(o._inferTypeFull()) : "number") + ",\n";
				}
				continue;
			}
			let a = "number", o = e.findChild(r);
			o !== null && (a = o.inferType());
			let s = this._ddl.find(i), c = "";
			s === null ? (s = this._ddl.find(r), s?.isMany2One?.() && !r.endsWith("_id") && (i = r, r = l(r) ?? r, c = "_id")) : a = this._fkColType(s) ?? a;
			let u = O + " ".repeat(e.maxChildNameLen() - r.length);
			n += O + r + c + u + a;
			let d = this._ddl.find(i) === null ? "" : this._ddl.objPrefix(), f = r + c;
			if (this._ddl.optionEQvalue("tenantid", !0) && !e.isOption("notenantid") && s !== null && !s.isOption("notenantid") && f !== "tenant_id") {
				n += ",\n";
				let r = d + i, a = r + "_tid_id_uix", o = r + "_tid_id_uq", s = `create unique index ${a}\n    on ${r} (tenant_id, id);\n`, c = `alter table ${r}\n    add constraint ${o}\n    unique (tenant_id, id) using index ${a};\n`;
				this._ddl.postponedAltersSet.has(s) || (this._ddl.postpone'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('dAlters.push(s), this._ddl.postponedAltersSet.add(s), this._ddl.postponedAlters.push(c), this._ddl.postponedAltersSet.add(c));
				let l = "";
				e.isOption("cascade") ? l = " on delete cascade" : e.isOption("setnull") && (l = " on delete set null");
				for (let t in e.children) {
					let n = e.children[t];
					if (f === n.parseName()) {
						n.isOption("cascade") ? l = " on delete cascade" : n.isOption("setnull") && (l = " on delete set null");
						break;
					}
				}
				l ||= this._globalOnDelete();
				let u = t + "_" + f + this._naming.fk, p = "alter table " + t + " add constraint " + u + "\n    foreign key (tenant_id, " + f + ")\n    references " + d + i + " (tenant_id, id)" + l + ";\n";
				this._ddl.postponedAltersSet.has(p) || (this._ddl.postponedAlters.push(p), this._ddl.postponedAltersSet.add(p));
			} else if (s !== null && (s.line < e.line || s.isMany2One())) {
				n += O + O + " ".repeat(e.maxChildNameLen()) + "constraint " + t + "_" + r + this._naming.fk + "\n";
				let a = "";
				e.isOption("cascade") ? a = " on delete cascade" : e.isOption("setnull") && (a = " on delete set null");
				let o = "";
				for (let t in e.children) {
					let n = e.children[t];
					if (r === n.parseName()) {
						(n.isOption("nn") || n.isOption("notnull")) && (o = Ce), n.isOption("cascade") ? a = " on delete cascade" : n.isOption("setnull") && (a = " on delete set null");
						break;
					}
				}
				a ||= this._globalOnDelete(), n += O + O + " ".repeat(e.maxChildNameLen()) + "references " + d + i + a + o + ",\n";
			} else {
				n += ",\n";
				let a = "";
				e.isOption("cascade") ? a = " on delete cascade" : e.isOption("setnull") && (a = " on delete set null");
				for (let t in e.children) {
					let n = e.children[t];
					if (r === n.parseName()) {
						n.isOption("cascade") ? a = " on delete cascade" : n.isOption("setnull") && (a = " on delete set null");
						break;
					}
				}
				a ||= this._globalOnDelete();
				let o = "alter table " + t + " add'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' constraint " + t + "_" + r + "_fk foreign key (" + r + ") references " + d + i + a + ";\n";
				this._ddl.postponedAltersSet.has(o) || (this._ddl.postponedAlters.push(o), this._ddl.postponedAltersSet.add(o));
			}
		}
		return n;
	}
	_genTenantIdColumn(e) {
		if (!this._ddl.optionEQvalue("tenantid", !0) || e.isOption("notenantid") || e.findChild("tenant_id") !== null) return "";
		let t = O + " ".repeat(e.maxChildNameLen() - 9), n = e.isOption("insert") ? "" : " not null";
		return O + "tenant_id" + t + "number" + n + ",\n";
	}
	_genTenantIdFk(e, t) {
		if (!this._ddl.optionEQvalue("tenantid", !0) || e.isOption("notenantid") || e.findChild("tenant_id") !== null) return;
		let n = String(this._ddl.getOptionValue("tenantref") || "tenants");
		if (this._ddl.find(n) === null) return;
		let r = this._ddl.objPrefix() + n, i = `alter table ${t} add constraint ${t + "_tenant_id" + this._naming.fk}\n    foreign key (tenant_id) references ${r} (id);\n`;
		this._ddl.postponedAltersSet.has(i) || (this._ddl.postponedAlters.push(i), this._ddl.postponedAltersSet.add(i));
	}
	_genRowKeyColumn(e, t) {
		if (!e.hasRowKey()) return "";
		let n = O + " ".repeat(e.maxChildNameLen() - 7), r = O + "row_key" + n + `varchar2(30${this._ddl.semantics()})\n`;
		return r += O + O + " ".repeat(e.maxChildNameLen()) + "constraint " + t + "_row_key" + this._naming.unq + " unique not null,\n", r;
	}
	_genRegularColumns(e, t, n) {
		let r = "";
		for (let t = 0; t < e.children.length; t++) {
			let i = e.children[t];
			if (!(n !== null && i.parseName() === "id") && !(0 < i.children.length) && i.refId() === null) {
				if (i.parseName() === e.getExplicitPkName()) continue;
				r += O + this.generateTable(i) + ",\n";
				for (let t in j) if (0 < i.indexOf(t)) {
					let n = i.parseName().toUpperCase();
					for (let i of j[t]) {
						let t = n + i.suffix.toUpperCase(), a = O + " ".repeat(e.maxChildNameLen() - t.length);
						r += O + t.toLowerCase() + a + i.type(this._ddl) + ",\n";
					}
					brea'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('k;
				}
			}
		}
		return r;
	}
	_genRowVersionColumn(e) {
		if (!e.hasRowVersion()) return "";
		let t = O + " ".repeat(e.maxChildNameLen() - 11);
		return O + "row_version" + t + "integer not null,\n";
	}
	_genAuditColumns(e) {
		if (!e.hasAuditCols()) return "";
		let t = String(this._ddl.getOptionValue("auditdate") || this._ddl.getOptionValue("Date Data Type") || "").toLowerCase(), n = "", r = String(this._ddl.getOptionValue("createdcol") ?? "");
		n += O + r + O + " ".repeat(e.maxChildNameLen() - r.length) + t + " not null,\n";
		let i = String(this._ddl.getOptionValue("createdbycol") ?? "");
		n += O + i + O + " ".repeat(e.maxChildNameLen() - i.length) + `varchar2(255${this._ddl.semantics()}) not null,\n`;
		let a = String(this._ddl.getOptionValue("updatedcol") ?? "");
		n += O + a + O + " ".repeat(e.maxChildNameLen() - a.length) + t + " not null,\n";
		let o = String(this._ddl.getOptionValue("updatedbycol") ?? "");
		return n += O + o + O + " ".repeat(e.maxChildNameLen() - o.length) + `varchar2(255${this._ddl.semantics()}) not null,\n`, n;
	}
	_genAdditionalColumns(e) {
		let t = "", n = this._ddl.additionalColumns();
		for (let r in n) {
			let i = n[r], a = O + " ".repeat(e.maxChildNameLen() - r.length);
			t += O + r.toUpperCase() + a + i + " not null,\n";
		}
		return t;
	}
	_genTableFooter(e, t, n, r) {
		let i = e.annotations === null ? "" : "\nannotations (" + e.annotations + ")", a = "";
		(this._ddl.optionEQvalue("compress", "yes") || e.isOption("compress")) && (a = r ? " row store compress advanced" : " compress");
		let o = n === "" ? "" : "\nno drop until 0 days idle\nno delete until 16 days after insert";
		o !== "" && a !== "" && (a = "\n" + a.trimStart());
		let s = ")" + o + a + i + ";\n\n";
		if (e.isOption("audit") && !e.isOption("auditcols") && !e.isOption("audit", "col") && !e.isOption("audit", "cols") && !e.isOption("audit", "columns") && (s += "audit all on " + t + ";\n\n"), e.isOption("flashback") || e.isOption("fda")) {
			let n = Str'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ing(e.getOptionValue("flashback") || e.getOptionValue("fda") || "").trim();
			s += "alter table " + t + " flashback archive" + (0 < n.length ? " " + n : "") + ";\n\n";
		}
		return s;
	}
	_genMultiColFkAlters(e, t) {
		let n = "";
		for (let r in e.fks) if (0 < r.indexOf(",")) {
			let i = e.fks[r];
			n += "alter table " + t + " add constraint " + i + "_" + t + "_fk foreign key (" + r + ") references " + i + ";\n\n";
		}
		return n;
	}
	_genIndexes(e, t, n) {
		let r = "", i = 1, a = this._ddl.optionEQvalue("tenantid", !0), o = e.isOption("notenantid");
		for (let n in e.fks) if (!e.isMany2One()) {
			let s = n ?? l(e.fks[n]) + "_id";
			i === 1 && (r += "-- table index\n");
			let c = this._ddl.find(e.fks[n]), u = c !== null && c.isOption("notenantid"), d = !a || o || s === "tenant_id" || u ? s : `tenant_id, ${s}`;
			r += "create index " + t + this._naming.idx + i++ + " on " + t + " (" + d + ");\n\n";
		}
		let s = e.getOptionValue("pk");
		s && (r += "alter table " + t + " add constraint " + t + this._naming.pk + " primary key (" + s + ");\n\n");
		let c = e.getOptionValue("unique") ?? e.getOptionValue("uk");
		if (c !== null) {
			let e = a && !o ? `tenant_id, ${c}` : c;
			r += "alter table " + t + " add constraint " + t + this._naming.uk + " unique (" + e + ");\n\n";
		}
		if (a && !o) for (let n = 0; n < e.children.length; n++) {
			let i = e.children[n];
			if (i.isOption("unique") || i.isOption("uk")) {
				let e = i.parseName(), n = t + "_tid_" + e + "_uix";
				r += `create unique index ${n}\n    on ${t} (tenant_id, ${e});\n\n`;
			}
		}
		for (let n = 0; n < e.children.length; n++) {
			let s = e.children[n];
			if (s.isOption("idx") || s.isOption("index")) {
				i === 1 && (r += "-- table index\n");
				let e = a && !o ? `tenant_id, ${s.parseName()}` : s.parseName();
				r += "create index " + t + this._naming.idx + i++ + " on " + t + " (" + e + ");\n";
			}
		}
		if (n) for (let n = 0; n < e.children.length; n++) {
			let a = e.children[n];
			a.chil'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('dren.length === 0 && a.inferType() === "vector" && (r += "create vector index " + t + "_vi" + i++ + " on " + t + " (" + a.parseName() + ")\n", r += "    organization neighbor partitions\n", r += "    with distance cosine;\n\n");
		}
		for (let n = 0; n < e.children.length; n++) {
			let a = e.children[n];
			a.children.length === 0 && a.inferType() === "geometry" && (r += "create index " + t + "_si" + i++ + " on " + t + " (" + a.parseName() + ")\n", r += "    indextype is mdsys.spatial_index_v2;\n\n");
		}
		return r;
	}
	_genComments(e, t) {
		let n = "", r = e.getAnnotationValue("DESCRIPTION") || e.comment;
		r !== null && (n += "comment on table " + t + " is ''" + r + "'';\n");
		for (let r = 0; r < e.children.length; r++) {
			let i = e.children[r], a = i.getAnnotationValue("DESCRIPTION") || i.comment;
			a !== null && i.children.length === 0 && (n += "comment on column " + t + "." + i.parseName() + " is ''" + a + "'';\n");
		}
		return n;
	}
	parseType(e) {
		if (e.children !== null && 0 < e.children.length) return "table";
		let t = e.inferType();
		if (t === "view" || t === "dv") return t;
		if (e.parent === null) return "table";
		let n = e._inferTypeFull();
		return this._buildColumnConstraints(e, this._toOracleType(n), n);
	}
	generateTable(e) {
		if (e.children.length === 0 && 0 < e.apparentDepth()) {
			let t = O;
			return e.parent !== void 0 && e.parent !== null && (t += " ".repeat(e.parent.maxChildNameLen() - e.parseName().length)), e.parseName() + t + this.parseType(e);
		}
		e.lateInitFks();
		let t = this._ddl.objPrefix() + e.parseName();
		if (e.isOption("soda")) {
			let e = "create table " + t + " (\n";
			return e += O + "id              varchar2(255" + this._ddl.semantics() + ") not null\n", e += O + "                constraint " + t + "_id_pk primary key,\n", e += O + "created_on      timestamp default sys_extract_utc(systimestamp) not null,\n", e += O + "last_modified   timestamp default sys_extract_utc(systimestamp) not null,\n", e += O + "'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('version         varchar2(255" + this._ddl.semantics() + ") not null,\n", e += O + "json_document   json\n", e += ");\n\n", e;
		}
		let n = this._ddl.getOptionValue("db"), r = n !== null && n.length > 0 && 23 <= (p(n) ?? 0), i = "";
		e.isOption("immutable") && r && (i = "immutable ");
		let a = e.getGenIdColName(), o = this._genSequence(e, t);
		return o += this._genTableHeader(e, t, i, a), o += this._genTenantIdColumn(e), o += this._genFkColumns(e, t), o += this._genRowKeyColumn(e, t), o += this._genRegularColumns(e, t, a), o += this._genRowVersionColumn(e), o += this._genAuditColumns(e), o += this._genAdditionalColumns(e), o += e.genConstraint(), o = we(o), o += this._genTableFooter(e, t, i, r), o += this._genMultiColFkAlters(e, t), o += this._genIndexes(e, t, r), this._genTenantIdFk(e, t), o += this._genComments(e, t), o += "\n", o;
	}
	generateDDL(e) {
		if (e.inferType() === "view" || e.inferType() === "dv") return "";
		let t = this._orderedTableNodes(e), n = "";
		for (let e = 0; e < t.length; e++) n += this.generateTable(t[e]);
		return n;
	}
	generateDrop(e) {
		let t = this._ddl.objPrefix() + e.parseName(), n = this._ddl.getOptionValue("db"), r = n && n.length > 0 && 23 <= (p(n) ?? 0) ? "if exists " : "", i = "";
		return e.inferType() === "view" && (i = "drop view " + r + t + ";\n"), e.inferType() === "table" && (i = "drop table " + r + t + " cascade constraints;\n", this._ddl.optionEQvalue("api", "layered") && e.trimmedContent().toLowerCase().includes("/api") ? (i += "drop package " + r + t + "_dal;\n", i += "drop package " + r + t + "_hks;\n", i += "drop package " + r + t + "_svc;\n", e.isOption("auditlog") && (i += "drop package " + r + t + "_aud;\n"), i += "drop package " + r + t + "_apx;\n") : this._ddl.optionEQvalue("api", "yes") && (i += "drop package " + r + t + "_api;\n"), this._ddl.optionEQvalue("pk", "SEQ") && (i += "drop sequence " + r + t + this._naming.seq + ";\n")), i.toLowerCase();
	}
	identityRestartSql(e, t, n) {
		return "alter table "'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' + e + "\nmodify " + t + " generated always  as identity restart start with " + n + ";\n\n";
	}
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
		let e = this._ddl.forest, t = this._ddl.descendants(), n = "";
		if (this._ddl.optionEQvalue("Include Drops", "yes")) for (let e of t) {
			let t = this.generateDrop(e);
			t && (n += t);
		}
		if (this._ddl.optionEQvalue("rowkey", !0)) n += "create sequence  row_key_seq;\n\n";
		else for (let t of e) if (t.trimmedContent().toUpperCase().includes("/ROWKEY")) {
			n += "create sequence  row_key_seq;\n\n";
			break;
		}
		n += "-- create tables\n\n";
		for (let t of e) n += this.generateDDL(t) + "\n";
		for (let e of this._ddl.postponedAlters) n += e + "\n";
		if (t.some((e) => e.getTransColumns().length > 0)) {
			let e = this._ddl.semantics(), r = this._ddl.objPrefix();
			n += "-- translation support\n\n", n += `create table ${r}language (\n`, n += `    code           varchar2(5${e}) not null\n`, n += `                   constraint ${r}language_code_pk primary key,\n`, n += `    locale         varchar2(28${e}) not null\n`, n += `                   constraint ${r}language_locale_unq unique,\n`, n += `    name           varchar2(1024${e}),\n`, n += `    native_name    varchar2(1024${e})\n`, n += ");\n\n", n += `create index ${r}language_i1 on ${r}language (locale);\n\n`;
			for (let e of t) {
				let t = this.generateTransTable(e);
				t && (n '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('+= t);
			}
		}
		let r = 0;
		for (let e of t) {
			let t = this.generateTrigger(e);
			t && (r++ === 0 && (n += "-- triggers\n"), n += t + "\n");
		}
		for (let e of t) {
			let t = this.generateImmutableTrigger(e);
			t && (r++ === 0 && (n += "-- immutable triggers\n"), n += t);
		}
		for (let e of t) {
			let t = this.restEnable(e);
			t && (n += t + "\n");
		}
		r = 0;
		let i = this._ddl.optionEQvalue("api", "layered");
		i && this._ddl.optionEQvalue("tenantid", !0) && (r++ === 0 && (n += "-- APIs\n"), n += this._plsql.generateTenantCtxSpec(this._ddl.objPrefix()) + "\n", n += this._plsql.generateTenantCtxBody(this._ddl.objPrefix()) + "\n", n += this._plsql.generateTenantBootstrapSpec(this._ddl.objPrefix()) + "\n", n += this._plsql.generateTenantBootstrapBody(this._ddl.objPrefix()) + "\n");
		for (let e of t) {
			let t = e.trimmedContent().toLowerCase().includes("/api");
			if (i) {
				if (!t) continue;
				let i = this.generateLayeredTAPI(e);
				i && (r++ === 0 && (n += "-- APIs\n"), n += i + "\n");
			} else {
				if (this._ddl.optionEQvalue("api", !1) && !t) continue;
				let i = this.generateTAPI(e);
				i && (r++ === 0 && (n += "-- APIs\n"), n += i + "\n");
			}
		}
		r = 0;
		for (let t of e) {
			let e = this.generateView(t);
			e && (r++ === 0 && (n += "-- create views\n"), n += e + "\n");
		}
		for (let e of t) {
			let t = this.generateResolvedView(e);
			t && (r++ === 0 && (n += "-- create views\n"), n += t);
		}
		let a = {};
		for (let e of t) {
			if (e.inferType() !== "table") continue;
			let t = e.getAnnotationValue("TGROUP");
			t != null && (a[t] || (a[t] = []), a[t].push(this._ddl.objPrefix() + e.parseName()));
		}
		let o = Object.keys(a);
		if (o.length > 0) {
			n += "-- table groups\n";
			for (let e of o) {
				n += `insert into user_annotations_groups$ (group_name) values (''${e}'');\n`;
				for (let t of a[e]) n += `insert into user_annotations_group_members$ (group_name, object_name) values (''${e}'', ''${t.toUpperCase()}'');\n`;
'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('			}
			n += "\n";
		}
		let s = this._ddl.getOptionValue("db");
		if (this._ddl.optionEQvalue("aienrichment", !0) && s != null && s.length >= 2 && (p(s) ?? 0) >= 26) {
			let t = [], r = {}, i = this._ddl.objPrefix();
			for (let n of e) {
				let e = n.inferType(), a = n.getAnnotationPairs(), o = (i + n.parseName()).toUpperCase();
				if (e === "table") {
					for (let e of a) {
						if (e.label.toUpperCase() === "TGROUP") {
							e.value != null && (r[e.value] || (r[e.value] = []), r[e.value].push(o));
							continue;
						}
						e.value != null && t.push(`    metadata_annotations.set(''${e.label}'', ''${e.value}'', ''${o}'');`);
					}
					for (let e of n.children) {
						if (e.children.length > 0) continue;
						let n = e.getAnnotationPairs(), r = o + "." + e.parseName().toUpperCase();
						for (let e of n) e.value != null && t.push(`    metadata_annotations.set(''${e.label}'', ''${e.value}'', ''${r}'', ''TABLE COLUMN'');`);
					}
				} else if (e === "view") for (let e of a) e.value != null && t.push(`    metadata_annotations.set(''${e.label}'', ''${e.value}'', ''${o}'', ''VIEW'');`);
			}
			for (let e of Object.keys(r)) {
				t.push(`    metadata_annotations.create_group(''${e}'');`);
				for (let n of r[e]) t.push(`    metadata_annotations.add_to_group(''${e}'', ''${n}'', ''TABLE'');`);
			}
			t.length > 0 && (n += "-- AI enrichment\nbegin\n" + t.join("\n") + "\nend;\n/\n\n");
		}
		r = 0;
		for (let t of e) {
			let e = this.generateData(t, this._ddl.data);
			e && (r++ === 0 && (n += "-- load data\n\n"), n += e + "\n");
		}
		return n;
	}
}, Te = {
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
	create_view: 16
};
function z(e, t, n,'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' r, i = !1) {
	let a = {
		kind: e,
		table: t,
		sql: n,
		requiresManualIntervention: i
	};
	return r !== void 0 && (a.column = r), a;
}
function B(e, t, n, r, i = !1) {
	let a = {
		level: e,
		table: t,
		message: n,
		requiresManualIntervention: i
	};
	return r !== void 0 && (a.column = r), a;
}
var Ee = class {
	compute(e, t) {
		let n = [], r = [], i = this._tableMap(e), a = this._tableMap(t), o = this._viewMap(e), s = this._viewMap(t), c = [];
		for (let [e, t] of i) a.has(e) || c.push(t);
		for (let t of this._reverseTopoSort(c, e)) n.push(...this._dropTable(t, e)), r.push(B("DESTRUCTIVE", t.parseName(), `table dropped: ${t.parseName()}`));
		let l = [];
		for (let [e, t] of a) i.has(e) || l.push(t);
		for (let e of this._topoSort(l, t)) n.push(...this._createTable(e, t));
		for (let [o, s] of a) {
			let a = i.get(o);
			if (a == null) continue;
			let { stmts: c, warns: l } = this._diffTable(a, s, e, t);
			n.push(...c), r.push(...l);
		}
		n.push(...this._diffViews(o, s, t));
		let u = this._order(n);
		return {
			sql: this._buildPreamble(u, r) + u.map((e) => e.sql.endsWith("\n") ? e.sql : e.sql + "\n").join("\n"),
			statements: u,
			warnings: r,
			summary: this._summary(u, r, i, a)
		};
	}
	_tableMap(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.forest) n.inferType() === "table" && t.set(n.parseName(), n);
		return t;
	}
	_viewMap(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.forest) (n.inferType() === "view" || n.inferType() === "dv") && t.set(n.parseName(), n);
		return t;
	}
	_topoSort(e, t) {
		let n = new Set(e.map((e) => e.parseName())), r = /* @__PURE__ */ new Set(), i = [], a = (e) => {
			let o = e.parseName();
			if (!r.has(o)) {
				if (r.add(o), e.fks) for (let r in e.fks) {
					let i = e.fks[r];
					if (n.has(i)) {
						let e = t.find(i);
						e != null && a(e);
					}
				}
				i.push(e);
			}
		};
		for (let t of e) a(t);
		return i;
	}
	_reverseTopoSort(e, t) {
		return [...this._topoSort(e, t)].revers'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('e();
	}
	_dropTable(e, t) {
		let n = [], r = e.parseName(), i = t.objPrefix() + r, a = I(t) ? "if exists " : "", o = e.trimmedContent().toLowerCase().includes("/api");
		if (t.optionEQvalue("api", "layered") && o) for (let i of this._layeredPkgNames(e, t)) n.push(z("drop_package", r, `drop package ${a}${i};\n`));
		else (t.optionEQvalue("api", "yes") || o) && n.push(z("drop_package", r, `drop package ${a}${i}_api;\n`));
		return t.optionEQvalue("pk", "SEQ") && n.push(z("drop_sequence", r, `drop sequence ${a}${i}${D.seq};\n`)), n.push(z("drop_table", r, `drop table ${a}${i} cascade constraints;\n`)), n;
	}
	_createTable(e, t) {
		let n = [], r = e.parseName(), i = t.objPrefix() + r, a = new R(t);
		t.optionEQvalue("pk", "SEQ") && n.push(z("add_sequence", r, `create sequence  ${i}${D.seq};\n`)), e.lateInitFks();
		let o = t.postponedAlters.length, s = a.generateTable(e), c = t.postponedAlters.slice(o);
		for (let e of c) s += e + "\n";
		n.push(z("create_table", r, s));
		let l = e.trimmedContent().toLowerCase().includes("/api");
		if (t.optionEQvalue("api", "layered") && l) {
			let i = new L(t, D);
			n.push(...this._splitPkgBlocks(i.generateLayeredTAPI(e), r));
		} else if ((t.optionEQvalue("api", "yes") || l) && !t.optionEQvalue("api", "layered")) {
			let i = new L(t, D);
			n.push(...this._splitPkgBlocks(i.generateTAPI(e), r));
		}
		return n;
	}
	_diffTable(e, t, n, r) {
		let i = [], a = [], o = t.parseName(), s = r.objPrefix() + o;
		e.lateInitFks(), t.lateInitFks();
		let c = this._colMap(e), l = this._colMap(t), u = [];
		for (let [e, t] of c) l.has(e) || u.push(t);
		let d = [];
		for (let [e, t] of l) c.has(e) || d.push(t);
		let f = this._detectRenames(u, d), p = new Set([...f.keys()].map((e) => e.parseName())), m = new Set([...f.values()].map((e) => e.parseName()));
		for (let [e, t] of f) i.push(z("rename_hint", o, `-- alter table ${s} rename column ${e.parseName()} to ${t.parseName()};\n`, e.parseName())), a.push(B("INFO", o, `suspected rename: ${e.p'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('arseName()} → ${t.parseName()} (verify before applying)`, e.parseName()));
		for (let e of u) p.has(e.parseName()) || (i.push(...this._dropColumn(s, o, e)), a.push(B("DESTRUCTIVE", o, `column dropped: ${e.parseName()}`, e.parseName())));
		for (let e of d) {
			if (m.has(e.parseName())) continue;
			let { stmts: t, warns: n } = this._addColumn(s, o, e, r);
			i.push(...t), a.push(...n);
		}
		for (let [e, t] of l) {
			let l = c.get(e);
			if (l == null) continue;
			let { stmts: u, warns: d } = this._modifyColumn(s, o, l, t, n, r);
			i.push(...u), a.push(...d);
		}
		let h = e.hasRowVersion(), g = t.hasRowVersion();
		!h && g && (i.push(z("add_column", o, `-- ⚠ MANUAL INTERVENTION REQUIRED
-- Initialize row_version for existing rows, then add NOT NULL:
-- alter table ${s} add (row_version integer);\n-- update ${s} set row_version = 0;\n-- commit;\n-- alter table ${s} modify (row_version not null);\n`, "row_version", !0)), a.push(B("INFO", o, "rowversion added — requires manual column initialization", "row_version", !0))), h && !g && (i.push(z("set_unused", o, `alter table ${s} set unused column row_version;\n`, "row_version")), i.push(z("drop_unused_columns", o, `-- [MAINTENANCE] safe to defer to a maintenance window\nalter table ${s} drop unused columns;\n`, "row_version")), a.push(B("DESTRUCTIVE", o, "row_version column dropped", "row_version")));
		let { stmts: _, warns: v } = this._diffPk(e, t, n, r, c, l);
		i.push(..._), a.push(...v), i.push(...this._diffFKs(e, t, n, r)), i.push(...this._diffIndexes(e, t, n, r)), i.push(...this._diffTriggers(e, t, n, r));
		let y = u.some((e) => !p.has(e.parseName())) || d.some((e) => !m.has(e.parseName())) || i.some((e) => e.kind === "modify_column"), { stmts: b, warns: x } = this._diffPackages(e, t, n, r, y);
		return i.push(...b), a.push(...x), {
			stmts: i,
			warns: a
		};
	}
	_pkDesc(e, t) {
		let n = e.parseName(), r = t.objPrefix() + n, i = e.getExplicitPkName();
		if (i != null) {
			let e = i.includes(",") ? i.spl'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('it(",").map((e) => e.trim()) : [i];
			return {
				type: "business",
				columns: e,
				constraintName: e.length === 1 ? `${r}_${e[0]}_pk` : `${r}_pk`
			};
		}
		let a = e.getGenIdColName();
		return a == null ? {
			type: "none",
			columns: [],
			constraintName: ""
		} : {
			type: "surrogate",
			columns: [a],
			constraintName: `${r}_pk`
		};
	}
	_diffPk(e, t, n, r, i, a) {
		let o = [], s = [], c = t.parseName(), l = n.objPrefix() + c, u = r.objPrefix() + c, d = this._pkDesc(e, n), f = this._pkDesc(t, r);
		if (d.type === f.type && d.columns.join(",") === f.columns.join(",")) return {
			stmts: o,
			warns: s
		};
		let p = d.type === "none" ? "none" : `${d.type}(${d.columns.join(", ")})`, m = f.type === "none" ? "none" : `${f.type}(${f.columns.join(", ")})`;
		s.push(B("DESTRUCTIVE", c, `Primary key change on "${c}": ${p} → ${m}. All FKs referencing this table must be dropped and re-created. Data migration required.`, void 0, !0));
		for (let e of f.columns) {
			let t = i.get(e), n = a.get(e);
			n != null && (this._isNotNull(n) || (t == null ? o.push(z("modify_column", c, `-- ⚠ MANUAL INTERVENTION REQUIRED\n-- Populate ${e} for existing rows, then add NOT NULL:\n-- update ${u} set ${e} = ??? where ${e} is null;\n-- commit;\n-- alter table ${u} modify (${e} not null);\n`, e, !0)) : this._isNotNull(t) || o.push(z("modify_column", c, `-- ⚠ MANUAL INTERVENTION REQUIRED\n-- Ensure all rows have a non-null ${e} value, then:\n-- alter table ${u} modify (${e} not null);\n`, e, !0))));
		}
		if (d.constraintName && o.push(z("modify_column", c, `-- ⚠ MANUAL INTERVENTION REQUIRED
-- Drop the old primary key constraint before continuing:
-- alter table ${l} drop constraint ${d.constraintName};\n`, void 0, !0)), d.type === "surrogate") {
			let e = d.columns[0];
			a.has(e) || (o.push(z("set_unused", c, `alter table ${l} set unused column ${e};\n`, e)), o.push(z("drop_unused_columns", c, `-- [MAINTENANCE] safe to defer to a maintenance window\nalter table ${l} drop u'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('nused columns;\n`, e))), n.optionEQvalue("pk", "SEQ") && o.push(z("drop_sequence", c, `drop sequence ${l}${D.seq};\n`));
		}
		if (f.columns.length > 0) {
			let e = f.columns.join(", ");
			o.push(z("add_fk", c, `-- ⚠ MANUAL INTERVENTION REQUIRED
-- After all PK columns are NOT NULL, add the primary key:
-- alter table ${u} add constraint ${f.constraintName} primary key (${e});\n`, void 0, !0));
		}
		return {
			stmts: o,
			warns: s
		};
	}
	_diffTriggers(e, t, n, r) {
		let i = [], a = t.parseName(), o = (n.objPrefix() + a).toLowerCase(), s = (e) => JSON.stringify({
			lower: e.children.filter((e) => e.isOption("lower")).map((e) => e.parseName()),
			upper: e.children.filter((e) => e.isOption("upper") && !e.isOption("lower")).map((e) => e.parseName()),
			rv: e.hasRowVersion(),
			audit: e.hasAuditCols(),
			rowkey: e.hasRowKey()
		});
		if (s(e) === s(t)) return i;
		let c = (e) => e.children.some((e) => e.isOption("lower") || e.isOption("upper")), l = c(e) || e.hasRowVersion() || e.hasAuditCols() || e.hasRowKey(), u = c(e) || e.hasRowVersion() || e.hasAuditCols(), d = c(t) || t.hasRowVersion() || t.hasAuditCols() || t.hasRowKey(), f = c(t) || t.hasRowVersion() || t.hasAuditCols();
		if (l && i.push(z("drop_trigger", a, `drop trigger ${o}${D.bi};\n`)), u && i.push(z("drop_trigger", a, `drop trigger ${o}${D.bu};\n`)), d || f) {
			let e = new L(r, D).generateTrigger(t);
			e && i.push(z("create_trigger", a, e));
		}
		return i;
	}
	_colMap(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.regularColumns()) t.set(n.parseName(), n);
		return t;
	}
	_isNotNull(e) {
		return e.isOption("nn") || e.indexOf("not") >= 0 && e.indexOf("not") + 1 === e.indexOf("null");
	}
	_detectRenames(e, t) {
		let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = (e) => {
			let t = e._inferTypeFull();
			return `${t.base}:${t.varcharLen ?? ""}:${t.numericSpec ?? ""}:${t.vectorSpec ?? ""}`;
		};
		for (let t of e) {
			let e = a('));
  DBMS_LOB.APPEND(l_src, TO_CLOB('t);
			r.has(e) || r.set(e, []), r.get(e).push(t);
		}
		for (let e of t) {
			let t = a(e);
			i.has(t) || i.set(t, []), i.get(t).push(e);
		}
		for (let [e, t] of r) {
			let r = i.get(e);
			r != null && t.length === 1 && r.length === 1 && n.set(t[0], r[0]);
		}
		return n;
	}
	_addColumn(e, t, n, r) {
		let i = [], a = [], o = I(r), s = F(n._inferTypeFull(), r.semantics(), o), c = n.parseName(), l = this._isNotNull(n), u = "";
		if (n.isOption("default")) {
			let e = n.getDefaultValue() ?? "", t = [
				"sysdate",
				"current_date",
				"current_timestamp",
				"systimestamp",
				"localtimestamp"
			], r = s.startsWith("integer") || s.startsWith("number") || s.startsWith("date") || s.startsWith("timestamp") || t.includes(e.toLowerCase()) ? "" : "''";
			u += t.includes(e.toLowerCase()) ? ` default on null ${e}` : ` default on null ${r}${e}${r}`;
		}
		(n.isOption("hidden") || n.isOption("invincible")) && (u += " invisible");
		let d = `${c} ${s}${u}`;
		if (l) {
			let r = n.isOption("default") ? n.getDefaultValue() ?? "???" : "???", o = [
				"sysdate",
				"current_date",
				"current_timestamp",
				"systimestamp",
				"localtimestamp"
			], l = s.startsWith("integer") || s.startsWith("number") || s.startsWith("date") || s.startsWith("timestamp") || o.includes(r.toLowerCase()), u = !n.isOption("default") || l ? "" : "''", f = o.includes(r.toLowerCase()) ? r : `${u}${r}${u}`, p = n.isOption("default");
			i.push(z("add_column", t, `alter table ${e} add (${d});\n`, c)), i.push(z("add_column", t, "-- ⚠ MANUAL INTERVENTION REQUIRED\n" + (p ? "-- Populate existing rows with the default value before step 3.\n" : "-- Populate existing rows before step 3. Replace ??? with the correct expression.\n") + `-- update ${e} set ${c} = ${f} where ${c} is null;\n-- commit;\n`, c, !0)), i.push(z("modify_column", t, `alter table ${e} modify (${c} not null);\n`, c)), a.push(B("DESTRUCTIVE", t, `added NOT NULL column ${c} — requires manual data population`, c, !0));
		} else i'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('.push(z("add_column", t, `alter table ${e} add (${d});\n`, c));
		if (n.isOption("check") || n.isOption("values")) {
			let a = n.isOption("check") ? n.getValues("check") : n.getValues("values"), o = f(r.objPrefix(), `${t}_${c}`, D.ck);
			i.push(z("add_column", t, `alter table ${e} add constraint ${o} check (${c} in (${a}));\n`, c));
		} else if (n.isOption("between")) {
			let r = n.getBetweenClause() ?? "", a = f(`${t}_${c}`, D.bet);
			i.push(z("add_column", t, `alter table ${e} add constraint ${a} check (${c} between ${r});\n`, c));
		}
		if (n.isOption("unique") || n.isOption("uk")) {
			let n = `${e}_${c}${D.unq}`, r = `create unique index ${n} on ${e} (${c});\n`;
			i.push(z("add_index", t, o ? `create unique index if not exists ${n} on ${e} (${c});\n` : this._wrapIndex(r)));
		} else if (n.isOption("idx") || n.isOption("index")) {
			let n = `${e}_${c}${D.idx}`, r = `create index ${n} on ${e} (${c});\n`;
			i.push(z("add_index", t, o ? `create index if not exists ${n} on ${e} (${c});\n` : this._wrapIndex(r)));
		}
		return {
			stmts: i,
			warns: a
		};
	}
	_dropColumn(e, t, n) {
		let r = n.parseName();
		return [z("set_unused", t, `alter table ${e} set unused column ${r};\n`, r), z("drop_unused_columns", t, `-- [MAINTENANCE] safe to defer to a maintenance window\nalter table ${e} drop unused columns;\n`, r)];
	}
	_modifyColumn(e, t, n, r, i, a) {
		let o = [], s = [], c = n._inferTypeFull(), l = r._inferTypeFull(), u = I(a), d = F(c, i.semantics(), I(i)), p = F(l, a.semantics(), u), m = this._isNotNull(n), h = this._isNotNull(r), g = r.parseName(), _ = d !== p, v = m !== h;
		if (_ || v) if (c.base !== l.base) {
			let n = h ? " not null" : m ? " null" : "";
			o.push(z("modify_column", t, `alter table ${e} modify (${g} ${p}${n});\n`, g)), s.push(B("LOSSY", t, `base type changed on ${g}: ${c.base} → ${l.base}`, g));
		} else {
			let n = [];
			_ && n.push(p), v && n.push(h ? "not null" : "null");
			let r = n.join(" ");
			if (!m && h) o.push(z("modify_'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('column", t, `-- ⚠ MANUAL INTERVENTION REQUIRED
-- Ensure all rows have a non-null value before executing.
-- alter table ${e} modify (${g} ${r});\n`, g, !0)), s.push(B("DESTRUCTIVE", t, `adding NOT NULL on ${g} — requires manual verification`, g, !0));
			else if (o.push(z("modify_column", t, `alter table ${e} modify (${g} ${r});\n`, g)), _ && c.base === "varchar") {
				let e = c.varcharLen ?? 4e3, n = l.varcharLen ?? 4e3;
				n < e && s.push(B("LOSSY", t, `varchar size reduced on ${g}: ${e} → ${n}`, g));
			}
		}
		let y = n.getDefaultValue(), b = r.getDefaultValue();
		if (y !== b) if (r.isOption("default")) {
			let n = b ?? "", r = [
				"sysdate",
				"current_date",
				"current_timestamp",
				"systimestamp",
				"localtimestamp"
			], i = p.startsWith("integer") || p.startsWith("number") || p.startsWith("date") || p.startsWith("timestamp") || r.includes(n.toLowerCase()) ? "" : "''", a = r.includes(n.toLowerCase()) ? `default on null ${n}` : `default on null ${i}${n}${i}`;
			o.push(z("modify_column", t, `alter table ${e} modify (${g} ${a});\n`, g));
		} else o.push(z("modify_column", t, `alter table ${e} modify (${g} default null);\n`, g));
		let x = n.isOption("hidden") || n.isOption("invincible"), S = r.isOption("hidden") || r.isOption("invincible");
		x !== S && o.push(z("modify_column", t, `alter table ${e} modify (${g} ${S ? "invisible" : "visible"});\n`, g));
		let C = n.isOption("check") || n.isOption("values"), w = r.isOption("check") || r.isOption("values"), T = n.isOption("between"), E = r.isOption("between"), O = C ? JSON.stringify(n.parseValues()) : T ? n.getBetweenClause() : null;
		if (O !== (w ? JSON.stringify(r.parseValues()) : E ? r.getBetweenClause() : null)) {
			if (O !== null) {
				let n = T ? f(`${t}_${g}`, D.bet) : f(i.objPrefix(), `${t}_${g}`, D.ck);
				o.push(z("modify_column", t, `alter table ${e} drop constraint ${n};\n`, g));
			}
			if (w) {
				let n = w && r.isOption("check") ? r.getValues("check") : r.getValues("values"), i'));
  DBMS_LOB.APPEND(l_src, TO_CLOB(' = f(a.objPrefix(), `${t}_${g}`, D.ck);
				o.push(z("modify_column", t, `alter table ${e} add constraint ${i} check (${g} in (${n}));\n`, g));
			} else if (E) {
				let n = r.getBetweenClause() ?? "", i = f(`${t}_${g}`, D.bet);
				o.push(z("modify_column", t, `alter table ${e} add constraint ${i} check (${g} between ${n});\n`, g));
			}
		}
		return {
			stmts: o,
			warns: s
		};
	}
	_diffFKs(e, t, n, r) {
		let i = [], a = t.parseName(), o = n.objPrefix() + a, s = r.objPrefix() + a, c = I(r), l = e.fks ?? {}, u = t.fks ?? {};
		for (let e in l) e in u || (i.push(z("drop_fk", a, `alter table ${o} drop constraint ${o}_${e}_fk;\n`)), i.push(z("set_unused", a, `alter table ${o} set unused column ${e};\n`, e)), i.push(z("drop_unused_columns", a, `-- [MAINTENANCE] safe to defer to a maintenance window\nalter table ${o} drop unused columns;\n`, e)));
		for (let e in u) {
			if (e in l) continue;
			let t = u[e], n = r.find(t) == null ? "" : r.objPrefix(), o = `${s}_${e}_fk`, d = this._fkColType(t, r) ?? "number", f = `alter table ${s} add constraint ${o}\n    foreign key (${e})\n    references ${n}${t};\n`;
			i.push(z("add_column", a, `alter table ${s} add (${e} ${d});\n`, e)), i.push(z("add_fk", a, c ? f : this._wrapConstraint(f)));
		}
		return i;
	}
	_fkColType(e, t) {
		let n = t.find(e);
		if (n == null) return null;
		let r = n.getExplicitPkName();
		if (r == null || r.includes(",")) return null;
		let i = n.findChild(r);
		return i == null ? n.getPkType() || null : F(i._inferTypeFull(), t.semantics(), I(t));
	}
	_diffIndexes(e, t, n, r) {
		let i = [], a = t.parseName(), o = r.objPrefix() + a, s = n.objPrefix() + a, c = I(r), l = this._colMap(e), u = this._colMap(t);
		for (let [e, t] of u) {
			let n = l.get(e);
			if (n == null) continue;
			let r = n.isOption("idx") || n.isOption("index"), u = t.isOption("idx") || t.isOption("index"), d = n.isOption("unique") || n.isOption("uk"), f = t.isOption("unique") || t.isOption("uk");
			if (!r && u) {
				let t = `$'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('{o}_${e}_i`, n = `create index ${t} on ${o} (${e});\n`;
				i.push(z("add_index", a, c ? `create index if not exists ${t} on ${o} (${e});\n` : this._wrapIndex(n)));
			}
			if (r && !u) {
				let t = `${s}_${e}_i`;
				i.push(z("drop_index", a, `drop index ${t};\n`));
			}
			if (!d && f) {
				let t = `${o}_${e}_unq`, n = `create unique index ${t} on ${o} (${e});\n`;
				i.push(z("add_index", a, c ? `create unique index if not exists ${t} on ${o} (${e});\n` : this._wrapIndex(n)));
			}
			if (d && !f) {
				let t = `${s}_${e}_unq`;
				i.push(z("drop_index", a, `drop index ${t};\n`));
			}
		}
		let d = (e) => {
			let t = e.isOption("unique") ? e.getOptionValue("unique") : e.isOption("uk") ? e.getOptionValue("uk") : null;
			return !t || typeof t != "string" ? null : t.split(",").map((e) => e.trim()).join(",");
		}, f = d(e), p = d(t);
		if (f !== p && (f != null && i.push(z("drop_index", a, `alter table ${s} drop constraint ${s}${D.uk};\n`)), p != null)) {
			let e = p.split(",").join(", "), t = `alter table ${o} add constraint ${`${o}${D.uk}`} unique (${e});\n`;
			i.push(z("add_index", a, c ? t : this._wrapConstraint(t)));
		}
		return i;
	}
	_diffViews(e, t, n) {
		let r = [], i = I(n) ? "if exists " : "";
		for (let [a] of e) if (!t.has(a)) {
			let e = n.objPrefix() + a;
			r.push(z("drop_view", a, `drop view ${i}${e};\n`));
		}
		let a = [];
		for (let [n, r] of t) {
			let t = e.get(n);
			(t == null || t.trimmedContent() !== r.trimmedContent()) && a.push(r);
		}
		for (let e of this._topoSortViews(a, t)) {
			let t = new R(n).generateView(e);
			t && r.push(z("create_view", e.parseName(), t));
		}
		return r;
	}
	_topoSortViews(e, t) {
		let n = new Set(e.map((e) => e.parseName())), r = /* @__PURE__ */ new Set(), i = [], a = (e) => {
			let o = e.parseName();
			if (r.has(o)) return;
			r.add(o);
			let s = e.trimmedContent().toLowerCase();
			for (let e of t.values()) {
				let t = e.parseName();
				t !== o && n.has(t) && s.includes(t) && a(e);
			}
			'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('i.push(e);
		};
		for (let t of e) a(t);
		return i;
	}
	_diffPackages(e, t, n, r, i) {
		let a = [], o = [], s = t.parseName(), c = I(r) ? "if exists " : "", l = this._apiKind(e, n), u = this._apiKind(t, r);
		for (let i of this._droppedPkgs(e, t, n, r, l, u)) a.push(z("drop_package", s, `drop package ${c}${i};\n`));
		let d = e.isOption("auditlog") !== t.isOption("auditlog"), f = (e.isOption("apex") || e.isOption("apx")) !== (t.isOption("apex") || t.isOption("apx")), p = i || l !== u || d || f;
		if (u === "layered" && p) {
			let e = new L(r, D);
			a.push(...this._splitPkgBlocks(e.generateLayeredTAPI(t), s));
		} else if (u === "simple" && p) {
			let e = new L(r, D);
			a.push(...this._splitPkgBlocks(e.generateTAPI(t), s));
		}
		return {
			stmts: a,
			warns: o
		};
	}
	_apiKind(e, t) {
		let n = e.trimmedContent().toLowerCase().includes("/api");
		return t.optionEQvalue("api", "layered") && n ? "layered" : (t.optionEQvalue("api", "yes") || n) && !t.optionEQvalue("api", "layered") ? "simple" : "none";
	}
	_layeredPkgNames(e, t) {
		let n = t.objPrefix() + e.parseName(), r = [
			`${n}_dal`,
			`${n}_hks`,
			`${n}_svc`,
			`${n}_apx`
		];
		return e.isOption("auditlog") && r.unshift(`${n}_aud`), r;
	}
	_droppedPkgs(e, t, n, r, i, a) {
		let o = [], s = n.objPrefix() + e.parseName();
		return i === "layered" && (a === "simple" || a === "none") ? (o.push(`${s}_dal`, `${s}_hks`, `${s}_svc`, `${s}_apx`), e.isOption("auditlog") && o.push(`${s}_aud`)) : i === "simple" && (a === "layered" || a === "none") ? o.push(`${s}_api`) : i === "layered" && a === "layered" && e.isOption("auditlog") && !t.isOption("auditlog") && o.push(`${s}_aud`), o;
	}
	_splitPkgBlocks(e, t) {
		let n = [], r = e.split(/\n\/\s*(?:\n|$)/);
		for (let e of r) e = e.trim(), e && n.push(z("create_package", t, e + "\n/\n"));
		return n;
	}
	_wrapIndex(e) {
		return `begin\n    execute immediate ''${e.trim().replace(/;\s*$/, "").replace(/\n/g, " ").replace(/\s+/g, " ").replace(/''/g, "''''")}'';\ne'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('xception\n    when others then\n        if sqlcode = -955 then null;\n        else raise;\n        end if;\nend;\n/\n`;
	}
	_wrapConstraint(e) {
		return `begin\n    execute immediate ''${e.trim().replace(/;\s*$/, "").replace(/\n/g, " ").replace(/\s+/g, " ").replace(/''/g, "''''")}'';\nexception\n    when others then\n        if sqlcode = -2261 then null;\n        else raise;\n        end if;\nend;\n/\n`;
	}
	_order(e) {
		return [...e].sort((e, t) => this._step(e) - this._step(t));
	}
	_step(e) {
		return e.kind === "create_package" ? e.sql.toLowerCase().includes("package body ") ? 17 : 15 : Te[e.kind] ?? 99;
	}
	_summary(e, t, n, r) {
		let i = 0, a = 0, o = 0;
		for (let [e] of r) n.has(e) || i++;
		for (let [e] of n) r.has(e) || a++;
		let s = /* @__PURE__ */ new Set();
		for (let t of e) t.kind !== "create_table" && t.kind !== "drop_table" && t.kind !== "create_package" && t.kind !== "drop_package" && t.kind !== "create_view" && t.kind !== "drop_view" && t.kind !== "add_sequence" && t.kind !== "drop_sequence" && n.has(t.table) && r.has(t.table) && s.add(t.table);
		return o = s.size, {
			tablesAdded: i,
			tablesDropped: a,
			tablesModified: o,
			statementsTotal: e.length,
			statementsRequiringIntervention: e.filter((e) => e.requiresManualIntervention).length,
			warningsTotal: t.length
		};
	}
	_buildPreamble(e, t) {
		let n = e.filter((e) => e.requiresManualIntervention), r = t.filter((e) => e.level === "INFO"), i = e.filter((e) => e.kind === "drop_table").map((e) => e.table), a = t.filter((e) => e.message.startsWith("column dropped")), o = "";
		if (o += "-- ============================================================\n", o += "-- QuickSQL Migration Script\n", o += `-- Generated : ${(/* @__PURE__ */ new Date()).toISOString()}\n`, o += "-- ============================================================\n", n.length > 0) {
			o += "--\n", o += `-- ⚠ MANUAL STEPS REQUIRED (statementsRequiringIntervention = ${n.length})\n`, o += "--\n";
			for (let e of n) {
		'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('		o += `--   [${e.table}${e.column ? "." + e.column : ""}]\n`;
				let t = e.sql.split("\n").filter((e) => e.startsWith("-- "));
				for (let e of t) o += `--   ${e.replace(/^--\s*/, "")}\n`;
				o += "--\n";
			}
		}
		if (r.length > 0) {
			o += "--\n", o += "-- ⚠ POSSIBLE RENAMES — verify before applying\n", o += "--\n";
			for (let e of r) o += `--   [${e.table}] ${e.message}\n`;
			o += "--\n";
		}
		return (i.length > 0 || a.length > 0) && (o += "--\n", o += "-- ⚠ DESTRUCTIVE OPERATIONS\n", i.length > 0 && (o += `--   Tables dropped  : ${i.length}\n`), a.length > 0 && (o += `--   Columns dropped : ${a.length}\n`), o += "--   Apply during a maintenance window.\n", o += "--\n"), o += "-- ============================================================\n", o += "\n", o;
	}
}, V = { oracle: (e) => new R(e) }, H = { oracle: (e) => new Ee() };
function De(e, t) {
	V[e.toLowerCase()] = t;
}
function Oe(e) {
	let t = String(e.getOptionValue("dialect") ?? "oracle").toLowerCase(), n = V[t];
	if (n == null) {
		let e = Object.keys(V).join(", ");
		throw Error(`Unknown SQL dialect: "${t}". Registered dialects: ${e}`);
	}
	return n(e);
}
function ke(e, t) {
	H[e.toLowerCase()] = t;
}
function Ae(e) {
	let t = String(e.getOptionValue("dialect") ?? "oracle").toLowerCase(), n = H[t];
	if (n == null) {
		let e = Object.keys(H).join(", ");
		throw Error(`Unknown SQL dialect for diff: "${t}". Registered dialects: ${e}`);
	}
	return n(e);
}
//#endregion
//#region src/utils/json-to-qsql.ts
function U(e) {
	let t = "";
	for (let n = 0; n < e; n++) t += "   ";
	return t;
}
function je(e, t) {
	for (let n in e) if (JSON.stringify(e[n]) === JSON.stringify(t)) return !0;
	return !1;
}
function W(e) {
	let t = ["_id", "Id"];
	if (e.id != null) return {
		key: "id",
		value: e.id
	};
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		for (let t in e) if (t.endsWith(r)) return {
			key: t,
			value: e[t]
		};
	}
	return null;
}
function Me(e) {
	if (typeof e != "object" || !e) return !1;'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('
	for (let t in e) if (!(e[t] != null && typeof e[t] == "object")) return !0;
	return !1;
}
function Ne(e) {
	let t = null;
	outer: for (let n in e) if (n === "0") for (let r in e[n]) {
		t = r;
		break outer;
	}
	else {
		t = n;
		break outer;
	}
	return t == null || t.toLowerCase() === "id" ? null : t.toLowerCase().endsWith("_id") ? t.substring(0, t.length - 3) : t.endsWith("Id") ? t.substring(0, t.length - 2) : null;
}
function Pe(e, t, n) {
	let r = !1, i = !1;
	for (let a in e) for (let o = 0; o < a; o++) if (e[a][t] === e[o][t] && e[a][n] !== e[o][n] ? r = !0 : e[a][t] !== e[o][t] && e[a][n] === e[o][n] && (i = !0), r && i) return !0;
	return !1;
}
function G(e) {
	if (typeof e != "object" || !e) return "";
	let t = "(";
	for (let n in e) {
		if (n === "0") return G(e[n]);
		e[n] != null && typeof e[n] == "object" || (t += n + ",");
	}
	return t.lastIndexOf(",") === t.length - 1 && (t = t.substring(0, t.length - 1)), t + ")";
}
function Fe(e, t) {
	let n = e, r = t, i = n.indexOf("(");
	0 < i && (n = n.substring(0, i));
	let a = r.indexOf("(");
	return 0 < a && (r = r.substring(0, a)), n + "_" + r + "(" + n + "_id," + r + "_id)";
}
var Ie = class {
	constructor() {
		this.tableContent = {}, this.notNormalized = [], this.tableSignatures = [], this.child2parent = {}, this.objCounts = {}, this.idSeq = 1;
	}
	output(e, t, n, r) {
		if (r !== !1 && this.notNormalized.includes(e)) {
			let r = Fe(this.parent(e) ?? "", e), i = this.tableContent[r];
			if (i != null) {
				let a = "\n" + U(n) + this.tableName(r) + " /insert " + i.length;
				if (Pe(i, this.refIdName(this.parent(e) ?? ""), this.refIdName(e))) return a + this.output(e, t, n + 1, !1);
			}
		}
		let i = this.notNormalized.includes(e) ? ">" : "", a = "\n" + U(n) + i + this.tableName(e);
		if (typeof t == "number" && (a += " num", e.endsWith("_id") || e.endsWith("Id"))) return a += " /pk", a;
		if (e === "id") return "\n" + U(n) + "id vc32 /pk";
		tofinal: if (typeof t == "object" && t) {
			if (Array.isAr'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('ray(t)) for (let i in t) {
				if (1 <= i) break;
				let o = t[i];
				a = this.output(e, o, n, r);
				break tofinal;
			}
			else e !== "" && (this.tableContent[e], a += "  /insert " + this.tableContent[e].length);
			let i = "";
			this.tableSignatures.includes(e) || (a = "", n--);
			for (let r in t) {
				let o = t[r];
				if (r != null) {
					let a = l(e) ?? "", o = r.toLowerCase();
					if (e != null && a + "_id" === o && 0 < n && (i = r), a + "_id" === o || !isNaN(r) && !Array.isArray(t)) continue;
				}
				let s = this.output(r + G(o), o, n + 1);
				a += s;
			}
			i !== "" && (a += "\n" + U(n) + i);
		}
		return a;
	}
	flatten(e, t, n) {
		let r = {};
		for (let i in t) {
			let a = t[i];
			if (typeof a == "object" && a) {
				let t = e, o = n;
				if (isNaN(i)) {
					t = i + G(a);
					let e = W(r);
					e != null && (o = e);
				}
				this.flatten(t, a, o);
			} else r[i] = a;
		}
		!this.notNormalized.includes(e) && n != null && Object.keys(r).length && (r[n.key] = n.value);
		let i = 0 < Object.keys(r).length, a = this.tableContent[e];
		if (i) {
			if (a ??= [], je(a, r) || a.push(r), this.notNormalized.includes(e)) {
				let t = this.parent(e);
				if (t != null) {
					let i = Fe(t, e), a = this.tableContent[i];
					a ??= [];
					let o = {};
					o[this.refIdName(t)] = n?.value;
					let s = W(r);
					s ??= (r.id = this.idSeq++, W(r)), o[this.refIdName(e)] = s.value, a.push(o), this.tableContent[i] = a;
				}
			}
			this.tableContent[e] = a;
		} else a ?? (this.tableContent[e] = []);
	}
	duplicatesAndParents(e, t) {
		let n = "\"" + e + "\":" + JSON.stringify(t), r = this.objCounts[n] ?? 0, i = !1;
		for (let n in t) {
			let r = t[n];
			if (typeof r == "object" && r) {
				let a = e;
				if (isNaN(n)) a = n + G(r);
				else if (!Array.isArray(t)) continue;
				a !== e && (this.child2parent[a] = e), this.duplicatesAndParents(a, r), i = !0;
			}
		}
		Me(t) && !this.tableSignatures.includes(e) && this.tableSignatures.push(e), i || (this.ob'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('jCounts[n] = r + 1), 1 < this.objCounts[n] && !this.notNormalized.includes(e) && this.notNormalized.push(e);
	}
	parent(e) {
		let t = this.child2parent[e];
		return t != null && !this.tableSignatures.includes(t) ? this.parent(t) : t ?? null;
	}
	tableName(e) {
		let t = e.indexOf("(");
		if (t < 0) return e;
		let n = e.substring(0, t), r = 0, i = -1;
		for (let t in this.tableSignatures) {
			let a = this.tableSignatures[t];
			a.substring(0, a.indexOf("(")) === n && r++, a === e && (i = r);
		}
		return r < 2 ? n : n + i;
	}
	refIdName(e) {
		return (l(this.tableName(e)) ?? this.tableName(e)) + "_id";
	}
};
function Le(e, t) {
	let n = JSON.parse(e), r = Ne(n);
	r != null && (t = r), t ??= "root_tbl";
	let i = new Ie();
	i.duplicatesAndParents(t + G(n), n), i.flatten(t + G(n), n);
	let a = i.output(t + G(n), n, 0);
	a += "\n\n#settings = { genpk: false, drop: true, pk: identityDataType, semantics: char }", a += "\n\n#flattened = \n";
	let o = {};
	for (let e in i.tableContent) o[i.tableName(e)] = i.tableContent[e];
	return a += JSON.stringify(o, null, 3), a += "\n", a += "\n\n-- Generated by json2qsql.js 2.0.0 " + (/* @__PURE__ */ new Date()).toLocaleString() + "\n\n", a += "#document = \n", a += JSON.stringify(n, null, 3), a += "\n", a;
}
//#endregion
//#region src/utils/error-msgs.ts
var K = class {
	constructor(e, t, n, r) {
		this.from = t, this.to = n ?? new q(t.line, t.depth + 1), this.message = e, this.severity = r ?? "error";
	}
}, q = class {
	constructor(e, t) {
		this.line = e, this.depth = t;
	}
}, Re = [
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
], ze = /* @__PURE__ */ "idx.index.indexed.unique.uk.check.constant.default.domain.hidden.invincible.values.upper.lower.nn.not.between.references.reference.cascade.setnull.fk.pk.trans.translation.translations".split("."), J = {
	du'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('plicateId: "Explicit ID column conflicts with genpk",
	invalidDatatype: "Invalid Datatype",
	undefinedObject: "Undefined Object: ",
	misalignedAttribute: "Misaligned Table or Column; apparent indent = ",
	tableDirectiveTypo: "Unknown Table directive",
	columnDirectiveTypo: "Unknown Column directive"
};
function Be(e) {
	let t = e, n = [], r = [];
	for (let t = 0; t < e.forest.length; t++) e.forest[t].inferType() === "table" && (r = r.concat(e.forest[t].descendants()));
	n = n.concat(We(r));
	let i = t.descendants();
	for (let e = 0; e < i.length; e++) {
		let r = i[e];
		if (t.optionEQvalue("genpk", !0) && i[e].parseName() === "id") {
			let e = r.content.toLowerCase().indexOf("id");
			n.push(new K(J.duplicateId, new q(r.line, e), new q(r.line, e + 2)));
			continue;
		}
		let a = r.src[2];
		if (2 < r.src.length && a.value === "-") {
			let e = a.begin;
			n.push(new K(J.invalidDatatype, new q(r.line, e), new q(r.line, e + 2)));
			continue;
		}
		let o = r.src[1];
		if (1 < r.src.length && o.value === "vc0") {
			let e = o.begin;
			n.push(new K(J.invalidDatatype, new q(r.line, e)));
			continue;
		}
		n = n.concat(He(t, r)), n = n.concat(Ue(t, r)), n = n.concat(Ve(t, r));
	}
	return n;
}
function Ve(e, t) {
	let n = t.inferType() === "table", r = [], i = t.src, a = !1;
	for (let e = 1; e < i.length; e++) {
		if (i[e].value === "/") {
			a = !0;
			continue;
		}
		a && (a = !1, n && Re.indexOf(i[e].value.toLowerCase()) < 0 && r.push(new K(J.tableDirectiveTypo, new q(t.line, i[e].begin), new q(t.line, i[e].begin + i[e].value.length))), !n && ze.indexOf(i[e].value.toLowerCase()) < 0 && r.push(new K(J.columnDirectiveTypo, new q(t.line, i[e].begin), new q(t.line, i[e].begin + i[e].value.length))));
	}
	return r;
}
function He(e, t) {
	let n = [];
	if (t.inferType() === "view") {
		let r = t.src;
		for (let i = 2; i < r.length; i++) e.find(r[i].value) ?? n.push(new K(J.undefinedObject + r[i].value, new q(t.line, r[i].begin), new q(t.line, r[i].begin + r[i].value.lengt'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('h)));
	}
	return n;
}
function Ue(e, t) {
	let n = [];
	if (t.isOption("fk") || 0 < t.indexOf("reference", !0)) {
		let r = t.indexOf("fk");
		if (r < 0 && (r = t.indexOf("reference")), r++, t.src.length - 1 < r || t.src[r].value === "/") return n;
		e.find(t.src[r].value) ?? n.push(new K(J.undefinedObject + t.src[r].value, new q(t.line, t.src[r].begin), new q(t.line, t.src[r].begin + t.src[r].value.length)));
	}
	return n;
}
function We(e) {
	let t = [], n = Ge(e);
	for (let r = 1; r < e.length; r++) {
		let i = e[r], a = Y(i);
		n !== null && a % n !== 0 && t.push(new K(J.misalignedAttribute + n, new q(i.line, a)));
	}
	return t;
}
function Ge(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) t[n] = Y(e[n]);
	let n = {};
	for (let e = 0; e < t.length; e++) {
		let r = Ke(t, e);
		if (r != null) {
			let i = t[e] - t[r];
			n[i] = (n[i] ?? 0) + 1;
		}
	}
	let r = null;
	for (let e in n) {
		let t = parseInt(e);
		(r === null || n[r] <= n[t]) && (r = t);
	}
	return r;
}
function Y(e) {
	return e.src[0].begin;
}
function Ke(e, t) {
	for (let n = t; 0 <= n; n--) if (e[n] < e[t]) return n;
	return null;
}
var qe = {
	findErrors: Be,
	messages: J
}, Je = "identityDataType", X = "guid", Ye = "Timestamp with time zone", Xe = "Timestamp with local time zone";
function Ze(e) {
	if (e == null) return null;
	let t = typeof e == "string" ? e.toLowerCase() : e;
	return t === "yes" || t === "y" || t === "true" || t === !0 ? !0 : t === "no" || t === "n" || t === "false" || t === !1 ? !1 : t === Je.toLowerCase() ? "identity" : t === X.toLowerCase() ? "guid" : t === Ye.toLowerCase() ? "tswtz" : t === Xe.toLowerCase() ? "tswltz" : typeof t == "string" ? t : String(t);
}
var Z = {
	apex: {
		label: "APEX",
		value: "no",
		check: ["yes", "no"]
	},
	auditcols: {
		label: "Audit Columns",
		value: "no",
		check: ["yes", "no"]
	},
	createdcol: {
		label: "Created Column Name",
		value: "created"
	},
	createdbycol: {
		label: "Created By Column Name",
		value: "created_by"
	},
	updat'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('edcol: {
		label: "Updated Column Name",
		value: "updated"
	},
	updatedbycol: {
		label: "Updated By Column Name",
		value: "updated_by"
	},
	auditdate: {
		label: "Audit Column Date Type",
		value: ""
	},
	aienrichment: {
		label: "AI Enrichment",
		value: "no",
		check: ["yes", "no"]
	},
	boolean: {
		label: "Boolean Datatype",
		value: "not set",
		check: ["yn", "native"]
	},
	genpk: {
		label: "Auto Primary Key",
		value: "yes",
		check: ["yes", "no"]
	},
	semantics: {
		label: "Character Strings",
		value: "CHAR",
		check: [
			"BYTE",
			"CHAR",
			"Default"
		]
	},
	language: {
		label: "Data Language",
		value: "EN",
		check: [
			"EN",
			"JP",
			"KO"
		]
	},
	datalimit: {
		label: "Data Limit Rows",
		value: 1e4
	},
	date: {
		label: "Date Data Type",
		value: "DATE",
		check: [
			"DATE",
			"TIMESTAMP",
			Ye,
			Xe
		]
	},
	db: {
		label: "Database Version",
		value: "not set"
	},
	dv: {
		label: "Duality View",
		value: "no",
		check: ["yes", "no"]
	},
	drop: {
		label: "Include Drops",
		value: "no",
		check: ["yes", "no"]
	},
	editionable: {
		label: "Editinable",
		value: "no",
		check: ["yes", "no"]
	},
	inserts: {
		label: "Generate Inserts",
		value: !0,
		check: ["yes", "no"]
	},
	namelen: {
		label: "Name Character Length",
		value: 255
	},
	overridesettings: {
		label: "Ignore toDDL() second parameter",
		value: "no",
		check: ["yes", "no"]
	},
	prefix: {
		label: "Object Prefix",
		value: ""
	},
	pk: {
		label: "Primary Key Maintenance",
		value: X,
		check: [
			Je,
			X,
			"SEQ",
			"NONE"
		]
	},
	prefixpkwithtname: {
		label: "Prefix primary keys with table name",
		value: "no",
		check: ["yes", "no"]
	},
	rowkey: {
		label: "Alphanumeric Row Identifier",
		value: "no",
		check: ["yes", "no"]
	},
	rowversion: {
		label: "Row Version Number",
		value: "no",
		check: ["yes", "no"]
	},
	schema: {
		label: "Schema",
		value: ""
	},
	api: {
		label: "Table API",
		value: "no",
		check: [
			"yes",
			"no",
			"layered"
		]
	},
	ifc: {
		lab'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('el: "API Interface Layer",
		value: "apex",
		check: ["apex", "none"]
	},
	compress: {
		label: "Table Compression",
		value: "no",
		check: ["yes", "no"]
	},
	transcontext: {
		label: "Translation Context",
		value: "sys_context(''APP_CTX'',''LANG'')"
	},
	dialect: {
		label: "SQL Dialect",
		value: "oracle"
	},
	longvc: {
		label: "Longer Varchars",
		value: "no",
		check: ["yes", "no"]
	},
	ondelete: {
		label: "On Delete",
		value: "",
		check: [
			"cascade",
			"restrict",
			"set null"
		]
	},
	tenantid: {
		label: "Tenant ID",
		value: "no",
		check: ["yes", "no"]
	},
	tenantref: {
		label: "Tenant Reference Table",
		value: ""
	},
	readonlyviews: {
		label: "Read-Only Views",
		value: "no",
		check: ["yes", "no"]
	},
	verbose: {
		label: "Verbose Output",
		value: "no",
		check: ["yes", "no"]
	}
}, Q = class {
	constructor(e, t) {
		this._ddl = null, this._erd = null, this._errors = null, this.postponedAlters = [], this.postponedAltersSet = /* @__PURE__ */ new Set(), this._labelToKey = {}, this.name2node = null, this.options = JSON.parse(JSON.stringify(Z)), this.input = e;
		for (let e in this.options) {
			let t = this.options[e].label;
			t != null && (this._labelToKey[t.toLowerCase()] = e);
		}
		let n = "";
		e.toLowerCase().includes("overridesettings") && oe(this), t !== void 0 && this.optionEQvalue("overrideSettings", !1) && (n = "# settings = " + String(t) + "\n\n"), this.input = n + e, this.forest = oe(this);
	}
	getOptionValue(e) {
		let t = e.toLowerCase(), n = this.options[t];
		if (!(t in this.options)) {
			let e = this._labelToKey[t];
			e != null && (n = this.options[e]);
		}
		return n?.value ?? null;
	}
	optionEQvalue(e, t) {
		return Ze(this.getOptionValue(e)) == Ze(t);
	}
	setOptionValue(e, t) {
		let n = e.toLowerCase();
		if (!(n in this.options)) {
			for (let n in this.options) if (this.options[n].label === e) {
				this.options[n].value = t ?? "";
				return;
			}
		}
		let r = t ?? "", i = this.options[n];
		i == null ? (i = {
			la'));
  DBMS_LOB.APPEND(l_src, TO_CLOB('bel: n,
			value: r
		}, this.options[n] = i) : i.value = r;
	}
	nonDefaultOptions() {
		let e = {};
		for (let t in this.options) Z[t] && !this.optionEQvalue(t, Z[t].value) && (e[t] = this.options[t].value);
		return e;
	}
	unknownOptions() {
		let e = [];
		for (let t in this.options) Z[t] ?? e.push(t);
		return e;
	}
	setOptions(e) {
		e = e.trim(), e.startsWith("#") && (e = e.substring(1).trim());
		let t = e.indexOf("="), n = e.substring(t + 1).trim();
		n.includes("{") || (n = "{" + e + "}");
		let r = "", i = x(n, !0, !0, "");
		for (let e of i) e.type === "identifier" && e.value !== "true" && e.value !== "false" && e.value !== "null" || e.type === "constant.numeric" && !/^\d+(\.\d+)?$/.test(e.value) ? r += "\"" + e.value + "\"" : r += e.value;
		let a = JSON.parse(r);
		for (let e in a) this.setOptionValue(e.toLowerCase(), a[e]);
	}
	semantics() {
		return this.optionEQvalue("semantics", "CHAR") ? " char" : this.optionEQvalue("semantics", "BYTE") ? " byte" : "";
	}
	objPrefix(e) {
		let t = this.getOptionValue("schema") ?? "";
		t = t !== "" && e == null ? t + "." : "";
		let n = this.getOptionValue("prefix") ?? "", r = n !== "" && !n.endsWith("_") ? "_" : "";
		return (t + n + r).toLowerCase();
	}
	find(e) {
		if (this.name2node != null) return this.name2node[d(e)] ?? null;
		this.name2node = {};
		for (let e of this.forest) for (let t of e.descendants()) this.name2node[t.parseName()] = t;
		return this.name2node[d(e)] ?? null;
	}
	descendants() {
		let e = [];
		for (let t of this.forest) e.push(...t.descendants());
		return e;
	}
	additionalColumns() {
		let e = {}, t = this.getOptionValue("Auxiliary Columns");
		if (t == null) return e;
		for (let n of t.split(",")) {
			let t = n.trim(), r = t.indexOf(" ");
			r > 0 ? e[t.substring(0, r)] = t.substring(r + 1).toUpperCase() : e[t] = "VARCHAR2(4000)";
		}
		return e;
	}
	getERD() {
		return this._erd ??= Oe(this).generateERD(), this._erd;
	}
	getDDL() {
		return this._ddl ??= Oe(this).generateFullDDL() + '));
  DBMS_LOB.APPEND(l_src, TO_CLOB('this._makeFooter(), this._ddl;
	}
	_makeFooter() {
		let e = (e) => e.replace(/\/\*/g, "--<--").replace(/\*\//g, "-->--").replace(/\/*\s*Non-default options:/g, ""), t = `-- Generated by Radicle QuickSQL ${this.version()} ${(/* @__PURE__ */ new Date()).toLocaleString()}\n\n`;
		t += "/*\n", t += e(this.input), t += "\n";
		for (let e of this.unknownOptions()) t += "*** Unknown setting: " + e + "\n";
		return t += "\n*/", t;
	}
	getErrors() {
		return this._errors ??= qe.findErrors(this), this._errors;
	}
	version() {
		return $();
	}
};
function Qe(e, t) {
	return Le(e, t);
}
function $e(e, t) {
	return new Q(e, t).getERD();
}
function et(e, t) {
	return new Q(e, t).getDDL();
}
function tt(e, t) {
	return new Q(e, t).getErrors();
}
function nt(e, t, n) {
	let r = new Q(t, n), i = new Q(e, n);
	return Ae(r).compute(i, r);
}
function $() {
	return "2.0.0";
}
Q.toDDL = et, Q.toERD = $e, Q.toErrors = tt, Q.toDiff = nt, Q.fromJSON = Qe, Q.version = $, Q.lexer = x;
//#endregion
export { ge as BaseGenerator, Ae as createDiffGenerator, Q as default, Q as quicksql, Qe as fromJSON, $ as qsql_version, ke as registerDiffGenerator, De as registerGenerator, et as toDDL, nt as toDiff, $e as toERD, tt as toErrors };
'));
  EXECUTE IMMEDIATE
    'CREATE OR REPLACE MLE MODULE expresql_module LANGUAGE JAVASCRIPT AS $QSQL$' ||
    l_src ||
    '$QSQL$';
  DBMS_LOB.FREETEMPORARY(l_src);
  DBMS_OUTPUT.PUT_LINE('OK  expresql_module caricato.');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_LOB.FREETEMPORARY(l_src);
    RAISE;
END;
/

SET DEFINE ON

SELECT module_name,
       language,
       status,
       ROUND(LENGTH(module_source) / 1024, 1) AS size_kb
FROM   user_mle_modules
WHERE  module_name = 'EXPRESQL_MODULE';

SELECT name, line, text
FROM   user_errors
WHERE  name = 'EXPRESQL_MODULE'
ORDER  BY line;

PROMPT >>> mle/01_install_module.sql completato.
