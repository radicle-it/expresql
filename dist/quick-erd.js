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
}) : a, n)), l = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (e, t) => (typeof require < "u" ? require : e)[t] }) : e)(function(e) {
	if (typeof require < "u") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}), u = {};
//#endregion
//#region src/quick-erd/renderer.js
u.colors = [], u.FONT_FAMILY = "var(--qs-diagram-font-family, \"Arial\")", u.colors.TABLE_BACKGROUND = "var(--qs-diagram-table-background-color, rgb(254,246,222))", u.colors.TABLE_BORDER = "var(--qs-diagram-table-border-color, rgba(0,0,0,.1))", u.colors.TABLE_NAME_TEXT = "var(--qs-diagram-table-name-text-color, var(--qs-diagram-table-text-color, rgba(0,0,0,.8)))", u.colors.TABLE_COLUMN_TEXT = "var(--qs-diagram-table-column-text-color, var(--qs-diagram-table-text-color, rgba(0,0,0,.8)))", u.colors.TABLE_DATA_TYPE_TEXT = "var(--qs-diagram-table-data-type-text-color, var(--qs-diagram-table-text-color, rgba(0,0,0,.4)))", typeof document < "u" && (u.TABLE_BORDER_RADIUS = getComputedStyle(document.documentElement).getPropertyValue("--qs-diagram-table-border-radius")), u.TABLE_BORDER_RADIUS = u.TABLE_BORDER_RADIUS ? u.TABLE_BORDER_RADIUS : 0, u.colors.VIEW_BACKGROUND = "var(--qs-diagram-view-background-color, rgb(236,245,231))", u.colors.VIEW_BORDER = "var(--qs-diagram-view-border-color, rgba(0,0,0,.1))", u.colors.VIEW_NAME_TEXT = "var(--qs-diagram-view-text-color, rgb(0,0,0))", u.colors.VIEW_COLUMN_TEXT = "var(--qs-diagram-view-column-text-color, var(--qs-diagram-view-text-color, rgba(0,0,0,.8)))", u.colors.VIEW_DATA_TYPE_TEXT = "var(--qs-diagram-view-data-type-text-color, var(--qs-diagram-view-text-color, rgba(0,0,0,.4)))", typeof document < "u" && (u.VIEW_BORDER_RADIUS = getComputedStyle(document.documentElement).getPropertyValue("--qs-diagram-view-border-radius")), u.VIEW_BORDER_RADIUS = u.VIEW_BORDER_RADIUS ? u.VIEW_BORDER_RADIUS : 4, u.colors.LINK = "var(--qs-diagram-link-color, rgba(140,140,140,1))", typeof joint < "u" && (joint.shapes.quicksql = {}, joint.shapes.quicksql.Table = joint.shapes.standard.HeaderedRecord.define("quicksql.Table", {
	z: 0,
	columns: [],
	padding: {
		top: 25,
		bottom: 5,
		left: 0,
		right: 0
	},
	size: { width: 60 },
	itemMinLabelWidth: 60,
	itemHeight: 16,
	itemOverflow: !0,
	attrs: {
		root: { magnet: !1 },
		body: {
			rx: u.TABLE_BORDER_RADIUS,
			ry: u.TABLE_BORDER_RADIUS,
			fill: u.colors.TABLE_BACKGROUND,
			stroke: u.colors.TABLE_BORDER,
			"stroke-width": 1,
			refWidth: "100%",
			refHeight: "100%"
		},
		headerLabel: {
			y: -4,
			fontFamily: u.FONT_FAMILY,
			fill: u.colors.TABLE_NAME_TEXT,
			fontWeight: "bold",
			fontSize: 12,
			textWrap: {
				ellipsis: !0,
				height: 20
			}
		},
		separator: {
			stroke: u.colors.TABLE_BORDER,
			strokeWidth: 1
		},
		itemBodies_0: {
			magnet: !1,
			pointerEvents: "none"
		},
		group_1: { pointerEvents: "none" },
		itemLabels: {
			fontFamily: u.FONT_FAMILY,
			fontWeight: "bold",
			fontSize: 10,
			fill: u.colors.TABLE_COLUMN_TEXT,
			pointerEvents: "none"
		},
		itemLabels_1: {
			fill: u.colors.TABLE_DATA_TYPE_TEXT,
			textAnchor: "end",
			x: "calc(0.5 * w - 20)"
		}
	}
}, {
	markup: [
		{
			tagName: "rect",
			selector: "body"
		},
		{
			tagName: "text",
			selector: "headerLabel"
		},
		{
			tagName: "path",
			selector: "separator"
		}
	],
	setName(e, t) {
		return this.attr(["headerLabel", "text"], e, t);
	},
	setColumns(e = []) {
		let t = [], n = [], r = /* @__PURE__ */ new Set();
		e.forEach((e, i) => {
			if (!e.name) return;
			let a = e.name;
			r.has(a) && (a = `${e.name}_${i}`), r.add(a), t.push({
				id: a,
				label: e.name,
				span: 2
			});
			let o = {
				id: `${e.datatype}_${i}`,
				label: e.datatype
			};
			n.push(o);
		}), this.set("items", [t, n]), this.removeInvalidLinks();
	}
}), joint.shapes.quicksql.TableView = joint.shapes.standard.RecordView.extend({
	initialize: function() {
		joint.dia.ElementView.prototype.initialize.apply(this, arguments), this.updatePath();
	},
	updatePath: function() {
		var e = "M 0 20 L " + this.model.get("size").width + " 20";
		this.model.attr("separator/d", e, { silent: !0 });
	}
}), joint.shapes.quicksql.View = joint.shapes.quicksql.Table.define("quicksql.View", { attrs: {
	body: {
		rx: u.VIEW_BORDER_RADIUS,
		ry: u.VIEW_BORDER_RADIUS,
		fill: u.colors.VIEW_BACKGROUND,
		stroke: u.colors.VIEW_BORDER
	},
	headerLabel: {
		fontFamily: u.FONT_FAMILY,
		fill: u.colors.VIEW_NAME_TEXT
	},
	separator: { stroke: u.colors.TABLE_BORDER },
	itemLabels: { fill: u.colors.VIEW_COLUMN_TEXT },
	itemLabels_1: { fill: u.colors.VIEW_DATA_TYPE_TEXT }
} }), joint.shapes.quicksql.ViewView = joint.shapes.quicksql.TableView, joint.shapes.quicksql.Relation = joint.shapes.standard.Link.define("quicksql.Relation", {
	z: -1,
	attrs: { line: {
		stroke: u.colors.LINK,
		strokeWidth: 1,
		strokeDasharray: "none",
		sourceMarker: {
			d: "M 5 -4 L 0 0 L 5 4 z",
			fill: u.colors.LINK,
			stroke: u.colors.LINK
		},
		targetMarker: { d: "" }
	} },
	style: "none",
	sourceTable: "",
	targetTable: ""
}, {
	initialize: function() {
		joint.shapes.standard.Link.prototype.initialize.apply(this, arguments), this.updateStyle();
	},
	updateStyle: function() {
		this.attr("line/strokeDasharray", this.get("style") === "dash" ? "5 5" : "none");
	}
}));
//#endregion
//#region src/quick-erd/utils.js
var d = {}, f = typeof document < "u" && getComputedStyle(document.querySelector(":root")).getPropertyValue("--qs-diagram-font-family") || "Arial";
d.newGuid = function() {
	function e(e) {
		var t = (Math.random().toString(16) + "000000000").substr(2, 8);
		return e ? "-" + t.substr(0, 4) + "-" + t.substr(4, 4) : t;
	}
	return e() + e(!0) + e(!0) + e();
}, d.calcWidth = function(e, t, n) {
	var r = t;
	e && (r = e.concat(".").concat(t));
	for (var i = d.getTextWidth(r, `12pt ${f}`) + 0, a = 0, o = 0, s = 0; s < n.length; s++) a = Math.max(a, d.getTextWidth(n[s].name, `10pt ${f}`)), o = Math.max(o, d.getTextWidth(n[s].datatype, `10pt ${f}`));
	let c = o > a ? o * 2 + 20 : a + o + 20;
	return Math.max(Math.max(i, c), 230);
}, d.getTextWidth = function(e, t) {
	var n = (d.getTextWidth.canvas || (d.getTextWidth.canvas = document.createElement("canvas"))).getContext("2d");
	return n.font = t, n.measureText(e).width;
};
//#endregion
//#region node_modules/lodash/_listCacheClear.js
var p = /* @__PURE__ */ o(((e, t) => {
	function n() {
		this.__data__ = [], this.size = 0;
	}
	t.exports = n;
})), m = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return e === t || e !== e && t !== t;
	}
	t.exports = n;
})), h = /* @__PURE__ */ o(((e, t) => {
	var n = m();
	function r(e, t) {
		for (var r = e.length; r--;) if (n(e[r][0], t)) return r;
		return -1;
	}
	t.exports = r;
})), g = /* @__PURE__ */ o(((e, t) => {
	var n = h(), r = Array.prototype.splice;
	function i(e) {
		var t = this.__data__, i = n(t, e);
		return i < 0 ? !1 : (i == t.length - 1 ? t.pop() : r.call(t, i, 1), --this.size, !0);
	}
	t.exports = i;
})), _ = /* @__PURE__ */ o(((e, t) => {
	var n = h();
	function r(e) {
		var t = this.__data__, r = n(t, e);
		return r < 0 ? void 0 : t[r][1];
	}
	t.exports = r;
})), v = /* @__PURE__ */ o(((e, t) => {
	var n = h();
	function r(e) {
		return n(this.__data__, e) > -1;
	}
	t.exports = r;
})), y = /* @__PURE__ */ o(((e, t) => {
	var n = h();
	function r(e, t) {
		var r = this.__data__, i = n(r, e);
		return i < 0 ? (++this.size, r.push([e, t])) : r[i][1] = t, this;
	}
	t.exports = r;
})), b = /* @__PURE__ */ o(((e, t) => {
	var n = p(), r = g(), i = _(), a = v(), o = y();
	function s(e) {
		var t = -1, n = e == null ? 0 : e.length;
		for (this.clear(); ++t < n;) {
			var r = e[t];
			this.set(r[0], r[1]);
		}
	}
	s.prototype.clear = n, s.prototype.delete = r, s.prototype.get = i, s.prototype.has = a, s.prototype.set = o, t.exports = s;
})), x = /* @__PURE__ */ o(((e, t) => {
	var n = b();
	function r() {
		this.__data__ = new n(), this.size = 0;
	}
	t.exports = r;
})), S = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = this.__data__, n = t.delete(e);
		return this.size = t.size, n;
	}
	t.exports = n;
})), C = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return this.__data__.get(e);
	}
	t.exports = n;
})), w = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return this.__data__.has(e);
	}
	t.exports = n;
})), T = /* @__PURE__ */ o(((e, t) => {
	t.exports = typeof global == "object" && global && global.Object === Object && global;
})), E = /* @__PURE__ */ o(((e, t) => {
	var n = T(), r = typeof self == "object" && self && self.Object === Object && self;
	t.exports = n || r || Function("return this")();
})), D = /* @__PURE__ */ o(((e, t) => {
	t.exports = E().Symbol;
})), O = /* @__PURE__ */ o(((e, t) => {
	var n = D(), r = Object.prototype, i = r.hasOwnProperty, a = r.toString, o = n ? n.toStringTag : void 0;
	function s(e) {
		var t = i.call(e, o), n = e[o];
		try {
			e[o] = void 0;
			var r = !0;
		} catch {}
		var s = a.call(e);
		return r && (t ? e[o] = n : delete e[o]), s;
	}
	t.exports = s;
})), k = /* @__PURE__ */ o(((e, t) => {
	var n = Object.prototype.toString;
	function r(e) {
		return n.call(e);
	}
	t.exports = r;
})), A = /* @__PURE__ */ o(((e, t) => {
	var n = D(), r = O(), i = k(), a = "[object Null]", o = "[object Undefined]", s = n ? n.toStringTag : void 0;
	function c(e) {
		return e == null ? e === void 0 ? o : a : s && s in Object(e) ? r(e) : i(e);
	}
	t.exports = c;
})), j = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = typeof e;
		return e != null && (t == "object" || t == "function");
	}
	t.exports = n;
})), M = /* @__PURE__ */ o(((e, t) => {
	var n = A(), r = j(), i = "[object AsyncFunction]", a = "[object Function]", o = "[object GeneratorFunction]", s = "[object Proxy]";
	function c(e) {
		if (!r(e)) return !1;
		var t = n(e);
		return t == a || t == o || t == i || t == s;
	}
	t.exports = c;
})), ee = /* @__PURE__ */ o(((e, t) => {
	t.exports = E()["__core-js_shared__"];
})), te = /* @__PURE__ */ o(((e, t) => {
	var n = ee(), r = function() {
		var e = /[^.]+$/.exec(n && n.keys && n.keys.IE_PROTO || "");
		return e ? "Symbol(src)_1." + e : "";
	}();
	function i(e) {
		return !!r && r in e;
	}
	t.exports = i;
})), N = /* @__PURE__ */ o(((e, t) => {
	var n = Function.prototype.toString;
	function r(e) {
		if (e != null) {
			try {
				return n.call(e);
			} catch {}
			try {
				return e + "";
			} catch {}
		}
		return "";
	}
	t.exports = r;
})), P = /* @__PURE__ */ o(((e, t) => {
	var n = M(), r = te(), i = j(), a = N(), o = /[\\^$.*+?()[\]{}|]/g, s = /^\[object .+?Constructor\]$/, c = Function.prototype, l = Object.prototype, u = c.toString, d = l.hasOwnProperty, f = RegExp("^" + u.call(d).replace(o, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
	function p(e) {
		return !i(e) || r(e) ? !1 : (n(e) ? f : s).test(a(e));
	}
	t.exports = p;
})), ne = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return e?.[t];
	}
	t.exports = n;
})), F = /* @__PURE__ */ o(((e, t) => {
	var n = P(), r = ne();
	function i(e, t) {
		var i = r(e, t);
		return n(i) ? i : void 0;
	}
	t.exports = i;
})), I = /* @__PURE__ */ o(((e, t) => {
	t.exports = F()(E(), "Map");
})), L = /* @__PURE__ */ o(((e, t) => {
	t.exports = F()(Object, "create");
})), R = /* @__PURE__ */ o(((e, t) => {
	var n = L();
	function r() {
		this.__data__ = n ? n(null) : {}, this.size = 0;
	}
	t.exports = r;
})), re = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = this.has(e) && delete this.__data__[e];
		return this.size -= +!!t, t;
	}
	t.exports = n;
})), ie = /* @__PURE__ */ o(((e, t) => {
	var n = L(), r = "__lodash_hash_undefined__", i = Object.prototype.hasOwnProperty;
	function a(e) {
		var t = this.__data__;
		if (n) {
			var a = t[e];
			return a === r ? void 0 : a;
		}
		return i.call(t, e) ? t[e] : void 0;
	}
	t.exports = a;
})), ae = /* @__PURE__ */ o(((e, t) => {
	var n = L(), r = Object.prototype.hasOwnProperty;
	function i(e) {
		var t = this.__data__;
		return n ? t[e] !== void 0 : r.call(t, e);
	}
	t.exports = i;
})), oe = /* @__PURE__ */ o(((e, t) => {
	var n = L(), r = "__lodash_hash_undefined__";
	function i(e, t) {
		var i = this.__data__;
		return this.size += +!this.has(e), i[e] = n && t === void 0 ? r : t, this;
	}
	t.exports = i;
})), se = /* @__PURE__ */ o(((e, t) => {
	var n = R(), r = re(), i = ie(), a = ae(), o = oe();
	function s(e) {
		var t = -1, n = e == null ? 0 : e.length;
		for (this.clear(); ++t < n;) {
			var r = e[t];
			this.set(r[0], r[1]);
		}
	}
	s.prototype.clear = n, s.prototype.delete = r, s.prototype.get = i, s.prototype.has = a, s.prototype.set = o, t.exports = s;
})), ce = /* @__PURE__ */ o(((e, t) => {
	var n = se(), r = b(), i = I();
	function a() {
		this.size = 0, this.__data__ = {
			hash: new n(),
			map: new (i || r)(),
			string: new n()
		};
	}
	t.exports = a;
})), le = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = typeof e;
		return t == "string" || t == "number" || t == "symbol" || t == "boolean" ? e !== "__proto__" : e === null;
	}
	t.exports = n;
})), ue = /* @__PURE__ */ o(((e, t) => {
	var n = le();
	function r(e, t) {
		var r = e.__data__;
		return n(t) ? r[typeof t == "string" ? "string" : "hash"] : r.map;
	}
	t.exports = r;
})), de = /* @__PURE__ */ o(((e, t) => {
	var n = ue();
	function r(e) {
		var t = n(this, e).delete(e);
		return this.size -= +!!t, t;
	}
	t.exports = r;
})), fe = /* @__PURE__ */ o(((e, t) => {
	var n = ue();
	function r(e) {
		return n(this, e).get(e);
	}
	t.exports = r;
})), pe = /* @__PURE__ */ o(((e, t) => {
	var n = ue();
	function r(e) {
		return n(this, e).has(e);
	}
	t.exports = r;
})), me = /* @__PURE__ */ o(((e, t) => {
	var n = ue();
	function r(e, t) {
		var r = n(this, e), i = r.size;
		return r.set(e, t), this.size += r.size == i ? 0 : 1, this;
	}
	t.exports = r;
})), z = /* @__PURE__ */ o(((e, t) => {
	var n = ce(), r = de(), i = fe(), a = pe(), o = me();
	function s(e) {
		var t = -1, n = e == null ? 0 : e.length;
		for (this.clear(); ++t < n;) {
			var r = e[t];
			this.set(r[0], r[1]);
		}
	}
	s.prototype.clear = n, s.prototype.delete = r, s.prototype.get = i, s.prototype.has = a, s.prototype.set = o, t.exports = s;
})), he = /* @__PURE__ */ o(((e, t) => {
	var n = b(), r = I(), i = z(), a = 200;
	function o(e, t) {
		var o = this.__data__;
		if (o instanceof n) {
			var s = o.__data__;
			if (!r || s.length < a - 1) return s.push([e, t]), this.size = ++o.size, this;
			o = this.__data__ = new i(s);
		}
		return o.set(e, t), this.size = o.size, this;
	}
	t.exports = o;
})), ge = /* @__PURE__ */ o(((e, t) => {
	var n = b(), r = x(), i = S(), a = C(), o = w(), s = he();
	function c(e) {
		var t = this.__data__ = new n(e);
		this.size = t.size;
	}
	c.prototype.clear = r, c.prototype.delete = i, c.prototype.get = a, c.prototype.has = o, c.prototype.set = s, t.exports = c;
})), _e = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		for (var n = -1, r = e == null ? 0 : e.length; ++n < r && t(e[n], n, e) !== !1;);
		return e;
	}
	t.exports = n;
})), ve = /* @__PURE__ */ o(((e, t) => {
	var n = F();
	t.exports = function() {
		try {
			var e = n(Object, "defineProperty");
			return e({}, "", {}), e;
		} catch {}
	}();
})), ye = /* @__PURE__ */ o(((e, t) => {
	var n = ve();
	function r(e, t, r) {
		t == "__proto__" && n ? n(e, t, {
			configurable: !0,
			enumerable: !0,
			value: r,
			writable: !0
		}) : e[t] = r;
	}
	t.exports = r;
})), be = /* @__PURE__ */ o(((e, t) => {
	var n = ye(), r = m(), i = Object.prototype.hasOwnProperty;
	function a(e, t, a) {
		var o = e[t];
		(!(i.call(e, t) && r(o, a)) || a === void 0 && !(t in e)) && n(e, t, a);
	}
	t.exports = a;
})), xe = /* @__PURE__ */ o(((e, t) => {
	var n = be(), r = ye();
	function i(e, t, i, a) {
		var o = !i;
		i ||= {};
		for (var s = -1, c = t.length; ++s < c;) {
			var l = t[s], u = a ? a(i[l], e[l], l, i, e) : void 0;
			u === void 0 && (u = e[l]), o ? r(i, l, u) : n(i, l, u);
		}
		return i;
	}
	t.exports = i;
})), Se = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		for (var n = -1, r = Array(e); ++n < e;) r[n] = t(n);
		return r;
	}
	t.exports = n;
})), B = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return typeof e == "object" && !!e;
	}
	t.exports = n;
})), Ce = /* @__PURE__ */ o(((e, t) => {
	var n = A(), r = B(), i = "[object Arguments]";
	function a(e) {
		return r(e) && n(e) == i;
	}
	t.exports = a;
})), we = /* @__PURE__ */ o(((e, t) => {
	var n = Ce(), r = B(), i = Object.prototype, a = i.hasOwnProperty, o = i.propertyIsEnumerable;
	t.exports = n(function() {
		return arguments;
	}()) ? n : function(e) {
		return r(e) && a.call(e, "callee") && !o.call(e, "callee");
	};
})), V = /* @__PURE__ */ o(((e, t) => {
	t.exports = Array.isArray;
})), Te = /* @__PURE__ */ o(((e, t) => {
	function n() {
		return !1;
	}
	t.exports = n;
})), H = /* @__PURE__ */ o(((e, t) => {
	var n = E(), r = Te(), i = typeof e == "object" && e && !e.nodeType && e, a = i && typeof t == "object" && t && !t.nodeType && t, o = a && a.exports === i ? n.Buffer : void 0;
	t.exports = (o ? o.isBuffer : void 0) || r;
})), Ee = /* @__PURE__ */ o(((e, t) => {
	var n = 9007199254740991, r = /^(?:0|[1-9]\d*)$/;
	function i(e, t) {
		var i = typeof e;
		return t ??= n, !!t && (i == "number" || i != "symbol" && r.test(e)) && e > -1 && e % 1 == 0 && e < t;
	}
	t.exports = i;
})), De = /* @__PURE__ */ o(((e, t) => {
	var n = 9007199254740991;
	function r(e) {
		return typeof e == "number" && e > -1 && e % 1 == 0 && e <= n;
	}
	t.exports = r;
})), Oe = /* @__PURE__ */ o(((e, t) => {
	var n = A(), r = De(), i = B(), a = "[object Arguments]", o = "[object Array]", s = "[object Boolean]", c = "[object Date]", l = "[object Error]", u = "[object Function]", d = "[object Map]", f = "[object Number]", p = "[object Object]", m = "[object RegExp]", h = "[object Set]", g = "[object String]", _ = "[object WeakMap]", v = "[object ArrayBuffer]", y = "[object DataView]", b = "[object Float32Array]", x = "[object Float64Array]", S = "[object Int8Array]", C = "[object Int16Array]", w = "[object Int32Array]", T = "[object Uint8Array]", E = "[object Uint8ClampedArray]", D = "[object Uint16Array]", O = "[object Uint32Array]", k = {};
	k[b] = k[x] = k[S] = k[C] = k[w] = k[T] = k[E] = k[D] = k[O] = !0, k[a] = k[o] = k[v] = k[s] = k[y] = k[c] = k[l] = k[u] = k[d] = k[f] = k[p] = k[m] = k[h] = k[g] = k[_] = !1;
	function j(e) {
		return i(e) && r(e.length) && !!k[n(e)];
	}
	t.exports = j;
})), ke = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return function(t) {
			return e(t);
		};
	}
	t.exports = n;
})), Ae = /* @__PURE__ */ o(((e, t) => {
	var n = T(), r = typeof e == "object" && e && !e.nodeType && e, i = r && typeof t == "object" && t && !t.nodeType && t, a = i && i.exports === r && n.process;
	t.exports = function() {
		try {
			return i && i.require && i.require("util").types || a && a.binding && a.binding("util");
		} catch {}
	}();
})), je = /* @__PURE__ */ o(((e, t) => {
	var n = Oe(), r = ke(), i = Ae(), a = i && i.isTypedArray;
	t.exports = a ? r(a) : n;
})), Me = /* @__PURE__ */ o(((e, t) => {
	var n = Se(), r = we(), i = V(), a = H(), o = Ee(), s = je(), c = Object.prototype.hasOwnProperty;
	function l(e, t) {
		var l = i(e), u = !l && r(e), d = !l && !u && a(e), f = !l && !u && !d && s(e), p = l || u || d || f, m = p ? n(e.length, String) : [], h = m.length;
		for (var g in e) (t || c.call(e, g)) && !(p && (g == "length" || d && (g == "offset" || g == "parent") || f && (g == "buffer" || g == "byteLength" || g == "byteOffset") || o(g, h))) && m.push(g);
		return m;
	}
	t.exports = l;
})), Ne = /* @__PURE__ */ o(((e, t) => {
	var n = Object.prototype;
	function r(e) {
		var t = e && e.constructor;
		return e === (typeof t == "function" && t.prototype || n);
	}
	t.exports = r;
})), Pe = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return function(n) {
			return e(t(n));
		};
	}
	t.exports = n;
})), Fe = /* @__PURE__ */ o(((e, t) => {
	t.exports = Pe()(Object.keys, Object);
})), Ie = /* @__PURE__ */ o(((e, t) => {
	var n = Ne(), r = Fe(), i = Object.prototype.hasOwnProperty;
	function a(e) {
		if (!n(e)) return r(e);
		var t = [];
		for (var a in Object(e)) i.call(e, a) && a != "constructor" && t.push(a);
		return t;
	}
	t.exports = a;
})), U = /* @__PURE__ */ o(((e, t) => {
	var n = M(), r = De();
	function i(e) {
		return e != null && r(e.length) && !n(e);
	}
	t.exports = i;
})), W = /* @__PURE__ */ o(((e, t) => {
	var n = Me(), r = Ie(), i = U();
	function a(e) {
		return i(e) ? n(e) : r(e);
	}
	t.exports = a;
})), Le = /* @__PURE__ */ o(((e, t) => {
	var n = xe(), r = W();
	function i(e, t) {
		return e && n(t, r(t), e);
	}
	t.exports = i;
})), Re = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = [];
		if (e != null) for (var n in Object(e)) t.push(n);
		return t;
	}
	t.exports = n;
})), ze = /* @__PURE__ */ o(((e, t) => {
	var n = j(), r = Ne(), i = Re(), a = Object.prototype.hasOwnProperty;
	function o(e) {
		if (!n(e)) return i(e);
		var t = r(e), o = [];
		for (var s in e) s == "constructor" && (t || !a.call(e, s)) || o.push(s);
		return o;
	}
	t.exports = o;
})), G = /* @__PURE__ */ o(((e, t) => {
	var n = Me(), r = ze(), i = U();
	function a(e) {
		return i(e) ? n(e, !0) : r(e);
	}
	t.exports = a;
})), Be = /* @__PURE__ */ o(((e, t) => {
	var n = xe(), r = G();
	function i(e, t) {
		return e && n(t, r(t), e);
	}
	t.exports = i;
})), Ve = /* @__PURE__ */ o(((e, t) => {
	var n = E(), r = typeof e == "object" && e && !e.nodeType && e, i = r && typeof t == "object" && t && !t.nodeType && t, a = i && i.exports === r ? n.Buffer : void 0, o = a ? a.allocUnsafe : void 0;
	function s(e, t) {
		if (t) return e.slice();
		var n = e.length, r = o ? o(n) : new e.constructor(n);
		return e.copy(r), r;
	}
	t.exports = s;
})), He = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		var n = -1, r = e.length;
		for (t ||= Array(r); ++n < r;) t[n] = e[n];
		return t;
	}
	t.exports = n;
})), Ue = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		for (var n = -1, r = e == null ? 0 : e.length, i = 0, a = []; ++n < r;) {
			var o = e[n];
			t(o, n, e) && (a[i++] = o);
		}
		return a;
	}
	t.exports = n;
})), We = /* @__PURE__ */ o(((e, t) => {
	function n() {
		return [];
	}
	t.exports = n;
})), Ge = /* @__PURE__ */ o(((e, t) => {
	var n = Ue(), r = We(), i = Object.prototype.propertyIsEnumerable, a = Object.getOwnPropertySymbols;
	t.exports = a ? function(e) {
		return e == null ? [] : (e = Object(e), n(a(e), function(t) {
			return i.call(e, t);
		}));
	} : r;
})), Ke = /* @__PURE__ */ o(((e, t) => {
	var n = xe(), r = Ge();
	function i(e, t) {
		return n(e, r(e), t);
	}
	t.exports = i;
})), qe = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		for (var n = -1, r = t.length, i = e.length; ++n < r;) e[i + n] = t[n];
		return e;
	}
	t.exports = n;
})), Je = /* @__PURE__ */ o(((e, t) => {
	t.exports = Pe()(Object.getPrototypeOf, Object);
})), Ye = /* @__PURE__ */ o(((e, t) => {
	var n = qe(), r = Je(), i = Ge(), a = We();
	t.exports = Object.getOwnPropertySymbols ? function(e) {
		for (var t = []; e;) n(t, i(e)), e = r(e);
		return t;
	} : a;
})), Xe = /* @__PURE__ */ o(((e, t) => {
	var n = xe(), r = Ye();
	function i(e, t) {
		return n(e, r(e), t);
	}
	t.exports = i;
})), Ze = /* @__PURE__ */ o(((e, t) => {
	var n = qe(), r = V();
	function i(e, t, i) {
		var a = t(e);
		return r(e) ? a : n(a, i(e));
	}
	t.exports = i;
})), Qe = /* @__PURE__ */ o(((e, t) => {
	var n = Ze(), r = Ge(), i = W();
	function a(e) {
		return n(e, i, r);
	}
	t.exports = a;
})), $e = /* @__PURE__ */ o(((e, t) => {
	var n = Ze(), r = Ye(), i = G();
	function a(e) {
		return n(e, i, r);
	}
	t.exports = a;
})), et = /* @__PURE__ */ o(((e, t) => {
	t.exports = F()(E(), "DataView");
})), tt = /* @__PURE__ */ o(((e, t) => {
	t.exports = F()(E(), "Promise");
})), nt = /* @__PURE__ */ o(((e, t) => {
	t.exports = F()(E(), "Set");
})), rt = /* @__PURE__ */ o(((e, t) => {
	t.exports = F()(E(), "WeakMap");
})), K = /* @__PURE__ */ o(((e, t) => {
	var n = et(), r = I(), i = tt(), a = nt(), o = rt(), s = A(), c = N(), l = "[object Map]", u = "[object Object]", d = "[object Promise]", f = "[object Set]", p = "[object WeakMap]", m = "[object DataView]", h = c(n), g = c(r), _ = c(i), v = c(a), y = c(o), b = s;
	(n && b(new n(/* @__PURE__ */ new ArrayBuffer(1))) != m || r && b(new r()) != l || i && b(i.resolve()) != d || a && b(new a()) != f || o && b(new o()) != p) && (b = function(e) {
		var t = s(e), n = t == u ? e.constructor : void 0, r = n ? c(n) : "";
		if (r) switch (r) {
			case h: return m;
			case g: return l;
			case _: return d;
			case v: return f;
			case y: return p;
		}
		return t;
	}), t.exports = b;
})), it = /* @__PURE__ */ o(((e, t) => {
	var n = Object.prototype.hasOwnProperty;
	function r(e) {
		var t = e.length, r = new e.constructor(t);
		return t && typeof e[0] == "string" && n.call(e, "index") && (r.index = e.index, r.input = e.input), r;
	}
	t.exports = r;
})), at = /* @__PURE__ */ o(((e, t) => {
	t.exports = E().Uint8Array;
})), ot = /* @__PURE__ */ o(((e, t) => {
	var n = at();
	function r(e) {
		var t = new e.constructor(e.byteLength);
		return new n(t).set(new n(e)), t;
	}
	t.exports = r;
})), st = /* @__PURE__ */ o(((e, t) => {
	var n = ot();
	function r(e, t) {
		var r = t ? n(e.buffer) : e.buffer;
		return new e.constructor(r, e.byteOffset, e.byteLength);
	}
	t.exports = r;
})), ct = /* @__PURE__ */ o(((e, t) => {
	var n = /\w*$/;
	function r(e) {
		var t = new e.constructor(e.source, n.exec(e));
		return t.lastIndex = e.lastIndex, t;
	}
	t.exports = r;
})), lt = /* @__PURE__ */ o(((e, t) => {
	var n = D(), r = n ? n.prototype : void 0, i = r ? r.valueOf : void 0;
	function a(e) {
		return i ? Object(i.call(e)) : {};
	}
	t.exports = a;
})), ut = /* @__PURE__ */ o(((e, t) => {
	var n = ot();
	function r(e, t) {
		var r = t ? n(e.buffer) : e.buffer;
		return new e.constructor(r, e.byteOffset, e.length);
	}
	t.exports = r;
})), dt = /* @__PURE__ */ o(((e, t) => {
	var n = ot(), r = st(), i = ct(), a = lt(), o = ut(), s = "[object Boolean]", c = "[object Date]", l = "[object Map]", u = "[object Number]", d = "[object RegExp]", f = "[object Set]", p = "[object String]", m = "[object Symbol]", h = "[object ArrayBuffer]", g = "[object DataView]", _ = "[object Float32Array]", v = "[object Float64Array]", y = "[object Int8Array]", b = "[object Int16Array]", x = "[object Int32Array]", S = "[object Uint8Array]", C = "[object Uint8ClampedArray]", w = "[object Uint16Array]", T = "[object Uint32Array]";
	function E(e, t, E) {
		var D = e.constructor;
		switch (t) {
			case h: return n(e);
			case s:
			case c: return new D(+e);
			case g: return r(e, E);
			case _:
			case v:
			case y:
			case b:
			case x:
			case S:
			case C:
			case w:
			case T: return o(e, E);
			case l: return new D();
			case u:
			case p: return new D(e);
			case d: return i(e);
			case f: return new D();
			case m: return a(e);
		}
	}
	t.exports = E;
})), ft = /* @__PURE__ */ o(((e, t) => {
	var n = j(), r = Object.create;
	t.exports = function() {
		function e() {}
		return function(t) {
			if (!n(t)) return {};
			if (r) return r(t);
			e.prototype = t;
			var i = new e();
			return e.prototype = void 0, i;
		};
	}();
})), pt = /* @__PURE__ */ o(((e, t) => {
	var n = ft(), r = Je(), i = Ne();
	function a(e) {
		return typeof e.constructor == "function" && !i(e) ? n(r(e)) : {};
	}
	t.exports = a;
})), mt = /* @__PURE__ */ o(((e, t) => {
	var n = K(), r = B(), i = "[object Map]";
	function a(e) {
		return r(e) && n(e) == i;
	}
	t.exports = a;
})), ht = /* @__PURE__ */ o(((e, t) => {
	var n = mt(), r = ke(), i = Ae(), a = i && i.isMap;
	t.exports = a ? r(a) : n;
})), gt = /* @__PURE__ */ o(((e, t) => {
	var n = K(), r = B(), i = "[object Set]";
	function a(e) {
		return r(e) && n(e) == i;
	}
	t.exports = a;
})), _t = /* @__PURE__ */ o(((e, t) => {
	var n = gt(), r = ke(), i = Ae(), a = i && i.isSet;
	t.exports = a ? r(a) : n;
})), vt = /* @__PURE__ */ o(((e, t) => {
	var n = ge(), r = _e(), i = be(), a = Le(), o = Be(), s = Ve(), c = He(), l = Ke(), u = Xe(), d = Qe(), f = $e(), p = K(), m = it(), h = dt(), g = pt(), _ = V(), v = H(), y = ht(), b = j(), x = _t(), S = W(), C = G(), w = 1, T = 2, E = 4, D = "[object Arguments]", O = "[object Array]", k = "[object Boolean]", A = "[object Date]", M = "[object Error]", ee = "[object Function]", te = "[object GeneratorFunction]", N = "[object Map]", P = "[object Number]", ne = "[object Object]", F = "[object RegExp]", I = "[object Set]", L = "[object String]", R = "[object Symbol]", re = "[object WeakMap]", ie = "[object ArrayBuffer]", ae = "[object DataView]", oe = "[object Float32Array]", se = "[object Float64Array]", ce = "[object Int8Array]", le = "[object Int16Array]", ue = "[object Int32Array]", de = "[object Uint8Array]", fe = "[object Uint8ClampedArray]", pe = "[object Uint16Array]", me = "[object Uint32Array]", z = {};
	z[D] = z[O] = z[ie] = z[ae] = z[k] = z[A] = z[oe] = z[se] = z[ce] = z[le] = z[ue] = z[N] = z[P] = z[ne] = z[F] = z[I] = z[L] = z[R] = z[de] = z[fe] = z[pe] = z[me] = !0, z[M] = z[ee] = z[re] = !1;
	function he(e, t, O, k, A, j) {
		var M, N = t & w, P = t & T, F = t & E;
		if (O && (M = A ? O(e, k, A, j) : O(e)), M !== void 0) return M;
		if (!b(e)) return e;
		var I = _(e);
		if (I) {
			if (M = m(e), !N) return c(e, M);
		} else {
			var L = p(e), R = L == ee || L == te;
			if (v(e)) return s(e, N);
			if (L == ne || L == D || R && !A) {
				if (M = P || R ? {} : g(e), !N) return P ? u(e, o(M, e)) : l(e, a(M, e));
			} else {
				if (!z[L]) return A ? e : {};
				M = h(e, L, N);
			}
		}
		j ||= new n();
		var re = j.get(e);
		if (re) return re;
		j.set(e, M), x(e) ? e.forEach(function(n) {
			M.add(he(n, t, O, n, e, j));
		}) : y(e) && e.forEach(function(n, r) {
			M.set(r, he(n, t, O, r, e, j));
		});
		var ie = I ? void 0 : (F ? P ? f : d : P ? C : S)(e);
		return r(ie || e, function(n, r) {
			ie && (r = n, n = e[r]), i(M, r, he(n, t, O, r, e, j));
		}), M;
	}
	t.exports = he;
})), yt = /* @__PURE__ */ o(((e, t) => {
	var n = vt(), r = 4;
	function i(e) {
		return n(e, r);
	}
	t.exports = i;
})), bt = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return function() {
			return e;
		};
	}
	t.exports = n;
})), xt = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return function(t, n, r) {
			for (var i = -1, a = Object(t), o = r(t), s = o.length; s--;) {
				var c = o[e ? s : ++i];
				if (n(a[c], c, a) === !1) break;
			}
			return t;
		};
	}
	t.exports = n;
})), St = /* @__PURE__ */ o(((e, t) => {
	t.exports = xt()();
})), Ct = /* @__PURE__ */ o(((e, t) => {
	var n = St(), r = W();
	function i(e, t) {
		return e && n(e, t, r);
	}
	t.exports = i;
})), wt = /* @__PURE__ */ o(((e, t) => {
	var n = U();
	function r(e, t) {
		return function(r, i) {
			if (r == null) return r;
			if (!n(r)) return e(r, i);
			for (var a = r.length, o = t ? a : -1, s = Object(r); (t ? o-- : ++o < a) && i(s[o], o, s) !== !1;);
			return r;
		};
	}
	t.exports = r;
})), Tt = /* @__PURE__ */ o(((e, t) => {
	var n = Ct();
	t.exports = wt()(n);
})), q = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return e;
	}
	t.exports = n;
})), Et = /* @__PURE__ */ o(((e, t) => {
	var n = q();
	function r(e) {
		return typeof e == "function" ? e : n;
	}
	t.exports = r;
})), Dt = /* @__PURE__ */ o(((e, t) => {
	var n = _e(), r = Tt(), i = Et(), a = V();
	function o(e, t) {
		return (a(e) ? n : r)(e, i(t));
	}
	t.exports = o;
})), Ot = /* @__PURE__ */ o(((e, t) => {
	t.exports = Dt();
})), kt = /* @__PURE__ */ o(((e, t) => {
	var n = Tt();
	function r(e, t) {
		var r = [];
		return n(e, function(e, n, i) {
			t(e, n, i) && r.push(e);
		}), r;
	}
	t.exports = r;
})), At = /* @__PURE__ */ o(((e, t) => {
	var n = "__lodash_hash_undefined__";
	function r(e) {
		return this.__data__.set(e, n), this;
	}
	t.exports = r;
})), jt = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return this.__data__.has(e);
	}
	t.exports = n;
})), Mt = /* @__PURE__ */ o(((e, t) => {
	var n = z(), r = At(), i = jt();
	function a(e) {
		var t = -1, r = e == null ? 0 : e.length;
		for (this.__data__ = new n(); ++t < r;) this.add(e[t]);
	}
	a.prototype.add = a.prototype.push = r, a.prototype.has = i, t.exports = a;
})), Nt = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		for (var n = -1, r = e == null ? 0 : e.length; ++n < r;) if (t(e[n], n, e)) return !0;
		return !1;
	}
	t.exports = n;
})), Pt = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return e.has(t);
	}
	t.exports = n;
})), Ft = /* @__PURE__ */ o(((e, t) => {
	var n = Mt(), r = Nt(), i = Pt(), a = 1, o = 2;
	function s(e, t, s, c, l, u) {
		var d = s & a, f = e.length, p = t.length;
		if (f != p && !(d && p > f)) return !1;
		var m = u.get(e), h = u.get(t);
		if (m && h) return m == t && h == e;
		var g = -1, _ = !0, v = s & o ? new n() : void 0;
		for (u.set(e, t), u.set(t, e); ++g < f;) {
			var y = e[g], b = t[g];
			if (c) var x = d ? c(b, y, g, t, e, u) : c(y, b, g, e, t, u);
			if (x !== void 0) {
				if (x) continue;
				_ = !1;
				break;
			}
			if (v) {
				if (!r(t, function(e, t) {
					if (!i(v, t) && (y === e || l(y, e, s, c, u))) return v.push(t);
				})) {
					_ = !1;
					break;
				}
			} else if (!(y === b || l(y, b, s, c, u))) {
				_ = !1;
				break;
			}
		}
		return u.delete(e), u.delete(t), _;
	}
	t.exports = s;
})), It = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = -1, n = Array(e.size);
		return e.forEach(function(e, r) {
			n[++t] = [r, e];
		}), n;
	}
	t.exports = n;
})), Lt = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = -1, n = Array(e.size);
		return e.forEach(function(e) {
			n[++t] = e;
		}), n;
	}
	t.exports = n;
})), Rt = /* @__PURE__ */ o(((e, t) => {
	var n = D(), r = at(), i = m(), a = Ft(), o = It(), s = Lt(), c = 1, l = 2, u = "[object Boolean]", d = "[object Date]", f = "[object Error]", p = "[object Map]", h = "[object Number]", g = "[object RegExp]", _ = "[object Set]", v = "[object String]", y = "[object Symbol]", b = "[object ArrayBuffer]", x = "[object DataView]", S = n ? n.prototype : void 0, C = S ? S.valueOf : void 0;
	function w(e, t, n, m, S, w, T) {
		switch (n) {
			case x:
				if (e.byteLength != t.byteLength || e.byteOffset != t.byteOffset) return !1;
				e = e.buffer, t = t.buffer;
			case b: return !(e.byteLength != t.byteLength || !w(new r(e), new r(t)));
			case u:
			case d:
			case h: return i(+e, +t);
			case f: return e.name == t.name && e.message == t.message;
			case g:
			case v: return e == t + "";
			case p: var E = o;
			case _:
				var D = m & c;
				if (E ||= s, e.size != t.size && !D) return !1;
				var O = T.get(e);
				if (O) return O == t;
				m |= l, T.set(e, t);
				var k = a(E(e), E(t), m, S, w, T);
				return T.delete(e), k;
			case y: if (C) return C.call(e) == C.call(t);
		}
		return !1;
	}
	t.exports = w;
})), zt = /* @__PURE__ */ o(((e, t) => {
	var n = Qe(), r = 1, i = Object.prototype.hasOwnProperty;
	function a(e, t, a, o, s, c) {
		var l = a & r, u = n(e), d = u.length;
		if (d != n(t).length && !l) return !1;
		for (var f = d; f--;) {
			var p = u[f];
			if (!(l ? p in t : i.call(t, p))) return !1;
		}
		var m = c.get(e), h = c.get(t);
		if (m && h) return m == t && h == e;
		var g = !0;
		c.set(e, t), c.set(t, e);
		for (var _ = l; ++f < d;) {
			p = u[f];
			var v = e[p], y = t[p];
			if (o) var b = l ? o(y, v, p, t, e, c) : o(v, y, p, e, t, c);
			if (!(b === void 0 ? v === y || s(v, y, a, o, c) : b)) {
				g = !1;
				break;
			}
			_ ||= p == "constructor";
		}
		if (g && !_) {
			var x = e.constructor, S = t.constructor;
			x != S && "constructor" in e && "constructor" in t && !(typeof x == "function" && x instanceof x && typeof S == "function" && S instanceof S) && (g = !1);
		}
		return c.delete(e), c.delete(t), g;
	}
	t.exports = a;
})), Bt = /* @__PURE__ */ o(((e, t) => {
	var n = ge(), r = Ft(), i = Rt(), a = zt(), o = K(), s = V(), c = H(), l = je(), u = 1, d = "[object Arguments]", f = "[object Array]", p = "[object Object]", m = Object.prototype.hasOwnProperty;
	function h(e, t, h, g, _, v) {
		var y = s(e), b = s(t), x = y ? f : o(e), S = b ? f : o(t);
		x = x == d ? p : x, S = S == d ? p : S;
		var C = x == p, w = S == p, T = x == S;
		if (T && c(e)) {
			if (!c(t)) return !1;
			y = !0, C = !1;
		}
		if (T && !C) return v ||= new n(), y || l(e) ? r(e, t, h, g, _, v) : i(e, t, x, h, g, _, v);
		if (!(h & u)) {
			var E = C && m.call(e, "__wrapped__"), D = w && m.call(t, "__wrapped__");
			if (E || D) {
				var O = E ? e.value() : e, k = D ? t.value() : t;
				return v ||= new n(), _(O, k, h, g, v);
			}
		}
		return T ? (v ||= new n(), a(e, t, h, g, _, v)) : !1;
	}
	t.exports = h;
})), Vt = /* @__PURE__ */ o(((e, t) => {
	var n = Bt(), r = B();
	function i(e, t, a, o, s) {
		return e === t ? !0 : e == null || t == null || !r(e) && !r(t) ? e !== e && t !== t : n(e, t, a, o, i, s);
	}
	t.exports = i;
})), Ht = /* @__PURE__ */ o(((e, t) => {
	var n = ge(), r = Vt(), i = 1, a = 2;
	function o(e, t, o, s) {
		var c = o.length, l = c, u = !s;
		if (e == null) return !l;
		for (e = Object(e); c--;) {
			var d = o[c];
			if (u && d[2] ? d[1] !== e[d[0]] : !(d[0] in e)) return !1;
		}
		for (; ++c < l;) {
			d = o[c];
			var f = d[0], p = e[f], m = d[1];
			if (u && d[2]) {
				if (p === void 0 && !(f in e)) return !1;
			} else {
				var h = new n();
				if (s) var g = s(p, m, f, e, t, h);
				if (!(g === void 0 ? r(m, p, i | a, s, h) : g)) return !1;
			}
		}
		return !0;
	}
	t.exports = o;
})), Ut = /* @__PURE__ */ o(((e, t) => {
	var n = j();
	function r(e) {
		return e === e && !n(e);
	}
	t.exports = r;
})), Wt = /* @__PURE__ */ o(((e, t) => {
	var n = Ut(), r = W();
	function i(e) {
		for (var t = r(e), i = t.length; i--;) {
			var a = t[i], o = e[a];
			t[i] = [
				a,
				o,
				n(o)
			];
		}
		return t;
	}
	t.exports = i;
})), Gt = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return function(n) {
			return n == null ? !1 : n[e] === t && (t !== void 0 || e in Object(n));
		};
	}
	t.exports = n;
})), Kt = /* @__PURE__ */ o(((e, t) => {
	var n = Ht(), r = Wt(), i = Gt();
	function a(e) {
		var t = r(e);
		return t.length == 1 && t[0][2] ? i(t[0][0], t[0][1]) : function(r) {
			return r === e || n(r, e, t);
		};
	}
	t.exports = a;
})), qt = /* @__PURE__ */ o(((e, t) => {
	var n = A(), r = B(), i = "[object Symbol]";
	function a(e) {
		return typeof e == "symbol" || r(e) && n(e) == i;
	}
	t.exports = a;
})), Jt = /* @__PURE__ */ o(((e, t) => {
	var n = V(), r = qt(), i = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, a = /^\w*$/;
	function o(e, t) {
		if (n(e)) return !1;
		var o = typeof e;
		return o == "number" || o == "symbol" || o == "boolean" || e == null || r(e) ? !0 : a.test(e) || !i.test(e) || t != null && e in Object(t);
	}
	t.exports = o;
})), Yt = /* @__PURE__ */ o(((e, t) => {
	var n = z(), r = "Expected a function";
	function i(e, t) {
		if (typeof e != "function" || t != null && typeof t != "function") throw TypeError(r);
		var a = function() {
			var n = arguments, r = t ? t.apply(this, n) : n[0], i = a.cache;
			if (i.has(r)) return i.get(r);
			var o = e.apply(this, n);
			return a.cache = i.set(r, o) || i, o;
		};
		return a.cache = new (i.Cache || n)(), a;
	}
	i.Cache = n, t.exports = i;
})), Xt = /* @__PURE__ */ o(((e, t) => {
	var n = Yt(), r = 500;
	function i(e) {
		var t = n(e, function(e) {
			return i.size === r && i.clear(), e;
		}), i = t.cache;
		return t;
	}
	t.exports = i;
})), Zt = /* @__PURE__ */ o(((e, t) => {
	var n = Xt(), r = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, i = /\\(\\)?/g;
	t.exports = n(function(e) {
		var t = [];
		return e.charCodeAt(0) === 46 && t.push(""), e.replace(r, function(e, n, r, a) {
			t.push(r ? a.replace(i, "$1") : n || e);
		}), t;
	});
})), Qt = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		for (var n = -1, r = e == null ? 0 : e.length, i = Array(r); ++n < r;) i[n] = t(e[n], n, e);
		return i;
	}
	t.exports = n;
})), $t = /* @__PURE__ */ o(((e, t) => {
	var n = D(), r = Qt(), i = V(), a = qt(), o = Infinity, s = n ? n.prototype : void 0, c = s ? s.toString : void 0;
	function l(e) {
		if (typeof e == "string") return e;
		if (i(e)) return r(e, l) + "";
		if (a(e)) return c ? c.call(e) : "";
		var t = e + "";
		return t == "0" && 1 / e == -o ? "-0" : t;
	}
	t.exports = l;
})), en = /* @__PURE__ */ o(((e, t) => {
	var n = $t();
	function r(e) {
		return e == null ? "" : n(e);
	}
	t.exports = r;
})), tn = /* @__PURE__ */ o(((e, t) => {
	var n = V(), r = Jt(), i = Zt(), a = en();
	function o(e, t) {
		return n(e) ? e : r(e, t) ? [e] : i(a(e));
	}
	t.exports = o;
})), nn = /* @__PURE__ */ o(((e, t) => {
	var n = qt(), r = Infinity;
	function i(e) {
		if (typeof e == "string" || n(e)) return e;
		var t = e + "";
		return t == "0" && 1 / e == -r ? "-0" : t;
	}
	t.exports = i;
})), rn = /* @__PURE__ */ o(((e, t) => {
	var n = tn(), r = nn();
	function i(e, t) {
		t = n(t, e);
		for (var i = 0, a = t.length; e != null && i < a;) e = e[r(t[i++])];
		return i && i == a ? e : void 0;
	}
	t.exports = i;
})), an = /* @__PURE__ */ o(((e, t) => {
	var n = rn();
	function r(e, t, r) {
		var i = e == null ? void 0 : n(e, t);
		return i === void 0 ? r : i;
	}
	t.exports = r;
})), on = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return e != null && t in Object(e);
	}
	t.exports = n;
})), sn = /* @__PURE__ */ o(((e, t) => {
	var n = tn(), r = we(), i = V(), a = Ee(), o = De(), s = nn();
	function c(e, t, c) {
		t = n(t, e);
		for (var l = -1, u = t.length, d = !1; ++l < u;) {
			var f = s(t[l]);
			if (!(d = e != null && c(e, f))) break;
			e = e[f];
		}
		return d || ++l != u ? d : (u = e == null ? 0 : e.length, !!u && o(u) && a(f, u) && (i(e) || r(e)));
	}
	t.exports = c;
})), cn = /* @__PURE__ */ o(((e, t) => {
	var n = on(), r = sn();
	function i(e, t) {
		return e != null && r(e, t, n);
	}
	t.exports = i;
})), ln = /* @__PURE__ */ o(((e, t) => {
	var n = Vt(), r = an(), i = cn(), a = Jt(), o = Ut(), s = Gt(), c = nn(), l = 1, u = 2;
	function d(e, t) {
		return a(e) && o(t) ? s(c(e), t) : function(a) {
			var o = r(a, e);
			return o === void 0 && o === t ? i(a, e) : n(t, o, l | u);
		};
	}
	t.exports = d;
})), un = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return function(t) {
			return t?.[e];
		};
	}
	t.exports = n;
})), dn = /* @__PURE__ */ o(((e, t) => {
	var n = rn();
	function r(e) {
		return function(t) {
			return n(t, e);
		};
	}
	t.exports = r;
})), fn = /* @__PURE__ */ o(((e, t) => {
	var n = un(), r = dn(), i = Jt(), a = nn();
	function o(e) {
		return i(e) ? n(a(e)) : r(e);
	}
	t.exports = o;
})), J = /* @__PURE__ */ o(((e, t) => {
	var n = Kt(), r = ln(), i = q(), a = V(), o = fn();
	function s(e) {
		return typeof e == "function" ? e : e == null ? i : typeof e == "object" ? a(e) ? r(e[0], e[1]) : n(e) : o(e);
	}
	t.exports = s;
})), pn = /* @__PURE__ */ o(((e, t) => {
	var n = Ue(), r = kt(), i = J(), a = V();
	function o(e, t) {
		return (a(e) ? n : r)(e, i(t, 3));
	}
	t.exports = o;
})), mn = /* @__PURE__ */ o(((e, t) => {
	var n = Object.prototype.hasOwnProperty;
	function r(e, t) {
		return e != null && n.call(e, t);
	}
	t.exports = r;
})), hn = /* @__PURE__ */ o(((e, t) => {
	var n = mn(), r = sn();
	function i(e, t) {
		return e != null && r(e, t, n);
	}
	t.exports = i;
})), gn = /* @__PURE__ */ o(((e, t) => {
	var n = Ie(), r = K(), i = we(), a = V(), o = U(), s = H(), c = Ne(), l = je(), u = "[object Map]", d = "[object Set]", f = Object.prototype.hasOwnProperty;
	function p(e) {
		if (e == null) return !0;
		if (o(e) && (a(e) || typeof e == "string" || typeof e.splice == "function" || s(e) || l(e) || i(e))) return !e.length;
		var t = r(e);
		if (t == u || t == d) return !e.size;
		if (c(e)) return !n(e).length;
		for (var p in e) if (f.call(e, p)) return !1;
		return !0;
	}
	t.exports = p;
})), _n = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return e === void 0;
	}
	t.exports = n;
})), vn = /* @__PURE__ */ o(((e, t) => {
	var n = Tt(), r = U();
	function i(e, t) {
		var i = -1, a = r(e) ? Array(e.length) : [];
		return n(e, function(e, n, r) {
			a[++i] = t(e, n, r);
		}), a;
	}
	t.exports = i;
})), yn = /* @__PURE__ */ o(((e, t) => {
	var n = Qt(), r = J(), i = vn(), a = V();
	function o(e, t) {
		return (a(e) ? n : i)(e, r(t, 3));
	}
	t.exports = o;
})), bn = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n, r) {
		var i = -1, a = e == null ? 0 : e.length;
		for (r && a && (n = e[++i]); ++i < a;) n = t(n, e[i], i, e);
		return n;
	}
	t.exports = n;
})), xn = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n, r, i) {
		return i(e, function(e, i, a) {
			n = r ? (r = !1, e) : t(n, e, i, a);
		}), n;
	}
	t.exports = n;
})), Sn = /* @__PURE__ */ o(((e, t) => {
	var n = bn(), r = Tt(), i = J(), a = xn(), o = V();
	function s(e, t, s) {
		var c = o(e) ? n : a, l = arguments.length < 3;
		return c(e, i(t, 4), s, l, r);
	}
	t.exports = s;
})), Cn = /* @__PURE__ */ o(((e, t) => {
	var n = A(), r = V(), i = B(), a = "[object String]";
	function o(e) {
		return typeof e == "string" || !r(e) && i(e) && n(e) == a;
	}
	t.exports = o;
})), wn = /* @__PURE__ */ o(((e, t) => {
	t.exports = un()("length");
})), Tn = /* @__PURE__ */ o(((e, t) => {
	var n = RegExp("[\\u200d\\ud800-\\udfff\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff\\ufe0e\\ufe0f]");
	function r(e) {
		return n.test(e);
	}
	t.exports = r;
})), En = /* @__PURE__ */ o(((e, t) => {
	var n = "\\ud800-\\udfff", r = "\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff", i = "\\ufe0e\\ufe0f", a = "[" + n + "]", o = "[" + r + "]", s = "\\ud83c[\\udffb-\\udfff]", c = "(?:" + o + "|" + s + ")", l = "[^" + n + "]", u = "(?:\\ud83c[\\udde6-\\uddff]){2}", d = "[\\ud800-\\udbff][\\udc00-\\udfff]", f = "\\u200d", p = c + "?", m = "[" + i + "]?", h = "(?:" + f + "(?:" + [
		l,
		u,
		d
	].join("|") + ")" + m + p + ")*", g = m + p + h, _ = "(?:" + [
		l + o + "?",
		o,
		u,
		d,
		a
	].join("|") + ")", v = RegExp(s + "(?=" + s + ")|" + _ + g, "g");
	function y(e) {
		for (var t = v.lastIndex = 0; v.test(e);) ++t;
		return t;
	}
	t.exports = y;
})), Dn = /* @__PURE__ */ o(((e, t) => {
	var n = wn(), r = Tn(), i = En();
	function a(e) {
		return r(e) ? i(e) : n(e);
	}
	t.exports = a;
})), On = /* @__PURE__ */ o(((e, t) => {
	var n = Ie(), r = K(), i = U(), a = Cn(), o = Dn(), s = "[object Map]", c = "[object Set]";
	function l(e) {
		if (e == null) return 0;
		if (i(e)) return a(e) ? o(e) : e.length;
		var t = r(e);
		return t == s || t == c ? e.size : n(e).length;
	}
	t.exports = l;
})), kn = /* @__PURE__ */ o(((e, t) => {
	var n = _e(), r = ft(), i = Ct(), a = J(), o = Je(), s = V(), c = H(), l = M(), u = j(), d = je();
	function f(e, t, f) {
		var p = s(e), m = p || c(e) || d(e);
		if (t = a(t, 4), f == null) {
			var h = e && e.constructor;
			f = m ? p ? new h() : [] : u(e) && l(h) ? r(o(e)) : {};
		}
		return (m ? n : i)(e, function(e, n, r) {
			return t(f, e, n, r);
		}), f;
	}
	t.exports = f;
})), An = /* @__PURE__ */ o(((e, t) => {
	var n = D(), r = we(), i = V(), a = n ? n.isConcatSpreadable : void 0;
	function o(e) {
		return i(e) || r(e) || !!(a && e && e[a]);
	}
	t.exports = o;
})), jn = /* @__PURE__ */ o(((e, t) => {
	var n = qe(), r = An();
	function i(e, t, a, o, s) {
		var c = -1, l = e.length;
		for (a ||= r, s ||= []; ++c < l;) {
			var u = e[c];
			t > 0 && a(u) ? t > 1 ? i(u, t - 1, a, o, s) : n(s, u) : o || (s[s.length] = u);
		}
		return s;
	}
	t.exports = i;
})), Mn = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n) {
		switch (n.length) {
			case 0: return e.call(t);
			case 1: return e.call(t, n[0]);
			case 2: return e.call(t, n[0], n[1]);
			case 3: return e.call(t, n[0], n[1], n[2]);
		}
		return e.apply(t, n);
	}
	t.exports = n;
})), Nn = /* @__PURE__ */ o(((e, t) => {
	var n = Mn(), r = Math.max;
	function i(e, t, i) {
		return t = r(t === void 0 ? e.length - 1 : t, 0), function() {
			for (var a = arguments, o = -1, s = r(a.length - t, 0), c = Array(s); ++o < s;) c[o] = a[t + o];
			o = -1;
			for (var l = Array(t + 1); ++o < t;) l[o] = a[o];
			return l[t] = i(c), n(e, this, l);
		};
	}
	t.exports = i;
})), Pn = /* @__PURE__ */ o(((e, t) => {
	var n = bt(), r = ve(), i = q();
	t.exports = r ? function(e, t) {
		return r(e, "toString", {
			configurable: !0,
			enumerable: !1,
			value: n(t),
			writable: !0
		});
	} : i;
})), Fn = /* @__PURE__ */ o(((e, t) => {
	var n = 800, r = 16, i = Date.now;
	function a(e) {
		var t = 0, a = 0;
		return function() {
			var o = i(), s = r - (o - a);
			if (a = o, s > 0) {
				if (++t >= n) return arguments[0];
			} else t = 0;
			return e.apply(void 0, arguments);
		};
	}
	t.exports = a;
})), In = /* @__PURE__ */ o(((e, t) => {
	var n = Pn();
	t.exports = Fn()(n);
})), Ln = /* @__PURE__ */ o(((e, t) => {
	var n = q(), r = Nn(), i = In();
	function a(e, t) {
		return i(r(e, t, n), e + "");
	}
	t.exports = a;
})), Rn = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n, r) {
		for (var i = e.length, a = n + (r ? 1 : -1); r ? a-- : ++a < i;) if (t(e[a], a, e)) return a;
		return -1;
	}
	t.exports = n;
})), zn = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		return e !== e;
	}
	t.exports = n;
})), Bn = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n) {
		for (var r = n - 1, i = e.length; ++r < i;) if (e[r] === t) return r;
		return -1;
	}
	t.exports = n;
})), Vn = /* @__PURE__ */ o(((e, t) => {
	var n = Rn(), r = zn(), i = Bn();
	function a(e, t, a) {
		return t === t ? i(e, t, a) : n(e, r, a);
	}
	t.exports = a;
})), Hn = /* @__PURE__ */ o(((e, t) => {
	var n = Vn();
	function r(e, t) {
		return !!(e != null && e.length) && n(e, t, 0) > -1;
	}
	t.exports = r;
})), Un = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n) {
		for (var r = -1, i = e == null ? 0 : e.length; ++r < i;) if (n(t, e[r])) return !0;
		return !1;
	}
	t.exports = n;
})), Wn = /* @__PURE__ */ o(((e, t) => {
	function n() {}
	t.exports = n;
})), Gn = /* @__PURE__ */ o(((e, t) => {
	var n = nt(), r = Wn(), i = Lt();
	t.exports = n && 1 / i(new n([, -0]))[1] == Infinity ? function(e) {
		return new n(e);
	} : r;
})), Kn = /* @__PURE__ */ o(((e, t) => {
	var n = Mt(), r = Hn(), i = Un(), a = Pt(), o = Gn(), s = Lt(), c = 200;
	function l(e, t, l) {
		var u = -1, d = r, f = e.length, p = !0, m = [], h = m;
		if (l) p = !1, d = i;
		else if (f >= c) {
			var g = t ? null : o(e);
			if (g) return s(g);
			p = !1, d = a, h = new n();
		} else h = t ? [] : m;
		outer: for (; ++u < f;) {
			var _ = e[u], v = t ? t(_) : _;
			if (_ = l || _ !== 0 ? _ : 0, p && v === v) {
				for (var y = h.length; y--;) if (h[y] === v) continue outer;
				t && h.push(v), m.push(_);
			} else d(h, v, l) || (h !== m && h.push(v), m.push(_));
		}
		return m;
	}
	t.exports = l;
})), qn = /* @__PURE__ */ o(((e, t) => {
	var n = U(), r = B();
	function i(e) {
		return r(e) && n(e);
	}
	t.exports = i;
})), Jn = /* @__PURE__ */ o(((e, t) => {
	var n = jn(), r = Ln(), i = Kn(), a = qn();
	t.exports = r(function(e) {
		return i(n(e, 1, a, !0));
	});
})), Yn = /* @__PURE__ */ o(((e, t) => {
	var n = Qt();
	function r(e, t) {
		return n(t, function(t) {
			return e[t];
		});
	}
	t.exports = r;
})), Xn = /* @__PURE__ */ o(((e, t) => {
	var n = Yn(), r = W();
	function i(e) {
		return e == null ? [] : n(e, r(e));
	}
	t.exports = i;
})), Y = /* @__PURE__ */ o(((e, t) => {
	var n;
	if (typeof l == "function") try {
		n = {
			clone: yt(),
			constant: bt(),
			each: Ot(),
			filter: pn(),
			has: hn(),
			isArray: V(),
			isEmpty: gn(),
			isFunction: M(),
			isUndefined: _n(),
			keys: W(),
			map: yn(),
			reduce: Sn(),
			size: On(),
			transform: kn(),
			union: Jn(),
			values: Xn()
		};
	} catch {}
	n ||= window._, t.exports = n;
})), Zn = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = o;
	var r = "\0", i = "\0", a = "";
	function o(e) {
		this._isDirected = n.has(e, "directed") ? e.directed : !0, this._isMultigraph = n.has(e, "multigraph") ? e.multigraph : !1, this._isCompound = n.has(e, "compound") ? e.compound : !1, this._label = void 0, this._defaultNodeLabelFn = n.constant(void 0), this._defaultEdgeLabelFn = n.constant(void 0), this._nodes = {}, this._isCompound && (this._parent = {}, this._children = {}, this._children[i] = {}), this._in = {}, this._preds = {}, this._out = {}, this._sucs = {}, this._edgeObjs = {}, this._edgeLabels = {};
	}
	o.prototype._nodeCount = 0, o.prototype._edgeCount = 0, o.prototype.isDirected = function() {
		return this._isDirected;
	}, o.prototype.isMultigraph = function() {
		return this._isMultigraph;
	}, o.prototype.isCompound = function() {
		return this._isCompound;
	}, o.prototype.setGraph = function(e) {
		return this._label = e, this;
	}, o.prototype.graph = function() {
		return this._label;
	}, o.prototype.setDefaultNodeLabel = function(e) {
		return n.isFunction(e) || (e = n.constant(e)), this._defaultNodeLabelFn = e, this;
	}, o.prototype.nodeCount = function() {
		return this._nodeCount;
	}, o.prototype.nodes = function() {
		return n.keys(this._nodes);
	}, o.prototype.sources = function() {
		var e = this;
		return n.filter(this.nodes(), function(t) {
			return n.isEmpty(e._in[t]);
		});
	}, o.prototype.sinks = function() {
		var e = this;
		return n.filter(this.nodes(), function(t) {
			return n.isEmpty(e._out[t]);
		});
	}, o.prototype.setNodes = function(e, t) {
		var r = arguments, i = this;
		return n.each(e, function(e) {
			r.length > 1 ? i.setNode(e, t) : i.setNode(e);
		}), this;
	}, o.prototype.setNode = function(e, t) {
		return n.has(this._nodes, e) ? (arguments.length > 1 && (this._nodes[e] = t), this) : (this._nodes[e] = arguments.length > 1 ? t : this._defaultNodeLabelFn(e), this._isCompound && (this._parent[e] = i, this._children[e] = {}, this._children[i][e] = !0), this._in[e] = {}, this._preds[e] = {}, this._out[e] = {}, this._sucs[e] = {}, ++this._nodeCount, this);
	}, o.prototype.node = function(e) {
		return this._nodes[e];
	}, o.prototype.hasNode = function(e) {
		return n.has(this._nodes, e);
	}, o.prototype.removeNode = function(e) {
		var t = this;
		if (n.has(this._nodes, e)) {
			var r = function(e) {
				t.removeEdge(t._edgeObjs[e]);
			};
			delete this._nodes[e], this._isCompound && (this._removeFromParentsChildList(e), delete this._parent[e], n.each(this.children(e), function(e) {
				t.setParent(e);
			}), delete this._children[e]), n.each(n.keys(this._in[e]), r), delete this._in[e], delete this._preds[e], n.each(n.keys(this._out[e]), r), delete this._out[e], delete this._sucs[e], --this._nodeCount;
		}
		return this;
	}, o.prototype.setParent = function(e, t) {
		if (!this._isCompound) throw Error("Cannot set parent in a non-compound graph");
		if (n.isUndefined(t)) t = i;
		else {
			t += "";
			for (var r = t; !n.isUndefined(r); r = this.parent(r)) if (r === e) throw Error("Setting " + t + " as parent of " + e + " would create a cycle");
			this.setNode(t);
		}
		return this.setNode(e), this._removeFromParentsChildList(e), this._parent[e] = t, this._children[t][e] = !0, this;
	}, o.prototype._removeFromParentsChildList = function(e) {
		delete this._children[this._parent[e]][e];
	}, o.prototype.parent = function(e) {
		if (this._isCompound) {
			var t = this._parent[e];
			if (t !== i) return t;
		}
	}, o.prototype.children = function(e) {
		if (n.isUndefined(e) && (e = i), this._isCompound) {
			var t = this._children[e];
			if (t) return n.keys(t);
		} else if (e === i) return this.nodes();
		else if (this.hasNode(e)) return [];
	}, o.prototype.predecessors = function(e) {
		var t = this._preds[e];
		if (t) return n.keys(t);
	}, o.prototype.successors = function(e) {
		var t = this._sucs[e];
		if (t) return n.keys(t);
	}, o.prototype.neighbors = function(e) {
		var t = this.predecessors(e);
		if (t) return n.union(t, this.successors(e));
	}, o.prototype.isLeaf = function(e) {
		return (this.isDirected() ? this.successors(e) : this.neighbors(e)).length === 0;
	}, o.prototype.filterNodes = function(e) {
		var t = new this.constructor({
			directed: this._isDirected,
			multigraph: this._isMultigraph,
			compound: this._isCompound
		});
		t.setGraph(this.graph());
		var r = this;
		n.each(this._nodes, function(n, r) {
			e(r) && t.setNode(r, n);
		}), n.each(this._edgeObjs, function(e) {
			t.hasNode(e.v) && t.hasNode(e.w) && t.setEdge(e, r.edge(e));
		});
		var i = {};
		function a(e) {
			var n = r.parent(e);
			return n === void 0 || t.hasNode(n) ? (i[e] = n, n) : n in i ? i[n] : a(n);
		}
		return this._isCompound && n.each(t.nodes(), function(e) {
			t.setParent(e, a(e));
		}), t;
	}, o.prototype.setDefaultEdgeLabel = function(e) {
		return n.isFunction(e) || (e = n.constant(e)), this._defaultEdgeLabelFn = e, this;
	}, o.prototype.edgeCount = function() {
		return this._edgeCount;
	}, o.prototype.edges = function() {
		return n.values(this._edgeObjs);
	}, o.prototype.setPath = function(e, t) {
		var r = this, i = arguments;
		return n.reduce(e, function(e, n) {
			return i.length > 1 ? r.setEdge(e, n, t) : r.setEdge(e, n), n;
		}), this;
	}, o.prototype.setEdge = function() {
		var e, t, r, i, a = !1, o = arguments[0];
		typeof o == "object" && o && "v" in o ? (e = o.v, t = o.w, r = o.name, arguments.length === 2 && (i = arguments[1], a = !0)) : (e = o, t = arguments[1], r = arguments[3], arguments.length > 2 && (i = arguments[2], a = !0)), e = "" + e, t = "" + t, n.isUndefined(r) || (r = "" + r);
		var c = l(this._isDirected, e, t, r);
		if (n.has(this._edgeLabels, c)) return a && (this._edgeLabels[c] = i), this;
		if (!n.isUndefined(r) && !this._isMultigraph) throw Error("Cannot set a named edge when isMultigraph = false");
		this.setNode(e), this.setNode(t), this._edgeLabels[c] = a ? i : this._defaultEdgeLabelFn(e, t, r);
		var d = u(this._isDirected, e, t, r);
		return e = d.v, t = d.w, Object.freeze(d), this._edgeObjs[c] = d, s(this._preds[t], e), s(this._sucs[e], t), this._in[t][c] = d, this._out[e][c] = d, this._edgeCount++, this;
	}, o.prototype.edge = function(e, t, n) {
		var r = arguments.length === 1 ? d(this._isDirected, arguments[0]) : l(this._isDirected, e, t, n);
		return this._edgeLabels[r];
	}, o.prototype.hasEdge = function(e, t, r) {
		var i = arguments.length === 1 ? d(this._isDirected, arguments[0]) : l(this._isDirected, e, t, r);
		return n.has(this._edgeLabels, i);
	}, o.prototype.removeEdge = function(e, t, n) {
		var r = arguments.length === 1 ? d(this._isDirected, arguments[0]) : l(this._isDirected, e, t, n), i = this._edgeObjs[r];
		return i && (e = i.v, t = i.w, delete this._edgeLabels[r], delete this._edgeObjs[r], c(this._preds[t], e), c(this._sucs[e], t), delete this._in[t][r], delete this._out[e][r], this._edgeCount--), this;
	}, o.prototype.inEdges = function(e, t) {
		var r = this._in[e];
		if (r) {
			var i = n.values(r);
			return t ? n.filter(i, function(e) {
				return e.v === t;
			}) : i;
		}
	}, o.prototype.outEdges = function(e, t) {
		var r = this._out[e];
		if (r) {
			var i = n.values(r);
			return t ? n.filter(i, function(e) {
				return e.w === t;
			}) : i;
		}
	}, o.prototype.nodeEdges = function(e, t) {
		var n = this.inEdges(e, t);
		if (n) return n.concat(this.outEdges(e, t));
	};
	function s(e, t) {
		e[t] ? e[t]++ : e[t] = 1;
	}
	function c(e, t) {
		--e[t] || delete e[t];
	}
	function l(e, t, i, o) {
		var s = "" + t, c = "" + i;
		if (!e && s > c) {
			var l = s;
			s = c, c = l;
		}
		return s + a + c + a + (n.isUndefined(o) ? r : o);
	}
	function u(e, t, n, r) {
		var i = "" + t, a = "" + n;
		if (!e && i > a) {
			var o = i;
			i = a, a = o;
		}
		var s = {
			v: i,
			w: a
		};
		return r && (s.name = r), s;
	}
	function d(e, t) {
		return l(e, t.v, t.w, t.name);
	}
})), Qn = /* @__PURE__ */ o(((e, t) => {
	t.exports = "2.1.8";
})), $n = /* @__PURE__ */ o(((e, t) => {
	t.exports = {
		Graph: Zn(),
		version: Qn()
	};
})), er = /* @__PURE__ */ o(((e, t) => {
	var n = Y(), r = Zn();
	t.exports = {
		write: i,
		read: s
	};
	function i(e) {
		var t = {
			options: {
				directed: e.isDirected(),
				multigraph: e.isMultigraph(),
				compound: e.isCompound()
			},
			nodes: a(e),
			edges: o(e)
		};
		return n.isUndefined(e.graph()) || (t.value = n.clone(e.graph())), t;
	}
	function a(e) {
		return n.map(e.nodes(), function(t) {
			var r = e.node(t), i = e.parent(t), a = { v: t };
			return n.isUndefined(r) || (a.value = r), n.isUndefined(i) || (a.parent = i), a;
		});
	}
	function o(e) {
		return n.map(e.edges(), function(t) {
			var r = e.edge(t), i = {
				v: t.v,
				w: t.w
			};
			return n.isUndefined(t.name) || (i.name = t.name), n.isUndefined(r) || (i.value = r), i;
		});
	}
	function s(e) {
		var t = new r(e.options).setGraph(e.value);
		return n.each(e.nodes, function(e) {
			t.setNode(e.v, e.value), e.parent && t.setParent(e.v, e.parent);
		}), n.each(e.edges, function(e) {
			t.setEdge({
				v: e.v,
				w: e.w,
				name: e.name
			}, e.value);
		}), t;
	}
})), tr = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = r;
	function r(e) {
		var t = {}, r = [], i;
		function a(r) {
			n.has(t, r) || (t[r] = !0, i.push(r), n.each(e.successors(r), a), n.each(e.predecessors(r), a));
		}
		return n.each(e.nodes(), function(e) {
			i = [], a(e), i.length && r.push(i);
		}), r;
	}
})), nr = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = r;
	function r() {
		this._arr = [], this._keyIndices = {};
	}
	r.prototype.size = function() {
		return this._arr.length;
	}, r.prototype.keys = function() {
		return this._arr.map(function(e) {
			return e.key;
		});
	}, r.prototype.has = function(e) {
		return n.has(this._keyIndices, e);
	}, r.prototype.priority = function(e) {
		var t = this._keyIndices[e];
		if (t !== void 0) return this._arr[t].priority;
	}, r.prototype.min = function() {
		if (this.size() === 0) throw Error("Queue underflow");
		return this._arr[0].key;
	}, r.prototype.add = function(e, t) {
		var r = this._keyIndices;
		if (e = String(e), !n.has(r, e)) {
			var i = this._arr, a = i.length;
			return r[e] = a, i.push({
				key: e,
				priority: t
			}), this._decrease(a), !0;
		}
		return !1;
	}, r.prototype.removeMin = function() {
		this._swap(0, this._arr.length - 1);
		var e = this._arr.pop();
		return delete this._keyIndices[e.key], this._heapify(0), e.key;
	}, r.prototype.decrease = function(e, t) {
		var n = this._keyIndices[e];
		if (t > this._arr[n].priority) throw Error("New priority is greater than current priority. Key: " + e + " Old: " + this._arr[n].priority + " New: " + t);
		this._arr[n].priority = t, this._decrease(n);
	}, r.prototype._heapify = function(e) {
		var t = this._arr, n = 2 * e, r = n + 1, i = e;
		n < t.length && (i = t[n].priority < t[i].priority ? n : i, r < t.length && (i = t[r].priority < t[i].priority ? r : i), i !== e && (this._swap(e, i), this._heapify(i)));
	}, r.prototype._decrease = function(e) {
		for (var t = this._arr, n = t[e].priority, r; e !== 0 && (r = e >> 1, !(t[r].priority < n));) this._swap(e, r), e = r;
	}, r.prototype._swap = function(e, t) {
		var n = this._arr, r = this._keyIndices, i = n[e], a = n[t];
		n[e] = a, n[t] = i, r[a.key] = e, r[i.key] = t;
	};
})), rr = /* @__PURE__ */ o(((e, t) => {
	var n = Y(), r = nr();
	t.exports = a;
	var i = n.constant(1);
	function a(e, t, n, r) {
		return o(e, String(t), n || i, r || function(t) {
			return e.outEdges(t);
		});
	}
	function o(e, t, n, i) {
		var a = {}, o = new r(), s, c, l = function(e) {
			var t = e.v === s ? e.w : e.v, r = a[t], i = n(e), l = c.distance + i;
			if (i < 0) throw Error("dijkstra does not allow negative edge weights. Bad edge: " + e + " Weight: " + i);
			l < r.distance && (r.distance = l, r.predecessor = s, o.decrease(t, l));
		};
		for (e.nodes().forEach(function(e) {
			var n = e === t ? 0 : Infinity;
			a[e] = { distance: n }, o.add(e, n);
		}); o.size() > 0 && (s = o.removeMin(), c = a[s], c.distance !== Infinity);) i(s).forEach(l);
		return a;
	}
})), ir = /* @__PURE__ */ o(((e, t) => {
	var n = rr(), r = Y();
	t.exports = i;
	function i(e, t, i) {
		return r.transform(e.nodes(), function(r, a) {
			r[a] = n(e, a, t, i);
		}, {});
	}
})), ar = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = r;
	function r(e) {
		var t = 0, r = [], i = {}, a = [];
		function o(s) {
			var c = i[s] = {
				onStack: !0,
				lowlink: t,
				index: t++
			};
			if (r.push(s), e.successors(s).forEach(function(e) {
				n.has(i, e) ? i[e].onStack && (c.lowlink = Math.min(c.lowlink, i[e].index)) : (o(e), c.lowlink = Math.min(c.lowlink, i[e].lowlink));
			}), c.lowlink === c.index) {
				var l = [], u;
				do
					u = r.pop(), i[u].onStack = !1, l.push(u);
				while (s !== u);
				a.push(l);
			}
		}
		return e.nodes().forEach(function(e) {
			n.has(i, e) || o(e);
		}), a;
	}
})), or = /* @__PURE__ */ o(((e, t) => {
	var n = Y(), r = ar();
	t.exports = i;
	function i(e) {
		return n.filter(r(e), function(t) {
			return t.length > 1 || t.length === 1 && e.hasEdge(t[0], t[0]);
		});
	}
})), sr = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = i;
	var r = n.constant(1);
	function i(e, t, n) {
		return a(e, t || r, n || function(t) {
			return e.outEdges(t);
		});
	}
	function a(e, t, n) {
		var r = {}, i = e.nodes();
		return i.forEach(function(e) {
			r[e] = {}, r[e][e] = { distance: 0 }, i.forEach(function(t) {
				e !== t && (r[e][t] = { distance: Infinity });
			}), n(e).forEach(function(n) {
				var i = n.v === e ? n.w : n.v, a = t(n);
				r[e][i] = {
					distance: a,
					predecessor: e
				};
			});
		}), i.forEach(function(e) {
			var t = r[e];
			i.forEach(function(n) {
				var a = r[n];
				i.forEach(function(n) {
					var r = a[e], i = t[n], o = a[n], s = r.distance + i.distance;
					s < o.distance && (o.distance = s, o.predecessor = i.predecessor);
				});
			});
		}), r;
	}
})), cr = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = r, r.CycleException = i;
	function r(e) {
		var t = {}, r = {}, a = [];
		function o(s) {
			if (n.has(r, s)) throw new i();
			n.has(t, s) || (r[s] = !0, t[s] = !0, n.each(e.predecessors(s), o), delete r[s], a.push(s));
		}
		if (n.each(e.sinks(), o), n.size(t) !== e.nodeCount()) throw new i();
		return a;
	}
	function i() {}
	i.prototype = /* @__PURE__ */ Error();
})), lr = /* @__PURE__ */ o(((e, t) => {
	var n = cr();
	t.exports = r;
	function r(e) {
		try {
			n(e);
		} catch (e) {
			if (e instanceof n.CycleException) return !1;
			throw e;
		}
		return !0;
	}
})), ur = /* @__PURE__ */ o(((e, t) => {
	var n = Y();
	t.exports = r;
	function r(e, t, r) {
		n.isArray(t) || (t = [t]);
		var a = (e.isDirected() ? e.successors : e.neighbors).bind(e), o = [], s = {};
		return n.each(t, function(t) {
			if (!e.hasNode(t)) throw Error("Graph does not have node: " + t);
			i(e, t, r === "post", s, a, o);
		}), o;
	}
	function i(e, t, r, a, o, s) {
		n.has(a, t) || (a[t] = !0, r || s.push(t), n.each(o(t), function(t) {
			i(e, t, r, a, o, s);
		}), r && s.push(t));
	}
})), dr = /* @__PURE__ */ o(((e, t) => {
	var n = ur();
	t.exports = r;
	function r(e, t) {
		return n(e, t, "post");
	}
})), fr = /* @__PURE__ */ o(((e, t) => {
	var n = ur();
	t.exports = r;
	function r(e, t) {
		return n(e, t, "pre");
	}
})), pr = /* @__PURE__ */ o(((e, t) => {
	var n = Y(), r = Zn(), i = nr();
	t.exports = a;
	function a(e, t) {
		var a = new r(), o = {}, s = new i(), c;
		function l(e) {
			var n = e.v === c ? e.w : e.v, r = s.priority(n);
			if (r !== void 0) {
				var i = t(e);
				i < r && (o[n] = c, s.decrease(n, i));
			}
		}
		if (e.nodeCount() === 0) return a;
		n.each(e.nodes(), function(e) {
			s.add(e, Infinity), a.setNode(e);
		}), s.decrease(e.nodes()[0], 0);
		for (var u = !1; s.size() > 0;) {
			if (c = s.removeMin(), n.has(o, c)) a.setEdge(c, o[c]);
			else if (u) throw Error("Input graph is not connected: " + e);
			else u = !0;
			e.nodeEdges(c).forEach(l);
		}
		return a;
	}
})), mr = /* @__PURE__ */ o(((e, t) => {
	t.exports = {
		components: tr(),
		dijkstra: rr(),
		dijkstraAll: ir(),
		findCycles: or(),
		floydWarshall: sr(),
		isAcyclic: lr(),
		postorder: dr(),
		preorder: fr(),
		prim: pr(),
		tarjan: ar(),
		topsort: cr()
	};
})), hr = /* @__PURE__ */ o(((e, t) => {
	var n = $n();
	t.exports = {
		Graph: n.Graph,
		json: er(),
		alg: mr(),
		version: n.version
	};
})), X = /* @__PURE__ */ o(((e, t) => {
	var n;
	if (typeof l == "function") try {
		n = hr();
	} catch {}
	n ||= window.graphlib, t.exports = n;
})), gr = /* @__PURE__ */ o(((e, t) => {
	var n = vt(), r = 1, i = 4;
	function a(e) {
		return n(e, r | i);
	}
	t.exports = a;
})), _r = /* @__PURE__ */ o(((e, t) => {
	var n = m(), r = U(), i = Ee(), a = j();
	function o(e, t, o) {
		if (!a(o)) return !1;
		var s = typeof t;
		return (s == "number" ? r(o) && i(t, o.length) : s == "string" && t in o) ? n(o[t], e) : !1;
	}
	t.exports = o;
})), vr = /* @__PURE__ */ o(((e, t) => {
	var n = Ln(), r = m(), i = _r(), a = G(), o = Object.prototype, s = o.hasOwnProperty;
	t.exports = n(function(e, t) {
		e = Object(e);
		var n = -1, c = t.length, l = c > 2 ? t[2] : void 0;
		for (l && i(t[0], t[1], l) && (c = 1); ++n < c;) for (var u = t[n], d = a(u), f = -1, p = d.length; ++f < p;) {
			var m = d[f], h = e[m];
			(h === void 0 || r(h, o[m]) && !s.call(e, m)) && (e[m] = u[m]);
		}
		return e;
	});
})), yr = /* @__PURE__ */ o(((e, t) => {
	var n = J(), r = U(), i = W();
	function a(e) {
		return function(t, a, o) {
			var s = Object(t);
			if (!r(t)) {
				var c = n(a, 3);
				t = i(t), a = function(e) {
					return c(s[e], e, s);
				};
			}
			var l = e(t, a, o);
			return l > -1 ? s[c ? t[l] : l] : void 0;
		};
	}
	t.exports = a;
})), br = /* @__PURE__ */ o(((e, t) => {
	var n = /\s/;
	function r(e) {
		for (var t = e.length; t-- && n.test(e.charAt(t)););
		return t;
	}
	t.exports = r;
})), xr = /* @__PURE__ */ o(((e, t) => {
	var n = br(), r = /^\s+/;
	function i(e) {
		return e && e.slice(0, n(e) + 1).replace(r, "");
	}
	t.exports = i;
})), Sr = /* @__PURE__ */ o(((e, t) => {
	var n = xr(), r = j(), i = qt(), a = NaN, o = /^[-+]0x[0-9a-f]+$/i, s = /^0b[01]+$/i, c = /^0o[0-7]+$/i, l = parseInt;
	function u(e) {
		if (typeof e == "number") return e;
		if (i(e)) return a;
		if (r(e)) {
			var t = typeof e.valueOf == "function" ? e.valueOf() : e;
			e = r(t) ? t + "" : t;
		}
		if (typeof e != "string") return e === 0 ? e : +e;
		e = n(e);
		var u = s.test(e);
		return u || c.test(e) ? l(e.slice(2), u ? 2 : 8) : o.test(e) ? a : +e;
	}
	t.exports = u;
})), Cr = /* @__PURE__ */ o(((e, t) => {
	var n = Sr(), r = Infinity, i = 17976931348623157e292;
	function a(e) {
		return e ? (e = n(e), e === r || e === -r ? (e < 0 ? -1 : 1) * i : e === e ? e : 0) : e === 0 ? e : 0;
	}
	t.exports = a;
})), wr = /* @__PURE__ */ o(((e, t) => {
	var n = Cr();
	function r(e) {
		var t = n(e), r = t % 1;
		return t === t ? r ? t - r : t : 0;
	}
	t.exports = r;
})), Tr = /* @__PURE__ */ o(((e, t) => {
	var n = Rn(), r = J(), i = wr(), a = Math.max;
	function o(e, t, o) {
		var s = e == null ? 0 : e.length;
		if (!s) return -1;
		var c = o == null ? 0 : i(o);
		return c < 0 && (c = a(s + c, 0)), n(e, r(t, 3), c);
	}
	t.exports = o;
})), Er = /* @__PURE__ */ o(((e, t) => {
	t.exports = yr()(Tr());
})), Dr = /* @__PURE__ */ o(((e, t) => {
	var n = jn();
	function r(e) {
		return e != null && e.length ? n(e, 1) : [];
	}
	t.exports = r;
})), Or = /* @__PURE__ */ o(((e, t) => {
	var n = St(), r = Et(), i = G();
	function a(e, t) {
		return e == null ? e : n(e, r(t), i);
	}
	t.exports = a;
})), kr = /* @__PURE__ */ o(((e, t) => {
	function n(e) {
		var t = e == null ? 0 : e.length;
		return t ? e[t - 1] : void 0;
	}
	t.exports = n;
})), Ar = /* @__PURE__ */ o(((e, t) => {
	var n = ye(), r = Ct(), i = J();
	function a(e, t) {
		var a = {};
		return t = i(t, 3), r(e, function(e, r, i) {
			n(a, r, t(e, r, i));
		}), a;
	}
	t.exports = a;
})), jr = /* @__PURE__ */ o(((e, t) => {
	var n = qt();
	function r(e, t, r) {
		for (var i = -1, a = e.length; ++i < a;) {
			var o = e[i], s = t(o);
			if (s != null && (c === void 0 ? s === s && !n(s) : r(s, c))) var c = s, l = o;
		}
		return l;
	}
	t.exports = r;
})), Mr = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return e > t;
	}
	t.exports = n;
})), Nr = /* @__PURE__ */ o(((e, t) => {
	var n = jr(), r = Mr(), i = q();
	function a(e) {
		return e && e.length ? n(e, i, r) : void 0;
	}
	t.exports = a;
})), Pr = /* @__PURE__ */ o(((e, t) => {
	var n = ye(), r = m();
	function i(e, t, i) {
		(i !== void 0 && !r(e[t], i) || i === void 0 && !(t in e)) && n(e, t, i);
	}
	t.exports = i;
})), Fr = /* @__PURE__ */ o(((e, t) => {
	var n = A(), r = Je(), i = B(), a = "[object Object]", o = Function.prototype, s = Object.prototype, c = o.toString, l = s.hasOwnProperty, u = c.call(Object);
	function d(e) {
		if (!i(e) || n(e) != a) return !1;
		var t = r(e);
		if (t === null) return !0;
		var o = l.call(t, "constructor") && t.constructor;
		return typeof o == "function" && o instanceof o && c.call(o) == u;
	}
	t.exports = d;
})), Ir = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		if (!(t === "constructor" && typeof e[t] == "function") && t != "__proto__") return e[t];
	}
	t.exports = n;
})), Lr = /* @__PURE__ */ o(((e, t) => {
	var n = xe(), r = G();
	function i(e) {
		return n(e, r(e));
	}
	t.exports = i;
})), Rr = /* @__PURE__ */ o(((e, t) => {
	var n = Pr(), r = Ve(), i = ut(), a = He(), o = pt(), s = we(), c = V(), l = qn(), u = H(), d = M(), f = j(), p = Fr(), m = je(), h = Ir(), g = Lr();
	function _(e, t, _, v, y, b, x) {
		var S = h(e, _), C = h(t, _), w = x.get(C);
		if (w) {
			n(e, _, w);
			return;
		}
		var T = b ? b(S, C, _ + "", e, t, x) : void 0, E = T === void 0;
		if (E) {
			var D = c(C), O = !D && u(C), k = !D && !O && m(C);
			T = C, D || O || k ? c(S) ? T = S : l(S) ? T = a(S) : O ? (E = !1, T = r(C, !0)) : k ? (E = !1, T = i(C, !0)) : T = [] : p(C) || s(C) ? (T = S, s(S) ? T = g(S) : (!f(S) || d(S)) && (T = o(C))) : E = !1;
		}
		E && (x.set(C, T), y(T, C, v, b, x), x.delete(C)), n(e, _, T);
	}
	t.exports = _;
})), zr = /* @__PURE__ */ o(((e, t) => {
	var n = ge(), r = Pr(), i = St(), a = Rr(), o = j(), s = G(), c = Ir();
	function l(e, t, u, d, f) {
		e !== t && i(t, function(i, s) {
			if (f ||= new n(), o(i)) a(e, t, s, u, l, d, f);
			else {
				var p = d ? d(c(e, s), i, s + "", e, t, f) : void 0;
				p === void 0 && (p = i), r(e, s, p);
			}
		}, s);
	}
	t.exports = l;
})), Br = /* @__PURE__ */ o(((e, t) => {
	var n = Ln(), r = _r();
	function i(e) {
		return n(function(t, n) {
			var i = -1, a = n.length, o = a > 1 ? n[a - 1] : void 0, s = a > 2 ? n[2] : void 0;
			for (o = e.length > 3 && typeof o == "function" ? (a--, o) : void 0, s && r(n[0], n[1], s) && (o = a < 3 ? void 0 : o, a = 1), t = Object(t); ++i < a;) {
				var c = n[i];
				c && e(t, c, i, o);
			}
			return t;
		});
	}
	t.exports = i;
})), Vr = /* @__PURE__ */ o(((e, t) => {
	var n = zr();
	t.exports = Br()(function(e, t, r) {
		n(e, t, r);
	});
})), Hr = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		return e < t;
	}
	t.exports = n;
})), Ur = /* @__PURE__ */ o(((e, t) => {
	var n = jr(), r = Hr(), i = q();
	function a(e) {
		return e && e.length ? n(e, i, r) : void 0;
	}
	t.exports = a;
})), Wr = /* @__PURE__ */ o(((e, t) => {
	var n = jr(), r = J(), i = Hr();
	function a(e, t) {
		return e && e.length ? n(e, r(t, 2), i) : void 0;
	}
	t.exports = a;
})), Gr = /* @__PURE__ */ o(((e, t) => {
	var n = E();
	t.exports = function() {
		return n.Date.now();
	};
})), Kr = /* @__PURE__ */ o(((e, t) => {
	var n = be(), r = tn(), i = Ee(), a = j(), o = nn();
	function s(e, t, s, c) {
		if (!a(e)) return e;
		t = r(t, e);
		for (var l = -1, u = t.length, d = u - 1, f = e; f != null && ++l < u;) {
			var p = o(t[l]), m = s;
			if (p === "__proto__" || p === "constructor" || p === "prototype") return e;
			if (l != d) {
				var h = f[p];
				m = c ? c(h, p, f) : void 0, m === void 0 && (m = a(h) ? h : i(t[l + 1]) ? [] : {});
			}
			n(f, p, m), f = f[p];
		}
		return e;
	}
	t.exports = s;
})), qr = /* @__PURE__ */ o(((e, t) => {
	var n = rn(), r = Kr(), i = tn();
	function a(e, t, a) {
		for (var o = -1, s = t.length, c = {}; ++o < s;) {
			var l = t[o], u = n(e, l);
			a(u, l) && r(c, i(l, e), u);
		}
		return c;
	}
	t.exports = a;
})), Jr = /* @__PURE__ */ o(((e, t) => {
	var n = qr(), r = cn();
	function i(e, t) {
		return n(e, t, function(t, n) {
			return r(e, n);
		});
	}
	t.exports = i;
})), Yr = /* @__PURE__ */ o(((e, t) => {
	var n = Dr(), r = Nn(), i = In();
	function a(e) {
		return i(r(e, void 0, n), e + "");
	}
	t.exports = a;
})), Xr = /* @__PURE__ */ o(((e, t) => {
	var n = Jr();
	t.exports = Yr()(function(e, t) {
		return e == null ? {} : n(e, t);
	});
})), Zr = /* @__PURE__ */ o(((e, t) => {
	var n = Math.ceil, r = Math.max;
	function i(e, t, i, a) {
		for (var o = -1, s = r(n((t - e) / (i || 1)), 0), c = Array(s); s--;) c[a ? s : ++o] = e, e += i;
		return c;
	}
	t.exports = i;
})), Qr = /* @__PURE__ */ o(((e, t) => {
	var n = Zr(), r = _r(), i = Cr();
	function a(e) {
		return function(t, a, o) {
			return o && typeof o != "number" && r(t, a, o) && (a = o = void 0), t = i(t), a === void 0 ? (a = t, t = 0) : a = i(a), o = o === void 0 ? t < a ? 1 : -1 : i(o), n(t, a, o, e);
		};
	}
	t.exports = a;
})), $r = /* @__PURE__ */ o(((e, t) => {
	t.exports = Qr()();
})), ei = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		var n = e.length;
		for (e.sort(t); n--;) e[n] = e[n].value;
		return e;
	}
	t.exports = n;
})), ti = /* @__PURE__ */ o(((e, t) => {
	var n = qt();
	function r(e, t) {
		if (e !== t) {
			var r = e !== void 0, i = e === null, a = e === e, o = n(e), s = t !== void 0, c = t === null, l = t === t, u = n(t);
			if (!c && !u && !o && e > t || o && s && l && !c && !u || i && s && l || !r && l || !a) return 1;
			if (!i && !o && !u && e < t || u && r && a && !i && !o || c && r && a || !s && a || !l) return -1;
		}
		return 0;
	}
	t.exports = r;
})), ni = /* @__PURE__ */ o(((e, t) => {
	var n = ti();
	function r(e, t, r) {
		for (var i = -1, a = e.criteria, o = t.criteria, s = a.length, c = r.length; ++i < s;) {
			var l = n(a[i], o[i]);
			if (l) return i >= c ? l : l * (r[i] == "desc" ? -1 : 1);
		}
		return e.index - t.index;
	}
	t.exports = r;
})), ri = /* @__PURE__ */ o(((e, t) => {
	var n = Qt(), r = rn(), i = J(), a = vn(), o = ei(), s = ke(), c = ni(), l = q(), u = V();
	function d(e, t, d) {
		t = t.length ? n(t, function(e) {
			return u(e) ? function(t) {
				return r(t, e.length === 1 ? e[0] : e);
			} : e;
		}) : [l];
		var f = -1;
		return t = n(t, s(i)), o(a(e, function(e, r, i) {
			return {
				criteria: n(t, function(t) {
					return t(e);
				}),
				index: ++f,
				value: e
			};
		}), function(e, t) {
			return c(e, t, d);
		});
	}
	t.exports = d;
})), ii = /* @__PURE__ */ o(((e, t) => {
	var n = jn(), r = ri(), i = Ln(), a = _r();
	t.exports = i(function(e, t) {
		if (e == null) return [];
		var i = t.length;
		return i > 1 && a(e, t[0], t[1]) ? t = [] : i > 2 && a(t[0], t[1], t[2]) && (t = [t[0]]), r(e, n(t, 1), []);
	});
})), ai = /* @__PURE__ */ o(((e, t) => {
	var n = en(), r = 0;
	function i(e) {
		var t = ++r;
		return n(e) + t;
	}
	t.exports = i;
})), oi = /* @__PURE__ */ o(((e, t) => {
	function n(e, t, n) {
		for (var r = -1, i = e.length, a = t.length, o = {}; ++r < i;) {
			var s = r < a ? t[r] : void 0;
			n(o, e[r], s);
		}
		return o;
	}
	t.exports = n;
})), si = /* @__PURE__ */ o(((e, t) => {
	var n = be(), r = oi();
	function i(e, t) {
		return r(e || [], t || [], n);
	}
	t.exports = i;
})), Z = /* @__PURE__ */ o(((e, t) => {
	var n;
	if (typeof l == "function") try {
		n = {
			cloneDeep: gr(),
			constant: bt(),
			defaults: vr(),
			each: Ot(),
			filter: pn(),
			find: Er(),
			flatten: Dr(),
			forEach: Dt(),
			forIn: Or(),
			has: hn(),
			isUndefined: _n(),
			last: kr(),
			map: yn(),
			mapValues: Ar(),
			max: Nr(),
			merge: Vr(),
			min: Ur(),
			minBy: Wr(),
			now: Gr(),
			pick: Xr(),
			range: $r(),
			reduce: Sn(),
			sortBy: ii(),
			uniqueId: ai(),
			values: Xn(),
			zipObject: si()
		};
	} catch {}
	n ||= window._, t.exports = n;
})), ci = /* @__PURE__ */ o(((e, t) => {
	t.exports = n;
	function n() {
		var e = {};
		e._next = e._prev = e, this._sentinel = e;
	}
	n.prototype.dequeue = function() {
		var e = this._sentinel, t = e._prev;
		if (t !== e) return r(t), t;
	}, n.prototype.enqueue = function(e) {
		var t = this._sentinel;
		e._prev && e._next && r(e), e._next = t._next, t._next._prev = e, t._next = e, e._prev = t;
	}, n.prototype.toString = function() {
		for (var e = [], t = this._sentinel, n = t._prev; n !== t;) e.push(JSON.stringify(n, i)), n = n._prev;
		return "[" + e.join(", ") + "]";
	};
	function r(e) {
		e._prev._next = e._next, e._next._prev = e._prev, delete e._next, delete e._prev;
	}
	function i(e, t) {
		if (e !== "_next" && e !== "_prev") return t;
	}
})), li = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = X().Graph, i = ci();
	t.exports = o;
	var a = n.constant(1);
	function o(e, t) {
		if (e.nodeCount() <= 1) return [];
		var r = l(e, t || a), i = s(r.graph, r.buckets, r.zeroIdx);
		return n.flatten(n.map(i, function(t) {
			return e.outEdges(t.v, t.w);
		}), !0);
	}
	function s(e, t, n) {
		for (var r = [], i = t[t.length - 1], a = t[0], o; e.nodeCount();) {
			for (; o = a.dequeue();) c(e, t, n, o);
			for (; o = i.dequeue();) c(e, t, n, o);
			if (e.nodeCount()) {
				for (var s = t.length - 2; s > 0; --s) if (o = t[s].dequeue(), o) {
					r = r.concat(c(e, t, n, o, !0));
					break;
				}
			}
		}
		return r;
	}
	function c(e, t, r, i, a) {
		var o = a ? [] : void 0;
		return n.forEach(e.inEdges(i.v), function(n) {
			var i = e.edge(n), s = e.node(n.v);
			a && o.push({
				v: n.v,
				w: n.w
			}), s.out -= i, u(t, r, s);
		}), n.forEach(e.outEdges(i.v), function(n) {
			var i = e.edge(n), a = n.w, o = e.node(a);
			o.in -= i, u(t, r, o);
		}), e.removeNode(i.v), o;
	}
	function l(e, t) {
		var a = new r(), o = 0, s = 0;
		n.forEach(e.nodes(), function(e) {
			a.setNode(e, {
				v: e,
				in: 0,
				out: 0
			});
		}), n.forEach(e.edges(), function(e) {
			var n = a.edge(e.v, e.w) || 0, r = t(e), i = n + r;
			a.setEdge(e.v, e.w, i), s = Math.max(s, a.node(e.v).out += r), o = Math.max(o, a.node(e.w).in += r);
		});
		var c = n.range(s + o + 3).map(function() {
			return new i();
		}), l = o + 1;
		return n.forEach(a.nodes(), function(e) {
			u(c, l, a.node(e));
		}), {
			graph: a,
			buckets: c,
			zeroIdx: l
		};
	}
	function u(e, t, n) {
		n.out ? n.in ? e[n.out - n.in + t].enqueue(n) : e[e.length - 1].enqueue(n) : e[0].enqueue(n);
	}
})), ui = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = li();
	t.exports = {
		run: i,
		undo: o
	};
	function i(e) {
		var t = e.graph().acyclicer === "greedy" ? r(e, i(e)) : a(e);
		n.forEach(t, function(t) {
			var r = e.edge(t);
			e.removeEdge(t), r.forwardName = t.name, r.reversed = !0, e.setEdge(t.w, t.v, r, n.uniqueId("rev"));
		});
		function i(e) {
			return function(t) {
				return e.edge(t).weight;
			};
		}
	}
	function a(e) {
		var t = [], r = {}, i = {};
		function a(o) {
			n.has(i, o) || (i[o] = !0, r[o] = !0, n.forEach(e.outEdges(o), function(e) {
				n.has(r, e.w) ? t.push(e) : a(e.w);
			}), delete r[o]);
		}
		return n.forEach(e.nodes(), a), t;
	}
	function o(e) {
		n.forEach(e.edges(), function(t) {
			var n = e.edge(t);
			if (n.reversed) {
				e.removeEdge(t);
				var r = n.forwardName;
				delete n.reversed, delete n.forwardName, e.setEdge(t.w, t.v, n, r);
			}
		});
	}
})), Q = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = X().Graph;
	t.exports = {
		addDummyNode: i,
		simplify: a,
		asNonCompoundGraph: o,
		successorWeights: s,
		predecessorWeights: c,
		intersectRect: l,
		buildLayerMatrix: u,
		normalizeRanks: d,
		removeEmptyRanks: f,
		addBorderNode: p,
		maxRank: m,
		partition: h,
		time: g,
		notime: _
	};
	function i(e, t, r, i) {
		var a;
		do
			a = n.uniqueId(i);
		while (e.hasNode(a));
		return r.dummy = t, e.setNode(a, r), a;
	}
	function a(e) {
		var t = new r().setGraph(e.graph());
		return n.forEach(e.nodes(), function(n) {
			t.setNode(n, e.node(n));
		}), n.forEach(e.edges(), function(n) {
			var r = t.edge(n.v, n.w) || {
				weight: 0,
				minlen: 1
			}, i = e.edge(n);
			t.setEdge(n.v, n.w, {
				weight: r.weight + i.weight,
				minlen: Math.max(r.minlen, i.minlen)
			});
		}), t;
	}
	function o(e) {
		var t = new r({ multigraph: e.isMultigraph() }).setGraph(e.graph());
		return n.forEach(e.nodes(), function(n) {
			e.children(n).length || t.setNode(n, e.node(n));
		}), n.forEach(e.edges(), function(n) {
			t.setEdge(n, e.edge(n));
		}), t;
	}
	function s(e) {
		var t = n.map(e.nodes(), function(t) {
			var r = {};
			return n.forEach(e.outEdges(t), function(t) {
				r[t.w] = (r[t.w] || 0) + e.edge(t).weight;
			}), r;
		});
		return n.zipObject(e.nodes(), t);
	}
	function c(e) {
		var t = n.map(e.nodes(), function(t) {
			var r = {};
			return n.forEach(e.inEdges(t), function(t) {
				r[t.v] = (r[t.v] || 0) + e.edge(t).weight;
			}), r;
		});
		return n.zipObject(e.nodes(), t);
	}
	function l(e, t) {
		var n = e.x, r = e.y, i = t.x - n, a = t.y - r, o = e.width / 2, s = e.height / 2;
		if (!i && !a) throw Error("Not possible to find intersection inside of the rectangle");
		var c, l;
		return Math.abs(a) * o > Math.abs(i) * s ? (a < 0 && (s = -s), c = s * i / a, l = s) : (i < 0 && (o = -o), c = o, l = o * a / i), {
			x: n + c,
			y: r + l
		};
	}
	function u(e) {
		var t = n.map(n.range(m(e) + 1), function() {
			return [];
		});
		return n.forEach(e.nodes(), function(r) {
			var i = e.node(r), a = i.rank;
			n.isUndefined(a) || (t[a][i.order] = r);
		}), t;
	}
	function d(e) {
		var t = n.min(n.map(e.nodes(), function(t) {
			return e.node(t).rank;
		}));
		n.forEach(e.nodes(), function(r) {
			var i = e.node(r);
			n.has(i, "rank") && (i.rank -= t);
		});
	}
	function f(e) {
		var t = n.min(n.map(e.nodes(), function(t) {
			return e.node(t).rank;
		})), r = [];
		n.forEach(e.nodes(), function(n) {
			var i = e.node(n).rank - t;
			r[i] || (r[i] = []), r[i].push(n);
		});
		var i = 0, a = e.graph().nodeRankFactor;
		n.forEach(r, function(t, r) {
			n.isUndefined(t) && r % a !== 0 ? --i : i && n.forEach(t, function(t) {
				e.node(t).rank += i;
			});
		});
	}
	function p(e, t, n, r) {
		var a = {
			width: 0,
			height: 0
		};
		return arguments.length >= 4 && (a.rank = n, a.order = r), i(e, "border", a, t);
	}
	function m(e) {
		return n.max(n.map(e.nodes(), function(t) {
			var r = e.node(t).rank;
			if (!n.isUndefined(r)) return r;
		}));
	}
	function h(e, t) {
		var r = {
			lhs: [],
			rhs: []
		};
		return n.forEach(e, function(e) {
			t(e) ? r.lhs.push(e) : r.rhs.push(e);
		}), r;
	}
	function g(e, t) {
		var r = n.now();
		try {
			return t();
		} finally {
			console.log(e + " time: " + (n.now() - r) + "ms");
		}
	}
	function _(e, t) {
		return t();
	}
})), di = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Q();
	t.exports = {
		run: i,
		undo: o
	};
	function i(e) {
		e.graph().dummyChains = [], n.forEach(e.edges(), function(t) {
			a(e, t);
		});
	}
	function a(e, t) {
		var n = t.v, i = e.node(n).rank, a = t.w, o = e.node(a).rank, s = t.name, c = e.edge(t), l = c.labelRank;
		if (o !== i + 1) {
			e.removeEdge(t);
			var u, d, f;
			for (f = 0, ++i; i < o; ++f, ++i) c.points = [], d = {
				width: 0,
				height: 0,
				edgeLabel: c,
				edgeObj: t,
				rank: i
			}, u = r.addDummyNode(e, "edge", d, "_d"), i === l && (d.width = c.width, d.height = c.height, d.dummy = "edge-label", d.labelpos = c.labelpos), e.setEdge(n, u, { weight: c.weight }, s), f === 0 && e.graph().dummyChains.push(u), n = u;
			e.setEdge(n, a, { weight: c.weight }, s);
		}
	}
	function o(e) {
		n.forEach(e.graph().dummyChains, function(t) {
			var n = e.node(t), r = n.edgeLabel, i;
			for (e.setEdge(n.edgeObj, r); n.dummy;) i = e.successors(t)[0], e.removeNode(t), r.points.push({
				x: n.x,
				y: n.y
			}), n.dummy === "edge-label" && (r.x = n.x, r.y = n.y, r.width = n.width, r.height = n.height), t = i, n = e.node(t);
		});
	}
})), fi = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = {
		longestPath: r,
		slack: i
	};
	function r(e) {
		var t = {};
		function r(i) {
			var a = e.node(i);
			if (n.has(t, i)) return a.rank;
			t[i] = !0;
			var o = n.min(n.map(e.outEdges(i), function(t) {
				return r(t.w) - e.edge(t).minlen;
			}));
			return (o === Infinity || o == null) && (o = 0), a.rank = o;
		}
		n.forEach(e.sources(), r);
	}
	function i(e, t) {
		return e.node(t.w).rank - e.node(t.v).rank - e.edge(t).minlen;
	}
})), pi = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = X().Graph, i = fi().slack;
	t.exports = a;
	function a(e) {
		var t = new r({ directed: !1 }), n = e.nodes()[0], a = e.nodeCount();
		t.setNode(n, {});
		for (var l, u; o(t, e) < a;) l = s(t, e), u = t.hasNode(l.v) ? i(e, l) : -i(e, l), c(t, e, u);
		return t;
	}
	function o(e, t) {
		function r(a) {
			n.forEach(t.nodeEdges(a), function(n) {
				var o = n.v, s = a === o ? n.w : o;
				!e.hasNode(s) && !i(t, n) && (e.setNode(s, {}), e.setEdge(a, s, {}), r(s));
			});
		}
		return n.forEach(e.nodes(), r), e.nodeCount();
	}
	function s(e, t) {
		return n.minBy(t.edges(), function(n) {
			if (e.hasNode(n.v) !== e.hasNode(n.w)) return i(t, n);
		});
	}
	function c(e, t, r) {
		n.forEach(e.nodes(), function(e) {
			t.node(e).rank += r;
		});
	}
})), mi = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = pi(), i = fi().slack, a = fi().longestPath, o = X().alg.preorder, s = X().alg.postorder, c = Q().simplify;
	t.exports = l, l.initLowLimValues = p, l.initCutValues = u, l.calcCutValue = f, l.leaveEdge = h, l.enterEdge = g, l.exchangeEdges = _;
	function l(e) {
		e = c(e), a(e);
		var t = r(e);
		p(t), u(t, e);
		for (var n, i; n = h(t);) i = g(t, e, n), _(t, e, n, i);
	}
	function u(e, t) {
		var r = s(e, e.nodes());
		r = r.slice(0, r.length - 1), n.forEach(r, function(n) {
			d(e, t, n);
		});
	}
	function d(e, t, n) {
		var r = e.node(n).parent;
		e.edge(n, r).cutvalue = f(e, t, n);
	}
	function f(e, t, r) {
		var i = e.node(r).parent, a = !0, o = t.edge(r, i), s = 0;
		return o ||= (a = !1, t.edge(i, r)), s = o.weight, n.forEach(t.nodeEdges(r), function(n) {
			var o = n.v === r, c = o ? n.w : n.v;
			if (c !== i) {
				var l = o === a, u = t.edge(n).weight;
				if (s += l ? u : -u, y(e, r, c)) {
					var d = e.edge(r, c).cutvalue;
					s += l ? -d : d;
				}
			}
		}), s;
	}
	function p(e, t) {
		arguments.length < 2 && (t = e.nodes()[0]), m(e, {}, 1, t);
	}
	function m(e, t, r, i, a) {
		var o = r, s = e.node(i);
		return t[i] = !0, n.forEach(e.neighbors(i), function(a) {
			n.has(t, a) || (r = m(e, t, r, a, i));
		}), s.low = o, s.lim = r++, a ? s.parent = a : delete s.parent, r;
	}
	function h(e) {
		return n.find(e.edges(), function(t) {
			return e.edge(t).cutvalue < 0;
		});
	}
	function g(e, t, r) {
		var a = r.v, o = r.w;
		t.hasEdge(a, o) || (a = r.w, o = r.v);
		var s = e.node(a), c = e.node(o), l = s, u = !1;
		s.lim > c.lim && (l = c, u = !0);
		var d = n.filter(t.edges(), function(t) {
			return u === b(e, e.node(t.v), l) && u !== b(e, e.node(t.w), l);
		});
		return n.minBy(d, function(e) {
			return i(t, e);
		});
	}
	function _(e, t, n, r) {
		var i = n.v, a = n.w;
		e.removeEdge(i, a), e.setEdge(r.v, r.w, {}), p(e), u(e, t), v(e, t);
	}
	function v(e, t) {
		var r = o(e, n.find(e.nodes(), function(e) {
			return !t.node(e).parent;
		}));
		r = r.slice(1), n.forEach(r, function(n) {
			var r = e.node(n).parent, i = t.edge(n, r), a = !1;
			i || (i = t.edge(r, n), a = !0), t.node(n).rank = t.node(r).rank + (a ? i.minlen : -i.minlen);
		});
	}
	function y(e, t, n) {
		return e.hasEdge(t, n);
	}
	function b(e, t, n) {
		return n.low <= t.lim && t.lim <= n.lim;
	}
})), hi = /* @__PURE__ */ o(((e, t) => {
	var n = fi().longestPath, r = pi(), i = mi();
	t.exports = a;
	function a(e) {
		switch (e.graph().ranker) {
			case "network-simplex":
				c(e);
				break;
			case "tight-tree":
				s(e);
				break;
			case "longest-path":
				o(e);
				break;
			default: c(e);
		}
	}
	var o = n;
	function s(e) {
		n(e), r(e);
	}
	function c(e) {
		i(e);
	}
})), gi = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = r;
	function r(e) {
		var t = a(e);
		n.forEach(e.graph().dummyChains, function(n) {
			for (var r = e.node(n), a = r.edgeObj, o = i(e, t, a.v, a.w), s = o.path, c = o.lca, l = 0, u = s[l], d = !0; n !== a.w;) {
				if (r = e.node(n), d) {
					for (; (u = s[l]) !== c && e.node(u).maxRank < r.rank;) l++;
					u === c && (d = !1);
				}
				if (!d) {
					for (; l < s.length - 1 && e.node(u = s[l + 1]).minRank <= r.rank;) l++;
					u = s[l];
				}
				e.setParent(n, u), n = e.successors(n)[0];
			}
		});
	}
	function i(e, t, n, r) {
		var i = [], a = [], o = Math.min(t[n].low, t[r].low), s = Math.max(t[n].lim, t[r].lim), c = n, l;
		do
			c = e.parent(c), i.push(c);
		while (c && (t[c].low > o || s > t[c].lim));
		for (l = c, c = r; (c = e.parent(c)) !== l;) a.push(c);
		return {
			path: i.concat(a.reverse()),
			lca: l
		};
	}
	function a(e) {
		var t = {}, r = 0;
		function i(a) {
			var o = r;
			n.forEach(e.children(a), i), t[a] = {
				low: o,
				lim: r++
			};
		}
		return n.forEach(e.children(), i), t;
	}
})), _i = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Q();
	t.exports = {
		run: i,
		cleanup: c
	};
	function i(e) {
		var t = r.addDummyNode(e, "root", {}, "_root"), i = o(e), c = n.max(n.values(i)) - 1, l = 2 * c + 1;
		e.graph().nestingRoot = t, n.forEach(e.edges(), function(t) {
			e.edge(t).minlen *= l;
		});
		var u = s(e) + 1;
		n.forEach(e.children(), function(n) {
			a(e, t, l, u, c, i, n);
		}), e.graph().nodeRankFactor = l;
	}
	function a(e, t, i, o, s, c, l) {
		var u = e.children(l);
		if (!u.length) {
			l !== t && e.setEdge(t, l, {
				weight: 0,
				minlen: i
			});
			return;
		}
		var d = r.addBorderNode(e, "_bt"), f = r.addBorderNode(e, "_bb"), p = e.node(l);
		e.setParent(d, l), p.borderTop = d, e.setParent(f, l), p.borderBottom = f, n.forEach(u, function(n) {
			a(e, t, i, o, s, c, n);
			var r = e.node(n), u = r.borderTop ? r.borderTop : n, p = r.borderBottom ? r.borderBottom : n, m = r.borderTop ? o : 2 * o, h = u === p ? s - c[l] + 1 : 1;
			e.setEdge(d, u, {
				weight: m,
				minlen: h,
				nestingEdge: !0
			}), e.setEdge(p, f, {
				weight: m,
				minlen: h,
				nestingEdge: !0
			});
		}), e.parent(l) || e.setEdge(t, d, {
			weight: 0,
			minlen: s + c[l]
		});
	}
	function o(e) {
		var t = {};
		function r(i, a) {
			var o = e.children(i);
			o && o.length && n.forEach(o, function(e) {
				r(e, a + 1);
			}), t[i] = a;
		}
		return n.forEach(e.children(), function(e) {
			r(e, 1);
		}), t;
	}
	function s(e) {
		return n.reduce(e.edges(), function(t, n) {
			return t + e.edge(n).weight;
		}, 0);
	}
	function c(e) {
		var t = e.graph();
		e.removeNode(t.nestingRoot), delete t.nestingRoot, n.forEach(e.edges(), function(t) {
			e.edge(t).nestingEdge && e.removeEdge(t);
		});
	}
})), vi = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Q();
	t.exports = i;
	function i(e) {
		function t(r) {
			var i = e.children(r), o = e.node(r);
			if (i.length && n.forEach(i, t), n.has(o, "minRank")) {
				o.borderLeft = [], o.borderRight = [];
				for (var s = o.minRank, c = o.maxRank + 1; s < c; ++s) a(e, "borderLeft", "_bl", r, o, s), a(e, "borderRight", "_br", r, o, s);
			}
		}
		n.forEach(e.children(), t);
	}
	function a(e, t, n, i, a, o) {
		var s = {
			width: 0,
			height: 0,
			rank: o,
			borderType: t
		}, c = a[t][o - 1], l = r.addDummyNode(e, "border", s, n);
		a[t][o] = l, e.setParent(l, i), c && e.setEdge(c, l, { weight: 1 });
	}
})), yi = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = {
		adjust: r,
		undo: i
	};
	function r(e) {
		var t = e.graph().rankdir.toLowerCase();
		(t === "lr" || t === "rl") && a(e);
	}
	function i(e) {
		var t = e.graph().rankdir.toLowerCase();
		(t === "bt" || t === "rl") && s(e), (t === "lr" || t === "rl") && (l(e), a(e));
	}
	function a(e) {
		n.forEach(e.nodes(), function(t) {
			o(e.node(t));
		}), n.forEach(e.edges(), function(t) {
			o(e.edge(t));
		});
	}
	function o(e) {
		var t = e.width;
		e.width = e.height, e.height = t;
	}
	function s(e) {
		n.forEach(e.nodes(), function(t) {
			c(e.node(t));
		}), n.forEach(e.edges(), function(t) {
			var r = e.edge(t);
			n.forEach(r.points, c), n.has(r, "y") && c(r);
		});
	}
	function c(e) {
		e.y = -e.y;
	}
	function l(e) {
		n.forEach(e.nodes(), function(t) {
			u(e.node(t));
		}), n.forEach(e.edges(), function(t) {
			var r = e.edge(t);
			n.forEach(r.points, u), n.has(r, "x") && u(r);
		});
	}
	function u(e) {
		var t = e.x;
		e.x = e.y, e.y = t;
	}
})), bi = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = r;
	function r(e) {
		var t = {}, r = n.filter(e.nodes(), function(t) {
			return !e.children(t).length;
		}), i = n.max(n.map(r, function(t) {
			return e.node(t).rank;
		})), a = n.map(n.range(i + 1), function() {
			return [];
		});
		function o(r) {
			n.has(t, r) || (t[r] = !0, a[e.node(r).rank].push(r), n.forEach(e.successors(r), o));
		}
		var s = n.sortBy(r, function(t) {
			return e.node(t).rank;
		});
		return n.forEach(s, o), a;
	}
})), xi = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = r;
	function r(e, t) {
		for (var n = 0, r = 1; r < t.length; ++r) n += i(e, t[r - 1], t[r]);
		return n;
	}
	function i(e, t, r) {
		for (var i = n.zipObject(r, n.map(r, function(e, t) {
			return t;
		})), a = n.flatten(n.map(t, function(t) {
			return n.sortBy(n.map(e.outEdges(t), function(t) {
				return {
					pos: i[t.w],
					weight: e.edge(t).weight
				};
			}), "pos");
		}), !0), o = 1; o < r.length;) o <<= 1;
		var s = 2 * o - 1;
		--o;
		var c = n.map(Array(s), function() {
			return 0;
		}), l = 0;
		return n.forEach(a.forEach(function(e) {
			var t = e.pos + o;
			c[t] += e.weight;
			for (var n = 0; t > 0;) t % 2 && (n += c[t + 1]), t = t - 1 >> 1, c[t] += e.weight;
			l += e.weight * n;
		})), l;
	}
})), Si = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = r;
	function r(e, t) {
		return n.map(t, function(t) {
			var r = e.inEdges(t);
			if (r.length) {
				var i = n.reduce(r, function(t, n) {
					var r = e.edge(n), i = e.node(n.v);
					return {
						sum: t.sum + r.weight * i.order,
						weight: t.weight + r.weight
					};
				}, {
					sum: 0,
					weight: 0
				});
				return {
					v: t,
					barycenter: i.sum / i.weight,
					weight: i.weight
				};
			} else return { v: t };
		});
	}
})), Ci = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = r;
	function r(e, t) {
		var r = {};
		return n.forEach(e, function(e, t) {
			var i = r[e.v] = {
				indegree: 0,
				in: [],
				out: [],
				vs: [e.v],
				i: t
			};
			n.isUndefined(e.barycenter) || (i.barycenter = e.barycenter, i.weight = e.weight);
		}), n.forEach(t.edges(), function(e) {
			var t = r[e.v], i = r[e.w];
			!n.isUndefined(t) && !n.isUndefined(i) && (i.indegree++, t.out.push(r[e.w]));
		}), i(n.filter(r, function(e) {
			return !e.indegree;
		}));
	}
	function i(e) {
		var t = [];
		function r(e) {
			return function(t) {
				t.merged || (n.isUndefined(t.barycenter) || n.isUndefined(e.barycenter) || t.barycenter >= e.barycenter) && a(e, t);
			};
		}
		function i(t) {
			return function(n) {
				n.in.push(t), --n.indegree === 0 && e.push(n);
			};
		}
		for (; e.length;) {
			var o = e.pop();
			t.push(o), n.forEach(o.in.reverse(), r(o)), n.forEach(o.out, i(o));
		}
		return n.map(n.filter(t, function(e) {
			return !e.merged;
		}), function(e) {
			return n.pick(e, [
				"vs",
				"i",
				"barycenter",
				"weight"
			]);
		});
	}
	function a(e, t) {
		var n = 0, r = 0;
		e.weight && (n += e.barycenter * e.weight, r += e.weight), t.weight && (n += t.barycenter * t.weight, r += t.weight), e.vs = t.vs.concat(e.vs), e.barycenter = n / r, e.weight = r, e.i = Math.min(t.i, e.i), t.merged = !0;
	}
})), wi = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Q();
	t.exports = i;
	function i(e, t) {
		var i = r.partition(e, function(e) {
			return n.has(e, "barycenter");
		}), s = i.lhs, c = n.sortBy(i.rhs, function(e) {
			return -e.i;
		}), l = [], u = 0, d = 0, f = 0;
		s.sort(o(!!t)), f = a(l, c, f), n.forEach(s, function(e) {
			f += e.vs.length, l.push(e.vs), u += e.barycenter * e.weight, d += e.weight, f = a(l, c, f);
		});
		var p = { vs: n.flatten(l, !0) };
		return d && (p.barycenter = u / d, p.weight = d), p;
	}
	function a(e, t, r) {
		for (var i; t.length && (i = n.last(t)).i <= r;) t.pop(), e.push(i.vs), r++;
		return r;
	}
	function o(e) {
		return function(t, n) {
			return t.barycenter < n.barycenter ? -1 : t.barycenter > n.barycenter ? 1 : e ? n.i - t.i : t.i - n.i;
		};
	}
})), Ti = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Si(), i = Ci(), a = wi();
	t.exports = o;
	function o(e, t, l, u) {
		var d = e.children(t), f = e.node(t), p = f ? f.borderLeft : void 0, m = f ? f.borderRight : void 0, h = {};
		p && (d = n.filter(d, function(e) {
			return e !== p && e !== m;
		}));
		var g = r(e, d);
		n.forEach(g, function(t) {
			if (e.children(t.v).length) {
				var r = o(e, t.v, l, u);
				h[t.v] = r, n.has(r, "barycenter") && c(t, r);
			}
		});
		var _ = i(g, l);
		s(_, h);
		var v = a(_, u);
		if (p && (v.vs = n.flatten([
			p,
			v.vs,
			m
		], !0), e.predecessors(p).length)) {
			var y = e.node(e.predecessors(p)[0]), b = e.node(e.predecessors(m)[0]);
			n.has(v, "barycenter") || (v.barycenter = 0, v.weight = 0), v.barycenter = (v.barycenter * v.weight + y.order + b.order) / (v.weight + 2), v.weight += 2;
		}
		return v;
	}
	function s(e, t) {
		n.forEach(e, function(e) {
			e.vs = n.flatten(e.vs.map(function(e) {
				return t[e] ? t[e].vs : e;
			}), !0);
		});
	}
	function c(e, t) {
		n.isUndefined(e.barycenter) ? (e.barycenter = t.barycenter, e.weight = t.weight) : (e.barycenter = (e.barycenter * e.weight + t.barycenter * t.weight) / (e.weight + t.weight), e.weight += t.weight);
	}
})), Ei = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = X().Graph;
	t.exports = i;
	function i(e, t, i) {
		var o = a(e), s = new r({ compound: !0 }).setGraph({ root: o }).setDefaultNodeLabel(function(t) {
			return e.node(t);
		});
		return n.forEach(e.nodes(), function(r) {
			var a = e.node(r), c = e.parent(r);
			(a.rank === t || a.minRank <= t && t <= a.maxRank) && (s.setNode(r), s.setParent(r, c || o), n.forEach(e[i](r), function(t) {
				var i = t.v === r ? t.w : t.v, a = s.edge(i, r), o = n.isUndefined(a) ? 0 : a.weight;
				s.setEdge(i, r, { weight: e.edge(t).weight + o });
			}), n.has(a, "minRank") && s.setNode(r, {
				borderLeft: a.borderLeft[t],
				borderRight: a.borderRight[t]
			}));
		}), s;
	}
	function a(e) {
		for (var t; e.hasNode(t = n.uniqueId("_root")););
		return t;
	}
})), Di = /* @__PURE__ */ o(((e, t) => {
	var n = Z();
	t.exports = r;
	function r(e, t, r) {
		var i = {}, a;
		n.forEach(r, function(n) {
			for (var r = e.parent(n), o, s; r;) {
				if (o = e.parent(r), o ? (s = i[o], i[o] = r) : (s = a, a = r), s && s !== r) {
					t.setEdge(s, r);
					return;
				}
				r = o;
			}
		});
	}
})), Oi = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = bi(), i = xi(), a = Ti(), o = Ei(), s = Di(), c = X().Graph, l = Q();
	t.exports = u;
	function u(e) {
		var t = l.maxRank(e), a = d(e, n.range(1, t + 1), "inEdges"), o = d(e, n.range(t - 1, -1, -1), "outEdges"), s = r(e);
		p(e, s);
		for (var c = Infinity, u, m = 0, h = 0; h < 4; ++m, ++h) {
			f(m % 2 ? a : o, m % 4 >= 2), s = l.buildLayerMatrix(e);
			var g = i(e, s);
			g < c && (h = 0, u = n.cloneDeep(s), c = g);
		}
		p(e, u);
	}
	function d(e, t, r) {
		return n.map(t, function(t) {
			return o(e, t, r);
		});
	}
	function f(e, t) {
		var r = new c();
		n.forEach(e, function(e) {
			var i = e.graph().root, o = a(e, i, r, t);
			n.forEach(o.vs, function(t, n) {
				e.node(t).order = n;
			}), s(e, r, o.vs);
		});
	}
	function p(e, t) {
		n.forEach(t, function(t) {
			n.forEach(t, function(t, n) {
				e.node(t).order = n;
			});
		});
	}
})), ki = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = X().Graph, i = Q();
	t.exports = {
		positionX: g,
		findType1Conflicts: a,
		findType2Conflicts: o,
		addConflict: c,
		hasConflict: l,
		verticalAlignment: u,
		horizontalCompaction: d,
		alignCoordinates: m,
		findSmallestWidthAlignment: p,
		balance: h
	};
	function a(e, t) {
		var r = {};
		function i(t, i) {
			var a = 0, o = 0, l = t.length, u = n.last(i);
			return n.forEach(i, function(t, d) {
				var f = s(e, t), p = f ? e.node(f).order : l;
				(f || t === u) && (n.forEach(i.slice(o, d + 1), function(t) {
					n.forEach(e.predecessors(t), function(n) {
						var i = e.node(n), o = i.order;
						(o < a || p < o) && !(i.dummy && e.node(t).dummy) && c(r, n, t);
					});
				}), o = d + 1, a = p);
			}), i;
		}
		return n.reduce(t, i), r;
	}
	function o(e, t) {
		var r = {};
		function i(t, i, a, o, s) {
			var l;
			n.forEach(n.range(i, a), function(i) {
				l = t[i], e.node(l).dummy && n.forEach(e.predecessors(l), function(t) {
					var n = e.node(t);
					n.dummy && (n.order < o || n.order > s) && c(r, t, l);
				});
			});
		}
		function a(t, r) {
			var a = -1, o, s = 0;
			return n.forEach(r, function(n, c) {
				if (e.node(n).dummy === "border") {
					var l = e.predecessors(n);
					l.length && (o = e.node(l[0]).order, i(r, s, c, a, o), s = c, a = o);
				}
				i(r, s, r.length, o, t.length);
			}), r;
		}
		return n.reduce(t, a), r;
	}
	function s(e, t) {
		if (e.node(t).dummy) return n.find(e.predecessors(t), function(t) {
			return e.node(t).dummy;
		});
	}
	function c(e, t, n) {
		if (t > n) {
			var r = t;
			t = n, n = r;
		}
		var i = e[t];
		i || (e[t] = i = {}), i[n] = !0;
	}
	function l(e, t, r) {
		if (t > r) {
			var i = t;
			t = r, r = i;
		}
		return n.has(e[t], r);
	}
	function u(e, t, r, i) {
		var a = {}, o = {}, s = {};
		return n.forEach(t, function(e) {
			n.forEach(e, function(e, t) {
				a[e] = e, o[e] = e, s[e] = t;
			});
		}), n.forEach(t, function(e) {
			var t = -1;
			n.forEach(e, function(e) {
				var c = i(e);
				if (c.length) {
					c = n.sortBy(c, function(e) {
						return s[e];
					});
					for (var u = (c.length - 1) / 2, d = Math.floor(u), f = Math.ceil(u); d <= f; ++d) {
						var p = c[d];
						o[e] === e && t < s[p] && !l(r, e, p) && (o[p] = e, o[e] = a[e] = a[p], t = s[p]);
					}
				}
			});
		}), {
			root: a,
			align: o
		};
	}
	function d(e, t, r, i, a) {
		var o = {}, s = f(e, t, r, a), c = a ? "borderLeft" : "borderRight";
		function l(e, t) {
			for (var n = s.nodes(), r = n.pop(), i = {}; r;) i[r] ? e(r) : (i[r] = !0, n.push(r), n = n.concat(t(r))), r = n.pop();
		}
		function u(e) {
			o[e] = s.inEdges(e).reduce(function(e, t) {
				return Math.max(e, o[t.v] + s.edge(t));
			}, 0);
		}
		function d(t) {
			var n = s.outEdges(t).reduce(function(e, t) {
				return Math.min(e, o[t.w] - s.edge(t));
			}, Infinity), r = e.node(t);
			n !== Infinity && r.borderType !== c && (o[t] = Math.max(o[t], n));
		}
		return l(u, s.predecessors.bind(s)), l(d, s.successors.bind(s)), n.forEach(i, function(e) {
			o[e] = o[r[e]];
		}), o;
	}
	function f(e, t, i, a) {
		var o = new r(), s = e.graph(), c = _(s.nodesep, s.edgesep, a);
		return n.forEach(t, function(t) {
			var r;
			n.forEach(t, function(t) {
				var n = i[t];
				if (o.setNode(n), r) {
					var a = i[r], s = o.edge(a, n);
					o.setEdge(a, n, Math.max(c(e, t, r), s || 0));
				}
				r = t;
			});
		}), o;
	}
	function p(e, t) {
		return n.minBy(n.values(t), function(t) {
			var r = -Infinity, i = Infinity;
			return n.forIn(t, function(t, n) {
				var a = v(e, n) / 2;
				r = Math.max(t + a, r), i = Math.min(t - a, i);
			}), r - i;
		});
	}
	function m(e, t) {
		var r = n.values(t), i = n.min(r), a = n.max(r);
		n.forEach(["u", "d"], function(r) {
			n.forEach(["l", "r"], function(o) {
				var s = r + o, c = e[s], l;
				if (c !== t) {
					var u = n.values(c);
					l = o === "l" ? i - n.min(u) : a - n.max(u), l && (e[s] = n.mapValues(c, function(e) {
						return e + l;
					}));
				}
			});
		});
	}
	function h(e, t) {
		return n.mapValues(e.ul, function(r, i) {
			if (t) return e[t.toLowerCase()][i];
			var a = n.sortBy(n.map(e, i));
			return (a[1] + a[2]) / 2;
		});
	}
	function g(e) {
		var t = i.buildLayerMatrix(e), r = n.merge(a(e, t), o(e, t)), s = {}, c;
		return n.forEach(["u", "d"], function(i) {
			c = i === "u" ? t : n.values(t).reverse(), n.forEach(["l", "r"], function(t) {
				t === "r" && (c = n.map(c, function(e) {
					return n.values(e).reverse();
				}));
				var a = (i === "u" ? e.predecessors : e.successors).bind(e), o = u(e, c, r, a), l = d(e, c, o.root, o.align, t === "r");
				t === "r" && (l = n.mapValues(l, function(e) {
					return -e;
				})), s[i + t] = l;
			});
		}), m(s, p(e, s)), h(s, e.graph().align);
	}
	function _(e, t, r) {
		return function(i, a, o) {
			var s = i.node(a), c = i.node(o), l = 0, u;
			if (l += s.width / 2, n.has(s, "labelpos")) switch (s.labelpos.toLowerCase()) {
				case "l":
					u = -s.width / 2;
					break;
				case "r":
					u = s.width / 2;
					break;
			}
			if (u && (l += r ? u : -u), u = 0, l += (s.dummy ? t : e) / 2, l += (c.dummy ? t : e) / 2, l += c.width / 2, n.has(c, "labelpos")) switch (c.labelpos.toLowerCase()) {
				case "l":
					u = c.width / 2;
					break;
				case "r":
					u = -c.width / 2;
					break;
			}
			return u && (l += r ? u : -u), u = 0, l;
		};
	}
	function v(e, t) {
		return e.node(t).width;
	}
})), Ai = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Q(), i = ki().positionX;
	t.exports = a;
	function a(e) {
		e = r.asNonCompoundGraph(e), o(e), n.forEach(i(e), function(t, n) {
			e.node(n).x = t;
		});
	}
	function o(e) {
		var t = r.buildLayerMatrix(e), i = e.graph().ranksep, a = 0;
		n.forEach(t, function(t) {
			var r = n.max(n.map(t, function(t) {
				return e.node(t).height;
			}));
			n.forEach(t, function(t) {
				e.node(t).y = a + r / 2;
			}), a += r + i;
		});
	}
})), ji = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = ui(), i = di(), a = hi(), o = Q().normalizeRanks, s = gi(), c = Q().removeEmptyRanks, l = _i(), u = vi(), d = yi(), f = Oi(), p = Ai(), m = Q(), h = X().Graph;
	t.exports = g;
	function g(e, t) {
		var n = t && t.debugTiming ? m.time : m.notime;
		n("layout", function() {
			var t = n("  buildLayoutGraph", function() {
				return D(e);
			});
			n("  runLayout", function() {
				_(t, n);
			}), n("  updateInputGraph", function() {
				v(e, t);
			});
		});
	}
	function _(e, t) {
		t("    makeSpaceForEdgeLabels", function() {
			O(e);
		}), t("    removeSelfEdges", function() {
			ne(e);
		}), t("    acyclic", function() {
			r.run(e);
		}), t("    nestingGraph.run", function() {
			l.run(e);
		}), t("    rank", function() {
			a(m.asNonCompoundGraph(e));
		}), t("    injectEdgeLabelProxies", function() {
			k(e);
		}), t("    removeEmptyRanks", function() {
			c(e);
		}), t("    nestingGraph.cleanup", function() {
			l.cleanup(e);
		}), t("    normalizeRanks", function() {
			o(e);
		}), t("    assignRankMinMax", function() {
			A(e);
		}), t("    removeEdgeLabelProxies", function() {
			j(e);
		}), t("    normalize.run", function() {
			i.run(e);
		}), t("    parentDummyChains", function() {
			s(e);
		}), t("    addBorderSegments", function() {
			u(e);
		}), t("    order", function() {
			f(e);
		}), t("    insertSelfEdges", function() {
			F(e);
		}), t("    adjustCoordinateSystem", function() {
			d.adjust(e);
		}), t("    position", function() {
			p(e);
		}), t("    positionSelfEdges", function() {
			I(e);
		}), t("    removeBorderNodes", function() {
			P(e);
		}), t("    normalize.undo", function() {
			i.undo(e);
		}), t("    fixupEdgeLabelCoords", function() {
			te(e);
		}), t("    undoCoordinateSystem", function() {
			d.undo(e);
		}), t("    translateGraph", function() {
			M(e);
		}), t("    assignNodeIntersects", function() {
			ee(e);
		}), t("    reversePoints", function() {
			N(e);
		}), t("    acyclic.undo", function() {
			r.undo(e);
		});
	}
	function v(e, t) {
		n.forEach(e.nodes(), function(n) {
			var r = e.node(n), i = t.node(n);
			r && (r.x = i.x, r.y = i.y, t.children(n).length && (r.width = i.width, r.height = i.height));
		}), n.forEach(e.edges(), function(r) {
			var i = e.edge(r), a = t.edge(r);
			i.points = a.points, n.has(a, "x") && (i.x = a.x, i.y = a.y);
		}), e.graph().width = t.graph().width, e.graph().height = t.graph().height;
	}
	var y = [
		"nodesep",
		"edgesep",
		"ranksep",
		"marginx",
		"marginy"
	], b = {
		ranksep: 50,
		edgesep: 20,
		nodesep: 50,
		rankdir: "tb"
	}, x = [
		"acyclicer",
		"ranker",
		"rankdir",
		"align"
	], S = ["width", "height"], C = {
		width: 0,
		height: 0
	}, w = [
		"minlen",
		"weight",
		"width",
		"height",
		"labeloffset"
	], T = {
		minlen: 1,
		weight: 1,
		width: 0,
		height: 0,
		labeloffset: 10,
		labelpos: "r"
	}, E = ["labelpos"];
	function D(e) {
		var t = new h({
			multigraph: !0,
			compound: !0
		}), r = R(e.graph());
		return t.setGraph(n.merge({}, b, L(r, y), n.pick(r, x))), n.forEach(e.nodes(), function(r) {
			var i = R(e.node(r));
			t.setNode(r, n.defaults(L(i, S), C)), t.setParent(r, e.parent(r));
		}), n.forEach(e.edges(), function(r) {
			var i = R(e.edge(r));
			t.setEdge(r, n.merge({}, T, L(i, w), n.pick(i, E)));
		}), t;
	}
	function O(e) {
		var t = e.graph();
		t.ranksep /= 2, n.forEach(e.edges(), function(n) {
			var r = e.edge(n);
			r.minlen *= 2, r.labelpos.toLowerCase() !== "c" && (t.rankdir === "TB" || t.rankdir === "BT" ? r.width += r.labeloffset : r.height += r.labeloffset);
		});
	}
	function k(e) {
		n.forEach(e.edges(), function(t) {
			var n = e.edge(t);
			if (n.width && n.height) {
				var r = e.node(t.v), i = {
					rank: (e.node(t.w).rank - r.rank) / 2 + r.rank,
					e: t
				};
				m.addDummyNode(e, "edge-proxy", i, "_ep");
			}
		});
	}
	function A(e) {
		var t = 0;
		n.forEach(e.nodes(), function(r) {
			var i = e.node(r);
			i.borderTop && (i.minRank = e.node(i.borderTop).rank, i.maxRank = e.node(i.borderBottom).rank, t = n.max(t, i.maxRank));
		}), e.graph().maxRank = t;
	}
	function j(e) {
		n.forEach(e.nodes(), function(t) {
			var n = e.node(t);
			n.dummy === "edge-proxy" && (e.edge(n.e).labelRank = n.rank, e.removeNode(t));
		});
	}
	function M(e) {
		var t = Infinity, r = 0, i = Infinity, a = 0, o = e.graph(), s = o.marginx || 0, c = o.marginy || 0;
		function l(e) {
			var n = e.x, o = e.y, s = e.width, c = e.height;
			t = Math.min(t, n - s / 2), r = Math.max(r, n + s / 2), i = Math.min(i, o - c / 2), a = Math.max(a, o + c / 2);
		}
		n.forEach(e.nodes(), function(t) {
			l(e.node(t));
		}), n.forEach(e.edges(), function(t) {
			var r = e.edge(t);
			n.has(r, "x") && l(r);
		}), t -= s, i -= c, n.forEach(e.nodes(), function(n) {
			var r = e.node(n);
			r.x -= t, r.y -= i;
		}), n.forEach(e.edges(), function(r) {
			var a = e.edge(r);
			n.forEach(a.points, function(e) {
				e.x -= t, e.y -= i;
			}), n.has(a, "x") && (a.x -= t), n.has(a, "y") && (a.y -= i);
		}), o.width = r - t + s, o.height = a - i + c;
	}
	function ee(e) {
		n.forEach(e.edges(), function(t) {
			var n = e.edge(t), r = e.node(t.v), i = e.node(t.w), a, o;
			n.points ? (a = n.points[0], o = n.points[n.points.length - 1]) : (n.points = [], a = i, o = r), n.points.unshift(m.intersectRect(r, a)), n.points.push(m.intersectRect(i, o));
		});
	}
	function te(e) {
		n.forEach(e.edges(), function(t) {
			var r = e.edge(t);
			if (n.has(r, "x")) switch ((r.labelpos === "l" || r.labelpos === "r") && (r.width -= r.labeloffset), r.labelpos) {
				case "l":
					r.x -= r.width / 2 + r.labeloffset;
					break;
				case "r":
					r.x += r.width / 2 + r.labeloffset;
					break;
			}
		});
	}
	function N(e) {
		n.forEach(e.edges(), function(t) {
			var n = e.edge(t);
			n.reversed && n.points.reverse();
		});
	}
	function P(e) {
		n.forEach(e.nodes(), function(t) {
			if (e.children(t).length) {
				var r = e.node(t), i = e.node(r.borderTop), a = e.node(r.borderBottom), o = e.node(n.last(r.borderLeft)), s = e.node(n.last(r.borderRight));
				r.width = Math.abs(s.x - o.x), r.height = Math.abs(a.y - i.y), r.x = o.x + r.width / 2, r.y = i.y + r.height / 2;
			}
		}), n.forEach(e.nodes(), function(t) {
			e.node(t).dummy === "border" && e.removeNode(t);
		});
	}
	function ne(e) {
		n.forEach(e.edges(), function(t) {
			if (t.v === t.w) {
				var n = e.node(t.v);
				n.selfEdges ||= [], n.selfEdges.push({
					e: t,
					label: e.edge(t)
				}), e.removeEdge(t);
			}
		});
	}
	function F(e) {
		var t = m.buildLayerMatrix(e);
		n.forEach(t, function(t) {
			var r = 0;
			n.forEach(t, function(t, i) {
				var a = e.node(t);
				a.order = i + r, n.forEach(a.selfEdges, function(t) {
					m.addDummyNode(e, "selfedge", {
						width: t.label.width,
						height: t.label.height,
						rank: a.rank,
						order: i + ++r,
						e: t.e,
						label: t.label
					}, "_se");
				}), delete a.selfEdges;
			});
		});
	}
	function I(e) {
		n.forEach(e.nodes(), function(t) {
			var n = e.node(t);
			if (n.dummy === "selfedge") {
				var r = e.node(n.e.v), i = r.x + r.width / 2, a = r.y, o = n.x - i, s = r.height / 2;
				e.setEdge(n.e, n.label), e.removeNode(t), n.label.points = [
					{
						x: i + 2 * o / 3,
						y: a - s
					},
					{
						x: i + 5 * o / 6,
						y: a - s
					},
					{
						x: i + o,
						y: a
					},
					{
						x: i + 5 * o / 6,
						y: a + s
					},
					{
						x: i + 2 * o / 3,
						y: a + s
					}
				], n.label.x = n.x, n.label.y = n.y;
			}
		});
	}
	function L(e, t) {
		return n.mapValues(n.pick(e, t), Number);
	}
	function R(e) {
		var t = {};
		return n.forEach(e, function(e, n) {
			t[n.toLowerCase()] = e;
		}), t;
	}
})), Mi = /* @__PURE__ */ o(((e, t) => {
	var n = Z(), r = Q(), i = X().Graph;
	t.exports = { debugOrdering: a };
	/* istanbul ignore next */
	function a(e) {
		var t = r.buildLayerMatrix(e), a = new i({
			compound: !0,
			multigraph: !0
		}).setGraph({});
		return n.forEach(e.nodes(), function(t) {
			a.setNode(t, { label: t }), a.setParent(t, "layer" + e.node(t).rank);
		}), n.forEach(e.edges(), function(e) {
			a.setEdge(e.v, e.w, {}, e.name);
		}), n.forEach(t, function(e, t) {
			var r = "layer" + t;
			a.setNode(r, { rank: "same" }), n.reduce(e, function(e, t) {
				return a.setEdge(e, t, { style: "invis" }), t;
			});
		}), a;
	}
})), Ni = /* @__PURE__ */ o(((e, t) => {
	t.exports = "0.8.5";
})), Pi = /* @__PURE__ */ c((/* @__PURE__ */ o(((e, t) => {
	t.exports = {
		graphlib: X(),
		layout: ji(),
		debug: Mi(),
		util: {
			time: Q().time,
			notime: Q().notime
		},
		version: Ni()
	};
})))(), 1);
function Fi(e, t, n) {
	let r = e.toUpperCase(), i = /* @__PURE__ */ new Map();
	i.set(r, 0);
	let a = /* @__PURE__ */ new Map();
	for (let e of t.links) {
		let t = $(e.source), n = $(e.target);
		a.has(t) || a.set(t, []), a.has(n) || a.set(n, []), a.get(t).push(n), a.get(n).push(t);
	}
	let o = [r], s = 0;
	for (; o.length > 0;) {
		let e = o.shift(), t = i.get(e);
		if (n != null && t >= n) continue;
		let r = a.get(e) || [];
		for (let e of r) if (!i.has(e)) {
			let n = t + 1;
			i.set(e, n), n > s && (s = n), o.push(e);
		}
	}
	return {
		depths: i,
		maxDepth: s
	};
}
function Ii(e, t) {
	if (e === 0) return {
		bg: "hsl(210, 75%, 48%)",
		text: "#fff"
	};
	let n = t <= 1 ? 0 : (e - 1) / (t - 1);
	return {
		bg: `hsl(40, ${Math.round(60 - n * 25)}%, ${Math.round(52 - n * 8)}%)`,
		text: "#fff"
	};
}
function $(e) {
	return e.toUpperCase().split(".").pop();
}
//#endregion
//#region src/quick-erd/rappid-renderer.js
var Li = class {
	constructor(e, t) {
		this.container = e, this.diagram = t, this.entityMap = /* @__PURE__ */ new Map(), joint.anchors.columnAnchor = function(e, t, n) {
			let r, { model: i } = e, a = e.getNodeUnrotatedBBox(t), o = i.getBBox().center(), s = i.angle(), c = n;
			if (n instanceof Element) {
				let e = this.paper.findView(n);
				c = e ? e.getNodeBBox(n).center() : new joint.g.Point();
			}
			return c.rotate(o, s), r = c.x <= a.x + a.width ? a.leftMiddle() : a.rightMiddle(), r.rotate(o, -s);
		}, this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes }), this.paper = new joint.dia.Paper({
			width: 100,
			height: 100,
			gridSize: 1,
			model: this.graph,
			highlighting: !1,
			sorting: joint.dia.Paper.sorting.APPROX,
			cellViewNamespace: joint.shapes,
			defaultRouter: { name: "metro" },
			defaultAnchor: { name: "columnAnchor" },
			defaultConnector: { name: "rounded" },
			linkPinning: !1,
			interactive: {
				vertexAdd: !1,
				linkMove: !1,
				elementMove: !0
			}
		}), this.paperScroller = new joint.ui.PaperScroller({
			autoResizePaper: !0,
			padding: 50,
			paper: this.paper
		}), this.paper.on("blank:pointerdown", (e, t, n) => {
			this.paperScroller.setCursor("grabbing"), this.paperScroller.startPanning(e, t, n);
		}), this.paper.on("blank:pointerup", () => {
			this.paperScroller.setCursor("default");
		});
		let n = (e, t, n, r, i) => {
			t.preventDefault(), this.paperScroller.zoom(i === -1 ? -.2 : .2, {
				min: .1,
				max: 3
			});
		};
		this.paper.on("cell:mousewheel", n), this.paper.on("blank:mousewheel", (e, t, r, i) => {
			n(null, e, t, r, i);
		}), this.paper.on("element:pointerclick", (e) => {
			let t = e.model.attr("headerLabel/text");
			t && this.diagram.onTableClick($(t));
		}), this.paper.on("blank:pointerclick", () => {
			this.diagram.highlightedTable && this.diagram.onTableClick(this.diagram.highlightedTable);
		}), this.keyboard && this.keyboard.disable(), this.keyboard = new joint.ui.Keyboard(), this.wrapper = document.createElement("div"), this.wrapper.className = "qs-erd-rappid-wrapper";
		let r = this.paperScroller.render().el;
		r.style.width = "100%", r.style.height = "100%", this.wrapper.appendChild(r), this.container.appendChild(this.wrapper);
	}
	async render(e) {
		if (e.items?.length) {
			this.graph.clear(), this.entityMap.clear();
			try {
				let t = [], n = /* @__PURE__ */ new Map();
				for (let r of e.items) {
					let e = r.name.toUpperCase(), i = r.schema;
					i &&= i.toUpperCase();
					let a = (r.columns || []).map((e) => ({
						name: e.name.toUpperCase(),
						datatype: e.datatype.replace("(", " (").toUpperCase()
					})), o = d.calcWidth(i, e, a), s = i ? `${i}.${e}` : e, c = new (r.type === "view" ? joint.shapes.quicksql.View : joint.shapes.quicksql.Table)({
						id: d.newGuid(),
						size: { width: o }
					});
					c.setName(s), c.setColumns(a), n.set(s, c.id), this.entityMap.set($(r.name), c), t.push(c);
				}
				for (let r of e.links) {
					let e = n.get(r.source.toUpperCase()), i = n.get(r.target.toUpperCase());
					if (e && i) {
						let n = new joint.shapes.quicksql.Relation({
							source: {
								id: e,
								port: r.source_id.toUpperCase()
							},
							target: {
								id: i,
								port: r.target_id.toUpperCase()
							},
							style: "solid"
						});
						t.push(n);
					}
				}
				this.graph.resetCells(t), this._dagreLayout(), this.graph.getLinks().forEach((e) => e.toBack()), setTimeout(() => {
					this.paperScroller.adjustPaper(), this.paperScroller.zoom(1, { absolute: !0 }), this.paperScroller.centerContent();
				}, 100);
			} catch (e) {
				console.error("RappidRenderer render error:", e), this.container.innerHTML = `<pre class="qs-erd-error">Diagram render error: ${e.message}</pre>`;
			}
		}
	}
	_dagreLayout() {
		let e = new Pi.default.graphlib.Graph();
		e.setGraph({
			rankdir: "TB",
			nodesep: 120,
			edgesep: 100,
			ranksep: 100
		}), e.setDefaultEdgeLabel(() => ({}));
		for (let t of this.graph.getElements()) {
			let n = t.size();
			e.setNode(t.id, {
				width: n.width,
				height: n.height
			});
		}
		for (let t of this.graph.getLinks()) e.setEdge(t.source().id, t.target().id);
		Pi.default.layout(e);
		for (let t of this.graph.getElements()) {
			let n = e.node(t.id);
			t.position(n.x - n.width / 2, n.y - n.height / 2);
		}
	}
	applyHighlight(e) {
		let { depths: t, maxDepth: n } = e;
		for (let e of this.graph.getElements()) {
			let r = $(e.attr("headerLabel/text") || "");
			if (t.has(r)) {
				let { bg: i, text: a } = Ii(t.get(r), n);
				e.attr("body/fill", i), e.attr("body/stroke", i), e.attr("headerLabel/fill", a), e.attr("itemLabels/fill", a), e.attr("itemLabels_1/fill", a), e.attr("root/opacity", 1);
			} else e.attr("root/opacity", .15);
		}
		for (let e of this.graph.getLinks()) e.attr("./opacity", .1);
	}
	focusEntity(e) {
		if (!e) {
			this.clearHighlight();
			return;
		}
		let t = e.toUpperCase(), n = null;
		for (let e of this.graph.getElements()) $(e.attr("headerLabel/text") || "") === t ? (e.attr("body/fill", "hsl(210, 75%, 48%)"), e.attr("body/stroke", "hsl(210, 75%, 48%)"), e.attr("headerLabel/fill", "#fff"), e.attr("itemLabels/fill", "#fff"), e.attr("itemLabels_1/fill", "#fff"), e.attr("root/opacity", 1), n = e) : e.attr("root/opacity", .15);
		for (let e of this.graph.getLinks()) e.attr("./opacity", .1);
		n && this.paperScroller && this.paperScroller.scrollToElement(n, { animation: !0 });
	}
	clearHighlight() {
		for (let e of this.graph.getElements()) {
			let t = e.get("type") === "quicksql.View";
			e.attr("body/fill", t ? u.colors.VIEW_BACKGROUND : u.colors.TABLE_BACKGROUND), e.attr("body/stroke", t ? u.colors.VIEW_BORDER : u.colors.TABLE_BORDER), e.attr("headerLabel/fill", t ? u.colors.VIEW_NAME_TEXT : u.colors.TABLE_NAME_TEXT), e.attr("itemLabels/fill", t ? u.colors.VIEW_COLUMN_TEXT : u.colors.TABLE_COLUMN_TEXT), e.attr("itemLabels_1/fill", t ? u.colors.VIEW_DATA_TYPE_TEXT : u.colors.TABLE_DATA_TYPE_TEXT), e.attr("root/opacity", 1);
		}
		for (let e of this.graph.getLinks()) e.attr("./opacity", 1);
	}
	destroy() {
		this.keyboard &&= (this.keyboard.disable(), null), this.wrapper && this.wrapper.parentNode && this.wrapper.parentNode.removeChild(this.wrapper), this.graph.clear(), this.entityMap.clear(), this.paper = null, this.paperScroller = null, this.graph = null;
	}
};
//#endregion
//#region src/quick-erd/toolbar.js
function Ri(e) {
	let t = document.createElement("div");
	t.className = "qs-erd-toolbar";
	let n = document.createElement("input");
	n.type = "text", n.className = "qs-erd-search", n.placeholder = "Search tables...";
	let r = [], i = -1;
	n.addEventListener("input", () => {
		let t = n.value.trim().toUpperCase();
		if (!t) {
			r = [], i = -1, e.searchTable(null);
			return;
		}
		r = e.getFilteredData().items.filter((e) => e.name.toUpperCase().includes(t) || e.columns && e.columns.some((e) => e.name.toUpperCase().includes(t))).map((e) => e.name.toUpperCase()), r.length > 0 ? (i = 0, e.searchTable(r[0])) : (i = -1, e.searchTable(null));
	}), n.addEventListener("keydown", (t) => {
		t.key === "Enter" && r.length > 0 && (t.preventDefault(), i = (i + 1) % r.length, e.searchTable(r[i])), t.key === "Escape" && (n.value = "", n.dispatchEvent(new Event("input")), n.blur());
	}), t.appendChild(n), document.addEventListener("keydown", (e) => {
		(e.metaKey || e.ctrlKey) && e.key === "f" && (e.preventDefault(), n.focus(), n.select());
	});
	let a = Object.keys(e.groups || {}), o = null;
	if (a.length > 0) {
		o = document.createElement("div"), o.className = "qs-erd-chip-container";
		let n = zi("All", !0);
		n.addEventListener("click", () => {
			Vi(o), e.setActiveGroups(null);
		}), o.appendChild(n);
		for (let t of a) {
			let n = zi(t, !1);
			n.addEventListener("click", () => {
				Bi(n, o, e);
			}), o.appendChild(n);
		}
		t.appendChild(o);
	}
	return { el: t };
}
function zi(e, t) {
	let n = document.createElement("button");
	return n.className = "qs-erd-chip" + (t ? " active" : ""), n.textContent = e, n.dataset.group = e, n;
}
function Bi(e, t, n) {
	let r = t.querySelector("[data-group=\"All\"]");
	e.classList.toggle("active"), r.classList.remove("active");
	let i = [];
	t.querySelectorAll(".qs-erd-chip.active").forEach((e) => {
		e.dataset.group !== "All" && i.push(e.dataset.group);
	}), i.length === 0 ? (r.classList.add("active"), n.setActiveGroups(null)) : n.setActiveGroups(i);
}
function Vi(e) {
	e.querySelectorAll(".qs-erd-chip").forEach((e) => {
		e.classList.remove("active");
	}), e.querySelector("[data-group=\"All\"]").classList.add("active");
}
//#endregion
//#region src/quick-erd/diagram-preview.js
var Hi = class {
	constructor(e, t = "#quickERD") {
		if (!t || !(typeof t == "string" && (this.element = document.querySelector(t))) && !(typeof t == "object" && (this.element = t) && typeof this.element.append == "function")) throw Error("Invalid element or selector provided");
		this.data = e, this.groups = e.groups || {}, this.activeGroups = null, this.highlightedTable = null, this._setupContainer(), this.toolbar = Ri(this), this.toolbarEl.appendChild(this.toolbar.el), this.rendererType = "rappid", this.renderer = this._createRenderer(this.rendererType), this.refresh();
	}
	_setupContainer() {
		this.element.innerHTML = "", this.toolbarEl = document.createElement("div"), this.toolbarEl.className = "qs-erd-toolbar-container", this.element.appendChild(this.toolbarEl), this.canvasEl = document.createElement("div"), this.canvasEl.className = "qs-erd-canvas", this.element.appendChild(this.canvasEl);
	}
	getFilteredData() {
		if (!this.activeGroups?.length) return this.data;
		let e = /* @__PURE__ */ new Set();
		for (let t of this.activeGroups) (this.groups[t] || []).forEach((t) => e.add(t.toUpperCase()));
		let t = this.data.items.filter((t) => e.has(t.name.toUpperCase())), n = new Set(t.map((e) => $(e.name)));
		return {
			items: t,
			links: this.data.links.filter((e) => {
				let t = $(e.source), r = $(e.target);
				return n.has(t) && n.has(r);
			}),
			groups: this.groups
		};
	}
	setActiveGroups(e) {
		this.activeGroups = e, this.highlightedTable = null, this.refresh();
	}
	async refresh() {
		await this.renderer.render(this.getFilteredData()), this.highlightedTable && this._applyHighlight(this.highlightedTable);
	}
	onTableClick(e) {
		this.highlightedTable === e ? (this.highlightedTable = null, this.renderer.clearHighlight()) : (this.highlightedTable = e, this._applyHighlight(e));
	}
	highlightTable(e) {
		e ? (this.highlightedTable = e, this._applyHighlight(e)) : (this.highlightedTable = null, this.renderer.clearHighlight());
	}
	searchTable(e) {
		e ? (this.highlightedTable = e, this.renderer.focusEntity(e)) : (this.highlightedTable = null, this.renderer.clearHighlight());
	}
	_applyHighlight(e) {
		let t = Fi(e, this.getFilteredData(), 1);
		this.renderer.applyHighlight(t);
	}
	updateData(e) {
		let t = e.groups || {}, n = JSON.stringify(t) !== JSON.stringify(this.groups);
		this.data = e, this.groups = t, this.highlightedTable = null, n && (this.activeGroups = null, this.toolbarEl.innerHTML = "", this.toolbar = Ri(this), this.toolbarEl.appendChild(this.toolbar.el)), this.refresh();
	}
	switchRenderer(e) {
		e !== this.rendererType && (this.highlightedTable = null, this.renderer.destroy(), this.rendererType = e, this.renderer = this._createRenderer(e), this.refresh());
	}
	_createRenderer(e) {
		if (e === "rappid" && typeof joint < "u") return new Li(this.canvasEl, this);
		throw Error("Rappid library (joint.js) is required for ERD rendering");
	}
}, Ui = class {
	constructor(e, t = "#quickERD") {
		if (!t || !(typeof t == "string" && (this.element = document.querySelector(t))) && !(typeof t == "object" && (this.element = t) && typeof this.element.append == "function")) throw Error("Invalid element or selector provided");
		joint.anchors.columnAnchor = function(e, t, n) {
			let r, { model: i } = e, a = e.getNodeUnrotatedBBox(t), o = i.getBBox().center(), s = i.angle(), c = n;
			if (n instanceof Element) {
				let e = this.paper.findView(n);
				c = e ? e.getNodeBBox(n).center() : new joint.g.Point();
			}
			return c.rotate(o, s), r = c.x <= a.x + a.width ? a.leftMiddle() : a.rightMiddle(), r.rotate(o, -s);
		}, this.data = e, this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes }), this.paper = new joint.dia.Paper({
			width: 100,
			height: 100,
			gridSize: 1,
			model: this.graph,
			highlighting: !1,
			sorting: joint.dia.Paper.sorting.APPROX,
			cellViewNamespace: joint.shapes,
			defaultRouter: { name: "metro" },
			defaultAnchor: { name: "columnAnchor" },
			defaultConnector: { name: "rounded" },
			linkPinning: !1,
			interactive: {
				vertexAdd: !1,
				linkMove: !1,
				elementMove: !0
			}
		}), this.paperScroller = new joint.ui.PaperScroller({
			autoResizePaper: !0,
			padding: 50,
			paper: this.paper
		}), this.paper.on("blank:pointerdown", (e, t, n) => {
			this.paperScroller.setCursor("grabbing"), this.paperScroller.startPanning(e, t, n);
		}), this.paper.on("blank:pointerup", () => {
			this.paperScroller.setCursor("default");
		}), this.paper.on("cell:mousewheel", (e, t, n, r, i) => {
			this.onMouseWheel(t, n, r, i);
		}), this.paper.on("blank:mousewheel", (e, t, n, r) => {
			this.onMouseWheel(e, t, n, r);
		}), new joint.ui.Snaplines({ paper: this.paper }), this.keyboard && this.keyboard.disable(), this.keyboard = new joint.ui.Keyboard(), this.keyboard.on({
			"shift+alt+a": function(e) {
				this.actualSize(), e.preventDefault(), e.stopPropagation();
			},
			"shift+alt+c": function(e) {
				this.paperScroller.centerContent(), e.preventDefault(), e.stopPropagation();
			},
			"shift+alt+f": function(e) {
				this.fitScreen(), e.preventDefault(), e.stopPropagation();
			},
			"shift+alt+p": function(e) {
				this.printDiagram(), e.preventDefault(), e.stopPropagation();
			},
			"shift+alt+s": function(e) {
				this.exportAsSVG(), e.preventDefault(), e.stopPropagation();
			}
		}, this), this.element.append(this.paperScroller.render().el), this.updateDiagram();
	}
	async updateDiagram() {
		if (this.data.items?.length) {
			let e = [];
			this.buildDiagram(e, this.data), this.graph.resetCells(e), this.autoLayout(), setTimeout(() => {
				this.paperScroller.adjustPaper(), this.actualSize();
			}, 100);
		}
	}
	buildDiagram = (e, t) => {
		let n = /* @__PURE__ */ new Map();
		t.items.forEach((t) => {
			let r = t.name.toUpperCase(), i = t.schema;
			i &&= i.toUpperCase();
			let a = (t.columns || []).map((e) => ({
				name: e.name.toUpperCase(),
				datatype: e.datatype.replace("(", " (").toUpperCase()
			})), o = d.calcWidth(i, r, a, []), s;
			s = t.type && t.type === "view" ? this.addView(r, i, a, o) : this.addTable(r, i, a, o);
			let c = i ? `${i}.${r}` : r;
			n.set(c, s.id), e.push(s);
		}), t.links.forEach((t) => {
			let r = n.get(t.source.toUpperCase()), i = n.get(t.target.toUpperCase());
			r && i && e.push(this.addLink(r, i, t.source_id, t.target_id));
		});
	};
	addTable = (e, t, n, r) => {
		let i = e;
		t && (i = `${t}.${e}`);
		let a = new joint.shapes.quicksql.Table({
			id: d.newGuid(),
			size: { width: r }
		});
		return a.setName(i), a.setColumns(n), a;
	};
	addView = (e, t, n, r) => {
		let i = e;
		t && (i = `${t}.${e}`);
		let a = new joint.shapes.quicksql.View({
			id: d.newGuid(),
			size: { width: r }
		});
		return a.setName(i), a.setColumns(n), a;
	};
	addLink = (e, t, n, r) => new joint.shapes.quicksql.Relation({
		source: {
			id: e,
			port: n.toUpperCase()
		},
		target: {
			id: t,
			port: r.toUpperCase()
		},
		style: "solid"
	});
	printDiagram = () => {
		this.paper.print();
	};
	exportAsSVG = () => {
		let e = this.graph.getBBox().inflate(50);
		this.paper.toSVG((e) => {
			this.saveDiagram("QuickSqlDiagram-", e);
		}, {
			area: e,
			convertImagesToDataUris: !0,
			preserveDimensions: this.paper.getComputedSize()
		});
	};
	saveDiagram = (e, t) => {
		function n(e) {
			return e >= 100 ? n(e % 100) : (e < 10 ? "0" : "") + e;
		}
		var r = /* @__PURE__ */ new Date(), i = {
			type: "text/plain;charset=UTF-8",
			name: e + n(r.getFullYear()) + "-" + n(r.getMonth() + 1) + "-" + n(r.getDate()) + "_" + n(r.getHours() + 1) + "-" + n(r.getMinutes()) + ".svg"
		}, a = new Blob([t], { type: i.type }), o = window.URL.createObjectURL(a), s = document.createElement("a");
		document.body.appendChild(s), s.style = "display: none", s.href = o, s.download = i.name, setTimeout(() => {
			s.click(), window.URL.revokeObjectURL(o), s.remove();
		}, 0);
	};
	zoomIn = () => {
		this.paperScroller.zoom(.2, { max: 3 }), this.paperScroller.centerContent();
	};
	zoomOut = () => {
		this.paperScroller.zoom(-.2, { min: .1 }), this.paperScroller.centerContent();
	};
	fitScreen = () => {
		this.paperScroller.zoomToFit({
			padding: 10,
			scaleGrid: .2,
			minScale: .1,
			maxScale: 3
		}), this.paperScroller.centerContent();
	};
	actualSize = () => {
		this.paperScroller.zoom(1, { absolute: !0 }), this.paperScroller.centerContent();
	};
	onMouseWheel = (e, t, n, r) => {
		e.shiftKey && (e.preventDefault(), r === -1 ? this.paperScroller.zoom(-.2, { min: .1 }) : r === 1 && this.paperScroller.zoom(.2, { max: 3 }), this.paperScroller.centerContent());
	};
	autoLayout() {
		joint.layout.DirectedGraph.layout(this.graph, {
			nodeSep: 120,
			edgeSep: 100,
			rankSep: 100
		}), this.graph.getLinks().forEach((e) => {
			e.toBack();
		});
	}
}, Wi = "2.0.0", Gi = {
	Diagram: Ui,
	DiagramPreview: Hi,
	version: Wi
};
//#endregion
export { Ui as Diagram, Hi as DiagramPreview, Gi as default, Wi as version };
