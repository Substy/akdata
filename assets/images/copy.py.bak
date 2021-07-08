#encoding: utf-8
import os, sys, shutil

for fn in sorted(os.listdir("skin2")):
    cn = fn.split("#")[0]
    if "@" in fn:
        cn = fn.split("@")[0]
    print(f"skin2/{fn} -> char/{cn}.png")
    shutil.copyfile(f"skin2/{fn}", f"char/{cn}.png")
