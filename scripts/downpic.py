#encoding: utf-8
import json, urllib.request, os, sys, time, random

gamedata_path = "../resources/gamedata/excel"
workpath = "../assets/images/"
f = open(gamedata_path + "/character_table.json", "r", encoding="utf-8")
skinf = open(gamedata_path + "/skin_table.json", "r", encoding="utf-8")
chardb = json.load(f)
skindb = json.load(skinf)
names = list(chardb.keys())
names.append("char_1001_amiya2");

total = len(names)
success = 0
skip = 0
error = 0

# os.system("pause")

def save(fname, url, dry_run=False):
    fname = workpath + fname
    if (os.path.exists(fname)):
        return "skipped"
    else:
        try:
            sys.stdout.write(url + "...")
            if not dry_run:
                req = urllib.request.Request(url)
                req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36")
                req.add_header("Referer", "https://www.kokodayo.fun/")
                
                img = urllib.request.urlopen(req).read()
                with open(fname, "wb") as fi:
                    fi.write(img)
            return "ok"
        except urllib.error.HTTPError as e:
            print(e)
            return "error"

for ch in sorted(names):
    filename = "char/%s.png" % ch
    url = "https://andata.somedata.top/dataX/char/profile/%s.png" % ch

    result = save(filename, url)
    if result == "ok":
        sys.stdout.write("%s -> %s ..." % (ch, filename))
        print(result)
        success += 1
    elif result == "skipped":
        skip += 1
    elif result == "error":
        sys.stdout.write("%s -> %s ..." % (ch, filename))
        print(result)
        error += 1
print("total %d, success %d, skip %d, error %d\n" % (total, success, skip, error))
success = skip = error = 0
total = len(skindb["charSkins"].keys())

for sk in sorted(skindb["charSkins"].keys()):
    if sk.endswith("#1") and not ("@" in sk):
        continue
    filename = "skin/%s.png" % sk
    filename2 = "skin2/%s.png" % sk
    avatar = skindb["charSkins"][sk]["avatarId"]
    url = "https://andata.somedata.top/dataX/char/halfPic/%s.png" % avatar.replace("#", "%23")
    url2 = "https://andata.somedata.top/dataX/char/profile/%s.png" % avatar.replace("#", "%23")
    result = save(filename, url, False)
    save(filename2, url2, False)
    if result == "ok":
        sys.stdout.write("%s -> %s ..." % (sk, filename))
        print(result)
        success += 1
    elif result == "skipped":
        skip += 1
    elif result == "error":
        sys.stdout.write("%s -> %s ..." % (sk, filename))
        print(result)        
        error += 1
print("total %d, success %d, skip %d, error %d" % (total, success, skip, error))
