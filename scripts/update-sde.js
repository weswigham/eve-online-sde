"use strict";
const scrapeIt = require("scrape-it");
const unzip = require("unzipper");
const rimraf = require("rimraf");
const url = require("url");

function nowInEVETime(namestring) {
    const now = new Date();
    const year = now.getUTCFullYear() - 2017 + 119; // 2017 is YC 119
    const month = now.getUTCMonth() + 1; // HAHA, 0-indexed months
    const day = now.getUTCDate();
    return `${year}.${month}.${day}+${namestring}`;
}

function versionAsDate(versionstring) {
    const parts = versionstring.split("+")[0].split(".");
    const now = new Date();
    return new Date(`${Number(parts[1])}/${Number(parts[2])}/${Number(parts[0]) - 119 + 2017} ${now.getHours()}:${now.getMinutes()}`); // mm/dd/yyyy hh:ss - (the hh:ss set to the current hour/second is just to prevent multiple updates in the same day)
}

scrapeIt("https://developers.eveonline.com/resource/resources", {
    sde_link: { selector: ".content > ul:nth-child(4) > li:first-child > a", attr: "href" },
    versioned_filename: { selector: ".content > h3:nth-child(6) + ul li:last-child a", attr: "href" }
}).then(scrape => {
    const link = scrape.sde_link || "https://eve-static-data-export.s3-eu-west-1.amazonaws.com/tranquility/sde.zip";
    const versionedFilename = scrape.versioned_filename;
    if (typeof link !== "string" || typeof versionedFilename !== "string") throw new Error("Couldn't scrape SDE link!");
    const filename = require("path").basename(require("url").parse(versionedFilename).pathname);
    const processedVersionName = filename.substring(0, filename.length - "_Types.zip".length).replace(/_/g, "-") // Remove _Types.zip - in practice, CCP doesn't update the asset dumps very often nowadays, unfortunately, so this mostly just marks the last time assets got dumped
    const current = require("../package.json").version;
    const lastVersionDate = versionAsDate(current);
    const version = nowInEVETime(processedVersionName);

    const https = require("https");
    const fs = require("fs");
    const readline = require("readline");

    console.log(`Removing existing sde.zip, if it exists...`);
    try { fs.unlinkSync("sde.zip"); } catch(e) {} // Attempt to remove existing sde zip
    const file = fs.createWriteStream("sde.zip");

    const lastUpdateStr = lastVersionDate.toUTCString();
    console.log(`Downloading ${link} as sde.zip if newer than ${lastUpdateStr}...`);
    const request = https.get(link, {
        headers: {
            "If-Modified-Since": lastUpdateStr
        }
    }, response => {
        if (response.statusCode === 304) {
            // Not modified
            console.log(`SDE not modified since ${lastVersionDate.toUTCString()}, nothing to do.`);
            return;
        }
        console.log(`Last SDE update: ${response.headers["last-modified"]}`);
        let size = 0;
        const responseSize = response.headers["content-length"];
        console.log(`Response size is ${responseSize} bytes.`);
        response.on("data", buf => {
            size += buf.length;
            readline.clearLine(process.stdout);
            readline.cursorTo(process.stdout, 0);
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
