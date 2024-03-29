// tslint:disable

// We need to provide path to TypeScript types definitions
/// <reference path="../node_modules/@types/jasmine/index.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />

import { Session, Observe } from '../src/api/session';
import { IGrabbedElement } from '../src/interfaces/index';
import { createSampleFile, finish, performanceReport, setMeasurement } from './common';
import { getLogger } from '../src/util/logging';
import { readConfigurationFile } from './config';

const config = readConfigurationFile().get().tests.extract;

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

describe('Extracting', function () {
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
                const search = session.getSearch();
                if (search instanceof Error) {
                    return finish(session, done, search);
                }
                const events = session.getEvents();
                if (events instanceof Error) {
                    finish(session, done, events);
                    return;
                }
                let controlSum = 0;
                const tmpobj = createSampleFile(5000, logger, (i: number) => {
                    const value = i % 100 === 0 || i <= 5 ? i : -1;
                    controlSum += value !== -1 ? value : 0;
                    return `[${i}]:: ${
                        value !== -1 ? `some CPU=${value}% line data\n` : `some line data\n`
                    }`;
                });
                stream
                    .observe(Observe.DataSource.file(tmpobj.name).text())
                    .on('confirmed', () => {
                        const filter = 'cpu=(\\d{1,})';
                        search
                            .extract([
                                {
                                    filter,
                                    flags: { reg: true, word: false, cases: false },
                                },
                            ])
                            .then((results) => {
                                expect(results.length).toEqual(55);
                                for (let pos = 0; pos <= 5; pos += 1) {
                                    expect(results[pos].position).toEqual(pos);
                                }
                                for (let pos = 1; pos <= 49; pos += 1) {
                                    expect(results[pos + 5].position).toEqual(pos * 100);
                                }
                                let calculated = 0;
                                results.forEach((res) => {
                                    expect(res.values.length).toEqual(1);
                                    expect(res.values[0].filter.filter).toEqual(filter);
                                    calculated += parseInt(res.values[0].values[0], 10);
                                });
                                expect(calculated).toEqual(controlSum);
                                search
                                    .len()
                                    .then((len: number) => {
                                        expect(len).toEqual(0);
                                        finish(session, done);
                                    })
                                    .catch((err: Error) => {
                                        finish(session, done, err);
                                    });
                            })
                            .catch(finish.bind(null, session, done));
                    })
                    .catch(finish.bind(null, session, done));
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

    it(config.regular.list[2], function (done) {
        const testName = config.regular.list[2];
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
                const search = session.getSearch();
                if (search instanceof Error) {
                    return finish(session, done, search);
                }
                const events = session.getEvents();
                if (events instanceof Error) {
                    finish(session, done, events);
                    return;
                }
                let controlSumA = 0;
                let controlSumB = 0;
                const tmpobj = createSampleFile(5000, logger, (i: number) => {
                    const a = i % 100 === 0 || i <= 5 ? i : -1;
                    controlSumA += a !== -1 ? a : 0;
                    const b = a === -1 && i % 20 === 0 ? i : -1;
                    controlSumB += b !== -1 ? b : 0;
                    return `[${i}]:: ${
                        a !== -1
                            ? `some CPU=${a}% line data\n`
                            : b === -1
                            ? `some line data\n`
                            : `some TEMP=${b}C line data\n`
                    }`;
                });
                stream
                    .observe(Observe.DataSource.file(tmpobj.name).text())
                    .on('confirmed', () => {
                        const filterA = 'cpu=(\\d{1,})';
                        const filterB = 'temp=(\\d{1,})';
                        search
                            .extract([
                                {
                                    filter: filterA,
                                    flags: { reg: true, word: false, cases: false },
                                },
                                {
                                    filter: filterB,
                                    flags: { reg: true, word: false, cases: false },
                                },
                            ])
                            .then((results) => {
                                let calculatedA = 0;
                                let calculatedB = 0;
                                results.forEach((res) => {
                                    res.values.forEach((match) => {
                                        expect(match.values.length).toEqual(1);
                                        if (match.filter.filter === filterA) {
                                            calculatedA += parseInt(match.values[0], 10);
                                        }
                                        if (match.filter.filter === filterB) {
                                            calculatedB += parseInt(match.values[0], 10);
                                        }
                                    });
                                });
                                expect(calculatedA).toEqual(controlSumA);
                                expect(calculatedB).toEqual(controlSumB);
                                search
                                    .len()
                                    .then((len: number) => {
                                        expect(len).toEqual(0);
                                        finish(session, done);
                                    })
                                    .catch((err: Error) => {
                                        finish(session, done, err);
                                    });
                            })
                            .catch(finish.bind(null, session, done));
                    })
                    .catch(finish.bind(null, session, done));
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
});
