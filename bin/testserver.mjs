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


async function main() {
    const chromeDriverPath = FS
        .readdirSync(CWD, { recursive: true })
        .filter(
            filePath => [
                'chromedriver',
                'chromedriver.exe'
            ].includes(Path.basename(filePath))
        )
        .pop();
    const cwd = Path.join(CWD, '..', 'highcharts_flutter_webwebview', 'example');
    const shell = process.platform === 'win32';

    let waitCounter = 100;

    console.log('Starting', chromeDriverPath);
    const chromeDriver = ChildProcess
        .execFile(chromeDriverPath, [
            '--port=4444',
        ], {
            shell,
        })
        .on('spawn', () => {
            chromeDriver.stdout.on('data', (data) => {
                const dataString = data.toString();

                process.stdout.write(dataString);

                if (dataString.includes('started successfully')) {
                    waitCounter = 0;
                }
            });
        });

    while (--waitCounter <= 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    let success = false;

    console.log('Starting', 'flutter', 'in', cwd);
    const flutterDrive = ChildProcess
        .execFile('flutter', [
            'drive',
            '-d',
            'chrome',
            '--driver=test_driver/integration_test.dart',
            '--target=integration_test/webview_flutter_test.dart',
        ], {
            cwd,
            shell,
            timeout: 120000,
        })
        .on('error', (err) => {
            console.error(err);
            flutterDrive.kill('SIGKILL');
        })
        .on('exit', () => {
            if (!chromeDriver.killed) {
                chromeDriver.kill('SIGKILL');
            }
            process.exit(success ? 0 : 1);
        })
        .on('spawn', () => {
            flutterDrive.stdout.on('data', (data) => {
                const dataString = data.toString();

                process.stdout.write(dataString);

                if (dataString.includes(': All tests passed!')) {
                    console.log('All tests successful!');
                    success = true;
                    flutterDrive.kill('SIGKILL');
                }
                if (dataString.includes('Some tests failed.')) {
                    console.error('Tests failed.');
                    flutterDrive.kill('SIGKILL');
                }
            });
        });
}


/* *
 *
 *  Runtime
 *
 * */


main();
