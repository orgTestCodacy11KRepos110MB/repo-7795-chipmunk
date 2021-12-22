import { Component, AfterContentInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import {
    ControllerSessionTabSearchStore,
    IFiltersLoad,
} from '../../../../controller/session/dependencies/search/dependencies/store/controller.session.tab.search.store';
import { DialogsRecentFitlersActionComponent } from '../../../dialogs/recentfilter/component';
import { NotificationsService } from '../../../../services.injectable/injectable.service.notifications';
import { Session } from '../../../../controller/session/session';
import { DialogsFiltersLoadComponent } from '../../../dialogs/filters.load/component';

import * as Toolkit from 'chipmunk.client.toolkit';

import TabsSessionsService from '../../../../services/service.sessions.tabs';
import HotkeysService from '../../../../services/service.hotkeys';
import PopupsService from '../../../../services/standalone/service.popups';
import EventsSessionService from '../../../../services/standalone/service.events.session';
import FilterOpenerService from '../../../../services/service.filter.opener';
import LayoutStateService from '../../../../services/standalone/service.layout.state';
import SidebarSessionsService from '../../../../services/service.sessions.sidebar';

@Component({
    selector: 'app-sidebar-app-searchmanager-controls',
    templateUrl: './template.html',
    styleUrls: ['./styles.less'],
})
export class SidebarAppSearchManagerControlsComponent implements AfterContentInit, OnDestroy {
    public _ng_filename: string = '';

    private _subscriptions: { [key: string]: Subscription } = {};
    private _logger: Toolkit.Logger = new Toolkit.Logger(
        'SidebarAppSearchManagerControlsComponent',
    );
    private _controller: ControllerSessionTabSearchStore | undefined;

    constructor(private _cdRef: ChangeDetectorRef, private _notifications: NotificationsService) {
        this._subscriptions.onRecentOpen = HotkeysService.getObservable().recentFilters.subscribe(
            this._ng_onRecentOpen.bind(this),
        );
    }

    ngAfterContentInit() {
        this._subscriptions.onOpenFilters =
            FilterOpenerService.getObservable().openFilters.subscribe(this._ng_onLoad.bind(this));
        this._subscriptions.onSessionChange =
            EventsSessionService.getObservable().onSessionChange.subscribe(
                this._onSessionChange.bind(this),
            );
        this._onSessionChange();
    }

    ngOnDestroy() {
        Object.keys(this._subscriptions).forEach((key: string) => {
            this._subscriptions[key].unsubscribe();
        });
    }

    public _ng_onRecentOpen() {
        const popupId: string | undefined = PopupsService.add({
            id: 'recent-filters-dialog',
            caption: `Open Recent Filters`,
            component: {
                factory: DialogsRecentFitlersActionComponent,
                inputs: {
                    open: this._ng_onLoad.bind(this),
                    close: () => {
                        popupId !== undefined && PopupsService.remove(popupId);
                    },
                },
            },
            buttons: [],
            options: {
                width: 40,
                minimalistic: true,
            },
        });
    }

    public _ng_onLoad(file?: string) {
        if (this._controller === undefined) {
            return;
        }
        this._controller
            .loadWithFilePicker(file)
            .then((response: string | IFiltersLoad) => {
                if (typeof response === 'string') {
                    this._ng_filename = response;
                    this._openSidebar();
                    return;
                }
                this._showDialog(response);
            })
            .catch((error: Error) => {
                this._notifications.add({
                    caption: 'Filters',
                    message: `Fail to load filters due error: ${error.message}`,
                });
            });
    }

    public _ng_onSave(file?: string) {
        if (this._controller === undefined) {
            return;
        }
        this._controller
            .save(file)
            .then((filename: string) => {
                this._ng_filename = filename;
            })
            .catch((error: Error) => {
                this._ng_filename = '';
                this._notifications.add({
                    caption: 'Filters',
                    message: `Fail to save filters due error: ${error.message}`,
                });
            });
    }

    private _showDialog(data: IFiltersLoad) {
        if (this._controller === undefined) {
            return;
        }
        const popupId: string | undefined = PopupsService.add({
            id: 'filters-load-dialog',
            caption: `Load filters`,
            component: {
                factory: DialogsFiltersLoadComponent,
                inputs: {
                    close: () => {
                        popupId !== undefined && PopupsService.remove(popupId);
                    },
                },
            },
            buttons: [
                {
                    caption: 'Append',
                    handler: () => {
                        this._controller?.load(data.file, data.store, true);
                    },
                },
                {
                    caption: 'Replace',
                    handler: () => {
                        this._controller?.load(data.file, data.store, false);
                        this._ng_filename = data.file;
                    },
                },
                {
                    caption: 'Cancel',
                    handler: () => {
                        popupId !== undefined && PopupsService.remove(popupId);
                    },
                },
            ],
            options: {
                width: 40,
            },
        });
    }

    private _onSessionChange(controller?: Session) {
        if (controller === undefined) {
            controller = TabsSessionsService.getActive();
        }
        if (controller === undefined) {
            return;
        }
        this._controller = controller.getSessionSearch().getStoreAPI();
        this._ng_filename = this._controller.getCurrentFile();
    }

    private _openSidebar() {
        const session: Session | undefined = TabsSessionsService.getActive();
        if (session === undefined) {
            return;
        }
        LayoutStateService.sidebarMax();
        SidebarSessionsService.setActive('search', session.getGuid());
    }
}
