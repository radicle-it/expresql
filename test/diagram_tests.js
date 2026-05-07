import  {quicksql, toERD} from "../src/ddl.js";
import { computeHighlightTree, highlightColor, normalizeTableName } from "../src/quick-erd/highlight.js";

import fs from "fs";


function assert( condition ) {
    if( !eval(condition) ) {
        console.error("Failed: "+condition);
        throw new Error('Test failed');
    }
}

var output;
var output1;
var input;
var data;
var tree;
var color0;
var colorMax;
var colorMid;
var colorSingle;
var dataWithSchema;


export default function diagram_tests() {

    const opt = `{"schema": "my_schema",
    "auditcols": "Y", "prefix": "prefix","prefixpkwithtname": "Y",
    "createdcol": "created",
    "createdbycol": "created_by",
    "updatedcol": "updated1",
    "updatedbycol": "updated_by","rowkey": "Y", "rowversion": "Y", "prefixpkwithtname": "Y"
    }`;
    input = `dept
    name
    emp
        name
    `
    output = JSON.stringify(toERD(input,opt), null, 4); // 1.1.5 compatibility

    assert( "0 < output.indexOf('prefix_dept')" );
    assert( "0 < output.indexOf('\"schema\": \"my_schema\",')" );
    assert( "0 < output.indexOf('\"name\": \"row_key\",')" );
    assert( "0 < output.indexOf('\"name\": \"row_version\",')" );
    assert( "0 < output.indexOf('\"name\": \"updated1\",')" );
    assert( "0 < output.indexOf('\"source\": \"my_schema.prefix_dept\",')" );
    assert( "0 < output.indexOf('\"target\": \"my_schema.prefix_emp\",')" );
    assert( "0 < output.indexOf('\"name\": \"prefix_dept\",')" );

    input =
`Bug35827754
    data file
    `
    output = new quicksql(input).getERD();

    assert( "output.items[0].columns[2].name == 'data_filename'" );
    assert( "output.items[0].columns[2].datatype == 'varchar2(255 char)'" );
    assert( "output.items[0].columns[5].name == 'data_lastupd'" );
    assert( "output.items[0].columns[5].datatype == 'date'" );

    input =
    `customers
    name vc40
    customer_addresses /cascade
        street vc40`
    output = new quicksql(input).getERD();

    input =
    `customers
    name vc40

customer_addresses /cascade
    customer_id /fk customers
    street vc40`
    output1 = new quicksql(input).getERD();

    //console.log(output.items[1].columns[1]);
    assert( "output.items[1].columns[1].name == output1.items[1].columns[1].name" );
    assert( "output.items[1].columns[1].datatype == output1.items[1].columns[1].datatype" );

    // === TGROUP annotation tests ===

    // getERD() returns groups property
    input =
`departments {TGROUP "HR"}
    name
employees {TGROUP "HR"}
    departments_id /fk departments
    name
projects {TGROUP "PM"}
    name
tasks {TGROUP "PM"}
    projects_id /fk projects
    name`
    output = new quicksql(input).getERD();

    assert( "output.groups != null" );
    assert( "typeof output.groups === 'object'" );
    assert( "output.groups['HR'] != null" );
    assert( "output.groups['PM'] != null" );
    assert( "output.groups['HR'].length === 2" );
    assert( "output.groups['PM'].length === 2" );

    // Group table names use same format as items[].name
    assert( "output.groups['HR'].indexOf(output.items[0].name) >= 0" );
    assert( "output.groups['HR'].indexOf(output.items[1].name) >= 0" );
    assert( "output.groups['PM'].indexOf(output.items[2].name) >= 0" );
    assert( "output.groups['PM'].indexOf(output.items[3].name) >= 0" );

    // Empty groups when no TGROUP annotations
    input =
`orders
    name
order_items
    orders_id /fk orders
    quantity num`
    output = new quicksql(input).getERD();

    assert( "output.groups != null" );
    assert( "Object.keys(output.groups).length === 0" );

    // Groups with prefix setting
    input =
`departments {TGROUP "Core"}
    name
# settings = { "prefix": "app" }`
    output = new quicksql(input).getERD();

    assert( "output.groups['Core'] != null" );
    assert( "output.groups['Core'].length === 1" );
    assert( "output.groups['Core'][0] === output.items[0].name" );

    // === computeHighlightTree tests ===

    data = {
        items: [
            { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }
        ],
        links: [
            { source: 'A', target: 'B', source_id: 'id', target_id: 'a_id' },
            { source: 'A', target: 'C', source_id: 'id', target_id: 'a_id' },
            { source: 'B', target: 'D', source_id: 'id', target_id: 'b_id' }
        ]
    };

    tree = computeHighlightTree('A', data);
    assert( "tree.depths.get('A') === 0" );
    assert( "tree.depths.get('B') === 1" );
    assert( "tree.depths.get('C') === 1" );
    assert( "tree.depths.get('D') === 2" );
    assert( "tree.maxDepth === 2" );

    // Starting from B: only B and D
    tree = computeHighlightTree('B', data);
    assert( "tree.depths.get('B') === 0" );
    assert( "tree.depths.get('D') === 1" );
    assert( "!tree.depths.has('A')" );
    assert( "!tree.depths.has('C')" );
    assert( "tree.maxDepth === 1" );

    // Starting from D: leaf node, no children
    tree = computeHighlightTree('D', data);
    assert( "tree.depths.get('D') === 0" );
    assert( "tree.depths.size === 1" );
    assert( "tree.maxDepth === 0" );

    // Handles schema prefix via normalizeTableName
    dataWithSchema = {
        items: [{ name: 'SCHEMA.PARENT' }, { name: 'SCHEMA.CHILD' }],
        links: [{ source: 'SCHEMA.PARENT', target: 'SCHEMA.CHILD', source_id: 'id', target_id: 'parent_id' }]
    };
    tree = computeHighlightTree('PARENT', dataWithSchema);
    assert( "tree.depths.get('PARENT') === 0" );
    assert( "tree.depths.get('CHILD') === 1" );

    // === highlightColor tests ===

    color0 = highlightColor(0, 3);
    assert( "color0 === 'hsl(210, 90%, 50%)'" );

    colorMax = highlightColor(3, 3);
    assert( "colorMax === 'hsl(210, 20%, 85%)'" );

    // Mid-range produces valid HSL
    colorMid = highlightColor(1, 2);
    assert( "colorMid.startsWith('hsl(210,')" );

    // Single node (maxDepth 0) returns depth-0 color
    colorSingle = highlightColor(0, 0);
    assert( "colorSingle === 'hsl(210, 90%, 50%)'" );

    // === normalizeTableName tests ===

    assert( "normalizeTableName('schema.table') === 'TABLE'" );
    assert( "normalizeTableName('TABLE') === 'TABLE'" );
    assert( "normalizeTableName('my_schema.my_table') === 'MY_TABLE'" );

    console.log('  diagram_tests passed');
}


diagram_tests();