import { Subject, Subscriber } from '@platform/env/subscription';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Entity } from './entity';
import { IComponentDesc } from '@elements/containers/dynamic/component';
import { KeyboardListener } from './keyboard.listener';
import { IMenuItem } from '@ui/service/contextmenu';
import { EntityData } from './entity.data';
import { unique } from '@platform/env/sequence';
import { DragAndDropService, DragableRequest, ListContent } from '../../draganddrop/service';
import { Instance as Logger } from '@platform/env/logger';
import { Session } from '@service/session/session';

export interface ProviderConstructor {
    new (session: Session, draganddrop: DragAndDropService, logger: Logger): Provider<any>;
}

export enum ProviderData {
    filters = 'filters',
    charts = 'charts',
    ranges = 'ranges',
    disabled = 'disabled',
}

export interface ISelectEvent {
    provider: Provider<any>;
    entity: Entity<any> | undefined;
    guids: string[];
    sender?: string;
}

export interface IContextMenuEvent {
    event: MouseEvent;
    provider: Provider<any>;
    entity: Entity<any>;
    items?: IMenuItem[];
}

export interface IDoubleclickEvent {
    event: MouseEvent;
    provider: Provider<any>;
    entity: Entity<any>;
}

export interface ISelection {
    guid: string; // GUID of entity
    sender?: string; // Name of provider/controller/etc who emits actions (we need it to prevent loop in event circle)
    ignore?: boolean; // true - drops state of ctrl and shift; false - ctrl and shift would be considering
    toggle?: boolean; // used only with single selection
    // true - if entity already selected, selection would be dropped
    // false - defined entity would be selected in anyway
}

export enum EActions {
    enable = 'enable',
    disable = 'disable',
    remove = 'remove',
    activate = 'activate',
    deactivate = 'deactivate',
    edit = 'edit',
}

interface IStoredSelection {
    current: string[];
    last: Entity<any> | undefined;
}

type ProvidersGetter = () => Provider<any>[];

export abstract class Provider<T> {
    public subjects: {
        change: Subject<void>;
        selection: Subject<ISelectEvent>;
        edit: Subject<string | undefined>;
        context: Subject<IContextMenuEvent>;
        doubleclick: Subject<IDoubleclickEvent>;
        reload: Subject<string>;
    } = {
        change: new Subject(),
        selection: new Subject(),
        edit: new Subject(),
        context: new Subject(),
        doubleclick: new Subject(),
        reload: new Subject(),
    };
    public readonly session: Session;
    public readonly logger: Logger;
    public readonly draganddrop: DragAndDropService;
    public readonly subscriber: Subscriber = new Subscriber();
    public panels!: {
        list: {
            name: string;
            desc: string;
            comp: IComponentDesc;
        };
        details: {
            name: string | undefined;
            desc: string | undefined;
            comp: IComponentDesc | undefined;
        };
        nocontent: {
            name: string | undefined;
            desc: string | undefined;
            comp: IComponentDesc | undefined;
        };
    };

    private _selection: IStoredSelection = {
        current: [],
        last: undefined,
    };
    private _keyboard: KeyboardListener | undefined;
    private _uuld: string = unique();
    private _providers: ProvidersGetter | undefined;

    constructor(session: Session, draganddrop: DragAndDropService, logger: Logger) {
        this.draganddrop = draganddrop;
        this.session = session;
        this.logger = logger;
    }

    public destroy() {
        Subject.unsubscribe(this.subjects);
        this.subscriber.unsubscribe();
    }

    public getGuid(): string {
        return this._uuld;
    }

    public setKeyboardListener(listener: KeyboardListener) {
        this._keyboard = listener;
    }

    public setProvidersGetter(getter: () => Provider<any>[]) {
        this._providers = getter;
    }

    public setLastSelection(selection: Entity<any> | undefined) {
        this._selection.last = selection;
    }

