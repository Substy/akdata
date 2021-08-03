#encoding:utf-8

import os, sys, re, shutil

workpath = "./MonoBehaviour"
savepath = "./MonoBehaviour_1"

for f in os.listdir(workpath):
    with open(os.path.join(workpath, f), "r") as fi:
        lines = fi.readlines()
        key_lines = [x for x in lines if "buffKey" in x or "projectileKey" in x]
        if len(key_lines) > 0:
            # e.g. string buffKey = "nian_s_1"
           # print(f)
            buff_key = re.search("\"(.*)\"", key_lines[0])
            if (buff_key):
                g = buff_key.group(1) + "_" + f
                print(f"{f} -> {g}")
                try:
                    shutil.copyfile(os.path.join(workpath, f), os.path.join(savepath, g))
                except:
                    print(f"{f} -> buff_key [Error]")