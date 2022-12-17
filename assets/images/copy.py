#encoding: utf-8
import os, sys, shutil

for fn in sorted(os.listdir("skin2")):
    filename = fn.split(".")[0]
    if len(filename) > 0:
        filename = filename.replace("@", "_").replace("#", "_")
        parts = filename.split("_")
        prefix = "_".join(parts[:3])
        newname = prefix + ".png"
        print(f"skin2/{fn} -> char/{newname}")
        shutil.copyfile(f"skin2/{fn}", f"char/{newname}")