    public select(): {
        first: () => void;
        last: () => void;
        next: () => boolean;
        prev: () => boolean;
        drop: (sender?: string) => void;
        apply: (sender: string, guids: string[]) => void;
        get: () => string[];
        getEntities: () => Array<Entity<T>>;
        set: (selection: ISelection) => void;
        single: () => Entity<T> | undefined;
        context: (event: MouseEvent, entity: Entity<T>) => void;
        doubleclick: (event: MouseEvent, entity: Entity<T>) => void;
    } {
        const setSelection: (selection: ISelection) => void = (selection: ISelection) => {
            const index: number = this._selection.current.indexOf(selection.guid);
            let entity: Entity<T> | undefined;
            if (this._keyboard !== undefined && selection.ignore) {
                this._keyboard.ignore_ctrl_shift();
            }
            if (this._keyboard !== undefined && this._keyboard.ctrl()) {
                if (index === -1) {
                    this._selection.current.push(selection.guid);
                    entity = this.entities().find((e) => e.uuid() === selection.guid);
                }
            } else if (
                this._keyboard !== undefined &&
                this._providers !== undefined &&
                this._keyboard.shift() &&
                this._selection.last !== undefined
            ) {
                let guids: string[] = ([] as string[]).concat.apply(
                    [],
                    this._providers().map((p) => p.entities().map((e) => e.uuid())),
                );
                const from: number = guids.findIndex((g) => g === this._selection.last?.uuid());
                const to: number = guids.findIndex((g) => g === selection.guid);
                if (from !== -1 && to !== -1) {
                    guids = guids.slice(Math.min(from, to), Math.max(from, to) + 1);
                    this._selection.current = this._selection.current.concat(
                        guids.filter((g) => this._selection.current.indexOf(g) === -1),
                    );
                }
                entity = this._selection.last;
            } else {
                if (index === -1) {
                    this._selection.current = [selection.guid];
                    entity = this.entities().find((e) => e.uuid() === selection.guid);
                } else {
                    if (selection.toggle !== false) {
                        this._selection.current = [];
                    }
                }
            }
            this.subjects.selection.emit({
                provider: this,
                entity: entity,
                guids: this.select().get(),
                sender: selection.sender,
            });
        };
        return {
            first: () => {
                const entities = this.entities();
                if (entities.length === 0) {
                    return;
                }
                setSelection({
                    guid: entities[0].uuid(),
                    sender: 'self.first',
                });
            },
            last: () => {
                const entities = this.entities();
                if (entities.length === 0) {
                    return;
                }
                setSelection({
                    guid: entities[entities.length - 1].uuid(),
                    sender: 'self.last',
                });
            },
            next: () => {
                if (this._selection.current.length !== 1) {
                    return false;
                }
                const entities = this.entities();
                let index: number = -1;
                entities.forEach((entity, i) => {
                    if (entity.uuid() === this._selection.current[0]) {
                        index = i;
                    }
                });
                if (index === -1) {
                    return false;
                }
                if (index + 1 > entities.length - 1) {
                    return false;
                }
                setSelection({
                    guid: entities[index + 1].uuid(),
                    sender: 'self.next',
                });
                return true;
            },
            prev: () => {
                if (this._selection.current.length !== 1) {
                    return false;
                }
                const entities = this.entities();
                let index: number = -1;
                entities.forEach((entity, i) => {
                    if (entity.uuid() === this._selection.current[0]) {
                        index = i;
                    }
                });
                if (index === -1) {
                    return false;
                }
                if (index - 1 < 0) {
                    return false;
                }
                setSelection({
                    guid: entities[index - 1].uuid(),
                    sender: 'self.next',
                });
                return true;
            },
            drop: (sender?: string) => {
                if (this._selection.current.length === 0) {
                    return;
                }
                this._selection.current = [];
                this.subjects.selection.emit({
                    provider: this,
                    entity: undefined,
                    guids: this.select().get(),
                    sender: sender,
                });
            },
            apply: (sender: string, guids: string[]) => {
                const own: string[] = this.entities().map((e) => e.uuid());
                this._selection.current = guids.filter((g) => own.indexOf(g) !== -1);
                this.subjects.selection.emit({
                    provider: this,
                    entity: undefined,
                    guids: this.select().get(),
                    sender: sender,
                });
            },
            get: () => {
                return this._selection.current.slice();
            },
            getEntities: () => {
                const entities: Entity<any>[] = [];
                this.entities().forEach((entity: Entity<T>) => {
                    if (this._selection.current.indexOf(entity.uuid()) === -1) {
                        return;
                    }
                    entities.push(entity);
                });
                return entities;
            },
            set: setSelection,
            single: () => {
                if (this._selection.current.length !== 1) {
                    return undefined;
                }
                return this.entities().find((entity: Entity<T>) => {
                    return entity.uuid() === this._selection.current[0];
                });
            },
            context: (event: MouseEvent, entity: Entity<T>) => {
                this.subjects.context.emit({
                    event: event,
                    entity: entity,
                    provider: this,
                });
            },
            doubleclick: (event: MouseEvent, entity: Entity<T>) => {
                this.subjects.doubleclick.emit({
                    event: event,
                    entity: entity,
                    provider: this,
                });
                setSelection({
                    guid: entity.uuid(),
                    sender: 'self.doubleclick',
                    toggle: false,
                });
            },
        };
    }

