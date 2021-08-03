import * as fs from "fs";
import { skel2Json } from "./Spine/skel2Json.js";

//var filename = process.argv[2];
// console.log(filename);

function toFrame(x) { return Math.round(x * 3000) / 100; }

var files = fs.readdirSync("./TextAsset");
var result = {};

files.forEach(f => {
    var charId = f.split(".")[0];
    // console.log(f, charId);

    var bytes = fs.readFileSync(`./TextAsset/${f}`);
    try {
        var j = skel2Json(bytes);
        // console.log(JSON.stringify(j, null, 2));
        var events = {};
        Object.keys(j.animations).forEach(a => {
            events[a] = { events: j.animations[a].events, duration: j.animations[a].duration };
        });
        // console.log(JSON.stringify(events, null, 2));
        if (!result[charId]) result[charId] = {};
        Object.assign(result[charId], events);
        console.log(`${f} -> ${charId}`);
    } catch (e) {
        console.log(e);
        console.log("------");
    }
});

// simplify result
var result2 = {};
Object.keys(result).forEach(ch => {
    var item = result[ch];
    result2[ch] = {};
    Object.keys(item).forEach(anim => {
        if (item[anim].events) {
            result2[ch][anim] = { duration: toFrame([item[anim].duration]) };
            item[anim].events.forEach(ev => {
                result2[ch][anim][ev.name] = toFrame(ev.time);
            });
        } else {
            result2[ch][anim] = toFrame(item[anim].duration);
        }
    });
}); 

fs.writeFileSync("dps_anim.json", JSON.stringify(result2, null, 2));

