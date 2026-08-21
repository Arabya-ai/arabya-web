/* Theme boot — keep in sync with STORAGE_KEYS.theme (arabya-theme).
 * Loaded as an external script so CSP can drop script-src 'unsafe-inline'. */
(function () {
  try {
    var t = localStorage.getItem("arabya-theme");
    var d = t === "dark";
    document.documentElement.dataset.theme = d ? "dark" : "light";
    document.documentElement.style.colorScheme = d ? "dark" : "light";
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", d ? "#071110" : "#0f766e");
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
