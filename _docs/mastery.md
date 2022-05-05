---
title: 专精收益计算器
withjs: true
order: 2
category: 计算器
icon: calculator
---
<p class="mb-1">
    <span id="vue_version">正在载入游戏数据，请耐心等待……</span>
    <button id="btn_update_data" type="button" class="btn btn-primary" onclick="AKDATA.reload();">清除缓存</button>
    <button id="btn_whatsnew" type="button" class="btn btn-warning">更新日志</button>
    <button id="btn_report" type="button" class="btn btn-info">问题反馈</button>
</p>
<div class="progress progress-striped progress-bar-animated">
    <div class="progress-bar" role="progressbar" id="prg_load" style="width:0%"> </div>
</div>