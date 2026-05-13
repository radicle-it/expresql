import {expresql, toERD, toDDL} from '../../dist/expresql.js';

function assert( condition ) {
    if( !eval(condition) ) {
        console.error("Failed: "+condition);
        throw new Error('Test failed');
    }   
    console.log('.\r');  
}

let output;

export default function compatibility_tests() {

    let input = `dept
    name
    `
    output = JSON.stringify(toERD(input), null, 4); 
    assert( "0 < output.indexOf('dept')" );
    output = JSON.stringify(expresql.toERD(input), null, 4); 
    assert( "0 < output.indexOf('dept')" );

    output = toDDL(input); 
    assert( "0 < output.indexOf('dept')" );
    output = expresql.toDDL(input); 
    assert( "0 < output.indexOf('dept')" );

    // since 1.2.0
    let qsql = new expresql(input); // build parse tree once only
    output = qsql.getDDL(); 
    assert( "0 < output.indexOf('dept')" );
    output = JSON.stringify(qsql.getERD(), null, 4); 
    assert( "0 < output.indexOf('dept')" );

}

compatibility_tests();
