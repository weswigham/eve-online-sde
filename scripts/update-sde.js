"use strict";
const scrapeIt = require("scrape-it");
const unzip = require("unzipper");
const rimraf = require("rimraf");
const url = require("url");

scrapeIt("https://developers.eveonline.com/resource/resources", {
    sde_link: { selector: ".content > h3:nth-child(4) + ul li:last-child a", attr: "href" },
    versioned_filename: { selector: ".content > h3:nth-child(6) + ul li:last-child a", attr: "href" }
}).then(scrape => {
    const link = scrape.sde_link;
    const versionedFilename = scrape.versioned_filename;
    if (typeof link !== "string" || typeof versionedFilename !== "string") throw new Error("Couldn't scrape SDE link!");
    const captures = versionedFilename.match(/YC-(\d+)-(\d+)_(\d+)\.(\d+)/);
    const year = captures[1],
        month = captures[2],
        major = captures[3],
        minor = captures[4];
    const version = `${year}.${month}.${major}-${minor}`;
    const current = require("../package.json").version;
    if (version === current) return console.log(`Already at version ${version}, not redownloading SDE.`);

    const https = require("https");
    const fs = require("fs");

    console.log(`Removing existing sde.zip, if it exists...`);
    try { fs.unlinkSync("sde.zip"); } catch(e) {} // Attempt to remove existing sde zip
    const file = fs.createWriteStream("sde.zip");

    console.log(`Downloading ${link} as sde.zip...`);
    const request = https.get(link, response => {
        let size = 0;
        const responseSize = response.headers["content-length"];
        console.log(`Response size is ${responseSize} bytes.`);
        response.on("data", buf => {
            size += buf.length;
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(`Downloaded ${size}/${responseSize} bytes (${(size/responseSize * 100).toFixed(2)}%)...`);
        });
        response.pipe(file);
    });
    file.on("finish", () => {
        console.log();
        console.log(`Done downloading!`);

        console.log(`Removing existing "sde" folder.`);
        rimraf.sync("sde");
        console.log(`Extracting downloaded zip...`);
        const dest = unzip.Extract({ path: "." });
        fs.createReadStream("sde.zip").pipe(dest);
        dest.on("close", () => {
            console.log(`Extraction complete!`);
            console.log(`Updating package.json...`);
            const p = require("../package.json");
            p.version = version;
            fs.writeFileSync(require("path").join(__dirname, "../package.json"), JSON.stringify(p, null, 2));
            console.log(`Done! SDE Upgrade complete!`);
        });
    });
}).catch(err => console.error(err));