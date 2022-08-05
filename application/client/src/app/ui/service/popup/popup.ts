import { unique } from '@platform/env/sequence';
import { Subjects, Subject } from '@platform/env/subscription';
import { IComponentDesc } from '@ui/elements/containers/dynamic/component';

export enum Vertical {
    top = 'top',
    center = 'center',
    bottom = 'bottom',
}

export enum Horizontal {
    left = 'left',
    right = 'right',
    center = 'center',
}

export interface Position {
    vertical: Vertical;
    horizontal: Horizontal;
}

export interface Options {
    closable?: boolean;
    width?: number;
    position?: Position;
    closeOnKey?: string;
    closeOnBGClick?: boolean;
    closed?: () => void;
    component: IComponentDesc;
}

export class Popup {
    public subjects: Subjects<{
        opened: Subject<void>;
        closed: Subject<void>;
    }> = new Subjects({
        opened: new Subject<void>(),
        closed: new Subject<void>(),
    });

    public options: Options;
    public readonly uuid: string = unique();

    constructor(options: Options) {
        this.options = options;
    }

    public destroy() {
        this.close();
        this.subjects.destroy();
    }

    public close(): void {
        //
    }
}