var scrapeIt = require("scrape-it");
var unzip = require("unzip");
var rimraf = require("rimraf");
var url = require("url");

scrapeIt("https://developers.eveonline.com/resource/resources", {
    sde_link: { selector: ".content > h3:nth-child(4) + ul li:last-child a", attr: "href" },
    versioned_filename: { selector: ".content > h3:nth-child(6) + ul li:last-child a", attr: "href" }
}).then(scrape => {
    var link = scrape.sde_link;
    var versionedFilename = scrape.versioned_filename;
    if (typeof link !== "string" || typeof versionedFilename !== "string") throw new Error("Couldn't scrape SDE link!");
    var captures = versionedFilename.match(/YC-(\d+)-(\d+)_(\d+)\.(\d+)/);
    var year = captures[0],
        month = captures[1],
        major = captures[2],
        minor = captures[3];
    var version = `${year}.${month}.${major}.${minor}`;
    var current = require("../package.json").version;
    if (version === current) return console.log(`Already at version ${version}, not redownloading SDE.`);

    var https = require('https');
    var fs = require('fs');

    console.log(`Removing existing sde.zip, if it exists...`);
    try { fs.unlinkSync("sde.zip"); } catch(e) {} // Attempt to remove existing sde zip
    var file = fs.createWriteStream("sde.zip");

    console.log(`Downloading ${link} as sde.zip...`);
    var request = https.get(link, response => {
        var size = 0;
        var responseSize = response.headers["content-length"];
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
        var dest = unzip.Extract({ path: "." });
        fs.createReadStream("sde.zip").pipe(dest);
        dest.on("close", () => {
            console.log(`Extraction complete!`);
            console.log(`Updating package.json...`);
            var package = require("../package.json");
            package.version = version;
            fs.writeFileSync(require("path").join(__dirname, "../package.json"), JSON.stringify(package, null, 2));
            console.log(`Done! SDE Upgrade complete!`);
        });
    });
}).catch(err => console.error(err));