// tslint:disable

// We need to provide path to TypeScript types definitions
/// <reference path="../node_modules/@types/jasmine/index.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />

import { Session, Observe } from '../src/api/session';
import { IGrabbedElement } from '../src/interfaces/index';
import { createSampleFile, finish, performanceReport, setMeasurement } from './common';
import { getLogger } from '../src/util/logging';
import { readConfigurationFile } from './config';

const config = readConfigurationFile().get().tests.concat;

function ingore(id: string | number, done: () => void) {
    if (
        config.regular.execute_only.length > 0 &&
        config.regular.execute_only.indexOf(typeof id === 'number' ? id : parseInt(id, 10)) === -1
    ) {
        console.log(`"${config.regular.list[id]}" is ignored`);
        done();
        return true;
    } else {
        return false;
    }
}

describe('Concat', function () {
    it(config.regular.list[1], function (done) {
        const testName = config.regular.list[1];
        if (ingore(1, done)) {
            return;
        }
        console.log(`\nStarting: ${testName}`);
        const logger = getLogger(testName);
        Session.create()
            .then((session: Session) => {
                // Set provider into debug mode
                session.debug(true, testName);
                const stream = session.getStream();
                if (stream instanceof Error) {
                    finish(session, done, stream);
                    return;
                }
                const events = session.getEvents();
                if (events instanceof Error) {
                    finish(session, done, events);
                    return;
                }
                const tmpobj_a = createSampleFile(
                    100,
                    logger,
                    (i: number) => `file a: some line data: ${i}\n`,
                );
                const tmpobj_b = createSampleFile(
                    100,
                    logger,
                    (i: number) => `file b: some line data: ${i}\n`,
                );
                stream
                    .observe(Observe.DataSource.concat([tmpobj_a.name, tmpobj_b.name]).text())
                    .catch(finish.bind(null, session, done));
                let grabbing: boolean = false;
                events.StreamUpdated.subscribe((rows: number) => {
                    if (rows < 120 || grabbing) {
                        return;
                    }
                    grabbing = true;
                    stream
                        .grab(98, 4)
                        .then((result: IGrabbedElement[]) => {
                            logger.debug('result of grab was: ' + JSON.stringify(result));
                            expect(result.map((i) => i.content)).toEqual([
                                'file a: some line data: 98',
                                'file a: some line data: 99',
                                'file b: some line data: 0',
                                'file b: some line data: 1',
                            ]);
                            finish(session, done);
                        })
                        .catch((err: Error) => {
                            finish(
                                session,
                                done,
                                new Error(
                                    `Fail to grab data due error: ${
                                        err instanceof Error ? err.message : err
                                    }`,
                                ),
                            );
                        });
                });
            })
            .catch((err: Error) => {
                finish(
                    undefined,
                    done,
                    new Error(
                        `Fail to create session due error: ${
                            err instanceof Error ? err.message : err
                        }`,
                    ),
                );
            });
    });

    // it(config.regular.list[2], function (done) {
    //     const testName = config.regular.list[2];
    //     if (ingore(2, done)) {
    //         return;
    //     }
    //     console.log(`\nStarting: ${testName}`);
    //     const logger = getLogger(testName);
    //     Session.create()
    //         .then((session: Session) => {
    //             // Set provider into debug mode
    //             session.debug(true, testName);
    //             const stream = session.getStream();
    //             if (stream instanceof Error) {
    //                 finish(session, done, stream);
    //                 return;
    //             }
    //             const events = session.getEvents();
    //             if (events instanceof Error) {
    //                 finish(session, done, events);
    //                 return;
    //             }
    //             stream
    //                 .observe(
    //                     Observe.DataSource.file(config.regular.files['pcapng']).pcap({
    //                         dlt: {
    //                             filter_config: undefined,
    //                             fibex_file_paths: undefined,
    //                             with_storage_header: false,
    //                         },
    //                     }),
    //                 )
    //                 .catch(finish.bind(null, session, done));
    //             let grabbing: boolean = false;
    //             let received: number = 0;
    //             const timeout = setTimeout(() => {
    //                 finish(
    //                     session,
    //                     done,
    //                     new Error(
    //                         `Failed because timeout. Waited for at least 100 rows. Has been gotten: ${received}`,
    //                     ),
    //                 );
    //             }, 20000);
    //             events.StreamUpdated.subscribe((rows: number) => {
    //                 received = rows;
    //                 if (rows < 100 || grabbing) {
    //                     return;
    //                 }
    //                 clearTimeout(timeout);
    //                 grabbing = true;
    //                 stream
    //                     .grab(1, 10)
    //                     .then((result: IGrabbedElement[]) => {
    //                         expect(result.length).toEqual(10);
    //                         logger.debug('result of grab was: ' + JSON.stringify(result));
    //                         finish(session, done);
    //                     })
    //                     .catch((err: Error) => {
    //                         finish(
    //                             session,
    //                             done,
    //                             new Error(
    //                                 `Fail to grab data due error: ${
    //                                     err instanceof Error ? err.message : err
    //                                 }`,
    //                             ),
    //                         );
    //                     });
    //             });
    //         })
    //         .catch((err: Error) => {
    //             finish(
    //                 undefined,
    //                 done,
    //                 new Error(
    //                     `Fail to create session due error: ${
    //                         err instanceof Error ? err.message : err
    //                     }`,
    //                 ),
    //             );
    //         });
    // });

    // it(config.regular.list[3], function (done) {
    //     const testName = config.regular.list[3];
    //     if (ingore(3, done)) {
    //         return;
    //     }
    //     console.log(`\nStarting: ${testName}`);
    //     const logger = getLogger(testName);
    //     Session.create()
    //         .then((session: Session) => {
    //             // Set provider into debug mode
    //             session.debug(true, testName);
    //             const stream = session.getStream();
    //             if (stream instanceof Error) {
    //                 finish(session, done, stream);
    //                 return;
    //             }
    //             const events = session.getEvents();
    //             if (events instanceof Error) {
    //                 finish(session, done, events);
    //                 return;
    //             }
    //             stream
    //                 .observe(
    //                     Observe.DataSource.file(config.regular.files['dlt']).dlt({
    //                         filter_config: undefined,
    //                         fibex_file_paths: undefined,
    //                         with_storage_header: true,
    //                     }),
    //                 )
    //                 .catch(finish.bind(null, session, done));
    //             let grabbing: boolean = false;
    //             let received: number = 0;
    //             const timeout = setTimeout(() => {
    //                 finish(
    //                     session,
    //                     done,
    //                     new Error(
    //                         `Failed because timeout. Waited for at least 100 rows. Has been gotten: ${received}`,
    //                     ),
    //                 );
    //             }, 20000);
    //             events.StreamUpdated.subscribe((rows: number) => {
    //                 received = rows;
    //                 if (rows < 100 || grabbing) {
    //                     return;
    //                 }
    //                 clearTimeout(timeout);
    //                 grabbing = true;
    //                 stream
    //                     .grab(1, 10)
    //                     .then((result: IGrabbedElement[]) => {
    //                         expect(result.length).toEqual(10);
    //                         logger.debug('result of grab was: ' + JSON.stringify(result));
    //                         finish(session, done);
    //                     })
    //                     .catch((err: Error) => {
    //                         finish(
    //                             session,
    //                             done,
    //                             new Error(
    //                                 `Fail to grab data due error: ${
    //                                     err instanceof Error ? err.message : err
    //                                 }`,
    //                             ),
    //                         );
    //                     });
    //             });
    //         })
    //         .catch((err: Error) => {
    //             finish(
    //                 undefined,
    //                 done,
    //                 new Error(
    //                     `Fail to create session due error: ${
    //                         err instanceof Error ? err.message : err
    //                     }`,
    //                 ),
    //             );
    //         });
    // });
});
