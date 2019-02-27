import { HostState, EHostState, IHostState } from './host.state';
export { HostState, EHostState, IHostState };

import { HostStateHistory } from './host.state.history';
export { HostStateHistory };

import { HostTask, EHostTaskState, IHostTask } from './host.task';
export { HostTask, EHostTaskState, IHostTask };

import { HostTaskHistory, IHostTaskHistory, IHostTaskHistoryItem } from './host.task.history';
export { HostTaskHistory, IHostTaskHistory, IHostTaskHistoryItem };

import { IRenderMountPlugin, RenderMountPlugin, IRenderMountPluginInfo } from './render.plugin.mount';
export { IRenderMountPlugin, RenderMountPlugin, IRenderMountPluginInfo };

import { IRenderState, RenderState, ERenderState } from './render.state';
export { IRenderState, RenderState, ERenderState };

import { IPluginInternalMessage, PluginInternalMessage } from './plugin.internal.message';
export { IPluginInternalMessage, PluginInternalMessage };

import { IStreamAdd, StreamAdd } from './stream.add';
export { IStreamAdd, StreamAdd };

import { IStreamRemove, StreamRemove } from './stream.remove';
export { IStreamRemove, StreamRemove };

import { IStreamData, StreamData } from './stream.data';
export { IStreamData, StreamData };

// Common type for expected message implementation
export type TMessage =  HostState |
                        HostStateHistory |
                        HostTask |
                        HostTaskHistory |
                        RenderMountPlugin |
                        RenderState |
                        PluginInternalMessage |
                        StreamAdd |
                        StreamRemove |
                        StreamData;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
* Mapping of host/render events
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  */
export const Map = {

    [HostState.signature                ]: HostState,
    [HostStateHistory.signature         ]: HostStateHistory,
    [HostTask.signature                 ]: HostTask,
    [HostTaskHistory.signature          ]: HostTaskHistory,
    [RenderMountPlugin.signature        ]: RenderMountPlugin,
    [RenderState.signature              ]: RenderState,
    [PluginInternalMessage.signature    ]: PluginInternalMessage,
    [StreamAdd.signature                ]: StreamAdd,
    [StreamRemove.signature             ]: StreamRemove,
    [StreamData.signature               ]: StreamData,

};
