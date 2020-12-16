#encoding: utf-8
import json, urllib.request, os, sys, time

gamedata_path = "../../resources/gamedata/excel"
f = open(gamedata_path + "/character_table.json", "r", encoding="utf-8")
chardb = json.load(f)
names = list(chardb.keys())
names.append("char_1001_amiya2");

total = len(names)
success = 0
skip = 0
error = 0

for ch in names:
    filename = "char/%s.png" % ch
    url = "https://andata.somedata.top/dataX/char/profile/%s.png" % ch
    sys.stdout.write("%s ..." % ch)
    if (os.path.exists(filename)):
        print("skipped")
        skip+=1
    else:
        try:
            img = urllib.request.urlopen(url).read()
            with open(filename, "wb") as fi:
                fi.write(img)
            print("ok")
            success+=1
        except urllib.error.HTTPError as e:
            print(e)
            error+=1
        time.sleep(0.5)    
print("total %d, success %d, skip %d, error %d" % (total, success, skip, error))

