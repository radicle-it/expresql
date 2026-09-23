//#region src/dbml/dbml-type-reverse.ts
function e(e, t) {
	let n = e.replace(/^"|"$/g, "").trim();
	switch (n.replace(/\(.*\)$/, "").trim().toLowerCase()) {
		case "varchar":
		case "varchar2":
		case "character varying":
		case "nvarchar": return t ? `vc${t}` : "vc";
		case "char":
		case "nchar": return t ? `vc${t}` : "vc4";
		case "int":
		case "integer":
		case "smallint":
		case "tinyint":
		case "bigint":
		case "int2":
		case "int4":
		case "int8": return "int";
		case "serial":
		case "bigserial":
		case "smallserial": return "int";
		case "decimal":
		case "numeric":
		case "number": return t ? `num(${t})` : "num";
		case "float":
		case "float4":
		case "float8":
		case "real":
		case "double":
		case "double precision": return "num";
		case "money": return "num(19,4)";
		case "date": return "date";
		case "timestamp":
		case "datetime": return "ts";
		case "timestamp with time zone":
		case "timestamptz": return "tswtz";
		case "timestamp with local time zone": return "tswltz";
		case "time":
		case "time with time zone":
		case "timetz": return "ts";
		case "boolean":
		case "bool":
		case "bit": return "bool";
		case "text":
		case "clob":
		case "longtext":
		case "mediumtext":
		case "tinytext":
		case "ntext": return "clob";
		case "blob":
		case "bytea":
		case "binary":
		case "varbinary":
		case "longblob":
		case "mediumblob": return "blob";
		case "json":
		case "jsonb": return "json";
		case "uuid": return "vc36";
		case "sdo_geometry":
		case "geometry":
		case "geography":
		case "point":
		case "polygon": return "geometry";
	}
	let r = n.match(/^vector\((\d+|\*),?([^,)]*),?([^)]*)\)$/i);
	if (r) {
		let e = r[1] === "*" ? "" : r[1];
		return e ? `vect${e}` : "vect";
	}
	return t ? `${n}(${t})` : n || "vc";
}
//#endregion
//#region src/dbml/importer.ts
var t = /* @__PURE__ */ new Set([
	"created",
	"created_at",
	"creation_date",
	"ins_date",
	"create_date",
	"created_date"
]), n = /* @__PURE__ */ new Set([
	"created_by",
	"ins_user",
	"created_user",
	"create_user"
]), r = /* @__PURE__ */ new Set([
	"updated",
	"updated_at",
	"last_update",
	"upd_date",
	"modify_date",
	"modified_at",
	"update_date",
	"last_modified"
]), i = /* @__PURE__ */ new Set([
	"updated_by",
	"upd_user",
	"updated_user",
	"modified_by",
	"update_user"
]), a = /* @__PURE__ */ new Set([
	"row_version",
	"version",
	"opt_lock",
	"lock_version",
	"row_ver"
]), o = /* @__PURE__ */ new Set(["row_key", "ords_key"]), s = /* @__PURE__ */ new Set([
	"valid_from",
	"valid_start",
	"date_from",
	"eff_date",
	"start_date"
]), c = /* @__PURE__ */ new Set([
	"valid_to",
	"valid_end",
	"date_to",
	"end_date",
	"exp_date"
]), l = /* @__PURE__ */ new Set([
	"is_current",
	"current_flag",
	"is_active"
]), u = class {
	constructor(e = {}) {
		this.tenantGlobal = !1, this.prefix = e.prefix ?? "", this.schemaOpt = e.schema ?? null, this.enumMap = /* @__PURE__ */ new Map();
	}
	convert(e) {
		let t = [];
		for (let n of e.schemas) {
			for (let e of n.enums) this.enumMap.set(e.name, e.values.map((e) => e.name));
			let r = this.prefix || this.detectPrefix(n.tables) || "";
			this.prefix = r;
			let i = this.buildFkEdges(n), a = this.buildHierarchy(n.tables, i), o = this.emitSettings(e, n);
			o && (t.push(o), t.push(""));
			for (let e of a) t.push(...this.emitNode(e, 0)), t.push("");
		}
		return t.join("\n").trimEnd();
	}
	emitSettings(e, t) {
		let n = [], r = (e.databaseType ?? "").toLowerCase();
		(r.includes("23") || r.includes("ai")) && n.push("db: \"23ai\"");
		let i = this.schemaOpt ?? (t.name === "public" ? null : t.name);
		i && n.push(`schema: ${i}`), this.prefix && n.push(`prefix: ${this.prefix}`);
		let a = this.detectPkMode(t.tables);
		return a !== "guid" && n.push(`pk: ${a}`), this.tenantGlobal && n.push("tenantid: yes"), n.length ? `# settings = { ${n.join(", ")} }` : "";
	}
	detectPkMode(e) {
		for (let t of e) {
			let e = t.fields.find((e) => e.pk);
			if (e) {
				if (e.increment) return "identity";
				if (/sys_guid/i.test(e.dbdefault?.value ?? "")) return "guid";
				if (/NEXTVAL/i.test(e.dbdefault?.value ?? "")) return "seq";
			}
		}
		return "guid";
	}
	detectPrefix(e) {
		if (e.length < 2) return null;
		let t = e.map((e) => e.name), n = t[0].split("_");
		for (let e = n.length - 1; e >= 1; e--) {
			let r = n.slice(0, e).join("_");
			if (t.every((e) => e.toLowerCase().startsWith(r.toLowerCase() + "_"))) return r;
		}
		return null;
	}
	buildFkEdges(e) {
		let t = [];
		for (let n of e.refs) {
			let [r, i] = n.endpoints, a, o;
			if (r.relation === "*") a = r, o = i;
			else if (i.relation === "*") a = i, o = r;
			else {
				if (r.relation === i.relation && r.relation === "*") continue;
				a = r, o = i;
			}
			let s = a.fieldNames[0] ?? "", c = o.tableName, l = o.fieldNames[0] ?? "", u = !!e.tables.find((e) => e.name === a.tableName)?.fields.find((e) => e.name === s)?.not_null, d = s === `${c}_id` || s.toLowerCase() === `${c.toLowerCase()}_id`;
			t.push({
				fromTable: a.tableName,
				fromCol: s,
				toTable: c,
				toCol: l,
				onDelete: n.onDelete,
				mandatory: u,
				isStandard: d
			});
		}
		return t;
	}
	buildHierarchy(e, t) {
		let n = /* @__PURE__ */ new Map();
		for (let e of t) e.isStandard && (n.has(e.fromTable) || n.set(e.fromTable, e.toTable));
		let r = e.filter((e) => !n.has(e.name)), i = (r) => ({
			table: r,
			children: e.filter((e) => n.get(e.name) === r.name).map(i),
			fks: t.filter((e) => e.fromTable === r.name && !(e.isStandard && n.get(r.name) === e.toTable))
		});
		return r.map(i);
	}
	collapseKnownColumns(e, u, d) {
		let f = [], p = !1, m = [
			e.some((e) => t.has(e.name.toLowerCase())),
			e.some((e) => n.has(e.name.toLowerCase())),
			e.some((e) => r.has(e.name.toLowerCase())),
			e.some((e) => i.has(e.name.toLowerCase()))
		].filter(Boolean).length >= 2, h = e.some((e) => s.has(e.name.toLowerCase())), g = e.some((e) => c.has(e.name.toLowerCase())), _ = e.some((e) => l.has(e.name.toLowerCase())), v = h && g && _, y = e.some((e) => a.has(e.name.toLowerCase())), b = e.some((e) => o.has(e.name.toLowerCase())), x = e.some((e) => e.name.toLowerCase() === "tenant_id"), S = u.some((e) => e.fromTable === d && e.fromCol.toLowerCase() === "tenant_id" && e.toTable.toLowerCase().includes("tenant"));
		p = x && S;
		let C = /* @__PURE__ */ new Set();
		if (m) for (let e of [
			t,
			n,
			r,
			i
		]) for (let t of e) C.add(t);
		if (v) for (let e of [
			s,
			c,
			l
		]) for (let t of e) C.add(t);
		if (y) for (let e of a) C.add(e);
		if (b) for (let e of o) C.add(e);
		p && C.add("tenant_id");
		let w = e.filter((e) => !C.has(e.name.toLowerCase()));
		return m && f.push("/auditcols"), y && f.push("/rowversion"), b && f.push("/rowkey"), v && f.push("/versioned"), {
			remainingFields: w,
			directives: f,
			tenantDetected: p
		};
	}
	emitNode(e, t, n) {
		let r = "  ".repeat(t), i = [], { table: a } = e, { remainingFields: o, directives: s, tenantDetected: c } = this.collapseKnownColumns(a.fields, e.fks, a.name);
		c && (this.tenantGlobal = !0);
		let l = `${r}${this.prefix ? a.name.replace(RegExp(`^${d(this.prefix)}_`, "i"), "") : a.name}`;
		a.note && (l += ` [${a.note}]`), i.push(l);
		for (let e of o) {
			let t = this.emitField(e, r + "  ", a, n);
			t !== null && i.push(t);
		}
		for (let e of a.indexes ?? []) {
			let t = this.emitIndex(e, r + "  ");
			t && i.push(t);
		}
		for (let e of s) i.push(`${r}  ${e}`);
		i.push(...this.emitTableMetaDirectives(a, r + "  "));
		for (let t of e.fks) {
			if (t.fromTable !== a.name || t.fromCol.toLowerCase() === "tenant_id" && c) continue;
			let e = this.prefix ? t.toTable.replace(RegExp(`^${d(this.prefix)}_`, "i"), "") : t.toTable, n = `${r}  ${t.fromCol} /fk ${e}`;
			t.mandatory && (n += " /nn"), t.onDelete === "cascade" && (n += " /cascade"), t.onDelete === "set null" && (n += " /setnull"), i.push(n);
		}
		for (let n of e.children) i.push(...this.emitNode(n, t + 1, a.name));
		return i;
	}
	emitField(e, t, n, r) {
		let i = `${n.name}_id`.toLowerCase();
		if (e.pk && e.name.toLowerCase() === i) return null;
		if (r) {
			let t = `${r}_id`.toLowerCase();
			if (e.name.toLowerCase() === t) return null;
		}
		let a = this.resolveType(e);
		if (a === null) return null;
		let o = [], { type: s, checkDirective: c } = a;
		if (e.pk && o.push("/pk"), e.increment, e.not_null && !e.pk && o.push("/nn"), e.unique && !e.pk && o.push("/unique"), e.dbdefault) {
			let t = e.dbdefault;
			t.type === "expression" ? /sys_guid/i.test(t.value) || o.push(`/default ${t.value}`) : t.type === "string" ? o.push(`/default '${t.value}'`) : o.push(`/default ${t.value}`);
		}
		c && o.push(c), e.metadata && (e.metadata.esql_case === "upper" && o.push("/upper"), e.metadata.esql_case === "lower" && o.push("/lower"));
		let l = "";
		e.note && (l = ` [${e.note}]`);
		let u = o.length ? " " + o.join(" ") : "", d = s ? ` ${s}` : "";
		return `${t}${e.name}${d}${u}${l}`;
	}
	resolveType(t) {
		let n = t.type.type_name ?? "", r = t.type.args ?? void 0, i = this.enumMap.get(n);
		return i ? {
			type: "",
			checkDirective: `/check ${i.join(",")}`
		} : { type: e(n, r) };
	}
	emitIndex(e, t) {
		if (!e.columns || e.columns.length === 0) return null;
		let n = e.columns.map((e) => e.value).join(",");
		if (e.columns.length === 1) {
			if (e.pk || e.unique) return null;
			if (!e.pk && !e.unique) return `${t}/idx ${n}`;
		}
		return e.pk ? `${t}/pk ${n}` : e.unique ? `${t}/unique ${n}` : `${t}/idx ${n}`;
	}
	emitTableMetaDirectives(e, t) {
		let n = [], r = e.metadata ?? {};
		return r.esql_auditcols === "yes" && n.push(`${t}/auditcols`), r.esql_rowversion === "yes" && n.push(`${t}/rowversion`), r.esql_rowkey === "yes" && n.push(`${t}/rowkey`), r.esql_versioned === "yes" && n.push(`${t}/versioned`), (r.esql_rest === "yes" || r.esql_ords === "yes") && n.push(`${t}/rest`), r.esql_audit === "yes" && n.push(`${t}/audit`), r.esql_auditlog === "yes" && n.push(`${t}/auditlog`), r.esql_immutable === "yes" && n.push(`${t}/immutable`), r.esql_soda === "yes" && n.push(`${t}/soda`), r.esql_compress === "yes" && n.push(`${t}/compress`), r.esql_flashback && n.push(`${t}/flashback`), r.esql_api && n.push(`${t}/api ${r.esql_api}`), r.esql_businesskey && n.push(`${t}/businesskey ${r.esql_businesskey}`), r.esql_lockmode && n.push(`${t}/lockmode ${r.esql_lockmode}`), r.esql_notenantid === "yes" && n.push(`${t}/notenantid`), r.esql_history === "yes" && n.push(`${t}/history`), r.esql_aggregate === "yes" && n.push(`${t}/aggregate`), n;
	}
};
function d(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//#endregion
export { u as DBMLImporter };
