import { CancelablePromise } from 'platform/env/promise';
import { Instance as Logger } from 'platform/env/logger';
import { files } from 'rustcore';

import * as Requests from 'platform/ipc/request';

export const handler = Requests.InjectLogger<
    Requests.File.Checksum.Request,
    CancelablePromise<Requests.File.Checksum.Response>
>(
    (
        log: Logger,
        request: Requests.File.Checksum.Request,
    ): CancelablePromise<Requests.File.Checksum.Response> => {
        return new CancelablePromise((resolve) => {
            files
                .checksum(request.filename)
                .then((hash) => {
                    resolve(
                        new Requests.File.Checksum.Response({
                            hash,
                            error: undefined,
                        }),
                    );
                })
                .catch((err: Error) => {
                    resolve(
                        new Requests.File.Checksum.Response({
                            hash: undefined,
                            error: err.message,
                        }),
                    );
                });
        });
    },
);
