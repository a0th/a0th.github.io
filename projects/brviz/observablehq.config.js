import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const tocSidebar = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "src/components/toc-sidebar.js"),
  "utf8",
).replace(/^export /m, "");


export default {
  title: "brviz",
  root: "src",
  style: "style.css",
  pager: false,
  footer: "World Bank WDI · Observable Framework",
  base: process.env.BRVIZ_BASE || "/",
  head: `<script>document.querySelector('meta[name="viewport"]')?.setAttribute("content","width=device-width, initial-scale=1")</script>
<script type="module">
${tocSidebar}
mountTocSidebar();
</script>`,
};
