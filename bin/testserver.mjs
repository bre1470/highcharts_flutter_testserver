#!/usr/bin/env node


/* *
 *
 *  Imports
 *
 * */


import * as ChildProcess from 'node:child_process';
import * as FS from 'node:fs';
import * as Path from 'node:path';


/* *
 *
 *  Constants
 *
 * */


const CWD = process.cwd();


/* *
 *
 *  Functions
 *
 * */


function main() {
    const chromeDriverPath = FS
        .readdirSync(CWD, { recursive: true })
        .filter(filePath => (
            filePath.endsWith('chromedriver') ||
            filePath.endsWith('chromedriver.exe')
        ))
        .pop();
    const shell = process.platform === 'win32';

    const chromeDriver = ChildProcess.execFile(chromeDriverPath, [
        '--port=4444',
    ], {
        shell,
    });

    chromeDriver.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });

    const flutterDrive = ChildProcess.execFile('flutter', [
        'drive',
        '-d',
        'chrome',
        '--driver=test_driver/integration_test.dart',
        '--target=integration_test/webview_flutter_test.dart',
    ], {
        cwd: Path.join(CWD, '..', 'highcharts_flutter_webwebview', 'example'),
        shell,
        timeout: 120000,
    });

    flutterDrive.on('exit', () => chromeDriver.kill('SIGKILL'));

    let internalKill = false;

    flutterDrive.on('error', () => {
        if (!chromeDriver.killed) {
            chromeDriver.kill('SIGKILL');
        }
        if (!internalKill) {
            process.exit(1);
        }
    });

    flutterDrive.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
        if (data.toString().includes(': All tests passed!')) {
            console.log('All tests successful!');
            internalKill = true;
            flutterDrive.kill();
        }
    });

}

/* *
 *
 *  Runtime
 *
 * */


main();
