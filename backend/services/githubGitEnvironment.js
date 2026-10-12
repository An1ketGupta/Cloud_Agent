// GitHub's HTTPS Git protocol uses the access token as a Basic-auth password.
// Pass it only through the exec environment, never in a URL, argument, or config file.
export function githubGitEnvironment(token) {
    const credentials = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
    return ["GIT_TERMINAL_PROMPT=0", "GIT_CONFIG_COUNT=2",
        "GIT_CONFIG_KEY_0=http.https://github.com/.extraheader",
        `GIT_CONFIG_VALUE_0=AUTHORIZATION: basic ${credentials}`,
        "GIT_CONFIG_KEY_1=credential.helper", "GIT_CONFIG_VALUE_1="];
}