    public edit(): {
        in: () => void;
        out: () => void;
    } {
        return {
            in: () => {
                if (this._selection.current.length !== 1) {
                    return;
                }
                const guid: string = this._selection.current[0];
                this.entities().forEach((entity: Entity<any>) => {
                    if (entity.uuid() === guid) {
                        entity.getEditState().in();
                    } else {
                        entity.getEditState().out();
                    }
                });
                this.subjects.edit.emit(guid);
            },
            out: () => {
                this.entities().forEach((entity: Entity<any>) => {
                    entity.getEditState().out();
                });
                this.subjects.edit.emit(undefined);
                this.change();
            },
        };
    }

    public change() {
        this.subjects.change.emit();
    }

    public isEmpty(): boolean {
        return this.entities().length === 0;
    }

    public updatePanels(): void {
        this.panels = {
            list: {
                name: this.getPanels().list().name(),
                desc: this.getPanels().list().desc(),
                comp: this.getPanels().list().comp(),
            },
            details: {
                name: this.getPanels().details().name(),
                desc: this.getPanels().details().desc(),
                comp: this.getPanels().details().comp(),
            },
            nocontent: {
                name: this.getPanels().nocontent().name(),
                desc: this.getPanels().nocontent().desc(),
                comp: this.getPanels().nocontent().comp(),
            },
        };
    }

    public abstract init(): void;

    public abstract entities(): Entity<T>[];

    public abstract reorder(params: { prev: number; curt: number }): void;

    public abstract getPanels(): {
        list(): {
            name(): string;
            desc(): string;
            comp(): IComponentDesc;
        };
        details(): {
            name(): string | undefined;
            desc(): string | undefined;
            comp(): IComponentDesc | undefined;
        };
        nocontent(): {
            name(): string | undefined;
            desc(): string | undefined;
            comp(): IComponentDesc | undefined;
        };
    };

    public abstract search(entity: Entity<T>): void;

    public abstract isVisable(): boolean;

    public abstract dropped(event: CdkDragDrop<EntityData<DragableRequest>>): void;

    public abstract get listID(): ListContent;

    public abstract getContextMenuItems(
        target: Entity<any>,
        selected: Array<Entity<any>>,
    ): IMenuItem[];

    public abstract actions(
        target: Entity<any> | undefined,
        selected: Array<Entity<any>>,
    ): {
        activate?: () => void;
        deactivate?: () => void;
        remove?: () => void;
        edit?: () => void;
    };
}
