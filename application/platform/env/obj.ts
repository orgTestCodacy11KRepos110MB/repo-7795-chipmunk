export type AnyObj = { [key: string]: unknown };

export function asAnyObj<T>(smth: T): AnyObj {
    return smth as unknown as AnyObj;
}

export function setProp<T>(dest: T, prop: string, value: unknown) {
    if ((dest ?? true) === true || typeof dest !== 'object') {
        throw new Error(`Expecting an object`);
    }
    (dest as any)[prop] = value;
}

export function getProp<T>(dest: T, prop: string): unknown {
    if ((dest ?? true) === true || typeof dest !== 'object') {
        throw new Error(`Expecting an object`);
    }
    return (dest as any)[prop];
}

export function getTypedProp<T, O>(dest: T, prop: string): O {
    if ((dest ?? true) === true || typeof dest !== 'object') {
        throw new Error(`Expecting an object`);
    }
    if ((dest as any)[prop] === undefined) {
        throw new Error(`Target property "${prop}" is undefined.`);
    }
    return (dest as any)[prop] as O;
}

export function getPropByPath<T, O>(dest: T, path: string): O | undefined {
    if ((dest ?? true) === true) {
        return undefined;
    }
    const parts: string[] = path.split('.');
    const current = asAnyObj(dest)[parts[0]];
    parts.splice(0, 1);
    if (parts.length === 0) {
        return current as O;
    } else {
        return getPropByPath(current, parts.join('.'));
    }
}

export function getWithDefaults<T>(obj: any, prop: string, defaults: T): T {
    if (obj === undefined || obj === null) {
        throw new Error(`Target cannot be null or undefined`);
    }
    if (obj[prop] === undefined || typeof obj[prop] !== typeof defaults) {
        obj[prop] = defaults;
    }
    return obj[prop];
}
export function isObject(src: any) {
    if ((src ?? true) === true || typeof src !== 'object') {
        throw new Error(`Expecting an object`);
    }
}
export function getObject(src: any): Object {
    if ((src ?? true) === true || typeof src !== 'object') {
        throw new Error(`Expecting an object`);
    }
    return src;
}
export function getAsString(src: any, key: string): string {
    if (typeof src[key] !== 'string') {
        throw new Error(`Parameter "${key}" should be a none-empty string`);
    }
    return src[key];
}
export function getAsNotEmptyString(src: any, key: string): string {
    if (typeof src[key] !== 'string' || src[key].trim() === '') {
        throw new Error(`Parameter "${key}" should be a none-empty string`);
    }
    return src[key];
}
export function getAsNotEmptyStringOrAsUndefined(src: any, key: string): string {
    if (typeof src[key] === 'string' && src[key].trim() === '') {
        throw new Error(`Parameter "${key}" should be a none-empty string`);
    }
    return src[key];
}

export function getAsBool(src: any, key: string, defaults?: boolean): boolean {
    if (typeof src[key] !== 'boolean') {
        if (defaults !== undefined) {
            return defaults;
        }
        throw new Error(`Parameter "${key}" should be a boolean`);
    }
    return src[key];
}

export function getAsObj(src: any, key: string, defaults?: unknown): any {
    if (typeof src[key] !== 'object') {
        if (defaults !== undefined) {
            return defaults;
        }
        throw new Error(`Parameter "${key}" should be a object`);
    }
    return src[key];
}

export function getAsObjOrUndefined(src: any, key: string, defaults?: unknown): any {
    if (typeof src[key] !== 'object') {
        if (defaults !== undefined) {
            return defaults;
        } else {
            return undefined;
        }
    }
    return src[key];
}

export function getAsValidNumber(
    src: any,
    key: string,
    conditions?: { min?: number; max?: number; defaults?: number },
): number {
    if (typeof src[key] !== 'number' || isNaN(src[key]) || !isFinite(src[key])) {
        if (conditions !== undefined) {
            if (conditions.defaults !== undefined) {
                return conditions.defaults;
            }
        }
        throw new Error(`Parameter "${key}" should be valid number`);
    }
    if (conditions !== undefined) {
        if (conditions.min !== undefined && src[key] < conditions.min) {
            throw new Error(`Parameter "${key}" should be > ${conditions.min}`);
        }
        if (conditions.max !== undefined && src[key] > conditions.max) {
            throw new Error(`Parameter "${key}" should be > ${conditions.max}`);
        }
    }
    return src[key];
}

export function getAsArray<T>(src: any, key: string): Array<T> {
    if (!(src[key] instanceof Array)) {
        throw new Error(`Parameter "${key}" should be valid array`);
    }
    return src[key];
}

export function getAsArrayOrUndefined<T>(src: any, key: string): Array<T> | undefined {
    if (!(src[key] instanceof Array)) {
        return undefined;
    }
    return src[key];
}

export function from<T>(src: any, props: string[]): T {
    if (typeof src !== 'object') {
        throw new Error(`Expecting an object`);
    }
    let smth: any = {};
    props.forEach((prop: string) => {
        if (src[prop] === undefined) {
            throw new Error(`Property "${prop}" doesn't exist on source object`);
        }
        smth[prop] = src[prop];
    });
    return smth as T;
}
