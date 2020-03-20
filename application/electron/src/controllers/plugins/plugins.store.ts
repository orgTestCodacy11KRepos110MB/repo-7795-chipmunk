// tslint:disable:max-classes-per-file

import * as path from 'path';
import * as FS from '../../tools/fs';
import * as fs from 'fs';
import * as Tools from '../../tools/index';

import Logger from '../../tools/env.logger';
import ServicePaths from '../../services/service.paths';
import ServiceElectronService from '../../services/service.electron.state';
import ServicePackage from '../../services/service.package';

import GitHubClient, { IReleaseAsset, IReleaseData, GitHubAsset } from '../../tools/env.github.client';

import { getPlatform, EPlatforms } from '../../tools/env.os';
import { download } from '../../tools/env.net';
import { CommonInterfaces } from '../../interfaces/interface.common';
import { getValidPluginReleaseInfo } from './plugins.validator';

const CSettings: {
    user: string,
    repo: string,
    registerListFile: string,
} = {
    user: 'esrlabs',
    repo: 'chipmunk-plugins-store',
    registerListFile: 'releases-{platform}.json',
};

/**
 * @class ControllerPluginStore
 * @description Delivery default plugins into logviewer folder
 */

export default class ControllerPluginStore {

    private _logger: Logger = new Logger(`ControllerPluginStore ("${CSettings.user}/${CSettings.repo}")`);
    private _remote: Map<string, CommonInterfaces.Plugins.IPlugin> | undefined = undefined;
    private _local: Map<string, CommonInterfaces.Plugins.IPlugin> = new Map();
    private _downloads: Map<string, boolean> = new Map();

    public local(): Promise<void> {
        return new Promise((resolve) => {
            this._setupLocalReleaseNotes().then((plugins: Map<string, CommonInterfaces.Plugins.IPlugin>) => {
                this._local = plugins;
                resolve();
            }).catch((error: Error) => {
                this._logger.warn(`Fail to get plugin's register due error: ${error.message}`);
                resolve();
            });
        });
    }

