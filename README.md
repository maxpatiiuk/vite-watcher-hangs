# Vite plugins

If `addWatchFile()` is called by a Vite plugin after the server is closed,
the watcher will be set, preventing Node.js process from exiting.

For example, if vite:css was in the middle of transforming a file when the
server is closed, vite:css may call `addWatchFile()` , which will hang the
process.

## Steps to reproduce

1. Clone this repository

   ```sh
   git clone https://github.com/maxpatiiuk/vite-watcher-hangs
   ```

2. Install dependencies

   ```sh
   cd vite-watcher-hangs
   cd vite-app
   npm install
   ```

3. Run the Vite server

   ```sh
   npx vite
   ```

4. See that the Node.js process does not exit after the server is closed

   - Comment out line 27 and see that the server exists correctly as this way
     the watcher is set before the server is closed.

## Explanation of the issue

Multiple built-in Vite plugins are setting watchers for files. For example,
`vite:css` plugin:

https://github.com/vitejs/vite/blob/0474550c9fe0b252536b8d1f5190b3aca8723b71/packages/vite/src/node/plugins/css.ts#L384

These watchers are set even if `server.watcher.close()` was called.

These watchers in turn prevent the Node.js process from exiting, hanging it.

Solutions:

- Make `PluginContext.addWatchFile()` a noop after the watcher is closed
- OR Add a check for watcher being closed before calling addWatchFile (error
  prone)

## Real-world example

I am starting Vite dev server inside Vitest global setup file. (Vite dev server is used for Puppeteer)

The Vite dev server is closed in the global teardown file.

If some test fails, the teardown is called early, while Vite dev server might
still be in the process of transforming a CSS file.

The vite:css plugin may set a file watcher, prevent Vitest from exiting.
Vitest prints this message:

```
close timed out after 10000ms
Tests closed successfully but something prevents Vite server from exiting
You can try to identify the cause by enabling "hanging-process" reporter. See https://vitest.dev/config/#reporters
```

The `hanging-process` reporter points to file system watchers set by vite:css
plugin.
