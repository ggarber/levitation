import { execSync } from 'child_process';
import process from 'process';

export const DEFAULT_METADATA = {
    ideName: "antigravity",
    apiKey: "ya29.a0ATkoCc7naaZ2zlKZWJSIsNBdfBhqzGJUzwiuIeJqT9qB0dSWg9R4T_HM8reA8wH34AFtELcNipcjxXEOOQS98yyzATonU1udlklFqg-da9ahaZbaSqyMNj9A2HqFzVZv7bqz5lgcFxkjORNjVt2fWr2_9pxrG4vdKjiP4WNOTvyk1DrDKQ03z1TePyhnKNQHjmz_aAsgI4x1VgaCgYKAeQSARYSFQHGX2MiJbRYCiyvx2XGvqJ_SM2W-A0213",
    locale: "en",
    ideVersion: "1.18.4",
    extensionName: "antigravity"
};

export function getProcessDetails(pid: string): { name: string; csrfToken: string } {
    try {
        const fullCommand = execSync(`ps -ww -p ${pid} -o command=`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
        if (!fullCommand) return { name: 'unknown', csrfToken: '' };

        const parts = fullCommand.split(' ');
        const executablePath = parts[0] || '';
        const name = executablePath.split('/').pop() || executablePath || 'unknown';

        let csrfToken = '';
        const csrfIndex = parts.indexOf('--csrf_token');
        if (csrfIndex !== -1 && parts[csrfIndex + 1]) {
            csrfToken = parts[csrfIndex + 1] || '';
        }

        return { name, csrfToken };
    } catch {
        return { name: 'unknown', csrfToken: '' };
    }
}

function getLanguageServerProcesses() {
    try {
        const output = execSync('lsof -i -n -P | grep LISTEN').toString();
        const lines = output.split('\n');

        const pidToDetails: Record<string, { name: string; csrfToken: string }> = {};

        return lines
            .filter((line: string) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 9) return false;

                const command = parts[0];
                const address = parts[8];

                return command && command.startsWith('language_') && address && address.startsWith('127.0.0.1');
            })
            .map((line: string) => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[1] || 'unknown';
                const address = parts[8] || '';
                const port = address.split(':')[1] || 'unknown';

                if (pid !== 'unknown' && !pidToDetails[pid]) {
                    pidToDetails[pid] = getProcessDetails(pid);
                }

                return {
                    pid,
                    port,
                    name: pidToDetails[pid]?.name || 'unknown',
                    csrfToken: pidToDetails[pid]?.csrfToken || ''
                };
            });
    } catch (error) {
        if ((error as any).status === 1) return [];
        throw error;
    }
}

