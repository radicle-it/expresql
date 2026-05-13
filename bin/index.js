#! /usr/bin/env node
import  {expresql,fromJSON} from "../src/ddl.js";

import fs from "fs";

try {
    let file = null;

    let args = process.argv.slice(2);
    if( args.length < 1 ) {
      console.error('Please enter input filename (.esql, or .json)');
      process.exit(1);
    }

    file = args[0];

    const text = fs.readFileSync(file)
    let input = text.toString();

    let output = null;
    if( file.endsWith('.json') ) {
        let key = file.substring(0,file.length-'.json'.length);
        const sp = file.lastIndexOf('/');
        if( 0 < sp )
            key = key.substring(sp+1);
        output = fromJSON(input, key);
    } else {
        output = new expresql(input).getDDL();
    }
    console.log(output);
    process.exit(0);

} catch(e) {
    console.error(e);
    process.exit(1);
};
