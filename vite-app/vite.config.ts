import { defineConfig, type ViteDevServer } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "make-scss-take-longer",
      configResolved(config) {
        const viteCssPlugin = config.plugins.find(
          (plugin) => plugin.name === "vite:css"
        )!;
        const transform =
          viteCssPlugin.transform as typeof viteCssPlugin.transform & Function;
        viteCssPlugin.transform = async function (code, id) {
          if (!id.endsWith(".scss")) {
            return;
          }

          console.log(
            "Delaying CSS transform by 4s to ensure server is closed before transform completes"
          );
          /**
           * This line is needed to consistently reproduce the issue. In my
           * production app the bug happens without any delays.
           *
           * Commenting out this timeout line will exit the process correctly.
           */
          await new Promise((resolve) => setTimeout(resolve, 4000));
          console.log("Active resources before CSS transform:");
          console.log(process.getActiveResourcesInfo());
          const result = await transform.call(this, code, id);
          console.log("Active resources after CSS transform:");
          console.log(process.getActiveResourcesInfo());
          return result;
        };
      },
      configureServer(server) {
        void run(server);
      },
    },
  ],
});

async function run(server: ViteDevServer) {
  console.log("Waiting 1s to ensure Vite server is fully started");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Starting index.html transform");
  void server.transformIndexHtml(
    "index.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + TS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
  );
  console.log(
    "Waiting 1s to ensure transform() is called before closing the server"
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(process.getActiveResourcesInfo());
  console.log("Close the server");
  await server.close();
  console.log(
    "Server is closed BUT node.js process is still running because of the watcher set by vite:css plugin"
  );
  console.log(process.getActiveResourcesInfo());
}
