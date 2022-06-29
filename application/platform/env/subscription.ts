import { unique } from './sequence';

export type THandler = (...args: any[]) => any;

export interface IEventDesc {
    self: any;
    [key: string]: any;
}

const SIGNATURE = '__subject_handler_guid';

export class Subject<T> {
    private _handlers: Array<(value: T) => any> = [];
    private _name: string = '';
    private _emitted: boolean = false;

    public static unsubscribe(subjects: unknown): void {
        if (typeof subjects !== 'object' || subjects === null) {
            return;
        }
        Object.keys(subjects as object).forEach((key: string) => {
            const target = (subjects as { [key: string]: Subject<unknown> })[key];
            if (!(target instanceof Subject)) {
                return;
            }
            target.destroy();
        });
    }

    public static validate(desc: IEventDesc, target: any): Error | undefined {
        const required: string[] = Object.keys(desc).filter((k) => k !== 'self');
        if (desc.self === undefined) {
            return new Error(`Self cannot be undefined`);
        }
        if (desc.self === null && (target === null || target === undefined)) {
            return undefined;
        }
        if (desc.self === null && target !== null && target !== undefined) {
            return new Error(`Self is defined as null, but target isn't null or undefined`);
        }
        if (desc.self !== null && (target === null || target === undefined)) {
            return new Error(
                `Self isn't null, but event object null or undefined. Required fields: ${required.join(
                    ', ',
                )}`,
            );
        }
        if (typeof desc.self !== 'string') {
            if (!(target instanceof desc.self)) {
                return new Error(`Expecting ${desc.self}, but has been gotten ${target}`);
            } else {
                return undefined;
            }
        }
        if (desc.self !== typeof target) {
            return new Error(`Expecting target to be ${desc.self}, but target is ${typeof target}`);
        }
        if (typeof target !== 'object') {
            // It's something like: number, string etc. It's primitive type
            return undefined;
        }
        const errors: string[] = [];
        required.forEach((name: string) => {
            const types: any[] = desc[name] instanceof Array ? desc[name] : [desc[name]];
            let valid: boolean = false;
            types.forEach((typeRef) => {
                if (valid) {
                    return;
                }
                if (
                    typeof typeRef === 'object' &&
                    typeRef !== null &&
                    typeof typeRef.self === 'string'
                ) {
                    const err: Error | undefined = Subject.validate(typeRef, target[name]);
                    if (err === undefined) {
                        valid = true;
                    }
                } else if (
                    typeof typeRef === 'string' &&
                    (typeof target[name] === typeRef || typeRef === 'any')
                ) {
                    valid = true;
                } else if (typeof typeRef !== 'string' && target[name] instanceof typeRef) {
                    valid = true;
                }
            });
            if (!valid) {
                errors.push(
                    `Expecting property "${name}" has a type "${types
                        .map((t) => {
                            if (typeof t === 'string') {
                                return t;
                            } else if (typeof t === 'object' && t === null) {
                                return `ERROR: null as type definition`;
                            } else if (typeof t === 'object' && typeof t.self === 'string') {
                                return JSON.stringify(t);
                            } else if (typeof t === 'function') {
                                return `${t.name}${
                                    t.constructor !== undefined ? `/${t.constructor.name}` : ''
                                }`;
                            } else if (
                                typeof t === 'object' &&
                                t.prototype !== undefined &&
                                t.prototype !== null
                            ) {
                                return `${t.prototype.name}`;
                            } else {
                                return `ERROR: unknown type definition`;
                            }
                        })
                        .join(' | ')}", but it has type "${typeof target[name]}"`,
                );
            }
        });
        if (errors.length !== 0) {
            return new Error(errors.join('\n'));
        }
        return undefined;
    }

    constructor(name?: string) {
        if (typeof name === 'string') {
            this._name = name;
        }
    }

    public subscribe(handler: (value: T) => void): Subscription {
        if (typeof handler !== 'function') {
            throw new Error(`Handler of event should be a function.`);
        }
        const id: string = unique();
        (handler as any)[SIGNATURE] = id;
        this._handlers.push(handler);
        return new Subscription(this._name, () => {
            this._unsubscribe(id);
        });
    }

    public destroy(): void {
        this._handlers = [];
    }

    public emit(value: T) {
        this._emitted = true;
        this._handlers.forEach((handler: (value: T) => void) => {
            handler(value);
        });
    }

    public emitted(): boolean {
        return this._emitted;
    }

    public to<C>(): Subject<C> {
        return this as unknown as Subject<C>;
    }

    private _unsubscribe(id: string) {
        let index: number = -1;
        this._handlers.forEach((handle: any, i: number) => {
            if (index !== -1) {
                return;
            }
            if (handle[SIGNATURE] === id) {
                index = i;
            }
        });
        if (index === -1) {
            return;
        }
        this._handlers.splice(index, 1);
    }
}

export class Subjects<T> {
    private readonly _subjects: T & { [key: string]: Subject<any> };

    constructor(subjects: T & { [key: string]: Subject<any> }) {
        this._subjects = subjects;
    }

    public destroy(): void {
        Object.keys(this._subjects).forEach((key: string) => {
            this._subjects[key].destroy();
        });
    }

    public get(): T {
        return this._subjects;
    }
}

export class Subscription {
    private _unsubsribe: THandler | undefined;
    private _event: string;
    private _subscriptionId: string;

    constructor(event: string, unsubsribe: THandler, subscriptionId?: string) {
        if (typeof unsubsribe !== 'function') {
            throw new Error(`Should be provided unsubsribe function.`);
        }
        if (typeof subscriptionId !== 'string') {
            subscriptionId = unique();
        }
        this._unsubsribe = unsubsribe;
        this._event = event;
        this._subscriptionId = subscriptionId;
    }

    public getEventName(): string {
        return this._event;
    }

    public getSubscriptionId(): string {
        return this._subscriptionId;
    }

    public unsubscribe(): void {
        if (this._unsubsribe === undefined) {
            return;
        }
        this._unsubsribe();
    }

    public destroy(): void {
        this.unsubscribe();
        this._unsubsribe = undefined;
    }
}

export interface ISubscription {
    destroy(): void;
    unsubscribe(): void;
}

export class Subscriber {
    private _subscriptions: Map<string, ISubscription> = new Map();
    public register(subscription: ISubscription) {
        this._subscriptions.set(unique(), subscription);
    }
    public unsubscribe() {
        this._subscriptions.forEach((subscription) => {
            subscription.unsubscribe();
        });
    }
}

export function unsubscribeAllInHolder(subjects: unknown): void {
    if (typeof subjects !== 'object' || subjects === null) {
        return;
    }
    Object.keys(subjects as object).forEach((key: string) => {
        const target = (subjects as { [key: string]: Subject<unknown> })[key];
        if (!(target instanceof Subject)) {
            return;
        }
        target.destroy();
    });
}