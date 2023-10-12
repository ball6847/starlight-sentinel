import * as fs from "https://deno.land/std@0.203.0/fs/mod.ts";
import { relative, resolve } from "https://deno.land/std@0.203.0/path/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.25.7/mod.ts";

type VendorConfig = {
  vendor: Record<string, {
    root: string;
    entrypoint: string;
    copy?: Record<string, string>;
    imports?: Record<string, string>;
  }>;
};

async function getVendorConfig(): Promise<VendorConfig> {
  const vendorConfigStr = await Deno.readTextFile("./vendor.json");
  const vendorConfig = JSON.parse(vendorConfigStr);
  return vendorConfig;
}

function getPkgDir(pkg: string, cfg: VendorConfig) {
  return resolve(cfg.vendor[pkg].root);
}

async function generateDenoConfig(pkg: string, cfg: VendorConfig) {
  // TODO: deno.json, deno.jsonc auto detect
  const denoJsonStr = await Deno.readTextFile("./deno.json");
  const denoJson = JSON.parse(denoJsonStr);
  delete denoJson["lint"];
  delete denoJson["format"];
  delete denoJson["tasks"];

  const dir = getPkgDir(pkg, cfg);

  for (const [alias, dest] of Object.entries<string>(denoJson.imports)) {
    if (!dest.startsWith("https://")) {
      const newDest = relative(dir, resolve(dest));
      console.log(
        `Updating new destination for alias "${alias}": "${newDest}"`,
      );
      // TODO: would be good if we can bundle local deps to vendor folder
      denoJson.imports[alias] = newDest;
    }
  }

  await Deno.writeTextFile(
    `${dir}/deno.json`,
    JSON.stringify(denoJson, null, 2),
  );
}

async function rewriteImportMap(pkg: string, cfg: VendorConfig) {
  const dir = getPkgDir(pkg, cfg);

  if (cfg.vendor[pkg].imports) {
    const { imports } = cfg.vendor[pkg];
    if (imports) {
      const importMapStr = await Deno.readTextFile(
        `${dir}/vendor/import_map.json`,
      );
      const importMap = JSON.parse(importMapStr);
      for (const [alias, dest] of Object.entries<string>(imports)) {
        importMap.imports[alias] = dest;
      }
      await Deno.writeTextFile(
        `${dir}/vendor/import_map.json`,
        JSON.stringify(importMap, null, 2),
      );
    }
  }
}

new Command()
  .command("build", "Get deno app ready for docker deployment")
  .option("--pkg <value:string>", "Package to build", {
    required: true,
  })
  .action(async (option) => {
    const config = await getVendorConfig();
    const { pkg } = option;

    if (!Object.keys(config.vendor).includes(pkg)) {
      throw new Error(`Package "${pkg}" not found in vendor.json`);
    }

    await generateDenoConfig(pkg, config);

    const pkgDir = getPkgDir(pkg, config);

    try {
      await Deno.remove(`${pkgDir}/vendor`, { recursive: true });
    } catch (error) {
    }

    const cmd = new Deno.Command("deno", {
      cwd: pkgDir,
      args: [
        "vendor",
        resolve(pkgDir, config.vendor[pkg].entrypoint),
      ],
    });

    cmd.outputSync();

    const cwd = Deno.cwd();

    // copy files to package dir if specified
    if (config.vendor[pkg].copy) {
      const { copy } = config.vendor[pkg];
      if (copy) {
        for (const [src, dest] of Object.entries(copy)) {
          await fs.copy(resolve(cwd, src), resolve(pkgDir, dest), {
            overwrite: true,
          });
        }
      }
    }

    await rewriteImportMap(pkg, config);
  })
  .parse(Deno.args);
