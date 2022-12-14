---
title: DPS计算器
withjs: true
order: 1
category: 计算器
icon: calculator
new: true
---
<p class="mb-1">
<span id="update_prompt">
如果不能正常显示，可以在“测试页”进行检测。推荐使用Chrome浏览器。
</span>
    <button id="btn_update_data" type="button" class="btn btn-primary" onclick="AKDATA.reload();">更新数据</button>
    <button id="btn_whatsnew" type="button" class="btn btn-warning">更新日志</button>
    <button id="btn_report" type="button" class="btn btn-info">问题反馈</button>
</p>
<div class="progress progress-striped progress-bar-animated">
    <div class="progress-bar" role="progressbar" id="prg_load" style="width:0%"> </div>
</div>
