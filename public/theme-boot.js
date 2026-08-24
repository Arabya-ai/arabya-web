/* Theme + accent palette boot — keep keys in sync with STORAGE_KEYS.
 * Loaded as an external script so CSP can drop script-src 'unsafe-inline'. */
(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem("arabya-theme");
    var d = t === "dark";
    root.dataset.theme = d ? "dark" : "light";
    root.style.colorScheme = d ? "dark" : "light";
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", d ? "#071110" : "#0f766e");

    var palettes = {
      teal: 1,
      warraq: 1,
      emerald: 1,
      indigo: 1,
      rose: 1,
      amber: 1,
      sky: 1,
      slate: 1,
    };
    var p = localStorage.getItem("arabya-palette");
    root.dataset.arabyaPalette = p && palettes[p] ? p : "teal";
  } catch (e) {
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
    root.dataset.arabyaPalette = "teal";
  }
})();
