const path = require('path');
const util = require('util');
const Module = require('module');

const SCRIPTNAME = path.basename(process.argv[1]);

let dependencies;
let  fileToLookup;
Module.prototype.require = function (requirePath) {
    if (this.filename.includes(fileToLookup) && !this.filename.includes('node_modules') && /^\./.test(requirePath)) {

        // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        // console.log('Call require with args: ');
        // console.log('- this.filename: ', util.inspect(this.filename, null, 5));
        // console.log('- arguments: ', util.inspect(arguments, null, 5));
        // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

        const currentDir = path.dirname(this.filename);
        dependencies.set(arguments[0], path.resolve(currentDir, arguments[0]));
    }

    return Module._load(requirePath, this);
};


if (process.argv[2]) {
    dependencies = new Map();
    fileToLookup = require.resolve(process.argv[2])

    require(fileToLookup);
    console.log(`Suggesting stubs for ${fileToLookup}:`);

    dependencies.forEach(function(value, key) {
        console.log('- key: ', key, '\n- value: ', value, '\n\n');
    });

    console.log('\n\nHope it helps!');
} else {
    console.log(`\nUsage:\t${SCRIPTNAME} file\n\n\tfile - an *.js file which non-native (ones with relative paths) ` +
        `requires should be listed\n\n`);

    console.log(`To use the script as second parameter please provide the file ` +
        `which should be looked up for dependencies.`);

    console.log(`\n\n\tExample: ${SCRIPTNAME} ./server/components/router.js\n\n`);

}
