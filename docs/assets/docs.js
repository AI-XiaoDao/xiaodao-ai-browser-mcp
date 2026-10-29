(function () {
  'use strict';

var MCP = { version: '3.3.6' };

  // 标准 MCP over stdio 接入: 命令填 exe 路径, 参数 --mcp-stdio; 不涉及端口/HTTP
  // ⚠ v3.3.2: 这里**故意不写死任何路径**。本常量会被 applyStatic() 渲染进页面上的
  //   #cursorConfig 代码块(用户点"复制客户端配置"复制的就是它), 而写死
  //   'D:/你的解压路径/AI-Fbowser-Mcp.exe' 会让用户原样粘贴一个不存在的路径 —— 这是
  //   新手第一卡点。正确做法: 双击 AI-Fbowser-Mcp.exe, 或运行
  //   `AI-Fbowser-Mcp.exe --print-config`(等义 --dump-config), 程序会按**本机真实
  //   exe 绝对路径**打印好同一段 JSON; 该模式下不启动服务、不建浏览器、不占桌面。
  var CLIENT_CONFIG = {
    mcpServers: {
      'ai-browser': {
        command: '<本机 exe 真实完整路径 —— 用 --print-config 的输出替换本行>',
        args: ['--mcp-stdio']
      }
    }
  };

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return document.querySelectorAll(sel); }

  function applyStatic() {
    document.querySelectorAll('[data-dynamic]').forEach(function (el) {
      var key = el.getAttribute('data-dynamic');
      if (key === 'version') el.textContent = MCP.version;
    });
    var cfgEl = $('#cursorConfig');
    if (cfgEl) cfgEl.textContent = JSON.stringify(CLIENT_CONFIG, null, 2);
  }

  function initNav() {
    var links = $all('.nav a');
    var sections = [];
    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace('#', '');
      if (id) {
        var sec = document.getElementById(id);
        if (sec) sections.push({ link: a, sec: sec });
      }
    });
    function onScroll() {
      var y = window.scrollY + 100;
      var cur = sections[0];
      sections.forEach(function (s) {
        if (s.sec.offsetTop <= y) cur = s;
      });
      links.forEach(function (a) { a.classList.remove('active'); });
      if (cur) cur.link.classList.add('active');
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  window.copyBlock = function (id, btn) {
    var el = document.getElementById(id);
    if (!el) return;
    var text = el.textContent || el.innerText;
    navigator.clipboard.writeText(text).then(function () {
      if (btn) {
        var old = btn.textContent;
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = old; btn.classList.remove('copied'); }, 2000);
      }
    });
  };

  applyStatic();
  document.addEventListener('DOMContentLoaded', initNav);
})();
