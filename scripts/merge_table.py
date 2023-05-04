#encoding:utf-8
import re, json, time, os, sys, pprint

working_path = "./"

char_data_github = json.load(open("character_table.github.json", encoding="utf-8"))
char_data_fux = json.load(open("character_table.fux.json", encoding="utf-8"))

# copy_keys = ["activityPotentialItemId", "groupId", "teamId", "tokenKey", "allSkillLvlup"]

for ch in char_data_fux.keys():
    print(ch)
    if "favorKeyFrames" in char_data_github[ch]:
        char_data_fux[ch]["favorKeyFrames"] = char_data_github[ch]["favorKeyFrames"]
    for i in range(0, len(char_data_fux[ch]["phases"])):
        char_data_fux[ch]["phases"][i]["attributesKeyFrames"] = char_data_github[ch]["phases"][i]["attributesKeyFrames"]
        
json.dump(char_data_fux, open("character_table.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("ok.")