    public remote(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._setupRemoteReleaseNotes().then((plugins: Map<string, CommonInterfaces.Plugins.IPlugin>) => {
                this._remote = plugins;
                resolve();
            }).catch((error: Error) => {
                this._logger.warn(`Fail to get plugin's register due error: ${error.message}`);
                resolve();
            });
        });
    }

    public getInfo(name: string): CommonInterfaces.Plugins.IPlugin | undefined {
        return this._remote === undefined ? this._local.get(name) : this._remote.get(name);
    }

    public download(name: string): Promise<string> {
        return new Promise((resolve, reject) => {
            ServiceElectronService.logStateToRender(`Downloading plugin "${name}"...`);
            // Check plugin info
            const plugin: CommonInterfaces.Plugins.IPlugin | undefined = this.getInfo(name);
            if (plugin === undefined) {
                return reject(new Error(this._logger.warn(`Plugin "${name}" isn't found.`)));
            }
            this.delivery(plugin.name).then((filename: string) => {
                resolve(filename);
            }).catch((deliveryErr: Error) => {
                reject(new Error(this._logger.warn(`Fail to delivery plugin "${plugin.name}" due error: ${deliveryErr.message}`)));
            });
        });
    }

    public getDefaults(exclude: string[]): CommonInterfaces.Plugins.IPlugin[] {
        return Array.from(this.getRegister().values()).filter((plugin: CommonInterfaces.Plugins.IPlugin) => {
            if (plugin.hash !== ServicePackage.getHash()) {
                this._logger.warn(`Default plugin "${plugin.name}" could not be installed, because hash dismatch.\n\t- plugin hash: ${plugin.hash}\n\t- chipmunk hash: ${ServicePackage.getHash()}`);
                return false;
            }
            return true;
        }).filter((plugin: CommonInterfaces.Plugins.IPlugin) => {
            return exclude.indexOf(plugin.name) === -1 && plugin.default;
        });
    }

    public isDefault(name: string): boolean {
        let defaults: boolean = false;
        Array.from(this.getRegister().values()).filter((plugin: CommonInterfaces.Plugins.IPlugin) => {
            if (defaults) {
                return;
            }
            if (plugin.name === name) {
                defaults = plugin.default;
            }
        });
        return defaults;
    }

    public getAvailable(): CommonInterfaces.Plugins.IPlugin[] {
        return Array.from(this.getRegister().values()).map((plugin: CommonInterfaces.Plugins.IPlugin) => {
            return Object.assign({}, plugin);
        });
    }

    public getSuitableVersions(name: string): CommonInterfaces.Plugins.IHistory[] {
        const plugin: CommonInterfaces.Plugins.IPlugin | undefined = this.getPluginReleaseInfo(name);
        if (plugin === undefined) {
            return [];
        }
        return [];
    }

    public getRegister(): Map<string, CommonInterfaces.Plugins.IPlugin> {
        return this._remote === undefined ? this._local : this._remote;
    }

    public delivery(name: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const plugin: CommonInterfaces.Plugins.IPlugin | undefined = this.getRegister().get(name);
            if (plugin === undefined) {
                return reject(new Error(`Fail to find plugin in register`));
            }
            this._findLocally(plugin).then((filename: string) => {
                resolve(filename);
            }).catch((error: Error) => {
                const target: string = path.resolve(ServicePaths.getDownloads(), plugin.file);
                if (this._downloads.has(target)) {
                    return reject(new Error(`Plugin "${plugin.name}" (${target}) is already downloading.`));
                }
                this._downloads.set(target, true);
                this._logger.env(`Plugin "${plugin.name}" isn't found and will be downloaded: ${error.message}`);
                const temp: string = path.resolve(ServicePaths.getDownloads(), Tools.guid());
                FS.unlink(target).then(() => {
                    download(plugin.url, temp).then(() => {
                        fs.stat(temp, (statErr: NodeJS.ErrnoException | null, stat: fs.Stats) => {
                            if (statErr) {
                                return reject(new Error(this._logger.warn(`Fail download file "${temp}" due error: ${statErr.message}`)));
                            }
                            this._logger.env(`Plugin "${name}" is downloaded:\n\t- file: ${temp} (${target}) \n\t- size: ${stat.size} bytes`);
                            fs.rename(temp, target, (renameErr: NodeJS.ErrnoException | null) => {
                                if (renameErr) {
                                    return reject(new Error(this._logger.warn(`Fail rename file "${temp}" to "${target}" due error: ${renameErr.message}`)));
                                }
                                resolve(target);
                            });
                        });
                    }).catch((downloadErr: Error) => {
                        reject(new Error(this._logger.warn(`Fail to download file "${target}" due error: ${downloadErr.message}`)));
                    });
                }).catch((unlinkErr: Error) => {
                    reject(new Error(this._logger.warn(`Fail to remove file "${target}" due error: ${unlinkErr.message}`)));
                });
            });
        });
    }

    public getPluginReleaseInfo(name: string): CommonInterfaces.Plugins.IPlugin | undefined {
        const register: Map<string, CommonInterfaces.Plugins.IPlugin> = this.getRegister();
        return register.get(name);
    }

    private _findLocally(plugin: CommonInterfaces.Plugins.IPlugin): Promise<string> {
        return new Promise((resolve, reject) => {
            this._findIn(plugin, 'includes').then((filename: string) => {
                resolve(filename);
            }).catch((inclErr: Error) => {
                this._logger.env(`Fail to find a plugin "${plugin.name}" in included due error: ${inclErr.message}`);
                this._findIn(plugin, 'downloads').then((filename: string) => {
                    resolve(filename);
                }).catch((downloadsErr: Error) => {
                    this._logger.env(`Fail to find a plugin "${plugin.name}" in downloads due error: ${downloadsErr.message}`);
                    reject(new Error(`Plugin "${plugin.name}" isn't found.`));
                });
            });
        });
    }

    private _findIn(plugin: CommonInterfaces.Plugins.IPlugin, source: 'includes' | 'downloads'): Promise<string> {
        return new Promise((resolve, reject) => {
            const folder: string = source === 'includes' ? ServicePaths.getIncludedPlugins() : ServicePaths.getDownloads();
            const filename: string = path.resolve(folder, plugin.file);
            FS.exist(filename).then((exist: boolean) => {
                if (!exist) {
                    return reject(new Error(`Plugin "${filename}" isn't found.`));
                }
                resolve(filename);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    private _setupRemoteReleaseNotes(): Promise<Map<string, CommonInterfaces.Plugins.IPlugin>> {
        return new Promise((resolve, reject) => {
            ServiceElectronService.logStateToRender(`Getting plugin's store state.`);
            GitHubClient.getLatestRelease({ user: CSettings.user, repo: CSettings.repo }).then((release: IReleaseData) => {
                if (release.map === undefined) {
                    return reject(new Error(this._logger.warn(`Plugins-store repo doesn't have any assets in latest release.`)));
                }
                const filename: string = this._getRegisterFileName();
                const asset: GitHubAsset | undefined = release.map.get(filename);
                if (asset === undefined) {
                    return reject(new Error(this._logger.warn(`Fail to find "${filename}" in assets of latest release.`)));
                }
                asset.get().then((buf: Buffer) => {
                    try {
                        const list: CommonInterfaces.Plugins.IPlugin[] = JSON.parse(buf.toString());
                        if (!(list instanceof Array)) {
                            return reject(new Error(this._logger.warn(`Incorrect format of asseets`)));
                        }
                        const plugins: Map<string, CommonInterfaces.Plugins.IPlugin> = new Map();
                        list.forEach((plugin: CommonInterfaces.Plugins.IPlugin) => {
                            const valid: CommonInterfaces.Plugins.IPlugin | Error = getValidPluginReleaseInfo(plugin);
                            if (valid instanceof Error) {
                                this._logger.warn(`Fail to validate plugin: ${JSON.stringify(plugin)}`);
                            } else {
                                plugins.set(valid.name, valid);
                            }
                        });
                        ServiceElectronService.logStateToRender(`Information of last versions of plugins has been gotten`);
                        resolve(plugins);
                    } catch (e) {
                        return reject(new Error(this._logger.warn(`Fail parse asset to JSON due error: ${e.message}`)));
                    }
                }).catch((assetErr: Error) => {
                    this._logger.warn(`Fail get asset due error: ${assetErr.message}`);
                    reject(assetErr);
                });
            }).catch((error: Error) => {
                reject(new Error(this._logger.warn(`Fail get latest release due error: ${error.message}`)));
            });
        });
    }

    private _setupLocalReleaseNotes(): Promise<Map<string, CommonInterfaces.Plugins.IPlugin>> {
        return new Promise((resolve, reject) => {
            const local: string = path.resolve(ServicePaths.getIncludedPlugins(), this._getRegisterFileName());
            FS.exist(local).then((exist: boolean) => {
                if (!exist) {
                    return reject(new Error(`Fail to find local register "${local}"`));
                }
                FS.readTextFile(local).then((json: string) => {
                    try {
                        const list: CommonInterfaces.Plugins.IPlugin[] = JSON.parse(json);
                        if (!(list instanceof Array)) {
                            return reject(new Error(this._logger.warn(`Incorrect format of asseets`)));
                        }
                        const plugins: Map<string, CommonInterfaces.Plugins.IPlugin> = new Map();
                        list.forEach((plugin: CommonInterfaces.Plugins.IPlugin) => {
                            const valid: CommonInterfaces.Plugins.IPlugin | Error = getValidPluginReleaseInfo(plugin);
                            if (valid instanceof Error) {
                                this._logger.warn(`Fail to validate plugin: ${JSON.stringify(plugin)}`);
                            } else {
                                plugins.set(valid.name, valid);
                            }
                        });
                        ServiceElectronService.logStateToRender(`Information of last versions of plugins has been gotten`);
                        resolve(plugins);
                    } catch (e) {
                        return reject(new Error(this._logger.warn(`Fail parse asset to JSON due error: ${e.message}`)));
                    }
                }).catch((readErr: Error) => {
                    reject(readErr);
                });
            }).catch((exErr: Error) => {
                reject(exErr);
            });
        });
    }

    private _getRegisterFileName(): string {
        return CSettings.registerListFile.replace('{platform}', getPlatform(true));
    }

}
