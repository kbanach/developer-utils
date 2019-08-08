const fs = require('fs');
const path = require('path');

const semanticCommitHeaders = [
    "feat",     // new feature
    "fix",      // bug fix
    "refactor", // refactoring production code
    "style",    // formatting, missing semi colons, etc; no code change
    "docs",     // changes to documentation
    "test",     // adding or refactoring tests; no production code change
    "chore",    // updating grunt tasks etc; no production code change
];

const semanticHeadRegex = semanticCommitHeaders.map((header) => { return new RegExp(`^${header}:`, 'ig'); });

function printMsgsToStdOut(msg) {
    console.log('---------------------------------------------------');
    console.log(msg);
    console.log('\n---------------------------------------------------')
}

function cleanupDuplicates(msgLines) {
    const uniqLines = new Set();

    msgLines.forEach((oneLine) => {
        uniqLines.add(oneLine.trim());
    });

    return Array.from(uniqLines);
}

function getSemanticHeadFromLine(line) {
    return semanticHeadRegex.find((headRegex) => { return headRegex.test(line); });
}

function isLineSemantic(line) {
    return semanticHeadRegex.some((semanticHead) => {
        return semanticHead.test(line)
    });
}

function isCurrentLineDifferentFromPrev(currentLine, prevLine) {
    if (isLineSemantic(currentLine) && isLineSemantic(prevLine)) {
        if (getSemanticHeadFromLine(currentLine) === getSemanticHeadFromLine(prevLine)) {
            return false;
        }
        return true;
    }

    // compare first char
    return currentLine[0] !== prevLine[0];
}

function insertEmptyLinesBetweenDifferentLines(orderedMsgLines) {
    const indexesToInsertEmptyLines = [];

    orderedMsgLines.forEach((currentLine, idx, arr) => {
        // skip first line (we don't have anything to compare it to)
        if (idx === 0) {
            return;
        }

        // get previous line
        const prevLine = arr[idx - 1];


        if (isCurrentLineDifferentFromPrev(currentLine, prevLine)) {
            indexesToInsertEmptyLines.push(idx);
        }
    });

    // invert indexes (so we will add lines from the end, without need to change increment indexes to put empty lines)
    indexesToInsertEmptyLines.reverse();

    indexesToInsertEmptyLines.forEach((indexToPutEmptyLine) => {
        if (indexToPutEmptyLine > 1) {
            orderedMsgLines.splice(indexToPutEmptyLine, 0, '');
        }
    });

    return orderedMsgLines;
}

function handleCommitMsg(msgString, strict = false) {
    const msgLines = msgString.split('\n');

    let cleanupMsg = cleanupDuplicates(msgLines);

    if (strict) {
        cleanupMsg = cleanupMsg.filter(isLineSemantic);
    }

    const orderedMsgLines = cleanupMsg.sort();
    const separatedMsgLines = insertEmptyLinesBetweenDifferentLines(orderedMsgLines);

    return separatedMsgLines.join('\n');
}

function argsContainsAnyOfKeys(args, ...keys) {
    return keys.some((key) => {
        return args.includes(key);
    });
}

function getArgValue(args, ...keys) {
    const idx = args.findIndex((arg) => {
        return keys.includes(arg);
    });

    return args[idx + 1];
}

function runFromCommandLine() {
    const DEFAULT_MSG_FILENAME = 'commitsSource.txt';

    const [ nodeCmd, scriptName, ...args ] = process.argv;

    const SCRIPT_FILENAME =  path.basename(scriptName);
    let COMMIT_MSG_FILENAME = DEFAULT_MSG_FILENAME;

    let STRICT_FILTERING = false;

    if (argsContainsAnyOfKeys(args, '-s', '--strict')) {
        STRICT_FILTERING = true;
    }

    if (argsContainsAnyOfKeys(args, '-i', '--input')) {
        const argValue = getArgValue(args, '-i', '--input');

        if (argValue && argValue[0] !== '-') {
            COMMIT_MSG_FILENAME = argValue;
        } else {
            console.log('Please give proper filename. For more info check help (run script with --help parameter)');
            process.exit(1);
        }
    }

    if (argsContainsAnyOfKeys(args, '-h', '--help')) {
        let helpMsg = '';

        helpMsg += `Usage:\t\tnode ${SCRIPT_FILENAME} [OPTIONS]\n`;
        helpMsg += '\n';
        helpMsg += `Small util to cleanup commit messages and print them out in stdout. \n`;
        helpMsg += `Every line will compared to others, duplicates will be deleted and everything that left will be ordered alphabeticaly.\n`;
        helpMsg += `Additionaly if first char of line is different than first char of previous line, there will be an empty space added between them.\n`;
        helpMsg += '\n';
        helpMsg += `Optional arguments:\n`;
        helpMsg += `  -i,\t --input\tpath to plain text file with listed raw commit messages, relative to script file (default: ${DEFAULT_MSG_FILENAME})\n`;
        helpMsg += `  -s,\t --strict\tremoves commit lines that does not start with: ${semanticCommitHeaders.join(', ')}\n`;

        console.log(helpMsg);
        process.exit(0);
    }

    console.log(`\nLOOKING FOR FILE: ${COMMIT_MSG_FILENAME}\n(can be changed by passing as first parameter)\n\n`);

    fs.readFile(COMMIT_MSG_FILENAME, 'utf8', (err, fd) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.error(`$${COMMIT_MSG_FILENAME} does not exist`);
                return;
            }

            throw err;
        }

        const cleanedCommitMsg = handleCommitMsg(fd, STRICT_FILTERING);
        printMsgsToStdOut(cleanedCommitMsg);
    });

}

if (require.main === module) {
    runFromCommandLine();
} else {
    // if is loaded by require('./index')
    module.exports = handleCommitMsg;
}
