import { File } from '@platform/types/files';

import {
    IDLTOptions,
    EMTIN,
    IDLTFilters,
    LOG_LEVELS,
    NUM_LOGS_LEVELS,
} from '@platform/types/parsers/dlt';
import { Timezone } from '@elements/timezones/timezone';
import { SourceDefinition, Source as SourceRef } from '@platform/types/transport';
import { bridge } from '@service/bridge';
import { State as TransportState } from '@elements/transport/setup/state';

import * as Errors from './error';

export class State {
    public logLevel: EMTIN = EMTIN.DLT_LOG_VERBOSE;
    public fibex: File[] = [];
    public timezone: Timezone | undefined;
    public errors = {
        bindingAddress: new Errors.ErrorState(Errors.Field.bindingAddress),
        bindingPort: new Errors.ErrorState(Errors.Field.bindingPort),
    };
    public transport: TransportState = new TransportState();
    public bindingAddress: string = '';
    public bindingPort: string = '';

    public fromOptions(opt: {
        source: SourceDefinition | undefined;
        options: IDLTOptions | undefined;
        preselected: SourceRef | undefined;
    }) {
        if (opt.options !== undefined) {
            this.logLevel = NUM_LOGS_LEVELS[opt.options.logLevel] as EMTIN;
            this.timezone =
                opt.options.tz !== undefined ? Timezone.from(opt.options.tz) : undefined;
            if (opt.options.fibex.length > 0) {
                bridge
                    .files()
                    .getByPath(opt.options.fibex)
                    .then((files: File[]) => {
                        this.fibex = files;
                    })
                    .catch((err: Error) => {
                        console.error(`Fail to get files data: ${err.message}`);
                    });
            }
        }
        if (opt.source !== undefined) {
            this.transport.from(opt.source);
        } else if (opt.preselected !== undefined) {
            this.transport.switch(opt.preselected);
        }
    }

    public asOptions(): { source: SourceDefinition; options: IDLTOptions } {
        const filters: IDLTFilters = {};
        return {
            options: {
                logLevel: LOG_LEVELS[this.logLevel] === undefined ? 0 : LOG_LEVELS[this.logLevel],
                filters,
                fibex: this.fibex.map((f) => f.filename),
            },
            source: this.transport.asSourceDefinition(),
        };
    }

    public update(source: SourceDefinition) {
        this.transport.from(source);
    }
}
