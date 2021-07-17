#encoding:utf-8
import re, json, time, os, sys, pprint
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as conds

working_path = "./"

char_data = json.load(open("character_table.json", encoding="utf-8"))
anim_data = {}
if os.path.exists("dps_anim.json"):
    anim_data = json.load(open("dps_anim.json", encoding="utf-8"))
char_data["char_1001_amiya2"] = { "name": "阿米娅(近卫)" }

# name = sys.argv[1]

browser = webdriver.Chrome()

def wait_class(classname, timeout=60):
    wait = WebDriverWait(browser, timeout)
    wait.until(conds.presence_of_element_located((By.CLASS_NAME, classname)))
    
def fetch(name):
    print(name)
    browser.get('http://prts.wiki/w/' + name)
    # 等待模型按钮载入
    wait_class("MuiButtonBase-root")
    # 点击显示模型
    browser.find_element_by_class_name("MuiButtonBase-root").click()
    wait_class("MuiBadge-root")
    # 点击动画长度
    btn_info = browser.find_element_by_xpath('//*[@id="root"]/div/div/div[1]/div[1]/div[6]/button[3]')
    # print(btn_info.get_attribute("aria-label"))
    btn_info.click()
    wait_class("MuiDialogTitle-root")
    wait_class("MuiTable-root")
    time.sleep(1)
    target_title = browser.find_element_by_class_name("MuiDialogTitle-root").text
    target_table = browser.find_element_by_class_name("MuiTable-root").get_attribute("innerHTML")

    soup = BeautifulSoup(target_table, "html.parser")
    result = {}
    for tr in soup.find_all("tr"):
        row = []
        #for th in tr.find_all("th"):
        #    row.append(th.get_text())
        for td in tr.find_all("td"):
            row.append(td.get_text())
        if len(row)>0: result[row[0]] = int(row[2])
    result["tag"] = target_title
    pprint.pprint(result)
    return result

for ch in char_data.keys():
    if ch in anim_data.keys(): continue
    anim_data[ch] = fetch(char_data[ch]["name"])
    with open(os.path.join(working_path, "dps_anim.json"), "w", encoding="utf-8") as f:
        f.write("{\n")
        for k in anim_data.keys():
            f.write(f'  "{k}": {json.dumps(anim_data[k], ensure_ascii=False)},\n')
        f.write('  "stub": {}\n}\n')   