export async function EnumerateWorkspaces(verbose: boolean = false) {
    const processes = getLanguageServerProcesses();
    const enrichedProcesses = await Promise.all(processes.map(async (p: any) => {
        try {
            const workspaceInfo = await GetWorkspaceInfosData(p.port, verbose);
            if (workspaceInfo && workspaceInfo.workspaceInfos && workspaceInfo.workspaceInfos.length > 0) {
                const workspaceUri = workspaceInfo.workspaceInfos[0].workspaceUri;
                const workspaceName = workspaceUri.split('/').filter(Boolean).pop() || 'unknown';
                if (workspaceName !== 'unknown') {
                    return { ...p, workspaceName, workspaceUri };
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }));
    return enrichedProcesses.filter((p): p is any => p !== null);
}

export async function makeLanguageServerRequest(endpoint: string, port?: string, body: string = '{}', verbose: boolean = false): Promise<any> {
    let targetPort = port;
    let csrfToken = '';

    const processes = getLanguageServerProcesses();
    if (!targetPort) {
        if (processes.length > 0) {
            targetPort = processes[0]?.port;
            if (verbose) console.log(`No port specified, using port of first process found: ${targetPort}`);
        }
    } else {
        if (verbose) console.log(`Using specified port: ${targetPort}`);
    }

    const matchingProcess = processes.find(p => p.port === targetPort);
    if (matchingProcess?.csrfToken) {
        csrfToken = matchingProcess.csrfToken;
        if (verbose) console.log(`Using CSRF token extracted from process: ${csrfToken}`);
    }

    if (!targetPort) {
        throw new Error('No language_* process found and no port specified.');
    }

    const url = `https://127.0.0.1:${targetPort}/exa.language_server_pb.LanguageServerService/${endpoint}`;

    const headers = {
        'content-type': 'application/json',
        'x-codeium-csrf-token': csrfToken
    };

    if (verbose) {
        console.log(`\x1b[35m[DEBUG] Request URL: ${url}\x1b[0m`);
        console.log(`\x1b[35m[DEBUG] Request Headers: ${JSON.stringify(headers, null, 2)}\x1b[0m`);
        console.log(`\x1b[35m[DEBUG] Request Body: ${body}\x1b[0m`);
    }

    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Request failed with status ${res.status}: ${text}`);
        }

        const data = await res.json();
        if (verbose) {
            console.log(`\x1b[35m[DEBUG] Response Body: ${JSON.stringify(data, null, 2)}\x1b[0m`);
        }
        return data;
    } finally {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
}

export async function makeConnectLanguageServerRequest(endpoint: string, body: Buffer, port?: string, verbose: boolean = false): Promise<any> {
    let targetPort = port;
    let csrfToken = '';

    const processes = getLanguageServerProcesses();
    if (!targetPort) {
        if (processes.length > 0) {
            targetPort = processes[0]?.port;
            if (verbose) console.log(`No port specified, using port of first process found: ${targetPort}`);
        }
    } else {
        if (verbose) console.log(`Using specified port: ${targetPort}`);
    }

    const matchingProcess = processes.find(p => p.port === targetPort);
    if (matchingProcess?.csrfToken) {
        csrfToken = matchingProcess.csrfToken;
        if (verbose) console.log(`Using CSRF token extracted from process: ${csrfToken}`);
    }

    if (!targetPort) {
        throw new Error('No language_* process found and no port specified.');
    }

    const url = `https://127.0.0.1:${targetPort}/exa.language_server_pb.LanguageServerService/${endpoint}`;

    const headers = {
        'content-type': 'application/connect+json',
        'x-codeium-csrf-token': csrfToken
    };

    if (verbose) {
        console.log(`\x1b[35m[DEBUG] Request URL: ${url}\x1b[0m`);
        console.log(`\x1b[35m[DEBUG] Request Headers: ${JSON.stringify(headers, null, 2)}\x1b[0m`);
        console.log(`\x1b[35m[DEBUG] Request Body (Connect Protocol Binary): ${body.length} bytes\x1b[0m`);
    }

    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch(url, {
            method: 'POST',
            headers: (headers as any),
            body: body as any
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Request failed with status ${res.status}: ${text}`);
        }

        const text = await res.text();
        const startIndex = text.indexOf('{');
        if (startIndex === -1) {
            throw new Error('No JSON found in response');
        }

        // Connect streams can have multiple JSON objects, each with a header. 
        // We'll just take the first one as requested.
        let firstJsonObject = '';
        let braceCount = 0;
        let started = false;

        for (let i = startIndex; i < text.length; i++) {
            const char = text[i];
            if (char === '{') {
                braceCount++;
                started = true;
            } else if (char === '}') {
                braceCount--;
            }

            if (started) {
                firstJsonObject += char;
                if (braceCount === 0) break;
            }
        }

        const data = JSON.parse(firstJsonObject);
        if (verbose) {
            console.log(`\x1b[35m[DEBUG] Parsed Response JSON: ${JSON.stringify(data, null, 2)}\x1b[0m`);
        }
        return data;
    } finally {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
}

export async function GetAllCascadeTrajectoriesData(port?: string, verbose: boolean = false) {
    return makeLanguageServerRequest('GetAllCascadeTrajectories', port, '{}', verbose);
}

export async function GetAllWorkflowsData(port?: string, verbose: boolean = false) {
    return makeLanguageServerRequest('GetAllWorkflows', port, '{}', verbose);
}

export async function GetWorkspaceInfosData(port?: string, verbose: boolean = false) {
    return makeLanguageServerRequest('GetWorkspaceInfos', port, '{}', verbose);
}

export async function StartCascadeData(port?: string, verbose: boolean = false) {
    const body = {
        metadata: DEFAULT_METADATA,
        source: "CORTEX_TRAJECTORY_SOURCE_CASCADE_CLIENT"
    };
    return makeLanguageServerRequest('StartCascade', port, JSON.stringify(body), verbose);
}

export async function SendUserCascadeMessageData(text: string, cascadeId: string, port?: string, verbose: boolean = false) {
    const body = {
        cascadeId,
        items: [{ text }],
        metadata: DEFAULT_METADATA,
        cascadeConfig: {
            plannerConfig: {
                conversational: {
                    plannerMode: "CONVERSATIONAL_PLANNER_MODE_DEFAULT",
                    agenticMode: false
                },
                toolConfig: {
                    runCommand: {
                        autoCommandConfig: {
                            autoExecutionPolicy: "CASCADE_COMMANDS_AUTO_EXECUTION_EAGER"
                        }
                    },
                    notifyUser: {
                        artifactReviewMode: "ARTIFACT_REVIEW_MODE_TURBO"
                    }
                },
                requestedModel: {
                    model: "MODEL_PLACEHOLDER_M18"
                }
            }
        }
    };
    return makeLanguageServerRequest('SendUserCascadeMessage', port, JSON.stringify(body), verbose);
}

export async function StreamCascadeReactiveUpdatesData(cascadeId: string, port?: string, verbose: boolean = false) {
    const payload = {
        protocolVersion: 1,
        id: cascadeId,
        subscriberId: "levitation"
    };
    const jsonBody = JSON.stringify(payload);
    const header = Buffer.alloc(5);
    header.writeUInt8(0, 0); // flags
    header.writeUInt32BE(jsonBody.length, 1); // length
    const body = Buffer.concat([header, Buffer.from(jsonBody)]);

    return makeConnectLanguageServerRequest('StreamCascadeReactiveUpdates', body, port, verbose);
}

export async function GetCascadeTrajectoryData(cascadeId: string, port?: string, verbose: boolean = false) {
    const body = {
        cascadeId,
        verbosity: "CLIENT_TRAJECTORY_VERBOSITY_PROD_UI"
    };
    return makeLanguageServerRequest('GetCascadeTrajectory', port, JSON.stringify(body), verbose);
}

export async function CancelCascadeInvocationData(cascadeId: string, port?: string, verbose: boolean = false) {
    const body = { cascadeId };
    return makeLanguageServerRequest('CancelCascadeInvocation', port, JSON.stringify(body), verbose);
}

export async function HandleCascadeUserInteractionData(cascadeId: string, interaction: any, port?: string, verbose: boolean = false) {
    const body = {
        cascadeId,
        interaction
    };
    return makeLanguageServerRequest('HandleCascadeUserInteraction', port, JSON.stringify(body), verbose);
}

