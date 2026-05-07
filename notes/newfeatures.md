# Quick SQL enhancements Batch 2

## Feature immutable

/immutable → create trigger on table

```sql
CREATE OR REPLACE TRIGGER trg_inspection_p_insertonly
BEFORE UPDATE OR DELETE ON inspection_p
BEGIN
RAISE_APPLICATION_ERROR(-20055, 'inspection_p is immutable (published)');
END;
/
```

## Support for SODA

You have a SODA table, make it so we can do /soda and it will create such a table.

## DEFAULT DATE

I want to add a default date e.g. sysdate, or current_date, or current_timestamp
I want to be able to specify it in a way that quicksql understands it as a default value, and not as a literal value to be inserted for all rows.
Maybe something like: created_at timestamp /default current_timestamp {LABEL 'Created at', DESCRIPTION 'Timestamp when the record was created'}

## TABLE GROUPS

Support for Table groups (GROUP in Annotation) - check if not a reserved word.
Also create the Insert statements in AI Enrichment of SQL Dev Extension in VS Code.
See tables: ANNOTATIONS_GROUPS$, ANNOTATIONS_GROUP_MEMBERS$, ANNOTATIONS_PREBUILT$, ANNOTATIONS_USAGE$

## VIEWS ENHANCEMENTS

view location_hierarchy location

Support for views with tenant and translation context.
Check if tenant table is there (or tenant_id column) and translate feature is being used on tables specified in the "view".
If so, make the view more advanced by adding tenant_id and language_code to the view, and joining with the tenant and language tables to get the corresponding data.
